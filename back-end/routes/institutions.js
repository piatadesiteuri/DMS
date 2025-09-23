const express = require("express");
const route = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db/db');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

// Create institution
route.post('/institutions', async (req, res) => {
  try {
    const { name, address, email, phone, location, superadmin } = req.body;
    
    // Validate required fields
    if (!name || !address || !email || !phone || !location || !superadmin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert institution
      const [institutionResult] = await connection.execute(
        'INSERT INTO institutions (name, address, email, phone) VALUES (?, ?, ?, ?)',
        [name, address, email, phone]
      );

      const institutionId = institutionResult.insertId;

      // Create superadmin user
      const hashedPassword = await bcrypt.hash(superadmin.password, 10);
      const [userResult] = await connection.execute(
        'INSERT INTO user (prenom, nom, email, password, phone_number, roles, institution_id, accepted, verified, diffuse, upload, download, print, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          superadmin.prenom,
          superadmin.nom,
          superadmin.email,
          hashedPassword,
          superadmin.phone_number,
          superadmin.roles,
          institutionId,
          superadmin.accepted,
          superadmin.verified,
          superadmin.diffuse,
          superadmin.upload,
          superadmin.download,
          superadmin.print,
          superadmin.created_by
        ]
      );

      // Update institution with superadmin_id
      await connection.execute(
        'UPDATE institutions SET superadmin_id = ? WHERE id_institution = ?',
        [userResult.insertId, institutionId]
      );

      // Create institution folder in /back-end/uploads
      const uploadsDir = path.join(__dirname, '../uploads');
      const institutionFolderName = name; // Folosim exact numele instituției
      const institutionFolderPath = path.join(uploadsDir, institutionFolderName);

      try {
        // Verifică dacă directorul uploads există
        await fs.access(uploadsDir);
      } catch (error) {
        // Dacă nu există, creează-l
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      // Creează folderul instituției
      await fs.mkdir(institutionFolderPath, { recursive: true });

      // Creează folderul în baza de date
      await connection.execute(
        'INSERT INTO folders (folder_name, folder_path, created_by, institution_id) VALUES (?, ?, ?, ?)',
        [name, name, userResult.insertId, institutionId] // Folosim exact numele instituției și pentru path
      );

      await connection.commit();
      
      res.status(201).json({
        success: true,
        message: 'Institution and superadmin created successfully',
        institutionId,
        userId: userResult.insertId,
        folderPath: name
      });
    } catch (error) {
      await connection.rollback();
      console.error('Database error:', error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating institution:', error);
    res.status(500).json({ error: 'Failed to create institution', details: error.message });
  }
});

// Get institution by ID
route.get('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await db.getConnection();
    
    try {
      // Get institution details
      const [institutionRows] = await connection.execute(
        'SELECT * FROM institutions WHERE id_institution = ?',
        [id]
      );

      if (institutionRows.length === 0) {
        return res.status(404).json({ error: 'Institution not found' });
      }

      const institution = institutionRows[0];

      // Get superadmin details
      const [superadminRows] = await connection.execute(
        'SELECT * FROM user WHERE id_user = ?',
        [institution.superadmin_id]
      );

      const superadmin = superadminRows[0];

      // Get all users in the institution
      const [userRows] = await connection.execute(
        'SELECT * FROM user WHERE institution_id = ?',
        [id]
      );

      res.json({
        institution: {
          ...institution,
          superadmin
        },
        users: userRows
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching institution:', error);
    res.status(500).json({ error: 'Failed to fetch institution', details: error.message });
  }
});

module.exports = route; 