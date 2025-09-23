const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUserLogs } = require('../utils/logger');
const { getStorageUsage } = require('../utils/storage');
const { getAllPlans, getCurrentPlan, setCurrentPlan } = require('../utils/plans');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const db = require('../db/db');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.database') });

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    console.log('Attempting to fetch users from database...');
    
    // Get all users except the current admin
    const users = await db.dbListUsers(req.session.id_user);
    console.log('Query executed successfully, found', users.length, 'users');
    
    // Transform the data to match the frontend expectations
    const transformedUsers = users.map(user => ({
      id: user.id_user,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      roles: user.roles,
      verified: user.verified
    }));
    
    res.json(transformedUsers);
  } catch (error) {
    console.error('Detailed error in /users route:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to get users',
      details: error.message,
      code: error.code
    });
  }
});

// Get user logs with pagination
router.get('/user-logs', authenticateToken, async (req, res) => {
  try {
    const { 
      limit = 10, 
      page = 1, 
      userId, 
      action, 
      startDate, 
      endDate,
      timeOnly,
      startTimeOnly,
      endTimeOnly 
    } = req.query;
    
    console.log('Fetching logs with filters:', {
      limit,
      page,
      userId,
      action,
      startDate,
      endDate,
      timeOnly,
      startTimeOnly,
      endTimeOnly
    });
    
    const result = await getUserLogs({
      limit: parseInt(limit),
      page: parseInt(page),
      userId,
      action,
      startDate,
      endDate,
      timeOnly: timeOnly === 'true',
      startTimeOnly,
      endTimeOnly
    });
    
    console.log(`Found ${result.total} logs`);
    
    res.json({
      success: true,
      logs: result.logs,
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user logs'
    });
  }
});

// Add a new route to get all possible action types
router.get('/action-types', async (req, res) => {
  try {
    const con = await pool.getConnection();
    
    // Query to get all unique action types from the user_logs table
    const query = `
      SELECT DISTINCT action 
      FROM user_logs 
      ORDER BY action
    `;
    
    const [actionTypes] = await con.query(query);
    con.release();
    
    // Extract just the action names from the result
    const actions = actionTypes.map(row => row.action);
    
    res.json({
      success: true,
      actionTypes: actions
    });
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action types'
    });
  }
});

// Get storage usage information
router.get('/storage-usage', authenticateToken, async (req, res) => {
  try {
    const storageInfo = await getStorageUsage();
    const currentPlan = getCurrentPlan();
    
    // Check if storage usage exceeds the plan limit
    const isExceeded = storageInfo.totalSizeMB > currentPlan.storageLimitMB;
    
    res.json({
      success: true,
      storage: storageInfo,
      currentPlan: currentPlan.id,
      planDetails: currentPlan,
      isExceeded
    });
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage usage'
    });
  }
});

// Get all available plans
router.get('/plans', authenticateToken, (req, res) => {
  try {
    const plans = getAllPlans();
    const currentPlan = getCurrentPlan();
    
    res.json({
      success: true,
      plans,
      currentPlan: currentPlan.id
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
});

// Activate a plan
router.post('/plans/activate', authenticateToken, (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }
    
    const success = setCurrentPlan(planId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID'
      });
    }
    
    res.json({
      success: true,
      message: 'Plan activated successfully'
    });
  } catch (error) {
    console.error('Error activating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate plan'
    });
  }
});

