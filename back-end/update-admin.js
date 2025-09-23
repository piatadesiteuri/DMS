const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { dbUpdateUser } = require('./db/db');

async function updateAdmin() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway'
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