const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

// Global variables for tracking operations
const recentOperations = new Map();
const recentFolderUploads = new Map();
const MOVE_DETECTION_WINDOW = 2000; // 2 seconds
const FOLDER_UPLOAD_WINDOW = 10000; // 10 seconds

// STARTUP LOG - Verify main.js is loading
console.log('🚀 [MAIN] === MAIN.JS IS LOADING ===');
console.log('🚀 [MAIN] Timestamp:', new Date().toISOString());
console.log('🚀 [MAIN] === VERSION WITH PROCESS-FILE DEBUG LOGS ===');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const axios = require('axios');
const WebSocket = require('ws');
const FormData = require('form-data');
const Store = require('electron-store');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const Tesseract = require('tesseract.js');
const natural = require('natural');
// Conditional canvas import for Windows compatibility
let createCanvas;
try {
    createCanvas = require('canvas').createCanvas;
} catch (error) {
    console.warn('Canvas module not available (Windows compatibility):', error.message);
    createCanvas = null;
}
// PDF.js with fallback
let pdfjsLib = null;
try {
    // Use legacy build for Node/Electron compatibility
    pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
    }
    console.log('PDF.js (legacy) loaded successfully');
} catch (error) {
    console.warn('PDF.js not available:', error.message);
}

const { PDFDocument } = require('pdf-lib');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const io = require('socket.io-client');
const config = require('./config');
require('dotenv').config();

// Initialize store for credentials
const store = new Store();

// =====================
// Protected path support
// =====================
// In-memory cache of institutional (non-private) folder paths like
// "Scoala Dabuleni/GERTE". This is populated after folder fetches and
// used by the watcher to prevent destructive operations.
let protectedPathsSet = new Set();

const normalizePathForCompare = (s) => (s || '')
  .toString()
  .replace(/\\/g, '/')
  .replace(/\/+/g, '/')
  .replace(/\/$/, '');

function updateProtectedPathsCache(user, folders) {
  try {
    const institutionId = user?.institution_id;
    const nextSet = new Set();
    if (Array.isArray(folders)) {
      folders.forEach((f) => {
        // Treat non-private folders as institutional
        if (f && f.folder_path && f.institution_id === institutionId && f.is_private === false) {
          nextSet.add(normalizePathForCompare(f.folder_path));
        }
      });
    }
    protectedPathsSet = nextSet;
    console.log('🛡️ Protected institutional folders cached:', protectedPathsSet.size);
  } catch (e) {
    console.warn('Failed to update protected paths cache:', e.message);
  }
}

function isProtectedPath(filePath, user, institutionAbsolutePath) {
  try {
    if (!user?.institution_name || !institutionAbsolutePath) return false;
    const parentDir = path.dirname(filePath);
    const relative = path.relative(institutionAbsolutePath, parentDir);
    // If file is outside the institution path, we ignore
    if (relative.startsWith('..')) return false;

    const relativeNorm = normalizePathForCompare(relative);
    // Build cumulative ancestors: "Institutie", "Institutie/A", "Institutie/A/B" etc.
    const parts = relativeNorm ? relativeNorm.split('/') : [];
    let acc = normalizePathForCompare(user.institution_name);
    if (protectedPathsSet.has(acc)) return true;
    for (const p of parts) {
      if (!p) continue;
      acc = acc + '/' + p;
      if (protectedPathsSet.has(acc)) return true;
    }
    return false;
  } catch (e) {
    console.warn('isProtectedPath failed:', e.message);
    return false;
  }
}

function isProtectedFolderAbsolute(folderAbsolutePath, user, institutionAbsolutePath) {
  try {
    if (!user?.institution_name || !institutionAbsolutePath) return false;
    const relative = path.relative(institutionAbsolutePath, folderAbsolutePath);
    if (relative.startsWith('..')) return false;
    const full = normalizePathForCompare(
      path.join(user.institution_name, relative && relative !== '.' ? relative : '')
    );
    return protectedPathsSet.has(full);
  } catch (e) {
    console.warn('isProtectedFolderAbsolute failed:', e.message);
    return false;
  }
}

async function restoreProtectedFolder(folderAbsolutePath, user, institutionAbsolutePath) {
  try {
    const rel = path.relative(institutionAbsolutePath, folderAbsolutePath);
    const fullPathKey = normalizePathForCompare(
      path.join(user.institution_name, rel && rel !== '.' ? rel : '')
    );

    // 1) Recreate directory locally
    if (!fs.existsSync(folderAbsolutePath)) {
      fs.mkdirSync(folderAbsolutePath, { recursive: true });
      console.log('✅ Recreated protected folder:', folderAbsolutePath);
    }

    // 2) Download folders and documents under it via HTTP APIs
    const [foldersResp, docsResp] = await Promise.all([
      axios.get(`${API_URL}/post_docs/folders`, { headers: getHttpHeaders(), timeout: 30000 }),
      axios.get(`${API_URL}/post_docs/documents`, { headers: getHttpHeaders(), timeout: 30000 })
    ]);
    const folders = (foldersResp.data?.folders || foldersResp.data || []).filter((f) =>
      f && f.folder_path && normalizePathForCompare(f.folder_path).startsWith(fullPathKey)
    );
    const documents = (docsResp.data?.documents || docsResp.data || []).filter((d) =>
      d && d.path && normalizePathForCompare(d.path).startsWith(fullPathKey)
    );

    // Create subfolders
    for (const f of folders) {
      const subRel = normalizePathForCompare(path.relative(user.institution_name, f.folder_path));
      const abs = path.join(institutionAbsolutePath, subRel);
      try {
        if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
      } catch (e) { console.warn('create subfolder failed', abs, e.message); }
    }

    // Restore documents (best-effort)
    for (const d of documents) {
      try {
        const docName = d.nom_document || d.name || d.documentName;
        const targetRel = normalizePathForCompare(path.relative(user.institution_name, d.path));
        await restoreProtectedDocument(docName, targetRel, user, institutionAbsolutePath);
      } catch (e) { console.warn('restore doc failed', d?.name, e.message); }
    }
    return true;
  } catch (e) {
    console.error('restoreProtectedFolder error:', e);
    return false;
  }
}

async function restoreProtectedDocument(documentName, targetFolderRelative, user, institutionAbsolutePath) {
  try {
    const localTargetFolderPath = path.join(
      institutionAbsolutePath,
      targetFolderRelative && targetFolderRelative !== '.' ? targetFolderRelative : ''
    );
    if (!fs.existsSync(localTargetFolderPath)) {
      fs.mkdirSync(localTargetFolderPath, { recursive: true });
    }
    const localTargetPath = path.join(localTargetFolderPath, documentName);
    if (fs.existsSync(localTargetPath)) {
      console.log('🛡️ Restore skipped, file already present:', localTargetPath);
      return true;
    }

    // Primary download endpoint
    const downloadUrl = `${API_URL}/download/${encodeURIComponent(documentName)}`;
    try {
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers: getHttpHeaders(),
        timeout: 30000,
      });
      if (response.status === 200) {
        await fs.promises.writeFile(localTargetPath, Buffer.from(response.data));
        console.log('✅ Protected document restored:', localTargetPath);
        return true;
      }
    } catch (e) {
      console.log('Primary restore download failed:', e.message);
    }

    // Alternative endpoint that searches path on server
    try {
      const altUrl = `${API_URL}/find-pdf/${encodeURIComponent(documentName)}`;
      const altResp = await axios({
        method: 'GET',
        url: altUrl,
        responseType: 'arraybuffer',
        headers: getHttpHeaders(),
        timeout: 30000,
      });
      if (altResp.status === 200) {
        await fs.promises.writeFile(localTargetPath, Buffer.from(altResp.data));
        console.log('✅ Protected document restored via alternative endpoint:', localTargetPath);
        return true;
      }
    } catch (e2) {
      console.log('Alternative restore download failed:', e2.message);
    }
    return false;
  } catch (err) {
    console.error('restoreProtectedDocument error:', err);
    return false;
  }
}

function recordProtectionIncident(payload) {
  try {
    const list = store.get('protection_incidents') || [];
    const incident = { ...payload, created_at: new Date().toISOString(), status: 'open' };
    list.push(incident);
    store.set('protection_incidents', list);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('protection-incident', incident);
    }
  } catch (e) {
    console.warn('Failed to record protection incident:', e.message);
  }
}

// IPC for incidents
ipcMain.handle('get-protection-incidents', async () => {
  try {
    const list = store.get('protection_incidents') || [];
    return list.filter(i => i && i.status === 'open');
  } catch {
    return [];
  }
});

ipcMain.on('dismiss-protection-incident', (event, createdAt) => {
  try {
    const list = store.get('protection_incidents') || [];
    const idx = list.findIndex(i => i.created_at === createdAt);
    if (idx !== -1) {
      list[idx].status = 'acknowledged';
      store.set('protection_incidents', list);
    }
  } catch {}
});

// Production/Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = !isDevelopment;

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',  
    database: process.env.DB_NAME || 'PSPD',
    port: process.env.DB_PORT || 3306
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Add API URL configuration  
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;
let watcher = null;
let syncAgentWatcher = null;
let isWatching = false;
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Add cache variables at the top of the file
let cachedFiles = null;
let lastLoadTime = 0;
const CACHE_DURATION = 5000; // 5 seconds cache

let wsServer = null;

// Add Map to store folder watchers
const folderWatchers = new Map();

let socket = null;

// === Scalable file event coalescing & upload queue ===
const fileEventBuffer = new Map(); // path -> { op, ts }
let bufferFlushTimer = null;
const recentProcessed = new Map(); // path -> ts
const uploadQueue = [];
let activeUploads = 0;
const MAX_UPLOAD_CONCURRENCY = 2;

function bufferFileEvent(operation, filePath) {
    try {
        if (!filePath || typeof filePath !== 'string') return;
        // Only PDFs and skip uploads folder mirror to avoid loops
        if (!filePath.toLowerCase().endsWith('.pdf')) return;
        if (filePath.includes(`${path.sep}back-end${path.sep}uploads${path.sep}`)) return;
        const now = Date.now();
        fileEventBuffer.set(filePath, { op: operation, ts: now });
    } catch {}
}

async function ensureFileStable(filePath, attempts = 3, intervalMs = 1000) {
    try {
        let lastSize = -1;
        for (let i = 0; i < attempts; i++) {
            const stat = await fs.promises.stat(filePath).catch(() => null);
            const size = stat ? stat.size : -1;
            if (size > 0 && size === lastSize) {
                return true; // size settled
            }
            lastSize = size;
            await new Promise(r => setTimeout(r, intervalMs));
        }
        // One last check
        const finalStat = await fs.promises.stat(filePath).catch(() => null);
        return !!(finalStat && finalStat.size > 0);
    } catch { return false; }
}

function enqueueUpload(filePath) {
    // Dedup within 30s
    const expireWindow = 30000;
    const now = Date.now();
    // cleanup
    for (const [p, ts] of recentProcessed.entries()) {
        if (now - ts > expireWindow) recentProcessed.delete(p);
    }
    if (recentProcessed.has(filePath)) return;
    recentProcessed.set(filePath, now);
    uploadQueue.push(filePath);
    processUploadQueue();
}

async function processUploadQueue() {
    if (activeUploads >= MAX_UPLOAD_CONCURRENCY) return;
    const filePath = uploadQueue.shift();
    if (!filePath) return;
    activeUploads++;
    try {
        const stable = await ensureFileStable(filePath);
        if (!stable) throw new Error('File not stable');
        const user = getUserInfo();
        if (!user) throw new Error('User not logged in');
        const institutionPath = getInstitutionPath(user.institution_name);
        await processNewPDFFile(filePath, user, institutionPath);
    } catch (e) {
        console.error('QUEUE upload error:', e.message);
    } finally {
        activeUploads--;
        // Continue processing remaining
        if (uploadQueue.length > 0) processUploadQueue();
    }
}

function startBufferFlushTimer() {
    if (bufferFlushTimer) return;
    bufferFlushTimer = setInterval(() => {
        if (fileEventBuffer.size === 0) return;
        const now = Date.now();
        const FLUSH_AGE = 1000; // 1s coalescing window
        for (const [filePath, info] of Array.from(fileEventBuffer.entries())) {
            if (now - info.ts >= FLUSH_AGE) {
                fileEventBuffer.delete(filePath);
                if (info.op === 'add' || info.op === 'change') {
                    enqueueUpload(filePath);
                }
            }
        }
    }, 500);
}

// Initialize socket connection
function initializeSocket() {
    console.log('Initializing socket connection...');
    
    // Eliminăm handlerele vechi dacă există
    if (socket) {
        console.log('Removing old socket handlers...');
        socket.off('fileSystemUpdate');
        socket.off('fileSystemChange');
        socket.off('fileSystemError');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('error');
    }

    socket = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: {
            token: getAuthToken()
        }
    });

    // Handler pentru conectare
    socket.on('connect', () => {
        console.log('Socket connected successfully');
        console.log('Socket ID:', socket.id);
        console.log('Transport type:', socket.io.engine.transport.name);
        
        // Trimite token-ul de autentificare după conectare
        socket.emit('authenticate', { token: getAuthToken() });
    });

    // Handler pentru deconectare
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Serverul a forțat deconectarea, încercăm să ne reconectăm
            socket.connect();
        }
    });

    // Handler pentru erori
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Handler pentru fileSystemUpdate
    socket.on('fileSystemUpdate', async (data) => {
        // WebSocket fileSystemUpdate received (debug info removed)
        
        try {
            // Verifică dacă data este validă
            if (!data || typeof data !== 'object') {
                console.error('Invalid fileSystemUpdate data received:', data);
                return;
            }

            // ⚠️ IMPORTANT: Skip events that come from Electron to avoid infinite loops
            if (data.fromElectron) {
                console.log('Skipping event from Electron to avoid loop');
                return;
            }

            // Handle ADD: download the new file locally into DocDiL (no polling, event-driven)
            if (data.type === 'add' && data.targetFolder && (data.documentName || data.sourcePath)) {
                try {
                    // Skip version artifacts (e.g., NAME_V1.pdf, NAME_v2.pdf) UNLESS it's a version update
                    const guessedName = (data.documentName && data.documentName.toString()) || (data.sourcePath ? path.basename(data.sourcePath.toString()) : '');
                    const isVersionArtifact = /[_\-\s][Vv]\d+\.pdf$/i.test(guessedName);
                    const isVersionUpdate = data.isVersionUpdate === true;
                    
                    if (isVersionArtifact && !isVersionUpdate) {
                        console.log('ADD skip: version artifact detected →', guessedName);
                    } else {
                        if (isVersionUpdate) {
                            console.log('📄 VERSION UPDATE: Processing version update for →', guessedName);
                        }
                        await downloadAddedDocument(data);
                    }
                } catch (e) {
                    console.error('ADD local download failed:', e.message);
                }
            }

            // Handle UPDATE: replace existing file with new version
            if (data.type === 'update' && data.targetFolder && (data.documentName || data.sourcePath)) {
                try {
                    console.log('📄 === PROCESSING VERSION UPDATE ===');
                    console.log('📄 Document name:', data.documentName);
                    console.log('📄 Version number:', data.versionNumber);
                    
                    // Download the updated file to replace the existing one
                    await downloadAddedDocument(data);
                } catch (e) {
                    console.error('UPDATE local download failed:', e.message);
                }
            }

            // Handle FOLDER_CREATE: create new folder locally in DocDiL
            if (data.type === 'create_folder' && data.folderPath) {
                try {
                    console.log('📁 [WEB FOLDER CREATE] Processing folder creation from web');
                    console.log('📁 Folder path:', data.folderPath);
                    
                    const user = getUserInfo();
                    if (user) {
                        await applyWebFolderCreateLocally({
                            folderPath: data.folderPath
                        }, user);
                    }
                } catch (e) {
                    console.error('FOLDER CREATE local creation failed:', e.message);
                }
            }

            // Handle MOVE from server: ensure DB path is updated (no local move to avoid double work)
            if (data.type === 'move' && (data.sourcePath || data.targetPath) && data.targetFolder) {
                try {
                    const user = getUserInfo();
                    if (user) {
                        // Check if this is a FOLDER move (sourcePath doesn't end with .pdf)
                        const isDocumentMove = (data.sourcePath && data.sourcePath.endsWith('.pdf')) || 
                                             (data.targetPath && data.targetPath.endsWith('.pdf')) ||
                                             (data.documentName && data.documentName.endsWith('.pdf'));
                        
                        if (isDocumentMove) {
                            // DOCUMENT MOVE - existing logic
                            const fileName = (data.documentName && data.documentName.endsWith('.pdf')) ? data.documentName :
                                (data.documentName ? `${data.documentName}.pdf` : path.basename(data.targetPath || data.sourcePath || ''));
                            // Determine root folder for current account (institutional vs personal)
                            const isPersonal = !user.institution_id || user.institution_name == null;
                            const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
                            let destFolder = data.targetFolder || '';
                            if (rootFolderName && !destFolder.startsWith(rootFolderName + '/')) {
                                destFolder = `${rootFolderName}/${destFolder}`;
                            }
                            // Guard against accidental 'null/' prefix construction
                            if (destFolder.startsWith('null/')) {
                                destFolder = destFolder.substring(5);
                            }
                            // First try API endpoint identical cu React (server știe să actualizeze și DB și versiuni)
                            const successViaApi = await synchronizeMoveViaApiEndpoint(fileName, data.sourcePath, destFolder, user);
                            if (!successViaApi) {
                                // Fallback: rezolvă ID-ul și actualizează DB direct
                                await updateDocumentPathByName(fileName, data.sourcePath, destFolder, user);
                            }

                            // Apply move locally in DocDiL only once, on target phase or if eventType missing
                            const evt = (data.eventType || '').toLowerCase();
                            if (!evt || evt.includes('move_target')) {
                                const relSource = (data.sourcePath && data.sourcePath.includes('/uploads/'))
                                    ? data.sourcePath.substring(data.sourcePath.indexOf('/uploads/') + '/uploads/'.length)
                                    : (data.sourcePath || '');
                                await applyWebMoveLocally({
                                    documentName: fileName,
                                    sourcePath: relSource,
                                    targetFolder: destFolder
                                }, user);
                            }
                        } else {
                            // FOLDER MOVE - new logic
                            console.log('📁 [WEB FOLDER MOVE] Processing folder move from web');
                            console.log('📁 Source path:', data.sourcePath);
                            console.log('📁 Target folder:', data.targetFolder);
                            
                            await applyWebFolderMoveLocally({
                                sourcePath: data.sourcePath,
                                targetFolder: data.targetFolder
                            }, user);
                        }
                    }
                } catch (e) {
                    console.error('MOVE DB sync failed:', e.message);
                }
            }

            // ALWAYS send visual update to renderer, regardless of local file operation success
            const windows = BrowserWindow.getAllWindows();
            console.log(`Broadcasting visual update to ${windows.length} windows`);
            
            windows.forEach(window => {
                if (!window.isDestroyed()) {
                    console.log('Sending fileSystemUpdate to window:', window.id);
                    window.webContents.send('fileSystemUpdate', data);
                }
            });
        } catch (error) {
            console.error('Error handling fileSystemUpdate:', error);
        }
    });

    // Handler pentru fileSystemError
    socket.on('fileSystemError', (error) => {
        console.error('File system error received:', error);
        // Trimite eroarea către toate ferestrele
        BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('fileSystemError', error);
            }
        });
    });

    // Handler pentru fileSystemChange
    socket.on('fileSystemChange', (data) => {
        console.log('Received fileSystemChange in main process:', data);
        try {
            // Verifică dacă data este validă
            if (!data || typeof data !== 'object') {
                console.error('Invalid fileSystemChange data received:', data);
                return;
            }

            // ⚠️ IMPORTANT: Skip events that come from Electron to avoid infinite loops
            if (data.fromElectron) {
                console.log('Skipping event from Electron to avoid loop');
                return;
            }

            // Trimite evenimentul către toate ferestrele
            const windows = BrowserWindow.getAllWindows();
            console.log(`Broadcasting fileSystemChange to ${windows.length} windows`);
            
            windows.forEach(window => {
                if (!window.isDestroyed()) {
                    console.log('Sending fileSystemChange to window:', window.id);
                    window.webContents.send('fileSystemChange', data);
                }
            });
        } catch (error) {
            console.error('Error handling fileSystemChange:', error);
        }
    });

    return socket;
}

// Download a newly added document locally (triggered by server event). Event-driven, no polling.
async function downloadAddedDocument(data) {
    const user = getUserInfo();
    if (!user) {
        console.log('No user for local download');
        return;
    }

    // Normalize folder path to include correct root and clean absolute/invalid prefixes
    let targetFolder = data.targetFolder || '';
    const isPersonal = !user.institution_id || user.institution_name == null;
    const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
    // If came as absolute path, trim to uploads-relative
    if (targetFolder.includes('/uploads/')) {
        targetFolder = targetFolder.substring(targetFolder.indexOf('/uploads/') + '/uploads/'.length);
    }
    // Strip accidental prefixes
    if (targetFolder.startsWith('null/')) targetFolder = targetFolder.substring(5);
    if (rootFolderName && !targetFolder.startsWith(rootFolderName + '/')) {
        targetFolder = `${rootFolderName}/${targetFolder}`;
    }

    // Determine filename: prefer explicit, else derive from sourcePath
    let fileName = data.documentName;
    if (!fileName && data.sourcePath) {
        try {
            fileName = path.basename(data.sourcePath);
        } catch {}
    }
    if (!fileName) {
        console.warn('ADD download skipped: no documentName or sourcePath');
        return;
    }
    // Ensure .pdf extension
    if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';

    const institutionPath = getInstitutionPath(rootFolderName);
    const localTargetPath = path.join(institutionPath, targetFolder.replace(rootFolderName + '/', ''), fileName);
    const localTargetDir = path.dirname(localTargetPath);

    // Skip if file already exists (unless it's a version update)
    if (fs.existsSync(localTargetPath) && !data.isVersionUpdate) {
        console.log('ADD download skipped, file already exists locally:', localTargetPath);
        return;
    }
    
    // For version updates, remove existing file first
    if (data.isVersionUpdate && fs.existsSync(localTargetPath)) {
        console.log('📄 VERSION UPDATE: Removing existing file for replace:', localTargetPath);
        fs.unlinkSync(localTargetPath);
    }

    if (!fs.existsSync(localTargetDir)) {
        fs.mkdirSync(localTargetDir, { recursive: true });
    }

    // Build robust server paths
    const serverRelative = encodeURI(`${targetFolder}/${fileName}`);
    let uploadsRelativeFromSource = null;
    if (data.sourcePath) {
        const idx = data.sourcePath.indexOf('/uploads/');
        if (idx !== -1) {
            uploadsRelativeFromSource = encodeURI(data.sourcePath.substring(idx + '/uploads/'.length));
        }
    }
    const urls = [
        uploadsRelativeFromSource ? `${API_URL}/uploads/${uploadsRelativeFromSource}` : null,
        `${API_URL}/uploads/${serverRelative}`,
        `${API_URL}/post_docs/documents/${encodeURIComponent(fileName)}/download`,
        `${API_URL}/download/${encodeURIComponent(fileName)}`
    ].filter(Boolean);

    let saved = false;
    for (const url of urls) {
        try {
            console.log('Attempting ADD download:', url, '→', localTargetPath);
            const response = await axios({ method: 'GET', url, responseType: 'stream', headers: getHttpHeaders(), timeout: 30000 });
            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(localTargetPath);
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            console.log('ADD download saved:', localTargetPath);
            saved = true;
            break;
        } catch (e) {
            console.log('ADD download URL failed:', url, e.message);
        }
    }

    if (!saved) {
        console.warn('ADD download failed for all URLs, file will rely on next access/download');
    } else {
        // Send fileSystemUpdate event to renderer for UI refresh
        if (mainWindow && !mainWindow.isDestroyed()) {
            const eventData = {
                type: data.type || 'add',
                sourcePath: data.sourcePath || `${targetFolder}/${fileName}`,
                targetFolder: targetFolder,
                documentName: fileName,
                documentId: data.documentId,
                timestamp: new Date().toISOString(),
                isVersionUpdate: data.isVersionUpdate || false,
                versionNumber: data.versionNumber
            };
            
            console.log('📡 Sending fileSystemUpdate to renderer for', eventData.type, ':', fileName);
            mainWindow.webContents.send('fileSystemUpdate', eventData);
        }
    }
}

// Helper: update DB path by name and (optional) source folder
async function updateDocumentPathByName(fileName, sourcePath, destinationFolder, user) {
    console.log('DB SYNC: updateDocumentPathByName()', { fileName, sourcePath, destinationFolder });
    // Normalize destination for personal accounts and strip any accidental null prefix
    const isPersonal = !user.institution_id || user.institution_name == null;
    const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
    let safeDestination = destinationFolder || '';
    if (rootFolderName && !safeDestination.startsWith(rootFolderName + '/')) {
        safeDestination = `${rootFolderName}/${safeDestination}`;
    }
    if (safeDestination.startsWith('null/')) {
        safeDestination = safeDestination.substring(5);
    }
    const headers = getHttpHeaders();
    const baseName = fileName.replace(/\.pdf$/i, '');
    const srcFolderRel = (() => {
        if (!sourcePath) return '';
        const idx = sourcePath.indexOf('/uploads/');
        if (idx === -1) return '';
        const after = sourcePath.substring(idx + '/uploads/'.length);
        const parts = after.split('/');
        return parts.slice(0, -1).join('/');
    })();

    const normalize = (s) => (s || '').replace(/\\/g, '/');
    const srcNorm = normalize(srcFolderRel);

    // Prefer lookup by SOURCE FOLDER to get exact document quickly
    let allDocs = [];
    try {
        if (srcNorm) {
            const encodedSrc = encodeURIComponent(srcNorm);
            const byFolder = await axios.get(`${API_URL}/post_docs/documents/folder/${encodedSrc}`, { headers });
            allDocs = (byFolder.data && Array.isArray(byFolder.data.documents)) ? byFolder.data.documents : [];
        }
    } catch (e) {
        console.log('DB SYNC: folder lookup failed, falling back to /documents:', e.message);
    }
    if (!allDocs.length) {
        const docsResp = await axios.get(`${API_URL}/post_docs/documents`, { headers });
        allDocs = Array.isArray(docsResp.data) ? docsResp.data : (docsResp.data.documents || []);
    }

    let candidates = allDocs.filter(d => {
        const nameVal = normalize((d.nom_document || d.name || '')).replace(/\.pdf$/i, '');
        const pathVal = normalize(d.path || d.folder_path || '');
        const instMatch = (d.institution_id || user.institution_id) === user.institution_id;
        const nameMatch = nameVal === baseName;
        const pathMatch = srcNorm ? pathVal.includes(srcNorm) : true;
        return instMatch && nameMatch && pathMatch;
    });

    console.log('DB SYNC: initial candidates:', candidates.length);

    // Fallback 1: match only by name within institution
    if (candidates.length === 0) {
        candidates = allDocs.filter(d => {
            const nameVal = (d.nom_document || d.name || '').replace(/\.pdf$/i, '');
            const instMatch = (d.institution_id || user.institution_id) === user.institution_id;
            return instMatch && nameVal === baseName;
        });
        console.log('DB SYNC: fallback by name only candidates:', candidates.length);
    }

    // Fallback 2: partial name match
    if (candidates.length === 0) {
        candidates = allDocs.filter(d => {
            const nameVal = (d.nom_document || d.name || '').toLowerCase();
            const instMatch = (d.institution_id || user.institution_id) === user.institution_id;
            return instMatch && nameVal.includes(baseName.toLowerCase());
        });
        console.log('DB SYNC: fallback by partial name candidates:', candidates.length);
    }

    if (candidates.length === 0) {
        throw new Error(`No DB document found for ${fileName}`);
    }

    const docId = candidates[0].id_document || candidates[0].id || candidates[0].id_doc;
    console.log('DB SYNC: updating docId', docId, 'to path', safeDestination);
    try {
        await axios.put(`${API_URL}/post_docs/documents/${docId}/update-path`, { path: safeDestination }, { headers, withCredentials: true });
        console.log('DB SYNC: update completed');
    } catch (apiErr) {
        console.error('DB SYNC: API update failed, fallback to SQL:', apiErr.message);
        const conn = await pool.getConnection();
        try {
            const baseName = fileName.replace(/\.pdf$/i, '');
            const likeSrc = srcNorm ? `%${srcNorm}%` : '%';
            const [result] = await conn.execute(
                `UPDATE table_document 
                 SET path=? 
                 WHERE (REPLACE(nom_document, '.pdf','') = ? OR nom_document = ?)
                   AND (path LIKE ?)
                   AND (id_user_source = ?)`,
                [safeDestination, baseName, fileName, likeSrc, user.id]
            );
            console.log('DB SYNC: SQL rows affected:', result.affectedRows);
            if (!result.affectedRows) {
                // Loosen condition: update by name within institution if old path constraint failed
                const [result2] = await conn.execute(
                    `UPDATE table_document 
                     SET path=? 
                     WHERE (REPLACE(nom_document, '.pdf','') = ? OR nom_document = ?)
                       AND (id_user_source = ?)`,
                    [safeDestination, baseName, fileName, user.id]
                );
                console.log('DB SYNC: SQL fallback rows affected:', result2.affectedRows);
            }
        } finally {
            conn.release();
        }
    }
}

// Try server-side move API identical to React flow; returns true if success
async function synchronizeMoveViaApiEndpoint(fileName, sourcePath, destinationFolder, user) {
    try {
        const baseName = fileName.replace(/\.pdf$/i, '');
        // Build sourcePath expected by API: relative to uploads without .pdf at the end
        let rel = '';
        if (sourcePath && sourcePath.includes('/uploads/')) {
            rel = sourcePath.substring(sourcePath.indexOf('/uploads/') + '/uploads/'.length);
            // cut filename
            const parts = rel.split('/');
            rel = parts.slice(0, -1).concat(baseName).join('/');
        } else {
            // Build from root folder (institution or personal) + filename if needed
            const isPersonal = !user.institution_id || user.institution_name == null;
            const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
            rel = `${rootFolderName}/${baseName}`;
        }
        // Clean any accidental null prefix
        if (rel.startsWith('null/')) rel = rel.substring(5);
        const headers = { 'Content-Type': 'application/json', 'Cookie': getSessionCookie(), 'Origin': 'http://localhost:3001' };
        const resp = await axios.post(`${API_URL}/post_docs/files/move`, { sourcePath: rel, destinationPath: destinationFolder }, { headers, withCredentials: true, timeout: 20000 });
        const ok = resp.status === 200 && (resp.data?.success || resp.data === true);
        console.log('DB SYNC: server move endpoint result:', ok);
        return ok;
    } catch (e) {
        console.log('DB SYNC: server move endpoint failed:', e.message);
        return false;
    }
}

