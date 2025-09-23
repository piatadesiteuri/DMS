// Test pentru algoritmul îmbunătățit - fără fraze lungi

const stopWords = new Set([
  'si', 'și', 'sau', 'dar', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'o', 'nu', 'se', 'ce', 'sa', 'să',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'file', 'files', 'new', 'old', 'click', 'access', 'digital', 'place', 'one', 'any', 'time', 'right', 'document', 'documents', 'smallpdf', 'gicaju'
]);

// Test pentru filtrarea keyword-urilor îmbunătățită
function testImprovedKeywords(inputKeywords) {
  console.log(`\n🔍 Testing keywords: [${inputKeywords.join(', ')}]`);
  
  const filteredKeywords = inputKeywords.filter(keyword => {
    const isValid = keyword.length > 2 && 
           keyword.length < 15 && // elimină fraze prea lungi
           !keyword.includes(' ') && // doar cuvinte simple, nu fraze
           !stopWords.has(keyword.toLowerCase()) && 
           !keyword.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final|gicaju|click|access|digital|place|right|small|pdf|anytime|one|all)$/i);
    
    console.log(`  "${keyword}" -> ${isValid ? '✅ VALID' : '❌ FILTERED'} ${!isValid ? 
      (keyword.includes(' ') ? '(contains spaces)' :
       keyword.length >= 15 ? '(too long)' :
       stopWords.has(keyword.toLowerCase()) ? '(stop word)' :
       keyword.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final|gicaju|click|access|digital|place|right|small|pdf|anytime|one|all)$/i) ? '(common word)' :
       '(too short)') : ''}`);
    
    return isValid;
  });
  
  console.log(`  Final result: [${filteredKeywords.join(', ')}]`);
  return filteredKeywords;
}

// Test examples din problema originală
console.log('🧪 TESTING IMPROVED ALGORITHM - NO LONG PHRASES');
console.log('================================================');

testImprovedKeywords(['gicaju', 'smallpdf digital documents', 'all in one place access files anytime', 'right-click', 'digital']);

// Test cu keyword-uri bune
testImprovedKeywords(['contract', 'parteneriat', 'legal', 'business', 'comercial']);

// Test cu fraze problematice
testImprovedKeywords(['this is a very long phrase that should be filtered', 'document management system', 'pdf', 'simple', 'word']);

// Test mixt
testImprovedKeywords(['gicaju', 'contract', 'all in one place', 'legal', 'click', 'parteneriat', 'digital documents']);

console.log('\n✨ EXPECTED RESULTS:');
console.log('- Single words with meaningful content should be VALID');
console.log('- Long phrases with spaces should be FILTERED');
console.log('- Common words like "gicaju", "click", "digital" should be FILTERED');
console.log('- Only relevant business terms should remain');

// Test pentru tag-uri cu threshold redus
console.log('\n🏷️ TESTING TAG CONFIDENCE WITH REDUCED THRESHOLD');
console.log('================================================');

function testTagConfidence(tagName, score) {
  const confidence = Math.min(score / 8, 1);
  const threshold = Math.max(0.2, 0.6 * 0.5); // confidenceThreshold = 0.6
  const isAccepted = confidence >= threshold && score > 0.5;
  
  console.log(`Tag: "${tagName}" | Score: ${score} | Confidence: ${confidence.toFixed(2)} | Threshold: ${threshold.toFixed(2)} | ${isAccepted ? '✅ ACCEPTED' : '❌ REJECTED'}`);
  return isAccepted;
}

testTagConfidence('contract', 3);
testTagConfidence('legal', 2);
testTagConfidence('business', 1.5);
testTagConfidence('document', 1);
testTagConfidence('file', 0.8);
testTagConfidence('weak-tag', 0.3); 