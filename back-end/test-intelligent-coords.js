// Test the intelligent coordinate function
function createIntelligentCoordinates(searchQuery, pageText, matchText, resultIndex, pageNumber) {
  console.log(`🧠 Creating intelligent coordinates for "${matchText}" (result ${resultIndex + 1})`);
  
  const searchLower = searchQuery.toLowerCase();
  const textLower = pageText.toLowerCase();
  const matchLower = matchText.toLowerCase();
  
  // Find all occurrences of the search term in the text
  const allMatches = [];
  let searchIndex = 0;
  while ((searchIndex = textLower.indexOf(searchLower, searchIndex)) !== -1) {
    allMatches.push(searchIndex);
    searchIndex += searchLower.length;
  }
  
  console.log(`🔍 Found ${allMatches.length} text occurrences of "${searchQuery}"`);
  
  // Use the appropriate match index (cycle through if more results than matches)
  const matchIndex = allMatches[resultIndex % allMatches.length] || 0;
  const textLength = pageText.length;
  const relativePosition = matchIndex / textLength;
  
  console.log(`📊 Text analysis: match at position ${matchIndex}/${textLength} (${(relativePosition * 100).toFixed(1)}%)`);
  
  // ANALYZE TEXT STRUCTURE to determine likely document layout
  const lines = pageText.split('\n').filter(line => line.trim().length > 0);
  const wordsPerLine = lines.map(line => line.trim().split(/\s+/).length);
  const avgWordsPerLine = wordsPerLine.reduce((sum, count) => sum + count, 0) / wordsPerLine.length;
  
  // Estimate if this is a structured document (forms, tables) or flowing text
  const isStructuredDoc = avgWordsPerLine < 8; // Less words per line = more structured
  const hasShortLines = lines.filter(line => line.trim().length < 30).length > lines.length * 0.3;
  
  console.log(`📋 Document structure: ${lines.length} lines, avg ${avgWordsPerLine.toFixed(1)} words/line, structured: ${isStructuredDoc}`);
  
  // CALCULATE COORDINATES based on document type and position
  let x, y, width, height, method, confidence;
  
  if (isStructuredDoc) {
    // STRUCTURED DOCUMENT (forms, tables): Use grid-based positioning
    const cols = 3;
    const rows = Math.ceil(allMatches.length / cols);
    const col = resultIndex % cols;
    const row = Math.floor(resultIndex / cols);
    
    // Distribute across page with realistic spacing
    x = 50 + col * (1200 / cols) + (relativePosition * 100); // Add some text-based variation
    y = 100 + row * (1600 / rows) + (relativePosition * 200);
    width = Math.max(matchText.length * 15, 80); // Larger for structured docs
    height = 30;
    method = 'STRUCTURED_GRID';
    confidence = 0.7;
    
  } else {
    // FLOWING TEXT DOCUMENT: Use line-based positioning
    const estimatedLineNumber = Math.floor(relativePosition * lines.length);
    const linesPerPage = Math.max(lines.length / 1, 1);
    const lineHeight = 1600 / linesPerPage;
    
    // Position based on estimated line
    x = 80 + (resultIndex * 40) % 400; // Vary X to avoid overlap
    y = 120 + (estimatedLineNumber * lineHeight) + (resultIndex * 25); // Vary Y slightly
    width = Math.max(matchText.length * 12, 70);
    height = Math.min(lineHeight * 0.8, 35);
    method = 'FLOWING_TEXT';
    confidence = 0.6;
  }
  
  // APPLY REALISTIC CONSTRAINTS
  x = Math.max(20, Math.min(x, 1200 - width - 20)); // Keep within page bounds
  y = Math.max(50, Math.min(y, 1600 - height - 50));
  width = Math.max(40, Math.min(width, 300)); // Reasonable width limits
  height = Math.max(20, Math.min(height, 50)); // Reasonable height limits
  
  // ADD SMART VARIATIONS to avoid overlaps
  const variation = (resultIndex * 17) % 60; // Prime number for better distribution
  x += variation;
  y += (resultIndex * 23) % 40;
  
  // Ensure still within bounds after variation
  x = Math.max(20, Math.min(x, 1200 - width - 20));
  y = Math.max(50, Math.min(y, 1600 - height - 50));
  
  const coordinates = {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    imageWidth: 1200,  // Match the new higher resolution
    imageHeight: 1600,
    matchType: 'INTELLIGENT',
    method: method,
    confidence: confidence,
    textPosition: relativePosition,
    resultIndex: resultIndex,
    documentStructure: isStructuredDoc ? 'structured' : 'flowing'
  };
  
  console.log(`🎯 Generated coordinates:`, coordinates);
  
  return coordinates;
}

// Test with sample text (similar to spiridus.pdf content)
const sampleText = `
Finantat de Planul National
Uniunea Europeană de Redresare și Rezilienta

Apelul Componenta C7 — Transformare digitală, 13. Realizarea sistemului de eHealth şi telemedicină;
Investiţia specifică: 13.3 - Digitalizarea instituțiilor cu atribuții în domeniul sanitar aflate în
subordinea MS; COD APEL MS-732

Beneficiar: Direcţia de Sănătate Publică Dolj

Titlul proiectului: Digitalizarea Direcției de Sănătate Publică Dolj

Contract: Contract de finanțare nr. 1431/49132 din data de 25.06.2024 încheiat cu Ministerul
Sănătății

MINISTERUL SĂNĂTĂȚII
DIRECŢIA DE SĂNĂTATE
PUBLICA DOLJ

Sediul central
Str. Tabaci, nr. 1, Craiova
Jud. Dolj, 200 389
E-mail: dspdolj17@gmail.com
Website: www.dspdolj.ro

CAIET DE SARCINI
Software de aplicații necesare desfășurării activităților
din cadrul proiectului "Digitalizarea

Software de aplicații necesare desfășurării activităților din cadrul proiectului "Digitalizarea
Direcţiei de Sănătate Publică Dolj"

Valoarea contractului de achiziție publică se va derula în cadrul Direcției de Sănătate Publică
Dolj prin finanțare prin Planul Național de Redresare și Reziliență (PNRR), Componenta 7 -
Transformare Digitală, Componenta 13. Realizarea sistemului de eHealth și telemedicină,
Investiția specifică 13.3 - Digitalizarea instituțiilor cu atribuții în domeniul sanitar aflate în
subordinea MS.
`;

console.log('🧪 Testing intelligent coordinate calculation...\n');

// Test with "sediul" search
console.log('=== Testing "sediul" search ===');
for (let i = 0; i < 4; i++) {
  const coords = createIntelligentCoordinates('sediul', sampleText, 'sediul', i, 1);
  console.log(`Result ${i + 1}: (${coords.x}, ${coords.y}) ${coords.width}x${coords.height} [${coords.method}]\n`);
}

console.log('=== Testing "caiet de sarcini" search ===');
for (let i = 0; i < 2; i++) {
  const coords = createIntelligentCoordinates('caiet de sarcini', sampleText, 'CAIET DE SARCINI', i, 1);
  console.log(`Result ${i + 1}: (${coords.x}, ${coords.y}) ${coords.width}x${coords.height} [${coords.method}]\n`);
} 