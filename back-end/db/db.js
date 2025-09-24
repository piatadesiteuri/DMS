const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables based on NODE_ENV
// Skip loading .env files in production (Railway) to avoid overriding Railway variables
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ 
        path: '.env.database' 
    });
}

// Debug environment variables
console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('🚨 DB_HOST:', process.env.DB_HOST, '(source: unknown)');
console.log('✅ MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('✅ MYSQL_URL:', process.env.MYSQL_URL);
console.log('DB_USER:', process.env.DB_USER);
console.log('MYSQL_USER:', process.env.MYSQL_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT_SET');
console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '***SET***' : 'NOT_SET');
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);

// Force override DB_HOST if we're in production and have MYSQL_HOST
if (process.env.NODE_ENV === 'production' && process.env.MYSQL_HOST && process.env.DB_HOST === 'localhost') {
    console.log('🔧 OVERRIDING DB_HOST in production!');
    process.env.DB_HOST = process.env.MYSQL_HOST;
    console.log('🔧 DB_HOST after override:', process.env.DB_HOST);
}

// Database configuration - prioritize Railway environment variables
const dbConfig = {
    host: process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway',
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 // Increase timeout to 30 seconds
};

// Force railway database in production for Railway deployment
if (process.env.NODE_ENV === 'production') {
    console.log('🔧 FORCING railway database in production!');
    dbConfig.database = 'railway';
}

console.log('🔧 Final database config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
});

// If MYSQL_URL is provided, parse it
if (process.env.MYSQL_URL) {
    try {
        const url = new URL(process.env.MYSQL_URL);
        dbConfig.host = url.hostname;
        dbConfig.port = url.port || 3306;
        dbConfig.user = url.username;
        dbConfig.password = url.password;
        dbConfig.database = url.pathname.slice(1); // Remove leading slash
        console.log('🔗 Using MYSQL_URL for connection');
    } catch (error) {
        console.log('⚠️ Failed to parse MYSQL_URL:', error.message);
    }
}

console.log('🔧 Final Database Config:');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Password:', dbConfig.password ? '***SET***' : 'NOT_SET');
console.log('Database:', dbConfig.database);

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to database at', dbConfig.host);
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
        // Don't throw the error, just log it
    });

const sessionStore = new MySQLStore({
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
    },
    expiration: 86400000,
    ...dbConfig
});

// Create tables if they don't exist
const createTablesQuery = `
  CREATE TABLE IF NOT EXISTS user (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    accepted BOOLEAN DEFAULT FALSE,
    upload BOOLEAN DEFAULT FALSE,
    download BOOLEAN DEFAULT FALSE,
    print BOOLEAN DEFAULT FALSE,
    diffuse BOOLEAN DEFAULT FALSE,
    roles VARCHAR(255),
    institution_id INT
  );

  CREATE TABLE IF NOT EXISTS institutions (
    id_institution INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action ENUM('login', 'logout', 'failed_login', 'password_change', 'profile_update') NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS notification_requests (
    id_request INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    request_type ENUM('upload_request', 'storage_upgrade') NOT NULL,
    current_usage DECIMAL(10,2) NOT NULL,
    plan_limit DECIMAL(10,2) NOT NULL,
    file_size DECIMAL(10,2),
    required_space DECIMAL(10,2),
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS document_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    folder_path VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    institution_id INT DEFAULT NULL,
    FOREIGN KEY (institution_id) REFERENCES institutions(id_institution)
  );

  CREATE TABLE IF NOT EXISTS table_document (
    id_document INT AUTO_INCREMENT PRIMARY KEY,
    nom_document VARCHAR(255) NOT NULL,
    nom_document_original VARCHAR(255),
    type_id INT NOT NULL,
    path VARCHAR(255) NOT NULL,
    mot_cle1 VARCHAR(255),
    mot_cle2 VARCHAR(255),
    mot_cle3 VARCHAR(255),
    mot_cle4 VARCHAR(255),
    mot_cle5 VARCHAR(255),
    date_upload DATETIME NOT NULL,
    commentaire TEXT,
    id_user_source INT NOT NULL,
    file_size BIGINT DEFAULT 0,
    first_page LONGTEXT,
    FOREIGN KEY (id_user_source) REFERENCES user(id_user),
    FOREIGN KEY (type_id) REFERENCES document_types(id)
  );

  -- Document versions table (no FK to table_document to keep deleted versions)
  CREATE TABLE IF NOT EXISTS document_versions (
    id_version INT AUTO_INCREMENT PRIMARY KEY,
    id_document INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    type_id INT NOT NULL,
    version_number INT NOT NULL,
    change_summary TEXT,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (created_by) REFERENCES user(id_user),
    FOREIGN KEY (type_id) REFERENCES document_types(id)
  );

  -- Store versions moved to recycle bin (soft-delete)
  CREATE TABLE IF NOT EXISTS deleted_document_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_document INT NOT NULL,
    id_version INT,
    id_institution INT,
    file_path VARCHAR(255) NOT NULL,
    version_number INT NOT NULL,
    version_name VARCHAR(255),
    original_document_name VARCHAR(255),
    change_summary TEXT,
    created_by INT,
    created_at DATETIME,
    type_id INT,
    tags JSON NULL,
    keywords JSON NULL,
    comment TEXT NULL,
    metadata_changes JSON NULL,
    first_page LONGTEXT NULL,
    file_size BIGINT DEFAULT 0,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_by INT,
    FOREIGN KEY (id_document) REFERENCES table_document(id_document),
    FOREIGN KEY (created_by) REFERENCES user(id_user),
    FOREIGN KEY (type_id) REFERENCES document_types(id)
  );

  CREATE TABLE IF NOT EXISTS table_tag (
    id_tag INT AUTO_INCREMENT PRIMARY KEY,
    nom_tag VARCHAR(255) NOT NULL UNIQUE,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS document_tags (
    id_document INT NOT NULL,
    id_tag INT NOT NULL,
    added_by INT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_document, id_tag),
    FOREIGN KEY (id_document) REFERENCES table_document(id_document),
    FOREIGN KEY (id_tag) REFERENCES table_tag(id_tag),
    FOREIGN KEY (added_by) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS table_previlege (
    id_previlege INT AUTO_INCREMENT PRIMARY KEY,
    id_user_fk INT NOT NULL,
    nom_doc VARCHAR(255) NOT NULL,
    download BOOLEAN DEFAULT FALSE,
    upload BOOLEAN DEFAULT FALSE,
    print BOOLEAN DEFAULT FALSE,
    comment BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_user_fk) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS table_mot_cle (
    id_mot_cle INT AUTO_INCREMENT PRIMARY KEY,
    id_document INT NOT NULL,
    mot1 VARCHAR(255),
    mot2 VARCHAR(255),
    mot3 VARCHAR(255),
    mot4 VARCHAR(255),
    mot5 VARCHAR(255),
    FOREIGN KEY (id_document) REFERENCES table_document(id_document)
  );

  CREATE TABLE IF NOT EXISTS document_log (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    nom_doc VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    open_count INT DEFAULT 1,
    last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS document_statistics (
    id_statistic INT AUTO_INCREMENT PRIMARY KEY,
    id_document INT,
    id_user INT NOT NULL,
    action_type ENUM('download', 'view', 'upload', 'edit', 'delete', 'share') NOT NULL,
    action_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_document) REFERENCES table_document(id_document),
    FOREIGN KEY (id_user) REFERENCES user(id_user)
  );

  CREATE TABLE IF NOT EXISTS document_drafts (
    id_draft INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    document_name VARCHAR(255),
    document_type VARCHAR(50),
    document_status ENUM('current', 'archived', 'draft') DEFAULT 'draft',
    keywords TEXT,
    comment TEXT,
    selected_tags TEXT,
    folder_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id_user)
  );
`;

// Function to initialize database tables
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Checking database tables...');
        
        // Check if document_versions table exists
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'document_versions'"
        );
        
        if (tables.length === 0) {
            console.log('Creating missing tables...');
            // Split the queries and execute them separately
            const queries = createTablesQuery.split(';').filter(query => query.trim());
            
            for (const query of queries) {
                if (query.trim()) {
                    await connection.query(query);
                }
            }
            
            console.log('Missing tables created successfully');
            
            // Insert default document types if they don't exist
            const [typeCheck] = await connection.query(
                "SELECT COUNT(*) as count FROM document_types"
            );
            
            if (typeCheck[0].count === 0) {
                console.log('Adding default document types...');
                await connection.query(`
                    INSERT INTO document_types (type_name, description) VALUES
                    ('Official Document', 'Official documents and reports'),
                    ('Shared Document', 'Documents shared between users'),
                    ('General Document', 'General purpose documents'),
                    ('Others', 'Other document types')
                `);
                console.log('Default document types added successfully');
            }
        } else {
            console.log('All required tables already exist');
        }
        
        connection.release();
    } catch (error) {
        console.error('Error checking/creating database tables:', error);
        // Don't throw the error, just log it
    }
}

// Initialize database tables when the module is loaded
initializeDatabase().catch(error => {
    console.error('Failed to initialize database tables:', error);
});

////////////////////////querys\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