// Handle storage upgrade requests
router.post('/storage-upgrade-request', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      user_id,
      current_usage,
      plan_limit,
      file_size,
      required_space,
      reason
    } = req.body;

    // Validate required fields
    if (!user_id || !current_usage || !plan_limit) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get the connection
    const con = await pool.getConnection();

    try {
      // Get the superadmin who created this user
      const [userDetails] = await con.query(
        'SELECT u.nom, u.prenom, u.email, u.created_by, ' +
        'creator.nom as creator_nom, creator.prenom as creator_prenom, creator.email as creator_email ' +
        'FROM user u ' +
        'LEFT JOIN user creator ON u.created_by = creator.id_user ' +
        'WHERE u.id_user = ?',
        [user_id]
      );

      if (!userDetails || userDetails.length === 0) {
        throw new Error('User not found');
      }

      const user = userDetails[0];
      
      if (!user.created_by) {
        throw new Error('No superadmin found for this user');
      }

      // Store the notification request using the db module function
      const result = await db.dbStoreNotificationRequest(
        user_id,
        'storage_upgrade',
        current_usage,
        plan_limit,
        reason,
        user.created_by // Add the superadmin ID here
      );

      if (result && result.affectedRows === 1) {
        // Create notification object
        const notification = {
          type: 'storage_upgrade',
          requestId: result.insertId,
          userId: user_id,
          userName: `${user.prenom} ${user.nom}`,
          userEmail: user.email,
          superadminId: user.created_by,
          superadminName: `${user.creator_prenom} ${user.creator_nom}`,
          superadminEmail: user.creator_email,
          current_usage,
          plan_limit,
          file_size,
          required_space,
          reason,
          timestamp: new Date().toISOString()
        };

        // Emit the notification only to the specific superadmin
        req.app.get('io').to(`user_${user.created_by}`).emit('newNotification', notification);

        res.json({
          success: true,
          message: 'Storage upgrade request submitted successfully',
          request_id: result.insertId
        });
      } else {
        throw new Error('Failed to insert request into database');
      }
    } finally {
      con.release();
    }
  } catch (error) {
    console.error('Error processing storage upgrade request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process storage upgrade request',
      details: error.message
    });
  }
});

