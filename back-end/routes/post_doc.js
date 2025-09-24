const express = require("express")
const mysql = require('mysql2/promise')
const route = express.Router()
const session = require('express-session')
const db = require('../db/db')
const fs = require('fs')
const path = require('path')
const { Pool } = require('mysql2/promise')
const multer = require('multer')
const { logUserAction } = require('../utils/logger')
const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcrypt')
const pdfParse = require('pdf-parse')
const pdf2pic = require('pdf2pic')
const Tesseract = require('tesseract.js')

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_DATABASE || 'PSPD',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

// Helper function to extract text from PDF using OCR for scanned documents
const extractTextWithOCR = async (filePath) => {
  try {
    console.log('🔍 [OCR] Starting OCR extraction for:', filePath);
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp_ocr');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('📁 [OCR] Created temporary directory:', tempDir);
    }
    
    // Convert PDF to images using GraphicsMagick
    const convert = pdf2pic.fromPath(filePath, {
      density: 100,           // Lower density for faster processing
      saveFilename: "page",
      savePath: tempDir,      // Use our temp directory
      format: "png",
      width: 600,             // Lower resolution for faster OCR
      height: 800
    });
    
    // Get first few pages (limit to 3 pages for performance)
    const pages = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const page = await convert(i, { responseType: "image" });
        pages.push(page);
        console.log(`📄 [OCR] Converted page ${i} to image`);
      } catch (error) {
        console.log(`📄 [OCR] No more pages or error on page ${i}:`, error.message);
        break; // Stop if no more pages
      }
    }
    
    if (pages.length === 0) {
      console.log('❌ [OCR] No pages could be converted to images');
      return '';
    }
    
    console.log(`🔄 [OCR] Processing ${pages.length} pages with Tesseract...`);
    
    // Process each page with OCR
    let allText = '';
    for (let i = 0; i < pages.length; i++) {
      try {
        console.log(`🔍 [OCR] Processing page ${i + 1}/${pages.length}...`);
        
        const { data: { text } } = await Tesseract.recognize(
          pages[i].path,
          'eng+ron', // English + Romanian
          {
            logger: () => {}, // Disable verbose logging
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?:;()-[]{}/@#$%^&*+=_~`"\'\\/<>|'
          }
        );
        
        allText += text + ' ';
        console.log(`✅ [OCR] Page ${i + 1} processed: ${text.length} characters extracted`);
        
        // Clean up temporary image file
        try {
          if (fs.existsSync(pages[i].path)) {
            fs.unlinkSync(pages[i].path);
          }
        } catch (cleanupError) {
          console.log('⚠️ [OCR] Could not clean up temp file:', pages[i].path);
        }
        
      } catch (ocrError) {
        console.error(`💥 [OCR] Error processing page ${i + 1}:`, ocrError.message);
        continue; // Continue with next page
      }
    }
    
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 [OCR] Cleaned up temporary directory');
      }
    } catch (cleanupError) {
      console.log('⚠️ [OCR] Could not clean up temp directory:', tempDir);
    }
    
    return allText.trim();
  } catch (error) {
    console.error('💥 [OCR] Error in extractTextWithOCR:', error);
    return '';
  }
};

// Helper function to extract first page from PDF as base64
const extractFirstPageFromPDF = async (filePath) => {
  try {
    console.log('📄 [FirstPage] Starting first page extraction for:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ [FirstPage] File not found:', filePath);
      return null;
    }
    
    // Create temporary directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp_firstpage');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log('📁 [FirstPage] Created temporary directory:', tempDir);
    }
    
    // Convert first page of PDF to image using pdf2pic
    const convert = pdf2pic.fromPath(filePath, {
      density: 100,           // Lower density for faster processing
      saveFilename: "firstpage",
      savePath: tempDir,      // Use our temp directory
      format: "png",
      width: 400,             // Lower resolution for faster processing
      height: 500
    });
    
    console.log('🔄 [FirstPage] Converting first page to image...');
    
    // Convert only the first page
    const firstPage = await convert(1);
    
    if (!firstPage || !firstPage.path) {
      console.log('❌ [FirstPage] Could not convert first page to image');
      return null;
    }
    
    console.log('✅ [FirstPage] First page converted to image:', firstPage.path);
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(firstPage.path);
    const base64String = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64String}`;
    
    console.log('✅ [FirstPage] First page converted to base64, size:', base64String.length);
    
    // Clean up temporary image file
    try {
      if (fs.existsSync(firstPage.path)) {
        fs.unlinkSync(firstPage.path);
        console.log('🧹 [FirstPage] Cleaned up temporary image file');
      }
    } catch (cleanupError) {
      console.log('⚠️ [FirstPage] Could not clean up temp file:', firstPage.path);
    }
    
    // Clean up temporary directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 [FirstPage] Cleaned up temporary directory');
      }
    } catch (cleanupError) {
      console.log('⚠️ [FirstPage] Could not clean up temp directory:', tempDir);
    }
    
    return dataUrl;
  } catch (error) {
    console.error('💥 [FirstPage] Error in extractFirstPageFromPDF:', error);
    console.error('💥 [FirstPage] Error details:', error.message);
    console.error('💥 [FirstPage] Error stack:', error.stack);
    return null;
  }
};

// Helper function to extract text from PDF (tries normal extraction first, then OCR if needed)
const extractTextFromPDF = async (filePath) => {
  try {
    console.log('📄 [TEXT-EXTRACT] Starting text extraction for:', path.basename(filePath));
    
    // First try normal PDF text extraction
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const normalText = pdfData.text;
    
    console.log(`📝 [TEXT-EXTRACT] Normal extraction: ${normalText.length} characters`);
    
    // Check if we got meaningful text (more than just whitespace and basic chars)
    const meaningfulText = normalText.replace(/\s+/g, ' ').trim();
    const wordCount = meaningfulText.split(' ').filter(word => word.length > 2).length;
    
    console.log(`🔍 [TEXT-EXTRACT] Meaningful words found: ${wordCount}`);
    
    // If we have less than 10 meaningful words, the PDF is likely scanned - use OCR
    if (wordCount < 10) {
      console.log('🔄 [TEXT-EXTRACT] Low text content detected, switching to OCR...');
      const ocrText = await extractTextWithOCR(filePath);
      
      if (ocrText.length > normalText.length) {
        console.log('✅ [TEXT-EXTRACT] OCR provided more text, using OCR result');
        return ocrText;
      }
    }
    
    console.log('✅ [TEXT-EXTRACT] Using normal PDF text extraction');
    return normalText;
    
  } catch (error) {
    console.error('💥 [TEXT-EXTRACT] Error in text extraction:', error);
    
    // Fallback to OCR if normal extraction fails
    console.log('🔄 [TEXT-EXTRACT] Normal extraction failed, trying OCR as fallback...');
    try {
      return await extractTextWithOCR(filePath);
    } catch (ocrError) {
      console.error('💥 [TEXT-EXTRACT] OCR fallback also failed:', ocrError);
      return '';
    }
  }
}

////////////////////uploads files//////////////////////////
const { error, debug } = require("console")
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
            // Get the target path from the request body
      const targetPath = req.body.path || '';
      console.log('Target path from request:', targetPath);
      
      // Create the full path by joining the uploads directory with the target path
            const uploadsDir = path.join(process.cwd(), 'uploads');
            console.log('Uploads directory:', uploadsDir);

            // Split the target path into parts and join them properly
            const pathParts = targetPath.split('/').filter(Boolean);
            console.log('Path parts:', pathParts);

            // Construct the full path
            const fullPath = path.join(uploadsDir, ...pathParts);
      console.log('Full path for upload:', fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(fullPath)) {
                console.log('Creating directory:', fullPath);
        fs.mkdirSync(fullPath, { recursive: true });
      }
      
      // Store the path for later use
      req.uploadPath = targetPath;
      req.uploadDir = fullPath;
      
      // Set the destination to the full path
      cb(null, fullPath);
    } catch (error) {
      console.error('Error in multer destination function:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Use the realname if provided, otherwise use the original filename
      let fileName = req.body.realname || file.originalname;
      
      // Add .pdf extension if not already present
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }
      
      console.log('Setting filename to:', fileName);
      
      // Store the filename for later use
      req.uploadFilename = fileName;
      
      cb(null, fileName);
    } catch (error) {
      console.error('Error in multer filename function:', error);
      cb(error);
    }
  }
});

// Configure multer with the storage engine
const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    console.log('File filter called');
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    console.log('Request body in filter:', req.body);
    
    // Only allow PDF files
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'), false);
      return;
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

// Configure multer for draft uploads
const draftStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Always save drafts in the Draft folder
      const draftDir = path.join(__dirname, '..', 'uploads', 'Draft');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(draftDir)) {
        fs.mkdirSync(draftDir, { recursive: true });
        console.log('Created Draft directory:', draftDir);
      }
      
      // Set the destination to the Draft folder
      cb(null, draftDir);
    } catch (error) {
      console.error('Error in draft multer destination function:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Use the document name if provided, otherwise use the original filename
      let fileName = req.body.documentName || file.originalname;
      
      // Add .pdf extension if not already present
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }
      
      console.log('Setting draft filename to:', fileName);
      cb(null, fileName);
    } catch (error) {
      console.error('Error in draft multer filename function:', error);
      cb(error);
    }
  }
});

// Configure multer for draft uploads
const draftUpload = multer({ 
  storage: draftStorage,
  fileFilter: function(req, file, cb) {
    console.log('Draft file filter called');
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Only allow PDF files
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'), false);
      return;
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

// Configure multer for versioning uploads (same logic as main upload)
const versioningStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Get the target path from the request body metadata or directly
      let targetPath = '';
      if (req.body.metadata) {
        try {
          const metadata = JSON.parse(req.body.metadata);
          targetPath = metadata.path || req.body.path || '';
        } catch (error) {
          targetPath = req.body.path || '';
        }
      } else {
        targetPath = req.body.path || '';
      }
      
      console.log('📂 Versioning target path from request:', targetPath);
      
      // Create the full path by joining the uploads directory with the target path
      const uploadsDir = path.join(process.cwd(), 'uploads');
      console.log('📂 Versioning uploads directory:', uploadsDir);

      // Split the target path into parts and join them properly
      const pathParts = targetPath.split('/').filter(Boolean);
      console.log('📂 Versioning path parts:', pathParts);

      // Construct the full path
      const fullPath = path.join(uploadsDir, ...pathParts);
      console.log('📂 Versioning full path for upload:', fullPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(fullPath)) {
        console.log('📂 Creating versioning directory:', fullPath);
        fs.mkdirSync(fullPath, { recursive: true });
      }
      
      // Store the path for later use
      req.versioningUploadPath = targetPath;
      req.versioningUploadDir = fullPath;
      
      // Set the destination to the full path
      cb(null, fullPath);
    } catch (error) {
      console.error('❌ Error in versioning multer destination function:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Generate unique filename for versioning upload
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const fileName = `temp_version_${timestamp}_${randomSuffix}.pdf`;
      
      console.log('📂 Setting versioning temp filename to:', fileName);
      
      // Store the filename for later use
      req.versioningUploadFilename = fileName;
      
      cb(null, fileName);
    } catch (error) {
      console.error('❌ Error in versioning multer filename function:', error);
      cb(error);
    }
  }
});

// Configure multer for versioning
const versioningUpload = multer({ 
  storage: versioningStorage,
  fileFilter: function(req, file, cb) {
    console.log('📂 Versioning file filter called');
    console.log('📂 File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Only allow PDF files
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'), false);
      return;
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
}).single('file');

route.post('/upload', upload, async function (req, res) {
    try {
        console.log('Upload request received:', {
            body: req.body,
            file: req.file,
            session: req.session,
            uploadPath: req.uploadPath,
            uploadDir: req.uploadDir
        });

        // Log all form fields
        console.log('Form fields received:', {
            type: req.body.type,
            mot: req.body.mot,
            comment: req.body.comment,
            realname: req.body.realname,
            tags: req.body.tags,
            path: req.body.path
        });

        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Create the final destination path
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const finalPath = path.join(uploadsDir, req.body.path);
        const finalFilePath = path.join(finalPath, req.file.filename);

        console.log('Moving file to final location:', {
            from: req.file.path,
            to: finalFilePath
        });

        // Create the directory if it doesn't exist
        await fs.promises.mkdir(finalPath, { recursive: true });

        // Move the file to the final location
        await fs.promises.rename(req.file.path, finalFilePath);

        // Update the file path in the request object
        req.file.path = finalFilePath;
        req.uploadDir = finalPath;
        req.uploadPath = path.join(req.body.path, req.file.filename);

        // Verify the file was saved in the correct location
        const expectedPath = finalFilePath;
        console.log('Expected file path:', expectedPath);
        console.log('Actual file path:', req.file.path);
        
        // Check if the file exists in the expected location
        try {
            await fs.promises.access(expectedPath, fs.constants.F_OK);
            console.log('File exists in expected location');
        } catch (error) {
            console.error('File was not saved in the expected location');
            console.error('Expected:', expectedPath);
            console.error('Actual:', req.file.path);
            return res.status(500).json({ error: 'File was not saved in the expected location' });
        }

        const { type, path: folderPath, comment } = req.body;
        const id_user = req.session.id_user;

        // Get user's institution and check if it's a personal account
        const con = await pool.getConnection();
        const [userInfo] = await con.query(
          `SELECT u.institution_id, u.subscription_status, i.* 
           FROM user u 
           LEFT JOIN institutions i ON u.institution_id = i.id_institution 
           WHERE u.id_user = ?`,
          [id_user]
        );

        if (!userInfo || userInfo.length === 0) {
          con.release();
          return res.status(404).json({ error: "User not found" });
        }

        const user = userInfo[0];
        const isPersonalAccount = !user.institution_id;
        
        // For personal accounts, use the folderPath directly (no institution prefix needed)
        // For institutional accounts, use the folderPath as is (already contains institution name)
        const actualFolderPath = folderPath;
        console.log('Using folder path:', actualFolderPath);

        // Parse tags from request body
        var tags = [];
        try {
            if (req.body.tags) {
                tags = JSON.parse(req.body.tags);
                console.log('Tags parsed successfully:', tags);
            } else {
                console.log('No tags provided in request');
            }
        } catch (parseError) {
            console.error('Error parsing tags:', parseError);
            console.error('Raw tags string:', req.body.tags);
        }

        // Log comment
        console.log('Comment received:', comment);

            // Get type_id from document_types table
            console.log('Searching for document type:', type);
            const [typeResult] = await con.query(
            'SELECT id, type_name FROM document_types WHERE type_name = ?',
                [type]
            );

            if (!typeResult || typeResult.length === 0) {
                console.error('Document type not found:', type);
                return res.status(400).json({ error: "Invalid document type" });
            }

            console.log('Found document type:', typeResult[0]);
            const typeId = typeResult[0].id;
            const filename = req.file.filename;
            const mot = req.body.mot ? req.body.mot.split(',') : [];
            const realname = req.body.realname || filename;
            const datetime = new Date();
            var changeSummary = req.body.changeSummary || '';
            var tags = req.body.tags ? JSON.parse(req.body.tags) : [];

            // Format the date to MySQL datetime format
            const formattedDateTime = datetime.toISOString().slice(0, 19).replace('T', ' ');

            // Get file size in bytes
            const fileSize = req.file.size;

            // Insert the document into the database
            const result = await db.dbUploadDocument(
                id_user,
                filename,
                typeId,
            actualFolderPath, // Use the folderPath directly
                mot,
                formattedDateTime,
                req.body.comment,
                realname,
                tags,
            fileSize
            );

            if (!result.success) {
                // If upload failed, delete the uploaded file
            try {
                await fs.promises.unlink(req.file.path);
                console.log('Deleted file after failed upload:', req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file after failed upload:', unlinkError);
            }
                return res.status(400).json({ error: result.error });
            }

            // Add upload action to document_statistics
            try {
                await con.query(
                    'INSERT INTO document_statistics (id_document, id_user, action_type) VALUES (?, ?, ?)',
                    [result.documentId, id_user, 'upload']
                );
                console.log('Upload action recorded in document_statistics');
            } catch (statError) {
                console.error('Error recording upload action:', statError);
                // Don't fail the upload if statistics recording fails
            }

        // Get the uploaded document details to return to frontend
        const [uploadedDoc] = await con.query(
            `SELECT d.*, dt.type_name 
             FROM table_document d 
             JOIN document_types dt ON d.type_id = dt.id 
             WHERE d.id_document = ?`,
            [result.documentId]
        );

        con.release();

        // Format the document object for frontend
        const document = uploadedDoc[0];
        const formattedDocument = {
            id: document.id_document,
            name: document.nom_document,
            originalName: document.nom_document_original || document.nom_document,
            path: document.path,
            type: document.type_name,
            comment: document.commentaire,
            uploadDate: document.date_upload,
            size: document.file_size || fileSize,
            tags: tags
        };

            res.json({
                success: true,
                message: 'Document uploaded successfully',
            documentId: result.documentId,
            document: formattedDocument
            });
    } catch (error) {
        console.error('Error in upload handler:', error);
        res.status(500).json({ error: error.message });
    }
});

route.post('/', (req, res) => {
  console.log('Request body before multer:', req.body);
  
  upload(req, res, async function(err) {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Log the file details after upload
      console.log('File uploaded successfully:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        destination: req.file.destination,
        fullPath: path.join(req.file.destination, req.file.filename)
      });

      const id_user = req.session.id_user;
      const filename = req.file.filename;
      const type = req.body.type;
      const mot = req.body.mot ? req.body.mot.split(',') : [];
      const realname = req.body.realname || filename;
      const datetime = new Date();
      var changeSummary = req.body.changeSummary || '';
      var tags = req.body.tags ? JSON.parse(req.body.tags) : [];
      const uploadPath = req.body.path;

      // Format the date to MySQL datetime format
      const formattedDateTime = datetime.toISOString().slice(0, 19).replace('T', ' ');

      // Get type_id from document_types table
      const con = await pool.getConnection();
      console.log('Searching for document type:', type);
      const [typeResult] = await con.query(
        'SELECT id, type_name FROM document_types WHERE type_name = ?',
        [type]
      );
      con.release();

      if (!typeResult || typeResult.length === 0) {
        throw new Error("Invalid document type");
      }

      console.log('Found document type:', typeResult[0]);
      const typeId = typeResult[0].id;
      
      // Verify the file was saved in the correct location
      const expectedPath = path.join(req.uploadTargetDir, req.uploadFilename);
      if (!fs.existsSync(expectedPath)) {
        throw new Error("File was not saved in the expected location");
      }
      
      // Insert the document into the database
      const result = await db.dbUploadDocument(
        id_user, 
        filename, 
        typeId, 
        uploadPath, 
        mot, 
        formattedDateTime, 
        req.body.comment, 
        realname, 
        tags
      );

      // Log the upload action in document_statistics
      if (result && result.documentId) {
        try {
          const con = await pool.getConnection();
          await con.query(
            'INSERT INTO document_statistics (id_document, id_user, action_type) VALUES (?, ?, ?)',
            [result.documentId, id_user, 'upload']
          );
          con.release();
          console.log('Upload action recorded in document_statistics');
        } catch (statError) {
          console.error('Error recording upload action:', statError);
          // Don't fail the upload if logging fails
        }
      }

      // Create complete document object for response
      const uploadedDocument = {
        id: result.documentId,
        name: realname || filename,
        path: uploadPath,
        size: req.file.size,
        uploadDate: formattedDateTime,
        comment: req.body.comment,
        keywords: Array.isArray(mot) ? mot : (mot ? mot.split(',') : []),
        type: type
      };

      console.log('📤 === RETURNING COMPLETE DOCUMENT OBJECT ===');
      console.log('Document object:', JSON.stringify(uploadedDocument, null, 2));

      return res.json({ 
        success: true, 
        result, 
        document: uploadedDocument 
      });
    } catch (error) {
      console.error("Error in upload handler:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

// Get all available tags
route.get('/tags', async function (req, res) {
  console.log("GET request received at /post_docs/tags");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const tags = await db.dbGetAllTags();
    return res.json({ success: true, tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Create a new tag
route.post('/tags', async function (req, res) {
  console.log("POST request received at /post_docs/tags");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { tagName } = req.body;
  if (!tagName) {
    return res.status(400).json({ error: "Tag name is required" });
  }

  try {
    const result = await db.dbCreateTag(tagName, req.session.id_user);
    return res.json(result);
  } catch (error) {
    console.error("Error creating tag:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get document versions
route.get('/versions/:documentId', async (req, res) => {
  let connection;
  try {
    // Check session authentication
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    connection = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await connection.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!userInstitution || !userInstitution[0]) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const institution = userInstitution[0];

    // Get document versions with all related information
    // Note: document_versions may not have id_institution; filter by owner's institution via table_document → user
    const [versions] = await connection.query(
      `SELECT 
              v.*, 
              dt.type_name,
              author.nom as author_name,
              author.prenom as author_firstname,
              GROUP_CONCAT(DISTINCT t.tag_name) as tags,
              GROUP_CONCAT(DISTINCT CONCAT_WS(',', mc.mot1, mc.mot2, mc.mot3, mc.mot4, mc.mot5)) as keywords
       FROM document_versions v
       LEFT JOIN document_types dt ON v.type_id = dt.id
       LEFT JOIN user author ON v.created_by = author.id_user
       LEFT JOIN document_tag_relations dtr ON v.id_document = dtr.id_document
       LEFT JOIN document_tags t ON dtr.id_tag = t.id_tag
       LEFT JOIN table_mot_cle mc ON v.id_document = mc.id_document
       JOIN table_document td ON v.id_document = td.id_document
       JOIN user owner ON td.id_user_source = owner.id_user
       WHERE v.id_document = ? AND owner.institution_id = ?
       GROUP BY v.id_version
       ORDER BY v.version_number DESC`,
      [req.params.documentId, institution.institution_id]
    );

    // Process versions to include tags and keywords
    const processedVersions = versions.map(version => ({
      ...version,
      tags: version.tags ? version.tags.split(',').map(tag => ({ tag_name: tag })) : [],
      keywords: version.keywords ? version.keywords.split(',').filter(k => k && k.trim() !== '') : [],
      type: version.type_name
    }));

    res.json({
      success: true,
      versions: processedVersions
    });

  } catch (error) {
    console.error("Error fetching versions:", error);
    return res.status(500).json({ 
      error: "Failed to fetch versions", 
      details: error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Get document tags
route.get('/document-tags/:documentId', async function (req, res) {
  console.log("GET request received at /post_docs/document-tags/:documentId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  console.log(`Fetching tags for document ID: ${documentId}, requested by user ID: ${req.session.id_user}`);

  try {
    // Modificat pentru a permite accesul direct la tag-uri fără verificarea permisiunilor
    // Acest lucru permite tuturor utilizatorilor autentificați să vadă tag-urile
    const docId = parseInt(documentId, 10);
    if (isNaN(docId)) {
      console.error(`Invalid document ID: ${documentId}`);
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const tags = await db.dbGetDocumentTags(docId);
    console.log(`Tags retrieved for document ${documentId}:`, tags);

    // Return empty array instead of null or undefined
    return res.json({ success: true, tags: Array.isArray(tags) ? tags : [] });
  } catch (error) {
    console.error("Error fetching document tags:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Add tag to document
route.post('/document-tags', async function (req, res) {
  console.log("POST request received at /post_docs/document-tags");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { documentId, tagId } = req.body;
  if (!documentId || !tagId) {
    return res.status(400).json({ error: "Document ID and tag ID are required" });
  }

  try {
    // First check if user has access to this document
    const docAccess = await db.dbDownloadDocument(req.session.id_user, documentId);

    if (!docAccess || docAccess.length === 0 || docAccess[0].error === "No permission") {
      return res.status(403).json({ error: "No permission to add tags to this document" });
    }

    // Convert IDs to integers
    const docId = parseInt(documentId, 10);
    const tId = parseInt(tagId, 10);
    const userId = parseInt(req.session.id_user, 10);

    if (isNaN(docId) || isNaN(tId) || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await db.dbAddTagToDocument(docId, tId, userId);
    return res.json(result);
  } catch (error) {
    console.error("Error adding tag to document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Remove tag from document
route.delete('/document-tags/:documentId/:tagId', async function (req, res) {
  console.log("DELETE request received at /post_docs/document-tags/:documentId/:tagId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  const tagId = req.params.tagId;

  try {
    // Convert IDs to integers
    const docId = parseInt(documentId, 10);
    const tId = parseInt(tagId, 10);

    if (isNaN(docId) || isNaN(tId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // First check if user has access to this document
    const docAccess = await db.dbDownloadDocument(req.session.id_user, docId);

    if (!docAccess || docAccess.length === 0 || docAccess[0].error === "No permission") {
      return res.status(403).json({ error: "No permission to remove tags from this document" });
    }

    const result = await db.dbRemoveTagFromDocument(docId, tId);
    return res.json(result);
  } catch (error) {
    console.error("Error removing tag from document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Revert to a previous document version with options
route.post('/revert/:documentId/:versionId', async (req, res) => {
  const { documentId, versionId } = req.params;
  const { id_institution, comment, saveCurrentAsNewVersion } = req.body;
  const connection = await pool.getConnection();

  try {
    console.log('Restoring version:', { documentId, versionId, id_institution, comment, saveCurrentAsNewVersion });
    await connection.beginTransaction();

    // Check if document exists
    const [documents] = await connection.query(
      'SELECT * FROM table_document WHERE id_document = ?',
      [documentId]
    );

    if (documents.length === 0) {
      console.log('Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    const currentDocument = documents[0];

    // Get the version to restore
    const [versions] = await connection.query(
      'SELECT * FROM document_versions WHERE id_document = ? AND id_version = ?',
      [documentId, versionId]
    );

    if (versions.length === 0) {
      console.log('Version not found');
      return res.status(404).json({ error: 'Version not found' });
    }

    const version = versions[0];
    console.log('Found version:', version);

    // Get the next version number if we need to save current as new version
    let nextVersionNumber = 1;
    if (saveCurrentAsNewVersion) {
      const [allVersions] = await connection.query(
        'SELECT MAX(version_number) as max_version FROM document_versions WHERE id_document = ?',
        [documentId]
      );
      nextVersionNumber = (allVersions[0].max_version || 0) + 1;
    }

    // Handle file operations
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Current file paths
    const currentFilePath = path.join(uploadsDir, currentDocument.path, currentDocument.nom_document);
    const versionFilePath = path.join(uploadsDir, version.file_path);
    
    console.log('File paths:', {
      currentFile: currentFilePath,
      versionFile: versionFilePath
    });

    if (saveCurrentAsNewVersion) {
      // OPTION 1: Save current as new version, then restore
      
      // Step 1: Get current document data for versioning
      const [currentTags] = await connection.query(
        `SELECT t.tag_name 
         FROM document_tags t 
         JOIN document_tag_relations dtr ON t.id_tag = dtr.id_tag 
         WHERE dtr.id_document = ?`,
        [documentId]
      );

      const [currentKeywords] = await connection.query(
        'SELECT mot1, mot2, mot3, mot4, mot5 FROM table_mot_cle WHERE id_document = ?',
        [documentId]
      );

      // Prepare current data for versioning
      const currentTagsJson = JSON.stringify(currentTags.map(t => t.tag_name));
      const currentKeywordsArray = [];
      if (currentKeywords.length > 0) {
        if (currentKeywords[0].mot1) currentKeywordsArray.push(currentKeywords[0].mot1);
        if (currentKeywords[0].mot2) currentKeywordsArray.push(currentKeywords[0].mot2);
        if (currentKeywords[0].mot3) currentKeywordsArray.push(currentKeywords[0].mot3);
        if (currentKeywords[0].mot4) currentKeywordsArray.push(currentKeywords[0].mot4);
        if (currentKeywords[0].mot5) currentKeywordsArray.push(currentKeywords[0].mot5);
      }
      const currentKeywordsJson = JSON.stringify(currentKeywordsArray);

      // Step 2: Create backup of current file with versioned name
      const baseName = path.basename(currentDocument.nom_document, path.extname(currentDocument.nom_document));
      const ext = path.extname(currentDocument.nom_document);
      const versionedFileName = `${baseName}_V${nextVersionNumber}${ext}`;
      const versionedFilePath = path.join(uploadsDir, currentDocument.path, versionedFileName);

      if (fs.existsSync(currentFilePath)) {
        await fs.promises.copyFile(currentFilePath, versionedFilePath);
        console.log(`✅ BACKUP: Current file saved as ${versionedFileName}`);
      }

      // Extract first_page from current file for backup version
      let backupFirstPageBase64 = null;
      try {
        if (fs.existsSync(currentFilePath)) {
          console.log('📄 Extracting first_page for backup version from:', currentFilePath);
          backupFirstPageBase64 = await extractFirstPageFromPDF(currentFilePath);
          console.log('✅ First page extracted for backup version, size:', backupFirstPageBase64 ? backupFirstPageBase64.length : 0);
        } else {
          console.log('⚠️ Current file not found for backup first_page extraction:', currentFilePath);
        }
      } catch (error) {
        console.error('❌ Error extracting first_page for backup version:', error);
      }

      // Step 3: Save current state as new version
      await connection.query(
        `INSERT INTO document_versions (
          id_document, id_institution, file_path, first_page, file_size,
          version_number, version_name, original_document_name, 
          change_summary, created_by, type_id, tags, keywords, comment, metadata_changes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentId,
          currentDocument.id_institution || id_institution,
          path.join(currentDocument.path, versionedFileName),
          backupFirstPageBase64, // First page as base64
          currentDocument.file_size,
          nextVersionNumber,
          `Version ${nextVersionNumber}`,
          currentDocument.nom_document_original,
          `Backup before restore to version ${version.version_number}`,
          req.session.id_user,
          currentDocument.type_id,
          currentTagsJson,
          currentKeywordsJson,
          currentDocument.comment,
          JSON.stringify({ tags: true, type: true, comment: true, keywords: true })
        ]
      );

      // Step 4: Copy version file to current location
      if (fs.existsSync(versionFilePath)) {
        await fs.promises.copyFile(versionFilePath, currentFilePath);
        console.log(`✅ RESTORE: Version file copied to current location`);
      }
    } else {
      // OPTION 2: Simple restore without saving current
      if (fs.existsSync(versionFilePath)) {
        await fs.promises.copyFile(versionFilePath, currentFilePath);
        console.log(`✅ RESTORE: Version file copied to current location (no backup)`);
      }
    }

    // Get the original document name from the version and ensure it has .pdf extension
    const originalDocName = version.original_document_name;
    const docName = originalDocName.endsWith('.pdf') ? originalDocName : `${originalDocName}.pdf`;

    // Extract first_page from the restored version file
    let firstPageBase64 = null;
    try {
      if (fs.existsSync(currentFilePath)) {
        console.log('📄 Extracting first_page from restored version:', currentFilePath);
        firstPageBase64 = await extractFirstPageFromPDF(currentFilePath);
        console.log('✅ First page extracted from restored version, size:', firstPageBase64 ? firstPageBase64.length : 0);
      } else {
        console.log('⚠️ Restored file not found for first_page extraction:', currentFilePath);
      }
    } catch (error) {
      console.error('❌ Error extracting first_page from restored version:', error);
    }

    // Update document metadata with restored version's details
    await connection.query(
      `UPDATE table_document 
       SET nom_document = ?,
           nom_document_original = ?,
           file_size = ?,
           comment = ?,
           current_version_id = ?,
           type_id = ?,
           first_page = ?
       WHERE id_document = ?`,
      [
        docName,
        originalDocName,
        version.file_size,
        version.comment,
        version.id_version,
        version.type_id,
        firstPageBase64,
        documentId
      ]
    );
    console.log('Document metadata updated with first_page');

    // Delete existing tags and keywords
    await connection.query('DELETE FROM document_tag_relations WHERE id_document = ?', [documentId]);
    await connection.query('DELETE FROM table_mot_cle WHERE id_document = ?', [documentId]);

    // Restore version's tags
    if (version.tags) {
      let tags;
      try {
        if (typeof version.tags === 'string') {
          tags = JSON.parse(version.tags);
        } else {
          tags = version.tags;
        }
        
        if (Array.isArray(tags) && tags[0]?.tag_name) {
          tags = tags.map(t => t.tag_name);
        }
        
        if (!Array.isArray(tags)) {
          tags = [tags];
        }

        for (const tagName of tags) {
          if (!tagName) continue;
          
          const [existingTags] = await connection.query(
            'SELECT id_tag FROM document_tags WHERE tag_name = ?',
            [tagName]
          );

          let tagId;
          if (existingTags.length > 0) {
            tagId = existingTags[0].id_tag;
            await connection.query(
              'UPDATE document_tags SET usage_count = usage_count + 1 WHERE id_tag = ?',
              [tagId]
            );
          } else {
            const [newTag] = await connection.query(
              'INSERT INTO document_tags (tag_name, created_by, usage_count) VALUES (?, ?, 1)',
              [tagName, version.created_by]
            );
            tagId = newTag.insertId;
          }

          await connection.query(
            'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
            [documentId, tagId, version.created_by]
          );
        }
      } catch (error) {
        console.error('Error processing tags:', error);
      }
    }

    // Restore version's keywords
    if (version.keywords) {
      let keywords;
      try {
        if (typeof version.keywords === 'string') {
          keywords = JSON.parse(version.keywords);
        } else {
          keywords = version.keywords;
        }
        
        if (Array.isArray(keywords) && keywords[0]?.keyword) {
          keywords = keywords.map(k => k.keyword);
        }
        
        if (!Array.isArray(keywords)) {
          keywords = [keywords];
        }

        for (let i = 0; i < keywords.length; i += 5) {
          const keywordGroup = keywords.slice(i, i + 5).filter(kw => kw);
          if (keywordGroup.length === 0) continue;
          
          const values = [documentId, ...keywordGroup, ...Array(5 - keywordGroup.length).fill(null)];
          
          await connection.query(
            'INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) VALUES (?, ?, ?, ?, ?, ?)',
            values
          );
        }
      } catch (error) {
        console.error('Error processing keywords:', error);
      }
    }

    await connection.commit();
    console.log('Restore completed successfully');

    // === EMIT RESTORE UPDATE EVENT TO ELECTRON ===
    if (req.app.get('io')) {
      // Fetch updated metadata for the restored document
      const [updatedDoc] = await connection.execute(
        `SELECT td.*, 
         GROUP_CONCAT(DISTINCT CONCAT_WS(',', tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5)) as keywords,
         GROUP_CONCAT(DISTINCT dt.tag_name) as tags
         FROM table_document td 
         LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
         LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
         LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
         WHERE td.id_document = ? 
         GROUP BY td.id_document`,
        [documentId]
      );

      const eventData = {
        type: 'update',
        sourcePath: currentDocument.path + '/' + currentDocument.nom_document,
        targetFolder: currentDocument.path,
        documentName: currentDocument.nom_document,
        documentId: documentId,
        timestamp: new Date().toISOString(),
        isVersionUpdate: true,
        versionNumber: version.version_number,
        isRestore: true,
        updatedMetadata: updatedDoc[0] ? {
          id: updatedDoc[0].id_document,
          name: updatedDoc[0].nom_document,
          comment: updatedDoc[0].comment,
          type: updatedDoc[0].type_name || updatedDoc[0].type,
          size: updatedDoc[0].file_size,
          uploadDate: updatedDoc[0].upload_date,
          keywords: updatedDoc[0].keywords ? updatedDoc[0].keywords.split(',').filter(k => k && k.trim()) : [],
          tags: updatedDoc[0].tags ? updatedDoc[0].tags.split(',').map(tag => ({ tag_name: tag.trim() })).filter(t => t.tag_name) : []
        } : null
      };
      
      console.log('📄 === EMITTING RESTORE UPDATE EVENT WITH METADATA ===');
      console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
      
      req.app.get('io').emit('fileSystemUpdate', eventData);
      console.log('✅ RESTORE UPDATE event with metadata emitted to all connected clients');
    }

    res.json({ 
      success: true,
      message: 'Version restored successfully',
      newVersionCreated: saveCurrentAsNewVersion,
      newVersionNumber: saveCurrentAsNewVersion ? nextVersionNumber : null
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version', details: error.message });
  } finally {
    connection.release();
  }
});

