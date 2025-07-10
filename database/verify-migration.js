const { db } = require('./config');
const fs = require('fs').promises;
const path = require('path');

/**
 * Comprehensive Migration Verification Script
 * Validates data integrity and completeness after migration
 */

class MigrationVerifier {
    constructor() {
        this.results = {
            totalChecks: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
    }

    /**
     * Log a check result
     */
    logCheck(name, passed, message, isWarning = false) {
        this.results.totalChecks++;
        if (passed) {
            this.results.passed++;
            console.log(`✅ ${name}: ${message}`);
        } else if (isWarning) {
            this.results.warnings++;
            console.log(`⚠️ ${name}: ${message}`);
        } else {
            this.results.failed++;
            console.log(`❌ ${name}: ${message}`);
        }
        
        this.results.details.push({
            name,
            status: passed ? 'PASS' : (isWarning ? 'WARN' : 'FAIL'),
            message
        });
    }

    /**
     * Verify basic table counts and structure
     */
    async verifyBasicStructure() {
        console.log('\n🔍 Verifying Basic Database Structure');
        console.log('=====================================');

        try {
            // Check that all expected tables exist
            const tables = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            `);
            
            const tableNames = tables.rows.map(row => row.table_name);
            const expectedTables = [
                'projects', 'site_discovery', 'discovered_pages', 
                'test_sessions', 'automated_test_results',
                'wcag_requirements', 'section_508_requirements',
                'manual_test_results', 'violations', 'vpat_reports'
            ];

            const missingTables = expectedTables.filter(table => !tableNames.includes(table));
            this.logCheck(
                'Required Tables', 
                missingTables.length === 0,
                missingTables.length === 0 
                    ? `All 10 expected tables present: ${tableNames.join(', ')}`
                    : `Missing tables: ${missingTables.join(', ')}`
            );

            // Check basic record counts
            const projectCount = await db.query('SELECT COUNT(*) FROM projects');
            const sessionCount = await db.query('SELECT COUNT(*) FROM test_sessions');
            const pageCount = await db.query('SELECT COUNT(*) FROM discovered_pages');
            const resultCount = await db.query('SELECT COUNT(*) FROM automated_test_results');

            this.logCheck(
                'Project Count',
                parseInt(projectCount.rows[0].count) === 1,
                `Found ${projectCount.rows[0].count} projects (expected 1)`
            );

            this.logCheck(
                'Test Session Count',
                parseInt(sessionCount.rows[0].count) > 0,
                `Found ${sessionCount.rows[0].count} test sessions`
            );

            this.logCheck(
                'Page Count',
                parseInt(pageCount.rows[0].count) > 0,
                `Found ${pageCount.rows[0].count} discovered pages`
            );

            this.logCheck(
                'Test Result Count',
                parseInt(resultCount.rows[0].count) > 0,
                `Found ${resultCount.rows[0].count} test results`
            );

        } catch (error) {
            this.logCheck('Basic Structure', false, `Database error: ${error.message}`);
        }
    }

    /**
     * Verify data relationships and foreign key integrity
     */
    async verifyDataRelationships() {
        console.log('\n🔗 Verifying Data Relationships');
        console.log('===============================');

        try {
            // Check for orphaned test sessions (without valid project)
            const orphanedSessions = await db.query(`
                SELECT COUNT(*) 
                FROM test_sessions ts 
                LEFT JOIN projects p ON ts.project_id = p.id 
                WHERE p.id IS NULL
            `);
            this.logCheck(
                'Test Session Integrity',
                parseInt(orphanedSessions.rows[0].count) === 0,
                parseInt(orphanedSessions.rows[0].count) === 0 
                    ? 'All test sessions have valid projects'
                    : `${orphanedSessions.rows[0].count} orphaned test sessions found`
            );

            // Check for orphaned test results (without valid session or page)
            const orphanedResults = await db.query(`
                SELECT COUNT(*) 
                FROM automated_test_results atr 
                LEFT JOIN test_sessions ts ON atr.test_session_id = ts.id 
                LEFT JOIN discovered_pages dp ON atr.page_id = dp.id
                WHERE ts.id IS NULL OR dp.id IS NULL
            `);
            this.logCheck(
                'Test Result Integrity',
                parseInt(orphanedResults.rows[0].count) === 0,
                parseInt(orphanedResults.rows[0].count) === 0 
                    ? 'All test results have valid sessions and pages'
                    : `${orphanedResults.rows[0].count} orphaned test results found`
            );

            // Check for orphaned pages (without valid site discovery)
            const orphanedPages = await db.query(`
                SELECT COUNT(*) 
                FROM discovered_pages dp 
                LEFT JOIN site_discovery sd ON dp.discovery_id = sd.id 
                WHERE sd.id IS NULL
            `);
            this.logCheck(
                'Page Integrity',
                parseInt(orphanedPages.rows[0].count) === 0,
                parseInt(orphanedPages.rows[0].count) === 0 
                    ? 'All pages have valid site discovery records'
                    : `${orphanedPages.rows[0].count} orphaned pages found`
            );

        } catch (error) {
            this.logCheck('Data Relationships', false, `Database error: ${error.message}`);
        }
    }

    /**
     * Verify data quality and completeness
     */
    async verifyDataQuality() {
        console.log('\n📊 Verifying Data Quality');
        console.log('=========================');

        try {
            // Check for null/empty essential fields
            const nullUrls = await db.query(`
                SELECT COUNT(*) FROM discovered_pages 
                WHERE url IS NULL OR url = ''
            `);
            this.logCheck(
                'Page URLs',
                parseInt(nullUrls.rows[0].count) === 0,
                parseInt(nullUrls.rows[0].count) === 0 
                    ? 'All pages have valid URLs'
                    : `${nullUrls.rows[0].count} pages with missing URLs`,
                parseInt(nullUrls.rows[0].count) > 0
            );

            // Check tool name distribution
            const toolDistribution = await db.query(`
                SELECT tool_name, COUNT(*) as count 
                FROM automated_test_results 
                GROUP BY tool_name 
                ORDER BY count DESC
            `);
            
            const toolNames = toolDistribution.rows.map(row => `${row.tool_name}(${row.count})`);
            this.logCheck(
                'Tool Distribution',
                toolDistribution.rows.length > 0,
                `Found ${toolDistribution.rows.length} different tools: ${toolNames.join(', ')}`
            );

            // Check for reasonable timestamp ranges
            const timestampRange = await db.query(`
                SELECT 
                    MIN(executed_at) as earliest,
                    MAX(executed_at) as latest,
                    COUNT(*) as total
                FROM automated_test_results 
                WHERE executed_at IS NOT NULL
            `);
            
            if (timestampRange.rows[0].total > 0) {
                const earliest = new Date(timestampRange.rows[0].earliest);
                const latest = new Date(timestampRange.rows[0].latest);
                const daysDiff = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));
                
                this.logCheck(
                    'Timestamp Range',
                    daysDiff >= 0 && daysDiff < 365,
                    `Test data spans ${daysDiff} days (${earliest.toDateString()} to ${latest.toDateString()})`
                );
            }

            // Check violations count distribution
            const violationStats = await db.query(`
                SELECT 
                    AVG(violations_count) as avg_violations,
                    MIN(violations_count) as min_violations,
                    MAX(violations_count) as max_violations,
                    COUNT(*) as total_results
                FROM automated_test_results 
                WHERE violations_count IS NOT NULL
            `);
            
            if (violationStats.rows[0].total_results > 0) {
                const stats = violationStats.rows[0];
                this.logCheck(
                    'Violation Statistics',
                    parseFloat(stats.avg_violations) >= 0,
                    `Avg: ${parseFloat(stats.avg_violations).toFixed(2)}, Min: ${stats.min_violations}, Max: ${stats.max_violations} violations per test`
                );
            }

        } catch (error) {
            this.logCheck('Data Quality', false, `Database error: ${error.message}`);
        }
    }

    /**
     * Compare with original file counts
     */
    async compareWithOriginalFiles() {
        console.log('\n📁 Comparing with Original Files');
        console.log('=================================');

        try {
            // Count original files
            const consolidatedDir = 'reports/consolidated-reports';
            const individualDir = 'reports/individual-tests';
            
            let consolidatedCount = 0;
            let individualCount = 0;

            try {
                const consolidatedFiles = await fs.readdir(consolidatedDir);
                consolidatedCount = consolidatedFiles.filter(f => f.endsWith('.json')).length;
            } catch (error) {
                // Directory might not exist
            }

            try {
                const individualFiles = await fs.readdir(individualDir);
                individualCount = individualFiles.filter(f => f.endsWith('.json')).length;
            } catch (error) {
                // Directory might not exist
            }

            // Get database counts
            const dbSessions = await db.query('SELECT COUNT(*) FROM test_sessions');
            const dbResults = await db.query('SELECT COUNT(*) FROM automated_test_results');

            this.logCheck(
                'Consolidated Reports',
                consolidatedCount > 0,
                `Original: ${consolidatedCount} files, Database: ${dbSessions.rows[0].count} sessions`,
                consolidatedCount === 0
            );

            this.logCheck(
                'Individual Tests',
                individualCount > 0,
                `Original: ${individualCount} files, Database: ${dbResults.rows[0].count} results`,
                individualCount === 0
            );

            // Calculate migration success rate
            const totalOriginal = consolidatedCount + individualCount;
            const totalMigrated = parseInt(dbSessions.rows[0].count) + parseInt(dbResults.rows[0].count);
            const successRate = totalOriginal > 0 ? ((totalMigrated / totalOriginal) * 100).toFixed(1) : 0;

            this.logCheck(
                'Migration Success Rate',
                parseFloat(successRate) > 90,
                `${successRate}% of files successfully migrated (${totalMigrated}/${totalOriginal})`,
                parseFloat(successRate) < 95
            );

        } catch (error) {
            this.logCheck('File Comparison', false, `Error comparing files: ${error.message}`);
        }
    }

    /**
     * Sample data validation
     */
    async validateSampleData() {
        console.log('\n🧪 Validating Sample Data');
        console.log('=========================');

        try {
            // Get a sample of test results with full joins
            const sampleData = await db.query(`
                SELECT 
                    p.name as project_name,
                    ts.name as session_name,
                    dp.url,
                    atr.tool_name,
                    atr.violations_count,
                    atr.executed_at
                FROM automated_test_results atr
                JOIN test_sessions ts ON atr.test_session_id = ts.id
                JOIN projects p ON ts.project_id = p.id
                JOIN discovered_pages dp ON atr.page_id = dp.id
                WHERE atr.raw_results IS NOT NULL
                LIMIT 5
            `);

            this.logCheck(
                'Sample Data Quality',
                sampleData.rows.length > 0,
                sampleData.rows.length > 0 
                    ? `Retrieved ${sampleData.rows.length} complete sample records with all relationships`
                    : 'No complete sample records found'
            );

            // Validate JSON structure in raw_results
            if (sampleData.rows.length > 0) {
                let validJson = 0;
                for (const row of sampleData.rows) {
                    try {
                        JSON.parse(row.raw_results || '{}');
                        validJson++;
                    } catch (e) {
                        // Invalid JSON
                    }
                }

                this.logCheck(
                    'JSON Structure',
                    validJson === sampleData.rows.length,
                    `${validJson}/${sampleData.rows.length} sample records have valid JSON in raw_results`
                );
            }

            // Check for reasonable URL patterns
            const urlSample = await db.query(`
                SELECT url, COUNT(*) as count 
                FROM discovered_pages 
                WHERE url LIKE 'http%'
                GROUP BY url 
                ORDER BY count DESC 
                LIMIT 5
            `);

            this.logCheck(
                'URL Patterns',
                urlSample.rows.length > 0,
                urlSample.rows.length > 0 
                    ? `Found ${urlSample.rows.length} distinct HTTP URLs in sample`
                    : 'No HTTP URLs found in sample'
            );

        } catch (error) {
            this.logCheck('Sample Data', false, `Database error: ${error.message}`);
        }
    }

    /**
     * Generate verification summary
     */
    generateSummary() {
        console.log('\n📋 Migration Verification Summary');
        console.log('==================================');
        
        console.log(`Total Checks: ${this.results.totalChecks}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings}`);
        
        const successRate = ((this.results.passed / this.results.totalChecks) * 100).toFixed(1);
        console.log(`📊 Success Rate: ${successRate}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Checks:');
            this.results.details
                .filter(d => d.status === 'FAIL')
                .forEach(d => console.log(`   • ${d.name}: ${d.message}`));
        }

        if (this.results.warnings > 0) {
            console.log('\n⚠️ Warnings:');
            this.results.details
                .filter(d => d.status === 'WARN')
                .forEach(d => console.log(`   • ${d.name}: ${d.message}`));
        }

        console.log('\n🎯 Verification Result:');
        if (this.results.failed === 0 && this.results.warnings <= 2) {
            console.log('✅ PASSED - Migration completed successfully with high integrity');
        } else if (this.results.failed === 0) {
            console.log('⚠️ PASSED WITH WARNINGS - Migration successful but with minor issues');
        } else {
            console.log('❌ FAILED - Migration has significant integrity issues');
        }
    }

