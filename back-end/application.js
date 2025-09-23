// Load environment variables only in development
// Skip loading .env files in production (Railway) to avoid overriding Railway variables
if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config({ 
		path: '.env.database' 
	});
}
const express = require("express")
const app = express()
const port = process.env.NODE_ENV === 'production' ? 3003 : 3000
const bodyParser = require('body-parser');
const session = require('express-session');
const mysql = require('mysql2')
const db = require('./db/db')
const allroutes = require('./routes/routes')
const FetchingRoute = require('./routes/fetching')
const statisticsRouter = require('./routes/statistics')
const userRouter = require('./routes/user')
const cors = require('cors')
const path = require("path");
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const crypto = require('crypto');
const { authenticateToken, checkPermission } = require('./middleware/auth');
const archiveRouter = require('./routes/archive');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { dbStoreNotificationRequest, dbGetNotificationRequests, dbUpdateNotificationRequestStatus } = require('./db/db');
const FileWatcher = require('./fileWatcher');

// Middleware pentru debug - logează toate cererile HTTP și informații despre sesiune
app.use((req, res, next) => {
	console.log(`---------------------------------------`);
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	console.log(`Headers: ${JSON.stringify(req.headers)}`);
	console.log(`Session exists: ${req.session ? 'yes' : 'no'}`);
	if (req.session) {
		console.log(`Session ID: ${req.session.id}`);
		console.log(`Session cookie: ${JSON.stringify(req.session.cookie)}`);
		console.log(`User ID: ${req.session.id_user || 'not set'}`);
		console.log(`User Role: ${req.session.role || 'not set'}`);
		console.log(`Session data: ${JSON.stringify(req.session)}`);
	} else {
		console.log(`No session exists for this request`);
	}
	console.log(`---------------------------------------`);
	next();
});

