const fs = require('fs');
const path = require('path');

// Script to deploy the built executable to downloads directory
async function deployToDownloads() {
    console.log('🚀 === DEPLOYING TO DOWNLOADS ===');
    
    const sourceFile = path.join(__dirname, 'dist', 'EDMS Sync Agent 1.0.0.exe');
    const downloadsDir = path.join(__dirname, '..', 'back-end', 'public', 'downloads');
    const targetFile = path.join(downloadsDir, 'EDMS_Sync_Agent_Latest.exe');
    
    console.log('📁 Source file:', sourceFile);
    console.log('📁 Downloads directory:', downloadsDir);
    console.log('📁 Target file:', targetFile);
    
    // Check if source file exists
    if (!fs.existsSync(sourceFile)) {
        console.error('❌ Source file does not exist:', sourceFile);
        return;
    }
    
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
        console.log('✅ Created downloads directory');
    }
    
    try {
        // Copy the file
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ File copied successfully');
        
        // Get file stats
        const stats = fs.statSync(targetFile);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log('📊 File size:', fileSizeInMB, 'MB');
        console.log('📅 Last modified:', stats.mtime);
        
        // Create a version info file
        const versionInfo = {
            version: '1.0.0',
            buildDate: new Date().toISOString(),
            fileName: 'EDMS_Sync_Agent_Latest.exe',
            fileSize: stats.size,
            fileSizeMB: fileSizeInMB,
            features: [
                'Auto-upload for PDF files',
                'Auto-delete for removed files',
                'Real-time synchronization',
                'Keywords and tags generation',
                'Thumbnail generation',
                'Cross-platform support (Windows, macOS, Linux)',
                'Folder structure synchronization',
                'Database integration'
            ],
            changelog: [
                'Fixed auto-upload functionality',
                'Improved file detection with chokidar',
                'Enhanced error handling',
                'Added configuration system',
                'Fixed thumbnail generation issues',
                'Improved UI responsiveness'
            ]
        };
        
        const versionFile = path.join(downloadsDir, 'version.json');
        fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
        console.log('✅ Version info created:', versionFile);
        
        console.log('🎉 Deployment completed successfully!');
        console.log('📥 Download URL: http://192.168.0.13:3000/download-app');
        
        // Update download page with latest date
        console.log('🔄 Updating download page...');
        const { execSync } = require('child_process');
        try {
            execSync('node update-download-page.js', { stdio: 'inherit' });
            console.log('✅ Download page updated with latest build date');
        } catch (error) {
            console.warn('⚠️ Could not update download page:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error copying file:', error);
    }
}

deployToDownloads().catch(console.error);
