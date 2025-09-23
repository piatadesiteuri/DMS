// Test pentru algoritmul îmbunătățit de filtrare keyword-uri și tag-uri

// Lista extinsă de stop words
const stopWords = new Set([
  // Română
  'si', 'și', 'sau', 'dar', 'iar', 'ori', 'fie', 'nici', 'daca', 'dacă', 'cand', 'când', 'unde', 'care', 'cum', 'cat', 'cât', 'din', 'pentru', 'prin', 'dupa', 'după', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'una', 'unei', 'unor', 'o', 'nu', 'se', 'ce', 'sa', 'să', 'va', 'vor', 'mai', 'fost', 'sunt', 'era', 'este', 'fiind', 'avea', 'avem', 'aveți', 'doar', 'foarte', 'mult', 'multa', 'multe', 'putin', 'puțin', 'tot', 'toata', 'toate', 'totul', 'acest', 'această', 'aceste', 'acei', 'acele', 'cele', 'cei',
  // Engleză
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'will', 'may', 'could', 'would', 'should', 'must', 'shall', 'might', 'with', 'from', 'they', 'this', 'that', 'have', 'been', 'were', 'there', 'what', 'when', 'where', 'which', 'than', 'some', 'time', 'very', 'come', 'make', 'take', 'know', 'think', 'good', 'well', 'also', 'just', 'only', 'into', 'over', 'after', 'back', 'here', 'before', 'through', 'each', 'other', 'many', 'most', 'such', 'like', 'these', 'those', 'them', 'more', 'first', 'last', 'long', 'right',
  // Cuvinte comune în documente și fișiere
  'file', 'files', 'document', 'documents', 'pdf', 'doc', 'docx', 'txt', 'page', 'pages', 'text', 'content', 'data', 'info', 'information', 'copy', 'draft', 'final', 'version', 'update', 'updated', 'section', 'chapter', 'paragraph', 'line', 'word', 'words', 'title', 'name', 'date', 'time', 'number', 'item', 'list', 'table', 'figure', 'image', 'photo', 'picture', 'note', 'notes', 'comment', 'comments', 'description', 'details', 'example', 'examples', 'sample', 'test', 'demo', 'temporary', 'temp', 'backup', 'untitled', 'misc', 'other', 'various', 'general', 'common', 'basic', 'simple', 'standard', 'normal', 'regular', 'default', 'click', 'access', 'digital', 'smallpdf', 'gicaju'
]);

// Funcție de testare pentru keyword-uri din nume fișier
function testFileNameKeywords(fileName) {
  console.log(`\n🔍 Testing filename: "${fileName}"`);
  
  const fileNameWords = fileName
    .replace(/\.[^/.]+$/, '') // elimină extensia
    .replace(/[-_]/g, ' ')    // înlocuiește - și _ cu spații
    .split(/\s+/)             // împarte în cuvinte
    .filter(word => {
      const lowerWord = word.toLowerCase();
      const isValid = word.length > 3 && 
             !stopWords.has(lowerWord) && 
             !lowerWord.match(/^\d+$/) && // nu sunt doar cifre
             !lowerWord.match(/^(copy|draft|final|new|old|v\d+|\d+|gicaju|click|access|digital|smallpdf)$/i); // nu sunt cuvinte de versioning sau nonsense
      
      console.log(`  Word: "${word}" -> ${isValid ? '✅ VALID' : '❌ FILTERED'}`);
      return isValid;
    })
    .slice(0, 2); // maxim 2 cuvinte din numele fișierului
  
  console.log(`  Result: [${fileNameWords.join(', ')}]`);
  return fileNameWords;
}

// Test cases pentru nume de fișiere problematice
console.log('🧪 TESTING IMPROVED KEYWORD FILTERING');
console.log('=====================================');

testFileNameKeywords('gicaju_smallpdf_click_access.pdf');
testFileNameKeywords('document_new_files_the_can.pdf');
testFileNameKeywords('contract_de_parteneriat_2024.pdf');
testFileNameKeywords('raport_anual_companie.pdf');
testFileNameKeywords('factura_servicii_iunie.pdf');
testFileNameKeywords('certificat_calificare_profesionala.pdf');
testFileNameKeywords('politica_resurse_umane_final.pdf');
testFileNameKeywords('copy_draft_temp_backup.pdf');

// Test pentru tag-uri problematice
console.log('\n🏷️ TESTING TAG FILTERING');
console.log('========================');

const problematicTags = [
  { name: 'the', id: 1 },
  { name: 'can', id: 2 },
  { name: 'New', id: 3 },
  { name: 'files', id: 4 },
  { name: 'click', id: 5 },
  { name: 'access', id: 6 },
  { name: 'digital', id: 7 },
  { name: 'gicaju', id: 8 },
  { name: 'contract', id: 9 },
  { name: 'legal', id: 10 },
  { name: 'business', id: 11 }
];

const tagStopWords = new Set([
  'si', 'și', 'sau', 'dar', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'o', 'nu', 'se', 'ce', 'sa', 'să',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'file', 'files', 'new', 'old', 'click', 'access', 'digital', 'gicaju'
]);

problematicTags.forEach(tag => {
  const tagName = tag.name.toLowerCase();
  const tagWords = tagName.split(/\s+/).filter(word => !tagStopWords.has(word));
  const isValid = tagWords.length > 0 && 
                  !['file', 'files', 'new', 'document', 'text', 'page', 'click', 'access', 'digital', 'gicaju'].includes(tagName);
  
  console.log(`  Tag: "${tag.name}" -> ${isValid ? '✅ VALID' : '❌ FILTERED'}`);
});

console.log('\n✨ EXPECTED RESULTS:');
console.log('- Keywords "gicaju", "click", "access", "digital" should be FILTERED');
console.log('- Tags "the", "can", "New", "files", "click", "access", "digital", "gicaju" should be FILTERED');
console.log('- Only meaningful keywords like "contract", "raport", "factura", "certificat" should be VALID');
console.log('- Only meaningful tags like "contract", "legal", "business" should be VALID'); 