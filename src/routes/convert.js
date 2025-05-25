const express = require('express');
const router = express.Router();
const { uploadOffice, uploadExcel, uploadCsv, uploadJson, uploadHtml, uploadMarkdown, cleanupFile } = require('../middleware/fileUpload');
const { processOfficeConversion } = require('../services/officeConverter');
const { processExcelToCsv, processCsvToExcel, processExcelToJson, processJsonToExcel } = require('../services/dataConverter');
const { processHtmlToMarkdown, processMarkdownToHtml } = require('../services/markdownConverter');
const { ValidationError } = require('../middleware/errorHandler');

// Office to PDF conversion
router.post('/office-to-pdf', uploadOffice, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    console.log(`Converting Office file: ${file.originalname} (${file.size} bytes)`);
    
    // Process the conversion
    const result = await processOfficeConversion(file);
    
    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.size,
      'X-Original-Filename': file.originalname,
      'X-Converted-From': result.convertedFrom
    });
    
    // Send the PDF buffer
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    // Clean up uploaded file
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// Excel to CSV conversion
router.post('/excel-to-csv', uploadExcel, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const sheetName = req.body.sheetName || req.query.sheetName;
    const delimiter = req.body.delimiter || req.query.delimiter || ',';
    
    console.log(`Converting Excel to CSV: ${file.originalname}`);
    
    const result = await processExcelToCsv(file, { sheetName, delimiter });
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname
    });
    
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// CSV to Excel conversion
router.post('/csv-to-excel', uploadCsv, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const delimiter = req.body.delimiter || req.query.delimiter || ',';
    const hasHeaders = req.body.hasHeaders !== 'false' && req.query.hasHeaders !== 'false';
    
    console.log(`Converting CSV to Excel: ${file.originalname}`);
    
    const result = await processCsvToExcel(file, { delimiter, hasHeaders });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname
    });
    
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// Excel to JSON conversion
router.post('/excel-to-json', uploadExcel, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const sheetName = req.body.sheetName || req.query.sheetName;
    const hasHeaders = req.body.hasHeaders !== 'false' && req.query.hasHeaders !== 'false';
    
    console.log(`Converting Excel to JSON: ${file.originalname}`);
    
    const result = await processExcelToJson(file, { sheetName, hasHeaders });
    
    res.json({
      success: true,
      originalFile: file.originalname,
      data: result.data,
      sheets: result.sheets,
      rowCount: result.rowCount
    });
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// JSON to Excel conversion
router.post('/json-to-excel', uploadJson, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const sheetName = req.body.sheetName || req.query.sheetName || 'Sheet1';
    
    console.log(`Converting JSON to Excel: ${file.originalname}`);
    
    const result = await processJsonToExcel(file, { sheetName });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname
    });
    
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// HTML to Markdown conversion
router.post('/html-to-markdown', uploadHtml, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    console.log(`Converting HTML to Markdown: ${file.originalname}`);
    
    const result = await processHtmlToMarkdown(file);
    
    res.set({
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname
    });
    
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

// Markdown to HTML conversion
router.post('/markdown-to-html', uploadMarkdown, async (req, res, next) => {
  const file = req.file;
  
  try {
    if (!file) {
      throw new ValidationError('No file uploaded');
    }

    const includeStyles = req.body.includeStyles === 'true' || req.query.includeStyles === 'true';
    
    console.log(`Converting Markdown to HTML: ${file.originalname}`);
    
    const result = await processMarkdownToHtml(file, { includeStyles });
    
    res.set({
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'X-Original-Filename': file.originalname
    });
    
    res.send(result.buffer);
    
  } catch (error) {
    next(error);
  } finally {
    if (file) {
      await cleanupFile(file.path);
    }
  }
});

module.exports = router;
