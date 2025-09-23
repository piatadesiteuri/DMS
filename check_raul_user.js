const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: 'PSPD',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 30000
};

async function checkRaulUser() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to PSPD database!');
        
        // Check specifically for Raul's user
        const [users] = await connection.execute(
            'SELECT id_user, nom, prenom, email, roles, verified, accepted FROM user WHERE email = ?', 
            ['raulrusescu@gmail.com']
        );
        
        if (users.length > 0) {
            console.log('🎉 Found Raul\'s user:');
            console.log(users[0]);
            console.log('\n✅ You can login with:');
            console.log('   Email: raulrusescu@gmail.com');
            console.log('   Password: Try these: User1234!, password, 123456');
        } else {
            console.log('❌ Raul\'s user not found. Let me check all users:');
            const [allUsers] = await connection.execute('SELECT email, nom, prenom, roles FROM user LIMIT 10');
            console.log('👥 Available users:');
            allUsers.forEach(user => {
                console.log(`   - ${user.email} (${user.nom} ${user.prenom}) - ${user.roles}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkRaulUser();
