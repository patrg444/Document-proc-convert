# Document Processing & Conversion API

A high-performance REST API for converting between various document formats, built with Node.js and optimized for deployment on Railway and RapidAPI.

## Features

### Core Conversions
- **Office to PDF**: Convert DOCX, XLSX, PPTX to PDF with high fidelity
- **Excel Operations**: Excel ↔ CSV ↔ JSON conversions with formatting preservation
- **Markup Conversions**: HTML ↔ Markdown with customizable styling
- **OCR**: Extract text from images (JPEG, PNG, TIFF, BMP, WebP) with multi-language support

### Technical Features
- Fast processing (typically under 5 seconds)
- Support for files up to 50MB
- Async job processing for large files
- Comprehensive error handling
- RapidAPI integration ready

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Document Processing**: LibreOffice (via Docker)
- **Excel Processing**: ExcelJS
- **Markdown**: Marked & Turndown
- **OCR**: Tesseract.js
- **Queue**: Bull (Redis)
- **Deployment**: Railway & RapidAPI

## Installation

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd document-processing-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:
```bash
npm run dev
```

### Docker Development

```bash
docker build -t document-api .
docker run -p 3000:3000 --env-file .env document-api
```

## API Endpoints

### Document Conversion

#### Office to PDF
```http
POST /api/convert/office-to-pdf
Content-Type: multipart/form-data

file: [DOCX/XLSX/PPTX file]
```

#### Excel to CSV
```http
POST /api/convert/excel-to-csv
Content-Type: multipart/form-data

file: [Excel file]
sheetName: (optional) specific sheet to convert
delimiter: (optional) CSV delimiter (default: ,)
```

#### CSV to Excel
```http
POST /api/convert/csv-to-excel
Content-Type: multipart/form-data

file: [CSV file]
delimiter: (optional) CSV delimiter (default: ,)
hasHeaders: (optional) true/false (default: true)
```

#### Excel to JSON
```http
POST /api/convert/excel-to-json
Content-Type: multipart/form-data

file: [Excel file]
sheetName: (optional) specific sheet to convert
hasHeaders: (optional) true/false (default: true)
```

Response:
```json
{
  "success": true,
  "originalFile": "data.xlsx",
  "data": [...],
  "sheets": ["Sheet1", "Sheet2"],
  "rowCount": 100
}
```

#### JSON to Excel
```http
POST /api/convert/json-to-excel
Content-Type: multipart/form-data

file: [JSON file]
sheetName: (optional) sheet name (default: Sheet1)
```

#### HTML to Markdown
```http
POST /api/convert/html-to-markdown
Content-Type: multipart/form-data

file: [HTML file]
```

#### Markdown to HTML
```http
POST /api/convert/markdown-to-html
Content-Type: multipart/form-data

file: [Markdown file]
includeStyles: (optional) true/false - include CSS styling
```

### OCR Operations

#### Extract Text
```http
POST /api/ocr/extract-text
Content-Type: multipart/form-data

file: [Image file]
language: (optional) OCR language (default: eng)
outputFormat: (optional) text/json (default: text)
```

#### Extract to File
```http
POST /api/ocr/extract-to-file
Content-Type: multipart/form-data

file: [Image file]
language: (optional) OCR language (default: eng)
format: (optional) txt/json (default: txt)
```

#### Get Supported Languages
```http
GET /api/ocr/languages
```

### Job Management (Async Processing)

#### Get Job Status
```http
GET /api/jobs/{jobId}/status
```

#### Download Job Result
```http
GET /api/jobs/{jobId}/download
```

## Deployment

### Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Create new project:
```bash
railway init
```

4. Add Redis service (for async jobs):
```bash
railway add redis
```

5. Deploy:
```bash
railway up
```

6. Set environment variables in Railway dashboard:
   - `RAPIDAPI_PROXY_SECRET`
   - `NODE_ENV=production`
   - Other variables as needed

### RapidAPI Integration

1. **Create API on RapidAPI Hub**
   - Go to [RapidAPI Provider Dashboard](https://rapidapi.com/provider)
   - Click "Add New API"
   - Fill in API details

2. **Configure Base URL**
   - Set your Railway deployment URL as the base URL
   - Example: `https://your-app.railway.app`

3. **Set Headers**
   - Add `X-RapidAPI-Proxy-Secret` header requirement

4. **Define Endpoints**
   - Add all endpoints from this documentation
   - Set proper request/response schemas

5. **Configure Pricing Tiers**
   ```
   Free Tier: 100 requests/month
   Starter ($9): 1,000 requests/month
   Growth ($29): 10,000 requests/month
   Business ($99): 100,000 requests/month
   ```

##  Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Redis (Railway provides this)
REDIS_URL=redis://...

# RapidAPI
RAPIDAPI_PROXY_SECRET=your-secret-here

# File Processing
MAX_FILE_SIZE=52428800  # 50MB
TEMP_DIR=/tmp/document-processing
CLEANUP_INTERVAL=300000  # 5 minutes

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Job Processing
JOB_TIMEOUT=60000  # 1 minute
JOB_ATTEMPTS=3
```

##  Usage Examples

### cURL Example - Office to PDF
```bash
curl -X POST https://your-api.com/api/convert/office-to-pdf \
  -H "X-RapidAPI-Key: your-api-key" \
  -F "file=@document.docx" \
  --output converted.pdf
```

### Node.js Example - Excel to JSON
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('data.xlsx'));

const response = await axios.post(
  'https://your-api.com/api/convert/excel-to-json',
  form,
  {
    headers: {
      ...form.getHeaders(),
      'X-RapidAPI-Key': 'your-api-key'
    }
  }
);

console.log(response.data);
```

### Python Example - OCR
```python
import requests

files = {'file': open('image.png', 'rb')}
headers = {'X-RapidAPI-Key': 'your-api-key'}
params = {'language': 'eng', 'outputFormat': 'json'}

response = requests.post(
    'https://your-api.com/api/ocr/extract-text',
    files=files,
    headers=headers,
    params=params
)

print(response.json())
```

## Performance

- Office to PDF: ~2-3 seconds for typical documents
- Excel conversions: ~1-2 seconds for files under 10MB
- HTML/Markdown: < 1 second
- OCR: ~3-5 seconds depending on image complexity

## Security

- File type validation
- Size limits enforced
- Automatic file cleanup
- Rate limiting per IP
- RapidAPI authentication

## Support

For issues, questions, or feature requests:
- Email: support@your-domain.com
- RapidAPI Discussion Board

## License

MIT License - see LICENSE file for details
