require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const route = require('./routes/routes');
const FileWatcher = require('./fileWatcher');
const mysql = require('mysql2/promise');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000',
        'http://192.168.0.123:3001', 'http://192.168.0.124:3001', 
        'http://188.26.101.33:3002', 'http://188.26.101.33:3003', 'http://192.168.0.13:3000',
        'file://', 'file://*',
        // Railway domains
        /\.railway\.app$/, /\.up\.railway\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration
const sessionStore = new MySQLStore({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'digital_documents_db',
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

app.use(session({
    key: 'session_cookie_name',
    secret: 'session_cookie_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: false
    }
}));

// Routes
const archiveRouter = require('./routes/archive');
const statisticsRouter = require('./routes/statistics');
const fetchingRouter = require('./routes/fetching');
const adminRouter = require('./routes/admin');
const uploadRouter = require('./routes/upload');
const userRouter = require('./routes/user');

// Socket.IO configuration
const io = new Server(httpServer, {
    cors: {
        origin: [
            'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3000',
            'file://', 'file://*',
            // Railway domains
            /\.railway\.app$/, /\.up\.railway\.app$/
        ],
        credentials: true,
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    path: '/socket.io/',
    maxHttpBufferSize: 1e8, // Increase max payload size
    connectTimeout: 45000,
    allowUpgrades: true,
    perMessageDeflate: {
        threshold: 2048 // Only compress data above this size
    }
});

// Initialize file watcher
const fileWatcher = new FileWatcher(io, path.join(__dirname, 'uploads'));
fileWatcher.start();

// Helper functions for file system operations
async function checkUserPermission(userId, path, operation) {
    // Pentru moment, returnează true (implementare simplificată)
    // În viitor poate fi implementată logica reală de permisiuni
    console.log(`Checking ${operation} permission for user ${userId} on path ${path}`);
    return true;
}

async function updateDocumentLocation(documentId, targetFolder) {
    // Implementare simplificată pentru actualizarea locației documentului
    console.log(`Updating document ${documentId} location to ${targetFolder}`);
    // Aici ar trebui să actualizezi baza de date
    return true;
}

async function createFolder(path) {
    // Implementare simplificată pentru crearea folderului
    console.log(`Creating folder at path ${path}`);
    return true;
}

async function removeFolder(path) {
    // Implementare simplificată pentru ștergerea folderului
    console.log(`Removing folder at path ${path}`);
    return true;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('=== New WebSocket Connection ===');
    console.log('Client connected:', socket.id);
    console.log('Client transport:', socket.conn.transport.name);
    console.log('Client headers:', socket.conn.request.headers);
    console.log('Connected clients:', io.engine.clientsCount);

    // Send initial file system state
    const initialFiles = fileWatcher.fileCache;
    socket.emit('fileSystemUpdate', {
        type: 'initial',
        files: Array.from(initialFiles.values()),
        timestamp: new Date().toISOString()
    });

    // Set socket user from session (real implementation)
    socket.user = null; // Will be set when client subscribes

    // Handle statistics subscription
    socket.on('subscribeToStatistics', (data) => {
        console.log('📊 Client subscribed to statistics updates:', socket.id);
        socket.join('statistics'); // Join statistics room for targeted broadcasting
        
        // Send confirmation
        socket.emit('statisticsSubscriptionConfirmed', {
            success: true,
            message: 'Successfully subscribed to statistics updates'
        });
    });

    // Handle file system changes
    socket.on('fileSystemChange', async (data, callback) => {
        console.log('\n🔥 === RECEIVED fileSystemChange FROM REACT ===');
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('🆔 Socket ID:', socket.id);
        console.log('👤 User:', socket.user);
        console.log('📦 Event data:', JSON.stringify(data, null, 2));
        console.log('🎯 Event type:', data.type);
        console.log('📁 Target folder:', data.targetFolder);
        console.log('📄 Document name:', data.documentName);
        
        try {
            // Verifică autentificarea
            if (!socket.user) {
                console.log('❌ Socket user not authenticated');
                callback({ success: false, message: 'Unauthorized' });
                return;
            }

            // Verifică datele
            if (!data || !data.type) {
                console.error('Invalid fileSystemChange data:', data);
                callback({ success: false, message: 'Invalid data' });
                return;
            }

            let processedData = { ...data };
            processedData.userId = socket.user.id;
            processedData.timestamp = new Date().toISOString();

            // Procesează evenimentul în funcție de tip
            switch (data.type) {
                case 'add':
                    console.log('Processing add event (document upload)');
                    console.log('Source path:', data.sourcePath);
                    console.log('Target folder:', data.targetFolder);
                    
                    // Pentru upload, nu este nevoie de verificare suplimentară
                    // deoarece upload-ul a fost deja procesat în backend
                    // Doar retransmitem evenimentul
                    break;

                case 'move':
                    console.log('Processing move event');
                    console.log('Source path:', data.sourcePath);
                    console.log('Target folder:', data.targetFolder);
                    
                    // Verifică permisiunile
                    if (!await checkUserPermission(socket.user.id, data.targetFolder, 'write')) {
                        console.error('Permission denied for move operation');
                        callback({ success: false, message: 'Permission denied' });
                        return;
                    }

                    // Actualizează baza de date
                    await updateDocumentLocation(data.documentId, data.targetFolder);
                    break;

                case 'delete':
                    console.log('Processing delete event');
                    console.log('Source path:', data.sourcePath);
                    
                    // Pentru delete, documentul a fost deja șters în backend
                    // Doar retransmitem evenimentul
                    break;

                case 'create_folder':
                    console.log('Processing create_folder event');
                    console.log('Path:', data.path);
                    
                    // Verifică permisiunile
                    if (!await checkUserPermission(socket.user.id, data.path, 'write')) {
                        console.error('Permission denied for folder creation');
                        callback({ success: false, message: 'Permission denied' });
                        return;
                    }

                    // Creează folderul
                    await createFolder(data.path);
                    break;

                case 'remove_folder':
                    console.log('Processing remove_folder event');
                    console.log('Path:', data.path);
                    
                    // Verifică permisiunile
                    if (!await checkUserPermission(socket.user.id, data.path, 'write')) {
                        console.error('Permission denied for folder removal');
                        callback({ success: false, message: 'Permission denied' });
                        return;
                    }

                    // Șterge folderul
                    await removeFolder(data.path);
                    break;

                case 'refresh_folder':
                    console.log('Processing refresh_folder event');
                    console.log('Folder path:', data.folderPath);
                    
                    // Pentru refresh, doar retransmitem evenimentul
                    break;

                default:
                    console.warn('Unknown fileSystemChange type:', data.type);
                    callback({ success: false, message: 'Unknown operation type' });
                    return;
            }

            // Emite actualizarea către toți clienții
            console.log('\n🚀 === EMITTING fileSystemUpdate TO ALL CLIENTS ===');
            console.log('📦 Processed data:', JSON.stringify(processedData, null, 2));
            console.log('👥 Connected clients:', io.engine.clientsCount);
            io.emit('fileSystemUpdate', processedData);

            // Trimite confirmarea către clientul care a inițiat evenimentul
            console.log('✅ Sending success callback to React');
            callback({ success: true });

        } catch (error) {
            console.error('Error processing fileSystemChange:', error);
            callback({ success: false, message: error.message || 'Internal server error' });
        }
    });

    // Handle client subscriptions
    socket.on('subscribe', (data, callback) => {
        console.log('=== Client Subscription ===');
        console.log('Client ID:', socket.id);
        console.log('Subscription data:', data);
        
        // Set authenticated user for this socket
        if (data.userId) {
            socket.user = { 
                id: data.userId, 
                institution_id: data.institutionId 
            };
            console.log('Socket user set:', socket.user);
        
            // Join room for specific user
            socket.join(`user_${data.userId}`);
            
            // Join institution room only if institutionId exists (for institutional users)
            if (data.institutionId) {
                socket.join(`institution_${data.institutionId}`);
                console.log(`Client ${socket.id} joined rooms: user_${data.userId}, institution_${data.institutionId}`);
            } else {
                console.log(`Client ${socket.id} joined room: user_${data.userId} (personal user)`);
            }
            
            // Send acknowledgment
            if (callback) {
                callback({ success: true, message: 'Subscription successful' });
            }
        } else {
            console.error('Invalid subscription data:', data);
            if (callback) {
                callback({ success: false, message: 'Invalid subscription data' });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('=== Client Disconnected ===');
        console.log('Client ID:', socket.id);
        console.log('Remaining clients:', io.engine.clientsCount);
    });

    socket.on('error', (error) => {
        console.error('=== WebSocket Error ===');
        console.error('Client ID:', socket.id);
        console.error('Error details:', error);
    });
});

// Add error handling for the server
httpServer.on('error', (error) => {
    console.error('=== Server Error ===');
    console.error('Error details:', error);
});

// Add connection handling for the server
httpServer.on('connection', (socket) => {
    console.log('=== New HTTP Connection ===');
    console.log('Remote address:', socket.remoteAddress);
    console.log('Remote port:', socket.remotePort);
});

// Test endpoint pentru WebSocket debugging
app.post('/test-websocket-emit', (req, res) => {
    console.log('\n🧪 === TEST: Manual WebSocket emission ===');
    const testData = {
        type: 'add',
        targetFolder: 'Scoala Dabuleni/VALEO',
        documentName: 'TEST_DOCUMENT.pdf',
        documentId: 999,
        sourcePath: 'Scoala Dabuleni/VALEO',
        userId: 25,
        timestamp: new Date().toISOString()
    };
    
    console.log('📦 Test data:', JSON.stringify(testData, null, 2));
    console.log('👥 Connected clients:', io.engine.clientsCount);
    
    // Emit test event to all clients
    io.emit('fileSystemUpdate', testData);
    
    res.json({ 
        success: true, 
        message: 'Test WebSocket event emitted',
        data: testData,
        connectedClients: io.engine.clientsCount
    });
});

// Mount routes
app.use('/api/statistics', statisticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);
app.use('/api', route);
app.use('/post_docs', uploadRouter);
app.use('/api/sync-agent', route);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}));

