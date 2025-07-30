#!/usr/bin/env node

/**
 * Authentication Setup Script
 * Generates a valid JWT token and sets up the user session for testing
 */

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const JWT_SECRET = 'accessibility-testing-secret-key-change-in-production';

// Database connection
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'accessibility_testing',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function setupAuth() {
    try {
        console.log('🔐 Setting up authentication...');

        // Create admin user if doesn't exist
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            ['admin']
        );

        let userId;
        if (userCheck.rows.length === 0) {
            console.log('📝 Creating admin user...');
            const newUser = await pool.query(`
                INSERT INTO users (id, username, email, password_hash, role, full_name, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id
            `, [
                '46088230-6133-45e3-8a04-06feea298094',
                'admin',
                'admin@localhost',
                '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBm5eJD.pnL3G2', // 'admin123'
                'admin',
                'System Administrator'
            ]);
            userId = newUser.rows[0].id;
            console.log('✅ Admin user created');
        } else {
            userId = userCheck.rows[0].id;
            console.log('✅ Admin user exists');
        }

        // Generate JWT token
        const token = jwt.sign({
            userId: userId,
            username: 'admin',
            role: 'admin',
            email: 'admin@localhost'
        }, JWT_SECRET, { expiresIn: '7d' });

        console.log('🎫 Generated JWT token:', token);

        // Create user session (hash the token for security)
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Delete any existing sessions for this user first
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
        
        // Insert new session
        await pool.query(`
            INSERT INTO user_sessions (user_id, token_hash, expires_at, last_accessed, is_active)
            VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW(), true)
        `, [
            userId,
            tokenHash
        ]);

        console.log('💾 Session saved to database');

        // Create a simple HTML file to set the token in localStorage
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Auth Setup</title>
</head>
<body>
    <h1>Setting up authentication...</h1>
    <p>This will set your authentication token and redirect to the dashboard.</p>
    
    <script>
        // Set the token in localStorage
        localStorage.setItem('auth_token', '${token}');
        localStorage.setItem('user_info', JSON.stringify({
            id: '${userId}',
            username: 'admin',
            email: 'admin@localhost',
            role: 'admin',
            full_name: 'System Administrator'
        }));
        
        console.log('✅ Authentication token set in localStorage');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
    </script>
</body>
</html>`;

        // Write the HTML file
        const fs = require('fs');
        fs.writeFileSync('setup-auth.html', htmlContent);

        console.log('✅ Setup complete!');
        console.log('📁 Created setup-auth.html - open this in your browser to set the auth token');
        console.log('🔑 Token:', token);
        console.log('👤 User ID:', userId);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupAuth(); 