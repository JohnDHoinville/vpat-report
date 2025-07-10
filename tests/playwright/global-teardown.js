/**
 * Playwright Global Teardown
 * Handles cleanup after all tests complete
 */

async function globalTeardown(config) {
  console.log('🧹 Starting Playwright global teardown...');
  
  try {
    // Log test completion
    console.log('📊 Test execution completed');
    
    // Optional: Archive old reports
    const fs = require('fs');
    const path = require('path');
    
    const reportsDir = path.join(process.cwd(), 'reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      const playwrightFiles = files.filter(file => 
        file.includes('playwright') && 
        (file.endsWith('.json') || file.endsWith('.xml'))
      );
      
      if (playwrightFiles.length > 0) {
        console.log(`📁 Found ${playwrightFiles.length} Playwright report files`);
      }
    }
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
    // Don't throw error in teardown to avoid masking test failures
  }
}

module.exports = globalTeardown; 