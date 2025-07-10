/**
 * Playwright Global Setup
 * Handles test environment initialization
 */

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Starting Playwright global setup...');
  
  // Verify server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the server to be available
    console.log('⏳ Waiting for server at http://localhost:3000...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Verify the page loaded correctly
    const title = await page.title();
    console.log(`✅ Server is ready! Page title: "${title}"`);
    
    // Create reports directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      console.log('📁 Created reports directory');
    }
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup; 