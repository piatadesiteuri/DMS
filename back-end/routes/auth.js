const express = require('express');
const route = express.Router();
const { logUserAction } = require('../utils/logger');

route.post('/login', async (req, res) => {
  try {
    // ... existing login code ...

    if (user) {
      // ... existing session handling ...

      // Log the login action
      await logUserAction(user.id_user, 'LOGIN', 'User logged in successfully');

      res.json({ success: true, user: { id: user.id_user, email: user.email, roles: user.roles } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ... rest of the existing code ... 