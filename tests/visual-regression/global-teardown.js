/**
 * Global Teardown for Visual Regression Tests
 * 
 * Cleans up after visual regression testing of manual testing UI components.
 */

async function globalTeardown(config) {
  console.log('🧹 Cleaning up visual regression test environment...');
  
  try {
    // Clean up any test artifacts
    const fs = require('fs').promises;
    const path = require('path');
    
    // Clean up temporary screenshots if needed
    const tempDir = path.join(__dirname, 'temp');
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
    
    console.log('✅ Visual regression test cleanup complete');
    
  } catch (error) {
    console.error('❌ Error during visual regression test cleanup:', error);
    // Don't throw here as it's cleanup
  }
}

module.exports = globalTeardown; 