// Function to apply web app moves locally in DocDiL folder
async function applyWebMoveLocally(data, user) {
    try {
        console.log('\n=== APPLYING WEB MOVE LOCALLY ===');
        console.log('Move data:', JSON.stringify(data, null, 2));

        const isPersonal = !user.institution_id || user.institution_name == null;
        const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
        const institutionPath = getInstitutionPath(rootFolderName);
        
        // Clean source and target paths
        let cleanSourcePath = data.sourcePath || '';
        let cleanTargetPath = data.targetFolder || '';
        
        // Remove root prefix (institution or personal) if present
        if (rootFolderName && cleanSourcePath.startsWith(rootFolderName + '/')) {
            cleanSourcePath = cleanSourcePath.substring(rootFolderName.length + 1);
        }
        if (rootFolderName && cleanTargetPath.startsWith(rootFolderName + '/')) {
            cleanTargetPath = cleanTargetPath.substring(rootFolderName.length + 1);
        }
        // Defensive: strip accidental 'null/'
        if (cleanSourcePath.startsWith('null/')) cleanSourcePath = cleanSourcePath.substring(5);
        if (cleanTargetPath.startsWith('null/')) cleanTargetPath = cleanTargetPath.substring(5);
        
        // Add .pdf extension if not present
        let documentName = data.documentName;
        if (!documentName.toLowerCase().endsWith('.pdf')) {
            documentName += '.pdf';
        }
        
        // Build full local paths
        const localSourcePath = cleanSourcePath ? 
            path.join(institutionPath, cleanSourcePath, documentName) : 
            path.join(institutionPath, documentName);
        const localTargetFolderPath = cleanTargetPath ? 
            path.join(institutionPath, cleanTargetPath) : 
            institutionPath;
        const localTargetPath = path.join(localTargetFolderPath, documentName);
        
        console.log('Local source path:', localSourcePath);
        console.log('Local target path:', localTargetPath);
        
        // Check if source file exists locally
        if (fs.existsSync(localSourcePath)) {
            console.log('✅ Source file exists locally, moving it');
            
            // Ensure target folder exists
            if (!fs.existsSync(localTargetFolderPath)) {
                fs.mkdirSync(localTargetFolderPath, { recursive: true });
                console.log('Created target folder:', localTargetFolderPath);
            }
            
            // Move the file
            await fs.promises.rename(localSourcePath, localTargetPath);
            console.log('✅ File moved successfully locally');
            
        } else {
            console.log('❌ Source file not found locally, trying to download to target location');
            
            // Try to download the file to the new location
            try {
                // Ensure target folder exists
                if (!fs.existsSync(localTargetFolderPath)) {
                    fs.mkdirSync(localTargetFolderPath, { recursive: true });
                    console.log('Created target folder for download:', localTargetFolderPath);
                }
                
                // Build download URL using the correct endpoint
                const downloadUrl = `${API_URL}/download/${data.documentName}`;
                console.log('Download URL:', downloadUrl);
                
                // Use the user parameter passed to the function instead of getting it again
                const response = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'arraybuffer',
                    headers: {
                        'Authorization': `Bearer ${user.token || 'electron-client'}`,
                        'Cookie': user.sessionCookie || '',
                        'Origin': 'http://localhost:3001'
                    }
                });
                
                if (response.status === 200) {
                    await fs.promises.writeFile(localTargetPath, Buffer.from(response.data));
                    console.log('✅ Document downloaded to new local location');
                } else {
                    console.log('❌ Download failed with status:', response.status);
                }
                
            } catch (downloadError) {
                console.error('❌ Error downloading document:', downloadError.message);
                
                // Try alternative endpoint - find PDF recursively
                try {
                    console.log('🔄 Trying alternative download endpoint...');
                    const altDownloadUrl = `${API_URL}/find-pdf/${data.documentName}`;
                    console.log('Alternative download URL:', altDownloadUrl);
                    
                    const altResponse = await axios({
                        method: 'GET',
                        url: altDownloadUrl,
                        responseType: 'arraybuffer',
                        headers: {
                            'Origin': 'http://localhost:3001'
                        }
                    });
                    
                    if (altResponse.status === 200) {
                        await fs.promises.writeFile(localTargetPath, Buffer.from(altResponse.data));
                        console.log('✅ Document downloaded via alternative endpoint');
                    } else {
                        console.log('❌ Alternative download also failed:', altResponse.status);
                    }
                } catch (altError) {
                    console.error('❌ Alternative download also failed:', altError.message);
                }
            }
        }
        
        console.log('=== WEB MOVE APPLICATION COMPLETED ===\n');
        
    } catch (error) {
        console.error('Error applying web move locally:', error);
    }
}

// === APPLYING WEB FOLDER MOVE LOCALLY ===
async function applyWebFolderMoveLocally(moveData, user) {
    console.log('\n=== APPLYING WEB FOLDER MOVE LOCALLY ===');
    console.log('📁 Folder move data:', JSON.stringify(moveData, null, 2));
    
    try {
        // Determine if user is personal or institutional
        const isPersonal = !user.institution_id || user.institution_name == null;
        const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
        const institutionPath = getInstitutionPath(rootFolderName);
        
        console.log('👤 User type:', isPersonal ? 'Personal' : 'Institutional');
        console.log('📂 Root folder:', rootFolderName);
        console.log('📂 Institution path:', institutionPath);

        // Clean paths by removing the root folder name if it's duplicated
        let cleanSourcePath = moveData.sourcePath || '';
        let cleanTargetFolder = moveData.targetFolder || '';
        
        // Remove root folder name from the beginning if present
        if (rootFolderName && cleanSourcePath.startsWith(rootFolderName + '/')) {
            cleanSourcePath = cleanSourcePath.substring(rootFolderName.length + 1);
        }
        if (rootFolderName && cleanTargetFolder.startsWith(rootFolderName + '/')) {
            cleanTargetFolder = cleanTargetFolder.substring(rootFolderName.length + 1);
        }
        
        // Defensive: strip accidental 'null/'
        if (cleanSourcePath.startsWith('null/')) cleanSourcePath = cleanSourcePath.substring(5);
        if (cleanTargetFolder.startsWith('null/')) cleanTargetFolder = cleanTargetFolder.substring(5);

        console.log('📁 Cleaned source path:', cleanSourcePath);
        console.log('📁 Cleaned target folder:', cleanTargetFolder);

        // Extract folder name from source path
        const folderName = path.basename(cleanSourcePath);
        console.log('📂 Folder name to move:', folderName);

        // Construct local paths
        const localSourceFolderPath = cleanSourcePath ? 
            path.join(institutionPath, cleanSourcePath) : 
            path.join(institutionPath, folderName);
        const localTargetParentPath = cleanTargetFolder ? 
            path.join(institutionPath, cleanTargetFolder) : 
            institutionPath;
        const localTargetFolderPath = path.join(localTargetParentPath, folderName);
        
        console.log('📁 Local source folder path:', localSourceFolderPath);
        console.log('📁 Local target folder path:', localTargetFolderPath);

        // Check if source folder exists locally
        if (!fs.existsSync(localSourceFolderPath)) {
            console.log('❌ Source folder not found locally:', localSourceFolderPath);
            console.log('🔄 This is expected for web-initiated moves, folder structure will be synced');
            return;
        }

        // Ensure target parent directory exists
        if (!fs.existsSync(localTargetParentPath)) {
            fs.mkdirSync(localTargetParentPath, { recursive: true });
            console.log('📁 Created target parent directory:', localTargetParentPath);
        }

        // Check if target already exists
        if (fs.existsSync(localTargetFolderPath)) {
            console.log('⚠️ Target folder already exists, removing it first:', localTargetFolderPath);
            fs.rmSync(localTargetFolderPath, { recursive: true, force: true });
        }

        // Move the folder locally
        fs.renameSync(localSourceFolderPath, localTargetFolderPath);
        console.log('✅ Folder moved locally successfully');

        // Send success toast and folder_move event to renderer for UI refresh
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                // Send success toast message
                const destinationName = cleanTargetFolder || 'root';
                window.webContents.send('folder-move-success', {
                    message: `Folderul "${folderName}" a fost mutat cu succes în "${destinationName}".`,
                    folderName: folderName,
                    destination: destinationName,
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Sent folder-move-success toast');

                // Send folder_move event for UI refresh
                window.webContents.send('fileSystemUpdate', {
                    type: 'folder_move',
                    oldPath: moveData.sourcePath,
                    newPath: path.join(moveData.targetFolder, folderName),
                    parentPath: moveData.targetFolder,
                    timestamp: new Date().toISOString(),
                    forceRefresh: true // Force sidebar refresh for folder moves
                });
                console.log('📡 Sent folder_move event to renderer');

                // Force sidebar refresh by sending folder structure update
                window.webContents.send('force-sidebar-refresh', {
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Sent force-sidebar-refresh event');
            }
        });
        
    } catch (error) {
        console.error('❌ Error applying web folder move locally:', error.message);
    }
    
    console.log('=== WEB FOLDER MOVE APPLICATION COMPLETED ===\n');
}

// === APPLYING WEB FOLDER CREATE LOCALLY ===
async function applyWebFolderCreateLocally(createData, user) {
    console.log('\n=== APPLYING WEB FOLDER CREATE LOCALLY ===');
    console.log('📁 Folder create data:', JSON.stringify(createData, null, 2));
    
    try {
        // Determine if user is personal or institutional
        const isPersonal = !user.institution_id || user.institution_name == null;
        const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
        const institutionPath = getInstitutionPath(rootFolderName);
        
        console.log('👤 User type:', isPersonal ? 'Personal' : 'Institutional');
        console.log('📂 Root folder:', rootFolderName);
        console.log('📂 Institution path:', institutionPath);

        // Clean folder path by removing the root folder name if it's duplicated
        let cleanFolderPath = createData.folderPath || '';
        
        // Remove root folder name from the beginning if present
        if (rootFolderName && cleanFolderPath.startsWith(rootFolderName + '/')) {
            cleanFolderPath = cleanFolderPath.substring(rootFolderName.length + 1);
        }
        
        // Defensive: strip accidental 'null/'
        if (cleanFolderPath.startsWith('null/')) {
            cleanFolderPath = cleanFolderPath.substring(5);
        }

        console.log('📁 Cleaned folder path:', cleanFolderPath);

        // Construct local folder path
        const localFolderPath = cleanFolderPath ? 
            path.join(institutionPath, cleanFolderPath) : 
            institutionPath;
        
        console.log('📁 Local folder path to create:', localFolderPath);

        // Create the folder locally if it doesn't exist
        if (!fs.existsSync(localFolderPath)) {
            fs.mkdirSync(localFolderPath, { recursive: true });
            console.log('✅ Folder created locally successfully');
        } else {
            console.log('ℹ️ Folder already exists locally:', localFolderPath);
        }

        // Send folder_create event to renderer for UI refresh
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('fileSystemUpdate', {
                    type: 'folder_create',
                    folderPath: createData.folderPath,
                    timestamp: new Date().toISOString()
                });
                console.log('📡 Sent folder_create event to renderer');
            }
        });
        
    } catch (error) {
        console.error('❌ Error applying web folder create locally:', error.message);
    }
    
    console.log('=== WEB FOLDER CREATE APPLICATION COMPLETED ===\n');
}

// Handle file system events
function handleFileSystemEvent(eventType, data) {
    console.log('\n=== DEBUG: Handling file system event in main process ===');
    console.log('DEBUG: Event type:', eventType);
    console.log('DEBUG: Event data:', JSON.stringify(data, null, 2));

    try {
        // Get socket instance
        const socket = global.socket;
        if (!socket) {
            console.error('DEBUG: No socket instance found');
            return;
        }

        // Emit event to server
        console.log('DEBUG: Emitting event to server:', eventType);
        socket.emit(eventType, data, (response) => {
            console.log('DEBUG: Server response:', response);
        });

        // Also emit to renderer process
        BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                console.log('DEBUG: Sending event to window:', window.id);
                window.webContents.send(eventType, data);
            }
        });

    } catch (error) {
        console.error('DEBUG: Error handling file system event:', error);
        console.error('DEBUG: Error stack:', error.stack);
    }
}

// Initialize socket when app is ready
app.whenReady().then(() => {
    console.log('\n=== DEBUG: App ready, initializing socket ===');
    const socket = initializeSocket();
    global.socket = socket; // Store socket instance globally
});

// Handle IPC calls
ipcMain.handle('get-socket', async () => {
    const socket = initializeSocket();
    return {
        id: socket.id,
        connected: socket.connected,
        transport: socket.io.engine.transport.name
    };
});

// Add handlers for socket operations
ipcMain.handle('socket-emit', async (event, { eventName, data }) => {
    const socket = initializeSocket();
    return new Promise((resolve) => {
        socket.emit(eventName, data, (response) => {
            resolve(response);
        });
    });
});

ipcMain.handle('socket-on', async (event, { eventName }) => {
    if (!socket) {
        throw new Error('Socket not initialized');
    }
    socket.on(eventName, (data) => {
        mainWindow?.webContents.send(`socket-${eventName}`, data);
    });
    return true;
});

