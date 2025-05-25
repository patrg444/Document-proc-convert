const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test health endpoint
async function testHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health Check:', response.data);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
  }
}

// Test root endpoint
async function testRoot() {
  try {
    const response = await axios.get(`${API_BASE_URL}/`);
    console.log('✅ API Info:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Root Endpoint Failed:', error.message);
  }
}

// Create test files
async function createTestFiles() {
  const testDir = path.join(__dirname, 'test-files');
  
  // Create test directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // Create test HTML file
  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Test Document</title></head>
<body>
  <h1>Test Document</h1>
  <p>This is a <strong>test</strong> document with <em>various</em> formatting.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
  </ul>
</body>
</html>`;
  fs.writeFileSync(path.join(testDir, 'test.html'), htmlContent);

  // Create test Markdown file
  const markdownContent = `# Test Document

This is a **test** document with *various* formatting.

- Item 1
- Item 2

## Code Example

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;
  fs.writeFileSync(path.join(testDir, 'test.md'), markdownContent);

  // Create test CSV file
  const csvContent = `Name,Age,City
John Doe,30,New York
Jane Smith,25,Los Angeles
Bob Johnson,35,Chicago`;
  fs.writeFileSync(path.join(testDir, 'test.csv'), csvContent);

  // Create test JSON file
  const jsonContent = JSON.stringify([
    { Name: 'John Doe', Age: 30, City: 'New York' },
    { Name: 'Jane Smith', Age: 25, City: 'Los Angeles' },
    { Name: 'Bob Johnson', Age: 35, City: 'Chicago' }
  ], null, 2);
  fs.writeFileSync(path.join(testDir, 'test.json'), jsonContent);

  console.log('✅ Test files created in test-files directory');
}

// Test HTML to Markdown conversion
async function testHtmlToMarkdown() {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(__dirname, 'test-files', 'test.html')));

    const response = await axios.post(
      `${API_BASE_URL}/api/convert/html-to-markdown`,
      form,
      {
        headers: form.getHeaders(),
        responseType: 'text'
      }
    );

    console.log('✅ HTML to Markdown conversion successful');
    console.log('Result preview:', response.data.substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ HTML to Markdown conversion failed:', error.response?.data || error.message);
  }
}

// Test CSV to Excel conversion
async function testCsvToExcel() {
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(path.join(__dirname, 'test-files', 'test.csv')));

    const response = await axios.post(
      `${API_BASE_URL}/api/convert/csv-to-excel`,
      form,
      {
        headers: form.getHeaders(),
        responseType: 'arraybuffer'
      }
    );

    console.log('✅ CSV to Excel conversion successful');
    console.log('Response size:', response.data.byteLength, 'bytes');
  } catch (error) {
    console.error('❌ CSV to Excel conversion failed:', error.response?.data || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Starting API Tests...\n');
  
  await testHealth();
  console.log('');
  
  await testRoot();
  console.log('');
  
  await createTestFiles();
  console.log('');
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testHtmlToMarkdown();
  console.log('');
  
  await testCsvToExcel();
  console.log('');
  
  console.log('🎉 Tests completed!');
  console.log('\nNOTE: For Office to PDF conversions, you need to test with actual DOCX/XLSX/PPTX files.');
  console.log('OCR testing requires image files (JPEG, PNG, etc.)');
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
