const pdf2pic = require('pdf2pic');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Helper function to extract text from PDF using OCR for scanned documents
const extractTextWithOCR = async (filePath) => {
  try {
    console.log('🔍 [OCR] Starting OCR extraction for:', filePath);
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp_ocr');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('📁 [OCR] Created temporary directory:', tempDir);
    }
    
    // Convert PDF to images using GraphicsMagick
    const convert = pdf2pic.fromPath(filePath, {
      density: 150,           // Higher density for better OCR
      saveFilename: "spiridus_page",
      savePath: tempDir,      // Use our temp directory
      format: "png",
      width: 800,             // Higher resolution for better OCR
      height: 1000
    });
    
    // Get first 5 pages to test thoroughly
    const pages = [];
    for (let i = 1; i <= 5; i++) {
      try {
        const page = await convert(i, { responseType: "image" });
        pages.push(page);
        console.log(`📄 [OCR] Converted page ${i} to image: ${page.path}`);
      } catch (error) {
        console.log(`📄 [OCR] No more pages or error on page ${i}:`, error.message);
        break; // Stop if no more pages
      }
    }
    
    if (pages.length === 0) {
      console.log('❌ [OCR] No pages could be converted to images');
      return '';
    }
    
    console.log(`🔄 [OCR] Processing ${pages.length} pages with Tesseract...`);
    
    // Process each page with OCR
    let allText = '';
    for (let i = 0; i < pages.length; i++) {
      try {
        console.log(`🔍 [OCR] Processing page ${i + 1}/${pages.length}...`);
        
        const { data: { text } } = await Tesseract.recognize(
          pages[i].path,
          'eng+ron', // English + Romanian
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`  ${Math.round(m.progress * 100)}% complete`);
              }
            },
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            // Remove character whitelist to allow more characters
            // tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:;()-[]{}/@#$%^&*+=_~`"\'\\/<>|'
          }
        );
        
        allText += text + '\n\n';
        console.log(`✅ [OCR] Page ${i + 1} processed: ${text.length} characters extracted`);
        
        // Show first 500 characters for debugging
        console.log(`📝 [OCR] Page ${i + 1} preview:`, text.substring(0, 500));
        
        // Clean up temporary image file
        try {
          if (fs.existsSync(pages[i].path)) {
            fs.unlinkSync(pages[i].path);
          }
        } catch (cleanupError) {
          console.log('⚠️ [OCR] Could not clean up temp file:', pages[i].path);
        }
        
      } catch (ocrError) {
        console.error(`💥 [OCR] Error processing page ${i + 1}:`, ocrError.message);
        continue; // Continue with next page
      }
    }
    
    console.log(`🎯 [OCR] Total text extracted: ${allText.length} characters`);
    return allText.trim();
    
  } catch (error) {
    console.error('💥 [OCR] Error in OCR extraction:', error);
    return '';
  }
}

// Helper function to extract text from PDF (tries normal extraction first)
const extractTextFromPDF = async (filePath) => {
  try {
    console.log('📄 [TEXT-EXTRACT] Starting normal text extraction for:', path.basename(filePath));
    
    // First try normal PDF text extraction
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const normalText = pdfData.text;
    
    console.log(`📝 [TEXT-EXTRACT] Normal extraction: ${normalText.length} characters`);
    console.log(`📝 [TEXT-EXTRACT] Preview:`, normalText.substring(0, 500));
    
    // Check if we got meaningful text (more than just whitespace and basic chars)
    const meaningfulText = normalText.replace(/\s+/g, ' ').trim();
    const wordCount = meaningfulText.split(' ').filter(word => word.length > 2).length;
    
    console.log(`🔍 [TEXT-EXTRACT] Meaningful words found: ${wordCount}`);
    
    return normalText;
    
  } catch (error) {
    console.error('💥 [TEXT-EXTRACT] Error in text extraction:', error);
    return '';
  }
}

async function testSpiritusPDF() {
  const testPDF = 'uploads/Scoala Dabuleni/raafel/spiridus.pdf';
  
  console.log('🧪 Testing spiridus.pdf OCR and text extraction');
  console.log('PDF path:', testPDF);
  
  if (!fs.existsSync(testPDF)) {
    console.error('❌ File not found:', testPDF);
    return;
  }
  
  console.log('\n=== TESTING NORMAL PDF TEXT EXTRACTION ===');
  const normalText = await extractTextFromPDF(testPDF);
  
  console.log('\n=== TESTING OCR EXTRACTION ===');
  const ocrText = await extractTextWithOCR(testPDF);
  
  console.log('\n=== TESTING SEARCH TERMS ===');
  const searchTerms = ['spiridus', 'nagaro', 'internship', 'student', 'learning'];
  
  console.log('\nSearching in NORMAL text:');
  searchTerms.forEach(term => {
    const found = normalText.toLowerCase().includes(term.toLowerCase());
    console.log(`  ${term}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  });
  
  console.log('\nSearching in OCR text:');
  searchTerms.forEach(term => {
    const found = ocrText.toLowerCase().includes(term.toLowerCase());
    console.log(`  ${term}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  });
  
  console.log('\n=== SUMMARY ===');
  console.log(`Normal text: ${normalText.length} characters`);
  console.log(`OCR text: ${ocrText.length} characters`);
  
  // Save extracted texts to files for analysis
  fs.writeFileSync('spiridus_normal_text.txt', normalText);
  fs.writeFileSync('spiridus_ocr_text.txt', ocrText);
  
  console.log('\n📁 Extracted texts saved to:');
  console.log('  - spiridus_normal_text.txt');
  console.log('  - spiridus_ocr_text.txt');
}

// Run the test
testSpiritusPDF().catch(console.error); 