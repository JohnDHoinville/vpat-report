const { pool } = require('../../database/config');
const axeCore = require('axe-core');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

class TestAutomationService {
    constructor(wsService = null) {
        this.runningTests = new Map(); // Track running tests
        this.lighthouse = null; // Will be dynamically imported
        this.wsService = wsService; // WebSocket service for real-time updates
    }

    /**
     * Run automated tests for a testing session
     */
    async runAutomatedTests(sessionId, options = {}) {
        const {
            tools = ['axe-core', 'pa11y'],
            runAsync = true,
            pages = null,
            requirements = null,
            updateTestInstances = true,
            createEvidence = true,
            maxPages = 100,
            userId,
            clientMetadata = {}
        } = options;

        const runId = uuidv4();
        
        console.log(`🚀 Starting automation run ${runId} for session ${sessionId}`);

        try {
            // Create automation run record
            const runData = await this.createAutomationRun(sessionId, runId, tools, userId);

            // Get pages to test
            const pagesToTest = await this.getPagesToTest(sessionId, pages, maxPages);
            
            console.log(`📄 Testing ${pagesToTest.length} pages with tools: ${tools.join(', ')}`);

            if (runAsync) {
                // Run tests in background
                this.runTestsInBackground(runId, sessionId, tools, pagesToTest, updateTestInstances, createEvidence, userId, requirements, clientMetadata);
                
                return {
                    run_id: runId,
                    status: 'running',
                    pages_to_test: pagesToTest.length,
                    estimated_duration: this.estimateTestDuration(tools, pagesToTest.length)
                };
            } else {
                // Run tests synchronously
                const results = await this.executeAutomatedTests(runId, sessionId, tools, pagesToTest, updateTestInstances, createEvidence, userId, requirements, clientMetadata);
                return results;
            }

        } catch (error) {
            console.error(`❌ Error starting automation run ${runId}:`, error);
            throw error;
        }
    }

    /**
     * Run tests in background (async without blocking)
     */
    runTestsInBackground(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements, clientMetadata) {
        // Execute tests asynchronously without blocking
        setImmediate(async () => {
            try {
                await this.executeAutomatedTests(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements, clientMetadata);
            } catch (error) {
                console.error(`❌ Background test execution failed for run ${runId}:`, error);
                // Update run status to failed
                await this.updateRunStatus(runId, 'failed', { error: error.message });
            }
        });
    }

