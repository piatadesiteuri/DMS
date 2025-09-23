const fs = require('fs');
const path = require('path');

// Script to update the download page with latest build date
async function updateDownloadPage() {
    console.log('🔄 === UPDATING DOWNLOAD PAGE ===');
    
    try {
        // Read version info
        const versionPath = path.join(__dirname, '..', 'back-end', 'public', 'downloads', 'version.json');
        const downloadServerPath = path.join(__dirname, '..', 'back-end', 'download-server.js');
        
        if (!fs.existsSync(versionPath)) {
            console.error('❌ Version file not found:', versionPath);
            return;
        }
        
        const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        console.log('📊 Version info:', versionInfo);
        
        // Read download server file
        let downloadServerContent = fs.readFileSync(downloadServerPath, 'utf8');
        
        // Extract date from buildDate
        const buildDate = new Date(versionInfo.buildDate);
        const formattedDate = buildDate.toISOString().slice(0, 10).replace(/-/g, '-');
        const formattedTime = buildDate.toTimeString().slice(0, 5);
        const displayDate = `${formattedDate} ${formattedTime}`;
        
        console.log('📅 Formatted date:', displayDate);
        
        // Update the download link and date
        const oldPattern = /\/downloads\/EDMS%20Sync%20Agent%201\.0\.0\.exe.*?Latest Build \d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
        const newLink = `/downloads/EDMS_Sync_Agent_Latest.exe" class="download-btn">💼 Portable (.exe) - Latest Build ${displayDate}`;
        
        if (oldPattern.test(downloadServerContent)) {
            downloadServerContent = downloadServerContent.replace(oldPattern, newLink);
            console.log('✅ Updated download link and date');
        } else {
            // If pattern not found, try to find and replace just the date
            const datePattern = /Latest Build \d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
            if (datePattern.test(downloadServerContent)) {
                downloadServerContent = downloadServerContent.replace(datePattern, `Latest Build ${displayDate}`);
                console.log('✅ Updated date only');
            } else {
                console.log('⚠️ Could not find date pattern to replace');
            }
        }
        
        // Write back to file
        fs.writeFileSync(downloadServerPath, downloadServerContent);
        console.log('✅ Download page updated successfully');
        
        // Show summary
        console.log('\n📋 UPDATE SUMMARY:');
        console.log('📅 Build date:', displayDate);
        console.log('📁 File:', versionInfo.fileName);
        console.log('📊 Size:', versionInfo.fileSizeMB, 'MB');
        console.log('🔗 Download URL: http://192.168.0.13:3000/download-app');
        
    } catch (error) {
        console.error('❌ Error updating download page:', error);
    }
}

updateDownloadPage().catch(console.error);
