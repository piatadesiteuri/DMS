const mysql = require('mysql2/promise');
const fs = require('fs');

// Railway MySQL connection details (from your screenshot)
const railwayConfig = {
    host: 'switchback.proxy.rlwy.net',
    port: 27678,
    user: 'root',
    password: 'your_password_here', // You'll need to get this from Railway
    database: 'railway' // Railway creates a database named 'railway'
};

console.log('🔗 Attempting to connect to Railway MySQL...');
console.log('Host:', railwayConfig.host);
console.log('Port:', railwayConfig.port);
console.log('Database:', railwayConfig.database);

async function populateRailwayDB() {
    let connection;
    
    try {
        // First, try to connect to Railway MySQL
        console.log('\n📡 Connecting to Railway MySQL...');
        connection = await mysql.createConnection(railwayConfig);
        console.log('✅ Connected to Railway MySQL successfully!');
        
        // Create PSPD database if it doesn't exist
        await connection.execute('CREATE DATABASE IF NOT EXISTS PSPD');
        console.log('✅ PSPD database created/verified');
        
        // Switch to PSPD database
        await connection.execute('USE PSPD');
        console.log('✅ Switched to PSPD database');
        
        // Create user table
        const createUserTable = `
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
                institution_id INT,
                phone_number VARCHAR(50),
                created_by INT
            )
        `;
        
        await connection.execute(createUserTable);
        console.log('✅ User table created/verified');
        
        // Insert essential users including yours
        const insertUsers = `
            INSERT INTO user (id_user, nom, prenom, email, password, verified, accepted, upload, download, print, diffuse, roles, phone_number, created_by) VALUES 
            (1, 'Admin', 'System', 'admin@example.com', '$2b$10$qqka0E2SE1vltY1WfhwBleZ0R9IGD7iHVSI2b84ZIMcPiSXki51z', 1, 1, 1, 1, 1, 1, 'admin', NULL, NULL),
            (25, 'Rusescu', 'Raul', 'raulrusescu@gmail.com', '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa', 1, 1, 1, 1, 1, 1, 'user', 20, '0734342342'),
            (20, 'Super', 'Admin', 'superadmin@example.com', '$2b$10$t2mah5/R2eA/UTJCBD2w/.26tkqwkNKo9N.e1Xwp6tO4HSGrn9.Ty', 1, 1, 1, 1, 1, 1, 'superadmin', NULL, NULL)
            ON DUPLICATE KEY UPDATE
            nom = VALUES(nom),
            prenom = VALUES(prenom),
            password = VALUES(password),
            verified = VALUES(verified),
            accepted = VALUES(accepted),
            roles = VALUES(roles)
        `;
        
        await connection.execute(insertUsers);
        console.log('✅ Essential users inserted/updated');
        
        // Verify users were inserted
        const [users] = await connection.execute('SELECT id_user, nom, prenom, email, roles FROM user');
        console.log('\n🎉 Users in Railway database:');
        users.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - ${user.roles}`);
        });
        
        console.log('\n✅ Railway database population completed!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
            console.log('\n💡 To fix this, you need to:');
            console.log('1. Get the Railway MySQL password from Railway Dashboard');
            console.log('2. Update the password in this script');
            console.log('3. Or use Railway CLI: railway connect MySQL');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Connection closed.');
        }
    }
}

populateRailwayDB();
