const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../db/db');
const pdf2pic = require('pdf2pic');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Upload request received:', {
            headers: req.headers,
            body: req.body,
            file: file
        });

        // Create SyncAgent directory if it doesn't exist
        const syncAgentDir = path.join(uploadsDir, 'SyncAgent');
        if (!fs.existsSync(syncAgentDir)) {
            fs.mkdirSync(syncAgentDir, { recursive: true });
        }

        // Create subdirectory based on the folder name
        const folderName = req.body.folder_name || 'default';
        const uploadPath = path.join(syncAgentDir, folderName);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request details:', {
            file: req.file,
            body: req.body,
            headers: req.headers
        });

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const {
            type = 'Official Document',
            comment = 'Uploaded via Sync Agent',
            realname,
            user_id,
            folder_name
        } = req.body;

        console.log('Processing upload with params:', {
            type,
            comment,
            realname,
            user_id,
            folder_name
        });

        const con = await pool.getConnection();
        
        // Get type_id from document_types table
        const [typeResult] = await con.query(
            'SELECT id FROM document_types WHERE type_name = ?',
            [type]
        );

        if (!typeResult || typeResult.length === 0) {
            con.release();
            return res.status(400).json({ error: "Invalid document type" });
        }

        const typeId = typeResult[0].id;
        const fileSize = req.file.size;
        const relativePath = path.join('uploads', 'SyncAgent', folder_name || 'default', req.file.filename);

        // Extract first page as PNG data URL for thumbnails (if PDF)
        let firstPageBase64 = null;
        try {
            if (req.file.mimetype === 'application/pdf') {
                const fullFilePath = req.file.path; // absolute path created by multer
                // Convert first page of PDF to image using pdf2pic (same settings as /post_docs)
                const tempDir = path.join(process.cwd(), 'temp_firstpage');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const convert = pdf2pic.fromPath(fullFilePath, {
                    density: 100,
                    saveFilename: 'firstpage',
                    savePath: tempDir,
                    format: 'png',
                    width: 400,
                    height: 500,
                });

                const first = await convert(1);
                if (first && first.path && fs.existsSync(first.path)) {
                    const imageBuffer = fs.readFileSync(first.path);
                    const b64 = imageBuffer.toString('base64');
                    firstPageBase64 = `data:image/png;base64,${b64}`;
                }

                // Cleanup
                try { if (first && first.path && fs.existsSync(first.path)) fs.unlinkSync(first.path); } catch {}
                try { if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
            }
        } catch (thumbErr) {
            console.warn('Thumbnail extraction failed for uploaded file:', thumbErr.message);
        }

        // Insert document into database (store first_page if available)
        const [result] = await con.query(
            `INSERT INTO table_document 
            (nom_document, path, id_user_source, comment, nom_document_original, type_id, file_size, first_page) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.file.filename,
                relativePath,
                user_id,
                comment,
                realname || req.file.originalname,
                typeId,
                fileSize,
                firstPageBase64
            ]
        );

        // Fetch the complete document data after insert
        const [documents] = await con.query(
            `SELECT 
                d.*,
                dt.type_name,
                u.username as uploaded_by,
                GROUP_CONCAT(DISTINCT t.id_tag) as tag_ids,
                GROUP_CONCAT(DISTINCT t.tag_name) as tag_names,
                GROUP_CONCAT(DISTINCT t.is_predefined) as tag_predefined
            FROM table_document d
            LEFT JOIN document_types dt ON d.type_id = dt.id
            LEFT JOIN users u ON d.id_user_source = u.id
            LEFT JOIN document_tags dtags ON d.id = dtags.document_id
            LEFT JOIN tags t ON dtags.tag_id = t.id_tag
            WHERE d.id = ?
            GROUP BY d.id`,
            [result.insertId]
        );

        con.release();

        if (!documents || documents.length === 0) {
            return res.status(500).json({ error: 'Failed to fetch uploaded document data' });
        }

        const document = documents[0];

        // Format tags data
        const tags = document.tag_ids ? document.tag_ids.split(',').map((id, index) => ({
            id_tag: parseInt(id),
            tag_name: document.tag_names.split(',')[index],
            is_predefined: parseInt(document.tag_predefined.split(',')[index])
        })) : [];

        // Format the response
        const formattedDocument = {
            id: document.id,
            name: document.nom_document,
            originalName: document.nom_document_original,
            path: document.path,
            type: document.type_name,
            type_id: document.type_id,
            comment: document.comment,
            uploaded_by: document.uploaded_by,
            uploaded_at: document.date_upload,
            file_size: document.file_size,
            tags: tags
        };

        console.log('Document uploaded successfully:', {
            documentId: result.insertId,
            filename: req.file.filename,
            path: relativePath,
            document: formattedDocument
        });

        // Emit real-time upload event via Socket.IO
        try {
          const { io } = require('../server'); // Get Socket.IO instance
          if (io) {
            const eventData = {
              type: 'upload',
              document_name: req.file.originalname,
              file_size: req.file.size,
              user: {
                id: req.session.id_user,
                nom: req.session.nom || 'Unknown User'
              },
              timestamp: new Date().toISOString()
            };
            
            console.log('📤 Emitting real-time upload event:', eventData);
            io.to('statistics').emit('documentUploaded', eventData); // Send only to statistics subscribers
          }
        } catch (socketError) {
          console.error('Error emitting upload event:', socketError);
          // Continue even if socket emission fails
        }

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            document: formattedDocument
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// Add endpoint to fetch latest document data
router.get('/latest/:documentName', async (req, res) => {
    try {
        const { documentName } = req.params;
        const con = await pool.getConnection();

        // Get the latest document data with all related information
        const [documents] = await con.query(
            `SELECT 
                d.*,
                dt.type_name,
                u.username as uploaded_by,
                GROUP_CONCAT(DISTINCT t.id_tag) as tag_ids,
                GROUP_CONCAT(DISTINCT t.tag_name) as tag_names,
                GROUP_CONCAT(DISTINCT t.is_predefined) as tag_predefined
            FROM table_document d
            LEFT JOIN document_types dt ON d.type_id = dt.id
            LEFT JOIN users u ON d.id_user_source = u.id
            LEFT JOIN document_tags dtags ON d.id = dtags.document_id
            LEFT JOIN tags t ON dtags.tag_id = t.id_tag
            WHERE d.nom_document_original = ?
            GROUP BY d.id
            ORDER BY d.id DESC
            LIMIT 1`,
            [documentName]
        );

        con.release();

        if (!documents || documents.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = documents[0];

        // Format tags data
        const tags = document.tag_ids ? document.tag_ids.split(',').map((id, index) => ({
            id_tag: parseInt(id),
            tag_name: document.tag_names.split(',')[index],
            is_predefined: parseInt(document.tag_predefined.split(',')[index])
        })) : [];

        // Format the response
        const formattedDocument = {
            id: document.id,
            name: document.nom_document,
            originalName: document.nom_document_original,
            path: document.path,
            type: document.type_name,
            type_id: document.type_id,
            comment: document.comment,
            uploaded_by: document.uploaded_by,
            uploaded_at: document.date_upload,
            file_size: document.file_size,
            tags: tags
        };

        res.json({
            success: true,
            document: formattedDocument
        });
    } catch (error) {
        console.error('Error fetching document data:', error);
        res.status(500).json({ error: 'Error fetching document data' });
    }
});

module.exports = router; 