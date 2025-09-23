const mysql = require('mysql2/promise');

async function testRailwayConnection() {
    console.log('🔍 Testing Railway Database Connection...\n');
    
    // Use Railway environment variables
    const dbConfig = {
        host: process.env.MYSQL_HOST || 'switchback.proxy.rlwy.net',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || 'AgWaFsyNdUoBqjtHZCDJoopvtByDbTsB',
        database: process.env.MYSQL_DATABASE || 'railway',
        port: process.env.MYSQL_PORT || 27678,
        connectTimeout: 30000
    };

    console.log('📊 Connection Config:');
    console.log('Host:', dbConfig.host);
    console.log('Port:', dbConfig.port);
    console.log('User:', dbConfig.user);
    console.log('Database:', dbConfig.database);
    console.log('Password:', dbConfig.password ? '***SET***' : 'NOT_SET');
    console.log('');

    try {
        // Test connection
        console.log('🚀 Attempting to connect...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected successfully!\n');

        // Test database selection
        console.log('🔍 Testing database access...');
        await connection.execute('USE PSPD');
        console.log('✅ Successfully switched to PSPD database\n');

        // Check if user table exists
        console.log('🔍 Checking if user table exists...');
        const [tables] = await connection.execute("SHOW TABLES LIKE 'user'");
        if (tables.length > 0) {
            console.log('✅ User table exists\n');
            
            // Count users
            console.log('🔍 Counting users...');
            const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM user');
            console.log(`✅ Found ${userCount[0].count} users\n`);

            // List all users
            console.log('👥 All users in database:');
            const [users] = await connection.execute('SELECT id_user, nom, prenom, email, roles FROM user ORDER BY id_user');
            users.forEach(user => {
                console.log(`  ${user.id_user}. ${user.nom} ${user.prenom} (${user.email}) - ${user.roles}`);
            });
            console.log('');

            // Test specific user
            console.log('🔍 Testing raulrusescu@gmail.com...');
            const [raulUser] = await connection.execute('SELECT * FROM user WHERE email = ?', ['raulrusescu@gmail.com']);
            if (raulUser.length > 0) {
                console.log('✅ raulrusescu@gmail.com found!');
                console.log('   ID:', raulUser[0].id_user);
                console.log('   Name:', raulUser[0].nom, raulUser[0].prenom);
                console.log('   Roles:', raulUser[0].roles);
                console.log('   Verified:', raulUser[0].verified);
                console.log('   Accepted:', raulUser[0].accepted);
            } else {
                console.log('❌ raulrusescu@gmail.com NOT found!');
            }
            console.log('');

        } else {
            console.log('❌ User table does not exist!');
        }

        // Check other important tables
        console.log('🔍 Checking other tables...');
        const [allTables] = await connection.execute('SHOW TABLES');
        console.log('📋 All tables in PSPD:');
        allTables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

        await connection.end();
        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
    }
}

testRailwayConnection();
