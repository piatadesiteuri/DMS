// Sync Agent Configuration
module.exports = {
    // Auto-upload settings
    autoUpload: {
        enabled: true,
        fileTypes: ['.pdf'],
        ignorePatterns: [
            /(^|[\/\\])\../,  // ignore dotfiles
            /_V\d+\.pdf$/i,   // ignore version artifacts
            /\.tmp$/i,        // ignore temp files
            /\.temp$/i        // ignore temp files
        ],
        delay: 1000, // 1 second delay to avoid processing move operations
        maxRetries: 3
    },
    
    // Thumbnail generation settings
    thumbnails: {
        enabled: true,
        usePdf2pic: true, // Match web UploadPage behavior
        fallbackToPdf: true,
        maxSize: 400 * 500, // 400x500 pixels
        quality: 80
    },
    
    // File processing settings
    fileProcessing: {
        extractText: true,
        generateKeywords: true,
        generateTags: true,
        maxKeywords: 5,
        maxTags: 8
    },
    
    // Database settings
    database: {
        connectionTimeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // WebSocket settings
    websocket: {
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        timeout: 20000
    },
    
    // UI settings
    ui: {
        showNotifications: true,
        notificationDuration: 3000,
        refreshDelay: 500
    }
};
