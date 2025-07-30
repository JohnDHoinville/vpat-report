const crypto = require('crypto');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || 'johnhoinville',
    password: process.env.DB_PASSWORD || '',
});

// The JWT token we generated
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjA4ODIzMC02MTMzLTQ1ZTMtOGEwNC0wNmZlZWEyOTgwOTQiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBsb2NhbGhvc3QiLCJpYXQiOjE3NTM4MjExOTEsImV4cCI6MTc1NDQyNTk5MX0.nGeg_iYudhK-tCIZg4Kb9JjPM8azm_B54JREA7Sctso';

// Create token hash
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// Create refresh token
const refreshToken = crypto.randomBytes(64).toString('hex');
const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

// Set expiration (7 days from now)
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);

async function createSession() {
    try {
        const query = `
            INSERT INTO user_sessions (
                user_id, 
                token_hash, 
                refresh_token_hash, 
                device_info, 
                ip_address, 
                user_agent, 
                expires_at,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        
        const result = await pool.query(query, [
            '46088230-6133-45e3-8a04-06feea298094', // admin user ID
            tokenHash,
            refreshTokenHash,
            { type: 'test', description: 'Test session for API testing' },
            '127.0.0.1',
            'Test Client',
            expiresAt,
            true
        ]);
        
        console.log('✅ Session created successfully!');
        console.log('Session ID:', result.rows[0].id);
        console.log('Token hash:', tokenHash);
        console.log('\nYou can now use the JWT token for API calls.');
        
    } catch (error) {
        console.error('❌ Error creating session:', error.message);
    } finally {
        await pool.end();
    }
}

createSession(); 