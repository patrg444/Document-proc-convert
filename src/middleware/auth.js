const validateRapidAPI = (req, res, next) => {
  // RapidAPI sends a proxy secret header to verify requests
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  const expectedSecret = process.env.RAPIDAPI_PROXY_SECRET;

  if (!expectedSecret) {
    console.warn('RAPIDAPI_PROXY_SECRET not configured');
    return next();
  }

  if (!proxySecret || proxySecret !== expectedSecret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API credentials',
      code: 'UNAUTHORIZED'
    });
  }

  // Store RapidAPI user info from headers
  req.rapidapi = {
    user: req.headers['x-rapidapi-user'],
    subscription: req.headers['x-rapidapi-subscription'],
    version: req.headers['x-rapidapi-version']
  };

  next();
};

module.exports = {
  validateRapidAPI
};