//////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
app.use(cors({
	origin: function(origin, callback) {
		const allowedOrigins = [
			'http://localhost:3000',
			'http://localhost:3001',
			'http://localhost:3002',
			'http://192.168.0.13:3000',
			'http://192.168.0.13:3002',
    'http://192.168.0.13:3003',
			// Allow access from any IP in local network
			/^http:\/\/192\.168\.0\.\d+:3002$/,
			/^http:\/\/192\.168\.1\.\d+:3002$/,
			/^http:\/\/10\.\d+\.\d+\.\d+:3002$/,
			/^http:\/\/172\.16\.\d+\.\d+:3002$/
		];
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) return callback(null, true);
		
		// Check string origins
		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		
		// Check regex origins 
		for (let allowedOrigin of allowedOrigins) {
			if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
		return callback(null, true);
			}
		}
		
		console.log('CORS blocked origin:', origin);
		const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
		return callback(new Error(msg), false);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
	exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


////////////////////sessions init\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
const sessionConfig = {
	key: 'session_cookie_name',
	secret: 'key',
	store: db.sessionStore,
	resave: true,
	saveUninitialized: true,
	cookie: {
		secure: false,
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		domain: process.env.NODE_ENV === 'production' ? '192.168.0.13' : 'localhost'
	}
};

console.log('Session configuration - cookie settings:', {
	maxAge: sessionConfig.cookie.maxAge,
	secure: sessionConfig.cookie.secure,
	httpOnly: sessionConfig.cookie.httpOnly,
	sameSite: sessionConfig.cookie.sameSite
});
app.use(session(sessionConfig));

// Middleware pentru a verifica și revalida sesiunea la fiecare cerere
app.use((req, res, next) => {
	if (req.session && req.session.id_user) {
		console.log('Session is valid for user:', req.session.id_user);
	} else {
		if (req.session) {
			console.log('Session exists but has no user ID');
		} else {
			console.log('No session object found');
		}
	}
	next();
});

db.sessionStore.onReady().then(() => {
	// MySQL session store ready for use.
	console.log('MySQLStore ready');
}).catch(error => {
	// Something went wrong.
	console.error(error);
});

////////////////////////////fichier des document js et css et autre\\\\\\\\\\\\\\\\\\\\\\\\\
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

////////////////////////pages routes\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// Enhanced session check with impersonation support
app.get('/session-check', (req, res) => {
    console.log('=== SESSION CHECK DEBUG (application.js) ===');
    console.log('Session exists:', !!req.session);
    console.log('Session ID user:', req.session?.id_user);
    console.log('Session role:', req.session?.role);
    console.log('Session isImpersonating:', req.session?.isImpersonating);
    console.log('Original session cookie:', req.cookies?.original_session);
    console.log('Session originalSession:', req.session?.originalSession);
    console.log('===============================================');

    if (!req.session || !req.session.id_user) {
        return res.json({ valid: false });
    }

    const response = {
        valid: true,
        id_user: req.session.id_user,
        role: req.session.role,
        nom: req.session.nom,
        prenom: req.session.prenom
    };

    // Add impersonation information if present
    if (req.session.isImpersonating) {
        console.log('🎭 IMPERSONATION DETECTED in session-check (application.js)!');
        response.isImpersonating = true;
        
        // Try multiple sources for original session data
        let originalSession = null;
        
        // First try from session storage
        if (req.session.originalSession) {
            console.log('📝 Using originalSession from session storage');
            originalSession = req.session.originalSession;
        } 
        // Fallback to cookie
        else if (req.cookies.original_session) {
            console.log('📝 Using originalSession from cookie');
            try {
                originalSession = JSON.parse(req.cookies.original_session);
            } catch (error) {
                console.error('❌ Error parsing original_session cookie:', error);
                console.error('❌ Cookie content:', req.cookies.original_session);
            }
        }
        
        if (originalSession) {
            console.log('✅ Found original session data:', originalSession);
            response.originalSession = originalSession;
        } else {
            console.error('❌ No original session data found!');
            // Still mark as impersonating but without original data
            response.originalSession = null;
        }
    } else {
        console.log('❌ No impersonation detected in session');
        response.isImpersonating = false;
    }

    console.log('📤 Response being sent (application.js):', JSON.stringify(response, null, 2));
    return res.json(response);
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
	setHeaders: (res, path) => {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	}
}));

app.use('/pdfs', express.static(path.join(__dirname, 'uploads'), {
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

function b64(input) { return Buffer.from(input).toString('base64'); }

async function cscPost(token, pathUrl, body) {
  const url = `${CSC.baseUrl.replace(/\/$/, '')}/${pathUrl.replace(/^\//, '')}`;
  const res = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 20000,
  });
  return res.data;
}

async function cscGet(token, pathUrl) {
  const url = `${CSC.baseUrl.replace(/\/$/, '')}/${pathUrl.replace(/^\//, '')}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });
  return res.data;
}

async function cscTokenExchange(code) {
  const url = `${CSC.oauthUrl.replace(/\/$/, '')}/token`;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: CSC.redirectUri,
  });
  const auth = `Basic ${b64(`${CSC.clientId}:${CSC.clientSecret}`)}`;
  const res = await axios.post(url, params.toString(), {
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });
  return res.data;
}

function uploadsAbsolutePath(relPath) {
  const clean = String(relPath || '').replace(/^\/+|\/+$|\.{2,}/g, '').replace(/\.{2,}/g, '');
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

const cscStateMemory = new Map();

// Start OAuth2 with provider
app.get('/post_docs/csc/start', (req, res) => {
  try {
    if (!CSC.oauthUrl || !CSC.clientId || !CSC.redirectUri) {
      return res.status(500).json({ error: 'CSC not configured' });
    }
    const state = crypto.randomBytes(16).toString('hex');
    cscStateMemory.set(state, { createdAt: Date.now() });
    const authorizeUrl = `${CSC.oauthUrl.replace(/\/$/, '')}/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: CSC.clientId,
      redirect_uri: CSC.redirectUri,
      scope: 'credential',
      state,
    }).toString();
    return res.redirect(authorizeUrl);
  } catch (e) {
    console.error('CSC start error:', e);
    res.status(500).send('CSC start failed');
  }
});

