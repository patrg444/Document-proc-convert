require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;

// Import routes
const convertRoutes = require('./routes/convert');
const ocrRoutes = require('./routes/ocr');
const jobRoutes = require('./routes/jobs');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { validateRapidAPI } = require('./middleware/auth');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// RapidAPI authentication for production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', validateRapidAPI);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Document Processing API'
  });
});

// API routes
app.use('/api/convert', convertRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/jobs', jobRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Document Processing API',
    version: '1.0.0',
    endpoints: {
      convert: {
        'POST /api/convert/office-to-pdf': 'Convert DOCX/XLSX/PPTX to PDF',
        'POST /api/convert/excel-to-csv': 'Convert Excel to CSV',
        'POST /api/convert/csv-to-excel': 'Convert CSV to Excel',
        'POST /api/convert/excel-to-json': 'Convert Excel to JSON',
        'POST /api/convert/json-to-excel': 'Convert JSON to Excel',
        'POST /api/convert/html-to-markdown': 'Convert HTML to Markdown',
        'POST /api/convert/markdown-to-html': 'Convert Markdown to HTML'
      },
      ocr: {
        'POST /api/ocr/extract-text': 'Extract text from images using OCR'
      },
      jobs: {
        'GET /api/jobs/:jobId/status': 'Get job status',
        'GET /api/jobs/:jobId/download': 'Download completed job result'
      }
    }
  });
});

// Error handling
app.use(errorHandler);

// Cleanup temporary files periodically
const cleanupTempFiles = async () => {
  try {
    const tempDir = process.env.TEMP_DIR || '/tmp/document-processing';
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
};

// Setup cleanup interval
setInterval(cleanupTempFiles, parseInt(process.env.CLEANUP_INTERVAL) || 5 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Document Processing API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