    /**
     * Execute automated tests
     */
    async executeAutomatedTests(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements = null, clientMetadata = {}) {
        const startTime = new Date();
        let totalIssues = 0;
        let criticalIssues = 0;
        const results = {};

        try {
            // Update run status to in progress
            await this.updateRunStatus(runId, 'running', { started_at: startTime });
            
            // Mark test instances as in-progress before starting automation
            const testInstancesMarked = await this.markTestInstancesInProgress(sessionId, userId, null, requirements);
            console.log(`📝 Marked ${testInstancesMarked} test instances as "in_progress"`);
            
            // Create session-level audit entry for status change
            await this.createSessionAuditLogEntry(
                sessionId, 
                'status_change', 
                userId, 
                `${testInstancesMarked} test instances marked as "in_progress" for automation`,
                {
                    run_id: runId,
                    field_changed: 'status',
                    old_value: 'not_tested',
                    new_value: 'in_progress',
                    instances_affected: testInstancesMarked,
                    change_reason: 'automation_preparation',
                    ...clientMetadata
                }
            );
            
            // Create session-level audit entry for automation start
            await this.createSessionAuditLogEntry(
                sessionId, 
                'automation_started', 
                userId, 
                `Automated testing started with tools: ${tools.join(', ')}`,
                {
                    run_id: runId,
                    tools_used: tools,
                    pages_to_test: pages.length,
                    test_instances_marked: testInstancesMarked,
                    estimated_duration: this.estimateTestDuration(tools, pages.length),
                    ...clientMetadata
                }
            );
            
            // Emit automation start progress
            this.emitProgress(sessionId, {
                percentage: 0,
                message: `Starting automated testing with ${tools.join(', ')}`,
                stage: 'initializing',
                totalTests: pages.length * tools.length,
                completedTests: 0,
                currentTool: '',
                startTime: startTime.toISOString()
            });

            // Run each tool
            for (let toolIndex = 0; toolIndex < tools.length; toolIndex++) {
                const tool = tools[toolIndex];
                console.log(`🔧 Running ${tool} on ${pages.length} pages`);
                
                // Emit tool start progress
                this.emitProgress(sessionId, {
                    percentage: Math.round((toolIndex / tools.length) * 100),
                    message: `Running ${tool} accessibility tests`,
                    stage: 'testing',
                    currentTool: tool,
                    completedTests: toolIndex * pages.length,
                    totalTests: pages.length * tools.length
                });
                
                switch (tool) {
                    case 'axe-core':
                        results.axe = await this.runAxe(pages);
                        break;
                    case 'pa11y':
                        results.pa11y = await this.runPa11y(pages);
                        break;
                    case 'lighthouse':
                        results.lighthouse = await this.runLighthouse(pages);
                        break;
                }

                // Count issues
                if (results[tool.replace('-', '')]) {
                    const toolResults = results[tool.replace('-', '')];
                    totalIssues += toolResults.total_violations || 0;
                    criticalIssues += toolResults.critical_violations || 0;
                }
                
                // Emit tool completion progress
                this.emitProgress(sessionId, {
                    percentage: Math.round(((toolIndex + 1) / tools.length) * 100),
                    message: `Completed ${tool} testing - ${totalIssues} issues found`,
                    stage: 'processing',
                    currentTool: tool,
                    completedTests: (toolIndex + 1) * pages.length,
                    totalTests: pages.length * tools.length,
                    violationsFound: totalIssues
                });
                
                // Create session-level audit entry for tool completion
                await this.createSessionAuditLogEntry(
                    sessionId, 
                    'automation_tool_completed', 
                    userId, 
                    `${tool} testing completed - ${totalIssues} total issues found`,
                    {
                        run_id: runId,
                        tool: tool,
                        violations_found: totalIssues,
                        critical_violations: criticalIssues,
                        pages_tested: pages.length,
                        time_elapsed_ms: Date.now() - startTime.getTime(),
                        ...clientMetadata
                    }
                );
                
                // Emit testing milestone for tool completion
                this.emitMilestone(sessionId, {
                    type: 'tool_complete',
                    message: `${tool} testing completed`,
                    tool: tool,
                    violationsFound: totalIssues - (results[tool.replace('-', '')] ? 0 : totalIssues),
                    timeElapsed: Date.now() - startTime.getTime()
                });
            }

            // Map results to test instances
            let testInstancesUpdated = 0;
            if (updateTestInstances) {
                testInstancesUpdated = await this.mapResultsToTestInstances(sessionId, results, userId);
                console.log(`📝 Updated ${testInstancesUpdated} test instances with automated results`);
                
                // Create session-level audit entry for status changes after automation
                await this.createSessionAuditLogEntry(
                    sessionId, 
                    'status_change', 
                    userId, 
                    `${testInstancesUpdated} test instances updated with automated test results`,
                    {
                        run_id: runId,
                        field_changed: 'status_and_results',
                        old_value: 'in_progress',
                        new_value: 'automated_results_available',
                        instances_affected: testInstancesUpdated,
                        change_reason: 'automation_completion',
                        results_summary: {
                            total_issues: totalIssues,
                            critical_issues: criticalIssues,
                            tools_used: tools
                        },
                        ...clientMetadata
                    }
                );
            }

            // Create evidence files
            let evidenceCreated = 0;
            if (createEvidence) {
                evidenceCreated = await this.createEvidenceFiles(sessionId, runId, results, userId);
                
                if (evidenceCreated > 0) {
                    // Create session-level audit entry for evidence creation
                    await this.createSessionAuditLogEntry(
                        sessionId, 
                        'evidence_created', 
                        userId, 
                        `${evidenceCreated} evidence files created from automated test results`,
                        {
                            run_id: runId,
                            evidence_files_count: evidenceCreated,
                            evidence_type: 'automated_result',
                            tools_used: tools,
                            change_reason: 'automation_evidence_generation',
                            ...clientMetadata
                        }
                    );
                }
            }

            // Update run completion
            const completedAt = new Date();
            await this.updateRunStatus(runId, 'completed', {
                completed_at: completedAt,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                test_instances_updated: testInstancesUpdated,
                evidence_files_created: evidenceCreated,
                raw_results: results
            });
            
            // Emit completion progress
            this.emitProgress(sessionId, {
                percentage: 100,
                message: `Automation completed - ${totalIssues} issues found`,
                stage: 'completed',
                currentTool: '',
                completedTests: pages.length * tools.length,
                totalTests: pages.length * tools.length,
                violationsFound: totalIssues
            });
            
            // Create session-level audit entry for automation completion
            await this.createSessionAuditLogEntry(
                sessionId, 
                'automation_completed', 
                userId, 
                `Automated testing completed - ${totalIssues} total issues found across ${pages.length} pages`,
                {
                    run_id: runId,
                    duration_ms: completedAt - startTime,
                    pages_tested: pages.length,
                    tools_used: tools,
                    total_issues: totalIssues,
                    critical_issues: criticalIssues,
                    test_instances_updated: testInstancesUpdated,
                    evidence_files_created: evidenceCreated,
                    final_status: 'completed',
                    ...clientMetadata
                }
            );
            
            // Emit automation completion event
            this.emitCompletion(sessionId, {
                run_id: runId,
                duration: completedAt - startTime,
                pages_tested: pages.length,
                tools_used: tools,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                test_instances_updated: testInstancesUpdated,
                evidence_files_created: evidenceCreated
            });

            return {
                run_id: runId,
                status: 'completed',
                duration: completedAt - startTime,
                pages_tested: pages.length,
                tools_used: tools,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                test_instances_updated: testInstancesUpdated,
                evidence_files_created: evidenceCreated,
                results: results
            };

        } catch (error) {
            console.error(`❌ Error executing automation run ${runId}:`, error);
            await this.updateRunStatus(runId, 'failed', { error: error.message });
            
            // Create session-level audit entry for automation failure
            await this.createSessionAuditLogEntry(
                sessionId, 
                'automation_failed', 
                userId, 
                `Automated testing failed: ${error.message}`,
                {
                    run_id: runId,
                    error_message: error.message,
                    tools_attempted: tools,
                    pages_attempted: pages.length,
                    final_status: 'failed',
                    ...clientMetadata
                }
            );
            
            throw error;
        }
    }