// Add new function to watch and sync a folder
async function watchAndSyncFolder(folderPath, options = {}) {
    try {
        console.log('=== Starting folder watch ===');
        console.log('Folder path:', folderPath);
        console.log('Options:', options);
        
        // Get user info
        const user = getUserInfo();
        if (!user) {
            throw new Error('User not logged in');
        }
        
        // Ensure the folder path is absolute
        const absolutePath = path.resolve(folderPath);
        console.log('Absolute path:', absolutePath);
        
        // Check if folder exists
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Folder does not exist: ${absolutePath}`);
        }

        // Get the relative path for the folder
        const relativePath = path.relative(process.cwd(), absolutePath);
        console.log('Relative path:', relativePath);

        // Watch the folder for changes
        const watcher = chokidar.watch(absolutePath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            // Default to ignoring initial events to avoid scanning thousands of existing files
            ignoreInitial: (typeof options.ignoreInitial !== 'undefined') ? options.ignoreInitial : true
        });

        console.log('=== Setting up watcher events ===');
        console.log('🔍 [WATCHER] Active watcher created for:', absolutePath);
        console.log('🔍 [WATCHER] Ignored patterns:', watcher.options.ignored);
        console.log('🔍 [WATCHER] Persistent:', watcher.options.persistent);
        console.log('🔍 [WATCHER] Watcher ready:', watcher.ready);
        
        // Add ready event listener
        watcher.on('ready', () => {
            console.log('🔍 [WATCHER] Watcher is ready and watching:', absolutePath);
        });
        
        // Add error event listener
        watcher.on('error', (error) => {
            console.error('🔍 [WATCHER] Watcher error:', error);
        });
        
        // Handle file changes
        watcher.on('add', async (filePath) => {
            try {
                console.log('🔍 [WATCHER] === File added event triggered ===');
                console.log('🔍 [WATCHER] File path:', filePath);
                console.log('🔍 [WATCHER] File extension:', path.extname(filePath).toLowerCase());
                console.log('🔍 [WATCHER] Is PDF:', path.extname(filePath).toLowerCase() === '.pdf');
                
                // Buffer/coalesce events instead of processing synchronously
                bufferFileEvent('add', filePath);
                startBufferFlushTimer();
                
                // Check for potential move operation first
                handlePotentialMove(filePath, 'add');
                
                // Get relative path for the file
                const relativeFilePath = path.relative(absolutePath, filePath);
                console.log('Relative file path:', relativeFilePath);
                
                // Only process PDF files for upload (after move detection delay)
                if (path.extname(filePath).toLowerCase() === '.pdf') {
                    // Check if we should skip automatic uploads (e.g., during initial setup)
                    if (options.skipAutoUpload) {
                        console.log('Skipping auto-upload due to skipAutoUpload option');
                        return;
                    }
                    
                    // Add delay to avoid processing files that are part of a move operation
                    setTimeout(async () => {
                        try {
                            // Check if this file was part of a recent move operation
                            const fileName = path.basename(filePath);
                            const isRecentMove = Array.from(recentOperations.values()).some(op => 
                                op.fileName === fileName && Date.now() - op.timestamp < MOVE_DETECTION_WINDOW
                            );
                            
                            if (isRecentMove) {
                                console.log('Skipping upload - file is part of a move operation');
                                return;
                            }
                            
                            console.log('🚀 [AUTO-UPLOAD] DISABLED - Skipping PDF file processing');
                            console.log('🚀 [AUTO-UPLOAD] File path:', filePath);
                            
                            // TEMPORARILY DISABLED: Process the new PDF file for upload
                            // await processNewPDFFile(filePath, user, absolutePath);
                        } catch (error) {
                            console.error('Error processing file upload:', error);
                            mainWindow.webContents.send('sync-error', `Failed to process file: ${error.message}`);
                        }
                    }, MOVE_DETECTION_WINDOW + 100); // Wait for move detection window plus buffer
                }
            } catch (error) {
                console.error('Error processing file add:', error);
                mainWindow.webContents.send('sync-error', `Failed to process file: ${error.message}`);
            }
        });

        // Handle file deletions (PDF files)
        watcher.on('unlink', async (filePath) => {
            try {
                console.log('=== File deleted ===');
                console.log('File path:', filePath);
                
                // Check for potential move operation first
                handlePotentialMove(filePath, 'unlink');
                
                // Get relative path for the file
                const relativeFilePath = path.relative(absolutePath, filePath);
                console.log('Relative file path:', relativeFilePath);
                
                // Only process PDF files for deletion (after move detection delay)
                if (path.extname(filePath).toLowerCase() === '.pdf') {
                    // NOTE: PDF-urile pot fi șterse. Protecția este doar pentru foldere instituționale.
                    // Nu mai facem auto-restore pentru fișiere PDF – lăsăm fluxul existent.
                    // Check if we should skip automatic deletions (e.g., during initial setup)
                    if (options.skipAutoUpload) {
                        console.log('Skipping auto-deletion due to skipAutoUpload option');
                        return;
                    }
                    
                    // Add delay to avoid processing files that are part of a move operation
                    setTimeout(async () => {
                        try {
                            // Check if this file was part of a recent move operation
                            const fileName = path.basename(filePath);
                            const isRecentMove = Array.from(recentOperations.values()).some(op => 
                                op.fileName === fileName && Date.now() - op.timestamp < MOVE_DETECTION_WINDOW
                            );
                            
                            if (isRecentMove) {
                                console.log('Skipping deletion - file is part of a move operation');
                                return;
                            }
                            
                    console.log('🗑️ [AUTO-DELETE] ENABLED - Processing PDF file deletion');
                    console.log('🗑️ [AUTO-DELETE] File path:', filePath);
                    // Lăsăm comportamentul existent (dacă este activ). În codul actual, processDeletedPDFFile e dezactivat.
                    await processDeletedPDFFile(filePath, user, absolutePath);
            } catch (error) {
                console.error('Error processing file deletion:', error);
                            mainWindow.webContents.send('sync-error', `Failed to process file deletion: ${error.message}`);
                        }
                    }, MOVE_DETECTION_WINDOW + 100); // Wait for move detection window plus buffer
                }
            } catch (error) {
                console.error('Error processing file unlink:', error);
                mainWindow.webContents.send('sync-error', `Failed to process file deletion: ${error.message}`);
            }
        });

        // Handle folder deletions (directory removed)
        watcher.on('unlinkDir', async (dirPath) => {
            try {
                console.log('=== Folder deleted ===');
                console.log('Folder path:', dirPath);
                const user = getUserInfo();
                const isProt = isProtectedFolderAbsolute(dirPath, user, absolutePath);
                if (isProt) {
                    console.log('🛡️ Protected institutional folder deletion detected. Restoring...');
                    const restored = await restoreProtectedFolder(dirPath, user, absolutePath);
                    recordProtectionIncident({
                        type: 'protected_folder_delete',
                        path: path.relative(absolutePath, dirPath),
                        user_id: user?.id,
                        institution_id: user?.institution_id,
                        restored
                    });
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('sync-error', 'Folder instituțional nu poate fi șters. A fost restaurat automat.');
                    }
                    return;
                }

                // Only detect manual folder moves for non-protected folders
                if (!isProt) {
                    // Detect manual folder move: when a directory disappears and a similarly named directory appears elsewhere shortly after
                    const oldRel = path.relative(absolutePath, dirPath);
                    const folderName = path.basename(dirPath);
                    recentOperations.set(`dir_unlink_${folderName}_${Date.now()}`, {
                        type: 'dir_unlink',
                        folderPath: oldRel,
                        folderName: folderName,
                        timestamp: Date.now()
                    });
                    
                    console.log(`🔍 [FOLDER MOVE DETECTION] Folder disappeared: ${folderName} from ${oldRel}`);
                }
            } catch (e) {
                console.error('Error handling folder deletion:', e);
            }
        });

        // Handle folder creation (directory added)
        watcher.on('addDir', async (dirPath) => {
            try {
                console.log('=== Folder created ===');
                console.log('Folder path:', dirPath);
                const user = getUserInfo();
                
                // Check if this is a protected folder being restored - skip move detection
                const isProt = isProtectedFolderAbsolute(dirPath, user, absolutePath);
                if (isProt) {
                    console.log('🛡️ Protected folder created/restored - skipping move detection');
                    return;
                }
                
                // Check if this is a protected folder moved to wrong location
                const newRel = path.relative(absolutePath, dirPath);
                const folderName = path.basename(dirPath);
                const isProtectedFolderName = protectedPathsSet.has(normalizePathForCompare(path.join(user.institution_name || '', folderName)));
                
                if (isProtectedFolderName && user?.institution_name) {
                    // This is a protected folder moved to unauthorized location
                    console.log('🛡️ Protected folder moved to unauthorized location. Restoring...');
                    console.log('🛡️ Folder name:', folderName);
                    console.log('🛡️ Current location:', newRel);
                    
                    // Check if we've already processed this folder recently to prevent loops
                    const recentRestoreKey = `restore_${folderName}_${Date.now()}`;
                    const recentRestore = Array.from(recentOperations.values()).find(op => 
                        op.type === 'folder_restore' && op.folderName === folderName && 
                        (Date.now() - op.timestamp) < 10000 // 10 seconds
                    );
                    
                    if (recentRestore) {
                        console.log('🛡️ Folder restore already in progress, skipping to prevent loop');
                        return;
                    }
                    
                    // Mark this restore operation
                    recentOperations.set(recentRestoreKey, {
                        type: 'folder_restore',
                        folderName: folderName,
                        timestamp: Date.now()
                    });
                    
                    try {
                        // Remove the folder from wrong location
                        if (fs.existsSync(dirPath)) {
                            fs.rmSync(dirPath, { recursive: true, force: true });
                            console.log('🛡️ Removed folder from unauthorized location');
                        }
                        
                        // Restore to correct location (simple local restore without HTTP calls)
                        const correctLocation = path.join(absolutePath, user.institution_name, folderName);
                        if (!fs.existsSync(correctLocation)) {
                            fs.mkdirSync(correctLocation, { recursive: true });
                            console.log('✅ Recreated protected folder:', correctLocation);
                        }
                        const restored = true; // Mark as restored locally
                        
                        recordProtectionIncident({
                            type: 'protected_folder_move',
                            path: newRel,
                            correct_path: path.join(user.institution_name, folderName),
                            user_id: user?.id,
                            institution_id: user?.institution_id,
                            restored
                        });
                        
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('sync-error', `Folderul "${folderName}" este protejat și a fost restaurat în locația corectă.`);
                        }
                        return;
                    } catch (restoreError) {
                        console.error('🛡️ Error restoring protected folder:', restoreError);
                    }
                }
                const now = Date.now();
                
                // Clean up old operations
                for (const [key, data] of recentOperations.entries()) {
                    if (now - data.timestamp > MOVE_DETECTION_WINDOW) {
                        recentOperations.delete(key);
                    }
                }
                
                // Look for matching folder unlink operation
                const matchingKey = Array.from(recentOperations.keys()).find(key => {
                    const data = recentOperations.get(key);
                    return data.type === 'dir_unlink' && data.folderName === folderName;
                });
                
                if (matchingKey) {
                    // Found a folder move operation
                    const matchingData = recentOperations.get(matchingKey);
                    recentOperations.delete(matchingKey);
                    
                    const oldFolderPath = matchingData.folderPath;
                    const newFolderPath = newRel;
                    
                    console.log('=== Detected manual folder move ===');
                    console.log('Old folder path:', oldFolderPath);
                    console.log('New folder path:', newFolderPath);
                    
                    // Process the folder move
                    setTimeout(async () => {
                        try {
                            console.log('🔍 [FOLDER MOVE] Processing manual folder move');
                            console.log('🔍 [FOLDER MOVE] From:', oldFolderPath);
                            console.log('🔍 [FOLDER MOVE] To:', newFolderPath);
                            
                            // Normalize paths for server API call
                            const userInfo = getUserInfo();
                            const isPersonalAccount = !userInfo?.institution_id;
                            const rootFolderName = isPersonalAccount ? (userInfo?.personal_folder_name || '') : (userInfo?.institution_name || '');
                            
                            const normalizeForServer = (p) => {
                                if (!p) return rootFolderName;
                                let out = p;
                                if (out.includes('/uploads/')) {
                                    out = out.substring(out.indexOf('/uploads/') + '/uploads/'.length);
                                }
                                if (out.startsWith('null/')) out = out.substring(5);
                                return out.startsWith(rootFolderName + '/') ? out : `${rootFolderName}/${out}`;
                            };

                            const serverSourceFolder = normalizeForServer(oldFolderPath);
                            const serverDestFolder = path.dirname(normalizeForServer(newFolderPath));
                            
                            console.log('🔍 [FOLDER MOVE] Server API call:');
                            console.log('  - sourcePath:', serverSourceFolder);
                            console.log('  - destinationPath:', serverDestFolder);

                            // Check if this is a personal user - they have full control over their folders
                            const isPersonalUser = !userInfo?.institution_id || userInfo.institution_name == null;
                            
                            if (isPersonalUser) {
                                console.log('✅ [FOLDER MOVE] Personal user detected - skipping API call (already processed via web)');
                                console.log('ℹ️ [FOLDER MOVE] Success toast and UI refresh already handled by applyWebFolderMoveLocally');
                                // No need to send duplicate success toast or events - already handled by socket event
                            } else {
                                // Institutional users - call backend API for permission checks
                                try {
                                    const headers = getHttpHeaders();
                                    const resp = await axios.post(`${API_URL}/post_docs/folders/move`, {
                                        sourcePath: serverSourceFolder,
                                        destinationPath: serverDestFolder
                                    }, { headers, withCredentials: true, timeout: 30000 });
                                    
                                    console.log('✅ [FOLDER MOVE] Backend API success:', resp.status, resp.data);
                                    
                                    // Send success toast message
                                    if (mainWindow && !mainWindow.isDestroyed()) {
                                        const folderMoved = path.basename(serverSourceFolder);
                                        const destinationName = serverDestFolder === rootFolderName ? 'root' : path.basename(serverDestFolder);
                                        
                                        mainWindow.webContents.send('folder-move-success', {
                                            message: `Folderul "${folderMoved}" a fost mutat cu succes în "${destinationName}".`,
                                            folderName: folderMoved,
                                            destination: destinationName,
                                            timestamp: new Date().toISOString()
                                        });
                                        
                                        // Also notify renderer to refresh views
                                        const newPath = `${serverDestFolder}/${path.basename(serverSourceFolder)}`;
                                        mainWindow.webContents.send('fileSystemUpdate', {
                                            type: 'folder_move',
                                            oldPath: serverSourceFolder,
                                            newPath,
                                            parentPath: serverDestFolder,
                                            timestamp: new Date().toISOString()
                                        });
                                    }
                                } catch (apiErr) {
                                    console.error('❌ [FOLDER MOVE] Backend API failed:', apiErr.message);
                                    
                                    // Check if it's a permission error (403) or other error
                                    const isPermissionError = apiErr.response?.status === 403;
                                    
                                    if (mainWindow && !mainWindow.isDestroyed()) {
                                        if (isPermissionError) {
                                            // Show blocking modal for permission errors
                                            const folderName = path.basename(serverSourceFolder);
                                            mainWindow.webContents.send('sync-error', `Folderul "${folderName}" este protejat și nu poate fi mutat. Acțiunea a fost blocată.`);
                                        } else {
                                            // Show generic error for other issues
                                            mainWindow.webContents.send('sync-error', `Eroare la mutarea folderului: ${apiErr.message}`);
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('❌ [FOLDER MOVE] Error processing detected manual folder move:', error);
                        }
                    }, 100); // Small delay to ensure file operations are complete
                    
                } else {
                    // Store this operation for potential matching
                    recentOperations.set(`dir_add_${folderName}_${now}`, {
                        type: 'dir_add',
                        folderPath: newRel,
                        folderName: folderName,
                        timestamp: now
                    });
                    
                    console.log(`🔍 [FOLDER MOVE DETECTION] New folder created: ${folderName} at ${newRel}`);
                }
            } catch (error) {
                console.error('Error processing folder creation:', error);
            }
        });

        // Track file operations for detecting moves (using global variables)
        
        // Handle file moves by detecting add+unlink patterns
        const handlePotentialMove = (filePath, operation) => {
            if (path.extname(filePath).toLowerCase() !== '.pdf') return;
            
            const fileName = path.basename(filePath);
            const now = Date.now();
            
            // Clean up old operations
            for (const [key, data] of recentOperations.entries()) {
                if (now - data.timestamp > MOVE_DETECTION_WINDOW) {
                    recentOperations.delete(key);
                }
            }
            
            // Look for matching operation (add->unlink or unlink->add)
            const oppositeOp = operation === 'add' ? 'unlink' : 'add';
            const matchingKey = Array.from(recentOperations.keys()).find(key => {
                const data = recentOperations.get(key);
                return data.fileName === fileName && data.operation === oppositeOp;
            });
            
            if (matchingKey) {
                // Found a move operation
                const matchingData = recentOperations.get(matchingKey);
                recentOperations.delete(matchingKey);
                
                const oldPath = operation === 'add' ? matchingData.filePath : filePath;
                const newPath = operation === 'add' ? filePath : matchingData.filePath;
                
                console.log('=== Detected manual file move ===');
                console.log('Old path:', oldPath);
                console.log('New path:', newPath);
                
                // Process the move
                setTimeout(async () => {
                    try {
                        const oldRelativePath = path.relative(absolutePath, oldPath);
                        const newRelativePath = path.relative(absolutePath, newPath);
                        
                        const oldFolderPath = path.dirname(oldRelativePath);
                        const newFolderPath = path.dirname(newRelativePath);
                        
                        // Only process if it's actually a move between folders
                        if (oldFolderPath !== newFolderPath) {
                            console.log('Processing manual PDF move between folders');
                            
                                                         // Find document ID from database with improved search
                             console.log('DEBUG: Searching for document in database:');
                             console.log('DEBUG: - File name (without .pdf):', fileName.replace('.pdf', ''));
                             console.log('DEBUG: - Old folder path:', oldFolderPath);
                             console.log('DEBUG: - User ID:', user.id);
                             console.log('DEBUG: - Institution ID:', user.institution_id);
                             
                             // HTTP-based lookup (no direct MySQL)
                             const headers = getHttpHeaders();
                             const docsResp = await axios.get(`${API_URL}/post_docs/documents`, { headers });
                             const allDocs = Array.isArray(docsResp.data)
                                 ? docsResp.data
                                 : (docsResp.data.documents || []);
                             const baseName = fileName.replace(/\.pdf$/i, '');
                             const docs = allDocs.filter(d => {
                                 const nameMatch = (d.nom_document || d.name || '').replace(/\.pdf$/i, '') === baseName;
                                 const pathMatch = (d.path || d.folder_path || '').includes(oldFolderPath);
                                 const instMatch = (d.institution_id || user.institution_id) === user.institution_id;
                                 return nameMatch && (pathMatch || instMatch);
                             }).map(d => ({
                                 id_document: d.id_document || d.id || d.id_doc,
                                 name: d.nom_document || d.name,
                                 path: d.path
                             }));
                             console.log('DEBUG: HTTP lookup docs candidates:', docs);
                            
                            if (docs.length > 0) {
                                const documentId = docs[0].id_document;
                                
                                // Trigger move-document handler
                                const moveData = {
                                    documentId: documentId,
                                    documentName: fileName.replace('.pdf', ''),
                                    sourcePath: oldFolderPath,
                                    destinationPath: newFolderPath
                                };
                                
                                console.log('Triggering move-document handler for manual move:', moveData);
                                
                                // Create a mock event object
                                const mockEvent = {
                                    reply: (channel, data) => {
                                        console.log('Manual move response:', channel, data);
                                    }
                                };
                                
                                // Call the move-document handler directly
                                const moveHandler = require('electron').ipcMain.listeners('move-document')[0];
                                if (moveHandler) {
                                    await moveHandler(mockEvent, moveData);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error processing detected manual move:', error);
                    }
                }, 100); // Small delay to ensure file operations are complete
                
            } else {
                // Store this operation for potential matching
                recentOperations.set(`${fileName}_${now}`, {
                    fileName,
                    filePath,
                    operation,
                    timestamp: now
                });
            }
        };

        // Handle errors
        watcher.on('error', (error) => {
            console.error('Watcher error:', error);
            mainWindow.webContents.send('sync-error', `Folder watch error: ${error.message}`);
        });

        console.log('=== Folder watch setup complete ===');
        console.log('🔍 [WATCHER] Watcher is ready and listening for changes in:', absolutePath);
        
        // Optional periodic diagnostics (enable with SYNC_WATCHER_DEBUG=1)
        if (process.env.SYNC_WATCHER_DEBUG === '1') {
            const testInterval = setInterval(() => {
                if (watcher && !watcher._closed) {
                    console.log('🔍 [WATCHER] ⏰ Watcher still active for:', absolutePath);
                    console.log('🔍 [WATCHER] ⏰ Watched paths:', watcher.getWatched());
                } else {
                    console.log('❌ [WATCHER] ⏰ Watcher is closed or invalid');
                    clearInterval(testInterval);
                }
            }, 30000);
        }
        
        return watcher;
    } catch (error) {
        console.error('Error setting up folder watch:', error);
        mainWindow.webContents.send('sync-error', `Failed to watch folder: ${error.message}`);
        throw error;
    }
}

// Modify the folder selection handler
ipcMain.on('select-folder', async () => {
    try {
        // Get user info first
        const user = getUserInfo();
        if (!user) {
            mainWindow.webContents.send('sync-error', 'User not logged in');
            return;
        }

        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Folder to Sync'
        });

        if (!result.canceled) {
            const folderPath = result.filePaths[0];
            
            // Start watching the selected folder
            await watchAndSyncFolder(folderPath);
            
            // Notify UI
            mainWindow.webContents.send('folder-selected', {
                path: folderPath,
                status: 'watching'
            });
        }
    } catch (error) {
        console.error('Error selecting folder:', error);
        mainWindow.webContents.send('sync-error', 'Failed to select folder');
    }
});

// Add cleanup for folder watchers
app.on('window-all-closed', () => {
    // Close all folder watchers
    folderWatchers.forEach((watcher, path) => {
        console.log('Closing watcher for:', path);
        watcher.close();
    });
    folderWatchers.clear();
});

// Function to clean up resources
async function cleanup() {
    console.log('Cleaning up resources...');
    
    // Close watchers
    if (watcher) {
        console.log('Closing folder watcher...');
        await watcher.close();
        watcher = null;
    }
    
    if (syncAgentWatcher) {
        console.log('Closing sync agent watcher...');
        await syncAgentWatcher.close();
        syncAgentWatcher = null;
    }
    
    // Close WebSocket connection
    if (ws) {
        console.log('Closing WebSocket connection...');
        ws.close();
        ws = null;
    }
    
    // Clear cache
    cachedFiles = null;
    lastLoadTime = 0;
    
    // Clear store
    store.clear();
    
    console.log('Cleanup completed');
}

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Initialize app when ready
    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', async () => {
        console.log('All windows are closed...');
        await cleanup();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // Don't show the window until it's ready
        title: 'EDMS Sync Agent',
        icon: path.join(__dirname, 'public', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: false // Needed for local file access
        }
    });

    mainWindow.loadFile('login.html');
    
    // Show window when it's ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });
    
    // Open DevTools for debugging WebSocket and other issues
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', async () => {
        await cleanup();
        mainWindow = null;
    });

    // Handle window state
    mainWindow.on('minimize', () => {
        mainWindow.hide();
    });

    mainWindow.on('restore', () => {
        mainWindow.show();
    });
}

// Provide a simple folder picker callable from renderer without remote
ipcMain.handle('select-upload-folder', async () => {
    try {
        console.log('[DIALOG] openDirectory request');
        const parent = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
        const res = await dialog.showOpenDialog(parent, { properties: ['openDirectory', 'createDirectory'] });
        console.log('[DIALOG] folder result:', res);
        if (res.canceled || !res.filePaths || !res.filePaths[0]) return { canceled: true };
        return { canceled: false, path: res.filePaths[0] };
    } catch (e) {
        console.error('[DIALOG] folder error:', e);
        return { canceled: true, error: e.message };
    }
});

// Provide a file picker for multiple PDFs
ipcMain.handle('select-upload-files', async () => {
    try {
        console.log('[UPLOAD] [DIALOG] openFile request received');
        const parent = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
        const res = await dialog.showOpenDialog(parent, {
            properties: ['openFile', 'multiSelections'],
            filters: [ { name: 'PDF', extensions: ['pdf'] } ]
        });
        console.log('[DIALOG] files result:', res);
        if (res.canceled || !res.filePaths || !res.filePaths.length) return { canceled: true, paths: [] };
        return { canceled: false, paths: res.filePaths };
    } catch (e) {
        console.error('[DIALOG] files error:', e);
        return { canceled: true, paths: [], error: e.message };
    }
});

// Handle login
ipcMain.handle('login', async (event, credentials) => {
    try {
        // First try HTTP login to backend API
        console.log('Attempting HTTP login to backend API...');
        try {
            const response = await axios.post(`${API_URL}/login`, {
                loguser: credentials.username,
                logpass: credentials.password
            }, {
                withCredentials: true
            });
            
            if (response.data && response.data.success) {
                console.log('HTTP login successful');
                
                // Extract and save session cookie
                let sessionCookie = '';
                if (response.headers && response.headers['set-cookie']) {
                    const cookies = response.headers['set-cookie'];
                    sessionCookie = cookies.find(cookie => cookie.includes('session_cookie_name'));
                    if (sessionCookie) {
                        console.log('Session cookie found and saved');
                        store.set('sessionCookie', sessionCookie);
                    }
                }
                
                const userData = {
                    id: response.data.userId,
                    email: credentials.username,
                    firstName: response.data.prenom,
                    lastName: response.data.nom,
                    role: response.data.role,
                    institution_id: response.data.institution_id,
                    institution_name: response.data.institution_name,
                    personal_folder_name: response.data.personal_folder_name,
                    permissions: {
                        diffuse: true,
                        upload: true,
                        download: true,
                        print: true
                    },
                    sessionCookie: sessionCookie
                };
                
                console.log('HTTP Login - userData created:', userData);
                store.set('user', userData);
                
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.loadFile('dashboard.html');
                    
                    setTimeout(async () => {
                        try {
                            console.log('🚀 POST-LOGIN SETUP START');
                            
                            // Check if user is personal or institutional
                            const isPersonalAccount = !userData.institution_id;
                            
                            if (isPersonalAccount) {
                                console.log('👤 Personal account detected, setting up personal folder...');
                                await setupPersonalFolder(userData);
                            } else {
                                console.log('🏢 Institutional account detected, setting up institution folder...');
                                // Check if institution folder already exists
                                const institutionPath = getInstitutionPath(userData.institution_name);
                                const folderExists = fs.existsSync(institutionPath);
                                
                                if (folderExists) {
                                    console.log('✅ Institution folder already exists, skipping setup');
                                    console.log('📁 Folder path:', institutionPath);
                                    console.log('🚀 [DEBUG] TAKING EXISTING FOLDER BRANCH - NO SETUP CALLED, NO WATCHER STARTED!');
                                    
                                    // Just load folders and files without setup
                                    console.log('📂 Loading institution folders...');
                                    const foldersResult = await loadInstitutionFolders();
                                    console.log('📂 Folders result:', foldersResult);
                                    
                                    console.log('📄 Loading recent files...');
                                    await loadRecentFiles();
                                    
                                    // 🚨 FIX: START WATCHER FOR EXISTING FOLDER
                                    console.log('🔍 [WATCHER] Starting watcher for existing institution folder...');
                                    console.log('🔍 [WATCHER] About to watch path:', institutionPath);
                                    await watchAndSyncFolder(institutionPath);
                                    console.log('🔍 [WATCHER] Watcher setup completed for existing folder');
                                    
                                    console.log('✅ POST-LOGIN SETUP COMPLETE (existing folder)');
                                } else {
                                    console.log('📁 Setting up institution folder...');
                                    console.log('🚀 [DEBUG] About to call setupInstitutionFolder with userData:', userData ? userData.institution_name : 'NULL');
                                    await setupInstitutionFolder(userData);
                                    
                                    console.log('📂 Loading institution folders...');
                                    const foldersResult = await loadInstitutionFolders();
                                    console.log('📂 Folders result:', foldersResult);
                                    
                                    console.log('📄 Loading recent files...');
                                    await loadRecentFiles();
                                    
                                    console.log('✅ POST-LOGIN SETUP COMPLETE (new folder)');
                                }
                            }
                        } catch (error) {
                            console.error('❌ Error during post-login setup:', error);
                            console.error('❌ Error stack:', error.stack);
                        }
                    }, 1000);
                }
                
                return { success: true };
            }
        } catch (httpError) {
            console.log('HTTP login failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL connection
        console.log('Attempting to connect to database...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database successfully');
        
        console.log('Querying user:', credentials.username);
        const [rows] = await connection.execute(
            'SELECT u.*, i.name as institution_name FROM user u LEFT JOIN institutions i ON u.institution_id = i.id_institution WHERE u.email = ?',
            [credentials.username]
        );
        
        await connection.end();
        console.log('Query result:', rows);

        if (rows.length === 0) {
            return { success: false, message: 'Invalid username or password' };
        }

        const user = rows[0];
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log('Password verification result:', isValid);
        
        if (!isValid) {
            return { success: false, message: 'Invalid username or password' };
        }

        const userData = {
            id: user.id_user,
            email: user.email,
            firstName: user.prenom,
            lastName: user.nom,
            role: user.roles,
            institution_id: user.institution_id,
            institution_name: user.institution_name,
            personal_folder_name: user.personal_folder_name,
            permissions: {
                diffuse: user.diffuse,
                upload: user.upload,
                download: user.download,
                print: user.print
            }
        };

        store.set('user', userData);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadFile('dashboard.html');
            
            // Setup institution folder and load data after a short delay
            setTimeout(async () => {
                try {
                    // Check if user is personal or institutional
                    const isPersonalAccount = !userData.institution_id;
                    
                    if (isPersonalAccount) {
                        console.log('👤 Personal account detected, setting up personal folder...');
                        await setupPersonalFolder(userData);
                    } else {
                        console.log('🏢 Institutional account detected, setting up institution folder...');
                        // Check if institution folder already exists
                        const institutionPath = getInstitutionPath(userData.institution_name);
                        const folderExists = fs.existsSync(institutionPath);
                        
                        if (folderExists) {
                            console.log('✅ Institution folder already exists, skipping setup (MySQL fallback)');
                            console.log('📁 Folder path:', institutionPath);
                            
                            // Just load folders and files without setup
                            await loadInstitutionFolders();
                            await loadRecentFiles();
                            
                            // 🚨 FIX: START WATCHER FOR EXISTING FOLDER (MySQL fallback)
                            console.log('🔍 [WATCHER] Starting watcher for existing institution folder (MySQL fallback)...');
                            console.log('🔍 [WATCHER] About to watch path:', institutionPath);
                            await watchAndSyncFolder(institutionPath);
                            console.log('🔍 [WATCHER] Watcher setup completed for existing folder (MySQL fallback)');
                        } else {
                            console.log('📁 Setting up institution folder (MySQL fallback)...');
                            console.log('🚀 [DEBUG] About to call setupInstitutionFolder (MySQL fallback) with userData:', userData ? userData.institution_name : 'NULL');
                            await setupInstitutionFolder(userData);
                            
                            // Load folders and files
                            await loadInstitutionFolders();
                            await loadRecentFiles();
                        }
                    }
                } catch (error) {
                    console.error('Error during post-login setup:', error);
                }
            }, 1000);
        }

        return { success: true };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'An error occurred during login: ' + error.message };
    }
});

// Add handler for getting user info
ipcMain.handle('get-user-info', () => {
    try {
        return store.get('user');
    } catch (error) {
        console.error('Error getting user info:', error);
        return null;
    }
});

// Add handler for opening EDMS folder
ipcMain.handle('open-edms-folder', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        const institutionPath = getInstitutionPath(user.institution_name);
        
        if (fs.existsSync(institutionPath)) {
            await shell.openPath(institutionPath);
            return { success: true, path: institutionPath };
        } else {
            return { success: false, message: 'Folderul instituției nu există încă' };
        }
    } catch (error) {
        console.error('Error opening EDMS folder:', error);
        return { success: false, message: error.message };
    }
});

// Add handler for checking if institution folder exists
ipcMain.handle('check-institution-folder', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            return { exists: false, message: 'User not authenticated' };
        }
        
        const institutionPath = getInstitutionPath(user.institution_name);
        const docDiLPath = getDocDiLPath();
        
        return { 
            exists: fs.existsSync(institutionPath), 
            path: institutionPath,
            docDiLPath: docDiLPath
        };
    } catch (error) {
        console.error('Error checking institution folder:', error);
        return { exists: false, message: error.message };
    }
});

// Add handler for manual institution folder creation
ipcMain.handle('create-institution-folder', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        console.log('🧪 Manual folder creation test started for user:', user.institution_name);
        
        // Force the setup dialog to appear
        const institutionPath = getInstitutionPath(user.institution_name);
        console.log('🧪 Institution path:', institutionPath);
        
        // Show dialog regardless of folder existence
        const response = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['Da, creează folderul', 'Nu acum'],
            defaultId: 0,
            title: 'Test Folder Instituție',
            message: `TEST: Folderul pentru instituția "${user.institution_name}"`,
            detail: `Acest este un test.\nCalea va fi: ${institutionPath}\n\nDoriți să continuați?`
        });
        
        if (response.response === 0) {
            const result = await createInstitutionFolderLocally(user);
            
            // Show success message
            await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Test Reușit',
                message: 'Testul pentru folderul instituției a reușit!',
                detail: `Folderul creat/verificat la: ${result.path}`
            });
            
            // Open the folder
            await shell.openPath(result.path);
            
            if (result.created) {
                // Start watching the folder
                await watchAndSyncFolder(result.path);
            }
            
            return { success: true, ...result };
        } else {
            return { success: false, message: 'Test cancelled by user' };
        }
        
    } catch (error) {
        console.error('Error in test folder creation:', error);
        return { success: false, message: error.message };
    }
});

// Check authentication
ipcMain.handle('check-auth', async () => {
    const credentials = store.get('credentials');
    if (!credentials) return false;

    try {
        const response = await axios.post(`${API_URL}/api/auth/login`, {
            username: credentials.username,
            password: credentials.password
        });
        return response.data.success;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
});

// Add this new function to load existing files
async function loadExistingFiles() {
    try {
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }

        const now = Date.now();
        
        // Return cached files if they exist and are not older than CACHE_DURATION
        if (cachedFiles && (now - lastLoadTime) < CACHE_DURATION) {
            console.log('Returning cached files');
            return cachedFiles;
        }

        const institutionPath = getInstitutionPath(user.institution_name);
        console.log('Loading existing files from:', institutionPath);
        
        if (!fs.existsSync(institutionPath)) {
            console.log('Institution directory does not exist');
            return [];
        }

        const files = [];

        // First, get files from the root institution folder
        const rootFiles = fs.readdirSync(institutionPath, { withFileTypes: true })
            .filter(item => !item.isDirectory() && item.name.toLowerCase().endsWith('.pdf'))
            .map(file => ({
                name: file.name,
                path: path.join(institutionPath, file.name),
                folder: user.institution_name,
                institution: user.institution_name,
                status: 'synced'
            }));

        files.push(...rootFiles);

        // Then get files from subfolders
        const folders = fs.readdirSync(institutionPath, { withFileTypes: true })
            .filter(item => item.isDirectory());

        for (const folder of folders) {
            const folderPath = path.join(institutionPath, folder.name);
            const folderFiles = fs.readdirSync(folderPath)
                .filter(file => file.toLowerCase().endsWith('.pdf'))
                .map(file => ({
                    name: file,
                    path: path.join(folderPath, file),
                    folder: folder.name,
                    institution: user.institution_name,
                    status: 'synced'
                }));
            
            files.push(...folderFiles);
        }

        // Update cache
        cachedFiles = files;
        lastLoadTime = now;
        
        console.log(`Found ${files.length} existing files`);
        return files;
    } catch (error) {
        console.error('Error loading existing files:', error);
        return [];
    }
}

// Add function to invalidate cache when needed
function invalidateFileCache() {
    cachedFiles = null;
    lastLoadTime = 0;
}

function connectWebSocket() {
    try {
        if (socket) {
            console.log('DEBUG: Disconnecting existing socket connection');
            socket.disconnect();
        }

        // Get user data
        const userData = getUserInfo();
        if (!userData || !userData.id) {
            console.error('DEBUG: No user data available for socket initialization');
                return;
            }

        console.log('\n=== DEBUG: Initializing Socket.IO connection in main process ===');
        console.log('DEBUG: User data:', {
            userId: userData.id,
            institutionId: userData.institution_id
        });

        socket = io(API_URL, {
            transports: ['websocket', 'polling'], // Allow both WebSocket and polling
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            forceNew: false,
            timeout: 20000,
            autoConnect: true,
            withCredentials: true,
            path: '/socket.io',
            upgrade: true,
            rememberUpgrade: true,
            rejectUnauthorized: false,
            pingTimeout: 60000,
            pingInterval: 25000,
            upgradeTimeout: 10000,
            maxHttpBufferSize: 1e8
        });

        // Add listener for all events
        socket.onAny((eventName, ...args) => {
                    // Socket.IO event received (debug info removed)
        });

        socket.on('connect', () => {
            console.log('\n=== DEBUG: Socket.IO connected in main process ===');
            console.log('DEBUG: Socket ID:', socket.id);
            console.log('DEBUG: Transport:', socket.io.engine.transport.name);
            console.log('DEBUG: Socket connected:', socket.connected);

            // Subscribe to updates using user ID
            const subscriptionData = {
                userId: userData.id,
                institutionId: userData.institution_id
            };
            console.log('DEBUG: Sending subscription with data:', subscriptionData);
            socket.emit('subscribe', subscriptionData, (response) => {
                console.log('DEBUG: Subscription acknowledgment:', response);
            });
        });

        socket.on('fileSystemChange', (data, callback) => {
            console.log('\n=== DEBUG: Received fileSystemChange in main process ===');
            console.log('DEBUG: Event data:', JSON.stringify(data, null, 2));
            console.log('DEBUG: Current user ID:', userData.id);
            console.log('DEBUG: Socket connected:', socket.connected);
            console.log('DEBUG: Socket ID:', socket.id);
            console.log('DEBUG: Main window exists:', !!mainWindow);
            console.log('DEBUG: Main window webContents exists:', mainWindow ? !!mainWindow.webContents : false);

            try {
                if (!data || !data.type) {
                    console.error('DEBUG: Invalid fileSystemChange data:', data);
                    if (callback) callback({ success: false, error: 'Invalid data' });
                    return;
                }

                // Forward the event to the renderer
                console.log('DEBUG: Forwarding event to renderer:', {
                    type: data.type,
                    folderPath: data.folderPath,
                    timestamp: data.timestamp
                });
                
                mainWindow.webContents.send('fileSystemUpdate', {
                    ...data,
                    userId: userData.id
                });

                console.log('DEBUG: Event forwarded to renderer successfully');

                // Send acknowledgment
                if (callback) callback({ success: true });
            } catch (error) {
                console.error('DEBUG: Error handling fileSystemChange:', error);
                console.error('DEBUG: Error stack:', error.stack);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Add handler for fileSystemUpdate event
        socket.on('fileSystemUpdate', (data) => {
            console.log('\n=== DEBUG: Received fileSystemUpdate in main process ===');
            console.log('DEBUG: Update data:', JSON.stringify(data, null, 2));
            
            try {
                if (!data || !data.type) {
                    console.error('DEBUG: Invalid fileSystemUpdate data:', data);
                    return;
                }

                // Get all windows
                const windows = BrowserWindow.getAllWindows();
                console.log('DEBUG: Number of windows:', windows.length);

                // Broadcast to all windows
                windows.forEach(window => {
                    if (!window.isDestroyed()) {
                        console.log('DEBUG: Sending update to window:', window.id);
                        // Send the event directly to the renderer process with the same event name
                        window.webContents.send('fileSystemUpdate', data);
                    }
                });

            } catch (error) {
                console.error('DEBUG: Error handling fileSystemUpdate:', error);
                console.error('DEBUG: Error stack:', error.stack);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('DEBUG: Socket.IO disconnected in main process. Reason:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('DEBUG: Socket.IO connection error:', error);
        });

        socket.on('error', (error) => {
            console.error('DEBUG: Socket.IO error:', error);
        });

        } catch (error) {
        console.error('DEBUG: Error initializing Socket.IO:', error);
    }
}

// Add this function to handle file moves
async function moveFile(sourcePath, targetFolder) {
    try {
        console.log('=== Starting File Move Operation ===');
        console.log('Source path:', sourcePath);
        console.log('Target folder:', targetFolder);

        const user = store.get('user');
        if (!user) {
            throw new Error('No user information available');
        }

        // Get the source folder path and file name
        const sourceFolderPath = path.dirname(sourcePath);
        const fileName = path.basename(sourcePath);
        const targetFolderPath = path.join(targetFolder, fileName);

        console.log('Source folder path:', sourceFolderPath);
        console.log('Target file path:', targetFolderPath);

        // Ensure target folder exists
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
            console.log('Created target folder:', targetFolder);
        }

        // Move the file
        await fs.promises.rename(sourcePath, targetFolderPath);
        console.log('File moved successfully');

        // Update database
        const connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute(
            'UPDATE documents SET path = ?, folder_id = ? WHERE path = ? AND institution_id = ?',
            [targetFolderPath, targetFolder, sourcePath, user.institution_id]
        );
        await connection.end();

        console.log('Database updated:', result);

        // Notify WebSocket clients about the move
        if (ws && ws.readyState === WebSocket.OPEN) {
            const moveEvent = {
                type: 'document_moved',
                sourcePath: sourcePath,
                destinationPath: targetFolderPath,
                documentId: result.insertId,
                timestamp: new Date().toISOString()
            };
            console.log('Sending move event:', moveEvent);
            ws.send(JSON.stringify(moveEvent));
        }

        // Refresh both source and destination folders
        const sourceFolder = path.dirname(sourcePath);
        const destFolder = path.dirname(targetFolderPath);

        console.log('Refreshing source folder:', sourceFolder);
        mainWindow.webContents.send('get-folder-structure', {
            institutionId: user.institution_id,
            currentPath: sourceFolder
        });

        if (sourceFolder !== destFolder) {
            console.log('Refreshing destination folder:', destFolder);
            mainWindow.webContents.send('get-folder-structure', {
                institutionId: user.institution_id,
                currentPath: destFolder
            });
        }

        return true;
    } catch (error) {
        console.error('Error moving file:', error);
        throw error;
    }
}

// Add IPC handler for file moves
ipcMain.on('move-file', async (event, { sourcePath, targetFolder }) => {
    await moveFile(sourcePath, targetFolder);
});

// Add IPC handler for fileSystemChange events from renderer
ipcMain.on('fileSystemChange', async (event, data) => {
    try {
        console.log('\n=== DEBUG: Received fileSystemChange from renderer ===');
        console.log('DEBUG: Event data:', JSON.stringify(data, null, 2));
        
        if (!data || !data.type) {
            console.error('DEBUG: Invalid fileSystemChange data:', data);
            return;
        }
        
        const user = store.get('user');
        if (!user) {
            console.error('DEBUG: No user information available');
            return;
        }
        
        // Handle different types of file system changes
        switch (data.type) {
            case 'move':
                console.log('DEBUG: Processing move event from renderer');
                
                // Call the move-document handler
                const moveData = {
                    documentId: data.documentId,
                    documentName: data.documentName || path.basename(data.sourcePath || '').replace('.pdf', ''),
                    sourcePath: data.sourcePath,
                    destinationPath: data.targetFolder
                };
                
                console.log('DEBUG: Calling move-document handler with:', moveData);
                
                // Create a mock event for the handler
                const mockEvent = {
                    reply: (channel, response) => {
                        console.log('DEBUG: Move response:', channel, response);
                    }
                };
                
                // Find and call the move-document handler
                const moveHandlers = require('electron').ipcMain.listeners('move-document');
                if (moveHandlers.length > 0) {
                    await moveHandlers[0](mockEvent, moveData);
                    console.log('DEBUG: Move-document handler completed');
                } else {
                    console.error('DEBUG: No move-document handler found');
                }
                break;
                
            case 'move_folder':
                console.log('DEBUG: Processing move_folder event from renderer');
                try {
                    const user = store.get('user');
                    if (!user) {
                        throw new Error('User not authenticated');
                    }

                    let { sourcePath, targetFolder } = data;
                    console.log('DEBUG: Incoming folder move:', { sourcePath, targetFolder });

                    // Determine root folder name (institution vs personal)
                    const isPersonal = !user.institution_id || user.institution_name == null;
                    const rootFolderName = isPersonal ? (user.personal_folder_name || '') : (user.institution_name || '');
                    const institutionPath = getInstitutionPath(rootFolderName);

                    const normalizeForServer = (p) => {
                        if (!p) return rootFolderName;
                        let out = p;
                        if (out.includes('/uploads/')) {
                            out = out.substring(out.indexOf('/uploads/') + '/uploads/'.length);
                        }
                        if (out.startsWith('null/')) out = out.substring(5);
                        return out.startsWith(rootFolderName + '/') ? out : `${rootFolderName}/${out}`;
                    };

                    const serverSourceFolder = normalizeForServer(sourcePath);
                    let serverDestFolder = normalizeForServer(targetFolder);
                    // If destination already includes the folder name, treat it as final path and use its parent as destination
                    const srcFolderName = path.basename(serverSourceFolder || '');
                    let serverDestParent = serverDestFolder;
                    if (path.basename(serverDestFolder || '') === srcFolderName) {
                        serverDestParent = path.dirname(serverDestFolder);
                    }
                    console.log('DEBUG: Server folder move paths:', { serverSourceFolder, serverDestFolder, serverDestParent });

                    // === 1) Move locally in DocDiL if present ===
                    try {
                        // Remove root name from relative paths to build local absolute paths under DocDiL
                        const stripRoot = (p) => (p && p.startsWith(rootFolderName + '/')) ? p.substring(rootFolderName.length + 1) : p;
                        const localSrcRel = stripRoot(serverSourceFolder);
                        const localDstRel = stripRoot(serverDestParent);
                        const localSourceFolderPath = path.join(institutionPath, localSrcRel || '');
                        const localDestParentPath = path.join(institutionPath, localDstRel || '');
                        const folderName = path.basename(localSourceFolderPath);
                        const localNewFolderPath = path.join(localDestParentPath, folderName);

                        if (fs.existsSync(localSourceFolderPath)) {
                            if (!fs.existsSync(localDestParentPath)) {
                                fs.mkdirSync(localDestParentPath, { recursive: true });
                            }
                            fs.renameSync(localSourceFolderPath, localNewFolderPath);
                            console.log('DEBUG: Local folder moved OK:', localSourceFolderPath, '→', localNewFolderPath);
                        } else {
                            console.log('DEBUG: Local source folder missing, skipping local move:', localSourceFolderPath);
                        }
                    } catch (localErr) {
                        console.warn('DEBUG: Local folder move failed:', localErr.message);
                    }

                    // === 2) Ask backend to move and update DB ===
                    try {
                        const resp = await axios.post(`${API_URL}/post_docs/folders/move`, {
                            sourcePath: serverSourceFolder,
                            destinationPath: serverDestParent
                        }, { headers: getHttpHeaders(), withCredentials: true, timeout: 30000 });
                        console.log('DEBUG: Backend folders/move response:', resp.status, resp.data);
                    } catch (apiErr) {
                        console.error('DEBUG: Backend folder move failed:', apiErr.message);
                    }

                    // === 3) Notify renderer to refresh views ===
                    try {
                        const newPath = `${serverDestParent}/${path.basename(serverSourceFolder)}`;
                        mainWindow.webContents.send('fileSystemUpdate', {
                            type: 'folder_move',
                            oldPath: serverSourceFolder,
                            newPath,
                            parentPath: serverDestFolder,
                            timestamp: new Date().toISOString()
                        });
                    } catch (emitErr) {
                        console.warn('DEBUG: Failed to emit fileSystemUpdate for folder move:', emitErr.message);
                    }
                } catch (err) {
                    console.error('DEBUG: Error processing move_folder:', err.message);
                }
                break;
                
            default:
                console.log('DEBUG: Unknown fileSystemChange type:', data.type);
        }
        
    } catch (error) {
        console.error('DEBUG: Error handling fileSystemChange from renderer:', error);
    }
});

// Modify the start-watching handler
ipcMain.on('start-watching', async (event, folderPath) => {
    try {
        if (watcher) {
            watcher.close();
        }

        // First scan the folder for existing PDFs
        const existingFiles = await scanFolder(folderPath);
        mainWindow.webContents.send('initial-scan-complete', existingFiles);

        // Then set up the watcher for new changes
        watcher = chokidar.watch(folderPath, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true
        });

        watcher.on('add', async (filePath) => {
            if (filePath.toLowerCase().endsWith('.pdf')) {
                try {
                    await handleFileChange(filePath, 'add');
                    mainWindow.webContents.send('file-changed', filePath);
                    // Reload existing files to show the new file in SyncAgent
                    const existingFiles = await loadExistingFiles();
                    mainWindow.webContents.send('existing-files-loaded', existingFiles);
                } catch (error) {
                    console.error('Error handling file add:', error);
                    mainWindow.webContents.send('sync-error', error.message);
                }
            }
        });

        watcher.on('change', async (filePath) => {
            if (filePath.toLowerCase().endsWith('.pdf')) {
                try {
                    bufferFileEvent('change', filePath);
                    startBufferFlushTimer();
                    await handleFileChange(filePath, 'change');
                    mainWindow.webContents.send('file-changed', filePath);
                    // Reload existing files to show the updated file in SyncAgent
                    const existingFiles = await loadExistingFiles();
                    mainWindow.webContents.send('existing-files-loaded', existingFiles);
                } catch (error) {
                    console.error('Error handling file change:', error);
                    mainWindow.webContents.send('sync-error', error.message);
                }
            }
        });

        watcher.on('error', (error) => {
            console.error('Watcher error:', error);
            mainWindow.webContents.send('sync-error', error.message);
        });

        // Start watching the SyncAgent folder
        startSyncAgentWatcher();

        isWatching = true;
        mainWindow.webContents.send('sync-started', true);
    } catch (error) {
        console.error('Error starting watcher:', error);
        mainWindow.webContents.send('sync-error', 'Failed to start folder watching');
    }
});

// Modify the stop-sync handler
ipcMain.on('stop-sync', () => {
    if (watcher) {
        watcher.close();
        watcher = null;
    }
    if (syncAgentWatcher) {
        syncAgentWatcher.close();
        syncAgentWatcher = null;
    }
    isWatching = false;
});

ipcMain.on('show-window', () => {
    if (mainWindow) {
        mainWindow.show();
    }
});

// Handle app quit
app.on('before-quit', async () => {
    console.log('Application is quitting...');
    await cleanup();
});

// Add this function to organize folders hierarchically
function organizeFoldersHierarchically(folders) {
    const folderMap = new Map();
    const rootFolders = [];

    // First pass: Create folder objects with children arrays
    folders.forEach(folder => {
        const pathParts = folder.folder_path.split('/');
        const folderObj = {
            id: folder.id,
            name: folder.folder_name,
            path: folder.folder_path,
            documentCount: folder.document_count,
            lastModified: folder.last_modified,
            createdBy: folder.created_by,
            createdAt: folder.created_at,
            children: []
        };
        folderMap.set(folder.folder_path, folderObj);
    });

    // Second pass: Build hierarchy
    folders.forEach(folder => {
        const pathParts = folder.folder_path.split('/');
        const currentPath = folder.folder_path;
        const parentPath = pathParts.slice(0, -1).join('/');

        if (parentPath && folderMap.has(parentPath)) {
            // Add to parent's children
            folderMap.get(parentPath).children.push(folderMap.get(currentPath));
        } else {
            // This is a root folder
            rootFolders.push(folderMap.get(currentPath));
        }
    });

    return rootFolders;
}

// Function to load personal folders and documents for personal users
async function loadPersonalFolders(user, currentPath = '') {
    console.log('\n=== START loadPersonalFolders ===');
    console.log('Personal user:', { userId: user.id, currentPath });

    try {
        // First try HTTP API for personal folders
        console.log('Attempting HTTP personal folders fetch...');
        try {
            const foldersResponse = await axios.get(`${API_URL}/post_docs/folders`, {
                headers: getHttpHeaders()
            });
            const documentsResponse = await axios.get(`${API_URL}/post_docs/documents`, {
                headers: getHttpHeaders()
            });
            
            if (foldersResponse.data && documentsResponse.data) {
                console.log('HTTP personal folders and documents fetch successful');
                
                // Extract folders array from response object
                const foldersArray = foldersResponse.data.folders || foldersResponse.data;
                const documentsArray = documentsResponse.data.documents || documentsResponse.data;
                
                console.log('📁 Personal folders array:', Array.isArray(foldersArray), foldersArray?.length);
                console.log('📄 Personal documents array:', Array.isArray(documentsArray), documentsArray?.length);
                
                // Filter folders for personal user (institution_id = null, created_by = user.id)
                const personalFolders = foldersArray.filter(folder => {
                    return folder.institution_id === null && folder.created_by === user.id;
                });

                // Filter documents for personal user (id_user_source = user.id)
                const personalDocuments = documentsArray.filter(doc => {
                    // For personal users, show all documents if currentPath is empty (initial load)
                    if (currentPath === '') {
                        return doc.id_user_source === user.id;
                    }
                    // Otherwise, filter by currentPath
                    return doc.id_user_source === user.id && doc.path === currentPath;
                }).map(doc => ({
                    ...doc,
                    comment: doc.comment || '',
                    keywords: doc.keywords || [],
                    mot1: doc.mot1 || '',
                    mot2: doc.mot2 || '',
                    mot3: doc.mot3 || '',
                    mot4: doc.mot4 || '',
                    mot5: doc.mot5 || ''
                }));
                
                const result = {
                    institutionName: user.personal_folder_name || 'Personal Account',
                    currentPath: currentPath,
                    folders: personalFolders,
                    documents: personalDocuments
                };

                console.log('👤 Personal account result:', {
                    institutionName: result.institutionName,
                    foldersCount: result.folders.length,
                    documentsCount: result.documents.length
                });

                return result;
            }
        } catch (httpError) {
            console.log('HTTP personal folders fetch failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL connection for personal users
        const connection = await mysql.createConnection(dbConfig);
        
        try {
            // Get personal folders
            const [folders] = await connection.execute(
                `SELECT * FROM folders 
                 WHERE institution_id IS NULL AND created_by = ? 
                 ORDER BY folder_name`,
                [user.id]
            );

            // Get personal documents
            let documents;
            if (currentPath === '') {
                // For initial load, get all personal documents
                [documents] = await connection.execute(
                    `SELECT d.*, dt.type_name, u.prenom, u.nom
                     FROM table_document d
                     LEFT JOIN document_types dt ON d.type_id = dt.id
                     LEFT JOIN user u ON d.id_user_source = u.id_user
                     WHERE d.id_user_source = ?
                     ORDER BY d.date_upload DESC`,
                    [user.id]
                );
            } else {
                // For specific folder, filter by path
                [documents] = await connection.execute(
                    `SELECT d.*, dt.type_name, u.prenom, u.nom
                     FROM table_document d
                     LEFT JOIN document_types dt ON d.type_id = dt.id
                     LEFT JOIN user u ON d.id_user_source = u.id_user
                     WHERE d.id_user_source = ? AND d.path = ?
                     ORDER BY d.date_upload DESC`,
                    [user.id, currentPath]
                );
            }

            await connection.end();

            const result = {
                institutionName: user.personal_folder_name || 'Personal Account',
                currentPath: currentPath,
                folders: folders,
                documents: documents.map(doc => ({
                    ...doc,
                    comment: doc.comment || '',
                    keywords: doc.keywords || [],
                    mot1: doc.mot1 || '',
                    mot2: doc.mot2 || '',
                    mot3: doc.mot3 || '',
                    mot4: doc.mot4 || '',
                    mot5: doc.mot5 || ''
                }))
            };

            console.log('👤 Personal account MySQL result:', {
                institutionName: result.institutionName,
                foldersCount: result.folders.length,
                documentsCount: result.documents.length
            });

            return result;

        } catch (mysqlError) {
            await connection.end();
            console.error('MySQL error for personal account:', mysqlError);
            throw mysqlError;
        }

    } catch (error) {
        console.error('Error loading personal folders:', error);
        return {
            institutionName: user.personal_folder_name || 'Personal Account',
            currentPath: currentPath,
            folders: [],
            documents: []
        };
    }
}

// Handle sync-now event
ipcMain.on('sync-now', async (event) => {
    try {
        const user = getUserInfo();
        console.log('User info from store:', user); // Debug log

        if (!user) {
            console.log('No user found in store'); // Debug log
            event.reply('sync-error', 'User not logged in');
            return;
        }

        console.log('Loading folders for institution:', user.institution_id); // Debug log

        // Load institution folders
        const folders = await loadInstitutionFolders(user.institution_id);
        console.log('Loaded folders:', folders); // Debug log

        // Load recent files
        const recentFiles = await loadRecentFiles(user.institution_id);
        console.log('Loaded recent files:', recentFiles); // Debug log

        event.reply('folder-structure', { folders });
        event.reply('recent-files', { files: recentFiles });
        event.reply('sync-status', 'Sync completed successfully');
    } catch (error) {
        console.error('Error during sync:', error);
        event.reply('sync-error', error.message);
    }
});

// Function to load documents from a folder
async function loadFolderDocuments(folderPath, institutionId) {
    const user = store.get('user');
    if (!user) {
        console.error('No user data available');
        return [];
    }

    // Check if user is a personal user (no institution)
    const isPersonalAccount = !user.institution_id;
    
    if (isPersonalAccount) {
        console.log('👤 Personal account detected, loading personal documents for folder:', folderPath);
        return await loadPersonalFolderDocuments(folderPath, user);
    }

    // For institutional users, use the existing logic
    if (!institutionId) {
        console.error('Institution ID is required for loading documents');
        return [];
    }

    try {
        console.log('Loading documents for folder:', folderPath, 'institution:', institutionId);
        
        // First try HTTP API
        console.log('Attempting HTTP folder documents fetch...');
        try {
            const response = await axios.get(`${API_URL}/post_docs/documents/folder/${encodeURIComponent(folderPath)}`, {
                headers: getHttpHeaders()
            });
            
            if (response.data && Array.isArray(response.data)) {
                console.log('HTTP folder documents fetch successful');
                return response.data.map(doc => ({
                    id: doc.id_document,
                    name: doc.nom_document,
                    originalName: doc.nom_document_original,
                    path: doc.path,
                    size: doc.file_size,
                    type: doc.type_name,
                    uploadDate: doc.date_upload,
                    uploader: `${doc.uploader_prenom} ${doc.uploader_name}`,
                    isVerified: doc.isVerfied === 1,
                    comment: doc.comment || '',
                    keywords: doc.keywords || [],
                    mot1: doc.mot1 || '',
                    mot2: doc.mot2 || '',
                    mot3: doc.mot3 || '',
                    mot4: doc.mot4 || '',
                    mot5: doc.mot5 || ''
                }));
            }
        } catch (httpError) {
            console.log('HTTP folder documents fetch failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL connection
        const connection = await mysql.createConnection(dbConfig);
        
        try {
            const sql = `
                SELECT 
                    d.id_document,
                    d.nom_document,
                    d.path,
                    d.nom_document_original,
                    d.file_size,
                    d.date_upload,
                    d.comment,
                    d.isVerfied,
                    dt.type_name,
                    u.nom as uploader_name,
                    u.prenom as uploader_prenom
                FROM table_document d
                LEFT JOIN document_types dt ON d.type_id = dt.id
                LEFT JOIN user u ON d.id_user_source = u.id_user
                WHERE d.path LIKE ? 
                AND d.id_user_source IN (
                    SELECT id_user FROM user WHERE institution_id = ?
                )
                ORDER BY d.date_upload DESC
            `;

            const [rows] = await connection.execute(sql, [`${folderPath}%`, institutionId]);
            console.log('Found documents:', rows.length);

            const documents = rows.map(doc => ({
                id: doc.id_document,
                name: doc.nom_document,
                originalName: doc.nom_document_original || doc.nom_document,
                path: doc.path,
                size: doc.file_size || 0,
                uploadDate: doc.date_upload,
                comment: doc.comment || '',
                isVerified: doc.isVerfied === 1,
                type: doc.type_name || 'Unknown',
                uploader: doc.uploader_name && doc.uploader_prenom 
                    ? `${doc.uploader_prenom} ${doc.uploader_name}`
                    : 'Unknown'
            }));

            return documents;
        } finally {
            await connection.end();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        return [];
    }
}

// Function to load documents from a personal folder
async function loadPersonalFolderDocuments(folderPath, user) {
    try {
        console.log('Loading personal documents for folder:', folderPath);
        
        // First try HTTP API
        console.log('Attempting HTTP personal folder documents fetch...');
        try {
            const response = await axios.get(`${API_URL}/post_docs/documents/folder/${encodeURIComponent(folderPath)}`, {
                headers: getHttpHeaders()
            });
            
            if (response.data && Array.isArray(response.data)) {
                console.log('HTTP personal folder documents fetch successful');
                return response.data.map(doc => ({
                    id: doc.id_document,
                    name: doc.nom_document,
                    originalName: doc.nom_document_original,
                    path: doc.path,
                    size: doc.file_size,
                    type: doc.type_name,
                    uploadDate: doc.date_upload,
                    uploader: `${doc.uploader_prenom} ${doc.uploader_name}`,
                    isVerified: doc.isVerfied === 1,
                    comment: doc.comment || '',
                    keywords: doc.keywords || [],
                    mot1: doc.mot1 || '',
                    mot2: doc.mot2 || '',
                    mot3: doc.mot3 || '',
                    mot4: doc.mot4 || '',
                    mot5: doc.mot5 || ''
                }));
            }
        } catch (httpError) {
            console.log('HTTP personal folder documents fetch failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL connection
        const connection = await mysql.createConnection(dbConfig);
        
        try {
            const sql = `
                SELECT 
                    d.id_document,
                    d.nom_document,
                    d.path,
                    d.nom_document_original,
                    d.file_size,
                    d.date_upload,
                    d.comment,
                    d.isVerfied,
                    dt.type_name,
                    u.nom as uploader_name,
                    u.prenom as uploader_prenom
                FROM table_document d
                LEFT JOIN document_types dt ON d.type_id = dt.id
                LEFT JOIN user u ON d.id_user_source = u.id_user
                WHERE d.path = ? 
                AND d.id_user_source = ?
                ORDER BY d.date_upload DESC
            `;
            
            const [rows] = await connection.execute(sql, [folderPath, user.id]);
            await connection.end();
            
            console.log(`Found ${rows.length} personal documents in folder: ${folderPath}`);
            
            return rows.map(doc => ({
                id: doc.id_document,
                name: doc.nom_document,
                originalName: doc.nom_document_original,
                path: doc.path,
                size: doc.file_size,
                type: doc.type_name,
                uploadDate: doc.date_upload,
                uploader: `${doc.uploader_prenom} ${doc.uploader_name}`,
                isVerified: doc.isVerfied === 1,
                comment: doc.comment || '',
                keywords: [],
                mot1: '',
                mot2: '',
                mot3: '',
                mot4: '',
                mot5: ''
            }));
            
        } catch (mysqlError) {
            await connection.end();
            console.error('MySQL error loading personal documents:', mysqlError);
            return [];
        }
        
    } catch (error) {
        console.error('Error loading personal documents:', error);
        return [];
    }
}

// Modify loadInstitutionFolders to include all document details
async function loadInstitutionFolders(institutionId, currentPath = '') {
    console.log('\n=== START loadInstitutionFolders ===');
    console.log('Parameters:', { institutionId, currentPath });

    const user = store.get('user');
    if (!user) {
        console.error('No user data available');
        return {
            institutionName: 'Unknown',
            currentPath: currentPath,
            folders: [],
            documents: []
        };
    }

    // Check if user is a personal user (no institution)
    const isPersonalAccount = !user.institution_id;
    
    if (isPersonalAccount) {
        console.log('👤 Personal account detected, loading personal folders and documents');
        return await loadPersonalFolders(user, currentPath);
    }

    // For institutional users, use the existing logic
    if (!institutionId) {
        console.error('No institution ID provided for institutional user');
        if (user.institution_id) {
            console.log('Using institution ID from user data:', user.institution_id);
            institutionId = user.institution_id;
        } else {
            console.error('No institution ID available in user data');
            return {
                institutionName: 'Unknown',
                currentPath: currentPath,
                folders: [],
                documents: []
            };
        }
    }

    try {
        // First try HTTP API for folders
        console.log('Attempting HTTP folders fetch...');
        try {
            const foldersResponse = await axios.get(`${API_URL}/post_docs/folders`, {
                headers: getHttpHeaders()
            });
            const documentsResponse = await axios.get(`${API_URL}/post_docs/documents`, {
                headers: getHttpHeaders()
            });
            
            if (foldersResponse.data && documentsResponse.data) {
                console.log('HTTP folders and documents fetch successful');
                console.log('🔍 Folders response structure:', foldersResponse.data);
                console.log('🔍 Documents response structure:', documentsResponse.data);
                
                // Extract folders array from response object
                const foldersArray = foldersResponse.data.folders || foldersResponse.data;
                const documentsArray = documentsResponse.data.documents || documentsResponse.data;
                
                console.log('📁 Extracted folders array:', Array.isArray(foldersArray), foldersArray?.length);
                console.log('📄 Extracted documents array:', Array.isArray(documentsArray), documentsArray?.length);
                
                // DEBUG: Log ALL folders to see what's missing
                console.log('🔍 ALL FOLDERS RECEIVED:');
                foldersArray.slice(0, 20).forEach((folder, i) => {
                    console.log(`  ${i+1}. ${folder.folder_name} -> path: "${folder.folder_path}" (institution: ${folder.institution_id}, private: ${folder.is_private}, created_by: ${folder.created_by})`);
                });
                
                // DEBUG: Look specifically for missing folders
                const missingFolders = ['GERTE', 'AlexFolder', 'FolderDeSters', 'FolderTest33', 'SyncAgent'];
                missingFolders.forEach(folderName => {
                    const found = foldersArray.find(f => f.folder_name === folderName);
                    if (found) {
                        console.log(`✅ FOUND ${folderName}:`, found);
                    } else {
                        console.log(`❌ MISSING ${folderName} - not in API response!`);
                    }
                });
                
                // Filter folders and documents based on current path and user permissions
                const user = store.get('user');
                const filteredFolders = foldersArray.filter(folder => {
                    // Return ALL folders for this institution - same logic as test API
                    return folder.folder_path && 
                           folder.institution_id === user.institution_id;
                });

                // Update protected cache: treat non-private folders as institutional
                try { updateProtectedPathsCache(user, filteredFolders); } catch {}
                
                const filteredDocuments = documentsArray.filter(doc => {
                    return doc.path === currentPath && doc.id_user_source === user.id;
                }).map(doc => ({
                    ...doc,
                    comment: doc.comment || '',
                    keywords: doc.keywords || [],
                    mot1: doc.mot1 || '',
                    mot2: doc.mot2 || '',
                    mot3: doc.mot3 || '',
                    mot4: doc.mot4 || '',
                    mot5: doc.mot5 || ''
                }));
                
                const result = {
                    institutionName: user.institution_name || 'Institution',
                    currentPath: currentPath,
                    folders: filteredFolders,
                    documents: filteredDocuments
                };

                // 🎨 UI UPDATE HANDLED BY WEBSOCKET - NO NEED FOR HTTP CALL
                console.log('📱 UI update will be handled by WebSocket, skipping HTTP displayFolders call');

                return result;
            }
        } catch (httpError) {
            console.log('HTTP folders fetch failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL connection
        const connection = await mysql.createConnection(dbConfig);
        try {
            // Get institution name
            const [institutionRows] = await connection.execute(
                'SELECT name as institution_name FROM institutions WHERE id_institution = ?',
                [institutionId]
            );
            
            if (institutionRows.length === 0) {
                throw new Error(`Institution with ID ${institutionId} not found`);
            }
            
            const institutionName = institutionRows[0].institution_name;
            console.log('\n=== Institution Info ===');
            console.log('Institution name:', institutionName);
            console.log('Current path:', currentPath);

            // Get user info from store
            const user = store.get('user');
            if (!user) {
                throw new Error('User not found in store');
            }
            console.log('\n=== User Info ===');
            console.log('User ID:', user.id);
            console.log('User name:', `${user.firstName} ${user.lastName}`);

            // Get folders at current level
            let folderQuery;
            let folderParams;

            if (!currentPath) {
                folderQuery = `
                    SELECT 
                        f.id as id,
                        f.folder_name as name,
                        f.folder_path as path,
                        f.created_by,
                        f.created_at,
                        f.is_private,
                        COUNT(DISTINCT d.id_document) as document_count,
                        MAX(d.date_upload) as last_modified
                    FROM folders f
                    LEFT JOIN table_document d ON d.path LIKE CONCAT(f.folder_path, '/%')
                    WHERE f.institution_id = ?
                    AND f.folder_name != 'Draft'
                    AND f.folder_path LIKE ?
                    AND f.folder_path NOT LIKE ?
                    AND (f.is_private = 0 OR (f.is_private = 1 AND f.created_by = ?))
                    GROUP BY f.id, f.folder_name, f.folder_path, f.created_by, f.created_at, f.is_private
                    ORDER BY f.folder_path`;
                folderParams = [institutionId, `${institutionName}/%`, `${institutionName}/%/%`, user.id];
            } else {
                folderQuery = `
                    SELECT 
                        f.id as id,
                        f.folder_name as name,
                        f.folder_path as path,
                        f.created_by,
                        f.created_at,
                        f.is_private,
                        COUNT(DISTINCT d.id_document) as document_count,
                        MAX(d.date_upload) as last_modified
                    FROM folders f
                    LEFT JOIN table_document d ON d.path LIKE CONCAT(f.folder_path, '/%')
                    WHERE f.institution_id = ?
                    AND f.folder_name != 'Draft'
                    AND f.folder_path LIKE ?
                    AND f.folder_path NOT LIKE ?
                    AND (f.is_private = 0 OR (f.is_private = 1 AND f.created_by = ?))
                    GROUP BY f.id, f.folder_name, f.folder_path, f.created_by, f.created_at, f.is_private
                    ORDER BY f.folder_path`;
                folderParams = [institutionId, `${currentPath}/%`, `${currentPath}/%/%`, user.id];
            }

            console.log('\n=== Folder Query ===');
            console.log('Query:', folderQuery);
            console.log('Params:', folderParams);

            const [folderRows] = await connection.execute(folderQuery, folderParams);
            console.log('\n=== Folder Results ===');
            console.log(`Found ${folderRows.length} folders`);
            console.log('Folders:', JSON.stringify(folderRows, null, 2));

            // Get documents in current folder
            const documentQuery = `
                SELECT 
                    d.id_document as id,
                    d.nom_document as name,
                    d.nom_document_original as originalName,
                    d.path,
                    d.file_size as size,
                    d.date_upload as uploadDate,
                    d.comment,
                    d.isVerfied as isVerified,
                    dt.type_name as type,
                    CONCAT(u.prenom, ' ', u.nom) as uploader,
                    GROUP_CONCAT(DISTINCT CONCAT(m.mot1, ',', m.mot2, ',', m.mot3, ',', m.mot4, ',', m.mot5)) as keywords
                FROM table_document d
                LEFT JOIN document_types dt ON d.type_id = dt.id
                LEFT JOIN user u ON d.id_user_source = u.id_user
                LEFT JOIN table_mot_cle m ON d.id_document = m.id_document
                WHERE d.path = ?
                AND d.id_user_source = ?
                GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.path, d.file_size, 
                         d.date_upload, d.comment, d.isVerfied, dt.type_name, u.prenom, u.nom
                ORDER BY d.date_upload DESC`;

            console.log('\n=== Document Query ===');
            console.log('Query:', documentQuery);
            console.log('Current path for documents:', currentPath);
            console.log('User ID for documents:', user.id);

            // First debug: check what documents exist for this user
            const [debugRows] = await connection.execute(
                'SELECT id_document, nom_document, path, id_user_source FROM table_document WHERE id_user_source = ? ORDER BY date_upload DESC LIMIT 10',
                [user.id]
            );
            console.log('\n=== DEBUG: Recent documents for user ===');
            console.log('User documents:', JSON.stringify(debugRows, null, 2));

            const [documentRows] = await connection.execute(documentQuery, [currentPath, user.id]);
            
            console.log('\n=== Document Results ===');
            console.log(`Found ${documentRows.length} documents`);
            console.log('Documents:', JSON.stringify(documentRows, null, 2));

            // Process folders
            const folders = folderRows.map(folder => ({
                id: folder.id,
                name: folder.name,
                path: folder.path,
                createdBy: folder.created_by,
                createdAt: folder.created_at,
                documentCount: folder.document_count,
                lastModified: folder.last_modified,
                documents: [] // We'll handle documents separately
            }));

            // Process documents to include all necessary fields
            const documents = documentRows.map(doc => ({
                id: doc.id,
                name: doc.name,
                originalName: doc.originalName,
                path: doc.path,
                size: doc.size,
                uploadDate: doc.uploadDate,
                comment: doc.comment || '',
                isVerified: doc.isVerified,
                type: doc.type || 'Unknown',
                uploader: doc.uploader || 'Unknown',
                // Process keywords from GROUP_CONCAT result
                keywords: doc.keywords ? doc.keywords.split(',').filter(k => k && k.trim() && k.trim() !== 'null') : [],
                // Extract individual mot fields for compatibility
                mot1: doc.keywords ? doc.keywords.split(',')[0] || '' : '',
                mot2: doc.keywords ? doc.keywords.split(',')[1] || '' : '',
                mot3: doc.keywords ? doc.keywords.split(',')[2] || '' : '',
                mot4: doc.keywords ? doc.keywords.split(',')[3] || '' : '',
                mot5: doc.keywords ? doc.keywords.split(',')[4] || '' : ''
            }));

            const result = {
                institutionName,
                currentPath,
                folders,
                documents: documents
            };

            console.log('\n=== Final Result ===');
            console.log('Result:', JSON.stringify(result, null, 2));
            console.log('=== END loadInstitutionFolders ===\n');

            // 🎨 UI UPDATE HANDLED BY WEBSOCKET - NO NEED FOR DIRECT CALL
            console.log('📱 UI update will be handled by WebSocket, skipping direct displayFolders call');

            return result;
        } finally {
            await connection.end();
        }
    } catch (error) {
        console.error('Error loading institution folders:', error);
        return {
            institutionName: 'Error',
            currentPath: currentPath,
            folders: [],
            documents: [],
            error: error.message
        };
    }
}

// Add this function to load recent files
async function loadRecentFiles(institutionId) {
    try {
        console.log('Loading recent files via HTTP API...');
        
        try {
            console.log('DEBUG: Making HTTP request to:', `${API_URL}/post_docs/documents`);
            const headers = getHttpHeaders();
            console.log('DEBUG: Request headers:', headers);
            
            const response = await axios.get(`${API_URL}/post_docs/documents`, {
                headers: headers
            });
            
            console.log('DEBUG: HTTP response status:', response.status);
            console.log('DEBUG: HTTP response data type:', typeof response.data);
            
            if (response.data && Array.isArray(response.data)) {
                console.log(`Found ${response.data.length} recent files via HTTP`);
                
                // Transform the data to match the expected format
                return response.data.slice(0, 10).map(file => ({
                    id: file.id_document,
                    name: file.nom_document,
                    originalName: file.nom_document_original,
                    path: file.path,
                    folderName: file.folder_name || '',
                    folderPath: file.folder_path || '',
                    lastModified: file.date_upload,
                    size: file.file_size,
                    type: file.type_id,
                    isVerified: file.isVerfied === 1
                }));
            }
        } catch (httpError) {
            console.log('HTTP documents fetch failed, falling back to direct MySQL:', httpError.message);
            console.log('DEBUG: HTTP error details:', httpError.response?.status, httpError.response?.data);
        }
        
        // Fallback to direct MySQL connection
        if (!institutionId) {
            console.error('No institution ID provided for loadRecentFiles');
            const user = store.get('user');
            if (user && user.institution_id) {
                console.log('Using institution ID from user data:', user.institution_id);
                institutionId = user.institution_id;
            } else {
                console.error('No institution ID available in user data');
                return [];
            }
        }

        console.log('Loading recent files for institution:', institutionId);
        const connection = await mysql.createConnection(dbConfig);
        
        try {
        // Query to get recent files with folder information
        const [files] = await connection.execute(`
            SELECT d.*, f.folder_name, f.folder_path
            FROM table_document d
            JOIN folders f ON d.path LIKE CONCAT('%', f.folder_path, '%')
            WHERE f.institution_id = ?
            ORDER BY d.date_upload DESC
            LIMIT 10
        `, [institutionId]);

            console.log(`Found ${files.length} recent files`);

        // Transform the data to match the expected format
        return files.map(file => ({
            id: file.id_document,
            name: file.nom_document,
            originalName: file.nom_document_original,
            path: file.path,
            folderName: file.folder_name,
            folderPath: file.folder_path,
            lastModified: file.date_upload,
            size: file.file_size,
            type: file.type_id,
            isVerified: file.isVerfied === 1,
            comment: file.comment || '',
            keywords: file.keywords || [],
            mot1: file.mot1 || '',
            mot2: file.mot2 || '',
            mot3: file.mot3 || '',
            mot4: file.mot4 || '',
            mot5: file.mot5 || ''
        }));
        } finally {
            await connection.end();
        }
    } catch (error) {
        console.error('Error loading recent files:', error);
        return [];
    }
}

// Function to get user info from store
function getUserInfo() {
    try {
        return store.get('user');
    } catch (error) {
        console.error('Error getting user info:', error);
        return null;
    }
}

// Function to get auth token
function getAuthToken() {
    try {
        const user = store.get('user');
        return user ? user.token : null;
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
}

function getSessionCookie() {
    try {
        const sessionCookie = store.get('sessionCookie');
        return sessionCookie || '';
    } catch (error) {
        console.error('Error getting session cookie:', error);
        return '';
    }
}

function getHttpHeaders() {
    const sessionCookie = getSessionCookie();
    console.log('🍪 DEBUG: Session cookie for HTTP request:', sessionCookie ? 'Found' : 'Missing');
    console.log('🍪 DEBUG: Full cookie value:', sessionCookie);
    return {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
        'Origin': 'http://localhost:3001'
    };
}

function getAxiosConfig() {
    return {
        headers: getHttpHeaders(),
        withCredentials: true,
        timeout: 30000
    };
}

// Function to get standard DocDiL path for Windows
function getDocDiLPath() {
    const os = require('os');
    let docDiLPath;
    
    if (process.platform === 'win32') {
        // For Windows, use %USERPROFILE%\Documents\DocDiL
        docDiLPath = path.join(os.homedir(), 'Documents', 'DocDiL');
    } else {
        // For other platforms, use home directory
        docDiLPath = path.join(os.homedir(), 'DocDiL');
    }
    
    try {
        if (!fs.existsSync(docDiLPath)) {
            fs.mkdirSync(docDiLPath, { recursive: true });
            console.log('Created DocDiL folder:', docDiLPath);
        }
        return docDiLPath;
    } catch (error) {
        console.error('Error creating DocDiL folder:', error);
        throw error;
    }
}

// Function to get institution folder path
function getInstitutionPath(institutionName) {
    const docDiLPath = getDocDiLPath();
    return path.join(docDiLPath, institutionName);
}

// Function to get personal folder path for personal users
function getPersonalFolderPath(user) {
    const docDiLPath = getDocDiLPath();
    const folderName = user.personal_folder_name || 'Personal Account';
    return path.join(docDiLPath, folderName);
}

// Function to get EDMS Documents path (kept for backward compatibility)
function getEDMSDocumentsPath() {
    const os = require('os');
    const edmsPath = path.join(os.homedir(), 'EDMS_Documents');
    
    try {
        if (!fs.existsSync(edmsPath)) {
            fs.mkdirSync(edmsPath, { recursive: true });
            console.log('Created EDMS Documents folder:', edmsPath);
        }
        return edmsPath;
    } catch (error) {
        console.error('Error creating EDMS Documents folder:', error);
        throw error;
    }
}

// Function to create institution folder locally
async function createPersonalFolderLocally(user) {
    try {
        // Use personal folder path
        const personalPath = getPersonalFolderPath(user);
        
        if (!fs.existsSync(personalPath)) {
            fs.mkdirSync(personalPath, { recursive: true });
            console.log('Created personal folder in DocDiL:', personalPath);
            
            // Download and create the folder structure from database
            await downloadPersonalStructure(user, personalPath);
            
            return { created: true, path: personalPath };
        }
        
        return { created: false, path: personalPath };
    } catch (error) {
        console.error('Error creating personal folder locally:', error);
        throw error;
    }
}

async function createInstitutionFolderLocally(user) {
    try {
        // Use standard DocDiL path for all platforms
        const institutionPath = getInstitutionPath(user.institution_name);
        
        if (!fs.existsSync(institutionPath)) {
            fs.mkdirSync(institutionPath, { recursive: true });
            console.log('Created institution folder in DocDiL:', institutionPath);
            
            // Download and create the folder structure from database
            await downloadInstitutionStructure(user, institutionPath);
            
            return { created: true, path: institutionPath };
        }
        
        return { created: false, path: institutionPath };
    } catch (error) {
        console.error('Error creating institution folder locally:', error);
        throw error;
    }
}

// Function to download personal structure for personal users
async function downloadPersonalStructure(user, localPersonalPath) {
    try {
        console.log('Downloading personal structure for:', user.personal_folder_name);
        const headers = getHttpHeaders();

        // 1) Folders via HTTP
        const foldersResp = await axios.get(`${API_URL}/post_docs/folders`, { headers });
        const rawFolders = Array.isArray(foldersResp.data)
            ? foldersResp.data
            : (foldersResp.data.folders || []);
        
        // Filter folders for personal user (institution_id = null, created_by = user.id)
        const personalFolders = rawFolders.filter(f => f.institution_id === null && f.created_by === user.id);
        console.log(`Found ${personalFolders.length} personal folders to sync (HTTP)`);
        
        for (const f of personalFolders) {
            let rel = String(f.folder_path || f.path || '');
            
            // Fix: Don't duplicate personal folder name in local path
            if (rel.startsWith(user.personal_folder_name + '/') || rel.startsWith(user.personal_folder_name + '\\')) {
                rel = rel.substring(user.personal_folder_name.length + 1);
            }
            
            // Skip if this is the root personal folder (folder_path equals personal_folder_name)
            if (rel === user.personal_folder_name || rel === '') {
                console.log('Skipping root personal folder:', f.folder_name);
                continue;
            }
            
            if (!rel) continue;
            const local = path.join(localPersonalPath, rel);
            if (!fs.existsSync(local)) {
                fs.mkdirSync(local, { recursive: true });
                console.log('Created local personal folder:', local);
            }
        }

        // 2) Documents via direct file sync for personal user
        console.log('🔄 Using personal sync-files method...');
        const syncResp = await axios.get(`${API_URL}/api/sync-files/${encodeURIComponent(user.personal_folder_name)}`, {
            timeout: 30000,
            ...getAxiosConfig()
        });
        
        if (syncResp.data && syncResp.data.success) {
            const files = syncResp.data.files || [];
            console.log(`✅ Found ${files.length} personal files (backend filtered)`);
            
            for (const file of files) {
                const fileName = file.name || file.filename;
                const filePath = file.path || file.filepath;
                
                if (!fileName || !filePath) continue;
                
                // Remove personal folder name from path if present
                let cleanPath = filePath;
                if (cleanPath.startsWith(user.personal_folder_name + '/')) {
                    cleanPath = cleanPath.substring(user.personal_folder_name.length + 1);
                }
                
                const localFilePath = path.join(localPersonalPath, cleanPath);
                const localFileDir = path.dirname(localFilePath);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(localFileDir)) {
                    fs.mkdirSync(localFileDir, { recursive: true });
                }
                
                // Skip if file already exists
                if (fs.existsSync(localFilePath)) {
                    console.log('Personal file already exists locally:', localFilePath);
                    continue;
                }
                
                try {
                    // Download file from server using the correct endpoint for personal users
                    const downloadUrl = `${API_URL}/uploads/${user.personal_folder_name}/${cleanPath}`;
                    console.log('Downloading personal file from:', downloadUrl);
                    
                    const fileResp = await axios.get(downloadUrl, {
                        responseType: 'stream',
                        ...getAxiosConfig()
                    });
                    
                    const writer = fs.createWriteStream(localFilePath);
                    fileResp.data.pipe(writer);
                    
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    
                    console.log('Downloaded personal file:', localFilePath);
                } catch (downloadError) {
                    console.error('Error downloading personal file:', downloadError.message);
                }
            }
        }
        
        console.log('✅ Personal structure download completed');
        
    } catch (error) {
        console.error('Error downloading personal structure:', error);
        throw error;
    }
}

// Function to download institution structure from database (HTTP-only)
async function downloadInstitutionStructure(user, localInstitutionPath) {
        try {
            console.log('Downloading institution structure for:', user.institution_name);
        const headers = getHttpHeaders();

        // 1) Folders via HTTP
        const foldersResp = await axios.get(`${API_URL}/post_docs/folders`, { headers });
        const rawFolders = Array.isArray(foldersResp.data)
            ? foldersResp.data
            : (foldersResp.data.folders || []);
        const folders = rawFolders.filter(f => f.institution_id === user.institution_id);
        console.log(`Found ${folders.length} folders to sync (HTTP)`);
        for (const f of folders) {
            let rel = String(f.folder_path || f.path || '');
            
            // Fix: Don't duplicate institution name in local path
            if (rel.startsWith(user.institution_name + '/') || rel.startsWith(user.institution_name + '\\')) {
                rel = rel.substring(user.institution_name.length + 1);
            }
            
            if (!rel) continue;
            const local = path.join(localInstitutionPath, rel);
            if (!fs.existsSync(local)) {
                fs.mkdirSync(local, { recursive: true });
                console.log('Created local folder:', local);
            }
        }

        // 2) Documents via direct file sync (NOW FILTERED BY BACKEND!)
        console.log('🔄 Using FILTERED sync-files method...');
        const syncResp = await axios.get(`${API_URL}/api/sync-files/${encodeURIComponent(user.institution_name)}`, {
            timeout: 30000,
            ...getAxiosConfig()
        });
        
        if (syncResp.data && syncResp.data.success) {
            const files = syncResp.data.files || [];
            console.log(`✅ Found ${files.length} FILTERED user files (backend filtered)`);
            
                                // Show progress modal
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.executeJavaScript(
                            `window.showSyncProgress();
                            window.updateSyncProgress({
                                title: 'Pregătire sincronizare...',
                                status: 'Analizare fișiere...',
                                progress: 0,
                                documentsTotal: ` + files.length + `
                            });`
                        );
                    }

                    // Process files in parallel batches for better performance
                    const BATCH_SIZE = 10; // Download 10 files simultaneously (increased from 5)
                    const batches = [];
                    for (let i = 0; i < files.length; i += BATCH_SIZE) {
                        batches.push(files.slice(i, i + BATCH_SIZE));
                    }

                    let documentsDownloaded = 0;
                    let startTime = Date.now();

                    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                        const batch = batches[batchIndex];
                        
                        // Update progress
                        const progress = Math.round((documentsDownloaded / files.length) * 100);
                        const elapsed = (Date.now() - startTime) / 1000;
                        const speed = documentsDownloaded > 0 ? `${(documentsDownloaded / elapsed).toFixed(1)} doc/s` : '';
                        
                        if (mainWindow && mainWindow.webContents) {
                            mainWindow.webContents.executeJavaScript(
                                `window.updateSyncProgress({
                                    status: 'Descărcare batch ` + (batchIndex + 1) + `/` + batches.length + `...',
                                    progress: ` + progress + `,
                                    documentsDownloaded: ` + documentsDownloaded + `,
                                    documentsTotal: ` + files.length + `,
                                    speed: '` + speed + `'
                                });`
                            );
                        }

                        // Process batch in parallel
                        const batchPromises = batch.map(async (file, fileIndex) => {
                            try {
                                const relativePath = file.path.replace(/^[/\\]+/, '');
                                const localFile = path.join(localInstitutionPath, relativePath);
                                const localDir = path.dirname(localFile);
                                
                                // Ensure directory exists
                                if (!fs.existsSync(localDir)) {
                                    fs.mkdirSync(localDir, { recursive: true });
                                }
                                
                                // Download file if not exists or size differs
                                let shouldDownload = !fs.existsSync(localFile);
                                if (!shouldDownload && fs.existsSync(localFile)) {
                                    const localStat = fs.statSync(localFile);
                                    shouldDownload = localStat.size !== file.size;
                                }
                                
                                if (shouldDownload) {
                                    // Update current file being downloaded
                                    if (mainWindow && mainWindow.webContents) {
                                        mainWindow.webContents.executeJavaScript(
                                            `window.updateSyncProgress({
                                                currentFile: 'Descărcare: ` + file.name + ` (` + (file.size / 1024).toFixed(1) + ` KB)'
                                            });`
                                        );
                                    }

                                    console.log(`Downloading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
                                    const fileResp = await axios.get(`${API_URL}${file.downloadUrl}`, {
                                responseType: 'arraybuffer',
                                        timeout: 60000,
                                        ...getAxiosConfig()
                                    });
                                    fs.writeFileSync(localFile, fileResp.data);
                                    console.log(`✅ Downloaded: ${file.name}`);
                                    return { success: true, file: file.name };
                                } else {
                                    console.log(`⏭️  Skipped (exists): ${file.name}`);
                                    return { success: true, file: file.name, skipped: true };
                                }
                            } catch (fileError) {
                                console.error(`❌ Failed to download ${file.name}:`, fileError.message);
                                return { success: false, file: file.name, error: fileError.message };
                            }
                        });

                        // Wait for batch to complete
                        const batchResults = await Promise.allSettled(batchPromises);
                        const successCount = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
                        documentsDownloaded += successCount;

                        // Smaller delay between batches for faster processing
                        if (batchIndex < batches.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
                        }
                    }
                    // Final progress update
                    if (mainWindow && mainWindow.webContents) {
                        mainWindow.webContents.executeJavaScript(
                            `window.updateSyncProgress({
                                title: 'Sincronizare finalizată!',
                                status: 'Toate documentele au fost sincronizate cu succes.',
                                progress: 100,
                                documentsDownloaded: ` + documentsDownloaded + `,
                                documentsTotal: ` + files.length + `,
                                currentFile: 'Finalizat!'
                            });`
                        );
                        
                        // Hide modal after 2 seconds
                        setTimeout(() => {
                            if (mainWindow && mainWindow.webContents) {
                                mainWindow.webContents.executeJavaScript(`window.hideSyncProgress();`);
                            }
                        }, 2000);
                    }
        } else {
            console.log('⚠️  Direct file sync not available, files:', syncResp.data);
            // Hide modal on error
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.executeJavaScript(`window.hideSyncProgress();`);
            }
        }
        console.log('Institution structure download completed (HTTP-only)');
    } catch (error) {
        console.error('Error downloading institution structure:', error);
        throw error;
    }
}