// OAuth2 callback
app.get('/post_docs/csc/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');
    if (!state || !cscStateMemory.has(state)) return res.status(400).send('Invalid state');
    cscStateMemory.delete(state);
    const token = await cscTokenExchange(code);
    req.session.csc = token;
    return res.send(`<!doctype html><html><body><script>
      try { window.opener && window.opener.postMessage({ type: 'CSC_CONNECTED' }, '*'); } catch(e){}
      window.close();
    </script><div>Connected. You can close this window.</div></body></html>`);
  } catch (e) {
    console.error('CSC callback error:', e.response?.data || e);
    res.status(500).send('CSC callback failed');
  }
});

// Prepare document hash under uploads
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

// Authorize signing (get SAD)
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
      hashAlgo: '2.16.840.1.101.3.4.2.1',
      description: 'EDMS document signature',
      clientData: 'EDMS',
    });
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
      signAlgo: '1.2.840.113549.1.1.11',
    });

    // Persist minimal signature proof (create table if not exists)
    try {
      const pool = await mysql.createPool({
        host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
        user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
        database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.MYSQL_DATABASE || 'PSPD'
      });
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
      await pool.query(
        `INSERT INTO table_document_signatures (id_document, file_path, provider, credential_id, hash_b64, signature_b64) VALUES (?,?,?,?,?,?)`,
        [null, (req.session.cscSigning && req.session.cscSigning.relativePath) || null, 'certSIGN', credentialID, hashB64, (signResp?.signature || signResp?.signatures?.[0]) || JSON.stringify(signResp)]
      );
    } catch (dbErr) {
      console.warn('CSC sign DB persist warning:', dbErr.message);
    }

    return res.json({ success: true, result: signResp });
  } catch (e) {
    console.error('CSC sign error:', e.response?.data || e);
    res.status(500).json({ success: false, message: 'sign failed', details: e.response?.data });
  }
});

// Mount routes
app.use('/', allroutes);
app.use('/', FetchingRoute);
app.use('/post_docs', require('./routes/post_doc')); // CSC signature endpoints and document operations
app.use('/api/statistics', statisticsRouter);
app.use('/api/archive', archiveRouter);
app.use('/api/admin', require('./routes/admin'));
// app.use('/api/notifications', require('./routes/admin')); // Temporarily disabled - duplicate import
app.use('/api/user', userRouter);
app.use('/api/documents', require('./routes/document')); // Document operations including signatures
app.use('/ai', require('./routes/ai')); // AI endpoints for document analysis

// Add a health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
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

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Something broke!', details: err.message });
});

// 404 handler
app.use((req, res) => {
	console.log('404 for URL:', req.url);
	res.status(404).json({ error: 'Not found' });
});

// Servim fișierele PDF din directorul uploads
app.get('/pdfs/uploads/*', (req, res) => {
	const filePath = req.params[0];
	const fullPath = path.join(__dirname, 'uploads', filePath);

	// Enhanced debugging
	console.log('PDF request (uploads) for:', fullPath);
	console.log('File exists check:', require('fs').existsSync(fullPath));

	if (!require('fs').existsSync(fullPath)) {
		console.log('File not found. Available files in directory:');
		const dirPath = path.dirname(fullPath);
		if (require('fs').existsSync(dirPath)) {
			console.log(require('fs').readdirSync(dirPath));
		} else {
			console.log('Directory does not exist:', dirPath);
		}
		return res.status(404).send('File not found: ' + filePath);
	}

	// Set proper headers for PDF
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
	res.sendFile(fullPath);
});

