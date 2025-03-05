import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sourcePages: [{
    type: Number
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const documentChunkSchema = new mongoose.Schema({
  pageContent: String,
  metadata: {
    page: Number,
    location: {
      pageNumber: Number
    }
  },
  embedding: [Number]
});

const pdfDocumentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  pageCount: {
    type: Number,
    required: true
  },
  documentChunks: [documentChunkSchema],
  chatHistory: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('PdfDocument', pdfDocumentSchema); 