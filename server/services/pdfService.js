import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { ChatGroq } from '@langchain/groq';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import PdfDocument from '../models/pdfDocument.js';

dotenv.config();

// Initialize cache with 1 hour TTL
const cache = new NodeCache({ stdTTL: 3600 });

// Initialize Groq
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  modelName: "llama-3.3-70b-versatile",
});

// Initialize HuggingFace embeddings with optimized settings
const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: "sentence-transformers/all-MiniLM-L6-v2",
  batchSize: 512, // Process more text at once
  stripNewLines: true // Remove unnecessary newlines
});

// Vector store to hold embeddings
const vectorStores = new Map();

// Define uploads directory path
const uploadsDir = path.join(process.cwd(), 'uploads');

// PDF parsing options for better performance
const PDF_OPTIONS = {
  pagerender: function(pageData) {
    return pageData.getTextContent().then(function(textContent) {
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY == item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    });
  },
  max: 0,
  version: 'v2.0.550'
};

// Define RAG prompt template
const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are an advanced AI educational assistant specializing in document analysis and comprehension. Your primary goal is to help users deeply understand the content of their documents by providing comprehensive, well-structured, and insightful responses.

Context from the document:
{context}

Question: {question}

Instructions for crafting your response:

1. ANALYSIS AND COMPREHENSION:
   - Provide a thorough analysis of the relevant information from the context
   - Break down complex concepts into understandable components
   - Highlight key terms, definitions, and important concepts
   - Make connections between different parts of the document when relevant

2. RESPONSE STRUCTURE:
   - Begin with a clear, direct answer to the question
   - Follow with supporting details and explanations
   - Include relevant examples or illustrations from the document
   - Organize information using appropriate headings or bullet points for clarity
   - Conclude with a brief summary if the response is lengthy

3. ACCURACY AND SOURCING:
   - Base your response EXCLUSIVELY on the provided context
   - Quote relevant passages directly, citing the specific location in the document
   - If information is incomplete, clearly state what is and isn't available in the context
   - Distinguish between explicit statements and reasonable inferences from the text

4. EDUCATIONAL ELEMENTS:
   - Explain technical terms or jargon when they appear
   - Provide relevant background information when it helps understanding
   - Include practical applications or real-world relevance when applicable
   - Suggest related topics or concepts for further exploration within the document

5. ENGAGEMENT AND CLARITY:
   - Use clear, professional language while maintaining an engaging tone
   - Incorporate rhetorical questions or thought-provoking points when appropriate
   - Break up long explanations with examples or practical applications
   - Use analogies or comparisons when they help clarify complex concepts

6. LIMITATIONS AND TRANSPARENCY:
   - Clearly acknowledge when information is partial or unclear
   - Specify any assumptions made in your interpretation
   - Indicate when additional context would be helpful
   - Suggest specific sections of the document for further reading

FORMAT YOUR RESPONSE AS FOLLOWS:

📌 Direct Answer:
[Provide the immediate, clear answer to the question]

🔍 Detailed Explanation:
[Expand on the answer with thorough analysis and supporting details]

💡 Key Insights:
[List important concepts, terms, or takeaways]

📑 Source References:
[Quote relevant passages with their location in the document]

🔄 Related Concepts:
[Mention connected topics or suggested further reading from the document]

Remember: Your goal is to not just answer the question, but to help the user build a comprehensive understanding of the topic within the context of their document.

