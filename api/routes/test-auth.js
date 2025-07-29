const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Use the same JWT secret as the auth middleware
const JWT_SECRET = process.env.JWT_SECRET || 'accessibility-testing-secret-key-change-in-production';

router.get('/test-jwt', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('🔍 TEST ROUTE: JWT_SECRET =', JWT_SECRET);
    console.log('🔍 TEST ROUTE: Token received =', token ? token.substring(0, 50) + '...' : 'null');
    
    if (!token) {
        return res.json({ error: 'No token provided', jwt_secret: JWT_SECRET });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ 
            success: true, 
            decoded, 
            jwt_secret: JWT_SECRET,
            token_length: token.length
        });
    } catch (error) {
        res.json({ 
            error: error.message, 
            jwt_secret: JWT_SECRET,
            token_length: token.length
        });
    }
});

router.get('/test-secret', (req, res) => {
    res.json({ 
        jwt_secret: JWT_SECRET,
        env_jwt_secret: process.env.JWT_SECRET,
        secret_length: JWT_SECRET.length
    });
});

module.exports = router; 