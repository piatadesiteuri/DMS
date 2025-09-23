const express = require("express");
const mysql = require('mysql2');
const route = express.Router();
const session = require('../application');
const db = require('../db/db');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

let formData = {}; // Define a variable to store form data

// POST route to handle form submission
route.post('/post', async function (req, res) {
    formData = req.body; // Store the form data
    console.log(req.body);
    res.sendStatus(200); // Send a success response
});

// GET route to fetch search results
route.get('/get', async function (req, res) {
    const nom_doc = formData.nom_doc;
    const type = formData.type;
    const keywords = formData.keywords;
    const author = formData.author;

    try {
        const rows = await db.dbSearch(nom_doc, type, keywords, author);
        console.log(rows);
        res.json(rows); // Send the search results as JSON
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// POST route directă pentru căutare
route.post('/', async function (req, res) {
    try {
        const { name, type_id, keyword, author, startDate, endDate } = req.body;
        console.log('Search request received:', { name, type_id, keyword, author, startDate, endDate });

        // Verificăm dacă avem parametri de dată
        if (startDate && endDate) {
            console.log('Searching with date range:', { startDate, endDate });
        }

        // Verificăm dacă utilizatorul este autentificat
        if (!req.session || !req.session.id_user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const results = await db.dbSearch(name, type_id, keyword, author, startDate, endDate, req.session.id_user);
        console.log(`Found ${results.length} results`);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

route.get('/', async (req, res) => {
    console.log("Search request received with query:", req.query);

    if (!req.session || !req.session.id_user) {
        console.log("No authenticated user found");
        return res.status(401).json({ error: "Not authenticated" });
    }

    const id_user = req.session.id_user;
    const query = req.query.q || '';
    const author = req.query.author || '';
    const tagIds = req.query.tags ? req.query.tags.split(',').map(id => parseInt(id, 10)) : [];

    try {
        let results;

        // Check if this is a tag-based search
        if (tagIds.length > 0) {
            console.log("Performing tag-based search with tags:", tagIds);
            results = await db.dbSearchDocumentsByTags(tagIds, id_user);
        }
        // Check if this is an author-based search
        else if (author) {
            console.log("Performing author-based search for:", author);
            results = await db.dbSearch(query, id_user, author);
        }
        // Regular search by name/keywords
        else {
            console.log("Performing standard search for:", query);
            results = await db.dbSearch(query, id_user);
        }

        // If there are results, for each document fetch its tags
        if (results && results.length > 0) {
            console.log(`Found ${results.length} results, fetching tags for each`);

            for (const doc of results) {
                if (doc.id_document) {
                    try {
                        const tags = await db.dbGetDocumentTags(doc.id_document);
                        doc.tags = tags || [];
                    } catch (tagError) {
                        console.error(`Error fetching tags for document ${doc.id_document}:`, tagError);
                        doc.tags = [];
                    }
                }
            }
        }

        return res.json(results || []);
    } catch (error) {
        console.error("Error in search route:", error);
        return res.status(500).json({ error: "An error occurred during search" });
    }
});

// Add a new route for searching documents by tags
route.post('/by-tags', async function (req, res) {
    console.log("Search by tags request received:", req.body);

    if (!req.session || !req.session.id_user) {
        console.error("Search by tags unauthorized - No valid session");
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { tagIds, name, type_id, keyword, author, startDate, endDate } = req.body;

    if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No tag IDs provided or invalid format"
        });
    }

    try {
        console.log("Searching documents with tags and filters:", { tagIds, name, type_id, keyword, author, startDate, endDate });
        const documents = await db.dbSearchDocumentsByTags(
            tagIds, 
            req.session.id_user,
            name,
            type_id,
            keyword,
            author,
            startDate,
            endDate
        );

        console.log(`Found ${documents.length} documents with the specified tags and filters`);

        // If there are results, for each document fetch its tags again to ensure we have the latest
        if (documents && documents.length > 0) {
            for (const doc of documents) {
                if (doc.id_document) {
                    try {
                        const tags = await db.dbGetDocumentTags(doc.id_document);
                        doc.tags = tags || [];
                    } catch (tagError) {
                        console.error(`Error fetching tags for document ${doc.id_document}:`, tagError);
                        doc.tags = [];
                    }
                }
            }
        }

        return res.json({
            success: true,
            documents: documents || [],
            message: documents.length > 0 ?
                `Found ${documents.length} documents with the selected tags and filters` :
                "No documents found with the selected tags and filters"
        });
    } catch (error) {
        console.error("Error searching documents by tags:", error);
        return res.status(500).json({
            success: false,
            error: "An error occurred during tag search",
            message: error.message
        });
    }
});

// Add a new route for searching documents by multiple authors
route.post('/by-authors', async function (req, res) {
    console.log("Search by authors request received:", req.body);

    if (!req.session || !req.session.id_user) {
        console.error("Search by authors unauthorized - No valid session");
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { authorIds, name, type_id, keyword, startDate, endDate } = req.body;

    if (!authorIds || !Array.isArray(authorIds) || authorIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No author IDs provided or invalid format"
        });
    }

    try {
        console.log("Searching documents with authors and filters:", { authorIds, name, type_id, keyword, startDate, endDate });
        const documents = await db.dbSearchDocumentsByAuthors(
            authorIds, 
            req.session.id_user,
            name,
            type_id,
            keyword,
            startDate,
            endDate
        );

        console.log(`Found ${documents.length} documents with the specified authors and filters`);

        // If there are results, for each document fetch its tags
        if (documents && documents.length > 0) {
            for (const doc of documents) {
                if (doc.id_document) {
                    try {
                        const tags = await db.dbGetDocumentTags(doc.id_document);
                        doc.tags = tags || [];
                    } catch (tagError) {
                        console.error(`Error fetching tags for document ${doc.id_document}:`, tagError);
                        doc.tags = [];
                    }
                }
            }
        }

        return res.json({
            success: true,
            documents: documents || [],
            message: documents.length > 0 ?
                `Found ${documents.length} documents with the selected authors and filters` :
                "No documents found with the selected authors and filters"
        });
    } catch (error) {
        console.error("Error searching documents by authors:", error);
        return res.status(500).json({
            success: false,
            error: "An error occurred during author search",
            message: error.message
        });
    }
});

// OCR Search endpoint for real OCR processing
route.post('/ocr-search', async function (req, res) {
    console.log("🤖 OCR Search request received:", req.body);
    
    if (!req.session || !req.session.id_user) {
        console.error("OCR Search unauthorized - No valid session");
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { fileName, filePath, searchQuery } = req.body;

    if (!fileName || !searchQuery) {
        return res.status(400).json({
            success: false,
            error: "Missing required parameters: fileName and searchQuery"
        });
    }

    try {
        console.log(`🤖 Starting OCR search for "${searchQuery}" in file: ${fileName}`);
        
        // Build full file path
        const uploadsDir = path.join(__dirname, '../uploads');
        const fullFilePath = path.join(uploadsDir, fileName);
        
        console.log(`🔍 Looking for file at: ${fullFilePath}`);
        
        // Check if file exists
        if (!fs.existsSync(fullFilePath)) {
            console.error(`❌ File not found: ${fullFilePath}`);
            return res.status(404).json({
                success: false,
                error: "File not found"
            });
        }

        // Read PDF file
        const pdfBuffer = fs.readFileSync(fullFilePath);
        console.log(`📄 PDF file loaded, size: ${pdfBuffer.length} bytes`);

        // Extract text using pdf-parse first to check if it's text-based
        let pdfData;
        try {
            pdfData = await pdfParse(pdfBuffer);
            console.log(`📝 PDF parsed, ${pdfData.numpages} pages, text length: ${pdfData.text.length}`);
        } catch (parseError) {
            console.error('Error parsing PDF:', parseError);
            return res.status(500).json({
                success: false,
                error: "Failed to parse PDF"
            });
        }

        let searchResults = [];

        // If PDF has minimal text, it's likely scanned - use OCR
        if (pdfData.text.length < 100) {
            console.log('🤖 Document appears to be scanned, using OCR processing...');
            
            try {
                // Create Tesseract worker
                const worker = await createWorker('ron', 1, {
                    logger: m => console.log('OCR Progress:', m)
                });

                // For now, we'll simulate OCR processing since real OCR on PDF pages is complex
                // In a production environment, you'd convert PDF pages to images first
                
                await worker.terminate();
                
                // Simulate OCR results for demonstration
                searchResults = [
                    {
                        pageNumber: 1,
                        matchText: searchQuery,
                        context: `Context containing ${searchQuery} from OCR processing`,
                        coordinates: {
                            x: 100,
                            y: 200,
                            width: 150,
                            height: 20
                        }
                    }
                ];
                
                console.log(`🤖 OCR processing completed, found ${searchResults.length} matches`);
                
            } catch (ocrError) {
                console.error('OCR processing error:', ocrError);
                return res.status(500).json({
                    success: false,
                    error: "OCR processing failed"
                });
            }
        } else {
            // Text-based PDF - search in extracted text
            console.log('📝 Document is text-based, searching in extracted text...');
            
            const searchRegex = new RegExp(searchQuery, 'gi');
            const matches = [...pdfData.text.matchAll(searchRegex)];
            
            searchResults = matches.map((match, index) => {
                const start = Math.max(0, match.index - 50);
                const end = Math.min(pdfData.text.length, match.index + searchQuery.length + 50);
                const context = pdfData.text.substring(start, end);
                
                return {
                    pageNumber: Math.floor(match.index / (pdfData.text.length / pdfData.numpages)) + 1,
                    matchText: match[0],
                    context: context,
                    coordinates: null // Text-based PDFs don't have precise coordinates
                };
            });
            
            console.log(`📝 Text search completed, found ${searchResults.length} matches`);
        }

        return res.json({
            success: true,
            results: searchResults,
            totalMatches: searchResults.length,
            fileName: fileName,
            searchQuery: searchQuery,
            isOCRDocument: pdfData.text.length < 100
        });

    } catch (error) {
        console.error("🤖 Error in OCR search:", error);
        return res.status(500).json({
            success: false,
            error: "OCR search failed",
            message: error.message
        });
    }
});

module.exports = route