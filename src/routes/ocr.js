const express = require('express');
const router = express.Router();
const { uploadImage, cleanupFile } = require('../middleware/fileUpload');
const { extractTextFromImage, processOcrToFile, getSupportedLanguages } = require('../services/ocrService');
const { ValidationError } = require('../middleware/errorHandler');

// Extract text from image
router.post('/extract-text', uploadImage, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No image file uploaded');
    }

    const language = req.body.language || req.query.language || 'eng';
    const outputFormat = req.body.outputFormat || req.query.outputFormat || 'text';
    
    console.log(`Extracting text from image: ${file.originalname} (Language: ${language})`);
    
    // Process OCR
    const result = await extractTextFromImage(file, { language, outputFormat });
    
    // Return JSON response
    res.json(result);
    
  } catch (error) {
    next(error);
  } finally {
    // Clean up uploaded file
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// Extract text and download as file
router.post('/extract-to-file', uploadImage, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No image file uploaded');
    }

    const language = req.body.language || req.query.language || 'eng';
    const format = req.body.format || req.query.format || 'txt';
    
    console.log(`Extracting text to file: ${file.originalname} (Language: ${language}, Format: ${format})`);
    
    // Process OCR and get file
    const result = await processOcrToFile(file, { language, format });
    
    // Set response headers
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname,
      'X-OCR-Confidence': result.confidence
    });
    
    // Send the file buffer
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  const languages = getSupportedLanguages();
  res.json({
    languages: languages,
    default: 'eng',
    note: 'Additional language packs may require separate installation'
  });
});

module.exports = router;