// Serve Electron app downloads
app.use('/downloads', express.static(path.join(__dirname, 'sync-agent-dist'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}));

// ======== CSC (Cloud Signature Consortium) Minimal Integration (certSIGN) ========
// ENV required: CSC_BASE_URL, CSC_OAUTH_URL, CSC_CLIENT_ID, CSC_CLIENT_SECRET, CSC_REDIRECT_URI

const CSC = {
  baseUrl: process.env.CSC_BASE_URL || '',
  oauthUrl: process.env.CSC_OAUTH_URL || '',
  clientId: process.env.CSC_CLIENT_ID || '',
  clientSecret: process.env.CSC_CLIENT_SECRET || '',
  redirectUri: process.env.CSC_REDIRECT_URI || '',
};

function b64(input) {
  return Buffer.from(input).toString('base64');
}

async function cscTokenExchange(code) {
  const url = `${CSC.oauthUrl.replace(/\/$/, '')}/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CSC.redirectUri,
  });
  const auth = b64(`${CSC.clientId}:${CSC.clientSecret}`);
  const resp = await axios.post(url, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    timeout: 20000,
  });
  return resp.data; // { access_token, token_type, expires_in, refresh_token? }
}

async function cscGet(accessToken, endpoint) {
  const url = `${CSC.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const resp = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 });
  return resp.data;
}

