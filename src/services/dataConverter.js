const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const fs = require('fs').promises;
const { createReadStream } = require('fs');
const path = require('path');
const { ConversionError } = require('../middleware/errorHandler');

/**
 * Convert Excel to CSV
 * @param {Object} file - Multer file object
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Conversion result
 */
const processExcelToCsv = async (file, options = {}) => {
  const { sheetName, delimiter = ',' } = options;
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    
    // Get the worksheet
    let worksheet;
    if (sheetName) {
      worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new ConversionError(`Sheet "${sheetName}" not found`);
      }
    } else {
      worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new ConversionError('No worksheets found in Excel file');
      }
    }
    
    // Convert worksheet to CSV
    const csvData = [];
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let value = cell.value;
        // Handle different cell types
        if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        // Escape values containing delimiter or quotes
        if (value && value.toString().includes(delimiter) || value.toString().includes('"')) {
          value = `"${value.toString().replace(/"/g, '""')}"`;
        }
        rowData.push(value || '');
      });
      csvData.push(rowData.join(delimiter));
    });
    
    const csvContent = csvData.join('\n');
    const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.csv`;
    
    return {
      success: true,
      filename: outputFilename,
      buffer: Buffer.from(csvContent, 'utf-8'),
      originalName: file.originalname
    };
  } catch (error) {
    console.error('Excel to CSV conversion error:', error);
    throw new ConversionError(`Failed to convert Excel to CSV: ${error.message}`);
  }
};

/**
 * Convert CSV to Excel
 * @param {Object} file - Multer file object
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Conversion result
 */
const processCsvToExcel = async (file, options = {}) => {
  const { delimiter = ',', hasHeaders = true } = options;
  
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    
    // Read CSV file
    const csvContent = await fs.readFile(file.path, 'utf-8');
    const rows = csvContent.split('\n').filter(row => row.trim());
    
    // Parse CSV rows
    let headers = [];
    rows.forEach((row, index) => {
      const values = parseCSVRow(row, delimiter);
      
      if (index === 0 && hasHeaders) {
        headers = values;
        worksheet.addRow(values);
        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      } else {
        worksheet.addRow(values);
      }
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
    });
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.xlsx`;
    
    return {
      success: true,
      filename: outputFilename,
      buffer: buffer,
      originalName: file.originalname
    };
  } catch (error) {
    console.error('CSV to Excel conversion error:', error);
    throw new ConversionError(`Failed to convert CSV to Excel: ${error.message}`);
  }
};

/**
 * Convert Excel to JSON
 * @param {Object} file - Multer file object
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Conversion result
 */
const processExcelToJson = async (file, options = {}) => {
  const { sheetName, hasHeaders = true } = options;
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    
    // Get the worksheet
    let worksheet;
    if (sheetName) {
      worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) {
        throw new ConversionError(`Sheet "${sheetName}" not found`);
      }
    } else {
      worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new ConversionError('No worksheets found in Excel file');
      }
    }
    
    const jsonData = [];
    let headers = [];
    
    worksheet.eachRow((row, rowNumber) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        let value = cell.value;
        // Handle different cell types
        if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'object' && value !== null && value.result) {
          value = value.result;
        }
        rowData.push(value);
      });
      
      if (rowNumber === 1 && hasHeaders) {
        headers = rowData;
      } else if (hasHeaders) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header || `column_${index}`] = rowData[index] || null;
        });
        jsonData.push(obj);
      } else {
        jsonData.push(rowData);
      }
    });
    
    // Get all sheet names
    const sheets = workbook.worksheets.map(ws => ws.name);
    
    return {
      success: true,
      data: jsonData,
      sheets: sheets,
      rowCount: jsonData.length,
      originalName: file.originalname
    };
  } catch (error) {
    console.error('Excel to JSON conversion error:', error);
    throw new ConversionError(`Failed to convert Excel to JSON: ${error.message}`);
  }
};

/**
 * Convert JSON to Excel
 * @param {Object} file - Multer file object
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Conversion result
 */
const processJsonToExcel = async (file, options = {}) => {
  const { sheetName = 'Sheet1' } = options;
  
  try {
    // Read and parse JSON file
    const jsonContent = await fs.readFile(file.path, 'utf-8');
    let jsonData;
    
    try {
      jsonData = JSON.parse(jsonContent);
    } catch (parseError) {
      throw new ConversionError('Invalid JSON format');
    }
    
    // Ensure data is an array
    if (!Array.isArray(jsonData)) {
      if (typeof jsonData === 'object') {
        jsonData = [jsonData];
      } else {
        throw new ConversionError('JSON data must be an array or object');
      }
    }
    
    if (jsonData.length === 0) {
      throw new ConversionError('JSON data is empty');
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    
    // Extract headers from first object
    const firstItem = jsonData[0];
    const headers = Object.keys(firstItem);
    
    // Add headers
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Add data rows
    jsonData.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        // Convert objects/arrays to string
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      });
      worksheet.addRow(row);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = headers[index] ? headers[index].length : 10;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength > 50 ? 50 : maxLength + 2;
    });
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.xlsx`;
    
    return {
      success: true,
      filename: outputFilename,
      buffer: buffer,
      originalName: file.originalname
    };
  } catch (error) {
    console.error('JSON to Excel conversion error:', error);
    if (error instanceof ConversionError) {
      throw error;
    }
    throw new ConversionError(`Failed to convert JSON to Excel: ${error.message}`);
  }
};

/**
 * Parse a CSV row considering quotes and delimiters
 * @param {string} row - CSV row string
 * @param {string} delimiter - CSV delimiter
 * @returns {Array} - Parsed values
 */
function parseCSVRow(row, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

module.exports = {
  processExcelToCsv,
  processCsvToExcel,
  processExcelToJson,
  processJsonToExcel
};
