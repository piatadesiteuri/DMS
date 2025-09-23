const pdf2pic = require('pdf2pic');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Test OCR coordinate detection for spiridus.pdf
const testOCRCoordinates = async () => {
  try {
    console.log('🔍 Testing OCR coordinate detection...');
    
    const pdfPath = path.join(__dirname, 'uploads', 'Scoala Dabuleni', 'raafel', 'spiridus.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }
    
    console.log('✅ PDF file found:', pdfPath);
    
    // Create temp directory
    const tempDir = path.join(__dirname, 'temp_ocr_test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Convert first page to image
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 100,
      saveFilename: "test_page",
      savePath: tempDir,
      format: "png",
      width: 600,
      height: 800
    });
    
    console.log('🔄 Converting page 1 to image...');
    const page = await convert(1, { responseType: "image" });
    console.log('✅ Page converted:', page.path);
    
    // Run OCR with detailed word-level information
    console.log('🤖 Running OCR with word-level detection...');
    const result = await Tesseract.recognize(
      page.path,
      'eng+ron',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
        preserve_interword_spaces: '1'
      }
    );
    
    console.log('\n📊 OCR Results Analysis:');
    console.log('Text length:', result.data.text.length);
    console.log('Words found:', result.data.words ? result.data.words.length : 0);
    console.log('Lines found:', result.data.lines ? result.data.lines.length : 0);
    console.log('Paragraphs found:', result.data.paragraphs ? result.data.paragraphs.length : 0);
    
    // Search for specific terms
    const searchTerms = ['sediul', 'caiet', 'sarcini'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for "${term}":`);
      
      // Check if term exists in text
      const textLower = result.data.text.toLowerCase();
      const termExists = textLower.includes(term.toLowerCase());
      console.log(`Text contains "${term}":`, termExists);
      
      if (result.data.words) {
        // Search in words
        const matchingWords = result.data.words.filter(word => 
          word.text && word.text.toLowerCase().includes(term.toLowerCase())
        );
        
        console.log(`Words containing "${term}":`, matchingWords.length);
        matchingWords.forEach((word, i) => {
          console.log(`  Word ${i + 1}: "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0}) size ${word.bbox.x1 - word.bbox.x0}x${word.bbox.y1 - word.bbox.y0} confidence: ${word.confidence}`);
        });
      }
      
      if (result.data.lines) {
        // Search in lines
        const matchingLines = result.data.lines.filter(line => 
          line.text && line.text.toLowerCase().includes(term.toLowerCase())
        );
        
        console.log(`Lines containing "${term}":`, matchingLines.length);
        matchingLines.forEach((line, i) => {
          console.log(`  Line ${i + 1}: "${line.text.substring(0, 100)}..." at (${line.bbox.x0}, ${line.bbox.y0}) size ${line.bbox.x1 - line.bbox.x0}x${line.bbox.y1 - line.bbox.y0}`);
        });
      }
    }
    
    // Show first 10 words with coordinates
    if (result.data.words && result.data.words.length > 0) {
      console.log('\n📝 First 10 words with coordinates:');
      result.data.words.slice(0, 10).forEach((word, i) => {
        if (word.bbox) {
          console.log(`  ${i + 1}. "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0}) size ${word.bbox.x1 - word.bbox.x0}x${word.bbox.y1 - word.bbox.y0} conf: ${word.confidence}`);
        }
      });
    }
    
    // Show text preview
    console.log('\n📄 Text preview (first 500 chars):');
    console.log(result.data.text.substring(0, 500));
    
    // Clean up
    if (fs.existsSync(page.path)) {
      fs.unlinkSync(page.path);
    }
    
    console.log('\n✅ OCR coordinate test completed');
    
  } catch (error) {
    console.error('💥 Error in OCR coordinate test:', error);
  }
};

// Run the test
testOCRCoordinates(); 