// Adăugăm o rută directă pentru fișierele PDF din locațiile specifice
app.get('/direct-pdf/:directory/:filename', async (req, res) => {
	const { directory, filename } = req.params;
	const versionId = req.query.version;
	const fs = require('fs');

	console.log('Direct PDF request for:', { directory, filename, versionId });

	try {
		let filePath = null;

		// If version ID is provided, get the file path from document_versions table
		if (versionId) {
			const con = await pool.getConnection();
			try {
				const [versionResult] = await con.query(
					'SELECT file_path FROM document_versions WHERE id_version = ?',
					[versionId]
				);
				con.release();

				if (versionResult && versionResult.length > 0) {
					filePath = versionResult[0].file_path;
					console.log('Found version file path:', filePath);
				}
			} catch (error) {
				console.error('Error querying document versions:', error);
				con.release();
			}
		}

		// If no version path found, try standard paths
		if (!filePath) {
			const paths = [
				path.join(__dirname, 'uploads', directory, filename),
				path.join(__dirname, '..', 'back-end', 'uploads', directory, filename),
				path.join(__dirname, '..', 'uploads', directory, filename),
				path.join(__dirname, 'uploads', filename),
				path.join(__dirname, '..', 'back-end', 'uploads', filename),
				path.join(__dirname, '..', 'uploads', filename)
			];

			console.log('Trying standard paths:', paths);

			for (const p of paths) {
				if (fs.existsSync(p)) {
					filePath = p;
					console.log('Found file at:', filePath);
					break;
				}
			}
		}

		if (!filePath) {
			console.log('File not found in any location');
			return res.status(404).json({ error: 'File not found' });
		}

		// Set proper headers for PDF
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
		res.sendFile(filePath);
	} catch (error) {
		console.error('Error serving PDF:', error);
		res.status(500).json({ error: 'Error serving PDF file', details: error.message });
	}
});

// Add a route to find PDF files recursively
app.get('/find-pdf/:filename', (req, res) => {
	const { filename } = req.params;
	const uploadsDir = path.join(__dirname, 'uploads');
	const fs = require('fs');

	function findFileRecursively(dir, targetFile) {
		try {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.join(dir, file);
				if (fs.statSync(filePath).isDirectory()) {
					const found = findFileRecursively(filePath, targetFile);
					if (found) return found;
				} else if (file === targetFile) {
					return filePath;
				}
			}
		} catch (error) {
			console.error(`Error searching directory ${dir}:`, error);
		}
		return null;
	}

	try {
		const filePath = findFileRecursively(uploadsDir, filename);
		if (filePath) {
			console.log('Found file at:', filePath);
			// Set proper headers for PDF
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
			res.sendFile(filePath);
		} else {
			console.log('File not found:', filename);
			res.status(404).send('File not found');
		}
	} catch (error) {
		console.error('Error finding file:', error);
		res.status(500).send('Error finding file');
	}
});

///////////////////////////////////fetching\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// Adăugăm o rută directă pentru fișierele PDF din locațiile specifice
app.get('/direct-pdf/:directory/:filename', (req, res) => {
	const { directory, filename } = req.params;
	const fs = require('fs');

	// Construct path to the file - try multiple possibilities
	const paths = [
		path.join(__dirname, 'uploads', directory, filename),
		path.join(__dirname, '..', 'back-end', 'uploads', directory, filename),
		path.join(__dirname, '..', 'uploads', directory, filename),
		path.join(__dirname, 'uploads', filename), // Try without directory
		path.join(__dirname, '..', 'back-end', 'uploads', filename),
		path.join(__dirname, '..', 'uploads', filename)
	];

	console.log('Direct PDF request for:', paths);

	// Find the first path that exists
	let filePath = null;
	for (const p of paths) {
		if (fs.existsSync(p)) {
			filePath = p;
			console.log('Found file at:', filePath);
			break;
		}
	}

	if (!filePath) {
		console.log('File not found in any of these locations:');
		paths.forEach(p => console.log(' - ' + p));
		return res.status(404).send('File not found');
	}

	// Serve the file
	res.setHeader('Content-Type', 'application/pdf');
	res.sendFile(filePath);
});

/////////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// Create HTTP server
const httpServer = createServer(app);

// Socket.IO configuration
const io = new Server(httpServer, {
	cors: {
		origin: process.env.NODE_ENV === 'production' 
			? ['http://192.168.1.3:3002', 'http://192.168.1.3']
			: ['http://localhost:3001', 'http://localhost:3000'],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		credentials: true,
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
	},
	path: '/socket.io',
	transports: ['polling', 'websocket'],
	pingTimeout: 60000,
	pingInterval: 25000,
	connectTimeout: 45000,
	allowEIO3: true,
	allowUpgrades: true,
	cookie: {
		name: 'io',
		path: '/',
		httpOnly: true,
		sameSite: 'lax'
	}
});