async function cscPost(accessToken, endpoint, data) {
  const url = `${CSC.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const resp = await axios.post(url, data, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 });
  return resp.data;
}

function uploadsAbsolutePath(relPath) {
  const clean = String(relPath || '').replace(/^\/+|\/+$/g, '').replace(/\.\./g, '');
  return path.join(__dirname, 'uploads', clean);
}

function sha256FileBase64(absPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absPath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('base64')));
  });
}

// In-memory minimal store for demo
const cscStateMemory = new Map();

app.get('/post_docs/csc/start', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    cscStateMemory.set(state, { createdAt: Date.now() });
    const authorizeUrl = `${CSC.oauthUrl.replace(/\/$/, '')}/authorize?` +
      new URLSearchParams({
        response_type: 'code',
        client_id: CSC.clientId,
        redirect_uri: CSC.redirectUri,
        scope: 'service',
        state,
      }).toString();
    res.redirect(authorizeUrl);
  } catch (e) {
    console.error('CSC start error:', e);
    res.status(500).send('CSC start failed');
  }
});

app.get('/post_docs/csc/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');
    if (!state || !cscStateMemory.has(state)) return res.status(400).send('Invalid state');
    cscStateMemory.delete(state);
    const token = await cscTokenExchange(code);
    // Persist in session
    req.session.csc = token;
    // Minimal HTML that notifies opener and closes popup
    return res.send(`<!doctype html><html><body><script>
      try { window.opener && window.opener.postMessage({ type: 'CSC_CONNECTED' }, '*'); } catch(e){}
      window.close();
    </script><div>Connected. You can close this window.</div></body></html>`);
  } catch (e) {
    console.error('CSC callback error:', e.response?.data || e);
    res.status(500).send('CSC callback failed');
  }
});

// Calculate hash for a document under uploads (body: { relativePath: "Scoala Dabuleni/numenou/file.pdf" })
app.post('/post_docs/csc/prepare', async (req, res) => {
  try {
    const { relativePath } = req.body || {};
    if (!relativePath) return res.status(400).json({ success: false, message: 'relativePath required' });
    const abs = uploadsAbsolutePath(relativePath);
    if (!fs.existsSync(abs)) return res.status(404).json({ success: false, message: 'File not found' });
    const hashB64 = await sha256FileBase64(abs);
    req.session.cscSigning = { relativePath, hashB64 };
    return res.json({ success: true, hashB64 });
  } catch (e) {
    console.error('CSC prepare error:', e);
    res.status(500).json({ success: false, message: 'prepare failed' });
  }
});

// Authorize credential for signing (optional OTP not handled here)
app.post('/post_docs/csc/authorize', async (req, res) => {
  try {
    const token = req.session.csc?.access_token;
    if (!token) return res.status(401).json({ success: false, message: 'CSC not connected' });
    const signing = req.session.cscSigning || {};
    const hashB64 = signing.hashB64 || req.body?.hashB64;
    if (!hashB64) return res.status(400).json({ success: false, message: 'hashB64 required' });

    const creds = await cscGet(token, 'credentials/list');
    const credentialID = creds?.credentials?.[0]?.credentialID || creds?.[0]?.credentialID;
    if (!credentialID) return res.status(400).json({ success: false, message: 'No credentials available' });

    const authResp = await cscPost(token, 'credentials/authorize', {
      credentialID,
      numSignatures: 1,
      hashes: [hashB64],
      hashAlgo: '2.16.840.1.101.3.4.2.1', // SHA-256 OID
      description: 'EDMS document signature',
      clientData: 'EDMS',
    });
    // SAD might be nested; adapt for both formats
    const SAD = authResp?.SAD || authResp?.sad || authResp?.SAD?.[0] || authResp?.sad?.[0];
    req.session.cscSigning = { ...req.session.cscSigning, credentialID, SAD };
    return res.json({ success: true, credentialID, SAD, raw: authResp });
  } catch (e) {
    console.error('CSC authorize error:', e.response?.data || e);
    res.status(500).json({ success: false, message: 'authorize failed', details: e.response?.data });
  }
});

// Sign the prepared hash
app.post('/post_docs/csc/sign', async (req, res) => {
  try {
    const token = req.session.csc?.access_token;
    if (!token) return res.status(401).json({ success: false, message: 'CSC not connected' });
    const { credentialID: cid, SAD: sadOverride } = req.body || {};
    const signing = req.session.cscSigning || {};
    const credentialID = cid || signing.credentialID;
    const SAD = sadOverride || signing.SAD;
    const hashB64 = signing.hashB64 || req.body?.hashB64;
    if (!credentialID || !SAD || !hashB64) return res.status(400).json({ success: false, message: 'Missing credentialID/SAD/hashB64' });

    const signResp = await cscPost(token, 'signatures/signHash', {
      credentialID,
      SAD,
      hash: hashB64,
      hashAlgo: '2.16.840.1.101.3.4.2.1',
      signAlgo: '1.2.840.113549.1.1.11', // sha256WithRSAEncryption
    });

    // Persist signature minimal (if DB PSPD available)
    try {
      const pool = await mysql.createPool({ host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'PSPD' });
      await pool.query(`CREATE TABLE IF NOT EXISTS table_document_signatures (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_document INT NULL,
        file_path VARCHAR(512) NULL,
        provider VARCHAR(64) NOT NULL,
        credential_id VARCHAR(256) NULL,
        hash_b64 TEXT NOT NULL,
        signature_b64 LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await pool.query(`INSERT INTO table_document_signatures (id_document, file_path, provider, credential_id, hash_b64, signature_b64) VALUES (?,?,?,?,?,?)`, [
        null,
        signing.relativePath || null,
        'certSIGN',
        credentialID,
        hashB64,
        JSON.stringify(signResp),
      ]);
      try { await pool.end(); } catch {}
    } catch (dbErr) {
      console.warn('Signature DB persist warning:', dbErr.message);
    }

    return res.json({ success: true, signature: signResp });
  } catch (e) {
    console.error('CSC sign error:', e.response?.data || e);
    res.status(500).json({ success: false, message: 'sign failed', details: e.response?.data });
  }
});
// ======== END CSC ========

