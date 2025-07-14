/**
 * Playwright Integration Helper
 * Enables Playwright tests to store results in compliance session database
 * Author: AI Assistant
 * Date: 2025-01-14
 */

const PlaywrightIntegrationService = require('../../database/services/playwright-integration-service');
const fs = require('fs').promises;
const path = require('path');

class PlaywrightIntegrationHelper {
    constructor() {
        this.integrationService = new PlaywrightIntegrationService();
        this.sessionId = process.env.TEST_SESSION_ID || null;
        this.testRunId = null;
        this.currentTestResults = new Map();
        this.reportsDirectory = path.join(process.cwd(), 'reports');
    }

    /**
     * Initialize integration for a test session
     * @param {string} sessionId - Compliance session UUID
     * @returns {Object} Integration configuration
     */
    async initializeSession(sessionId) {
        try {
            console.log(`🔗 Initializing Playwright integration for session: ${sessionId}`);
            
            this.sessionId = sessionId;
            
            // Create a frontend test run for this Playwright execution
            const testRun = await this.integrationService.createFrontendTestRun(sessionId, {
                runName: `Playwright Test Run - ${new Date().toISOString()}`,
                testSuite: 'playwright',
                testEnvironment: process.env.CI ? 'ci' : 'local',
                browsers: ['chromium', 'firefox', 'webkit'],
                initiatedBy: process.env.USER || 'system',
                gitCommitHash: process.env.GIT_COMMIT || null
            });
            
            this.testRunId = testRun.id;
            
            console.log(`✅ Playwright integration initialized with test run: ${this.testRunId}`);
            
            return {
                sessionId: this.sessionId,
                testRunId: this.testRunId,
                integrationEnabled: true
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize Playwright integration:', error);
            // Don't fail the tests if integration fails
            return {
                sessionId: null,
                testRunId: null,
                integrationEnabled: false,
                error: error.message
            };
        }
    }

    /**
     * Store test result in compliance session database
     * @param {string} testName - Name of the test
     * @param {string} pageUrl - URL being tested
     * @param {Object} testResult - Test result data
     * @param {Object} context - Test execution context
     */
    async storeTestResult(testName, pageUrl, testResult, context = {}) {
        try {
            // Skip if integration not enabled
            if (!this.sessionId || !this.testRunId) {
                console.log(`⚠️  Skipping database storage - integration not initialized`);
                return this.saveLocalReport(testName, pageUrl, testResult, context);
            }
            
            console.log(`💾 Storing test result: ${testName} for ${pageUrl}`);
            
            // Prepare enhanced test result
            const enhancedResult = {
                ...testResult,
                testName: testName,
                url: pageUrl,
                timestamp: new Date().toISOString(),
                browser: context.browserName || 'unknown',
                viewport: context.viewport || { width: 1280, height: 720 },
                testSuite: 'playwright',
                duration: context.duration || 0,
                screenshots: context.screenshots || [],
                
                // Ensure violations structure is consistent
                violations: this.normalizeViolations(testResult.violations || []),
                violationCount: (testResult.violations || []).length,
                
                // Add summary if not present
                summary: testResult.summary || {
                    violationCount: (testResult.violations || []).length,
                    passedChecks: testResult.passedChecks || 0,
                    totalChecks: testResult.totalChecks || 0
                }
            };
            
            // Store in database
            const dbResult = await this.integrationService.storePlaywrightResult(
                this.sessionId,
                this.testRunId,
                enhancedResult,
                {
                    pageUrl: pageUrl,
                    browserName: context.browserName || 'chromium',
                    viewport: context.viewport,
                    testFilePath: context.testFile || testName,
                    testSuite: 'playwright',
                    testName: testName,
                    duration: context.duration,
                    additionalData: context.additionalData || {}
                }
            );
            
            // Also save local report for backup/debugging
            await this.saveLocalReport(testName, pageUrl, enhancedResult, context);
            
            console.log(`✅ Test result stored in database: ${dbResult.resultId}`);
            
            return {
                stored: true,
                databaseResultId: dbResult.resultId,
                localReportPath: this.getLocalReportPath(testName, context.browserName)
            };
            
        } catch (error) {
            console.error(`❌ Failed to store test result for ${testName}:`, error);
            
            // Fallback to local storage
            await this.saveLocalReport(testName, pageUrl, testResult, context);
            
            return {
                stored: false,
                error: error.message,
                localReportPath: this.getLocalReportPath(testName, context.browserName)
            };
        }
    }

    /**
     * Save local JSON report (backup/compatibility)
     * @private
     */
    async saveLocalReport(testName, pageUrl, testResult, context) {
        try {
            const reportData = {
                testName: testName,
                url: pageUrl,
                timestamp: new Date().toISOString(),
                browser: context.browserName || 'unknown',
                viewport: context.viewport,
                ...testResult
            };
            
            const reportPath = this.getLocalReportPath(testName, context.browserName);
            await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
            
            return reportPath;
            
        } catch (error) {
            console.error('❌ Failed to save local report:', error);
            throw error;
        }
    }

    /**
     * Get local report file path
     * @private
     */
    getLocalReportPath(testName, browserName = 'unknown') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${testName}-${browserName}-${timestamp}.json`;
        return path.join(this.reportsDirectory, fileName);
    }

    /**
     * Normalize violations to consistent format
     * @private
     */
    normalizeViolations(violations) {
        return violations.map(violation => ({
            id: violation.id || violation.type || 'unknown',
            description: violation.description || violation.message || '',
            impact: violation.impact || violation.severity || 'moderate',
            help: violation.help || violation.remediation || '',
            helpUrl: violation.helpUrl || violation.helpLink || '',
            tags: violation.tags || [],
            nodes: violation.nodes || violation.elements || [],
            wcagCriteria: violation.wcagCriteria || violation.wcag || [],
            
            // Additional Playwright-specific fields
            element: violation.element || (violation.nodes && violation.nodes[0]),
            selector: violation.selector || (violation.nodes && violation.nodes[0] && violation.nodes[0].target),
            html: violation.html || (violation.nodes && violation.nodes[0] && violation.nodes[0].html)
        }));
    }

    /**
     * Process existing report files and import to database
     * @param {string} sessionId - Compliance session UUID
     * @param {string} reportPattern - File pattern to match
     */
    async importExistingReports(sessionId, reportPattern = 'playwright-*.json') {
        try {
            console.log(`📂 Importing existing Playwright reports to session: ${sessionId}`);
            
            const results = await this.integrationService.processPlaywrightReports(sessionId, reportPattern);
            
            console.log(`✅ Import completed:`, results);
            
            return results;
            
        } catch (error) {
            console.error('❌ Failed to import existing reports:', error);
            throw error;
        }
    }

    /**
     * Get session test results summary
     * @param {string} sessionId - Compliance session UUID
     */
    async getSessionResults(sessionId) {
        try {
            return await this.integrationService.getSessionTestResults(sessionId);
        } catch (error) {
            console.error('❌ Failed to get session results:', error);
            throw error;
        }
    }

    /**
     * Create or find compliance session for testing
     * @param {string} projectId - Project UUID
     * @param {Object} sessionConfig - Session configuration
     */
    async createOrFindSession(projectId, sessionConfig = {}) {
        try {
            console.log(`🔍 Creating/finding test session for project: ${projectId}`);
            
            const result = await this.integrationService.createIntegratedTestSession(projectId, {
                name: sessionConfig.name || `Playwright Automated Testing - ${new Date().toISOString().split('T')[0]}`,
                description: sessionConfig.description || 'Automated accessibility testing with Playwright integration',
                testingApproach: 'automated_only',
                scope: {
                    includePlaywright: true,
                    browsers: ['chromium', 'firefox', 'webkit'],
                    testTypes: ['basic', 'keyboard', 'mobile', 'screen-reader', 'form', 'dynamic']
                },
                ...sessionConfig
            });
            
            this.sessionId = result.session.id;
            this.testRunId = result.frontendTestRun.id;
            
            console.log(`✅ Session ready: ${this.sessionId}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to create/find session:', error);
            throw error;
        }
    }

    /**
     * Finalize test session
     */
    async finalizeSession() {
        try {
            if (!this.sessionId || !this.testRunId) {
                console.log(`⚠️  No active session to finalize`);
                return;
            }
            
            console.log(`🏁 Finalizing test session: ${this.sessionId}`);
            
            // Get final results summary
            const results = await this.getSessionResults(this.sessionId);
            
            console.log(`📊 Final session results:`, {
                totalTests: results.summary?.total_automated_tests || 0,
                frontendTests: results.summary?.frontend_automated_tests || 0,
                backendTests: results.summary?.backend_automated_tests || 0,
                totalViolations: results.summary?.total_automated_violations || 0,
                compliancePercentage: results.summary?.compliance_percentage || 0
            });
            
            return results;
            
        } catch (error) {
            console.error('❌ Failed to finalize session:', error);
            return null;
        }
    }
}

// Export singleton instance
const integrationHelper = new PlaywrightIntegrationHelper();

module.exports = {
    PlaywrightIntegrationHelper,
    integrationHelper
}; 