// Make io instance available to routes
app.set('io', io);

// Add session middleware to Socket.IO
io.use((socket, next) => {
	console.log('\n=== Socket.IO Session Middleware ===');
	console.log('Socket ID:', socket.id);
	console.log('Headers:', socket.handshake.headers);
	console.log('Cookies:', socket.handshake.headers.cookie);
	
	try {
		// Parse cookies manually to get session
		const cookies = socket.handshake.headers.cookie;
		if (cookies) {
			const cookiePairs = cookies.split(';').map(c => c.trim());
			let sessionCookie = null;
			
			for (const pair of cookiePairs) {
				if (pair.startsWith('session_cookie_name=')) {
					sessionCookie = pair.split('=')[1];
					break;
				}
			}
			
			if (sessionCookie) {
				console.log('Found session cookie:', sessionCookie);
				// Decode the session cookie (it's URL encoded)
				const decodedCookie = decodeURIComponent(sessionCookie);
				console.log('Decoded session cookie:', decodedCookie);
				
				// For now, let's just set a flag that we have a session
				socket.hasSession = true;
				console.log('✅ Session detected for socket');
			} else {
				console.log('❌ No session cookie found');
				socket.hasSession = false;
			}
		} else {
			console.log('❌ No cookies found');
			socket.hasSession = false;
		}
		
		next();
	} catch (error) {
		console.error('Error in session middleware:', error);
		// Don't fail the connection, just mark as no session
		socket.hasSession = false;
		next();
	}
});