// Route for Electron app download page
app.get('/download-app', (req, res) => {
    const timestamp = Date.now();
    const downloadPageHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download EDMS Sync Agent</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            .download-section {
                margin: 20px 0;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            .download-btn {
                display: inline-block;
                padding: 12px 24px;
                background-color: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px;
                font-weight: bold;
            }
            .download-btn:hover {
                background-color: #0056b3;
            }
            .instructions {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .system-info {
                background-color: #d4edda;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📥 Download EDMS Sync Agent</h1>
            
            <div class="system-info">
                <h3>🖥️ System Requirements</h3>
                <p><strong>Windows:</strong> Windows 10 or later (64-bit)</p>
                <p><strong>macOS:</strong> macOS 10.14 or later</p>
                <p><strong>Linux:</strong> Ubuntu 18.04 or later, or equivalent</p>
            </div>

            <div class="download-section">
                <h3>🪟 Windows</h3>
                <p>Download the portable version for Windows:</p>
                <a href="/downloads/EDMS%20Sync%20Agent%201.0.0.exe?v=${timestamp}" class="download-btn">Portable (.exe)</a>
            </div>

            <div class="download-section">
                <h3>🍎 macOS</h3>
                <p>Download the application for macOS (available for both Intel and Apple Silicon):</p>
                <a href="/downloads/EDMS Sync Agent-1.0.0-mac-x64.dmg" class="download-btn">Download for Intel Mac (.dmg)</a>
                <a href="/downloads/EDMS Sync Agent-1.0.0-mac-arm64.dmg" class="download-btn">Download for Apple Silicon (.dmg)</a>
                <a href="/downloads/EDMS Sync Agent-1.0.0-mac-x64.zip" class="download-btn">Download Intel Mac (.zip)</a>
                <a href="/downloads/EDMS Sync Agent-1.0.0-mac-arm64.zip" class="download-btn">Download Apple Silicon (.zip)</a>
            </div>

            <div class="download-section">
                <h3>🐧 Linux</h3>
                <p>Choose your preferred package format:</p>
                <a href="/downloads/EDMS Sync Agent-1.0.0-linux-x86_64.AppImage" class="download-btn">Download AppImage</a>
                <a href="/downloads/EDMS Sync Agent-1.0.0-linux-amd64.deb" class="download-btn">Download .deb package</a>
            </div>

            <div class="instructions">
                <h3>📋 Installation Instructions</h3>
                <ol>
                    <li><strong>Download</strong> the appropriate version for your operating system</li>
                    <li><strong>Install</strong> the application using the downloaded installer</li>
                    <li><strong>Launch</strong> the EDMS Sync Agent from your desktop or start menu</li>
                    <li><strong>Login</strong> with your EDMS account credentials</li>
                    <li><strong>Start syncing</strong> your documents automatically</li>
                </ol>
                
                <h4>🔒 Multi-User Support</h4>
                <p>Each user can install and run their own instance of the application. Multiple users can be logged in simultaneously, each with their own data and settings.</p>
                
                <h4>🔄 Automatic Updates</h4>
                <p>The application will automatically check for updates and notify you when new versions are available.</p>
            </div>

            <div class="system-info">
                <h3>💡 Need Help?</h3>
                <p>If you encounter any issues during installation or usage:</p>
                <ul>
                    <li>Contact your system administrator</li>
                    <li>Check that you have an active internet connection</li>
                    <li>Ensure you have valid EDMS credentials</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(downloadPageHTML);
});

// Sync Agent file sync endpoint - serves files directly from uploads (FILTERED BY USER)
app.get('/api/sync-files/:institutionName', async (req, res) => {
    try {
        const institutionName = req.params.institutionName;
        const uploadsPath = path.join(__dirname, 'uploads', institutionName);
        
        if (!fs.existsSync(uploadsPath)) {
            return res.json({ success: false, message: 'Institution folder not found' });
        }

        // Get user ID from session
        const userId = req.session?.id_user;
        if (!userId) {
            return res.json({ success: false, message: 'User not authenticated' });
        }

        console.log(`🔍 Filtering documents for user ID: ${userId}`);

        // Get user's documents from database
        const db = require('./db/db');
        const userDocuments = await db.dbMyDocuments(userId);
        console.log(`📄 Found ${userDocuments.length} user documents in database`);

        // Create a map of user documents by filename for quick lookup
        const userDocumentNames = new Set(userDocuments.map(doc => doc.nom_document));
        console.log(`📋 User document names:`, Array.from(userDocumentNames).slice(0, 10));

        // Recursively get PDF files (FILTERED by user ownership)
        function getUserPDFs(dir, basePath = '') {
            const files = [];
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const relativePath = path.join(basePath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Skip .recycle folder
                    if (item === '.recycle') {
                        continue;
                    }
                    files.push(...getUserPDFs(fullPath, relativePath));
                } else if (item.toLowerCase().endsWith('.pdf')) {
                    // Skip version files (ending with _V followed by number)
                    if (/_V\d+\.pdf$/i.test(item)) {
                        continue;
                    }

                    // 🎯 FILTER: Only include files that belong to current user
                    if (userDocumentNames.has(item)) {
                        files.push({
                            name: item,
                            path: relativePath.replace(/\\/g, '/'),
                            size: stat.size,
                            modified: stat.mtime.toISOString(),
                            downloadUrl: `/uploads/${institutionName}/${relativePath.replace(/\\/g, '/')}`
                        });
                    }
                }
            }
            return files;
        }

        const files = getUserPDFs(uploadsPath);
        
        console.log(`✅ FILTERED RESULT: ${files.length} user files out of total files in uploads`);
        
        res.json({
            success: true,
            institution: institutionName,
            userId: userId,
            totalFiles: files.length,
            files: files
        });
        
    } catch (error) {
        console.error('❌ Error in sync-files endpoint:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// API endpoint to check available downloads
app.get('/api/downloads/list', (req, res) => {
    try {
        const distPath = path.join(__dirname, 'sync-agent-dist');
        if (!fs.existsSync(distPath)) {
            return res.json({ available: false, message: 'No builds available' });
        }

        const files = fs.readdirSync(distPath).filter(file => {
            return file.endsWith('.exe') || file.endsWith('.dmg') || 
                   file.endsWith('.AppImage') || file.endsWith('.deb') || 
                   file.endsWith('.rpm');
        });

        const fileDetails = files.map(file => {
            const filePath = path.join(distPath, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                downloadUrl: `/downloads/${file}`
            };
        });

        res.json({
            available: true,
            files: fileDetails,
            version: '1.0.0',
            buildDate: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list downloads' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// 404 handler
app.use((req, res) => {
    console.log('404 Not Found:', req.method, req.url);
    res.status(404).json({ error: 'Not found' });
});

// Change app.listen to httpServer.listen
const port = process.env.PORT || 3000;

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../front-end/build')));

// API routes
app.use('/api', route);

// Serve React app for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../front-end/build', 'index.html'));
});
httpServer.listen(port, () => console.log(`Server listening on port ${port}!`));

// Export both app and io for use in other modules
module.exports = { app, io }; 