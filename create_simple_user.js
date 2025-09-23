const bcrypt = require('bcrypt');

async function createSimpleUser() {
    try {
        // Create a simple password hash for 'password'
        const password = 'password';
        const hash = await bcrypt.hash(password, 10);
        
        console.log('🔐 Password hash for "password":', hash);
        
        // SQL to insert/update user with this hash
        const sql = `
UPDATE user SET password = '${hash}' WHERE email = 'raulrusescu@gmail.com';
`;
        
        console.log('\n📝 SQL to run in Railway:');
        console.log(sql);
        
        console.log('\n🎯 Then try logging in with:');
        console.log('Email: raulrusescu@gmail.com');
        console.log('Password: password');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

createSimpleUser();
