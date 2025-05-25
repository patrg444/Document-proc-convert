const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { ValidationError } = require('./errorHandler');

// Ensure temp directory exists
const ensureTempDir = async () => {
  const tempDir = process.env.TEMP_DIR || '/tmp/document-processing';
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }
  return tempDir;
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const tempDir = await ensureTempDir();
      cb(null, tempDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for different conversion types
const fileFilters = {
  office: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'application/msword', // DOC
      'application/vnd.ms-excel', // XLS
      'application/vnd.ms-powerpoint' // PPT
    ];

    const allowedExtensions = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only Office documents are allowed.'));
    }
  },

  excel: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only Excel files are allowed.'));
    }
  },

  csv: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/csv'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only CSV files are allowed.'));
    }
  },

  json: (req, file, cb) => {
    const allowedTypes = ['application/json'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.json') {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only JSON files are allowed.'));
    }
  },

  html: (req, file, cb) => {
    const allowedTypes = ['text/html'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.html' || ext === '.htm') {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only HTML files are allowed.'));
    }
  },

  markdown: (req, file, cb) => {
    const allowedTypes = ['text/markdown', 'text/x-markdown'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || ext === '.md' || ext === '.markdown') {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only Markdown files are allowed.'));
    }
  },

  image: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ValidationError('Invalid file type. Only image files are allowed (JPEG, PNG, TIFF, BMP, WebP).'));
    }
  }
};

// Create multer instances for different file types
const createUploader = (fileType) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
    },
    fileFilter: fileFilters[fileType] || ((req, file, cb) => cb(null, true))
  });
};

// Export uploaders for different use cases
module.exports = {
  uploadOffice: createUploader('office').single('file'),
  uploadExcel: createUploader('excel').single('file'),
  uploadCsv: createUploader('csv').single('file'),
  uploadJson: createUploader('json').single('file'),
  uploadHtml: createUploader('html').single('file'),
  uploadMarkdown: createUploader('markdown').single('file'),
  uploadImage: createUploader('image').single('file'),
  uploadAny: createUploader(null).single('file'),
  
  // Cleanup uploaded file
  cleanupFile: async (filePath) => {
    try {
      if (filePath && filePath.startsWith(process.env.TEMP_DIR || '/tmp/document-processing')) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
};
