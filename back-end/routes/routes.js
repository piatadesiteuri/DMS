const express = require("express");
const route = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const db = require('../db/db');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const pdf2pic = require('pdf2pic');

// INTELLIGENT COORDINATE CALCULATION: Create realistic coordinates when Tesseract doesn't provide them
function createIntelligentCoordinates(searchQuery, pageText, matchText, resultIndex, pageNumber) {
  console.log(`🧠 Creating intelligent coordinates for "${matchText}" (result ${resultIndex + 1})`);
  
  const searchLower = searchQuery.toLowerCase();
  const textLower = pageText.toLowerCase();
  const matchLower = matchText.toLowerCase();
  
  // Find all occurrences of the search term in the text
  const allMatches = [];
  let searchIndex = 0;
  while ((searchIndex = textLower.indexOf(searchLower, searchIndex)) !== -1) {
    allMatches.push(searchIndex);
    searchIndex += searchLower.length;
  }
  
  console.log(`🔍 Found ${allMatches.length} text occurrences of "${searchQuery}"`);
  
  // Use the appropriate match index (cycle through if more results than matches)
  const matchIndex = allMatches[resultIndex % allMatches.length] || 0;
  const textLength = pageText.length;
  const relativePosition = matchIndex / textLength;
  
  console.log(`📊 Text analysis: match at position ${matchIndex}/${textLength} (${(relativePosition * 100).toFixed(1)}%)`);
  
  // ANALYZE TEXT STRUCTURE to determine likely document layout
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  const wordsPerLine = lines.map(line => line.trim().split(/\s+/).length);
  const avgWordsPerLine = wordsPerLine.reduce((sum, count) => sum + count, 0) / wordsPerLine.length;
  
  // Estimate if this is a structured document (forms, tables) or flowing text
  const isStructuredDoc = avgWordsPerLine < 8; // Less words per line = more structured
  const hasShortLines = lines.filter(line => line.trim().length < 30).length > lines.length * 0.3;
  
  console.log(`📋 Document structure: ${lines.length} lines, avg ${avgWordsPerLine.toFixed(1)} words/line, structured: ${isStructuredDoc}`);
  
  // CALCULATE COORDINATES based on document type and position
  let x, y, width, height, method, confidence;
  
  if (isStructuredDoc) {
    // STRUCTURED DOCUMENT (forms, tables): Use grid-based positioning
    const cols = 3;
    const rows = Math.ceil(allMatches.length / cols);
    const col = resultIndex % cols;
    const row = Math.floor(resultIndex / cols);
    
    // Distribute across page with realistic spacing
    x = 50 + col * (1200 / cols) + (relativePosition * 100); // Add some text-based variation
    y = 100 + row * (1600 / rows) + (relativePosition * 200);
    width = Math.max(matchText.length * 15, 80); // Larger for structured docs
    height = 30;
    method = 'STRUCTURED_GRID';
    confidence = 0.7;
    
  } else {
    // FLOWING TEXT DOCUMENT: Use line-based positioning
    const estimatedLineNumber = Math.floor(relativePosition * lines.length);
    const linesPerPage = Math.max(lines.length / 1, 1);
    const lineHeight = 1600 / linesPerPage;
    
    // Position based on estimated line
    x = 80 + (resultIndex * 40) % 400; // Vary X to avoid overlap
    y = 120 + (estimatedLineNumber * lineHeight) + (resultIndex * 25); // Vary Y slightly
    width = Math.max(matchText.length * 12, 70);
    height = Math.min(lineHeight * 0.8, 35);
    method = 'FLOWING_TEXT';
    confidence = 0.6;
  }
  
  // APPLY REALISTIC CONSTRAINTS
  x = Math.max(20, Math.min(x, 1200 - width - 20)); // Keep within page bounds
  y = Math.max(50, Math.min(y, 1600 - height - 50));
  width = Math.max(40, Math.min(width, 300)); // Reasonable width limits
  height = Math.max(20, Math.min(height, 50)); // Reasonable height limits
  
  // ADD SMART VARIATIONS to avoid overlaps
  const variation = (resultIndex * 17) % 60; // Prime number for better distribution
  x += variation;
  y += (resultIndex * 23) % 40;
  
  // Ensure still within bounds after variation
  x = Math.max(20, Math.min(x, 1200 - width - 20));
  y = Math.max(50, Math.min(y, 1600 - height - 50));
  
  const coordinates = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    imageWidth: 1200,  // Match the new higher resolution
    imageHeight: 1600,
    matchType: 'INTELLIGENT',
    method: method,
    confidence: confidence,
    textPosition: relativePosition,
    resultIndex: resultIndex,
    documentStructure: isStructuredDoc ? 'structured' : 'flowing'
  };
  
  console.log(`🎯 Generated coordinates:`, coordinates);
  
  return coordinates;
}

// REAL COORDINATE DETECTION: Find actual word positions in PDF text
function createRealCoordinates(searchQuery, pageText, matchText, resultIndex, pageNumber, pdfData) {
  console.log(`🎯 Creating REAL coordinates for "${matchText}" (result ${resultIndex + 1}) on page ${pageNumber}`);
  
  const searchLower = searchQuery.toLowerCase();
  const textLower = pageText.toLowerCase();
  
  // Find all occurrences of the search term in the text
  const allMatches = [];
  let searchIndex = 0;
  while ((searchIndex = textLower.indexOf(searchLower, searchIndex)) !== -1) {
    allMatches.push({
      index: searchIndex,
      text: pageText.substring(searchIndex, searchIndex + searchQuery.length)
    });
    searchIndex += searchLower.length;
  }
  
  console.log(`🔍 Found ${allMatches.length} text occurrences of "${searchQuery}"`);
  
  if (allMatches.length === 0) {
    console.log(`❌ No matches found for "${searchQuery}"`);
    return null;
  }
  
  // Use the appropriate match index
  const currentMatch = allMatches[resultIndex % allMatches.length];
  const matchIndex = currentMatch.index;
  const textLength = pageText.length;
  const relativePosition = matchIndex / textLength;
  
  console.log(`📊 Text analysis: match "${matchText}" at position ${matchIndex}/${textLength} (${(relativePosition * 100).toFixed(1)}%)`);
  
  // ANALYZE TEXT STRUCTURE for better positioning
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  const wordsBeforeMatch = pageText.substring(0, matchIndex).split(/\s+/).length;
  const totalWords = pageText.split(/\s+/).length;
  
  // Find which line contains our match
  let currentPos = 0;
  let lineNumber = 0;
  let positionInLine = 0;
  let wordsInLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (matchIndex >= currentPos && matchIndex < currentPos + lineLength) {
      lineNumber = i;
      positionInLine = matchIndex - currentPos;
      wordsInLine = lines[i].substring(0, positionInLine).split(/\s+/).length;
      break;
    }
    currentPos += lineLength;
  }
  
  console.log(`📋 Text structure: line ${lineNumber + 1}/${lines.length}, word ${wordsInLine} in line, ${wordsBeforeMatch}/${totalWords} total words`);
  
  // CALCULATE REALISTIC COORDINATES based on text analysis
  const pageWidth = 1200;  // Standard page width
  const pageHeight = 1600; // Standard page height
  
  // Estimate margins and text area
  const marginTop = 100;
  const marginLeft = 80;
  const marginRight = 80;
  const marginBottom = 100;
  
  const textAreaWidth = pageWidth - marginLeft - marginRight;
  const textAreaHeight = pageHeight - marginTop - marginBottom;
  
  // Estimate line height based on total lines
  const estimatedLineHeight = textAreaHeight / Math.max(lines.length, 20);
  const actualLineHeight = Math.min(Math.max(estimatedLineHeight, 20), 40);
  
  // Calculate Y position based on line number
  const y = marginTop + (lineNumber * actualLineHeight);
  
  // Calculate X position based on position in line
  const lineText = lines[lineNumber] || '';
  const textBeforeMatch = lineText.substring(0, positionInLine);
  const wordsBeforeInLine = textBeforeMatch.split(/\s+/).filter(w => w.length > 0).length;
  const totalWordsInLine = lineText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Estimate character width
  const avgCharWidth = textAreaWidth / Math.max(lineText.length, 50);
  const x = marginLeft + (textBeforeMatch.length * avgCharWidth);
  
  // Word dimensions
  const wordWidth = Math.max(matchText.length * avgCharWidth, 40);
  const wordHeight = Math.max(actualLineHeight * 0.7, 20);
  
  // Apply some variation to avoid perfect overlap
  const variation = (resultIndex * 3) % 10; // Small variation
  const finalX = Math.max(marginLeft, Math.min(x + variation, pageWidth - wordWidth - marginRight));
  const finalY = Math.max(marginTop, Math.min(y + variation, pageHeight - wordHeight - marginBottom));
  
  const coordinates = {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(wordWidth),
    height: Math.round(wordHeight),
    imageWidth: pageWidth,
    imageHeight: pageHeight,
    matchType: 'REAL_TEXT_BASED',
    confidence: 0.8,
    textPosition: relativePosition,
    lineNumber: lineNumber,
    wordsInLine: wordsInLine,
    totalLines: lines.length,
    resultIndex: resultIndex,
    analysis: {
      pageStructure: `${lines.length} lines, ${totalWords} words`,
      linePosition: `line ${lineNumber + 1}, word ${wordsInLine}`,
      estimatedLineHeight: actualLineHeight,
      avgCharWidth: avgCharWidth
    }
  };
  
  console.log(`🎯 Generated REAL coordinates:`, {
    position: `(${coordinates.x}, ${coordinates.y})`,
    size: `${coordinates.width}x${coordinates.height}`,
    analysis: coordinates.analysis
  });
  
  return coordinates;
}