// Function to check and setup personal folder for personal users
async function setupPersonalFolder(user) {
    console.log('🚀 [SETUP] === setupPersonalFolder CALLED ===');
    console.log('🚀 [SETUP] Personal user:', user ? user.personal_folder_name : 'NULL');
    try {
        // Use personal folder path
        const personalPath = getPersonalFolderPath(user);
        console.log('🚀 [SETUP] Personal path:', personalPath);
        
        console.log('Checking personal folder:', personalPath);
        
        // Always show dialog for first-time setup or if folder doesn't exist
        const shouldShowDialog = !fs.existsSync(personalPath);
        
        if (shouldShowDialog) {
            // Show dialog to create personal folder
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['Da, creează folderul', 'Nu acum'],
                defaultId: 0,
                title: 'Folder Personal',
                message: `Folderul personal "${user.personal_folder_name}" nu există local.`,
                detail: `Doriți să creez folderul în Documents\\DocDiL\\${user.personal_folder_name} și să descarc documentele existente?\n\nAcesta va fi folderul principal unde puteți pune documentele pentru sincronizare.`
            });
            
            if (response.response === 0) {
                console.log('User chose to create personal folder');
                
                // Create the personal folder
                const result = await createPersonalFolderLocally(user);
                
                if (result.created) {
                    console.log('✅ Personal folder created successfully');
                    
                    // Show success message with location
                    await dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'Folder Personal Creat',
                        message: 'Folderul personal a fost creat cu succes!',
                        detail: `Locație: ${result.path}\n\nAcum puteți copia documentele dvs. în acest folder.\nFolderele și documentele existente au fost descărcate.`
                    });
                    
                    // Start watching the new folder
                    console.log('✅ Starting folder watch for new personal folder');
                    console.log('🔍 [WATCHER] About to start watching personal path:', personalPath);
                    console.log('🔍 [WATCHER] Folder exists check:', fs.existsSync(personalPath));
                    await watchAndSyncFolder(personalPath);
                    console.log('🔍 [WATCHER] Personal folder watch setup completed for:', personalPath);
                    return personalPath;
                } else {
                    console.log('Personal folder already exists or creation failed');
                    return result.path;
                }
            } else {
                console.log('User chose not to create personal folder');
                return null;
            }
        } else {
            console.log('Personal folder already exists:', personalPath);
            
            // Show info about existing folder
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                buttons: ['Deschide folderul', 'OK'],
                defaultId: 0,
                title: 'Folder Personal',
                message: `Folderul personal "${user.personal_folder_name}" există deja.`,
                detail: `Locație: ${personalPath}\n\nFolderul este monitorizat pentru sincronizare automată.`
            });
            
            if (response.response === 0) {
                await shell.openPath(personalPath);
            }
            
            // Start watching the existing folder normally
            console.log('✅ Starting folder watch normally for existing personal folder');
            console.log('🔍 [WATCHER] About to start watching personal path:', personalPath);
            console.log('🔍 [WATCHER] Folder exists check:', fs.existsSync(personalPath));
            console.log('🔍 [WATCHER] Folder contents:', fs.readdirSync(personalPath));
            await watchAndSyncFolder(personalPath);
            console.log('🔍 [WATCHER] Personal folder watch setup completed for:', personalPath);
            return personalPath;
        }
        
    } catch (error) {
        console.error('Error setting up personal folder:', error);
        throw error;
    }
}

