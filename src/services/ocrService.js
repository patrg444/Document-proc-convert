const { createWorker } = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const { ConversionError } = require('../middleware/errorHandler');

// Cache for Tesseract workers
let worker = null;

/**
 * Initialize Tesseract worker
 * @returns {Promise<Worker>} - Tesseract worker instance
 */
const initializeWorker = async () => {
  if (!worker) {
    worker = await createWorker({
      logger: m => console.log(`OCR: ${m.status} - ${Math.round(m.progress * 100)}%`)
    });
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
  }
  return worker;
};

/**
 * Extract text from image using OCR
 * @param {Object} file - Multer file object
 * @param {Object} options - OCR options
 * @returns {Promise<Object>} - OCR result
 */
const extractTextFromImage = async (file, options = {}) => {
  const { language = 'eng', outputFormat = 'text' } = options;
  
  try {
    console.log(`Starting OCR for: ${file.originalname}`);
    
    // Initialize worker
    const ocrWorker = await initializeWorker();
    
    // If different language requested, load it
    if (language !== 'eng') {
      await ocrWorker.loadLanguage(language);
      await ocrWorker.initialize(language);
    }
    
    // Perform OCR
    const startTime = Date.now();
    const { data } = await ocrWorker.recognize(file.path);
    const processingTime = Date.now() - startTime;
    
    console.log(`OCR completed in ${processingTime}ms with confidence: ${data.confidence}%`);
    
    // Format result based on requested output format
    let result;
    if (outputFormat === 'json') {
      result = {
        text: data.text,
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        lines: data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })),
        paragraphs: data.paragraphs.map(para => ({
          text: para.text,
          confidence: para.confidence,
          bbox: para.bbox
        })),
        processingTime: processingTime,
        language: language
      };
    } else {
      // Default to plain text
      result = {
        text: data.text,
        confidence: data.confidence,
        processingTime: processingTime,
        language: language
      };
    }
    
    return {
      success: true,
      originalFile: file.originalname,
      ...result
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw new ConversionError(`Failed to extract text from image: ${error.message}`);
  }
};

/**
 * Extract text and save as file
 * @param {Object} file - Multer file object
 * @param {Object} options - OCR options
 * @returns {Promise<Object>} - File result
 */
const processOcrToFile = async (file, options = {}) => {
  const { format = 'txt' } = options;
  
  try {
    // Extract text
    const ocrResult = await extractTextFromImage(file, options);
    
    let content, filename, mimeType;
    
    if (format === 'json') {
      content = JSON.stringify({
        originalFile: ocrResult.originalFile,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        extractedAt: new Date().toISOString()
      }, null, 2);
      filename = `${path.basename(file.filename, path.extname(file.filename))}_ocr.json`;
      mimeType = 'application/json';
    } else {
      // Default to plain text
      content = ocrResult.text;
      filename = `${path.basename(file.filename, path.extname(file.filename))}_ocr.txt`;
      mimeType = 'text/plain';
    }
    
    return {
      success: true,
      filename: filename,
      buffer: Buffer.from(content, 'utf-8'),
      mimeType: mimeType,
      originalName: file.originalname,
      confidence: ocrResult.confidence
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Batch OCR processing
 * @param {Array} files - Array of file objects
 * @param {Object} options - OCR options
 * @returns {Promise<Array>} - Array of OCR results
 */
const batchExtractText = async (files, options = {}) => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await extractTextFromImage(file, options);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        originalFile: file.originalname,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Get supported languages
 * @returns {Object} - Supported languages
 */
const getSupportedLanguages = () => {
  return {
    eng: 'English',
    spa: 'Spanish',
    fra: 'French',
    deu: 'German',
    ita: 'Italian',
    por: 'Portuguese',
    rus: 'Russian',
    jpn: 'Japanese',
    chi_sim: 'Chinese (Simplified)',
    chi_tra: 'Chinese (Traditional)',
    kor: 'Korean',
    ara: 'Arabic',
    hin: 'Hindi'
  };
};

/**
 * Cleanup worker on process exit
 */
process.on('exit', async () => {
  if (worker) {
    await worker.terminate();
  }
});

module.exports = {
  extractTextFromImage,
  processOcrToFile,
  batchExtractText,
  getSupportedLanguages
};
