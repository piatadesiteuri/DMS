const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createUser() {
  // Create the connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'railway'
  });

  try {
    // Generate password hash
    const hashedPassword = await bcrypt.hash('User1234!', 10);
    console.log('Generated hash:', hashedPassword);

    // Insert the new user
    const [result] = await connection.execute(
      'INSERT INTO user (prenom, nom, email, password, roles, verified, accepted) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['John', 'Doe', 'john.doe@example.com', hashedPassword, 'user', 1, 0]
    );

    console.log('User created successfully:', result);

    // Verify the insertion
    const [rows] = await connection.execute(
      'SELECT id_user, email, roles FROM user WHERE email = ?',
      ['john.doe@example.com']
    );

    console.log('Created user:', rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    // Close the connection
    await connection.end();
  }
}

createUser(); 