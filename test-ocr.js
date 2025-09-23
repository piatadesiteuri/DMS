const pdf2pic = require('pdf2pic');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const testPDF = 'uploads/Scoala Dabuleni/raafel/FRUTOC.pdf';

async function testOCR() {
  console.log('🧪 Testing OCR on:', testPDF);
  
  // First test normal PDF extraction
  try {
    const dataBuffer = fs.readFileSync(testPDF);
    const pdfData = await pdfParse(dataBuffer);
    console.log('📄 Normal PDF text extraction:');
    console.log('- Characters:', pdfData.text.length);
    console.log('- Text preview:', pdfData.text.substring(0, 200));
    
    const words = pdfData.text.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 2);
    console.log('- Meaningful words:', words.length);
    
    if (words.length < 10) {
      console.log('🔄 Low text content - this looks like a scanned PDF, testing OCR...');
      
      // Test OCR
      const tempDir = path.join(process.cwd(), 'temp_ocr');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const convert = pdf2pic.fromPath(testPDF, {
        density: 100,
        saveFilename: "test_page",
        savePath: tempDir,
        format: "png",
        width: 600,
        height: 800
      });
      
      console.log('📄 Converting first page to image...');
      const page = await convert(1, { responseType: "image" });
      console.log('✅ Page converted:', page.path);
      
      console.log('🔍 Running OCR...');
      const { data: { text } } = await Tesseract.recognize(
        page.path,
        'eng+ron',
        { logger: () => {} }
      );
      
      console.log('🎯 OCR Results:');
      console.log('- Characters:', text.length);
      console.log('- Text preview:', text.substring(0, 500));
      
      // Search for "internship" in OCR text
      const searchTerm = 'internship';
      const found = text.toLowerCase().includes(searchTerm);
      console.log(`🔍 Search for "${searchTerm}":`, found ? '✅ FOUND' : '❌ NOT FOUND');
      
      // Cleanup
      if (fs.existsSync(page.path)) {
        fs.unlinkSync(page.path);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testOCR(); 