import { backend } from '../config';

/**
 * Professional AI service for document content analysis and suggestion generation
 * Provides advanced keyword extraction and tag suggestions using AI backend
 */
class DocumentSuggestionService {
  constructor() {
    this.apiUrl = backend;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.cache = new Map();
    
    // Clear cache pe startup pentru a forța reevaluarea cu algoritmul îmbunătățit
    this.clearCache();
  }

  /**
   * Generate professional keywords using AI backend
   */
  async generateProfessionalKeywords(text, fileName = '', documentType = '', options = {}) {
    const cacheKey = this.generateCacheKey('keywords', text, fileName, documentType);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const requestData = {
      text: text,
      fileName: fileName,
      documentType: documentType,
      options: {
        maxKeywords: options.maxKeywords || 5,
        language: options.language || 'ro',
        contextAnalysis: options.contextAnalysis !== false,
        semanticAnalysis: options.semanticAnalysis !== false,
        entityRecognition: options.entityRecognition !== false,
        ...options
      }
    };

    try {
      const result = await this.makeAiRequest('/ai/keywords', requestData);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error generating professional keywords:', error);
      return this.fallbackKeywordGeneration(text, fileName);
    }
  }

  /**
   * Generate professional tags using AI backend
   */
  async generateProfessionalTags(text, fileName = '', availableTags = [], options = {}) {
    const cacheKey = this.generateCacheKey('tags', text, fileName, availableTags.length);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const requestData = {
      text: text,
      fileName: fileName,
      availableTags: availableTags,
      options: {
        maxTags: options.maxTags || 3,
        language: options.language || 'ro',
        confidenceThreshold: options.confidenceThreshold || 0.6,
        categoryAnalysis: options.categoryAnalysis !== false,
        contentClassification: options.contentClassification !== false,
        ...options
      }
    };

    try {
      const result = await this.makeAiRequest('/ai/tags', requestData);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error generating professional tags:', error);
      return this.fallbackTagGeneration(text, availableTags);
    }
  }

  /**
   * Complete document analysis for suggestions
   */
  async analyzeDocument(text, fileName = '', availableTags = [], options = {}) {
    const cacheKey = this.generateCacheKey('analysis', text, fileName, availableTags.length);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const requestData = {
      text: text,
      fileName: fileName,
      availableTags: availableTags,
      options: {
        includeKeywords: options.includeKeywords !== false,
        includeTags: options.includeTags !== false,
        includeCategory: options.includeCategory !== false,
        includeSummary: options.includeSummary || false,
        includeEntities: options.includeEntities || false,
        language: options.language || 'ro',
        ...options
      }
    };

    try {
      const result = await this.makeAiRequest('/ai/analyze', requestData);
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error analyzing document:', error);
      
      const [keywords, tags] = await Promise.all([
        this.fallbackKeywordGeneration(text, fileName),
        this.fallbackTagGeneration(text, availableTags)
      ]);

      return {
        keywords: keywords,
        tags: tags,
        category: this.detectDocumentCategory(text, fileName),
        confidence: 0.3,
        source: 'fallback'
      };
    }
  }

