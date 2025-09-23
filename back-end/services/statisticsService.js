const pool = require('../db/db');

class StatisticsService {
  /**
   * Get user statistics for dashboard
   * @param {number} userId - User ID
   * @returns {Object} User statistics
   */
  async getUserStats(userId) {
    try {
      const con = await pool.getConnection();
      
      // Get total documents count
      const [totalDocs] = await con.query(
        `SELECT COUNT(*) as totalDocuments 
         FROM table_document 
         WHERE id_user_source = ?`,
        [userId]
      );

      // Get uploads in last 7 days
      const [uploads7d] = await con.query(
        `SELECT COUNT(*) as uploads7d 
         FROM document_statistics 
         WHERE id_user = ? 
         AND action_type = 'upload' 
         AND action_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [userId]
      );

      // Get downloads in last 7 days
      const [downloads7d] = await con.query(
        `SELECT COUNT(*) as downloads7d 
         FROM document_statistics 
         WHERE id_user = ? 
         AND action_type = 'download' 
         AND action_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [userId]
      );

      // Get deletes in last 7 days
      const [deletes7d] = await con.query(
        `SELECT COUNT(*) as deletes7d 
         FROM document_statistics 
         WHERE id_user = ? 
         AND action_type = 'delete' 
         AND action_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [userId]
      );

      con.release();

      return {
        success: true,
        totalDocuments: totalDocs[0].totalDocuments || 0,
        uploads7d: uploads7d[0].uploads7d || 0,
        downloads7d: downloads7d[0].downloads7d || 0,
        deletes7d: deletes7d[0].deletes7d || 0
      };

    } catch (error) {
      console.error("Error getting user statistics:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get user activity logs with pagination and date filtering
   * @param {number} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} startDate - Start date filter (optional)
   * @param {string} endDate - End date filter (optional)
   * @returns {Object} User logs with pagination
   */
  async getUserLogs(userId, page = 1, limit = 20, startDate = null, endDate = null) {
    try {
      const con = await pool.getConnection();
      const offset = (page - 1) * limit;

      // Build date filter conditions
      let dateFilter = '';
      let userLogsParams = [userId];
      let docStatsParams = [userId];
      
      if (startDate && endDate) {
        dateFilter = ' AND ul.created_at BETWEEN ? AND ?';
        userLogsParams.push(startDate, endDate);
        docStatsParams.push(startDate, endDate);
      }

      // Get user logs (login/logout)
      const [userLogsResult] = await con.query(`
        SELECT 
          'user_action' as source,
          ul.action as action,
          ul.details as details,
          ul.created_at as created_at,
          u.prenom,
          u.nom
        FROM user_logs ul
        JOIN user u ON ul.user_id = u.id_user
        WHERE ul.user_id = ?${dateFilter}
        ORDER BY ul.created_at DESC
        LIMIT ? OFFSET ?
      `, [...userLogsParams, limit, offset]);

      // Get document statistics (upload/download/view/delete)
      const [docStatsResult] = await con.query(`
        SELECT 
          'document_action' as source,
          CASE 
            WHEN ds.action_type = 'upload' THEN 'UPLOAD_DOCUMENT'
            WHEN ds.action_type = 'download' THEN 'DOWNLOAD_DOCUMENT'
            WHEN ds.action_type = 'view' THEN 'VIEW_DOCUMENT'
            WHEN ds.action_type = 'delete' THEN 'DELETE_DOCUMENT'
            ELSE UPPER(ds.action_type)
          END as action,
          CONCAT(
            CASE 
              WHEN ds.action_type = 'upload' THEN 'Uploaded document: '
              WHEN ds.action_type = 'download' THEN 'Downloaded document: '
              WHEN ds.action_type = 'view' THEN 'Viewed document: '
              WHEN ds.action_type = 'delete' THEN 'Deleted document: '
              ELSE 'Action on document: '
            END,
            COALESCE(td.nom_document, CONCAT('Document ID: ', ds.id_document))
          ) as details,
          ds.action_timestamp as created_at,
          ds.id_document,
          td.nom_document,
          u.prenom,
          u.nom
        FROM document_statistics ds
        JOIN user u ON ds.id_user = u.id_user
        LEFT JOIN table_document td ON ds.id_document = td.id_document
        WHERE ds.id_user = ?${dateFilter ? ' AND ds.action_timestamp BETWEEN ? AND ?' : ''}
        ORDER BY ds.action_timestamp DESC
        LIMIT ? OFFSET ?
      `, [...docStatsParams, limit, offset]);

      // Get document views from document_log
      const [docViewsResult] = await con.query(`
        SELECT 
          'document_view' as source,
          'VIEW_DOCUMENT' as action,
          CONCAT('Viewed document: ', COALESCE(td.nom_document, dl.nom_doc)) as details,
          dl.last_opened_at as created_at,
          td.id_document,
          td.nom_document,
          u.prenom,
          u.nom,
          dl.open_count
        FROM document_log dl
        JOIN user u ON dl.user_id = u.id_user
        LEFT JOIN table_document td ON td.nom_document = dl.nom_doc OR td.nom_document_original = dl.nom_doc
        WHERE dl.user_id = ?${dateFilter ? ' AND dl.last_opened_at BETWEEN ? AND ?' : ''}
        ORDER BY dl.last_opened_at DESC
        LIMIT ? OFFSET ?
      `, [...userLogsParams, limit, offset]);

      // Combine and sort all logs
      const allLogs = [...userLogsResult, ...docStatsResult, ...docViewsResult];
      allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Get total count for pagination with date filtering
      let totalCountQuery = `
        SELECT 
          (SELECT COUNT(*) FROM user_logs WHERE user_id = ?) +
          (SELECT COUNT(*) FROM document_statistics WHERE id_user = ?) +
          (SELECT COUNT(*) FROM document_log WHERE user_id = ?) as total
      `;
      let totalCountParams = [userId, userId, userId];

      if (startDate && endDate) {
        totalCountQuery = `
          SELECT 
            (SELECT COUNT(*) FROM user_logs WHERE user_id = ? AND created_at BETWEEN ? AND ?) +
            (SELECT COUNT(*) FROM document_statistics WHERE id_user = ? AND action_timestamp BETWEEN ? AND ?) +
            (SELECT COUNT(*) FROM document_log WHERE user_id = ? AND last_opened_at BETWEEN ? AND ?) as total
        `;
        totalCountParams = [userId, startDate, endDate, userId, startDate, endDate, userId, startDate, endDate];
      }
      
      const [totalCount] = await con.query(totalCountQuery, totalCountParams);

      con.release();

      return {
        success: true,
        logs: allLogs,
        pagination: {
          page,
          limit,
          total: totalCount[0].total,
          totalPages: Math.ceil(totalCount[0].total / limit)
        }
      };

    } catch (error) {
      console.error("Error getting user logs:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get performance statistics for all users in the same institution
   * @param {number} userId - User ID (to determine institution)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {string} startDate - Start date filter (optional)
   * @param {string} endDate - End date filter (optional)
   * @returns {Object} Performance statistics for all users in institution
   */
  async getInstitutionPerformanceStats(userId, page = 1, limit = 20, startDate = null, endDate = null) {
    try {
      const con = await pool.getConnection();
      const offset = (page - 1) * limit;

      // First, get the user's institution
      const [userInstitution] = await con.query(`
        SELECT institution_id FROM user WHERE id_user = ?
      `, [userId]);

      if (!userInstitution || userInstitution.length === 0) {
        con.release();
        throw new Error('User institution not found');
      }

      const institutionId = userInstitution[0].institution_id;

      // Build date filter conditions
      let dateFilter = '';
      let userLogsParams = [institutionId];
      let docStatsParams = [institutionId];
      
      if (startDate && endDate) {
        dateFilter = ' AND ul.created_at BETWEEN ? AND ?';
        userLogsParams.push(startDate, endDate);
        docStatsParams.push(startDate, endDate);
      }

      // Get user logs (login/logout) for all users in institution
      const [userLogsResult] = await con.query(`
        SELECT 
          'user_action' as source,
          ul.action as action,
          ul.details as details,
          ul.created_at as created_at,
          ul.user_id,
          u.prenom,
          u.nom
        FROM user_logs ul
        JOIN user u ON ul.user_id = u.id_user
        WHERE u.institution_id = ?${dateFilter}
        ORDER BY ul.created_at DESC
        LIMIT ? OFFSET ?
      `, [...userLogsParams, limit, offset]);

      // Get document statistics (upload/download/view/delete) for all users in institution
      const [docStatsResult] = await con.query(`
        SELECT 
          'document_action' as source,
          CASE 
            WHEN ds.action_type = 'upload' THEN 'UPLOAD_DOCUMENT'
            WHEN ds.action_type = 'download' THEN 'DOWNLOAD_DOCUMENT'
            WHEN ds.action_type = 'view' THEN 'VIEW_DOCUMENT'
            WHEN ds.action_type = 'delete' THEN 'DELETE_DOCUMENT'
            ELSE UPPER(ds.action_type)
          END as action,
          CONCAT(
            CASE 
              WHEN ds.action_type = 'upload' THEN 'Uploaded document: '
              WHEN ds.action_type = 'download' THEN 'Downloaded document: '
              WHEN ds.action_type = 'view' THEN 'Viewed document: '
              WHEN ds.action_type = 'delete' THEN 'Deleted document: '
              ELSE 'Action on document: '
            END,
            COALESCE(td.nom_document, CONCAT('Document ID: ', ds.id_document))
          ) as details,
          ds.action_timestamp as created_at,
          ds.id_user as user_id,
          ds.id_document,
          td.nom_document,
          u.prenom,
          u.nom
        FROM document_statistics ds
        JOIN user u ON ds.id_user = u.id_user
        LEFT JOIN table_document td ON ds.id_document = td.id_document
        WHERE u.institution_id = ?${dateFilter.replace('ul.created_at', 'ds.action_timestamp')}
        ORDER BY ds.action_timestamp DESC
        LIMIT ? OFFSET ?
      `, [...docStatsParams, limit, offset]);

      // Get document views from document_log for all users in institution
      const [docViewsResult] = await con.query(`
        SELECT
          'document_view' as source,
          'VIEW_DOCUMENT' as action,
          CONCAT('Viewed document: ', COALESCE(td.nom_document, dl.nom_doc)) as details,
          dl.last_opened_at as created_at,
          dl.user_id,
          td.id_document,
          td.nom_document,
          u.prenom,
          u.nom,
          dl.open_count
        FROM document_log dl
        JOIN user u ON dl.user_id = u.id_user
        LEFT JOIN table_document td ON td.nom_document = dl.nom_doc OR td.nom_document_original = dl.nom_doc
        WHERE u.institution_id = ?${dateFilter.replace('ul.created_at', 'dl.last_opened_at')}
        ORDER BY dl.last_opened_at DESC
        LIMIT ? OFFSET ?
      `, [...userLogsParams, limit, offset]);

      // Combine all logs
      const allLogs = [...userLogsResult, ...docStatsResult, ...docViewsResult];

      // Get total count for pagination
      let totalCountQuery = `
        SELECT
          (SELECT COUNT(*) FROM user_logs ul JOIN user u ON ul.user_id = u.id_user WHERE u.institution_id = ?) +
          (SELECT COUNT(*) FROM document_statistics ds JOIN user u ON ds.id_user = u.id_user WHERE u.institution_id = ?) +
          (SELECT COUNT(*) FROM document_log dl JOIN user u ON dl.user_id = u.id_user WHERE u.institution_id = ?) as total
      `;
      let totalCountParams = [institutionId, institutionId, institutionId];

      if (startDate && endDate) {
        totalCountQuery = `
          SELECT
            (SELECT COUNT(*) FROM user_logs ul JOIN user u ON ul.user_id = u.id_user WHERE u.institution_id = ? AND ul.created_at BETWEEN ? AND ?) +
            (SELECT COUNT(*) FROM document_statistics ds JOIN user u ON ds.id_user = u.id_user WHERE u.institution_id = ? AND ds.action_timestamp BETWEEN ? AND ?) +
            (SELECT COUNT(*) FROM document_log dl JOIN user u ON dl.user_id = u.id_user WHERE u.institution_id = ? AND dl.last_opened_at BETWEEN ? AND ?) as total
        `;
        totalCountParams = [institutionId, startDate, endDate, institutionId, startDate, endDate, institutionId, startDate, endDate];
      }

      const [totalCountResult] = await con.query(totalCountQuery, totalCountParams);
      const totalCount = totalCountResult[0].total;

      con.release();

      return {
        success: true,
        logs: allLogs,
        totalCount: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit)
      };
    } catch (error) {
      console.error("Error getting institution performance stats:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get storage statistics for user with date filtering
   * @param {number} userId - User ID
   * @param {string} startDate - Start date filter (optional)
   * @param {string} endDate - End date filter (optional)
   * @returns {Object} Storage statistics
   */
  async getStorageStats(userId, startDate = null, endDate = null) {
    try {
      const con = await pool.getConnection();
      
      // Get user's institution
      const [userInstitution] = await con.query(
        `SELECT i.* 
         FROM institutions i 
         JOIN user u ON i.id_institution = u.institution_id 
         WHERE u.id_user = ?`,
        [userId]
      );

      if (!userInstitution || userInstitution.length === 0) {
        con.release();
        throw new Error('User institution not found');
      }

      const institution = userInstitution[0];

      // Build date filter for period-specific data
      let dateFilter = '';
      let dateParams = [];
      if (startDate && endDate) {
        dateFilter = ' AND td.date_upload BETWEEN ? AND ?';
        dateParams = [startDate, endDate];
      }

      // Get total storage used by institution (all time)
      const [totalStorageResult] = await con.query(
        `SELECT 
           COALESCE(SUM(file_size), 0) as totalUsage
         FROM table_document td
         JOIN user u ON td.id_user_source = u.id_user
         WHERE u.institution_id = ?`,
        [institution.id_institution]
      );

      // Get storage used in the selected period
      const [periodStorageResult] = await con.query(
        `SELECT 
           COALESCE(SUM(file_size), 0) as periodUsage,
           COUNT(*) as periodDocuments
         FROM table_document td
         JOIN user u ON td.id_user_source = u.id_user
         WHERE u.institution_id = ?${dateFilter}`,
        [institution.id_institution, ...dateParams]
      );

      // Get storage limit for institution
      const storageLimit = institution.storage_limit || 0;

      con.release();

      return {
        success: true,
        totalUsage: totalStorageResult[0].totalUsage || 0,
        periodUsage: periodStorageResult[0].periodUsage || 0,
        periodDocuments: periodStorageResult[0].periodDocuments || 0,
        storageLimit: storageLimit,
        startDate: startDate,
        endDate: endDate
      };

    } catch (error) {
      console.error("Error getting storage statistics:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get document statistics for user
   * @param {number} userId - User ID
   * @returns {Object} Document statistics
   */
  async getDocumentStats(userId) {
    try {
      const con = await pool.getConnection();
      
      // Get user's institution
      const [userInstitution] = await con.query(
        `SELECT i.* 
         FROM institutions i 
         JOIN user u ON i.id_institution = u.institution_id 
         WHERE u.id_user = ?`,
        [userId]
      );

      if (!userInstitution || userInstitution.length === 0) {
        con.release();
        throw new Error('User institution not found');
      }

      const institution = userInstitution[0];

      // Get total documents count
      const [totalDocs] = await con.query(
        `SELECT COUNT(*) as count
         FROM table_document td
         JOIN user u ON td.id_user_source = u.id_user
         WHERE u.institution_id = ?`,
        [institution.id_institution]
      );

      // Get documents by type
      const [docsByType] = await con.query(
        `SELECT 
           dt.type_name,
           COUNT(*) as count
         FROM table_document td
         JOIN user u ON td.id_user_source = u.id_user
         LEFT JOIN document_types dt ON td.type_id = dt.id
         WHERE u.institution_id = ?
         GROUP BY dt.type_name, dt.id
         ORDER BY count DESC`,
        [institution.id_institution]
      );

      // Get total storage
      const [totalStorage] = await con.query(
        `SELECT 
           COALESCE(SUM(file_size), 0) as total_size
         FROM table_document td
         JOIN user u ON td.id_user_source = u.id_user
         WHERE u.institution_id = ?`,
        [institution.id_institution]
      );

      con.release();

      return {
        success: true,
        statistics: {
          totalDocuments: totalDocs[0].count,
          documentsByType: docsByType,
          totalStorage: totalStorage[0].total_size || 0,
          institution: {
            name: institution.institution_name,
            storageLimit: institution.storage_limit
          }
        }
      };

    } catch (error) {
      console.error("Error getting document statistics:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new StatisticsService();
