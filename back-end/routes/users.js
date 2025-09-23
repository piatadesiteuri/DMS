const express = require("express");
const route = express.Router();
const mysql = require('mysql2/promise');
const db = require('../db/db');
const bcrypt = require('bcrypt');

// Create user
route.post('/users', async (req, res) => {
  try {
    const {
      prenom,
      nom,
      email,
      phone_number,
      password,
      roles,
      institution_id,
      accepted,
      verified,
      diffuse,
      upload,
      download,
      print
    } = req.body;

    // Validate required fields
    if (!prenom || !nom || !email || !phone_number || !password || !roles || !institution_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await db.getConnection();
    
    try {
      // Check if email already exists
      const [existingUsers] = await connection.execute(
        'SELECT * FROM user WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Get the superadmin ID for this institution
      const [institutionRows] = await connection.execute(
        'SELECT superadmin_id FROM institutions WHERE id_institution = ?',
        [institution_id]
      );

      if (institutionRows.length === 0) {
        return res.status(404).json({ error: 'Institution not found' });
      }

      const superadminId = institutionRows[0].superadmin_id;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user with superadmin as created_by
      const [result] = await connection.execute(
        'INSERT INTO user (prenom, nom, email, password, phone_number, roles, institution_id, accepted, verified, diffuse, upload, download, print, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          prenom,
          nom,
          email,
          hashedPassword,
          phone_number,
          roles,
          institution_id,
          accepted,
          verified,
          diffuse,
          upload,
          download,
          print,
          superadminId
        ]
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

module.exports = route; 