Answer: `);

// Ensure uploads directory exists
async function ensureUploadsDirectory() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    throw new Error(`Failed to create uploads directory: ${err.message}`);
  }
}

// Process text chunks in parallel batches
async function processChunksInBatches(chunks, batchSize = 10) {
  const results = [];
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (chunk, index) => ({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
          page: Math.floor((i + index) / 2) + 1
        }
      }))
    );
    results.push(...batchResults);
  }
  return results;
}

/**
 * Process PDF file and create embeddings
 */
export async function processPdf(filePath) {
  try {
    await ensureUploadsDirectory();

    const normalizedPath = path.normalize(filePath);
    const uploadsPath = path.normalize(uploadsDir);
    
    if (!normalizedPath.startsWith(uploadsPath)) {
      throw new Error('Invalid file path. Files must be in the uploads directory.');
    }

    try {
      await fs.access(normalizedPath);
    } catch {
      throw new Error(`PDF file not found at path: ${normalizedPath}`);
    }

    // Read and parse PDF with optimized options
    const buffer = await fs.readFile(normalizedPath);
    const data = await pdfParse(buffer, PDF_OPTIONS);

    if (!data || !data.text) {
      throw new Error('PDF parsing resulted in no text content');
    }

    // Split text into optimized chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000, // Larger chunks for better context
      chunkOverlap: 100, // Minimal overlap
      separators: ['\n\n', '\n', '. ', ' ', ''],
      lengthFunction: (text) => text.length,
    });

    const docs = await textSplitter.createDocuments([data.text]);

    // Create initial chunks with metadata
    const initialChunks = docs.map((doc, index) => ({
      pageContent: doc.pageContent,
      metadata: {
        source: path.basename(normalizedPath),
        pageNumber: Math.floor(index / 2) + 1
      }
    }));

    // Process chunks in parallel batches
    const documentChunks = await processChunksInBatches(initialChunks);

    // Create vector store with HuggingFace embeddings
    const vectorStore = await MemoryVectorStore.fromDocuments(
      documentChunks,
      embeddings
    );

    // Store the vector store with the filename as key
    const filename = path.basename(normalizedPath);
    vectorStores.set(filename, vectorStore);

    return {
      documentChunks,
      pageCount: data.numpages || Math.ceil(docs.length / 2)
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF document: ${error.message}`);
  }
}

/**
 * Chat with PDF using RAG
 */
export async function chatWithPdf(filename, question, chatHistory = []) {
  try {
    // Get the vector store for this document using just the filename
    let vectorStore = vectorStores.get(filename);

    if (!vectorStore) {
      // Try to get document chunks from database first
      const pdfDoc = await PdfDocument.findOne({ filename });
      
      if (!pdfDoc) {
        throw new Error('PDF document not found in database');
      }

      if (pdfDoc.documentChunks && pdfDoc.documentChunks.length > 0) {
        console.log('Recreating vector store from stored chunks for:', filename);
        // Create vector store from stored chunks
        vectorStore = await MemoryVectorStore.fromDocuments(
          pdfDoc.documentChunks,
          embeddings
        );
        vectorStores.set(filename, vectorStore);
      } else {
        // If no chunks in database, reprocess the document
        console.log('No stored chunks found, reprocessing document:', filename);
        const filePath = path.join(uploadsDir, filename);
        const { documentChunks } = await processPdf(filePath);
        vectorStore = await MemoryVectorStore.fromDocuments(
          documentChunks,
          embeddings
        );
        vectorStores.set(filename, vectorStore);
      }
    }

    // Cache key for the query
    const cacheKey = `pdf_query_${filename}_${question}_${chatHistory.length}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Retrieve relevant documents
    const retrievedDocs = await vectorStore.similaritySearch(question, 3);
    
    // Format documents content
    const context = retrievedDocs.map(doc => doc.pageContent).join('\n\n');

    // Create the RAG chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: (input) => input.question
      },
      promptTemplate,
      model,
      new StringOutputParser()
    ]);

    // Generate response
    const response = await chain.invoke({
      question: question
    });

    // Extract source pages
    const sourcePages = [...new Set(
      retrievedDocs.map(doc => doc.metadata.pageNumber)
    )].sort((a, b) => a - b);

    const result = {
      answer: response,
      sourcePages: sourcePages,
      sources: retrievedDocs.map(doc => ({
        page: doc.metadata.pageNumber,
        content: doc.pageContent.substring(0, 150) + '...' // Preview of content
      }))
    };

    // Cache the result
    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Error in PDF chat:', error);
    throw error;
  }
}

/**
 * Clean up uploaded file
 */
export async function cleanupFile(filePath) {
  try {
    const normalizedPath = path.normalize(filePath);
    await fs.unlink(normalizedPath);
    vectorStores.delete(normalizedPath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
    // Don't throw error for cleanup failures
  }
}

// Initialize uploads directory when module loads
ensureUploadsDirectory().catch(console.error);
