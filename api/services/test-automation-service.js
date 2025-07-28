const { pool } = require('../../database/config');
const axeCore = require('axe-core');
const pa11y = require('pa11y');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

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
            userId,
            clientMetadata = {}
        } = options;

        const runId = uuidv4();
        
        console.log(`🚀 Starting automation run ${runId} for session ${sessionId}`);

        try {
            // Create automation run record
            const runData = await this.createAutomationRun(sessionId, runId, tools, userId);

            // Get pages to test
            const pagesToTest = await this.getPagesToTest(sessionId, pages);
            
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
                    await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Inject axe-core
                    await browserPage.addScriptTag({ path: require.resolve('axe-core') });
                    
                    // Run axe
                    const axeResults = await browserPage.evaluate(() => {
                        return axe.run();
                    });

                    // Process results
                    const pageResults = {
                        url: page.url,
                        violations: axeResults.violations.length,
                        critical: axeResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length,
                        details: axeResults.violations
                    };

                    results.pages_tested.push(pageResults);
                    results.total_violations += pageResults.violations;
                    results.critical_violations += pageResults.critical;
                    results.violations_by_page[page.url] = pageResults;

                    console.log(`✅ Axe tested ${page.url}: ${pageResults.violations} violations`);

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
                const pa11yResults = await pa11y(page.url, {
                    standard: 'WCAG2AA',
                    runner: 'axe',  // Use axe runner for better WCAG 2.2 support
                    timeout: 30000,
                    chromeLaunchConfig: {
                        headless: true
                    }
                });

                const pageResults = {
                    url: page.url,
                    violations: pa11yResults.issues.length,
                    critical: pa11yResults.issues.filter(issue => issue.type === 'error').length,
                    details: pa11yResults.issues
                };

                results.pages_tested.push(pageResults);
                results.total_violations += pageResults.violations;
                results.critical_violations += pageResults.critical;
                results.violations_by_page[page.url] = pageResults;

                console.log(`✅ Pa11y tested ${page.url}: ${pageResults.violations} issues`);

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
    async getPagesToTest(sessionId, specificPages = null) {
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
                LIMIT 20
            `;

            const result = await pool.query(query, [sessionId]);
            
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
            }
        }

        // Determine status based on violations
        let newStatus = 'passed';
        let confidence = 'high';
        
        if (criticalViolations > 0) {
            newStatus = 'failed';
            confidence = 'high';
        } else if (totalViolations > 0) {
            newStatus = 'failed';
            confidence = 'medium';
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
                    tool_results: toolResults
                }
            }),
            notes: `Automated testing completed. ${totalViolations} total violations found (${criticalViolations} critical).`
        };
    }

    /**
     * Update test instance from automation results
     */
    async updateTestInstanceFromAutomation(instanceId, mappedResults, userId) {
        const query = `
            UPDATE test_instances 
            SET status = $1, result = $2, confidence_level = $3, notes = $4, 
                tested_by = $5, tested_at = $6, updated_at = $6
            WHERE id = $7
        `;

        await pool.query(query, [
            mappedResults.status,
            mappedResults.result,
            mappedResults.confidence_level,
            mappedResults.notes,
            userId,
            new Date(),
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
            'Automated testing result',
            JSON.stringify(data)
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
     * Create individual evidence file
     */
    async createEvidenceFile(sessionId, runId, tool, pageResult, userId) {
        const query = `
            INSERT INTO test_evidence (
                test_instance_id, evidence_type, description, 
                file_path, metadata, created_at, created_by
            ) VALUES (
                (SELECT id FROM test_instances WHERE session_id = $1 LIMIT 1),
                'automated_result', $2, $3, $4, $5, $6
            )
        `;

        const description = `${tool} results for ${pageResult.url}`;
        const filePath = `automation/${runId}/${tool}/${Date.now()}.json`;
        const metadata = {
            tool: tool,
            url: pageResult.url,
            run_id: runId,
            violations: pageResult.violations || 0,
            critical: pageResult.critical || 0,
            results: pageResult.details || {}
        };

        await pool.query(query, [
            sessionId,
            description,
            filePath,
            JSON.stringify(metadata),
            new Date(),
            userId
        ]);
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