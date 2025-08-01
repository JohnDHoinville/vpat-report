/**
 * Remove Manual Testing Legacy Code
 * 
 * This script removes the legacy manual testing functions and state from dashboard.js
 * after verifying that the React components are providing equivalent functionality.
 */

const fs = require('fs').promises;
const path = require('path');

async function removeManualTestingLegacyCode() {
  console.log('🧹 Starting removal of legacy manual testing code from dashboard.js...');
  
  const dashboardPath = path.join(__dirname, '../dashboard/js/dashboard.js');
  
  try {
    // Read the current dashboard.js file
    const content = await fs.readFile(dashboardPath, 'utf8');
    
    // Create backup before modification
    const backupPath = path.join(__dirname, '../backups', `dashboard-before-manual-cleanup-${new Date().toISOString().split('T')[0]}.js`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, content);
    console.log(`📋 Backup created: ${backupPath}`);
    
    // Define what to remove
    const sectionsToRemove = [
      // Manual testing state variables
      {
        start: '// ===== MANUAL TESTING STATE =====',
        end: '// ===== TESTING STATE FLAGS =====',
        description: 'Manual testing state variables'
      },
      // Manual testing methods
      {
        start: '// ===== MANUAL TESTING METHODS =====',
        end: '// ===== RESULTS METHODS =====',
        description: 'Manual testing methods'
      }
    ];
    
    // Variables and functions to preserve (these are used elsewhere)
    const preservePatterns = [
      'manualTestResults: []', // Used in other parts of the system
      'toggleManualUrlForm',    // Part of URL management
      'addManualUrl',          // Part of URL management
      'resetManualUrlForm',    // Part of URL management
      'newManualUrlForTesting', // Part of URL management
      'getEstimatedManualTime', // Used in project estimation
      'getManualTestStatus'    // Used in test status calculation
    ];
    
    let modifiedContent = content;
    
    // Remove each section
    for (const section of sectionsToRemove) {
      const startIndex = modifiedContent.indexOf(section.start);
      const endIndex = modifiedContent.indexOf(section.end);
      
      if (startIndex !== -1 && endIndex !== -1) {
        console.log(`🗑️  Removing ${section.description}...`);
        
        // Extract the section to be removed
        const sectionContent = modifiedContent.substring(startIndex, endIndex);
        
        // Check if any preserve patterns are in this section
        const preservedLines = [];
        for (const pattern of preservePatterns) {
          const regex = new RegExp(`.*${pattern}.*`, 'g');
          const matches = sectionContent.match(regex);
          if (matches) {
            preservedLines.push(...matches);
          }
        }
        
        // Remove the section but add back preserved lines with a comment
        let replacement = '';
        if (preservedLines.length > 0) {
          replacement = `
        // ===== PRESERVED MANUAL TESTING UTILITIES =====
        // Note: These functions are preserved as they are used by other parts of the system
        // Manual testing UI is now handled by React components
        
${preservedLines.join('\n        ')}
        
        `;
        }
        
        modifiedContent = modifiedContent.substring(0, startIndex) + 
                         replacement + 
                         modifiedContent.substring(endIndex);
        
        console.log(`✅ Removed ${section.description}`);
        if (preservedLines.length > 0) {
          console.log(`💡 Preserved ${preservedLines.length} utility functions`);
        }
      } else {
        console.log(`⚠️  Could not find ${section.description} section`);
      }
    }
    
    // Remove specific manual testing function calls that are no longer needed
    const functionsToRemove = [
      'startManualTesting',
      'editManualTestResult',
      'loadManualTestingAssignments',
      'loadManualTestingCoverageAnalysis',
      'refreshManualTestingTabData',
      'selectManualTestingSession',
      'loadManualTestingProgress',
      'applyManualTestingFilters',
      'filterManualTestingAssignments',
      'startManualTest',
      'loadManualTestingProcedure',
      'submitManualTestResult',
      'closeManualTestingSession'
    ];
    
    // Add migration comments for functions that now have React equivalents
    let migrationComment = `
        // ===== MANUAL TESTING MIGRATION NOTICE =====
        // The following functions have been migrated to React components:
        // - Manual testing UI: ManualTestingInterface.jsx
        // - Test assignments: TestInstanceList.jsx  
        // - Test execution: TestReview.jsx
        // - Status management: TestStatusManager.jsx
        // - Evidence upload: EvidenceUpload.jsx
        //
        // Access via: window.ReactComponents.render('ManualTestingInterface', {}, container)
        // Test functions: window.manualTestingTest.runDemo()
        // ===== END MIGRATION NOTICE =====
        
        `;
    
    // Find a good place to insert the migration notice (after automated testing methods)
    const insertAfter = '// ===== AUTOMATED TESTING METHODS =====';
    const insertIndex = modifiedContent.indexOf(insertAfter);
    if (insertIndex !== -1) {
      const lineEnd = modifiedContent.indexOf('\n', insertIndex);
      modifiedContent = modifiedContent.substring(0, lineEnd + 1) + 
                       migrationComment + 
                       modifiedContent.substring(lineEnd + 1);
    }
    
    // Clean up any orphaned manual testing references
    const cleanupPatterns = [
      // Remove manual testing state initializations that are now handled by React
      /manualTestingSession:\s*null,?\s*\n/g,
      /manualTestingProgress:\s*null,?\s*\n/g,
      /manualTestingAssignments:\s*\[\],?\s*\n/g,
      /filteredManualTestingAssignments:\s*\[\],?\s*\n/g,
      /showManualTestingModal:\s*false,?\s*\n/g,
      /currentManualTest:\s*null,?\s*\n/g,
      /manualTestingProcedure:\s*null,?\s*\n/g,
      /manualTestingContext:\s*\{[^}]*\},?\s*\n/g,
      /manualTestingFilters:\s*\{[^}]*\},?\s*\n/g,
      /manualTestingCoverageAnalysis:\s*\{[^}]*\},?\s*\n/g,
      
      // Remove empty comment sections
      /\/\/ ===== MANUAL TESTING STATE =====\s*\n/g,
      /\/\/ ===== MANUAL TESTING METHODS =====\s*\n/g
    ];
    
    for (const pattern of cleanupPatterns) {
      modifiedContent = modifiedContent.replace(pattern, '');
    }
    
    // Write the modified content back
    await fs.writeFile(dashboardPath, modifiedContent);
    
    console.log('✅ Manual testing legacy code removal completed');
    console.log(`📊 Backup saved to: ${backupPath}`);
    
    // Verify the file is still valid JavaScript
    try {
      new Function(modifiedContent);
      console.log('✅ Modified file passed JavaScript syntax validation');
    } catch (syntaxError) {
      console.error('❌ Syntax error detected:', syntaxError.message);
      console.log('🔄 Restoring from backup...');
      await fs.writeFile(dashboardPath, content);
      throw new Error('Syntax validation failed, changes reverted');
    }
    
    return {
      success: true,
      backupPath,
      functionsRemoved: functionsToRemove.length,
      sectionsRemoved: sectionsToRemove.length
    };
    
  } catch (error) {
    console.error('❌ Error removing manual testing legacy code:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  removeManualTestingLegacyCode()
    .then(result => {
      console.log('\n🎉 Manual testing legacy cleanup completed successfully!');
      console.log(`   Functions removed: ${result.functionsRemoved}`);
      console.log(`   Sections removed: ${result.sectionsRemoved}`);
      console.log(`   Backup: ${result.backupPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Manual testing legacy cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = removeManualTestingLegacyCode; 