// Socket.IO connection handling
io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);
	console.log('Client transport:', socket.conn.transport.name);
	console.log('Client headers:', socket.handshake.headers);

	socket.on('disconnect', (reason) => {
		console.log('Client disconnected:', socket.id, 'Reason:', reason);
	});

	socket.on('error', (error) => {
		console.error('Socket error:', error);
	});

	// Handle upload requests
	socket.on('uploadRequest', async (data) => {
		console.log('Received upload request:', data);
		try {
			// Store the request in the database
			const result = await db.dbStoreNotificationRequest(
				data.userId,
				'upload_request',
				parseFloat(data.currentUsage),
				parseFloat(data.planLimit),
				`Requesting additional storage space. Current usage: ${data.currentUsage}MB, Plan limit: ${data.planLimit}MB, File size: ${data.fileSize}MB`
			);

			console.log('Database result:', result);

			// Broadcast to admin clients
			const notification = {
				type: 'upload_request',
				requestId: result.insertId,
				...data,
				timestamp: new Date().toISOString()
			};
			io.emit('newNotification', notification);
		} catch (error) {
			console.error('Error handling upload request:', error);
			socket.emit('error', { message: 'Failed to process upload request' });
		}
	});

	// Handle storage upgrade requests
	socket.on('storageUpgradeRequest', async (data) => {
		console.log('Received storage upgrade request:', data);
		try {
			// Store the request in the database
			const result = await db.dbStoreNotificationRequest(
				data.userId,
				'storage_upgrade',
				parseFloat(data.current_usage),
				parseFloat(data.plan_limit),
				data.reason
			);

			console.log('Database result:', result);

			// Broadcast to admin clients
			const notification = {
				type: 'storage_upgrade',
				requestId: result.insertId,
				...data,
				timestamp: new Date().toISOString()
			};
			io.emit('storageUpgradeRequest', notification);
		} catch (error) {
			console.error('Error handling storage upgrade request:', error);
			socket.emit('error', { message: 'Failed to process storage upgrade request' });
		}
	});

	// Handle client subscriptions for real-time sync
	socket.on('subscribe', (data, callback) => {
		console.log('\n=== Client Subscription ===');
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

	// Handle file system changes for real-time sync
	socket.on('fileSystemChange', async (data, callback) => {
		console.log('\n🔥 === RECEIVED fileSystemChange FROM CLIENT ===');
		console.log('📅 Timestamp:', new Date().toISOString());
		console.log('🆔 Socket ID:', socket.id);
		console.log('👤 User:', socket.user);
		console.log('📦 Event data:', JSON.stringify(data, null, 2));
		console.log('🎯 Event type:', data.type);
		console.log('📁 Target folder:', data.targetFolder);
		console.log('📄 Document name:', data.documentName);
		console.log('🔄 From Electron:', data.fromElectron);
		
		try {
			// Accept the event if socket has session or if documentId is provided
			console.log('🔄 Processing fileSystemChange event...');
			console.log('Socket has session:', socket.hasSession);
			console.log('Document ID:', data.documentId);

			// Verifică datele
			if (!data || !data.type) {
				console.error('Invalid fileSystemChange data:', data);
				if (callback) callback({ success: false, message: 'Invalid data' });
				return;
			}

			let processedData = { ...data };
			processedData.userId = data.documentId; // Use documentId as fallback user identifier
			processedData.timestamp = new Date().toISOString();

			// Enrich with targetFolder and absolute targetPath for frontend listeners
			try {
				if (!processedData.targetFolder && data.documentPath) {
					processedData.targetFolder = data.documentPath;
				}
				if (!processedData.targetPath && data.documentPath && data.documentName) {
					const uploadsRoot = path.join(__dirname, 'uploads');
					processedData.targetPath = path.join(uploadsRoot, data.documentPath, data.documentName);
				}
			} catch (e) {
				console.warn('fileSystemChange enrich failed:', e.message);
			}

			// Emite actualizarea către toți clienții
			console.log('\n🚀 === EMITTING fileSystemUpdate TO ALL CLIENTS ===');
			console.log('📦 Processed data:', JSON.stringify(processedData, null, 2));
			console.log('👥 Connected clients:', io.engine.clientsCount);
			
			// Emit specific event for folder updates
			io.emit('fileSystemUpdate', processedData);
			
			// Also emit a more specific refresh event for the folder
			io.emit('refresh_folder', {
				folderPath: data.targetFolder || data.sourcePath,
				eventType: data.type,
				documentName: data.documentName,
				timestamp: processedData.timestamp,
				fromElectron: data.fromElectron
			});

			// Trimite confirmarea către clientul care a inițiat evenimentul
			const sourceType = data.fromElectron ? 'Electron' : 'React';
			console.log(`✅ Sending success callback to ${sourceType}`);
			if (callback) callback({ success: true });

		} catch (error) {
			console.error('Error processing fileSystemChange:', error);
			if (callback) callback({ success: false, message: error.message || 'Internal server error' });
		}
	});

	// Handle fileSystemUpdate events (from Electron)
	socket.on('fileSystemUpdate', async (data, callback) => {
		console.log('\n🔥 === RECEIVED fileSystemUpdate FROM ELECTRON ===');
		console.log('📅 Timestamp:', new Date().toISOString());
		console.log('🆔 Socket ID:', socket.id);
		console.log('📦 Event data:', JSON.stringify(data, null, 2));
		console.log('🎯 Event type:', data.type);
		console.log('📁 Target folder:', data.targetFolder);
		console.log('📄 Document name:', data.documentName);
		
		try {
			// Verifică datele
			if (!data || !data.type) {
				console.error('Invalid fileSystemUpdate data:', data);
				if (callback) callback({ success: false, message: 'Invalid data' });
				return;
			}

			let processedData = { ...data };
			processedData.timestamp = new Date().toISOString();

			// Emite actualizarea către toți clienții (inclusiv React)
			console.log('\n🚀 === BROADCASTING fileSystemUpdate TO ALL CLIENTS ===');
			console.log('📦 Processed data:', JSON.stringify(processedData, null, 2));
			console.log('👥 Connected clients:', io.engine.clientsCount);
			
			// Broadcast to all clients including React frontend
			io.emit('fileSystemUpdate', processedData);

			// Trimite confirmarea către Electron
			console.log('✅ Sending success callback to Electron');
			if (callback) callback({ success: true });

		} catch (error) {
			console.error('Error processing fileSystemUpdate:', error);
			if (callback) callback({ success: false, message: error.message || 'Internal server error' });
		}
	});
});

