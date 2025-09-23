const bcrypt = require('bcrypt');

// The hash from the database for your user
const storedHash = '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa';

// Common passwords to test
const commonPasswords = [
    'User1234!',
    'user1234',
    'password',
    'admin',
    '123456',
    'raulrusescu',
    'raul',
    'rusescu',
    'raulrusescu@gmail.com'
];

console.log('🔍 Testing common passwords against your stored hash...\n');

async function testPasswords() {
    for (const password of commonPasswords) {
        try {
            const match = await bcrypt.compare(password, storedHash);
            if (match) {
                console.log(`✅ FOUND! Password is: "${password}"`);
                console.log(`\n🎯 Use these credentials to login:`);
                console.log(`   Email: raulrusescu@gmail.com`);
                console.log(`   Password: ${password}`);
                return;
            } else {
                console.log(`❌ "${password}" - No match`);
            }
        } catch (error) {
            console.log(`⚠️  Error testing "${password}":`, error.message);
        }
    }
    
    console.log('\n❌ None of the common passwords matched.');
    console.log('💡 You might need to reset your password or use a different account.');
    console.log('\n🆘 Alternative accounts you can try:');
    console.log('   Admin: admin@example.com (might use a common password)');
    console.log('   Super Admin: superadmin@example.com');
}

testPasswords();
