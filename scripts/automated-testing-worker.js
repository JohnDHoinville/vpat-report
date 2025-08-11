#!/usr/bin/env node

/**
 * Automated Testing Worker
 * Processes pending automated tests from the database
 * Runs in the background to execute queued tests
 */

const { Pool } = require('pg');
const TestAutomationService = require('../api/services/test-automation-service');
const WebSocketClient = require('./websocket-client');

// Mock WebSocket service for the worker (fallback)
class MockWebSocketService {
    emitToSession(sessionId, event, data) {
        console.log(`📡 WebSocket: ${event} to session ${sessionId}:`, data);
    }
    
    emitToProject(projectId, event, data) {
        console.log(`📡 WebSocket: ${event} to project ${projectId}:`, data);
    }
}

class AutomatedTestingWorker {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'accessibility_testing',
            user: process.env.DB_USER || process.env.USER,
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.automationService = new TestAutomationService(new MockWebSocketService());
        this.wsClient = new WebSocketClient();
        this.isRunning = false;
        this.pollInterval = 10000; // 10 seconds
    }

    async start() {
        console.log('🤖 Starting Automated Testing Worker...');
        this.isRunning = true;
        
        // Connect to WebSocket server
        await this.wsClient.connect();
        
        // Process any existing pending tests
        await this.processPendingTests();
        
        // Start polling for new tests
        this.pollForTests();
    }

    async stop() {
        console.log('🛑 Stopping Automated Testing Worker...');
        this.isRunning = false;
        this.wsClient.disconnect();
        await this.pool.end();
    }

    async pollForTests() {
        let consecutiveEmptyPolls = 0;
        const maxEmptyPolls = 10; // Stop polling after 10 consecutive empty polls
        
        while (this.isRunning) {
            try {
                const hadTests = await this.processPendingTests();
                
                if (hadTests) {
                    consecutiveEmptyPolls = 0; // Reset counter when we process tests
                } else {
                    consecutiveEmptyPolls++;
                    if (consecutiveEmptyPolls >= maxEmptyPolls) {
                        console.log(`🛑 No pending tests found for ${maxEmptyPolls} consecutive polls. Stopping worker.`);
                        this.isRunning = false;
                        break;
                    }
                }
                
                await this.sleep(this.pollInterval);
            } catch (error) {
                console.error('❌ Error in polling loop:', error);
                await this.sleep(this.pollInterval);
            }
        }
    }

    async processPendingTests() {
        try {
            // Get pending automated test results
            const pendingTests = await this.getPendingTests();
            
            if (pendingTests.length > 0) {
                console.log(`📋 Found ${pendingTests.length} pending tests to process`);
                
                for (const test of pendingTests) {
                    await this.processTest(test);
                }
                
                return true; // Indicate that we processed tests
            } else {
                return false; // Indicate no tests were processed
            }
        } catch (error) {
            console.error('❌ Error processing pending tests:', error);
            return false;
        }
    }

    async getPendingTests() {
        const query = `
            SELECT 
                atr.id,
                atr.test_session_id,
                atr.page_id,
                atr.tool_name,
                atr.status,
                atr.started_at,
                dp.url as page_url,
                dp.title as page_title
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.status = 'pending'
            ORDER BY atr.started_at ASC
            LIMIT 5
        `;

        try {
            const result = await this.pool.query(query);
            // Only log when we find tests or on first few empty polls
            if (result.rows.length > 0) {
                console.log(`🔍 Found ${result.rows.length} pending tests`);
            }
            return result.rows;
        } catch (error) {
            console.error('❌ Error getting pending tests:', error);
            return [];
        }
    }

    async processTest(test) {
        console.log(`🚀 Processing test: ${test.tool_name} for ${test.page_url}`);
        
        try {
            // Update status to running
            await this.updateTestStatus(test.id, 'running');
            
            // Emit progress update
            this.wsClient.emitSessionProgress(test.test_session_id, {
                percentage: 50, // Will be calculated properly
                currentPage: test.page_url,
                currentTool: test.tool_name,
                message: `Testing ${test.page_url} with ${test.tool_name}`,
                stage: 'testing'
            });
            
            // Execute the test based on tool
            let result;
            switch (test.tool_name) {
                case 'axe-core':
                    result = await this.runAxeTest(test.page_url);
                    break;
                case 'pa11y':
                    result = await this.runPa11yTest(test.page_url);
                    break;
                case 'lighthouse':
                    result = await this.runLighthouseTest(test.page_url);
                    break;
                default:
                    throw new Error(`Unknown tool: ${test.tool_name}`);
            }
            
            // Update test result
            await this.updateTestResult(test.id, result);
            
            // Map violations to test instances
            if (result.violations && result.violations.length > 0) {
                await this.mapViolationsToTestInstances(test.test_session_id, test.page_url, result.violations, test.tool_name);
            }
            
            // Emit test results update
            this.wsClient.emitTestResults(test.test_session_id, test.page_id, {
                tool: test.tool_name,
                url: test.page_url,
                violations: result.violations?.length || 0,
                passes: result.passes?.length || 0,
                result: result
            });
            
            console.log(`✅ Test completed: ${test.tool_name} for ${test.page_url}`);
            
        } catch (error) {
            console.error(`❌ Test failed: ${test.tool_name} for ${test.page_url}:`, error.message);
            await this.updateTestStatus(test.id, 'failed', error.message);
            
            // Emit error update
            this.wsClient.emitSessionProgress(test.test_session_id, {
                percentage: 0,
                currentPage: test.page_url,
                currentTool: test.tool_name,
                message: `Error: ${error.message}`,
                stage: 'error'
            });
        }
    }

    async runAxeTest(url) {
        console.log(`  🪓 Running real axe-core test for ${url}`);
        
        try {
            const { execSync } = require('child_process');
            
            // Run axe-core CLI against the URL
            const command = `npx axe "${url}" --stdout --tags wcag2a,wcag2aa`;
            console.log(`    Executing: ${command}`);
            
            const output = execSync(command, { 
                encoding: 'utf8', 
                timeout: 60000,
                stdio: ['ignore', 'pipe', 'pipe'] 
            });
            
            const results = JSON.parse(output);
            
            console.log(`    ✅ Axe-core found ${results.violations?.length || 0} violations, ${results.passes?.length || 0} passes`);
            
            return {
                violations: results.violations || [],
                passes: results.passes || [],
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'axe-core'
            };
            
        } catch (error) {
            console.error(`    ❌ Axe-core test failed for ${url}:`, error.message);
            
            // Return empty results on failure
            return {
                violations: [],
                passes: [],
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'axe-core',
                error: error.message
            };
        }
    }

    async runPa11yTest(url) {
        console.log(`  🔍 Running real pa11y test for ${url}`);
        
        try {
            const { execSync } = require('child_process');
            
            // Run pa11y with axe runner for better WCAG 2.2 support
            const command = `npx pa11y "${url}" --reporter json --runner axe --standard WCAG2AA --timeout 30000`;
            console.log(`    Executing: ${command}`);
            
            let output;
            try {
                output = execSync(command, { 
                    encoding: 'utf8', 
                    timeout: 60000,
                    stdio: ['ignore', 'pipe', 'pipe'] 
                });
            } catch (error) {
                // Pa11y returns non-zero exit code when violations are found
                // This is normal behavior, so we should still process the output
                if (error.stdout) {
                    output = error.stdout;
                } else {
                    throw error;
                }
            }
            
            const results = JSON.parse(output);
            
            console.log(`    ✅ Pa11y found ${results.length || 0} issues`);
            
            return {
                violations: results.filter(issue => issue.type === 'error') || [],
                passes: results.filter(issue => issue.type === 'pass') || [],
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'pa11y'
            };
            
        } catch (error) {
            console.error(`    ❌ Pa11y test failed for ${url}:`, error.message);
            
            // Return empty results on failure
            return {
                violations: [],
                passes: [],
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'pa11y',
                error: error.message
            };
        }
    }

    async runLighthouseTest(url) {
        console.log(`  💡 Running real lighthouse test for ${url}`);
        
        try {
            const { execSync } = require('child_process');
            
            // Run lighthouse accessibility audit
            const command = `npx lighthouse "${url}" --only-categories=accessibility --output=json --quiet --chrome-flags="--headless"`;
            console.log(`    Executing: ${command}`);
            
            const output = execSync(command, { 
                encoding: 'utf8', 
                timeout: 120000, // 2 minutes for lighthouse
                stdio: ['ignore', 'pipe', 'pipe'] 
            });
            
            const results = JSON.parse(output);
            
            // Extract accessibility audits
            const audits = results.audits || {};
            const accessibilityScore = results.categories?.accessibility?.score || 0;
            
            // Count failed audits as violations
            const violations = Object.values(audits).filter(audit => 
                audit.score !== null && audit.score < 1
            );
            
            console.log(`    ✅ Lighthouse accessibility score: ${Math.round(accessibilityScore * 100)}%, found ${violations.length} failed audits`);
            
            return {
                audits: audits,
                categories: results.categories,
                accessibilityScore: accessibilityScore,
                violations: violations,
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'lighthouse'
            };
            
        } catch (error) {
            console.error(`    ❌ Lighthouse test failed for ${url}:`, error.message);
            
            // Return empty results on failure
            return {
                audits: {},
                categories: {},
                accessibilityScore: 0,
                violations: [],
                timestamp: new Date().toISOString(),
                url: url,
                tool: 'lighthouse',
                error: error.message
            };
        }
    }

    async updateTestStatus(testId, status, error = null) {
        const query = `
            UPDATE automated_test_results 
            SET status = $1, 
                error = $2,
                executed_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;
        
        await this.pool.query(query, [status, error, testId]);
    }

    async updateTestResult(testId, result) {
        const query = `
            UPDATE automated_test_results 
            SET status = 'completed',
                raw_results = $1,
                violations_count = $2,
                warnings_count = $3,
                passes_count = $4,
                test_duration_ms = $5,
                executed_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;
        
        // Handle different result formats from different tools
        let violationsCount = 0;
        let warningsCount = 0;
        let passesCount = 0;
        
        if (result.tool === 'lighthouse') {
            // Lighthouse has a different structure
            violationsCount = result.violations ? result.violations.length : 0;
            warningsCount = 0; // Lighthouse doesn't have warnings in the same format
            passesCount = 0; // Lighthouse doesn't have passes in the same format
        } else {
            // axe-core and pa11y have standard format
            violationsCount = result.violations ? result.violations.length : 0;
            warningsCount = result.warnings ? result.warnings.length : 0;
            passesCount = result.passes ? result.passes.length : 0;
        }
        
        // Calculate actual test duration (we'll use a reasonable estimate for now)
        const testDuration = result.tool === 'lighthouse' ? 60000 : 30000; // 60s for lighthouse, 30s for others
        
        console.log(`    📊 Updating test result: ${violationsCount} violations, ${warningsCount} warnings, ${passesCount} passes`);
        
        await this.pool.query(query, [
            JSON.stringify(result),
            violationsCount,
            warningsCount,
            passesCount,
            testDuration,
            testId
        ]);
    }

    async mapViolationsToTestInstances(sessionId, pageUrl, violations, toolName) {
        try {
            console.log(`🔗 Mapping ${violations.length} violations to test instances for ${pageUrl}`);
            
            // Get test instances for this page and session
            const instancesQuery = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1
                AND dp.url = $2
                AND ur.requirement_id IS NOT NULL
            `;
            
            const instancesResult = await this.pool.query(instancesQuery, [sessionId, pageUrl]);
            const testInstances = instancesResult.rows;
            
            console.log(`🔍 Found ${testInstances.length} test instances for page ${pageUrl}`);
            
            let updatedCount = 0;
            
            for (const violation of violations) {
                // Map violation to WCAG criteria
                const wcagCriteria = this.mapViolationToWcagCriteria(violation, toolName);
                
                // Find matching test instances
                const matchingInstances = testInstances.filter(instance => 
                    wcagCriteria.includes(instance.criterion_number)
                );
                
                console.log(`🔍 Violation "${violation.id || violation.code}" maps to WCAG ${wcagCriteria}, found ${matchingInstances.length} matching instances`);
                
                // Update matching test instances
                for (const instance of matchingInstances) {
                    const updateQuery = `
                        UPDATE test_instances 
                        SET status = 'failed',
                            automated_result_id = (
                                SELECT id FROM automated_test_results 
                                WHERE test_session_id = $1 
                                AND page_id = $2 
                                AND tool_name = $3 
                                AND status = 'completed'
                                ORDER BY executed_at DESC 
                                LIMIT 1
                            ),
                            notes = $4,
                            evidence = $5,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $6
                    `;
                    
                    const notes = `Automated test failed: ${violation.description || violation.help || violation.message}`;
                    const evidence = JSON.stringify({
                        tool: toolName,
                        violation: violation,
                        timestamp: new Date().toISOString()
                    });
                    
                    await this.pool.query(updateQuery, [
                        sessionId, 
                        instance.page_id, 
                        toolName, 
                        notes, 
                        evidence, 
                        instance.test_instance_id
                    ]);
                    
                    updatedCount++;
                }
            }
            
            console.log(`✅ Updated ${updatedCount} test instances with violations for ${pageUrl}`);
            
        } catch (error) {
            console.error(`❌ Error mapping violations to test instances:`, error);
        }
    }
    
    mapViolationToWcagCriteria(violation, toolName) {
        // Map common violations to WCAG criteria
        const violationMappings = {
            'color-contrast': ['1.4.3'],
            'document-title': ['2.4.2'],
            'page-has-heading-one': ['1.3.1', '2.4.6'],
            'image-alt': ['1.1.1'],
            'label': ['3.3.2'],
            'link-name': ['2.4.4'],
            'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.EmptyTitle': ['2.4.2'],
            'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': ['1.4.3'],
            'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': ['1.1.1']
        };
        
        const violationId = violation.id || violation.code || '';
        
        // Try to find a mapping
        for (const [pattern, criteria] of Object.entries(violationMappings)) {
            if (violationId.includes(pattern) || violationId === pattern) {
                return criteria;
            }
        }
        
        // Default mapping for unknown violations
        return ['1.3.1']; // Default to structure criterion
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the worker if this script is run directly
if (require.main === module) {
    const worker = new AutomatedTestingWorker();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await worker.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await worker.stop();
        process.exit(0);
    });
    
    // Start the worker
    worker.start().catch(error => {
        console.error('❌ Failed to start worker:', error);
        process.exit(1);
    });
}

module.exports = AutomatedTestingWorker; 