// Initialize FileWatcher for real-time file system monitoring
const fileWatcher = new FileWatcher(io, path.join(__dirname, 'uploads'));
fileWatcher.start();
console.log('FileWatcher initialized and started');

// Start the server
httpServer.listen(port, () => {
	console.log(`Server listening on port ${port}!`);
	console.log('Socket.IO server is ready');
});

// Adăugăm o rută pentru my_docs pentru a rezolva eroarea 404
app.get('/my_docs', async (req, res) => {
	if (!req.session || !req.session.id_user) {
		console.log('No valid session for /my_docs');
		return res.status(401).json({ error: 'Not authenticated' });
	}

	try {
		const id_user = req.session.id_user;
		console.log("My documents request for user:", id_user);

		const docs = await db.dbListDocumentsAdded(id_user);
		console.log("My documents result:", docs);

		res.json(docs);
	} catch (err) {
		console.error("Error in my_docs route:", err);
		res.status(500).json({ error: err.message });
	}
});

// Configure multer for file uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, 'uploads'))
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + '-' + file.originalname)
	}
});

const upload = multer({ 
	storage: storage,
	limits: {
		fileSize: 50 * 1024 * 1024 // 50MB limit
	},
	fileFilter: (req, file, cb) => {
		// Only accept PDF files
		if (file.mimetype === 'application/pdf') {
			cb(null, true);
		} else {
			cb(new Error('Only PDF files are allowed!'), false);
		}
	}
});

// Document routes
app.post('/api/documents', upload.single('file'), async (req, res) => {
	try {
		if (!req.session || !req.session.id_user) {
			return res.status(401).json({ error: 'Not authenticated' });
		}

		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const document = {
			title: req.body.title || req.file.originalname,
			description: req.body.description,
			file_path: req.file.path,
			file_size: req.file.size,
			mime_type: req.file.mimetype,
			created_by: req.session.id_user,
			metadata: JSON.parse(req.body.metadata || '{}')
		};

		const documentId = await db.dbAddDocument(document);
		res.status(201).json({ id: documentId, message: 'Document uploaded successfully' });
	} catch (error) {
		console.error('Error uploading document:', error);
		res.status(500).json({ error: 'Failed to upload document' });
	}
});

// Route for uploading new versions
app.post('/api/documents/:id/versions', upload.single('file'), async (req, res) => {
	try {
		if (!req.session || !req.session.id_user) {
			return res.status(401).json({ error: 'Not authenticated' });
		}

		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const version = {
			document_id: req.params.id,
			file_path: req.file.path,
			change_summary: req.body.change_summary || 'New version uploaded',
			created_by: req.session.id_user
		};

		const versionId = await db.dbAddDocumentVersion(version);
		res.status(201).json({ id: versionId, message: 'New version uploaded successfully' });
	} catch (error) {
		console.error('Error uploading new version:', error);
		res.status(500).json({ error: 'Failed to upload new version' });
	}
});

// Ruta pentru obținerea istoricului versiunilor
app.get('/api/documents/:id/versions', authenticateToken, checkPermission('view'), async (req, res) => {
	try {
		const versions = await db.dbGetDocumentVersions(req.params.id);
		res.json(versions);
	} catch (error) {
		console.error('Error getting document versions:', error);
		res.status(500).json({ error: 'Failed to get document versions' });
	}
});

// Ruta pentru obținerea statisticilor unui document
app.get('/api/documents/:id/statistics', authenticateToken, checkPermission('view'), async (req, res) => {
	try {
		const statistics = await db.dbGetDocumentStatistics(req.params.id);
		res.json(statistics);
	} catch (error) {
		console.error('Error getting document statistics:', error);
		res.status(500).json({ error: 'Failed to get document statistics' });
	}
});

