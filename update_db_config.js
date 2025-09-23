const mysql = require('mysql2/promise');

// Test connection with Railway database name
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: 'railway', // Use the Railway database name
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 30000
};

console.log('🔗 Testing connection to Railway database...');
console.log('Config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '***SET***' : 'NOT_SET'
});

async function testConnection() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to Railway MySQL successfully!');
        
        // Check if user table exists
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
        
        // If user table exists, check users
        if (tables.some(t => Object.values(t)[0] === 'user')) {
            const [users] = await connection.execute('SELECT email, roles FROM user LIMIT 5');
            console.log('👥 Users in database:', users);
        } else {
            console.log('⚠️  No user table found. Database needs to be populated.');
        }
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        
        // If railway database doesn't exist, try to create it and use PSPD
        if (error.message.includes('Unknown database')) {
            console.log('🔄 Trying with PSPD database...');
            try {
                const fallbackConfig = { ...dbConfig, database: 'PSPD' };
                connection = await mysql.createConnection(fallbackConfig);
                console.log('✅ Connected to PSPD database!');
                
                const [users] = await connection.execute('SELECT email, roles FROM user LIMIT 3');
                console.log('👥 Users found:', users);
            } catch (fallbackError) {
                console.error('❌ PSPD connection also failed:', fallbackError.message);
            }
        }
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testConnection();
