const { marked } = require('marked');
const TurndownService = require('turndown');
const fs = require('fs').promises;
const path = require('path');
const { ConversionError } = require('../middleware/errorHandler');

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined'
});

// Configure marked options for Markdown to HTML conversion
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  mangle: false,
  sanitize: false,
  smartLists: true,
  smartypants: true
});

/**
 * Convert HTML to Markdown
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Conversion result
 */
const processHtmlToMarkdown = async (file) => {
  try {
    // Read HTML content
    const htmlContent = await fs.readFile(file.path, 'utf-8');
    
    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(htmlContent);
    
    // Generate output filename
    const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.md`;
    
    return {
      success: true,
      filename: outputFilename,
      buffer: Buffer.from(markdownContent, 'utf-8'),
      originalName: file.originalname
    };
  } catch (error) {
    console.error('HTML to Markdown conversion error:', error);
    throw new ConversionError(`Failed to convert HTML to Markdown: ${error.message}`);
  }
};

/**
 * Convert Markdown to HTML
 * @param {Object} file - Multer file object
 * @param {Object} options - Conversion options
 * @returns {Promise<Object>} - Conversion result
 */
const processMarkdownToHtml = async (file, options = {}) => {
  const { includeStyles = false } = options;
  
  try {
    // Read Markdown content
    const markdownContent = await fs.readFile(file.path, 'utf-8');
    
    // Convert Markdown to HTML
    const htmlBody = marked.parse(markdownContent);
    
    // Create complete HTML document
    let htmlContent;
    if (includeStyles) {
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(file.originalname, path.extname(file.originalname))}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 2.25em;
            border-bottom: 2px solid #eee;
            padding-bottom: 0.3em;
        }
        h2 {
            font-size: 1.75em;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.3em;
        }
        h3 {
            font-size: 1.5em;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 16px;
            margin-left: 0;
            color: #666;
            font-style: italic;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f4f4f4;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        ul, ol {
            padding-left: 20px;
        }
        li {
            margin-bottom: 4px;
        }
        hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        ${htmlBody}
    </div>
</body>
</html>`;
    } else {
      // Simple HTML without styles
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(file.originalname, path.extname(file.originalname))}</title>
</head>
<body>
    ${htmlBody}
</body>
</html>`;
    }
    
    // Generate output filename
    const outputFilename = `${path.basename(file.filename, path.extname(file.filename))}.html`;
    
    return {
      success: true,
      filename: outputFilename,
      buffer: Buffer.from(htmlContent, 'utf-8'),
      originalName: file.originalname
    };
  } catch (error) {
    console.error('Markdown to HTML conversion error:', error);
    throw new ConversionError(`Failed to convert Markdown to HTML: ${error.message}`);
  }
};

/**
 * Add custom Turndown rules for better conversion
 */
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: function (content) {
    return '~~' + content + '~~';
  }
});

turndownService.addRule('taskListItems', {
  filter: function (node) {
    return node.type === 'checkbox' && node.parentNode.nodeName === 'LI';
  },
  replacement: function (content, node) {
    return node.checked ? '[x] ' : '[ ] ';
  }
});

module.exports = {
  processHtmlToMarkdown,
  processMarkdownToHtml
};
