const libre = require('libreoffice-convert');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { ConversionError } = require('../middleware/errorHandler');

const libreConvert = promisify(libre.convert);

/**
 * Convert Office documents (DOCX, XLSX, PPTX) to PDF
 * @param {string} inputPath - Path to the input file
 * @param {string} outputPath - Path where the PDF should be saved
 * @returns {Promise<void>}
 */
const convertOfficeToPDF = async (inputPath, outputPath) => {
  try {
    // Read the input file
    const inputBuffer = await fs.readFile(inputPath);
    
    // Convert to PDF
    const pdfBuffer = await libreConvert(inputBuffer, '.pdf', undefined);
    
    // Write the PDF to the output path
    await fs.writeFile(outputPath, pdfBuffer);
    
    console.log(`Successfully converted ${path.basename(inputPath)} to PDF`);
  } catch (error) {
    console.error('Office to PDF conversion error:', error);
    throw new ConversionError(`Failed to convert Office document to PDF: ${error.message}`);
  }
};

/**
 * Get the file extension based on mimetype or filename
 * @param {string} filename - Original filename
 * @param {string} mimetype - File mimetype
 * @returns {string} - File extension
 */
const getOfficeFileType = (filename, mimetype) => {
  const ext = path.extname(filename).toLowerCase();
  
  // Map of mimetypes to extensions
  const mimeToExt = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/msword': '.doc',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.ms-powerpoint': '.ppt'
  };
  
  // Try to get extension from mimetype first, then fall back to file extension
  return mimeToExt[mimetype] || ext;
};

/**
 * Process Office document conversion with proper file handling
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Conversion result
 */
const processOfficeConversion = async (file) => {
  const tempDir = process.env.TEMP_DIR || '/tmp/document-processing';
  const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.pdf`;
  const outputPath = path.join(tempDir, outputFilename);
  
  try {
    // Perform conversion
    await convertOfficeToPDF(file.path, outputPath);
    
    // Read the converted file
    const pdfBuffer = await fs.readFile(outputPath);
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    
    // Clean up the output file
    await fs.unlink(outputPath);
    
    return {
      success: true,
      filename: outputFilename,
      buffer: pdfBuffer,
      size: stats.size,
      originalName: file.originalname,
      convertedFrom: getOfficeFileType(file.originalname, file.mimetype)
    };
  } catch (error) {
    // Clean up output file if it exists
    try {
      await fs.unlink(outputPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
};

/**
 * Batch convert multiple Office documents to PDF
 * @param {Array} files - Array of file paths
 * @returns {Promise<Array>} - Array of conversion results
 */
const batchConvertOfficeToPDF = async (files) => {
  const results = [];
  
  for (const file of files) {
    try {
      const result = await processOfficeConversion(file);
      results.push({
        file: file.originalname,
        ...result
      });
    } catch (error) {
      results.push({
        file: file.originalname,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

module.exports = {
  convertOfficeToPDF,
  processOfficeConversion,
  batchConvertOfficeToPDF,
  getOfficeFileType
};
