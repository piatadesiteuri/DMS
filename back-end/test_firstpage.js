const fs = require('fs');
const path = require('path');
const pdf2pic = require('pdf2pic');

// Helper function to extract first page from PDF as base64
const extractFirstPageFromPDF = async (filePath) => {
  try {
    console.log('📄 [FirstPage] Starting first page extraction for:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ [FirstPage] File not found:', filePath);
      return null;
    }
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp_firstpage');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('📁 [FirstPage] Created temporary directory:', tempDir);
    }
    
    // Convert first page of PDF to image using pdf2pic
    const convert = pdf2pic.fromPath(filePath, {
      density: 100,           // Lower density for faster processing
      saveFilename: "firstpage",
      savePath: tempDir,      // Use our temp directory
      format: "png",
      width: 400,             // Lower resolution for faster processing
      height: 500
    });
    
    console.log('🔄 [FirstPage] Converting first page to image...');
    
    // Convert only the first page
    const firstPage = await convert(1);
    
    if (!firstPage || !firstPage.path) {
      console.log('❌ [FirstPage] Could not convert first page to image');
      return null;
    }
    
    console.log('✅ [FirstPage] First page converted to image:', firstPage.path);
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(firstPage.path);
    const base64String = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64String}`;
    
    console.log('✅ [FirstPage] First page converted to base64, size:', base64String.length);
    
    // Clean up temporary image file
    try {
      if (fs.existsSync(firstPage.path)) {
        fs.unlinkSync(firstPage.path);
        console.log('🧹 [FirstPage] Cleaned up temporary image file');
      }
    } catch (cleanupError) {
      console.log('⚠️ [FirstPage] Could not clean up temp file:', firstPage.path);
    }
    
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 [FirstPage] Cleaned up temporary directory');
      }
    } catch (cleanupError) {
      console.log('⚠️ [FirstPage] Could not clean up temp directory:', tempDir);
    }
    
    return dataUrl;
  } catch (error) {
    console.error('💥 [FirstPage] Error in extractFirstPageFromPDF:', error);
    console.error('💥 [FirstPage] Error details:', error.message);
    console.error('💥 [FirstPage] Error stack:', error.stack);
    return null;
  }
};

// Test the function
const testFile = path.join(__dirname, 'uploads', 'Scoala Dabuleni', 'AICIC', 'Babana', 'iorodele.pdf');

console.log('🧪 Testing extractFirstPageFromPDF function...');
console.log('📁 Test file:', testFile);

extractFirstPageFromPDF(testFile)
  .then(result => {
    if (result) {
      console.log('✅ Test successful! First page extracted.');
      console.log('📊 Result size:', result.length);
      console.log('🔗 Result starts with:', result.substring(0, 50) + '...');
    } else {
      console.log('❌ Test failed! No result returned.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test error:', error);
    process.exit(1);
  }); 