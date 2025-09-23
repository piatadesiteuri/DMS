#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Automated build and deploy script
async function buildAndDeploy() {
    console.log('🚀 === BUILD AND DEPLOY SCRIPT ===');
    
    try {
        // Step 1: Build for Windows
        console.log('📦 Building for Windows...');
        execSync('npm run build-win', { stdio: 'inherit' });
        console.log('✅ Windows build completed');
        
        // Step 2: Deploy to downloads
        console.log('📤 Deploying to downloads...');
        execSync('node deploy-to-downloads.js', { stdio: 'inherit' });
        console.log('✅ Deployment completed');
        
        // Step 3: Update download page
        console.log('🔄 Updating download page...');
        execSync('node update-download-page.js', { stdio: 'inherit' });
        console.log('✅ Download page updated');
        
        // Step 3: Show summary
        const downloadsDir = path.join(__dirname, '..', 'back-end', 'public', 'downloads');
        const targetFile = path.join(downloadsDir, 'EDMS_Sync_Agent_Latest.exe');
        
        if (fs.existsSync(targetFile)) {
            const stats = fs.statSync(targetFile);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log('\n🎉 BUILD AND DEPLOY SUCCESSFUL!');
            console.log('📊 File size:', fileSizeInMB, 'MB');
            console.log('📅 Build date:', stats.mtime);
            console.log('📥 Download URL: http://192.168.0.13:3000/download-app');
            console.log('📁 File location:', targetFile);
        }
        
    } catch (error) {
        console.error('❌ Build and deploy failed:', error.message);
        process.exit(1);
    }
}

buildAndDeploy().catch(console.error); 