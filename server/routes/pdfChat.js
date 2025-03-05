import express from 'express';
import multer from 'multer';
import path from 'path';
import PdfDocument from '../models/pdfDocument.js';
import { processPdf, cleanupFile } from '../services/pdfService.js';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { chatWithPdf } from '../services/pdfService.js';

const router = express.Router();

// Define uploads directory path
const uploadsDir = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!existsSync(uploadsDir)) {
  await mkdir(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get all PDFs for a user
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pdfs = await PdfDocument.find({ userId })
      .select('filename originalName pageCount createdAt')
      .sort({ createdAt: -1 });

    res.json({ pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
});

// Get a specific PDF
router.get('/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pdf = await PdfDocument.findOne({ 
      _id: req.params.id,
      userId: userId 
    });

    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Send the PDF file with absolute path
    const filePath = path.join(uploadsDir, pdf.filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found on server' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ error: 'Failed to fetch PDF' });
  }
});

// Upload and process PDF
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.headers['x-user-id'];
    if (!userId) {
      // Clean up the uploaded file
      await cleanupFile(req.file.path);
      return res.status(400).json({ error: 'User ID is required' });
    }

    const filePath = req.file.path;
    
    try {
      // Process PDF using the service
      const { documentChunks, pageCount } = await processPdf(filePath);

      // Create new PDF document in database
      const pdfDoc = await PdfDocument.create({
        userId: userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        pageCount: pageCount,
        documentChunks: documentChunks,
        chatHistory: []
      });

      res.json({
        _id: pdfDoc._id,
        originalName: pdfDoc.originalName,
        pageCount: pdfDoc.pageCount,
        createdAt: pdfDoc.createdAt
      });
    } catch (error) {
      // Clean up the uploaded file if processing fails
      await cleanupFile(filePath);
      throw error;
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: error.message || 'Error processing PDF' });
  }
});

// Delete PDF
router.delete('/:documentId', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const doc = await PdfDocument.findOne({
      _id: req.params.documentId,
      userId: userId
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from uploads directory
    const filePath = path.join(uploadsDir, doc.filename);
    if (existsSync(filePath)) {
      await cleanupFile(filePath);
    }

    // Delete document from database
    await doc.deleteOne();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: 'Error deleting PDF' });
  }
});

// Chat with PDF
router.post('/:id/chat', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pdf = await PdfDocument.findOne({ 
      _id: req.params.id,
      userId: userId 
    });

    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Get the full file path
    const filePath = path.join(uploadsDir, pdf.filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found on server' });
    }

    // Process the chat message
    const { answer, sourcePages, sources } = await chatWithPdf(
      pdf.filename,
      req.body.content,
      pdf.chatHistory
    );

    // Add the user message to chat history
    pdf.chatHistory.push({
      role: 'user',
      content: req.body.content,
      timestamp: new Date()
    });

    // Add the assistant's response to chat history
    pdf.chatHistory.push({
      role: 'assistant',
      content: answer,
      sourcePages: sourcePages,
      sources: sources,
      timestamp: new Date()
    });

    await pdf.save();

    res.json({ 
      message: answer,
      sourcePages: sourcePages,
      sources: sources,
      chatHistory: pdf.chatHistory
    });
  } catch (error) {
    console.error('Error in PDF chat:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat request' });
  }
});

// Get chat history
router.get('/:documentId/history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const doc = await PdfDocument.findOne({
      _id: req.params.documentId,
      userId: userId
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(doc.chatHistory || []);
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    res.status(500).json({ error: 'Error retrieving chat history' });
  }
});

export default router; 