// Legacy revert endpoint (keeping for compatibility)
route.post('/revert_old/:documentId/:versionId', async (req, res) => {
  const { documentId, versionId } = req.params;
  const { id_institution, comment } = req.body;
  const connection = await pool.getConnection();

  try {
    console.log('Restoring version:', { documentId, versionId, id_institution, comment });
    
    // Check if document exists
    const [documents] = await connection.query(
      'SELECT * FROM table_document WHERE id_document = ?',
      [documentId]
    );

    if (documents.length === 0) {
      console.log('Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the version to restore
    const [versions] = await connection.query(
      'SELECT * FROM document_versions WHERE id_document = ? AND id_version = ?',
      [documentId, versionId]
    );

    if (versions.length === 0) {
      console.log('Version not found');
      return res.status(404).json({ error: 'Version not found' });
    }

    const version = versions[0];
    console.log('Found version:', version);

    // Get the original document name from the version and ensure it has .pdf extension
    const originalDocName = version.original_document_name;
    const docName = originalDocName.endsWith('.pdf') ? originalDocName : `${originalDocName}.pdf`;

    // Update document metadata with restored version's details
    const [updateResult] = await connection.query(
      `UPDATE table_document 
       SET nom_document = ?,
           nom_document_original = ?,
           file_size = ?,
           comment = ?,
           current_version_id = ?,
           type_id = ?
       WHERE id_document = ?`,
      [
        docName,
        originalDocName,
        version.file_size,
        version.comment,
        version.id_version,
        version.type_id,
        documentId
      ]
    );
    console.log('Document update result:', updateResult);

    // Delete existing tags
    await connection.query('DELETE FROM document_tag_relations WHERE id_document = ?', [documentId]);
    console.log('Deleted existing tags');

    // Delete existing keywords
    await connection.query('DELETE FROM table_mot_cle WHERE id_document = ?', [documentId]);
    console.log('Deleted existing keywords');

    // Insert restored version's tags
    if (version.tags) {
      let tags;
      try {
        // Parse tags from JSON if it's a string
        if (typeof version.tags === 'string') {
          tags = JSON.parse(version.tags);
        } else {
          tags = version.tags;
        }
        
        // If tags is an array of objects with tag_name property
        if (Array.isArray(tags) && tags[0]?.tag_name) {
          tags = tags.map(t => t.tag_name);
        }
        
        // Ensure tags is an array
        if (!Array.isArray(tags)) {
          tags = [tags];
        }

        console.log('Processing tags:', tags);

        for (const tagName of tags) {
          if (!tagName) continue; // Skip empty tags
          
          // Check if tag exists
          const [existingTags] = await connection.query(
            'SELECT id_tag FROM document_tags WHERE tag_name = ?',
            [tagName]
          );

          let tagId;
          if (existingTags.length > 0) {
            tagId = existingTags[0].id_tag;
            // Update usage count
            await connection.query(
              'UPDATE document_tags SET usage_count = usage_count + 1 WHERE id_tag = ?',
              [tagId]
            );
          } else {
            // Create new tag
            const [newTag] = await connection.query(
              'INSERT INTO document_tags (tag_name, created_by, usage_count) VALUES (?, ?, 1)',
              [tagName, version.created_by]
            );
            tagId = newTag.insertId;
          }

          // Create relation
          await connection.query(
            'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
            [documentId, tagId, version.created_by]
          );
        }
        console.log('Restored tags');
      } catch (error) {
        console.error('Error processing tags:', error);
      }
    }

    // Insert restored version's keywords
    if (version.keywords) {
      let keywords;
      try {
        // Parse keywords from JSON if it's a string
        if (typeof version.keywords === 'string') {
          keywords = JSON.parse(version.keywords);
        } else {
          keywords = version.keywords;
        }
        
        // If keywords is an array of objects with keyword property
        if (Array.isArray(keywords) && keywords[0]?.keyword) {
          keywords = keywords.map(k => k.keyword);
        }
        
        // Ensure keywords is an array
        if (!Array.isArray(keywords)) {
          keywords = [keywords];
        }

        console.log('Processing keywords:', keywords);

        // Group keywords in sets of 5
        for (let i = 0; i < keywords.length; i += 5) {
          const keywordGroup = keywords.slice(i, i + 5).filter(kw => kw); // Filter out empty keywords
          if (keywordGroup.length === 0) continue; // Skip empty groups
          
          const values = [documentId, ...keywordGroup, ...Array(5 - keywordGroup.length).fill(null)];
          
          await connection.query(
            'INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) VALUES (?, ?, ?, ?, ?, ?)',
            values
          );
        }
        console.log('Restored keywords');
      } catch (error) {
        console.error('Error processing keywords:', error);
      }
    }

    await connection.commit();
    console.log('Restore completed successfully');

    // === EMIT RESTORE UPDATE EVENT TO ELECTRON (LEGACY) ===
    if (req.app.get('io')) {
      // Fetch updated metadata for the restored document
      const [updatedDoc] = await connection.execute(
        `SELECT td.*, 
         GROUP_CONCAT(DISTINCT CONCAT_WS(',', tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5)) as keywords,
         GROUP_CONCAT(DISTINCT dt.tag_name) as tags
         FROM table_document td 
         LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
         LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
         LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
         WHERE td.id_document = ? 
         GROUP BY td.id_document`,
        [documentId]
      );

      const eventData = {
        type: 'update',
        sourcePath: currentDocument.path + '/' + currentDocument.nom_document,
        targetFolder: currentDocument.path,
        documentName: currentDocument.nom_document,
        documentId: documentId,
        timestamp: new Date().toISOString(),
        isVersionUpdate: true,
        versionNumber: version.version_number,
        isRestore: true,
        updatedMetadata: updatedDoc[0] ? {
          id: updatedDoc[0].id_document,
          name: updatedDoc[0].nom_document,
          comment: updatedDoc[0].comment,
          type: updatedDoc[0].type_name || updatedDoc[0].type,
          size: updatedDoc[0].file_size,
          uploadDate: updatedDoc[0].upload_date,
          keywords: updatedDoc[0].keywords ? updatedDoc[0].keywords.split(',').filter(k => k && k.trim()) : [],
          tags: updatedDoc[0].tags ? updatedDoc[0].tags.split(',').map(tag => ({ tag_name: tag.trim() })).filter(t => t.tag_name) : []
        } : null
      };
      
      console.log('📄 === EMITTING RESTORE UPDATE EVENT (LEGACY) WITH METADATA ===');
      console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
      
      req.app.get('io').emit('fileSystemUpdate', eventData);
      console.log('✅ RESTORE UPDATE event with metadata emitted to all connected clients');
    }

    res.json({ message: 'Version restored successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error restoring version:', error);
    res.status(500).json({ error: 'Failed to restore version', details: error.message });
  } finally {
    connection.release();
  }
});

// Get document details including keys, tags, and comments
route.get('/details/:documentId', async function (req, res) {
  console.log("GET request received at /post_docs/details/:documentId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Decode the document ID parameter since it might have URL encoded characters
    const documentId = decodeURIComponent(req.params.documentId);
    console.log(`Attempting to fetch details for document: ${documentId}, requested by user ID: ${req.session.id_user}`);
    
    // First check if user has permission to access this document
    let docAccess;
    try {
      docAccess = await db.dbDownloadDocument(req.session.id_user, documentId);
      
      if (!docAccess || docAccess.length === 0) {
        console.log(`Document ${documentId} not found or user has no access`);
        return res.status(404).json({ 
          error: "Document not found", 
          success: false 
        });
      }
      
      if (docAccess[0].error === "No permission") {
        console.log(`User ${req.session.id_user} does not have permission to access document ${documentId}`);
        return res.status(403).json({ 
          error: "No permission to access document", 
          success: false 
        });
      }
    } catch (accessError) {
      console.error("Error checking document access:", accessError);
      return res.status(500).json({ 
        error: "Error checking document access", 
        details: accessError.message,
        success: false 
      });
    }

    // Get document details with keywords and tags
    try {
      const con = await pool.getConnection();
      
      // Get document details with keywords
      const [documentData] = await con.query(
        `SELECT td.*, 
         DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as formatted_date,
         tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
         GROUP_CONCAT(DISTINCT dt.tag_name) as tags,
         dtypes.type_name as type_name,
         u.institution_id as id_institution
         FROM table_document td
         LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
         LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
         LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
         LEFT JOIN document_types dtypes ON td.type_id = dtypes.id
         LEFT JOIN user u ON td.id_user_source = u.id_user
         WHERE td.nom_document = ? OR td.nom_document_original = ?
         GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                  td.date_upload, td.comment, td.id_user_source, u.institution_id,
                  tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5, dtypes.type_name`,
        [documentId, documentId]
      );

      if (!documentData || documentData.length === 0) {
        con.release();
        return res.status(404).json({ 
          error: "Document not found", 
          success: false 
        });
      }

      // Get document tags
      const [tags] = await con.query(
        `SELECT dt.id_tag, dt.tag_name, dt.is_predefined
         FROM document_tag_relations dtr
         JOIN document_tags dt ON dtr.id_tag = dt.id_tag
         WHERE dtr.id_document = ?`,
        [documentData[0].id_document]
      );

      con.release();

      // Process the document data
      const doc = documentData[0];
      const keywords = [
        doc.mot1,
        doc.mot2,
        doc.mot3,
        doc.mot4,
        doc.mot5
      ].filter(keyword => keyword && keyword.trim() !== '');

      // Return the complete document details
      return res.json({
        success: true,
        document: {
          id: doc.id_document,
          name: doc.nom_document,
          originalName: doc.nom_document_original,
          type: doc.type_name,
          path: doc.path,
          comment: doc.comment,
          dateUpload: doc.formatted_date,
          file_size: doc.file_size,
          keywords: keywords,
          tags: tags,
          id_institution: doc.id_institution,
          author: {
            id: doc.id_user_source
          }
        }
      });
    } catch (error) {
      console.error("Error fetching document details:", error);
      return res.status(500).json({ 
        error: "Error fetching document details", 
        details: error.message, 
        success: false 
      });
    }
  } catch (error) {
    console.error("Unexpected error in details endpoint:", error);
    return res.status(500).json({ 
      error: "Server error", 
      details: error.message, 
      success: false 
    });
  }
});

// Check if a document name already exists
route.get('/check-document-name/:documentName', async function (req, res) {
  console.log("GET request received at /post_docs/check-document-name/:documentName");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const documentName = decodeURIComponent(req.params.documentName);
    console.log(`Checking if document name exists: ${documentName}`);

    const con = await pool.getConnection();
    
    // Check both nom_document and nom_document_original, case insensitive
    const [results] = await con.query(
      `SELECT COUNT(*) as count 
       FROM table_document 
       WHERE LOWER(nom_document) = LOWER(?) 
       OR LOWER(nom_document_original) = LOWER(?)`,
      [documentName, documentName]
    );
    
    // Also check if there's a document with the same name but different case
    const [caseResults] = await con.query(
      `SELECT COUNT(*) as count 
       FROM table_document 
       WHERE nom_document = ? 
       OR nom_document_original = ?`,
      [documentName, documentName]
    );
    
    con.release();

    const exists = results[0].count > 0 || caseResults[0].count > 0;
    console.log(`Document name "${documentName}" ${exists ? 'exists' : 'does not exist'}`);

    return res.json({ exists });
  } catch (error) {
    console.error("Error checking document name:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get all document types
route.get('/document-types', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get document types for the user's institution
    const [types] = await con.query(
      `SELECT dt.* 
       FROM document_types dt
       WHERE dt.institution_id = ? OR dt.institution_id IS NULL
       ORDER BY dt.type_name`,
      [institution.id_institution]
    );
    con.release();

    return res.json({
      success: true,
      types: types.map(type => ({
        id: type.id,
        type_name: type.type_name,
        description: type.description,
        folder_path: type.folder_path,
        institution_id: type.institution_id
      }))
    });
  } catch (error) {
    console.error("Error fetching document types:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Create new document type
route.post('/document-types', async function (req, res) {
  console.log("POST request received at /post_docs/document-types");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { typeName, description, folderPath } = req.body;
  if (!typeName) {
    return res.status(400).json({ error: "Type name is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];
    
    // Check if type already exists for this institution
    const [existing] = await con.query(
      'SELECT id FROM document_types WHERE type_name = ? AND institution_id = ?',
      [typeName, institution.id_institution]
    );

    if (existing.length > 0) {
      con.release();
      return res.status(400).json({ error: "Document type already exists for this institution" });
    }

    // Only create the folder in the root directory if no parent folder is specified
    if (!folderPath) {
      const uploadsDir = path.join(__dirname, '..', 'uploads', institution.name);
      const uploadDir = path.join(uploadsDir, typeName);
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log(`Created directory for document type: ${uploadDir}`);
        }
      } catch (folderError) {
        console.error("Error creating folder for document type:", folderError);
        con.release();
        return res.status(500).json({ 
          error: "Failed to create folder for document type", 
          details: folderError.message 
        });
      }
    }

    // Insert the new document type
    const [result] = await con.query(
      'INSERT INTO document_types (type_name, description, folder_path, institution_id) VALUES (?, ?, ?, ?)',
      [typeName, description || null, folderPath || path.join(institution.name, typeName), institution.id_institution]
    );
    con.release();

    return res.json({
      success: true,
      message: "Document type created successfully",
      typeId: result.insertId,
      uploadPath: folderPath ? path.join(folderPath, typeName) : path.join(institution.name, typeName)
    });
  } catch (error) {
    console.error("Error creating document type:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Delete document type
route.delete('/document-types/:typeId', async function (req, res) {
  console.log("DELETE request received at /post_docs/document-types/:typeId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const typeId = req.params.typeId;
  if (!typeId) {
    return res.status(400).json({ error: "Document type ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get document type details and verify it belongs to the user's institution
    const [documentTypes] = await con.query(
      'SELECT * FROM document_types WHERE id = ? AND institution_id = ?',
      [typeId, institution.id_institution]
    );

    if (documentTypes.length === 0) {
      con.release();
      return res.status(404).json({ error: "Document type not found or not accessible" });
    }

    const documentType = documentTypes[0];

    // Check if document type is in use
    const [documents] = await con.query(
      'SELECT COUNT(*) as count FROM table_document WHERE id_document_type = ?',
      [typeId]
    );

    if (documents[0].count > 0) {
      con.release();
      return res.status(400).json({ error: "Cannot delete document type that is in use" });
    }

    // Delete the document type folder from filesystem if it exists
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullPath = path.join(uploadsDir, documentType.folder_path);

    try {
      if (fs.existsSync(fullPath)) {
        fs.rmdirSync(fullPath, { recursive: true });
        console.log(`Deleted document type folder: ${fullPath}`);
      }
    } catch (folderError) {
      console.error("Error deleting document type folder:", folderError);
      con.release();
      return res.status(500).json({ 
        error: "Failed to delete document type folder from filesystem", 
        details: folderError.message 
      });
    }

    // Delete the document type from database
    await con.query('DELETE FROM document_types WHERE id = ?', [typeId]);
    con.release();

    return res.json({
      success: true,
      message: "Document type deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting document type:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get all folders in uploads directory with their structure
route.get('/folders', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    const userId = req.session.id_user;
    
    // First, check if user is a personal user (no institution)
    const [userCheck] = await con.query(
      `SELECT u.roles, u.institution_id, u.personal_folder_name 
       FROM user u 
       WHERE u.id_user = ?`,
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const user = userCheck[0];
    
    // If user is a personal user (no institution), get their personal folders
    if (!user.institution_id) {
      const [personalFolders] = await con.query(
        `SELECT f.* 
         FROM folders f
         WHERE f.institution_id IS NULL 
               AND f.created_by = ?
               AND f.folder_name != 'Draft'
         ORDER BY f.folder_name`,
        [userId]
      );
      
      con.release();
      
      return res.json({
        success: true,
        folders: personalFolders.map(folder => ({
          id: folder.id,
          folder_name: folder.folder_name,
          folder_path: folder.folder_path,
          created_by: folder.created_by,
          institution_id: folder.institution_id,
          created_at: folder.created_at,
          is_private: folder.is_private === 1
        }))
      });
    }
    
    // For institutional users, get user's institution and role
    const [userInfo] = await con.query(
      `SELECT i.*, u.roles 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [userId]
    );
    
    if (!userInfo || userInfo.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInfo[0];
    const userRole = userInfo[0].roles;

    let query;
    let params;

    // Filtrare foldere în funcție de rol și permisiuni
    // - Pentru superadmin/admin: foldere publice + foldere private create de ei
    // - Pentru user normal: foldere publice + foldere private create de el
    // - Excludem folderul "Draft" care este utilizat intern
    if (userRole === 'superadmin' || userRole === 'admin') {
      query = `SELECT f.* 
       FROM folders f
       WHERE f.institution_id = ?
             AND f.folder_name != 'Draft'
             AND (f.is_private = 0 OR (f.is_private = 1 AND f.created_by = ?))
       ORDER BY f.folder_name`;
      params = [institution.id_institution, userId];
    } else {
      query = `SELECT f.* 
       FROM folders f
       WHERE f.institution_id = ?
             AND f.folder_name != 'Draft'
             AND (f.is_private = 0 OR (f.is_private = 1 AND f.created_by = ?))
       ORDER BY f.folder_name`;
      params = [institution.id_institution, userId];
    }

    // Get folders for the user's institution
    const [folders] = await con.query(query, params);
    con.release();

    return res.json({
      success: true,
      folders: folders.map(folder => ({
        id: folder.id,
        folder_name: folder.folder_name,
        folder_path: folder.folder_path,
        created_by: folder.created_by,
        institution_id: folder.institution_id,
        created_at: folder.created_at,
        is_private: folder.is_private === 1
      }))
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Create a new folder
route.post('/folders', async function (req, res) {
  console.log("POST request received at /post_docs/folders");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { folderName, parentFolder, folderPath, isPrivate } = req.body;
  if (!folderName) {
    return res.status(400).json({ error: "Folder name is required" });
  }

  try {
    const con = await pool.getConnection();
    const userId = req.session.id_user;
    
    // First, check if user is a personal user (no institution)
    const [userCheck] = await con.query(
      `SELECT u.roles, u.institution_id, u.personal_folder_name 
       FROM user u 
       WHERE u.id_user = ?`,
      [userId]
    );
    
    if (!userCheck || userCheck.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const user = userCheck[0];
    
    // If user is a personal user (no institution), handle personal folder creation
    if (!user.institution_id) {
      let finalFolderPath;
      
      if (folderPath) {
        finalFolderPath = folderPath;
      } else if (parentFolder) {
        finalFolderPath = `${parentFolder}/${folderName}`;
      } else {
        // For personal users, create folder in their personal folder root
        finalFolderPath = folderName;
      }

      // Normalizăm calea pentru a elimina slash-uri multiple
      finalFolderPath = finalFolderPath.replace(/\/+/g, '/').replace(/\/$/, '');

      // Check if folder already exists for this personal user
      const [existing] = await con.query(
        'SELECT id FROM folders WHERE folder_path = ? AND institution_id IS NULL AND created_by = ?',
        [finalFolderPath, userId]
      );

      if (existing.length > 0) {
        con.release();
        return res.status(400).json({ error: "Folder already exists with this path" });
      }

      // Skip physical folder creation in production (Railway)
      // Application works with database-only folder management
      if (process.env.NODE_ENV !== 'production') {
        // Create the folder in the uploads directory (local development only)
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const fullPath = path.join(uploadsDir, finalFolderPath);

        try {
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`Created personal directory: ${fullPath}`);
          }
        } catch (folderError) {
          console.error("Error creating personal folder:", folderError);
          // In development, this is a real error, but in production we skip it
        }
      } else {
        console.log(`✅ Production mode: Folder managed in database only: ${finalFolderPath}`);
      }

      // Insert the new personal folder (always private for personal users)
      const [result] = await con.query(
        'INSERT INTO folders (folder_name, folder_path, created_by, institution_id, is_private) VALUES (?, ?, ?, ?, ?)',
        [folderName, finalFolderPath, userId, null, 1]
      );

      con.release();

      return res.json({
        success: true,
        message: "Personal folder created successfully",
        folder: {
          id: result.insertId,
          folder_name: folderName,
          folder_path: finalFolderPath,
          created_by: userId,
          institution_id: null,
          is_private: true
        }
      });
    }
    
    // For institutional users, get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.*, u.roles 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [userId]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];
    
    // Verificăm dacă utilizatorul are rol de "user" - în acest caz, setăm automat folderul ca privat
    const userRole = userInstitution[0].roles;
    let folderIsPrivate = isPrivate === 1 || isPrivate === true;
    
    if (userRole === 'user') {
      folderIsPrivate = true; // Forțăm ca toate folderele create de useri normali să fie private
    }

    // Construim calea reală pentru folder
    let finalFolderPath;
    if (folderPath) {
      // Dacă s-a trimis o cale explicită, verificăm dacă include numele instituției
      if (!folderPath.startsWith(institution.name)) {
        finalFolderPath = `${institution.name}/${folderPath}`;
      } else {
        finalFolderPath = folderPath;
      }
    } else {
      // Altfel construim calea bazată pe parent folder
      if (parentFolder) {
        // Verificăm dacă parentFolder include numele instituției
        if (!parentFolder.startsWith(institution.name)) {
          finalFolderPath = `${institution.name}/${parentFolder}/${folderName}`;
        } else {
          finalFolderPath = `${parentFolder}/${folderName}`;
        }
      } else {
        finalFolderPath = `${institution.name}/${folderName}`;
      }
    }

    // Normalizăm calea pentru a elimina slash-uri multiple
    finalFolderPath = finalFolderPath.replace(/\/+/g, '/').replace(/\/$/, '');

    // Check if folder already exists for this institution
    const [existing] = await con.query(
      'SELECT id FROM folders WHERE folder_path = ? AND institution_id = ?',
      [finalFolderPath, institution.id_institution]
    );

    if (existing.length > 0) {
      con.release();
      return res.status(400).json({ error: "Folder already exists with this path" });
    }

    // Create the folder in the uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullPath = path.join(uploadsDir, finalFolderPath);

    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${fullPath}`);
      }
    } catch (folderError) {
      console.error("Error creating folder:", folderError);
      con.release();
      return res.status(500).json({ 
        error: "Failed to create folder", 
        details: folderError.message 
      });
    }

    // Insert the new folder with is_private
    const [result] = await con.query(
      'INSERT INTO folders (folder_name, folder_path, created_by, institution_id, is_private) VALUES (?, ?, ?, ?, ?)',
      [folderName, finalFolderPath, userId, institution.id_institution, folderIsPrivate ? 1 : 0]
    );
    con.release();

    // ✅ EMIT SOCKET EVENT FOR FOLDER CREATION
    if (req.app.get('io')) {
      const eventData = {
        type: 'folder_create',
        folderId: result.insertId,
        folderName: folderName,
        folderPath: finalFolderPath,
        parentPath: parentFolder || path.dirname(finalFolderPath),
        isPrivate: folderIsPrivate,
        userId: req.session.id_user,
        timestamp: new Date().toISOString()
      };
      
      console.log('📁 === EMITTING FOLDER CREATE EVENT ===');
      console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
      
      req.app.get('io').emit('fileSystemUpdate', eventData);
      console.log('✅ FOLDER CREATE event emitted to all connected clients');
    }

    return res.json({
      success: true,
      message: "Folder created successfully",
      folderId: result.insertId,
      folderPath: finalFolderPath,
      isPrivate: folderIsPrivate
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Move a folder
route.post('/folders/move', async function (req, res) {
  console.log("POST request received at /post_docs/folders/move");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { sourcePath, destinationPath } = req.body;
  if (!sourcePath || !destinationPath) {
    return res.status(400).json({ error: "Source and destination paths are required" });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullSourcePath = path.join(uploadsDir, sourcePath);
    const fullDestPath = path.join(uploadsDir, destinationPath);

    // Check if source exists and is a directory
    if (!fs.existsSync(fullSourcePath) || !fs.statSync(fullSourcePath).isDirectory()) {
      return res.status(404).json({ error: "Source folder not found" });
    }

    // Check if destination exists and is a directory
    if (!fs.existsSync(fullDestPath) || !fs.statSync(fullDestPath).isDirectory()) {
      return res.status(404).json({ error: "Destination folder not found" });
    }

    // Get the folder name from source path
    const folderName = path.basename(fullSourcePath);
    const newPath = path.join(fullDestPath, folderName);

    // Check if folder with same name exists in destination
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: "Folder with same name already exists in destination" });
    }

    // Get folder details from database to check permissions
    const con = await pool.getConnection();
    await con.beginTransaction();
    
    try {
      const [folders] = await con.query(
        'SELECT * FROM folders WHERE folder_path = ?',
        [sourcePath]
      );

      if (folders.length === 0) {
        await con.rollback();
        con.release();
        return res.status(404).json({ error: "Folder not found in database" });
      }

      const folder = folders[0];

      // Get user's role and institution
      const [userInfo] = await con.query(
        `SELECT u.roles, u.institution_id
         FROM user u
         WHERE u.id_user = ?`,
        [req.session.id_user]
      );

      if (userInfo.length === 0) {
        await con.rollback();
        con.release();
        return res.status(403).json({ error: "User not found" });
      }

      const userRole = userInfo[0].roles;
      const userInstitutionId = userInfo[0].institution_id;

      // Check if user has permission to move this folder
      console.log('🔍 FOLDER MOVE DEBUG:');
      console.log('  - User ID:', req.session.id_user);
      console.log('  - User Role:', userRole);
      console.log('  - User Institution ID:', userInstitutionId);
      console.log('  - Folder Institution ID:', folder.institution_id);
      console.log('  - Folder Created By:', folder.created_by);
      console.log('  - Folder Is Private:', folder.is_private);
      
      let hasPermission = false;
      
      // Personal users (no institution) can move any of their folders
      if (!userInstitutionId) {
        console.log('  - Personal user: checking if folder belongs to user');
        hasPermission = folder.created_by === req.session.id_user;
        console.log('  - Personal user permission:', hasPermission);
      }
      // Institutional users
      else {
        // Private folders: only the creator can move them (regardless of role)
        if (folder.is_private === 1) {
          console.log('  - Private folder: checking creator permission');
          hasPermission = folder.created_by === req.session.id_user;
          console.log('  - Private folder permission:', hasPermission);
        }
        // Public folders: role-based permissions
        else {
          if (userRole === 'superadmin' || userRole === 'admin') {
            // SuperAdmin/Admin can move public folders in their institution
            hasPermission = folder.institution_id === userInstitutionId;
            console.log('  - Admin/SuperAdmin public folder permission:', hasPermission);
          } else {
            // Normal users can only move public folders they created
            hasPermission = folder.created_by === req.session.id_user;
            console.log('  - Normal user public folder permission:', hasPermission);
          }
        }
      }

      if (!hasPermission) {
        await con.rollback();
        con.release();
        console.log('  - PERMISSION DENIED: User cannot move this folder');
        return res.status(403).json({ error: "Not authorized to move this folder" });
      }
      
      console.log('  - PERMISSION GRANTED: User can move this folder');

    // Move the folder
    fs.renameSync(fullSourcePath, newPath);
    console.log(`Moved folder from ${fullSourcePath} to ${newPath}`);

    // Update document paths in database
    let relativeNewPath = path.relative(uploadsDir, newPath);
    
    // Clean null/ prefix for personal users
    if (relativeNewPath.startsWith('null/')) {
      relativeNewPath = relativeNewPath.substring(5);
      console.log('🔍 FOLDER MOVE: Cleaned null/ prefix from relativeNewPath:', relativeNewPath);
    }
    
    console.log('🔍 FOLDER MOVE: Database update paths:');
    console.log('  - Source path:', sourcePath);
    console.log('  - New path:', relativeNewPath);
    
    // Update paths for all documents in the moved folder and its subfolders
    await con.query(
      `UPDATE table_document 
       SET path = REPLACE(path, ?, ?)
       WHERE path LIKE ?`,
      [sourcePath, relativeNewPath, `${sourcePath}%`]
    );

    // Update paths for all subfolders in the moved folder
    await con.query(
      `UPDATE folders 
       SET folder_path = REPLACE(folder_path, ?, ?)
       WHERE folder_path LIKE ?`,
      [sourcePath, relativeNewPath, `${sourcePath}%`]
    );
    
    await con.commit();
    con.release();

    return res.json({
      success: true,
      message: "Folder moved successfully",
      newPath: relativeNewPath
    });
    } catch (dbError) {
      await con.rollback();
      con.release();
      throw dbError;
    }
  } catch (error) {
    console.error("Error moving folder:", error);
    return res.status(500).json({ error: "Failed to move folder", details: error.message });
  }
});

// Delete a folder
route.delete('/folders/:folderId', async function (req, res) {
  console.log("DELETE request received at /post_docs/folders/:folderId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const folderId = req.params.folderId;
  if (!folderId) {
    return res.status(400).json({ error: "Folder ID is required" });
  }

  let con;
  try {
    con = await pool.getConnection();
    
    // Start transaction
    await con.beginTransaction();

    // Get folder details
    const [folders] = await con.query(
      'SELECT * FROM folders WHERE id = ?',
      [folderId]
    );

    // If folder not found, check if it's already in deleted_folders
    if (folders.length === 0) {
      const [deletedFolders] = await con.query(
        'SELECT * FROM deleted_folders WHERE id = ?',
        [folderId]
      );

      if (deletedFolders.length > 0) {
        // Folder is already in recycle bin, return success
        await con.commit();
        con.release();
        return res.json({
          success: true,
          message: "Folder is already in recycle bin"
        });
      }

      await con.rollback();
      con.release();
      return res.status(404).json({ error: "Folder not found" });
    }

    const folder = folders[0];

    // Get user's role and institution
    const [userInfo] = await con.query(
      `SELECT u.roles, u.institution_id
       FROM user u
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (userInfo.length === 0) {
      await con.rollback();
      con.release();
      return res.status(403).json({ error: "User not found" });
    }

    const userRole = userInfo[0].roles;
    const userInstitutionId = userInfo[0].institution_id;

    // Check if user has permission to delete this folder
    // - For superadmin/admin: can delete any folder in their institution
    // - For normal users: can only delete folders they created
    let hasPermission = false;
    
    if (userRole === 'superadmin' || userRole === 'admin') {
      // SuperAdmin/Admin can delete any folder in their institution
      hasPermission = folder.institution_id === userInstitutionId;
    } else {
      // Normal users can only delete folders they created
      hasPermission = folder.created_by === req.session.id_user;
    }

    if (!hasPermission) {
      await con.rollback();
      con.release();
      return res.status(403).json({ error: "Not authorized to delete this folder" });
    }

    try {
      // Get all documents in this folder and its subfolders
      const [documents] = await con.query(
        'SELECT * FROM table_document WHERE path = ? OR path LIKE ?',
        [folder.folder_path, `${folder.folder_path}/%`]
      );

      // Move documents to deleted_documents
      for (const doc of documents) {
        // Get document tags
        const [documentTags] = await con.query(
          `SELECT dt.* 
           FROM document_tag_relations dtr 
           JOIN document_tags dt ON dtr.id_tag = dt.id_tag 
           WHERE dtr.id_document = ?`,
          [doc.id_document]
        );

        // Get document keywords
        const [keywords] = await con.query(
          'SELECT mot1, mot2, mot3, mot4, mot5 FROM table_mot_cle WHERE id_document = ?',
          [doc.id_document]
        );

        // Note: We keep document_statistics for move to recycle bin (logs should be preserved)
        // Delete all other foreign key references first
        await con.query('DELETE FROM table_mot_cle WHERE id_document = ?', [doc.id_document]);
        await con.query('DELETE FROM document_tag_relations WHERE id_document = ?', [doc.id_document]);
        
        // Handle document versions
        await con.query(
          'UPDATE document_versions SET parent_version_id = NULL WHERE id_document = ?',
          [doc.id_document]
        );
        await con.query('DELETE FROM document_versions WHERE id_document = ?', [doc.id_document]);

        // Move to deleted_documents with tags and keywords
        await con.query(
          `INSERT INTO deleted_documents 
           (id_document, nom_document, nom_document_original, path, type_id, date_upload, comment, id_user_source, file_size, deleted_at, keywords, tags, first_page)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
          [
            doc.id_document,
            doc.nom_document,
            doc.nom_document_original,
            doc.path,
            doc.type_id,
            doc.date_upload,
            doc.comment,
            doc.id_user_source,
            doc.file_size,
            JSON.stringify(keywords[0] || {}),
            JSON.stringify(documentTags || []),
            doc.first_page || null
          ]
        );

        // Delete from table_document
        await con.query('DELETE FROM table_document WHERE id_document = ?', [doc.id_document]);
      }

      // Move folder to deleted_folders
      await con.query(
        `INSERT INTO deleted_folders 
         (folder_name, folder_path, institution_id, is_private, created_by, deleted_by, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          folder.folder_name,
          folder.folder_path,
          folder.institution_id,
          folder.is_private,
          folder.created_by,
          req.session.id_user
        ]
      );

      // Delete from folders
      await con.query('DELETE FROM folders WHERE id = ?', [folderId]);

      // Commit transaction
      await con.commit();
      
      con.release();

      // ✅ EMIT SOCKET EVENT FOR FOLDER DELETE
      if (req.app.get('io')) {
        const eventData = {
          type: 'folder_delete',
          folderId: folderId,
          folderName: folder.folder_name,
          folderPath: folder.folder_path,
          parentPath: path.dirname(folder.folder_path),
          userId: req.session.id_user,
          timestamp: new Date().toISOString()
        };
        
        console.log('🗑️📁 === EMITTING FOLDER DELETE EVENT ===');
        console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
        
        req.app.get('io').emit('fileSystemUpdate', eventData);
        console.log('✅ FOLDER DELETE event emitted to all connected clients');
      }

      return res.json({
        success: true,
        message: "Folder and its contents moved to recycle bin"
      });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error moving folder to recycle bin:", error);
    if (con) {
      con.release();
    }
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Move a file (PDF)
route.post('/files/move', async function (req, res) {
  console.log("POST request received at /post_docs/files/move");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { sourcePath, destinationPath } = req.body;
  if (!sourcePath || !destinationPath) {
    return res.status(400).json({ error: "Source and destination paths are required" });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullSourcePath = path.join(uploadsDir, sourcePath);
    const fullDestPath = path.join(uploadsDir, destinationPath);

    // Check if source exists and is a file
    if (!fs.existsSync(fullSourcePath) || !fs.statSync(fullSourcePath).isFile()) {
      return res.status(404).json({ error: "Source file not found" });
    }

    // Check if destination exists and is a directory
    if (!fs.existsSync(fullDestPath) || !fs.statSync(fullDestPath).isDirectory()) {
      return res.status(404).json({ error: "Destination folder not found" });
    }

    // Get the file name and source folder from source path
    const fileName = path.basename(fullSourcePath);
    const srcFolderRel = path.dirname(sourcePath); // relative folder
    const newPath = path.join(fullDestPath, fileName);

    // Check if file with same name exists in destination
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: "File with same name already exists in destination" });
    }

    // Move the main file first
    fs.renameSync(fullSourcePath, newPath);
    console.log(`Moved file from ${fullSourcePath} to ${newPath}`);

    // Update document path in database
    const con = await pool.getConnection();
    const relativeNewPath = path.relative(uploadsDir, newPath);
    const newFolderRel = path.dirname(relativeNewPath);
    
    // Identify the specific document by exact source folder + name to avoid duplicates
    const [docRow] = await con.query(
      'SELECT id_document FROM table_document WHERE path = ? AND nom_document = ? LIMIT 1',
      [srcFolderRel, fileName]
    );
    const docId = docRow && docRow.length > 0 ? docRow[0].id_document : null;
    if (docId == null) {
      // Fallback: try by name only (legacy)
      const [byName] = await con.query('SELECT id_document, path FROM table_document WHERE nom_document = ? LIMIT 1', [fileName]);
      if (!byName || byName.length === 0) {
        con.release();
        return res.status(404).json({ error: 'Document row not found in database' });
      }
      console.warn('Move fallback by name used; original path was:', byName[0].path);
      await con.query('UPDATE table_document SET path = ? WHERE id_document = ?', [newFolderRel, byName[0].id_document]);
    } else {
      await con.query('UPDATE table_document SET path = ? WHERE id_document = ?', [newFolderRel, docId]);
    }
    
    console.log(`Updated database path for document ${fileName} to ${newFolderRel}`);

    // Move all version files that belong to this document as well
    try {
      let versionRows = [];
      if (docId != null) {
        const [byDoc] = await con.query('SELECT id_version, file_path FROM document_versions WHERE id_document = ?', [docId]);
        versionRows = byDoc;
      } else {
        const [byNameVers] = await con.query(
          'SELECT v.id_version, v.file_path FROM document_versions v JOIN table_document d ON d.id_document = v.id_document WHERE d.nom_document = ? LIMIT 500',
          [fileName]
        );
        versionRows = byNameVers;
      }
      if (versionRows && versionRows.length > 0) {
        for (const v of versionRows) {
          if (!v.file_path) continue;
          const absOld = path.join(uploadsDir, v.file_path);
          // Compute new version file path by swapping folder path only
          const relOld = v.file_path; // e.g., Scoala/Old/NAME_V1.pdf
          const newRel = path.join(newFolderRel, path.basename(relOld));
          const absNew = path.join(uploadsDir, newRel);
          try {
            if (fs.existsSync(absOld)) {
              fs.renameSync(absOld, absNew);
              await con.query('UPDATE document_versions SET file_path = ? WHERE id_version = ?', [newRel, v.id_version]);
              console.log(`Moved version file ${relOld} -> ${newRel}`);
            }
          } catch (mvErr) {
            console.warn('Failed moving version file:', relOld, '->', newRel, mvErr.message);
          }
        }
      }
      // Additionally, move loose version-named files that aren't in document_versions (fallback naming pattern)
      try {
        const srcFolder = path.dirname(fullSourcePath);
        const dstFolder = path.dirname(newPath);
        const base = path.parse(fileName).name; // without .pdf
        if (fs.existsSync(srcFolder)) {
          const entries = fs.readdirSync(srcFolder);
          // Match: base_V1.pdf, base_v1.pdf, base V1.pdf, base-V1.pdf
          const safeBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`^(?:${safeBase}[_\-\s]?[Vv](\\d+)\\.pdf)$`, 'i');
          for (const name of entries) {
            if (regex.test(name)) {
              const oldP = path.join(srcFolder, name);
              const newP = path.join(dstFolder, name);
              try { if (fs.existsSync(oldP)) fs.renameSync(oldP, newP); } catch {}
            }
          }
        }
      } catch {}
    } catch (versionsErr) {
      console.warn('Error while moving versions with the main file:', versionsErr.message);
    }
    
    con.release();

    // ✅ EMIT SOCKET EVENTS FOR FILE MOVE (used by drag and drop)
    if (req.app.get('io')) {
      const sourceFolderPath = path.dirname(sourcePath);
      const targetFolderPath = path.dirname(relativeNewPath);
      
      // ✅ EVENT 1: Source folder - document disappeared
      const sourceEventData = {
        type: 'move',
        eventType: 'move_source',
        documentName: fileName,
        sourcePath: sourceFolderPath,
        sourceFolder: sourceFolderPath,
        targetFolder: targetFolderPath,
        userId: req.session.id_user,
        timestamp: new Date().toISOString()
      };
      
      // ✅ EVENT 2: Target folder - document appeared
      const targetEventData = {
        type: 'move', 
        eventType: 'move_target',
        documentName: fileName,
        sourcePath: sourceFolderPath,
        targetFolder: targetFolderPath,
        destinationPath: targetFolderPath,
        userId: req.session.id_user,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔄 === EMITTING FILE MOVE EVENTS (DRAG & DROP) ===');
      console.log('📤 Source event data:', JSON.stringify(sourceEventData, null, 2));
      console.log('📥 Target event data:', JSON.stringify(targetEventData, null, 2));
      
      // Emit separate events for source and target folders
      req.app.get('io').emit('fileSystemUpdate', sourceEventData);
      req.app.get('io').emit('fileSystemUpdate', targetEventData);
      
      console.log('✅ Both MOVE events emitted to all connected clients');
    }

    return res.json({
      success: true,
      message: "File moved successfully",
      newPath: relativeNewPath
    });
  } catch (error) {
    console.error("Error moving file:", error);
    return res.status(500).json({ error: "Failed to move file", details: error.message });
  }
});

// Delete a file (PDF)
route.delete('/files/:filePath(*)', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const filePath = req.params.filePath;
  let con;

  try {
    con = await pool.getConnection();
    
    // Start transaction
    await con.beginTransaction();

    // Get file details from table_document by precise folder + name
    const fileName = path.basename(filePath);
    const folderPath = path.dirname(filePath);
    let [file] = await con.query(
      'SELECT * FROM table_document WHERE path = ? AND nom_document = ?',
      [folderPath, fileName]
    );
    // Fallback: try by name only if not found (legacy callers)
    if (!file || file.length === 0) {
      [file] = await con.query(
        'SELECT * FROM table_document WHERE nom_document = ? LIMIT 1',
        [fileName]
      );
    }

    if (!file || file.length === 0) {
      await con.rollback();
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user has permission to delete this file
    if (file[0].id_user_source !== req.session.id_user) {
      await con.rollback();
      return res.status(403).json({ error: "Not authorized to delete this file" });
    }

    try {
      // Get keywords before deleting them
      const [keywords] = await con.query(
        'SELECT mot1, mot2, mot3, mot4, mot5 FROM table_mot_cle WHERE id_document = ?',
        [file[0].id_document]
      );

      // Get tags before deleting them
      const [documentTags] = await con.query(
        `SELECT dtr.*, dt.tag_name 
         FROM document_tag_relations dtr 
         JOIN document_tags dt ON dtr.id_tag = dt.id_tag 
         WHERE dtr.id_document = ?`,
        [file[0].id_document]
      );

      // Note: Moving to recycle bin is not a true delete, so we don't log it here
      // Delete action will be logged when permanently deleted from recycle bin
      // We keep document_statistics when moving to recycle bin (logs should be preserved)
      
      // Delete other foreign key references first
      
      // Delete keywords (table_mot_cle entries)
      console.log('Deleting document keywords...');
      await con.query('DELETE FROM table_mot_cle WHERE id_document = ?', [file[0].id_document]);
      
      // Delete document tag relations
      console.log('Deleting document tag relations...');
      await con.query('DELETE FROM document_tag_relations WHERE id_document = ?', [file[0].id_document]);

      // Handle version references and FK current_version_id
      // 1) Break self references inside document_versions
      console.log('Breaking parent-child references in document_versions...');
      await con.query(
        'UPDATE document_versions SET parent_version_id = NULL WHERE id_document = ?',
        [file[0].id_document]
      );

      // 2) Clear current_version_id on table_document to avoid FK constraint when deleting versions
      console.log('Clearing current_version_id for document before deleting versions...');
      await con.query(
        'UPDATE table_document SET current_version_id = NULL WHERE id_document = ?',
        [file[0].id_document]
      );

      // 3) Move versions to deleted_document_versions (soft-delete) and remove from active table
      const [versionRows] = await con.query(
        `SELECT v.*, d.nom_document_original, u.institution_id AS id_institution
         FROM document_versions v
         JOIN table_document d ON d.id_document = v.id_document
         LEFT JOIN user u ON u.id_user = d.id_user_source
         WHERE v.id_document = ?`,
        [file[0].id_document]
      );
      console.log(`Soft-deleting ${versionRows.length} versions for document ${file[0].id_document}`);
      for (const v of versionRows) {
        // Ensure JSON columns are strings, not objects, to avoid syntax errors
        const jsonTags = typeof v.tags === 'string' || v.tags == null ? v.tags : JSON.stringify(v.tags);
        const jsonKeywords = typeof v.keywords === 'string' || v.keywords == null ? v.keywords : JSON.stringify(v.keywords);
        const jsonMeta = typeof v.metadata_changes === 'string' || v.metadata_changes == null ? v.metadata_changes : JSON.stringify(v.metadata_changes);

        await con.query(
          `INSERT INTO deleted_document_versions 
           (id_document, id_version, id_institution, file_path, version_number, version_name, original_document_name, change_summary, created_by, created_at, type_id, tags, keywords, comment, metadata_changes, first_page, file_size, deleted_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, CAST(? AS JSON), ?, ?, ?)`,
          [
            v.id_document,
            v.id_version || null,
            v.id_institution || null,
            v.file_path,
            v.version_number || 0,
            v.version_name || null,
            v.nom_document_original || null,
            v.change_summary || null,
            v.created_by || null,
            v.created_at || null,
            v.type_id || null,
            jsonTags || null,
            jsonKeywords || null,
            v.comment || null,
            jsonMeta || null,
            v.first_page || null,
            v.file_size || 0,
            req.session.id_user
          ]
        );
      }
      await con.query('DELETE FROM document_versions WHERE id_document = ?', [file[0].id_document]);

      // Move to deleted_documents with keywords and tags (soft-delete document)
      await con.query(
        `INSERT INTO deleted_documents 
         (id_document, nom_document, nom_document_original, path, type_id, date_upload, comment, id_user_source, file_size, deleted_at, keywords, tags, first_page)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [
          file[0].id_document,
          file[0].nom_document,
          file[0].nom_document_original,
          file[0].path,
          file[0].type_id,
          file[0].date_upload,
          file[0].comment,
          file[0].id_user_source,
          file[0].file_size,
          JSON.stringify(keywords[0] || {}),
          JSON.stringify(documentTags || []),
          file[0].first_page || null
        ]
      );

      // Remove statistics linked to this document to satisfy FK constraints
      try {
        await con.query('DELETE FROM document_statistics WHERE id_document = ?', [file[0].id_document]);
      } catch {}

      // Remove the document row from active table so it no longer shows up in listings
      await con.query('DELETE FROM table_document WHERE id_document = ?', [file[0].id_document]);

      // Commit transaction
      await con.commit();
      
      con.release();

      // ✅ EMIT SOCKET EVENT FOR DELETE (like move does)
      if (req.app.get('io')) {
        const eventData = {
          type: 'delete',
          documentId: file[0].id_document,
          documentName: file[0].nom_document,
          sourcePath: file[0].path,
          sourceFolder: file[0].path,
          userId: req.session.id_user,
          timestamp: new Date().toISOString()
        };
        
        console.log('🗑️ === EMITTING DELETE EVENT ===');
        console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
        
        req.app.get('io').emit('fileSystemUpdate', eventData);
        console.log('✅ DELETE event emitted to all connected clients');
      } else {
        console.warn('⚠️ Socket.IO not available, DELETE event not emitted');
      }

      // === Physical move to recycle: move main PDF and any version files to .recycle ===
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const instRoot = file[0].path.split('/')[0];
        const originalFolderAbs = path.join(uploadsDir, file[0].path);
        const recycleFolderAbs = path.join(uploadsDir, instRoot, '.recycle', file[0].path.substring(instRoot.length + 1));
        // Ensure recycle directory exists
        fs.mkdirSync(recycleFolderAbs, { recursive: true });

        // Move main file
        const mainOld = path.join(originalFolderAbs, file[0].nom_document);
        const mainNew = path.join(recycleFolderAbs, file[0].nom_document);
        try { if (fs.existsSync(mainOld)) fs.renameSync(mainOld, mainNew); } catch {}

        // Move version files by pattern as safety net
        try {
          const base = path.parse(file[0].nom_document).name;
          if (fs.existsSync(originalFolderAbs) && fs.statSync(originalFolderAbs).isDirectory()) {
            const entries = fs.readdirSync(originalFolderAbs);
            const regex = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[_\\-\\s]?[Vv](\\\d+)\\.pdf$', 'i');
            for (const name of entries) {
              if (regex.test(name)) {
                const oldP = path.join(originalFolderAbs, name);
                const newP = path.join(recycleFolderAbs, name);
                try { if (fs.existsSync(oldP)) fs.renameSync(oldP, newP); } catch {}
              }
            }
          }
        } catch {}
      } catch (cleanupErr) {
        console.warn('Recycle move encountered issues:', cleanupErr.message);
      }

      return res.json({
        success: true,
        message: "File moved to recycle bin with all versions",
        tags: documentTags ? documentTags.map(tag => tag.tag_name) : [],
        keywords: keywords[0] ? Object.values(keywords[0]).filter(Boolean) : []
      });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error moving file to recycle bin:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Rename a file (PDF)
route.post('/files/rename', async function (req, res) {
  console.log("POST request received at /post_docs/files/rename");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    return res.status(400).json({ error: "Old path and new name are required" });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const oldFullPath = path.join(uploadsDir, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    // Check if old file exists
    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if new file name already exists
    if (fs.existsSync(newFullPath)) {
      return res.status(400).json({ error: "A file with this name already exists" });
    }

    // Get the file details from database
    const con = await pool.getConnection();
    const [fileDetails] = await con.query(
      'SELECT * FROM table_document WHERE path = ?',
      [oldPath]
    );

    if (!fileDetails || fileDetails.length === 0) {
      con.release();
      return res.status(404).json({ error: "File not found in database" });
    }

    const fileId = fileDetails[0].id_document;

    // Start transaction
    await con.beginTransaction();

    try {
      // Rename the file in the file system
      fs.renameSync(oldFullPath, newFullPath);
      console.log(`Renamed file from ${oldFullPath} to ${newFullPath}`);

      // Update only the nom_document field in the database
      await con.query(
        'UPDATE table_document SET nom_document = ? WHERE id_document = ?',
        [newName, fileId]
      );

      // Commit transaction
      await con.commit();
      con.release();

      return res.json({
        success: true,
        message: "File renamed successfully",
        newName: newName
      });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      con.release();
      throw error;
    }
  } catch (error) {
    console.error("Error renaming file:", error);
    return res.status(500).json({ error: "Failed to rename file", details: error.message });
  }
});

// Rename a folder
route.post('/folders/rename', async function (req, res) {
  console.log("POST request received at /post_docs/folders/rename");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    return res.status(400).json({ error: "Old path and new name are required" });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const oldFullPath = path.join(uploadsDir, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    // Get the folder's parent path and new complete path
    const parentPath = path.dirname(oldPath);
    const newFolderPath = path.join(parentPath, newName);

    console.log(`Renaming folder: 
      oldPath: ${oldPath}, 
      newName: ${newName},
      parentPath: ${parentPath},
      newFolderPath: ${newFolderPath}
    `);

    // Check if old folder exists
    if (!fs.existsSync(oldFullPath) || !fs.statSync(oldFullPath).isDirectory()) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Check if new folder name already exists
    if (fs.existsSync(newFullPath)) {
      return res.status(400).json({ error: "A folder with this name already exists" });
    }

    const con = await pool.getConnection();
    await con.beginTransaction();
    
    try {
      // First get the folder from database to check if it exists
      const [folders] = await con.query(
        'SELECT * FROM folders WHERE folder_path = ?',
        [oldPath]
      );

      if (folders.length === 0) {
        await con.rollback();
        con.release();
        return res.status(404).json({ error: "Folder not found in database" });
      }

      const folder = folders[0];

      // Get user's role and institution
      const [userInfo] = await con.query(
        `SELECT u.roles, u.institution_id
         FROM user u
         WHERE u.id_user = ?`,
        [req.session.id_user]
      );

      if (userInfo.length === 0) {
        await con.rollback();
        con.release();
        return res.status(403).json({ error: "User not found" });
      }

      const userRole = userInfo[0].roles;
      const userInstitutionId = userInfo[0].institution_id;

      // Check if user has permission to rename this folder
      // - For superadmin/admin: can rename any folder in their institution
      // - For normal users: can only rename folders they created
      let hasPermission = false;
      
      if (userRole === 'superadmin' || userRole === 'admin') {
        // SuperAdmin/Admin can rename any folder in their institution
        hasPermission = folder.institution_id === userInstitutionId;
      } else {
        // Normal users can only rename folders they created
        hasPermission = folder.created_by === req.session.id_user;
      }

      if (!hasPermission) {
        await con.rollback();
        con.release();
        return res.status(403).json({ error: "Not authorized to rename this folder" });
      }

      // Rename the folder in the database
      await con.query(
        'UPDATE folders SET folder_name = ?, folder_path = ? WHERE folder_path = ?',
        [newName, newFolderPath, oldPath]
      );

      // Update all subfolders
      await con.query(
        `UPDATE folders 
         SET folder_path = REPLACE(folder_path, ?, ?)
         WHERE folder_path LIKE ?`,
        [oldPath, newFolderPath, `${oldPath}/%`]
      );

      // Rename the folder in the filesystem
    fs.renameSync(oldFullPath, newFullPath);
    console.log(`Renamed folder from ${oldFullPath} to ${newFullPath}`);

    // Update document paths in database
    // Update paths for all documents in the renamed folder and its subfolders
    await con.query(
      `UPDATE table_document 
       SET path = REPLACE(path, ?, ?)
       WHERE path LIKE ?`,
        [oldPath, newFolderPath, `${oldPath}%`]
    );
    
      await con.commit();
    con.release();

    return res.json({
      success: true,
      message: "Folder renamed successfully",
        newPath: newFolderPath
    });
    } catch (dbError) {
      await con.rollback();
      con.release();
      throw dbError;
    }
  } catch (error) {
    console.error("Error renaming folder:", error);
    return res.status(500).json({ error: "Failed to rename folder", details: error.message });
  }
});

// Get all deleted items (folders and files)
route.get('/recycle-bin', async function (req, res) {
  console.log("GET request received at /post_docs/recycle-bin");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT u.institution_id 
       FROM user u 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institutionId = userInstitution[0].institution_id;
    
    // Get deleted folders for user's institution
    const [deletedFolders] = await con.query(
      `SELECT 
        'folder' as type,
        folder_name as name,
        folder_path as path,
        deleted_at,
        id as id
       FROM deleted_folders
       WHERE institution_id = ? AND deleted_by = ?
       ORDER BY deleted_at DESC`,
      [institutionId, req.session.id_user]
    );

    // Get user's role
    const [userRole] = await con.query(
      `SELECT u.roles 
       FROM user u 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    const userRoleValue = userRole[0]?.roles;

    // Get deleted files based on user role
    let deletedFiles;
    if (userRoleValue === 'superadmin' || userRoleValue === 'admin') {
      // SuperAdmin/Admin can see all deleted documents from their institution
      [deletedFiles] = await con.query(
        `SELECT 
          'file' as type,
          nom_document as name,
          path,
          deleted_at,
          id_document as id
         FROM deleted_documents dd
         JOIN user u ON dd.id_user_source = u.id_user
         WHERE u.institution_id = ?
         ORDER BY deleted_at DESC`,
        [institutionId]
      );
    } else {
      // Normal users can only see their own deleted documents
      [deletedFiles] = await con.query(
        `SELECT 
          'file' as type,
          nom_document as name,
          path,
          deleted_at,
          id_document as id
         FROM deleted_documents
         WHERE id_user_source = ?
         ORDER BY deleted_at DESC`,
        [req.session.id_user]
      );
    }

    // Organize items by their relationship to deleted folders
    const organizedItems = {
      standaloneDocuments: [], // Documents not in deleted folders
      folders: [] // Folders with their contained documents
    };

    // First, add all folders
    organizedItems.folders = deletedFolders.map(folder => ({
      ...folder,
      containedDocuments: []
    }));

    // Then, organize documents
    for (const file of deletedFiles) {
      let isInDeletedFolder = false;
      
      // Check if file is in any deleted folder
      for (const folder of organizedItems.folders) {
        if (file.path.startsWith(folder.path)) {
          folder.containedDocuments.push(file);
          isInDeletedFolder = true;
          break;
        }
      }

      // If file is not in any deleted folder, add it to standalone documents
      if (!isInDeletedFolder) {
        organizedItems.standaloneDocuments.push(file);
      }
    }

    con.release();

    return res.json({
      success: true,
      items: organizedItems
    });
  } catch (error) {
    console.error("Error fetching deleted items:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Restore a deleted item
route.post('/recycle-bin/restore/:type/:id', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { type, id } = req.params;
  const { restoreToRoot } = req.body;
  const con = await pool.getConnection();

  try {
    if (type === 'folder') {
      // Check if folder exists in deleted_folders
      const [deletedFolder] = await con.query(
        'SELECT * FROM deleted_folders WHERE id = ?',
        [id]
      );

      if (!deletedFolder || deletedFolder.length === 0) {
        con.release();
        return res.status(404).json({ error: "Folder not found in recycle bin" });
      }

      // Check if this folder is a subfolder of another deleted folder
      const [parentFolder] = await con.query(
        'SELECT * FROM deleted_folders WHERE folder_path = ?',
        [path.dirname(deletedFolder[0].folder_path)]
      );

      // If this is a subfolder and we're not restoring to root, return special response
      if (parentFolder && parentFolder.length > 0 && !restoreToRoot) {
        con.release();
        return res.json({
          success: true,
          hasParent: true,
          parentFolder: parentFolder[0],
          message: "This folder is a subfolder of another deleted folder"
        });
      }

      // If restoring to root, modify the path to be at root level
      let restorePath = deletedFolder[0].folder_path;
      if (restoreToRoot) {
        const folderName = path.basename(restorePath);
        restorePath = folderName;
      }

      // Get the parent path from the deleted folder
      const parentPath = path.dirname(deletedFolder[0].folder_path);
      const folderName = path.basename(deletedFolder[0].folder_path);
      
      // If restorePath is just the folder name, use the original parent path
      if (restorePath === folderName) {
        restorePath = deletedFolder[0].folder_path;
      }

      // Check if folder already exists in folders table
      const [existingFolder] = await con.query(
        'SELECT * FROM folders WHERE folder_path = ?',
        [restorePath]
      );

      if (existingFolder && existingFolder.length > 0) {
        con.release();
        return res.status(400).json({ error: "A folder with this path already exists" });
      }

      // Get all deleted documents in this folder and its subfolders
      const [deletedDocs] = await con.query(
        'SELECT * FROM deleted_documents WHERE path LIKE ?',
        [`${deletedFolder[0].folder_path}%`]
      );

      // Restore folder to folders table
      await con.query(
        `INSERT INTO folders 
         (folder_name, folder_path, institution_id, is_private, created_by, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          deletedFolder[0].folder_name,
          restorePath,
          deletedFolder[0].institution_id,
          deletedFolder[0].is_private,
          deletedFolder[0].created_by
        ]
      );

      // Restore all documents to table_document with updated paths
      for (const doc of deletedDocs) {
        // Calculate the new path for the document
        const relativePath = path.relative(deletedFolder[0].folder_path, doc.path);
        const newPath = path.join(restorePath, relativePath);

        await con.query(
          `INSERT INTO table_document 
           (id_document, nom_document, nom_document_original, path, type_id, date_upload, comment, id_user_source, file_size, first_page)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.id_document,
            doc.nom_document,
            doc.nom_document_original,
            newPath,
            doc.type_id,
            doc.date_upload,
            doc.comment,
            doc.id_user_source,
            doc.file_size,
            doc.first_page || null
          ]
        );

        // Restore keywords if they exist
        if (doc.keywords) {
          let keywords;
          try {
            // Handle both string and object formats
            keywords = typeof doc.keywords === 'string'
              ? JSON.parse(doc.keywords)
              : doc.keywords;
              
            if (Object.keys(keywords).length > 0) {
              await con.query(
                `INSERT INTO table_mot_cle 
                 (id_document, mot1, mot2, mot3, mot4, mot5)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  doc.id_document,
                  keywords.mot1 || null,
                  keywords.mot2 || null,
                  keywords.mot3 || null,
                  keywords.mot4 || null,
                  keywords.mot5 || null
                ]
              );
            }
          } catch (error) {
            console.error('Error processing keywords:', error);
            // Continue with restore even if keywords fail
          }
        }

        // Restore tags if they exist
        if (doc.tags) {
          let tags;
          try {
            // Handle both string and object formats
            tags = typeof doc.tags === 'string'
              ? JSON.parse(doc.tags)
              : doc.tags;
              
            if (Array.isArray(tags) && tags.length > 0) {
              console.log('Restoring tags for document:', doc.id_document);
              console.log('Tags to restore:', tags);
              
              // First ensure all tags exist in document_tags
              for (const tag of tags) {
                // Extract tag name from the complex object structure
                const tagName = tag.tag_name;
                
                if (!tagName) {
                  console.error('Invalid tag structure:', tag);
                  continue;
                }

                console.log('Processing tag:', tagName);

                // Check if tag exists
                const [existingTag] = await con.query(
                  'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                  [tagName]
                );

                let tagId;
                if (!existingTag || existingTag.length === 0) {
                  // Create tag if it doesn't exist
                  const [newTag] = await con.query(
                    'INSERT INTO document_tags (tag_name, created_by, is_predefined) VALUES (?, ?, 0)',
                    [tagName, tag.added_by || doc.id_user_source]
                  );
                  tagId = newTag.insertId;
                  console.log('Created new tag with ID:', tagId);
                } else {
                  tagId = existingTag[0].id_tag;
                  console.log('Using existing tag with ID:', tagId);
                }

                // Check if relation already exists
                const [existingRelation] = await con.query(
                  'SELECT * FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
                  [doc.id_document, tagId]
                );

                if (!existingRelation || existingRelation.length === 0) {
                  // Create tag relation
                  await con.query(
                    'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                    [doc.id_document, tagId, tag.added_by || doc.id_user_source]
                  );
                  console.log('Created tag relation for document:', doc.id_document);
                } else {
                  console.log('Tag relation already exists');
                }
              }
            }
          } catch (error) {
            console.error('Error processing tags:', error);
            // Continue with restore even if tags fail
          }
        }
      }

      // Delete from deleted_folders
      await con.query('DELETE FROM deleted_folders WHERE id = ?', [id]);

      // Delete restored documents from deleted_documents
      await con.query(
        'DELETE FROM deleted_documents WHERE path LIKE ?',
        [`${deletedFolder[0].folder_path}%`]
      );

      // Create the folder in filesystem if it doesn't exist
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const folderPath = path.join(uploadsDir, restorePath);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      con.release();

      // ✅ EMIT SOCKET EVENT FOR FOLDER RESTORE
      if (req.app.get('io')) {
        const eventData = {
          type: 'restore',
          itemType: 'folder',
          folderId: deletedFolder[0].id,
          folderName: deletedFolder[0].folder_name,
          targetPath: restorePath,
          sourceFolder: restorePath,
          userId: req.session.id_user,
          timestamp: new Date().toISOString()
        };
        
        console.log('📂 === EMITTING FOLDER RESTORE EVENT ===');
        console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
        
        req.app.get('io').emit('fileSystemUpdate', eventData);
        console.log('✅ FOLDER RESTORE event emitted to all connected clients');
      }

      return res.json({
        success: true,
        message: "Folder restored successfully",
        folder: {
          id: deletedFolder[0].id,
          name: deletedFolder[0].folder_name,
          path: restorePath
        }
      });
    } else if (type === 'file') {
      const { destinationPath } = req.body || {};
      // Check if file exists in deleted_documents
      const [deletedFile] = await con.query(
        'SELECT * FROM deleted_documents WHERE id_document = ?',
        [id]
      );

      if (!deletedFile || deletedFile.length === 0) {
        con.release();
        return res.status(404).json({ error: "File not found in recycle bin" });
      }

      // Determine restore target path: use requested destination if provided, otherwise original
      const targetPath = destinationPath && String(destinationPath).trim() !== ''
        ? destinationPath
        : deletedFile[0].path;

      // Check if a file with same name already exists in the target path only
      const [existingFile] = await con.query(
        'SELECT * FROM table_document WHERE nom_document = ? AND path = ? LIMIT 1',
        [deletedFile[0].nom_document, targetPath]
      );

      if (existingFile && existingFile.length > 0) {
        con.release();
        return res.status(400).json({ error: "A file with this name already exists" });
      }

      // Restore/update table_document
      const [existingDoc] = await con.query('SELECT * FROM table_document WHERE id_document = ? LIMIT 1', [deletedFile[0].id_document]);
      if (existingDoc && existingDoc.length > 0) {
        await con.query('UPDATE table_document SET path = ? WHERE id_document = ?', [targetPath, deletedFile[0].id_document]);
      } else {
        await con.query(
          `INSERT INTO table_document 
           (id_document, nom_document, nom_document_original, path, type_id, date_upload, comment, id_user_source, file_size, first_page)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deletedFile[0].id_document,
            deletedFile[0].nom_document,
            deletedFile[0].nom_document_original,
            targetPath,
            deletedFile[0].type_id,
            deletedFile[0].date_upload,
            deletedFile[0].comment,
            deletedFile[0].id_user_source,
            deletedFile[0].file_size,
            deletedFile[0].first_page || null
          ]
        );
      }

      // Restore versions from deleted_document_versions back to document_versions
      const [delVers] = await con.query('SELECT * FROM deleted_document_versions WHERE id_document = ?', [deletedFile[0].id_document]);
      // Compute institution fallback once per document
      let fallbackInstitutionId = null;
      try {
        const [instRow] = await con.query(
          'SELECT u.institution_id AS id_institution FROM table_document td JOIN user u ON u.id_user = td.id_user_source WHERE td.id_document = ? LIMIT 1',
          [deletedFile[0].id_document]
        );
        if (instRow && instRow.length > 0) fallbackInstitutionId = instRow[0].id_institution || null;
      } catch {}
      for (const v of delVers) {
        const restoreTags = typeof v.tags === 'string' || v.tags == null ? v.tags : JSON.stringify(v.tags);
        const restoreKeywords = typeof v.keywords === 'string' || v.keywords == null ? v.keywords : JSON.stringify(v.keywords);
        const restoreMeta = typeof v.metadata_changes === 'string' || v.metadata_changes == null ? v.metadata_changes : JSON.stringify(v.metadata_changes);
        const instId = v.id_institution || fallbackInstitutionId || null;
        try {
          await con.query(
            `INSERT INTO document_versions (
              id_document, id_institution, file_path, first_page, file_size,
              version_number, version_name, original_document_name,
              change_summary, created_by, type_id, tags, keywords, comment, metadata_changes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, CAST(? AS JSON), ?)`,
            [
              v.id_document,
              instId,
              path.join(targetPath, path.basename(v.file_path || '')),
              v.first_page || null,
              v.file_size || 0,
              v.version_number || 0,
              v.version_name || null,
              v.original_document_name || null,
              v.change_summary || null,
              v.created_by || null,
              v.type_id || null,
              restoreTags || null,
              restoreKeywords || null,
              v.comment || null,
              restoreMeta || null,
              v.created_at || new Date()
            ]
          );
        } catch (e) {
          await con.query(
            `INSERT INTO document_versions (id_document, file_path, type_id, version_number, change_summary, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [v.id_document, path.join(targetPath, path.basename(v.file_path || '')), v.type_id || null, v.version_number || 0, v.change_summary || null, v.created_by || null, v.created_at || new Date()]
          );
        }
      }
      await con.query('DELETE FROM deleted_document_versions WHERE id_document = ?', [deletedFile[0].id_document]);

      // Restore keywords if they exist
      if (deletedFile[0].keywords) {
        let keywords;
        try {
          // Handle both string and object formats
          keywords = typeof deletedFile[0].keywords === 'string' 
            ? JSON.parse(deletedFile[0].keywords)
            : deletedFile[0].keywords;
            
          if (Object.keys(keywords).length > 0) {
            await con.query(
              `INSERT INTO table_mot_cle 
               (id_document, mot1, mot2, mot3, mot4, mot5)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                deletedFile[0].id_document,
                keywords.mot1 || null,
                keywords.mot2 || null,
                keywords.mot3 || null,
                keywords.mot4 || null,
                keywords.mot5 || null
              ]
            );
          }
        } catch (error) {
          console.error('Error processing keywords:', error);
          // Continue with restore even if keywords fail
        }
      }

      // Restore tags if they exist
      if (deletedFile[0].tags) {
        console.log('Restoring tags for document:', deletedFile[0].id_document);
        console.log('Tags to restore:', deletedFile[0].tags);
        
        try {
          // Handle both string and object formats
          const tags = typeof deletedFile[0].tags === 'string' 
            ? JSON.parse(deletedFile[0].tags)
            : deletedFile[0].tags;
          
          // Ensure tags is an array
          const tagsArray = Array.isArray(tags) ? tags : [tags];
          
          for (const tag of tagsArray) {
            console.log('Processing tag:', tag.tag_name);
            
            // Check if tag exists
            const [existingTag] = await con.query(
              'SELECT id_tag FROM document_tags WHERE tag_name = ?',
              [tag.tag_name]
            );
            
            let tagId;
            if (existingTag.length > 0) {
              tagId = existingTag[0].id_tag;
              console.log('Using existing tag with ID:', tagId);
            } else {
              // Create new tag
              const [newTag] = await con.query(
                'INSERT INTO document_tags (tag_name, created_by) VALUES (?, ?)',
                [tag.tag_name, tag.added_by || deletedFile[0].id_user_source]
              );
              tagId = newTag.insertId;
              console.log('Created new tag with ID:', tagId);
            }
            
            // Check if relation already exists
            const [existingRelation] = await con.query(
              'SELECT id_relation FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
              [deletedFile[0].id_document, tagId]
            );
            
            if (existingRelation.length === 0) {
              // Convert ISO date to MySQL datetime format
              const addedDate = new Date(tag.added_date || new Date()).toISOString().slice(0, 19).replace('T', ' ');
              
              // Create tag relation
              await con.query(
                'INSERT INTO document_tag_relations (id_document, id_tag, added_by, added_date) VALUES (?, ?, ?, ?)',
                [deletedFile[0].id_document, tagId, tag.added_by || deletedFile[0].id_user_source, addedDate]
              );
              console.log('Created tag relation for document:', deletedFile[0].id_document);
            } else {
              console.log('Tag relation already exists for document:', deletedFile[0].id_document);
            }
          }
        } catch (error) {
          console.error('Error processing tags:', error);
          // Continue with restoration even if tag processing fails
        }
      }

      // Delete from deleted_documents
      await con.query('DELETE FROM deleted_documents WHERE id_document = ?', [id]);

      // Filesystem: move from .recycle back to target path
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const instRoot = (targetPath || deletedFile[0].path).split('/')[0];
        const originalRel = deletedFile[0].path.substring(instRoot.length + 1);
        const recycleFolderAbs = path.join(uploadsDir, instRoot, '.recycle', originalRel);
        const originalFolderAbs = path.join(uploadsDir, targetPath || deletedFile[0].path);
        fs.mkdirSync(originalFolderAbs, { recursive: true });
        // Move main file
        const mainOld = path.join(recycleFolderAbs, deletedFile[0].nom_document);
        const mainNew = path.join(originalFolderAbs, deletedFile[0].nom_document);
        try { if (fs.existsSync(mainOld)) fs.renameSync(mainOld, mainNew); } catch {}
        // Move versions by pattern
        try {
          const base = path.parse(deletedFile[0].nom_document).name;
          const regex = new RegExp('^' + base.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '[_\\-\\s]?[Vv](\\\d+)\\.pdf$', 'i');
          if (fs.existsSync(recycleFolderAbs) && fs.statSync(recycleFolderAbs).isDirectory()) {
            const entries = fs.readdirSync(recycleFolderAbs);
            for (const name of entries) {
              if (regex.test(name)) {
                const oldP = path.join(recycleFolderAbs, name);
                const newP = path.join(originalFolderAbs, name);
                try { if (fs.existsSync(oldP)) fs.renameSync(oldP, newP); } catch {}
              }
            }
          }
        } catch {}
      } catch (fsErr) {
        console.warn('Filesystem restore (file) encountered an issue:', fsErr.message);
      }

      con.release();

      // ✅ EMIT SOCKET EVENT FOR FILE RESTORE
      if (req.app.get('io')) {
        const eventData = {
          type: 'restore',
          itemType: 'file',
          documentId: deletedFile[0].id_document,
          documentName: deletedFile[0].nom_document,
          targetPath: targetPath || deletedFile[0].path,
          sourceFolder: targetPath || deletedFile[0].path,
          userId: req.session.id_user,
          timestamp: new Date().toISOString()
        };
        
        console.log('📄 === EMITTING FILE RESTORE EVENT ===');
        console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
        
        req.app.get('io').emit('fileSystemUpdate', eventData);
        console.log('✅ FILE RESTORE event emitted to all connected clients');
      }

      return res.json({
        success: true,
        message: "File restored successfully",
        file: {
          id: deletedFile[0].id_document,
          name: deletedFile[0].nom_document,
          path: deletedFile[0].path,
          type_id: deletedFile[0].type_id
        }
      });
    } else {
      con.release();
      return res.status(400).json({ error: "Invalid type specified" });
    }
  } catch (error) {
    console.error("Error restoring item:", error);
    if (con) con.release();
    return res.status(500).json({
      error: "Database error",
      details: error.message
    });
  }
});

// Permanently delete an item
route.delete('/recycle-bin/:type/:id', async function (req, res) {
  console.log("DELETE request received at /post_docs/recycle-bin/:type/:id");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { type, id } = req.params;

  try {
    const con = await pool.getConnection();

    if (type === 'folder') {
      // Get folder details before deletion
      const [folder] = await con.query(
        'SELECT * FROM deleted_folders WHERE id = ?',
        [id]
      );

      if (!folder || folder.length === 0) {
        con.release();
        return res.status(404).json({ error: "Folder not found" });
      }

      // Log permanent delete action for folder in document_statistics
      try {
        await con.query(
          'INSERT INTO document_statistics (id_document, id_user, action_type) VALUES (?, ?, ?)',
          [folder[0].id_folder || folder[0].id, req.session.id_user, 'delete']
        );
        console.log('Permanent folder delete action recorded in document_statistics');
      } catch (statError) {
        console.error('Error recording permanent folder delete action:', statError);
        // Continue with deletion even if logging fails
      }

      // Delete from database
      await con.query('DELETE FROM deleted_folders WHERE id = ?', [id]);
    } else if (type === 'file') {
      // Get file details before deletion
      const [file] = await con.query(
        'SELECT * FROM deleted_documents WHERE id_document = ?',
        [id]
      );

      if (!file || file.length === 0) {
        con.release();
        return res.status(404).json({ error: "File not found" });
      }

      // Log permanent delete action for document in document_statistics
      try {
        await con.query(
          'INSERT INTO document_statistics (id_document, id_user, action_type) VALUES (?, ?, ?)',
          [file[0].id_document, req.session.id_user, 'delete']
        );
        console.log('Permanent document delete action recorded in document_statistics');
      } catch (statError) {
        console.error('Error recording permanent document delete action:', statError);
        // Continue with deletion even if logging fails
      }

      // Delete from database
      await con.query('DELETE FROM deleted_documents WHERE id_document = ?', [id]);
    }

    con.release();
    return res.json({
      success: true,
      message: "Item permanently deleted"
    });
  } catch (error) {
    console.error("Error permanently deleting item:", error);
    if (con) {
      con.release();
    }
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get storage information for all users under superadmin
route.get('/storage', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const con = await pool.getConnection();
        const userId = req.session.id_user;

        // Get user's institution and plan information
        const [userInfo] = await con.query(
            `SELECT u.institution_id, u.current_plan_id, u.subscription_status, i.superadmin_id
             FROM user u
             LEFT JOIN institutions i ON u.institution_id = i.id_institution
             WHERE u.id_user = ?`,
            [userId]
        );

        if (!userInfo || userInfo.length === 0) {
            con.release();
            return res.status(404).json({ error: 'User not found' });
        }

        const { institution_id, current_plan_id, subscription_status, superadmin_id } = userInfo[0];

        // If user is a personal user (no institution), use free plan with 2GB limit
        if (!institution_id) {
            const storageLimit = 2 * 1024 * 1024 * 1024; // 2GB in bytes

            // Get total storage usage for this personal user only
            const [usageResult] = await con.query(
                `SELECT COALESCE(SUM(file_size), 0) as total_usage
                 FROM table_document
                 WHERE id_user_source = ?`,
                [userId]
            );

            // If no file_size is set or total_usage is 0, calculate it from the actual files
            if (!usageResult[0].total_usage || usageResult[0].total_usage === 0) {
                const [documents] = await con.query(
                    `SELECT nom_document, path 
                     FROM table_document
                     WHERE id_user_source = ?`,
                    [userId]
                );

                let totalSize = 0;
                for (const doc of documents) {
                    const filePath = path.join(__dirname, '..', 'uploads', doc.path, doc.nom_document);
                    if (fs.existsSync(filePath)) {
                        const stats = fs.statSync(filePath);
                        const fileSize = stats.size;
                        totalSize += fileSize;
                        
                        // Update the file_size in the database
                        await con.query(
                            'UPDATE table_document SET file_size = ? WHERE nom_document = ? AND id_user_source = ?',
                            [fileSize, doc.nom_document, userId]
                        );
                    }
                }
                usageResult[0].total_usage = totalSize;
            }

            con.release();

            // Convert bytes to MB for the response
            const totalUsageMB = usageResult[0].total_usage / (1024 * 1024);
            const storageLimitMB = storageLimit / (1024 * 1024);
            const availableStorageMB = storageLimitMB - totalUsageMB;

            res.json({
                storageLimit: storageLimitMB,
                totalUsage: totalUsageMB,
                availableStorage: availableStorageMB,
                percentage: (totalUsageMB / storageLimitMB) * 100,
                planType: 'free',
                isPersonalAccount: true
            });
            return;
        }

        // For institutional users, get the plan details for the institution
        const [plan] = await con.query(
            `SELECT p.storage_limit
             FROM plans p
             JOIN user u ON u.current_plan_id = p.id
             WHERE u.institution_id = ?
             LIMIT 1`,
            [institution_id]
        );

        if (!plan || plan.length === 0) {
            con.release();
            return res.status(404).json({ error: 'No plan found for this institution' });
        }

        const storageLimit = plan[0].storage_limit;

        // Get total storage usage for all users in the same institution
        const [usageResult] = await con.query(
            `SELECT COALESCE(SUM(file_size), 0) as total_usage
             FROM table_document
             WHERE id_user_source IN (
                 SELECT id_user FROM user 
                 WHERE institution_id = ?
             )`,
            [institution_id]
        );

        // If no file_size is set or total_usage is 0, calculate it from the actual files
        if (!usageResult[0].total_usage || usageResult[0].total_usage === 0) {
            const [documents] = await con.query(
                `SELECT nom_document, path 
                 FROM table_document
                 WHERE id_user_source IN (
                     SELECT id_user FROM user 
                     WHERE institution_id = ?
                 )`,
                [institution_id]
            );

            let totalSize = 0;
            for (const doc of documents) {
                const filePath = path.join(__dirname, '..', 'uploads', doc.path, doc.nom_document);
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    const fileSize = stats.size;
                    totalSize += fileSize;
                    
                    // Update the file_size in the database
                    await con.query(
                        'UPDATE table_document SET file_size = ? WHERE nom_document = ?',
                        [fileSize, doc.nom_document]
                    );
                }
            }
            usageResult[0].total_usage = totalSize;
        }

        con.release();

        // Convert bytes to MB for the response
        const totalUsageMB = usageResult[0].total_usage / (1024 * 1024);
        const availableStorageMB = storageLimit - totalUsageMB;

        res.json({
            storageLimit,
            totalUsage: totalUsageMB,
            availableStorage: availableStorageMB,
            percentage: (totalUsageMB / storageLimit) * 100,
            isPersonalAccount: false
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Save draft
route.post('/drafts', draftUpload, async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    console.log('Received request body:', req.body);
    console.log('Received file:', req.file);
    console.log('Session user ID:', req.session.id_user);

    const {
      documentName,
      type_id,
      documentStatus,
      keywords,
      comment,
      selectedTags,
      folderPath
    } = req.body;

    console.log('Parsed draft data:', {
      documentName,
      type_id,
      documentStatus,
      keywords,
      comment,
      selectedTags,
      folderPath
    });

    // Get the document path if a file was uploaded
    let document_path = null;
    if (req.file) {
      console.log('File upload details:', {
        filename: req.file.filename,
        path: req.file.path,
        destination: req.file.destination
      });
      
      // The file is already saved in the Draft folder by multer
      // We need to store the relative path from the uploads directory
      document_path = path.join('Draft', req.file.filename);
      console.log('Constructed document_path:', document_path);

      // Verify the file exists in the expected location
      const fullPath = path.join(__dirname, '../uploads', document_path);
      console.log('Checking file at path:', fullPath);
      if (fs.existsSync(fullPath)) {
        console.log('File exists at path:', fullPath);
        // Verify file permissions
        try {
          fs.accessSync(fullPath, fs.constants.R_OK);
          console.log('File is readable');
        } catch (err) {
          console.error('File is not readable:', err);
        }
      } else {
        console.error('File does not exist at path:', fullPath);
      }
    } else {
      console.log('No file was uploaded with the draft');
    }

    // Insert the draft into the database
    console.log('Inserting draft with document_path:', document_path);
    const [result] = await pool.query(
      `INSERT INTO document_drafts 
       (user_id, document_name, type_id, document_status, keywords, comment, selected_tags, folder_path, document_path) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.id_user,
        documentName,
        type_id,
        documentStatus || 'draft',
        JSON.stringify(keywords || []),
        comment || '',
        JSON.stringify(selectedTags || []),
        folderPath || '',
        document_path
      ]
    );

    console.log('Draft saved successfully with ID:', result.insertId);

    // Verify the draft was saved correctly
    const [savedDraft] = await pool.query(
      'SELECT * FROM document_drafts WHERE id_draft = ?',
      [result.insertId]
    );
    console.log('Saved draft from database:', savedDraft[0]);

    return res.json({ 
      success: true, 
      message: 'Draft saved successfully',
      draftId: result.insertId,
      document_path: document_path
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return res.status(500).json({ 
      error: 'Failed to save draft',
      details: error.message 
    });
  }
});

// Get user's drafts
route.get('/drafts', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    const [drafts] = await con.query(
      `SELECT * FROM document_drafts 
      WHERE user_id = ? 
      ORDER BY updated_at DESC`,
      [req.session.id_user]
    );
    con.release();

    // Parse JSON fields and ensure document_path is included
    const parsedDrafts = drafts.map(draft => ({
      ...draft,
      keywords: JSON.parse(draft.keywords || '[]'),
      selected_tags: JSON.parse(draft.selected_tags || '[]'),
      document_path: draft.document_path || null
    }));

    return res.json({
      success: true,
      drafts: parsedDrafts
    });
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return res.status(500).json({ error: "Failed to fetch drafts", details: error.message });
  }
});

// Delete a draft
route.delete('/drafts/:draftId', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const draftId = req.params.draftId;

  try {
    const con = await pool.getConnection();
    
    // First check if the draft belongs to the user
    const [draft] = await con.query(
      'SELECT user_id FROM document_drafts WHERE id_draft = ?',
      [draftId]
    );

    if (!draft.length) {
      con.release();
      return res.status(404).json({ error: "Draft not found" });
    }

    if (draft[0].user_id !== req.session.id_user) {
      con.release();
      return res.status(403).json({ error: "Not authorized to delete this draft" });
    }

    // Delete the draft
    await con.query('DELETE FROM document_drafts WHERE id_draft = ?', [draftId]);
    con.release();

    return res.json({
      success: true,
      message: "Draft deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return res.status(500).json({ error: "Failed to delete draft", details: error.message });
  }
});

// Get draft file
route.get('/drafts/:draftId/file', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const draftId = req.params.draftId;

  try {
    const con = await pool.getConnection();
    
    // Get the draft and check if it belongs to the user
    const [draft] = await con.query(
      `SELECT document_path, user_id 
       FROM document_drafts 
       WHERE id_draft = ?`,
      [draftId]
    );
    con.release();

    if (!draft || draft.length === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    if (draft[0].user_id !== req.session.id_user) {
      return res.status(403).json({ error: "Not authorized to access this draft" });
    }

    const document_path = draft[0].document_path;
    if (!document_path) {
      return res.status(404).json({ error: "No file associated with this draft" });
    }

    // Construct the full file path
    const filePath = path.join(__dirname, '..', 'uploads', document_path);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error getting draft file:", error);
    return res.status(500).json({ error: "Failed to get draft file", details: error.message });
  }
});

// Upload a draft as a regular document
route.post('/upload-draft', upload, async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get the draft details
    const [draft] = await con.query(
      `SELECT * FROM document_drafts WHERE id_draft = ? AND user_id = ?`,
      [req.body.draftId, req.session.id_user]
    );

    if (!draft || draft.length === 0) {
      con.release();
      return res.status(404).json({ error: "Draft not found" });
    }

    // Check if the draft file exists
    const oldPath = path.join(__dirname, '..', 'uploads', draft[0].document_path);
    if (!fs.existsSync(oldPath)) {
      con.release();
      return res.status(404).json({ error: "Draft file not found" });
    }

    // Create the target directory if it doesn't exist
    const targetDir = path.join(__dirname, '..', 'uploads', req.body.path);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Move the file to the new location
    const newPath = path.join(targetDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    // Insert the document into the main documents table
    const [result] = await con.query(
      `INSERT INTO documents (
        user_id, nom_document, type_id, document_status, 
        mot1, mot2, mot3, mot4, mot5, commentaire, 
        document_path, folder_path, original_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.id_user,
        req.body.documentName,
        req.body.type,
        'current',
        ...(JSON.parse(req.body.keywords) || []).slice(0, 5),
        req.body.comment,
        path.join(req.body.path, req.file.filename),
        req.body.path,
        req.file.originalname
      ]
    );

    // Delete the draft from the database
    await con.query(
      `DELETE FROM document_drafts WHERE id_draft = ? AND user_id = ?`,
      [req.body.draftId, req.session.id_user]
    );

    con.release();
    return res.json({ success: true });
  } catch (error) {
    console.error("Error uploading draft:", error);
    return res.status(500).json({ error: "Failed to upload draft", details: error.message });
  }
});

// Get a specific draft by ID
route.get('/drafts/:draftId', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const draftId = req.params.draftId;

  try {
    const con = await pool.getConnection();
    
    // Get the draft and check if it belongs to the user
    const [draft] = await con.query(
      `SELECT * FROM document_drafts 
       WHERE id_draft = ? AND user_id = ?`,
      [draftId, req.session.id_user]
    );
    con.release();

    if (!draft || draft.length === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Parse JSON fields
    const parsedDraft = {
      ...draft[0],
      keywords: JSON.parse(draft[0].keywords || '[]'),
      selected_tags: JSON.parse(draft[0].selected_tags || '[]')
    };

    return res.json({
      success: true,
      draft: parsedDraft
    });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return res.status(500).json({ error: "Failed to fetch draft", details: error.message });
  }
});

// Delete a draft file
route.delete('/drafts/file/:fileName', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const fileName = req.params.fileName;
  if (!fileName) {
    return res.status(400).json({ error: "File name is required" });
  }

  try {
    // Construct the full file path
    const filePath = path.join(__dirname, '..', 'uploads', 'Draft', fileName);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      message: "Draft file deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting draft file:", error);
    return res.status(500).json({ error: "Failed to delete draft file", details: error.message });
  }
});

// Move a file (PDF) for regular users
route.post('/user/files/move', async function (req, res) {
  console.log("POST request received at /post_docs/user/files/move");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { sourcePath, destinationPath } = req.body;
  if (!sourcePath || !destinationPath) {
    return res.status(400).json({ error: "Source and destination paths are required" });
  }

  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullSourcePath = path.join(uploadsDir, sourcePath);
    const fullDestPath = path.join(uploadsDir, destinationPath);

    // Check if source exists and is a file
    if (!fs.existsSync(fullSourcePath) || !fs.statSync(fullSourcePath).isFile()) {
      return res.status(404).json({ error: "Source file not found" });
    }

    // Check if destination exists and is a directory
    if (!fs.existsSync(fullDestPath) || !fs.statSync(fullDestPath).isDirectory()) {
      return res.status(404).json({ error: "Destination folder not found" });
    }

    // Get the file name from source path
    const fileName = path.basename(fullSourcePath);
    const newPath = path.join(fullDestPath, fileName);

    // Check if file with same name exists in destination
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ error: "File with same name already exists in destination" });
    }

    // Verify the file belongs to the current user
    const con = await pool.getConnection();
    const [fileInfo] = await con.query(
      'SELECT id_user_source FROM table_document WHERE nom_document = ?',
      [fileName]
    );

    if (!fileInfo || fileInfo.length === 0) {
      con.release();
      return res.status(404).json({ error: "File not found in database" });
    }

    if (fileInfo[0].id_user_source !== req.session.id_user) {
      con.release();
      return res.status(403).json({ error: "You can only move your own files" });
    }

    // Move the file
    fs.renameSync(fullSourcePath, newPath);
    console.log(`Moved file from ${fullSourcePath} to ${newPath}`);

    // Update document path in database
    const relativeNewPath = path.relative(uploadsDir, newPath);
    
    // Update path for the document based on the document name
    await con.query(
      `UPDATE table_document 
       SET path = ? 
       WHERE nom_document = ? AND id_user_source = ?`,
      [path.dirname(relativeNewPath), fileName, req.session.id_user]
    );
    
    con.release();

    return res.json({
      success: true,
      message: "File moved successfully",
      newPath: relativeNewPath
    });
  } catch (error) {
    console.error("Error moving file:", error);
    if (con) con.release();
    return res.status(500).json({ error: "Failed to move file", details: error.message });
  }
});

// Get all keywords from documents
route.get('/keywords', async function (req, res) {
  console.log("GET request received at /post_docs/keywords");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get unique keywords from table_mot_cle
    const [keywords] = await con.query(
      `SELECT DISTINCT mot1 as keyword FROM table_mot_cle WHERE mot1 IS NOT NULL AND mot1 != ''
       UNION
       SELECT DISTINCT mot2 as keyword FROM table_mot_cle WHERE mot2 IS NOT NULL AND mot2 != ''
       UNION
       SELECT DISTINCT mot3 as keyword FROM table_mot_cle WHERE mot3 IS NOT NULL AND mot3 != ''
       UNION
       SELECT DISTINCT mot4 as keyword FROM table_mot_cle WHERE mot4 IS NOT NULL AND mot4 != ''
       UNION
       SELECT DISTINCT mot5 as keyword FROM table_mot_cle WHERE mot5 IS NOT NULL AND mot5 != ''
       ORDER BY keyword`
    );
    
    con.release();

    return res.json({ 
      success: true, 
      keywords: keywords.map(k => k.keyword)
    });
  } catch (error) {
    console.error("Error fetching keywords:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get all authors from user's institution
route.get('/authors', async function (req, res) {
  console.log("🔍 GET request received at /post_docs/authors");
  console.log("👤 Session user ID:", req.session?.id_user);

  if (!req.session || !req.session.id_user) {
    console.log("❌ User not authenticated");
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution first
    const [userInstitution] = await con.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    console.log("🏢 User institution query result:", userInstitution);

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      console.log("❌ User institution not found");
      return res.status(404).json({ error: "User institution not found" });
    }

    const institutionId = userInstitution[0].institution_id;
    console.log("🏢 Institution ID:", institutionId);
    
    // Get all users from the same institution who have uploaded documents
    const [authors] = await con.query(
      `SELECT DISTINCT u.id_user as id, u.prenom, u.nom, u.email,
              CONCAT(u.prenom, ' ', u.nom) as fullName,
              COUNT(td.id_document) as document_count
       FROM user u
       INNER JOIN table_document td ON u.id_user = td.id_user_source
       WHERE u.institution_id = ?
       GROUP BY u.id_user, u.prenom, u.nom, u.email
       ORDER BY u.prenom, u.nom`,
      [institutionId]
    );
    
    con.release();

    console.log(`✅ Found ${authors.length} authors from institution ${institutionId}:`, authors);

    return res.json({ 
      success: true, 
      authors: authors
    });
  } catch (error) {
    console.error("💥 Error fetching authors:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get deleted documents for the current user
route.get('/deleted', async (req, res) => {
  console.log("GET request received at /post_docs/deleted");
  
  if (!req.session || !req.session.id_user) {
    console.log("User not authenticated");
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let con;
  try {
    con = await pool.getConnection();
    console.log("Database connection established");
    
    // Get user's role to check if they are admin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    const isAdmin = userInfo && userInfo.length > 0 && userInfo[0].roles === 'admin';
    
    // Query to get deleted documents
    const [deletedDocs] = await con.query(
      `SELECT 
        dd.id_document,
        dd.nom_document,
        dd.nom_document_original,
        dd.path,
        dd.type_id,
        dd.date_upload,
        dd.comment,
        dd.id_user_source,
        dd.deleted_at,
        dd.file_size
      FROM deleted_documents dd
      WHERE ${isAdmin ? '1=1' : 'dd.id_user_source = ?'}
      ORDER BY dd.deleted_at DESC`,
      isAdmin ? [] : [req.session.id_user]
    );
    
    console.log(`Found ${deletedDocs.length} deleted documents for user ${req.session.id_user}`);
    
    res.json({
      success: true,
      documents: deletedDocs
    });
  } catch (error) {
    console.error('Error fetching deleted documents:', error);
    res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  } finally {
    if (con) con.release();
  }
});

// Restore a document from recycle bin
route.post('/restore', async function (req, res) {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { id_document } = req.body;
  let con;

  try {
    con = await pool.getConnection();
    
    // Start transaction
    await con.beginTransaction();

    // Get document from deleted_documents
    const [deletedDoc] = await con.query(
      'SELECT * FROM deleted_documents WHERE id_document = ?',
      [id_document]
    );

    if (!deletedDoc || deletedDoc.length === 0) {
      await con.rollback();
      return res.status(404).json({ error: "Document not found in recycle bin" });
    }

    // Check if user has permission to restore this document
    if (deletedDoc[0].id_user_source !== req.session.id_user) {
      await con.rollback();
      return res.status(403).json({ error: "Not authorized to restore this document" });
    }

    try {
      // Restore/update table_document
      const [existingDoc] = await con.query('SELECT * FROM table_document WHERE id_document = ? LIMIT 1', [id_document]);
      if (existingDoc && existingDoc.length > 0) {
        await con.query('UPDATE table_document SET path = ? WHERE id_document = ?', [deletedDoc[0].path, id_document]);
      } else {
        await con.query(
          `INSERT INTO table_document 
           (id_document, nom_document, nom_document_original, path, type_id, date_upload, comment, id_user_source, file_size, first_page)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deletedDoc[0].id_document,
            deletedDoc[0].nom_document,
            deletedDoc[0].nom_document_original,
            deletedDoc[0].path,
            deletedDoc[0].type_id,
            deletedDoc[0].date_upload,
            deletedDoc[0].comment,
            deletedDoc[0].id_user_source,
            deletedDoc[0].file_size,
            deletedDoc[0].first_page || null
          ]
        );
      }

      // Restore versions from deleted_document_versions
      const [delVers] = await con.query('SELECT * FROM deleted_document_versions WHERE id_document = ?', [id_document]);
      for (const v of delVers) {
        try {
          await con.query(
            `INSERT INTO document_versions (
              id_document, id_institution, file_path, first_page, file_size,
              version_number, version_name, original_document_name,
              change_summary, created_by, type_id, tags, keywords, comment, metadata_changes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              v.id_document,
              v.id_institution || null,
              v.file_path,
              v.first_page || null,
              v.file_size || 0,
              v.version_number || 0,
              v.version_name || null,
              v.original_document_name || null,
              v.change_summary || null,
              v.created_by || null,
              v.type_id || null,
              v.tags || null,
              v.keywords || null,
              v.comment || null,
              v.metadata_changes || null,
              v.created_at || new Date()
            ]
          );
        } catch (e) {
          await con.query(
            `INSERT INTO document_versions (id_document, file_path, type_id, version_number, change_summary, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [v.id_document, v.file_path, v.type_id || null, v.version_number || 0, v.change_summary || null, v.created_by || null, v.created_at || new Date()]
          );
        }
      }
      await con.query('DELETE FROM deleted_document_versions WHERE id_document = ?', [id_document]);

      // Restore tag relations
      if (documentTags && documentTags.length > 0) {
        for (const tag of documentTags) {
          await con.query(
            'INSERT INTO document_tag_relations (id_document, id_tag) VALUES (?, ?)',
            [id_document, tag.id_tag]
          );
        }
      }

      // Delete from deleted_documents
      await con.query('DELETE FROM deleted_documents WHERE id_document = ?', [id_document]);

      // Commit transaction
      await con.commit();
      
      con.release();

      return res.json({ success: true, message: 'Document and versions restored successfully' });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error restoring document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Permanent delete endpoint
route.delete('/permanent-delete/:id_document', async (req, res) => {
  console.log('Received permanent delete request for document:', req.params.id_document);
  
  if (!req.session.id_user) {
    console.log('User not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let con;
  try {
    con = await pool.getConnection();
    console.log('Database connection established');

    // First check if the document exists in deleted_documents
    const [deletedDoc] = await con.query(
      'SELECT * FROM deleted_documents WHERE id_document = ? AND id_user_source = ?',
      [req.params.id_document, req.session.id_user]
    );

    if (!deletedDoc || deletedDoc.length === 0) {
      console.log('Document not found in deleted_documents');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get the file path before deleting
    const filePath = deletedDoc[0].path;
    console.log('File path to delete:', filePath);

    // Start transaction
    await con.beginTransaction();
    console.log('Transaction started');

    try {
      // Delete related records from table_mot_cle first
      await con.query('DELETE FROM table_mot_cle WHERE id_document = ?', [req.params.id_document]);
      console.log('Deleted related records from table_mot_cle');

      // Delete from deleted_documents table
      await con.query(
        'DELETE FROM deleted_documents WHERE id_document = ? AND id_user_source = ?',
        [req.params.id_document, req.session.id_user]
      );
      console.log('Document deleted from deleted_documents table');

      // Delete the actual file from the uploads directory
      const fileToDelete = path.join(__dirname, '../uploads', filePath);
      console.log('Full path to delete:', fileToDelete);
      
      if (fs.existsSync(fileToDelete)) {
        try {
          fs.unlinkSync(fileToDelete);
          console.log('Physical file deleted from uploads directory');
        } catch (fsError) {
          console.error('Error deleting physical file:', fsError);
          // Don't throw here, we still want to commit the database changes
        }
      } else {
        console.log('Physical file not found in uploads directory');
      }

      // Commit transaction
      await con.commit();
      console.log('Transaction committed');

      res.json({ success: true, message: 'File permanently deleted' });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      console.error('Error in transaction, rolling back:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in permanent delete:', error);
    res.status(500).json({ 
      error: 'Failed to permanently delete file',
      details: error.message 
    });
  } finally {
    if (con) {
      con.release();
      console.log('Database connection released');
    }
  }
});

// Configure multer for sync agent uploads
const syncStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            const targetPath = req.body.path || 'SyncAgent';
            const subfolder = req.body.subfolder || '';
            
            // Create the full path including subfolder
            const syncDir = path.join(uploadsDir, targetPath, subfolder);
            
            console.log('Creating directories:', {
                uploadsDir,
                syncDir,
                subfolder,
                body: req.body
            });
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(syncDir)) {
                console.log('Creating directory:', syncDir);
                fs.mkdirSync(syncDir, { recursive: true });
            }
            
            console.log('Using directory:', syncDir);
            cb(null, syncDir);
        } catch (error) {
            console.error('Error creating directories:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        try {
            let fileName = req.body.realname || file.originalname;
            if (!fileName.toLowerCase().endsWith('.pdf')) {
                fileName += '.pdf';
            }
            console.log('Setting filename:', fileName);
            cb(null, fileName);
        } catch (error) {
            console.error('Error in sync multer filename function:', error);
            cb(error);
        }
    }
});

// Update the file filter to handle subfolders
const fileFilter = function (req, file, cb) {
    console.log('File filter called with:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        subfolder: req.body.subfolder,
        body: req.body
    });
    
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

const syncUpload = multer({
    storage: syncStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

route.post('/sync-upload', syncUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!req.body.user_id) {
            return res.status(400).json({ error: 'No user ID provided' });
        }

        const targetPath = req.body.path || 'SyncAgent';
        const subfolder = req.body.subfolder || '';
        const fullPath = path.join(targetPath, subfolder);

        console.log('Uploading file with details:', {
            filename: req.file.filename,
            path: fullPath,
            subfolder: subfolder,
            userId: req.body.user_id,
            type: req.body.type,
            comment: req.body.comment,
            filePath: req.file.path
        });

        const [result] = await pool.query(
            'INSERT INTO table_document (nom_document, path, id_user_source, comment, nom_document_original, type_id, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                req.file.filename,
                fullPath,
                req.body.user_id,
                req.body.comment || 'Uploaded via Sync Agent',
                req.file.originalname,
                req.body.type || '1',
                req.file.size
            ]
        );

        res.json({
            success: true,
            message: 'File uploaded successfully',
            documentId: result.insertId,
            path: fullPath,
            filePath: req.file.path
        });
    } catch (error) {
        console.error('Sync Agent Error:', error);
        res.status(500).json({ error: 'Something broke!', details: error.message });
    }
});

// Get storage usage statistics for SuperAdmin
route.get('/superadmin/storage-usage', async function (req, res) {
  console.log("GET request received at /post_docs/superadmin/storage-usage");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get total storage usage by role
    const [storageByRole] = await con.query(`
      SELECT 
        u.roles,
        COUNT(td.id_document) as total_documents,
        COALESCE(SUM(td.file_size), 0) as total_size_bytes,
        COUNT(DISTINCT td.id_user_source) as total_users
      FROM user u
      LEFT JOIN table_document td ON u.id_user = td.id_user_source
      GROUP BY u.roles
    `);

    // Get storage usage by user
    const [storageByUser] = await con.query(`
      SELECT 
        u.id_user,
        CONCAT(u.prenom, ' ', u.nom) as username,
        u.roles,
        COUNT(td.id_document) as total_documents,
        COALESCE(SUM(td.file_size), 0) as total_size_bytes
      FROM user u
      LEFT JOIN table_document td ON u.id_user = td.id_user_source
      GROUP BY u.id_user, u.prenom, u.nom, u.roles
      ORDER BY total_size_bytes DESC
    `);

    // Get total storage usage
    const [totalStorage] = await con.query(`
      SELECT 
        COUNT(*) as total_documents,
        COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM table_document
    `);

    con.release();

    // Convert bytes to MB for better readability
    const convertToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

    return res.json({
      success: true,
      data: {
        byRole: storageByRole.map(role => ({
          ...role,
          total_size_mb: convertToMB(role.total_size_bytes)
        })),
        byUser: storageByUser.map(user => ({
          ...user,
          total_size_mb: convertToMB(user.total_size_bytes)
        })),
        total: {
          ...totalStorage[0],
          total_size_mb: convertToMB(totalStorage[0].total_size_bytes)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get all plans
route.get('/superadmin/plans', async function (req, res) {
  console.log("GET request received at /post_docs/superadmin/plans");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin or director
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || 
        (userInfo[0].roles !== 'superadmin' && userInfo[0].roles !== 'director')) {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get all plans with their features
    const [plans] = await con.query(`
      SELECT 
        p.*,
        GROUP_CONCAT(f.name) as feature_names
      FROM plans p
      LEFT JOIN plan_features pf ON p.id = pf.plan_id
      LEFT JOIN features f ON pf.feature_id = f.id
      GROUP BY p.id
      ORDER BY p.price ASC
    `);
    
    con.release();

    console.log("=== Backend Debug Logs ===");
    console.log("Raw plans from database:", JSON.stringify(plans, null, 2));

    return res.json({
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        storageLimit: plan.storage_limit,
        price: plan.price,
        features: plan.feature_names ? plan.feature_names.split(',') : [],
        maxFiles: plan.max_files,
        maxFileSize: plan.max_file_size,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      }))
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Create a new plan
route.post('/superadmin/plans', async function (req, res) {
  console.log("POST request received at /post_docs/superadmin/plans");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { name, storageLimit, price, features, maxFiles, maxFileSize } = req.body;

  if (!name || !storageLimit || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Prepare features object
    const featuresObj = {
      features: features || [],
      maxFiles: maxFiles || 0,
      maxFileSize: maxFileSize || 0
    };

    // Insert new plan
    const [result] = await con.query(
      'INSERT INTO plans (name, storage_limit, price, features) VALUES (?, ?, ?, ?)',
      [name, storageLimit, price, JSON.stringify(featuresObj)]
    );

    con.release();

    return res.json({
      success: true,
      message: "Plan created successfully",
      planId: result.insertId
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Delete a plan
route.delete('/superadmin/plans/:planId', async function (req, res) {
  console.log("DELETE request received at /post_docs/superadmin/plans/:planId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const planId = req.params.planId;

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if plan exists
    const [plan] = await con.query(
      'SELECT * FROM plans WHERE id = ?',
      [planId]
    );

    if (!plan || plan.length === 0) {
      con.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    // Delete the plan
    await con.query('DELETE FROM plans WHERE id = ?', [planId]);
    con.release();

    return res.json({
      success: true,
      message: "Plan deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Create a new user
route.post('/superadmin/users', async function (req, res) {
  console.log("POST request received at /post_docs/superadmin/users");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { firstName, lastName, email, phoneNumber, role, password } = req.body;

  if (!firstName || !lastName || !email || !phoneNumber || !role || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT id_user, roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if email already exists (case insensitive)
    const [existingEmail] = await con.query(
      'SELECT id_user FROM user WHERE LOWER(email) = LOWER(?)',
      [email]
    );

    if (existingEmail.length > 0) {
      con.release();
      return res.status(400).json({ error: "Email already exists" });
    }

    // Check if name already exists (case insensitive)
    const [existingName] = await con.query(
      'SELECT id_user FROM user WHERE LOWER(prenom) = LOWER(?) AND LOWER(nom) = LOWER(?)',
      [firstName, lastName]
    );

    if (existingName.length > 0) {
      con.release();
      return res.status(400).json({ error: "User with this name already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with all permissions enabled
    const [result] = await con.query(
      `INSERT INTO user (
        prenom, nom, email, phone_number, password, roles, 
        accepted, verified, created_by,
        diffuse, upload, download, print
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName, lastName, email, phoneNumber, hashedPassword, role,
        1, 1, userInfo[0].id_user,
        1, 1, 1, 1  // All permissions set to true
      ]
    );

    con.release();

    return res.json({
      success: true,
      message: "User created successfully",
      userId: result.insertId
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get all users with their roles
route.get('/superadmin/users', async function (req, res) {
  try {
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const users = await db.dbListUsers(req.session.id_user);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

// Get institution info for superadmin
route.get('/api/superadmin/institution-info', async function (req, res) {
  try {
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles, institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get institution information
    const [institutionInfo] = await con.query(
      'SELECT name, description, type FROM institutions WHERE id_institution = ?',
      [userInfo[0].institution_id]
    );

    con.release();

    if (institutionInfo && institutionInfo.length > 0) {
      res.json(institutionInfo[0]);
    } else {
      res.json({ name: 'Instituție necunoscută' });
    }
  } catch (err) {
    console.error('Error fetching institution info:', err);
    res.status(500).json({ error: 'Error fetching institution info' });
  }
});

// Activate a plan for superadmin
route.post('/superadmin/plans/activate', async function (req, res) {
  console.log("POST request received at /post_docs/superadmin/plans/activate");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "Plan ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if plan exists
    const [plan] = await con.query(
      'SELECT * FROM plans WHERE id = ?',
      [planId]
    );

    if (!plan || plan.length === 0) {
      con.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    // Start transaction
    await con.beginTransaction();

    try {
      // First, set all plans to inactive
      await con.query('UPDATE plans SET is_active = FALSE');

      // Then, activate the selected plan
      await con.query(
        'UPDATE plans SET is_active = TRUE WHERE id = ?',
        [planId]
      );

      // Update the current plan for the superadmin and their users
      await con.query(
        `UPDATE user 
         SET current_plan_id = ? 
         WHERE created_by = ? OR id_user = ?`,
        [planId, req.session.id_user, req.session.id_user]
      );

      // Commit transaction
      await con.commit();

      return res.json({
        success: true,
        message: "Plan activated successfully"
      });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      throw error;
    } finally {
      con.release();
    }
  } catch (error) {
    console.error("Error activating plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Activate a plan
route.post('/superadmin/plans/activate', async function (req, res) {
  console.log("POST request received at /post_docs/superadmin/plans/activate");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "Plan ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // First, set all plans to inactive
    await con.query('UPDATE plans SET is_active = FALSE');

    // Then, activate the selected plan
    const [result] = await con.query(
      'UPDATE plans SET is_active = TRUE WHERE id = ?',
      [planId]
    );

    if (result.affectedRows === 0) {
      con.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    con.release();

    return res.json({
      success: true,
      message: "Plan activated successfully"
    });
  } catch (error) {
    console.error("Error activating plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get notifications for superadmin
route.get('/superadmin/notifications', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const con = await pool.getConnection();

        // Verify if user is superadmin
        const [user] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!user || user.length === 0 || user[0].roles !== 'superadmin') {
            con.release();
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get all notifications with complete user information
        const [notifications] = await con.query(
            `SELECT 
                nr.*, 
                u.nom, 
                u.prenom, 
                u.email,
                u.id_user as user_id,
                nr.request_type as type,
                nr.created_at as timestamp,
                nr.status as status
             FROM notification_requests nr
             JOIN user u ON nr.user_id = u.id_user
             ORDER BY nr.created_at DESC`
        );

        con.release();

        // Transform the response to match the expected format
        const formattedNotifications = notifications.map(notification => ({
            id_request: notification.id_request,
            type: notification.type,
            userId: notification.user_id,
            userName: `${notification.prenom} ${notification.nom}`,
            userEmail: notification.email,
            current_usage: notification.current_usage,
            plan_limit: notification.plan_limit,
            reason: notification.reason,
            timestamp: notification.timestamp,
            status: notification.status === '0' ? 'done' : 'pending'
        }));

        res.json(formattedNotifications);
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Mark notification as read for superadmin
route.put('/superadmin/notifications/:id/read', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const con = await pool.getConnection();

        // Verify if user is superadmin
        const [user] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [req.session.id_user]
        );

        if (!user || user.length === 0 || user[0].roles !== 'superadmin') {
            con.release();
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Update notification status
        await con.query(
            'UPDATE notification_requests SET status = ? WHERE id_request = ?',
            ['done', req.params.id]
        );

        con.release();

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Database error', details: error.message });
    }
});

// Get batch document details
route.post('/batch-details', async function (req, res) {
  console.log("POST request received at /post_docs/batch-details");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { documentNames } = req.body;
    if (!Array.isArray(documentNames) || documentNames.length === 0) {
      return res.status(400).json({ error: "Invalid document names array" });
    }

    const con = await pool.getConnection();
    
    // Get document details with keywords and tags for all documents
    const [documents] = await con.query(
      `SELECT td.*, 
       DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as formatted_date,
       tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
       GROUP_CONCAT(DISTINCT dt.tag_name) as tags,
       dtypes.type_name as type_name
       FROM table_document td
       LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
       LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
       LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
       LEFT JOIN document_types dtypes ON td.type_id = dtypes.id
       WHERE td.nom_document IN (?)
       GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                td.date_upload, td.comment, td.id_user_source,
                tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5, dtypes.type_name`,
      [documentNames]
    );

    // Get tags for all documents
    const [tags] = await con.query(
      `SELECT dtr.id_document, dt.id_tag, dt.tag_name, dt.is_predefined
       FROM document_tag_relations dtr
       JOIN document_tags dt ON dtr.id_tag = dt.id_tag
       WHERE dtr.id_document IN (?)`,
      [documents.map(doc => doc.id_document)]
    );

    con.release();

    // Process the documents data
    const processedDocuments = documents.map(doc => {
      const docTags = tags.filter(tag => tag.id_document === doc.id_document);
      const keywords = [
        doc.mot1,
        doc.mot2,
        doc.mot3,
        doc.mot4,
        doc.mot5
      ].filter(keyword => keyword && keyword.trim() !== '');

      return {
        id_document: doc.id_document,
        nom_document: doc.nom_document,
        nom_document_original: doc.nom_document_original,
        type_name: doc.type_name,
        path: doc.path,
        comment: doc.comment,
        date_upload: doc.formatted_date,
        keywords: keywords,
        tags: docTags,
        id_user_source: doc.id_user_source
      };
    });

    return res.json({
      success: true,
      documents: processedDocuments
    });
  } catch (error) {
    console.error("Error fetching batch document details:", error);
    return res.status(500).json({ 
      error: "Error fetching document details", 
      details: error.message, 
      success: false 
    });
  }
});

// Get all institutions
route.get('/institutions', async (req, res) => {
  try {
    const [institutions] = await pool.query('SELECT * FROM institutions ORDER BY name');
    res.json(institutions);
  } catch (error) {
    console.error('Error fetching institutions:', error);
    res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// Create new institution
route.post('/institutions', async (req, res) => {
  const { name, address, phone, email, superadmin } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Institution name is required' });
  }

  if (!superadmin) {
    return res.status(400).json({ error: 'Superadmin details are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // First, create the superadmin user
    const [superadminResult] = await connection.query(
      `INSERT INTO user (prenom, nom, email, password, roles, accepted, verified) 
       VALUES (?, ?, ?, ?, 'superadmin', 1, 1)`,
      [superadmin.firstName, superadmin.lastName, superadmin.email, superadmin.password]
    );

    const superadminId = superadminResult.insertId;

    // Then create the institution with the superadmin ID
    const [institutionResult] = await connection.query(
      `INSERT INTO institutions (name, address, phone, email, superadmin_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, address, phone, email, superadminId]
    );

    // Update the user with the institution ID
    await connection.query(
      'UPDATE user SET institution_id = ? WHERE id_user = ?',
      [institutionResult.insertId, superadminId]
    );

    await connection.commit();

    // Fetch the complete institution data
    const [newInstitution] = await connection.query(
      `SELECT i.*, u.prenom as superadmin_firstname, u.nom as superadmin_lastname, u.email as superadmin_email 
       FROM institutions i 
       JOIN user u ON i.superadmin_id = u.id_user 
       WHERE i.id_institution = ?`,
      [institutionResult.insertId]
    );
    
    res.status(201).json(newInstitution[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Error creating institution:', error);
    res.status(500).json({ error: 'Failed to create institution' });
  } finally {
    connection.release();
  }
});

// Get all institutions with their superadmin details
route.get('/institutions', async (req, res) => {
  try {
    const [institutions] = await pool.query(
      `SELECT i.*, u.prenom as superadmin_firstname, u.nom as superadmin_lastname, u.email as superadmin_email 
       FROM institutions i 
       JOIN user u ON i.superadmin_id = u.id_user 
       ORDER BY i.name`
    );
    res.json(institutions);
  } catch (error) {
    console.error('Error fetching institutions:', error);
    res.status(500).json({ error: 'Failed to fetch institutions' });
  }
});

// Update institution
route.put('/institutions/:id', async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Institution name is required' });
  }

  try {
    await pool.query(
      'UPDATE institutions SET name = ?, address = ?, phone = ?, email = ? WHERE id_institution = ?',
      [name, address, phone, email, id]
    );
    
    const [updatedInstitution] = await pool.query(
      'SELECT * FROM institutions WHERE id_institution = ?',
      [id]
    );
    
    res.json(updatedInstitution[0]);
  } catch (error) {
    console.error('Error updating institution:', error);
    res.status(500).json({ error: 'Failed to update institution' });
  }
});

// Delete institution
route.delete('/institutions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // First check if there are any users associated with this institution
    const [users] = await pool.query(
      'SELECT COUNT(*) as count FROM user WHERE institution_id = ?',
      [id]
    );

    if (users[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete institution. There are users associated with it.' 
      });
    }

    await pool.query('DELETE FROM institutions WHERE id_institution = ?', [id]);
    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    console.error('Error deleting institution:', error);
    res.status(500).json({ error: 'Failed to delete institution' });
  }
});

// Get institution's current plan
route.get('/superadmin/institution/plan', async function (req, res) {
  console.log("GET request received at /post_docs/superadmin/institution/plan");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get institution ID for the current superadmin
    const [institution] = await con.query(
      'SELECT id_institution FROM institutions WHERE superadmin_id = ?',
      [req.session.id_user]
    );
    
    if (!institution || institution.length === 0) {
      con.release();
      return res.status(404).json({ error: "Institution not found" });
    }

    const institutionId = institution[0].id_institution;

    // Get current plan for the institution
    const [institutionPlan] = await con.query(
      'SELECT p.* FROM plans p JOIN institution_plans ip ON p.id = ip.plan_id WHERE ip.institution_id = ?',
      [institutionId]
    );

    con.release();

    if (!institutionPlan || institutionPlan.length === 0) {
      return res.json({
        success: true,
        plan: null
      });
    }

    const plan = institutionPlan[0];
    const features = plan.features ? JSON.parse(plan.features) : {};

    return res.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        storageLimit: plan.storage_limit,
        price: plan.price,
        features: features.features || [],
        maxFiles: features.maxFiles || 0,
        maxFileSize: features.maxFileSize || 0,
        is_active: plan.is_active || false,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      }
    });
  } catch (error) {
    console.error("Error fetching institution plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Set institution's plan
route.post('/superadmin/institution/plan', async function (req, res) {
  console.log("POST request received at /post_docs/superadmin/institution/plan");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "Plan ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get institution ID for the current superadmin
    const [institution] = await con.query(
      'SELECT id_institution FROM institutions WHERE superadmin_id = ?',
      [req.session.id_user]
    );
    
    if (!institution || institution.length === 0) {
      con.release();
      return res.status(404).json({ error: "Institution not found" });
    }

    const institutionId = institution[0].id_institution;

    // Check if plan exists
    const [plan] = await con.query(
      'SELECT * FROM plans WHERE id = ?',
      [planId]
    );

    if (!plan || plan.length === 0) {
      con.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    // Start transaction
    await con.beginTransaction();

    try {
      // Check if institution already has a plan
      const [existingPlan] = await con.query(
        'SELECT * FROM institution_plans WHERE institution_id = ?',
        [institutionId]
      );

      if (existingPlan && existingPlan.length > 0) {
        // Update existing plan
        await con.query(
          'UPDATE institution_plans SET plan_id = ? WHERE institution_id = ?',
          [planId, institutionId]
        );
      } else {
        // Insert new plan
        await con.query(
          'INSERT INTO institution_plans (institution_id, plan_id) VALUES (?, ?)',
          [institutionId, planId]
        );
      }

      // Update all users in the institution to use the new plan
      await con.query(
        'UPDATE user SET current_plan_id = ? WHERE institution_id = ?',
        [planId, institutionId]
      );

      // Commit transaction
      await con.commit();

      return res.json({
        success: true,
        message: "Plan set successfully for all users in the institution"
      });
    } catch (error) {
      // Rollback transaction on error
      await con.rollback();
      throw error;
    } finally {
      con.release();
    }
  } catch (error) {
    console.error("Error setting institution plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Update a plan (for director)
route.put('/director/plans/:planId', async function (req, res) {
  console.log("PUT request received at /post_docs/director/plans/:planId");
  console.log("Request body:", req.body);

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { planId } = req.params;
  const { name, storage_limit, price, maxFiles, maxFileSize, features } = req.body;

  if (!name || !storage_limit || !price || !maxFiles || !maxFileSize) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const con = await pool.getConnection();
    await con.beginTransaction();

    try {
      // Check if user is director
      const [userInfo] = await con.query(
        'SELECT roles FROM user WHERE id_user = ?',
        [req.session.id_user]
      );
      
      if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
        await con.rollback();
        con.release();
        return res.status(403).json({ error: "Not authorized" });
      }

      // Update plan details
      await con.query(
        `UPDATE plans 
         SET name = ?, storage_limit = ?, price = ?, max_files = ?, max_file_size = ?
         WHERE id = ?`,
        [name, storage_limit, price, maxFiles, maxFileSize, planId]
      );

      // Delete existing plan-feature relationships
      const [existingFeatures] = await con.query(
        'SELECT feature_id FROM plan_features WHERE plan_id = ?',
        [planId]
      );

      // Get all feature IDs that are being removed
      const removedFeatureIds = existingFeatures
        .map(f => f.feature_id)
        .filter(id => !features.includes(id));

      // Delete plan-feature relationships
      await con.query(
        'DELETE FROM plan_features WHERE plan_id = ?',
        [planId]
      );

      // Check and delete unused features
      for (const featureId of removedFeatureIds) {
        const [usageCount] = await con.query(
          'SELECT COUNT(*) as count FROM plan_features WHERE feature_id = ?',
          [featureId]
        );
        
        if (usageCount[0].count === 0) {
          // Feature is not used by any plan, delete it
          await con.query(
            'DELETE FROM features WHERE id = ?',
            [featureId]
          );
        }
      }

      // Insert new features and create relationships
      if (features && features.length > 0) {
        for (const featureName of features) {
          // Check if feature already exists
          const [existingFeatures] = await con.query(
            'SELECT id FROM features WHERE name = ?',
            [featureName]
          );

          let featureId;
          if (existingFeatures.length > 0) {
            featureId = existingFeatures[0].id;
          } else {
            // Insert new feature
            const [result] = await con.query(
              'INSERT INTO features (name) VALUES (?)',
              [featureName]
            );
            featureId = result.insertId;
          }

          // Create plan-feature relationship
          await con.query(
            'INSERT INTO plan_features (plan_id, feature_id) VALUES (?, ?)',
            [planId, featureId]
          );
        }
      }

      await con.commit();
      con.release();

      return res.json({
        success: true,
        message: "Plan updated successfully"
      });
    } catch (error) {
      await con.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({ 
      error: "Database error", 
      details: error.message 
    });
  }
});

// Update a plan
route.put('/superadmin/plans/:planId', async function (req, res) {
  console.log("PUT request received at /post_docs/superadmin/plans/:planId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const planId = req.params.planId;
  const { name, storageLimit, price, features, maxFiles, maxFileSize } = req.body;

  if (!name || !storageLimit || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is superadmin
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Start transaction
    await con.beginTransaction();

    try {
      // Update plan details
      await con.query(
        'UPDATE plans SET name = ?, storage_limit = ?, price = ?, max_files = ?, max_file_size = ? WHERE id = ?',
        [name, storageLimit, price, maxFiles, maxFileSize, planId]
      );

      // Delete existing features
      await con.query('DELETE FROM plan_features WHERE plan_id = ?', [planId]);

      // Insert new features
      if (features && features.length > 0) {
        // First, get or create features
        const featureValues = features.map(feature => [feature]).join(',');
        await con.query(
          `INSERT IGNORE INTO features (name) VALUES ${featureValues}`
        );

        // Then, get the feature IDs and create the relationships
        const [featureIds] = await con.query(
          'SELECT id FROM features WHERE name IN (?)',
          [features]
        );

        const planFeatureValues = featureIds.map(feature => [planId, feature.id]);
        if (planFeatureValues.length > 0) {
          await con.query(
            'INSERT INTO plan_features (plan_id, feature_id) VALUES ?',
            [planFeatureValues]
          );
        }
      }

      await con.commit();
      con.release();

      return res.json({
        success: true,
        message: "Plan updated successfully"
      });
    } catch (error) {
      await con.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get user details
route.get('/user/:userId', async function (req, res) {
  console.log("GET request received at /post_docs/user/:userId");
  console.log("Session user ID:", req.session.id_user);
  
  if (!req.session || !req.session.id_user) {
    console.log("No session or user ID found");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { userId } = req.params;
  console.log("Requested user ID:", userId);

  try {
    const con = await pool.getConnection();
    
    // Check if user is director
    const [userInfo] = await con.query(
      'SELECT roles, institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    console.log("Current user info:", userInfo);
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
      con.release();
      console.log("User not authorized");
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get user details with current plan
    const [user] = await con.query(`
      SELECT 
        u.*,
        p.id as plan_id,
        p.name as plan_name,
        p.storage_limit,
        p.price,
        p.max_files,
        p.max_file_size
      FROM user u
      LEFT JOIN plans p ON u.current_plan_id = p.id
      WHERE u.id_user = ?
    `, [userId]);

    console.log("User details with plan:", user);

    if (!user || user.length === 0) {
      con.release();
      console.log("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    con.release();
    return res.json(user[0]);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get plan details
route.get('/superadmin/plans/:planId', async function (req, res) {
  console.log("GET request received at /post_docs/superadmin/plans/:planId");
  console.log("Session user ID:", req.session.id_user);
  
  if (!req.session || !req.session.id_user) {
    console.log("No session or user ID found");
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { planId } = req.params;
  console.log("Requested plan ID:", planId);

  try {
    const con = await pool.getConnection();
    
    // Check if user is director
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    console.log("Current user info:", userInfo);
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
      con.release();
      console.log("User not authorized");
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get plan details
    const [plan] = await con.query(`
      SELECT 
        p.*,
        COALESCE(GROUP_CONCAT(f.name), '') as features
      FROM plans p
      LEFT JOIN plan_features pf ON p.id = pf.plan_id
      LEFT JOIN features f ON pf.feature_id = f.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [planId]);

    console.log("Plan details:", plan);

    if (!plan || plan.length === 0) {
      con.release();
      console.log("Plan not found");
      return res.status(404).json({ error: "Plan not found" });
    }

    // Format the response
    const formattedPlan = {
      plan: {
        id: plan[0].id,
        name: plan[0].name,
        storage_limit: plan[0].storage_limit,
        price: plan[0].price,
        max_files: plan[0].max_files,
        max_file_size: plan[0].max_file_size,
        features: plan[0].features ? plan[0].features.split(',') : []
      }
    };

    console.log("Formatted plan response:", formattedPlan);

    con.release();
    return res.json(formattedPlan);
  } catch (error) {
    console.error("Error fetching plan details:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Update user's current plan
route.put('/user/:userId/plan', async function (req, res) {
  console.log("PUT request received at /post_docs/user/:userId/plan");
  
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { userId } = req.params;
  const { plan_id } = req.body;

  if (!plan_id) {
    return res.status(400).json({ error: "Plan ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Check if user is director
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if plan exists
    const [plan] = await con.query(
      'SELECT * FROM plans WHERE id = ?',
      [plan_id]
    );

    if (!plan || plan.length === 0) {
      con.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    // Update user's current plan
    await con.query(
      'UPDATE user SET current_plan_id = ? WHERE id_user = ?',
      [plan_id, userId]
    );

    con.release();
    return res.json({ success: true, plan: plan[0] });
  } catch (error) {
    console.error("Error updating user plan:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get institution storage usage
route.get('/institutions/:institutionId/storage', async function (req, res) {
  console.log("GET request received at /post_docs/institutions/:institutionId/storage");
  
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { institutionId } = req.params;

  try {
    const con = await pool.getConnection();
    
    // Check if user is director
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get total storage usage for institution
    const [storageUsage] = await con.query(`
      SELECT SUM(file_size) as total_size
      FROM table_document
      WHERE id_user_source IN (
        SELECT id_user 
        FROM user 
        WHERE institution_id = ?
      )
    `, [institutionId]);

    con.release();
    return res.json({ 
      usage: storageUsage[0].total_size || 0 
    });
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get users for a specific institution
route.get('/institutions/:id/users', async (req, res) => {
  try {
    const institutionId = req.params.id;
    
    const query = `
      SELECT id_user, prenom, nom, email, roles 
      FROM user 
      WHERE institution_id = ? AND roles != 'superadmin'
    `;
    
    const [results] = await pool.query(query, [institutionId]);
    res.json(results);
  } catch (err) {
    console.error('Error fetching institution users:', err);
    res.status(500).json({ error: 'Error fetching institution users' });
  }
});

// Get institution logs
route.get('/institutions/:institutionId/logs', async function (req, res) {
  console.log("GET request received at /post_docs/institutions/:institutionId/logs");
  
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { institutionId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const con = await pool.getConnection();
    
    // Check if user is director
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );
    
    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'director') {
      con.release();
      return res.status(403).json({ error: "Not authorized" });
    }

    // Get total count of logs
    const [totalCount] = await con.query(`
      SELECT COUNT(*) as total
      FROM user_logs l
      JOIN user u ON l.user_id = u.id_user
      WHERE u.institution_id = ?
    `, [institutionId]);

    // Get logs for the institution with pagination
    const [logs] = await con.query(`
      SELECT 
        l.id,
        l.action,
        l.details,
        l.created_at,
        u.prenom,
        u.nom,
        u.email
      FROM user_logs l
      JOIN user u ON l.user_id = u.id_user
      WHERE u.institution_id = ?
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `, [institutionId, limit, offset]);

    con.release();
    return res.json({ 
      logs: logs.map(log => ({
        id: log.id,
        action_type: log.action,
        details: log.details,
        created_at: log.created_at,
        user_name: `${log.prenom} ${log.nom}`,
        user_email: log.email
      })),
      pagination: {
        total: totalCount[0].total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching logs:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get institution folders
route.get('/institutions/:institutionId/folders', async function (req, res) {
  console.log("GET request received at /post_docs/institutions/:institutionId/folders");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const institutionId = req.params.institutionId;
  const parentPath = req.query.path || '';

  if (!institutionId) {
    return res.status(400).json({ error: "Institution ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Verificăm rolul utilizatorului
    const [user] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!user.length) {
      con.release();
      return res.status(403).json({ error: "User not found" });
    }

    const userRole = user[0].roles;

    // Dacă utilizatorul este director, are acces la toate instituțiile
    if (userRole === 'director') {
      // Obținem folderele din path-ul specificat
      const [folders] = await con.query(
        `SELECT f.*, u.prenom as first_name, u.nom as last_name, u.email, u.roles 
         FROM folders f 
         LEFT JOIN user u ON f.created_by = u.id_user 
         WHERE f.institution_id = ? 
         AND f.folder_path LIKE ? 
         AND f.folder_path NOT LIKE ?
         ORDER BY f.folder_name ASC`,
        [institutionId, `${parentPath}%`, `${parentPath}%/%`]
      );

      // Obținem documentele din path-ul specificat
      const [documents] = await con.query(
        `SELECT d.*, u.prenom as first_name, u.nom as last_name, u.email, u.roles 
         FROM table_document d 
         LEFT JOIN user u ON d.id_user_source = u.id_user 
         WHERE d.id_user_source IN (
           SELECT id_user FROM user WHERE institution_id = ?
         )
         AND d.path LIKE ? 
         AND d.path NOT LIKE ?`,
        [institutionId, `${parentPath}%`, `${parentPath}%/%`]
      );

      // Obținem lista de utilizatori din instituție
      const [users] = await con.query(
        `SELECT id_user, prenom, nom, email, roles 
         FROM user 
         WHERE institution_id = ? 
         ORDER BY roles DESC, prenom ASC`,
        [institutionId]
      );

      con.release();

      return res.json({
        success: true,
        currentPath: parentPath,
        items: [
          ...folders.map(folder => ({
            id: folder.id,
            name: folder.folder_name,
            path: folder.folder_path,
            type: 'folder',
            createdBy: {
              id: folder.created_by,
              name: `${folder.first_name} ${folder.last_name}`,
              email: folder.email,
              role: folder.roles
            },
            createdAt: folder.created_at
          })),
          ...documents.map(doc => ({
            id: doc.id_document,
            name: doc.nom_document,
            path: doc.path,
            type: 'document',
            size: doc.file_size,
            createdBy: {
              id: doc.id_user_source,
              name: `${doc.first_name} ${doc.last_name}`,
              email: doc.email,
              role: doc.roles
            },
            createdAt: doc.date_upload,
            originalName: doc.nom_document_original,
            isVerified: doc.isVerfied
          }))
        ].sort((a, b) => {
          // Sortăm folderele înaintea documentelor
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (a.type !== 'folder' && b.type === 'folder') return 1;
          // Sortăm alfabetic după nume
          return a.name.localeCompare(b.name);
        }),
        users: users.map(user => ({
          id: user.id_user,
          name: `${user.prenom} ${user.nom}`,
          email: user.email,
          role: user.roles
        }))
      });
    }

    // Pentru ceilalți utilizatori, verificăm accesul la instituție
    const [institutionAccess] = await con.query(
      `SELECT 1 FROM institutions i 
       LEFT JOIN user u ON i.id_institution = u.institution_id 
       WHERE i.id_institution = ? 
       AND (i.superadmin_id = ? OR u.id_user = ?)`,
      [institutionId, req.session.id_user, req.session.id_user]
    );

    if (!institutionAccess.length) {
      con.release();
      return res.status(403).json({ error: "Access denied to this institution" });
    }

    // Obținem folderele și documentele pentru utilizatorii non-director
    const [folders] = await con.query(
      `SELECT f.*, u.prenom as first_name, u.nom as last_name, u.email, u.roles 
       FROM folders f 
       LEFT JOIN user u ON f.created_by = u.id_user 
       WHERE f.institution_id = ? 
       AND f.folder_path LIKE ? 
       AND f.folder_path NOT LIKE ?
       ORDER BY f.folder_name ASC`,
      [institutionId, `${parentPath}%`, `${parentPath}%/%`]
    );

    const [documents] = await con.query(
      `SELECT d.*, u.prenom as first_name, u.nom as last_name, u.email, u.roles 
       FROM table_document d 
       LEFT JOIN user u ON d.id_user_source = u.id_user 
       WHERE d.id_user_source IN (
         SELECT id_user FROM user WHERE institution_id = ?
       )
       AND d.path LIKE ? 
       AND d.path NOT LIKE ?`,
      [institutionId, `${parentPath}%`, `${parentPath}%/%`]
    );

    const [users] = await con.query(
      `SELECT id_user, prenom, nom, email, roles 
       FROM user 
       WHERE institution_id = ? 
       ORDER BY roles DESC, prenom ASC`,
      [institutionId]
    );

    con.release();

    return res.json({
      success: true,
      currentPath: parentPath,
      items: [
        ...folders.map(folder => ({
          id: folder.id,
          name: folder.folder_name,
          path: folder.folder_path,
          type: 'folder',
          createdBy: {
            id: folder.created_by,
            name: `${folder.first_name} ${folder.last_name}`,
            email: folder.email,
            role: folder.roles
          },
          createdAt: folder.created_at
        })),
        ...documents.map(doc => ({
          id: doc.id_document,
          name: doc.nom_document,
          path: doc.path,
          type: 'document',
          size: doc.file_size,
          createdBy: {
            id: doc.id_user_source,
            name: `${doc.first_name} ${doc.last_name}`,
            email: doc.email,
            role: doc.roles
          },
          createdAt: doc.date_upload,
          originalName: doc.nom_document_original,
          isVerified: doc.isVerfied
        }))
      ].sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      }),
      users: users.map(user => ({
        id: user.id_user,
        name: `${user.prenom} ${user.nom}`,
        email: user.email,
        role: user.roles
      }))
    });
  } catch (error) {
    console.error("Error fetching institution folders:", error);
    return res.status(500).json({ error: "Failed to fetch folders", details: error.message });
  }
});

// Add route to get user's institution
route.get('/api/user/institution', async (req, res) => {
  let connection;
  try {
    // Check session authentication
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    connection = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await connection.query(
      'SELECT i.* FROM institutions i JOIN user u ON u.institution_id = i.id_institution WHERE u.id_user = ?',
      [req.session.id_user]
    );

    if (!userInstitution || !userInstitution[0]) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    res.json({
      success: true,
      institution: userInstitution[0]
    });

  } catch (error) {
    console.error('Error fetching user institution:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Delete document
route.delete('/documents/:documentId', async function (req, res) {
  console.log("DELETE request received at /post_docs/documents/:documentId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  if (!documentId) {
    return res.status(400).json({ error: "Document ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get document details and verify it belongs to the user's institution
    const [documents] = await con.query(
      `SELECT d.* 
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE d.id_document = ? AND u.institution_id = ?`,
      [documentId, institution.id_institution]
    );

    if (documents.length === 0) {
      con.release();
      return res.status(404).json({ error: "Document not found or not accessible" });
    }

    const document = documents[0];

    // Delete the document from filesystem
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullPath = path.join(uploadsDir, document.path);

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted document: ${fullPath}`);
      }
    } catch (fileError) {
      console.error("Error deleting document:", fileError);
      con.release();
      return res.status(500).json({ 
        error: "Failed to delete document from filesystem", 
        details: fileError.message 
      });
    }

    // Note: This route appears to delete directly, so we do log it here
    // Log delete action in document_statistics before deleting
    try {
      await con.query(
        'INSERT INTO document_statistics (id_document, id_user, action_type) VALUES (?, ?, ?)',
        [documentId, req.session.id_user, 'delete']
      );
      console.log('Delete action recorded in document_statistics');
    } catch (statError) {
      console.error('Error recording delete action:', statError);
      // Continue with deletion even if logging fails
    }

    // Delete the document from database
    await con.query('DELETE FROM table_document WHERE id_document = ?', [documentId]);
    con.release();

    return res.json({
      success: true,
      message: "Document deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get documents
route.get('/documents', async function (req, res) {
  console.log("GET request received at /post_docs/documents");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution and role
    const [userInfo] = await con.query(
      `SELECT u.institution_id, u.roles 
       FROM user u 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInfo || userInfo.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const userInstitutionId = userInfo[0].institution_id;
    const userRole = userInfo[0].roles;

    let documents;
    
    // Check if user is personal (no institution)
    if (!userInstitutionId) {
      // For personal users, get only their documents
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags,
               tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        LEFT JOIN table_mot_cle tmc ON d.id_document = tmc.id_document
        WHERE d.id_user_source = ? 
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name,
                 tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        ORDER BY d.date_upload DESC`,
        [req.session.id_user]
      );
      
      console.log("👤 Personal user query result:", { 
        userId: req.session.id_user, 
        documentsFound: documents.length 
      });
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      // For admins, get all documents from their institution
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags,
               tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        LEFT JOIN table_mot_cle tmc ON d.id_document = tmc.id_document
        WHERE u.institution_id = ? 
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name,
                 tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        ORDER BY d.date_upload DESC`,
        [userInstitutionId]
      );
      
      console.log("📊 Admin/Superadmin query result:", { 
        institutionId: userInstitutionId, 
        documentsFound: documents.length 
      });
    } else {
      // For normal institutional users, get only their documents
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        WHERE d.id_user_source = ? 
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name
        ORDER BY d.date_upload DESC`,
        [req.session.id_user]
      );
    }

    con.release();

    // Process the results to parse the tags JSON
    console.log("📄 Raw documents from DB:", documents.length);
    
    const processedDocuments = documents.map(doc => ({
      id: doc.id_document,
      name: doc.nom_document,
      path: doc.path,
      type: doc.type_name,
      uploadDate: doc.date_upload,
      size: doc.file_size,
      uploadedBy: `${doc.prenom} ${doc.nom}`,
      comment: doc.comment || '',
      tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
    }));
    
    console.log("✅ Processed documents:", processedDocuments.length);

    return res.json({
      success: true,
      documents: processedDocuments
    });
  } catch (error) {
    console.error("Error getting documents:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get documents from a specific folder
route.get('/documents/folder/:folderPath', async function (req, res) {
  console.log("GET request received at /post_docs/documents/folder/:folderPath");
  console.log("Folder path:", req.params.folderPath);

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    const folderPath = req.params.folderPath;
    const userId = req.session.id_user;
    
    // Get user's institution and role
    const [userInfo] = await con.query(
      `SELECT u.institution_id, u.roles 
       FROM user u 
       WHERE u.id_user = ?`,
      [userId]
    );

    if (!userInfo || userInfo.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const userInstitutionId = userInfo[0].institution_id;
    const userRole = userInfo[0].roles;

    let documents;
    
    // If user is a personal user (no institution), get their personal documents
    if (!userInstitutionId) {
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags,
               tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        LEFT JOIN table_mot_cle tmc ON d.id_document = tmc.id_document
        WHERE d.id_user_source = ? 
        AND d.path = ?
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name,
                 tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        ORDER BY d.date_upload DESC`,
        [userId, folderPath]
      );
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      // For admins, get documents from the specific folder in their institution
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags,
               tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        LEFT JOIN table_mot_cle tmc ON d.id_document = tmc.id_document
        WHERE u.institution_id = ? 
        AND d.path = ?
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name,
                 tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        ORDER BY d.date_upload DESC`,
        [userInstitutionId, folderPath]
      );
    } else {
      // For normal users, get only their documents from the specific folder
      [documents] = await con.query(`
        SELECT d.*, dt.type_name, u.prenom, u.nom,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags,
               tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        FROM table_document d 
        JOIN document_types dt ON d.type_id = dt.id 
        JOIN user u ON d.id_user_source = u.id_user 
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        LEFT JOIN table_mot_cle tmc ON d.id_document = tmc.id_document
        WHERE d.id_user_source = ? 
        AND d.path = ?
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.prenom, u.nom, dt.type_name,
                 tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5
        ORDER BY d.date_upload DESC`,
        [userId, folderPath]
      );
    }

    con.release();

    // Process the results to parse the tags JSON
    const processedDocuments = documents.map(doc => ({
      id: doc.id_document,
      name: doc.nom_document,
      path: doc.path,
      type: doc.type_name,
      uploadDate: doc.date_upload,
      size: doc.file_size,
      uploadedBy: `${doc.prenom} ${doc.nom}`,
      comment: doc.comment || '',
      tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : [],
      mot1: doc.mot1,
      mot2: doc.mot2,
      mot3: doc.mot3,
      mot4: doc.mot4,
      mot5: doc.mot5
    }));

    console.log(`✅ Found ${processedDocuments.length} documents in folder: ${folderPath}`);

    return res.json({
      success: true,
      documents: processedDocuments
    });
  } catch (error) {
    console.error("Error getting documents from folder:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get specific document
route.get('/documents/:documentId', async function (req, res) {
  console.log("GET request received at /post_docs/documents/:documentId");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  if (!documentId) {
    return res.status(400).json({ error: "Document ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get document details and verify it belongs to the user's institution
    const [documents] = await con.query(
      `SELECT d.*, dt.type_name, u.prenom, u.nom 
       FROM table_document d 
       JOIN document_types dt ON d.type_id = dt.id 
       JOIN user u ON d.id_user_source = u.id_user 
       JOIN folders f ON d.path LIKE CONCAT(f.folder_path, '%')
       WHERE u.institution_id = ? AND f.institution_id = ?
       ORDER BY d.date_upload DESC`,
      [institution.id_institution, institution.id_institution]
    );

    if (documents.length === 0) {
      con.release();
      return res.status(404).json({ error: "Document not found or not accessible" });
    }

    const document = documents[0];
    con.release();

    return res.json({
      success: true,
      document: {
        id: document.id_document,
        name: document.nom_document,
        path: document.path,
        type: document.type_name,
        uploadedBy: `${document.prenom} ${document.nom}`,
        uploadDate: document.date_upload,
        size: document.size,
        tags: document.tags ? JSON.parse(document.tags) : []
      }
    });
  } catch (error) {
    console.error("Error getting document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Download document
route.get('/documents/:documentId/download', async function (req, res) {
  console.log("GET request received at /post_docs/documents/:documentId/download");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  if (!documentId) {
    return res.status(400).json({ error: "Document ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution info
    const [userInfo] = await con.query(
      `SELECT institution_id FROM user WHERE id_user = ?`,
      [req.session.id_user]
    );

    if (!userInfo || userInfo.length === 0) {
      con.release();
      return res.status(404).json({ error: "User not found" });
    }

    const userInstitutionId = userInfo[0].institution_id;
    let documents;

    if (!userInstitutionId) {
      // Personal user - get their own documents
      [documents] = await con.query(
        `SELECT d.* 
         FROM table_document d 
         WHERE d.id_document = ? AND d.id_user_source = ?`,
        [documentId, req.session.id_user]
      );
    } else {
      // Institutional user - get documents from their institution
      [documents] = await con.query(
        `SELECT d.* 
         FROM table_document d 
         JOIN user u ON d.id_user_source = u.id_user 
         WHERE d.id_document = ? AND u.institution_id = ?`,
        [documentId, userInstitutionId]
      );
    }

    if (documents.length === 0) {
      con.release();
      return res.status(404).json({ error: "Document not found or not accessible" });
    }

    const document = documents[0];
    con.release();

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, document.path);

    if (!fs.existsSync(filePath)) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ 
          error: "File not available", 
          message: "Document exists in database but physical file is not accessible in production environment." 
        });
      }
      return res.status(404).json({ error: "File not found on server" });
    }

    res.download(filePath, document.nom_document);
  } catch (error) {
    console.error("Error downloading document:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get document statistics
route.get('/statistics', async function (req, res) {
  console.log("GET request received at /post_docs/statistics");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get total documents for the institution
    const [totalDocs] = await con.query(
      `SELECT COUNT(*) as count 
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ?`,
      [institution.id_institution]
    );

    // Get documents by type for the institution
    const [docsByType] = await con.query(
      `SELECT dt.type_name, COUNT(*) as count 
       FROM table_document d 
       JOIN document_types dt ON d.id_document_type = dt.id 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       GROUP BY dt.type_name`,
      [institution.id_institution]
    );

    // Get total storage used by the institution
    const [totalStorage] = await con.query(
      `SELECT SUM(size) as total_size 
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ?`,
      [institution.id_institution]
    );

    // Get recent uploads for the institution
    const [recentUploads] = await con.query(
      `SELECT d.*, u.prenom, u.nom 
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       ORDER BY d.date_upload DESC 
       LIMIT 5`,
      [institution.id_institution]
    );

    con.release();

    return res.json({
      success: true,
      statistics: {
        totalDocuments: totalDocs[0].count,
        documentsByType: docsByType,
        totalStorage: totalStorage[0].total_size || 0,
        recentUploads: recentUploads.map(doc => ({
          id: doc.id_document,
          name: doc.nom_document,
          uploadedBy: `${doc.prenom} ${doc.nom}`,
          uploadDate: doc.date_upload,
          size: doc.size
        }))
      }
    });
  } catch (error) {
    console.error("Error getting document statistics:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get usage statistics
route.get('/usage-statistics', async function (req, res) {
  console.log("GET request received at /post_docs/usage-statistics");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get upload statistics for the institution
    const [uploadStats] = await con.query(
      `SELECT 
         DATE(date_upload) as date,
         COUNT(*) as uploads
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       GROUP BY DATE(date_upload) 
       ORDER BY date DESC 
       LIMIT 30`,
      [institution.id_institution]
    );

    // Get download statistics for the institution
    const [downloadStats] = await con.query(
      `SELECT 
         DATE(action_date) as date,
         COUNT(*) as downloads
       FROM document_statistics ds 
       JOIN user u ON ds.id_user = u.id_user 
       WHERE u.institution_id = ? 
         AND action_type = 'download' 
       GROUP BY DATE(action_date) 
       ORDER BY date DESC 
       LIMIT 30`,
      [institution.id_institution]
    );

    // Get user activity for the institution
    const [userActivity] = await con.query(
      `SELECT 
         u.prenom,
         u.nom,
         COUNT(d.id_document) as documents_uploaded,
         SUM(d.size) as total_storage_used
       FROM user u 
       LEFT JOIN table_document d ON u.id_user = d.id_user_source 
       WHERE u.institution_id = ? 
       GROUP BY u.id_user`,
      [institution.id_institution]
    );

    con.release();

    return res.json({
      success: true,
      statistics: {
        uploads: uploadStats,
        downloads: downloadStats,
        userActivity: userActivity.map(user => ({
          name: `${user.prenom} ${user.nom}`,
          documentsUploaded: user.documents_uploaded,
          totalStorageUsed: user.total_storage_used || 0
        }))
      }
    });
  } catch (error) {
    console.error("Error getting usage statistics:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get storage usage statistics
route.get('/storage-statistics', async function (req, res) {
  console.log("GET request received at /post_docs/storage-statistics");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get storage usage by document type for the institution
    const [storageByType] = await con.query(
      `SELECT 
         dt.type_name,
         COUNT(*) as document_count,
         SUM(d.size) as total_size
       FROM table_document d 
       JOIN document_types dt ON d.id_document_type = dt.id 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       GROUP BY dt.type_name`,
      [institution.id_institution]
    );

    // Get storage usage by folder for the institution
    const [storageByFolder] = await con.query(
      `SELECT 
         f.folder_name,
         COUNT(*) as document_count,
         SUM(d.size) as total_size
       FROM table_document d 
       JOIN folders f ON d.folder_path LIKE CONCAT(f.folder_path, '%') 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       GROUP BY f.folder_name`,
      [institution.id_institution]
    );

    // Get storage usage by user for the institution
    const [storageByUser] = await con.query(
      `SELECT 
         u.prenom,
         u.nom,
         COUNT(*) as document_count,
         SUM(d.size) as total_size
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ? 
       GROUP BY u.id_user`,
      [institution.id_institution]
    );

    // Get total storage usage for the institution
    const [totalStorage] = await con.query(
      `SELECT 
         COUNT(*) as total_documents,
         SUM(size) as total_size
       FROM table_document d 
       JOIN user u ON d.id_user_source = u.id_user 
       WHERE u.institution_id = ?`,
      [institution.id_institution]
    );

    con.release();

    return res.json({
      success: true,
      statistics: {
        byType: storageByType.map(type => ({
          type: type.type_name,
          documentCount: type.document_count,
          totalSize: type.total_size || 0
        })),
        byFolder: storageByFolder.map(folder => ({
          folder: folder.folder_name,
          documentCount: folder.document_count,
          totalSize: folder.total_size || 0
        })),
        byUser: storageByUser.map(user => ({
          name: `${user.prenom} ${user.nom}`,
          documentCount: user.document_count,
          totalSize: user.total_size || 0
        })),
        total: {
          documents: totalStorage[0].total_documents,
          size: totalStorage[0].total_size || 0
        }
      }
    });
  } catch (error) {
    console.error("Error getting storage statistics:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Get document types endpoint
route.get('/document_types', async (req, res) => {
  let connection;
  try {
    // Check session authentication
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    connection = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await connection.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!userInstitution || !userInstitution[0]) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    const institutionId = userInstitution[0].institution_id;

    // Get document types for user's institution or global types (null institution_id)
    const [types] = await connection.query(
      'SELECT * FROM document_types WHERE institution_id = ? OR institution_id IS NULL ORDER BY type_name',
      [institutionId]
    );

    res.json({
      success: true,
      document_types: types
    });

  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Create document type endpoint
route.post('/document_types', async (req, res) => {
  let connection;
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    connection = await pool.getConnection();

    // Get user's role and institution
    const [user] = await connection.query(
      'SELECT roles, institution_id FROM user WHERE id_user = ?',
      [req.session.userId]
    );

    if (!user || !user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admin and superadmin can create document types
    if (user[0].roles !== 'admin' && user[0].roles !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized. Only admin and superadmin can create document types.' });
    }

    const { type_name, description, folder_path } = req.body;

    // Check if type name already exists for this institution
    const [existingType] = await connection.query(
      'SELECT id FROM document_types WHERE type_name = ? AND (institution_id = ? OR institution_id IS NULL)',
      [type_name, user[0].institution_id]
    );

    if (existingType && existingType[0]) {
      return res.status(400).json({ error: 'Document type already exists' });
    }

    // Create document type
    const [result] = await connection.query(
      'INSERT INTO document_types (type_name, description, folder_path, institution_id) VALUES (?, ?, ?, ?)',
      [type_name, description, folder_path, user[0].institution_id]
    );

    res.json({
      success: true,
      document_type_id: result.insertId
    });

  } catch (error) {
    console.error('Error creating document type:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Debug endpoint pentru foldere
route.get('/debug-folders/:userId', async (req, res) => {
  let connection;
  try {
    const userId = req.params.userId;
    connection = await pool.getConnection();

    // Get user info
    const [user] = await connection.query(
      'SELECT * FROM user WHERE id_user = ?',
      [userId]
    );

    // Get user's institution
    const [userInstitution] = await connection.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [userId]
    );

    // Get all folders for this institution
    const [allFolders] = await connection.query(
      'SELECT f.*, u.prenom, u.nom FROM folders f LEFT JOIN user u ON f.created_by = u.id_user WHERE f.institution_id = ? ORDER BY f.folder_name',
      [userInstitution[0].institution_id]
    );

    // Get filtered folders (like the real endpoint)
    const [filteredFolders] = await connection.query(
      `SELECT f.* 
       FROM folders f
       WHERE f.institution_id = ? 
       AND f.folder_name != 'Draft'
       AND (f.is_private = 0 OR (f.is_private = 1 AND f.created_by = ?))
       ORDER BY f.folder_name`,
      [userInstitution[0].institution_id, userId]
    );

    res.json({
      success: true,
      user: user[0],
      userInstitution: userInstitution[0],
      allFolders: allFolders,
      filteredFolders: filteredFolders,
      debug: {
        userId: userId,
        institutionId: userInstitution[0].institution_id
      }
    });

  } catch (error) {
    console.error('Error in debug folders:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Debug endpoint pentru documente în path
route.get('/debug-documents/:path/:userId', async (req, res) => {
  let connection;
  try {
    const userId = req.params.userId;
    const documentPath = decodeURIComponent(req.params.path);
    connection = await pool.getConnection();

    // Get all documents in path
    const [allDocuments] = await connection.query(
      'SELECT d.*, u.prenom, u.nom FROM table_document d LEFT JOIN user u ON d.id_user_source = u.id_user WHERE d.path = ? ORDER BY d.date_upload DESC',
      [documentPath]
    );

    // Get documents for specific user
    const [userDocuments] = await connection.query(
      'SELECT * FROM table_document WHERE path = ? AND id_user_source = ? ORDER BY date_upload DESC',
      [documentPath, userId]
    );

    res.json({
      success: true,
      path: documentPath,
      userId: userId,
      allDocuments: allDocuments,
      userDocuments: userDocuments,
      debug: {
        documentPath: documentPath,
        userId: userId
      }
    });

  } catch (error) {
    console.error('Error in debug documents:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Get folders endpoint
route.get('/folders', async (req, res) => {
  let connection;
  try {
    // Check session authentication
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    connection = await pool.getConnection();

    // Get user's institution
    const [userInstitution] = await connection.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!userInstitution || !userInstitution[0]) {
      return res.status(404).json({ error: 'Institution not found' });
    }

    // Get folders for user's institution
    const [folders] = await connection.query(
      'SELECT * FROM folders WHERE institution_id = ? ORDER BY folder_name',
      [userInstitution[0].institution_id]
    );

    res.json({
      success: true,
      folders: folders
    });

  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Get all documents for superadmin
route.get('/superadmin/documents', async (req, res) => {
  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    // Check if user is superadmin
    const con = await pool.getConnection();
    const [userInfo] = await con.query(
      'SELECT roles FROM user WHERE id_user = ?',
      [req.session.id_user]
    );

    if (!userInfo || userInfo.length === 0 || userInfo[0].roles !== 'superadmin') {
      con.release();
      return res.status(403).json({ error: "Unauthorized - Superadmin access required" });
    }

    // Get documents from users created by this superadmin
    const [documents] = await con.query(`
      SELECT 
        td.id_document,
        td.nom_document,
        td.path,
        td.type_id,
        td.date_upload,
        td.file_size,
        u.prenom,
        u.nom,
        u.roles as user_role,
        dt.type_name
      FROM table_document td
      JOIN user u ON td.id_user_source = u.id_user
      JOIN document_types dt ON td.type_id = dt.id
      WHERE u.created_by = ?
      ORDER BY td.date_upload DESC
    `, [req.session.id_user]);

    con.release();

    res.json({
      success: true,
      documents: documents
    });
  } catch (error) {
    console.error('Error fetching superadmin documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Add new endpoint for viewing COMPLETE PDFs in Diffuse mode (not just first page)
route.get('/diffuse/view-complete/:path/:filename', async (req, res) => {
  try {
    const { path: filePath, filename } = req.params;
    
    console.log('🔍 [VIEW-COMPLETE] Request for complete PDF:', {
      filePath,
      filename,
      userId: req.session?.id_user || 'NO_SESSION'
    });

    if (!req.session || !req.session.id_user) {
      console.log('❌ [VIEW-COMPLETE] No session or user ID found');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }
    
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'uploads', filePath, filename);
    
    console.log('📁 [VIEW-COMPLETE] Full path constructed:', fullPath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error('❌ [VIEW-COMPLETE] File not found:', fullPath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file is a PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      console.log('❌ [VIEW-COMPLETE] File is not a PDF:', filename);
      return res.status(400).json({ error: 'File is not a PDF' });
    }

    // Get file stats for logging
    const stats = fs.statSync(fullPath);
    console.log('📊 [VIEW-COMPLETE] File stats:', {
      filename,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
      lastModified: stats.mtime
    });

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Accept-Ranges', 'bytes');
    
    console.log('📤 [VIEW-COMPLETE] Starting to stream complete PDF file...');
    
    // Stream the complete file
    const fileStream = fs.createReadStream(fullPath);
    
    fileStream.on('open', () => {
      console.log('✅ [VIEW-COMPLETE] File stream opened successfully');
    });
    
    fileStream.on('end', () => {
      console.log('🎉 [VIEW-COMPLETE] File streaming completed successfully');
    });
    
    fileStream.on('error', (error) => {
      console.error('💥 [VIEW-COMPLETE] Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming PDF' });
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('💥 [VIEW-COMPLETE] Error in endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Keep the old endpoint for backward compatibility (but it might be using first_page logic)
route.get('/diffuse/view/:path/:filename', async (req, res) => {
  try {
    const { path: filePath, filename } = req.params;
    
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'uploads', filePath, filename);
    
    console.log('Attempting to view PDF:', {
      filePath,
      filename,
      fullPath
    });

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error('File not found:', fullPath);
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if file is a PDF
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'File is not a PDF' });
    }

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    // Handle errors during streaming
    fileStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming PDF' });
      }
    });

  } catch (error) {
    console.error('Error in /diffuse/view endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

route.get('/types', async function (req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM document_types ORDER BY type_name');
    res.json({ success: true, types: rows });
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch document types' });
  }
});

// Create new document version
route.post('/versions/:documentId', versioningUpload, async function (req, res) {
  console.log("POST request received at /post_docs/versions/:documentId");
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Request params:", req.params);

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const documentId = req.params.documentId;
  if (!documentId) {
    return res.status(400).json({ error: "Document ID is required" });
  }

  const con = await pool.getConnection();
  try {
    await con.beginTransaction();

    // Parse metadata from request body
    let metadata;
    try {
      metadata = JSON.parse(req.body.metadata || '{}');
    } catch (error) {
      console.error("Error parsing metadata:", error);
      metadata = {};
    }
    console.log("Parsed metadata:", metadata);
    
    // Get changeSummary from request
    const changeSummary = req.body.changeSummary || req.body.change_summary || metadata.changeSummary || '';

    // Get path from either metadata or direct body
    const documentPath = metadata.path || req.body.path;
    if (!documentPath) {
      return res.status(400).json({ error: "Document path is required" });
    }

    // Get current document state first
    const [currentDocuments] = await con.query(
      `SELECT d.*, 
              dt.type_name,
              GROUP_CONCAT(DISTINCT t.tag_name) as tags,
              GROUP_CONCAT(DISTINCT CONCAT_WS(',', mc.mot1, mc.mot2, mc.mot3, mc.mot4, mc.mot5)) as keywords
       FROM table_document d
       LEFT JOIN document_types dt ON d.type_id = dt.id
       LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
       LEFT JOIN document_tags t ON dtr.id_tag = t.id_tag
       LEFT JOIN table_mot_cle mc ON d.id_document = mc.id_document
       WHERE d.id_document = ?
       GROUP BY d.id_document`,
      [documentId]
    );

    if (currentDocuments.length === 0) {
      throw new Error("Document not found");
    }

    const currentDocument = currentDocuments[0];

    // Get document owner's institution (NOT current user's institution)
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [currentDocument.id_user_source]
    );

    if (!userInstitution || userInstitution.length === 0) {
      throw new Error("Document owner's institution not found");
    }

    const institution = userInstitution[0];

    // Get current version and calculate next version number correctly
    const [allVersions] = await con.query(
      'SELECT MAX(version_number) as max_version FROM document_versions WHERE id_document = ?',
      [documentId]
    );

    const currentMaxVersion = allVersions[0].max_version || 0;
    const nextVersionNumber = currentMaxVersion + 1;

    const [currentVersions] = await con.query(
      'SELECT * FROM document_versions WHERE id_document = ? AND is_current = 1',
      [documentId]
    );

    const currentVersion = currentVersions[0];

    // If there's a current version, mark it as not current
    if (currentVersion) {
      await con.query(
        'UPDATE document_versions SET is_current = 0 WHERE id_version = ?',
        [currentVersion.id_version]
      );
    }

    // Calculate metadata changes (for debugging only)
    const metadataChangesSummary = {
      tags: metadata.tags && metadata.tags.length > 0,
      comment: metadata.comment !== currentDocument.comment,
      keywords: metadata.keywords && metadata.keywords.length > 0,
      type: metadata.type !== currentDocument.type_name
    };

    // Get current tags and keywords for versioning
    const [currentTags] = await con.query(
      `SELECT t.tag_name 
       FROM document_tags t 
       JOIN document_tag_relations dtr ON t.id_tag = dtr.id_tag 
       WHERE dtr.id_document = ?`,
      [documentId]
    );

    const [currentKeywords] = await con.query(
      'SELECT mot1, mot2, mot3, mot4, mot5 FROM table_mot_cle WHERE id_document = ?',
      [documentId]
    );

    // Convert current tags to JSON array
    const currentTagsJson = JSON.stringify(currentTags.map(t => t.tag_name));

    // Convert current keywords to array
    const currentKeywordsArray = currentKeywords.length > 0 ? 
      currentKeywords[0].mot1 ? [currentKeywords[0].mot1] : [] :
      [];
    if (currentKeywords.length > 0) {
      if (currentKeywords[0].mot2) currentKeywordsArray.push(currentKeywords[0].mot2);
      if (currentKeywords[0].mot3) currentKeywordsArray.push(currentKeywords[0].mot3);
      if (currentKeywords[0].mot4) currentKeywordsArray.push(currentKeywords[0].mot4);
      if (currentKeywords[0].mot5) currentKeywordsArray.push(currentKeywords[0].mot5);
    }
    const currentKeywordsJson = JSON.stringify(currentKeywordsArray);

    // Create new file path
    const baseDir = documentPath;
    const baseName = path.basename(currentDocument.nom_document_original, path.extname(currentDocument.nom_document_original));
    const ext = path.extname(currentDocument.nom_document_original);
    const newFileName = `${baseName}_v${nextVersionNumber}${ext}`;
    const newFilePath = path.join(baseDir, newFileName);

    // Handle file operations (CORRECTED VERSIONING LOGIC - like upload)
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    let oldFileSize = currentDocument.file_size;
    let oldFilePath = path.join(currentDocument.path, currentDocument.nom_document);
    
    if (req.file) {
      console.log("📂 NEW VERSIONING LOGIC: Upload new file, backup current file");
      
      // STEP 1: Move uploaded file to correct folder (like upload endpoint)
      const targetFolderPath = path.join(uploadsDir, currentDocument.path);
      const currentFilePath = path.join(targetFolderPath, currentDocument.nom_document);
      
      // Create directory if it doesn't exist
      await fs.promises.mkdir(targetFolderPath, { recursive: true });

      console.log('📂 File paths:', {
        uploadedFile: req.file.path,
        targetFolder: targetFolderPath,
        currentFile: currentFilePath,
        currentDocumentPath: currentDocument.path,
        currentDocumentName: currentDocument.nom_document
      });

      // STEP 2: Create versioned name for the OLD/CURRENT file
      const baseName = path.basename(currentDocument.nom_document, path.extname(currentDocument.nom_document));
      const ext = path.extname(currentDocument.nom_document);
      const versionedFileName = `${baseName}_V${nextVersionNumber}${ext}`;
      const versionedFileFullPath = path.join(targetFolderPath, versionedFileName);

      console.log("📂 VERSIONING logic:", {
        currentFileName: currentDocument.nom_document,
        newVersionedName: versionedFileName,
        nextVersionNumber: nextVersionNumber,
        versionedPath: versionedFileFullPath
      });
      
      // STEP 3: Backup current file to versioned name (if exists)
      if (fs.existsSync(currentFilePath)) {
        await fs.promises.copyFile(currentFilePath, versionedFileFullPath);
        console.log(`✅ BACKUP: Copied current file to ${versionedFileFullPath}`);
        
        // STEP 4: Replace current file with new upload (like upload endpoint)
        await fs.promises.rename(req.file.path, currentFilePath);
        console.log(`✅ REPLACE: New file placed at ${currentFilePath}`);
      } else {
        console.log(`⚠️ Current file not found at ${currentFilePath}`);
        // If current doesn't exist, just move new file to current location
        await fs.promises.rename(req.file.path, currentFilePath);
        console.log(`✅ NEW: New file placed at ${currentFilePath}`);
      }
      
      // STEP 5: Update variables for DB storage (save OLD file as version)
      oldFilePath = path.join(currentDocument.path, versionedFileName);
      
      console.log("📂 File operations completed:", {
        backupVersionPath: oldFilePath,
        currentDocumentPath: path.join(currentDocument.path, currentDocument.nom_document),
        newFileSize: req.file.size
      });
    }

    // Calculate diff summary if there's a previous version
    let diffSummary = null;
    if (currentVersion) {
      try {
        const diff = await calculateDiff(currentVersion.file_path, filePath);
        diffSummary = diff;
      } catch (error) {
        console.error('Error calculating diff:', error);
        diffSummary = 'Unable to calculate differences';
      }
    }

    // Prepare tags for version (current tags before change)
    const tagsForVersion = JSON.stringify(currentTags.map(t => t.tag_name));
    
    // Prepare keywords for version (current keywords before change) 
    const keywordsForVersion = JSON.stringify(currentKeywordsArray);
    
    // Prepare metadata_changes
    const metadataChanges = JSON.stringify({
      tags: metadata.tags && metadata.tags.length > 0,
      type: metadata.type && metadata.type !== currentDocument.type_name,
      comment: metadata.comment && metadata.comment !== currentDocument.comment,
      keywords: metadata.keywords && metadata.keywords.length > 0
    });

    // Extract first_page from the old/backup file for versioning
    let firstPageBase64 = null;
    try {
      const oldFileFullPath = path.join(uploadsDir, oldFilePath);
      console.log('📁 [VERSION] Old file path for backup:', oldFilePath);
      console.log('📁 [VERSION] Full old file path:', oldFileFullPath);
      console.log('📁 [VERSION] Old file exists:', fs.existsSync(oldFileFullPath));
      
      if (fs.existsSync(oldFileFullPath)) {
        console.log('📄 [VERSION] Extracting first_page for version from:', oldFileFullPath);
        firstPageBase64 = await extractFirstPageFromPDF(oldFileFullPath);
        console.log('✅ [VERSION] First page extracted for version, size:', firstPageBase64 ? firstPageBase64.length : 0);
        console.log('✅ [VERSION] First page starts with:', firstPageBase64 ? firstPageBase64.substring(0, 50) + '...' : 'null');
      } else {
        console.log('⚠️ [VERSION] Old file not found for first_page extraction:', oldFileFullPath);
      }
    } catch (error) {
      console.error('❌ [VERSION] Error extracting first_page for version:', error);
      console.error('❌ [VERSION] Error details:', error.message);
      console.error('❌ [VERSION] Error stack:', error.stack);
    }

    // 1. FIRST: Save OLD/BACKUP version in document_versions
    console.log('🔄 [VERSION] Saving backup version in document_versions...');
    console.log('📊 [VERSION] Document ID:', documentId);
    console.log('📊 [VERSION] Version number:', nextVersionNumber);
    console.log('📊 [VERSION] First page base64 length:', firstPageBase64 ? firstPageBase64.length : 0);

    const [savedOldVersion] = await con.query(
      `INSERT INTO document_versions (
        id_document, id_institution, file_path, first_page, file_size,
        version_number, version_name, original_document_name, 
        change_summary, created_by, type_id, tags, keywords, comment, metadata_changes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        institution.id_institution, // Add the missing id_institution field
        oldFilePath, // Path to the backed up old file  
        firstPageBase64, // First page as base64
        oldFileSize, // Size of the old file
        nextVersionNumber,
        `Version ${nextVersionNumber}`,
        currentDocument.nom_document_original || currentDocument.nom_document,
        changeSummary || 'Previous version (backed up)',
        req.session.id_user,
        currentDocument.type_id,
        tagsForVersion,
        keywordsForVersion,
        currentDocument.comment,
        metadataChanges
      ]
    );
    
    console.log('✅ [VERSION] Backup version saved successfully, ID:', savedOldVersion.insertId);

    // 2. SECOND: Update current document state
    if (metadata.type) {
      // Get type_id from type_name
      const [typeResult] = await con.query(
        'SELECT id FROM document_types WHERE type_name = ?',
        [metadata.type]
      );
      if (typeResult.length > 0) {
        await con.query(
          'UPDATE table_document SET type_id = ? WHERE id_document = ?',
          [typeResult[0].id, documentId]
        );
      }
    }

    // Update document table with new file size and first_page if file was uploaded
    if (req.file) {
      console.log('🔄 [VERSION] Updating table_document with new file data...');
      console.log('📁 [VERSION] File uploaded:', req.file.originalname);
      console.log('📁 [VERSION] File size:', req.file.size);
      console.log('📁 [VERSION] Current document path:', currentDocument.path);
      console.log('📁 [VERSION] Current document name:', currentDocument.nom_document);
      
      // Extract first_page from the new uploaded file
      let newFirstPageBase64 = null;
      try {
        const newFileFullPath = path.join(uploadsDir, currentDocument.path, currentDocument.nom_document);
        console.log('📁 [VERSION] Full path to new file:', newFileFullPath);
        console.log('📁 [VERSION] File exists:', fs.existsSync(newFileFullPath));
        
        if (fs.existsSync(newFileFullPath)) {
          console.log('📄 [VERSION] Extracting first_page from new uploaded file:', newFileFullPath);
          newFirstPageBase64 = await extractFirstPageFromPDF(newFileFullPath);
          console.log('✅ [VERSION] First page extracted from new file, size:', newFirstPageBase64 ? newFirstPageBase64.length : 0);
          console.log('✅ [VERSION] First page starts with:', newFirstPageBase64 ? newFirstPageBase64.substring(0, 50) + '...' : 'null');
        } else {
          console.log('⚠️ [VERSION] New uploaded file not found for first_page extraction:', newFileFullPath);
        }
      } catch (error) {
        console.error('❌ [VERSION] Error extracting first_page from new uploaded file:', error);
        console.error('❌ [VERSION] Error details:', error.message);
        console.error('❌ [VERSION] Error stack:', error.stack);
      }

      console.log('🔄 [VERSION] Updating table_document with first_page...');
      console.log('📊 [VERSION] Document ID:', documentId);
      console.log('📊 [VERSION] File size:', req.file.size);
      console.log('📊 [VERSION] First page base64 length:', newFirstPageBase64 ? newFirstPageBase64.length : 0);

      await con.query(
        'UPDATE table_document SET file_size = ?, first_page = ?, date_upload = NOW() WHERE id_document = ?',
        [req.file.size, newFirstPageBase64, documentId]
      );
      
      console.log('✅ [VERSION] table_document updated successfully');
    } else {
      console.log('⚠️ [VERSION] No file uploaded, skipping first_page update');
    }

    // Update comment if changed
    if (metadata.comment) {
      await con.query(
        'UPDATE table_document SET comment = ? WHERE id_document = ?',
        [metadata.comment, documentId]
      );
    }

    // Update keywords
    if (metadata.keywords && metadata.keywords.length > 0) {
      // Delete existing keywords
      await con.query('DELETE FROM table_mot_cle WHERE id_document = ?', [documentId]);

      // Insert new keywords in groups of 5
      for (let i = 0; i < metadata.keywords.length; i += 5) {
        const keywordGroup = metadata.keywords.slice(i, i + 5);
        const values = [documentId, ...keywordGroup, ...Array(5 - keywordGroup.length).fill(null)];
        
        await con.query(
          'INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) VALUES (?, ?, ?, ?, ?, ?)',
          values
        );
      }
    }

    // Update tags
    if (metadata.tags && metadata.tags.length > 0) {
      // Delete existing tag relations
      await con.query('DELETE FROM document_tag_relations WHERE id_document = ?', [documentId]);

      // Insert new tags
      for (const tag of metadata.tags) {
        // Check if tag exists
        const [existingTag] = await con.query(
          'SELECT id_tag FROM document_tags WHERE tag_name = ?',
          [tag.tag_name]
        );

        let tagId;
        if (existingTag && existingTag.length > 0) {
          tagId = existingTag[0].id_tag;
          // Update usage count
          await con.query(
            'UPDATE document_tags SET usage_count = usage_count + 1 WHERE id_tag = ?',
            [tagId]
          );
        } else {
          const [newTag] = await con.query(
            'INSERT INTO document_tags (tag_name, created_by, usage_count) VALUES (?, ?, 1)',
            [tag.tag_name, req.session.id_user]
          );
          tagId = newTag.insertId;
        }

        // Create relation
        await con.query(
          'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
          [documentId, tagId, req.session.id_user]
        );
      }
    }

    // No need to mark as current - we only store backup versions

    // Commit transaction
    await con.commit();

    // Get updated document details
    const [updatedDoc] = await con.query(
      `SELECT d.*, 
              dt.type_name,
              GROUP_CONCAT(DISTINCT t.tag_name) as tags,
              GROUP_CONCAT(DISTINCT CONCAT_WS(',', mc.mot1, mc.mot2, mc.mot3, mc.mot4, mc.mot5)) as keywords
       FROM table_document d
       LEFT JOIN document_types dt ON d.type_id = dt.id
       LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
       LEFT JOIN document_tags t ON dtr.id_tag = t.id_tag
       LEFT JOIN table_mot_cle mc ON d.id_document = mc.id_document
       WHERE d.id_document = ?
       GROUP BY d.id_document`,
      [documentId]
    );

    // Process keywords - split and filter out nulls
    const keywords = updatedDoc[0].keywords ? 
      updatedDoc[0].keywords.split(',')
        .filter(k => k && k.trim() !== '') : [];

    // === EMIT VERSION UPDATE EVENT TO ELECTRON ===
    if (req.app.get('io')) {
      const eventData = {
        type: 'update',
        sourcePath: currentDocument.path + '/' + currentDocument.nom_document,
        targetFolder: currentDocument.path,
        documentName: currentDocument.nom_document,
        documentId: documentId,
        timestamp: new Date().toISOString(),
        isVersionUpdate: true,
        versionNumber: nextVersionNumber,
        updatedMetadata: {
          id: updatedDoc[0].id,
          name: updatedDoc[0].nom_document,
          comment: updatedDoc[0].comment,
          type: updatedDoc[0].type_name || updatedDoc[0].type,
          size: updatedDoc[0].size,
          uploadDate: updatedDoc[0].upload_date,
          keywords: keywords,
          tags: updatedDoc[0].tags ? updatedDoc[0].tags.split(',').map(tag => ({ tag_name: tag.trim() })) : []
        }
      };
      
      console.log('📄 === EMITTING VERSION UPDATE EVENT WITH METADATA ===');
      console.log('📡 Event data:', JSON.stringify(eventData, null, 2));
      
      req.app.get('io').emit('fileSystemUpdate', eventData);
      console.log('✅ VERSION UPDATE event with metadata emitted to all connected clients');
    }

    res.json({
      success: true,
      message: "New version created successfully",
      version: {
        id: savedOldVersion.insertId,
        number: nextVersionNumber,
        path: oldFilePath,
        changeSummary: changeSummary || 'Previous version (backed up)'
      },
      document: {
        ...updatedDoc[0],
        type: updatedDoc[0].type_name,
        keywords: keywords,
        tags: updatedDoc[0].tags ? updatedDoc[0].tags.split(',').map(tag => ({ tag_name: tag })) : []
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await con.rollback();
    console.error("Error creating new version:", error);
    return res.status(500).json({ 
      error: "Failed to create new version", 
      details: error.message 
    });
  } finally {
    con.release();
  }
});

// Get folder contents endpoint
route.get('/folders/:folderId/contents', async function (req, res) {
  console.log("GET request received at /post_docs/folders/:folderId/contents");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const folderId = req.params.folderId;
  if (!folderId) {
    return res.status(400).json({ error: "Folder ID is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.* 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get folder details and verify it belongs to the user's institution
    const [folders] = await con.query(
      'SELECT * FROM folders WHERE id = ? AND institution_id = ?',
      [folderId, institution.id_institution]
    );

    if (folders.length === 0) {
      con.release();
      return res.status(404).json({ error: "Folder not found or not accessible" });
    }

    const folder = folders[0];

    // Get all subfolders
    const [subfolders] = await con.query(
      `SELECT * FROM folders 
       WHERE folder_path LIKE ? AND id != ?
       ORDER BY folder_name`,
      [`${folder.folder_path}/%`, folderId]
    );

    // Get all documents in the folder
    const [documents] = await con.query(
      `SELECT td.*, dt.type_name 
       FROM table_document td
       LEFT JOIN document_types dt ON td.type_id = dt.id
       WHERE td.path = ?
       ORDER BY td.nom_document`,
      [folder.folder_path]
    );

    // Get total counts including nested items
    const [directDocumentsCount] = await con.query(
      'SELECT COUNT(*) as count FROM table_document WHERE path = ?',
      [folder.folder_path]
    );

    const [nestedDocumentsCount] = await con.query(
      'SELECT COUNT(*) as count FROM table_document WHERE path LIKE ? AND path != ?',
      [`${folder.folder_path}/%`, folder.folder_path]
    );
    
    const [nestedFoldersCount] = await con.query(
      'SELECT COUNT(*) as count FROM folders WHERE folder_path LIKE ? AND id != ?',
      [`${folder.folder_path}/%`, folderId]
    );

    con.release();

    return res.json({
      success: true,
      folderName: folder.folder_name,
      folderPath: folder.folder_path,
      contents: {
        documents: documents.map(doc => ({
          id: doc.id_document,
          name: doc.nom_document,
          type: doc.type_name || 'Unknown',
          path: doc.path,
          size: doc.file_size || 0,
          uploadDate: doc.date_upload,
          comment: doc.comment || ''
        })),
        subfolders: subfolders.map(subfolder => ({
          id: subfolder.id,
          name: subfolder.folder_name,
          path: subfolder.folder_path,
          isPrivate: subfolder.is_private === 1
        })),
        directDocuments: directDocumentsCount[0].count,
        nestedDocuments: nestedDocumentsCount[0].count,
        totalDocuments: directDocumentsCount[0].count + nestedDocumentsCount[0].count,
        totalFolders: nestedFoldersCount[0].count
      }
    });
  } catch (error) {
    console.error("Error getting folder contents:", error);
    return res.status(500).json({ error: "Database error", details: error.message });
  }
});

// Update document path
route.put('/documents/:id/update-path', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPath, oldPath } = req.body;

    // Update path in table_document
    const [result] = await pool.query(
      'UPDATE table_document SET path = ? WHERE id_document = ?',
      [newPath, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Move the physical file
    const oldFilePath = path.join(process.cwd(), 'uploads', oldPath);
    const newFilePath = path.join(process.cwd(), 'uploads', newPath);

    // Create directory if it doesn't exist
    const newDir = path.dirname(newFilePath);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    // Move the file
    fs.renameSync(oldFilePath, newFilePath);

    res.json({ success: true, message: 'Document path updated successfully' });
  } catch (error) {
    console.error('Error updating document path:', error);
    res.status(500).json({ error: 'Failed to update document path' });
  }
});

// Update folder path
route.put('/folders/:id/update-path', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPath, oldPath } = req.body;

    // Update path in folders table
    const [result] = await pool.query(
      'UPDATE folders SET folder_path = ? WHERE id = ?',
      [newPath, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Move the physical folder
    const oldFolderPath = path.join(process.cwd(), 'uploads', oldPath);
    const newFolderPath = path.join(process.cwd(), 'uploads', newPath);

    // Create new directory if it doesn't exist
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath, { recursive: true });
    }

    // Move all files from old folder to new folder
    if (fs.existsSync(oldFolderPath)) {
      const files = fs.readdirSync(oldFolderPath);
      for (const file of files) {
        const oldFilePath = path.join(oldFolderPath, file);
        const newFilePath = path.join(newFolderPath, file);
        fs.renameSync(oldFilePath, newFilePath);
      }
      // Remove old folder if empty
      fs.rmdirSync(oldFolderPath);
    }

    res.json({ success: true, message: 'Folder path updated successfully' });
  } catch (error) {
    console.error('Error updating folder path:', error);
    res.status(500).json({ error: 'Failed to update folder path' });
  }
});

// Get document details from a folder
route.post('/folder-documents', async (req, res) => {
  try {
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Folder path is required' 
      });
    }

    // Get documents in the folder
    const [documents] = await pool.query(
      `SELECT d.*, t.type_name, u.username as uploaded_by
       FROM table_document d
       LEFT JOIN table_type t ON d.type_id = t.id_type
       LEFT JOIN table_user u ON d.id_user_source = u.id_user
       WHERE d.path = ? AND d.isDeleted = 0`,
      [folderPath]
    );

    // Get keywords for each document
    const documentIds = documents.map(doc => doc.id_document);
    const [keywords] = await pool.query(
      `SELECT id_document, mot1, mot2, mot3, mot4, mot5
       FROM table_mot_cle
       WHERE id_document IN (?)`,
      [documentIds]
    );

    // Combine documents with their keywords
    const documentsWithKeywords = documents.map(doc => {
      const docKeywords = keywords.find(k => k.id_document === doc.id_document) || {};
      return {
        ...doc,
        keywords: [
          docKeywords.mot1,
          docKeywords.mot2,
          docKeywords.mot3,
          docKeywords.mot4,
          docKeywords.mot5
        ].filter(Boolean)
      };
    });

    res.json({
      success: true,
      documents: documentsWithKeywords
    });
  } catch (error) {
    console.error('Error fetching folder documents:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching folder documents',
      details: error.message
    });
  }
});

// Get folder contents
route.post('/folder-contents', async function (req, res) {
  console.log("POST request received at /post_docs/folder-contents");

  if (!req.session || !req.session.id_user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { path } = req.body;
  if (!path) {
    return res.status(400).json({ error: "Path is required" });
  }

  try {
    const con = await pool.getConnection();
    
    // Get user's institution
    const [userInstitution] = await con.query(
      `SELECT i.*, u.roles 
       FROM institutions i 
       JOIN user u ON i.id_institution = u.institution_id 
       WHERE u.id_user = ?`,
      [req.session.id_user]
    );

    if (!userInstitution || userInstitution.length === 0) {
      con.release();
      return res.status(404).json({ error: "User institution not found" });
    }

    const institution = userInstitution[0];

    // Get subfolders
    const [subfolders] = await con.query(
      `SELECT * FROM folders 
       WHERE folder_path LIKE ? 
       AND institution_id = ?`,
      [`${path}/%`, institution.id_institution]
    );

    // Get documents in the folder
    const [documents] = await con.query(
      `SELECT d.*, dt.type_name, 
              CONCAT(u.prenom, ' ', u.nom) as uploaded_by
       FROM table_document d
       LEFT JOIN document_types dt ON d.type_id = dt.id
       LEFT JOIN user u ON d.id_user_source = u.id_user
       WHERE d.path = ?`,
      [path]
    );

    // Get keywords for each document
    const documentIds = documents.map(doc => doc.id_document);
    const [keywords] = await pool.query(
      `SELECT id_document, mot1, mot2, mot3, mot4, mot5
       FROM table_mot_cle
       WHERE id_document IN (?)`,
      [documentIds]
    );

    // Combine documents with their keywords
    const documentsWithKeywords = documents.map(doc => {
      const docKeywords = keywords.find(k => k.id_document === doc.id_document) || {};
      return {
        ...doc,
        keywords: [
          docKeywords.mot1,
          docKeywords.mot2,
          docKeywords.mot3,
          docKeywords.mot4,
          docKeywords.mot5
        ].filter(Boolean)
      };
    });

    con.release();

    return res.json({
      success: true,
      folders: subfolders,
      documents: documentsWithKeywords
    });
  } catch (error) {
    console.error("Error fetching folder contents:", error);
    return res.status(500).json({ 
      error: "Failed to fetch folder contents", 
      details: error.message 
    });
  }
});

// Add new endpoint for batch viewing PDFs in Diffuse mode
route.get('/diffuse/batch-view/:path', async (req, res) => {
  try {
    console.log('🚀 Batch-view endpoint called');
    console.log('📁 Folder path:', req.params.path);
    console.log('🔐 Session data:', req.session ? 'EXISTS' : 'MISSING');
    console.log('👤 User ID:', req.session?.id_user || 'MISSING');
    
    if (!req.session || !req.session.id_user) {
      console.log('❌ No session or user ID found');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }

    const folderPath = req.params.path;
    const userId = req.session.id_user;
    
    console.log('🔍 Searching for documents in folder:', folderPath);
    console.log('👤 For user ID:', userId);

    const con = await pool.getConnection();
    
    // Get user's role and institution
    const [userInfo] = await con.query(
      `SELECT u.roles, u.institution_id 
       FROM user u 
       WHERE u.id_user = ?`,
      [userId]
    );

    if (!userInfo || userInfo.length === 0) {
      con.release();
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userRole = userInfo[0].roles;
    const institutionId = userInfo[0].institution_id;

    // Optional pagination and targeted names list
    const limit = req.query.limit ? Math.max(0, parseInt(req.query.limit, 10)) : null;
    const offset = req.query.offset ? Math.max(0, parseInt(req.query.offset, 10)) : 0;
    const namesParam = req.query.names ? String(req.query.names) : null;
    const requestedNames = namesParam
      ? namesParam.split(',').map(n => n.trim()).filter(Boolean)
      : null;

    let documents;
    if (userRole === 'superadmin' || userRole === 'admin') {
      // For superadmin/admin, get documents from the folder in their institution
      if (requestedNames && requestedNames.length > 0) {
        [documents] = await con.query(
          `SELECT d.nom_document, d.first_page, LENGTH(d.first_page) as first_page_size 
           FROM table_document d
           JOIN user u ON d.id_user_source = u.id_user
           WHERE d.path = ? AND u.institution_id = ? AND d.nom_document IN (?)`,
          [folderPath, institutionId, requestedNames]
        );
      } else if (limit !== null) {
        [documents] = await con.query(
          `SELECT d.nom_document, d.first_page, LENGTH(d.first_page) as first_page_size 
           FROM table_document d
           JOIN user u ON d.id_user_source = u.id_user
           WHERE d.path = ? AND u.institution_id = ?
           ORDER BY d.date_upload DESC
           LIMIT ? OFFSET ?`,
          [folderPath, institutionId, limit, offset]
        );
      } else {
        [documents] = await con.query(
          `SELECT d.nom_document, d.first_page, LENGTH(d.first_page) as first_page_size 
           FROM table_document d
           JOIN user u ON d.id_user_source = u.id_user
           WHERE d.path = ? AND u.institution_id = ?`,
          [folderPath, institutionId]
        );
      }
    } else {
      // For normal users, get only their documents
      if (requestedNames && requestedNames.length > 0) {
        [documents] = await con.query(
          `SELECT nom_document, first_page, LENGTH(first_page) as first_page_size FROM table_document 
           WHERE path = ? AND id_user_source = ? AND nom_document IN (?)`,
          [folderPath, userId, requestedNames]
        );
      } else if (limit !== null) {
        [documents] = await con.query(
          `SELECT nom_document, first_page, LENGTH(first_page) as first_page_size FROM table_document 
           WHERE path = ? AND id_user_source = ?
           ORDER BY date_upload DESC
           LIMIT ? OFFSET ?`,
          [folderPath, userId, limit, offset]
        );
      } else {
        [documents] = await con.query(
          `SELECT nom_document, first_page, LENGTH(first_page) as first_page_size FROM table_document 
           WHERE path = ? AND id_user_source = ?`,
          [folderPath, userId]
        );
      }
    }
    
    console.log(`📄 Found ${documents.length} documents in database:`);
    documents.forEach(doc => {
      console.log(`  - ${doc.nom_document}: first_page = ${doc.first_page_size ? doc.first_page_size + ' bytes' : 'NULL'}`);
    });
    
    con.release();
    
    const pdfs = {};
    
    for (const doc of documents) {
      if (doc.first_page) {
        // Use the stored first page
        pdfs[doc.nom_document] = doc.first_page;
        console.log(`✅ Using stored first page for: ${doc.nom_document} (${doc.first_page.length} bytes)`);
      } else {
        // Skip documents without first_page to avoid loading entire PDFs
        console.log(`⚠️ Skipping ${doc.nom_document} - no first_page available (would require full PDF load)`);
        // Don't add to pdfs object - this will show "Loading PDF..." in frontend
      }
    }

    console.log(`📦 Returning ${Object.keys(pdfs).length} PDFs:`, Object.keys(pdfs));
    res.json({
      success: true,
      pdfs: pdfs
    });
  } catch (error) {
    console.error('💥 Error in batch-view endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Add endpoint for content-based search with progress tracking
route.post('/content-search-progress', async (req, res) => {
  try {
    console.log('🔍 [CONTENT-SEARCH-PROGRESS] Starting content search with progress...');
    
    if (!req.session || !req.session.id_user) {
      console.log('❌ [CONTENT-SEARCH-PROGRESS] No session or user ID found');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }

    const { searchTerms, folderPath, searchType = 'smart' } = req.body;
    
    if (!searchTerms || !searchTerms.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search terms are required'
      });
    }

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    console.log('🔍 [CONTENT-SEARCH-PROGRESS] Search params:', {
      searchTerms,
      folderPath: folderPath || 'root',
      searchType,
      userId: req.session.id_user
    });

    const con = await pool.getConnection();
    
    // Get documents from the specified folder
    const [documents] = await con.query(
      `SELECT id_document, nom_document, path, nom_document_original 
       FROM table_document 
       WHERE id_user_source = ? AND path = ? AND nom_document LIKE '%.pdf'`,
      [req.session.id_user, folderPath || '']
    );
    
    console.log(`📄 [CONTENT-SEARCH-PROGRESS] Found ${documents.length} PDF documents in folder`);
    
    if (documents.length === 0) {
      con.release();
      res.write(JSON.stringify({
        type: 'complete',
        success: true,
        results: [],
        message: 'No PDF documents found in this folder'
      }) + '\n');
      res.end();
      return;
    }

    // Parse search terms
    const terms = searchTerms
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);
    
    console.log('🔍 [CONTENT-SEARCH-PROGRESS] Search terms:', terms);

    // Send initial progress
    res.write(JSON.stringify({
      type: 'progress',
      current: 0,
      total: documents.length,
      processing: 'Începem căutarea...'
    }) + '\n');

    const results = [];
    let currentIndex = 0;
    
    for (const doc of documents) {
      currentIndex++;
      
      // Send progress update
      res.write(JSON.stringify({
        type: 'progress',
        current: currentIndex,
        total: documents.length,
        processing: `Căutăm în ${doc.nom_document}...`
      }) + '\n');

      try {
        console.log(`🔄 [CONTENT-SEARCH-PROGRESS] Processing ${currentIndex}/${documents.length}: ${doc.nom_document}`);
        
        // Construct the full file path
        const filePath = path.join(process.cwd(), 'uploads', doc.path, doc.nom_document);
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ [CONTENT-SEARCH-PROGRESS] File not found: ${filePath}`);
          continue;
        }

        // Extract text based on search type
        let extractedText = '';
        let extractionMethod = 'unknown';
        let matches = [];
        
        switch (searchType) {
          case 'text-only':
            try {
              const dataBuffer = fs.readFileSync(filePath);
              const pdfData = await pdfParse(dataBuffer);
              extractedText = pdfData.text;
              extractionMethod = 'text';
            } catch (error) {
              console.error(`❌ [CONTENT-SEARCH-PROGRESS] Text extraction failed for ${doc.nom_document}:`, error.message);
              extractedText = '';
            }
            break;
            
          case 'ocr-only':
            try {
              extractedText = await extractTextWithOCR(filePath);
              extractionMethod = 'ocr';
            } catch (error) {
              console.error(`❌ [CONTENT-SEARCH-PROGRESS] OCR extraction failed for ${doc.nom_document}:`, error.message);
              extractedText = '';
            }
            break;
            
          case 'smart':
          default:
            extractedText = await extractTextFromPDF(filePath);
            
            // Determine which method was likely used
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const normalText = pdfData.text;
            const meaningfulWords = normalText.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 2).length;
            extractionMethod = meaningfulWords < 10 ? 'ocr' : 'text';
            break;
        }
        
        const pdfText = extractedText.toLowerCase();
        console.log(`📄 [CONTENT-SEARCH-PROGRESS] Extracted ${pdfText.length} characters from ${doc.nom_document} using ${extractionMethod}`);
        
        // Check if any search term is found in the PDF content
        const foundTerms = terms.filter(term => pdfText.includes(term));
        
        if (foundTerms.length > 0) {
          console.log(`✅ [CONTENT-SEARCH-PROGRESS] Match found in ${doc.nom_document} for terms: ${foundTerms.join(', ')}`);
          
          // Get actual PDF page count for better estimation
          let actualPages = 1;
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            actualPages = pdfData.numpages || 1;
          } catch (error) {
            console.warn(`Could not get page count for ${doc.nom_document}, using text-based estimation`);
            actualPages = Math.max(1, Math.ceil(pdfText.length / 3000)); // Conservative estimate
          }
          
          // Create matches with improved page estimation
          foundTerms.forEach(term => {
            const termIndex = pdfText.indexOf(term);
            if (termIndex !== -1) {
              // Calculate page based on text position
              const estimatedPage = Math.max(1, Math.min(actualPages, Math.ceil((termIndex / pdfText.length) * actualPages)));
              
              matches.push({
                term: term,
                page: estimatedPage,
                context: pdfText.substring(Math.max(0, termIndex - 50), termIndex + 50)
              });
              console.log(`📍 Found "${term}" on page ${estimatedPage}/${actualPages} in ${doc.nom_document} (text pos: ${termIndex}/${pdfText.length})`);
            }
          });

          console.log(`📍 [CONTENT-SEARCH-PROGRESS] Matches found for ${doc.nom_document}:`, matches);
          
          const result = {
            id_document: doc.id_document,
            nom_document: doc.nom_document,
            path: doc.path,
            nom_document_original: doc.nom_document_original,
            matchedTerms: foundTerms,
            totalTerms: terms.length,
            textLength: pdfText.length,
            extractionMethod: extractionMethod,
            matches: matches
          };
          
          results.push(result);
          
          // Send found result
          res.write(JSON.stringify({
            type: 'found',
            document: result
          }) + '\n');
        } else {
          console.log(`❌ [CONTENT-SEARCH-PROGRESS] No match in ${doc.nom_document}`);
        }
        
      } catch (error) {
        console.error(`💥 [CONTENT-SEARCH-PROGRESS] Error processing ${doc.nom_document}:`, error.message);
        continue;
      }
    }
    
    con.release();
    
    console.log(`🎯 [CONTENT-SEARCH-PROGRESS] Search complete: ${results.length}/${documents.length} documents matched`);
    
    // Send completion
    res.write(JSON.stringify({
      type: 'complete',
      success: true,
      results: results,
      searchTerms: terms,
      searchType: searchType,
      totalDocuments: documents.length,
      matchedDocuments: results.length,
      extractionMethods: {
        text: results.filter(r => r.extractionMethod === 'text').length,
        ocr: results.filter(r => r.extractionMethod === 'ocr').length,
        unknown: results.filter(r => r.extractionMethod === 'unknown').length
      }
    }) + '\n');
    
    res.end();
    
  } catch (error) {
    console.error('💥 [CONTENT-SEARCH-PROGRESS] Error in content search:', error);
    try {
      res.write(JSON.stringify({
        type: 'error',
        success: false,
        error: 'Internal server error',
        details: error.message
      }) + '\n');
      res.end();
    } catch (e) {
      console.error('Failed to send error response:', e);
    }
  }
});

// Add endpoint for content-based search in PDF documents
route.post('/content-search', async (req, res) => {
  try {
    console.log('🔍 [CONTENT-SEARCH] Starting content search...');
    
    if (!req.session || !req.session.id_user) {
      console.log('❌ [CONTENT-SEARCH] No session or user ID found');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }

    const { searchTerms, folderPath, searchType = 'smart' } = req.body;
    
    if (!searchTerms || !searchTerms.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search terms are required'
      });
    }

    console.log('🔍 [CONTENT-SEARCH] Search params:', {
      searchTerms,
      folderPath: folderPath || 'root',
      searchType,
      userId: req.session.id_user
    });

    const con = await pool.getConnection();
    
    // Get documents from the specified folder
    const [documents] = await con.query(
      `SELECT id_document, nom_document, path, nom_document_original 
       FROM table_document 
       WHERE id_user_source = ? AND path = ? AND nom_document LIKE '%.pdf'`,
      [req.session.id_user, folderPath || '']
    );
    
    console.log(`📄 [CONTENT-SEARCH] Found ${documents.length} PDF documents in folder`);
    
    if (documents.length === 0) {
      con.release();
      return res.json({
        success: true,
        results: [],
        message: 'No PDF documents found in this folder'
      });
    }

    // Parse search terms - split by comma and clean up
    const terms = searchTerms
      .split(',')
      .map(term => term.trim().toLowerCase())
      .filter(term => term.length > 0);
    
    console.log('🔍 [CONTENT-SEARCH] Search terms:', terms);

    const results = [];
    
    for (const doc of documents) {
      try {
        console.log(`🔄 [CONTENT-SEARCH] Processing: ${doc.nom_document}`);
        
        // Construct the full file path
        const filePath = path.join(process.cwd(), 'uploads', doc.path, doc.nom_document);
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ [CONTENT-SEARCH] File not found: ${filePath}`);
          continue;
        }

        // Extract text based on search type
        let extractedText = '';
        let extractionMethod = 'unknown';
        
        switch (searchType) {
          case 'text-only':
            // Only normal PDF text extraction, no OCR
            console.log(`📄 [CONTENT-SEARCH] Using text-only extraction for ${doc.nom_document}`);
            try {
              const dataBuffer = fs.readFileSync(filePath);
              const pdfData = await pdfParse(dataBuffer);
              extractedText = pdfData.text;
              extractionMethod = 'text';
            } catch (error) {
              console.error(`❌ [CONTENT-SEARCH] Text extraction failed for ${doc.nom_document}:`, error.message);
              extractedText = '';
            }
            break;
            
          case 'ocr-only':
            // Only OCR extraction for scanned documents
            console.log(`🔍 [CONTENT-SEARCH] Using OCR-only extraction for ${doc.nom_document}`);
            try {
              extractedText = await extractTextWithOCR(filePath);
              extractionMethod = 'ocr';
            } catch (error) {
              console.error(`❌ [CONTENT-SEARCH] OCR extraction failed for ${doc.nom_document}:`, error.message);
              extractedText = '';
            }
            break;
            
          case 'smart':
          default:
            // Smart extraction (normal + OCR if needed)
            console.log(`🤖 [CONTENT-SEARCH] Using smart extraction for ${doc.nom_document}`);
            extractedText = await extractTextFromPDF(filePath);
            
            // Determine which method was likely used
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const normalText = pdfData.text;
            const meaningfulWords = normalText.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 2).length;
            extractionMethod = meaningfulWords < 10 ? 'ocr' : 'text';
            break;
        }
        
        const pdfText = extractedText.toLowerCase();
        console.log(`📄 [CONTENT-SEARCH] Extracted ${pdfText.length} characters from ${doc.nom_document} using ${extractionMethod}`);
        
        // Check if any search term is found in the PDF content
        const foundTerms = terms.filter(term => pdfText.includes(term));
        
        if (foundTerms.length > 0) {
          console.log(`✅ [CONTENT-SEARCH] Match found in ${doc.nom_document} for terms: ${foundTerms.join(', ')}`);
          
                   results.push({
           id_document: doc.id_document,
           nom_document: doc.nom_document,
           path: doc.path,
           nom_document_original: doc.nom_document_original,
           matchedTerms: foundTerms,
           totalTerms: terms.length,
           textLength: pdfText.length,
           extractionMethod: extractionMethod // Actual method used
         });
        } else {
          console.log(`❌ [CONTENT-SEARCH] No match in ${doc.nom_document}`);
        }
        
      } catch (error) {
        console.error(`💥 [CONTENT-SEARCH] Error processing ${doc.nom_document}:`, error.message);
        // Continue with next document instead of failing completely
        continue;
      }
    }
    
    con.release();
    
    console.log(`🎯 [CONTENT-SEARCH] Search complete: ${results.length}/${documents.length} documents matched`);
    
    res.json({
      success: true,
      results: results,
      searchTerms: terms,
      searchType: searchType,
      totalDocuments: documents.length,
      matchedDocuments: results.length,
      extractionMethods: {
        text: results.filter(r => r.extractionMethod === 'text').length,
        ocr: results.filter(r => r.extractionMethod === 'ocr').length,
        unknown: results.filter(r => r.extractionMethod === 'unknown').length
      }
    });
    
  } catch (error) {
    console.error('💥 [CONTENT-SEARCH] Error in content search:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Add endpoint to populate first_page for existing documents
route.post('/populate-first-pages', async (req, res) => {
  try {
    console.log('🚀 Starting first_page population for existing documents...');
    
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        details: 'User not authenticated'
      });
    }

    const con = await pool.getConnection();
    
    // Get all documents without first_page
    const [documents] = await con.query(
      `SELECT id_document, nom_document, path 
       FROM table_document 
       WHERE (first_page IS NULL OR first_page = '') 
       AND nom_document LIKE '%.pdf'
       LIMIT 50`
    );
    
    console.log(`📄 Found ${documents.length} documents without first_page`);
    
    let processedCount = 0;
    let successCount = 0;
    
    for (const doc of documents) {
      try {
        console.log(`🔄 Processing: ${doc.nom_document}`);
        
        const filePath = path.join(process.cwd(), 'uploads', doc.path, doc.nom_document);
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ File not found: ${filePath}`);
          processedCount++;
          continue;
        }
        
        // Extract first page
        const firstPageBase64 = await extractFirstPageFromPDF(filePath);
        
        if (firstPageBase64) {
          // Update database
          await con.query(
            'UPDATE table_document SET first_page = ? WHERE id_document = ?',
            [firstPageBase64, doc.id_document]
          );
          
          console.log(`✅ Updated first_page for: ${doc.nom_document} (${firstPageBase64.length} bytes)`);
          successCount++;
        } else {
          console.log(`⚠️ Could not extract first page for: ${doc.nom_document}`);
        }
        
        processedCount++;
        
        // Add small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`💥 Error processing ${doc.nom_document}:`, error);
        processedCount++;
      }
    }
    
    con.release();
    
    console.log(`🎯 Population complete: ${successCount}/${processedCount} documents updated`);
    
    res.json({
      success: true,
      message: `Successfully updated ${successCount} out of ${processedCount} documents`,
      processed: processedCount,
      updated: successCount
    });
    
  } catch (error) {
    console.error('💥 Error in populate-first-pages endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Debug endpoint pentru documente din folder
route.post('/debug-documents-in-path', async (req, res) => {
  let connection;
  try {
    const { path, userId } = req.body;
    connection = await pool.getConnection();

    // Get documents in this exact path
    const [documents] = await connection.query(
      'SELECT * FROM table_document WHERE path = ? ORDER BY date_upload DESC',
      [path]
    );

    res.json({
      success: true,
      path,
      userId,
      documentsCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id_document,
        name: doc.nom_document,
        original_name: doc.nom_document_original,
        path: doc.path,
        upload_date: doc.date_upload,
        size: doc.size,
        uploaded_by: doc.id_user
      }))
    });

  } catch (error) {
    console.error('Error in debug documents endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
});

// Add endpoint for receiving files from Electron during move operations
route.post('/move-upload', multer({ dest: 'temp/' }).single('file'), async (req, res) => {
    try {
        console.log('\n=== MOVE-UPLOAD: Received file from Electron ===');
        console.log('File:', req.file ? req.file.originalname : 'No file');
        console.log('Target path:', req.body.targetPath);
        console.log('Document ID:', req.body.documentId);
        console.log('User ID:', req.body.userId);
        console.log('Institution ID:', req.body.institutionId);

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file provided' 
            });
        }

        const { targetPath, documentId, userId, institutionId } = req.body;
        
        if (!targetPath || !documentId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required parameters' 
            });
        }

        // Construct the target directory path
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const targetDir = path.join(uploadsDir, targetPath);
        const targetFilePath = path.join(targetDir, req.file.originalname);

        console.log('Uploads directory:', uploadsDir);
        console.log('Target directory:', targetDir);
        console.log('Target file path:', targetFilePath);

        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log('Created target directory:', targetDir);
        }

        // Move the uploaded file to the target location
        fs.renameSync(req.file.path, targetFilePath);
        console.log('File moved to target location:', targetFilePath);

        // Remove old file if it exists in a different location
        try {
            // Get the document's current path from database to find old file
            const con = await pool.getConnection();
            const [docs] = await con.execute(
                'SELECT path FROM table_document WHERE id_document = ?',
                [documentId]
            );
            con.release();

            if (docs.length > 0) {
                const oldPath = docs[0].path;
                if (oldPath !== targetPath) {
                    const oldFilePath = path.join(uploadsDir, oldPath, req.file.originalname);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                        console.log('Removed old file:', oldFilePath);
                    }
                }
            }
        } catch (cleanupError) {
            console.log('Could not clean up old file:', cleanupError.message);
            // Continue even if cleanup fails
        }

        res.json({ 
            success: true, 
            message: 'File uploaded successfully',
            targetPath: targetFilePath
        });

    } catch (error) {
        console.error('Error in move-upload:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload file',
            error: error.message 
        });
    }
});

// ================================
// CSC SIGNATURE ENDPOINTS
// ================================

const axios = require('axios');
const crypto = require('crypto');

// CSC API Configuration pentru certSIGN demo
const CSC_CONFIG = {
  // Configurația pentru certSIGN demo
  baseURL: 'https://backend.rssdemo.certsign.ro/FSN.TwoStepRegistrationClientService_01/csc/v1',
  oauthURL: 'https://backend.rssdemo.certsign.ro/FSN.TwoStepRegistrationClientService_01/oauth2',
  clientId: 'f7e85d35-1232-41c0-8912-06523221b01a',
  clientSecret: 'eeB-NKL4NvDN@niiyrly;y+3|q58t#4=01-mxG-Fr2',
  redirectURI: 'http://192.168.0.13:3003/post_docs/csc/callback',
  // Configurație pentru platforma certSIGN (nu implementează CSC API corect)
  platformURL: 'https://backend.rssdemo.certsign.ro/FSN.TwoStepRegistrationClientService_01',
  userCredentials: {
    email: 'andrei.muncioiu@piatadesiteuri.ro',
    password: 'Andisva2001!'
  }
};

// CSC API v1.0.4.0 - info endpoint
route.get('/csc/info', async (req, res) => {
  console.log('CSC Info request received');
  
  try {
    // Call CSC API info endpoint as per v1.0.4.0 specification
    const response = await axios.post(`${CSC_CONFIG.baseURL}/info`, {
      lang: req.query.lang || 'en-US'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Return CSC API response format as per specification
    res.json({
      success: true,
      cscInfo: response.data,
      config: {
        redirectURI: CSC_CONFIG.redirectURI,
        clientId: CSC_CONFIG.clientId
      }
    });
  } catch (error) {
    console.error('Error getting CSC info:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to CSC service',
      error: error.message
    });
  }
});

// Inițiază procesul de semnătură - redirecționează utilizatorul la CSC
route.post('/csc/initiate-signature', async (req, res) => {
  console.log('CSC signature initiation request received');
  console.log('Session:', req.session);
  console.log('Request body:', req.body);

  const userId = req.session.id_user;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    const { 
      documentId, 
      documentPath, 
      documentName,
      hashValue, // Hash-ul documentului de semnat
      credentialId // ID-ul credentialei utilizatorului (dacă este cunoscut)
    } = req.body;

    // Generează state pentru securitate OAuth2
    const state = crypto.randomBytes(32).toString('hex');
    
    // Salvează informațiile în sesiune pentru a le recupera în callback
    req.session.cscSignatureData = {
      documentId,
      documentPath,
      documentName,
      hashValue,
      credentialId,
      state,
      timestamp: Date.now()
    };

    // Redirecționează direct către pagina de login certSIGN
    // Utilizatorul se va autentifica acolo și apoi va fi redirecționat înapoi
    const authorizationURL = 'https://backend.rssdemo.certsign.ro/FSN.TwoStepRegistrationClientService_01/account/login';

    res.json({
      success: true,
      authorizationURL: authorizationURL,
      state: state,
      message: 'Redirect user to this URL for signature authorization'
    });

  } catch (error) {
    console.error('Error initiating CSC signature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate signature process',
      error: error.message
    });
  }
});

// Callback OAuth2 - aici va fi redirectionat utilizatorul după autorizare
route.get('/csc/callback', async (req, res) => {
  console.log('CSC OAuth2 callback received');
  console.log('Query params:', req.query);
  console.log('Session data:', req.session.cscSignatureData);

  try {
    const { code, state, error, error_description } = req.query;

    // Verifică dacă există eroare în callback
    if (error) {
      console.error('CSC authorization error:', error, error_description);
      return res.redirect(`http://192.168.0.13:3002/user-dashboard?error=signature_failed&message=${encodeURIComponent(error_description || error)}`);
    }

    // Verifică state pentru securitate
    const sessionData = req.session.cscSignatureData;
    if (!sessionData || sessionData.state !== state) {
      console.error('Invalid state parameter');
      return res.redirect('http://192.168.0.13:3002/user-dashboard?error=invalid_state');
    }

    // Verifică dacă sesiunea nu a expirat (5 minute)
    if (Date.now() - sessionData.timestamp > 5 * 60 * 1000) {
      console.error('Signature session expired');
      return res.redirect('http://192.168.0.13:3002/user-dashboard?error=session_expired');
    }

    // Schimbă codul de autorizare cu access token
    const tokenResponse = await axios.post(`${CSC_CONFIG.oauthURL}/token`, 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CSC_CONFIG.clientId,
        client_secret: CSC_CONFIG.clientSecret,
        redirect_uri: CSC_CONFIG.redirectURI
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, token_type } = tokenResponse.data;

    // Dacă token_type este 'SAD', înseamnă că avem Signature Activation Data
    if (token_type === 'SAD') {
      // Acum putem efectua semnătura cu acest SAD token
      const signatureResult = await performSignature(access_token, sessionData);
      
      if (signatureResult.success) {
        // Curăță datele din sesiune
        delete req.session.cscSignatureData;
        
        // Redirectează cu succes
        return res.redirect(`http://192.168.0.13:3002/user-dashboard?success=document_signed&document=${encodeURIComponent(sessionData.documentName)}`);
      } else {
        return res.redirect(`http://192.168.0.13:3002/user-dashboard?error=signature_failed&message=${encodeURIComponent(signatureResult.error)}`);
      }
    } else {
      // Pentru Bearer tokens, ar trebui să faci alte operațiuni
      console.log('Received Bearer token, additional steps needed');
      return res.redirect('http://192.168.0.13:3002/user-dashboard?error=additional_auth_needed');
    }

  } catch (error) {
    console.error('Error in CSC callback:', error);
    return res.redirect(`http://192.168.0.13:3002/user-dashboard?error=callback_error&message=${encodeURIComponent(error.message)}`);
  }
});

// Endpoint pentru a obține token-ul direct din platforma certSIGN (pentru cazul când nu primim callback)
route.post('/csc/get-token', async (req, res) => {
  console.log('CSC get-token request received');
  console.log('Session:', req.session);
  console.log('Request body:', req.body);

  const userId = req.session.id_user;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated in EDMS' });
  }

  try {
    const { documentId, documentPath, documentName, hashValue } = req.body;

    // Generează state pentru securitate
    const state = crypto.randomBytes(32).toString('hex');
    
    // Salvează informațiile în sesiune
    req.session.cscSignatureData = {
      documentId,
      documentPath,
      documentName,
      hashValue,
      state,
      timestamp: Date.now()
    };

    // Conform CSC API v1.0.4.0, folosim client credentials grant pentru a obține token-ul
    console.log('Attempting to get token using client credentials grant...');
    
    try {
      const tokenResponse = await axios.post(`${CSC_CONFIG.oauthURL}/token`, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: CSC_CONFIG.clientId,
          client_secret: CSC_CONFIG.clientSecret,
          scope: 'credential'
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('Token response:', tokenResponse.data);
      const { access_token, token_type } = tokenResponse.data;

      if (access_token) {
        console.log('Successfully obtained access token, attempting signature...');
        
        // Încearcă să efectuezi semnătura direct
        const signatureResult = await performSignature(access_token, req.session.cscSignatureData);
        
        if (signatureResult.success) {
          // Curăță datele din sesiune
          delete req.session.cscSignatureData;
          
          res.json({
            success: true,
            message: 'Document signed successfully using client credentials',
            document: documentName
          });
        } else {
          res.json({
            success: false,
            message: 'Failed to sign document',
            error: signatureResult.error
          });
        }
      } else {
        res.json({
          success: false,
          message: 'Failed to obtain access token from certSIGN',
          response: tokenResponse.data
        });
      }
    } catch (tokenError) {
      console.error('Error getting token:', tokenError.response?.data || tokenError.message);
      
      // Dacă client credentials nu funcționează, încercăm să obținem SAD token
      console.log('Client credentials failed, trying to get SAD token...');
      
      try {
        // Încearcă să obții SAD token conform CSC API v1.0.4.0
        const sadResponse = await axios.post(`${CSC_CONFIG.baseURL}/credentials/authorize`, {
          credentialID: "demo-credential", // ID-ul credentialei de demo
          numSignatures: 1,
          hash: [Buffer.from(hashValue).toString('base64')],
          hashAlgo: 'SHA256'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CSC_CONFIG.clientId}`
          }
        });

        console.log('SAD response:', sadResponse.data);
        
        if (sadResponse.data.SAD) {
          const signatureResult = await performSignature(sadResponse.data.SAD, req.session.cscSignatureData);
          
          if (signatureResult.success) {
            delete req.session.cscSignatureData;
            res.json({
              success: true,
              message: 'Document signed successfully using SAD token',
              document: documentName
            });
          } else {
            res.json({
              success: false,
              message: 'Failed to sign document with SAD',
              error: signatureResult.error
            });
          }
        } else {
          res.json({
            success: false,
            message: 'Failed to obtain SAD token from certSIGN',
            response: sadResponse.data
          });
        }
      } catch (sadError) {
        console.error('Error getting SAD token:', sadError.response?.data || sadError.message);
        res.json({
          success: false,
          message: 'Both client credentials and SAD token approaches failed',
          tokenError: tokenError.response?.data || tokenError.message,
          sadError: sadError.response?.data || sadError.message
        });
      }
    }

  } catch (error) {
    console.error('Error getting CSC token:', error);
    
    // certSIGN nu implementează standardul CSC API v1.0.4.0 corect
    // Platforma lor returnează întotdeauna pagina Angular în loc de endpoint-urile API
    console.log('❌ certSIGN platform issue detected - returning error response');
    
    res.status(503).json({
      success: false,
      message: 'certSIGN platform nu implementează standardul CSC API v1.0.4.0',
      issue: 'Platforma returnează HTML în loc de JSON API',
      details: {
        problem: 'certSIGN nu suportă endpoint-urile CSC API conform standardului v1.0.4.0',
        evidence: 'Toate endpoint-urile (/oauth2/token, /csc/v1/*) returnează pagina Angular',
        recommendation: 'Contactează certSIGN pentru implementarea corectă a standardului'
      },
      contact: {
        name: 'Alexandru Pasere și Andrei Muncioiu',
        email: 'andrei.muncioiu@piatadesiteuri.ro',
        message: 'Solicită implementarea corectă a CSC API v1.0.4.0'
      },
      temporarySolution: 'Pentru semnături digitale, folosește alte servicii care implementează corect standardul CSC API',
      originalError: error.message
    });
  }
});

// Endpoint de test pentru autentificarea cu certSIGN
route.get('/csc/test-auth', async (req, res) => {
  console.log('CSC test-auth request received');
  
  try {
    // Testează autentificarea cu certSIGN folosind credențialele demo
    console.log('Testing certSIGN authentication...');
    
    // certSIGN nu implementează standardul CSC API v1.0.4.0 corect
    // Platforma lor returnează întotdeauna pagina Angular în loc de endpoint-urile API
    console.log('❌ certSIGN platform issue detected:');
    console.log('- Platforma returnează pagina Angular în loc de endpoint-urile CSC API');
    console.log('- Nu implementează standardul CSC API v1.0.4.0 corect');
    console.log('- Endpoint-urile /oauth2/token și /csc/v1/* returnează HTML în loc de JSON');
    
    // Testează să vedem ce returnează platforma
    console.log('Testing what certSIGN actually returns...');
    
    try {
      const testResponse = await axios.get(`${CSC_CONFIG.baseURL}/info`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('certSIGN response type:', typeof testResponse.data);
      console.log('certSIGN response preview:', JSON.stringify(testResponse.data).substring(0, 200));
      
      if (typeof testResponse.data === 'string' && testResponse.data.includes('<!doctype html>')) {
        res.json({
          success: false,
          message: 'certSIGN platform issue confirmed',
          issue: 'Platforma returnează HTML în loc de JSON API',
          recommendation: 'Contactează certSIGN pentru implementarea corectă a CSC API v1.0.4.0',
          contact: {
            name: 'Alexandru Pasere și Andrei Muncioiu',
            email: 'andrei.muncioiu@piatadesiteuri.ro'
          },
          responsePreview: testResponse.data.substring(0, 500)
        });
      } else {
        res.json({
          success: true,
          message: 'certSIGN API might be working',
          response: testResponse.data
        });
      }
      
    } catch (testError) {
      console.error('Test error:', testError.response?.status, testError.response?.data);
      
      res.json({
        success: false,
        message: 'certSIGN platform issue confirmed',
        issue: 'Endpoint-urile CSC API nu funcționează conform standardului',
        error: testError.response?.status || testError.message,
        recommendation: 'Contactează certSIGN pentru implementarea corectă a CSC API v1.0.4.0',
        contact: {
          name: 'Alexandru Pasere și Andrei Muncioiu',
          email: 'andrei.muncioiu@piatadesiteuri.ro'
        }
      });
    }
    
  } catch (error) {
    console.error('Error testing certSIGN authentication:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to test certSIGN authentication',
      error: error.response?.data || error.message
    });
  }
});

// Endpoint pentru a încerca autentificarea cu platforma certSIGN
route.post('/csc/platform-auth', async (req, res) => {
  console.log('CSC platform-auth request received');
  
  try {
    // Încearcă să se autentifice cu platforma certSIGN folosind credențialele utilizatorului
    console.log('Attempting to authenticate with certSIGN platform...');
    
    // 1. Încearcă să acceseze pagina de login pentru a obține cookies de sesiune
    console.log('Step 1: Getting session cookies...');
    const sessionResponse = await axios.get(CSC_CONFIG.platformURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Session response status:', sessionResponse.status);
    
    // 2. Încearcă să se autentifice cu credențialele
    console.log('Step 2: Attempting login with user credentials...');
    
    // Construiește payload-ul pentru login (trebuie să găsim formatul corect)
    const loginPayload = {
      username: CSC_CONFIG.userCredentials.email,
      password: CSC_CONFIG.userCredentials.password,
      grant_type: 'password'
    };
    
    try {
      const loginResponse = await axios.post(`${CSC_CONFIG.platformURL}/login`, loginPayload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log('Login response status:', loginResponse.status);
      console.log('Login response data:', loginResponse.data);
      
      res.json({
        success: true,
        message: 'Login attempt completed',
        status: loginResponse.status,
        data: loginResponse.data
      });
      
    } catch (loginError) {
      console.error('Login error:', loginError.response?.status, loginError.response?.data);
      
      res.json({
        success: false,
        message: 'Login failed',
        error: loginError.response?.status || loginError.message,
        recommendation: 'certSIGN platform nu suportă autentificarea programatică',
        contact: {
          name: 'Alexandru Pasere și Andrei Muncioiu',
          email: 'andrei.muncioiu@piatadesiteuri.ro'
        }
      });
    }
    
  } catch (error) {
    console.error('Error in platform authentication:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate with certSIGN platform',
      error: error.response?.data || error.message
    });
  }
});

// Endpoint pentru a verifica statusul semnăturii
route.get('/csc/signature-status', async (req, res) => {
  console.log('CSC signature status request received');
  console.log('Session:', req.session);

  const userId = req.session.id_user;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    const sessionData = req.session.cscSignatureData;
    
    if (!sessionData) {
      return res.json({
        success: false,
        message: 'No signature session found'
      });
    }

    // Verifică dacă sesiunea nu a expirat (5 minute)
    if (Date.now() - sessionData.timestamp > 5 * 60 * 1000) {
      delete req.session.cscSignatureData;
      return res.json({
        success: false,
        message: 'Signature session expired'
      });
    }

    res.json({
      success: true,
      sessionData: {
        documentName: sessionData.documentName,
        timestamp: sessionData.timestamp,
        state: sessionData.state
      }
    });

  } catch (error) {
    console.error('Error checking signature status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check signature status',
      error: error.message
    });
  }
});

// OAuth2 Authorization Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/oauth2/authorize', async (req, res) => {
  console.log('CSC OAuth2 authorize request received:', req.body);
  
  try {
    const response = await axios.post(`${CSC_CONFIG.oauthURL}/authorize`, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC OAuth2 authorize:', error.message);
    res.status(500).json({
      error: 'csc_unavailable',
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// OAuth2 Token Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/oauth2/token', async (req, res) => {
  console.log('CSC OAuth2 token request received:', req.body);
  
  try {
    const response = await axios.post(`${CSC_CONFIG.oauthURL}/token`, req.body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC OAuth2 token:', error.message);
    res.status(500).json({
      error: 'csc_unavailable',
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// Credentials List Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/credentials/list', async (req, res) => {
  console.log('CSC credentials/list request received');
  
  try {
    const response = await axios.post(`${CSC_CONFIG.baseURL}/credentials/list`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC credentials/list:', error.message);
    res.status(500).json({
      error: 'csc_unavailable',
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// Credentials Info Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/credentials/info', async (req, res) => {
  console.log('CSC credentials/info request received');
  
  try {
    const response = await axios.post(`${CSC_CONFIG.baseURL}/credentials/info`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC credentials/info:', error.message);
    res.status(500).json({
      error: 'csc_unavailable', 
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// Credentials Authorize Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/credentials/authorize', async (req, res) => {
  console.log('CSC credentials/authorize request received');
  
  try {
    const response = await axios.post(`${CSC_CONFIG.baseURL}/credentials/authorize`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC credentials/authorize:', error.message);
    res.status(500).json({
      error: 'csc_unavailable',
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// Signatures SignHash Endpoint - Conform CSC API v1.0.4.0
route.post('/csc/signatures/signHash', async (req, res) => {
  console.log('CSC signatures/signHash request received');
  
  try {
    const response = await axios.post(`${CSC_CONFIG.baseURL}/signatures/signHash`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error in CSC signatures/signHash:', error.message);
    res.status(500).json({
      error: 'csc_unavailable',
      error_description: 'CSC service is currently unavailable'
    });
  }
});

// Funcție auxiliară pentru efectuarea semnăturii conform CSC API v1.0.4.0
async function performSignature(token, signatureData) {
  try {
    console.log('Starting signature process with token:', token.substring(0, 20) + '...');
    console.log('Signature data:', signatureData);
    
    // Calculează hash-ul documentului pentru semnătură
    const documentPath = path.join(process.cwd(), 'uploads', signatureData.documentPath, signatureData.documentName);
    console.log('Document path:', documentPath);
    
    if (!fs.existsSync(documentPath)) {
      console.error('Document not found at path:', documentPath);
      return { success: false, error: 'Document not found' };
    }
    
    const documentBuffer = fs.readFileSync(documentPath);
    const hashValue = crypto.createHash('sha256').update(documentBuffer).digest();
    console.log('Document hash calculated:', hashValue.toString('base64').substring(0, 20) + '...');
    
    // Încearcă să efectuezi semnătura folosind token-ul primit
    console.log('Attempting to sign document using CSC API...');
    
    const signResponse = await axios.post(`${CSC_CONFIG.baseURL}/signatures/signHash`, {
      credentialID: "demo-credential", // ID-ul credentialei de demo
      SAD: token, // Token-ul primit (poate fi access_token sau SAD)
      hash: [hashValue.toString('base64')],
      hashAlgo: 'SHA256',
      signAlgo: 'RSA',
      signAlgoParams: {}
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Sign response:', signResponse.data);
    const signatures = signResponse.data.signatures;
    
    if (signatures && signatures.length > 0) {
      console.log('Signature obtained successfully, saving to database...');
      
      // Salvează semnătura în baza de date conform CSC API v1.0.4.0
      const connection = await pool.getConnection();
      
      // Obține informațiile utilizatorului
      const userQuery = 'SELECT nom, prenom FROM user WHERE id_user = ?';
      const [userResult] = await connection.query(userQuery, [signatureData.userId]);
      const userName = userResult ? `${userResult.prenom} ${userResult.nom}` : 'Unknown User';
      
      // Construiește obiectul complet de semnătură conform standardului CSC
      const completeSignatureData = {
        cscSignature: signatures[0], // Obiectul complet de semnătură
        documentHash: hashValue.toString('base64'),
        hashAlgorithm: 'SHA256',
        signatureAlgorithm: 'RSA',
        timestamp: new Date().toISOString(),
        credentialId: "demo-credential",
        userInfo: {
          userId: signatureData.userId,
          documentId: signatureData.documentId,
          documentName: signatureData.documentName
        }
      };
      
      await connection.query(
        `INSERT INTO document_signatures 
         (signature_id, document_id, document_path, document_name, user_id, user_name, signature_data, signature_type, signed_at, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'csc_digital', NOW(), NOW())`,
        [
          `csc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          signatureData.documentId,
          signatureData.documentPath,
          signatureData.documentName,
          signatureData.userId,
          userName,
          JSON.stringify(completeSignatureData)
        ]
      );
      
      connection.release();
      
      console.log('CSC signature saved successfully according to v1.0.4.0 standard');
      return { success: true };
    } else {
      console.error('No signatures returned from CSC API');
      return { success: false, error: 'No signature returned from CSC' };
    }
    
  } catch (error) {
    console.error('Error performing CSC signature:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Optimized endpoint that returns all document data in one request
route.get('/document-complete/:documentName', async (req, res) => {
  try {
    const { documentName } = req.params;
    
    if (!req.session.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const connection = await pool.getConnection();
    
    try {
      // Get document details
      const [documents] = await connection.query(
        `SELECT d.*, t.type_name, u.nom as user_name, u.prenom as user_prenom
         FROM table_document d
         LEFT JOIN table_type t ON d.type_id = t.id_type
         LEFT JOIN user u ON d.user_id = u.id_user
         WHERE d.nom_document = ?`,
        [documentName]
      );

      if (documents.length === 0) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      const document = documents[0];
      
      // Get keywords
      const [keywords] = await connection.query(
        `SELECT k.keyword_name 
         FROM table_keyword k
         JOIN table_document_keyword dk ON k.id_keyword = dk.keyword_id
         WHERE dk.document_id = ?`,
        [document.id_document]
      );

      // Get tags
      const [tags] = await connection.query(
        `SELECT t.tag_name 
         FROM table_tag t
         JOIN table_document_tag dt ON t.id_tag = dt.tag_id
         WHERE dt.document_id = ?`,
        [document.id_document]
      );

      // Get versions
      const [versions] = await connection.query(
        `SELECT v.*, t.type_name
         FROM table_version v
         LEFT JOIN table_type t ON v.type_id = t.id_type
         WHERE v.document_id = ?
         ORDER BY v.date_creation DESC`,
        [document.id_document]
      );

      // Log document view
      await connection.query(
        `INSERT INTO table_log (user_id, document_id, action, timestamp) 
         VALUES (?, ?, 'view', NOW())`,
        [req.session.user.id_user, document.id_document]
      );

      // Prepare complete response
      const completeData = {
        success: true,
        document: {
          ...document,
          keywords: keywords.map(k => ({ keyword_name: k.keyword_name })),
          tags: tags.map(t => ({ tag_name: t.tag_name })),
          versions: versions,
          user_name: document.user_name ? `${document.user_prenom} ${document.user_name}` : null
        }
      };

      res.json(completeData);
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error in document-complete endpoint:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Redirect to new statistics service
route.get('/user_stats', async function (req, res) {
  console.log("GET request received at /post_docs/user_stats - redirecting to statistics service");
  // Redirect to new statistics service
  req.url = '/statistics/user_stats';
  req.app._router.handle(req, res);
});

route.get('/user_logs', async function (req, res) {
  console.log("GET request received at /post_docs/user_logs - redirecting to statistics service");
  // Redirect to new statistics service
  req.url = '/statistics/user_logs';
  req.app._router.handle(req, res);
});

module.exports = route