async function dbCountDocAdded(id_user) {
    try {
        const con = await pool.getConnection();
        const [result] = await con.query('SELECT COUNT(*) AS num FROM table_document WHERE id_user_source = ?', [id_user]);
        con.release();
        return result[0].num;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}

async function dbListDocuments(id_user) {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT nom, prenom, id_user_fk, id_user_source, date_time, nom_doc 
                     FROM (
                         SELECT id_user_fk, id_user_source, date_time, table_document.nom_doc 
                         FROM table_previlege 
                         JOIN table_document ON table_document.nom_doc = table_previlege.nom_doc 
                         WHERE table_previlege.id_user_fk = ?
                     ) AS subquery 
                     JOIN user ON user.id_user = subquery.id_user_source;`;
        const [result] = await con.query(sql, [id_user]);
        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}

async function dbDownloadDocument(id_user, documentId) {
    try {
        const con = await pool.getConnection();

        // First get user's role and institution
        const [userInfo] = await con.query(
            'SELECT roles, institution_id FROM user WHERE id_user = ?',
            [id_user]
        );

        if (!userInfo || userInfo.length === 0) {
            con.release();
            return [];
        }

        const userRole = userInfo[0].roles;
        const userInstitutionId = userInfo[0].institution_id;

        // If user is admin, they can access any document in their institution
        if (userRole === 'admin') {
            if (!userInstitutionId) {
                // Personal admin - only their own documents
                const adminSql = `
                    SELECT td.*, td.nom_document AS nom_doc, td.nom_document_original, td.id_document
                    FROM table_document td
                    WHERE td.id_user_source = ?
                    AND (td.nom_document = ? OR td.nom_document_original = ?)
                `;
                const [result] = await con.query(adminSql, [id_user, documentId, documentId]);
                con.release();
                return result;
            } else {
                // Institutional admin - documents from their institution
                const adminSql = `
                    SELECT td.*, td.nom_document AS nom_doc, td.nom_document_original, td.id_document
                    FROM table_document td
                    JOIN user u ON td.id_user_source = u.id_user
                    WHERE u.institution_id = ?
                    AND (td.nom_document = ? OR td.nom_document_original = ?)
                `;
                const [result] = await con.query(adminSql, [userInstitutionId, documentId, documentId]);
                con.release();
                return result;
            }
        }

        // For non-admin users, allow access to documents from their institution or personal documents
        let sql, params;
        
        if (!userInstitutionId) {
            // Personal user - only their own documents
            sql = `
                SELECT td.*, td.nom_document AS nom_doc, td.nom_document_original, td.id_document
                FROM table_document td
                LEFT JOIN table_previlege tp ON td.nom_document = tp.nom_doc
                WHERE (
                    tp.id_user_fk = ? OR 
                    td.id_user_source = ?
                )
                AND (td.nom_document = ? OR td.nom_document_original = ?)
            `;
            params = [id_user, id_user, documentId, documentId];
        } else {
            // Institutional user - documents from their institution
            sql = `
                SELECT td.*, td.nom_document AS nom_doc, td.nom_document_original, td.id_document
                FROM table_document td
                LEFT JOIN table_previlege tp ON td.nom_document = tp.nom_doc
                LEFT JOIN user u ON td.id_user_source = u.id_user
                WHERE (
                    tp.id_user_fk = ? OR 
                    td.id_user_source = ? OR 
                    u.institution_id = ?
                )
                AND (td.nom_document = ? OR td.nom_document_original = ?)
            `;
            params = [id_user, id_user, userInstitutionId, documentId, documentId];
        }

        console.log("Executing download query with params:", params);
        const [result] = await con.query(sql, params);

        // If document not found with privileges, check if the document exists at all
        if (result.length === 0) {
            console.log("Document not found with privileges, checking if document exists");
            const docCheckSql = `SELECT * FROM table_document WHERE nom_document = ? OR nom_document_original = ?`;
            const [docResult] = await con.query(docCheckSql, [documentId, documentId]);

            if (docResult.length > 0) {
                console.log("Document exists but user doesn't have privileges");
                con.release();
                return [{ error: "No permission" }];
            } else {
                console.log("Document doesn't exist");
                con.release();
                return [];
            }
        }

        console.log("Document found with privileges:", result);
        con.release();
        return result;
    } catch (error) {
        console.error("Error in dbDownloadDocument:", error);
        throw error;
    }
}

async function dbUploadDocument(id_user, filename, type_id, path, mot, dateTime, comment, realname, tags = [], fileSize = null) {
    try {
        console.log("dbUploadDocument called with parameters:", {
            id_user,
            filename,
            type_id,
            path,
            mot,
            dateTime,
            comment,
            realname,
            tags,
            fileSize
        });
        
        const con = await pool.getConnection();
        console.log("Database connection established");
        
        // Check if type_id exists in document_types
        console.log("Checking if type_id exists in document_types:", type_id);
        const [typeResult] = await con.query(
            'SELECT id FROM document_types WHERE id = ?',
            [type_id]
        );

        if (!typeResult || typeResult.length === 0) {
            console.error("Invalid document type_id:", type_id);
            throw new Error('Invalid document type');
        }
        
        console.log("Type_id exists in document_types:", type_id);
        
        // Ensure comment is not null or undefined
        const safeComment = comment || '';
        console.log("Using comment:", safeComment);
        
        // Extract first page from PDF if it's a PDF file
        let firstPageBase64 = null;
        if (filename.toLowerCase().endsWith('.pdf')) {
            try {
                firstPageBase64 = await extractFirstPageFromPDF(path, filename);
                console.log("Successfully extracted first page from PDF");
            } catch (error) {
                console.error("Error extracting first page from PDF:", error);
                // Continue without first page if extraction fails
            }
        }
        
        // Insert document with type_id directly and first_page
        console.log("Inserting document into table_document");
        const [result] = await con.query(
            `INSERT INTO table_document (nom_document, type_id, path, date_upload, comment, id_user_source, nom_document_original, file_size, first_page) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [filename, type_id, path, dateTime, safeComment, id_user, realname, fileSize, firstPageBase64]
        );

        const documentId = result.insertId;
        console.log("Document inserted successfully with ID:", documentId);

        // Add entry to document_log
        console.log("Adding entry to document_log");
        await con.query(
            `INSERT INTO document_log (nom_doc, user_id, open_count, last_opened_at) 
             VALUES (?, ?, 1, ?)`,
            [filename, id_user, dateTime]
        );
        console.log("Document log entry added successfully");

        // Handle keywords if provided
        if (mot && mot.length > 0) {
            console.log("Processing keywords:", mot);
            // Create an object with mot1 through mot5, ensuring all columns exist
            const keywordObj = {
                mot1: '',
                mot2: '',
                mot3: '',
                mot4: '',
                mot5: ''
            };
            
            // Fill in the provided keywords
            mot.slice(0, 5).forEach((keyword, index) => {
                if (keyword) {
                    keywordObj[`mot${index + 1}`] = keyword;
                }
            });

            console.log("Keyword object for insertion:", keywordObj);

            // Insert keywords into table_mot_cle
            console.log("Inserting keywords into table_mot_cle");
            await con.query(
                `INSERT INTO table_mot_cle (id_document, mot1, mot2, mot3, mot4, mot5) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [documentId, keywordObj.mot1, keywordObj.mot2, keywordObj.mot3, keywordObj.mot4, keywordObj.mot5]
            );
            console.log("Keywords inserted successfully");
        }

        // Handle tags if provided
        if (tags && tags.length > 0) {
            console.log("Processing tags:", tags);
            console.log("Tags array length:", tags.length);
            console.log("Tags array content:", JSON.stringify(tags));
            
            for (const tag of tags) {
                try {
                    console.log("Processing tag:", tag);
                    
                    // Handle both string tags and tag objects
                    const tagName = typeof tag === 'string' ? tag : tag.name;
                    const tagId = typeof tag === 'object' && tag.id ? tag.id : null;
                    
                    console.log("Tag name:", tagName);
                    console.log("Tag ID:", tagId);
                    
                    let finalTagId = tagId;
                    
                    // If tag doesn't have an ID or ID is local, try to find it by name
                    if (!finalTagId || finalTagId.toString().startsWith('local-')) {
                        const [existingTagByName] = await con.query(
                            'SELECT id_tag FROM document_tags WHERE tag_name = ?',
                            [tagName]
                        );
                        
                        if (existingTagByName.length > 0) {
                            // Use existing tag ID
                            finalTagId = existingTagByName[0].id_tag;
                            console.log("Found existing tag by name:", finalTagId);
                        } else {
                            // Create new tag
                            console.log("Creating new tag:", tagName);
                            const [newTag] = await con.query(
                                'INSERT INTO document_tags (tag_name, is_predefined, usage_count) VALUES (?, 0, 0)',
                                [tagName]
                            );
                            finalTagId = newTag.insertId;
                            console.log("Created new tag with ID:", finalTagId);
                        }
                    }

                    // Check if relation already exists
                    const [existingRelation] = await con.query(
                        'SELECT id_relation FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
                        [documentId, finalTagId]
                    );
                    console.log("Existing relation check result:", existingRelation);

                    if (existingRelation.length === 0) {
                        // Create tag relation
                        console.log("Creating tag relation for tag ID:", finalTagId);
                        const [insertResult] = await con.query(
                            'INSERT INTO document_tag_relations (id_document, id_tag, added_by, added_date) VALUES (?, ?, ?, ?)',
                            [documentId, finalTagId, id_user, dateTime]
                        );
                        console.log("Tag relation created successfully:", insertResult);

                        // Update tag usage count
                        const [updateResult] = await con.query(
                            'UPDATE document_tags SET usage_count = usage_count + 1 WHERE id_tag = ?',
                            [finalTagId]
                        );
                        console.log("Tag usage count updated:", updateResult);
                    } else {
                        console.log("Tag relation already exists for document:", documentId, "and tag:", finalTagId);
                    }
                } catch (tagError) {
                    console.error("Error processing tag:", tagError);
                    console.error("Tag error details:", {
                        tag: tag,
                        error: tagError.message,
                        stack: tagError.stack
                    });
                    continue;
                }
            }
            console.log("All tags processed successfully");
        } else {
            console.log("No tags provided for document:", documentId);
        }

        con.release();
        console.log("Database connection released");
        return { success: true, documentId };
    } catch (error) {
        console.error("Error in dbUploadDocument:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Add function to extract first page from PDF as PNG data URL (used for thumbnails)
async function extractFirstPageFromPDF(documentPath, filename) {
    const fs = require('fs');
    const fsp = require('fs').promises;
    const path = require('path');
    const pdf2pic = require('pdf2pic');

    try {
        const fullFilePath = path.join(process.cwd(), 'uploads', documentPath, filename);
        console.log('📄 [DB FirstPage] Extracting from:', fullFilePath);

        try {
            await fsp.access(fullFilePath);
        } catch (e) {
            throw new Error(`PDF file not found: ${fullFilePath}`);
        }

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
        if (!first || !first.path || !fs.existsSync(first.path)) {
            console.log('❌ [DB FirstPage] Conversion failed');
            return null;
        }

        const imageBuffer = fs.readFileSync(first.path);
        const b64 = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${b64}`;
        console.log('✅ [DB FirstPage] PNG generated, length:', b64.length);

        // Cleanup
        try { fs.unlinkSync(first.path); } catch {}
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

        return dataUrl;
    } catch (error) {
        console.error('💥 [DB FirstPage] Error:', error);
        return null;
    }
}

async function dbIdReciever(target, filename) {

    try {
        const con = await pool.getConnection();
        console.log(target)
        await con.execute('INSERT INTO table_previlege(id_user_fk,nom_doc,download,upload,print,comment)VALUE(?,?,?,?,?)', [target.id, filename, target.download, target.upload, target.print, target.comment]);
        con.release();


    } catch (error) {
        console.error(error);
        return "fail"
        throw error; // Rethrow the error for the calling function to handle
    }
}

async function dbListUsers(id_user = null) {
    try {
        const con = await pool.getConnection();
        
        // If no id_user provided, return all accepted users
        if (!id_user) {
            const sql = `
                SELECT u.id_user, u.nom, u.prenom, u.email, u.roles, u.verified, u.institution_id, i.name as institution_name 
                FROM user u
                LEFT JOIN institutions i ON u.institution_id = i.id_institution
                WHERE u.accepted = 1
                ORDER BY u.nom, u.prenom`;
            
            const [result] = await con.query(sql);
            con.release();
            return result;
        }
        
        // First get the role of the requesting user
        const [userRole] = await con.query(
            'SELECT roles FROM user WHERE id_user = ?',
            [id_user]
        );

        // Check if user exists
        if (userRole.length === 0) {
            con.release();
            throw new Error('User not found');
        }

        let sql = `
            SELECT u.id_user, u.nom, u.prenom, u.email, u.roles, u.verified, u.institution_id, i.name as institution_name 
            FROM user u
            LEFT JOIN institutions i ON u.institution_id = i.id_institution
            WHERE u.accepted = 1`;

        // Only apply institution_id filter for superadmins
        if (userRole[0] && userRole[0].roles === 'superadmin') {
            // First get the superadmin's institution_id
            const [superadminInstitution] = await con.query(
                'SELECT institution_id FROM user WHERE id_user = ?',
                [id_user]
            );
            
            if (superadminInstitution.length > 0) {
                sql += ` AND u.institution_id = ?`;
            }
        }

        sql += ` ORDER BY u.nom, u.prenom`;

        let queryParams = [];
        if (userRole[0] && userRole[0].roles === 'superadmin') {
            const [superadminInstitution] = await con.query(
                'SELECT institution_id FROM user WHERE id_user = ?',
                [id_user]
            );
            if (superadminInstitution.length > 0) {
                queryParams.push(superadminInstitution[0].institution_id);
            }
        }

        const [result] = await con.query(sql, queryParams);
        con.release();
        return result;
    } catch (error) {
        console.error('Error in dbListUsers:', error);
        throw error;
    }
}

async function dbInsertUser(fname, lname, Email, password) {
    const con = await pool.getConnection();
    try {
        await con.execute("insert into user (prenom,nom,email,password) values(?,?,?,?)", [fname, lname, Email, password])
    }
    catch (err) { return err }
    con.release();

}


async function dbVerifyDocument(id_user, documentId) {
    try {
        const con = await pool.getConnection();
        const sql = 'UPDATE table_document SET isVerfied =1 WHERE id_user_source = ? AND nom_doc = ?;';
        await con.execute(sql, [id_user, documentId]);
        con.release();
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}

async function dbFindUserByEmail(email) {
    try {
        console.log('🔍 dbFindUserByEmail called with email:', email);
        const con = await pool.getConnection();
        console.log('✅ Got database connection for user lookup');

        const [results] = await con.query(`
            SELECT u.*, i.name as institution_name 
            FROM user u 
            LEFT JOIN institutions i ON u.institution_id = i.id_institution 
            WHERE u.email = ?
        `, [email]);
        
        console.log('📊 Query results:', {
            email: email,
            resultCount: results.length,
            userFound: results.length > 0 ? {
                id: results[0].id_user,
                email: results[0].email,
                role: results[0].roles,
                institution_id: results[0].institution_id
            } : null
        });
        
        con.release();
        return results;
    } catch (error) {
        console.error('❌ Error in dbFindUserByEmail:', error.message);
        throw error;
    }
}

async function dbGetUserEmailById(id) {
    const connection = await pool.getConnection();
    const [results] = await connection.query('SELECT email FROM user WHERE id_user = ?', [id]);
    return results
}



async function dbGetUnaceeptedUsers() {
    const con = await pool.getConnection();
    var sql = "select id_user ,email,prenom ,nom from user where accepted = 0";
    const [results] = await con.query(sql);
    con.release();
    return results

}
////////////////////////////////////////////////
async function dbDelUserById(id) {

    const con = await pool.getConnection();
    const sql = "DELETE FROM user WHERE id_user = ?";
    await con.execute(sql, [id]);
    con.release();
}
/////////////////////////////////////////////////////////
async function dbVerifyUserByID(id, upload, print, download) {
    const con = await pool.getConnection();

    if (upload !== undefined && print !== undefined && download !== undefined) {
        // When permissions are provided, update those as well
        await con.execute(
            'UPDATE user SET verified = 1, accepted = 1, upload = ?, print = ?, download = ? WHERE id_user = ?',
            [upload, print, download, id]
        );
    } else {
        // Just update the verified and accepted status
        await con.execute('UPDATE user SET verified = 1, accepted = 1 WHERE id_user = ?', [id]);
    }

    con.release();
}
async function dbAddPrevileges(id, diffuse, upload, download, print, roles) {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Update user permissions
        await connection.query(
            'UPDATE user SET diffuse = ?, upload = ?, download = ?, print = ?, roles = ? WHERE id_user = ?',
            [diffuse, upload, download, print, roles, id]
        );

        // Get all existing documents
        const [documents] = await connection.query('SELECT nom_document FROM table_document');
        
        // Add privileges for each document
        for (const doc of documents) {
            await connection.query(
                'INSERT INTO table_previlege (id_user_fk, nom_doc, download, upload, print) VALUES (?, ?, ?, ?, ?)',
                [id, doc.nom_document, download, upload, print]
            );
        }

        return true;
    } catch (error) {
        console.error('Error adding privileges:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}
async function dbCheckVerified(email) {
    const con = await pool.getConnection();
    const [results] = await con.query('SELECT verified, accepted FROM user WHERE email = ?', [email]);
    con.release();
    return results;
}
async function dbGetCount() {
    const con = await pool.getConnection();
    var sql = "SELECT COUNT(*) AS accepted_users FROM user WHERE accepted = 1;";
    const ver = await con.query(sql);
    var sql2 = "SELECT COUNT(*) AS unaccepted_users FROM user WHERE accepted = 0;";
    const unver = await con.query(sql2);
    con.release();
    return [ver[0], unver[0]]

}
async function dbGetAcceptedUsers() {
    const con = await pool.getConnection();
    var sql = "select id_user ,email,prenom ,nom,upload,diffuse,print,download,roles,verified from user where accepted = 1";
    const [results] = await con.query(sql);
    con.release();
    return results
}
async function dbSearch(name, type, keyword, author, startDate, endDate, userId) {
    const con = await pool.getConnection();
    try {
        console.log("dbSearch called with params:", { name, type, keyword, author, startDate, endDate, userId });

        // Obține instituția utilizatorului curent
        const [userInstitution] = await con.query(
            'SELECT institution_id FROM user WHERE id_user = ?',
            [userId]
        );

        if (!userInstitution.length) {
            throw new Error('User not found or no institution assigned');
        }

        const userInstitutionId = userInstitution[0].institution_id;

        let query = `
            SELECT DISTINCT td.id_document, td.nom_document, td.nom_document_original, 
                   td.type_id, td.path, td.date_upload, td.comment, td.id_user_source,
                   td.isVerfied, td.file_size, td.nom_document AS nom_doc, 
                   DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as date_time,
                   u.nom, u.prenom,
                   tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
                   dt.type_name as type_name,
                   GROUP_CONCAT(
                       JSON_OBJECT(
                           'id_tag', dtags.id_tag,
                           'tag_name', dtags.tag_name,
                           'is_predefined', dtags.is_predefined
                       )
                   ) as tags
            FROM table_document td
            JOIN user u ON u.id_user = td.id_user_source
            LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
            LEFT JOIN document_types dt ON td.type_id = dt.id
            LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
            LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
            WHERE u.institution_id = ?`;

        const params = [userInstitutionId];

        if (name) {
            query += ` AND td.nom_document LIKE ?`;
            params.push(`%${name}%`);
        }
        if (type) {
            query += ` AND td.type_id = ?`;
            params.push(type);
        }
        if (keyword) {
            query += ` AND (
                td.comment LIKE ? OR 
                td.nom_document_original LIKE ? OR
                tmc.mot1 LIKE ? OR 
                tmc.mot2 LIKE ? OR 
                tmc.mot3 LIKE ? OR 
                tmc.mot4 LIKE ? OR 
                tmc.mot5 LIKE ?
            )`;
            const keywordParam = `%${keyword}%`;
            params.push(keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam);
        }
        if (author) {
            query += ` AND (
                u.nom LIKE ? OR 
                u.prenom LIKE ? OR
                CONCAT(u.prenom, ' ', u.nom) LIKE ?
            )`;
            const authorParam = `%${author}%`;
            params.push(authorParam, authorParam, authorParam);
        }
        if (startDate) {
            query += ` AND DATE(td.date_upload) >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND DATE(td.date_upload) <= ?`;
            params.push(endDate);
        }

        // Add GROUP BY to handle the GROUP_CONCAT
        query += ` GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                   td.date_upload, td.comment, td.id_user_source, u.nom, u.prenom,
                   tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5, dt.type_name`;

        console.log("Executing search query:", query);
        console.log("With parameters:", params);
        
        const [result] = await con.query(query, params);
        console.log(`Search found ${result.length} results`);

        // Process the results to parse the tags JSON
        const processedResult = result.map(doc => ({
            ...doc,
            tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
        }));

        con.release();
        return processedResult;
    } catch (error) {
        console.error("Error in dbSearch:", error);
        if (con) con.release();
        throw error;
    }
}
async function dbListDocumentsNV() {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT user.nom, user.prenom, id_user_source, date_time, nom_doc,commentaire,path
                     FROM table_document
                     JOIN user ON   table_document.id_user_source = user.id_user WHERE table_document.isVerfied = 0;`;
        const [result] = await con.query(sql);
        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}


async function dbListDocumentsReceved(id_user) {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT DISTINCT u.nom, u.prenom, p.id_user_fk, td.id_user_source, 
                    DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as date_time, 
                    td.nom_document as nom_doc, td.comment as commentaire, td.path,
                    tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
                    dv.id_version, dv.version_number, dv.file_path as version_path,
                    GROUP_CONCAT(
                        JSON_OBJECT(
                            'id_tag', dtags.id_tag,
                            'tag_name', dtags.tag_name,
                            'is_predefined', dtags.is_predefined
                        )
                    ) as tags
                     FROM table_previlege p
                     JOIN table_document td ON td.nom_document = p.nom_doc 
                     JOIN user u ON u.id_user = td.id_user_source
                     LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
                     LEFT JOIN document_versions dv ON td.id_document = dv.id_document AND dv.is_current = 1
                     LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
                     LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
                     WHERE p.id_user_fk = ? AND td.isVerfied = 1
                     GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                              td.date_upload, td.comment, td.id_user_source, u.nom, u.prenom,
                              tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
                              dv.id_version, dv.version_number, dv.file_path`;
        const [result] = await con.query(sql, [id_user]);

        // Process the results to parse the tags JSON
        const processedResult = result.map(doc => ({
            ...doc,
            tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
        }));

        console.log("dbListDocumentsReceved result for user", id_user, ":", processedResult);
        con.release();
        return processedResult;
    } catch (error) {
        console.error("Error in dbListDocumentsReceved:", error);
        throw error;
    }
}
async function dbFrequentlyOpenedDocuments(userId) {
    try {
        const con = await pool.getConnection();
        
        // First check if the user has any document logs
        const checkQuery = "SELECT COUNT(*) as count FROM document_log WHERE user_id = ?";
        const [checkResult] = await con.query(checkQuery, [userId]);
        console.log("Number of document logs for user:", checkResult[0].count);
        
        if (checkResult[0].count === 0) {
            console.log("No document logs found for user:", userId);
            con.release();
            return [];
        }
        
        // Execute a query to get frequently opened documents for the user with document type name
        const query = `      
            SELECT 
                dl.nom_doc,
                dl.open_count,
                COALESCE(dt.type_name, 'Unknown') as type,
                td.path,
                td.nom_document_original,
                td.id_document,
                td.comment as commentaire,
                dl.last_opened_at
            FROM document_log dl
            LEFT JOIN table_document td ON td.nom_document = dl.nom_doc 
                OR td.nom_document_original = dl.nom_doc
            LEFT JOIN document_types dt ON td.type_id = dt.id
            WHERE dl.user_id = ? 
            AND dl.last_opened_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY dl.nom_doc, dl.open_count, dt.type_name, td.path, td.nom_document_original, 
                     td.id_document, td.comment, dl.last_opened_at
            ORDER BY dl.last_opened_at DESC, dl.open_count DESC
            LIMIT 5;`;
        
        console.log("Executing frequently used documents query for user:", userId);
        console.log("Query:", query);
        
        const [rows] = await con.query(query, [userId]);
        console.log("Query result:", rows);
        
        con.release();

        // Process the query result and return the data
        return rows.map(row => ({
            nom_document: row.nom_doc,
            openCount: row.open_count,
            type: row.type,
            path: row.path,
            originalName: row.nom_document_original,
            id_document: row.id_document,
            commentaire: row.commentaire,
            lastOpened: row.last_opened_at
        }));
    } catch (error) {
        console.error("Error occurred while fetching frequently opened documents:", error);
        console.error("Error details:", {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        throw error;
    }
}

async function dbDocumentLog(nom_doc, id_user) {
    const con = await pool.getConnection();
    try {
        // Check if the row already exists
        const [rows] = await con.query(`SELECT * FROM document_log WHERE nom_doc = ? AND user_id = ?`, [nom_doc, id_user]);

        if (rows.length > 0) {
            // If the row exists, update the open_count and last_opened_at
            await con.execute(
                `UPDATE document_log 
                 SET open_count = open_count + 1, 
                     last_opened_at = NOW() 
                 WHERE nom_doc = ? AND user_id = ?`, 
                [nom_doc, id_user]
            );
        } else {
            // If the row doesn't exist, insert a new row with current timestamp
            await con.execute(
                `INSERT INTO document_log (nom_doc, user_id, open_count, last_opened_at) 
                 VALUES (?, ?, 1, NOW())`, 
                [nom_doc, id_user]
            );
        }
    } catch (error) {
        console.error("Error occurred while updating or inserting document log:", error);
        throw error;
    } finally {
        con.release();
    }
}

async function dbGetPath(nom_doc) {
    const con = await pool.getConnection();
    try {
        const sql = `SELECT path FROM table_document WHERE nom_doc = ?  `;
        const [result] = await con.query(sql, [nom_doc]);
        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}


async function dbAllDocs() {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT table_document.id_document, table_document.nom_document, table_document.nom_document_original, 
                     table_document.type_id, table_document.path, table_document.date_upload, table_document.comment, 
                     table_document.id_user_source, table_document.isVerfied, table_document.file_size,
                     user.nom, user.prenom, user.email, user.id_user 
                     FROM table_document JOIN user ON table_document.id_user_source = user.id_user ;`;
        const [result] = await con.query(sql);

        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error; // Rethrow the error for the calling function to handle
    }
}


async function dbGetPrevileges(id_user, nom_document) {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT * FROM table_previlege WHERE id_user_fk = ? AND nom_doc = ?;`;
        const [result] = await con.query(sql, [id_user, nom_document]);
        console.log("Retrieved privileges for user", id_user, "and document", nom_document, ":", result);
        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }

}
async function dbPermaPrevileges(id_user) {
    try {
        const con = await pool.getConnection();
        const sql = `SELECT download, upload,roles, print,diffuse FROM user WHERE id_user = ?;`;
        const [result] = await con.query(sql, [id_user]);
        con.release();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
async function dbGetUserNameById(id_user) {
    const con = await pool.getConnection();
    const [results] = await con.query('SELECT nom, prenom FROM user WHERE id_user = ?', [id_user]);
    con.release();
    return results;
}

async function dbMyDocuments(id_user) {
    try {
        const con = await pool.getConnection();
        // Folosim alias pentru nom_document ca nom_doc pentru a fi compatibil cu frontend-ul
        const sql = `SELECT td.id_document, td.nom_document, td.nom_document_original, 
                         td.type_id, td.path, td.date_upload, td.comment, td.id_user_source,
                         td.isVerfied, td.file_size, td.nom_document AS nom_doc, 
                         DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as date_time,
                         u.nom, u.prenom,
                         tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
                         GROUP_CONCAT(
                             JSON_OBJECT(
                                 'id_tag', dtags.id_tag,
                                 'tag_name', dtags.tag_name,
                                 'is_predefined', dtags.is_predefined
                             )
                         ) as tags
                         FROM table_document td
                         JOIN user u ON u.id_user = td.id_user_source
                         LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
                         LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
                         LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
                         WHERE td.id_user_source = ? AND td.isVerfied = 1
                         GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                                  td.date_upload, td.comment, td.id_user_source, u.nom, u.prenom,
                                  tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5`;
        const [result] = await con.query(sql, [id_user]);

        // Process the results to parse the tags JSON
        const processedResult = result.map(doc => ({
            ...doc,
            tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
        }));

        console.log("MyDocuments for user", id_user, ":", processedResult);
        con.release();
        return processedResult;
    } catch (error) {
        console.error("Error in dbMyDocuments:", error);
        throw error;
    }
}

// Function to archive a document version
async function dbArchiveDocumentVersion(documentId, versionId, userId) {
    try {
        const con = await pool.getConnection();
        console.log("Archiving document version:", versionId);

        // Get the version details
        const [versionResult] = await con.query(
            `SELECT dv.*, td.nom_document_original, td.type_id 
             FROM document_versions dv
             JOIN table_document td ON dv.id_document = td.id_document
             WHERE dv.id_version = ? AND dv.id_document = ?`,
            [versionId, documentId]
        );

        if (!versionResult || versionResult.length === 0) {
            throw new Error('Version not found');
        }

        const version = versionResult[0];
        const archivePath = path.join(__dirname, '..', 'uploads', 'Archive', version.type_id);
        
        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath, { recursive: true });
        }

        // Create archived filename with version number
        const fileExtension = version.file_path.split('.').pop();
        const baseFilename = version.nom_document_original.substring(0, version.nom_document_original.lastIndexOf('.'));
        const archivedFilename = `${baseFilename}_v${version.version_number}_archived.${fileExtension}`;
        const archivedFilePath = path.join(archivePath, archivedFilename);

        // Copy file to archive
        fs.copyFileSync(version.file_path, archivedFilePath);
        console.log("File copied to archive:", archivedFilePath);

        // Update version record with archive information
        await con.execute(
            `UPDATE document_versions 
             SET is_archived = 1, 
                 archive_path = ?, 
                 archive_filename = ?,
                 archived_by = ?,
                 archived_at = CURRENT_TIMESTAMP
             WHERE id_version = ?`,
            [archivePath, archivedFilename, userId, versionId]
        );

        con.release();
        return {
            success: true,
            archivePath: archivedFilePath,
            archiveFilename: archivedFilename
        };
    } catch (error) {
        console.error("Error in dbArchiveDocumentVersion:", error);
        throw error;
    }
}

// Function to get archived documents
async function dbGetArchivedDocuments(userId) {
    try {
        const con = await pool.getConnection();
        
        // Get all archived documents with user information
        const query = `
            SELECT 
                dv.id_version,
                dv.id_document,
                dv.version_number,
                dv.file_path,
                dv.archive_path,
                dv.archive_filename,
                dv.change_summary,
                dv.created_at,
                dv.archived_at,
                td.nom_document_original,
                td.type_id,
                u.nom as created_by_lastname,
                u.prenom as created_by_firstname,
                au.nom as archived_by_lastname,
                au.prenom as archived_by_firstname,
                td.id_user_source
            FROM document_versions dv
            JOIN table_document td ON dv.id_document = td.id_document
            JOIN user u ON dv.created_by = u.id_user
            LEFT JOIN user au ON dv.archived_by = au.id_user
            WHERE dv.is_archived = 1
            AND (td.id_user_source = ? OR EXISTS (
                SELECT 1 FROM table_previlege tp 
                WHERE tp.nom_doc = td.nom_document 
                AND tp.id_user_fk = ?
            ))
            ORDER BY dv.archived_at DESC`;
        
        const [results] = await con.query(query, [userId, userId]);
        con.release();

        // Process the results to ensure correct paths
        const processedResults = results.map(doc => ({
            ...doc,
            archive_path: doc.archive_path.replace(
                '/Users/pds/Desktop/Document_App/EDMS-main',
                '/Users/pds/Desktop/Test_App/EDMS-main'
            )
        }));

        // Group documents by user ownership
        const groupedDocs = {
            allDocuments: processedResults,
            userDocuments: processedResults.filter(doc => doc.id_user_source === userId)
        };

        return groupedDocs;
    } catch (error) {
        console.error("Error in dbGetArchivedDocuments:", error);
        throw error;
    }
}

// Modify dbAddDocumentVersion to archive the previous version and preserve metadata
async function dbAddDocumentVersion(documentId, userId, filePath, changeSummary, tags) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get the current version before updating
        const [currentVersions] = await connection.query(
            'SELECT * FROM document_versions WHERE id_document = ? AND is_current = 1',
            [documentId]
        );

        // Get the document's metadata from table_document
        const [document] = await connection.query(
            `SELECT td.*, tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
             GROUP_CONCAT(DISTINCT dt.tag_name) as tags
             FROM table_document td
             LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
             LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
             LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
             WHERE td.id_document = ?
             GROUP BY td.id_document`,
            [documentId]
        );

        if (!document || document.length === 0) {
            throw new Error('Document not found');
        }

        const docData = document[0];

        // Get current max version number
        const [maxVersion] = await connection.query(
            'SELECT MAX(version_number) as max_version FROM document_versions WHERE id_document = ?',
            [documentId]
        );

        const newVersionNumber = (maxVersion[0].max_version || 0) + 1;

        // If there's a current version, mark it as not current
        if (currentVersions && currentVersions.length > 0) {
            const current = currentVersions[0];
            await connection.query(
                'UPDATE document_versions SET is_current = 0 WHERE id_version = ?',
                [current.id_version]
            );
        } else {
            // If no current version exists, create version 1 from the original document
            await connection.query(
                `INSERT INTO document_versions 
                 (id_document, created_by, version_number, file_path, change_summary, is_current, 
                  created_at, type_id) 
                 VALUES (?, ?, 1, ?, 'Initial version', 0, NOW(), ?)`,
                [documentId, userId, docData.path, docData.type_id]
            );
        }

        // Insert new version with all metadata
        const [result] = await connection.query(
            `INSERT INTO document_versions 
             (id_document, created_by, version_number, file_path, change_summary, is_current, 
              created_at, type_id) 
             VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
            [documentId, userId, newVersionNumber, filePath, changeSummary, docData.type_id]
        );

        // Always preserve existing tags if no new tags are provided
        if (!tags || tags.length === 0) {
            const [existingTags] = await connection.query(
                'SELECT id_tag FROM document_tag_relations WHERE id_document = ?',
                [documentId]
            );

            // Re-insert existing tags with the new user as added_by
            for (const tag of existingTags) {
                await connection.query(
                    'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                    [documentId, tag.id_tag, userId]
                );
            }
        } else {
            // If new tags are provided, update them
            await connection.query(
                'DELETE FROM document_tag_relations WHERE id_document = ?',
                [documentId]
            );

            for (const tag of tags) {
                await connection.query(
                    'INSERT INTO document_tag_relations (id_document, id_tag, added_by) VALUES (?, ?, ?)',
                    [documentId, tag.id, userId]
                );
            }
        }

        // Always preserve existing keywords
        const keywords = [
            docData.mot1,
            docData.mot2,
            docData.mot3,
            docData.mot4,
            docData.mot5
        ].filter(keyword => keyword && keyword.trim() !== '');

        // Update keywords in table_mot_cle
        await connection.query(
            `INSERT INTO table_mot_cle 
             (id_document, mot1, mot2, mot3, mot4, mot5) 
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             mot1 = VALUES(mot1),
             mot2 = VALUES(mot2),
             mot3 = VALUES(mot3),
             mot4 = VALUES(mot4),
             mot5 = VALUES(mot5)`,
            [documentId, ...keywords, ...Array(5 - keywords.length).fill(null)]
        );

        await connection.commit();
        return result.insertId;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Functions for tags management
async function dbGetAllTags() {
    try {
        const con = await pool.getConnection();

        // Get all tags with usage count
        const [tags] = await con.query(
            `SELECT id_tag, tag_name, is_predefined, usage_count 
            FROM document_tags
            ORDER BY usage_count DESC, tag_name ASC`
        );

        con.release();
        return tags;
    } catch (error) {
        console.error("Error in dbGetAllTags:", error);
        throw error;
    }
}

async function dbCreateTag(tagName, userId) {
    try {
        const con = await pool.getConnection();

        // Check if tag already exists
        const [existingTag] = await con.query(
            'SELECT id_tag FROM document_tags WHERE tag_name = ?',
            [tagName]
        );

        if (existingTag.length > 0) {
            con.release();
            return { success: false, error: "Tag already exists", tagId: existingTag[0].id_tag };
        }

        // Create new tag
        const [result] = await con.execute(
            `INSERT INTO document_tags (tag_name, created_by, is_predefined, usage_count) 
            VALUES (?, ?, 0, 0)`,
            [tagName, userId]
        );

        con.release();
        return { success: true, tagId: result.insertId };
    } catch (error) {
        console.error("Error in dbCreateTag:", error);
        throw error;
    }
}

async function dbAddTagToDocument(documentId, tagId, userId) {
    try {
        console.log(`dbAddTagToDocument called with documentId: ${documentId}, tagId: ${tagId}, userId: ${userId}`);
        console.log(`Types: documentId (${typeof documentId}), tagId (${typeof tagId}), userId (${typeof userId})`);

        // Convert parameters to integers to ensure proper type
        const docId = parseInt(documentId, 10);
        const tId = parseInt(tagId, 10);
        const uId = parseInt(userId, 10);

        console.log(`Converted values: docId (${docId}), tId (${tId}), uId (${uId})`);

        if (isNaN(docId) || isNaN(tId) || isNaN(uId)) {
            console.error('Invalid parameter types: one or more parameters could not be converted to integers');
            return { success: false, error: "Invalid parameter types" };
        }

        const con = await pool.getConnection();
        console.log("Database connection obtained");

        // Check if relation already exists
        console.log("Checking if tag relation already exists");
        const [existingRelation] = await con.query(
            'SELECT id_relation FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
            [docId, tId]
        );
        console.log(`Found ${existingRelation.length} existing relations`);

        if (existingRelation.length > 0) {
            console.log("Tag already applied to this document, relation exists");
            con.release();
            return { success: false, error: "Tag already applied to this document" };
        }

        // Verify document exists
        console.log("Verifying document exists in database");
        const [documentCheck] = await con.query(
            'SELECT id_document FROM table_document WHERE id_document = ?',
            [docId]
        );

        if (documentCheck.length === 0) {
            console.error(`Document with ID ${docId} not found in database`);
            con.release();
            return { success: false, error: "Document not found" };
        }
        console.log(`Document verified, found ${documentCheck.length} records:`, documentCheck);

        // Verify tag exists
        console.log("Verifying tag exists in database");
        const [tagCheck] = await con.query(
            'SELECT id_tag FROM document_tags WHERE id_tag = ?',
            [tId]
        );

        if (tagCheck.length === 0) {
            console.error(`Tag with ID ${tId} not found in database`);
            con.release();
            return { success: false, error: "Tag not found" };
        }
        console.log(`Tag verified, found ${tagCheck.length} records:`, tagCheck);

        // Create relation
        console.log(`Creating new tag-document relation between document ${docId} and tag ${tId}`);
        try {
            const [insertResult] = await con.execute(
                `INSERT INTO document_tag_relations (id_document, id_tag, added_by) 
                VALUES (?, ?, ?)`,
                [docId, tId, uId]
            );
            console.log("Relation insert result:", insertResult);

            // Verify the relation was created
            const [verifyRelation] = await con.query(
                'SELECT * FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
                [docId, tId]
            );
            console.log(`Verification after insert: Found ${verifyRelation.length} relations:`, verifyRelation);

            // Update usage count
            console.log("Updating tag usage count");
            await con.execute(
                'UPDATE document_tags SET usage_count = usage_count + 1 WHERE id_tag = ?',
                [tId]
            );
            console.log("Tag usage count updated");

            con.release();
            console.log("Database connection released");
            return { success: true, relationId: insertResult.insertId };
        } catch (insertError) {
            console.error("Error during relation insert:", insertError);

            // Check if there's a constraint violation or other SQL error
            if (insertError.code) {
                console.error(`SQL Error Code: ${insertError.code}`);
            }

            con.release();
            throw insertError;
        }
    } catch (error) {
        console.error("Error in dbAddTagToDocument:", error);
        throw error;
    }
}

async function dbGetDocumentTags(documentId) {
    try {
        console.log(`dbGetDocumentTags called for document ID: ${documentId}`);

        const con = await pool.getConnection();

        // First check if document exists in table_document
        const [document] = await con.query(
            `SELECT id_document FROM table_document WHERE id_document = ?`,
            [documentId]
        );

        if (!document || document.length === 0) {
            console.log(`Document with ID ${documentId} not found in table_document`);
            con.release();
            return [];
        }

        // Get all tags for a document with a single query
        const [tags] = await con.query(
            `SELECT 
                dt.id_tag,
                dt.tag_name,
                dt.is_predefined,
                dt.usage_count,
                u.nom as added_by_lastname,
                u.prenom as added_by_firstname,
            DATE_FORMAT(dtr.added_date, '%Y-%m-%d %H:%i:%s') as added_date 
            FROM document_tag_relations dtr
            JOIN document_tags dt ON dtr.id_tag = dt.id_tag
            JOIN user u ON dtr.added_by = u.id_user
            WHERE dtr.id_document = ?
            ORDER BY dt.is_predefined DESC, dt.tag_name ASC`,
            [documentId]
        );

        console.log(`Retrieved ${tags.length} tags for document ID ${documentId}:`, tags);

        // Transform tags into the expected format
        const formattedTags = tags.map(tag => ({
            id_tag: tag.id_tag,
            tag_name: tag.tag_name,
            is_predefined: tag.is_predefined === 1,
            usage_count: tag.usage_count,
            added_by: {
                firstname: tag.added_by_firstname,
                lastname: tag.added_by_lastname
            },
            added_date: tag.added_date
        }));

        con.release();
        return formattedTags;
    } catch (error) {
        console.error("Error in dbGetDocumentTags:", error);
        throw error;
    }
}

async function dbRemoveTagFromDocument(documentId, tagId) {
    try {
        const con = await pool.getConnection();

        // Remove relation
        await con.execute(
            'DELETE FROM document_tag_relations WHERE id_document = ? AND id_tag = ?',
            [documentId, tagId]
        );

        // Update usage count
        await con.execute(
            'UPDATE document_tags SET usage_count = usage_count - 1 WHERE id_tag = ? AND usage_count > 0',
            [tagId]
        );

        con.release();
        return { success: true };
    } catch (error) {
        console.error("Error in dbRemoveTagFromDocument:", error);
        throw error;
    }
}

// Function to search documents by tags
async function dbSearchDocumentsByTags(tagIds, userId, name = null, type_id = null, keyword = null, author = null, startDate = null, endDate = null) {
    try {
        const con = await pool.getConnection();

        // Get user's institution
        const [userInstitution] = await con.query(
            'SELECT institution_id FROM user WHERE id_user = ?',
            [userId]
        );

        if (!userInstitution.length) {
            throw new Error('User not found or no institution assigned');
        }

        const userInstitutionId = userInstitution[0].institution_id;

        let sql = `
            SELECT DISTINCT td.id_document, td.nom_document, td.nom_document_original, 
            td.type_id, td.path, td.date_upload, td.comment, td.id_user_source,
            td.isVerfied, td.file_size, td.nom_document AS nom_doc, 
            DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as date_time,
            u.nom, u.prenom,
            tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
            dt.type_name as type_name
            FROM table_document td
            JOIN user u ON u.id_user = td.id_user_source
            LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
            JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
            LEFT JOIN document_types dt ON td.type_id = dt.id
            WHERE dtr.id_tag IN (?)
            AND u.institution_id = ?
            AND td.isVerfied = 1`;

        const params = [tagIds, userInstitutionId];

        // Add additional filters
        if (name) {
            sql += ` AND td.nom_document LIKE ?`;
            params.push(`%${name}%`);
        }
        if (type_id) {
            sql += ` AND td.type_id = ?`;
            params.push(type_id);
        }
        if (keyword) {
            sql += ` AND (
                td.comment LIKE ? OR 
                td.nom_document_original LIKE ? OR
                tmc.mot1 LIKE ? OR 
                tmc.mot2 LIKE ? OR 
                tmc.mot3 LIKE ? OR 
                tmc.mot4 LIKE ? OR 
                tmc.mot5 LIKE ?
            )`;
            const keywordParam = `%${keyword}%`;
            params.push(keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam);
        }
        if (author) {
            sql += ` AND (
                u.nom LIKE ? OR 
                u.prenom LIKE ? OR
                CONCAT(u.prenom, ' ', u.nom) LIKE ?
            )`;
            const authorParam = `%${author}%`;
            params.push(authorParam, authorParam, authorParam);
        }
        if (startDate) {
            sql += ` AND DATE(td.date_upload) >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND DATE(td.date_upload) <= ?`;
            params.push(endDate);
        }

        console.log("Executing tag search query:", sql);
        console.log("With parameters:", params);

        const [documents] = await con.query(sql, params);
        con.release();
        return documents;
    } catch (error) {
        console.error("Error in dbSearchDocumentsByTags:", error);
        throw error;
    }
}

async function dbUpdateDocumentFilename(documentId, newFilename) {
    try {
        const con = await pool.getConnection();
        
        // Get the current document details
        const [docResults] = await con.query(
            'SELECT nom_document, nom_document_original FROM table_document WHERE id_document = ?',
            [documentId]
        );
        
        if (!docResults || docResults.length === 0) {
            throw new Error('Document not found');
        }
        
        const currentDoc = docResults[0];
        
        // Update the document with new filename while preserving the original name
        await con.execute(
            'UPDATE table_document SET nom_document = ?, nom_document_original = ? WHERE id_document = ?',
            [newFilename, currentDoc.nom_document_original || currentDoc.nom_document, documentId]
        );
        
        con.release();
        return { success: true };
    } catch (error) {
        console.error("Error in dbUpdateDocumentFilename:", error);
        throw error;
    }
}

async function dbUpdateNotificationStatus(notificationId, userId, isRead) {
    try {
        const con = await pool.getConnection();
        await con.execute(
            'UPDATE notifications SET is_read = ? WHERE id_notification = ? AND user_id = ?',
            [isRead, notificationId, userId]
        );
        con.release();
        return { success: true };
    } catch (error) {
        console.error("Error in dbUpdateNotificationStatus:", error);
        throw error;
    }
}

async function dbGetDocumentVersions(documentId) {
    try {
        const con = await pool.getConnection();
        let docId = null;

        // Check if documentId is numeric
        if (!isNaN(parseInt(documentId, 10))) {
            docId = parseInt(documentId, 10);
            console.log(`Document ID is numeric: ${docId}`);
        } else {
            // If not numeric, look up document by name to get ID
            console.log(`Looking up document ID by name: "${documentId}"`);
            try {
                const [docResults] = await con.query(
                    'SELECT id_document FROM table_document WHERE nom_document = ? OR nom_document_original = ?',
                    [documentId, documentId]
                );
                
                if (!docResults || docResults.length === 0) {
                    console.log(`No document found with name: ${documentId}`);
                    con.release();
                    return {
                        success: true,
                        versions: {
                            success: false,
                            error: "Document not found",
                            originalDocument: null,
                            versions: []
                        }
                    };
                }
                
                docId = docResults[0].id_document;
                console.log(`Found document ID ${docId} for name "${documentId}"`);
            } catch (lookupError) {
                console.error(`Error looking up document by name: ${lookupError.message}`);
                con.release();
                throw lookupError;
            }
        }

        if (!docId) {
            console.error(`Could not determine document ID from input: ${documentId}`);
            con.release();
            return {
                success: true,
                versions: {
                    success: false,
                    error: "Invalid document ID",
                    originalDocument: null,
                    versions: []
                }
            };
        }

        console.log(`Getting versions for document ID: ${docId}`);

        // Get the original document data with keywords and all relevant information
        const [documentData] = await con.query(
            `SELECT td.*, u.nom, u.prenom, 
            DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as formatted_date,
            tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
            GROUP_CONCAT(DISTINCT dt.tag_name) as tags
            FROM table_document td
            JOIN user u ON td.id_user_source = u.id_user
            LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
            LEFT JOIN document_tag_relations dtr ON td.id_document = dtr.id_document
            LEFT JOIN document_tags dt ON dtr.id_tag = dt.id_tag
            WHERE td.id_document = ?
            GROUP BY td.id_document, td.nom_document, td.nom_document_original, td.type_id, td.path, 
                     td.date_upload, td.comment, td.id_user_source, u.nom, u.prenom,
                     tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5`,
            [docId]
        );

        if (!documentData || documentData.length === 0) {
            console.log(`No document found with ID: ${docId}`);
            con.release();
            return {
                success: true,
                versions: {
                    success: false,
                    error: "Document not found",
                    originalDocument: null,
                    versions: []
                }
            };
        }

        // Get all versions of the document with user information
        const [versions] = await con.query(
            `SELECT dv.id_version, dv.id_document, dv.file_path, dv.version_number, 
            dv.change_summary, dv.created_by, dv.created_at, dv.is_current,
            u.nom, u.prenom
            FROM document_versions dv
            JOIN user u ON dv.created_by = u.id_user
            WHERE dv.id_document = ?
            ORDER BY dv.version_number DESC`,
            [docId]
        );

        console.log(`Found ${versions.length} versions for document ID ${docId}`);
        con.release();
        
        // Process the document data
        const originalDoc = documentData[0];
        const keywords = [
            originalDoc.mot1,
            originalDoc.mot2,
            originalDoc.mot3,
            originalDoc.mot4,
            originalDoc.mot5
        ].filter(keyword => keyword && keyword.trim() !== '');

        const tags = originalDoc.tags ? originalDoc.tags.split(',') : [];

        // Return both the original document data and its versions
        return {
            success: true,
            versions: {
                success: true,
                originalDocument: {
                    id: originalDoc.id_document,
                    name: originalDoc.nom_document,
                    originalName: originalDoc.nom_document_original,
                    type: originalDoc.type_id,
                    path: originalDoc.path,
                    comment: originalDoc.comment,
                    dateUpload: originalDoc.formatted_date,
                    keywords: keywords,
                    tags: tags,
                    author: {
                        id: originalDoc.id_user_source,
                        firstName: originalDoc.prenom,
                        lastName: originalDoc.nom
                    }
                },
                versions: versions.map(version => ({
                    id: version.id_version,
                    documentId: version.id_document,
                    filePath: version.file_path,
                    number: version.version_number,
                    changeSummary: version.change_summary,
                    createdBy: {
                        id: version.created_by,
                        firstName: version.prenom,
                        lastName: version.nom
                    },
                    createdAt: version.created_at,
                    isCurrent: version.is_current === 1
                }))
            }
        };
    } catch (error) {
        console.error("Error in dbGetDocumentVersions:", error);
        throw error;
    }
}

// Statistics Database Functions
async function recordDocumentStatistic(documentId, userId, actionType) {
    try {
        const con = await pool.getConnection();
        const [result] = await con.query(
            'INSERT INTO document_statistics (id_document, id_user, action_type, action_timestamp) VALUES (?, ?, ?, NOW())',
            [documentId, userId, actionType]
        );
        con.release();
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error recording document statistic:', error);
        return { success: false, error: error.message };
    }
}

async function recordDocumentView(documentId, userId) {
    try {
        const con = await pool.getConnection();
        console.log('Recording view for document:', documentId, 'by user:', userId);
        
        // First check if document exists
        const [docCheck] = await con.query(
            'SELECT id_document FROM table_document WHERE id_document = ?',
            [documentId]
        );

        if (docCheck.length === 0) {
            console.log('Document not found:', documentId);
            con.release();
            return { success: false, error: 'Document not found' };
        }

        // Record the view statistic
        const [result] = await con.query(
            'INSERT INTO document_statistics (id_document, id_user, action_type, action_timestamp) VALUES (?, ?, ?, NOW())',
            [documentId, userId, 'view']
        );

        console.log('Successfully recorded view statistic:', result);
        con.release();
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error recording document view:', error);
        return { success: false, error: error.message };
    }
}

async function getDocumentStatistics(userId, userRole) {
    try {
        const connection = await pool.getConnection();
        console.log('Getting document statistics for user:', userId, 'role:', userRole);

        // Base query for document statistics
        let baseQuery = `
            SELECT 
                ds.id_document,
                ds.id_user,
                ds.action_type,
                ds.action_timestamp,
                td.nom_document,
                td.type_id,
                u.nom,
                u.prenom
            FROM document_statistics ds
            JOIN table_document td ON ds.id_document = td.id_document
            JOIN user u ON ds.id_user = u.id_user
            WHERE ds.action_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;

        // Add role-based filtering
        if (userRole !== 'admin') {
            baseQuery += ` AND (td.id_user_source = ? OR ds.id_user = ?)`;
        }

        // Get all statistics
        const [stats] = await connection.query(baseQuery, 
            userRole !== 'admin' ? [userId, userId] : []
        );

        console.log('Raw statistics:', stats);

        // Calculate totals for last 24 hours
        const last24Hours = stats.filter(s => {
            const actionDate = new Date(s.action_timestamp);
            const now = new Date();
            return (now - actionDate) <= 24 * 60 * 60 * 1000;
        });

        const totals = {
            downloads: last24Hours.filter(s => s.action_type === 'download').length,
            views: last24Hours.filter(s => s.action_type === 'view').length
        };

        // Get top downloaded documents
        const topDownloads = stats
            .filter(s => s.action_type === 'download')
            .reduce((acc, curr) => {
                const existing = acc.find(d => d.id_document === curr.id_document);
                if (existing) {
                    existing.download_count++;
                } else {
                    acc.push({
                        id_document: curr.id_document,
                        nom_document: curr.nom_document,
                        download_count: 1
                    });
                }
                return acc;
            }, [])
            .sort((a, b) => b.download_count - a.download_count)
            .slice(0, 5);

        // Get active users
        const activeUsers = stats
            .reduce((acc, curr) => {
                const existing = acc.find(u => u.id_user === curr.id_user);
                if (existing) {
                    existing.action_count++;
                } else {
                    acc.push({
                        id_user: curr.id_user,
                        nom: curr.nom,
                        prenom: curr.prenom,
                        action_count: 1
                    });
                }
                return acc;
            }, [])
            .sort((a, b) => b.action_count - a.action_count)
            .slice(0, 5);

        // Get document type distribution for last 24 hours
        const typeDistribution = last24Hours.reduce((acc, curr) => {
            acc[curr.type_id] = (acc[curr.type_id] || 0) + 1;
            return acc;
        }, {});

        connection.release();

        const result = {
            totals,
            topDownloads,
            activeUsers,
            typeDistribution
        };

        console.log('Statistics result:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Error getting document statistics:', error);
        throw error;
    }
}

async function getHistoricalStatistics(startDate, endDate, documentId = null) {
    try {
        const query = `
            SELECT 
                DATE(ds.action_timestamp) as date,
                COUNT(CASE WHEN ds.action_type = 'download' THEN 1 END) as downloads,
                COUNT(CASE WHEN ds.action_type = 'view' THEN 1 END) as views
            FROM document_statistics ds
            WHERE DATE(ds.action_timestamp) >= ? AND DATE(ds.action_timestamp) <= ?
            ${documentId ? 'AND ds.id_document = ?' : ''}
            GROUP BY DATE(ds.action_timestamp)
            ORDER BY date ASC
        `;

        const params = documentId ? [startDate, endDate, documentId] : [startDate, endDate];
        const [results] = await pool.query(query, params);
        return results;
    } catch (error) {
        console.error('Error in getHistoricalStatistics:', error);
        throw error;
    }
}

async function dbUpdateUser(email, password, role) {
    const con = await pool.getConnection();
    try {
        await con.query(
            'UPDATE user SET password = ?, roles = ? WHERE email = ?',
            [password, role, email]
        );
    } finally {
        con.release();
    }
}

async function dbBlockUser(userId) {
    const query = 'UPDATE user SET accepted = 0 WHERE id_user = ?';
    await pool.query(query, [userId]);
}

async function updateUserPermissions(userId, diffuse, upload, download, print, roles) {
    const con = await pool.getConnection();
    try {
        await con.query(
            'UPDATE user SET diffuse = ?, upload = ?, download = ?, print = ?, roles = ? WHERE id_user = ?',
            [diffuse ? 1 : 0, upload ? 1 : 0, download ? 1 : 0, print ? 1 : 0, roles, userId]
        );
        return true;
    } catch (error) {
        console.error('Error updating user permissions:', error);
        throw error;
    } finally {
        con.release();
    }
}

exports.checkEmailExists = async (email) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM user WHERE email = ?',
      [email]
    );
    return rows[0].count > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// Function to restore an archived version
async function dbRestoreArchivedVersion(documentId, versionId, userId) {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Get the archived version details
        const [archivedVersion] = await connection.query(
            `SELECT dv.*, td.nom_document_original, td.type_id 
             FROM document_versions dv
             JOIN table_document td ON dv.id_document = td.id_document
             WHERE dv.id_version = ? AND dv.id_document = ?`,
            [versionId, documentId]
        );

        if (!archivedVersion || archivedVersion.length === 0) {
            throw new Error('Version not found');
        }

        const version = archivedVersion[0];

        // Get the current version details
        const [currentVersion] = await connection.query(
            `SELECT * FROM document_versions 
             WHERE id_document = ? AND is_current = 1`,
            [documentId]
        );

        if (!currentVersion || currentVersion.length === 0) {
            throw new Error('Current version not found');
        }

        const current = currentVersion[0];

        // Create archive directory if it doesn't exist
        const archivePath = path.join(__dirname, '..', 'uploads', 'Archive', version.type_id);
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath, { recursive: true });
        }

        // Create archived filename for current version
        const currentFileExtension = path.extname(current.file_path).substring(1);
        const currentBaseFilename = version.nom_document_original.substring(0, version.nom_document_original.lastIndexOf('.'));
        const currentArchivedFilename = `${currentBaseFilename}_v${current.version_number}_archived.${currentFileExtension}`;
        const currentArchivedFilePath = path.join(archivePath, currentArchivedFilename);

        // Copy current version to archive
        await fs.promises.copyFile(current.file_path, currentArchivedFilePath);

        // Archive current version in database
        await connection.query(
            `UPDATE document_versions 
             SET is_archived = 1,
                 archive_path = ?,
                 archive_filename = ?,
                 archived_by = ?,
                 archived_at = CURRENT_TIMESTAMP,
                 is_current = 0
             WHERE id_version = ?`,
            [archivePath, currentArchivedFilename, userId, current.id_version]
        );

        // Create the new file path for restored version
        const originalDir = path.dirname(current.file_path);
        const newFilename = `${currentBaseFilename}_v${version.version_number}_restored${path.extname(version.file_path)}`;
        const newFilePath = path.join(originalDir, newFilename);

        // Copy the archived file back to original location
        const archiveFilePath = path.join(version.archive_path, version.archive_filename);
        await fs.promises.copyFile(archiveFilePath, newFilePath);

        // Update the document version record
        await connection.query(
            `UPDATE document_versions 
             SET file_path = ?,
                 is_archived = 0,
                 archive_path = NULL,
                 archive_filename = NULL,
                 archived_by = NULL,
                 archived_at = NULL,
                 is_current = 1
             WHERE id_version = ?`,
            [newFilePath, versionId]
        );

        // Update the document in table_document with the restored version's information
        await connection.query(
            `UPDATE table_document 
             SET nom_document = ?,
                 path = ?
             WHERE id_document = ?`,
            [newFilename, originalDir, documentId]
        );

        await connection.commit();
        return { success: true, versionId: versionId };
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error in dbRestoreArchivedVersion:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function dbStoreNotificationRequest(userId, requestType, currentUsage, planLimit, reason, superadminId) {
  try {
    const con = await pool.getConnection();
    try {
      const [result] = await con.query(
        'INSERT INTO notification_requests (user_id, request_type, current_usage, plan_limit, reason, superadmin_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [userId, requestType, currentUsage, planLimit, reason, superadminId, 'pending']
      );
      return result;
    } finally {
      con.release();
    }
  } catch (error) {
    console.error("Error in dbStoreNotificationRequest:", error);
    throw error;
  }
}

async function dbGetNotificationRequests(status = 'pending') {
    try {
        const con = await pool.getConnection();
        const [requests] = await con.execute(
            `SELECT nr.*, u.nom, u.prenom, u.email 
             FROM notification_requests nr 
             JOIN user u ON nr.user_id = u.id_user 
             WHERE nr.status = ? 
             ORDER BY nr.created_at DESC`,
            [status]
        );
        con.release();
        return requests;
    } catch (error) {
        console.error("Error in dbGetNotificationRequests:", error);
        throw error;
    }
}

async function dbUpdateNotificationRequestStatus(requestId, status) {
    try {
        const con = await pool.getConnection();
        await con.execute(
            'UPDATE notification_requests SET status = ? WHERE id_request = ?',
            [status, requestId]
        );
        con.release();
        return { success: true };
    } catch (error) {
        console.error("Error in dbUpdateNotificationRequestStatus:", error);
        throw error;
    }
}

async function getDownloadStatistics(startDate, endDate, userId = null) {
    try {
        const con = await pool.getConnection();
        let sql = `
            SELECT 
                ds.id_document,
                td.nom_document,
                ds.action_timestamp as download_timestamp,
                u.id_user as id_user_source,
                u.nom,
                u.prenom
            FROM document_statistics ds
            JOIN table_document td ON ds.id_document = td.id_document
            JOIN user u ON ds.id_user = u.id_user
            WHERE ds.action_type = 'download'
            AND ds.action_timestamp BETWEEN ? AND ?
        `;
        
        const params = [startDate, endDate];
        
        if (userId) {
            sql += ' AND ds.id_user = ?';
            params.push(userId);
        }
        
        sql += ' ORDER BY ds.action_timestamp DESC';
        
        console.log('Download stats SQL:', sql);
        console.log('Download stats params:', params);
        
        const [result] = await con.query(sql, params);
        console.log('Download stats result:', result);
        
        con.release();
        return result;
    } catch (error) {
        console.error('Error in getDownloadStatistics:', error);
        throw error;
    }
}

async function getPopularDocuments(startDate, endDate, userId = null) {
    try {
        const con = await pool.getConnection();
        let sql = `
            SELECT 
                td.id_document,
                td.nom_document,
                COUNT(DISTINCT ds.id_statistic) as download_count,
                COALESCE(SUM(DISTINCT dl.open_count), 0) as view_count,
                GROUP_CONCAT(DISTINCT CONCAT(u.nom, ' ', u.prenom)) as users
            FROM table_document td
            LEFT JOIN document_statistics ds ON td.id_document = ds.id_document AND ds.action_type = 'download' AND ds.action_timestamp BETWEEN ? AND ?
            LEFT JOIN document_log dl ON td.nom_document = dl.nom_doc
            LEFT JOIN user u ON ds.id_user = u.id_user
            WHERE (ds.id_document IS NOT NULL OR dl.nom_doc IS NOT NULL)
        `;
        
        const params = [startDate, endDate];
        
        if (userId) {
            sql += ' AND (ds.id_user = ? OR dl.user_id = ?)';
            params.push(userId, userId);
        }
        
        sql += ' GROUP BY td.id_document, td.nom_document HAVING (download_count > 0 OR view_count > 0) ORDER BY (download_count + view_count) DESC';
        
        console.log('Popular documents query:', sql);
        console.log('Query params:', params);
        
        const [result] = await con.query(sql, params);
        console.log('Popular documents result:', result);
        con.release();
        return result;
    } catch (error) {
        console.error('Error in getPopularDocuments:', error);
        throw error;
    }
}

async function dbCountUsers() {
    try {
        console.log('db.js: Counting total users...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        console.log('db.js: Total users count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('db.js: Error in dbCountUsers:', error);
        throw error;
    }
}

async function dbCountDocuments() {
    try {
        console.log('db.js: Counting total documents...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM documents');
        console.log('db.js: Total documents count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('db.js: Error in dbCountDocuments:', error);
        throw error;
    }
}

async function dbGetTotalStorage() {
    try {
        console.log('db.js: Getting total storage...');
        const [rows] = await pool.query('SELECT SUM(size) as total FROM documents');
        console.log('db.js: Total storage:', rows[0].total || 0);
        return rows[0].total || 0;
    } catch (error) {
        console.error('db.js: Error in dbGetTotalStorage:', error);
        throw error;
    }
}

async function dbCountActiveUsers() {
    try {
        console.log('db.js: Counting active users...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = "active"');
        console.log('db.js: Active users count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('db.js: Error in dbCountActiveUsers:', error);
        throw error;
    }
}

async function dbCountAdmins() {
    try {
        console.log('db.js: Counting admins...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        console.log('db.js: Admins count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('db.js: Error in dbCountAdmins:', error);
        throw error;
    }
}

async function dbCountResponsables() {
    try {
        console.log('db.js: Counting responsables...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "responsable"');
        console.log('db.js: Responsables count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('db.js: Error in dbCountResponsables:', error);
        throw error;
    }
}

async function dbGetDocumentsInFolder(folderId, userId) {
  try {
    // Get user role and institution
    const [userResult] = await pool.query(
      'SELECT role, institution_id FROM user WHERE id_user = ?',
      [userId]
    );
    const userRole = userResult[0].role;
    const institution_id = userResult[0].institution_id;

    // Get folder details
    const [folderResult] = await pool.query(
      'SELECT * FROM folders WHERE id = ?',
      [folderId]
    );

    if (folderResult.length === 0) {
      return { documents: [], subfolders: [] };
    }

    const folder = folderResult[0];
    const folderPath = folder.folder_path;

    // If folder is private and user is not the owner, return empty
    if (folder.is_private === 1 && folder.created_by !== userId && userRole !== 'superadmin') {
      return { documents: [], subfolders: [] };
    }

    let documents;
    if (userRole === 'admin' || userRole === 'superadmin') {
      // For admins, get all documents from public folders in their institution
      [documents] = await pool.query(`
        SELECT d.*, u.email as uploader_email, u.nom as uploader_name, u.prenom as uploader_surname,
               dt.type_name as document_type, i.name as institution_name,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags
        FROM table_document d
        JOIN user u ON d.id_user_source = u.id_user
        JOIN document_types dt ON d.type_id = dt.id
        JOIN institutions i ON u.institution_id = i.id_institution
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        WHERE d.path = ? 
        AND u.institution_id = ?
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.email, u.nom, u.prenom,
                 dt.type_name, i.name
        ORDER BY d.date_upload DESC
      `, [folderPath, institution_id]);
    } else {
      // For normal users, get only their verified documents
      [documents] = await pool.query(`
        SELECT d.*, u.email as uploader_email, u.nom as uploader_name, u.prenom as uploader_surname,
               dt.type_name as document_type, i.name as institution_name,
               GROUP_CONCAT(
                 JSON_OBJECT(
                   'id_tag', dtags.id_tag,
                   'tag_name', dtags.tag_name,
                   'is_predefined', dtags.is_predefined
                 )
               ) as tags
        FROM table_document d
        JOIN user u ON d.id_user_source = u.id_user
        JOIN document_types dt ON d.type_id = dt.id
        JOIN institutions i ON u.institution_id = i.id_institution
        LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
        LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
        WHERE d.path = ? 
        AND d.id_user_source = ?
        AND d.isVerfied = 1
        GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
                 d.date_upload, d.comment, d.id_user_source, u.email, u.nom, u.prenom,
                 dt.type_name, i.name
        ORDER BY d.date_upload DESC
      `, [folderPath, userId]);
    }

    // Process the results to parse the tags JSON
    documents = documents.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
    }));

    // Get subfolders
    const [subfolders] = await pool.query(
      'SELECT * FROM folders WHERE folder_path LIKE ? AND id != ?',
      [`${folderPath}/%`, folderId]
    );

    return {
      documents,
      subfolders
    };
  } catch (error) {
    console.error('Error in dbGetDocumentsInFolder:', error);
    throw error;
  }
}

async function dbSearchDocumentsByAuthors(authorIds, userId, name = null, type_id = null, keyword = null, startDate = null, endDate = null) {
    const con = await pool.getConnection();
    try {
        console.log("dbSearchDocumentsByAuthors called with params:", { authorIds, userId, name, type_id, keyword, startDate, endDate });

        // Get user's institution
        const [userInstitution] = await con.query(
            'SELECT institution_id FROM user WHERE id_user = ?',
            [userId]
        );

        if (!userInstitution.length) {
            throw new Error('User not found or no institution assigned');
        }

        const userInstitutionId = userInstitution[0].institution_id;

        // Create placeholders for author IDs
        const authorPlaceholders = authorIds.map(() => '?').join(',');
        const params = [userInstitutionId, ...authorIds];

        let sql = `
            SELECT DISTINCT td.id_document, td.nom_document, td.nom_document_original, 
                   td.type_id, td.path, td.date_upload, td.comment, td.id_user_source,
                   td.isVerfied, td.file_size, td.nom_document AS nom_doc, 
                   DATE_FORMAT(td.date_upload, '%Y-%m-%d %H:%i:%s') as date_time,
                   u.nom, u.prenom,
                   tmc.mot1, tmc.mot2, tmc.mot3, tmc.mot4, tmc.mot5,
                   dt.type_name as type_name
            FROM table_document td
            JOIN user u ON u.id_user = td.id_user_source
            LEFT JOIN table_mot_cle tmc ON tmc.id_document = td.id_document
            LEFT JOIN document_types dt ON td.type_id = dt.id
            WHERE u.institution_id = ? 
            AND td.id_user_source IN (${authorPlaceholders})`;

        // Add additional filters
        if (name) {
            sql += ` AND td.nom_document LIKE ?`;
            params.push(`%${name}%`);
        }
        if (type_id) {
            sql += ` AND td.type_id = ?`;
            params.push(type_id);
        }
        if (keyword) {
            sql += ` AND (
                td.comment LIKE ? OR 
                td.nom_document_original LIKE ? OR
                tmc.mot1 LIKE ? OR 
                tmc.mot2 LIKE ? OR 
                tmc.mot3 LIKE ? OR 
                tmc.mot4 LIKE ? OR 
                tmc.mot5 LIKE ?
            )`;
            const keywordParam = `%${keyword}%`;
            params.push(keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam, keywordParam);
        }
        if (startDate) {
            sql += ` AND DATE(td.date_upload) >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND DATE(td.date_upload) <= ?`;
            params.push(endDate);
        }

        console.log("Executing author search query:", sql);
        console.log("With parameters:", params);

        const [documents] = await con.query(sql, params);
        con.release();
        return documents;
    } catch (error) {
        console.error("Error in dbSearchDocumentsByAuthors:", error);
        if (con) con.release();
        throw error;
    }
}

// Add function to log user actions
async function dbLogUserAction(userId, action, details = null, ipAddress = null, userAgent = null) {
    try {
        const con = await pool.getConnection();
        await con.query(
            'INSERT INTO user_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, action, details, ipAddress, userAgent]
        );
        con.release();
        console.log(`User action logged: ${action} for user ${userId}`);
    } catch (error) {
        console.error('Error logging user action:', error);
        // Don't throw error to avoid breaking the main flow
    }
}

// Function to populate database with essential data
async function populateDatabase() {
    try {
        console.log('🚀 Starting database population...');
        console.log('🔍 Database config being used:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            port: dbConfig.port
        });
        
        const con = await pool.getConnection();
        console.log('✅ Successfully connected to database');
        
        // Check if we already have data
        const [userCount] = await con.query('SELECT COUNT(*) as count FROM user');
        console.log('📊 Current user count:', userCount[0].count);
        
        if (userCount[0].count > 0) {
            console.log('✅ Database already populated, skipping...');
            con.release();
            return;
        }

        console.log('📝 Creating essential data...');

        // Create institutions
        await con.query(`
            INSERT IGNORE INTO institutions (id_institution, nom_institution, adresse, telephone, email) VALUES
            (1, 'Default Institution', 'Default Address', '0000000000', 'admin@example.com'),
            (2, 'Test Institution', 'Test Address', '1111111111', 'test@example.com'),
            (3, 'Demo Institution', 'Demo Address', '2222222222', 'demo@example.com')
        `);

        // Create document types
        await con.query(`
            INSERT IGNORE INTO document_types (id, type_name, description, folder_path, institution_id) VALUES
            (1, 'Official Document', 'Official documents', './uploads/Official Document', 1),
            (2, 'Shared Document', 'Shared documents', './uploads/Shared Document', 1),
            (3, 'General Document', 'General documents', './uploads/General Document', 1),
            (4, 'Others', 'Other documents', './uploads/Others', 1)
        `);

        // Create document tags
        await con.query(`
            INSERT IGNORE INTO document_tags (id, tag_name, color, institution_id) VALUES
            (1, 'Important', '#ff0000', 1),
            (2, 'Urgent', '#ff8800', 1),
            (3, 'Confidential', '#8800ff', 1),
            (4, 'Public', '#00ff00', 1)
        `);

        // Create folders
        await con.query(`
            INSERT IGNORE INTO folders (id, folder_name, folder_path, created_by, institution_id, is_private) VALUES
            (1, 'Official Documents', './uploads/Official Document', 1, 1, 0),
            (2, 'Shared Documents', './uploads/Shared Document', 1, 1, 0),
            (3, 'General Documents', './uploads/General Document', 1, 1, 0),
            (4, 'Others', './uploads/Others', 1, 1, 0)
        `);

        // Create essential users
        await con.query(`
            INSERT IGNORE INTO user (id_user, prenom, nom, email, phone_number, password, diffuse, upload, download, print, roles, accepted, verified, created_by, current_plan_id, institution_id, subscription_status) VALUES
            (1, 'Admin', 'System', 'admin@example.com', NULL, '$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z', 1, 1, 1, 1, 'admin', 1, 1, 20, 1, 1, 'free'),
            (20, 'Super', 'Admin', 'superadmin@example.com', NULL, '$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty', 1, 1, 1, 1, 'superadmin', 1, 1, NULL, 2, 3, 'free'),
            (25, 'Raul', 'Rusescu', 'raulrusescu@gmail.com', '0734342342', '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa', 1, 1, 1, 1, 'user', 1, 1, 20, 2, 3, 'free')
        `);

        // Show what was created
        const [users] = await con.query('SELECT COUNT(*) as count FROM user');
        const [institutions] = await con.query('SELECT COUNT(*) as count FROM institutions');
        const [folders] = await con.query('SELECT COUNT(*) as count FROM folders');
        const [documentTypes] = await con.query('SELECT COUNT(*) as count FROM document_types');

        console.log('✅ Database populated successfully:');
        console.log(`👥 Users: ${users[0].count}`);
        console.log(`🏢 Institutions: ${institutions[0].count}`);
        console.log(`📁 Folders: ${folders[0].count}`);
        console.log(`📄 Document Types: ${documentTypes[0].count}`);

        con.release();
    } catch (error) {
        console.error('❌ Error populating database:', error.message);
    }
}

// Call populateDatabase after a short delay when the module loads
setTimeout(() => {
    console.log('🔄 Starting populateDatabase timer...');
    populateDatabase();
}, 2000);

// Test database connection immediately
setTimeout(() => {
    console.log('🧪 Testing database connection...');
    pool.getConnection().then(con => {
        console.log('✅ Database connection successful!');
        console.log('📊 Database name:', con.config.database);
        con.release();
    }).catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });
}, 1000);

// Export the new functions
module.exports = {
    pool,
    sessionStore,
    initializeDatabase,
    populateDatabase,
    getConnection: () => pool.getConnection(),
    dbCountDocAdded,
    dbListDocuments,
    dbDownloadDocument,
    dbUploadDocument,
    dbIdReciever,
    dbListUsers,
    dbInsertUser,
    dbVerifyDocument,
    dbFindUserByEmail,
    dbGetUserEmailById,
    dbGetUnaceeptedUsers,
    dbDelUserById,
    dbVerifyUserByID,
    dbAddPrevileges,
    dbCheckVerified,
    dbGetCount,
    dbGetAcceptedUsers,
    dbSearch,
    dbListDocumentsNV,
    dbListDocumentsReceved,
    dbFrequentlyOpenedDocuments,
    dbDocumentLog,
    dbGetPath,
    dbAllDocs,
    dbGetPrevileges,
    dbPermaPrevileges,
    dbGetUserNameById,
    dbMyDocuments,
    dbArchiveDocumentVersion,
    dbGetArchivedDocuments,
    dbAddDocumentVersion,
    dbGetAllTags,
    dbCreateTag,
    dbAddTagToDocument,
    dbGetDocumentTags,
    dbRemoveTagFromDocument,
    dbSearchDocumentsByTags,
    dbUpdateDocumentFilename,
    dbUpdateNotificationStatus,
    dbGetDocumentVersions,
    recordDocumentStatistic,
    recordDocumentView,
    getDocumentStatistics,
    getHistoricalStatistics,
    dbUpdateUser,
    dbBlockUser,
    updateUserPermissions,
    dbRestoreArchivedVersion,
    dbStoreNotificationRequest,
    dbGetNotificationRequests,
    dbUpdateNotificationRequestStatus,
    getDownloadStatistics,
    getPopularDocuments,
    dbCountUsers,
    dbCountDocuments,
    dbGetTotalStorage,
    dbCountActiveUsers,
    dbCountAdmins,
    dbCountResponsables,
    dbGetDocumentsInFolder,
    dbSearchDocumentsByAuthors,
    dbLogUserAction
};