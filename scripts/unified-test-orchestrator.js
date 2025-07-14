/**
 * Unified Test Orchestrator
 * Manages both frontend (Playwright) and backend (axe, pa11y, lighthouse) automated tests
 * as child records of compliance sessions for unified reporting and management
 * 
 * Author: AI Assistant
 * Date: 2025-01-14
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');

const SimpleTestingService = require('../database/services/simple-testing-service');
const PlaywrightIntegrationService = require('../database/services/playwright-integration-service');
const SiteDiscoveryService = require('../database/services/site-discovery-service');

class UnifiedTestOrchestrator {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'accessibility_testing',
            user: process.env.DB_USER || process.env.USER,
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.simpleTestingService = new SimpleTestingService();
        this.playwrightIntegrationService = new PlaywrightIntegrationService();
        this.siteDiscoveryService = new SiteDiscoveryService();
        
        this.activeOrchestrations = new Map();
        this.testResults = new Map();
    }

    /**
     * Create and execute comprehensive test suite for compliance session
     * @param {string} projectId - Project UUID
     * @param {Object} testConfig - Test configuration
     * @returns {Object} Orchestration results
     */
    async orchestrateComplianceTest(projectId, testConfig = {}) {
        const orchestrationId = this.generateOrchestrationId();
        
        try {
            console.log(`🎭 Starting unified test orchestration: ${orchestrationId}`);
            console.log(`📋 Project: ${projectId}`);
            console.log(`⚙️  Configuration:`, testConfig);

            // Create integrated compliance session
            const session = await this.createIntegratedComplianceSession(projectId, testConfig);
            const sessionId = session.session.id;

            // Initialize orchestration tracking
            this.activeOrchestrations.set(orchestrationId, {
                sessionId: sessionId,
                projectId: projectId,
                status: 'running',
                startTime: Date.now(),
                config: testConfig,
                phases: {
                    discovery: { status: 'pending', results: null },
                    frontendTests: { status: 'pending', results: null },
                    backendTests: { status: 'pending', results: null },
                    analysis: { status: 'pending', results: null }
                },
                results: {
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 0,
                    totalViolations: 0,
                    complianceScore: 0
                }
            });

            // Execute test phases
            const orchestrationResults = await this.executeTestPhases(orchestrationId, sessionId, testConfig);

            // Finalize and generate reports
            const finalResults = await this.finalizeOrchestration(orchestrationId, sessionId);

            console.log(`✅ Test orchestration completed: ${orchestrationId}`);
            return {
                orchestrationId: orchestrationId,
                sessionId: sessionId,
                success: true,
                ...finalResults
            };

        } catch (error) {
            console.error(`❌ Test orchestration failed: ${orchestrationId}`, error);
            
            // Update orchestration status
            if (this.activeOrchestrations.has(orchestrationId)) {
                const orchestration = this.activeOrchestrations.get(orchestrationId);
                orchestration.status = 'failed';
                orchestration.error = error.message;
            }

            throw error;
        }
    }

    /**
     * Create integrated compliance session with unified testing support
     * @private
     */
    async createIntegratedComplianceSession(projectId, testConfig) {
        console.log(`📝 Creating integrated compliance session...`);

        // Create session through PlaywrightIntegrationService (includes frontend support)
        const session = await this.playwrightIntegrationService.createIntegratedTestSession(projectId, {
            name: testConfig.sessionName || `Unified Compliance Test - ${new Date().toISOString().split('T')[0]}`,
            description: testConfig.description || 'Comprehensive automated accessibility testing with frontend and backend tools',
            testingApproach: testConfig.testingApproach || 'hybrid',
            scope: {
                includePlaywright: testConfig.includeFrontend !== false,
                includeBackendTools: testConfig.backendTools || ['axe', 'pa11y', 'lighthouse'],
                includeManualTesting: testConfig.includeManual || false,
                browsers: testConfig.browsers || ['chromium', 'firefox', 'webkit'],
                viewports: testConfig.viewports || ['desktop', 'tablet', 'mobile'],
                testTypes: testConfig.testTypes || ['basic', 'keyboard', 'screen-reader', 'form', 'mobile']
            },
            initiatedBy: testConfig.initiatedBy || null
        });

        console.log(`✅ Created integrated session: ${session.session.id}`);
        return session;
    }

    /**
     * Execute all test phases in coordinated sequence
     * @private
     */
    async executeTestPhases(orchestrationId, sessionId, testConfig) {
        const orchestration = this.activeOrchestrations.get(orchestrationId);

        try {
            // Phase 1: Site Discovery
            console.log(`🔍 Phase 1: Site Discovery`);
            orchestration.phases.discovery.status = 'running';
            
            const discoveryResults = await this.executeSiteDiscovery(sessionId, testConfig);
            orchestration.phases.discovery.status = 'completed';
            orchestration.phases.discovery.results = discoveryResults;

            // Phase 2: Frontend Tests (Playwright)
            if (testConfig.includeFrontend !== false) {
                console.log(`🎭 Phase 2: Frontend Automated Tests (Playwright)`);
                orchestration.phases.frontendTests.status = 'running';
                
                const frontendResults = await this.executeFrontendTests(sessionId, testConfig, discoveryResults);
                orchestration.phases.frontendTests.status = 'completed';
                orchestration.phases.frontendTests.results = frontendResults;
            } else {
                orchestration.phases.frontendTests.status = 'skipped';
            }

            // Phase 3: Backend Tests (axe, pa11y, lighthouse)
            if (testConfig.includeBackend !== false) {
                console.log(`⚙️  Phase 3: Backend Automated Tests`);
                orchestration.phases.backendTests.status = 'running';
                
                const backendResults = await this.executeBackendTests(sessionId, testConfig, discoveryResults);
                orchestration.phases.backendTests.status = 'completed';
                orchestration.phases.backendTests.results = backendResults;
            } else {
                orchestration.phases.backendTests.status = 'skipped';
            }

            // Phase 4: Results Analysis
            console.log(`📊 Phase 4: Results Analysis`);
            orchestration.phases.analysis.status = 'running';
            
            const analysisResults = await this.executeResultsAnalysis(sessionId, orchestration);
            orchestration.phases.analysis.status = 'completed';
            orchestration.phases.analysis.results = analysisResults;

            orchestration.status = 'completed';
            return orchestration;

        } catch (error) {
            console.error(`❌ Phase execution failed:`, error);
            orchestration.status = 'failed';
            orchestration.error = error.message;
            throw error;
        }
    }

    /**
     * Execute site discovery phase
     * @private
     */
    async executeSiteDiscovery(sessionId, testConfig) {
        console.log(`  🔍 Starting site discovery...`);

        // Get project information
        const sessionQuery = await this.pool.query(
            'SELECT project_id FROM test_sessions WHERE id = $1',
            [sessionId]
        );
        
        if (sessionQuery.rows.length === 0) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const projectId = sessionQuery.rows[0].project_id;

        // Get project URL
        const projectQuery = await this.pool.query(
            'SELECT primary_url FROM projects WHERE id = $1',
            [projectId]
        );
        
        if (projectQuery.rows.length === 0) {
            throw new Error(`Project ${projectId} not found`);
        }

        const primaryUrl = projectQuery.rows[0].primary_url;

        // Check for existing completed discoveries
        const existingDiscoveries = await this.siteDiscoveryService.listDiscoveries(projectId, {
            status: 'completed',
            limit: 1
        });

        let discovery;
        
        if (existingDiscoveries.length > 0 && existingDiscoveries[0].page_count > 0) {
            // Use existing discovery
            discovery = await this.siteDiscoveryService.getDiscovery(existingDiscoveries[0].id);
            console.log(`  ✅ Using existing discovery: ${discovery.total_pages_found || discovery.pages.length} pages found`);
        } else {
            // Start new site discovery
            console.log(`  🚀 Starting new site discovery for: ${primaryUrl}`);
            const discoverySession = await this.siteDiscoveryService.startDiscovery(projectId, primaryUrl, {
                maxPages: testConfig.maxPages || 50,
                maxDepth: testConfig.crawlDepth || 3
            });
            
            // Wait for discovery to complete (with timeout)
            const timeout = 60000; // 60 seconds
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                discovery = await this.siteDiscoveryService.getDiscovery(discoverySession.id);
                
                if (discovery.status === 'completed') {
                    break;
                } else if (discovery.status === 'failed') {
                    throw new Error(`Site discovery failed: ${discovery.notes || 'Unknown error'}`);
                }
                
                // Wait 2 seconds before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            if (discovery.status !== 'completed') {
                throw new Error('Site discovery timeout - taking too long to complete');
            }
        }

        console.log(`  ✅ Site discovery completed: ${discovery.total_pages_found || discovery.pages.length} pages found`);
        
        return {
            discoveryId: discovery.id,
            totalPages: discovery.total_pages_found || discovery.pages.length,
            pagesDiscovered: discovery.total_pages_found || discovery.pages.length
        };
    }

    /**
     * Execute frontend tests (Playwright)
     * @private
     */
    async executeFrontendTests(sessionId, testConfig, discoveryResults) {
        console.log(`  🎭 Starting Playwright frontend tests...`);

        const testTypes = testConfig.testTypes || ['basic', 'keyboard', 'screen-reader', 'form', 'mobile'];
        const browsers = testConfig.browsers || ['chromium'];
        
        const frontendResults = {
            testRuns: [],
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            violations: 0
        };

        // Set environment variables for Playwright integration
        process.env.TEST_SESSION_ID = sessionId;
        process.env.TEST_PROJECT_ID = testConfig.projectId;

        // Execute Playwright tests for each type
        for (const testType of testTypes) {
            try {
                console.log(`    🧪 Running ${testType} tests...`);
                
                const testCommand = this.buildPlaywrightCommand(testType, browsers);
                const testResult = await this.executeCommand(testCommand);
                
                frontendResults.testRuns.push({
                    testType: testType,
                    status: testResult.success ? 'completed' : 'failed',
                    duration: testResult.duration,
                    output: testResult.output,
                    error: testResult.error
                });

                if (testResult.success) {
                    frontendResults.totalTests += browsers.length; // One test per browser
                    frontendResults.passedTests += browsers.length;
                } else {
                    frontendResults.totalTests += browsers.length;
                    frontendResults.failedTests += browsers.length;
                }

            } catch (error) {
                console.error(`    ❌ Failed to run ${testType} tests:`, error.message);
                frontendResults.testRuns.push({
                    testType: testType,
                    status: 'failed',
                    error: error.message
                });
                frontendResults.totalTests += 1;
                frontendResults.failedTests += 1;
            }
        }

        // Import generated reports into session
        try {
            const importResults = await this.playwrightIntegrationService.processPlaywrightReports(sessionId);
            frontendResults.importResults = importResults;
            frontendResults.violations = importResults.summary.totalViolations;
        } catch (error) {
            console.error(`    ⚠️  Failed to import Playwright reports:`, error.message);
        }

        console.log(`  ✅ Frontend tests completed: ${frontendResults.totalTests} tests, ${frontendResults.violations} violations`);
        return frontendResults;
    }

    /**
     * Execute backend tests (axe, pa11y, lighthouse)
     * @private
     */
    async executeBackendTests(sessionId, testConfig, discoveryResults) {
        console.log(`  ⚙️  Starting backend automated tests...`);

        const tools = testConfig.backendTools || ['axe', 'pa11y'];
        
        // Get discovered pages
        const pages = await this.simpleTestingService.getDiscoveredPages(discoveryResults.discoveryId);
        const testPages = pages.slice(0, testConfig.maxTestPages || 10); // Limit for performance

        // Run backend automated tests
        const backendResults = await this.simpleTestingService.runAutomatedTests(sessionId, testPages, {
            testTypes: tools,
            maxConcurrency: testConfig.maxConcurrency || 3,
            timeout: testConfig.timeout || 30000
        });

        console.log(`  ✅ Backend tests completed: ${backendResults.totalTests} tests executed`);
        return backendResults;
    }

    /**
     * Execute results analysis phase
     * @private
     */
    async executeResultsAnalysis(sessionId, orchestration) {
        console.log(`  📊 Starting results analysis...`);

        // Get comprehensive test results
        const testResults = await this.playwrightIntegrationService.getSessionTestResults(sessionId);
        
        // Calculate overall metrics
        const analysis = {
            summary: testResults.summary,
            totalTests: (orchestration.phases.frontendTests.results?.totalTests || 0) + 
                       (orchestration.phases.backendTests.results?.totalTests || 0),
            totalViolations: (orchestration.phases.frontendTests.results?.violations || 0) + 
                            (orchestration.phases.backendTests.results?.violationsFound || 0),
            complianceScore: testResults.summary?.compliance_percentage || 0,
            coverageAnalysis: {
                pagesWithFrontendTests: testResults.summary?.frontend_automated_tests || 0,
                pagesWithBackendTests: testResults.summary?.backend_automated_tests || 0,
                totalPagesTested: testResults.detailedResults?.length || 0
            }
        };

        // Update orchestration results
        orchestration.results = {
            ...orchestration.results,
            ...analysis
        };

        console.log(`  ✅ Analysis completed: ${analysis.complianceScore}% compliance, ${analysis.totalViolations} violations`);
        return analysis;
    }

    /**
     * Finalize orchestration and generate reports
     * @private
     */
    async finalizeOrchestration(orchestrationId, sessionId) {
        console.log(`🏁 Finalizing test orchestration...`);

        const orchestration = this.activeOrchestrations.get(orchestrationId);
        const endTime = Date.now();
        const duration = endTime - orchestration.startTime;

        // Update session status
        await this.pool.query(
            'UPDATE test_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['completed', sessionId]
        );

        // Get final comprehensive results
        const finalResults = await this.playwrightIntegrationService.getSessionTestResults(sessionId);

        const summary = {
            orchestrationId: orchestrationId,
            sessionId: sessionId,
            duration: duration,
            status: orchestration.status,
            phases: orchestration.phases,
            results: orchestration.results,
            finalTestResults: finalResults,
            completedAt: new Date().toISOString()
        };

        // Store orchestration results
        this.testResults.set(orchestrationId, summary);

        // Clean up active orchestration
        this.activeOrchestrations.delete(orchestrationId);

        console.log(`✅ Orchestration finalized: ${orchestrationId}`);
        console.log(`📊 Final Results:`, {
            totalTests: orchestration.results.totalTests,
            violations: orchestration.results.totalViolations,
            compliance: `${orchestration.results.complianceScore}%`,
            duration: `${Math.round(duration / 1000)}s`
        });

        return summary;
    }

    /**
     * Build Playwright command for specific test type
     * @private
     */
    buildPlaywrightCommand(testType, browsers) {
        const testFile = this.getTestFileForType(testType);
        const browserArgs = browsers.map(b => `--project=${b}`).join(' ');
        
        return `npx playwright test ${testFile} ${browserArgs} --reporter=json`;
    }

    /**
     * Get test file path for test type
     * @private
     */
    getTestFileForType(testType) {
        const testFiles = {
            'basic': 'tests/playwright/basic-functionality.spec.js',
            'keyboard': 'tests/playwright/keyboard-navigation.spec.js',
            'screen-reader': 'tests/playwright/screen-reader-compatibility.spec.js',
            'form': 'tests/playwright/form-accessibility.spec.js',
            'mobile': 'tests/playwright/mobile-accessibility.spec.js',
            'dynamic': 'tests/playwright/dynamic-content.spec.js'
        };

        return testFiles[testType] || testFiles['basic'];
    }

    /**
     * Execute shell command with promise wrapper
     * @private
     */
    executeCommand(command) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                const duration = Date.now() - startTime;
                
                if (error) {
                    resolve({
                        success: false,
                        duration: duration,
                        output: stdout,
                        error: error.message,
                        stderr: stderr
                    });
                } else {
                    resolve({
                        success: true,
                        duration: duration,
                        output: stdout,
                        stderr: stderr
                    });
                }
            });
        });
    }

    /**
     * Generate unique orchestration ID
     * @private
     */
    generateOrchestrationId() {
        return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get orchestration status
     * @param {string} orchestrationId - Orchestration identifier
     */
    getOrchestrationStatus(orchestrationId) {
        if (this.activeOrchestrations.has(orchestrationId)) {
            return this.activeOrchestrations.get(orchestrationId);
        }
        
        if (this.testResults.has(orchestrationId)) {
            return this.testResults.get(orchestrationId);
        }
        
        return null;
    }

    /**
     * List all orchestrations
     */
    listOrchestrations() {
        const active = Array.from(this.activeOrchestrations.entries()).map(([id, data]) => ({
            id: id,
            status: 'active',
            ...data
        }));
        
        const completed = Array.from(this.testResults.entries()).map(([id, data]) => ({
            id: id,
            status: 'completed',
            ...data
        }));
        
        return [...active, ...completed];
    }

    /**
     * Cancel active orchestration
     * @param {string} orchestrationId - Orchestration identifier
     */
    async cancelOrchestration(orchestrationId) {
        if (this.activeOrchestrations.has(orchestrationId)) {
            const orchestration = this.activeOrchestrations.get(orchestrationId);
            orchestration.status = 'cancelled';
            orchestration.cancelledAt = new Date().toISOString();
            
            // Move to completed results
            this.testResults.set(orchestrationId, orchestration);
            this.activeOrchestrations.delete(orchestrationId);
            
            console.log(`🛑 Orchestration cancelled: ${orchestrationId}`);
            return true;
        }
        
        return false;
    }
}

