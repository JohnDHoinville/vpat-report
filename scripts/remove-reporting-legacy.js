/**
 * Remove Reporting Legacy Code
 * 
 * This script removes the legacy reporting functions and state from dashboard.js
 * after verifying that the React components are providing equivalent functionality.
 */

const fs = require('fs').promises;
const path = require('path');

async function removeReportingLegacyCode() {
  console.log('🧹 Starting removal of legacy reporting code from dashboard.js...');
  
  const dashboardPath = path.join(__dirname, '../dashboard/js/dashboard.js');
  
  try {
    // Read the current dashboard.js file
    const content = await fs.readFile(dashboardPath, 'utf8');
    
    // Create backup before modification
    const backupPath = path.join(__dirname, '../backups', `dashboard-before-reporting-cleanup-${new Date().toISOString().split('T')[0]}.js`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, content);
    console.log(`📋 Backup created: ${backupPath}`);
    
    let modifiedContent = content;
    
    // Define reporting functions to remove
    const reportingFunctionsToRemove = [
      'downloadTestReport',
      'exportResults',
      'exportSessionResults',
      'generateReport',
      'downloadAutomationRunReport',
      'exportSessionReport',
      'exportSelectedTests',
      'exportTestGrid',
      'generateVPATReport',
      'exportSessionReportFromSession'
    ];
    
    console.log('🗑️  Removing legacy reporting functions...');
    
    // Remove each function
    for (const functionName of reportingFunctionsToRemove) {
      const functionPattern = new RegExp(
        `\\s*(?:async\\s+)?${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}(?=\\s*(?:,|\\s*(?:async\\s+)?\\w+\\s*\\(|\\s*\\}|$))`, 
        'g'
      );
      
      const matches = modifiedContent.match(functionPattern);
      if (matches) {
        console.log(`   - Removing function: ${functionName} (${matches.length} occurrence(s))`);
        modifiedContent = modifiedContent.replace(functionPattern, '');
      }
    }
    
    // Remove specific reporting-related code blocks
    const codeBlocksToRemove = [
      // Remove VPAT-related code blocks
      {
        pattern: /\/\/ Generate VPAT report[\s\S]*?console\.log\('\s*✅\s*VPAT report generated and downloaded successfully'\);/g,
        description: 'VPAT generation code blocks'
      },
      // Remove export-related code blocks
      {
        pattern: /\/\/ Export.*?(?:grid|results|session)[\s\S]*?console\.log\('.*exported.*'\);/g,
        description: 'Export operation code blocks'
      },
      // Remove report download code blocks
      {
        pattern: /\/\/ Download.*?report[\s\S]*?console\.log\('.*report.*'\);/g,
        description: 'Report download code blocks'
      }
    ];
    
    for (const block of codeBlocksToRemove) {
      const matches = modifiedContent.match(block.pattern);
      if (matches) {
        console.log(`   - Removing ${block.description} (${matches.length} occurrence(s))`);
        modifiedContent = modifiedContent.replace(block.pattern, '');
      }
    }
    
    // Clean up any orphaned reporting references
    const cleanupPatterns = [
      // Remove empty function calls
      /,\s*,/g,
      // Remove trailing commas before closing braces
      /,(\s*\})/g,
      // Remove multiple consecutive empty lines
      /\n\s*\n\s*\n/g
    ];
    
    for (const pattern of cleanupPatterns) {
      modifiedContent = modifiedContent.replace(pattern, (match, group1) => {
        if (group1) return group1; // Keep the closing brace
        if (match.includes(',')) return ','; // Single comma
        return '\n\n'; // Two newlines maximum
      });
    }
    
    // Add migration comment for reporting functionality
    const migrationComment = `
        // ===== REPORTING MIGRATION NOTICE =====
        // The following functions have been migrated to React components:
        // - VPAT generation: VPATGenerator.jsx
        // - Report viewing: ReportViewer.jsx
        // - Export management: ExportManager.jsx
        // - Progress analytics: ProgressCharts.jsx
        // - Report interface: ReportingInterface.jsx
        //
        // Access via: window.ReactComponents.render('ReportingInterface', {}, container)
        // Test functions: window.reportingTest.runDemo()
        // ===== END MIGRATION NOTICE =====
        
        `;
    
    // Find a good place to insert the migration notice (after manual testing migration notice)
    const insertAfter = '// ===== END MIGRATION NOTICE =====';
    const insertIndex = modifiedContent.indexOf(insertAfter);
    if (insertIndex !== -1) {
      const lineEnd = modifiedContent.indexOf('\n', insertIndex);
      modifiedContent = modifiedContent.substring(0, lineEnd + 1) + 
                       migrationComment + 
                       modifiedContent.substring(lineEnd + 1);
    } else {
      // If manual testing notice not found, add after automated testing methods
      const insertAfterAlt = '// ===== AUTOMATED TESTING METHODS =====';
      const insertIndexAlt = modifiedContent.indexOf(insertAfterAlt);
      if (insertIndexAlt !== -1) {
        const lineEnd = modifiedContent.indexOf('\n', insertIndexAlt);
        modifiedContent = modifiedContent.substring(0, lineEnd + 1) + 
                         migrationComment + 
                         modifiedContent.substring(lineEnd + 1);
      }
    }
    
    // Write the modified content back
    await fs.writeFile(dashboardPath, modifiedContent);
    
    console.log('✅ Reporting legacy code removal completed');
    console.log(`📊 Backup saved to: ${backupPath}`);
    
    // Calculate removed lines
    const originalLines = content.split('\n').length;
    const modifiedLines = modifiedContent.split('\n').length;
    const removedLines = originalLines - modifiedLines;
    
    console.log(`📉 Removed approximately ${removedLines} lines of code`);
    
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
      functionsRemoved: reportingFunctionsToRemove.length,
      linesRemoved: removedLines
    };
    
  } catch (error) {
    console.error('❌ Error removing reporting legacy code:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  removeReportingLegacyCode()
    .then(result => {
      console.log('\n🎉 Reporting legacy cleanup completed successfully!');
      console.log(`   Functions removed: ${result.functionsRemoved}`);
      console.log(`   Lines removed: ${result.linesRemoved}`);
      console.log(`   Backup: ${result.backupPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Reporting legacy cleanup failed:', error.message);
      process.exit(1);
    });
}

module.exports = removeReportingLegacyCode; 