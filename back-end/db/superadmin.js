const mysql = require('mysql2/promise');
const pool = require('./db').pool;

// Function to count total users
async function countTotalUsers() {
    try {
        console.log('superadmin.js: Counting total users...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM user');
        console.log('superadmin.js: Total users count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('superadmin.js: Error in countTotalUsers:', error);
        throw error;
    }
}

// Function to count total documents
async function countTotalDocuments() {
    try {
        console.log('superadmin.js: Counting total documents...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM table_document');
        console.log('superadmin.js: Total documents count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('superadmin.js: Error in countTotalDocuments:', error);
        throw error;
    }
}

// Function to get total storage
async function getTotalStorage() {
    try {
        console.log('superadmin.js: Getting total storage...');
        const [rows] = await pool.query('SELECT SUM(file_size) as total FROM table_document');
        console.log('superadmin.js: Total storage:', rows[0].total || 0);
        return rows[0].total || 0;
    } catch (error) {
        console.error('superadmin.js: Error in getTotalStorage:', error);
        throw error;
    }
}

// Function to count active users
async function countActiveUsers() {
    try {
        console.log('superadmin.js: Counting active users...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM user WHERE accepted = 1');
        console.log('superadmin.js: Active users count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('superadmin.js: Error in countActiveUsers:', error);
        throw error;
    }
}

// Function to count admins
async function countAdmins() {
    try {
        console.log('superadmin.js: Counting admins...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM user WHERE roles = "admin"');
        console.log('superadmin.js: Admins count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('superadmin.js: Error in countAdmins:', error);
        throw error;
    }
}

// Function to count responsables
async function countResponsables() {
    try {
        console.log('superadmin.js: Counting responsables...');
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM user WHERE roles = "responsable"');
        console.log('superadmin.js: Responsables count:', rows[0].count);
        return rows[0].count;
    } catch (error) {
        console.error('superadmin.js: Error in countResponsables:', error);
        throw error;
    }
}

// Function to get all dashboard statistics
async function getDashboardStats() {
    try {
        console.log('superadmin.js: Getting all dashboard statistics...');
        
        const [
            totalUsers,
            totalDocuments,
            totalStorage,
            activeUsers,
            totalAdmins,
            totalResponsables
        ] = await Promise.all([
            countTotalUsers(),
            countTotalDocuments(),
            getTotalStorage(),
            countActiveUsers(),
            countAdmins(),
            countResponsables()
        ]);

        const stats = {
            totalUsers,
            totalDocuments,
            totalStorage,
            activeUsers,
            totalAdmins,
            totalResponsables
        };

        console.log('superadmin.js: Dashboard stats:', stats);
        return stats;
    } catch (error) {
        console.error('superadmin.js: Error in getDashboardStats:', error);
        throw error;
    }
}

module.exports = {
    getDashboardStats
}; 