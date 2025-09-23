const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function updateDirectorPassword() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway'
  });

  try {
    // Generate password hash
    const hashedPassword = await bcrypt.hash('Director123!', 10);
    console.log('Generated hash:', hashedPassword);

    // Update the password in the database
    const [result] = await connection.execute(
      'UPDATE user SET password = ? WHERE email = ?',
      [hashedPassword, 'director@example.com']
    );

    console.log('Update result:', result);

    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id_user, email, password FROM user WHERE email = ?',
      ['director@example.com']
    );

    console.log('Updated director:', rows[0]);
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    // Close the connection
    await connection.end();
  }
}

updateDirectorPassword(); 