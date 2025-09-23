const statisticsService = require('../services/statisticsService');

class StatisticsController {
  /**
   * Get user statistics for dashboard
   */
  async getUserStats(req, res) {
    try {
      if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.id_user;
      const result = await statisticsService.getUserStats(userId);
      
      res.json(result);
    } catch (error) {
      console.error("Error in getUserStats controller:", error);
      res.status(500).json({ 
        error: "Failed to get user statistics", 
        details: error.message 
      });
    }
  }

  /**
   * Get user activity logs
   */
  async getUserLogs(req, res) {
    try {
      if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.id_user;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      
      const result = await statisticsService.getUserLogs(userId, page, limit, startDate, endDate);
      
      res.json(result);
    } catch (error) {
      console.error("Error in getUserLogs controller:", error);
      res.status(500).json({ 
        error: "Failed to get user logs", 
        details: error.message 
      });
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(req, res) {
    try {
      if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.id_user;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      
      const result = await statisticsService.getStorageStats(userId, startDate, endDate);
      
      res.json(result);
    } catch (error) {
      console.error("Error in getStorageStats controller:", error);
      res.status(500).json({ 
        error: "Failed to get storage statistics", 
        details: error.message 
      });
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(req, res) {
    try {
      if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.id_user;
      const result = await statisticsService.getDocumentStats(userId);
      
      res.json(result);
    } catch (error) {
      console.error("Error in getDocumentStats controller:", error);
      res.status(500).json({ 
        error: "Failed to get document statistics", 
        details: error.message 
      });
    }
  }

  /**
   * Get institution performance statistics
   */
  async getInstitutionPerformanceStats(req, res) {
    try {
      if (!req.session || !req.session.id_user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.session.id_user;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 1000;
      const startDate = req.query.startDate || null;
      const endDate = req.query.endDate || null;
      
      const result = await statisticsService.getInstitutionPerformanceStats(userId, page, limit, startDate, endDate);
      
      res.json(result);
    } catch (error) {
      console.error("Error in getInstitutionPerformanceStats controller:", error);
      res.status(500).json({ 
        error: "Failed to get institution performance statistics", 
        details: error.message 
      });
    }
  }
}

module.exports = new StatisticsController();
