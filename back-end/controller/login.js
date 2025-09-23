const bcrypt = require('bcrypt');

const { dbFindUserByEmail, dbInsertUser, dbCheckVerified} = require('../db/db');
const { verify } = require('jsonwebtoken');
const db = require('../db/db');

async function login(req, res) {
  try {
    const login = req.body;
    console.log("Login attempt:", {
      email: login.loguser,
      passwordLength: login.logpass ? login.logpass.length : 0
    });
    
    if (!login.loguser || !login.logpass) {
      console.log("Missing credentials");
      return res.status(422).json({ error: "Missing credentials" });
    }

    const results = await dbFindUserByEmail(login.loguser);
    console.log("User found:", results.length > 0);
    if (results.length > 0) {
      console.log("User data:", { 
        id: results[0].id_user,
        email: results[0].email,
        role: results[0].roles,
        verified: results[0].verified,
        accepted: results[0].accepted,
        passwordHash: results[0].password
      });
    }
    
    if (results.length === 0) {
      console.log("User not found");
      return res.status(422).json({ error: "Invalid credentials" });
    }
    
    const verified = await dbCheckVerified(login.loguser);
    console.log("Verification status:", {
      verified: verified[0].verified,
      accepted: verified[0].accepted
    });
    
    if (verified[0].verified === 0) {
      console.log("User not verified");
      return res.status(422).json({ error: "Please verify your email" });
    }

    if (verified[0].accepted === 0) {
      console.log("User not accepted");
      return res.status(422).json({ error: "Your account is pending approval" });
    }
    
    console.log("Comparing passwords:");
    console.log("Provided password length:", login.logpass.length);
    console.log("Stored password hash length:", results[0].password.length);
    
    const valid = await bcrypt.compare(login.logpass, results[0].password);
    console.log("Password validation result:", valid);
    
    if (valid) {
      req.session.id_user = results[0].id_user;
      req.session.nom = results[0].nom;
      req.session.prenom = results[0].prenom;
      req.session.role = results[0].roles;
      console.log("Session created:", {
        id_user: req.session.id_user,
        nom: req.session.nom,
        prenom: req.session.prenom,
        role: req.session.role
      });

      // Log the login action in user_logs
      try {
        const { dbLogUserAction } = require('../db/db');
        await dbLogUserAction(
          results[0].id_user, 
          'login', 
          'User logged in successfully',
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        );
        console.log('Login action recorded in user_logs');
      } catch (logError) {
        console.error('Error recording login action:', logError);
        // Don't fail the login if logging fails
      }

      return res.json({ 
        success: true, 
        role: results[0].roles,
        userId: results[0].id_user,
        nom: results[0].nom,
        prenom: results[0].prenom,
        institution_id: results[0].institution_id,
        institution_name: results[0].institution_name,
        personal_folder_name: results[0].personal_folder_name
      });
    } else {
      console.log("Wrong password");
      return res.status(422).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function register(req, res) {
  const register = req.body;

  if (register.fname == null || register.lname == null || register.email == null || register.password == null) {
    console.log(register);
    res.sendStatus(422);
  }
  let hashedPassword = await bcrypt.hash(register.password, 10);
  
  err = await dbInsertUser(register.fname, register.lname, register.email, hashedPassword);
  if (err != null) {
    return res.json('err');
  }
  res.json("Success");
}

async function signup(req, res) {
  try {
    const { prenom, nom, email, password, personal_folder_name } = req.body;
    
    console.log("Signup attempt:", {
      email,
      prenom,
      nom,
      personal_folder_name,
      passwordLength: password ? password.length : 0
    });

    // Validate required fields
    if (!prenom || !nom || !email || !password || !personal_folder_name) {
      return res.status(400).json({ 
        success: false, 
        error: "All fields are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid email format" 
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 8 characters long" 
      });
    }

    // Validate folder name
    if (personal_folder_name.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: "Personal folder name must be at least 3 characters long" 
      });
    }

    const con = await db.pool.getConnection();
    
    try {
      // Check if email already exists
      const [existingUsers] = await con.query(
        'SELECT id_user FROM user WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Email already exists" 
        });
      }

      // Check if folder name already exists
      const [existingFolders] = await con.query(
        'SELECT id FROM folders WHERE folder_path = ?',
        [personal_folder_name]
      );

      if (existingFolders.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Folder name already exists. Please choose a different name." 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user with personal account settings
      const [userResult] = await con.query(
        `INSERT INTO user (
          prenom, nom, email, password, roles, 
          institution_id, accepted, verified, 
          diffuse, upload, download, print, 
          personal_folder_name, subscription_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prenom, nom, email, hashedPassword, 'user',
          null, // institution_id = null for personal accounts
          1,    // accepted = 1 (auto-accept personal accounts)
          1,    // verified = 1 (auto-verify personal accounts)
          1, 1, 1, 1, // permissions: diffuse, upload, download, print
          personal_folder_name,
          'free' // subscription_status = 'free'
        ]
      );

      const userId = userResult.insertId;

      // Create personal folder in database
      await con.query(
        `INSERT INTO folders (
          folder_name, folder_path, institution_id, 
          is_private, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          personal_folder_name,
          personal_folder_name,
          null, // institution_id = null for personal folders
          1,    // is_private = 1
          userId
        ]
      );

      // Create physical folder in uploads directory
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const personalFolderPath = path.join(uploadsDir, personal_folder_name);
      
      if (!fs.existsSync(personalFolderPath)) {
        fs.mkdirSync(personalFolderPath, { recursive: true });
        console.log(`Created personal folder: ${personalFolderPath}`);
      }

      // Log the signup action
      try {
        const { dbLogUserAction } = require('../db/db');
        await dbLogUserAction(
          userId, 
          'signup', 
          'Personal account created successfully',
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent')
        );
        console.log('Signup action recorded in user_logs');
      } catch (logError) {
        console.error('Error recording signup action:', logError);
        // Don't fail the signup if logging fails
      }

      console.log("Personal account created successfully:", {
        userId,
        email,
        personal_folder_name
      });

      res.json({ 
        success: true, 
        message: "Account created successfully",
        userId: userId
      });

    } finally {
      con.release();
    }

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
}

module.exports = { login: login, register: register, signup: signup };