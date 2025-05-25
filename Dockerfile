FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    tesseract-ocr \
    tesseract-ocr-eng \
    python3 \
    python3-uno \
    unoconv \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . .

# Create temporary directory for file processing
RUN mkdir -p /tmp/document-processing

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
