const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * Calculate the total size of a directory recursively
 * @param {string} dirPath - Path to the directory
 * @returns {Promise<number>} - Total size in bytes
 */
async function calculateDirSize(dirPath) {
  let totalSize = 0;
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await calculateDirSize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating directory size:', error);
    throw error;
  }
}

// Create a simple connection to the database
const connectionConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'PSPD'
};

/**
 * Get storage usage information for the uploads directory
 * @returns {Promise<Object>} - Storage usage information
 */
async function getStorageUsage() {
  try {
    console.log('Attempting to connect to the database...');
    // Connect to the database
    const con = await mysql.createConnection(connectionConfig);
    console.log('Connected to the database. Executing query...');
    
    // Query to sum the file_size from the table_document
    const [rows] = await con.execute('SELECT SUM(file_size) AS totalSizeBytes FROM table_document');
    console.log('Query executed successfully.');
    con.end();
    
    // Get the total size in bytes
    const totalSizeBytes = rows[0].totalSizeBytes || 0;
    console.log(`Total size in bytes: ${totalSizeBytes}`);
    
    // Convert to MB for easier reading
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    console.log(`Total size in MB: ${totalSizeMB}`);
    
    return {
      totalSizeBytes,
      totalSizeMB
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    throw error;
  }
}

module.exports = {
  getStorageUsage
}; 