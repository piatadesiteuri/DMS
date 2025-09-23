const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updatePassword() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway'
  });

  try {
    // Generate password hash
    const hashedPassword = await bcrypt.hash('Admin1234!', 10);
    console.log('Generated hash:', hashedPassword);

    // Update the password in the database
    const [result] = await connection.execute(
      'UPDATE user SET password = ?, verified = 1 WHERE email = ?',
      [hashedPassword, 'admin@example.com']
    );

    console.log('Update result:', result);

    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id_user, email, password FROM user WHERE email = ?',
      ['admin@example.com']
    );

    console.log('Updated user:', rows[0]);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    // Close the connection
    await connection.end();
  }
}

updatePassword();