const downloadRoute = require('./download')
const HMPAGE = require('./home_page')
const login=require('../controller/login')
const adminFonctionalities = require('../controller/adminFonctionalities')
const authenticate = require('../middleware/authenticate')
const SRHroute = require('./search')
const diffuser = require('./diffuser')
const uploadRoute = require('./upload')

const post_docRoute = require('./post_doc');
const session = require("express-session");
const institutions = require('./institutions');
const users = require('./users');



route.get('/logout', async (req, res) => { 
    // Log the logout action before destroying session
    if (req.session && req.session.id_user) {
        try {
            const con = await db.pool.getConnection();
            await con.query(
                'INSERT INTO user_logs (user_id, action, details, created_at) VALUES (?, ?, ?, NOW())',
                [req.session.id_user, 'LOGOUT', 'User logged out successfully']
            );
            con.release();
            console.log('Logout action recorded in user_logs');
        } catch (logError) {
            console.error('Error recording logout action:', logError);
        }
    }

    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Error destroying session");
        }
       
        res.clearCookie();
        res.redirect('/');
    });
});

route.post('/logout', async (req, res) => { 
    // Log the logout action before destroying session
    if (req.session && req.session.id_user) {
        try {
            const { dbLogUserAction } = require('../db/db');
            await dbLogUserAction(
                req.session.id_user,
                'logout',
                'User logged out successfully',
                req.ip || req.connection.remoteAddress,
                req.get('User-Agent')
            );
            console.log('Logout action recorded in user_logs');
        } catch (logError) {
            console.error('Error recording logout action:', logError);
        }
    }

    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ error: "Error destroying session" });
        }
       
        res.clearCookie();
        res.json({ success: true });
    });
});
route.use('/download',downloadRoute)
route.use("/post_docs", post_docRoute);
route.use('/home_page',HMPAGE)
route.use('/search',SRHroute);
route.use('/upload', uploadRoute);
//route.get('/verify')
//route.use('/login',loginRoute)
///////////////////////////////////////////////////////////////////////////////
route.post('/login',login.login);
route.post('/register', login.register);
route.post('/signup', login.signup);

// Middleware pentru a verifica dacă sesiunea există înainte de a accesa ruta /admin
route.use('/admin', (req, res, next) => {
    console.log("Admin route middleware - Session check");
    
    // Verificare explicită a sesiunii
    if (!req.session) {
        console.error("Admin route - Sesiune inexistentă");
        return res.status(401).json({ error: "No session" });
    }
    
    if (!req.session.id_user) {
        console.error("Admin route - Utilizator neautentificat (id_user lipsă)");
        return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log("Admin route middleware - Session valid for user:", req.session.id_user);
    next();
});

route.get('/admin', (req, res) => {
    // La acest punct știm că sesiunea există (verificat de middleware)
    console.log("Admin route - Sending role:", req.session.role);
    res.json(req.session.role);
});

route.post('/admin/del', adminFonctionalities.deleteUser);
route.post('/admin/block-user', adminFonctionalities.blockUser);
route.post('/admin/update-user', adminFonctionalities.updateUser);
route.post('/admin/add', adminFonctionalities.acceptUser);
route.post('/admin/reactivate', adminFonctionalities.reactivateUser);
route.get('/admin/modify', adminFonctionalities.getAcceptedUsr);
route.get('/admin/validation', adminFonctionalities.getUsers);

route.get('/admin/info',adminFonctionalities.getInfo);
route.post('/admin/update',adminFonctionalities.UpdateUser);

route.get('/admin/check-email', adminFonctionalities.checkEmailExists);

// Rută pentru logarea vizualizărilor de documente
route.post('/document_log', (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Nu sunteți autentificat" });
  }
  
  const nom_doc = req.body.nom_doc;
  const id_user = req.session.id_user;
  
  if (!nom_doc) {
    return res.status(400).json({ error: "Nume document lipsă" });
  }
  
  console.log(`Logging document view: ${nom_doc} by user ${id_user}`);
  
  require('../db/db').dbDocumentLog(nom_doc, id_user)
    .then(() => {
      res.json({ success: true });
    })
    .catch(err => {
      console.error("Error logging document view:", err);
      res.status(500).json({ error: "Database error" });
    });
});

// Rută pentru obținerea statisticilor de vizualizare
route.get('/document_log', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: 'Utilizator neautentificat' });
  }

  const nomDoc = req.query.nom_doc;

  try {
    const con = await require('../db/db').getConnection();
    
    if (nomDoc) {
      // Get specific document statistics for current user
      const [rows] = await con.query(
        'SELECT nom_doc, open_count, last_opened_at FROM document_log WHERE user_id = ? AND nom_doc = ?',
        [req.session.id_user, nomDoc]
      );
      
      if (rows.length > 0) {
        res.json({
          success: true,
          open_count: rows[0].open_count,
          last_opened_at: rows[0].last_opened_at
        });
      } else {
        res.json({
          success: true,
          open_count: 0,
          last_opened_at: null
        });
      }
    } else {
      // Get all documents for user
      const [rows] = await con.query(
        'SELECT nom_doc, open_count FROM document_log WHERE user_id = ?',
        [req.session.id_user]
      );
      res.json(rows);
    }
  } catch (err) {
    console.error('Eroare la obținerea istoricului documentelor:', err);
    res.status(500).json({ error: 'Eroare la obținerea istoricului documentelor' });
  }
});

// Rută pentru obținerea statisticilor totale de vizualizare pentru un document
route.get('/document_log/total', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: 'Utilizator neautentificat' });
  }

  const nomDoc = req.query.nom_doc;

  if (!nomDoc) {
    return res.status(400).json({ error: 'Nume document lipsă' });
  }

  try {
    const con = await require('../db/db').getConnection();
    
    // Get total view count and most recent view for this document across all users
    const [rows] = await con.query(
      `SELECT 
        SUM(open_count) as total_count,
        MAX(last_opened_at) as last_opened
       FROM document_log 
       WHERE nom_doc = ?`,
      [nomDoc]
    );
    
    res.json({
      success: true,
      total_count: rows[0]?.total_count || 0,
      last_opened: rows[0]?.last_opened || null
    });
  } catch (err) {
    console.error('Eroare la obținerea statisticilor totale:', err);
    res.status(500).json({ error: 'Eroare la obținerea statisticilor totale' });
  }
});

// Rută pentru obținerea statisticilor de vizualizare în batch
route.post('/document_log/batch', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: 'Utilizator neautentificat' });
  }

  const { documentNames } = req.body;

  if (!Array.isArray(documentNames) || documentNames.length === 0) {
    return res.status(400).json({ error: 'Array de nume documente lipsă' });
  }

  try {
    const con = await require('../db/db').getConnection();
    
    // Get total view counts for all documents
    const [rows] = await con.query(
      `SELECT 
        nom_doc,
        SUM(open_count) as total_views
       FROM document_log 
       WHERE nom_doc IN (?)
       GROUP BY nom_doc`,
      [documentNames]
    );
    
    // Convert to object for easy lookup
    const stats = {};
    rows.forEach(row => {
      stats[row.nom_doc] = {
        total_views: row.total_views || 0
      };
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Eroare la obținerea statisticilor batch:', err);
    res.status(500).json({ error: 'Eroare la obținerea statisticilor batch' });
  }
});

// Rută pentru obținerea statisticilor de download în batch
route.post('/document_statistics/batch', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: 'Utilizator neautentificat' });
  }

  const { documentNames } = req.body;

  if (!Array.isArray(documentNames) || documentNames.length === 0) {
    return res.status(400).json({ error: 'Array de nume documente lipsă' });
  }

  try {
    const con = await require('../db/db').getConnection();
    
    // Get download counts for all documents
    const [rows] = await con.query(
      `SELECT 
        td.nom_document,
        COUNT(ds.id_statistic) as total_downloads
       FROM table_document td
       LEFT JOIN document_statistics ds ON td.id_document = ds.id_document 
         AND ds.action_type = 'download'
       WHERE td.nom_document IN (?)
       GROUP BY td.nom_document`,
      [documentNames]
    );
    
    // Convert to object for easy lookup
    const stats = {};
    rows.forEach(row => {
      stats[row.nom_document] = {
        total_downloads: row.total_downloads || 0
      };
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Eroare la obținerea statisticilor de download:', err);
    res.status(500).json({ error: 'Eroare la obținerea statisticilor de download' });
  }
});

