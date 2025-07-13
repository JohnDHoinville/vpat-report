const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');
const { pool } = require('../database/config');

// Simple test route
router.get('/test', (req, res) => {
    res.json({ message: 'Requirements route working' });
});

module.exports = router; 