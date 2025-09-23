const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config');

module.exports = function(app) {
  app.use(
    ['/api', '/post_docs', '/session-check', '/list_user', '/download'],
    createProxyMiddleware({
      target: process.env.REACT_APP_ENV === 'production' 
        ? 'http://192.168.0.13:3003'
        : 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/api'
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add CORS headers
        proxyReq.setHeader('Origin', process.env.REACT_APP_ENV === 'production'
          ? 'http://192.168.0.13:3002'
          : 'http://localhost:3001'
        );
      }
    })
  );
};