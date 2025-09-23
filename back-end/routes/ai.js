const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Aici voi implementa integrarile cu diverse AI APIs
// Pentru exemplu, voi arata cum sa integram cu OpenAI, dar poti configura cu orice AI API

// Configurarea pentru diferite AI providers
const AI_PROVIDERS = {
  OPENAI: 'openai',
  HUGGINGFACE: 'huggingface',
  AZURE_COGNITIVE: 'azure',
  GOOGLE_CLOUD: 'google',
  LOCAL_MODEL: 'local'
};

// Configurarea activa (poti schimba in functie de preferinte)
const ACTIVE_AI_PROVIDER = process.env.AI_PROVIDER || AI_PROVIDERS.OPENAI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

/**
 * Endpoint pentru generarea profesionala de keywords
 * POST /ai/keywords
 */
router.post('/keywords', authenticateToken, async (req, res) => {
  try {
    const { text, fileName, documentType, options = {} } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required for keyword generation'
      });
    }

    // Validare si sanitizare
    const sanitizedText = text.substring(0, 10000); // Limiteaza la 10k caractere
    const maxKeywords = Math.min(options.maxKeywords || 5, 10);
    const language = options.language || 'ro';

    let keywords = [];

    if (ACTIVE_AI_PROVIDER === AI_PROVIDERS.OPENAI && OPENAI_API_KEY) {
      keywords = await generateKeywordsWithOpenAI(sanitizedText, fileName, documentType, maxKeywords, language);
    } else {
      keywords = await generateAdvancedKeywordsLocally(sanitizedText, fileName, documentType, maxKeywords, language);
    }

    res.json({
      success: true,
      data: keywords,
      metadata: {
        provider: ACTIVE_AI_PROVIDER,
        textLength: sanitizedText.length,
        fileName: fileName || 'unknown',
        documentType: documentType || 'general',
        confidence: keywords.length > 0 ? 0.85 : 0.3
      }
    });

  } catch (error) {
    console.error('Error in AI keywords generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate keywords',
      details: error.message
    });
  }
});

/**
 * Endpoint pentru generarea profesionala de taguri
 * POST /ai/tags
 */
router.post('/tags', authenticateToken, async (req, res) => {
  try {
    const { text, fileName, availableTags, options = {} } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required for tag generation'
      });
    }

    if (!availableTags || !Array.isArray(availableTags)) {
      return res.status(400).json({
        success: false,
        error: 'Available tags list is required'
      });
    }

    const sanitizedText = text.substring(0, 10000);
    const maxTags = Math.min(options.maxTags || 3, 5);
    const language = options.language || 'ro';
    const confidenceThreshold = options.confidenceThreshold || 0.6;

    let suggestedTags = [];

    if (ACTIVE_AI_PROVIDER === AI_PROVIDERS.OPENAI && OPENAI_API_KEY) {
      suggestedTags = await generateTagsWithOpenAI(sanitizedText, fileName, availableTags, maxTags, language, confidenceThreshold);
    } else {
      suggestedTags = await generateAdvancedTagsLocally(sanitizedText, fileName, availableTags, maxTags, language, confidenceThreshold);
    }

    res.json({
      success: true,
      data: suggestedTags,
      metadata: {
        provider: ACTIVE_AI_PROVIDER,
        textLength: sanitizedText.length,
        availableTagsCount: availableTags.length,
        fileName: fileName || 'unknown',
        confidence: suggestedTags.length > 0 ? 0.8 : 0.3
      }
    });

  } catch (error) {
    console.error('Error in AI tags generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tags',
      details: error.message
    });
  }
});

/**
 * Endpoint pentru analiza completa a documentului
 * POST /ai/analyze
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { text, fileName, availableTags, options = {} } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required for document analysis'
      });
    }

    const sanitizedText = text.substring(0, 15000); // Limita mai mare pentru analiza completa
    const language = options.language || 'ro';

    let analysisResult = {};

    if (ACTIVE_AI_PROVIDER === AI_PROVIDERS.OPENAI && OPENAI_API_KEY) {
      analysisResult = await analyzeDocumentWithOpenAI(sanitizedText, fileName, availableTags, options, language);
    } else {
      analysisResult = await analyzeDocumentLocally(sanitizedText, fileName, availableTags, options, language);
    }

    res.json({
      success: true,
      data: analysisResult,
      metadata: {
        provider: ACTIVE_AI_PROVIDER,
        textLength: sanitizedText.length,
        fileName: fileName || 'unknown',
        timestamp: new Date().toISOString(),
        confidence: analysisResult.confidence || 0.7
      }
    });

  } catch (error) {
    console.error('Error in AI document analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze document',
      details: error.message
    });
  }
});

// =============================================================================
// IMPLEMENTARI AI PROVIDERS
// =============================================================================

/**
 * Generarea de keywords cu OpenAI
 */
