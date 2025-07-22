/**
 * Playwright Integration Service
 * Integrates frontend Playwright test results with compliance session management
 * Author: AI Assistant
 * Date: 2025-01-14
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PlaywrightIntegrationService {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'vpat_db',
            user: process.env.DB_USER || 'vpat_user',
            password: process.env.DB_PASSWORD || 'vpat_password',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.reportsDirectory = path.join(process.cwd(), 'reports');
    }

    /**
     * Create a frontend test run for a compliance session
     * @param {string} sessionId - Compliance session UUID
     * @param {Object} runConfig - Test run configuration
     * @returns {Object} Created test run record
     */
    async createFrontendTestRun(sessionId, runConfig = {}) {
        const client = await this.pool.connect();
        
        try {
            console.log(`🎭 Creating frontend test run for session: ${sessionId}`);
            
            // Validate session exists
            const sessionCheck = await client.query(
                'SELECT id, name, project_id FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            
            if (sessionCheck.rows.length === 0) {
                throw new Error(`Test session ${sessionId} not found`);
            }
            
            const session = sessionCheck.rows[0];
            
            // Create frontend test run
            const testRun = await client.query(`
                INSERT INTO frontend_test_runs (
                    test_session_id, run_name, test_suite, test_environment,
                    browsers_tested, viewports_tested, test_configuration,
                    initiated_by, git_commit_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                sessionId,
                runConfig.runName || `Playwright Test Run - ${new Date().toISOString().split('T')[0]}`,
                runConfig.testSuite || 'playwright',
                runConfig.testEnvironment || 'headless',
                JSON.stringify(runConfig.browsers || ['chromium', 'firefox', 'webkit']),
                JSON.stringify(runConfig.viewports || [
                    { width: 1280, height: 720, name: 'desktop' },
                    { width: 768, height: 1024, name: 'tablet' },
                    { width: 375, height: 667, name: 'mobile' }
                ]),
                JSON.stringify(runConfig.configuration || {}),
                runConfig.initiatedBy || null,
                runConfig.gitCommitHash || null
            ]);
            
            console.log(`✅ Created frontend test run: ${testRun.rows[0].id}`);
            return testRun.rows[0];
            
        } catch (error) {
            console.error('❌ Error creating frontend test run:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Store Playwright test result in compliance session
     * @param {string} sessionId - Compliance session UUID
     * @param {string} testRunId - Frontend test run UUID
     * @param {Object} testResult - Playwright test result data
     * @param {Object} context - Test execution context
     * @returns {Object} Stored test result
     */
    async storePlaywrightResult(sessionId, testRunId, testResult, context = {}) {
        const client = await this.pool.connect();
        
        try {
            console.log(`📊 Storing Playwright result for session: ${sessionId}`);
            
            // Use the stored procedure to link Playwright result to session
            const result = await client.query(`
                SELECT link_playwright_result_to_session($1, $2, $3, $4, $5, $6) AS result_id
            `, [
                sessionId,
                context.pageUrl || testResult.url || 'unknown',
                JSON.stringify(testResult),
                context.browserName || 'chromium',
                context.viewport?.width || 1280,
                context.viewport?.height || 720
            ]);
            
            const resultId = result.rows[0].result_id;
            
            // Update additional context if available
            if (testRunId || context.testFilePath || context.testSuite) {
                await client.query(`
                    UPDATE automated_test_results 
                    SET 
                        test_file_path = $2,
                        frontend_test_metadata = $3
                    WHERE id = $1
                `, [
                    resultId,
                    context.testFilePath || null,
                    JSON.stringify({
                        testRunId: testRunId,
                        testSuite: context.testSuite || 'playwright',
                        testName: context.testName || testResult.testName,
                        browserName: context.browserName,
                        viewport: context.viewport,
                        duration: testResult.duration || context.duration,
                        screenshots: testResult.screenshots || [],
                        additionalData: context.additionalData || {}
                    })
                ]);
            }
            
            // Update test run statistics
            if (testRunId) {
                await this.updateTestRunStatistics(testRunId);
            }
            
            console.log(`✅ Stored Playwright result: ${resultId}`);
            return { resultId, testResult };
            
        } catch (error) {
            console.error('❌ Error storing Playwright result:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Process Playwright JSON report files and store in compliance session
     * @param {string} sessionId - Compliance session UUID
     * @param {string} reportsPattern - File pattern to match (e.g., 'playwright-*.json')
     * @returns {Object} Processing summary
     */
    async processPlaywrightReports(sessionId, reportsPattern = 'playwright-*.json') {
        try {
            console.log(`📁 Processing Playwright reports for session: ${sessionId}`);
            
            // Create test run for this batch
            const testRun = await this.createFrontendTestRun(sessionId, {
                runName: `Playwright Report Import - ${new Date().toISOString()}`,
                testSuite: 'playwright-import'
            });
            
            // Find matching report files
            const files = await fs.readdir(this.reportsDirectory);
            const reportFiles = files.filter(file => 
                file.includes('playwright') && file.endsWith('.json')
            );
            
            console.log(`📋 Found ${reportFiles.length} Playwright report files`);
            
            const processingResults = {
                testRunId: testRun.id,
                filesProcessed: 0,
                resultsStored: 0,
                errors: [],
                summary: {
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 0,
                    totalViolations: 0
                }
            };
            
            // Process each report file
            for (const fileName of reportFiles) {
                try {
                    const filePath = path.join(this.reportsDirectory, fileName);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const reportData = JSON.parse(fileContent);
                    
                    // Extract context from filename (e.g., 'playwright-chromium-homepage.json')
                    const context = this.parseReportFileName(fileName);
                    
                    // Store the result
                    await this.storePlaywrightResult(sessionId, testRun.id, reportData, {
                        ...context,
                        testFilePath: fileName
                    });
                    
                    processingResults.filesProcessed++;
                    processingResults.resultsStored++;
                    
                    // Update summary statistics
                    this.updateProcessingSummary(processingResults.summary, reportData);
                    
                } catch (error) {
                    console.error(`❌ Error processing file ${fileName}:`, error.message);
                    processingResults.errors.push({
                        file: fileName,
                        error: error.message
                    });
                }
            }
            
            // Mark test run as completed
            await this.completeTestRun(testRun.id, processingResults.summary);
            
            console.log(`✅ Processed ${processingResults.filesProcessed} Playwright reports`);
            return processingResults;
            
        } catch (error) {
            console.error('❌ Error processing Playwright reports:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive test results for a compliance session
     * @param {string} sessionId - Compliance session UUID
     * @returns {Object} Complete test results summary
     */
    async getSessionTestResults(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get unified test results summary
            const summaryQuery = await client.query(`
                SELECT * FROM compliance_session_test_results WHERE session_id = $1
            `, [sessionId]);
            
            // Get detailed test results
            const detailedQuery = await client.query(`
                SELECT * FROM detailed_compliance_test_results 
                WHERE session_id = $1 
                ORDER BY page_url, test_executed_at
            `, [sessionId]);
            
            // Get frontend test runs
            const testRunsQuery = await client.query(`
                SELECT * FROM frontend_test_runs 
                WHERE test_session_id = $1 
                ORDER BY created_at DESC
            `, [sessionId]);
            
            return {
                summary: summaryQuery.rows[0] || null,
                detailedResults: detailedQuery.rows,
                frontendTestRuns: testRunsQuery.rows,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Error getting session test results:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update test run statistics
     * @private
     */
    async updateTestRunStatistics(testRunId) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                UPDATE frontend_test_runs 
                SET 
                    total_tests_executed = (
                        SELECT COUNT(*) FROM automated_test_results atr
                        JOIN test_result_instances tri ON atr.id = tri.automated_result_id
                        WHERE atr.frontend_test_metadata->>'testRunId' = $1
                    ),
                    tests_passed = (
                        SELECT COUNT(*) FROM automated_test_results atr
                        JOIN test_result_instances tri ON atr.id = tri.automated_result_id
                        WHERE atr.frontend_test_metadata->>'testRunId' = $1 
                        AND atr.violations_count = 0
                    ),
                    tests_failed = (
                        SELECT COUNT(*) FROM automated_test_results atr
                        JOIN test_result_instances tri ON atr.id = tri.automated_result_id
                        WHERE atr.frontend_test_metadata->>'testRunId' = $1 
                        AND atr.violations_count > 0
                    ),
                    total_violations_found = (
                        SELECT COALESCE(SUM(atr.violations_count), 0) FROM automated_test_results atr
                        JOIN test_result_instances tri ON atr.id = tri.automated_result_id
                        WHERE atr.frontend_test_metadata->>'testRunId' = $1
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [testRunId]);
            
        } catch (error) {
            console.error('❌ Error updating test run statistics:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Complete a test run
     * @private
     */
    async completeTestRun(testRunId, summary) {
        const client = await this.pool.connect();
        
        try {
            await client.query(`
                UPDATE frontend_test_runs 
                SET 
                    status = 'completed',
                    completed_at = CURRENT_TIMESTAMP,
                    execution_duration_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)) * 1000
                WHERE id = $1
            `, [testRunId]);
            
        } catch (error) {
            console.error('❌ Error completing test run:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Parse report filename to extract context
     * @private
     */
    parseReportFileName(fileName) {
        // Example patterns:
        // playwright-chromium-homepage.json
        // mobile-webkit-form-accessibility.json
        // basic-functionality-firefox.json
        
        const parts = fileName.replace('.json', '').split('-');
        const context = {
            browserName: 'chromium',
            testSuite: 'playwright',
            pageUrl: 'unknown'
        };
        
        // Look for browser names
        const browsers = ['chromium', 'firefox', 'webkit', 'chrome', 'safari'];
        const foundBrowser = parts.find(part => browsers.includes(part.toLowerCase()));
        if (foundBrowser) {
            context.browserName = foundBrowser.toLowerCase();
        }
        
        // Look for test types
        const testTypes = ['mobile', 'keyboard', 'screen-reader', 'form', 'dynamic'];
        const foundTestType = parts.find(part => testTypes.includes(part.toLowerCase()));
        if (foundTestType) {
            context.testType = foundTestType;
        }
        
        // Extract page name or test name
        const ignoreParts = ['playwright', 'chromium', 'firefox', 'webkit', 'chrome', 'safari'];
        const pageParts = parts.filter(part => !ignoreParts.includes(part.toLowerCase()));
        if (pageParts.length > 0) {
            context.testName = pageParts.join('-');
        }
        
        return context;
    }

    /**
     * Update processing summary statistics
     * @private
     */
    updateProcessingSummary(summary, reportData) {
        summary.totalTests++;
        
        const violations = reportData.violations || reportData.summary?.violationCount || 0;
        if (violations === 0) {
            summary.passedTests++;
        } else {
            summary.failedTests++;
            summary.totalViolations += violations;
        }
    }

    /**
     * Create test session integration for Playwright tests
     * @param {string} projectId - Project UUID
     * @param {Object} sessionConfig - Session configuration
     * @returns {Object} Created session with integration setup
     */
    async createIntegratedTestSession(projectId, sessionConfig = {}) {
        const client = await this.pool.connect();
        
        try {
            console.log(`🔄 Creating integrated test session for project: ${projectId}`);
            
            // Create compliance session
            const session = await client.query(`
                INSERT INTO test_sessions (
                    project_id, name, description, conformance_level, testing_approach, approach_details,
                    scope, status, test_type, progress_summary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                projectId,
                sessionConfig.name || `Integrated Testing Session - ${new Date().toISOString().split('T')[0]}`,
                sessionConfig.description || 'Automated frontend and backend accessibility testing session',
                sessionConfig.conformanceLevel || 'AA', // Add conformance level
                sessionConfig.testingApproach || 'hybrid',
                JSON.stringify(sessionConfig.approachDetails || {
                    includesFrontendTests: true,
                    includesBackendTests: true,
                    includesManualTests: true,
                    estimatedDuration: '4 hours',
                    coverage: '70%'
                }),
                sessionConfig.scope || {
                    includePlaywright: true,
                    includeBackendTools: ['axe', 'pa11y'],
                    includeManualTesting: true,
                    browsers: ['chromium', 'firefox', 'webkit'],
                    viewports: ['desktop', 'tablet', 'mobile']
                },
                'planning',
                sessionConfig.testType || 'full',
                JSON.stringify({
                    frontendTests: { total: 0, completed: 0, violations: 0 },
                    backendTests: { total: 0, completed: 0, violations: 0 },
                    manualTests: { total: 0, completed: 0, violations: 0 },
                    overall: { progress: 0, complianceScore: null }
                })
            ]);
            
            const sessionData = session.rows[0];
            
            // Create initial frontend test run
            const frontendTestRun = await this.createFrontendTestRun(sessionData.id, {
                runName: `Initial Playwright Test Run`,
                testSuite: 'playwright',
                browsers: sessionConfig.scope?.browsers || ['chromium', 'firefox', 'webkit'],
                initiatedBy: sessionConfig.initiatedBy
            });
            
            console.log(`✅ Created integrated test session: ${sessionData.id}`);
            
            return {
                session: sessionData,
                frontendTestRun: frontendTestRun,
                integrationReady: true
            };
            
        } catch (error) {
            console.error('❌ Error creating integrated test session:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Cleanup old report files after processing
     * @param {number} olderThanDays - Delete files older than this many days
     */
    async cleanupProcessedReports(olderThanDays = 7) {
        try {
            console.log(`🧹 Cleaning up Playwright reports older than ${olderThanDays} days`);
            
            const files = await fs.readdir(this.reportsDirectory);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            
            let deletedCount = 0;
            
            for (const fileName of files) {
                if (fileName.includes('playwright') && fileName.endsWith('.json')) {
                    const filePath = path.join(this.reportsDirectory, fileName);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        console.log(`🗑️  Deleted old report: ${fileName}`);
                    }
                }
            }
            
            console.log(`✅ Cleaned up ${deletedCount} old Playwright report files`);
            return deletedCount;
            
        } catch (error) {
            console.error('❌ Error cleaning up reports:', error);
            throw error;
        }
    }

    /**
     * Run Playwright tests for a session
     * @param {Object} config - Test configuration
     * @param {string} config.sessionId - Test session ID
     * @param {string} config.testRunId - Frontend test run ID
     * @param {Array} config.testTypes - Types of tests to run
     * @param {Array} config.browsers - Browsers to test
     * @param {Array} config.viewports - Viewports to test
     * @param {string} config.baseUrl - Base URL for testing
     */
    async runPlaywrightTests(config) {
        try {
            console.log(`🎭 Starting Playwright tests for session: ${config.sessionId}`);
            
            console.log(`📋 Test Configuration:`, {
                sessionId: config.sessionId,
                testRunId: config.testRunId,
                testTypes: config.testTypes,
                browsers: config.browsers,
                viewports: config.viewports,
                baseUrl: config.baseUrl
            });

            // Use the existing SimpleTestingService to run real automated tests
            const SimpleTestingService = require('./simple-testing-service');
            const testingService = new SimpleTestingService();
            
            // Map test types to SimpleTestingService format
            const testTypes = config.testTypes?.map(type => {
                // Map from frontend names to tool names
                switch(type) {
                    case 'basic': return 'axe';
                    case 'keyboard': return 'axe'; 
                    case 'screen-reader': return 'axe';
                    case 'form': return 'axe';
                    default: return 'axe';
                }
            }) || ['axe', 'pa11y'];
            
            // Remove duplicates
            const uniqueTestTypes = [...new Set(testTypes)];
            
            console.log(`🚀 Starting real automated tests with tools: ${uniqueTestTypes.join(', ')}`);
            
            // Start automated testing with the configured options
            const testResult = await testingService.startAutomatedTesting(config.sessionId, {
                testTypes: uniqueTestTypes,
                maxPages: 50, // Reasonable limit for automated testing
                baseUrl: config.baseUrl
            });
            
            console.log(`✅ Playwright tests initiated successfully`);
            console.log(`🔄 Tests will run asynchronously and results will be stored when complete`);
            
            return {
                success: true,
                message: 'Automated tests initiated successfully',
                testRunId: config.testRunId,
                status: 'running',
                testResult: testResult
            };
            
        } catch (error) {
            console.error('❌ Error starting Playwright tests:', error);
            throw error;
        }
    }
}

module.exports = PlaywrightIntegrationService; 