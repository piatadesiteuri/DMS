const config = {
  apiUrl: process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENV === 'production'
    ? window.location.origin  // Use same domain as frontend in production
    : 'http://localhost:3000',
  frontendUrl: process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENV === 'production'
    ? window.location.origin  // Use same domain as frontend in production  
    : 'http://localhost:3001',
  
  // Alternative IP configuration
  altApiUrl: 'http://192.168.0.185:3003',     // Alternative backend IP
  altFrontendUrl: 'http://192.168.0.185:3002', // Alternative frontend IP
  
  // Backward compatibility methods
  getBaseUrl: function() {
    return this.apiUrl;
  },
  
  getFrontendUrl: function() {
    return this.frontendUrl;
  },
  
  getCurrentEnv: function() {
    return process.env.REACT_APP_ENV || 'development';
  },
  
  getApiConfig: function() {
    return {
      baseUrl: this.apiUrl,
      frontendUrl: this.frontendUrl,
      altBaseUrl: this.altApiUrl,
      altFrontendUrl: this.altFrontendUrl
    };
  }
};

// Exportăm și variabila backend pentru compatibilitate
export const backend = config.apiUrl;

export default config; 