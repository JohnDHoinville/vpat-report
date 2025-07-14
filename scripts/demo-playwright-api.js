/**
 * Demo: Playwright Testing API Integration
 * 
 * This script demonstrates how to initiate and monitor Playwright tests
 * from the application using the new API endpoints.
 * 
 * Usage:
 * node scripts/demo-playwright-api.js <sessionId>
 * node scripts/demo-playwright-api.js <projectId> --comprehensive
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3001/api';

class PlaywrightAPIDemo {
    constructor() {
        this.token = null;
    }

    async makeRequest(endpoint, options = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(`${API_BASE}${endpoint}`);
            const requestOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                    ...options.headers
                }
            };

            const req = http.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response);
                    } catch (error) {
                        resolve({ success: false, error: 'Invalid JSON response', raw: data });
                    }
                });
            });

            req.on('error', reject);

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async authenticate() {
        console.log('🔐 Authenticating...');
        // For demo purposes, we'll skip auth or use a simple token
        // In a real implementation, you'd handle login here
        this.token = 'demo-token'; // Replace with actual authentication
        console.log('✅ Authentication ready (demo mode)');
    }

    async startPlaywrightTestingForSession(sessionId, options = {}) {
        console.log(`🎭 Starting Playwright testing for session: ${sessionId}`);
        
        const testConfig = {
            testTypes: options.testTypes || ['basic', 'keyboard', 'screen-reader'],
            browsers: options.browsers || ['chromium'],
            viewports: options.viewports || ['desktop'],
            authConfigId: options.authConfigId || null
        };

        console.log('📋 Test Configuration:', testConfig);

        try {
            const response = await this.makeRequest(`/sessions/${sessionId}/start-playwright`, {
                method: 'POST',
                body: testConfig
            });

            if (response.success) {
                console.log('✅ Playwright testing initiated successfully!');
                console.log('📊 Configuration:', response.configuration);
                console.log('🔗 Test Run ID:', response.testRun?.id);
                
                // Start monitoring progress
                await this.monitorTestProgress(sessionId);
                
                return response;
            } else {
                throw new Error(response.error || 'Failed to start testing');
            }
        } catch (error) {
            console.error('❌ Error starting Playwright testing:', error.message);
            throw error;
        }
    }

    async startComprehensiveTestingForProject(projectId, options = {}) {
        console.log(`🚀 Starting comprehensive testing for project: ${projectId}`);
        
        const testConfig = {
            sessionName: options.sessionName || `API Demo Test - ${new Date().toISOString().split('T')[0]}`,
            description: options.description || 'Comprehensive testing initiated via API demo',
            testingApproach: options.testingApproach || 'hybrid',
            includeFrontend: options.includeFrontend !== false,
            includeBackend: options.includeBackend !== false,
            testTypes: options.testTypes || ['basic', 'keyboard', 'screen-reader', 'form'],
            browsers: options.browsers || ['chromium', 'firefox'],
            backendTools: options.backendTools || ['axe', 'pa11y'],
            maxPages: options.maxPages || 25
        };

        console.log('📋 Test Configuration:', testConfig);

        try {
            const response = await this.makeRequest(`/projects/${projectId}/comprehensive-testing`, {
                method: 'POST',
                body: testConfig
            });

            if (response.success) {
                console.log('✅ Comprehensive testing initiated successfully!');
                console.log('📊 Project:', response.project);
                console.log('⚙️  Configuration:', response.testConfiguration);
                console.log('📝 Note:', response.message_details);
                
                return response;
            } else {
                throw new Error(response.error || 'Failed to start comprehensive testing');
            }
        } catch (error) {
            console.error('❌ Error starting comprehensive testing:', error.message);
            throw error;
        }
    }

    async monitorTestProgress(sessionId) {
        console.log(`📊 Monitoring test progress for session: ${sessionId}`);
        
        let attempts = 0;
        const maxAttempts = 24; // Monitor for up to 2 minutes (5s intervals)
        
        const poll = async () => {
            try {
                const response = await this.makeRequest(`/sessions/${sessionId}/test-progress`);
                
                if (response.success) {
                    console.log('\n📈 Progress Update:');
                    console.log(`   Session: ${response.session.name}`);
                    console.log(`   Status: ${response.session.status}`);
                    
                    if (response.automatedTestsSummary) {
                        const summary = response.automatedTestsSummary;
                        console.log(`   Tests: ${summary.total_tests} total, ${summary.passed_tests} passed, ${summary.failed_tests} failed`);
                        console.log(`   Violations: ${summary.total_violations || 0}`);
                        console.log(`   Pages Tested: ${summary.pages_tested || 0}`);
                        console.log(`   Tools Used: ${summary.tools_used || 0}`);
                    }
                    
                    if (response.frontendTestRuns && response.frontendTestRuns.length > 0) {
                        const latestRun = response.frontendTestRuns[0];
                        console.log(`   Frontend Run: ${latestRun.status} (${latestRun.test_suite})`);
                        
                        if (latestRun.status === 'completed' || latestRun.status === 'failed') {
                            console.log('🏁 Testing completed!');
                            await this.getPlaywrightResults(sessionId);
                            return;
                        }
                    }
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Poll every 5 seconds
                } else {
                    console.log('⏰ Monitoring timeout reached');
                }
                
            } catch (error) {
                console.error('❌ Error monitoring progress:', error.message);
            }
        };
        
        poll();
    }

    async getPlaywrightResults(sessionId) {
        console.log(`📋 Getting Playwright results for session: ${sessionId}`);
        
        try {
            const response = await this.makeRequest(`/sessions/${sessionId}/playwright-results`);
            
            if (response.success) {
                console.log('\n🎯 Playwright Test Results:');
                console.log(`   Total Tests: ${response.summary.totalTests}`);
                console.log(`   Passed: ${response.summary.passedTests}`);
                console.log(`   Failed: ${response.summary.failedTests}`);
                console.log(`   Total Violations: ${response.summary.totalViolations}`);
                console.log(`   Browsers Used: ${response.summary.browsersUsed.join(', ')}`);
                console.log(`   Pages Tested: ${response.summary.pagesTestedCount}`);
                
                if (response.violations && response.violations.length > 0) {
                    console.log('\n🚨 Top Violations:');
                    response.violations.slice(0, 5).forEach((violation, index) => {
                        console.log(`   ${index + 1}. ${violation.wcag_criterion}: ${violation.description} (${violation.severity})`);
                    });
                }
                
                return response;
            } else {
                throw new Error(response.error || 'Failed to get results');
            }
        } catch (error) {
            console.error('❌ Error getting Playwright results:', error.message);
            throw error;
        }
    }

    async demonstrateAPI() {
        console.log('🎭 Playwright API Demo Starting...\n');
        
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log(`
Usage:
  node scripts/demo-playwright-api.js <sessionId>                    # Start Playwright for existing session
  node scripts/demo-playwright-api.js <projectId> --comprehensive    # Start comprehensive testing
  node scripts/demo-playwright-api.js --help                         # Show this help

Examples:
  node scripts/demo-playwright-api.js abc123-def456-ghi789
  node scripts/demo-playwright-api.js proj-abc123 --comprehensive
            `);
            return;
        }

        await this.authenticate();

        const id = args[0];
        const isComprehensive = args.includes('--comprehensive');

        try {
            if (isComprehensive) {
                await this.startComprehensiveTestingForProject(id, {
                    testTypes: ['basic', 'keyboard', 'screen-reader'],
                    browsers: ['chromium'],
                    maxPages: 10
                });
            } else {
                await this.startPlaywrightTestingForSession(id, {
                    testTypes: ['basic', 'keyboard'],
                    browsers: ['chromium'],
                    viewports: ['desktop']
                });
            }
        } catch (error) {
            console.error('\n💥 Demo failed:', error.message);
            process.exit(1);
        }
    }
}

// Frontend Integration Example
function getFrontendIntegrationExample() {
    return `
// Frontend Integration Example (JavaScript)
class PlaywrightTestingClient {
    constructor(apiBaseUrl = 'http://localhost:3001/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.token = localStorage.getItem('authToken');
    }

    async startPlaywrightTesting(sessionId, options = {}) {
        const response = await fetch(\`\${this.apiBaseUrl}/sessions/\${sessionId}/start-playwright\`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${this.token}\`
            },
            body: JSON.stringify({
                testTypes: options.testTypes || ['basic', 'keyboard'],
                browsers: options.browsers || ['chromium'],
                viewports: options.viewports || ['desktop']
            })
        });
        
        return await response.json();
    }

    async monitorProgress(sessionId) {
        const response = await fetch(\`\${this.apiBaseUrl}/sessions/\${sessionId}/test-progress\`, {
            headers: {
                'Authorization': \`Bearer \${this.token}\`
            }
        });
        
        return await response.json();
    }

    async getResults(sessionId) {
        const response = await fetch(\`\${this.apiBaseUrl}/sessions/\${sessionId}/playwright-results\`, {
            headers: {
                'Authorization': \`Bearer \${this.token}\`
            }
        });
        
        return await response.json();
    }
}

// Usage in frontend:
const client = new PlaywrightTestingClient();

// Start testing
const result = await client.startPlaywrightTesting('session-id');
console.log('Testing started:', result);

// Monitor progress
setInterval(async () => {
    const progress = await client.monitorProgress('session-id');
    updateUI(progress);
}, 5000);
    `;
}

// Run demo if called directly
if (require.main === module) {
    const demo = new PlaywrightAPIDemo();
    demo.demonstrateAPI().catch(console.error);
} else {
    // Export for use as module
    module.exports = { PlaywrightAPIDemo };
} 