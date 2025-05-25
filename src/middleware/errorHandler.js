const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: `Maximum file size is ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`,
      code: 'FILE_TOO_LARGE'
    });
  }

  // Multer file type error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid file',
      message: 'Unexpected file field',
      code: 'INVALID_FILE_FIELD'
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: err.message,
      details: err.details || {},
      code: 'VALIDATION_ERROR'
    });
  }

  // Conversion error
  if (err.name === 'ConversionError') {
    return res.status(422).json({
      error: 'Conversion failed',
      message: err.message,
      code: 'CONVERSION_ERROR'
    });
  }

  // Job not found
  if (err.name === 'JobNotFoundError') {
    return res.status(404).json({
      error: 'Job not found',
      message: err.message,
      code: 'JOB_NOT_FOUND'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    code: 'INTERNAL_ERROR'
  });
};

// Custom error classes
class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class ConversionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConversionError';
  }
}

class JobNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JobNotFoundError';
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  ConversionError,
  JobNotFoundError
};
