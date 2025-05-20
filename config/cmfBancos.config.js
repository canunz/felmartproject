module.exports = {
  apiUrl: process.env.CMF_API_URL || 'https://api.cmfchile.cl/api-sbifv3/recursos_api',
  apiKey: process.env.CMF_API_KEY,
  formato: 'json',
  timeout: 5000,
  retryAttempts: 3
}; 