// Function to check and setup institution folder after login
async function setupInstitutionFolder(user) {
    console.log('🚀 [SETUP] === setupInstitutionFolder CALLED ===');
    console.log('🚀 [SETUP] User:', user ? user.institution_name : 'NULL');
    try {
        // Use standard DocDiL path for all platforms
        const institutionPath = getInstitutionPath(user.institution_name);
        console.log('🚀 [SETUP] Institution path:', institutionPath);
        
        console.log('Checking institution folder:', institutionPath);
        
        // Always show dialog for first-time setup or if folder doesn't exist
        const shouldShowDialog = !fs.existsSync(institutionPath);
        
        if (shouldShowDialog) {
            // Show dialog to create institution folder
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['Da, creează folderul', 'Nu acum'],
                defaultId: 0,
                title: 'Folder Instituție',
                message: `Folderul pentru instituția "${user.institution_name}" nu există local.`,
                detail: `Doriți să creez folderul în Documents\\DocDiL\\${user.institution_name} și să descarc documentele publice existente?\n\nAcesta va fi folderul principal unde puteți pune documentele pentru sincronizare.`
            });
            
            if (response.response === 0) {
                const result = await createInstitutionFolderLocally(user);
                
                // Show success message with location
                await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Folder Creat',
                    message: 'Folderul instituției a fost creat cu succes!',
                    detail: `Locație: ${result.path}\n\nAcum puteți copia documentele dvs. în acest folder.\nFolderele și documentele publice existente au fost descărcate.`
                });
                
                // Open the created folder in file explorer
                await shell.openPath(result.path);
                
                // Start watching the folder with initial sync disabled 
                // (to avoid 404 errors from trying to upload files that were just downloaded)
                console.log('⚠️ Starting folder watch with auto-upload disabled after initial setup');
                await watchAndSyncFolder(result.path, { 
                    skipAutoUpload: true,
                    ignoreInitial: true 
                });
                
                return result.path;
            }
        } else {
            console.log('Institution folder already exists:', institutionPath);
            
            // Show info about existing folder
            const response = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                buttons: ['Deschide folderul', 'OK'],
                defaultId: 0,
                title: 'Folder Instituție',
                message: `Folderul pentru instituția "${user.institution_name}" există deja.`,
                detail: `Locație: ${institutionPath}\n\nFolderul este monitorizat pentru sincronizare automată.`
            });
            
            if (response.response === 0) {
                await shell.openPath(institutionPath);
            }
            
            // Start watching the existing folder normally
            console.log('✅ Starting folder watch normally for existing folder');
            console.log('🔍 [WATCHER] About to start watching institution path:', institutionPath);
            console.log('🔍 [WATCHER] Folder exists check:', fs.existsSync(institutionPath));
            console.log('🔍 [WATCHER] Folder contents:', fs.readdirSync(institutionPath));
            await watchAndSyncFolder(institutionPath);
            console.log('🔍 [WATCHER] Folder watch setup completed for:', institutionPath);
            return institutionPath;
        }
        
        return null;
    } catch (error) {
        console.error('Error setting up institution folder:', error);
        
        await dialog.showErrorBox(
            'Eroare Folder Instituție',
            `Nu am putut crea folderul instituției: ${error.message}`
        );
        
        throw error;
    }
}

// Function to ensure institution folder exists in database
async function ensureInstitutionFolderExists(user, folderPath) {
    // Pure HTTP implementation to avoid MySQL timeouts
    const headers = getHttpHeaders();
    const createViaHttp = async (folderName, parentOrFullPath) => {
        // Backend expects folderName/parentFolder/folderPath/isPrivate (camelCase)
        const body = {
            folderName,
            // If a full path is provided, pass it as folderPath; otherwise use parentFolder
            folderPath: parentOrFullPath,
            isPrivate: true
        };
        try {
            const resp = await axios.post(`${API_URL}/post_docs/folders`, body, { headers });
            return !!(resp.data && (resp.data.success || resp.status === 200));
        } catch (e) {
            console.log('HTTP create folder failed:', e.message);
            return false;
        }
    };

    // Ensure root folder exists (HTTP) - support both institutional and personal users
    const rootFolderName = user.institution_name || user.personal_folder_name;
    await createViaHttp(rootFolderName, rootFolderName);

    // Ensure subpath chain exists (HTTP)
    if (folderPath && folderPath !== rootFolderName) {
        const parts = folderPath.split(path.sep);
        let current = '';
        for (const part of parts) {
            current = current ? path.join(current, part) : part;
            await createViaHttp(part, current);
        }
    }
}

// Handle document viewing
ipcMain.on('view-document', async (event, docId) => {
    try {
        // First try HTTP API
        console.log('Attempting HTTP document view...');
        try {
            const response = await axios.get(`${API_URL}/post_docs/documents/${docId}`);
            
            if (response.data) {
                console.log('HTTP document view successful');
                event.reply('document-data', response.data);
                return;
            }
        } catch (httpError) {
            console.log('HTTP document view failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL
        const connection = await mysql.createConnection(dbConfig);
        const [documents] = await connection.query(`
            SELECT d.*, dt.type_name, CONCAT(u.prenom, ' ', u.nom) as uploader,
                   GROUP_CONCAT(DISTINCT CONCAT(m.mot1, ',', m.mot2, ',', m.mot3, ',', m.mot4, ',', m.mot5)) as keywords
            FROM table_document d
            LEFT JOIN document_types dt ON d.type_id = dt.id
            LEFT JOIN user u ON d.id_user_source = u.id_user
            LEFT JOIN table_mot_cle m ON d.id_document = m.id_document
            WHERE d.id_document = ?
            GROUP BY d.id_document
        `, [docId]);
        await connection.end();

        if (documents.length === 0) {
            throw new Error('Document not found');
        }

        const document = documents[0];
        const filePath = document.path;

        // Open the PDF file with the default system viewer
        const success = await shell.openPath(filePath);
        event.reply('document-viewed', success === '');
    } catch (error) {
        console.error('Error viewing document:', error);
        event.reply('document-viewed', false);
    }
});

// Handle document download
ipcMain.on('download-document', async (event, docId) => {
    try {
        // First try HTTP API
        console.log('Attempting HTTP document download...');
        try {
            const response = await axios.get(`${API_URL}/post_docs/documents/${docId}/download`);
            
            if (response.data) {
                console.log('HTTP document download successful');
                event.reply('download-data', response.data);
                return;
            }
        } catch (httpError) {
            console.log('HTTP document download failed, falling back to direct MySQL:', httpError.message);
        }
        
        // Fallback to direct MySQL
        const connection = await mysql.createConnection(dbConfig);
        const [documents] = await connection.query(`
            SELECT d.*, dt.type_name, CONCAT(u.prenom, ' ', u.nom) as uploader,
                   GROUP_CONCAT(DISTINCT CONCAT(m.mot1, ',', m.mot2, ',', m.mot3, ',', m.mot4, ',', m.mot5)) as keywords
            FROM table_document d
            LEFT JOIN document_types dt ON d.type_id = dt.id
            LEFT JOIN user u ON d.id_user_source = u.id_user
            LEFT JOIN table_mot_cle m ON d.id_document = m.id_document
            WHERE d.id_document = ?
            GROUP BY d.id_document
        `, [docId]);
        await connection.end();

        if (documents.length === 0) {
            throw new Error('Document not found');
        }

        const document = documents[0];
        const sourcePath = document.path;
        const fileName = document.nom_document_original || document.nom_document;

        // Open save dialog
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: fileName,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] }
            ]
        });

        if (filePath) {
            // Copy the file to the selected location
            fs.copyFileSync(sourcePath, filePath);
            event.reply('document-downloaded', true);
        } else {
            event.reply('document-downloaded', false);
        }
    } catch (error) {
        console.error('Error downloading document:', error);
        event.reply('document-downloaded', false);
    }
});

ipcMain.on('get-folder-structure', async (event, params) => {
    console.log('\n=== DEBUG: Received get-folder-structure request ===');
    console.log('DEBUG: Params:', JSON.stringify(params, null, 2));
    
    try {
        const result = await loadInstitutionFolders(params.institutionId, params.currentPath);
        console.log('DEBUG: Folder structure result:', JSON.stringify(result, null, 2));
        event.reply('folder-structure', result);
    } catch (error) {
        console.error('DEBUG: Error loading folder structure:', error);
        event.reply('folder-structure-error', { error: error.message });
    }
});

// Add handle version for move dialog
ipcMain.handle('get-folder-structure', async (event, params) => {
    console.log('\n=== DEBUG: Received get-folder-structure handle request ===');
    console.log('DEBUG: Params:', JSON.stringify(params, null, 2));
    
    try {
        const result = await loadInstitutionFolders(params.institutionId, params.currentPath);
        console.log('DEBUG: Folder structure handle result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('DEBUG: Error loading folder structure in handle:', error);
        throw error;
    }
});

// Add handler for performing local file moves from React events
ipcMain.handle('perform-local-move', async (event, { documentName, sourcePath, destinationPath, institutionName }) => {
    try {
        console.log('\n=== DEBUG: Performing local file move from React event ===');
        console.log('DEBUG: Document name:', documentName);
        console.log('DEBUG: Source path:', sourcePath);
        console.log('DEBUG: Destination path:', destinationPath);
        console.log('DEBUG: Institution name:', institutionName);

        // Get institution path
        const institutionPath = getInstitutionPath(institutionName);
        
        // Clean paths by removing institution name if present
        let cleanSourcePath = sourcePath;
        let cleanDestPath = destinationPath;
        
        if (cleanSourcePath.startsWith(institutionName + '/')) {
            cleanSourcePath = cleanSourcePath.substring(institutionName.length + 1);
        } else if (cleanSourcePath === institutionName) {
            cleanSourcePath = '';
        }
        
        if (cleanDestPath.startsWith(institutionName + '/')) {
            cleanDestPath = cleanDestPath.substring(institutionName.length + 1);
        } else if (cleanDestPath === institutionName) {
            cleanDestPath = '';
        }
        
        // Construct local paths
        const localSourceFolderPath = cleanSourcePath ? 
            path.join(institutionPath, cleanSourcePath) : 
            institutionPath;
        const localDestFolderPath = cleanDestPath ? 
            path.join(institutionPath, cleanDestPath) : 
            institutionPath;
        
        // Add .pdf extension if not present
        let fileName = documentName;
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        
        const localSourceFilePath = path.join(localSourceFolderPath, fileName);
        const localDestFilePath = path.join(localDestFolderPath, fileName);
        
        console.log('DEBUG: Local source file path:', localSourceFilePath);
        console.log('DEBUG: Local destination file path:', localDestFilePath);
        
        // Check if source file exists locally
        if (!fs.existsSync(localSourceFilePath)) {
            console.log('DEBUG: Source file not found locally, will try to download to destination');
            
            // Try to download from server to destination
            try {
                // Ensure destination folder exists
                if (!fs.existsSync(localDestFolderPath)) {
                    fs.mkdirSync(localDestFolderPath, { recursive: true });
                    console.log('DEBUG: Created local destination folder:', localDestFolderPath);
                }
                
                // Try multiple download URLs
                const possibleUrls = [
                    `${API_URL}/uploads/${destinationPath}/${documentName}`,
                    `${API_URL}/uploads/${destinationPath}/${fileName}`,
                    `${API_URL}/uploads/${institutionName}/${destinationPath}/${documentName}`,
                    `${API_URL}/uploads/${institutionName}/${destinationPath}/${fileName}`
                ];
                
                let downloadSuccess = false;
                for (const downloadUrl of possibleUrls) {
                    try {
                        console.log('DEBUG: Trying download URL:', downloadUrl);
                        
                        const response = await axios({
                            method: 'GET',
                            url: downloadUrl,
                            responseType: 'arraybuffer',
                            withCredentials: true,
                            headers: {
                                'Origin': 'http://localhost:3001'
                            }
                        });
                        
                        if (response.status === 200) {
                            await fs.promises.writeFile(localDestFilePath, Buffer.from(response.data));
                            console.log('DEBUG: Document downloaded to new local location:', localDestFilePath);
                            downloadSuccess = true;
                            break;
                        }
                    } catch (urlError) {
                        console.log('DEBUG: Download failed for URL:', downloadUrl, urlError.message);
                        continue;
                    }
                }
                
                if (downloadSuccess) {
                    return { success: true, message: 'Document downloaded to new location' };
                } else {
                    console.log('DEBUG: All download URLs failed');
                }
            } catch (downloadError) {
                console.error('DEBUG: Error downloading to new location:', downloadError.message);
            }
        }
        
        // Move file locally if it exists
        if (fs.existsSync(localSourceFilePath)) {
            // Ensure destination folder exists
            if (!fs.existsSync(localDestFolderPath)) {
                fs.mkdirSync(localDestFolderPath, { recursive: true });
                console.log('DEBUG: Created local destination folder:', localDestFolderPath);
            }
            
            // Move the file locally
            await fs.promises.rename(localSourceFilePath, localDestFilePath);
            console.log('DEBUG: File moved successfully in local DocDiL folder');
            return { success: true, message: 'File moved locally' };
        }
        
        return { success: false, message: 'Source file not found' };
        
    } catch (error) {
        console.error('DEBUG: Error performing local move:', error);
        return { success: false, message: error.message };
    }
});

// Add handler for getting document path
ipcMain.handle('get-document-path', async (event, relativePath, documentName) => {
    try {
        if (!relativePath) {
            console.log('No relative path provided');
            return null;
        }

        // Prefer local DocDiL institution folder for viewing
        const user = store.get('user');
        if (!user) {
            console.log('No user found in store for get-document-path');
            return null;
        }

        // Check if user is personal or institutional
        let institutionPath;
        let cleanRelativePath = relativePath;
        
        if (!user.institution_id) {
            // Personal user - use personal folder path
            institutionPath = getPersonalFolderPath(user);
            
            // Clean path by removing personal folder prefix if present
            if (cleanRelativePath.startsWith(user.personal_folder_name + '/')) {
                cleanRelativePath = cleanRelativePath.substring(user.personal_folder_name.length + 1);
            } else if (cleanRelativePath === user.personal_folder_name) {
                cleanRelativePath = '';
            }
        } else {
            // Institutional user - use institution path
            institutionPath = getInstitutionPath(user.institution_name);
            
            // Clean path by removing institution prefix if present
            if (cleanRelativePath.startsWith(user.institution_name + '/')) {
                cleanRelativePath = cleanRelativePath.substring(user.institution_name.length + 1);
            } else if (cleanRelativePath === user.institution_name) {
                cleanRelativePath = '';
            }
        }

        // Ensure .pdf extension for the requested name
        let fileName = documentName || '';
        if (fileName && !fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }

        const localFolderPath = cleanRelativePath ? 
            path.join(institutionPath, cleanRelativePath) : 
            institutionPath;
        const localFilePath = fileName ? path.join(localFolderPath, fileName) : null;

        console.log('get-document-path local try:', { localFolderPath, localFilePath });
        if (localFilePath && fs.existsSync(localFilePath)) {
            return `file://${localFilePath}`;
        }

        // If not found locally, try to download into DocDiL then return local file URL
        try {
            if (fileName) {
                if (!fs.existsSync(localFolderPath)) {
                    fs.mkdirSync(localFolderPath, { recursive: true });
                }
                const serverFilePath = path.join(relativePath, fileName).replace(/\\/g, '/');
                const downloadUrl = `${API_URL}/uploads/${serverFilePath}`;
                console.log('Attempting viewer download:', downloadUrl);
                const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'arraybuffer', withCredentials: true, headers: { 'Origin': 'http://localhost:3001' }, timeout: 20000 });
                if (response.status === 200) {
                    await fs.promises.writeFile(localFilePath, Buffer.from(response.data));
                    return `file://${localFilePath}`;
                }
            }
        } catch (e) {
            console.log('Viewer download fallback failed:', e.message);
        }

        // Development fallback: check project uploads folder
        const baseUploadsDir = path.resolve(__dirname, '..', 'back-end', 'uploads');
        const fullPath = relativePath;
        const possiblePaths = [
            path.join(baseUploadsDir, fullPath, documentName || ''),
            path.join(baseUploadsDir, fullPath, (documentName || '') + '.pdf'),
            path.join(baseUploadsDir, fullPath, (documentName || '').replace('.pdf', '')),
            path.join(baseUploadsDir, fullPath, (documentName || '').replace('.pdf', '') + '.pdf')
        ];

        for (const filePath of possiblePaths) {
            if (filePath && fs.existsSync(filePath)) {
                return `file://${filePath}`;
            }
        }

        console.log('Document not found in any location');
        return null;
    } catch (error) {
        console.error('Error in get-document-path:', error);
        return null;
    }
});

// Add handler for downloading document
ipcMain.handle('download-document', async (event, { path: relativePath, name: documentName }) => {
    try {
        console.log('Downloading document:', { relativePath, documentName });
        
        // Get user info to construct local path
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }
        
        // Construct path to local DocDiL folder
        let institutionPath;
        if (!user.institution_id) {
            // Personal user - use personal folder path
            institutionPath = getPersonalFolderPath(user);
        } else {
            // Institutional user - use institution path
            institutionPath = getInstitutionPath(user.institution_name);
        }
        
        // Remove institution/personal folder name from relative path if present
        let cleanRelativePath = relativePath;
        if (!user.institution_id) {
            // Personal user - remove personal folder name
            if (cleanRelativePath.startsWith(user.personal_folder_name + '/')) {
                cleanRelativePath = cleanRelativePath.substring(user.personal_folder_name.length + 1);
            } else if (cleanRelativePath === user.personal_folder_name) {
                cleanRelativePath = '';
            }
        } else {
            // Institutional user - remove institution name
            if (cleanRelativePath.startsWith(user.institution_name + '/')) {
                cleanRelativePath = cleanRelativePath.substring(user.institution_name.length + 1);
            } else if (cleanRelativePath === user.institution_name) {
                cleanRelativePath = '';
            }
        }
        
        // Construct the full local path
        const localFolderPath = cleanRelativePath ? 
            path.join(institutionPath, cleanRelativePath) : 
            institutionPath;
        
        // Add .pdf extension if not present
        let fileName = documentName;
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        
        const localFilePath = path.join(localFolderPath, fileName);
        
        console.log('Looking for document in local path:', localFilePath);
        
        // Check if file exists locally
        if (fs.existsSync(localFilePath)) {
            console.log('Document found locally, opening:', localFilePath);
            // Open the local file directly
            shell.openPath(localFilePath);
            return `file://${localFilePath}`;
        }
        
        // If not found locally, try to download from server first
        console.log('Document not found locally, attempting to download from server...');
        
        try {
            // Ensure local folder exists
            if (!fs.existsSync(localFolderPath)) {
                fs.mkdirSync(localFolderPath, { recursive: true });
                console.log('Created local folder:', localFolderPath);
            }
            
            // Try to download from server
            const serverFilePath = path.join(relativePath, documentName).replace(/\\/g, '/');
            const downloadUrl = `${API_URL}/uploads/${serverFilePath}`;
            
            console.log('Downloading from server URL:', downloadUrl);
            
            const response = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'arraybuffer',
                withCredentials: true,
                headers: {
                    'Origin': 'http://localhost:3001'
                }
            });
            
            if (response.status === 200) {
                // Save to local path
                await fs.promises.writeFile(localFilePath, Buffer.from(response.data));
                console.log('Document downloaded and saved locally:', localFilePath);
                
                // Open the local file
                shell.openPath(localFilePath);
                return `file://${localFilePath}`;
            }
        } catch (downloadError) {
            console.error('Error downloading from server:', downloadError.message);
        }
        
        // If all else fails, try the API endpoint
        try {
            console.log('Trying API endpoint download...');
            const apiDownloadUrl = `${API_URL}/post_docs/documents/${documentName}/download`;
            
            const apiResponse = await axios({
                method: 'GET',
                url: apiDownloadUrl,
                responseType: 'arraybuffer',
                withCredentials: true,
                headers: {
                    'Origin': 'http://localhost:3001'
                }
            });
            
            if (apiResponse.status === 200) {
                await fs.promises.writeFile(localFilePath, Buffer.from(apiResponse.data));
                console.log('Document downloaded via API and saved locally:', localFilePath);
                
                shell.openPath(localFilePath);
                return `file://${localFilePath}`;
            }
        } catch (apiError) {
            console.error('Error downloading via API:', apiError.message);
        }
        
        throw new Error('Document not found locally or on server');
        
    } catch (error) {
        console.error('Error downloading document:', error);
        throw error;
    }
});