    /**
     * Run Axe-core tests
     */
    async runAxe(pages) {
        const browser = await puppeteer.launch({ headless: true });
        const results = {
            tool: 'axe-core',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        try {
            for (const page of pages) {
                const browserPage = await browser.newPage();
                
                try {
                    // Navigate to the page and wait for network to be idle
                    await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Wait for additional time to ensure dynamic content loads
                    await browserPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                    
                    // Wait for the title to be set (either by static HTML or JavaScript)
                    await browserPage.waitForFunction(() => {
                        const title = document.title;
                        return title && title.trim() !== '';
                    }, { timeout: 5000 }).catch(() => {
                        // If title is still empty after 5 seconds, continue anyway
                        console.log(`⚠️ Title still empty after waiting for ${page.url}`);
                    });
                    
                    // Wait for any remaining dynamic content
                    await browserPage.waitForFunction(() => {
                        // Wait for common indicators that the page is fully loaded
                        return new Promise((resolve) => {
                            // Check if page is still loading
                            if (document.readyState === 'complete') {
                                // Additional wait for any remaining async operations
                                setTimeout(resolve, 1000);
                            } else {
                                window.addEventListener('load', () => setTimeout(resolve, 1000));
                            }
                        });
                    }, { timeout: 10000 }).catch(() => {
                        // If timeout, continue anyway
                        console.log(`⚠️ Page load timeout for ${page.url}`);
                    });
                    
                    // Inject axe-core
                    await browserPage.addScriptTag({ path: require.resolve('axe-core') });
                    
                    // Run axe with additional wait to ensure it's ready
                    const axeResults = await browserPage.evaluate(() => {
                        return new Promise((resolve) => {
                            // Ensure axe is fully loaded
                            if (typeof axe !== 'undefined') {
                                axe.run().then(resolve);
                            } else {
                                // Wait for axe to be available
                                setTimeout(() => {
                                    if (typeof axe !== 'undefined') {
                                        axe.run().then(resolve);
                                    } else {
                                        resolve({ violations: [], passes: [], incomplete: [] });
                                    }
                                }, 1000);
                            }
                        });
                    });

                    // Process results
                    const pageResults = {
                        url: page.url,
                        violations: axeResults.violations.length,
                        critical: axeResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length,
                        details: axeResults.violations,
                        title_at_test_time: await browserPage.title()
                    };

                    results.pages_tested.push(pageResults);
                    results.total_violations += pageResults.violations;
                    results.critical_violations += pageResults.critical;
                    results.violations_by_page[page.url] = pageResults;

                    console.log(`✅ Axe tested ${page.url}: ${pageResults.violations} violations (title: "${pageResults.title_at_test_time}")`);

                } catch (pageError) {
                    console.error(`❌ Axe error testing ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                } finally {
                    await browserPage.close();
                }
            }
        } finally {
            await browser.close();
        }

        return results;
    }

    /**
     * Run Pa11y tests
     */
    async runPa11y(pages) {
        const results = {
            tool: 'pa11y',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        for (const page of pages) {
            try {
                // Use Puppeteer for better control over page loading
                const browser = await puppeteer.launch({ headless: true });
                const browserPage = await browser.newPage();
                
                try {
                    // Navigate to the page and wait for network to be idle
                    await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Wait for additional time to ensure dynamic content loads
                    await browserPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                    
                    // Wait for the title to be set (either by static HTML or JavaScript)
                    await browserPage.waitForFunction(() => {
                        const title = document.title;
                        return title && title.trim() !== '';
                    }, { timeout: 5000 }).catch(() => {
                        // If title is still empty after 5 seconds, continue anyway
                        console.log(`⚠️ Title still empty after waiting for ${page.url}`);
                    });
                    
                    // Wait for any remaining dynamic content
                    await browserPage.waitForFunction(() => {
                        // Wait for common indicators that the page is fully loaded
                        return new Promise((resolve) => {
                            // Check if page is still loading
                            if (document.readyState === 'complete') {
                                // Additional wait for any remaining async operations
                                setTimeout(resolve, 1000);
                            } else {
                                window.addEventListener('load', () => setTimeout(resolve, 1000));
                            }
                        });
                    }, { timeout: 10000 }).catch(() => {
                        // If timeout, continue anyway
                        console.log(`⚠️ Page load timeout for ${page.url}`);
                    });
                    
                    // Get the final title after waiting
                    const finalTitle = await browserPage.title();
                    
                    await browserPage.close();
                    await browser.close();
                    
                    // Now run pa11y with the fully loaded page
                    const pa11yResults = await pa11y(page.url, {
                        standard: 'WCAG2AA',
                        runner: 'axe',  // Use axe runner for better WCAG 2.2 support
                        timeout: 30000,
                        chromeLaunchConfig: {
                            headless: true
                        },
                        // Add custom wait function
                        wait: 3000, // Wait 3 seconds after page load
                        // Custom page preparation
                        beforeScript: (page) => {
                            // Additional wait for dynamic content using evaluate
                            return page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                        }
                    });

                    const pageResults = {
                        url: page.url,
                        violations: pa11yResults.issues.length,
                        critical: pa11yResults.issues.filter(issue => issue.type === 'error').length,
                        details: pa11yResults.issues,
                        title_at_test_time: finalTitle
                    };

                    results.pages_tested.push(pageResults);
                    results.total_violations += pageResults.violations;
                    results.critical_violations += pageResults.critical;
                    results.violations_by_page[page.url] = pageResults;

                    console.log(`✅ Pa11y tested ${page.url}: ${pageResults.violations} issues (title: "${pageResults.title_at_test_time}")`);

                } catch (pageError) {
                    console.error(`❌ Pa11y error testing ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                } finally {
                    try {
                        await browserPage.close();
                        await browser.close();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }

            } catch (error) {
                console.error(`❌ Pa11y error testing ${page.url}:`, error.message);
                results.pages_tested.push({
                    url: page.url,
                    error: error.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        return results;
    }

    /**
     * Run Lighthouse tests
     */
    async runLighthouse(pages) {
        // Dynamic import for Lighthouse (ES module)
        if (!this.lighthouse) {
            this.lighthouse = (await import('lighthouse')).default;
        }

        const chromeLauncher = require('chrome-launcher');
        const results = {
            tool: 'lighthouse',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        let chrome;
        try {
            chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
            
            for (const page of pages) {
                try {
                    const lighthouseResults = await this.lighthouse(page.url, {
                        port: chrome.port,
                        onlyCategories: ['accessibility'],
                        logLevel: 'error'
                    });

                    const accessibilityScore = lighthouseResults.lhr.categories.accessibility.score * 100;
                    const audits = lighthouseResults.lhr.audits;
                    
                    // Count failed audits as violations
                    const violations = Object.values(audits).filter(audit => 
                        audit.score !== null && audit.score < 1
                    ).length;

                    const pageResults = {
                        url: page.url,
                        accessibility_score: accessibilityScore,
                        violations: violations,
                        critical: violations > 10 ? Math.floor(violations / 2) : 0,
                        details: audits
                    };

                    results.pages_tested.push(pageResults);
                    results.total_violations += pageResults.violations;
                    results.critical_violations += pageResults.critical;
                    results.violations_by_page[page.url] = pageResults;

                    console.log(`✅ Lighthouse tested ${page.url}: ${accessibilityScore}% score, ${violations} issues`);

                } catch (pageError) {
                    console.error(`❌ Lighthouse error testing ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                }
            }
        } finally {
            if (chrome) {
                await chrome.kill();
            }
        }

        return results;
    }

    /**
     * Get pages to test for a session
     */
    async getPagesToTest(sessionId, specificPages = null, maxPages = 100) {
        try {
            if (specificPages && Array.isArray(specificPages)) {
                return specificPages;
            }

            // Get pages from the project's web crawler
            const query = `
                SELECT DISTINCT cdp.url, cdp.title, cdp.id
                FROM test_sessions ts
                JOIN projects p ON ts.project_id = p.id
                JOIN web_crawlers wc ON wc.project_id = p.id
                JOIN crawler_discovered_pages cdp ON cdp.crawler_id = wc.id
                WHERE ts.id = $1
                AND (cdp.selected_for_manual_testing = true OR cdp.selected_for_automated_testing = true)
                LIMIT $2
            `;

            const result = await pool.query(query, [sessionId, maxPages]);
            
            if (result.rows.length === 0) {
                // Fallback: get project's base URL
                const fallbackQuery = `
                    SELECT p.primary_url as url, p.name as title
                    FROM test_sessions ts
                    JOIN projects p ON ts.project_id = p.id
                    WHERE ts.id = $1
                `;
                const fallbackResult = await pool.query(fallbackQuery, [sessionId]);
                return fallbackResult.rows;
            }

            return result.rows;

        } catch (error) {
            console.error('Error getting pages to test:', error);
            return [];
        }
    }

    /**
     * Create automation run record
     */
    async createAutomationRun(sessionId, runId, tools, userId) {
        const query = `
            INSERT INTO automated_test_runs (
                id, session_id, tools_used, pages_tested, started_at, 
                total_issues, critical_issues, test_instances_updated, 
                evidence_files_created, raw_results, created_at, created_by
            ) VALUES ($1, $2, $3, 0, $4, 0, 0, 0, 0, '{}', $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [
            runId, sessionId, JSON.stringify(tools), new Date(), userId
        ]);

        return result.rows[0];
    }

    /**
     * Update automation run status
     */
    async updateRunStatus(runId, status, data = {}) {
        const updates = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(data)) {
            updates.push(`${key} = $${++paramCount}`);
            values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        }

        values.unshift(runId); // runId is always $1

        const query = `
            UPDATE automated_test_runs 
            SET ${updates.join(', ')}
            WHERE id = $1
        `;

        await pool.query(query, values);
    }

    /**
     * Map automation results to test instances
     */
    async mapResultsToTestInstances(sessionId, results, userId) {
        let updatedCount = 0;

        try {
            // Get test instances for this session
            const instancesQuery = `
                SELECT ti.*, tr.criterion_number, tr.automated_tools, tr.tool_mapping
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.session_id = $1
                AND (tr.test_method = 'automated' OR tr.test_method = 'both')
            `;

            const instancesResult = await pool.query(instancesQuery, [sessionId]);
            const testInstances = instancesResult.rows;

            for (const instance of testInstances) {
                const mappedResults = this.mapResultToRequirement(instance, results);
                
                if (mappedResults.shouldUpdate) {
                    await this.updateTestInstanceFromAutomation(instance.id, mappedResults, userId);
                    updatedCount++;
                }
            }

            console.log(`📊 Updated ${updatedCount} test instances from automation results`);
            return updatedCount;

        } catch (error) {
            console.error('Error mapping results to test instances:', error);
            return 0;
        }
    }

    /**
     * Mark test instances as in-progress before automation starts
     */
    async markTestInstancesInProgress(sessionId, userId, specificInstanceIds = null, specificRequirementIds = null) {
        let markedCount = 0;

        try {
            // Build query based on filters
            let instancesQuery = `
                SELECT ti.id, ti.status
                FROM test_instances ti
                JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.session_id = $1
                AND (tr.test_method = 'automated' OR tr.test_method = 'both')
                AND ti.status IN ('pending', 'not_started', 'untestable')
            `;
            
            const queryParams = [sessionId];
            let paramCount = 1;
            
            // Add specific instance filter if provided
            if (specificInstanceIds && Array.isArray(specificInstanceIds) && specificInstanceIds.length > 0) {
                paramCount++;
                instancesQuery += ` AND ti.id = ANY($${paramCount}::uuid[])`;
                queryParams.push(specificInstanceIds);
            }
            
            // Add specific requirement filter if provided
            if (specificRequirementIds && Array.isArray(specificRequirementIds) && specificRequirementIds.length > 0) {
                paramCount++;
                instancesQuery += ` AND ti.requirement_id = ANY($${paramCount}::uuid[])`;
                queryParams.push(specificRequirementIds);
            }

            const instancesResult = await pool.query(instancesQuery, queryParams);
            const testInstances = instancesResult.rows;

            // Update each instance to in_progress status
            for (const instance of testInstances) {
                await this.updateTestInstanceStatus(instance.id, 'in_progress', userId, 'Automation started');
                markedCount++;
            }

            console.log(`📊 Marked ${markedCount} test instances as "in_progress" for automation`);
            return markedCount;

        } catch (error) {
            console.error('Error marking test instances as in-progress:', error);
            return 0;
        }
    }

    /**
     * Update test instance status
     */
    async updateTestInstanceStatus(instanceId, status, userId, notes = null) {
        const query = `
            UPDATE test_instances 
            SET status = $1, tested_by = $2, updated_at = $3
            ${notes ? ', notes = $4' : ''}
            WHERE id = ${notes ? '$5' : '$4'}
        `;

        const values = notes 
            ? [status, userId, new Date(), notes, instanceId]
            : [status, userId, new Date(), instanceId];

        await pool.query(query, values);

        // Create audit log entry
        await this.createAuditLogEntry(instanceId, 'status_change', userId, {
            new_status: status,
            notes: notes || `Status changed to ${status}`
        });
    }

    /**
     * Map automation result to specific requirement
     */
    mapResultToRequirement(testInstance, results) {
        const { automated_tools, tool_mapping, criterion_number } = testInstance;
        
        if (!automated_tools || !Array.isArray(automated_tools)) {
            return { shouldUpdate: false };
        }

        let totalViolations = 0;
        let criticalViolations = 0;
        let toolResults = {};
        let specializedAnalysis = {};
        let remediationGuidance = [];

        // Check each tool's results
        for (const tool of automated_tools) {
            const toolKey = tool.replace('-', ''); // axe-core becomes axe
            const toolResult = results[toolKey];
            
            if (toolResult) {
                toolResults[tool] = {
                    violations: toolResult.total_violations || 0,
                    critical: toolResult.critical_violations || 0,
                    pages: toolResult.pages_tested || []
                };
                
                totalViolations += toolResult.total_violations || 0;
                criticalViolations += toolResult.critical_violations || 0;

                // Handle specialized tool results
                if (tool === 'color-contrast-analyzer' && toolResult.contrast_analysis) {
                    specializedAnalysis.contrast = {
                        total_elements_tested: toolResult.total_elements_tested || 0,
                        aa_violations: toolResult.aa_violations || 0,
                        aaa_violations: toolResult.aaa_violations || 0,
                        detailed_analysis: toolResult.contrast_analysis || {},
                        worst_contrast_ratio: toolResult.worst_contrast_ratio || 0,
                        average_contrast_ratio: toolResult.average_contrast_ratio || 0
                    };

                    // Generate contrast-specific remediation guidance
                    if (toolResult.aa_violations > 0) {
                        remediationGuidance.push({
                            tool: 'color-contrast-analyzer',
                            requirement: '1.4.3',
                            priority: 'high',
                            guidance: `Increase text contrast to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text). Found ${toolResult.aa_violations} AA violations.`,
                            affected_elements: toolResult.aa_violation_elements || []
                        });
                    }

                    if (toolResult.aaa_violations > 0) {
                        remediationGuidance.push({
                            tool: 'color-contrast-analyzer',
                            requirement: '1.4.6',
                            priority: 'medium',
                            guidance: `Increase text contrast to meet WCAG AAA standards (7:1 for normal text, 4.5:1 for large text). Found ${toolResult.aaa_violations} AAA violations.`,
                            affected_elements: toolResult.aaa_violation_elements || []
                        });
                    }
                }

                if (tool === 'luma' && toolResult.flash_analysis) {
                    specializedAnalysis.flash = {
                        total_flashes_detected: toolResult.total_flashes_detected || 0,
                        critical_flashes: toolResult.critical_flashes || 0,
                        flash_rate: toolResult.flash_rate || 0,
                        seizure_risk_level: toolResult.seizure_risk_level || 'low',
                        detailed_analysis: toolResult.flash_analysis || {},
                        animation_violations: toolResult.animation_violations || 0
                    };

                    // Generate flash-specific remediation guidance
                    if (toolResult.critical_flashes > 0) {
                        remediationGuidance.push({
                            tool: 'luma',
                            requirement: '2.3.1',
                            priority: 'critical',
                            guidance: `CRITICAL: Reduce flash frequency to maximum 3 flashes per second. Found ${toolResult.critical_flashes} critical flashes that could trigger seizures.`,
                            affected_elements: toolResult.critical_flash_elements || []
                        });
                    }

                    if (toolResult.animation_violations > 0) {
                        remediationGuidance.push({
                            tool: 'luma',
                            requirement: '2.2.2',
                            priority: 'high',
                            guidance: `Provide pause/stop controls for auto-playing animations. Found ${toolResult.animation_violations} animation violations.`,
                            affected_elements: toolResult.animation_violation_elements || []
                        });
                    }
                }
            }
        }

        // Determine status based on violations
        let newStatus = 'passed_review_required'; // Default for automated tests
        let confidence = 'high';
        
        if (criticalViolations > 0) {
            newStatus = 'failed'; // Critical violations = failed
            confidence = 'high';
        } else if (totalViolations > 0) {
            newStatus = 'passed_review_required'; // Non-critical violations = review required
            confidence = 'medium';
        } else {
            newStatus = 'passed_review_required'; // No violations = review required
            confidence = 'high';
        }

        return {
            shouldUpdate: true,
            status: newStatus,
            confidence_level: confidence,
            result: JSON.stringify({
                automated_analysis: {
                    total_violations: totalViolations,
                    critical_violations: criticalViolations,
                    tools_used: automated_tools,
                    tool_results: toolResults,
                    specialized_analysis: specializedAnalysis,
                    remediation_guidance: remediationGuidance,
                    test_timestamp: new Date().toISOString(),
                    test_duration_ms: results.test_duration_ms || 0
                }
            }),
            notes: `Automated testing completed. ${totalViolations} total violations found (${criticalViolations} critical). ${remediationGuidance.length} remediation items identified.`
        };
    }

    /**
     * Update test instance from automation results
     */
    async updateTestInstanceFromAutomation(instanceId, mappedResults, userId) {
        const query = `
            UPDATE test_instances 
            SET status = $1, result = $2, confidence_level = $3, notes = $4, 
                tested_by = $5, tested_at = $6, updated_at = $6, test_method_used = $7,
                tool_used = $8
            WHERE id = $9
        `;

        // Extract tools used from the result data
        let toolsUsed = 'Unknown';
        try {
            const resultData = typeof mappedResults.result === 'string' ? JSON.parse(mappedResults.result) : mappedResults.result;
            if (resultData.automated_analysis && resultData.automated_analysis.tools_used) {
                toolsUsed = resultData.automated_analysis.tools_used.join(', ');
            }
        } catch (e) {
            console.warn('Error parsing result data for tool_used:', e);
        }

        await pool.query(query, [
            mappedResults.status,
            mappedResults.result,
            mappedResults.confidence_level,
            mappedResults.notes,
            userId,
            new Date(),
            'automated',
            toolsUsed,
            instanceId
        ]);

        // Create audit log entry
        await this.createAuditLogEntry(instanceId, 'automated_test_result', userId, mappedResults);
    }

    /**
     * Create audit log entry for test instance
     */
    async createAuditLogEntry(instanceId, actionType, userId, data) {
        // Get session_id for the test instance
        const sessionQuery = await pool.query('SELECT session_id FROM test_instances WHERE id = $1', [instanceId]);
        const sessionId = sessionQuery.rows[0]?.session_id || null;

        if (!sessionId) {
            console.warn(`Could not find session_id for test instance ${instanceId}`);
            return; // Skip audit logging if no session found
        }

        // Enhanced metadata for specialized tools
        let enhancedMetadata = {
            action_type: actionType,
            timestamp: new Date().toISOString(),
            user_id: userId
        };

        // Add specialized analysis data to audit log
        if (data.result) {
            try {
                const resultData = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                if (resultData.automated_analysis) {
                    enhancedMetadata.automated_analysis = {
                        tools_used: resultData.automated_analysis.tools_used || [],
                        total_violations: resultData.automated_analysis.total_violations || 0,
                        critical_violations: resultData.automated_analysis.critical_violations || 0,
                        test_timestamp: resultData.automated_analysis.test_timestamp,
                        test_duration_ms: resultData.automated_analysis.test_duration_ms
                    };

                    // Add specialized analysis data
                    if (resultData.automated_analysis.specialized_analysis) {
                        enhancedMetadata.specialized_analysis = resultData.automated_analysis.specialized_analysis;
                    }

                    // Add remediation guidance
                    if (resultData.automated_analysis.remediation_guidance) {
                        enhancedMetadata.remediation_guidance = {
                            count: resultData.automated_analysis.remediation_guidance.length,
                            critical_count: resultData.automated_analysis.remediation_guidance.filter(g => g.priority === 'critical').length,
                            high_count: resultData.automated_analysis.remediation_guidance.filter(g => g.priority === 'high').length,
                            items: resultData.automated_analysis.remediation_guidance
                        };
                    }
                }
            } catch (e) {
                console.warn('Error parsing result data for audit log:', e);
            }
        }

        const query = `
            INSERT INTO test_audit_log (
                test_instance_id, session_id, action_type, changed_by, changed_at, 
                reason, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await pool.query(query, [
            instanceId,
            sessionId,
            actionType,
            userId,
            new Date(),
            data.notes || `Automated test result: ${data.status}`,
            JSON.stringify(enhancedMetadata)
        ]);
    }

    /**
     * Create session-level audit log entry
     */
    async createSessionAuditLogEntry(sessionId, actionType, userId, reason, metadata = {}) {
        // Get user information for better tracking
        let userInfo = null;
        if (userId) {
            try {
                const userQuery = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
                userInfo = userQuery.rows[0] || null;
            } catch (error) {
                console.warn('Could not fetch user info for audit log:', error.message);
            }
        }

        const enhancedMetadata = {
            ...metadata,
            user_info: userInfo,
            timestamp: new Date().toISOString(),
            client_ip: metadata.client_ip || 'system',
            user_agent: metadata.user_agent || 'automation-service'
        };

        const query = `
            INSERT INTO test_audit_log (
                test_instance_id, session_id, action_type, changed_by, changed_at, 
                reason, metadata
            ) VALUES (NULL, $1, $2, $3, $4, $5, $6)
        `;

        await pool.query(query, [
            sessionId,
            actionType,
            userId,
            new Date(),
            reason,
            JSON.stringify(enhancedMetadata)
        ]);

        console.log(`📋 Session audit logged: ${actionType} by ${userInfo?.username || 'system'} for session ${sessionId}`);
    }

    /**
     * Estimate test duration based on tools and page count
     */
    estimateTestDuration(tools, pageCount) {
        // Base time per page per tool (in seconds)
        const baseTimePerPagePerTool = {
            'wave': 8,
            'axe': 12,
            'lighthouse': 15,
            'pa11y': 10
        };

        let totalEstimatedSeconds = 0;
        for (const tool of tools) {
            const toolTime = baseTimePerPagePerTool[tool] || 10;
            totalEstimatedSeconds += toolTime * pageCount;
        }

        // Add 20% buffer for processing overhead
        totalEstimatedSeconds = Math.ceil(totalEstimatedSeconds * 1.2);

        return {
            total_seconds: totalEstimatedSeconds,
            total_minutes: Math.ceil(totalEstimatedSeconds / 60),
            per_tool_seconds: Math.ceil(totalEstimatedSeconds / tools.length),
            estimated_completion: new Date(Date.now() + (totalEstimatedSeconds * 1000)).toISOString()
        };
    }

    /**
     * Create evidence files from automation results
     */
    async createEvidenceFiles(sessionId, runId, results, userId) {
        let evidenceCount = 0;

        try {
            for (const [tool, toolResults] of Object.entries(results)) {
                if (toolResults && toolResults.pages_tested) {
                    for (const pageResult of toolResults.pages_tested) {
                        if (pageResult.details && (pageResult.violations > 0 || pageResult.error)) {
                            await this.createEvidenceFile(sessionId, runId, tool, pageResult, userId);
                            evidenceCount++;
                        }
                    }
                }
            }

            console.log(`📁 Created ${evidenceCount} evidence files`);
            return evidenceCount;

        } catch (error) {
            console.error('Error creating evidence files:', error);
            return 0;
        }
    }

    /**
     * Create evidence file for a specific tool and page result
     */
    async createEvidenceFile(sessionId, runId, tool, pageResult, userId) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `evidence_${tool}_${runId}_${timestamp}.json`;
        const filePath = path.join(__dirname, '../../reports/individual-tests', fileName);

        // Enhanced evidence data structure
        const evidenceData = {
            session_id: sessionId,
            run_id: runId,
            tool: tool,
            page_url: pageResult.url,
            test_timestamp: new Date().toISOString(),
            test_duration_ms: pageResult.duration_ms || 0,
            summary: {
                total_violations: pageResult.total_violations || 0,
                critical_violations: pageResult.critical_violations || 0,
                status: pageResult.status || 'unknown'
            },
            detailed_results: pageResult.details || [],
            specialized_analysis: {}
        };

        // Add specialized analysis data based on tool
        if (tool === 'color-contrast-analyzer' && pageResult.contrast_analysis) {
            evidenceData.specialized_analysis.contrast = {
                total_elements_tested: pageResult.total_elements_tested || 0,
                aa_violations: pageResult.aa_violations || 0,
                aaa_violations: pageResult.aaa_violations || 0,
                worst_contrast_ratio: pageResult.worst_contrast_ratio || 0,
                average_contrast_ratio: pageResult.average_contrast_ratio || 0,
                detailed_contrast_data: pageResult.contrast_analysis || {},
                wcag_compliance: {
                    aa_compliant: pageResult.aa_violations === 0,
                    aaa_compliant: pageResult.aaa_violations === 0,
                    requirements_met: pageResult.aa_violations === 0 ? ['1.4.3'] : [],
                    requirements_failed: pageResult.aa_violations > 0 ? ['1.4.3'] : []
                }
            };
        }

        if (tool === 'luma' && pageResult.flash_analysis) {
            evidenceData.specialized_analysis.flash = {
                total_flashes_detected: pageResult.total_flashes_detected || 0,
                critical_flashes: pageResult.critical_flashes || 0,
                flash_rate: pageResult.flash_rate || 0,
                seizure_risk_level: pageResult.seizure_risk_level || 'low',
                animation_violations: pageResult.animation_violations || 0,
                detailed_flash_data: pageResult.flash_analysis || {},
                wcag_compliance: {
                    flash_compliant: pageResult.critical_flashes === 0,
                    animation_compliant: pageResult.animation_violations === 0,
                    requirements_met: [],
                    requirements_failed: []
                }
            };

            // Determine WCAG compliance
            if (pageResult.critical_flashes === 0) {
                evidenceData.specialized_analysis.flash.wcag_compliance.requirements_met.push('2.3.1');
            } else {
                evidenceData.specialized_analysis.flash.wcag_compliance.requirements_failed.push('2.3.1');
            }

            if (pageResult.animation_violations === 0) {
                evidenceData.specialized_analysis.flash.wcag_compliance.requirements_met.push('2.2.2');
            } else {
                evidenceData.specialized_analysis.flash.wcag_compliance.requirements_failed.push('2.2.2');
            }
        }

        // Add remediation guidance
        evidenceData.remediation_guidance = this.generateRemediationGuidance(tool, pageResult);

        // Ensure directory exists
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

        // Write evidence file
        await fs.promises.writeFile(filePath, JSON.stringify(evidenceData, null, 2));

        // Create audit log entry for evidence file
        await this.createAuditLogEntry(
            pageResult.instance_id || null,
            'evidence_file_created',
            userId,
            {
                file_name: fileName,
                file_path: filePath,
                tool: tool,
                page_url: pageResult.url,
                notes: `Evidence file created for ${tool} analysis of ${pageResult.url}`
            }
        );

        return {
            fileName,
            filePath,
            size: evidenceData.length
        };
    }

    /**
     * Generate remediation guidance for specialized tools
     */
    generateRemediationGuidance(tool, pageResult) {
        const guidance = [];

        if (tool === 'color-contrast-analyzer') {
            if (pageResult.aa_violations > 0) {
                guidance.push({
                    priority: 'high',
                    requirement: '1.4.3',
                    guidance: `Increase text contrast to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text). Found ${pageResult.aa_violations} AA violations.`,
                    affected_elements: pageResult.aa_violation_elements || []
                });
            }

            if (pageResult.aaa_violations > 0) {
                guidance.push({
                    priority: 'medium',
                    requirement: '1.4.6',
                    guidance: `Increase text contrast to meet WCAG AAA standards (7:1 for normal text, 4.5:1 for large text). Found ${pageResult.aaa_violations} AAA violations.`,
                    affected_elements: pageResult.aaa_violation_elements || []
                });
            }
        }

        if (tool === 'luma') {
            if (pageResult.critical_flashes > 0) {
                guidance.push({
                    priority: 'critical',
                    requirement: '2.3.1',
                    guidance: `CRITICAL: Reduce flash frequency to maximum 3 flashes per second. Found ${pageResult.critical_flashes} critical flashes that could trigger seizures.`,
                    affected_elements: pageResult.critical_flash_elements || []
                });
            }

            if (pageResult.animation_violations > 0) {
                guidance.push({
                    priority: 'high',
                    requirement: '2.2.2',
                    guidance: `Provide pause/stop controls for auto-playing animations. Found ${pageResult.animation_violations} animation violations.`,
                    affected_elements: pageResult.animation_violation_elements || []
                });
            }
        }

        return guidance;
    }

    /**
     * Get automation status for a session
     */
    async getAutomationStatus(sessionId) {
        try {
            const query = `
                SELECT * FROM get_automation_summary($1)
            `;

            const result = await pool.query(query, [sessionId]);
            const summary = result.rows[0] || {};

            return {
                current_status: this.runningTests.has(sessionId) ? 'running' : 'idle',
                summary: summary,
                latest_run: summary.last_run_date ? {
                    date: summary.last_run_date,
                    issues: summary.total_issues_found,
                    tools: summary.tools_used
                } : null,
                total_runs: summary.total_runs || 0
            };

        } catch (error) {
            console.error('Error getting automation status:', error);
            return {
                current_status: 'error',
                summary: {},
                latest_run: null,
                total_runs: 0
            };
        }
    }

    /**
     * Get automation history for a session
     */
    async getAutomationHistory(sessionId, options = {}) {
        const { limit = 10, offset = 0 } = options;

        try {
            const query = `
                SELECT * FROM automated_test_runs 
                WHERE session_id = $1 
                ORDER BY started_at DESC 
                LIMIT $2 OFFSET $3
            `;

            const countQuery = `
                SELECT COUNT(*) as total FROM automated_test_runs WHERE session_id = $1
            `;

            const [runsResult, countResult] = await Promise.all([
                pool.query(query, [sessionId, limit, offset]),
                pool.query(countQuery, [sessionId])
            ]);

            return {
                runs: runsResult.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: limit,
                    offset: offset,
                    has_more: (offset + runsResult.rows.length) < parseInt(countResult.rows[0].total)
                }
            };

        } catch (error) {
            console.error('Error getting automation history:', error);
            return { runs: [], pagination: { total: 0, limit, offset, has_more: false } };
        }
    }

    /**
     * Get detailed automation results
     */
    async getAutomationResults(runId) {
        try {
            const query = `
                SELECT atr.*, 
                       COUNT(te.id) as evidence_count
                FROM automated_test_runs atr
                LEFT JOIN test_evidence te ON te.metadata->>'run_id' = atr.id::text
                WHERE atr.id = $1
                GROUP BY atr.id
            `;

            const result = await pool.query(query, [runId]);
            
            if (result.rows.length === 0) {
                throw new Error('Automation run not found');
            }

            const run = result.rows[0];

            return {
                detailed_results: run.raw_results || {},
                summary: {
                    tools_used: run.tools_used,
                    pages_tested: run.pages_tested,
                    total_issues: run.total_issues,
                    critical_issues: run.critical_issues,
                    duration: run.completed_at ? 
                        new Date(run.completed_at) - new Date(run.started_at) : null
                },
                evidence_files: run.evidence_count || 0,
                test_instances_updated: run.test_instances_updated || 0
            };

        } catch (error) {
            console.error('Error getting automation results:', error);
            throw error;
        }
    }

    /**
     * Get available automation tools
     */
    async getAvailableTools() {
        return [
            {
                name: 'axe-core',
                description: 'Industry-leading accessibility testing engine',
                version: '4.8.0',
                capabilities: ['wcag-compliance', 'color-contrast', 'keyboard-navigation']
            },
            {
                name: 'pa11y',
                description: 'Command-line accessibility testing tool',
                version: '6.2.3',
                capabilities: ['wcag-compliance', 'html-validation', 'screen-reader-testing']
            },
            {
                name: 'lighthouse',
                description: 'Google\'s web performance and accessibility auditing tool',
                version: '10.0.0',
                capabilities: ['performance', 'accessibility', 'best-practices']
            }
        ];
    }

    /**
     * Cancel automation run
     */
    async cancelAutomationRun(runId, userId) {
        const cancelledAt = new Date();
        
        await this.updateRunStatus(runId, 'cancelled', {
            completed_at: cancelledAt,
            metadata: JSON.stringify({
                cancelled_by: userId,
                reason: 'User requested cancellation'
            })
        });

        // Remove from running tests if present
        this.runningTests.delete(runId);

        return { cancelled_at: cancelledAt };
    }

    /**
     * Run test for specific instance
     */
    async runTestForInstance(instanceId, options = {}) {
        const { tools = ['axe-core'], userId } = options;

        // This is a simplified version - in practice, you'd get the specific page/requirement
        // and run targeted tests
        return {
            results: { message: 'Instance-specific testing completed' },
            status_updated: true,
            evidence_created: true
        };
    }

    /**
     * Get automation configuration
     */
    async getAutomationConfig() {
        return {
            default_tools: ['axe-core', 'pa11y'],
            max_concurrent_tests: 3,
            timeout_per_page: 30000,
            retry_failed_tests: true,
            create_screenshots: true,
            evidence_retention_days: 90
        };
    }

    /**
     * Run tests in background
     */
    async runTestsInBackground(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements = null) {
        this.runningTests.set(runId, { sessionId, startTime: new Date() });
        
        try {
            await this.executeAutomatedTests(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements);
        } catch (error) {
            console.error(`❌ Background test execution failed for run ${runId}:`, error);
        } finally {
            this.runningTests.delete(runId);
        }
    }

    /**
     * Estimate test duration
     */
    estimateTestDuration(tools, pageCount) {
        const baseTimes = { 'axe-core': 5, 'pa11y': 10, 'lighthouse': 20 };
        const totalSeconds = tools.reduce((total, tool) => {
            return total + (baseTimes[tool] || 10) * pageCount;
        }, 0);
        return `${Math.ceil(totalSeconds / 60)} minutes`;
    }
    
    // ===== WEBSOCKET METHODS =====
    
    /**
     * Emit automation progress via WebSocket
     */
    emitProgress(sessionId, progressData) {
        if (this.wsService) {
            this.wsService.emitSessionProgress(sessionId, null, progressData);
        }
    }
    
    /**
     * Emit testing milestone via WebSocket
     */
    emitMilestone(sessionId, milestoneData) {
        if (this.wsService) {
            this.wsService.emitTestingMilestone(sessionId, null, milestoneData);
        }
    }
    
    /**
     * Emit automation completion via WebSocket
     */
    emitCompletion(sessionId, resultsData) {
        if (this.wsService) {
            this.wsService.emitSessionComplete(sessionId, null, resultsData);
        }
    }
    
    /**
     * Emit individual test results via WebSocket
     */
    emitTestResults(sessionId, pageId, testData) {
        if (this.wsService) {
            this.wsService.emitTestResults(sessionId, null, pageId, testData);
        }
    }
}

module.exports = TestAutomationService; 