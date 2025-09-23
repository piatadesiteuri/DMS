const pdf2pic = require('pdf2pic');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Test OCR coordinate detection with improved configuration
const testOCRCoordinatesFixed = async () => {
  try {
    console.log('🔍 Testing IMPROVED OCR coordinate detection...');
    
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
    
    // Convert first page to image with HIGHER QUALITY
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 150,           // Higher density for better OCR
      saveFilename: "test_page_hq",
      savePath: tempDir,
      format: "png",
      width: 1200,            // Higher resolution
      height: 1600
    });
    
    console.log('🔄 Converting page 1 to HIGH QUALITY image...');
    const page = await convert(1, { responseType: "image" });
    console.log('✅ Page converted:', page.path);
    
    // IMPROVED OCR configuration
    console.log('🤖 Running OCR with IMPROVED word-level detection...');
    const result = await Tesseract.recognize(
      page.path,
      'eng+ron',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        // IMPROVED TESSERACT CONFIG
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
        preserve_interword_spaces: '1',
        // Force word and line detection
        tessedit_create_hocr: '1',
        tessedit_create_tsv: '1',
        // Improve character recognition
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzăîâșțĂÎÂȘȚ0123456789 .,!?:;()-[]{}/@#$%^&*+=_~`"\'\\/<>|',
        // Language model improvements
        load_system_dawg: '1',
        load_freq_dawg: '1',
        load_unambig_dawg: '1',
        load_punc_dawg: '1',
        load_number_dawg: '1',
        load_bigram_dawg: '1'
      }
    );
    
    console.log('\n📊 IMPROVED OCR Results Analysis:');
    console.log('Text length:', result.data.text.length);
    console.log('Words found:', result.data.words ? result.data.words.length : 0);
    console.log('Lines found:', result.data.lines ? result.data.lines.length : 0);
    console.log('Paragraphs found:', result.data.paragraphs ? result.data.paragraphs.length : 0);
    console.log('Blocks found:', result.data.blocks ? result.data.blocks.length : 0);
    
    // Debug: Check structure
    console.log('\n🔍 Data structure analysis:');
    console.log('result.data keys:', Object.keys(result.data));
    
    if (result.data.words) {
      console.log('First word structure:', result.data.words[0]);
    }
    
    if (result.data.lines) {
      console.log('First line structure:', result.data.lines[0]);
    }
    
    // Alternative: Try using the scheduler for better results
    console.log('\n🔄 Trying alternative OCR approach with scheduler...');
    
    const { createWorker } = Tesseract;
    const worker = await createWorker('eng+ron');
    
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
      preserve_interword_spaces: '1'
    });
    
    const { data } = await worker.recognize(page.path);
    
    console.log('\n📊 ALTERNATIVE OCR Results:');
    console.log('Text length:', data.text.length);
    console.log('Words found:', data.words ? data.words.length : 0);
    console.log('Lines found:', data.lines ? data.lines.length : 0);
    
    // Search for specific terms in both results
    const searchTerms = ['sediul', 'caiet', 'sarcini'];
    
    for (const term of searchTerms) {
      console.log(`\n🔍 Searching for "${term}" in ALTERNATIVE result:`);
      
      // Check if term exists in text
      const textLower = data.text.toLowerCase();
      const termExists = textLower.includes(term.toLowerCase());
      console.log(`Text contains "${term}":`, termExists);
      
      if (data.words && data.words.length > 0) {
        // Search in words
        const matchingWords = data.words.filter(word => 
          word.text && word.text.toLowerCase().includes(term.toLowerCase())
        );
        
        console.log(`Words containing "${term}":`, matchingWords.length);
        matchingWords.forEach((word, i) => {
          if (word.bbox) {
            console.log(`  Word ${i + 1}: "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0}) size ${word.bbox.x1 - word.bbox.x0}x${word.bbox.y1 - word.bbox.y0} confidence: ${word.confidence}`);
          } else {
            console.log(`  Word ${i + 1}: "${word.text}" - NO BBOX`);
          }
        });
      }
    }
    
    // Show first 10 words with coordinates from alternative method
    if (data.words && data.words.length > 0) {
      console.log('\n📝 First 10 words with coordinates (ALTERNATIVE):');
      data.words.slice(0, 10).forEach((word, i) => {
        if (word.bbox) {
          console.log(`  ${i + 1}. "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0}) size ${word.bbox.x1 - word.bbox.x0}x${word.bbox.y1 - word.bbox.y0} conf: ${word.confidence}`);
        } else {
          console.log(`  ${i + 1}. "${word.text}" - NO COORDINATES`);
        }
      });
    }
    
    // Show text preview
    console.log('\n📄 ALTERNATIVE Text preview (first 500 chars):');
    console.log(data.text.substring(0, 500));
    
    await worker.terminate();
    
    // Clean up
    if (fs.existsSync(page.path)) {
      fs.unlinkSync(page.path);
    }
    
    console.log('\n✅ IMPROVED OCR coordinate test completed');
    
  } catch (error) {
    console.error('💥 Error in IMPROVED OCR coordinate test:', error);
  }
};

// Run the test
testOCRCoordinatesFixed(); 