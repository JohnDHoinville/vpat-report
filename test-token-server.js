const jwt = require('jsonwebtoken');

// Use the same JWT secret as the auth middleware
const JWT_SECRET = process.env.JWT_SECRET || 'accessibility-testing-secret-key-change-in-production';

console.log('🔍 Testing JWT token verification in server environment');
console.log('JWT_SECRET:', JWT_SECRET);

// Test token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjA4ODIzMC02MTMzLTQ1ZTMtOGEwNC0wNmZlZWEyOTgwOTQiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBsb2NhbGhvc3QiLCJpYXQiOjE3NTM4MTcwOTgsImV4cCI6MTc1NDQyMTg5OH0.iQpUEjmxFbBjHQjA6_XxzBZrohFItrw5zZfQ4s_RdCU';

console.log('Token to test:', token);

try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verification successful:', decoded);
} catch (error) {
    console.log('❌ Token verification failed:', error.message);
}

// Generate a new token for comparison
const user = {
    userId: '46088230-6133-45e3-8a04-06feea298094',
    username: 'admin',
    role: 'admin',
    email: 'admin@localhost'
};

const newToken = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
console.log('\nNew token generated:', newToken);

try {
    const decodedNew = jwt.verify(newToken, JWT_SECRET);
    console.log('✅ New token verification successful:', decodedNew);
} catch (error) {
    console.log('❌ New token verification failed:', error.message);
} 