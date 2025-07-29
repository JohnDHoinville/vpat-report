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

console.log('JWT_SECRET:', JWT_SECRET);
console.log('Test user:', testUser);

// Generate token
const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '7d' });
console.log('\nGenerated token:', token);

// Verify token
try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\nToken verification successful:', decoded);
} catch (error) {
    console.log('\nToken verification failed:', error.message);
}

// Test the token from the file
const fileToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NjA4ODIzMC02MTMzLTQ1ZTMtOGEwNC0wNmZlZWEyOTgwOTQiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBsb2NhbGhvc3QiLCJpYXQiOjE3NTM4MTY4OTksImV4cCI6MTc1NDQyMTY5OX0.5iCAm4Hkx9n589pptgw1kYvnYVaYkTutgvpKJJTl9UI';

console.log('\nTesting file token...');
try {
    const decodedFile = jwt.verify(fileToken, JWT_SECRET);
    console.log('File token verification successful:', decodedFile);
} catch (error) {
    console.log('File token verification failed:', error.message);
} 