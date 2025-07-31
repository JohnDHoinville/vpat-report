#!/usr/bin/env node

/**
 * Development Server Test Script
 * 
 * This script tests the webpack dev server setup and hot reloading
 * functionality for the React-Alpine.js migration.
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Testing webpack dev server setup...');

// Start webpack dev server
const webpackProcess = spawn('npm', ['run', 'webpack:dev'], {
  stdio: 'pipe',
  env: { ...process.env, NODE_ENV: 'development' }
});

let serverReady = false;
let testPassed = false;

// Monitor webpack output
webpackProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📦 Webpack:', output.trim());
  
  if (output.includes('webpack compiled') || output.includes('Local:')) {
    serverReady = true;
    console.log('✅ Webpack dev server is ready!');
    testServer();
  }
});

webpackProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('DeprecationWarning')) {
    console.error('❌ Webpack error:', error.trim());
  }
});

// Test server endpoint
function testServer() {
  if (testPassed) return;
  
  console.log('🔍 Testing server endpoints...');
  
  // Test if React components bundle is served
  const req = http.get('http://localhost:8081/dashboard/dist/react-components.js', (res) => {
    if (res.statusCode === 200) {
      console.log('✅ React components bundle is being served correctly');
      testPassed = true;
      cleanup();
    } else {
      console.error('❌ Failed to serve React components bundle:', res.statusCode);
      cleanup();
    }
  });
  
  req.on('error', (err) => {
    console.error('❌ Server test failed:', err.message);
    cleanup();
  });
  
  // Timeout after 30 seconds
  setTimeout(() => {
    if (!testPassed) {
      console.error('❌ Test timeout - server may not be ready');
      cleanup();
    }
  }, 30000);
}

// Cleanup function
function cleanup() {
  console.log('🧹 Cleaning up...');
  if (webpackProcess) {
    webpackProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    if (testPassed) {
      console.log('🎉 Development server test completed successfully!');
      console.log('💡 You can now use: npm run dev for full development workflow');
      process.exit(0);
    } else {
      console.log('❌ Development server test failed');
      process.exit(1);
    }
  }, 2000);
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 