const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Main route - redirect to download page
app.get('/', (req, res) => {
    res.redirect('/download-app');
});

// Download app page
app.get('/download-app', (req, res) => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');
    
    // Get available files
    let portableFile = null;
    let zipFile = null;
    let portableSize = 0;
    let zipSize = 0;
    
    try {
        const files = fs.readdirSync(downloadsDir);
        
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            const stats = fs.statSync(filePath);
            
            // Check for EXE files (latest version or portable)
            if (file.endsWith('.exe')) {
                const currentSize = Math.round(stats.size / (1024 * 1024));
                
                // Prioritize specific version files over generic portable
                if (file.includes('EDMS Sync Agent 1.0.0.exe') || 
                    (file.toLowerCase().includes('portable') && !portableFile)) {
                    portableFile = file;
                    portableSize = currentSize;
                } else if (file.toLowerCase().includes('portable') && file.includes('6.2.0') && currentSize < 120) {
                    // Keep as fallback if no 1.0.0 version found
                    if (!portableFile || !portableFile.includes('1.0.0')) {
                        portableFile = file;
                        portableSize = currentSize;
                    }
                }
            } else if (file.endsWith('.zip')) {
                // Prioritize files with version numbers (6.2.0)
                if (!zipFile || file.includes('6.2.0')) {
                    zipFile = file;
                    zipSize = Math.round(stats.size / (1024 * 1024));
                }
            }
        });
    } catch (error) {
        console.error('Error reading downloads directory:', error);
    }

    const html = `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EDMS Sync Agent - Descărcare</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container { 
                max-width: 900px; 
                width: 100%;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                color: white;
                padding: 40px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="20" cy="80" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                opacity: 0.3;
            }
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            .header p {
                font-size: 1.2rem;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }
            .content {
                padding: 40px;
            }
            .download-section {
                text-align: center;
                margin-bottom: 30px;
            }
            .download-section h2 {
                color: #2d3748;
                margin-bottom: 15px;
                font-size: 1.8rem;
            }
            .download-section p {
                color: #4a5568;
                margin-bottom: 30px;
                font-size: 1.1rem;
            }
            .download-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            .download-card {
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 15px;
                padding: 30px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .download-card:hover {
                border-color: #4299e1;
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            }
            .download-card .icon {
                font-size: 3rem;
                color: #4299e1;
                margin-bottom: 20px;
            }
            .download-card h3 {
                color: #2d3748;
                margin-bottom: 10px;
                font-size: 1.4rem;
            }
            .download-card .size {
                color: #718096;
                font-size: 0.9rem;
                margin-bottom: 20px;
            }
            .download-btn {
                display: inline-block;
                padding: 15px 30px;
                background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                font-size: 1rem;
            }
            .download-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(66, 153, 225, 0.4);
            }
            .download-btn.secondary {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            }
            .download-btn.secondary:hover {
                box-shadow: 0 8px 20px rgba(72, 187, 120, 0.4);
            }
            .info-section {
                background: #f7fafc;
                border-radius: 15px;
                padding: 30px;
                margin-top: 30px;
            }
            .info-section h3 {
                color: #2d3748;
                margin-bottom: 15px;
                font-size: 1.3rem;
            }
            .info-list {
                list-style: none;
                color: #4a5568;
            }
            .info-list li {
                margin-bottom: 10px;
                padding-left: 25px;
                position: relative;
            }
            .info-list li::before {
                content: '✓';
                position: absolute;
                left: 0;
                color: #48bb78;
                font-weight: bold;
            }
            .status {
                text-align: center;
                margin-top: 20px;
                padding: 15px;
                border-radius: 10px;
                font-weight: 500;
            }
            .status.success {
                background: #c6f6d5;
                color: #22543d;
            }
            .status.warning {
                background: #fefcbf;
                color: #744210;
            }
            @media (max-width: 768px) {
                .container { margin: 10px; }
                .header { padding: 30px 20px; }
                .content { padding: 20px; }
                .header h1 { font-size: 2rem; }
                .download-options { grid-template-columns: 1fr; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1><i class="fas fa-sync-alt"></i> EDMS Sync Agent</h1>
                <p>Aplicația de sincronizare pentru sistemul EDMS</p>
            </div>
            
            <div class="content">
                <div class="download-section">
                    <h2>Descărcați aplicația</h2>
                    <p>Alegeți versiunea potrivită pentru sistemul dumneavoastră Windows</p>
                </div>
                
                <div class="download-options">
                    ${portableFile ? `
                    <div class="download-card">
                        <div class="icon">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <h3>EDMS Sync Agent v1.0.0</h3>
                        <div class="size">${portableSize} MB</div>
                        <p>Ultima versiune cu sincronizare bidirectionlă îmbunătățită. Nu necesită instalare.</p>
                        <a href="/download-portable" class="download-btn">
                            <i class="fas fa-download"></i> Descarcă EXE
                        </a>
                    </div>
                    ` : ''}
                    
                    ${zipFile ? `
                    <div class="download-card">
                        <div class="icon">
                            <i class="fas fa-archive"></i>
                        </div>
                        <h3>Versiune ZIP</h3>
                        <div class="size">${zipSize} MB</div>
                        <p>Arhivă completă cu toate fișierele. Dezarhivați și rulați aplicația.</p>
                        <a href="/download-zip" class="download-btn secondary">
                            <i class="fas fa-file-archive"></i> Descarcă ZIP
                        </a>
                    </div>
                    ` : ''}
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-info-circle"></i> Instrucțiuni de instalare</h3>
                    <ul class="info-list">
                        <li>Descărcați versiunea dorită (EXE sau ZIP)</li>
                        <li>Pentru EXE: Rulați direct fișierul descărcat</li>
                        <li>Pentru ZIP: Dezarhivați și rulați "EDMS Sync Agent.exe"</li>
                        <li>Logați-vă cu credențialele EDMS existente</li>
                        <li>Aplicația va crea automat folderul de sincronizare</li>
                        <li>Copiați documentele în folderul creat pentru sincronizare</li>
                    </ul>
                </div>
                
                <div class="info-section">
                    <h3><i class="fas fa-folder"></i> Locația folderului de sincronizare</h3>
                    <ul class="info-list">
                        <li>Windows: <code>C:\\Users\\[NumeleUtilizatorului]\\Documents\\DocDiL\\[NumeleInstitutiei]</code></li>
                        <li>Folderul se creează automat după primul login</li>
                        <li>Orice document plasat în folder se sincronizează automat</li>
                        <li>Monitorizare în timp real a modificărilor</li>
                    </ul>
                </div>
                
                ${!portableFile && !zipFile ? `
                <div class="status warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    Nu sunt disponibile fișiere pentru descărcare momentan.
                </div>
                ` : `
                <div class="status success">
                    <i class="fas fa-check-circle"></i>
                    Aplicația este disponibilă pentru descărcare! Ultima actualizare: ${new Date().toLocaleDateString('ro-RO')}
                </div>
                `}
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
});

// Download routes
app.get('/download-portable', (req, res) => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');
    
    try {
        const files = fs.readdirSync(downloadsDir);
        
        // Find EXE file with prioritized search for latest version
        let portableFile = null;
        files.forEach(file => {
            if (file.endsWith('.exe')) {
                // Prioritize EDMS Sync Agent 1.0.0.exe over other versions
                if (file.includes('EDMS Sync Agent 1.0.0.exe')) {
                    portableFile = file;
                } else if (file.toLowerCase().includes('portable') && !portableFile) {
                    portableFile = file;
                } else if (file.includes('6.2.0') && !portableFile) {
                    portableFile = file;
                }
            }
        });
        
        if (portableFile) {
            const filePath = path.join(downloadsDir, portableFile);
            res.download(filePath, 'EDMS-Sync-Agent-Portable.exe');
        } else {
            res.status(404).send('Fișierul portabil nu a fost găsit');
        }
    } catch (error) {
        console.error('Error downloading portable file:', error);
        res.status(500).send('Eroare la descărcarea fișierului');
    }
});

app.get('/download-zip', (req, res) => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');
    
    try {
        const files = fs.readdirSync(downloadsDir);
        
        // Find ZIP file, prioritize 6.2.0
        let zipFile = null;
        files.forEach(file => {
            if (file.endsWith('.zip')) {
                if (!zipFile || file.includes('6.2.0')) {
                    zipFile = file;
                }
            }
        });
        
        if (zipFile) {
            const filePath = path.join(downloadsDir, zipFile);
            res.download(filePath, 'EDMS-Sync-Agent.zip');
        } else {
            res.status(404).send('Fișierul ZIP nu a fost găsit');
        }
    } catch (error) {
        console.error('Error downloading ZIP file:', error);
        res.status(500).send('Eroare la descărcarea fișierului');
    }
});

// Health check
app.get('/status', (req, res) => {
    const downloadsDir = path.join(__dirname, 'public', 'downloads');
    
    try {
        const files = fs.readdirSync(downloadsDir);
        res.json({
            status: 'OK',
            files: files.map(file => {
                const filePath = path.join(downloadsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    size: stats.size,
                    modified: stats.mtime
                };
            })
        });
    } catch (error) {
        res.status(500).json({ status: 'Error', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Download server running on http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://192.168.0.13:${PORT}`);
    console.log(`📁 Downloads page: http://192.168.0.13:${PORT}/download-app`);
    console.log(`📊 Status page: http://192.168.0.13:${PORT}/status`);
}); 