  /**
   * Make AI request with retry logic
   */
  async makeAiRequest(endpoint, data) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'AI request failed');
        }

        return result.data;
      } catch (error) {
        console.warn(`AI request attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Fallback keyword generation with enhanced patterns
   */
  fallbackKeywordGeneration(text, fileName = '') {
    const keywords = new Set();
    
    // Lista extinsă de stop words
    const stopWords = new Set([
      // Română
      'si', 'și', 'sau', 'dar', 'iar', 'ori', 'fie', 'nici', 'daca', 'dacă', 'cand', 'când', 'unde', 'care', 'cum', 'cat', 'cât', 'din', 'pentru', 'prin', 'dupa', 'după', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'una', 'unei', 'unor', 'o', 'nu', 'se', 'ce', 'sa', 'să', 'va', 'vor', 'mai', 'fost', 'sunt', 'era', 'este', 'fiind', 'avea', 'avem', 'aveți', 'doar', 'foarte', 'mult', 'multa', 'multe', 'putin', 'puțin', 'tot', 'toata', 'toate', 'totul', 'acest', 'această', 'aceste', 'acei', 'acele', 'cele', 'cei',
      // Engleză
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'will', 'may', 'could', 'would', 'should', 'must', 'shall', 'might', 'with', 'from', 'they', 'this', 'that', 'have', 'been', 'were', 'there', 'what', 'when', 'where', 'which', 'than', 'some', 'time', 'very', 'come', 'make', 'take', 'know', 'think', 'good', 'well', 'also', 'just', 'only', 'into', 'over', 'after', 'back', 'here', 'before', 'through', 'each', 'other', 'many', 'most', 'such', 'like', 'these', 'those', 'them', 'more', 'first', 'last', 'long', 'right',
      // Cuvinte comune în documente și fișiere
      'file', 'files', 'document', 'documents', 'pdf', 'doc', 'docx', 'txt', 'page', 'pages', 'text', 'content', 'data', 'info', 'information', 'copy', 'draft', 'final', 'version', 'update', 'updated', 'section', 'chapter', 'paragraph', 'line', 'word', 'words', 'title', 'name', 'date', 'time', 'number', 'item', 'list', 'table', 'figure', 'image', 'photo', 'picture', 'note', 'notes', 'comment', 'comments', 'description', 'details', 'example', 'examples', 'sample', 'test', 'demo', 'temporary', 'temp', 'backup', 'untitled', 'misc', 'other', 'various', 'general', 'common', 'basic', 'simple', 'standard', 'normal', 'regular', 'default', 'click', 'access', 'digital', 'smallpdf', 'gicaju'
    ]);
    
    // Extract from filename cu filtrare îmbunătățită
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
                 !lowerWord.match(/^(copy|draft|final|new|old|v\d+|\d+|gicaju|click|access|digital|smallpdf)$/i); // nu sunt cuvinte de versioning sau nonsense
        })
        .slice(0, 2); // maxim 2 cuvinte din numele fișierului
      
      fileNameWords.forEach(word => keywords.add(word.toLowerCase()));
    }

    if (text && text.length > 0) {
      const sentences = text.split(/[.!?]+/);
      
      // Enhanced patterns for document types
      const importantPatterns = [
        /\b(contract|agreement|accord|înțelegere|acord)\b/gi,
        /\b(report|raport|analysis|analiză|study|studiu)\b/gi,
        /\b(invoice|factură|bill|chitanță|plată)\b/gi,
        /\b(policy|politică|procedure|procedură|manual)\b/gi,
        /\b(certificate|certificat|diploma|diplomă|award)\b/gi,
        /\b(proposal|propunere|offer|ofertă|recommendation|recomandare)\b/gi,
        /\b(budget|buget|financial|financiar|cost|costuri)\b/gi,
        /\b(presentation|prezentare|slides|demo|demonstrație)\b/gi
      ];

      sentences.forEach(sentence => {
        importantPatterns.forEach(pattern => {
          const matches = sentence.match(pattern);
          if (matches) {
            matches.forEach(match => keywords.add(match.toLowerCase()));
          }
        });
      });

      // Enhanced frequency analysis cu filtrare îmbunătățită
      if (keywords.size < 3) {
        const words = text.toLowerCase()
          .replace(/[^\w\săâîșțĂÂÎȘȚ]/g, ' ')
          .split(/\s+/);
        const wordFreq = {};
        
        const commonWords = new Set([
          // Română extinsă
          'si', 'și', 'sau', 'dar', 'iar', 'ori', 'fie', 'nici', 'daca', 'dacă', 'cand', 'când', 'unde', 'care', 'cum', 'cat', 'cât', 'din', 'pentru', 'prin', 'dupa', 'după', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'una', 'unei', 'unor', 'o', 'nu', 'se', 'ce', 'sa', 'să', 'va', 'vor', 'mai', 'fost', 'sunt', 'era', 'este', 'fiind', 'avea', 'avem', 'aveți', 'doar', 'foarte', 'mult', 'multa', 'multe', 'putin', 'puțin', 'tot', 'toata', 'toate', 'totul', 'acest', 'această', 'aceste', 'acei', 'acele', 'cele', 'cei',
          // Engleză extinsă
          'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'will', 'may', 'could', 'would', 'should', 'must', 'shall', 'might', 'with', 'from', 'they', 'this', 'that', 'have', 'been', 'were', 'there', 'what', 'when', 'where', 'which', 'than', 'some', 'time', 'very', 'come', 'make', 'take', 'know', 'think', 'good', 'well', 'also', 'just', 'only', 'into', 'over', 'after', 'back', 'here', 'before', 'through', 'each', 'other', 'many', 'most', 'such', 'like', 'these', 'those', 'them', 'more', 'first', 'last', 'long', 'right',
          // Cuvinte comune în documente
          'file', 'files', 'document', 'documents', 'pdf', 'doc', 'docx', 'txt', 'page', 'pages', 'text', 'content', 'data', 'info', 'information', 'copy', 'draft', 'final', 'version', 'update', 'updated', 'section', 'chapter', 'paragraph', 'line', 'word', 'words', 'title', 'name', 'date', 'time', 'number', 'item', 'list', 'table', 'figure', 'image', 'photo', 'picture', 'note', 'notes', 'comment', 'comments', 'description', 'details', 'example', 'examples', 'sample', 'test', 'demo', 'temporary', 'temp', 'backup', 'untitled'
        ]);

        words.forEach(word => {
          if (word.length > 4 && // minim 5 caractere
              !commonWords.has(word) && 
              !word.match(/^\d+$/) && 
              !word.match(/^(file|document|page|text|content|data|info|new|old|copy|draft|final)$/i)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          }
        });

        // Filtrează cuvinte cu frecvență moderată
        const topWords = Object.entries(wordFreq)
          .filter(([word, freq]) => freq >= 2 && freq <= Math.max(3, Math.floor(words.length / 100)))
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([word]) => word);

        topWords.forEach(word => keywords.add(word));
      }
    }

    // Filtru final pentru a elimina fraze lungi
    const finalKeywords = Array.from(keywords).filter(keyword => {
      return keyword.length > 2 && 
             keyword.length < 15 && // elimină fraze prea lungi
             !keyword.includes(' ') && // doar cuvinte simple, nu fraze
             !stopWords.has(keyword);
    });

    return finalKeywords.slice(0, 5);
  }

  /**
   * Enhanced fallback tag generation
   */
  fallbackTagGeneration(text, availableTags = []) {
    if (!text || availableTags.length === 0) return [];

    const lowerText = text.toLowerCase();
    const tagScores = [];
    
    // Stop words pentru filtrare tag-uri
    const stopWords = new Set([
      'si', 'și', 'sau', 'dar', 'cu', 'de', 'la', 'pe', 'in', 'în', 'un', 'o', 'nu', 'se', 'ce', 'sa', 'să',
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'file', 'files', 'new', 'old', 'click', 'access', 'digital', 'gicaju'
    ]);

    availableTags.forEach(tag => {
      if (!tag || !tag.name) return;
      
      const tagName = tag.name.toLowerCase();
      const tagWords = tagName.split(/\s+/).filter(word => !stopWords.has(word));
      
      if (tagWords.length === 0) return; // skip dacă tagul conține doar stop words
      
      let score = 0;
      
      // Exact word matches cu filtrare
      tagWords.forEach(word => {
        if (word.length > 2) { // doar cuvinte cu minim 3 caractere
          const exactMatches = (lowerText.match(new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'g')) || []).length;
          score += exactMatches * 5; // scor mai mare pentru matches exacte
          
          // Romanian word variations
          const variations = [
            word + 'a', word + 'i', word + 'e', word + 'ul', word + 'ului', 
            word + 'uri', word + 'lor', word + 'le', word + 'ilor', word + 'elor'
          ];
          
          variations.forEach(variation => {
            if (lowerText.includes(variation)) {
              score += 2;
            }
          });
        }
      });

      // Enhanced category bonus
      const categoryBonus = this.getCategoryBonus(lowerText, tagName);
      score += categoryBonus;

      // Usage frequency bonus (redus)
      if (tag.usageCount && tag.usageCount > 0) {
        score += Math.min(tag.usageCount / 20, 1);
      }

      // Penalizare pentru taguri cu cuvinte comune
      if (tagWords.some(word => ['file', 'files', 'new', 'document', 'text', 'page', 'click', 'access', 'digital', 'gicaju'].includes(word))) {
        score *= 0.2; // penalizare foarte mare
      }

      // Confidence calculation
      const confidence = Math.min(score / 15, 1);
      
      if (confidence >= 0.2 && score > 0.5) { // threshold redus pentru a permite mai multe tag-uri
        tagScores.push({ tag, score, confidence });
      }
    });

    return tagScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ tag }) => tag);
  }
  
  /**
   * Escape regex special characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Enhanced category bonus calculation
   */
  getCategoryBonus(text, tagName) {
    const categoryMappings = {
      'contract': ['contract', 'înțelegere', 'acord', 'agreement', 'legal', 'terms', 'signature', 'semnătură'],
      'factura': ['factură', 'invoice', 'payment', 'plată', 'bill', 'chitanță', 'total', 'sumă'],
      'raport': ['raport', 'report', 'analysis', 'analiză', 'findings', 'study', 'studiu', 'conclusion'],
      'certificat': ['certificat', 'certificate', 'diploma', 'diplomă', 'award', 'premiu', 'qualification'],
      'politica': ['politică', 'policy', 'procedure', 'procedură', 'regulation', 'regulament'],
      'manual': ['manual', 'guide', 'ghid', 'instructions', 'instrucțiuni', 'tutorial'],
      'prezentare': ['prezentare', 'presentation', 'slides', 'demo', 'demonstrație', 'show'],
      'buget': ['buget', 'budget', 'financial', 'financiar', 'cost', 'costuri', 'expense', 'revenue']
    };

    for (const [category, keywords] of Object.entries(categoryMappings)) {
      if (tagName.includes(category)) {
        const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
        return matchCount * 2;
      }
    }

    return 0;
  }

  /**
   * Enhanced document category detection
   */
  detectDocumentCategory(text, fileName = '') {
    const lowerText = (text + ' ' + fileName).toLowerCase();
    
    const categories = {
      'contract': ['contract', 'înțelegere', 'acord', 'agreement', 'terms', 'legal', 'signature'],
      'financial': ['factură', 'invoice', 'payment', 'plată', 'budget', 'buget', 'financial', 'cost'],
      'report': ['raport', 'report', 'analysis', 'analiză', 'findings', 'study', 'studiu'],
      'certificate': ['certificat', 'certificate', 'diploma', 'diplomă', 'award', 'premiu'],
      'policy': ['politică', 'policy', 'procedure', 'procedură', 'regulation', 'regulament'],
      'manual': ['manual', 'guide', 'ghid', 'instructions', 'instrucțiuni'],
      'presentation': ['prezentare', 'presentation', 'slides', 'demo', 'demonstrație']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Generate cache key
   */
  generateCacheKey(type, ...args) {
    const key = args.join('|');
    return `${type}_${this.hashString(key)}`;
  }

  /**
   * Simple hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default DocumentSuggestionService; 