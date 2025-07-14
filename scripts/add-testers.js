const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
});

async function addTesters() {
    try {
        console.log('🎯 Adding test users/testers to the system...');
        
        const testUsers = [
            {
                username: 'tester1',
                email: 'tester1@example.com',
                password: 'password123',
                full_name: 'Alice Johnson',
                role: 'user'
            },
            {
                username: 'tester2', 
                email: 'tester2@example.com',
                password: 'password123',
                full_name: 'Bob Smith',
                role: 'user'
            },
            {
                username: 'tester3',
                email: 'tester3@example.com', 
                password: 'password123',
                full_name: 'Carol Davis',
                role: 'user'
            },
            {
                username: 'manager1',
                email: 'manager1@example.com',
                password: 'password123', 
                full_name: 'David Wilson',
                role: 'admin'
            },
            {
                username: 'reviewer1',
                email: 'reviewer1@example.com',
                password: 'password123',
                full_name: 'Emma Brown',
                role: 'user'
            }
        ];
        
        const saltRounds = 10;
        
        for (const user of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await pool.query(
                    'SELECT id FROM users WHERE username = $1 OR email = $2',
                    [user.username, user.email]
                );
                
                if (existingUser.rows.length > 0) {
                    console.log(`⚠️  User ${user.username} already exists, skipping...`);
                    continue;
                }
                
                // Hash password
                const hashedPassword = await bcrypt.hash(user.password, saltRounds);
                
                // Create user
                const result = await pool.query(`
                    INSERT INTO users (username, email, password_hash, full_name, role, is_active)
                    VALUES ($1, $2, $3, $4, $5, true)
                    RETURNING id, username, email, full_name, role
                `, [user.username, user.email, hashedPassword, user.full_name, user.role]);
                
                const newUser = result.rows[0];
                console.log(`✅ Created user: ${newUser.username} (${newUser.full_name}) - Role: ${newUser.role}`);
                
            } catch (error) {
                console.error(`❌ Error creating user ${user.username}:`, error.message);
            }
        }
        
        // Display all users
        console.log('\n📋 Current users in the system:');
        const allUsers = await pool.query(`
            SELECT username, email, full_name, role, is_active, created_at
            FROM users 
            ORDER BY created_at ASC
        `);
        
        allUsers.rows.forEach(user => {
            const status = user.is_active ? '🟢' : '🔴';
            console.log(`${status} ${user.username} - ${user.full_name} (${user.role}) - ${user.email}`);
        });
        
        console.log('\n🎉 Tester setup complete!');
        console.log('📝 Login credentials for all test users:');
        console.log('   Password: password123');
        console.log('   Usernames: tester1, tester2, tester3, manager1, reviewer1');
        
    } catch (error) {
        console.error('❌ Error adding testers:', error);
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    addTesters();
}

module.exports = { addTesters }; 