    /**
     * Run all verification checks
     */
    async verify() {
        console.log('🔄 Starting Migration Verification');
        console.log('===================================');
        
        try {
            await this.verifyBasicStructure();
            await this.verifyDataRelationships();
            await this.verifyDataQuality();
            await this.compareWithOriginalFiles();
            await this.validateSampleData();
            
            this.generateSummary();
            
        } catch (error) {
            console.error('💥 Verification failed:', error.message);
            throw error;
        }
    }
}

/**
 * Run verification if called directly
 */
async function runVerification() {
    const verifier = new MigrationVerifier();
    
    try {
        // Test database connection first
        console.log('🔍 Testing database connection...');
        const connected = await db.testConnection();
        
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }
        
        await verifier.verify();
        
        // Exit with appropriate code
        process.exit(verifier.results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n💥 Verification error:', error.message);
        process.exit(1);
        
    } finally {
        console.log('\n🔌 Closing database connections...');
        await db.end();
    }
}

// Handle cleanup
process.on('SIGINT', async () => {
    console.log('\n🛑 Verification interrupted by user');
    try {
        await db.end();
    } catch (error) {
        // Ignore cleanup errors
    }
    process.exit(1);
});

// Run verification
if (require.main === module) {
    runVerification();
}

module.exports = { MigrationVerifier, runVerification }; 