// Add handler for viewing document
ipcMain.handle('view-document', async (event, documentName) => {
    try {
        console.log('Viewing document:', documentName);
        
        // First try to get the document path
        const response = await fetch(`${API_URL}/download/${documentName}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/pdf',
                'Origin': 'http://localhost:3001'
            }
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        // Get the blob from the response
        const blob = await response.blob();
        
        // Create a temporary file
        const tempDir = app.getPath('temp');
        const tempPath = path.join(tempDir, documentName);
        
        // Write the file
        await fs.promises.writeFile(tempPath, Buffer.from(await blob.arrayBuffer()));
        
        // Open the file
        shell.openPath(tempPath);
        
        return tempPath;
    } catch (error) {
        console.error('Error viewing document:', error);
        throw error;
    }
});

// Add handler for getting document details from database
ipcMain.handle('get-document-details', async (event, documentId) => {
    try {
        console.log('Getting document details for document ID:', documentId);
        
        const connection = await mysql.createConnection(dbConfig);
        
        // Query to get document details with keywords and tags
        const [documents] = await connection.query(`
            SELECT 
                d.id_document,
                d.nom_document,
                d.nom_document_original,
                d.path,
                d.file_size as size,
                d.comment,
                d.date_upload as date_document,
                d.id_user_source as uploadedBy,
                dt.type_name,
                GROUP_CONCAT(DISTINCT CONCAT_WS(',', m.mot1, m.mot2, m.mot3, m.mot4, m.mot5)) as keywords,
                GROUP_CONCAT(DISTINCT t.tag_name) as tags
            FROM table_document d
            LEFT JOIN document_types dt ON d.type_id = dt.id
            LEFT JOIN table_mot_cle m ON d.id_document = m.id_document
            LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
            LEFT JOIN document_tags t ON dtr.id_tag = t.id_tag
            WHERE d.id_document = ?
            GROUP BY d.id_document
        `, [documentId]);
        
        await connection.end();
        
        if (documents.length === 0) {
            console.log('Document not found in database');
            return null;
        }
        
        const doc = documents[0];
        
        // Process keywords from concatenated field
        const keywords = doc.keywords ? 
            doc.keywords.split(',').filter(k => k && k.trim() && k.trim() !== 'null') : [];
        
        // Process tags
        const tags = doc.tags ? 
            doc.tags.split(',').filter(t => t && t.trim() && t.trim() !== 'null') : [];
        
        return {
            success: true,
            data: {
                id: doc.id_document,
                name: doc.nom_document_original || doc.nom_document,
                path: doc.path,
                size: doc.size,
                comment: doc.comment,
                uploadDate: doc.date_document,
                uploader: doc.uploadedBy,
                type: doc.type_name || 'PDF',
                keywords: [...new Set(keywords)], // Remove duplicates
                tags: [...new Set(tags)].map(tag => ({ tag_name: tag })) // Convert to expected format
            }
        };
        
    } catch (error) {
        console.error('Error getting document details:', error);
        return { success: false, error: error.message };
    }
});

// Handle document move
ipcMain.on('move-document', async (event, { documentId, sourcePath, destinationPath, documentName }) => {
    try {
        console.log('\n=== DEBUG: Moving document ===');
        console.log('DEBUG: Document ID:', documentId);
        console.log('DEBUG: Source path:', sourcePath);
        console.log('DEBUG: Destination path:', destinationPath);
        console.log('DEBUG: Document name:', documentName);

        // Get user info
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }

        // === 1. MOVE IN LOCAL DocDiL FOLDER ===
        console.log('DEBUG: Moving document in local DocDiL folder...');
        
        // Determine root folder name for this account (institutional vs personal)
        const isPersonalMove = !user.institution_id || user.institution_name == null;
        const rootFolderNameForMove = isPersonalMove ? (user.personal_folder_name || '') : (user.institution_name || '');
        const institutionPath = getInstitutionPath(rootFolderNameForMove);
        
        // Clean paths by removing root folder name if present
        let cleanSourcePath = sourcePath;
        let cleanDestPath = destinationPath;
        
        if (rootFolderNameForMove && cleanSourcePath && cleanSourcePath.startsWith(rootFolderNameForMove + '/')) {
            cleanSourcePath = cleanSourcePath.substring(rootFolderNameForMove.length + 1);
        } else if (cleanSourcePath === user.institution_name) {
            cleanSourcePath = '';
        }
        
        if (rootFolderNameForMove && cleanDestPath && cleanDestPath.startsWith(rootFolderNameForMove + '/')) {
            cleanDestPath = cleanDestPath.substring(rootFolderNameForMove.length + 1);
        } else if (cleanDestPath === user.institution_name) {
            cleanDestPath = '';
        }
        
        // Construct local paths
        const localSourceFolderPath = cleanSourcePath ? 
            path.join(institutionPath, cleanSourcePath) : 
            institutionPath;
        const localDestFolderPath = cleanDestPath ? 
            path.join(institutionPath, cleanDestPath) : 
            institutionPath;
        
        // Add .pdf extension if not present
        let fileName = documentName;
        if (!fileName.toLowerCase().endsWith('.pdf')) {
            fileName += '.pdf';
        }
        
        const localSourceFilePath = path.join(localSourceFolderPath, fileName);
        const localDestFilePath = path.join(localDestFolderPath, fileName);
        
        console.log('DEBUG: Local source file path:', localSourceFilePath);
        console.log('DEBUG: Local destination file path:', localDestFilePath);
        
        // Move file locally if it exists
        let fileBuffer = null;
        if (fs.existsSync(localSourceFilePath)) {
            // Read file content before moving
            fileBuffer = fs.readFileSync(localSourceFilePath);
            
            // Ensure destination folder exists
            if (!fs.existsSync(localDestFolderPath)) {
                fs.mkdirSync(localDestFolderPath, { recursive: true });
                console.log('DEBUG: Created local destination folder:', localDestFolderPath);
            }
            
            // Move the file locally
            await fs.promises.rename(localSourceFilePath, localDestFilePath);
            console.log('DEBUG: File moved successfully in local DocDiL folder');
        } else {
            console.log('DEBUG: File not found in local DocDiL folder');
        }

        // === 2. SYNC FILE TO SERVER ===
        console.log('DEBUG: Syncing file to server...');
        
        try {
            // Normalize server-relative folder paths to include correct root (institution or personal)
            const instName = rootFolderNameForMove;
            const ensureRoot = (p) => {
                if (!p) return instName; 
                let out = p;
                if (out.includes('/uploads/')) {
                    out = out.substring(out.indexOf('/uploads/') + '/uploads/'.length);
                }
                if (out.startsWith('null/')) out = out.substring(5);
                return out.startsWith(instName + '/') ? out : `${instName}/${out}`;
            };
            const serverSourceFolder = ensureRoot(sourcePath);
            const serverDestFolder = ensureRoot(destinationPath);
            const serverSourceFile = `${serverSourceFolder}/${fileName}`;

            // Strategy 1: Try the React-compatible file move endpoint first (moves versions + updates DB)
            let syncSuccess = false;
                try {
                    console.log('DEBUG: Trying React-compatible file move endpoint...');
                console.log('DEBUG: Full source path for move:', serverSourceFile);
                console.log('DEBUG: Destination path for move:', serverDestFolder);
                    const moveApiResponse = await axios.post(`${API_URL}/post_docs/files/move`, {
                    sourcePath: serverSourceFile,
                    destinationPath: serverDestFolder
                    }, {
                        headers: {
                        ...getHttpHeaders(),
                        'Content-Type': 'application/json'
                        },
                        withCredentials: true,
                        timeout: 30000
                    });
                    if (moveApiResponse.status === 200 && moveApiResponse.data.success) {
                        console.log('DEBUG: Document moved successfully via React-compatible endpoint');
                        syncSuccess = true;
                    }
                } catch (moveError) {
                    console.log('DEBUG: React move endpoint failed:', moveError.message);
                }
                
            // Strategy 2: Upload file using move-upload endpoint IF move failed and we have the buffer
            if (!syncSuccess && fileBuffer) {
                    console.log('DEBUG: Trying file upload strategy...');
                    const FormData = require('form-data');
                    const formData = new FormData();
                formData.append('file', fileBuffer, { filename: fileName, contentType: 'application/pdf' });
                formData.append('targetPath', serverDestFolder);
                    formData.append('documentId', documentId);
                    formData.append('userId', user.id);
                    formData.append('institutionId', user.institution_id);
                    formData.append('moveOperation', 'true');
                    console.log('DEBUG: Uploading to server:', `${API_URL}/post_docs/move-upload`);
                    const uploadResponse = await axios.post(`${API_URL}/post_docs/move-upload`, formData, {
                    headers: { ...formData.getHeaders(), 'Cookie': `connect.sid=${user.sessionId || ''}` },
                        withCredentials: true,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        timeout: 30000
                    });
                    if (uploadResponse.status === 200 && uploadResponse.data.success) {
                        console.log('DEBUG: File uploaded successfully to server');
                        syncSuccess = true;
                    } else {
                        console.log('DEBUG: File upload failed:', uploadResponse.status, uploadResponse.data);
                    }
                }
                
                if (!syncSuccess) {
                console.warn('DEBUG: No server-side move confirmed. Proceeding with DB path update as fallback.');
                }
                
            // Update variables to use normalized server paths downstream
            sourcePath = serverSourceFolder;
            destinationPath = serverDestFolder;
                
            } catch (syncError) {
                console.error('DEBUG: Error syncing file to server:', syncError.message);
                // Continue with database update even if sync fails
        }

        // === 3. RESOLVE DOCUMENT ID AND UPDATE DATABASE (HTTP) ===
        let resolvedDocumentId = documentId;
        if (!resolvedDocumentId) {
            try {
                console.log('DEBUG: Resolving documentId via HTTP lookup...');
                const headers = getHttpHeaders();
                const docsResp = await axios.get(`${API_URL}/post_docs/documents`, { headers });
                const allDocs = Array.isArray(docsResp.data) ? docsResp.data : (docsResp.data.documents || []);

                // Normalize search keys
                const baseName = (documentName || '').replace(/\.pdf$/i, '') || (fileName || '').replace(/\.pdf$/i, '');
                const srcFolder = cleanSourcePath || '';

                const candidates = allDocs.filter(d => {
                    const nameVal = (d.nom_document || d.name || '').replace(/\.pdf$/i, '');
                    const pathVal = (d.path || d.folder_path || '');
                    const instMatch = (d.institution_id || user.institution_id) === user.institution_id;
                    const nameMatch = nameVal === baseName;
                    const pathMatch = srcFolder ? pathVal.includes(srcFolder) : true;
                    return instMatch && nameMatch && pathMatch;
                });
                if (candidates.length > 0) {
                    resolvedDocumentId = candidates[0].id_document || candidates[0].id || candidates[0].id_doc;
                    console.log('DEBUG: Resolved documentId:', resolvedDocumentId);
                } else {
                    console.warn('DEBUG: No matching document found for DB update');
                }
            } catch (lookupErr) {
                console.error('DEBUG: Error resolving documentId:', lookupErr.message);
            }
        }

        if (resolvedDocumentId) {
            // Strong guarantee: update DB directly by ID (fără ambiguități)
            try {
                const conn = await pool.getConnection();
                try {
                    const [res] = await conn.execute(
                        `UPDATE table_document SET path=? WHERE id_document=?`,
                        [destinationPath, resolvedDocumentId]
                    );
                    console.log('DEBUG: SQL by-id rows affected:', res.affectedRows);
                } finally {
                    conn.release();
                }
            } catch (sqlErr) {
                console.error('DEBUG: SQL by-id update failed, falling back to API:', sqlErr.message);
                // Fallback to HTTP update if SQL fails (rare)
                await axios.put(`${API_URL}/post_docs/documents/${resolvedDocumentId}/update-path`, {
                    path: destinationPath
                }, {
                    headers: getHttpHeaders(),
                    withCredentials: true
                });
            }
        console.log('DEBUG: Database update successful');
        } else {
            console.warn('DEBUG: Skipping DB update – documentId not resolved');
        }

        // === 4. EMIT SOCKET EVENTS ===
        console.log('DEBUG: Emitting socket events...');

        // Get socket instance
        const socket = global.socket;
        if (!socket) {
            console.error('DEBUG: No socket instance found');
            return;
        }

        // Emit move event to server - ENHANCED FOR BIDIRECTIONAL SYNC
        console.log('DEBUG: Emitting move event to server for bidirectional sync');
        socket.emit('fileSystemUpdate', {
            type: 'move',
            eventType: 'electron_move', // Mark as Electron-initiated move
            sourcePath: sourcePath,
            targetFolder: destinationPath,
            documentId: documentId,
            documentName: documentName,
            userId: user.id,
            institutionId: user.institution_id,
            timestamp: new Date().toISOString(),
            // Add flag to indicate this is from Electron
            fromElectron: true,
            // Add flag to indicate file was uploaded
            fileUploaded: !!fileBuffer
        });

        // === 5. UI REFRESH HANDLED BY REAL-TIME EVENTS ===
        console.log('DEBUG: UI refresh will be handled by fileSystemUpdate real-time events');
        console.log('DEBUG: This prevents navigation issues and duplicate refreshes');

        console.log('DEBUG: Document move completed successfully');

    } catch (error) {
        console.error('DEBUG: Error moving document:', error);
        throw error;
    }
});

// Handle document delete
ipcMain.on('delete-document', async (event, data) => {
    try {
        // Try HTTP delete (no direct MySQL fallback)
        console.log('Attempting HTTP document delete...');
        const response = await axios.delete(`${API_URL}/post_docs/documents/${data.documentId}`, {
            headers: getHttpHeaders(),
            withCredentials: true
        });
        if (!(response.data && response.data.success)) {
            throw new Error('HTTP delete failed');
        }

        // Send delete notification through Socket.IO
        // Notify via socket if available
        const socket = global.socket;
        if (socket && socket.connected) {
            socket.emit('documentDeleted', {
                documentId: data.documentId,
                userId: data.userId
            });
        }

        event.reply('document-deleted', { success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        event.reply('document-deleted', { success: false, error: error.message });
    }
});

// Handle document add
ipcMain.on('add-document', async (event, data) => {
    try {
        // HTTP upload only (no MySQL fallback)
        console.log('Attempting HTTP document upload...');
        const formData = new FormData();
        if (data.fileBuffer) {
            formData.append('file', data.fileBuffer, data.originalName);
        }
        formData.append('path', data.path);
        formData.append('comment', data.comment || '');
        formData.append('type_id', data.typeId || '');
        const response = await axios.post(`${API_URL}/post_docs/upload`, formData, {
            headers: {
                ...formData.getHeaders ? formData.getHeaders() : { 'Content-Type': 'multipart/form-data' },
                'Cookie': getSessionCookie(),
                'Origin': 'http://localhost:3001'
            },
            withCredentials: true,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        if (!(response.data && response.data.success)) {
            throw new Error('HTTP upload failed');
        }

        // Send add notification through Socket.IO
        const socket = global.socket;
        if (socket && socket.connected) {
            socket.emit('fileSystemUpdate', {
                type: 'add',
                sourcePath: data.path,
                timestamp: new Date().toISOString(),
                fromElectron: true
            });
        }

        event.reply('document-added', { success: true });
    } catch (error) {
        console.error('Error adding document:', error);
        event.reply('document-added', { success: false, error: error.message });
    }
});

// Add handler for stopping folder watching
ipcMain.on('stop-watching-folder', (event, folderPath) => {
    try {
        console.log('Stopping watch for folder:', folderPath);
        const watcher = folderWatchers.get(folderPath);
        if (watcher) {
            watcher.close();
            folderWatchers.delete(folderPath);
            console.log('Successfully stopped watching folder:', folderPath);
        }
    } catch (error) {
        console.error('Error stopping folder watch:', error);
        mainWindow.webContents.send('sync-error', `Failed to stop watching folder: ${error.message}`);
    }
});

// Add handler for processing individual files
console.log('🚀 [MAIN] === REGISTERING PROCESS-FILE IPC HANDLER ===');
ipcMain.on('process-file', async (event, { filePath, targetPath, fileName, fileType, fileSize }) => {
    console.log('\n🔍🔍🔍 [IPC DEBUG] ===== PROCESS-FILE IPC MESSAGE RECEIVED! ===== 🔍🔍🔍');
    console.log('[IPC DEBUG] Event received:', !!event);
    console.log('[IPC DEBUG] Data received:', { filePath, targetPath, fileName, fileType, fileSize });
    try {
        console.log('\n🚀🚀🚀 [UPLOAD] ===== PROCESS-FILE HANDLER EXECUTED! ===== 🚀🚀🚀');
        console.log('[UPLOAD] ⭐⭐⭐ HANDLER IS RUNNING! ⭐⭐⭐');
        console.log('[UPLOAD] Processing individual file:', fileName);
        console.log('[UPLOAD] File path:', filePath);
        console.log('[UPLOAD] Target path:', targetPath);
        console.log('[UPLOAD] File type:', fileType);
        console.log('[UPLOAD] File size:', fileSize);

        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }

        const baseUploadsDir = process.env.UPLOADS_DIR;
        let fullTargetPath;

        // Construct the target path - support both institutional and personal users
        if (!targetPath || targetPath === '') {
            // For personal users, use personal_folder_name; for institutional users, use institution_name
            fullTargetPath = user.institution_name || user.personal_folder_name;
        } else {
            // Check if targetPath already includes institution/personal folder name to avoid duplication
            const baseName = user.institution_name || user.personal_folder_name;
            if (targetPath.startsWith(baseName + '/') || targetPath.startsWith(baseName + '\\')) {
                fullTargetPath = targetPath; // Use as-is if already includes base name
                console.log('[UPLOAD] Target path already includes base name, using as-is:', fullTargetPath);
            } else {
                fullTargetPath = path.join(baseName, targetPath);
                console.log('[UPLOAD] Constructed full target path:', fullTargetPath);
            }
        }

        const physicalTargetDir = path.join(baseUploadsDir, fullTargetPath);
        // Ensure unique filename to avoid overwrite
        let fileNameBase = fileName.replace(/\.pdf$/i, '');
        let candidate = path.join(physicalTargetDir, `${fileNameBase}.pdf`);
        let counter = 1;
        while (fs.existsSync(candidate)) {
            candidate = path.join(physicalTargetDir, `${fileNameBase} (${counter++}).pdf`);
        }
        const physicalTargetFile = candidate;

        console.log('User institution:', user.institution_name);
        console.log('Target path:', targetPath);
        console.log('Full target path:', fullTargetPath);
        console.log('Base uploads dir:', baseUploadsDir);
        console.log('Physical target directory:', physicalTargetDir);
        console.log('Physical target file:', physicalTargetFile);

        // Ensure institution folder exists in database
        await ensureInstitutionFolderExists(user, fullTargetPath);

        // Create target directory if it doesn't exist
        if (!fs.existsSync(physicalTargetDir)) {
            console.log('Creating directory:', physicalTargetDir);
            fs.mkdirSync(physicalTargetDir, { recursive: true });
            console.log('Directory created successfully');
        } else {
            console.log('Directory already exists:', physicalTargetDir);
        }

        // Copy the file and get actual file size
        fs.copyFileSync(filePath, physicalTargetFile);
        const actualFileSize = fs.statSync(physicalTargetFile).size;
        
        // ✅ ALSO COPY TO LOCAL FOLDER for instant visibility
        // Use personal folder path for personal users, institution path for institutional users
        const localBasePath = user.institution_name ? 
            getInstitutionPath(user.institution_name) : 
            getPersonalFolderPath(user);
        
        // Fix: Don't duplicate base name in local path if targetPath already includes it
        let localTargetDir;
        const rootFolderName = user.institution_name || user.personal_folder_name;
        if (targetPath && (targetPath.startsWith(rootFolderName + '/') || targetPath.startsWith(rootFolderName + '\\'))) {
            // targetPath already includes base name, use it directly
            localTargetDir = path.join(localBasePath, targetPath.substring(rootFolderName.length + 1));
        } else {
            // targetPath doesn't include base name, append it
            localTargetDir = path.join(localBasePath, targetPath || '');
        }
        
        const localTargetFile = path.join(localTargetDir, path.basename(physicalTargetFile));
        
        console.log('🔍 [LOCAL COPY] Debug info:');
        console.log('  - localBasePath:', localBasePath);
        console.log('  - localTargetDir:', localTargetDir);
        console.log('  - localTargetFile:', localTargetFile);
        console.log('  - targetPath:', targetPath);
        console.log('  - user.institution_name:', user.institution_name);
        console.log('  - user.personal_folder_name:', user.personal_folder_name);
        console.log('  - DocDiL path exists:', fs.existsSync(localBasePath));
        
        // Ensure local target directory exists
        if (!fs.existsSync(localTargetDir)) {
            console.log('📁 [LOCAL COPY] Creating local directory:', localTargetDir);
            try {
                fs.mkdirSync(localTargetDir, { recursive: true });
                console.log('✅ [LOCAL COPY] Local directory created successfully');
            } catch (error) {
                console.error('❌ [LOCAL COPY] Error creating local directory:', error);
            }
        } else {
            console.log('📁 [LOCAL COPY] Local directory already exists:', localTargetDir);
        }
        
        // Copy file to local institution folder if it doesn't exist there
        if (!fs.existsSync(localTargetFile)) {
            console.log('📄 [LOCAL COPY] Copying file to local folder:', localTargetFile);
            try {
                fs.copyFileSync(filePath, localTargetFile);
                console.log('✅ [UPLOAD] File copied to local institution folder:', localTargetFile);
                console.log('✅ [UPLOAD] Local file size:', fs.statSync(localTargetFile).size, 'bytes');
                
                // TEST: Verify file was actually copied
                if (fs.existsSync(localTargetFile)) {
                    const stats = fs.statSync(localTargetFile);
                    console.log('🧪 [TEST] File verification successful:');
                    console.log('  - File exists:', fs.existsSync(localTargetFile));
                    console.log('  - File size:', stats.size, 'bytes');
                    console.log('  - File permissions:', stats.mode);
                    console.log('  - File created:', stats.birthtime);
                    console.log('  - File modified:', stats.mtime);
                } else {
                    console.error('❌ [TEST] File verification failed - file does not exist after copy');
                }
            } catch (error) {
                console.error('❌ [LOCAL COPY] Error copying file to local folder:', error);
                console.error('❌ [LOCAL COPY] Error stack:', error.stack);
            }
        } else {
            console.log('⚠️ [LOCAL COPY] File already exists in local folder:', localTargetFile);
        }

        // Save document to database with first page extraction
        const connection = await mysql.createConnection(dbConfig);
        try {
            // Extract first page BEFORE saving to database
            let extractedFirstPage = null;
            try {
                console.log('🖼️ [UPLOAD] Extracting first page before database save...');
                extractedFirstPage = await extractFirstPageFromPDF(filePath);
                console.log('🖼️ [UPLOAD] First page extraction result:', extractedFirstPage ? 'Success' : 'Failed');
            } catch (firstPageError) {
                console.warn('⚠️ [UPLOAD] First page extraction failed:', firstPageError.message);
                extractedFirstPage = null;
            }

            const [docResult] = await connection.execute(
                `INSERT INTO table_document 
                (nom_document, path, id_user_source, comment, nom_document_original, 
                isVerfied, type_id, file_size, first_page, date_upload) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    path.basename(physicalTargetFile),
                    fullTargetPath,
                    user.id,
                    `Uploaded via Upload Center - ${new Date().toLocaleDateString('ro-RO')}`,
                    path.basename(physicalTargetFile),
                    1, // isVerified
                    1, // type_id (Official Document)
                    actualFileSize, // Use actual file size instead of 0
                    extractedFirstPage // first page as base64
                ]
            );

            const docId = docResult.insertId;
            console.log('✅ [UPLOAD] Document saved to database with ID:', docId);
            
            // Generate keywords and tags for the uploaded document
            try {
                console.log('🏷️ [TAGS] Starting keyword and tag generation...');
                
                // Generate tags from filename
                const filenameTags = generateTagsFromFilename(fileName);
                console.log('🏷️ [TAGS] Filename tags generated:', filenameTags);
                
                // Generate tags from content (if text extraction is available)
                let contentTags = [];
                let extractedData = null; // Declare extractedData in outer scope
                
                try {
                    console.log('🏷️ [TAGS] Attempting text extraction for tag generation...');
                    console.log('🏷️ [TAGS] File path for extraction:', filePath);
                    console.log('🏷️ [TAGS] File exists check:', fs.existsSync(filePath));
                    console.log('🧪 [DEBUG] PDF.js available:', !!pdfjsLib);
                    console.log('🧪 [DEBUG] About to call extractTextFromPDF...');
                    
                    extractedData = await extractTextFromPDF(filePath);
                    console.log('🧪 [DEBUG] extractTextFromPDF completed successfully!');
                    console.log('🏷️ [TAGS] Text extraction completed, result:', {
                        hasData: !!extractedData,
                        hasTags: extractedData?.tags?.length > 0,
                        hasKeywords: extractedData?.keywords?.length > 0,
                        tagsCount: extractedData?.tags?.length || 0,
                        keywordsCount: extractedData?.keywords?.length || 0
                    });
                    
                    if (extractedData && extractedData.tags) {
                        contentTags = extractedData.tags;
                        console.log('🏷️ [TAGS] Content tags extracted:', contentTags);
                    } else {
                        console.log('🏷️ [TAGS] No content tags extracted from text');
                    }
                } catch (extractError) {
                    console.log('🏷️ [TAGS] Text extraction failed (falling back to filename tags):', extractError.message);
                    console.error('🏷️ [TAGS] Extraction error stack:', extractError.stack);
                    extractedData = null; // Ensure extractedData is null on error
                }
                
                // Prioritize content-based tags over filename tags
                let finalTags;
                if (contentTags.length > 0) {
                    finalTags = contentTags.slice(0, 5); // Use only content tags if available
                    console.log('🏷️ [TAGS] Using content-based tags:', finalTags);
                } else {
                    finalTags = filenameTags.slice(0, 5); // Fallback to filename tags
                    console.log('🏷️ [TAGS] Using filename-based tags (no content tags found):', finalTags);
                }
                console.log('🏷️ [TAGS] Final tags for database:', finalTags);
                
                // Insert tags into database if any were generated
                if (finalTags.length > 0) {
                    console.log('🏷️ [TAGS] Inserting', finalTags.length, 'tags into database...');
                    
                    for (const tag of finalTags) { // Already limited to 5 tags
                        try {
                            // Check if tag exists
                            const [existingTags] = await connection.execute(
                                'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                                [tag]
                            );
                            
                            let tagId;
                            if (existingTags.length === 0) {
                                // Insert new tag
                                const [tagResult] = await connection.execute(
                                    'INSERT INTO document_tags (tag_name, created_by, is_predefined) VALUES (?, ?, 0)',
                                    [tag, user.id]
                                );
                                tagId = tagResult.insertId;
                                console.log('🏷️ [TAGS] New tag created:', tag, 'with ID:', tagId);
                            } else {
                                tagId = existingTags[0].id_tag;
                                console.log('🏷️ [TAGS] Existing tag found:', tag, 'with ID:', tagId);
                            }
                            
                            // Create relation between document and tag
                            await connection.execute(
                                'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                                [docId, tagId, user.id]
                            );
                            console.log('🏷️ [TAGS] Tag relation created for document:', docId, 'and tag:', tag);
                        } catch (tagInsertError) {
                            console.error('❌ [TAGS] Error inserting tag:', tag, 'Error:', tagInsertError.message);
                        }
                    }
                    
                    console.log('🏷️ [TAGS] Tag insertion completed successfully');
                } else {
                    console.log('🏷️ [TAGS] No tags generated, skipping database insertion');
                }
                
                console.log('🏷️ [TAGS] Keyword and tag generation completed');
                
                // Save keywords to table_mot_cle if any were extracted
                console.log('🏷️ [KEYWORDS] Checking if keywords should be saved...');
                console.log('🏷️ [KEYWORDS] extractedData exists:', !!extractedData);
                console.log('🏷️ [KEYWORDS] extractedData.keywords exists:', !!extractedData?.keywords);
                console.log('🏷️ [KEYWORDS] extractedData.keywords length:', extractedData?.keywords?.length || 0);
                console.log('🏷️ [KEYWORDS] extractedData.keywords content:', extractedData?.keywords || 'undefined');
                
                // Prioritize content-based keywords, fallback to filename-based
                let finalKeywords;
                if (extractedData && extractedData.keywords && extractedData.keywords.length > 0) {
                    finalKeywords = extractedData.keywords.slice(0, 5);
                    console.log('🏷️ [KEYWORDS] Using content-based keywords:', finalKeywords);
                } else {
                    finalKeywords = filenameTags.slice(0, 5); // Use filename tags as keywords fallback
                    console.log('🏷️ [KEYWORDS] Using filename-based keywords (no content keywords found):', finalKeywords);
                }
                
                if (finalKeywords.length > 0) {
                    try {
                        console.log('🏷️ [KEYWORDS] Saving keywords to table_mot_cle...');
                        console.log('🏷️ [KEYWORDS] Keywords to save:', finalKeywords);
                        console.log('🏷️ [KEYWORDS] Document ID for keywords:', docId);
                        
                        // Insert keywords into table_mot_cle
                        const [keywordResult] = await connection.execute(
                            'INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) VALUES (?, ?, ?, ?, ?, ?)',
                            [docId, ...finalKeywords, ...Array(5 - finalKeywords.length).fill(null)]
                        );
                        
                        console.log('🏷️ [KEYWORDS] Keywords saved successfully to table_mot_cle, result:', keywordResult);
                        console.log('🏷️ [KEYWORDS] Keywords insertion completed for document:', docId);
                    } catch (keywordError) {
                        console.error('❌ [KEYWORDS] Error saving keywords to table_mot_cle:', keywordError.message);
                        console.error('❌ [KEYWORDS] Error stack:', keywordError.stack);
                    }
                } else {
                    console.log('🏷️ [KEYWORDS] No keywords to save to table_mot_cle');
                    console.log('🏷️ [KEYWORDS] Reason: extractedData or keywords not available');
                }
            } catch (tagError) {
                console.error('❌ [TAGS] Error in keyword and tag generation:', tagError);
                console.error('❌ [TAGS] Error stack:', tagError.stack);
            }

        } finally {
            await connection.end();
        }

        // Send success response
        event.reply('file-processed', {
            success: true,
            fileName: path.basename(physicalTargetFile),
            targetPath: fullTargetPath
        });

        // Emit WebSocket event for real-time updates
        if (socket && socket.connected) {
            const eventData = {
                type: 'add',
                documentId: docId,
                documentName: path.basename(physicalTargetFile),
                documentPath: fullTargetPath,
                userId: user.id,
                institutionId: user.institution_id,
                timestamp: new Date().toISOString(),
                fromElectron: true
            };
            
            console.log('🔌 Emitting document add event to WebSocket:', eventData);
            socket.emit('fileSystemChange', eventData);
        }

        // Notify renderer immediately for local UI update and conditionally refresh
        if (mainWindow && !mainWindow.isDestroyed()) {
            const payload = {
                path: fullTargetPath,
                folder: fullTargetPath,
                institution: user.institution_name,
                documentId: docId,
                fileName: path.basename(physicalTargetFile),
                fromElectron: true
            };
            mainWindow.webContents.send('file-added', payload);

            // Ask renderer which folder is currently open and refresh only if it matches
            try {
                const currentFolderPath = await mainWindow.webContents.executeJavaScript('window.currentFolderPath || ""');
                const normalize = (s) => (s || '').toString().replace(/\\/g, '/');
                const currentNorm = normalize(currentFolderPath);
                const addedNorm = normalize(fullTargetPath);
                if (currentNorm && addedNorm && currentNorm.toLowerCase() === addedNorm.toLowerCase()) {
                    mainWindow.webContents.send('get-folder-structure', {
                        institutionId: user.institution_id,
                        currentPath: fullTargetPath
                    });
                }
            } catch (e) {
                console.warn('Conditional refresh after add failed:', e.message);
            }
        }

        // Refresh handled by real-time renderer events

    } catch (error) {
        console.error('Error processing file:', error);
        event.reply('file-processed', {
            success: false,
            fileName: fileName,
            error: error.message
        });
    }
});

