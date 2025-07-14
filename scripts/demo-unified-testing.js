/**
 * Unified Testing System Demonstration
 * Shows how automated frontend (Playwright) and backend tests are integrated
 * as child records of compliance sessions for unified reporting
 * 
 * Author: AI Assistant
 * Date: 2025-01-14
 */

const { orchestrator } = require('./unified-test-orchestrator');
const PlaywrightIntegrationService = require('../database/services/playwright-integration-service');
const axios = require('axios');

class UnifiedTestingDemo {
    constructor() {
        this.baseURL = 'http://localhost:3001/api';
        this.playwrightService = new PlaywrightIntegrationService();
    }

    /**
     * Demonstration of complete unified testing workflow
     */
    async demonstrateUnifiedTesting() {
        console.log(`🎯 Unified Testing System Demonstration`);
        console.log(`=====================================\n`);

        try {
            // Step 1: Create integrated compliance session
            console.log(`1️⃣  Creating Integrated Compliance Session`);
            const session = await this.createDemoSession();
            console.log(`   ✅ Session created: ${session.sessionId}`);
            console.log(`   📋 Frontend test run: ${session.frontendTestRunId}`);

            // Step 2: Run unified testing orchestration
            console.log(`\n2️⃣  Running Unified Test Orchestration`);
            const orchestrationResults = await this.runOrchestration(session.projectId);
            console.log(`   ✅ Orchestration completed: ${orchestrationResults.orchestrationId}`);

            // Step 3: Demonstrate unified result retrieval
            console.log(`\n3️⃣  Retrieving Unified Test Results`);
            await this.demonstrateResultRetrieval(orchestrationResults.sessionId);

            // Step 4: Show compliance reporting
            console.log(`\n4️⃣  Generating Compliance Reports`);
            await this.demonstrateComplianceReporting(orchestrationResults.sessionId);

            // Step 5: Show violation analysis
            console.log(`\n5️⃣  Analyzing Violations Across All Tests`);
            await this.demonstrateViolationAnalysis(orchestrationResults.sessionId);

            console.log(`\n🎉 Demo completed successfully!`);
            console.log(`📊 Session ${orchestrationResults.sessionId} contains unified test results from:`);
            console.log(`   - Frontend automated tests (Playwright)`);
            console.log(`   - Backend automated tests (axe, pa11y, lighthouse)`);
            console.log(`   - Manual testing integration`);
            console.log(`   - Unified compliance reporting`);

        } catch (error) {
            console.error(`❌ Demo failed:`, error.message);
            throw error;
        }
    }

    /**
     * Create demo compliance session
     */
    async createDemoSession() {
        const projectId = 'ecc03931-c333-408a-88eb-94d94723d33c'; // Default project

        const sessionResult = await this.playwrightService.createIntegratedTestSession(projectId, {
            name: 'Unified Testing Demonstration',
            description: 'Demonstration of integrated frontend and backend accessibility testing',
            testingApproach: 'hybrid',
            scope: {
                includePlaywright: true,
                includeBackendTools: ['axe', 'pa11y'],
                browsers: ['chromium', 'firefox'],
                testTypes: ['basic', 'keyboard', 'screen-reader']
            }
        });

        return {
            sessionId: sessionResult.session.id,
            projectId: projectId,
            frontendTestRunId: sessionResult.frontendTestRun.id
        };
    }

    /**
     * Run orchestration demonstration
     */
    async runOrchestration(projectId) {
        console.log(`   🎭 Starting test orchestration...`);

        const orchestrationResults = await orchestrator.orchestrateComplianceTest(projectId, {
            sessionName: 'Demo Unified Testing',
            testingApproach: 'hybrid',
            includeFrontend: true,
            includeBackend: true,
            backendTools: ['axe', 'pa11y'],
            browsers: ['chromium'],
            testTypes: ['basic', 'keyboard'],
            maxPages: 5,
            maxTestPages: 3
        });

        console.log(`   📊 Results:`, {
            totalTests: orchestrationResults.results.totalTests,
            violations: orchestrationResults.results.totalViolations,
            compliance: `${orchestrationResults.results.complianceScore}%`,
            duration: `${Math.round(orchestrationResults.duration / 1000)}s`
        });

        return orchestrationResults;
    }

