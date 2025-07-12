const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_db',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
});

async function updateAdminPassword() {
    try {
        const plainPassword = 'admin123'; // Simple password for testing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        
        console.log('🔐 Updating admin password...');
        
        const result = await pool.query(
            'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING id, username',
            [hashedPassword, 'admin']
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Admin password updated successfully');
            console.log('📋 Login credentials:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   Email: admin@localhost');
        } else {
            console.log('❌ Admin user not found');
        }
        
    } catch (error) {
        console.error('❌ Error updating admin password:', error);
    } finally {
        await pool.end();
    }
}

updateAdminPassword(); 