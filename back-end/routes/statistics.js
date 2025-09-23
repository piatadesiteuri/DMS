const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

// Get user statistics for dashboard
router.get('/user_stats', statisticsController.getUserStats);

// Get user activity logs
router.get('/user_logs', statisticsController.getUserLogs);

// Get storage statistics
router.get('/storage', statisticsController.getStorageStats);

// Get document statistics
router.get('/documents', statisticsController.getDocumentStats);

// Get institution performance statistics
router.get('/institution_performance', statisticsController.getInstitutionPerformanceStats);

module.exports = router;