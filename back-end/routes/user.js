const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { logUserAction } = require('../utils/logger');

// Get user profile details
router.get('/profile', async (req, res) => {
    console.log('\n=== Profile Request Start ===');
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);
    console.log('Session:', {
        id: req.session.id,
        id_user: req.session.id_user,
        role: req.session.role,
        cookie: req.session.cookie
    });

    if (!req.session || !req.session.id_user) {
        console.log('❌ No session or user ID found');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    let con;
    try {
        const userId = req.session.id_user;
        console.log('🔍 Fetching profile for user ID:', userId);
        
        console.log('🔄 Attempting database connection...');
        con = await db.pool.getConnection();
        console.log('✅ Database connection established');

        // Get basic user info
        console.log('📝 Querying user info...');
        const userQuery = `
            SELECT 
                id_user,
                prenom,
                nom,
                email,
                roles,
                verified,
                accepted,
                created_by,
                phone_number,
                diffuse,
                upload,
                download,
                print,
                dropbox_token,
                current_plan_id
            FROM user 
            WHERE id_user = ?
        `;
        console.log('SQL Query:', userQuery);
        console.log('Query Parameters:', [userId]);
        
        const [userInfo] = await con.query(userQuery, [userId]);
        console.log('📊 User info result:', JSON.stringify(userInfo, null, 2));

        if (!userInfo || userInfo.length === 0) {
            console.log('❌ No user found with ID:', userId);
            con.release();
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user statistics
        console.log('📊 Querying document statistics...');
        const statsQuery = `
            SELECT 
                COUNT(*) as total_documents,
                COALESCE(SUM(file_size), 0) as total_storage,
                (
                    SELECT action_timestamp 
                    FROM document_statistics 
                    WHERE id_user = ? 
                    AND action_type = 'upload'
                    ORDER BY action_timestamp DESC 
                    LIMIT 1
                ) as last_upload
            FROM table_document 
            WHERE id_user_source = ?
        `;
        console.log('SQL Query:', statsQuery);
        console.log('Query Parameters:', [userId, userId]);
        
        const [docStats] = await con.query(statsQuery, [userId, userId]);
        console.log('📊 Document stats result:', JSON.stringify(docStats, null, 2));

        // Get recent activity
        console.log('📝 Querying recent activity...');
        const activityQuery = `
            SELECT 
                action,
                details,
                created_at
            FROM user_logs 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 5
        `;
        console.log('SQL Query:', activityQuery);
        console.log('Query Parameters:', [userId]);
        
        const [recentActivity] = await con.query(activityQuery, [userId]);
        console.log('📊 Recent activity result:', JSON.stringify(recentActivity, null, 2));

        con.release();
        console.log('✅ Database connection released');

        const profileData = {
            userInfo: userInfo[0],
            statistics: {
                totalDocuments: docStats[0].total_documents || 0,
                totalStorage: docStats[0].total_storage || 0,
                lastUpload: docStats[0].last_upload
            },
            recentActivity: recentActivity || []
        };

        console.log('📤 Sending profile data:', JSON.stringify(profileData, null, 2));
        console.log('=== Profile Request End ===\n');
        res.json(profileData);
    } catch (error) {
        console.error('❌ Error in profile route:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        if (error.sql) {
            console.error('❌ SQL Query:', error.sql);
            console.error('❌ SQL Message:', error.sqlMessage);
        }
        if (con) {
            console.log('🔄 Releasing database connection due to error');
            con.release();
        }
        res.status(500).json({ 
            error: 'Failed to fetch user profile',
            details: error.message,
            code: error.code
        });
    }
});

// Get user info for navbar
router.get('/user_info', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.id_user;
        const con = await db.pool.getConnection();

        const [userInfo] = await con.query(`
            SELECT 
                id_user,
                prenom,
                nom,
                email,
                roles
            FROM user 
            WHERE id_user = ?
        `, [userId]);

        con.release();

        if (!userInfo || userInfo.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            userName: `${userInfo[0].prenom} ${userInfo[0].nom}`,
            userRole: userInfo[0].roles,
            email: userInfo[0].email
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

// Get user notifications
router.get('/notifications', async (req, res) => {
    console.log('=== Notifications Request ===');
    console.log('Session:', {
        id: req.session.id,
        id_user: req.session.id_user,
        role: req.session.role
    });

    if (!req.session || !req.session.id_user) {
        console.log('No session or user ID found');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.id_user;
        console.log('Fetching notifications for user ID:', userId);
        
        const con = await db.pool.getConnection();
        console.log('Database connection established');

        console.log('Querying notifications...');
        const [notifications] = await con.query(`
            SELECT 
                id,
                message,
                type,
                created_at,
                is_read
            FROM notifications 
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        console.log('Notifications result:', notifications);

        con.release();
        console.log('Database connection released');

        res.json(notifications);
    } catch (error) {
        console.error('Error in notifications route:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get user's institution
router.get('/institution', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.id_user;
        const con = await db.pool.getConnection();

        const [institution] = await con.query(`
            SELECT i.* 
            FROM institutions i
            INNER JOIN user u ON u.institution_id = i.id_institution
            WHERE u.id_user = ?
        `, [userId]);

        con.release();

        if (!institution || institution.length === 0) {
            return res.status(404).json({ error: 'Institution not found' });
        }

        res.json({
            success: true,
            institution: institution[0]
        });
    } catch (error) {
        console.error('Error fetching user institution:', error);
        res.status(500).json({ error: 'Failed to fetch user institution' });
    }
});

// Get user logs with pagination and filtering
router.get('/logs', async (req, res) => {
    if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const userId = req.session.id_user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const action = req.query.action || '';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';
        const search = req.query.search || '';

        const con = await db.pool.getConnection();

        // Build WHERE clause for filtering
        let whereConditions = ['user_id = ?'];
        let queryParams = [userId];

        if (action && action !== 'all') {
            whereConditions.push('action LIKE ?');
            queryParams.push(`%${action}%`);
        }

        if (dateFrom) {
            whereConditions.push('created_at >= ?');
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereConditions.push('created_at <= ?');
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            queryParams.push(endDate.toISOString().slice(0, 19).replace('T', ' '));
        }

        if (search) {
            whereConditions.push('(action LIKE ? OR details LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const [totalCount] = await con.query(`
            SELECT COUNT(*) as total
            FROM user_logs
            WHERE ${whereClause}
        `, queryParams);

        // Get paginated logs
        const [logs] = await con.query(`
            SELECT 
                id,
                action,
                details,
                created_at
            FROM user_logs
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);

        con.release();

        res.json({
            logs: logs.map(log => ({
                id: log.id,
                action: log.action,
                details: log.details,
                created_at: log.created_at,
                user_name: '' // Will be filled by frontend
            })),
            pagination: {
                total: totalCount[0].total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalCount[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).json({ error: 'Failed to fetch user logs' });
    }
});

module.exports = router; 