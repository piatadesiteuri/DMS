const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.DB_DATABASE || 'PSPD',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const logUserAction = async (userId, action, details = '') => {
  try {
    const con = await pool.getConnection();
    await con.query(
      'INSERT INTO user_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, details]
    );
    con.release();
  } catch (error) {
    console.error('Error logging user action:', error);
  }
};

const logDocumentDownload = async (userId, documentName, documentId) => {
  try {
    const con = await pool.getConnection();
    const details = `Downloaded document: ${documentName}`;
    await con.query(
      'INSERT INTO user_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'Download Document', details]
    );
    con.release();
  } catch (error) {
    console.error('Error logging document download:', error);
  }
};

const getUserLogs = async (options = {}) => {
  try {
    const {
      userId = null,
      startDate = null,
      endDate = null,
      action = null,
      timeOnly = false,
      startTimeOnly = null,
      endTimeOnly = null,
      limit = 100,
      page = 1
    } = options;
    
    const con = await pool.getConnection();
    
    // First, get the total count of logs matching the criteria
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_logs ul 
      JOIN user u ON ul.user_id = u.id_user
      WHERE 1=1
    `;
    const countParams = [];

    if (userId) {
      countQuery += ' AND ul.user_id = ?';
      countParams.push(userId);
    }

    if (timeOnly === true) {
      // Time-only filtering using TIME() function for clearer comparison
      if (startTimeOnly) {
        countQuery += ' AND TIME(ul.created_at) >= ?';
        countParams.push(startTimeOnly);
      }
      
      if (endTimeOnly) {
        countQuery += ' AND TIME(ul.created_at) <= ?';
        countParams.push(endTimeOnly);
      }
    } else {
      // Date and time filtering
      if (startDate) {
        countQuery += ' AND ul.created_at >= ?';
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ' AND ul.created_at <= ?';
        countParams.push(endDate);
      }
    }

    if (action) {
      countQuery += ' AND ul.action = ?';
      countParams.push(action);
    }

    console.log('Executing count query:', countQuery);
    console.log('With params:', countParams);
    
    const [countResult] = await con.query(countQuery, countParams);
    const total = countResult[0].total;
    
    // Now get the paginated logs
    let query = `
      SELECT ul.*, u.prenom, u.nom 
      FROM user_logs ul 
      JOIN user u ON ul.user_id = u.id_user
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND ul.user_id = ?';
      params.push(userId);
    }

    if (timeOnly === true) {
      // Time-only filtering using TIME() function for clearer comparison
      if (startTimeOnly) {
        query += ' AND TIME(ul.created_at) >= ?';
        params.push(startTimeOnly);
      }
      
      if (endTimeOnly) {
        query += ' AND TIME(ul.created_at) <= ?';
        params.push(endTimeOnly);
      }
    } else {
      // Date and time filtering
      if (startDate) {
        query += ' AND ul.created_at >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND ul.created_at <= ?';
        params.push(endDate);
      }
    }

    if (action) {
      query += ' AND ul.action = ?';
      params.push(action);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    query += ' ORDER BY ul.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [logs] = await con.query(query, params);
    con.release();
    return { logs, total };
  } catch (error) {
    console.error('Error getting user logs:', error);
    return { logs: [], total: 0 };
  }
};

module.exports = {
  logUserAction,
  logDocumentDownload,
  getUserLogs
}; 