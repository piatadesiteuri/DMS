const express = require("express")
const route = express.Router()
// const session = require('../application') // Removed circular dependency
const db = require('../db/db')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const { logDocumentDownload } = require('../utils/logger')

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway',
  port: process.env.MYSQL_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Force railway database in production
if (process.env.NODE_ENV === 'production') {
  pool.config.connectionConfig.database = 'railway';
}

route.get('/:filename', async function (req, res) {
  console.log("---------------------------------------");
  console.log("GET request received at /download/:filename");
  console.log("Headers:", req.headers);
  console.log("Session exists:", !!req.session);
  if (!req.session) {
    console.log("No session exists for this request");
  }

  if (!req.session || !req.session.id_user) {
    console.log("User not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const filename = req.params.filename;
  console.log("Download request for document:", filename, "by user:", req.session.id_user);

  try {
    // Get document details and check permissions
    const docAccess = await db.dbDownloadDocument(req.session.id_user, filename);
    console.log("Document found with privileges:", docAccess);

    if (!docAccess || docAccess.length === 0) {
      console.log("Document not found or no access");
      return res.status(404).json({ error: "Document not found" });
    }

    if (docAccess[0].error === "No permission") {
      console.log("User does not have permission to download this document");
      return res.status(403).json({ error: "No permission to download this document" });
    }

    const document = docAccess[0];
    console.log("Document details:", document);
    
    // Check if this is a viewing request or actual download
    const isViewing = req.query.view === 'true';
    
    // Log the document download only for actual downloads, not for viewing
    if (!isViewing) {
      console.log('Logging document download to user_logs');
      await logDocumentDownload(
        req.session.id_user,
        document.nom_document_original || document.nom_document,
        document.id_document
      );
    } else {
      console.log('Viewing request - not logging to user_logs');
    }
    
    // Try the path from the database first
    let filePath = path.join(__dirname, '..', document.path, document.nom_document);
    console.log("Attempting to download file from:", filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log("File not found at path:", filePath);
      
      // Try to find the file in the uploads directory
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      console.log("Searching for file in uploads directory:", uploadsDir);
      
      // Function to find a file recursively
      function findFileRecursively(dir, targetFile) {
        console.log("Searching in directory:", dir);
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Recursively search in subdirectories
            const found = findFileRecursively(filePath, targetFile);
            if (found) return found;
          } else if (file === targetFile) {
            // File found
            console.log("Found file:", file, "at path:", filePath);
            return filePath;
          }
        }
        
        return null;
      }
      
      // Try to find the file
      const foundPath = findFileRecursively(uploadsDir, document.nom_document);
      
      if (foundPath) {
        console.log("File found at:", foundPath);
        filePath = foundPath;
        
        // Update the path in the database
        try {
          const con = await pool.getConnection();
          // Get the path relative to uploads directory
          const uploadsDir = path.join(__dirname, '..', 'uploads');
          const newPath = path.relative(uploadsDir, path.dirname(foundPath));
          console.log("Updating path in database from", document.path, "to", newPath);
          console.log("Document ID:", document.id_document);
          
          // Log the SQL query and parameters
          const updateQuery = 'UPDATE table_document SET path = ? WHERE id_document = ?';
          const updateParams = [newPath, document.id_document];
          console.log("SQL Query:", updateQuery);
          console.log("Parameters:", updateParams);
          
          const [updateResult] = await con.query(updateQuery, updateParams);
          console.log("Update result:", updateResult);
          
          // Verify the update
          const [verifyResult] = await con.query(
            'SELECT path FROM table_document WHERE id_document = ?',
            [document.id_document]
          );
          console.log("Verification result:", verifyResult);
          
          con.release();
          console.log("Path updated in database successfully");
        } catch (updateError) {
          console.error("Error updating path in database:", updateError);
          // Continue with download even if database update fails
        }
      } else {
        console.log("File not found in uploads directory");
        return res.status(404).json({ error: "File not found" });
      }
    }

    // Record the download statistic only for actual downloads, not for viewing
    // isViewing already declared above
    
    if (!isViewing) {
    console.log('Recording download statistic with:', {
      documentId: document.id_document,
      userId: req.session.id_user,
      actionType: 'download'
    });
    
    try {
      const statResult = await db.recordDocumentStatistic(document.id_document, req.session.id_user, 'download');
      console.log('Statistic recording result:', statResult);

      if (!statResult.success) {
        console.error('Failed to record download statistic:', statResult.error);
      } else {
        console.log('Successfully recorded download statistic:', statResult);
        
        // Emit real-time download event via Socket.IO
        try {
          const { io } = require('../server'); // Get Socket.IO instance
          if (io) {
            const eventData = {
              type: 'download',
              document: {
                id_document: document.id_document,
                nom_document: document.nom_document_original || document.nom_document
              },
              user: {
                id: req.session.id_user,
                nom: req.session.nom || 'Unknown User'
              },
              timestamp: new Date().toISOString()
            };
            
            console.log('📤 Emitting real-time download event:', eventData);
            io.to('statistics').emit('documentDownloaded', eventData); // Send only to statistics subscribers
          }
        } catch (socketError) {
          console.error('Error emitting download event:', socketError);
          // Continue even if socket emission fails
        }
      }
    } catch (statError) {
      console.error('Error recording download statistic:', statError);
      // Continue with download even if statistics recording fails
      }
    } else {
      console.log('Viewing request - not recording in document_statistics');
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.nom_document_original}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Handle errors in the stream
    fileStream.on('error', (error) => {
      console.error("Error streaming file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      fileStream.destroy();
    });

  } catch (error) {
    console.error("Error in download route:", error);
    return res.status(500).json({ error: "Error downloading file" });
  }
});

module.exports = route