// IMMEDIATE TEST - add-folder handler
console.log('🔧 [MAIN] Registering add-folder handler...');
console.log('🔧 [MAIN] ipcMain object available:', typeof ipcMain);
ipcMain.on('add-folder', async (event, data) => {
            console.log('📁 [MAIN] === ADD-FOLDER IPC HANDLER ===');
        const { folderPath, targetPath } = data || {};
        console.log('📁 [MAIN] Folder path:', folderPath);
        console.log('📁 [MAIN] Target path:', targetPath);
    
    try {
        console.log('📂 [MAIN] Processing folder upload');
        const user = store.get('user');
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get folder name from path
        const folderName = path.basename(folderPath);
        
        // Track this folder upload to prevent auto-upload conflicts
        const uploadKey = `${folderName}_${Date.now()}`;
        recentFolderUploads.set(uploadKey, {
            folderName: folderName,
            folderPath: folderPath,
            targetPath: targetPath,
            timestamp: Date.now()
        });
        
        // Clean up old folder uploads
        const now = Date.now();
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp > FOLDER_UPLOAD_WINDOW) {
                recentFolderUploads.delete(key);
            }
        }
        
        // Define base directory for uploads
        const baseUploadsDir = process.env.UPLOADS_DIR;
        if (!baseUploadsDir) {
            throw new Error('UPLOADS_DIR environment variable not set');
        }
        console.log('Base uploads directory:', baseUploadsDir);
        
        // Construct the correct path for the new folder (support personal users)
        const isPersonalFolder = !user.institution_id || user.institution_name == null;
        const rootFolderNameForAdd = isPersonalFolder ? (user.personal_folder_name || '') : (user.institution_name || '');
        if (!rootFolderNameForAdd) {
            throw new Error('Root folder name not available');
        }
        let newFolderPath;
        const cleanedTarget = (targetPath || '').replace(/^null\//, '');
        if (!cleanedTarget) {
            newFolderPath = path.join(rootFolderNameForAdd, folderName);
        } else {
            if (!cleanedTarget.startsWith(rootFolderNameForAdd)) {
                newFolderPath = path.join(rootFolderNameForAdd, cleanedTarget, folderName);
            } else {
                newFolderPath = path.join(cleanedTarget, folderName);
            }
        }
        
        console.log('New folder path:', newFolderPath);
        const physicalFolderPath = path.join(baseUploadsDir, newFolderPath);
        console.log('Physical folder path:', physicalFolderPath);

        // Create folder in database
        const connection = await mysql.createConnection(dbConfig);
        try {
            // Check if folder already exists
            let existingFolders;
            if (user.institution_id == null) {
                [existingFolders] = await connection.execute(
                    'SELECT id FROM folders WHERE folder_path = ? AND institution_id IS NULL',
                    [newFolderPath]
                );
            } else {
                [existingFolders] = await connection.execute(
                    'SELECT id FROM folders WHERE folder_path = ? AND institution_id = ?',
                    [newFolderPath, user.institution_id]
                );
            }

            if (existingFolders.length > 0) {
                throw new Error('A folder with this name already exists in this location');
            }

            // Create physical folder structure first
            try {
                // Create all parent directories
                const parentDir = path.dirname(physicalFolderPath);
                if (!fs.existsSync(parentDir)) {
                    console.log('Creating parent directory:', parentDir);
                    fs.mkdirSync(parentDir, { recursive: true });
                }

                // Create the actual folder
                if (!fs.existsSync(physicalFolderPath)) {
                    console.log('Creating physical folder:', physicalFolderPath);
                    fs.mkdirSync(physicalFolderPath);
                }

                // Copy contents from source to destination
                console.log('Copying contents from:', folderPath, 'to:', physicalFolderPath);
                const copyContents = async (src, dest) => {
                    const entries = fs.readdirSync(src, { withFileTypes: true });
                    
                    for (const entry of entries) {
                        const srcPath = path.join(src, entry.name);
                        const destPath = path.join(dest, entry.name);
                        
                        if (entry.isDirectory()) {
                            if (!fs.existsSync(destPath)) {
                                fs.mkdirSync(destPath, { recursive: true });
                            }
                            await copyContents(srcPath, destPath);
                        } else {
                            fs.copyFileSync(srcPath, destPath);
                        }
                    }
                };

                await copyContents(folderPath, physicalFolderPath);
                console.log('Contents copied successfully');

            } catch (fsError) {
                console.error('Error creating physical folder structure:', fsError);
                throw new Error(`Failed to create physical folder: ${fsError.message}`);
            }

            // Insert folder into database
            const [result] = await connection.execute(
                'INSERT INTO folders (folder_name, folder_path, institution_id, created_by, is_private) VALUES (?, ?, ?, ?, ?)',
                [folderName, newFolderPath, user.institution_id, user.id, 1]
            );

            const folderId = result.insertId;
            console.log('Created folder with ID:', folderId);

            // Process all PDF files in the folder
            console.log('📄 [MAIN] Starting to process folder contents...');
            await processFolderContents(folderPath, newFolderPath, user, connection, baseUploadsDir, true); // true = isRootFolder
            console.log('📄 [MAIN] Finished processing folder contents');

            // Emit WebSocket event for real-time folder creation
            if (socket && socket.connected) {
                const eventData = {
                    type: 'folder_create',
                    folderId: folderId,
                    folderName: folderName,
                    folderPath: newFolderPath,
                    parentPath: targetPath || '',
                    userId: user.id,
                    institutionId: user.institution_id,
                    timestamp: new Date().toISOString(),
                    targetFolder: newFolderPath  // ✅ ADD PATH COMPLET
                };
                
                console.log('🔌 [MAIN] Emitting folder create event to WebSocket:', eventData);
                socket.emit('fileSystemChange', eventData);
                console.log('🔌 [MAIN] WebSocket event emitted successfully');
            } else {
                console.warn('🔌 [MAIN] No socket available or not connected for WebSocket event');
            }

            console.log('🎉 [MAIN] Preparing to send folder-added event...');

            // Notify UI about the new folder
            const folderAddedPayload = {
                name: folderName,
                path: newFolderPath,
                institution: user.institution_name
            };
            console.log('🎉 [MAIN] Sending folder-added event:', folderAddedPayload);
            console.log('🎉 [MAIN] Folder name:', folderName);
            console.log('🎉 [MAIN] New folder path:', newFolderPath);
            console.log('🎉 [MAIN] Institution:', user.institution_name);
            
            if (mainWindow && mainWindow.webContents) {
                mainWindow.webContents.send('folder-added', folderAddedPayload);
                console.log('🎉 [MAIN] folder-added event sent successfully');
            } else {
                console.error('🎉 [MAIN] mainWindow or webContents not available');
            }

            // Refresh folder structure - NAVIGATE TO NEW FOLDER
            console.log('🔄 [MAIN] Sending get-folder-structure event...');
            console.log('🔄 [MAIN] Navigating to new folder path:', newFolderPath);
            if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('get-folder-structure', {
                institutionId: user.institution_id,
                currentPath: newFolderPath || ''
            });
                console.log('🔄 [MAIN] get-folder-structure event sent successfully to:', newFolderPath);
            } else {
                console.error('🔄 [MAIN] mainWindow or webContents not available for folder structure');
            }

        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('💥 [MAIN] Error processing dropped folder:', error);
        console.error('💥 [MAIN] Error stack:', error.stack);
        if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('sync-error', `Failed to add folder: ${error.message}`);
        }
    }
});

// Function to extract first page from PDF as IMAGE (same format as backend)
async function extractFirstPageFromPDF(filePath) {
    if (!config.thumbnails.enabled || process.env.DISABLE_THUMBNAILS === 'true') {
        console.log('🖼️ [FirstPage] Thumbnail generation disabled');
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }

    try {
        console.log("🖼️ [FirstPage] Extracting first page as IMAGE from PDF:", filePath);
        if (!fs.existsSync(filePath)) {
            console.warn("⚠️ [FirstPage] PDF file not found:", filePath);
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
        }

        // 1) Preferred: pdf2pic (same as backend UploadPage)
        if (config.thumbnails.usePdf2pic) {
            try {
                const pdf2pic = require('pdf2pic');
                const path = require('path');
                const tempDir = path.join(process.cwd(), 'temp_firstpage_sync');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const convert = pdf2pic.fromPath(filePath, {
                    density: 100,
                    saveFilename: 'firstpage',
                    savePath: tempDir,
                    format: 'png',
                    width: 400,
                    height: 500
                });

                const first = await convert(1);
                if (first && first.path && fs.existsSync(first.path)) {
                    const imageBuffer = fs.readFileSync(first.path);
                    const b64 = imageBuffer.toString('base64');
                    // cleanup
                    try { fs.unlinkSync(first.path); } catch {}
                    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
                    return `data:image/png;base64,${b64}`;
                }
            } catch (e) {
                console.warn('⚠️ [FirstPage] pdf2pic failed, falling back:', e.message);
            }
        }

        // 2) Secondary: rasterize via PDF.js + node-canvas
        try {
            if (pdfjsLib) {
                const data = new Uint8Array(fs.readFileSync(filePath));
                const pdf = await pdfjsLib.getDocument(data).promise;
                if (pdf.numPages === 0) throw new Error('PDF has no pages');
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                if (createCanvas) {
                    const canvas = createCanvas(viewport.width, viewport.height);
                    const context = canvas.getContext('2d');
                    await page.render({ canvasContext: context, viewport }).promise;
                    const pngBuffer = canvas.toBuffer('image/png');
                    const base64Png = pngBuffer.toString('base64');
                    return `data:image/png;base64,${base64Png}`;
                }
                if (pdfjsLib.SVGGraphics) {
                    const opList = await page.getOperatorList();
                    const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
                    svgGfx.embedFonts = true;
                    const svg = await svgGfx.getSVG(opList, viewport);
                    const svgString = typeof svg === 'string' ? svg : (svg?.toString ? svg.toString() : (svg?.outerHTML || ''));
                    if (svgString) {
                        const base64Svg = Buffer.from(svgString).toString('base64');
                        return `data:image/svg+xml;base64,${base64Svg}`;
                    }
                }
            }
        } catch (rasterErr) {
            console.warn('⚠️ [FirstPage] Raster/SVG generation failed:', rasterErr.message);
        }

        // 3) Last resort
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    } catch (error) {
        console.error("💥 [FirstPage] Error extracting first page:", error);
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    }
}

// Enhanced PDF extraction function with first page capture
async function extractTextFromPDF(filePath) {
    try {
        console.log('🏷️ [TAGS] Starting text extraction from PDF:', filePath);
        console.log('🏷️ [TAGS] Function execution started successfully');
        console.log('🏷️ [TAGS] Function initialization phase started successfully');
        console.log('🏷️ [TAGS] Function initialization phase started successfully');
        
        // Check if PDF.js is available
        console.log('🏷️ [TAGS] Checking PDF.js availability...');
        if (!pdfjsLib) {
            console.warn('🏷️ [TAGS] PDF.js not available, falling back to filename-based tags');
            throw new Error('PDF.js not available');
        }
        console.log('🏷️ [TAGS] PDF.js availability check completed successfully');
        
        // Check if natural.js is available
        console.log('🏷️ [KEYWORDS] Checking natural.js availability...');
        if (!natural || !natural.WordTokenizer) {
            console.warn('🏷️ [KEYWORDS] Natural.js not available, keyword extraction will fail');
        } else {
            console.log('🏷️ [KEYWORDS] Natural.js available, WordTokenizer:', !!natural.WordTokenizer);
        }
        console.log('🏷️ [TAGS] Function initialization phase completed successfully');
        console.log('🏷️ [TAGS] Function initialization phase completed successfully');
        
        const data = new Uint8Array(fs.readFileSync(filePath));
        console.log('🏷️ [TAGS] PDF file loaded, size:', data.length, 'bytes');
        console.log('🏷️ [TAGS] PDF file loading completed');
        console.log('🏷️ [TAGS] File loading phase completed successfully');
        console.log('🏷️ [TAGS] File loading phase completed successfully');
        console.log('🏷️ [TAGS] File loading phase completed successfully');
        
        const pdf = await pdfjsLib.getDocument(data).promise;
        console.log('🏷️ [TAGS] PDF document loaded, pages:', pdf.numPages);
        console.log('🏷️ [TAGS] PDF document loading completed');
        console.log('🏷️ [TAGS] PDF loading phase completed successfully');
        console.log('🏷️ [TAGS] PDF loading phase completed successfully');
        console.log('🏷️ [TAGS] PDF loading phase completed successfully');
        let extractedText = '';
        let firstPageBase64 = null;
        let isImageBasedPDF = false;
        let pageCount = 0;

        // Extract first page as PDF (like backend does)
        try {
            console.log('🏷️ [TAGS] Attempting to extract first page...');
            firstPageBase64 = await extractFirstPageFromPDF(filePath);
            console.log('🏷️ [TAGS] First page extracted successfully as PDF, size:', firstPageBase64 ? firstPageBase64.length : 0, 'bytes');
            console.log('🏷️ [TAGS] First page extraction completed');
            console.log('🏷️ [TAGS] First page extraction phase completed successfully');
            console.log('🏷️ [TAGS] First page extraction phase completed successfully');
            console.log('🏷️ [TAGS] First page extraction phase completed successfully');
        } catch (firstPageError) {
            console.error('🏷️ [TAGS] Error extracting first page:', firstPageError);
            firstPageBase64 = null;
            console.log('🏷️ [TAGS] First page extraction failed, continuing without it');
            console.log('🏷️ [TAGS] First page extraction phase completed with errors');
            console.log('🏷️ [TAGS] First page extraction phase completed with errors');
            console.log('🏷️ [TAGS] First page extraction phase completed with errors');
        }

        // First pass: check pages and count image-only pages; decide if fully image-based
        console.log('🏷️ [TAGS] Checking if PDF is image-based...');
        let imageOnlyPages = 0;
        for (let i = 1; i <= pdf.numPages; i++) {
            console.log('🏷️ [TAGS] Analyzing page', i, 'for text content...');
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            if (textContent.items.length === 0) {
                imageOnlyPages++;
                console.log('🏷️ [TAGS] Page', i, 'appears to be image-based (no text content)');
            } else {
                console.log('🏷️ [TAGS] Page', i, 'has text content, length:', textContent.items.length);
            }
        }
        isImageBasedPDF = (imageOnlyPages === pdf.numPages);
        pageCount = imageOnlyPages;
        console.log('🏷️ [TAGS] PDF analysis complete. Image-based:', isImageBasedPDF, 'Image pages:', pageCount);
        console.log('🏷️ [TAGS] PDF analysis phase completed');
        console.log('🏷️ [TAGS] PDF analysis phase completed successfully');
        console.log('🏷️ [TAGS] PDF analysis phase completed successfully');
        
        // If it's an image-based PDF, use enhanced OCR
        if (isImageBasedPDF) {
            console.log('🏷️ [TAGS] Detected image-based PDF, using enhanced OCR...');
            console.log('🏷️ [TAGS] Processing', pageCount, 'image-based pages with OCR...');
            console.log('🏷️ [TAGS] Starting OCR processing phase...');
            console.log('🏷️ [TAGS] OCR processing phase started successfully');
            console.log('🏷️ [TAGS] OCR processing phase started successfully');
            console.log('🏷️ [TAGS] OCR processing phase started successfully');
            for (let i = 1; i <= pdf.numPages; i++) {
                console.log('🏷️ [TAGS] Processing page', i, 'with OCR...');
                console.log('🏷️ [TAGS] Page', i, 'OCR processing phase started successfully');
                console.log('🏷️ [TAGS] Page', i, 'OCR processing phase started successfully');
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better quality
                
                // Create canvas with higher resolution (skip if canvas not available)
                if (!createCanvas) {
                    console.warn('🏷️ [TAGS] Canvas not available, skipping OCR for page', i);
                    continue;
                }
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
                console.log('🏷️ [TAGS] Canvas created for page', i, 'size:', viewport.width, 'x', viewport.height);
                
                // Render page to canvas
                console.log('🏷️ [TAGS] Rendering page', i, 'to canvas...');
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                console.log('🏷️ [TAGS] Page', i, 'rendered to canvas successfully');

                // Convert canvas to image data
                const imageData = canvas.toBuffer('image/png');
                console.log('🏷️ [TAGS] Canvas converted to PNG, size:', imageData.length, 'bytes');
                
                // Perform OCR with enhanced settings
                console.log('🏷️ [TAGS] Starting OCR for page', i);
                const worker = await Tesseract.createWorker();
                console.log('🏷️ [TAGS] Tesseract worker created for page', i);
                
                await worker.loadLanguage('eng+ron'); // Support for both English and Romanian
                console.log('🏷️ [TAGS] Language loaded for page', i);
                
                await worker.initialize('eng+ron');
                console.log('🏷️ [TAGS] Worker initialized for page', i);
                
                await worker.setParameters({
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}-_/\\@#$%^&*+=<>|"\' ',
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    preserve_interword_spaces: '1'
                });
                console.log('🏷️ [TAGS] Parameters set for page', i);
                
                console.log('🏷️ [TAGS] Starting text recognition for page', i);
                const { data: { text } } = await worker.recognize(imageData);
                extractedText += text + '\n';
                console.log('🏷️ [TAGS] OCR completed for page', i, 'Text length:', text.length);
                
                await worker.terminate();
                console.log('🏷️ [TAGS] Worker terminated for page', i);
                console.log('🏷️ [TAGS] Page', i, 'OCR processing completed');
                console.log('🏷️ [TAGS] Page', i, 'OCR phase completed successfully');
            }
                        console.log('🏷️ [TAGS] OCR processing completed for all image-based pages');
            console.log('🏷️ [TAGS] Total text extracted from OCR:', extractedText.length, 'characters');
            console.log('🏷️ [TAGS] OCR phase completed successfully');
        } else {
            // Normal text extraction for regular PDFs
            console.log('🏷️ [TAGS] Using normal text extraction for regular PDF...');
            console.log('🏷️ [TAGS] Starting normal text extraction phase...');
            console.log('🏷️ [TAGS] Normal text extraction phase started successfully');
            console.log('🏷️ [TAGS] Normal text extraction phase started successfully');
            console.log('🏷️ [TAGS] Normal text extraction phase started successfully');
            for (let i = 1; i <= pdf.numPages; i++) {
                console.log('🏷️ [TAGS] Processing page', i, 'for text extraction...');
                console.log('🏷️ [TAGS] Page', i, 'text extraction phase started successfully');
                console.log('🏷️ [TAGS] Page', i, 'text extraction phase started successfully');
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedText += pageText + '\n';
                console.log('🏷️ [TAGS] Page', i, 'text extracted, length:', pageText.length);
                console.log('🏷️ [TAGS] Page', i, 'text extraction completed');
                console.log('🏷️ [TAGS] Page', i, 'text extraction phase completed successfully');
            }
                        console.log('🏷️ [TAGS] Normal text extraction completed for all pages');
            console.log('🏷️ [TAGS] Total text extracted from normal extraction:', extractedText.length, 'characters');
            console.log('🏷️ [TAGS] Normal text extraction phase completed successfully');
        }
        
        console.log('🏷️ [TAGS] Text extraction phase completed, total text length:', extractedText.length);
        console.log('🏷️ [TAGS] Moving to tag generation phase...');
        console.log('🏷️ [TAGS] Tag generation phase started successfully');
        console.log('🏷️ [TAGS] Tag generation phase started successfully');
        console.log('🏷️ [TAGS] Tag generation phase started successfully');
        
        // Generate tags from filename
        const filename = path.basename(filePath, '.pdf');
        console.log('🏷️ [TAGS] Processing filename for tags:', filename);
        
        const filenameTags = filename
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);

        console.log('🏷️ [TAGS] Filename tags from text extraction:', filenameTags);
        console.log('🏷️ [TAGS] Filename processing completed');
        
        // Generate intelligent tags from content
        let contentTags = [];
        if (extractedText.trim()) {
            console.log('🏷️ [TAGS] Generating content-based tags from extracted text...');
            contentTags = generateTagsFromContent(extractedText);
            console.log('🏷️ [TAGS] Content-based tags generated:', contentTags);
        } else {
            console.log('🏷️ [TAGS] No text available for content-based tag generation');
        }
        
        // Extract keywords from text (fallback local)
        let keywords = [];
        console.log('🏷️ [KEYWORDS] Starting keyword extraction phase...');
        console.log('🏷️ [KEYWORDS] Extracted text length:', extractedText.length);
        console.log('🏷️ [KEYWORDS] Extracted text trimmed length:', extractedText.trim().length);
        console.log('🏷️ [KEYWORDS] Text preview (first 500 chars):', extractedText.substring(0, 500));
        console.log('🏷️ [KEYWORDS] Keyword extraction phase started successfully');
        
        if (extractedText.trim()) {
            // Preferred: Azure key phrase extraction
            const azure = await extractKeywordsAndTagsAzure(extractedText);
            if (azure && Array.isArray(azure.keywords) && azure.keywords.length) {
                keywords = azure.keywords;
            }
            try {
                console.log('🏷️ [KEYWORDS] Starting keyword extraction from text...');
                console.log('🏷️ [KEYWORDS] Natural.js WordTokenizer available:', !!natural.WordTokenizer);
                
                const tokenizer = new natural.WordTokenizer();
                const tokens = tokenizer.tokenize(extractedText.toLowerCase());
                console.log('🏷️ [KEYWORDS] Text tokenized into', tokens.length, 'tokens');
                console.log('🏷️ [KEYWORDS] First 20 tokens:', tokens.slice(0, 20));
                
                const stopWords = new Set(['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'as']);
                console.log('🏷️ [KEYWORDS] Stop words defined:', Array.from(stopWords));
                
                // Count word frequencies
                const wordFreq = {};
                let processedTokens = 0;
                let validTokens = 0;
                
                tokens.forEach(token => {
                    processedTokens++;
                    if (token.length > 3 && !stopWords.has(token)) {
                        wordFreq[token] = (wordFreq[token] || 0) + 1;
                        validTokens++;
                    }
                });

                console.log('🏷️ [KEYWORDS] Token processing completed - Total:', processedTokens, 'Valid:', validTokens);
                console.log('🏷️ [KEYWORDS] Word frequency analysis completed, unique words:', Object.keys(wordFreq).length);
                console.log('🏷️ [KEYWORDS] Top 10 word frequencies:', Object.entries(wordFreq).sort(([,a], [,b]) => b - a).slice(0, 10));

                // Get top keywords
                keywords = Object.entries(wordFreq)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([word]) => word);
                
                console.log('🏷️ [KEYWORDS] Keywords extracted from text:', keywords);
                console.log('🏷️ [KEYWORDS] Keyword extraction from text completed successfully');
            } catch (keywordError) {
                console.error('❌ [KEYWORDS] Error extracting keywords from text:', keywordError.message);
                console.error('❌ [KEYWORDS] Error stack:', keywordError.stack);
                keywords = [];
                console.log('🏷️ [KEYWORDS] Keyword extraction failed, using empty array');
            }
        } else {
            console.log('🏷️ [KEYWORDS] No text content available for keyword extraction');
        }
        
        console.log('🏷️ [TAGS] Keyword extraction phase completed, keywords count:', keywords.length);
        
        // If no keywords found from text, use filename tags
        console.log('🏷️ [KEYWORDS] Checking if fallback to filename tags is needed...');
        if (keywords.length === 0) {
            keywords = filenameTags.slice(0, 5);
            console.log('🏷️ [KEYWORDS] No keywords from text, using filename tags as keywords:', keywords);
        } else {
            console.log('🏷️ [KEYWORDS] Keywords from text available, not using filename fallback');
        }
        
        console.log('🏷️ [KEYWORDS] Final keywords after fallback check:', keywords);
        
        // Combine tags from filename and content (prefer Azure when available)
        console.log('🏷️ [TAGS] Starting tag combination phase...');
        console.log('🏷️ [TAGS] Input data - Filename tags:', filenameTags, 'Keywords:', keywords);
        console.log('🏷️ [TAGS] Tag combination phase started successfully');
        console.log('🏷️ [TAGS] Tag combination phase started successfully');
        console.log('🏷️ [TAGS] Tag combination phase started successfully');
        
        // Use content-based keywords and tags if available, otherwise fallback to filename
        const hasContentKeywords = keywords.length > 0;
        const hasContentTags = contentTags.length > 0;

        // If Azure produced tags via extractKeywordsAndTagsAzure, they are already in 'keywords' above
        // Build content-based tags using our generator; prefer content over filename
        const finalKeywords = hasContentKeywords ? keywords.slice(0, 5) : filenameTags.slice(0, 5);
        const finalTags = hasContentTags ? contentTags.slice(0, 5) : [...new Set([...filenameTags])].slice(0, 5);

        console.log('🏷️ [TAGS] Final keywords:', finalKeywords);
        console.log('🏷️ [TAGS] Final tags:', finalTags);
        
        // Insert tags into database if any were generated
        if (finalTags.length > 0) {
            console.log('🏷️ [TAGS] Inserting', finalTags.length, 'tags into database...');
            
            for (const tag of finalTags) { // Already limited to 5
                try {
                    // Check if tag exists
                    const [existingTags] = await connection.execute(
                        'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                        [tag]
                    );
                    
                    let tagId;
                    if (existingTags.length === 0) {
                        // Insert new tag
                        const [tagResult] = await connection.execute(
                            'INSERT INTO document_tags (tag_name, created_by, is_predefined) VALUES (?, ?, 0)',
                            [tag, user.id]
                        );
                        tagId = tagResult.insertId;
                    } else {
                        tagId = existingTags[0].id_tag;
                    }
                    
                    // Create relation between document and tag
                    await connection.execute(
                        'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                        [docId, tagId, user.id]
                    );
                } catch (tagInsertError) {
                    console.error('❌ [TAGS] Error inserting tag:', tag, 'Error:', tagInsertError.message);
                }
            }
            
            console.log('🏷️ [TAGS] Tag insertion completed successfully');
        } else {
            console.log('🏷️ [TAGS] No tags generated, skipping database insertion');
        }
        
        console.log('🏷️ [TAGS] Keyword and tag generation completed');
        
        // Save keywords to table_mot_cle (prefer content-based)
        console.log('🏷️ [KEYWORDS] Checking if keywords should be saved...');
        console.log('🏷️ [KEYWORDS] finalKeywords length:', finalKeywords.length);
        console.log('🏷️ [KEYWORDS] finalKeywords:', finalKeywords);
        
        if (finalKeywords.length > 0) {
            try {
                console.log('🏷️ [KEYWORDS] Saving keywords to table_mot_cle...');
                const keywords = finalKeywords;
                console.log('🏷️ [KEYWORDS] Keywords to save:', keywords);
                console.log('🏷️ [KEYWORDS] Document ID for keywords:', docId);
                
                // Insert keywords into table_mot_cle
                const [keywordResult] = await connection.execute(
                    'INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) VALUES (?, ?, ?, ?, ?, ?)',
                    [docId, ...keywords, ...Array(5 - keywords.length).fill(null)]
                );
                
                console.log('🏷️ [KEYWORDS] Keywords saved successfully to table_mot_cle, result:', keywordResult);
                console.log('🏷️ [KEYWORDS] Keywords insertion completed for document:', docId);
            } catch (keywordError) {
                console.error('❌ [KEYWORDS] Error saving keywords to table_mot_cle:', keywordError.message);
                console.error('❌ [KEYWORDS] Error stack:', keywordError.stack);
            }
        } else {
            console.log('🏷️ [KEYWORDS] No keywords to save to table_mot_cle');
            console.log('🏷️ [KEYWORDS] Reason: extractedData or keywords not available');
        }

        console.log('🏷️ [TAGS] Tag insertion completed successfully');
        console.log('🏷️ [TAGS] Tag generation completed successfully');
        console.log('🏷️ [TAGS] Text extraction completed successfully');
        console.log('🏷️ [TAGS] Returning data with', finalTags.length, 'tags and', finalKeywords.length, 'keywords');
        console.log('🏷️ [TAGS] Final data preparation phase completed successfully');

        console.log('🏷️ [TAGS] Preparing return object...');
        console.log('🏷️ [TAGS] Return object preparation phase started successfully');
        console.log('🏷️ [TAGS] Return object preparation phase started successfully');
        console.log('🏷️ [TAGS] Return object preparation phase started successfully');
        const returnData = {
            text: extractedText,
            keywords: finalKeywords,
            tags: finalTags,
            firstPage: firstPageBase64,
            isImageBasedPDF: isImageBasedPDF
        };
        
        console.log('🏷️ [TAGS] Return object prepared:', {
            textLength: returnData.text.length,
            keywordsCount: returnData.keywords.length,
            tagsCount: returnData.tags.length,
            hasFirstPage: !!returnData.firstPage,
            isImageBased: returnData.isImageBasedPDF
        });
        
        console.log('🏷️ [TAGS] Return object preparation phase completed successfully');
        console.log('🏷️ [TAGS] Function execution completed successfully');
        console.log('🏷️ [TAGS] Main function execution phase completed successfully');
        return returnData;
    } catch (error) {
        console.error('❌ [TAGS] Error extracting text from PDF:', error);
        console.error('❌ [TAGS] Error stack:', error.stack);
        console.log('🏷️ [TAGS] Error handling phase started successfully');
        
        // Fallback to filename-based tags if extraction fails
        const filename = path.basename(filePath, '.pdf');
        const tags = filename
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 5);
        
        console.log('🏷️ [TAGS] Fallback tags generated from filename:', tags);
        console.log('🏷️ [TAGS] Fallback text extraction completed');
        console.log('🏷️ [TAGS] Returning fallback data with', tags.length, 'tags');
        console.log('🏷️ [TAGS] Fallback processing completed successfully');
        
        console.log('🏷️ [TAGS] Preparing fallback return object...');
        console.log('🏷️ [TAGS] Fallback return object preparation phase started successfully');
        console.log('🏷️ [TAGS] Fallback return object preparation phase started successfully');
        const fallbackData = {
            text: '',
            keywords: tags,
            tags: tags,
            firstPage: null,
            isImageBasedPDF: true
        };
        
        console.log('🏷️ [TAGS] Fallback return object prepared:', {
            textLength: fallbackData.text.length,
            keywordsCount: fallbackData.keywords.length,
            tagsCount: fallbackData.tags.length,
            hasFirstPage: !!fallbackData.firstPage,
            isImageBased: fallbackData.isImageBasedPDF
        });
        
        console.log('🏷️ [TAGS] Fallback return object preparation phase completed successfully');
        console.log('🏷️ [TAGS] Fallback function execution completed successfully');
        console.log('🏷️ [TAGS] Error handling phase completed successfully');
        return fallbackData;
    }
}

