const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { dbDownloadDocument, recordDocumentStatistic } = require('../db/db');
const { logUserAction } = require('../utils/logger');

router.get('/:documentId', async (req, res) => {
    try {
        const documentId = req.params.documentId;
        const userId = req.session.id_user;

        console.log("View request received:", { documentId, userId });

        // Get document metadata from database
        const result = await dbDownloadDocument(documentId, userId);
        console.log("Database result:", result);

        if (!result.success) {
            console.error("Error from database:", result.error);
            return res.status(404).json({ error: result.error });
        }

        const document = result.document;
        console.log("Document details:", document);

        // Note: View statistics are now handled in document_log table only
        // document_statistics should only contain download/upload actions

        // Log the view action
        await logUserAction(userId, 'VIEW_DOCUMENT', `Viewed document: ${document.nom_document}`);
        
        // Emit real-time view event via Socket.IO
        try {
          const { io } = require('../server'); // Get Socket.IO instance
          if (io) {
            const eventData = {
              type: 'view',
              document: {
                id_document: document.id_document,
                nom_document: document.nom_document
              },
              user: {
                id: userId,
                nom: req.session.nom || 'Unknown User'
              },
              timestamp: new Date().toISOString()
            };
            
            console.log('📤 Emitting real-time view event:', eventData);
            io.to('statistics').emit('documentViewed', eventData); // Send only to statistics subscribers
          }
        } catch (socketError) {
          console.error('Error emitting view event:', socketError);
          // Continue even if socket emission fails
        }

        // Try multiple possible file paths
        const possiblePaths = [
            path.join(__dirname, '..', document.path),
            path.join(__dirname, '..', 'uploads', document.type, document.nom_document_original),
            path.join(__dirname, '..', 'uploads', document.type, document.nom_document),
            path.join(__dirname, '..', 'uploads', document.path, document.nom_document_original),
            path.join(__dirname, '..', 'uploads', document.path, document.nom_document)
        ];

        console.log("Checking possible file paths:", possiblePaths);

        let filePath = null;
        for (const testPath of possiblePaths) {
            console.log("Checking path:", testPath);
            if (fs.existsSync(testPath)) {
                filePath = testPath;
                console.log("File found at:", filePath);
                break;
            }
        }

        if (!filePath) {
            console.error("File not found at any of the paths");
            if (process.env.NODE_ENV === 'production') {
                return res.status(404).json({ 
                    error: "File not available", 
                    message: "Document exists in database but physical file is not accessible in production environment." 
                });
            }
            return res.status(404).json({ error: "File not found" });
        }

        // Set the Content-Type header based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${document.nom_document}${ext}"`);

        // Stream the file to the client
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error("Error streaming file:", error);
            res.status(500).json({ error: "Error streaming file" });
        });

    } catch (error) {
        console.error("Error in view route:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router; 