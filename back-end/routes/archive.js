const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { dbGetArchivedDocuments, dbArchiveDocumentVersion, dbRestoreArchivedVersion } = require('../db/db');
const path = require('path');
const fs = require('fs');

// Get archived documents for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const archivedDocuments = await dbGetArchivedDocuments(req.user.id);
        res.json(archivedDocuments);
    } catch (error) {
        console.error('Error fetching archived documents:', error);
        res.status(500).json({ error: 'Failed to fetch archived documents' });
    }
});

// Download archived document
router.get('/download', authenticateToken, async (req, res) => {
    try {
        const { path: archivePath, filename } = req.query;
        
        if (!archivePath || !filename) {
            return res.status(400).json({ error: 'Missing archive path or filename' });
        }

        // Check if the file exists
        const fullPath = path.join(archivePath, filename);
        console.log('Checking file path:', fullPath);
        
        if (!fs.existsSync(fullPath)) {
            console.error('File not found at path:', fullPath);
            return res.status(404).json({ error: 'Archived file not found' });
        }

        // Send the file
        res.download(fullPath, filename);
    } catch (error) {
        console.error('Error downloading archived document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

// Restore archived document version
router.post('/restore/:documentId/:versionId', authenticateToken, async (req, res) => {
    try {
        const { documentId, versionId } = req.params;
        
        if (!documentId || !versionId) {
            return res.status(400).json({ error: 'Missing document ID or version ID' });
        }

        // Get the archived document details
        const archivedDocs = await dbGetArchivedDocuments(req.user.id);
        
        // Find the specific version in the archived documents
        const version = archivedDocs.allDocuments.find(
            doc => doc.id_document === parseInt(documentId) && 
                   doc.id_version === parseInt(versionId)
        );

        if (!version) {
            return res.status(404).json({ error: 'Archived version not found' });
        }

        // Restore the version
        const result = await dbRestoreArchivedVersion(documentId, versionId, req.user.id);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: 'Version restored successfully',
                versionId: result.versionId
            });
        } else {
            res.status(500).json({ error: 'Failed to restore version' });
        }
    } catch (error) {
        console.error('Error restoring archived document:', error);
        res.status(500).json({ 
            error: 'Failed to restore document',
            details: error.message 
        });
    }
});

module.exports = router; 