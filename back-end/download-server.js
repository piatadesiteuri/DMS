const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Serve Electron app downloads
app.use('/downloads', express.static(path.join(__dirname, 'public/downloads'), {
    setHeaders: (res, filePath) => {
        // Set appropriate headers for different file types
        if (filePath.endsWith('.dmg')) {
            res.set('Content-Type', 'application/octet-stream');
        } else if (filePath.endsWith('.exe')) {
            res.set('Content-Type', 'application/octet-stream');
        } else if (filePath.endsWith('.AppImage')) {
            res.set('Content-Type', 'application/octet-stream');
        } else if (filePath.endsWith('.deb')) {
            res.set('Content-Type', 'application/vnd.debian.binary-package');
        }
        res.set('Access-Control-Allow-Origin', '*');
    }
}));

// Download page route
app.get('/download-app', (req, res) => {
    const downloadPageHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download EDMS Sync Agent</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                max-width: 900px;
                margin: 0 auto;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
                font-size: 2.5em;
                font-weight: 300;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 40px;
                font-size: 1.2em;
            }
            .download-section {
                margin: 30px 0;
                padding: 25px;
                border: 2px solid #f0f0f0;
                border-radius: 15px;
                transition: all 0.3s ease;
            }
            .download-section:hover {
                border-color: #667eea;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
            }
            .download-section h3 {
                margin-top: 0;
                color: #333;
                font-size: 1.5em;
            }
            .download-btn {
                display: inline-block;
                padding: 15px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 50px;
                margin: 10px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            .download-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                color: white;
                text-decoration: none;
            }
            .instructions {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin: 30px 0;
            }
            .instructions h3 {
                margin-top: 0;
                color: white;
            }
            .system-info {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin: 30px 0;
            }
            .system-info h3 {
                margin-top: 0;
                color: white;
            }
            .warning {
                background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                color: #8B4513;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .feature-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .feature {
                text-align: center;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .feature-icon {
                font-size: 2em;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 EDMS Sync Agent</h1>
            <p class="subtitle">Sincronizare automată de documente pentru desktop</p>
            
            <div class="feature-list">
                <div class="feature">
                    <div class="feature-icon">🔄</div>
                    <h4>Sincronizare Real-time</h4>
                    <p>Modificările se reflectă instant</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🖱️</div>
                    <h4>Drag & Drop</h4>
                    <p>Uploadeaza prin simpla tragere</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">👥</div>
                    <h4>Multi-User</h4>
                    <p>Mai mulți utilizatori simultan</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h4>Securitate</h4>
                    <p>Autentificare sigură</p>
                </div>
            </div>

            <div class="system-info">
                <h3>🖥️ Cerințe de Sistem</h3>
                <p><strong>Windows:</strong> Windows 10 sau mai nou (x64)</p>
                <p><strong>macOS:</strong> macOS 10.14 sau mai nou (Intel & Apple Silicon)</p>
                <p><strong>Linux:</strong> Ubuntu 18.04 sau echivalent</p>
            </div>

            <div class="download-section">
                <h3>🍎 macOS</h3>
                <p>Alege versiunea potrivită pentru Mac-ul tău:</p>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-mac-x64.dmg" class="download-btn">💻 Intel Mac (.dmg)</a>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-mac-arm64.dmg" class="download-btn">🚀 Apple Silicon (.dmg)</a>
                <br>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-mac-x64.zip" class="download-btn">📦 Intel Mac (.zip)</a>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-mac-arm64.zip" class="download-btn">📦 Apple Silicon (.zip)</a>
            </div>

            <div class="download-section">
                <h3>🐧 Linux</h3>
                <p>Alege formatul de pachet preferat:</p>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-linux-x86_64.AppImage" class="download-btn">🎯 AppImage (Universal)</a>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-linux-amd64.deb" class="download-btn">📦 DEB Package</a>
            </div>

            <div class="download-section">
                <h3>🪟 Windows</h3>
                <p>Alege formatul preferat pentru Windows:</p>
                <a href="/downloads/EDMS_Sync_Agent_Latest.exe" class="download-btn">💼 Portable (.exe) - Latest Build 2025-08-25 08:46</a>
                <a href="/downloads/EDMS%20Sync%20Agent-1.0.0-win-x64.zip" class="download-btn">📦 ZIP Archive (.zip)</a>
            </div>

            <div class="instructions">
                <h3>📋 Instrucțiuni de Instalare</h3>
                <ol>
                    <li><strong>Descarcă</strong> versiunea potrivită pentru sistemul tău</li>
                    <li><strong>Instalează</strong> aplicația folosind installer-ul descărcat</li>
                    <li><strong>Lansează</strong> EDMS Sync Agent din meniul aplicațiilor</li>
                    <li><strong>Loghează-te</strong> cu credențialele tale EDMS</li>
                    <li><strong>Începe sincronizarea</strong> automată a documentelor</li>
                </ol>
                
                <h4>🔒 Suport Multi-User</h4>
                <p>Fiecare utilizator poate instala și rula propria instanță a aplicației. Mai mulți utilizatori pot fi conectați simultan, fiecare cu propriile date și setări.</p>
            </div>

            <div class="system-info">
                <h3>💡 Ai nevoie de ajutor?</h3>
                <p>Dacă întâmpini probleme la instalare sau utilizare:</p>
                <ul>
                    <li>Contactează administratorul de sistem</li>
                    <li>Verifică că ai conexiune la internet</li>
                    <li>Asigură-te că ai credențiale EDMS valide</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(downloadPageHTML);
});

// API endpoint to list available downloads
app.get('/api/downloads/list', (req, res) => {
    try {
        const distPath = path.join(__dirname, 'sync-agent-dist');
        if (!fs.existsSync(distPath)) {
            return res.json({ available: false, message: 'No builds available' });
        }

        const files = fs.readdirSync(distPath).filter(file => {
            return file.endsWith('.exe') || file.endsWith('.dmg') || 
                   file.endsWith('.AppImage') || file.endsWith('.deb') || 
                   file.endsWith('.rpm') || file.endsWith('.zip');
        });

        const fileDetails = files.map(file => {
            const filePath = path.join(distPath, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: Math.round(stats.size / (1024 * 1024) * 100) / 100 + ' MB',
                modified: stats.mtime.toISOString(),
                downloadUrl: `/downloads/${encodeURIComponent(file)}`
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/download-app');
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EDMS Download Server running on http://0.0.0.0:${PORT}`);
    console.log(`📱 Download page: http://192.168.0.13:${PORT}/download-app`);
    console.log(`📊 API endpoint: http://192.168.0.13:${PORT}/api/downloads/list`);
    console.log(`🌐 Also accessible on: http://localhost:${PORT}/download-app`);
}); 