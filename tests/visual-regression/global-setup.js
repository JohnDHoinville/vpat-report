/**
 * Global Setup for Visual Regression Tests
 * 
 * Prepares the environment for consistent visual testing of manual testing UI components.
 */

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🎬 Setting up visual regression test environment...');
  
  // Launch a browser to warm up the system
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for frontend server to be ready
    console.log('⏳ Waiting for frontend server...');
    await page.goto('http://localhost:8080/dashboard.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for API server to be ready
    console.log('⏳ Waiting for API server...');
    await page.goto('http://localhost:3001/api/health', {
      timeout: 30000
    });
    
    // Pre-build React components to ensure consistency
    console.log('🔧 Pre-building React components...');
    await page.goto('http://localhost:8080/dashboard.html');
    
    // Wait for all scripts to load
    await page.waitForFunction(() => {
      return window.ReactComponents && 
             window.manualTestingTest && 
             window.alpineReactBridge &&
             window.dashboardInstance;
    }, { timeout: 15000 });
    
    // Pre-warm the manual testing components
    await page.evaluate(() => {
      // Initialize the bridge and components
      return window.manualTestingTest.renderInterface();
    });
    
    console.log('✅ Visual regression test environment ready');
    
  } catch (error) {
    console.error('❌ Failed to set up visual regression test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup; 