// Export singleton instance
const orchestrator = new UnifiedTestOrchestrator();

module.exports = {
    UnifiedTestOrchestrator,
    orchestrator
};

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Usage: node unified-test-orchestrator.js <projectId> [options]

Options:
  --session-name="Name"     Session name
  --testing-approach=hybrid    Testing approach (automated_only, hybrid, etc.)
  --include-frontend=true   Include Playwright tests (default: true)
  --include-backend=true    Include backend tools (default: true)
  --backend-tools=axe,pa11y    Backend tools to use
  --browsers=chromium,firefox  Browsers to test
  --max-pages=50           Maximum pages to test
  --test-types=basic,keyboard  Test types to run
        `);
        process.exit(1);
    }
    
    const projectId = args[0];
    const config = {};
    
    // Parse options
    args.slice(1).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            if (value) {
                if (value.includes(',')) {
                    config[key.replace(/-./g, c => c[1].toUpperCase())] = value.split(',');
                } else if (value === 'true' || value === 'false') {
                    config[key.replace(/-./g, c => c[1].toUpperCase())] = value === 'true';
                } else {
                    config[key.replace(/-./g, c => c[1].toUpperCase())] = value;
                }
            }
        }
    });
    
    console.log(`🚀 Starting unified test orchestration for project: ${projectId}`);
    console.log(`⚙️  Configuration:`, config);
    
    orchestrator.orchestrateComplianceTest(projectId, config)
        .then(results => {
            console.log(`\n✅ Orchestration completed successfully!`);
            console.log(`📊 Results:`, results);
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n❌ Orchestration failed:`, error);
            process.exit(1);
        });
} 