async function generateKeywordsWithOpenAI(text, fileName, documentType, maxKeywords, language) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Analizează următorul text și generează ${maxKeywords} cuvinte cheie relevante în limba ${language === 'ro' ? 'română' : 'engleză'}.
Textul este dintr-un document de tipul: ${documentType || 'general'}
Numele fișierului: ${fileName || 'necunoscut'}

Criterii pentru cuvinte cheie:
1. Să fie relevante pentru conținutul principal
2. Să fie termeni specifici domeniului
3. Să fie utile pentru căutare și clasificare
4. Să evite cuvintele comune și articolele

Text pentru analiză:
${text.substring(0, 3000)}

Răspunde DOAR cu cuvintele cheie separate prin virgule, fără explicații:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ești un expert în analiză de documente și extragerea cuvintelor cheie. Răspunzi concis și precis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response structure');
    }

    const keywordsText = data.choices[0].message.content.trim();
    const keywords = keywordsText
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, maxKeywords);

    return keywords;
  } catch (error) {
    console.error('OpenAI keywords generation error:', error);
    // Fallback la metoda locala
    return await generateAdvancedKeywordsLocally(text, fileName, documentType, maxKeywords, language);
  }
}

/**
 * Generarea de taguri cu OpenAI
 */
async function generateTagsWithOpenAI(text, fileName, availableTags, maxTags, language, confidenceThreshold) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const tagNames = availableTags.map(tag => tag.name).join(', ');
  const prompt = `
Analizează următorul text și alege maximum ${maxTags} etichete potrivite din lista disponibilă.
Limba documentului: ${language === 'ro' ? 'română' : 'engleză'}
Numele fișierului: ${fileName || 'necunoscut'}

Etichete disponibile: ${tagNames}

Criterii pentru selecție:
1. Eticheta trebuie să fie relevantă pentru conținutul principal
2. Să reflecte categoria sau tipul documentului
3. Să fie utilă pentru organizarea documentelor
4. Să aibă o relevanță de cel puțin ${confidenceThreshold * 100}%

Text pentru analiză:
${text.substring(0, 3000)}

Răspunde DOAR cu numele etichetelor selectate separate prin virgule, fără explicații:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ești un expert în clasificarea documentelor și alegerea etichetelor potrivite. Răspunzi concis și precis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response structure');
    }

    const tagsText = data.choices[0].message.content.trim();
    const selectedTagNames = tagsText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .slice(0, maxTags);

    // Găsește tagurile din lista disponibilă
    const selectedTags = availableTags.filter(tag => 
      selectedTagNames.some(name => 
        name.toLowerCase() === tag.name.toLowerCase()
      )
    );

    return selectedTags;
  } catch (error) {
    console.error('OpenAI tags generation error:', error);
    // Fallback la metoda locala
    return await generateAdvancedTagsLocally(text, fileName, availableTags, maxTags, language, confidenceThreshold);
  }
}

/**
 * Analiza completa a documentului cu OpenAI
 */
async function analyzeDocumentWithOpenAI(text, fileName, availableTags, options, language) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Analizează următorul document și furnizează o analiză completă în limba ${language === 'ro' ? 'română' : 'engleză'}.
Numele fișierului: ${fileName || 'necunoscut'}

Furnizează rezultatul în format JSON cu următoarele chei:
{
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "category": "categoria documentului",
  "summary": "rezumat scurt în 2-3 propoziții",
  "documentType": "tipul documentului",
  "mainTopics": ["subiect1", "subiect2", "subiect3"],
  "confidence": 0.85
}

Text pentru analiză:
${text.substring(0, 4000)}

Răspunde DOAR cu JSON-ul, fără explicații suplimentare:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Ești un expert în analiză de documente. Răspunzi întotdeauna cu JSON valid și structurat.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid OpenAI response structure');
    }

    const analysisText = data.choices[0].message.content.trim();
    
    // Încearcă să parseze JSON-ul
    let analysisResult;
    try {
      analysisResult = JSON.parse(analysisText);
    } catch (parseError) {
      // Dacă JSON-ul nu este valid, extrage informațiile manual
      analysisResult = parseAnalysisFromText(analysisText);
    }

    // Adaugă tagurile sugerate dacă sunt disponibile
    if (availableTags && availableTags.length > 0) {
      const suggestedTags = await generateTagsWithOpenAI(text, fileName, availableTags, 3, language, 0.6);
      analysisResult.suggestedTags = suggestedTags;
    }

    return analysisResult;
  } catch (error) {
    console.error('OpenAI document analysis error:', error);
    // Fallback la metoda locala
    return await analyzeDocumentLocally(text, fileName, availableTags, options, language);
  }
}

// =============================================================================
// IMPLEMENTARI LOCALE AVANSATE (FALLBACK)
// =============================================================================

/**
 * Generarea avansata de keywords local
 */
async function generateAdvancedKeywordsLocally(text, fileName, documentType, maxKeywords, language) {
  const keywords = new Set();
  
  // Lista extinsă de stop words în română și engleză
  const stopWords = new Set([
    // Română
    'si', 'și', 'sau', 'dar', 'iar', 'ori', 'fie', 'nici', 'daca', 'dacă', 'cand', 'când', 'unde', 'care', 'cum', 'cat', 'cât', 'din', 'pentru', 'prin', 'dupa', 'după', 'inainte', 'asupra', 'despre', 'catre', 'către', 'intre', 'între', 'sub', 'langa', 'lângă', 'fara', 'fără', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'una', 'unei', 'unor', 'o', 'nu', 'se', 'ce', 'sa', 'să', 'va', 'vor', 'mai', 'fost', 'sunt', 'era', 'este', 'fiind', 'avea', 'avem', 'aveți', 'doar', 'foarte', 'mult', 'multa', 'multe', 'putin', 'puțin', 'tot', 'toata', 'toate', 'totul', 'acest', 'această', 'aceste', 'acei', 'acele', 'cele', 'cei', 'care', 'care', 'care', 'despre', 'asupra',
    // Engleză
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'will', 'may', 'can', 'could', 'would', 'should', 'must', 'will', 'shall', 'might',
    // Common tech/file words
    'file', 'files', 'document', 'documents', 'pdf', 'doc', 'docx', 'txt', 'page', 'pages', 'text', 'content', 'data', 'info', 'information', 'new', 'old', 'updated', 'version', 'copy', 'draft', 'final',
    // Cuvinte comune în nume de fișiere
    'untitled', 'copy', 'final', 'draft', 'new', 'old', 'backup', 'temp', 'temporary', 'test', 'sample', 'example', 'demo'
  ]);

  // 1. Extrage din numele fisierului (mai selective)
  if (fileName) {
    const fileNameWords = fileName
      .replace(/\.[^/.]+$/, '') // elimină extensia
      .replace(/[-_]/g, ' ')    // înlocuiește - și _ cu spații
      .split(/\s+/)             // împarte în cuvinte
      .filter(word => {
        const lowerWord = word.toLowerCase();
        return word.length > 3 && 
               !stopWords.has(lowerWord) && 
               !lowerWord.match(/^\d+$/) && // nu sunt doar cifre
               !lowerWord.match(/^(copy|draft|final|new|old|v\d+|\d+)$/i); // nu sunt cuvinte de versioning
      })
      .slice(0, 2); // maxim 2 cuvinte din numele fișierului
    
    fileNameWords.forEach(word => keywords.add(word.toLowerCase()));
  }

  // 2. Patterns specifice pentru diferite tipuri de documente (mai precise)
  const documentPatterns = {
    'contract': /\b(contract|contractual|agreement|accord|legal|juridic|stipulație|clauza|clauză|parts?|părți|semnătură|signature|terms?|termeni|conditions?|condiții)\b/gi,
    'invoice': /\b(factura|factură|invoice|payment|plată|amount|sumă|total|bill|chitanță|charge|cost|preț|price|taxă|tax)\b/gi,
    'report': /\b(raport|report|analysis|analiză|analiza|findings|concluzii|conclusion|summary|rezumat|studiu|study|cercetare|research|rezultate|results)\b/gi,
    'certificate': /\b(certificat|certificate|diploma|diplomă|award|premiu|achievement|realizare|qualification|calificare|completion|absolvire|competență|competence)\b/gi,
    'policy': /\b(politică|policy|politica|procedure|procedură|procedura|regulation|regulament|guideline|ghid|rule|regulă|standard|protocol)\b/gi,
    'manual': /\b(manual|guide|ghid|instructions|instrucțiuni|instrucțiune|tutorial|help|ajutor|documentation|documentație|procedură|procedure)\b/gi,
    'presentation': /\b(prezentare|presentation|prezentarea|slides|slide|demo|demonstrație|demonstrația|show|expunere|exhibit|expoziție)\b/gi,
    'budget': /\b(buget|budget|bugetul|financial|financiar|financiară|cost|costuri|expense|cheltuială|revenue|venit|profit|loss|pierdere|income|investiție|investment)\b/gi
  };

  // 3. Aplica patterns pe text (mai selective)
  Object.entries(documentPatterns).forEach(([type, pattern]) => {
    const matches = text.match(pattern);
    if (matches) {
      const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
      uniqueMatches.slice(0, 2).forEach(match => {
        if (!stopWords.has(match)) {
          keywords.add(match);
        }
      });
    }
  });

  // 4. Extrage termeni tehnici și entități importante
  const technicalTerms = extractTechnicalTerms(text);
  technicalTerms.slice(0, 3).forEach(term => {
    if (!stopWords.has(term.toLowerCase())) {
      keywords.add(term.toLowerCase());
    }
  });

  // 5. Analiza frecvență pentru termeni specifici (nu cuvinte comune)
  if (keywords.size < maxKeywords) {
    const domainSpecificWords = getDomainSpecificWords(text, language, stopWords);
    domainSpecificWords.slice(0, maxKeywords - keywords.size).forEach(word => keywords.add(word));
  }

  // 6. Filtru final pentru a elimina orice cuvinte rămase comune și fraze lungi
  const filteredKeywords = Array.from(keywords).filter(keyword => {
    return keyword.length > 2 && 
           keyword.length < 15 && // elimină fraze prea lungi
           !keyword.includes(' ') && // doar cuvinte simple, nu fraze
           !stopWords.has(keyword) && 
           !keyword.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final|gicaju|click|access|digital|place|right|small|pdf|anytime|one|all)$/i);
  });

  return filteredKeywords.slice(0, maxKeywords);
}

/**
 * Extrage termeni tehnici și entități importante (doar cuvinte simple)
 */
function extractTechnicalTerms(text) {
  const terms = [];
  const stopWords = new Set([
    'si', 'și', 'sau', 'dar', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'o', 'nu', 'se', 'ce', 'sa', 'să',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'file', 'files', 'new', 'old', 'click', 'access', 'digital', 'place', 'one', 'any', 'time', 'right', 'document', 'documents', 'smallpdf', 'gicaju'
  ]);
  
  // Extrage doar acronime simple (2-4 litere mari)
  const acronyms = text.match(/\b[A-Z]{2,4}\b/g) || [];
  acronyms.forEach(acronym => {
    if (!stopWords.has(acronym.toLowerCase()) && acronym.length > 1) {
      terms.push(acronym.toLowerCase());
    }
  });
  
  // Extrage doar nume proprii simple (1 cuvânt)
  const simpleNouns = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
  simpleNouns.slice(0, 3).forEach(noun => {
    if (!stopWords.has(noun.toLowerCase()) && noun.length > 3) {
      terms.push(noun.toLowerCase());
    }
  });
  
  // Extrage coduri simple
  const simpleCodes = text.match(/\b[A-Za-z]{3,6}\d{1,4}\b/g) || [];
  terms.push(...simpleCodes.slice(0, 2).map(code => code.toLowerCase()));
  
  return terms.slice(0, 3); // maxim 3 termeni
}

/**
 * Obține cuvinte specifice domeniului (nu cuvinte comune)
 */
function getDomainSpecificWords(text, language, stopWords) {
  const words = text.toLowerCase()
    .replace(/[^\w\săâîșțĂÂÎȘȚ]/g, ' ') // păstrează doar litere și spații
    .split(/\s+/);
  
  const wordFreq = {};
  
  words.forEach(word => {
    if (word.length > 4 && // minim 5 caractere
        !stopWords.has(word) && 
        !word.match(/^\d+$/) && // nu sunt doar cifre
        !word.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final)$/i)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Sortează după frecvență și relevă doar termenii cu frecvență moderată (nu prea comuni, nu prea rari)
  return Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2 && freq <= Math.max(3, Math.floor(words.length / 100))) // frecvența moderată
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Generarea avansata de taguri local
 */
async function generateAdvancedTagsLocally(text, fileName, availableTags, maxTags, language, confidenceThreshold) {
  if (!availableTags || availableTags.length === 0) return [];

  const lowerText = (text + ' ' + fileName).toLowerCase();
  const tagScores = [];
  
  // Stop words pentru filtrare
  const stopWords = new Set([
    'si', 'și', 'sau', 'dar', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'o', 'nu', 'se', 'ce', 'sa', 'să',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'file', 'files', 'new', 'old'
  ]);

  availableTags.forEach(tag => {
    if (!tag || !tag.name) return;
    
    let score = 0;
    const tagName = tag.name.toLowerCase();
    const tagWords = tagName.split(/\s+/).filter(word => !stopWords.has(word));
    
    if (tagWords.length === 0) return; // skip dacă tagul conține doar stop words
    
    // Scor pentru matches exact de cuvinte relevante
    tagWords.forEach(word => {
      if (word.length > 2) { // doar cuvinte cu minim 3 caractere
        const exactMatches = (lowerText.match(new RegExp(`\\b${escapeRegex(word)}\\b`, 'g')) || []).length;
        score += exactMatches * 5; // scor mai mare pentru matches exacte
        
        // Variațiuni pentru limba română
        const romanianVariations = [
          word + 'a', word + 'i', word + 'e', word + 'ul', word + 'ului', 
          word + 'uri', word + 'lor', word + 'le', word + 'ilor', word + 'elor'
        ];
        
        romanianVariations.forEach(variation => {
          if (lowerText.includes(variation)) {
            score += 2;
          }
        });
      }
    });

    // Bonus pentru categorii specifice (îmbunătățit)
    const categoryBonus = getEnhancedCategoryBonus(lowerText, tagName);
    score += categoryBonus;

    // Bonus pentru folosirea frecventă (dar nu prea mare)
    if (tag.usageCount && tag.usageCount > 0) {
      score += Math.min(tag.usageCount / 20, 1); // bonus mai mic pentru usage
    }

    // Penalizare pentru taguri cu cuvinte comune
    if (tagWords.some(word => ['file', 'files', 'new', 'document', 'text', 'page'].includes(word))) {
      score *= 0.3; // penalizare mare
    }

    // Calculeaza confidence bazat pe scor și relevanță
    const confidence = Math.min(score / 8, 1); // threshold redus pentru a permite mai multe tag-uri
    
    if (confidence >= 0.15 && score > 0.3) { // threshold foarte redus pentru a permite tag-uri
      tagScores.push({ tag, score, confidence });
    }
  });

  return tagScores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTags)
    .map(({ tag }) => tag);
}

/**
 * Escape regex special characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Bonus îmbunătățit pentru categorii
 */
function getEnhancedCategoryBonus(text, tagName) {
  const categoryMappings = {
    'contract': ['contract', 'contractual', 'agreement', 'accord', 'legal', 'juridic', 'stipulație', 'clauză', 'părți', 'semnătură'],
    'factură': ['factură', 'invoice', 'payment', 'plată', 'sumă', 'total', 'chitanță', 'taxă', 'preț'],
    'raport': ['raport', 'report', 'analiză', 'analysis', 'concluzii', 'findings', 'studiu', 'study', 'cercetare', 'rezultate'],
    'certificat': ['certificat', 'certificate', 'diplomă', 'diploma', 'premiu', 'award', 'calificare', 'competență'],
    'politică': ['politică', 'policy', 'procedură', 'procedure', 'regulament', 'regulation', 'ghid', 'guideline'],
    'manual': ['manual', 'guide', 'ghid', 'instrucțiuni', 'instructions', 'tutorial', 'documentație'],
    'prezentare': ['prezentare', 'presentation', 'slides', 'demonstrație', 'demo', 'expunere'],
    'buget': ['buget', 'budget', 'financiar', 'financial', 'costuri', 'cost', 'cheltuială', 'investiție']
  };

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (tagName.includes(category.toLowerCase())) {
      const matchCount = keywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
      return matchCount * 3; // bonus mai mare pentru matches relevante
    }
  }

  return 0;
}

/**
 * Analiza locala a documentului
 */
async function analyzeDocumentLocally(text, fileName, availableTags, options, language) {
  const [keywords, tags] = await Promise.all([
    generateAdvancedKeywordsLocally(text, fileName, '', 5, language),
    availableTags ? generateAdvancedTagsLocally(text, fileName, availableTags, 3, language, 0.6) : []
  ]);

  const category = detectDocumentCategory(text, fileName);
  const documentType = detectDocumentType(text, fileName);
  const mainTopics = extractMainTopics(text);

  return {
    keywords: keywords,
    tags: tags,
    category: category,
    documentType: documentType,
    mainTopics: mainTopics,
    confidence: 0.7,
    source: 'local_advanced'
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractSimpleEntities(text) {
  const entities = [];
  
  // Extrage nume proprii (cuvinte cu majuscule)
  const properNouns = text.match(/\b[A-Z][a-z]+\b/g) || [];
  entities.push(...properNouns.slice(0, 3));
  
  // Extrage numere și date
  const numbers = text.match(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g) || [];
  entities.push(...numbers.slice(0, 2));
  
  return entities;
}

function getFrequentWords(text, language) {
  const words = text.toLowerCase()
    .replace(/[^\w\săâîșțĂÂÎȘȚ]/g, ' ') // păstrează doar litere și spații
    .split(/\s+/);
  const wordFreq = {};
  
  const commonWords = new Set([
    // Română extinsă
    'si', 'și', 'sau', 'dar', 'iar', 'ori', 'fie', 'nici', 'daca', 'dacă', 'cand', 'când', 'unde', 'care', 'cum', 'cat', 'cât', 'din', 'pentru', 'prin', 'dupa', 'după', 'inainte', 'asupra', 'despre', 'catre', 'către', 'intre', 'între', 'sub', 'langa', 'lângă', 'fara', 'fără', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'una', 'unei', 'unor', 'o', 'nu', 'se', 'ce', 'sa', 'să', 'va', 'vor', 'mai', 'fost', 'sunt', 'era', 'este', 'fiind', 'avea', 'avem', 'aveți', 'doar', 'foarte', 'mult', 'multa', 'multe', 'putin', 'puțin', 'tot', 'toata', 'toate', 'totul', 'acest', 'această', 'aceste', 'acei', 'acele', 'cele', 'cei',
    // Engleză extinsă
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'will', 'may', 'could', 'would', 'should', 'must', 'shall', 'might', 'with', 'from', 'they', 'this', 'that', 'have', 'been', 'were', 'will', 'there', 'what', 'when', 'where', 'which', 'than', 'some', 'time', 'very', 'come', 'make', 'take', 'know', 'think', 'good', 'well', 'also', 'just', 'only', 'into', 'over', 'after', 'back', 'here', 'before', 'through', 'each', 'other', 'many', 'most', 'such', 'like', 'these', 'those', 'them', 'more', 'first', 'last', 'long', 'right', 'work', 'life', 'part', 'place', 'made', 'came', 'want', 'said', 'went', 'look', 'does', 'tell', 'help', 'find', 'give', 'keep', 'move', 'turn', 'show', 'play', 'seem', 'ask', 'feel', 'try', 'hand', 'eye', 'face', 'fact', 'case', 'point', 'group', 'year', 'week', 'month', 'night', 'area',
    // Cuvinte comune în documente
    'file', 'files', 'document', 'documents', 'pdf', 'doc', 'docx', 'txt', 'page', 'pages', 'text', 'content', 'data', 'info', 'information', 'copy', 'draft', 'final', 'version', 'update', 'updated', 'section', 'chapter', 'paragraph', 'line', 'word', 'words', 'title', 'name', 'date', 'time', 'number', 'item', 'list', 'table', 'figure', 'image', 'photo', 'picture', 'note', 'notes', 'comment', 'comments', 'description', 'details', 'example', 'examples', 'sample', 'test', 'demo', 'temporary', 'temp', 'backup', 'untitled', 'misc', 'other', 'various', 'general', 'common', 'basic', 'simple', 'standard', 'normal', 'regular', 'default'
  ]);

  words.forEach(word => {
    if (word.length > 4 && // minim 5 caractere pentru cuvinte mai specifice
        !commonWords.has(word) && 
        !word.match(/^\d+$/) && // nu sunt doar cifre
        !word.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final)$/i)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Filtrează cuvinte cu frecvență moderată (nu prea comune, nu prea rare)
  return Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2 && freq <= Math.max(3, Math.floor(words.length / 50))) // frecvența moderată
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function getCategoryBonus(text, tagName) {
  const categoryMappings = {
    'contract': ['contract', 'agreement', 'legal', 'terms'],
    'factura': ['invoice', 'payment', 'bill', 'total'],
    'raport': ['report', 'analysis', 'findings', 'study'],
    'certificate': ['certificate', 'diploma', 'award'],
    'policy': ['policy', 'procedure', 'regulation'],
    'manual': ['manual', 'guide', 'instructions'],
    'presentation': ['presentation', 'slides', 'demo']
  };

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (tagName.includes(category)) {
      const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
      return matchCount * 2;
    }
  }

  return 0;
}

function detectDocumentCategory(text, fileName) {
  const lowerText = (text + ' ' + fileName).toLowerCase();
  
  const categories = {
    'contract': ['contract', 'agreement', 'terms', 'legal'],
    'financial': ['invoice', 'payment', 'budget', 'financial'],
    'report': ['report', 'analysis', 'findings', 'study'],
    'certificate': ['certificate', 'diploma', 'award'],
    'policy': ['policy', 'procedure', 'regulation'],
    'manual': ['manual', 'guide', 'instructions'],
    'presentation': ['presentation', 'slides', 'demo']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }

  return 'general';
}

function detectDocumentType(text, fileName) {
  const lowerText = (text + ' ' + fileName).toLowerCase();
  
  if (lowerText.includes('contract') || lowerText.includes('agreement')) return 'Contract';
  if (lowerText.includes('invoice') || lowerText.includes('factura')) return 'Invoice';
  if (lowerText.includes('report') || lowerText.includes('raport')) return 'Report';
  if (lowerText.includes('certificate') || lowerText.includes('certificat')) return 'Certificate';
  if (lowerText.includes('policy') || lowerText.includes('politica')) return 'Policy';
  if (lowerText.includes('manual')) return 'Manual';
  if (lowerText.includes('presentation') || lowerText.includes('prezentare')) return 'Presentation';
  
  return 'Document';
}

function extractMainTopics(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const topics = [];
  
  // Extrage primele 3 propozitii ca topics
  sentences.slice(0, 3).forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    if (words.length > 5) {
      topics.push(words.slice(0, 8).join(' ') + '...');
    }
  });
  
  return topics;
}

function parseAnalysisFromText(text) {
  // Functie de rezerva pentru parsarea rezultatelor AI
  return {
    keywords: [],
    category: 'general',
    summary: 'Analiză indisponibilă',
    documentType: 'Document',
    mainTopics: [],
    confidence: 0.3
  };
}

// Placeholder pentru alte AI providers
async function generateKeywordsWithHuggingFace(text, fileName, documentType, maxKeywords, language) {
  // Implementarea pentru HuggingFace
  return await generateAdvancedKeywordsLocally(text, fileName, documentType, maxKeywords, language);
}

async function generateTagsWithHuggingFace(text, fileName, availableTags, maxTags, language, confidenceThreshold) {
  // Implementarea pentru HuggingFace
  return await generateAdvancedTagsLocally(text, fileName, availableTags, maxTags, language, confidenceThreshold);
}

async function analyzeDocumentWithHuggingFace(text, fileName, availableTags, options, language) {
  // Implementarea pentru HuggingFace
  return await analyzeDocumentLocally(text, fileName, availableTags, options, language);
}

async function generateKeywordsWithLocalModel(text, fileName, documentType, maxKeywords, language) {
  // Implementarea pentru model local
  return await generateAdvancedKeywordsLocally(text, fileName, documentType, maxKeywords, language);
}

async function generateTagsWithLocalModel(text, fileName, availableTags, maxTags, language, confidenceThreshold) {
  // Implementarea pentru model local
  return await generateAdvancedTagsLocally(text, fileName, availableTags, maxTags, language, confidenceThreshold);
}

async function analyzeDocumentWithLocalModel(text, fileName, availableTags, options, language) {
  // Implementarea pentru model local
  return await analyzeDocumentLocally(text, fileName, availableTags, options, language);
}

module.exports = router; 