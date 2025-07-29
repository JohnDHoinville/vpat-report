const jwt = require('jsonwebtoken');

// Use the same JWT secret as the auth middleware
const JWT_SECRET = 'accessibility-testing-secret-key-change-in-production';

// Create a test user object
const testUser = {
    userId: '46088230-6133-45e3-8a04-06feea298094', // admin user ID
    username: 'admin',
    role: 'admin',
    email: 'admin@localhost'
};

// Generate token
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nUse this token in your API calls:');
console.log(`Authorization: Bearer ${token}`); 