// Azure-based key phrase extraction with optional Translator (RO->EN)
async function extractKeywordsAndTagsAzure(rawText) {
    try {
        const textEndpoint = process.env.AZURE_TEXT_ENDPOINT;
        const textKey = process.env.AZURE_TEXT_KEY;
        if (!textEndpoint || !textKey) {
            return null; // Azure not configured
        }

        // Trim text to safe length for API
        let text = (rawText || '').toString();
        if (!text.trim()) return null;
        const MAX_LEN = 4500; // safety margin below API limits
        if (text.length > MAX_LEN) text = text.substring(0, MAX_LEN);

        let lang = 'ro';
        let contentForAzure = text;

        // Optional: translate to EN for better phrase quality
        const transEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
        const transKey = process.env.AZURE_TRANSLATOR_KEY;
        const transRegion = process.env.AZURE_TRANSLATOR_REGION;
        if (transEndpoint && transKey) {
            try {
                const url = `${transEndpoint}/translate?api-version=3.0&to=en`;
                const resp = await axios.post(url, [{ text }], {
                    headers: {
                        'Ocp-Apim-Subscription-Key': transKey,
                        ...(transRegion ? { 'Ocp-Apim-Subscription-Region': transRegion } : {}),
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                const tr = Array.isArray(resp.data) && resp.data[0]?.translations?.[0]?.text;
                if (tr && typeof tr === 'string' && tr.trim()) {
                    contentForAzure = tr;
                    lang = 'en';
                }
            } catch (e) {
                console.log('AZURE Translator skipped, fallback to original text:', e.message);
            }
        }

        const url = `${textEndpoint.replace(/\/$/, '')}/text/analytics/v3.2/keyPhrases`;
        const payload = { documents: [{ id: '1', language: lang, text: contentForAzure }] };
        const res = await axios.post(url, payload, {
            headers: {
                'Ocp-Apim-Subscription-Key': textKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const phrases = res.data?.documents?.[0]?.keyPhrases || [];
        const normalized = Array.from(new Set(
            phrases
                .map(p => (p || '').toString().toLowerCase().trim())
                .filter(p => p && p.length > 2)
        ));

        // Build tags using both key phrases and content heuristics
        const tagsFromContent = generateTagsFromContent(rawText || '');
        const tags = Array.from(new Set([ ...normalized.slice(0, 8), ...tagsFromContent ])).slice(0, 8);
        const keywords = normalized.slice(0, 5);

        return { keywords, tags };
    } catch (error) {
        console.error('Azure key phrase extraction failed:', error.message);
        return null;
    }
}

// Function to generate tags from filename
function generateTagsFromFilename(filename) {
    const baseName = path.basename(filename, '.pdf');
    const tags = [];
    
    // Enhanced patterns for different document types
    const patterns = {
        contract: /\b(contract|acordul?|conventie|contractual)\b/i,
        factura: /\b(factura|invoice|bill|receipt)\b/i,
        raport: /\b(raport|report|analiza|studiu)\b/i,
        cerere: /\b(cerere|solicitare|request|aplicatie)\b/i,
        proces: /\b(proces|verbal|minutes|protocol)\b/i,
        hotarare: /\b(hotarare|decizie|resolution|decree)\b/i,
        oficial: /\b(oficial|official|document|act)\b/i,
        financiar: /\b(financiar|buget|budget|cost|price)\b/i,
        legal: /\b(legal|juridic|lege|law|act)\b/i,
        medical: /\b(medical|sanatate|health|diagnostic)\b/i,
        educational: /\b(educatie|scoala|school|universitate|curs)\b/i,
        tehnic: /\b(tehnic|technical|manual|ghid|guide)\b/i
    };
    
    // Check filename against patterns
    Object.entries(patterns).forEach(([tag, pattern]) => {
        if (pattern.test(baseName)) {
            tags.push(tag);
        }
    });
    
    // Add date-based tags if found
    const yearMatch = baseName.match(/20\d{2}/);
    if (yearMatch) tags.push(`an_${yearMatch[0]}`);
    
    // Skip adding individual words from filename to avoid name pollution
    
    return [...new Set(tags)]; // Remove duplicates
}

// Function to generate tags from content
function generateTagsFromContent(text) {
    if (!text || text.length < 100) return [];
    
    const tags = [];
    
    // Enhanced keyword detection with domain-specific terms
    const domainKeywords = {
        juridic: ['contract', 'lege', 'articol', 'clauza', 'juridic', 'tribunal', 'instanta', 'drept', 'legal'],
        financiar: ['suma', 'lei', 'euro', 'pret', 'cost', 'buget', 'factura', 'plata', 'financiar', 'taxa'],
        medical: ['pacient', 'diagnostic', 'tratament', 'medicament', 'doctor', 'medical', 'sanatate', 'boala'],
        educational: ['elev', 'student', 'profesor', 'curs', 'lectie', 'materie', 'nota', 'examen', 'scoala'],
        administrative: ['aprobare', 'autorizatie', 'certificat', 'document', 'oficial', 'institutie', 'organ'],
        tehnic: ['specificatie', 'manual', 'procedura', 'metoda', 'tehnic', 'sistem', 'functie', 'parametru']
    };
    
    const textLower = text.toLowerCase();
    
    // Detect domain based on keyword frequency
    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
        const matches = keywords.filter(keyword => textLower.includes(keyword)).length;
        if (matches >= 2) { // At least 2 keywords from domain
            tags.push(domain);
        }
    });
    
    // Extract entities (numbers, dates, names)
    const entities = {
        has_numbers: /\b\d{3,}\b/.test(text),
        has_dates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(text),
        has_emails: /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text),
        has_phones: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)
    };
    
    Object.entries(entities).forEach(([entity, found]) => {
        if (found) tags.push(entity.replace('has_', 'contine_'));
    });
    
    // Refined word frequency analysis using simple tokenization
    const words = textLower.match(/\b[a-zăâîșț]{4,15}\b/g) || [];
    const stopWords = new Set(['sunt', 'este', 'aceasta', 'pentru', 'prin', 'fiind', 'astfel', 'foarte', 'toate', 'acest', 'poate', 'trebuie', 'asupra', 'conform', 'respectiv']);
    
    const frequency = {};
    words.forEach(word => {
        if (!stopWords.has(word) && word.length > 4 && word.length < 12) {
            frequency[word] = (frequency[word] || 0) + 1;
        }
    });
    
    // Get top meaningful words (minimum 3 occurrences, exclude common names)
    const excludeNames = new Set(['andrei', 'laurentiu', 'muncioiu', 'craiova', 'romania', 'romanian', 'english']);
    const meaningfulWords = Object.entries(frequency)
        .filter(([word, count]) => count >= 3 && !excludeNames.has(word))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([word]) => word);
    
    tags.push(...meaningfulWords);
    
    return [...new Set(tags.slice(0, 8))]; // Max 8 unique tags
}

// Function to process deleted PDF files from watched folders
async function processDeletedPDFFile(filePath, user, institutionPath) {
    try {
        console.log('\n🗑️ === PROCESSING DELETED PDF FILE DISABLED ===');
        console.log('📁 File path:', filePath);
        console.log('👤 User:', user.institution_name);
        console.log('📂 Institution path:', institutionPath);
        
        // TEMPORARILY DISABLED
        return;
        
        // Get file info
        const fileName = path.basename(filePath);
        
        console.log('📄 File name:', fileName);
        
        // Determine the folder path relative to institution
        const relativePath = path.relative(institutionPath, filePath);
        const targetFolder = path.dirname(relativePath);
        
        console.log('📂 Target folder:', targetFolder);
        console.log('📄 Relative path:', relativePath);
        
        // Construct the full target path in uploads
        let fullTargetPath;
        if (targetFolder === '.') {
            // File was in root institution folder
            fullTargetPath = user.institution_name;
        } else {
            fullTargetPath = path.join(user.institution_name, targetFolder);
        }
        
        console.log('📁 Full target path:', fullTargetPath);
        
        // Find and delete document from database
        console.log('💾 Deleting document from database...');
        const connection = await mysql.createConnection(dbConfig);
        
        try {
            // Find the document in database
            const [existingDocs] = await connection.execute(
                'SELECT id_document FROM table_document WHERE nom_document = ? AND path = ? AND id_user_source = ?',
                [fileName, fullTargetPath, user.id]
            );
            
            if (existingDocs.length === 0) {
                console.log('ℹ️ Document not found in database, skipping delete');
                return;
            }
            
            const docId = existingDocs[0].id_document;
            console.log('📄 Found document with ID:', docId);
            
            // Delete keywords
            await connection.execute(
                'DELETE FROM table_mot_cle WHERE id_document = ?',
                [docId]
            );
            console.log('✅ Keywords deleted for document:', docId);
            
            // Delete tag relations
            await connection.execute(
                'DELETE FROM document_tag_relations WHERE id_document = ?',
                [docId]
            );
            console.log('✅ Tag relations deleted for document:', docId);
            
            // Delete the document
            await connection.execute(
                'DELETE FROM table_document WHERE id_document = ?',
                [docId]
            );
            console.log('✅ Document deleted from database:', docId);
            
            // Emit WebSocket event for real-time updates
            if (socket && socket.connected) {
                const eventData = {
                    type: 'delete',
                    documentId: docId,
                    documentName: fileName,
                    documentPath: fullTargetPath,
                    sourceFolder: fullTargetPath,
                    userId: user.id,
                    institutionId: user.institution_id,
                    timestamp: new Date().toISOString(),
                    fromElectron: true
                };
                
                console.log('🔌 Emitting document delete event to WebSocket:', eventData);
                socket.emit('fileSystemChange', eventData);
            }
            
            // Notify UI about the deleted file
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('file-deleted', {
                    path: fullTargetPath,
                    folder: fullTargetPath, // Send full path instead of just folder name
                    institution: user.institution_name,
                    documentId: docId,
                    fileName: fileName
                });
            }
            
            // Refresh folder structure to reflect the deletion
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('get-folder-structure', {
                        institutionId: user.institution_id,
                        currentPath: targetFolder === '.' ? '' : targetFolder
                    });
                }
            }, 500);
            
            console.log('✅ PDF file deletion processed successfully');
            
        } finally {
            await connection.end();
        }
        
    } catch (error) {
        console.error('❌ Error processing deleted PDF file:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Notify UI about the error
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-error', `Failed to process deleted PDF file: ${error.message}`);
        }
    }
}

// Function to process new PDF files added to watched folders
async function processNewPDFFile(filePath, user, institutionPath) {
    try {
        console.log('📄 [AUTO-UPLOAD] Processing PDF file:', path.basename(filePath));
        
        // ENABLED for manual uploads only
        // Check if this is a manual upload (not from folder upload)
        
        // Get file info
        const fileName = path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Check if this file was recently created as part of a folder upload
        const fileCreationTime = fileStats.birthtime || fileStats.mtime;
        const timeSinceCreation = Date.now() - fileCreationTime.getTime();
        
        // Check if this file is part of a recent folder upload
        const fileDir = path.dirname(filePath);
        const now = Date.now();
        
        let isFromFolderUpload = false;
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                // Check if file is in the same directory as the uploaded folder
                if (fileDir.includes(data.folderName) || filePath.includes(data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - part of recent folder upload:', data.folderName);
                    isFromFolderUpload = true;
                    break;
                }
            }
        }
        
        if (isFromFolderUpload) {
            return;
        }
        
        // Additional check: if file is in a recently created folder structure, skip auto-upload
        const relativePath = path.relative(institutionPath, filePath);
        const pathParts = relativePath.split(path.sep);
        
        // Check if any part of the path matches a recently uploaded folder
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (pathParts.some(part => part === data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - file in recently uploaded folder structure:', data.folderName);
                    return;
                }
            }
        }
        
        // Additional check: if the file path contains a recently uploaded folder name, skip
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (filePath.includes(data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - file path contains recently uploaded folder:', data.folderName);
                    return;
                }
            }
        }
        
        // Additional check: if the target folder path contains a recently uploaded folder name, skip
        const targetFolderPathCheck = path.dirname(relativePath);
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (targetFolderPathCheck.includes(data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - target folder contains recently uploaded folder:', data.folderName);
                    return;
                }
            }
        }
        
        // Additional check: if the relative path contains a recently uploaded folder name, skip
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (relativePath.includes(data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - relative path contains recently uploaded folder:', data.folderName);
                    return;
                }
            }
        }
        
        // Additional check: if any part of the path matches a recently uploaded folder name, skip
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (pathParts.includes(data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - path parts contain recently uploaded folder:', data.folderName);
                    return;
                }
            }
        }
        
        // Additional check: if the file is in a recently created folder structure, skip auto-upload
        const relativePathCheck = path.relative(institutionPath, filePath);
        const pathPartsCheck = relativePathCheck.split(path.sep);
        
        // Check if any part of the path matches a recently uploaded folder
        for (const [key, data] of recentFolderUploads.entries()) {
            if (now - data.timestamp < FOLDER_UPLOAD_WINDOW) {
                if (pathPartsCheck.some(part => part === data.folderName)) {
                    console.log('⚠️ [AUTO-UPLOAD] Skipping - file in recently uploaded folder structure:', data.folderName);
                    return;
                }
            }
        }
        
        // If file was created less than 5 seconds ago, it might be from a folder upload
        if (timeSinceCreation < 5000) {
            console.log('⚠️ File was created recently (', timeSinceCreation, 'ms ago) - might be from folder upload');
            console.log('⚠️ Skipping auto-upload to prevent duplicate processing');
            return;
        }
        
        // Determine the target folder path relative to institution
        const targetFolder = path.dirname(relativePath);
        
        console.log('📂 Target folder:', targetFolder);
        console.log('📄 Relative path:', relativePath);
        
        // Ensure the target folder exists in the uploads directory
        const baseUploadsDir = process.env.UPLOADS_DIR;
        if (!baseUploadsDir) {
            throw new Error('UPLOADS_DIR environment variable not set');
        }
        
        // Construct the full target path in uploads
        let fullTargetPath;
        if (targetFolder === '.') {
            // File is in root institution folder
            fullTargetPath = user.institution_name;
        } else {
            fullTargetPath = path.join(user.institution_name, targetFolder);
        }
        
        const physicalTargetDir = path.join(baseUploadsDir, fullTargetPath);
        const physicalTargetFile = path.join(physicalTargetDir, fileName);
        
        // Ensure target directory exists
        if (!fs.existsSync(physicalTargetDir)) {
            fs.mkdirSync(physicalTargetDir, { recursive: true });
        }
        
        // Copy file to uploads directory if it doesn't exist there
        if (!fs.existsSync(physicalTargetFile)) {
            fs.copyFileSync(filePath, physicalTargetFile);
        }
        
        // ✅ ALSO COPY TO LOCAL INSTITUTION FOLDER for instant visibility
        const localInstitutionPath = getInstitutionPath(user.institution_name);
        const localTargetDir = path.join(localInstitutionPath, targetFolder);
        const localTargetFile = path.join(localTargetDir, fileName);
        
        // Ensure local target directory exists
        if (!fs.existsSync(localTargetDir)) {
            fs.mkdirSync(localTargetDir, { recursive: true });
        }
        
        // Copy file to local institution folder if it doesn't exist there
        if (!fs.existsSync(localTargetFile)) {
            fs.copyFileSync(filePath, localTargetFile);
            console.log('✅ [AUTO-UPLOAD] File copied to local institution folder:', localTargetFile);
        }
        
        // Extract text and keywords from PDF
        const extractedData = await extractTextFromPDF(filePath);
        const connection = await mysql.createConnection(dbConfig);
        
        try {
            // Check if document already exists in database
            const [existingDocs] = await connection.execute(
                'SELECT id_document FROM table_document WHERE nom_document = ? AND path = ? AND id_user_source = ?',
                [fileName, fullTargetPath, user.id]
            );
            
            if (existingDocs.length > 0) {
                return;
            }
            
            // Insert document into database
            const [docResult] = await connection.execute(
                `INSERT INTO table_document 
                (nom_document, path, id_user_source, comment, nom_document_original, 
                isVerfied, type_id, file_size, first_page, date_upload) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    fileName,
                    fullTargetPath,
                    user.id,
                    `Auto-uploaded via Sync Agent - ${new Date().toLocaleDateString('ro-RO')}`,
                    fileName,
                    1, // isVerified
                    1, // type_id (Official Document)
                    fileSize,
                    extractedData.firstPage // first page as base64 image
                ]
            );
            
            const docId = docResult.insertId;
            
            // Insert keywords if extracted (prefer content-based; fallback to filename)
            let finalKeywords = Array.isArray(extractedData.keywords) && extractedData.keywords.length
                ? extractedData.keywords.slice(0, 5)
                : generateTagsFromFilename(fileName).slice(0, 5);
            if (finalKeywords.length > 0) {
                await connection.execute(
                    `INSERT INTO table_mot_cle 
                    (id_document, mot1, mot2, mot3, mot4, mot5) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [docId, ...finalKeywords, ...Array(5 - finalKeywords.length).fill(null)]
                );
            }
            
            // Insert tags (prefer content-based; fallback to filename)
            let finalTags = Array.isArray(extractedData.tags) && extractedData.tags.length
                ? extractedData.tags.slice(0, 5)
                : generateTagsFromFilename(fileName).slice(0, 5);
            if (finalTags.length > 0) {
                for (const tag of finalTags) {
                    // Check if tag exists
                    const [existingTags] = await connection.execute(
                        'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                        [tag]
                    );
                    
                    let tagId;
                    if (existingTags.length === 0) {
                        // Insert new tag
                        const [tagResult] = await connection.execute(
                            'INSERT INTO document_tags (tag_name, created_by, is_predefined) VALUES (?, ?, 0)',
                            [tag, user.id]
                        );
                        tagId = tagResult.insertId;
                    } else {
                        tagId = existingTags[0].id_tag;
                    }
                    
                    // Create relation between document and tag
                    await connection.execute(
                        'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                        [docId, tagId, user.id]
                    );
                }
                // Tags inserted for document
            }
            
            // Emit WebSocket event for real-time updates
            if (socket && socket.connected) {
                const eventData = {
                    type: 'add',
                    documentId: docId,
                    documentName: fileName,
                    documentPath: fullTargetPath,
                    targetFolder: fullTargetPath,
                    userId: user.id,
                    institutionId: user.institution_id,
                    timestamp: new Date().toISOString(),
                    fromElectron: true
                };
                
                console.log('🔌 Emitting document add event to WebSocket:', eventData);
                socket.emit('fileSystemChange', eventData);
            }
            
            // Notify UI about the new file
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('file-added', {
                    path: fullTargetPath,
                    folder: fullTargetPath, // Send full path instead of just folder name
                    institution: user.institution_name,
                    documentId: docId,
                    fileName: fileName
                });
            }
            
            // Refresh folder structure to show the new file
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('get-folder-structure', {
                        institutionId: user.institution_id,
                        currentPath: targetFolder === '.' ? '' : targetFolder
                    });
                }
            }, 500);
            
            // New PDF file processed successfully
            
        } finally {
            await connection.end();
        }
        
    } catch (error) {
        console.error('❌ Error processing new PDF file:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Notify UI about the error
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-error', `Failed to process new PDF file: ${error.message}`);
        }
    }
}

// Function to process folder contents recursively
async function processFolderContents(sourcePath, targetPath, user, connection, baseUploadsDir, isRootFolder = false) {
    try {
        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Source folder does not exist: ${sourcePath}`);
        }

        const items = await fs.promises.readdir(sourcePath, { withFileTypes: true });
        console.log(`Processing ${items.length} items in ${sourcePath}`);
        console.log(`Is root folder: ${isRootFolder}`);

        for (const item of items) {
            const sourceItemPath = path.join(sourcePath, item.name);
            const targetItemPath = path.join(targetPath, item.name);
            console.log(`Processing item: ${item.name}`);

            if (item.isDirectory()) {
                    // For root folder processing, skip creating the main folder itself
                    // since it was already created in the add-folder handler
                    if (isRootFolder && targetPath.endsWith(item.name)) {
                        // Skip main folder creation
                    } else {
                        // Check if this subfolder already exists in database
                        const [existingSubfolders] = await connection.execute(
                            'SELECT id FROM folders WHERE folder_path = ? AND institution_id = ?',
                            [targetItemPath, user.institution_id]
                        );

                        if (existingSubfolders.length === 0) {
                            // Create subfolder in database only if it doesn't exist
                const [result] = await connection.execute(
                    'INSERT INTO folders (folder_name, folder_path, institution_id, created_by, is_private) VALUES (?, ?, ?, ?, ?)',
                    [item.name, targetItemPath, user.institution_id, user.id, 1]
                );
                        }
                    }

                // Create physical subfolder
                const physicalSubfolderPath = path.join(baseUploadsDir, targetItemPath);
                if (!fs.existsSync(physicalSubfolderPath)) {
                    fs.mkdirSync(physicalSubfolderPath, { recursive: true });
                }

                // Process subfolder contents recursively
                await processFolderContents(sourceItemPath, targetItemPath, user, connection, baseUploadsDir, false);
            } else if (item.isFile() && item.name.toLowerCase().endsWith('.pdf')) {
                try {
                    // Get file stats for size
                    const stats = await fs.promises.stat(sourceItemPath);
                    const fileSize = stats.size;

                    // Create physical file path
                    const physicalFilePath = path.join(baseUploadsDir, targetItemPath);
                    const targetDir = path.dirname(physicalFilePath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    // Copy the file to the target location
                    fs.copyFileSync(sourceItemPath, physicalFilePath);
                    
                    // ✅ ALSO COPY TO LOCAL INSTITUTION FOLDER for instant visibility
                    const isPersonalLocal = !user.institution_id || user.institution_name == null;
                    const localRootName = isPersonalLocal ? (user.personal_folder_name || '') : (user.institution_name || '');
                    const localInstitutionPath = getInstitutionPath(localRootName);
                    const localTargetDir = path.join(localInstitutionPath, targetPath);
                    const localTargetFile = path.join(localTargetDir, item.name);
                    
                    // Ensure local target directory exists
                    if (!fs.existsSync(localTargetDir)) {
                        fs.mkdirSync(localTargetDir, { recursive: true });
                    }
                    
                    // Copy file to local institution folder if it doesn't exist there
                    if (!fs.existsSync(localTargetFile)) {
                        fs.copyFileSync(sourceItemPath, localTargetFile);
                        console.log('✅ [FOLDER UPLOAD] File copied to local institution folder:', localTargetFile);
                    }

                    // Extract keywords and tags from PDF content
                    const extractedData = await extractTextFromPDF(sourceItemPath);

                    // Insert document record in database
                    const [docResult] = await connection.execute(
                        `INSERT INTO table_document 
                        (nom_document, path, id_user_source, comment, nom_document_original, 
                        isVerfied, type_id, file_size, first_page, date_upload) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            item.name,
                            targetPath,
                            user.id,
                            'Uploaded via DMSBox',
                            item.name,
                            1, // isVerified
                            1, // type_id (Official Document)
                            fileSize,
                            extractedData.firstPage // first page as base64 image
                        ]
                    );

                    const docId = docResult.insertId;
                    console.log('Document inserted with ID:', docId);

                    // Insert keywords if any were extracted
                    if (extractedData.keywords && extractedData.keywords.length > 0) {
                        const keywords = extractedData.keywords.slice(0, 5);
                        await connection.execute(
                            `INSERT INTO table_mot_cle 
                            (id_document, mot1, mot2, mot3, mot4, mot5) 
                            VALUES (?, ?, ?, ?, ?, ?)`,
                            [docId, ...keywords, ...Array(5 - keywords.length).fill(null)]
                        );
                        console.log('Keywords inserted for document:', docId);
                    }

                    // Insert tags
                    if (extractedData.tags && extractedData.tags.length > 0) {
                        for (const tag of extractedData.tags) {
                            // First check if tag exists
                            const [existingTags] = await connection.execute(
                                'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                                [tag]
                            );

                            let tagId;
                            if (existingTags.length === 0) {
                                // Insert new tag
                                const [tagResult] = await connection.execute(
                                    'INSERT INTO document_tags (tag_name, created_by, is_predefined) VALUES (?, ?, 0)',
                                    [tag, user.id]
                                );
                                tagId = tagResult.insertId;
                            } else {
                                tagId = existingTags[0].id_tag;
                            }

                            // Create relation between document and tag
                            await connection.execute(
                                'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                                [docId, tagId, user.id]
                            );
                        }
                        console.log('Tags inserted for document:', docId);
                    }

                    // Notify UI about the new file
                    mainWindow.webContents.send('file-added', {
                        path: targetItemPath,
                        folder: targetPath, // Send full path instead of just folder name
                        institution: user.institution_name
                    });

                    // Emit WebSocket event for real-time file addition
                    if (socket && socket.connected) {
                        const eventData = {
                            type: 'add',
                            documentId: docId,
                            documentName: item.name,
                            documentPath: targetPath,
                            userId: user.id,
                            institutionId: user.institution_id,
                            timestamp: new Date().toISOString(),
                            targetFolder: targetPath,  // ✅ KEEP PATH COMPLET
                            targetPath: physicalFilePath
                        };
                        
                        console.log('🔌 [MAIN] Emitting file add event to WebSocket:', eventData);
                        socket.emit('fileSystemChange', eventData);
                        console.log('🔌 [MAIN] WebSocket event emitted successfully');
                    } else {
                        console.warn('🔌 [MAIN] No socket available or not connected for WebSocket event');
                    }

                } catch (fileError) {
                    console.error(`Error processing file ${item.name}:`, fileError);
                    // Continue with other files
                }
            }
        }
    } catch (error) {
        console.error('Error processing folder contents:', error);
        throw error;
    }
} 

// Add this before creating the main window
app.on('ready', () => {
    // Fix for macOS text input context
    if (process.platform === 'darwin') {
        app.commandLine.appendSwitch('disable-features', 'TextInputContext');
    }
    
    // Set the correct uploads directory path
    const projectRoot = path.resolve(__dirname, '..');
    const uploadsDir = path.join(projectRoot, 'back-end', 'uploads');
    process.env.UPLOADS_DIR = uploadsDir;
    
    console.log('Project root:', projectRoot);
    console.log('Uploads directory set to:', uploadsDir);
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory:', uploadsDir);
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Initialize WebSocket connection
    connectWebSocket();
    
    // ... rest of your window creation code ...
});

// ... existing code ... 
// ... existing code ... 

// Add handler for manual document sync
ipcMain.handle('sync-documents', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            return { success: false, message: 'User not authenticated' };
        }
        
        console.log('🔄 Manual document sync started for:', user.institution_name);
        
        const institutionPath = getInstitutionPath(user.institution_name);
        if (!fs.existsSync(institutionPath)) {
            return { success: false, message: 'Institution folder does not exist' };
        }
        
        // Re-download all documents and folder structure
        await downloadInstitutionStructure(user, institutionPath);
        
        // Show success message
        await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Sincronizare Completă',
            message: 'Documentele au fost sincronizate cu succes!',
            detail: `Toate documentele și folderele au fost actualizate în:\n${institutionPath}`
        });
        
        return { success: true, message: 'Documents synced successfully' };
    } catch (error) {
        console.error('Error syncing documents:', error);
        
        await dialog.showErrorBox(
            'Eroare Sincronizare',
            `Nu am putut sincroniza documentele: ${error.message}`
        );
        
        return { success: false, message: error.message };
    }
});

// Add IPC handlers for file operations needed by renderer
ipcMain.handle('fileExists', async (event, filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        console.error('Error checking file existence:', error);
        return false;
    }
});

ipcMain.handle('ensureDirectoryExists', async (event, dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log('Created directory:', dirPath);
        }
        return true;
    } catch (error) {
        console.error('Error creating directory:', error);
        return false;
    }
});

ipcMain.handle('moveFile', async (event, sourcePath, destPath) => {
    try {
        await fs.promises.rename(sourcePath, destPath);
        console.log('File moved from', sourcePath, 'to', destPath);
        return true;
    } catch (error) {
        console.error('Error moving file:', error);
        return false;
    }
});

ipcMain.handle('writeFile', async (event, filePath, buffer) => {
    try {
        await fs.promises.writeFile(filePath, Buffer.from(buffer));
        console.log('File written to:', filePath);
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        return false;
    }
});

ipcMain.handle('getDocDiLPath', async () => {
    try {
        return getDocDiLPath();
    } catch (error) {
        console.error('Error getting DocDiL path:', error);
        return null;
    }
});

// Add handler for testing folder loading (WITHOUT build)
ipcMain.handle('test-load-folders', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            return { success: false, message: 'User not authenticated' };
        }
        
        console.log('🧪 TESTING: Loading folders via HTTP API...');
        console.log('🧪 User data:', { 
            id: user.id, 
            institution_id: user.institution_id, 
            institution_name: user.institution_name,
            hasCookie: !!user.sessionCookie
        });
        
        const config = getAxiosConfig();
        console.log('🧪 Request config:', config);
        
        const response = await axios.get(`${API_URL}/post_docs/folders`, config);
        
        console.log('🧪 HTTP Response:', {
            status: response.status,
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            length: response.data ? response.data.length : 0,
            firstItem: response.data?.[0]
        });
        
        // Extract folders array from response object
        const foldersArray = response.data.folders || response.data;
        console.log('🧪 Extracted folders:', Array.isArray(foldersArray), foldersArray?.length);
        
        if (foldersArray && Array.isArray(foldersArray)) {
            const userFolders = foldersArray.filter(folder => 
                folder.institution_id === user.institution_id
            );
            
            console.log('🧪 Filtered folders for user:', userFolders.length);
            console.log('🧪 Sample folders:', userFolders.slice(0, 3));
            
            return { 
                success: true, 
                folders: userFolders,
                total: foldersArray.length,
                filtered: userFolders.length
            };
        }
        
        return { success: false, message: 'No folders data received' };
    } catch (error) {
        console.error('🧪 Test folder loading error:', error);
        return { 
            success: false, 
            message: error.message,
            details: error.response?.data
        };
    }
});

// Add handler for loading documents for a specific folder
ipcMain.handle('load-documents-for-folder', async (event, folderPath) => {
    try {
        const user = store.get('user');
        if (!user) {
            return { success: false, message: 'User not authenticated' };
        }
        
        console.log('📄 Loading documents for folder:', folderPath);
        
        // Check if user is a personal user (no institution)
        const isPersonalAccount = !user.institution_id;
        
        if (isPersonalAccount) {
            console.log('👤 Personal account detected, loading personal documents for folder:', folderPath);
            const personalDocuments = await loadPersonalFolderDocuments(folderPath, user);
            return {
                success: true,
                documents: personalDocuments,
                total: personalDocuments.length
            };
        }
        
        // For institutional users, use the existing logic
        const headers = getHttpHeaders();
        const encodedPath = encodeURIComponent(folderPath || '');
        const response = await axios.get(`${API_URL}/post_docs/documents/folder/${encodedPath}`, {
            headers: headers
        });
        
        console.log('📄 Documents API response:', {
            status: response.status,
            dataLength: response.data?.documents?.length || 0,
            data: response.data
        });
        
        // Extract documents array from response (already filtered by folder on server)
        const documentsArray = response.data.documents || [];
        
        console.log('📄 Extracted documents array:', {
            isArray: Array.isArray(documentsArray),
            length: documentsArray.length,
            documents: documentsArray
        });
        
        if (Array.isArray(documentsArray)) {
            // Process documents to ensure all fields are included
            const processedDocuments = documentsArray.map(doc => ({
                ...doc,
                comment: doc.comment || '',
                keywords: doc.keywords || [],
                mot1: doc.mot1 || '',
                mot2: doc.mot2 || '',
                mot3: doc.mot3 || '',
                mot4: doc.mot4 || '',
                mot5: doc.mot5 || ''
            }));
            
            return {
                success: true,
                documents: processedDocuments,
                total: processedDocuments.length
            };
        }
        
        return { success: true, documents: [], total: 0 };
        
    } catch (error) {
        console.error('❌ Error loading documents for folder:', error.message);
        return { 
            success: false, 
            message: error.message,
            documents: []
        };
    }
});

// Add handler for testing document loading (WITHOUT build)  
ipcMain.handle('test-load-documents', async () => {
    try {
        const user = store.get('user');
        if (!user) {
            return { success: false, message: 'User not authenticated' };
        }
        
        console.log('🧪 TESTING: Loading documents via HTTP API...');
        
        const response = await axios.get(`${API_URL}/post_docs/documents`, getAxiosConfig());
        
        console.log('🧪 Documents HTTP Response:', {
            status: response.status,
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            length: response.data ? response.data.length : 0
        });
        
        // Extract documents array from response object
        const documentsArray = response.data.documents || response.data;
        console.log('🧪 Extracted documents:', Array.isArray(documentsArray), documentsArray?.length);
        
        if (documentsArray && Array.isArray(documentsArray)) {
            const userDocuments = documentsArray.filter(doc => 
                doc.id_institution === user.institution_id
            );
            
            console.log('🧪 Filtered documents for user:', userDocuments.length);
            console.log('🧪 Sample documents:', userDocuments.slice(0, 3));
            
            return { 
                success: true, 
                documents: userDocuments,
                total: response.data.length,
                filtered: userDocuments.length
            };
        }
        
        return { success: false, message: 'No documents data received' };
    } catch (error) {
        console.error('🧪 Test document loading error:', error);
        return { 
            success: false, 
            message: error.message,
            details: error.response?.data
        };
    }
});

// Add handler for checking if institution folder exists

// TEST: Verify handlers are registered
console.log('🔧 [MAIN] === TESTING IPC HANDLER REGISTRATION ===');
console.log('🔧 [MAIN] Total IPC listeners:', Object.keys(ipcMain._events || {}).length);
console.log('🔧 [MAIN] IPC event names:', Object.keys(ipcMain._events || {}));

// TEST: Try emitting test event
setTimeout(() => {
    console.log('🧪 [MAIN] Testing add-folder handler after 3 seconds...');
    if (ipcMain.listenerCount('add-folder') > 0) {
        console.log('✅ [MAIN] add-folder handler is registered!', ipcMain.listenerCount('add-folder'), 'listeners');
    } else {
        console.log('❌ [MAIN] add-folder handler NOT registered!');
    }
}, 3000);