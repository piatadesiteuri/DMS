const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { dbUpdateUser } = require('./db/db');

async function updateAdmin() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'digital_documents_db'
  });

  try {
    const plainPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // Using 10 rounds for consistency
    const email = 'admin2@example.com';
    
    await dbUpdateUser(email, hashedPassword, 'admin');
    console.log('Admin user updated successfully');

    // Verify the update
    const [rows] = await connection.execute(
      'SELECT email, roles, password FROM user WHERE email = ?',
      [email]
    );

    console.log('Updated admin:', rows[0]);
  } catch (error) {
    console.error('Error updating admin user:', error);
  } finally {
    // Close the connection
    await connection.end();
  }
}

updateAdmin(); 