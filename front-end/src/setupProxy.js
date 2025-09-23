const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config');

module.exports = function(app) {
  app.use(
    ['/api', '/post_docs', '/session-check', '/list_user', '/download'],
    createProxyMiddleware({
      target: process.env.NODE_ENV === 'production' 
        ? window?.location?.origin || 'https://dms-production-2ce3.up.railway.app'
        : 'http://localhost:3000',
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api': '/api'
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add CORS headers
        proxyReq.setHeader('Origin', process.env.NODE_ENV === 'production'
          ? window?.location?.origin || 'https://dms-production-2ce3.up.railway.app'
          : 'http://localhost:3001'
        );
      }
    })
  );
};