// Ruta pentru obținerea notificărilor unui utilizator
app.get('/api/notifications', authenticateToken, async (req, res) => {
	try {
		const notifications = await db.dbGetUserNotifications(req.session.id_user);
		res.json(notifications);
	} catch (error) {
		console.error('Error getting notifications:', error);
		res.status(500).json({ error: 'Failed to get notifications' });
	}
});

// Ruta pentru marcarea unei notificări ca citită
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
	try {
		await db.dbUpdateNotificationStatus(req.params.id, req.session.id_user, true);
		res.json({ message: 'Notification marked as read' });
	} catch (error) {
		console.error('Error updating notification status:', error);
		res.status(500).json({ error: 'Failed to update notification status' });
	}
});

// Ruta pentru obținerea detaliilor unui document
app.get('/api/documents/:id', authenticateToken, async (req, res) => {
	try {
		const documentId = req.params.id;
		const con = await pool.getConnection();
		
		// Get document details
		const [documentResult] = await con.query(
			`SELECT td.*, 
					GROUP_CONCAT(DISTINCT dt.tag_name) as tags,
					GROUP_CONCAT(DISTINCT tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5) as keywords
			 FROM table_document td
			 LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
			 LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
			 LEFT JOIN table_mot_cle tmc ON td.id_document = tmc.id_document
			 WHERE td.id_document = ?
			 GROUP BY td.id_document`,
			[documentId]
		);

		con.release();

		if (!documentResult || documentResult.length === 0) {
			return res.status(404).json({ error: 'Document not found' });
		}

		const document = documentResult[0];
		
		// Process tags and keywords
		const tags = document.tags ? document.tags.split(',') : [];
		const keywords = document.keywords ? document.keywords.split(',').filter(k => k) : [];

		res.json({
			id: document.id_document,
			title: document.nom_document,
			description: document.comment,
			type: document.type,
			tags: tags,
			keywords: keywords,
			filename: document.nom_document,
			path: document.path
		});
	} catch (error) {
		console.error('Error getting document details:', error);
		res.status(500).json({ error: 'Failed to get document details' });
	}
});

// Ruta pentru obținerea fișierului PDF
app.get('/api/documents/:id/file', authenticateToken, async (req, res) => {
	try {
		const documentId = req.params.id;
		const con = await pool.getConnection();
		
		// Get document file path
		const [documentResult] = await con.query(
			'SELECT path, nom_document FROM table_document WHERE id_document = ?',
			[documentId]
		);

		con.release();

		if (!documentResult || documentResult.length === 0) {
			return res.status(404).json({ error: 'Document not found' });
		}

		const document = documentResult[0];
		const filePath = path.join(__dirname, 'uploads', document.path, document.nom_document);

		if (!fs.existsSync(filePath)) {
			return res.status(404).json({ error: 'File not found' });
		}

		// Send the file
		res.setHeader('Content-Type', 'application/pdf');
		res.sendFile(filePath);
	} catch (error) {
		console.error('Error getting document file:', error);
		res.status(500).json({ error: 'Failed to get document file' });
	}
});

// Handle HTTP notification requests
app.post('/api/notifications/upload-request', authenticateToken, async (req, res) => {
	try {
		const { userId, currentUsage, planLimit, fileSize } = req.body;
		
		console.log('Received HTTP upload request:', req.body);

		const result = await db.dbStoreNotificationRequest(
			userId,
			'upload_request',
			parseFloat(currentUsage),
			parseFloat(planLimit),
			`Requesting additional storage space. Current usage: ${currentUsage}MB, Plan limit: ${planLimit}MB, File size: ${fileSize}MB`
		);

		console.log('Database result:', result);

		// Broadcast to admin clients
		const notification = {
			type: 'upload_request',
			requestId: result.insertId,
			...req.body,
			timestamp: new Date().toISOString()
		};
		io.emit('newNotification', notification);

		res.json({ success: true, requestId: result.insertId });
	} catch (error) {
		console.error('Error handling upload request:', error);
		res.status(500).json({ error: 'Failed to process upload request' });
	}
});

module.exports = app;

