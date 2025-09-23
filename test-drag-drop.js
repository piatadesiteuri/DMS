const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'PSPD',
    port: 3306
};

async function testDocumentCreation() {
    try {
        console.log('Starting test...');
        
        // Connect to database
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');

        // Get user for Scoala Dabuleni
        const [users] = await connection.execute(
            'SELECT * FROM user WHERE institution_id = 3 LIMIT 1'
        );
        
        if (users.length === 0) {
            throw new Error('No users found for Scoala Dabuleni');
        }
        
        const user = users[0];
        console.log('Found user:', user.nom, user.prenom);

        // Check if root folder exists
        const [rootFolders] = await connection.execute(
            'SELECT * FROM folders WHERE folder_path = ? AND institution_id = ?',
            ['Scoala Dabuleni', 3]
        );

                    if (rootFolders.length === 0) {
                console.log('Creating root folder for Scoala Dabuleni...');
                await connection.execute(
                    'INSERT INTO folders (folder_name, folder_path, institution_id, created_by, is_private) VALUES (?, ?, ?, ?, ?)',
                    ['Scoala Dabuleni', 'Scoala Dabuleni', 3, user.id_user, 1]
                );
                console.log('Root folder created');
            } else {
                console.log('Root folder already exists');
            }

        // Test document path
        const testPath = 'Scoala Dabuleni';
        const testDocName = 'test-document.pdf';
        const uploadsDir = path.join(__dirname, 'back-end', 'uploads');
        const physicalPath = path.join(uploadsDir, testPath, testDocName);
        
        console.log('Test paths:');
        console.log('- Uploads dir:', uploadsDir);
        console.log('- Test path:', testPath);
        console.log('- Physical path:', physicalPath);
        console.log('- Physical dir exists:', fs.existsSync(path.dirname(physicalPath)));

        // Check current documents in that path
        const [existingDocs] = await connection.execute(
            'SELECT * FROM table_document WHERE path = ? AND id_user_source = ?',
            [testPath, user.id_user]
        );
        
        console.log('Existing documents in path:', existingDocs.length);

        await connection.end();
        console.log('Test completed');
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testDocumentCreation(); 