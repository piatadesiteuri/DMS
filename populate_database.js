const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration using Railway environment variables
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'PSPD',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 30000
};

console.log('🔗 Connecting to Railway MySQL database...');
console.log('Host:', dbConfig.host);
console.log('Database:', dbConfig.database);
console.log('User:', dbConfig.user);

async function populateDatabase() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database successfully!');
        
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'import_users.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split SQL content by semicolons to execute individual statements
        const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`📥 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                } catch (error) {
                    console.log(`⚠️  Statement ${i + 1} failed (this is normal if data already exists):`, error.message);
                }
            }
        }
        
        // Verify that the users were inserted
        const [users] = await connection.execute('SELECT id_user, nom, prenom, email, roles FROM user WHERE email IN (?, ?, ?)', [
            'admin@example.com',
            'raulrusescu@gmail.com', 
            'superadmin@example.com'
        ]);
        
        console.log('\n🎉 Database population completed!');
        console.log('📋 Inserted users:');
        users.forEach(user => {
            console.log(`   - ${user.nom} ${user.prenom} (${user.email}) - Role: ${user.roles}`);
        });
        
        console.log('\n🔐 You can now login with:');
        console.log('   Email: raulrusescu@gmail.com');
        console.log('   Password: User1234! (or whatever was the original password)');
        
    } catch (error) {
        console.error('❌ Error populating database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Database connection closed.');
        }
    }
}

// Run the population script
populateDatabase();