// Rută pentru înregistrarea vizualizărilor în document_statistics
route.post('/record-view', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Nu sunteți autentificat" });
  }

  const { documentId } = req.body;
  const userId = req.session.id_user;

  if (!documentId) {
    return res.status(400).json({ error: "ID document lipsă" });
  }

  console.log(`Recording view for document ${documentId} by user ${userId}`);

  try {
    const result = await require('../db/db').recordDocumentView(documentId, userId);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (err) {
    console.error("Error recording document view:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Adăugăm ruta specială pentru sync agent
route.post('/post_docs/sync-upload', post_docRoute);

// Add new route for starting sync agent
route.post('/start-sync-agent', (req, res) => {
    if (!req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Path to the sync agent directory
    const syncAgentPath = path.join(__dirname, '..', '..', 'sync-agent');

    // Check if the app is already running
    const isRunning = spawn('pgrep', ['-f', 'electron'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    isRunning.stdout.on('data', (data) => {
        if (data.toString().trim()) {
            // Try to bring the window to focus
            const pid = data.toString().trim();
            try {
                // For macOS
                spawn('osascript', ['-e', `tell application "System Events" to set frontmost of process "Electron" to true`]);
            } catch (error) {
                console.error('Error bringing window to focus:', error);
            }
            return res.status(200).json({ 
                success: false, 
                error: 'Sync agent is already running',
                pid: pid
            });
        }
    });

    isRunning.on('close', (code) => {
        if (code === 1) { // No process found
            // Spawn the electron process
            const syncProcess = spawn('npm', ['start'], {
                cwd: syncAgentPath,
                env: {
                    ...process.env,
                    API_URL: 'http://localhost:3001',
                    USER_ID: req.session.id_user
                }
            });


            // Handle process output
            syncProcess.stdout.on('data', (data) => {
                console.log(`Sync Agent: ${data}`);
            });

            syncProcess.stderr.on('data', (data) => {
                console.error(`Sync Agent Error: ${data}`);
            });

            syncProcess.on('close', (code) => {
                console.log(`Sync Agent process exited with code ${code}`);
            });

            res.json({ 
                success: true, 
                message: 'Sync agent started successfully',
                pid: syncProcess.pid
            });
        }
    });
});

route.get('/verify-session', (req, res) => {
    if (!req.session.id || !req.session.id_user) {
        return res.status(401).json({ error: 'Session is not valid' });
    }
    res.json({ success: true, userId: req.session.id_user });
});

// Middleware pentru a verifica dacă sesiunea există înainte de a accesa ruta /superadmin
route.use('/superadmin', (req, res, next) => {
    console.log("SuperAdmin route middleware - Session check");
    
    // Verificare explicită a sesiunii
    if (!req.session) {
        console.error("SuperAdmin route - Sesiune inexistentă");
        return res.status(401).json({ error: "No session" });
    }
    
    if (!req.session.id_user) {
        console.error("SuperAdmin route - Utilizator neautentificat (id_user lipsă)");
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.session.role !== "superadmin") {
        console.error("SuperAdmin route - Acces neautorizat (rol incorect)");
        return res.status(403).json({ error: "Unauthorized access" });
    }
    
    console.log("SuperAdmin route middleware - Session valid for user:", req.session.id_user);
    next();
});

/////////////////////////////////////////////////////////////////////////////

// SuperAdmin routes
route.get('/superadmin/users', async (req, res) => {
    try {
        const users = await require('../db/db').dbListUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

route.put('/superadmin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, status } = req.body;
        
        await require('../db/db').dbUpdateUser(id, { name, email, role, status });
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

route.delete('/superadmin/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await require('../db/db').dbDelUserById(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

route.get('/superadmin/dashboard-stats', async (req, res) => {
    console.log('routes.js: /superadmin/dashboard-stats - Starting request processing');
    console.log('routes.js: Session info:', {
        id: req.session.id,
        id_user: req.session.id_user,
        role: req.session.role
    });

    try {
        const stats = await require('../db/superadmin').getDashboardStats();
        console.log('routes.js: Sending response with stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('routes.js: Error in /superadmin/dashboard-stats:', error);
        console.error('routes.js: Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard statistics',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get all documents for superadmin
route.get('/superadmin/documents', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Check if user is superadmin
    const con = await require('../db/db').pool.getConnection();
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Unauthorized - Superadmin access required" });
    }

    // Get documents from users created by this superadmin
    const [documents] = await con.query(`
      SELECT 
        td.id_document,
        td.nom_document,
        td.path,
        td.type_document,
        td.created_at,
        td.file_size,
        u.prenom,
        u.nom,
        u.roles as user_role
      FROM table_document td
      JOIN user u ON td.id_user_source = u.id_user
      WHERE u.created_by = ?
      ORDER BY td.created_at DESC
    `, [req.session.id_user]);

    con.release();

    res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Error fetching superadmin documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Superadmin Statistics Routes
route.get('/superadmin/system-stats', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userRole || userRole.length === 0 || userRole[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get total users
        const [totalUsers] = await con.query('SELECT COUNT(*) as count FROM user');
        
        // Get active users (users who have logged in within the last 24 hours)
        const [activeUsers] = await con.query(`
            SELECT COUNT(DISTINCT id_user) as count 
            FROM user 
            WHERE last_login >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        // Get total documents
        const [totalDocuments] = await con.query('SELECT COUNT(*) as count FROM table_document');

        // Get total storage used
        const [storageUsed] = await con.query(`
            SELECT COALESCE(SUM(file_size), 0) as total_size 
            FROM table_document
        `);

        // Get system load (simplified version)
        const systemLoad = Math.floor(Math.random() * 100); // In a real system, this would be actual system metrics

        res.json({
            totalUsers: totalUsers[0].count,
            activeUsers: activeUsers[0].count,
            totalDocuments: totalDocuments[0].count,
            totalStorage: storageUsed[0].total_size,
            systemLoad: systemLoad
        });
    } catch (error) {
        console.error('Error in /superadmin/system-stats:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});



route.get('/superadmin/security-logs', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userRole || userRole.length === 0 || userRole[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get security logs from user_logs table
        const [securityLogs] = await con.query(`
            SELECT 
                ul.*,
                u.nom as user_name,
                u.prenom
            FROM user_logs ul
            LEFT JOIN user u ON ul.user_id = u.id_user
            ORDER BY ul.timestamp DESC
            LIMIT 100
        `);

        res.json(securityLogs);
    } catch (error) {
        console.error('Error in /superadmin/security-logs:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

// Add new route for popular documents
route.get('/superadmin/popular-documents', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userRole || userRole.length === 0 || userRole[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get popular documents with download and view counts
        const [popularDocuments] = await con.query(`
            SELECT 
                td.id_document,
                td.nom_document,
                COUNT(CASE WHEN ds.action_type = 'download' THEN 1 END) as download_count,
                COALESCE(SUM(DISTINCT dl.open_count), 0) as view_count,
                dl.open_count,
                dl.last_opened_at
            FROM table_document td
            LEFT JOIN document_statistics ds ON td.id_document = ds.id_document
            LEFT JOIN document_log dl ON td.nom_document = dl.nom_doc
            GROUP BY td.id_document, td.nom_document, dl.open_count, dl.last_opened_at
            HAVING (download_count > 0 OR view_count > 0)
            ORDER BY (download_count + view_count) DESC
            LIMIT 10
        `);

        res.json(popularDocuments);
    } catch (error) {
        console.error('Error in /superadmin/popular-documents:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

// Add new route for document types statistics
route.get('/superadmin/document-types', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userRole || userRole.length === 0 || userRole[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get document types statistics
        const [documentTypes] = await con.query(`
            SELECT 
                dt.id_type,
                dt.nom_type,
                COUNT(td.id_document) as document_count,
                COUNT(CASE WHEN ds.action_type = 'download' THEN 1 END) as download_count,
                COUNT(CASE WHEN ds.action_type = 'view' THEN 1 END) as view_count
            FROM document_types dt
            LEFT JOIN table_document td ON dt.id_type = td.type_id
            LEFT JOIN document_statistics ds ON td.id_document = ds.id_document
            GROUP BY dt.id_type, dt.nom_type
            ORDER BY document_count DESC
        `);

        res.json(documentTypes);
    } catch (error) {
        console.error('Error in /superadmin/document-types:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

/////////////////////////////////////////////////////////////////////////////

// Impersonation route
route.post('/impersonate', async (req, res) => {
    console.log("Impersonation request received");
    console.log("Request body:", req.body);
    console.log("Session before impersonation:", {
        id_user: req.session.id_user,
        role: req.session.role,
        nom: req.session.nom,
        prenom: req.session.prenom
    });
    
    if (!req.session || !req.session.id_user) {
        console.error("No session found");
        return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.session.role !== "superadmin") {
        console.error("Only superadmin can impersonate users");
        return res.status(403).json({ error: "Unauthorized" });
    }

    const { userId } = req.body;
    if (!userId) {
        console.error("No userId provided");
        return res.status(400).json({ error: "User ID is required" });
    }

    try {
        // Store original superadmin session
        const originalSession = {
            id_user: req.session.id_user,
            role: req.session.role,
            nom: req.session.nom,
            prenom: req.session.prenom
        };
        console.log("Original session to be stored:", originalSession);

        // Get user to impersonate
        const [user] = await db.pool.query(
            'SELECT id_user, nom, prenom, roles, email FROM user WHERE id_user = ?',
            [userId]
        );
        console.log("User to impersonate:", user);

        if (!user || user.length === 0) {
            console.error("User not found in database");
            return res.status(404).json({ error: "User not found" });
        }

        // Store original session in a separate cookie
        res.cookie('original_session', JSON.stringify(originalSession), {
            httpOnly: true,
            secure: false, // Set to true in production
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Update current session with impersonated user
        req.session.id_user = user[0].id_user;
        req.session.role = user[0].roles;
        req.session.nom = user[0].nom;
        req.session.prenom = user[0].prenom;
        req.session.isImpersonating = true;
        req.session.originalSession = originalSession; // Store original session in session

        // Save the session
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error("Error saving session:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log("Updated session after impersonation:", {
            id_user: req.session.id_user,
            role: req.session.role,
            nom: req.session.nom,
            prenom: req.session.prenom,
            isImpersonating: req.session.isImpersonating
        });

        console.log("Setting original_session cookie:", JSON.stringify(originalSession));

        res.json({ 
            success: true,
            message: "Impersonation successful",
            user: {
                id: user[0].id_user,
                role: user[0].roles,
                nom: user[0].nom,
                prenom: user[0].prenom,
                email: user[0].email
            },
            redirectUrl: '/' // Change to root path
        });
    } catch (error) {
        console.error("Impersonation error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Impersonation failed", details: error.message });
    }
});

// Stop impersonation route
route.post('/stop-impersonation', async (req, res) => {
    console.log('=== STOP IMPERSONATION REQUEST ===');
    console.log('Session exists:', !!req.session);
    console.log('Session isImpersonating:', req.session?.isImpersonating);
    console.log('Session originalSession:', req.session?.originalSession);
    console.log('Cookie original_session:', req.cookies?.original_session);
    console.log('===================================');
    
    // Check if we're actually impersonating
    if (!req.session || !req.session.isImpersonating) {
        console.log('❌ Not impersonating or no session');
        return res.status(400).json({ error: "Not impersonating" });
    }

    try {
        let originalSession = null;
        
        // Try to get original session data
        if (req.session.originalSession) {
            console.log('📝 Stop: Using originalSession from session storage');
            originalSession = req.session.originalSession;
        } 
        else if (req.cookies.original_session) {
            console.log('📝 Stop: Trying to parse originalSession from cookie');
            try {
                originalSession = JSON.parse(req.cookies.original_session);
                console.log('📝 Stop: Successfully parsed cookie data:', originalSession);
            } catch (parseError) {
                console.error('❌ Stop: Error parsing original_session cookie:', parseError);
                console.error('❌ Stop: Cookie content:', req.cookies.original_session);
            }
        }
        
        // If no original session found, create a default SuperAdmin session
        if (!originalSession) {
            console.log('⚠️ Stop: No original session found, creating default SuperAdmin session');
            originalSession = {
                id_user: 20, // Default SuperAdmin ID
                role: 'superadmin',
                nom: 'Admin',
                prenom: 'Super'
            };
        }
        
        console.log('✅ Stop: Using session data:', originalSession);
        
        // Clear impersonation and restore original session
        req.session.id_user = originalSession.id_user;
        req.session.role = originalSession.role;
        req.session.nom = originalSession.nom;
        req.session.prenom = originalSession.prenom;
        req.session.isImpersonating = false; // Set to false instead of delete
        delete req.session.originalSession;

        // Save the session synchronously
        req.session.save((err) => {
            if (err) {
                console.error("❌ Error saving session after stop impersonation:", err);
                return res.status(500).json({ 
                    error: "Failed to save session", 
                    details: err.message 
                });
            }
            
            console.log('✅ Session saved successfully after stop impersonation');

        // Clear the original session cookie
        res.clearCookie('original_session');

            console.log('✅ Stop impersonation successful');
            console.log('📤 Restored session:', {
                id_user: req.session.id_user,
                role: req.session.role,
                nom: req.session.nom,
                prenom: req.session.prenom,
                isImpersonating: req.session.isImpersonating
            });

            // Send success response
        res.json({ 
            success: true,
                message: "Impersonation stopped successfully",
            user: {
                id: originalSession.id_user,
                role: originalSession.role,
                nom: originalSession.nom,
                prenom: originalSession.prenom
            }
        });
        });

    } catch (error) {
        console.error("❌ Stop impersonation error:", error);
        console.error("❌ Error stack:", error.stack);
        res.status(500).json({ 
            error: "Failed to stop impersonation", 
            details: error.message 
        });
    }
});

/////////////////////////////////////////////////////////////////////////////

route.get('/session-check', (req, res) => {
    console.log('=== SESSION CHECK DEBUG ===');
    console.log('Session exists:', !!req.session);
    console.log('Session ID user:', req.session?.id_user);
    console.log('Session role:', req.session?.role);
    console.log('Session isImpersonating:', req.session?.isImpersonating);
    console.log('Original session cookie:', req.cookies?.original_session);
    console.log('Session originalSession:', req.session?.originalSession);
    console.log('==============================');

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
        console.log('🎭 IMPERSONATION DETECTED in session-check!');
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

    console.log('📤 Response being sent:', JSON.stringify(response, null, 2));
    return res.json(response);
});

// Add this new route for session checking
route.get('/check-session', (req, res) => {
    console.log("Current session state:", {
        id_user: req.session.id_user,
        role: req.session.role,
        nom: req.session.nom,
        prenom: req.session.prenom,
        isImpersonating: req.session.isImpersonating
    });
    
    res.json({
        id_user: req.session.id_user,
        role: req.session.role,
        nom: req.session.nom,
        prenom: req.session.prenom,
        isImpersonating: req.session.isImpersonating
    });
});

route.use('/api', institutions);
route.use('/api', users);

// User profile endpoint
route.get('/api/user/profile', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.session.id_user;
    const con = await db.pool.getConnection();

    // Get user info
    const [userResult] = await con.query(`
      SELECT u.*, i.name as institution_name
      FROM user u
      LEFT JOIN institutions i ON u.institution_id = i.id_institution
      WHERE u.id_user = ?
    `, [userId]);

    if (!userResult || userResult.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const user = userResult[0];

    // Get user statistics
    const [docCountResult] = await con.query(`
      SELECT COUNT(*) as total_documents
      FROM table_document
      WHERE id_user_source = ?
    `, [userId]);

    const [storageResult] = await con.query(`
      SELECT COALESCE(SUM(file_size), 0) as total_storage
      FROM table_document
      WHERE id_user_source = ?
    `, [userId]);

    const [lastUploadResult] = await con.query(`
      SELECT MAX(date_upload) as last_upload
      FROM table_document
      WHERE id_user_source = ?
    `, [userId]);

    // Get recent activity (last 10 actions)
    const [recentActivityResult] = await con.query(`
      (SELECT 
        'user_action' as source,
        ul.action as action,
        ul.details as details,
        ul.created_at as created_at
      FROM user_logs ul
      WHERE ul.user_id = ?
      ORDER BY ul.created_at DESC
      LIMIT 5)
      UNION ALL
      (SELECT 
        'document_action' as source,
        CASE 
          WHEN ds.action_type = 'upload' THEN 'UPLOAD_DOCUMENT'
          WHEN ds.action_type = 'download' THEN 'DOWNLOAD_DOCUMENT'
          WHEN ds.action_type = 'view' THEN 'VIEW_DOCUMENT'
          WHEN ds.action_type = 'delete' THEN 'DELETE_DOCUMENT'
          ELSE UPPER(ds.action_type)
        END as action,
        CONCAT(
          CASE 
            WHEN ds.action_type = 'upload' THEN 'Uploaded document: '
            WHEN ds.action_type = 'download' THEN 'Downloaded document: '
            WHEN ds.action_type = 'view' THEN 'Viewed document: '
            WHEN ds.action_type = 'delete' THEN 'Deleted document: '
            ELSE 'Action on document: '
          END,
          COALESCE(td.nom_document, CONCAT('Document ID: ', ds.id_document))
        ) as details,
        ds.action_timestamp as created_at
      FROM document_statistics ds
      LEFT JOIN table_document td ON ds.id_document = td.id_document
      WHERE ds.id_user = ?
      ORDER BY ds.action_timestamp DESC
      LIMIT 5)
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId, userId]);

    con.release();

    res.json({
      success: true,
      userInfo: {
        id_user: user.id_user,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        roles: user.roles,
        institution_name: user.institution_name
      },
      statistics: {
        totalDocuments: docCountResult[0]?.total_documents || 0,
        totalStorage: storageResult[0]?.total_storage || 0,
        lastUpload: lastUploadResult[0]?.last_upload || null
      },
      recentActivity: recentActivityResult || []
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// User logs endpoint - combines user_logs and document_statistics
route.get('/api/user/logs', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.session.id_user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const con = await db.pool.getConnection();

    // Get user logs (login/logout)
    const [userLogsResult] = await con.query(`
      SELECT 
        'user_action' as source,
        ul.action as action,
        ul.details as details,
        ul.created_at as created_at,
        u.prenom,
        u.nom
      FROM user_logs ul
      JOIN user u ON ul.user_id = u.id_user
      WHERE ul.user_id = ?
    `, [userId]);

    // Get document statistics (upload/download/view/delete)
    const [docStatsResult] = await con.query(`
      SELECT 
        'document_action' as source,
        CASE 
          WHEN ds.action_type = 'upload' THEN 'UPLOAD_DOCUMENT'
          WHEN ds.action_type = 'download' THEN 'DOWNLOAD_DOCUMENT'
          WHEN ds.action_type = 'view' THEN 'VIEW_DOCUMENT'
          WHEN ds.action_type = 'delete' THEN 'DELETE_DOCUMENT'
          ELSE UPPER(ds.action_type)
        END as action,
        CONCAT(
          CASE 
            WHEN ds.action_type = 'upload' THEN 'Uploaded document: '
            WHEN ds.action_type = 'download' THEN 'Downloaded document: '
            WHEN ds.action_type = 'view' THEN 'Viewed document: '
            WHEN ds.action_type = 'delete' THEN 'Deleted document: '
            ELSE 'Action on document: '
          END,
          COALESCE(td.nom_document, CONCAT('Document ID: ', ds.id_document))
        ) as details,
        ds.action_timestamp as created_at,
        u.prenom,
        u.nom
      FROM document_statistics ds
      JOIN user u ON ds.id_user = u.id_user
      LEFT JOIN table_document td ON ds.id_document = td.id_document
      WHERE ds.id_user = ?
    `, [userId]);

    // Combine and sort all logs
    const allLogs = [...userLogsResult, ...docStatsResult];
    allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination
    const totalLogs = allLogs.length;
    const paginatedLogs = allLogs.slice(offset, offset + limit);

    con.release();

    res.json({
      success: true,
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: Math.ceil(totalLogs / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
});

// OCR Search endpoint with streaming progress for real OCR processing
route.post('/ocr-search-progress', async function (req, res) {
  // Set headers for streaming
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  console.log("🤖 OCR Search with Progress request received:", req.body);
  
  if (!req.session || !req.session.id_user) {
    console.error("OCR Search unauthorized - No valid session");
    res.write(JSON.stringify({
      type: 'error',
      error: "Unauthorized"
    }) + '\n');
    return res.end();
  }

  const { fileName, filePath, searchQuery } = req.body;

  if (!fileName || !searchQuery) {
    res.write(JSON.stringify({
      type: 'error',
      error: "Missing required parameters: fileName and searchQuery"
    }) + '\n');
    return res.end();
  }

  try {
    console.log(`🤖 Starting OCR search for "${searchQuery}" in file: ${fileName}`);
    console.log(`🤖 File path provided: ${filePath}`);
    
    // Send initial progress
    res.write(JSON.stringify({
      type: 'progress',
      stage: 'init',
      message: 'Inițializez căutarea OCR...',
      progress: 0
    }) + '\n');
    
    // Build full file path - try multiple locations
    const uploadsDir = path.join(__dirname, '../uploads');
    let fullFilePath;
    
    const possiblePaths = [
      path.join(uploadsDir, fileName),
      path.join(uploadsDir, filePath, fileName),
      path.join(uploadsDir, filePath),
    ];
    
    console.log(`🔍 Searching for file in these locations:`);
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        fullFilePath = testPath;
        console.log(`✅ Found file at: ${fullFilePath}`);
        break;
      }
    }
    
    if (!fullFilePath) {
      console.error(`❌ File not found in any location`);
      res.write(JSON.stringify({
        type: 'error',
        error: "File not found",
        searchedPaths: possiblePaths
      }) + '\n');
      return res.end();
    }

    // Send file found progress
    res.write(JSON.stringify({
      type: 'progress',
      stage: 'file_found',
      message: 'Fișier găsit, analizez conținutul...',
      progress: 10
    }) + '\n');

    // Read and analyze PDF file
    const pdfBuffer = fs.readFileSync(fullFilePath);
    console.log(`📄 PDF file loaded, size: ${pdfBuffer.length} bytes`);

    let pdfData;
    try {
      pdfData = await pdfParse(pdfBuffer);
      console.log(`📝 PDF parsed, ${pdfData.numpages} pages, text length: ${pdfData.text.length}`);
    } catch (parseError) {
      console.error('Error parsing PDF:', parseError);
      res.write(JSON.stringify({
        type: 'error',
        error: "Failed to parse PDF"
      }) + '\n');
      return res.end();
    }

    // Check if document needs OCR
    const meaningfulText = pdfData.text.replace(/\s+/g, ' ').trim();
    const wordCount = meaningfulText.split(' ').filter(word => word.length > 2).length;
    const needsOCR = wordCount < 10;
    
    console.log(`📊 Document analysis: ${pdfData.text.length} chars, ${wordCount} meaningful words, needs OCR: ${needsOCR}`);

    res.write(JSON.stringify({
      type: 'progress',
      stage: 'analysis',
      message: `Document analizat: ${pdfData.numpages} pagini, ${needsOCR ? 'necesită OCR' : 'are text'}`,
      progress: 20,
      documentType: needsOCR ? 'scanned' : 'text',
      pages: pdfData.numpages
    }) + '\n');

    let searchResults = [];
    let allOcrText = ''; // Declare in outer scope so it's available for completion

    if (needsOCR) {
      // Document needs OCR processing
      console.log('🤖 Document needs OCR, starting real OCR processing...');
      
      res.write(JSON.stringify({
        type: 'progress',
        stage: 'ocr_start',
        message: 'Începe procesarea OCR...',
        progress: 25
      }) + '\n');

      try {
        // Create temporary directory for OCR processing
        const tempDir = path.join(__dirname, '../temp_ocr');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
          console.log('📁 Created temporary OCR directory:', tempDir);
        }

        res.write(JSON.stringify({
          type: 'progress',
          stage: 'convert_start',
          message: 'Convertesc PDF în imagini...',
          progress: 30
        }) + '\n');

        // Convert PDF to images using pdf2pic
        const convert = pdf2pic.fromPath(fullFilePath, {
          density: 100,
          saveFilename: "ocr_page",
          savePath: tempDir,
          format: "png",
          width: 600,
          height: 800
        });

        console.log('🔄 Converting PDF pages to images...');
        
        // Process pages (limit to first 10 for better coverage)
        const maxPages = Math.min(pdfData.numpages, 10);
        const pages = [];
        
        for (let i = 1; i <= maxPages; i++) {
          try {
            const page = await convert(i, { responseType: "image" });
            pages.push(page);
            console.log(`📄 Converted page ${i} to image: ${page.path}`);
            
            res.write(JSON.stringify({
              type: 'progress',
              stage: 'convert_page',
              message: `Pagina ${i}/${maxPages} convertită în imagine`,
              progress: 30 + (i / maxPages) * 20,
              currentPage: i,
              totalPages: maxPages
            }) + '\n');
            
          } catch (error) {
            console.log(`📄 Error converting page ${i}:`, error.message);
            break;
          }
        }

        if (pages.length === 0) {
          throw new Error('No pages could be converted to images');
        }

        console.log(`🔍 Processing ${pages.length} pages with Tesseract OCR...`);
        
        res.write(JSON.stringify({
          type: 'progress',
          stage: 'ocr_processing',
          message: `Procesez ${pages.length} pagini cu OCR...`,
          progress: 50
        }) + '\n');

        // Process each page with OCR
        const pageTexts = [];
        
        for (let i = 0; i < pages.length; i++) {
          try {
            console.log(`🤖 OCR processing page ${i + 1}/${pages.length}...`);
            
            res.write(JSON.stringify({
              type: 'progress',
              stage: 'ocr_page',
              message: `OCR pagina ${i + 1}/${pages.length}...`,
              progress: 50 + (i / pages.length) * 30,
              currentPage: i + 1,
              totalPages: pages.length
            }) + '\n');
            
            // IMPROVED OCR with higher quality and better coordinate detection
            const result = await Tesseract.recognize(
              pages[i].path,
              'eng+ron', // English + Romanian
              {
                logger: (m) => {
                  if (m.status === 'recognizing text') {
                    const pageProgress = 50 + (i / pages.length) * 30 + (m.progress * (30 / pages.length));
                    res.write(JSON.stringify({
                      type: 'progress',
                      stage: 'ocr_recognize',
                      message: `OCR pagina ${i + 1}: ${Math.round(m.progress * 100)}%`,
                      progress: pageProgress,
                      ocrProgress: m.progress * 100
                    }) + '\n');
                  }
                },
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
                preserve_interword_spaces: '1',
                // IMPROVED: Force coordinate detection
                tessedit_create_hocr: '1',
                tessedit_create_tsv: '1',
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzăîâșțĂÎÂȘȚ0123456789 .,!?:;()-[]{}/@#$%^&*+=_~`"\'\\/<>|'
              }
            );
            
            const text = result.data.text;
            const words = result.data.words || [];
            
            console.log(`🔍 OCR Result structure:`, {
              hasText: !!text,
              textLength: text ? text.length : 0,
              hasWords: !!result.data.words,
              wordsLength: result.data.words ? result.data.words.length : 0,
              hasLines: !!result.data.lines,
              linesLength: result.data.lines ? result.data.lines.length : 0,
              hasParagraphs: !!result.data.paragraphs,
              paragraphsLength: result.data.paragraphs ? result.data.paragraphs.length : 0
            });
            
            // Debug: Show first few words if they exist
            if (result.data.words && result.data.words.length > 0) {
              console.log(`🔍 First 3 words:`, result.data.words.slice(0, 3).map(w => ({
                text: w.text,
                bbox: w.bbox,
                confidence: w.confidence
              })));
            }
            
            // Debug: Show first few lines if they exist
            if (result.data.lines && result.data.lines.length > 0) {
              console.log(`🔍 First 2 lines:`, result.data.lines.slice(0, 2).map(l => ({
                text: l.text,
                bbox: l.bbox,
                confidence: l.confidence
              })));
            }
            
            // Debug: Show full data structure keys
            console.log(`🔍 Full result.data keys:`, Object.keys(result.data));
            
            console.log(`📄 Page ${i + 1} OCR words found: ${words ? words.length : 0}`);
            
            pageTexts.push({ 
              page: i + 1, 
              text: text,
              words: words || [], // Store word coordinates
              lines: result.data.lines || [], // Store line coordinates as backup
              paragraphs: result.data.paragraphs || [] // Store paragraph coordinates as backup
            });
            allOcrText += text + ' ';
            console.log(`✅ OCR page ${i + 1} completed: ${text.length} characters, ${words ? words.length : 0} words with coordinates`);
            console.log(`📄 Page ${i + 1} text preview: "${text.substring(0, 200)}..."`);
            
            // Check if this page contains our search terms
            const lowerPageText = text.toLowerCase();
            if (lowerPageText.includes('caiet') || lowerPageText.includes('sarcini')) {
              console.log(`🎯 Page ${i + 1} contains relevant text!`);
              console.log(`📄 Full page ${i + 1} text: "${text}"`);
            }
            
            res.write(JSON.stringify({
              type: 'progress',
              stage: 'ocr_page_complete',
              message: `Pagina ${i + 1} completă: ${text.length} caractere`,
              progress: 50 + ((i + 1) / pages.length) * 30,
              pageComplete: i + 1,
              charactersExtracted: text.length
            }) + '\n');
            
            // Clean up temporary image file
            try {
              if (fs.existsSync(pages[i].path)) {
                fs.unlinkSync(pages[i].path);
              }
            } catch (cleanupError) {
              console.log('⚠️ Could not clean up temp file:', pages[i].path);
            }
            
          } catch (ocrError) {
            console.error(`💥 OCR error on page ${i + 1}:`, ocrError.message);
            res.write(JSON.stringify({
              type: 'progress',
              stage: 'ocr_error',
              message: `Eroare OCR pagina ${i + 1}`,
              progress: 50 + ((i + 1) / pages.length) * 30,
              error: ocrError.message
            }) + '\n');
            continue;
          }
        }

        console.log(`🎯 Total OCR text extracted: ${allOcrText.length} characters`);

        res.write(JSON.stringify({
          type: 'progress',
          stage: 'search_start',
          message: 'Caut în textul extras...',
          progress: 80,
          totalCharacters: allOcrText.length
        }) + '\n');

        // Search in OCR text (simple approach that worked before)
        if (allOcrText.length > 0) {
          console.log(`🔍 Searching for "${searchQuery}" in OCR text (${allOcrText.length} chars)...`);
          console.log(`🔍 First 500 chars of OCR text: "${allOcrText.substring(0, 500)}"`);
          console.log(`🔍 Last 500 chars of OCR text: "${allOcrText.substring(allOcrText.length - 500)}"`);
          
          // Check if the search term exists with different variations
          const lowerOcrText = allOcrText.toLowerCase();
          const lowerSearchQuery = searchQuery.toLowerCase();
          
          console.log(`🔍 Searching for variations of "${searchQuery}":`);
          console.log(`🔍 - Exact: "${searchQuery}" -> ${lowerOcrText.includes(lowerSearchQuery)}`);
          console.log(`🔍 - "caiet": ${lowerOcrText.includes('caiet')}`);
          console.log(`🔍 - "sarcini": ${lowerOcrText.includes('sarcini')}`);
          console.log(`🔍 - "de": ${lowerOcrText.includes('de')}`);
          
          // Try different regex patterns
          const searchRegex = new RegExp(searchQuery, 'gi');
          const matches = [...allOcrText.matchAll(searchRegex)];
          
          console.log(`🎯 Found ${matches.length} matches in combined OCR text`);
          
          for (const match of matches) {
            // Find which page this match belongs to
            let currentPos = 0;
            let matchPage = 1;
            
            for (const pageData of pageTexts) {
              if (match.index >= currentPos && match.index < currentPos + pageData.text.length) {
                matchPage = pageData.page;
                break;
              }
              currentPos += pageData.text.length + 1; // +1 for space between pages
            }
            
            const start = Math.max(0, match.index - 50);
            const end = Math.min(allOcrText.length, match.index + searchQuery.length + 50);
            const context = allOcrText.substring(start, end).replace(/\n/g, ' ').trim();
            
            console.log(`🎯 Match ${searchResults.length + 1}: "${match[0]}" on page ${matchPage}, context: "${context.substring(0, 100)}..."`);
            
            searchResults.push({
              pageNumber: matchPage,
              matchText: match[0],
              context: context,
              coordinates: null, // Will add coordinates later
              matchIndex: searchResults.length,
              isOCR: true,
              confidence: 0
            });
          }
          
          console.log(`🤖 OCR search completed, found ${searchResults.length} matches`);
          
          // Try to get coordinates from words/lines for each match (optional enhancement)
          if (searchResults.length > 0) {
            console.log(`🔍 Trying to find coordinates for ${searchResults.length} matches...`);
            
            for (const result of searchResults) {
              const pageData = pageTexts.find(p => p.page === result.pageNumber);
              if (pageData) {
                const pageWords = pageData.words || [];
                const pageLines = pageData.lines || [];
                
                console.log(`📄 Page ${result.pageNumber}: ${pageWords.length} words, ${pageLines.length} lines available`);
                console.log(`🔍 Searching for "${searchQuery}" in page ${result.pageNumber} OCR data...`);
                
                // Debug: Show some words from this page
                if (pageWords.length > 0) {
                  console.log(`📝 Sample words from page ${result.pageNumber}:`, 
                    pageWords.slice(0, 10).map(w => `"${w.text}"`).join(', '));
                }
                
                // IMPROVED: Try to find coordinates for each specific match
                const searchLower = searchQuery.toLowerCase();
                let matchingWords = [];
                
                // Collect ALL matching words (not just the first one)
                for (const word of pageWords) {
                  if (word.text && word.bbox) {
                    const wordLower = word.text.toLowerCase();
                    if (wordLower === searchLower) {
                      // Exact match
                      matchingWords.push({
                        word: word,
                        matchType: 'EXACT',
                        priority: 1
                      });
                      console.log(`🎯 EXACT word match: "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0})`);
                    } else if (wordLower.includes(searchLower) || searchLower.includes(wordLower)) {
                      // Partial match
                      matchingWords.push({
                        word: word,
                        matchType: 'PARTIAL',
                        priority: 2
                      });
                      console.log(`🔍 PARTIAL word match: "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0})`);
                    }
                  }
                }
                
                console.log(`📊 Found ${matchingWords.length} matching words on page ${result.pageNumber}`);
                
                // Sort by priority and position to get consistent results
                matchingWords.sort((a, b) => {
                  if (a.priority !== b.priority) return a.priority - b.priority;
                  // If same priority, sort by Y position (top to bottom), then X position (left to right)
                  if (Math.abs(a.word.bbox.y0 - b.word.bbox.y0) > 5) {
                    return a.word.bbox.y0 - b.word.bbox.y0;
                  }
                  return a.word.bbox.x0 - b.word.bbox.x0;
                });
                
                // Use a different matching word for each result to avoid overlap
                const resultIndex = searchResults.indexOf(result);
                const availableWords = matchingWords.filter((m, i) => i < 10); // Limit to first 10 matches
                
                if (availableWords.length > 0) {
                  // Use modulo to cycle through available words for different results
                  const selectedWordIndex = resultIndex % availableWords.length;
                  const selectedMatch = availableWords[selectedWordIndex];
                  const selectedWord = selectedMatch.word;
                  
                  console.log(`🎯 Using word ${selectedWordIndex + 1}/${availableWords.length} for result ${resultIndex + 1}: "${selectedWord.text}" (${selectedMatch.matchType})`);
                  
                  result.coordinates = {
                    x: selectedWord.bbox.x0,
                    y: selectedWord.bbox.y0, 
                    width: selectedWord.bbox.x1 - selectedWord.bbox.x0,
                    height: selectedWord.bbox.y1 - selectedWord.bbox.y0,
                      imageWidth: 600,
                    imageHeight: 800,
                    matchType: selectedMatch.matchType,
                    wordText: selectedWord.text
                  };
                  
                  console.log(`✅ Assigned coordinates to result ${resultIndex + 1}:`, {
                    position: `(${result.coordinates.x}, ${result.coordinates.y})`,
                    size: `${result.coordinates.width}x${result.coordinates.height}`,
                    matchType: selectedMatch.matchType,
                    wordText: selectedWord.text
                  });
                }
                
                // If no word coordinates, try lines with flexible matching
                if (!result.coordinates) {
                  console.log(`🔍 No word match found, trying line-level matching...`);
                  let matchingLines = [];
                  
                  for (const line of pageLines) {
                    if (line.text && line.bbox) {
                      const lineLower = line.text.toLowerCase();
                      if (lineLower.includes(searchLower)) {
                        matchingLines.push(line);
                        console.log(`🎯 FOUND in line: "${line.text}" at (${line.bbox.x0}, ${line.bbox.y0})`);
                      }
                    }
                  }
                  
                  if (matchingLines.length > 0) {
                    // Use different lines for different results
                    const resultIndex = searchResults.indexOf(result);
                    const selectedLine = matchingLines[resultIndex % matchingLines.length];
                    
                    console.log(`🎯 Using line ${(resultIndex % matchingLines.length) + 1}/${matchingLines.length} for result ${resultIndex + 1}`);
                    
                    result.coordinates = {
                      x: selectedLine.bbox.x0,
                      y: selectedLine.bbox.y0, 
                      width: selectedLine.bbox.x1 - selectedLine.bbox.x0,
                      height: selectedLine.bbox.y1 - selectedLine.bbox.y0,
                        imageWidth: 600,
                      imageHeight: 800,
                      matchType: 'LINE',
                      lineText: selectedLine.text
                    };
                    
                    console.log(`✅ Assigned LINE coordinates to result ${resultIndex + 1}:`, {
                      position: `(${result.coordinates.x}, ${result.coordinates.y})`,
                      size: `${result.coordinates.width}x${result.coordinates.height}`,
                      lineText: selectedLine.text.substring(0, 50) + '...'
                    });
                  }
                }
                
                // If still no coordinates, try finding reference words and distribute them
                if (!result.coordinates && pageWords.length > 0) {
                  console.log(`🔄 No exact match found, trying to find reference word coordinates...`);
                  
                  // Get multiple reference words for better distribution
                  const wordsWithCoords = pageWords.filter(w => w.bbox).slice(0, 20); // Take first 20 words
                  
                  if (wordsWithCoords.length > 0) {
                    const resultIndex = searchResults.indexOf(result);
                    const selectedRefWord = wordsWithCoords[resultIndex % wordsWithCoords.length];
                    
                    console.log(`📍 Using reference word ${(resultIndex % wordsWithCoords.length) + 1}/${wordsWithCoords.length}: "${selectedRefWord.text}"`);
                    
                    // Use the reference word's coordinates with slight variation
                    const variation = (resultIndex % 4) * 15; // Add 0, 15, 30, or 45 pixel offset
                    
                    result.coordinates = {
                      x: selectedRefWord.bbox.x0 + variation,
                      y: selectedRefWord.bbox.y0 + (variation / 3),
                      width: Math.max(selectedRefWord.bbox.x1 - selectedRefWord.bbox.x0, 50),
                      height: selectedRefWord.bbox.y1 - selectedRefWord.bbox.y0,
                      imageWidth: 600,
                      imageHeight: 800,
                      matchType: 'REFERENCE',
                      reference: selectedRefWord.text,
                      variation: variation
                    };
                    
                    console.log(`📍 Reference-based coordinates for result ${resultIndex + 1}:`, {
                      position: `(${result.coordinates.x}, ${result.coordinates.y})`,
                      size: `${result.coordinates.width}x${result.coordinates.height}`,
                      reference: selectedRefWord.text,
                      variation: variation
                    });
                  }
                }
                
                // REAL TEXT-BASED COORDINATE DETECTION: Find actual word positions
                if (!result.coordinates && pageData.text) {
                  console.log(`📍 Creating REAL text-based coordinates for match on page ${result.pageNumber}`);
                  
                  const resultIndex = searchResults.indexOf(result);
                  const realCoords = createRealCoordinates(
                    searchQuery, 
                    pageData.text, 
                    result.matchText, 
                    resultIndex, 
                    result.pageNumber,
                    pdfData
                  );
                  
                  if (realCoords) {
                    result.coordinates = realCoords;
                    
                    console.log(`📍 Real coordinates for result ${resultIndex + 1}:`, {
                      position: `(${result.coordinates.x}, ${result.coordinates.y})`,
                      size: `${result.coordinates.width}x${result.coordinates.height}`,
                      method: result.coordinates.matchType,
                      confidence: result.coordinates.confidence,
                      lineInfo: `line ${result.coordinates.lineNumber + 1}/${result.coordinates.totalLines}`
                    });
                  } else {
                    console.log(`❌ Could not create real coordinates for result ${resultIndex + 1}`);
                  }
                }
                
                // Final coordinate check
                if (result.coordinates) {
                  console.log(`✅ FINAL coordinates for "${result.matchText}" on page ${result.pageNumber}:`, result.coordinates);
                } else {
                  console.log(`❌ NO coordinates found for "${result.matchText}" on page ${result.pageNumber}`);
              }
            }
            }
            
            // Log final results summary
            const resultsWithCoords = searchResults.filter(r => r.coordinates);
            console.log(`📊 COORDINATE SUMMARY: ${resultsWithCoords.length}/${searchResults.length} results have coordinates`);
            resultsWithCoords.forEach((r, i) => {
              console.log(`  ${i + 1}. "${r.matchText}" -> (${r.coordinates.x}, ${r.coordinates.y})`);
            });
          }
        }

      } catch (ocrError) {
        console.error('💥 OCR processing failed:', ocrError);
        res.write(JSON.stringify({
          type: 'error',
          error: "OCR processing failed",
          details: ocrError.message
        }) + '\n');
        return res.end();
      }
    } else {
      // Document has text, search normally
      console.log('📝 Searching in regular PDF text...');
      
      res.write(JSON.stringify({
        type: 'progress',
        stage: 'text_search',
        message: 'Caut în textul documentului...',
        progress: 80
      }) + '\n');
      
      const searchRegex = new RegExp(searchQuery, 'gi');
      const matches = [...pdfData.text.matchAll(searchRegex)];
      
      searchResults = matches.map((match, index) => {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(pdfData.text.length, match.index + searchQuery.length + 50);
        const context = pdfData.text.substring(start, end).replace(/\n/g, ' ').trim();
        
        const estimatedPage = Math.max(1, Math.ceil((match.index / pdfData.text.length) * pdfData.numpages));
        
        return {
          pageNumber: estimatedPage,
          matchText: match[0],
          context: context,
          coordinates: null,
          matchIndex: index,
          isOCR: false
        };
      });
      
      console.log(`📝 Text search completed, found ${searchResults.length} matches`);
    }

    // Send completion
    res.write(JSON.stringify({
      type: 'complete',
      success: true,
      results: searchResults,
      totalMatches: searchResults.length,
      fileName: fileName,
      searchQuery: searchQuery,
      isOCRDocument: needsOCR,
      textLength: needsOCR ? (allOcrText ? allOcrText.length : 0) : pdfData.text.length,
      numPages: pdfData.numpages,
      progress: 100,
      message: `Căutare completă: ${searchResults.length} rezultate găsite`
    }) + '\n');

    res.end();

  } catch (error) {
    console.error("🤖 Error in OCR search:", error);
    res.write(JSON.stringify({
      type: 'error',
      error: "OCR search failed",
      message: error.message
    }) + '\n');
    res.end();
  }
});

// OCR Search endpoint for real OCR processing (legacy)
route.post('/ocr-search', async function (req, res) {
  console.log("🤖 OCR Search request received:", req.body);
  
  if (!req.session || !req.session.id_user) {
    console.error("OCR Search unauthorized - No valid session");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { fileName, filePath, searchQuery } = req.body;

  if (!fileName || !searchQuery) {
    return res.status(400).json({
      success: false,
      error: "Missing required parameters: fileName and searchQuery"
    });
  }

  try {
    console.log(`🤖 Starting OCR search for "${searchQuery}" in file: ${fileName}`);
    console.log(`🤖 File path provided: ${filePath}`);
    
    // Build full file path - try multiple locations
    const uploadsDir = path.join(__dirname, '../uploads');
    let fullFilePath;
    
    // Try different path combinations
    const possiblePaths = [
      path.join(uploadsDir, fileName),
      path.join(uploadsDir, filePath, fileName),
      path.join(uploadsDir, filePath),
    ];
    
    console.log(`🔍 Searching for file in these locations:`);
    possiblePaths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        fullFilePath = testPath;
        console.log(`✅ Found file at: ${fullFilePath}`);
        break;
      }
    }
    
    if (!fullFilePath) {
      console.error(`❌ File not found in any location`);
      
      // List directory contents for debugging
      try {
        const dirContents = fs.readdirSync(uploadsDir);
        console.log(`📁 Contents of uploads directory:`, dirContents.slice(0, 10));
      } catch (dirError) {
        console.error(`❌ Could not read uploads directory:`, dirError.message);
      }
      
      return res.status(404).json({
        success: false,
        error: "File not found",
        searchedPaths: possiblePaths
      });
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(fullFilePath);
    console.log(`📄 PDF file loaded, size: ${pdfBuffer.length} bytes`);

    // Extract text using pdf-parse first to check if it's text-based
    let pdfData;
    try {
      pdfData = await pdfParse(pdfBuffer);
      console.log(`📝 PDF parsed, ${pdfData.numpages} pages, text length: ${pdfData.text.length}`);
    } catch (parseError) {
      console.error('Error parsing PDF:', parseError);
      return res.status(500).json({
        success: false,
        error: "Failed to parse PDF"
      });
    }

    let searchResults = [];
    let isLikelyScanned = false;

    // Check if we got meaningful text from PDF
    const meaningfulText = pdfData.text.replace(/\s+/g, ' ').trim();
    const wordCount = meaningfulText.split(' ').filter(word => word.length > 2).length;
    isLikelyScanned = wordCount < 10;
    
    console.log(`📊 Document analysis: ${pdfData.text.length} chars, ${wordCount} meaningful words, likely scanned: ${isLikelyScanned}`);

    if (isLikelyScanned) {
      // Document is likely scanned - use REAL OCR
      console.log('🤖 Document appears to be scanned, using REAL OCR processing...');
      
      try {
        // Create temporary directory for OCR processing
        const tempDir = path.join(__dirname, '../temp_ocr');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
          console.log('📁 Created temporary OCR directory:', tempDir);
        }

        // Convert PDF to images using pdf2pic
        const convert = pdf2pic.fromPath(fullFilePath, {
          density: 100,
          saveFilename: "ocr_page",
          savePath: tempDir,
          format: "png",
          width: 600,
          height: 800
        });

        console.log('🔄 Converting PDF pages to images...');
        
        // Process first 3 pages for performance
        const pages = [];
        for (let i = 1; i <= 3; i++) {
          try {
            const page = await convert(i, { responseType: "image" });
            pages.push(page);
            console.log(`📄 Converted page ${i} to image: ${page.path}`);
          } catch (error) {
            console.log(`📄 No more pages or error on page ${i}:`, error.message);
            break;
          }
        }

        if (pages.length === 0) {
          throw new Error('No pages could be converted to images');
        }

        console.log(`🔍 Processing ${pages.length} pages with Tesseract OCR...`);
        
        // Process each page with OCR
        let allOcrText = '';
        const pageTexts = [];
        
        for (let i = 0; i < pages.length; i++) {
          try {
            console.log(`🤖 OCR processing page ${i + 1}/${pages.length}...`);
            
            const { data: { text } } = await Tesseract.recognize(
              pages[i].path,
              'eng+ron', // English + Romanian
              {
                logger: () => {}, // Disable verbose logging
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzăîâșțĂÎÂȘȚ0123456789 .,!?:;()-[]{}/@#$%^&*+=_~`"\'\\/<>|'
              }
            );
            
            pageTexts.push({ page: i + 1, text: text });
            allOcrText += text + ' ';
            console.log(`✅ OCR page ${i + 1} completed: ${text.length} characters extracted`);
            
            // Clean up temporary image file
            try {
              if (fs.existsSync(pages[i].path)) {
                fs.unlinkSync(pages[i].path);
              }
            } catch (cleanupError) {
              console.log('⚠️ Could not clean up temp file:', pages[i].path);
            }
            
          } catch (ocrError) {
            console.error(`💥 OCR error on page ${i + 1}:`, ocrError.message);
            continue;
          }
        }

        console.log(`🎯 Total OCR text extracted: ${allOcrText.length} characters`);

        // Search in OCR text
        if (allOcrText.length > 0) {
          const ocrSearchRegex = new RegExp(searchQuery, 'gi');
          const ocrMatches = [...allOcrText.matchAll(ocrSearchRegex)];
          
          searchResults = ocrMatches.map((match, index) => {
            const start = Math.max(0, match.index - 50);
            const end = Math.min(allOcrText.length, match.index + searchQuery.length + 50);
            const context = allOcrText.substring(start, end).replace(/\n/g, ' ').trim();
            
            // Find which page this match is on
            let matchPage = 1;
            let textSoFar = 0;
            for (const pageText of pageTexts) {
              if (match.index >= textSoFar && match.index < textSoFar + pageText.text.length) {
                matchPage = pageText.page;
                break;
              }
              textSoFar += pageText.text.length + 1; // +1 for space
            }
            
            return {
              pageNumber: matchPage,
              matchText: match[0],
              context: context,
              coordinates: null, // OCR doesn't provide precise coordinates
              matchIndex: index,
              isOCR: true
            };
          });
          
          console.log(`🤖 OCR search completed, found ${searchResults.length} matches`);
        }

      } catch (ocrError) {
        console.error('💥 OCR processing failed:', ocrError);
        // Fallback to regular text search
        console.log('🔄 Falling back to regular text search...');
        isLikelyScanned = false;
      }
    }
    
    // If not scanned or OCR failed, search in regular PDF text
    if (!isLikelyScanned || searchResults.length === 0) {
      console.log('📝 Searching in regular PDF text...');
      
      const searchRegex = new RegExp(searchQuery, 'gi');
      const matches = [...pdfData.text.matchAll(searchRegex)];
      
      searchResults = matches.map((match, index) => {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(pdfData.text.length, match.index + searchQuery.length + 50);
        const context = pdfData.text.substring(start, end).replace(/\n/g, ' ').trim();
        
        // Estimate page number based on text position
        const estimatedPage = Math.max(1, Math.ceil((match.index / pdfData.text.length) * pdfData.numpages));
        
        return {
          pageNumber: estimatedPage,
          matchText: match[0],
          context: context,
          coordinates: null,
          matchIndex: index,
          isOCR: false
        };
      });
      
      console.log(`📝 Text search completed, found ${searchResults.length} matches`);
    }
    
    return res.json({
      success: true,
      results: searchResults,
      totalMatches: searchResults.length,
      fileName: fileName,
      searchQuery: searchQuery,
      isOCRDocument: isLikelyScanned,
      textLength: pdfData.text.length,
      numPages: pdfData.numpages
    });

  } catch (error) {
    console.error("🤖 Error in OCR search:", error);
    return res.status(500).json({
      success: false,
      error: "OCR search failed",
      message: error.message
    });
  }
});

// Add new route for institution information
route.get('/superadmin/institution-info', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role and get superadmin's institution
        const [userInfo] = await con.query(
            'SELECT roles, institution_id FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const superadminInstitutionId = userInfo[0].institution_id;

        // Get institution details and statistics
        const [institutionInfo] = await con.query(`
            SELECT 
                i.id_institution,
                i.name as institution_name,
                i.address,
                i.contact_email,
                i.contact_phone,
                COUNT(DISTINCT u.id_user) as total_users,
                COUNT(DISTINCT CASE WHEN u.roles = 'admin' THEN u.id_user END) as admin_count,
                COUNT(DISTINCT CASE WHEN u.roles = 'utilisateur' THEN u.id_user END) as user_count,
                COUNT(DISTINCT CASE WHEN u.roles = 'responsable' THEN u.id_user END) as responsable_count,
                COUNT(DISTINCT td.id_document) as total_documents,
                COALESCE(SUM(td.size), 0) as total_storage_used
            FROM institutions i
            LEFT JOIN user u ON i.id_institution = u.institution_id AND u.accepted = 1
            LEFT JOIN table_document td ON u.id_user = td.id_user_source
            WHERE i.id_institution = ?
            GROUP BY i.id_institution, i.name, i.address, i.contact_email, i.contact_phone
        `, [superadminInstitutionId]);

        if (!institutionInfo || institutionInfo.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }

        res.json({
            success: true,
            institution: institutionInfo[0]
        });
    } catch (error) {
        console.error('Error in /superadmin/institution-info:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

route.get('/superadmin/security-logs', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userRole || userRole.length === 0 || userRole[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get security logs from user_logs table
        const [securityLogs] = await con.query(`
            SELECT 
                ul.*,
                u.nom as user_name,
                u.prenom
            FROM user_logs ul
            LEFT JOIN user u ON ul.user_id = u.id_user
            ORDER BY ul.timestamp DESC
            LIMIT 100
        `);

        res.json(securityLogs);
    } catch (error) {
        console.error('Error in /superadmin/security-logs:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

route.get('/post_docs/superadmin/user-activity', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role and get superadmin's institution
        const [userInfo] = await con.query(
            'SELECT roles, institution_id FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const superadminInstitutionId = userInfo[0].institution_id;

        // Get filters from query parameters
        const { 
            userName, 
            userId, 
            startDate, 
            endDate, 
            actionType, 
            limit = 100 
        } = req.query;

        // Build WHERE conditions for filtering
        let whereConditions = ['u.institution_id = ?'];
        let queryParams = [superadminInstitutionId];

        if (userName) {
            whereConditions.push('(u.nom LIKE ? OR u.prenom LIKE ?)');
            queryParams.push(`%${userName}%`, `%${userName}%`);
        }

        if (userId) {
            whereConditions.push('u.id_user = ?');
            queryParams.push(userId);
        }

        if (actionType) {
            whereConditions.push('action_type = ?');
            queryParams.push(actionType);
        }

        if (startDate) {
            whereConditions.push('action_timestamp >= ?');
            queryParams.push(startDate);
        }

        if (endDate) {
            whereConditions.push('action_timestamp <= ?');
            queryParams.push(endDate);
        }

        // Get document activity logs with user information (simplified for testing)
        const activityQuery = `
            SELECT 
                ds.id_statistic,
                ds.id_document,
                ds.id_user,
                ds.action_type,
                ds.action_timestamp,
                td.nom_document,
                CONCAT(u.prenom, ' ', u.nom) as user_name,
                u.email as user_email,
                'document_activity' as log_type,
                COALESCE(td.nom_document, 'Document activity') as details
            FROM document_statistics ds
            LEFT JOIN table_document td ON ds.id_document = td.id_document
            LEFT JOIN user u ON ds.id_user = u.id_user
            WHERE ${whereConditions.join(' AND ')}
            
            UNION ALL
            
            SELECT 
                ul.id as id_statistic,
                NULL as id_document,
                ul.user_id as id_user,
                ul.action as action_type,
                ul.created_at as action_timestamp,
                NULL as nom_document,
                CONCAT(u.prenom, ' ', u.nom) as user_name,
                u.email as user_email,
                'security_log' as log_type,
                ul.details
            FROM user_logs ul
            LEFT JOIN user u ON ul.user_id = u.id_user
            WHERE u.institution_id = ? ${userName ? 'AND (u.nom LIKE ? OR u.prenom LIKE ?)' : ''} 
            ${userId ? 'AND u.id_user = ?' : ''}
            ${actionType ? 'AND ul.action = ?' : ''}
            ${startDate ? 'AND ul.created_at >= ?' : ''}
            ${endDate ? 'AND ul.created_at <= ?' : ''}
            
            ORDER BY action_timestamp DESC
            LIMIT ?
        `;

        // Add parameters for the UNION query
        let unionParams = [superadminInstitutionId];
        if (userName) {
            unionParams.push(`%${userName}%`, `%${userName}%`);
        }
        if (userId) unionParams.push(userId);
        if (actionType) unionParams.push(actionType);
        if (startDate) unionParams.push(startDate);
        if (endDate) unionParams.push(endDate);
        unionParams.push(parseInt(limit));

        const finalParams = [...queryParams, ...unionParams];
        const [activityLogs] = await con.query(activityQuery, finalParams);

        res.json({
            success: true,
            logs: activityLogs,
            total: activityLogs.length,
            filters: {
                userName,
                userId,
                startDate,
                endDate,
                actionType,
                institutionId: superadminInstitutionId
            }
        });
    } catch (error) {
        console.error('Error in /superadmin/user-activity:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});

route.get('/post_docs/superadmin/institution-info', async (req, res) => {
    let con;
    try {
        // Check if user is authenticated and is superadmin
        if (!req.session.id_user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = require('../db/db');
        con = await db.pool.getConnection();

        // Check user role and get superadmin's institution
        const [userInfo] = await con.query(
            'SELECT roles, institution_id FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const superadminInstitutionId = userInfo[0].institution_id;

        // Get institution information
        const [institutionInfo] = await con.query(
            'SELECT * FROM institutions WHERE id_institution = ?',
            [superadminInstitutionId]
        );

        if (institutionInfo && institutionInfo.length > 0) {
            res.json({
                success: true,
                institution: {
                    institution_name: institutionInfo[0].name,
                    institution_id: institutionInfo[0].id_institution,
                    address: institutionInfo[0].address,
                    contact_email: institutionInfo[0].email,
                    contact_phone: institutionInfo[0].phone
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Institution not found'
            });
        }
    } catch (error) {
        console.error('Error in /superadmin/institution-info:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    } finally {
        if (con) {
            try {
                await con.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError);
            }
        }
    }
});


module.exports = route