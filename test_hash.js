// Test what password matches this hash
const bcrypt = require('bcrypt');

async function testHash() {
    const hash = '$2b$10$O1b.JK3ir2ooEu5sfOtoWuNF9tsTdwbfS0/r2wv7hcKyT0CU1bYpa';
    
    const passwords = [
        'User1234!',
        'password',
        '123456',
        'admin',
        'test'
    ];
    
    for (const password of passwords) {
        try {
            const match = await bcrypt.compare(password, hash);
            console.log(`Password "${password}": ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
        } catch (error) {
            console.log(`Password "${password}": ERROR - ${error.message}`);
        }
    }
}

testHash();