    /**
     * Demonstrate unified result retrieval
     */
    async demonstrateResultRetrieval(sessionId) {
        try {
            // Get comprehensive session results
            console.log(`   📊 Fetching comprehensive test results...`);
            const response = await axios.get(`${this.baseURL}/unified-test-results/session/${sessionId}`);
            const results = response.data;

            console.log(`   ✅ Retrieved unified results:`);
            console.log(`      - Total tests: ${results.resultsSummary.totalTests}`);
            console.log(`      - Frontend tests: ${results.resultsSummary.automatedTests.frontend}`);
            console.log(`      - Backend tests: ${results.resultsSummary.automatedTests.backend}`);
            console.log(`      - Manual tests: ${results.resultsSummary.manualTests.total}`);
            console.log(`      - Overall compliance: ${results.resultsSummary.overallCompliance}%`);

            // Show detailed results sample
            if (results.detailedResults && results.detailedResults.length > 0) {
                console.log(`   📝 Sample detailed results:`);
                results.detailedResults.slice(0, 3).forEach((result, index) => {
                    console.log(`      ${index + 1}. ${result.test_tool} on ${result.page_url}: ${result.test_result} (${result.violations_count} violations)`);
                });
            }

            return results;

        } catch (error) {
            console.error(`   ❌ Failed to retrieve results:`, error.message);
        }
    }

    /**
     * Demonstrate compliance reporting
     */
    async demonstrateComplianceReporting(sessionId) {
        try {
            // Get test coverage analysis
            console.log(`   📋 Fetching test coverage analysis...`);
            const coverageResponse = await axios.get(`${this.baseURL}/unified-test-results/session/${sessionId}/coverage`);
            const coverage = coverageResponse.data;

            console.log(`   ✅ Coverage analysis:`);
            console.log(`      - WCAG criteria tested: ${coverage.coverageStatistics.wcag.testedCriteria}/${coverage.coverageStatistics.wcag.totalCriteria} (${coverage.coverageStatistics.wcag.coveragePercentage}%)`);
            console.log(`      - Pages tested: ${coverage.coverageStatistics.pages.totalPages}`);
            console.log(`      - Fully tested pages: ${coverage.coverageStatistics.pages.fullyTestedPages}`);
            console.log(`      - Frontend coverage: ${coverage.coverageStatistics.testing.frontendCoverage} pages`);
            console.log(`      - Backend coverage: ${coverage.coverageStatistics.testing.backendCoverage} pages`);

            // Show WCAG level breakdown
            const wcagLevels = coverage.coverageStatistics.wcag.byLevel;
            console.log(`   📊 WCAG Level Coverage:`);
            Object.keys(wcagLevels).forEach(level => {
                const criteria = wcagLevels[level];
                const tested = criteria.filter(c => c.coverage_status === 'tested').length;
                console.log(`      - Level ${level}: ${tested}/${criteria.length} criteria tested`);
            });

            return coverage;

        } catch (error) {
            console.error(`   ❌ Failed to get coverage analysis:`, error.message);
        }
    }

    /**
     * Demonstrate violation analysis
     */
    async demonstrateViolationAnalysis(sessionId) {
        try {
            // Get violations grouped by different criteria
            console.log(`   🔍 Fetching violation analysis...`);
            
            // By severity
            const severityResponse = await axios.get(`${this.baseURL}/unified-test-results/session/${sessionId}/violations?groupBy=severity`);
            const violationsBySeverity = severityResponse.data;

            console.log(`   ✅ Violations by severity:`);
            Object.keys(violationsBySeverity.statistics.bySeverity).forEach(severity => {
                const count = violationsBySeverity.statistics.bySeverity[severity];
                console.log(`      - ${severity}: ${count} violations`);
            });

            // By source (automated vs manual)
            console.log(`   📋 Violations by source:`);
            Object.keys(violationsBySeverity.statistics.bySource).forEach(source => {
                const count = violationsBySeverity.statistics.bySource[source];
                console.log(`      - ${source}: ${count} violations`);
            });

            // By page
            const pageResponse = await axios.get(`${this.baseURL}/unified-test-results/session/${sessionId}/violations?groupBy=page`);
            const violationsByPage = pageResponse.data;

            console.log(`   🌐 Top pages with violations:`);
            const pageViolations = Object.entries(violationsByPage.statistics.byPage)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            
            pageViolations.forEach(([page, count]) => {
                console.log(`      - ${page}: ${count} violations`);
            });

            return {
                bySeverity: violationsBySeverity,
                byPage: violationsByPage
            };

        } catch (error) {
            console.error(`   ❌ Failed to analyze violations:`, error.message);
        }
    }

