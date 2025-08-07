#!/usr/bin/env node

/**
 * Automated Testing Worker
 * Processes pending automated tests from the database
 * Runs in the background to execute queued tests
 */

const { Pool } = require('pg');
const TestAutomationService = require('../api/services/test-automation-service');

// Mock WebSocket service for the worker
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
        this.isRunning = false;
        this.pollInterval = 10000; // 10 seconds
    }

    async start() {
        console.log('🤖 Starting Automated Testing Worker...');
        this.isRunning = true;
        
        // Process any existing pending tests
        await this.processPendingTests();
        
        // Start polling for new tests
        this.pollForTests();
    }

    async stop() {
        console.log('🛑 Stopping Automated Testing Worker...');
        this.isRunning = false;
        await this.pool.end();
    }

    async pollForTests() {
        while (this.isRunning) {
            try {
                await this.processPendingTests();
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
            }
        } catch (error) {
            console.error('❌ Error processing pending tests:', error);
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
                atr.started_at as created_at,
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
            console.log(`🔍 Found ${result.rows.length} pending tests`);
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
            
            console.log(`✅ Test completed: ${test.tool_name} for ${test.page_url}`);
            
        } catch (error) {
            console.error(`❌ Test failed: ${test.tool_name} for ${test.page_url}:`, error.message);
            await this.updateTestStatus(test.id, 'failed', error.message);
        }
    }

    async runAxeTest(url) {
        // Simple axe-core test simulation
        console.log(`  🪓 Running axe-core test for ${url}`);
        
        // Simulate test execution
        await this.sleep(2000);
        
        return {
            violations: [
                {
                    id: 'color-contrast',
                    impact: 'serious',
                    tags: ['wcag2aa', 'wcag143'],
                    description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
                    help: 'Elements must meet minimum color contrast ratio requirements',
                    helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/color-contrast',
                    nodes: [
                        {
                            html: '<button class="btn-primary">Submit</button>',
                            target: ['button.btn-primary'],
                            failureSummary: 'Fix any of the following:\n  Element has insufficient color contrast of 2.51 (foreground color: #ffffff, background color: #f0f0f0, font size: 12.0pt (16px), font weight: normal). Expected contrast ratio of 4.5:1'
                        }
                    ]
                }
            ],
            passes: [
                {
                    id: 'document-title',
                    impact: null,
                    tags: ['wcag2a', 'wcag242'],
                    description: 'Ensures each HTML document contains a non-empty <title> element',
                    help: 'Documents should have a title that describes page content',
                    helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/document-title',
                    nodes: [
                        {
                            html: '<title>Test Page</title>',
                            target: ['title']
                        }
                    ]
                }
            ],
            timestamp: new Date().toISOString(),
            url: url,
            tool: 'axe-core'
        };
    }

    async runPa11yTest(url) {
        // Simple pa11y test simulation
        console.log(`  🔍 Running pa11y test for ${url}`);
        
        // Simulate test execution
        await this.sleep(3000);
        
        return {
            violations: [
                {
                    code: 'WCAG2AA.Principle1.Guideline1_4.1_4_3',
                    message: 'Elements must meet minimum color contrast ratio requirements',
                    selector: 'button.btn-primary',
                    context: '<button class="btn-primary">Submit</button>',
                    type: 'error'
                }
            ],
            passes: [
                {
                    code: 'WCAG2AA.Principle2.Guideline2_4.2_4_2',
                    message: 'Page has a title',
                    selector: 'title',
                    context: '<title>Test Page</title>',
                    type: 'pass'
                }
            ],
            timestamp: new Date().toISOString(),
            url: url,
            tool: 'pa11y'
        };
    }

    async runLighthouseTest(url) {
        // Simple lighthouse test simulation
        console.log(`  💡 Running lighthouse test for ${url}`);
        
        // Simulate test execution
        await this.sleep(5000);
        
        return {
            audits: {
                'color-contrast': {
                    score: 0.8,
                    title: 'Background and foreground colors have a sufficient contrast ratio',
                    description: 'Low-contrast text is difficult or impossible for many users to read.',
                    details: {
                        type: 'table',
                        headings: [
                            { key: 'node', itemType: 'node', text: 'Element' },
                            { key: 'contrastRatio', itemType: 'numeric', text: 'Contrast Ratio' }
                        ],
                        items: [
                            {
                                node: { type: 'node', snippet: '<button class="btn-primary">Submit</button>' },
                                contrastRatio: 2.51
                            }
                        ]
                    }
                }
            },
            categories: {
                accessibility: {
                    score: 0.85,
                    title: 'Accessibility'
                }
            },
            timestamp: new Date().toISOString(),
            url: url,
            tool: 'lighthouse'
        };
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
        
        const violationsCount = result.violations ? result.violations.length : 0;
        const warningsCount = result.warnings ? result.warnings.length : 0;
        const passesCount = result.passes ? result.passes.length : 0;
        const testDuration = 5000; // Simulated duration
        
        await this.pool.query(query, [
            JSON.stringify(result),
            violationsCount,
            warningsCount,
            passesCount,
            testDuration,
            testId
        ]);
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