const express = require('express');
const router = express.Router();

// Add new endpoint for logging document views
router.post('/log-document-view', async (req, res) => {
  console.log('Received log-document-view request');
  console.log('Request body:', req.body);
  console.log('Session:', req.session);

  const { documentName } = req.body;
  const userId = req.session.id_user;

  if (!documentName) {
    console.log('Document name missing');
    return res.status(400).json({ success: false, message: 'Document name is required' });
  }

  if (!userId) {
    console.log('User not authenticated, userId:', userId);
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    console.log('Checking for existing logs for user:', userId, 'document:', documentName);
    // Check if there's already a log entry for this document and user
    const [existingLogs] = await pool.query(
      'SELECT id, open_count FROM document_log WHERE user_id = ? AND nom_doc = ?',
      [userId, documentName]
    );

    console.log('Existing logs:', existingLogs);

    if (existingLogs.length > 0) {
      // Update existing log entry
      const newCount = existingLogs[0].open_count + 1;
      console.log('Updating existing log, new count:', newCount);
      await pool.query(
        'UPDATE document_log SET open_count = ?, last_opened_at = NOW() WHERE id = ?',
        [newCount, existingLogs[0].id]
      );
    } else {
      // Create new log entry
      console.log('Creating new log entry');
      await pool.query(
        'INSERT INTO document_log (user_id, nom_doc, open_count, last_opened_at) VALUES (?, ?, 1, NOW())',
        [userId, documentName]
      );
    }

    console.log('Document view logged successfully');
    res.json({ success: true, message: 'Document view logged successfully' });
  } catch (error) {
    console.error('Error logging document view:', error);
    res.status(500).json({ success: false, message: 'Error logging document view' });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { name, type, keyword, author, startDate, endDate } = req.body;
    
    // Build the base query
    let query = `
      SELECT 
        d.*,
        u.firstname,
        u.lastname,
        dt.type_name,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id_tag', t.id_tag,
            'tag_name', t.tag_name,
            'is_predefined', t.is_predefined,
            'added_by', JSON_OBJECT(
              'firstname', u2.firstname,
              'lastname', u2.lastname
            ),
            'added_date', dt2.added_date
          )
        ) as tags
      FROM documents d
      LEFT JOIN users u ON d.id_user = u.id_user
      LEFT JOIN document_types dt ON d.id_type = dt.id_type
      LEFT JOIN document_tags dt2 ON d.id_document = dt2.id_document
      LEFT JOIN tags t ON dt2.id_tag = t.id_tag
      LEFT JOIN users u2 ON dt2.added_by = u2.id_user
      WHERE 1=1
    `;
    
    const params = [];
    
    // Add search conditions
    if (name) {
      query += " AND (d.nom_doc LIKE ? OR d.realname LIKE ?)";
      params.push(`%${name}%`, `%${name}%`);
    }
    
    if (type) {
      query += " AND d.id_type = ?";
      params.push(type);
    }
    
    if (keyword) {
      query += " AND (d.mot1 LIKE ? OR d.mot2 LIKE ? OR d.mot3 LIKE ? OR d.mot4 LIKE ? OR d.mot5 LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    
    if (author) {
      query += " AND (u.firstname LIKE ? OR u.lastname LIKE ?)";
      params.push(`%${author}%`, `%${author}%`);
    }
    
    if (startDate) {
      query += " AND d.date_upload >= ?";
      params.push(startDate);
    }
    
    if (endDate) {
      query += " AND d.date_upload <= ?";
      params.push(endDate);
    }
    
    // Group by document to combine tags
    query += " GROUP BY d.id_document";
    
    const [documents] = await pool.query(query, params);
    
    // Process the results to parse tags
    const processedDocuments = documents.map(doc => {
      const tags = doc.tags ? JSON.parse(`[${doc.tags}]`) : [];
      return {
        ...doc,
        tags: tags.filter(tag => tag.id_tag) // Remove null tags
      };
    });
    
    res.json({
      success: true,
      documents: processedDocuments
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Electronic signature endpoint
router.post('/sign', async (req, res) => {
  console.log('Electronic signature request received');
  console.log('Session:', req.session);
  console.log('Request body:', req.body);

  const userId = req.session.id_user;
  if (!userId) {
    console.log('User not authenticated, userId:', userId);
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    const { 
      documentId, 
      documentPath, 
      documentName, 
      signature, 
      signatureType, 
      position, 
      timestamp 
    } = req.body;

    // Validate required fields
    if (!documentId && !documentPath) {
      return res.status(400).json({ 
        success: false, 
        message: 'Document ID or path is required' 
      });
    }

    if (!signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Signature is required' 
      });
    }

    // Get user information
    const userQuery = 'SELECT nom, prenom, role FROM users WHERE id_user = ?';
    const userResult = await new Promise((resolve, reject) => {
      global.db.get(userQuery, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!userResult) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create signature record
    const signatureId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertQuery = `
      INSERT INTO document_signatures (
        signature_id,
        document_id,
        document_path,
        document_name,
        user_id,
        user_name,
        user_role,
        signature_data,
        signature_type,
        position_x,
        position_y,
        position_page,
        signed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const signatureData = {
      signature: signature,
      type: signatureType,
      timestamp: timestamp,
      userAgent: req.headers['user-agent']
    };

    await new Promise((resolve, reject) => {
      global.db.run(insertQuery, [
        signatureId,
        documentId || null,
        documentPath || null,
        documentName || 'Unknown Document',
        userId,
        `${userResult.prenom} ${userResult.nom}`,
        userResult.role,
        JSON.stringify(signatureData),
        signatureType,
        position?.x || 50,
        position?.y || 50,
        position?.page || 1,
        timestamp,
        new Date().toISOString()
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    console.log('Document signature created successfully');
    
    res.json({ 
      success: true, 
      message: 'Document signed successfully',
      signatureId: signatureId,
      signedBy: `${userResult.prenom} ${userResult.nom}`,
      signedAt: timestamp
    });

  } catch (error) {
    console.error('Error creating document signature:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error signing document',
      error: error.message 
    });
  }
});

// Get document signatures endpoint
router.get('/signatures/:documentId', async (req, res) => {
  console.log('Get document signatures request');
  console.log('Session:', req.session);

  const userId = req.session.id_user;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  try {
    const { documentId } = req.params;
    const { documentPath } = req.query;

    let query;
    let params;

    if (documentId && documentId !== 'undefined') {
      query = 'SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at DESC';
      params = [documentId];
    } else if (documentPath) {
      query = 'SELECT * FROM document_signatures WHERE document_path = ? ORDER BY signed_at DESC';
      params = [documentPath];
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Document ID or path is required' 
      });
    }

    const signatures = await new Promise((resolve, reject) => {
      global.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Parse signature data
    const parsedSignatures = signatures.map(sig => ({
      ...sig,
      signature_data: JSON.parse(sig.signature_data || '{}')
    }));

    res.json({ 
      success: true, 
      signatures: parsedSignatures 
    });

  } catch (error) {
    console.error('Error fetching document signatures:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching signatures',
      error: error.message 
    });
  }
});

module.exports = router;