    /**
     * Demonstrate Playwright report import
     */
    async demonstratePlaywrightImport(sessionId) {
        try {
            console.log(`   📥 Importing existing Playwright reports...`);
            
            const importResponse = await axios.post(`${this.baseURL}/unified-test-results/session/${sessionId}/import-playwright`, {
                reportPattern: 'playwright-*.json',
                cleanup: false
            });

            const importResults = importResponse.data.importResults;
            
            console.log(`   ✅ Import completed:`);
            console.log(`      - Files processed: ${importResults.filesProcessed}`);
            console.log(`      - Results stored: ${importResults.resultsStored}`);
            console.log(`      - Total tests: ${importResults.summary.totalTests}`);
            console.log(`      - Total violations: ${importResults.summary.totalViolations}`);

            if (importResults.errors.length > 0) {
                console.log(`   ⚠️  Errors during import:`);
                importResults.errors.forEach(error => {
                    console.log(`      - ${error.file}: ${error.error}`);
                });
            }

            return importResults;

        } catch (error) {
            console.error(`   ❌ Failed to import Playwright reports:`, error.message);
        }
    }

    /**
     * Show example of manual test integration
     */
    async demonstrateManualTestIntegration(sessionId) {
        try {
            console.log(`   👤 Adding sample manual test results...`);

            // Example manual test result
            const manualTestResult = {
                page_id: 'sample-page-id',
                requirement_id: 'wcag-1.1.1',
                requirement_type: 'wcag',
                result: 'fail',
                confidence_level: 'high',
                notes: 'Image missing alt text attribute',
                tester_name: 'Demo Tester',
                evidence: {
                    screenshots: ['screenshot1.png'],
                    description: 'Image element without alt attribute found in header'
                }
            };

            const manualResponse = await axios.post(`${this.baseURL}/manual-testing/session/${sessionId}/result`, manualTestResult);

            console.log(`   ✅ Manual test result added: ${manualResponse.data.result_id}`);
            console.log(`      - Requirement: WCAG 1.1.1`);
            console.log(`      - Result: Fail`);
            console.log(`      - Evidence: Screenshot provided`);

            return manualResponse.data;

        } catch (error) {
            console.error(`   ❌ Failed to add manual test result:`, error.message);
        }
    }

    /**
     * Demonstrate export functionality
     */
    async demonstrateExport(sessionId) {
        try {
            console.log(`   📤 Exporting comprehensive test results...`);

            const exportResponse = await axios.get(`${this.baseURL}/unified-test-results/session/${sessionId}/export?format=json`);
            const exportData = exportResponse.data;

            console.log(`   ✅ Export completed:`);
            console.log(`      - Session ID: ${exportData.exportMetadata.sessionId}`);
            console.log(`      - Total results: ${exportData.exportMetadata.totalResults}`);
            console.log(`      - Generated at: ${exportData.exportMetadata.generatedAt}`);
            console.log(`      - Format: ${exportData.exportMetadata.format}`);

            // Save to file for demonstration
            const fs = require('fs');
            const exportPath = `reports/unified-test-results-${sessionId}.json`;
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            console.log(`      - Saved to: ${exportPath}`);

            return exportData;

        } catch (error) {
            console.error(`   ❌ Failed to export results:`, error.message);
        }
    }
}

// Run demo if called directly
if (require.main === module) {
    const demo = new UnifiedTestingDemo();
    
    console.log(`🚀 Starting Unified Testing System Demo...`);
    console.log(`Make sure the API server is running on http://localhost:3001\n`);

    demo.demonstrateUnifiedTesting()
        .then(() => {
            console.log(`\n🎯 Demo completed successfully!`);
            console.log(`\nKey Benefits Demonstrated:`);
            console.log(`✅ Unified test result storage for compliance sessions`);
            console.log(`✅ Frontend (Playwright) and backend (axe/pa11y) integration`);
            console.log(`✅ Manual test result correlation`);
            console.log(`✅ Comprehensive violation analysis`);
            console.log(`✅ WCAG coverage tracking`);
            console.log(`✅ Export capabilities for external reporting`);
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n❌ Demo failed:`, error);
            process.exit(1);
        });
}

module.exports = UnifiedTestingDemo; 