// Get all notifications
router.get('/notifications', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.id_user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get all notifications from the database
    const con = await pool.getConnection();
    const [notifications] = await con.query(`
      SELECT nr.*, u.prenom, u.nom, u.email 
      FROM notification_requests nr
      JOIN user u ON nr.user_id = u.id_user
      WHERE nr.superadmin_id = ?
      ORDER BY nr.created_at DESC
    `, [req.session.id_user]);
    con.release();

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  let con;
  try {
    console.log('Marking notification as read:', req.params.id);
    con = await pool.getConnection();
    
    // First check if the notification exists
    const [notification] = await con.query(
      'SELECT * FROM notification_requests WHERE id_request = ?',
      [req.params.id]
    );
    
    console.log('Found notification:', notification);
    
    if (notification.length === 0) {
      con.release();
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Update the notification status to approved
    const [result] = await con.query(
      'UPDATE notification_requests SET status = ? WHERE id_request = ?',
      ['approved', req.params.id]
    );
    
    console.log('Update result:', result);
    
    if (result.affectedRows === 0) {
      con.release();
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Verify the update
    const [updatedNotification] = await con.query(
      'SELECT * FROM notification_requests WHERE id_request = ?',
      [req.params.id]
    );
    
    console.log('Updated notification:', updatedNotification);
    
    con.release();
    res.json({ success: true, notification: updatedNotification[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    if (con) con.release();
    res.status(500).json({ error: 'Failed to mark notification as read', details: error.message });
  }
});

// Get download statistics
router.get('/statistics/downloads', async (req, res) => {
  try {
    const { startDate, endDate, documentId } = req.query;
    let dateFilter = '';
    let documentFilter = '';

    if (startDate && endDate) {
      dateFilter = 'AND dl.download_time BETWEEN ? AND ?';
    }

    if (documentId) {
      documentFilter = 'AND d.id_document = ?';
    }

    const con = await pool.getConnection();
    const query = `
      SELECT 
        d.id_document,
        d.nom_document as document_name,
        COUNT(dl.id_download) as download_count,
        MAX(dl.download_time) as last_downloaded,
        u.prenom,
        u.nom,
        CONCAT(u.prenom, ' ', u.nom) as user_name
      FROM table_document d
      LEFT JOIN table_download dl ON d.id_document = dl.id_document
      LEFT JOIN user u ON dl.id_user = u.id_user
      WHERE 1=1
      ${dateFilter}
      ${documentFilter}
      GROUP BY d.id_document, d.nom_document, u.prenom, u.nom
      ORDER BY download_count DESC
    `;

    const params = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
    }
    if (documentId) {
      params.push(documentId);
    }

    const [results] = await con.query(query, params);
    con.release();

    res.json(results);
  } catch (error) {
    console.error('Error fetching download statistics:', error);
    res.status(500).json({ error: 'Failed to fetch download statistics' });
  }
});

// Get most popular documents
router.get('/statistics/popular', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';

    if (startDate && endDate) {
      dateFilter = 'AND dl.download_time BETWEEN ? AND ?';
    }

    const con = await pool.getConnection();
    const query = `
      SELECT 
        d.id_document,
        d.nom_document as document_name,
        COUNT(dl.id_download) as download_count,
        MAX(dl.download_time) as last_downloaded
      FROM table_document d
      LEFT JOIN table_download dl ON d.id_document = dl.id_document
      WHERE 1=1
      ${dateFilter}
      GROUP BY d.id_document, d.nom_document
      ORDER BY download_count DESC
      LIMIT 10
    `;

    const [results] = await con.query(query, startDate && endDate ? [startDate, endDate] : []);
    con.release();

    res.json(results);
  } catch (error) {
    console.error('Error fetching popular documents:', error);
    res.status(500).json({ error: 'Failed to fetch popular documents' });
  }
});

// Get document types distribution
router.get('/statistics/types', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';

    if (startDate && endDate) {
      dateFilter = 'AND created_at BETWEEN ? AND ?';
    }

    const con = await pool.getConnection();
    const query = `
      WITH total_docs AS (
        SELECT COUNT(*) as total
        FROM table_document
        WHERE 1=1
        ${dateFilter}
      )
      SELECT 
        type_document as document_type,
        COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (SELECT total FROM total_docs)), 2) as percentage
      FROM table_document
      WHERE 1=1
      ${dateFilter}
      GROUP BY type_document
      ORDER BY count DESC
    `;

    const [results] = await con.query(query, startDate && endDate ? [startDate, endDate] : []);
    con.release();

    res.json(results);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

// Get user activity
router.get('/statistics/activity', async (req, res) => {
  try {
    const { timeRange, userId } = req.query;
    let timeFilter = '';
    let userFilter = '';

    // Set time range filter
    switch (timeRange) {
      case '24h':
        timeFilter = 'AND action_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case '7d':
        timeFilter = 'AND action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        timeFilter = 'AND action_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        timeFilter = 'AND action_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      default:
        timeFilter = 'AND action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // Set user filter
    if (userId && userId !== 'all') {
      userFilter = 'AND ul.id_user = ?';
    }

    const con = await pool.getConnection();
    const query = `
      SELECT 
        ul.id_log as id,
        u.prenom,
        u.nom,
        CONCAT(u.prenom, ' ', u.nom) as user_name,
        ul.action,
        d.nom_document as document_name,
        ul.action_time as timestamp
      FROM user_logs ul
      LEFT JOIN user u ON ul.id_user = u.id_user
      LEFT JOIN table_document d ON ul.id_document = d.id_document
      WHERE 1=1
      ${timeFilter}
      ${userFilter}
      ORDER BY ul.action_time DESC
    `;

    const [results] = await con.query(query, userId && userId !== 'all' ? [userId] : []);
    con.release();

    res.json(results);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's institution
    const [userInstitution] = await pool.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [userId]
    );

    if (!userInstitution.length) {
      return res.status(403).json({ error: 'User not found or no institution assigned' });
    }

    const userInstitutionId = userInstitution[0].institution_id;

    // Get all documents from the institution, including uploader details and document type
    const [documents] = await pool.query(`
      SELECT 
        d.*,
        u.email as uploader_email,
        u.nom as uploader_name,
        u.prenom as uploader_surname,
        dt.name as document_type,
        i.name as institution_name,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id_tag', dtags.id_tag,
            'tag_name', dtags.tag_name,
            'is_predefined', dtags.is_predefined
          )
        ) as tags
      FROM table_document d
      JOIN user u ON d.id_user_source = u.id_user
      JOIN document_types dt ON d.type_id = dt.id
      JOIN institutions i ON u.institution_id = i.id_institution
      LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
      LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
      WHERE u.institution_id = ?
      GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
               d.date_upload, d.comment, d.id_user_source, u.email, u.nom, u.prenom,
               dt.name, i.name
      ORDER BY d.date_upload DESC
    `, [userInstitutionId]);

    // Process the results to parse the tags JSON
    const processedDocuments = documents.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
    }));

    res.json(processedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get documents from public folders for admin
router.get('/documents/public', async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's institution and role
    const [userInfo] = await pool.query(
      'SELECT institution_id, roles FROM user WHERE id_user = ?',
      [userId]
    );

    if (!userInfo.length || userInfo[0].roles !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const userInstitutionId = userInfo[0].institution_id;

    // Get all documents from public folders in the institution
    const [documents] = await pool.query(`
      SELECT 
        d.*,
        u.email as uploader_email,
        u.nom as uploader_name,
        u.prenom as uploader_surname,
        dt.type_name as document_type,
        i.name as institution_name,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id_tag', dtags.id_tag,
            'tag_name', dtags.tag_name,
            'is_predefined', dtags.is_predefined
          )
        ) as tags
      FROM table_document d
      JOIN user u ON d.id_user_source = u.id_user
      JOIN document_types dt ON d.type_id = dt.id
      JOIN institutions i ON u.institution_id = i.id_institution
      JOIN folders f ON d.path LIKE CONCAT(f.folder_path, '%')
      LEFT JOIN document_tag_relations dtr ON d.id_document = dtr.id_document
      LEFT JOIN document_tags dtags ON dtr.id_tag = dtags.id_tag
      WHERE u.institution_id = ? 
      AND f.is_private = 0
      GROUP BY d.id_document, d.nom_document, d.nom_document_original, d.type_id, d.path, 
               d.date_upload, d.comment, d.id_user_source, u.email, u.nom, u.prenom,
               dt.type_name, i.name
      ORDER BY d.date_upload DESC
    `, [userInstitutionId]);

    // Process the results to parse the tags JSON
    const processedDocuments = documents.map(doc => ({
      ...doc,
      tags: doc.tags ? JSON.parse(`[${doc.tags}]`) : []
    }));

    res.json(processedDocuments);
  } catch (error) {
    console.error('Error fetching public documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin profile with institution info
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const [admin] = await pool.query(
      'SELECT u.*, i.name as institution_name FROM users u JOIN institutions i ON u.institution_id = i.id WHERE u.id = ? AND u.role = "admin"',
      [userId]
    );

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      institution_id: admin.institution_id,
      institution_name: admin.institution_name,
      role: admin.role
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get documents from admin's institution
router.get('/documents/institution/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;
    const userId = req.session.userId;

    // Verifică dacă utilizatorul aparține instituției
    const [user] = await pool.query(
      'SELECT * FROM user WHERE id_user = ? AND institution_id = ?',
      [userId, institutionId]
    );

    if (!user.length) {
      return res.status(403).json({ error: 'Unauthorized access to institution documents' });
    }

    // Obține toate documentele din instituție
    const [documents] = await pool.query(`
      SELECT d.*, u.email as uploader_email, u.nom as uploader_name, u.prenom as uploader_surname,
             dt.name as document_type, i.name as institution_name
      FROM table_document d
      JOIN user u ON d.id_user_source = u.id_user
      JOIN document_types dt ON d.type_id = dt.id
      JOIN institutions i ON u.institution_id = i.id_institution
      WHERE u.institution_id = ?
      ORDER BY d.date_upload DESC
    `, [institutionId]);

    res.json(documents);
  } catch (error) {
    console.error('Error fetching institution documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get document by ID with institution check
router.get('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.session.userId;

    // Obține instituția utilizatorului curent
    const [userInstitution] = await pool.query(
      'SELECT institution_id FROM user WHERE id_user = ?',
      [userId]
    );

    if (!userInstitution.length) {
      return res.status(403).json({ error: 'User not found or no institution assigned' });
    }

    const userInstitutionId = userInstitution[0].institution_id;

    // Verifică dacă utilizatorul are acces la document
    const [document] = await pool.query(`
      SELECT d.*, u.email as uploader_email, u.nom as uploader_name, u.prenom as uploader_surname,
             dt.name as document_type, i.name as institution_name
      FROM table_document d
      JOIN user u ON d.id_user_source = u.id_user
      JOIN document_types dt ON d.type_id = dt.id
      JOIN institutions i ON u.institution_id = i.id_institution
      WHERE d.id_document = ? AND u.institution_id = ?
    `, [documentId, userInstitutionId]);

    if (!document.length) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    res.json(document[0]);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;