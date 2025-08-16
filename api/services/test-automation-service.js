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
        this.interactiveAuthSessions = new Map(); // Store active browser sessions for interactive auth
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
            executionOptions = {}
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
                this.runTestsInBackground(runId, sessionId, tools, pagesToTest, updateTestInstances, createEvidence, userId, requirements, executionOptions);
                
                return {
                    run_id: runId,
                    status: 'running',
                    pages_to_test: pagesToTest.length,
                    estimated_duration: this.estimateTestDuration(tools, pagesToTest.length)
                };
            } else {
                // Run tests synchronously
                const results = await this.executeAutomatedTests(runId, sessionId, tools, pagesToTest, updateTestInstances, createEvidence, userId, requirements, executionOptions);
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
    runTestsInBackground(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements, executionOptions) {
        // Execute tests asynchronously without blocking
        setImmediate(async () => {
            try {
                await this.executeAutomatedTests(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements, executionOptions);
            } catch (error) {
                console.error(`❌ Background test execution failed for run ${runId}:`, error);
                // Update run status to failed
                // Note: Run status updates handled by UnifiedAutomationController
            }
        });
    }

    /**
     * Execute automated tests
     */
    async executeAutomatedTests(runId, sessionId, tools, pages, updateTestInstances, createEvidence, userId, requirements = null, executionOptions = {}) {
        // Extract interactive authentication flag from execution options
        const useInteractiveAuth = executionOptions.use_interactive_auth === true;
        console.log(`🔐 Interactive authentication mode: ${useInteractiveAuth ? 'ENABLED' : 'DISABLED'}`);
        
        // Emit automation start via WebSocket
        this.emitProgress(sessionId, {
            percentage: 0,
            message: `Starting automated tests with ${tools.join(', ')}`,
            stage: 'initializing',
            completedTests: 0,
            totalTests: pages.length * tools.length,
            currentTool: tools[0],
            startTime: new Date().toISOString()
        });
        const startTime = new Date();
        let totalIssues = 0;
        let criticalIssues = 0;
        const results = {};

        try {
            // Note: Run status updates are handled by UnifiedAutomationController
            console.log(`🚀 Starting test automation execution for run ${runId}`);
            
            // Mark test instances as in-progress before starting automation
            const testInstancesMarked = await this.markTestInstancesInProgress(sessionId, userId, null, requirements);
            console.log(`📝 Marked ${testInstancesMarked} test instances as "in_process"`);
            
            // Announce requirements being tested
            if (requirements && requirements.length > 0) {
                const uniqueRequirements = new Map();
                requirements.forEach(req => {
                    const key = req.criterion_number || req.requirement_id;
                    if (!uniqueRequirements.has(key)) {
                        uniqueRequirements.set(key, {
                            criterion: key,
                            title: req.requirement_title || req.title,
                            level: req.conformance_level || req.level
                        });
                    }
                });
                
                console.log(`🎯 Will test ${uniqueRequirements.size} WCAG requirements:`);
                for (const [criterion, info] of uniqueRequirements) {
                    console.log(`   📋 WCAG ${info.level} - ${criterion}: ${info.title}`);
                    
                    // WebSocket announcement for each requirement
                    this.emitProgress(sessionId, {
                        percentage: 0,
                        message: `Starting requirement WCAG ${info.level} - ${criterion}: ${info.title}`,
                        stage: 'requirement_start',
                        currentRequirement: criterion,
                        requirementTitle: info.title,
                        requirementLevel: info.level,
                        status: 'starting_requirement'
                    });
                }
            }
            
            // Create session-level audit entry for status change
            await this.createSessionAuditLogEntry(
                sessionId, 
                'status_change', 
                userId, 
                `${testInstancesMarked} test instances marked as "in_process" for automation`,
                {
                    run_id: runId,
                    field_changed: 'status',
                    old_value: 'not_tested',
                    new_value: 'in_process',
                    instances_affected: testInstancesMarked,
                    change_reason: 'automation_preparation',
                    ...(executionOptions.clientMetadata || {})
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
                    ...(executionOptions.clientMetadata || {})
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
                
                let toolResults;
                switch (tool) {
                    case 'axe-core':
                    case 'axe': // Add support for 'axe' alias
                        toolResults = await this.runAxe(pages, sessionId, useInteractiveAuth);
                        results.axe = toolResults;
                        break;
                    case 'pa11y':
                        toolResults = await this.runPa11y(pages, sessionId, useInteractiveAuth);
                        results.pa11y = toolResults;
                        break;
                    case 'lighthouse':
                        toolResults = await this.runLighthouse(pages, useInteractiveAuth);
                        results.lighthouse = toolResults;
                        break;
                    case 'contrast-analyzer':
                        toolResults = await this.runContrastAnalyzer(pages, useInteractiveAuth);
                        results['contrast-analyzer'] = toolResults;
                        break;
                    case 'mobile-accessibility':
                        toolResults = await this.runMobileAccessibility(pages, useInteractiveAuth);
                        results['mobile-accessibility'] = toolResults;
                        break;
                    case 'wave':
                        toolResults = await this.runWaveApi(pages, sessionId, useInteractiveAuth);
                        results.wave = toolResults;
                        break;
                    case 'form-accessibility':
                        toolResults = await this.runFormAccessibilityTester(pages, sessionId, useInteractiveAuth);
                        results['formaccessibility'] = toolResults;
                        break;
                    case 'heading-structure':
                        toolResults = await this.runHeadingStructureAnalyzer(pages, sessionId, useInteractiveAuth);
                        results['heading-structure'] = toolResults;
                        break;
                    case 'aria-testing':
                        toolResults = await this.runAriaTestingAnalyzer(pages, sessionId, useInteractiveAuth);
                        results['aria-testing'] = toolResults;
                        break;
                }

                // Check if any tool returned pending authentication
                if (toolResults && toolResults.isPending) {
                    console.log(`🔐 Interactive authentication pending - stopping entire automation run`);
                    console.log(`🔐 Browser is open for login. Please complete authentication in UI.`);
                    return {
                        success: false,
                        isPending: true,
                        message: 'Interactive authentication pending. Please complete login in browser and click "Successfully Logged In" button.',
                        authRequired: true
                    };
                }

                // Store tool results in database for each page
                if (toolResults && pages.length > 0) {
                    for (const page of pages) {
                        try {
                            await this.storeToolResults(sessionId, page.page_id, tool, toolResults);
                        } catch (error) {
                            console.error(`❌ Failed to store ${tool} results for page ${page.url}:`, error);
                        }
                    }
                }

                // Emit tool completion milestone
                const toolViolations = this.countViolationsFromResults(toolResults);
                this.emitMilestone(sessionId, {
                    type: 'tool_complete',
                    message: `${tool} testing completed`,
                    tool: tool,
                    violationsFound: toolViolations,
                    passesFound: toolResults?.passes?.length || 0,
                    timeElapsed: Date.now() - startTime.getTime()
                });

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
                    'automated_test_result', 
                    userId, 
                    `${tool} testing completed - ${totalIssues} total issues found`,
                    {
                        run_id: runId,
                        tool: tool,
                        violations_found: totalIssues,
                        critical_violations: criticalIssues,
                        pages_tested: pages.length,
                        time_elapsed_ms: Date.now() - startTime.getTime(),
                        ...(executionOptions.clientMetadata || {})
                    }
                );
                
                // Emit enhanced testing milestone for tool completion
                const completedToolResults = results[tool.replace('-', '')] || {};
                this.emitMilestone(sessionId, {
                    type: 'tool_complete',
                    message: `${tool} testing completed`,
                    tool: tool,
                    violationsFound: completedToolResults.total_violations || 0,
                    criticalViolations: completedToolResults.critical_violations || 0,
                    pagesProcessed: completedToolResults.pages_tested?.length || pages.length,
                    timeElapsed: Date.now() - startTime.getTime(),
                    toolIcon: this.getToolIcon(tool),
                    confidenceLevel: this.getToolConfidenceLevel(tool, completedToolResults)
                });

                // Emit detailed progress update after each tool
                this.emitProgress(sessionId, {
                    percentage: Math.round(((toolIndex + 1) / tools.length) * 100),
                    message: `${tool} completed - ${completedToolResults.total_violations || 0} violations found`,
                    stage: 'tool_completion',
                    completedTests: (toolIndex + 1) * pages.length,
                    totalTests: pages.length * tools.length,
                    currentTool: tools[toolIndex + 1] || 'finalizing',
                    violationsFound: totalIssues,
                    criticalViolations: criticalIssues,
                    toolsCompleted: toolIndex + 1,
                    totalTools: tools.length
                });
            }

            // Map results to test instances
            let testInstancesUpdated = 0;
            if (updateTestInstances) {
                testInstancesUpdated = await this.mapResultsToTestInstances(sessionId, results, userId);
                console.log(`📊 Updated ${testInstancesUpdated} test instances with automated results`);
                
                // Emit completion progress via WebSocket
                this.emitProgress(sessionId, {
                    percentage: 100,
                    message: `Automation completed: ${testInstancesUpdated} test instances updated`,
                    stage: 'completed',
                    completedTests: results.length,
                    totalTests: pages.length * tools.length,
                    violationsFound: totalIssues,
                    criticalViolations: criticalIssues
                });

                // Emit completion milestone
                this.emitMilestone(sessionId, {
                    type: 'automation_complete',
                    message: `Automated testing completed successfully`,
                    violationsFound: totalIssues,
                    criticalViolations: criticalIssues,
                    testsUpdated: testInstancesUpdated,
                    toolsUsed: tools,
                    timeElapsed: Date.now() - startTime.getTime()
                });
                
                // Create session-level audit entry for status changes after automation
                await this.createSessionAuditLogEntry(
                    sessionId, 
                    'automation_completed', 
                    userId, 
                    `Automated testing completed: ${testInstancesUpdated} test instances updated with results`,
                    {
                        run_id: runId,
                        field_changed: 'status_and_results',
                        old_value: 'in_process',
                        new_value: 'automated_results_available',
                        instances_affected: testInstancesUpdated,
                        change_reason: 'automation_completion',
                        results_summary: {
                            total_issues: totalIssues,
                            critical_issues: criticalIssues,
                            tools_used: tools,
                            pages_tested: pages.length,
                            total_tests_run: results.length
                        },
                        evidence_summary: {
                            automation_evidence_available: true,
                            tests_with_evidence: testInstancesUpdated,
                            evidence_types: ['violation_details', 'passing_rules', 'dom_selectors', 'remediation_steps'],
                            tools_providing_evidence: tools
                        },
                        ...(executionOptions.clientMetadata || {})
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
                            ...(executionOptions.clientMetadata || {})
                        }
                    );
                }
            }

            // Note: Run completion handled by UnifiedAutomationController
            const completedAt = new Date();
            console.log(`✅ Test automation completed for run ${runId}:`, {
                completed_at: completedAt,
                pages_tested: pages.length,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                test_instances_updated: testInstancesUpdated,
                evidence_files_created: evidenceCreated
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
                    ...(executionOptions.clientMetadata || {})
                }
            );
            
            // Emit automation completion event via WebSocket
            this.emitProgress(sessionId, {
                percentage: 100,
                message: `Final automation results: ${totalIssues} issues found`,
                stage: 'completed',
                completedTests: results.length,
                totalTests: pages.length * tools.length,
                violationsFound: totalIssues,
                criticalViolations: criticalIssues
            });

            this.emitMilestone(sessionId, {
                type: 'automation_complete',
                message: `Automation run ${runId} completed successfully`,
                violationsFound: totalIssues,
                criticalViolations: criticalIssues,
                testsUpdated: testInstancesUpdated,
                evidenceCreated: evidenceCreated,
                timeElapsed: completedAt - startTime
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
            // Note: Run status updates are handled by UnifiedAutomationController
            
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
                    ...(executionOptions.clientMetadata || {})
                }
            );
            
            throw error;
        }
    }

    /**
     * Run Axe-core tests
     */
    async runAxe(pages, sessionId = null) {
        const browser = await puppeteer.launch({ headless: false, slowMo: 250 }); // DEBUG MODE
        const results = {
            tool: 'axe-core',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        try {
            // Get authentication configuration for this session
            let authConfig = null;
            let crawlerAuthSession = null;
            if (sessionId) {
                try {
                    // First, try to get the test session's project and find crawler auth sessions
                    const sessionResult = await pool.query(`
                        SELECT ts.project_id, p.primary_url 
                        FROM test_sessions ts 
                        JOIN projects p ON ts.project_id = p.id 
                        WHERE ts.id = $1
                    `, [sessionId]);
                    
                    if (sessionResult.rows.length > 0) {
                        const session = sessionResult.rows[0];
                        
                        // Look for active crawler authentication sessions for this project
                        const crawlerAuthResult = await pool.query(`
                            SELECT cas.*, wc.name as crawler_name, wc.base_url
                            FROM crawler_auth_sessions cas
                            JOIN web_crawlers wc ON cas.crawler_id = wc.id
                            WHERE wc.project_id = $1 
                            AND cas.is_active = true
                            AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
                            AND cas.cookies IS NOT NULL
                            AND jsonb_array_length(cas.cookies) > 0
                            ORDER BY cas.last_used_at DESC
                            LIMIT 1
                        `, [session.project_id]);
                        
                        if (crawlerAuthResult.rows.length > 0) {
                            crawlerAuthSession = crawlerAuthResult.rows[0];
                            console.log(`🔐 Found crawler auth session for project ${session.project_id}: ${crawlerAuthSession.crawler_name} (${crawlerAuthSession.cookie_count || 0} cookies)`);
                        } else {
                            console.log(`⚠️ No active crawler auth sessions found for project ${session.project_id}`);
                        }
                    }
                    
                    // Fallback to auth_configs if no crawler session found
                    if (!crawlerAuthSession) {
                        const authResult = await pool.query(`
                            SELECT ac.* FROM auth_configs ac
                            JOIN test_sessions ts ON ts.auth_config_id = ac.id
                            WHERE ts.id = $1 AND ac.status = 'active'
                        `, [sessionId]);
                        
                        if (authResult.rows.length > 0) {
                            authConfig = authResult.rows[0];
                            console.log(`🔐 Found authentication config for session ${sessionId}: ${authConfig.name}`);
                        } else {
                            console.log(`⚠️ No authentication config found for session ${sessionId}`);
                        }
                    }
                } catch (error) {
                    console.log(`❌ Error fetching auth config: ${error.message}`);
                }
            }

            // Create authenticated context if auth config or crawler session exists
            let context = null;
            if (crawlerAuthSession) {
                try {
                    console.log(`🔐 Setting up authenticated browser context using crawler session...`);
                    
                    // Create storage state from crawler session data
                    const storageState = {
                        cookies: crawlerAuthSession.cookies || [],
                        localStorage: crawlerAuthSession.local_storage || [],
                        sessionStorage: crawlerAuthSession.session_storage || []
                    };
                    
                    console.log(`🔐 Using ${storageState.cookies.length} cookies from crawler session`);
                    
                    // Create context with stored authentication state
                    context = await browser.createBrowserContext({
                        storageState: storageState
                    });
                    
                    console.log(`🔐 Crawler authentication session loaded successfully`);
                    
                } catch (error) {
                    console.error(`❌ Crawler authentication failed: ${error.message}`);
                    console.log(`⚠️ Continuing without authentication...`);
                    context = null;
                }
            } else if (authConfig) {
                try {
                    console.log(`🔐 Setting up authenticated browser context using auth config...`);
                    context = await browser.createBrowserContext();
                    const authPage = await context.newPage();
                    
                    // Navigate to login page
                    console.log(`🔐 Navigating to login page: ${authConfig.login_page}`);
                    await authPage.goto(authConfig.login_page, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Fill login form
                    console.log(`🔐 Filling login credentials...`);
                    if (authConfig.username_selector) {
                        await authPage.waitForSelector(authConfig.username_selector, { timeout: 10000 });
                        await authPage.fill(authConfig.username_selector, authConfig.username);
                    }
                    
                    if (authConfig.password_selector) {
                        await authPage.waitForSelector(authConfig.password_selector, { timeout: 10000 });
                        await authPage.fill(authConfig.password_selector, authConfig.password);
                    }
                    
                    // Submit form
                    if (authConfig.submit_selector) {
                        console.log(`🔐 Submitting login form...`);
                        await authPage.click(authConfig.submit_selector);
                        
                        // Wait for successful login
                        if (authConfig.success_url) {
                            await authPage.waitForURL(authConfig.success_url, { timeout: 15000 });
                            console.log(`✅ Successfully logged in to: ${authConfig.success_url}`);
                        } else {
                            // Wait for redirect or success indicator
                            await authPage.waitForTimeout(3000);
                            console.log(`✅ Login completed (no success URL specified)`);
                        }
                    }
                    
                    await authPage.close();
                    console.log(`🔐 Authentication setup completed`);
                    
                } catch (error) {
                    console.error(`❌ Authentication failed: ${error.message}`);
                    console.log(`⚠️ Continuing without authentication...`);
                    context = null;
                }
            }

            for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                const browserPage = context ? await context.newPage() : await browser.newPage();
                
                // Emit page-level progress
                if (sessionId) {
                    this.emitProgress(sessionId, {
                        percentage: Math.round((pageIndex / pages.length) * 100),
                        message: `Testing ${page.url} with Axe-core${authConfig ? ' (authenticated)' : ''}`,
                        stage: 'testing',
                        currentTool: 'axe-core',
                        currentPage: page.url,
                        currentPageIndex: pageIndex + 1,
                        totalPages: pages.length,
                        completedPages: pageIndex,
                        status: 'loading_page'
                    });
                }
                
                try {
                    const authMethod = crawlerAuthSession ? 'crawler_session' : (authConfig ? 'auth_config' : 'none');
                    console.log(`🔍 Testing page: ${page.url} (${authMethod})`);
                    
                    // Navigate to the page and wait for network to be idle
                    await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Check if we're on a login page (authentication failed)
                    const currentUrl = browserPage.url();
                    const pageTitle = await browserPage.title();
                    const isLoginPage = currentUrl.includes('login') || 
                                       currentUrl.includes('signin') || 
                                       currentUrl.includes('auth') ||
                                       pageTitle.toLowerCase().includes('login') ||
                                       pageTitle.toLowerCase().includes('sign in');
                    
                    if (isLoginPage && (crawlerAuthSession || authConfig)) {
                        console.log(`⚠️ Still on login page after authentication attempt: ${currentUrl}`);
                        console.log(`⚠️ Page title: ${pageTitle}`);
                        console.log(`⚠️ Authentication may have failed or page requires different auth method`);
                    }
                    
                    // Emit page loaded status
                    if (sessionId) {
                        this.emitProgress(sessionId, {
                            percentage: Math.round((pageIndex / pages.length) * 100),
                            message: `Page loaded, running Axe-core tests on ${page.url}`,
                            stage: 'testing',
                            currentTool: 'axe-core',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex,
                            status: 'running_tests'
                        });
                    }
                    
                    // Wait for additional time to ensure dynamic content loads
                    await browserPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                    
                    // Wait for the title to be set (either by static HTML or JavaScript)
                    await browserPage.waitForFunction(() => {
                        const title = document.title;
                        return title && title.trim() !== '';
                    }, { timeout: 15000 }).catch(() => {
                        // If title is still empty after 15 seconds, continue anyway
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

                    // Emit page completion with results
                    if (sessionId) {
                        this.emitTestResults(sessionId, page.url, {
                            tool: 'axe-core',
                            url: page.url,
                            violations: pageResults.violations,
                            critical: pageResults.critical,
                            title: pageResults.title_at_test_time,
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        });
                        
                        this.emitProgress(sessionId, {
                            percentage: Math.round(((pageIndex + 1) / pages.length) * 100),
                            message: `✅ Axe-core completed ${page.url}: ${pageResults.violations} violations found`,
                            stage: 'testing',
                            currentTool: 'axe-core',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex + 1,
                            status: 'page_completed',
                            lastResult: {
                                url: page.url,
                                violations: pageResults.violations,
                                critical: pageResults.critical
                            }
                        });
                    }

                } catch (pageError) {
                    console.error(`❌ Axe error testing ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                    
                    // Emit error status
                    if (sessionId) {
                        this.emitTestResults(sessionId, page.url, {
                            tool: 'axe-core',
                            url: page.url,
                            error: pageError.message,
                            status: 'error',
                            timestamp: new Date().toISOString()
                        });
                        
                        this.emitProgress(sessionId, {
                            percentage: Math.round(((pageIndex + 1) / pages.length) * 100),
                            message: `❌ Axe-core error testing ${page.url}: ${pageError.message}`,
                            stage: 'testing',
                            currentTool: 'axe-core',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex + 1,
                            status: 'page_error',
                            lastError: {
                                url: page.url,
                                error: pageError.message
                            }
                        });
                    }
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
    async runPa11y(pages, sessionId = null) {
        const results = {
            tool: 'pa11y',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        // Get authentication configuration for this session
        let authConfig = null;
        let crawlerAuthSession = null;
        if (sessionId) {
            try {
                // First, try to get the test session's project and find crawler auth sessions
                const sessionResult = await pool.query(`
                    SELECT ts.project_id, p.primary_url 
                    FROM test_sessions ts 
                    JOIN projects p ON ts.project_id = p.id 
                    WHERE ts.id = $1
                `, [sessionId]);
                
                if (sessionResult.rows.length > 0) {
                    const session = sessionResult.rows[0];
                    
                    // Look for active crawler authentication sessions for this project
                    const crawlerAuthResult = await pool.query(`
                        SELECT cas.*, wc.name as crawler_name, wc.base_url
                        FROM crawler_auth_sessions cas
                        JOIN web_crawlers wc ON cas.crawler_id = wc.id
                        WHERE wc.project_id = $1 
                        AND cas.is_active = true
                        AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
                        AND cas.cookies IS NOT NULL
                        AND jsonb_array_length(cas.cookies) > 0
                        ORDER BY cas.last_used_at DESC
                        LIMIT 1
                    `, [session.project_id]);
                    
                    if (crawlerAuthResult.rows.length > 0) {
                        crawlerAuthSession = crawlerAuthResult.rows[0];
                        console.log(`🔐 Found crawler auth session for Pa11y project ${session.project_id}: ${crawlerAuthSession.crawler_name} (${crawlerAuthSession.cookie_count || 0} cookies)`);
                    } else {
                        console.log(`⚠️ No active crawler auth sessions found for Pa11y project ${session.project_id}`);
                    }
                }
                
                // Fallback to auth_configs if no crawler session found
                if (!crawlerAuthSession) {
                    const authResult = await pool.query(`
                        SELECT ac.* FROM auth_configs ac
                        JOIN test_sessions ts ON ts.auth_config_id = ac.id
                        WHERE ts.id = $1 AND ac.status = 'active'
                    `, [sessionId]);
                    
                    if (authResult.rows.length > 0) {
                        authConfig = authResult.rows[0];
                        console.log(`🔐 Found authentication config for Pa11y session ${sessionId}: ${authConfig.name}`);
                    } else {
                        console.log(`⚠️ No authentication config found for Pa11y session ${sessionId}`);
                    }
                }
            } catch (error) {
                console.log(`❌ Error fetching auth config for Pa11y: ${error.message}`);
            }
        }

        // Create browser instance first if authentication is needed
        let browser = null;
        let context = null;
        if (crawlerAuthSession || authConfig) {
            browser = await puppeteer.launch({ headless: true });
        }
        
        if (crawlerAuthSession) {
            try {
                console.log(`🔐 Setting up authenticated browser context for Pa11y using crawler session...`);
                
                // Create storage state from crawler session data
                const storageState = {
                    cookies: crawlerAuthSession.cookies || [],
                    localStorage: crawlerAuthSession.local_storage || [],
                    sessionStorage: crawlerAuthSession.session_storage || []
                };
                
                console.log(`🔐 Using ${storageState.cookies.length} cookies from crawler session for Pa11y`);
                
                // Create context with stored authentication state
                context = await browser.createBrowserContext({
                    storageState: storageState
                });
                
                console.log(`🔐 Crawler authentication session loaded successfully for Pa11y`);
                
            } catch (error) {
                console.error(`❌ Crawler authentication failed for Pa11y: ${error.message}`);
                console.log(`⚠️ Continuing without authentication...`);
                context = null;
            }
        } else if (authConfig) {
            try {
                console.log(`🔐 Setting up authenticated browser context for Pa11y using auth config...`);
                context = await browser.createBrowserContext();
                const authPage = await context.newPage();
                
                // Navigate to login page
                console.log(`🔐 Navigating to login page for Pa11y: ${authConfig.login_page}`);
                await authPage.goto(authConfig.login_page, { waitUntil: 'networkidle0', timeout: 30000 });
                
                // Fill login form
                console.log(`🔐 Filling login credentials for Pa11y...`);
                if (authConfig.username_selector) {
                    await authPage.waitForSelector(authConfig.username_selector, { timeout: 10000 });
                    await authPage.fill(authConfig.username_selector, authConfig.username);
                }
                
                if (authConfig.password_selector) {
                    await authPage.waitForSelector(authConfig.password_selector, { timeout: 10000 });
                    await authPage.fill(authConfig.password_selector, authConfig.password);
                }
                
                // Submit form
                if (authConfig.submit_selector) {
                    console.log(`🔐 Submitting login form for Pa11y...`);
                    await authPage.click(authConfig.submit_selector);
                    
                    // Wait for successful login
                    if (authConfig.success_url) {
                        await authPage.waitForURL(authConfig.success_url, { timeout: 15000 });
                        console.log(`✅ Successfully logged in for Pa11y: ${authConfig.success_url}`);
                    } else {
                        // Wait for redirect or success indicator
                        await authPage.waitForTimeout(3000);
                        console.log(`✅ Login completed for Pa11y (no success URL specified)`);
                    }
                }
                
                await authPage.close();
                console.log(`🔐 Authentication setup completed for Pa11y`);
                
            } catch (error) {
                console.error(`❌ Authentication failed for Pa11y: ${error.message}`);
                console.log(`⚠️ Continuing without authentication...`);
                context = null;
            }
        }

        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];
            
            // Emit page-level progress
            if (sessionId) {
                this.emitProgress(sessionId, {
                    percentage: Math.round((pageIndex / pages.length) * 100),
                    message: `Testing ${page.url} with Pa11y${crawlerAuthSession ? ' (crawler_auth)' : (authConfig ? ' (auth_config)' : '')}`,
                    stage: 'testing',
                    currentTool: 'pa11y',
                    currentPage: page.url,
                    currentPageIndex: pageIndex + 1,
                    totalPages: pages.length,
                    completedPages: pageIndex,
                    status: 'loading_page'
                });
            }
            try {
                // Use existing browser or create new one if needed
                if (!browser) {
                    browser = await puppeteer.launch({ headless: true });
                }
                const browserPage = context ? await context.newPage() : await browser.newPage();
                
                try {
                    // Navigate to the page and wait for network to be idle
                    await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
                    
                    // Emit page loaded status
                    if (sessionId) {
                        this.emitProgress(sessionId, {
                            percentage: Math.round((pageIndex / pages.length) * 100),
                            message: `Page loaded, running Pa11y tests on ${page.url}`,
                            stage: 'testing',
                            currentTool: 'pa11y',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex,
                            status: 'running_tests'
                        });
                    }
                    
                    // Wait for additional time to ensure dynamic content loads
                    await browserPage.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
                    
                    // Wait for the title to be set (either by static HTML or JavaScript)
                    await browserPage.waitForFunction(() => {
                        const title = document.title;
                        return title && title.trim() !== '';
                    }, { timeout: 15000 }).catch(() => {
                        // If title is still empty after 15 seconds, continue anyway
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
                    
                    // Now run pa11y with the fully loaded page
                    const pa11yResults = await pa11y(page.url, {
                        standard: 'WCAG2AA',
                        runner: 'axe',  // Use axe runner for better WCAG 2.2 support
                        timeout: 30000,
                        chromeLaunchConfig: {
                            headless: true
                        },
                        // Add custom wait function - use evaluate instead of waitForTimeout
                        wait: 3000, // Wait 3 seconds after page load
                        // Custom page preparation - use evaluate for compatibility
                        beforeScript: (page) => {
                            // Additional wait for dynamic content using evaluate (compatible with all Puppeteer versions)
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

                    // Emit page completion with results
                    if (sessionId) {
                        this.emitTestResults(sessionId, page.url, {
                            tool: 'pa11y',
                            url: page.url,
                            violations: pageResults.violations,
                            critical: pageResults.critical,
                            title: pageResults.title_at_test_time,
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        });
                        
                        this.emitProgress(sessionId, {
                            percentage: Math.round(((pageIndex + 1) / pages.length) * 100),
                            message: `✅ Pa11y completed ${page.url}: ${pageResults.violations} issues found`,
                            stage: 'testing',
                            currentTool: 'pa11y',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex + 1,
                            status: 'page_completed',
                            lastResult: {
                                url: page.url,
                                violations: pageResults.violations,
                                critical: pageResults.critical
                            }
                        });
                    }

                } catch (pageError) {
                    console.error(`❌ Pa11y error testing ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                    
                    // Emit error status
                    if (sessionId) {
                        this.emitTestResults(sessionId, page.url, {
                            tool: 'pa11y',
                            url: page.url,
                            error: pageError.message,
                            status: 'error',
                            timestamp: new Date().toISOString()
                        });
                        
                        this.emitProgress(sessionId, {
                            percentage: Math.round(((pageIndex + 1) / pages.length) * 100),
                            message: `❌ Pa11y error testing ${page.url}: ${pageError.message}`,
                            stage: 'testing',
                            currentTool: 'pa11y',
                            currentPage: page.url,
                            currentPageIndex: pageIndex + 1,
                            totalPages: pages.length,
                            completedPages: pageIndex + 1,
                            status: 'page_error',
                            lastError: {
                                url: page.url,
                                error: pageError.message
                            }
                        });
                    }
                } finally {
                    try {
                        await browserPage.close();
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

        // Clean up browser if we created one
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                // Ignore cleanup errors
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
     * Run Contrast Analyzer tests
     */
    async runContrastAnalyzer(pages) {
        const ContrastAnalyzer = require('../../scripts/contrast-analyzer.js');
        const analyzer = new ContrastAnalyzer();
        
        const results = {
            tool: 'contrast-analyzer',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {}
        };

        for (const page of pages) {
            try {
                console.log(`🎨 Running contrast analysis for ${page.url}`);
                const contrastResults = await analyzer.analyzeContrast(page.url, {
                    level: 'AA',
                    includeAAA: true,
                    analyzeBackgroundImages: true,
                    analyzeGradients: true,
                    captureScreenshots: false
                });

                const violations = contrastResults.violations?.length || 0;
                const criticalViolations = contrastResults.violations?.filter(v => v.level === 'AAA').length || 0;

                const pageResults = {
                    url: page.url,
                    violations: violations,
                    critical: criticalViolations,
                    contrast_ratio_details: contrastResults.violations || [],
                    overall_score: contrastResults.statistics?.passRate || 0
                };

                results.pages_tested.push(pageResults);
                results.total_violations += violations;
                results.critical_violations += criticalViolations;
                results.violations_by_page[page.url] = pageResults;

                console.log(`✅ Contrast analysis completed for ${page.url}: ${violations} violations found`);

            } catch (pageError) {
                console.error(`❌ Contrast analysis error for ${page.url}:`, pageError.message);
                results.pages_tested.push({
                    url: page.url,
                    error: pageError.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        return results;
    }

    /**
     * Run Mobile Accessibility tests
     */
    async runMobileAccessibility(pages) {
        const { testMobileAccessibility } = require('../../scripts/mobile-accessibility-tester.js');
        const puppeteer = require('puppeteer');
        
        const results = {
            tool: 'mobile-accessibility',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {},
            mobile_issues: {
                touch_targets: 0,
                viewport_issues: 0,
                responsive_issues: 0
            }
        };

        let browser = null;
        try {
            browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            // Test multiple mobile viewports
            const viewports = [
                { width: 375, height: 667, name: 'iPhone SE' },
                { width: 414, height: 896, name: 'iPhone 11 Pro' },
                { width: 360, height: 640, name: 'Android Small' },
                { width: 768, height: 1024, name: 'Tablet Portrait' }
            ];

            for (const page of pages) {
                try {
                    console.log(`📱 Running mobile accessibility tests for ${page.url}`);
                    const browserPage = await browser.newPage();
                    
                    const pageResults = {
                        url: page.url,
                        viewports_tested: [],
                        violations: 0,
                        critical: 0
                    };

                    for (const viewport of viewports) {
                        const mobileResults = await testMobileAccessibility(browserPage, 'chrome', viewport, page.url);
                        
                        pageResults.viewports_tested.push({
                            viewport: viewport.name,
                            touch_targets: mobileResults.summary.totalTouchTargets,
                            valid_touch_targets: mobileResults.summary.validTouchTargets,
                            responsive_elements: mobileResults.summary.responsiveElements,
                            violations: mobileResults.summary.invalidTouchTargets
                        });

                        // Add to overall results
                        results.mobile_issues.touch_targets += mobileResults.summary.invalidTouchTargets;
                        results.mobile_issues.viewport_issues += mobileResults.violations.filter(v => v.type === 'viewport').length;
                        results.mobile_issues.responsive_issues += mobileResults.violations.filter(v => v.type === 'responsive').length;
                        
                        pageResults.violations += mobileResults.summary.invalidTouchTargets;
                    }

                    results.total_violations += pageResults.violations;
                    results.violations_by_page[page.url] = {
                        url: page.url,
                        violations: pageResults.violations,
                        critical: pageResults.critical || 0,
                        details: pageResults.details || [],
                        title_at_test_time: pageResults.title_at_test_time || ""
                    };
                    results.pages_tested.push(pageResults);
                    
                    await browserPage.close();

                } catch (pageError) {
                    console.error(`❌ Mobile accessibility error for ${page.url}:`, pageError.message);
                    results.pages_tested.push({
                        url: page.url,
                        error: pageError.message,
                        violations: 0,
                        critical: 0
                    });
                }
            }

        } catch (error) {
            console.error('❌ Mobile accessibility testing failed:', error.message);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        return results;
    }

    /**
     * Get pages to test for a session
     * Gets pages from test instances that were created during session setup
     */
    async getPagesToTest(sessionId, specificPages = null, maxPages = 100) {
        try {
            if (specificPages && Array.isArray(specificPages)) {
                return specificPages;
            }

            // Get pages from test instances - this is the correct approach
            // The session wizard creates test instances with page_id references
            const query = `
                SELECT DISTINCT 
                    dp.id as page_id,
                    dp.url,
                    dp.title,
                    COUNT(ti.id) as test_count
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                WHERE ti.session_id = $1
                AND dp.url IS NOT NULL
                GROUP BY dp.id, dp.url, dp.title
                ORDER BY dp.url
                LIMIT $2
            `;

            const result = await pool.query(query, [sessionId, maxPages]);
            
            if (result.rows.length > 0) {
                console.log(`📄 Found ${result.rows.length} pages from test instances for session ${sessionId}`);
                console.log(`📊 Total test instances across pages: ${result.rows.reduce((sum, page) => sum + parseInt(page.test_count), 0)}`);
                return result.rows;
            }

            // Fallback: if no test instances exist yet, fall back to project base URL
            console.log('🔍 No test instances found, using project base URL as fallback');
                const fallbackQuery = `
                SELECT p.primary_url as url, p.name as title, NULL as page_id
                    FROM test_sessions ts
                    JOIN projects p ON ts.project_id = p.id
                    WHERE ts.id = $1
                `;
                const fallbackResult = await pool.query(fallbackQuery, [sessionId]);
                return fallbackResult.rows;

        } catch (error) {
            console.error('Error getting pages to test from test instances:', error);
            return [];
        }
    }

    /**
     * Create automation run record
     */
    /**
     * Legacy createAutomationRun method - REMOVED
     * Use UnifiedAutomationController and ScopedTestResultsCreator for all new automation runs
     * This method previously created entries in automated_test_runs table which has been deprecated
     */
    async createAutomationRun(sessionId, runId, tools, userId) {
        throw new Error('Legacy createAutomationRun is deprecated. Use UnifiedAutomationController instead.');
    }

    /**
     * Legacy updateRunStatus method - REMOVED
     * Use UnifiedAutomationController.updateRunStatus() instead for unified automation runs
     */

    /**
     * Map automation results to test instances
     */
    async mapResultsToTestInstances(sessionId, results, userId) {
        let updatedCount = 0;

        try {
            console.log(`🔍 DEBUG: Mapping specific violations to WCAG criteria for session ${sessionId}`);
            console.log(`🔍 DEBUG: Available tools:`, Object.keys(results));

            // Get all test instances for this session
            const instancesQuery = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.session_id,
                    ti.status,
                    ti.test_method_used,
                    ti.result,
                    ti.notes,
                    ti.created_at,
                    ti.updated_at,
                    ur.requirement_id as criterion_number, 
                    ur.level, 
                    ur.test_method
                FROM test_instances ti
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1
                AND (ur.test_method = 'automated' OR ur.test_method = 'both' OR ur.test_method = 'hybrid')
            `;

            const instancesResult = await pool.query(instancesQuery, [sessionId]);
            const testInstances = instancesResult.rows;
            console.log(`🔍 DEBUG: Found ${testInstances.length} automated test instances`);

            // Process each tool's results
            for (const [toolKey, toolResults] of Object.entries(results)) {
                if (!toolResults || typeof toolResults !== 'object') {
                    console.log(`🔍 DEBUG: Skipping ${toolKey} - no valid results`);
                    continue;
                }

                console.log(`🔧 Processing ${toolKey} results...`);
                
                // Extract violations from tool results by page
                if (toolResults.violations_by_page) {
                    for (const [pageUrl, pageData] of Object.entries(toolResults.violations_by_page)) {
                        console.log(`📄 Processing violations for page: ${pageUrl}`);
                        
                        // Extract violations based on tool format
                        let violations = [];
                        
                        if (pageData.details && Array.isArray(pageData.details)) {
                            // axe-core and pa11y format: details is array of violations
                            violations = pageData.details;
                        } else if (pageData.details && typeof pageData.details === 'object') {
                            // lighthouse format: details is object of audit results
                            violations = Object.entries(pageData.details)
                                .filter(([auditId, audit]) => audit.score === 0) // Failed audits
                                .map(([auditId, audit]) => ({
                                    id: auditId,
                                    title: audit.title,
                                    description: audit.description,
                                    impact: 'moderate' // Default impact for lighthouse
                                }));
                        }

                        if (violations.length > 0) {
                            console.log(`🔍 Found ${violations.length} violations from ${toolKey} on ${pageUrl}`);
                            
                            // Map violations to specific WCAG criteria test instances
                            const mappingResult = await this.mapViolationsToTestInstances(
                                violations,
                                testInstances,
                                toolKey === 'axe' ? 'axe-core' : toolKey,
                                pageUrl
                            );
                            
                            updatedCount += mappingResult.updated;
                            console.log(`✅ Mapped ${mappingResult.violations} ${toolKey} violations to ${mappingResult.updated} test instances`);
                        } else {
                            console.log(`✅ No violations found from ${toolKey} on ${pageUrl}`);
                        }
                    }
                }
            }

            console.log(`📊 Total updated: ${updatedCount} test instances from specific violation mapping`);
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

            // Update each instance to in_process status
            for (const instance of testInstances) {
                await this.updateTestInstanceStatus(instance.id, 'in_process', userId, 'Automation started');
                markedCount++;
            }

            console.log(`📊 Marked ${markedCount} test instances as "in_process" for automation`);
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
        // Map 'running' to 'in_process' to comply with database constraints
        const mappedStatus = status === 'running' ? 'in_process' : status;
        
        const query = `
            UPDATE test_instances 
            SET status = $1, assigned_tester = $2, updated_at = $3
            ${notes ? ', notes = $4' : ''}
            WHERE id = ${notes ? '$5' : '$4'}
        `;

        const values = notes 
            ? [mappedStatus, userId, new Date(), notes, instanceId]
            : [mappedStatus, userId, new Date(), instanceId];

        await pool.query(query, values);

        // Create audit log entry
        await this.createAuditLogEntry(instanceId, 'status_change', userId, {
            new_status: mappedStatus,
            notes: notes || `Status changed to ${mappedStatus}`
        });
    }

    /**
     * Map automation result to specific requirement
     */
    mapResultToRequirement(testInstance, results) {
        const { requirement_id, criterion_number, page_id } = testInstance;
        
        console.log(`🔍 DEBUG: Mapping requirement ${requirement_id} (${criterion_number}) for test instance ${testInstance.id}, page ${page_id}`);
        console.log(`🔍 DEBUG: Available results keys:`, Object.keys(results));
        
        // For now, we'll update ALL automated test instances if ANY violations were found
        // since the automation tests the whole page, not specific requirements
        const toolsRun = Object.keys(results).filter(key => results[key] && typeof results[key] === 'object');
        
        console.log(`🔍 DEBUG: Tools run:`, toolsRun);
        
        if (!toolsRun || toolsRun.length === 0) {
            console.log(`🔍 DEBUG: No tools run, shouldUpdate = false`);
            return { shouldUpdate: false };
        }

        let totalViolations = 0;
        let criticalViolations = 0;
        let toolResults = {};
        let specializedAnalysis = {};
        let remediationGuidance = [];
        let foundAnyViolations = false;

        // Check each tool's results for ANY violations on this page
        for (const toolKey of toolsRun) {
            const toolResult = results[toolKey];
            
            if (toolResult && typeof toolResult === 'object') {
                console.log(`🔍 DEBUG: Checking ${toolKey} results:`, toolResult);
                
                // Check if this tool found violations on any page
                let toolViolations = 0;
                let toolCritical = 0;
                
                // Look for violations in the standardized format
                if (typeof toolResult === 'object') {
                    // Check each page in the results
                    Object.keys(toolResult).forEach(pageUrl => {
                        const pageResults = toolResult[pageUrl];
                        if (pageResults && typeof pageResults === 'object') {
                            const violations = pageResults.violations || 0;
                            const critical = pageResults.critical || 0;
                            
                            toolViolations += violations;
                            toolCritical += critical;
                            
                            if (violations > 0) {
                                foundAnyViolations = true;
                                console.log(`🔍 DEBUG: Found ${violations} violations for ${toolKey} on ${pageUrl}`);
                            }
                        }
                    });
                }
                
                // Convert tool key back to full name for display
                const toolName = toolKey === 'axe' ? 'axe-core' : toolKey;
                
                toolResults[toolName] = {
                    violations: toolViolations,
                    critical: toolCritical,
                    pages: Object.keys(toolResult)
                };
                
                totalViolations += toolViolations;
                criticalViolations += toolCritical;

                // Handle specialized tool results
                if (toolKey === 'color-contrast-analyzer' && toolResult.contrast_analysis) {
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

                if (toolKey === 'luma' && toolResult.flash_analysis) {
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

        console.log(`🔍 DEBUG: Final results - foundAnyViolations: ${foundAnyViolations}, totalViolations: ${totalViolations}, criticalViolations: ${criticalViolations}`);
        
        // Update test instances for both violations found AND no violations found
        // If no violations found, mark as passed; if violations found, mark as failed
        if (!foundAnyViolations && totalViolations === 0) {
            console.log(`🔍 DEBUG: No violations found for any tool, shouldUpdate = true with status = passed`);
            
            // Return passed status when no violations are found
            return {
                shouldUpdate: true,
                status: 'passed',
                confidence_level: 'high',
                tool_name: toolsRun.length > 0 ? (toolsRun[0] === 'axe' ? 'axe-core' : toolsRun[0]) : 'axe-core',
                result: JSON.stringify({
                    automated_analysis: {
                        total_violations: 0,
                        critical_violations: 0,
                        tools_used: toolsRun.map(key => key === 'axe' ? 'axe-core' : key),
                        tool_results: {},
                        test_timestamp: new Date().toISOString(),
                        test_duration_ms: results.test_duration_ms || 0,
                        notes: 'Automated testing completed with no violations found'
                    }
                })
            };
        }

        // Determine status based on violations
        let newStatus = 'failed'; // Default for automated tests with violations
        let confidence = 'high';
        
        if (criticalViolations > 0) {
            newStatus = 'failed'; // Critical violations = failed
            confidence = 'high';
        } else if (totalViolations > 0) {
            newStatus = 'failed'; // Any violations = failed (since automation found specific issues)
            confidence = 'high';
        }

        const toolsUsedList = toolsRun.map(key => key === 'axe' ? 'axe-core' : key);

        console.log(`🔍 DEBUG: Will update test instance with status: ${newStatus}, violations: ${totalViolations}`);

        return {
            shouldUpdate: true,
            status: newStatus,
            confidence_level: confidence,
            tool_name: toolsUsedList.length > 0 ? toolsUsedList[0] : 'axe-core', // Add direct tool reference
            result: JSON.stringify({
                automated_analysis: {
                    total_violations: totalViolations,
                    critical_violations: criticalViolations,
                    tools_used: toolsUsedList,
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
                assigned_tester = $5, completed_at = $6, updated_at = $6, test_method_used = $7,
                tool_used = $8
            WHERE id = $9
        `;

        // Extract tools used from the result data
        let toolsUsed = 'Unknown';
        try {
            const resultData = typeof mappedResults.result === 'string' ? JSON.parse(mappedResults.result) : mappedResults.result;
            
            // Try multiple ways to get the tool information
            if (resultData.automated_analysis && resultData.automated_analysis.tools_used) {
                toolsUsed = Array.isArray(resultData.automated_analysis.tools_used) 
                    ? resultData.automated_analysis.tools_used.join(', ')
                    : resultData.automated_analysis.tools_used;
            } else if (resultData.tool_name) {
                toolsUsed = resultData.tool_name;
            } else if (resultData.tools_used) {
                toolsUsed = Array.isArray(resultData.tools_used) 
                    ? resultData.tools_used.join(', ')
                    : resultData.tools_used;
            } else {
                // If no tool info in results, try to get from the automation context
                // This might be passed in mappedResults if available
                if (mappedResults.tool_name) {
                    toolsUsed = mappedResults.tool_name;
                }
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

                    // Add detailed evidence for audit trail with WAVE-specific enhancements
                    if (resultData.automated_analysis.tool_results) {
                        enhancedMetadata.evidence = {
                            test_outcome: data.status,
                            confidence_level: data.confidence_level,
                            evidence_type: 'automated_scan',
                            tools_used: resultData.automated_analysis.tools_used,
                            evidence_details: {
                                violations_found: resultData.automated_analysis.total_violations,
                                critical_violations: resultData.automated_analysis.critical_violations,
                                passes_recorded: resultData.automated_analysis.tool_results.passes || 0,
                                incomplete_tests: resultData.automated_analysis.tool_results.incomplete || 0,
                                rule_coverage: Object.keys(resultData.automated_analysis.tool_results.violations || {}).length,
                                test_duration: resultData.automated_analysis.test_duration_ms
                            },
                            proof_artifacts: {
                                violation_details: resultData.automated_analysis.tool_results.violations,
                                passing_rules: resultData.automated_analysis.tool_results.passes,
                                dom_selectors: this.extractSelectors(resultData.automated_analysis.tool_results),
                                remediation_steps: resultData.automated_analysis.remediation_guidance
                            }
                        };

                        // Add WAVE-specific evidence enhancements
                        if (resultData.automated_analysis.tools_used?.includes('wave')) {
                            enhancedMetadata.evidence.wave_specific = this.generateWaveEvidenceMetadata(resultData.automated_analysis);
                        }
                    }
                }
            } catch (e) {
                console.warn('Error parsing result data for audit log:', e);
            }
        }

        const query = `
            INSERT INTO test_audit_log (
                test_instance_id, session_id, action_type, user_id, timestamp, 
                change_description, details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        await pool.query(query, [
            instanceId,
            sessionId,
            actionType,
            userId,
            new Date(),
            this.generateEvidenceDescription(data) || `Automated test result: ${data.status}`,
            JSON.stringify(enhancedMetadata)
        ]);
    }

    /**
     * Extract DOM selectors from tool results for evidence
     */
    extractSelectors(toolResults) {
        const selectors = [];
        
        // Extract from violations
        if (toolResults.violations) {
            Object.values(toolResults.violations).forEach(violationGroup => {
                if (Array.isArray(violationGroup)) {
                    violationGroup.forEach(violation => {
                        if (violation.nodes) {
                            violation.nodes.forEach(node => {
                                if (node.target && node.target[0]) {
                                    selectors.push({
                                        selector: node.target[0],
                                        type: 'violation',
                                        rule: violation.id,
                                        impact: violation.impact,
                                        description: violation.description
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Extract from passes
        if (toolResults.passes && Array.isArray(toolResults.passes)) {
            toolResults.passes.forEach(pass => {
                if (pass.nodes) {
                    pass.nodes.forEach(node => {
                        if (node.target && node.target[0]) {
                            selectors.push({
                                selector: node.target[0],
                                type: 'pass',
                                rule: pass.id,
                                description: pass.description
                            });
                        }
                    });
                }
            });
        }
        
        return selectors.slice(0, 50); // Limit to prevent oversized logs
    }

    /**
     * Generate detailed evidence description for audit log with WAVE-specific enhancements
     */
    generateEvidenceDescription(data) {
        try {
            // Handle different data structures
            let resultData = null;
            
            if (data.result) {
                resultData = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            } else if (data.automated_analysis) {
                resultData = { automated_analysis: data.automated_analysis };
            } else if (data.tool_results) {
                resultData = { automated_analysis: { tool_results: data.tool_results } };
            }
            
            if (resultData && resultData.automated_analysis) {
                const analysis = resultData.automated_analysis;
                const toolsUsed = analysis.tools_used ? analysis.tools_used.join(', ') : 'automated tools';
                const outcome = data.status === 'passed' || data.status === 'passed_review_required' ? 'PASSED' : 'FAILED';
                
                let description = `${outcome}: Automated test using ${toolsUsed}. `;
                
                // Enhanced WAVE-specific description
                if (toolsUsed.includes('wave')) {
                    description += this.generateWaveEvidenceDescription(analysis);
                } else {
                    // Standard description for other tools
                    if (analysis.total_violations > 0) {
                        description += `Found ${analysis.total_violations} violation(s)`;
                        if (analysis.critical_violations > 0) {
                            description += ` (${analysis.critical_violations} critical)`;
                        }
                        description += '. ';
                    } else {
                        description += 'No violations detected. ';
                    }
                }
                
                if (analysis.tool_results && analysis.tool_results.passes) {
                    description += `${analysis.tool_results.passes} rule(s) passed. `;
                }
                
                // Enhanced evidence description with WAVE specifics
                let evidenceTypes = ['violation details', 'DOM selectors', 'remediation guidance'];
                if (toolsUsed.includes('wave')) {
                    evidenceTypes.push('WCAG mapping', 'Section 508 cross-references', 'WAVE-unique patterns');
                }
                description += `Evidence includes: ${evidenceTypes.join(', ')}.`;
                
                return description;
            }
        } catch (e) {
            console.warn('Error generating evidence description:', e);
        }
        
        // Fallback descriptions
        if (data.status) {
            return `Automated test result: ${data.status}`;
        } else if (data.notes) {
            return data.notes;
        } else {
            return 'Automated test completed';
        }
    }

    /**
     * Generate WAVE-specific evidence description
     */
    generateWaveEvidenceDescription(analysis) {
        let description = '';
        
        if (analysis.total_violations > 0) {
            description += `WAVE detected ${analysis.total_violations} accessibility issue(s)`;
            if (analysis.critical_violations > 0) {
                description += ` (${analysis.critical_violations} critical)`;
            }
            description += '. ';
            
            // Add WAVE-specific insights
            const waveResults = analysis.tool_results?.wave || analysis.tool_results;
            if (waveResults) {
                const uniqueViolations = this.countWaveUniqueViolations(waveResults);
                if (uniqueViolations > 0) {
                    description += `${uniqueViolations} WAVE-unique pattern(s) identified that other tools typically miss. `;
                }
                
                const wcagCriteria = this.extractWcagCriteria(waveResults);
                if (wcagCriteria.length > 0) {
                    description += `Affects WCAG criteria: ${wcagCriteria.slice(0, 5).join(', ')}${wcagCriteria.length > 5 ? ` and ${wcagCriteria.length - 5} more` : ''}. `;
                }
                
                const highImpactViolations = this.countHighImpactViolations(waveResults);
                if (highImpactViolations > 0) {
                    description += `${highImpactViolations} high-impact violation(s) requiring immediate attention. `;
                }
            }
        } else {
            description += 'WAVE analysis found no accessibility violations. ';
        }
        
        return description;
    }

    /**
     * Count WAVE-unique violations not typically found by other tools
     */
    countWaveUniqueViolations(waveResults) {
        if (!waveResults.violations) return 0;
        
        return waveResults.violations.filter(violation => 
            violation.is_wave_unique === true
        ).length;
    }

    /**
     * Extract WCAG criteria from WAVE results
     */
    extractWcagCriteria(waveResults) {
        const wcagSet = new Set();
        
        if (waveResults.violations) {
            waveResults.violations.forEach(violation => {
                if (violation.wcagReference && Array.isArray(violation.wcagReference)) {
                    violation.wcagReference.forEach(criterion => wcagSet.add(criterion));
                }
            });
        }
        
        return Array.from(wcagSet).sort();
    }

    /**
     * Count high-impact violations from WAVE results
     */
    countHighImpactViolations(waveResults) {
        if (!waveResults.violations) return 0;
        
        return waveResults.violations.filter(violation => 
            violation.impact === 'high' || violation.severity === 'critical'
        ).length;
    }

    /**
     * Generate comprehensive WAVE-specific evidence metadata
     */
    generateWaveEvidenceMetadata(analysis) {
        const waveResults = analysis.tool_results?.wave || analysis.tool_results;
        if (!waveResults) return null;

        const metadata = {
            wave_analysis: {
                unique_violations: this.countWaveUniqueViolations(waveResults),
                wcag_criteria_affected: this.extractWcagCriteria(waveResults),
                high_impact_violations: this.countHighImpactViolations(waveResults),
                violation_categories: this.categorizeWaveViolations(waveResults),
                remediation_priority: this.calculateRemediationPriority(waveResults)
            },
            compliance_mapping: {
                wcag_level_a: this.getWcagLevelViolations(waveResults, 'A'),
                wcag_level_aa: this.getWcagLevelViolations(waveResults, 'AA'),
                wcag_level_aaa: this.getWcagLevelViolations(waveResults, 'AAA'),
                section_508_references: this.extractSection508References(waveResults)
            },
            detection_insights: {
                wave_unique_patterns: this.getWaveUniquePatterns(waveResults),
                overlapping_violations: this.identifyOverlapWithOtherTools(waveResults),
                coverage_enhancement: this.calculateCoverageEnhancement(waveResults)
            },
            actionable_guidance: {
                immediate_actions: this.getImmediateActions(waveResults),
                remediation_steps: this.getWaveRemediationSteps(waveResults),
                testing_recommendations: this.getFollowUpTestingRecommendations(waveResults)
            }
        };

        return metadata;
    }

    /**
     * Categorize WAVE violations by type
     */
    categorizeWaveViolations(waveResults) {
        const categories = {};
        if (!waveResults.violations) return categories;

        waveResults.violations.forEach(violation => {
            const category = violation.wave_type || violation.category || 'uncategorized';
            if (!categories[category]) {
                categories[category] = { count: 0, severity_breakdown: {} };
            }
            categories[category].count++;
            
            const severity = violation.severity || 'unknown';
            if (!categories[category].severity_breakdown[severity]) {
                categories[category].severity_breakdown[severity] = 0;
            }
            categories[category].severity_breakdown[severity]++;
        });

        return categories;
    }

    /**
     * Calculate remediation priority based on WAVE results
     */
    calculateRemediationPriority(waveResults) {
        if (!waveResults.violations) return 'low';

        const criticalCount = waveResults.violations.filter(v => v.severity === 'critical').length;
        const highCount = waveResults.violations.filter(v => v.severity === 'high').length;
        const uniqueCount = this.countWaveUniqueViolations(waveResults);

        if (criticalCount > 0) return 'critical';
        if (highCount > 2 || uniqueCount > 1) return 'high';
        if (highCount > 0 || uniqueCount > 0) return 'medium';
        return 'low';
    }

    /**
     * Get WCAG violations by level
     */
    getWcagLevelViolations(waveResults, level) {
        if (!waveResults.violations) return [];

        const levelMapping = {
            'A': ['1.1.1', '1.3.1', '2.1.1', '2.4.4', '3.1.1', '4.1.1', '4.1.2'],
            'AA': ['1.4.3', '1.4.6', '2.4.6', '2.4.7', '3.3.2'],
            'AAA': ['1.4.6', '2.4.9', '3.1.2']
        };

        const levelCriteria = levelMapping[level] || [];
        return waveResults.violations.filter(violation => 
            violation.wcagReference?.some(criterion => levelCriteria.includes(criterion))
        );
    }

    /**
     * Extract Section 508 references from WAVE violations
     */
    extractSection508References(waveResults) {
        const section508Refs = new Set();
        if (!waveResults.violations) return [];

        waveResults.violations.forEach(violation => {
            if (violation.help && violation.help.includes('Section 508')) {
                // Extract section references from help text
                const matches = violation.help.match(/1194\.22\([a-z]\)/g);
                if (matches) {
                    matches.forEach(match => section508Refs.add(match));
                }
            }
        });

        return Array.from(section508Refs);
    }

    /**
     * Get WAVE-unique patterns not detected by other tools
     */
    getWaveUniquePatterns(waveResults) {
        if (!waveResults.violations) return [];

        return waveResults.violations
            .filter(violation => violation.is_wave_unique === true)
            .map(violation => ({
                pattern: violation.id,
                description: violation.description,
                wcag_criteria: violation.wcagReference,
                remediation: violation.remediation
            }));
    }

    /**
     * Identify violations that would overlap with other tools
     */
    identifyOverlapWithOtherTools(waveResults) {
        if (!waveResults.violations) return { likely_overlap: [], wave_exclusive: [] };

        const commonPatterns = ['alt_missing', 'contrast', 'heading_skipped', 'label_missing'];
        
        return {
            likely_overlap: waveResults.violations.filter(v => commonPatterns.includes(v.id)),
            wave_exclusive: waveResults.violations.filter(v => v.is_wave_unique === true)
        };
    }

    /**
     * Calculate how WAVE enhances overall testing coverage
     */
    calculateCoverageEnhancement(waveResults) {
        const totalViolations = waveResults.violations?.length || 0;
        const uniqueViolations = this.countWaveUniqueViolations(waveResults);
        
        return {
            total_violations: totalViolations,
            unique_violations: uniqueViolations,
            coverage_enhancement_percentage: totalViolations > 0 ? Math.round((uniqueViolations / totalViolations) * 100) : 0,
            estimated_additional_coverage: `${uniqueViolations} additional violation patterns`
        };
    }

    /**
     * Get immediate action items from WAVE results
     */
    getImmediateActions(waveResults) {
        if (!waveResults.violations) return [];

        return waveResults.violations
            .filter(violation => violation.severity === 'critical' || violation.impact === 'high')
            .slice(0, 5) // Top 5 most critical
            .map(violation => ({
                violation_id: violation.id,
                action: `Fix ${violation.description}`,
                wcag_criteria: violation.wcagReference,
                estimated_effort: this.estimateFixEffort(violation)
            }));
    }

    /**
     * Get WAVE-specific remediation steps
     */
    getWaveRemediationSteps(waveResults) {
        if (!waveResults.violations) return [];

        return waveResults.violations.map(violation => ({
            violation_id: violation.id,
            remediation: violation.remediation,
            wcag_reference: violation.wcagReference,
            selectors: violation.selectors,
            priority: violation.severity
        }));
    }

    /**
     * Get follow-up testing recommendations
     */
    getFollowUpTestingRecommendations(waveResults) {
        const recommendations = [];
        
        if (this.countWaveUniqueViolations(waveResults) > 0) {
            recommendations.push({
                type: 'manual_verification',
                description: 'Manual verification recommended for WAVE-unique violations',
                priority: 'high'
            });
        }

        const wcagCriteria = this.extractWcagCriteria(waveResults);
        if (wcagCriteria.length > 0) {
            recommendations.push({
                type: 'focused_testing',
                description: `Focus additional testing on WCAG criteria: ${wcagCriteria.join(', ')}`,
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * Estimate fix effort for a violation
     */
    estimateFixEffort(violation) {
        const easyFixes = ['alt_missing', 'language_missing', 'title_invalid'];
        const moderateFixes = ['label_missing', 'heading_skipped', 'contrast'];
        const complexFixes = ['aria_reference_broken', 'landmark_missing'];

        if (easyFixes.includes(violation.id)) return 'low';
        if (moderateFixes.includes(violation.id)) return 'medium';
        if (complexFixes.includes(violation.id)) return 'high';
        return 'medium';
    }

    /**
     * Deduplicate automation results to prevent overlapping violations between tools
     */
    deduplicateAutomationResults(allResults) {
        const deduplicatedResults = {};
        const violationFingerprints = new Map();
        const deduplicationStats = {
            total_input_results: 0,
            duplicates_removed: 0,
            wave_unique_preserved: 0,
            tool_specific_retained: {}
        };

        // Process results from each tool
        Object.keys(allResults).forEach(toolKey => {
            const toolResults = allResults[toolKey];
            if (!toolResults || !toolResults.violations) return;

            deduplicationStats.total_input_results += toolResults.violations.length;
            deduplicationStats.tool_specific_retained[toolKey] = 0;

            const processedViolations = [];

            toolResults.violations.forEach(violation => {
                const fingerprint = this.generateViolationFingerprint(violation, toolKey);
                
                if (violationFingerprints.has(fingerprint)) {
                    // Duplicate found - decide which to keep
                    const existingViolation = violationFingerprints.get(fingerprint);
                    const enhanced = this.mergeViolationData(existingViolation.violation, violation, toolKey);
                    
                    // Update the stored violation with enhanced data
                    violationFingerprints.set(fingerprint, {
                        ...existingViolation,
                        violation: enhanced,
                        detected_by: [...existingViolation.detected_by, toolKey]
                    });
                    
                    deduplicationStats.duplicates_removed++;
                } else {
                    // New violation
                    violationFingerprints.set(fingerprint, {
                        violation: violation,
                        detected_by: [toolKey],
                        primary_tool: toolKey
                    });
                    
                    processedViolations.push(violation);
                    deduplicationStats.tool_specific_retained[toolKey]++;
                    
                    // Track WAVE-unique violations
                    if (toolKey === 'wave' && violation.is_wave_unique) {
                        deduplicationStats.wave_unique_preserved++;
                    }
                }
            });

            // Store processed results
            deduplicatedResults[toolKey] = {
                ...toolResults,
                violations: processedViolations,
                deduplication_applied: true
            };
        });

        // Create consolidated violation list with cross-tool references
        const consolidatedViolations = Array.from(violationFingerprints.values()).map(entry => ({
            ...entry.violation,
            detected_by_tools: entry.detected_by,
            primary_detection_tool: entry.primary_tool,
            cross_tool_validation: entry.detected_by.length > 1
        }));

        return {
            deduplicated_results: deduplicatedResults,
            consolidated_violations: consolidatedViolations,
            deduplication_stats: deduplicationStats
        };
    }

    /**
     * Generate a unique fingerprint for a violation to identify duplicates
     */
    generateViolationFingerprint(violation, toolKey) {
        // Create fingerprint based on violation characteristics
        const components = [
            violation.wcagReference ? violation.wcagReference.sort().join(',') : '',
            violation.description ? violation.description.toLowerCase().replace(/[^a-z0-9]/g, '') : '',
            violation.selectors ? violation.selectors.slice(0, 2).join(',') : '', // First 2 selectors
            violation.severity || '',
            violation.impact || ''
        ];

        // Special handling for WAVE-unique violations
        if (toolKey === 'wave' && violation.is_wave_unique) {
            components.push('wave_unique_' + violation.id);
        }

        return components.filter(c => c).join('|');
    }

    /**
     * Merge violation data from multiple tools
     */
    mergeViolationData(existingViolation, newViolation, newToolKey) {
        const merged = { ...existingViolation };

        // Merge WCAG references
        if (newViolation.wcagReference && Array.isArray(newViolation.wcagReference)) {
            const combinedWcag = new Set([
                ...(merged.wcagReference || []),
                ...newViolation.wcagReference
            ]);
            merged.wcagReference = Array.from(combinedWcag).sort();
        }

        // Enhance description with tool-specific insights
        if (newViolation.description && newViolation.description !== merged.description) {
            if (!merged.tool_specific_descriptions) {
                merged.tool_specific_descriptions = {};
            }
            merged.tool_specific_descriptions[newToolKey] = newViolation.description;
        }

        // Merge selectors
        if (newViolation.selectors && Array.isArray(newViolation.selectors)) {
            const combinedSelectors = new Set([
                ...(merged.selectors || []),
                ...newViolation.selectors
            ]);
            merged.selectors = Array.from(combinedSelectors);
        }

        // Take the highest severity
        if (newViolation.severity) {
            const severityOrder = { 'critical': 4, 'high': 3, 'moderate': 2, 'minor': 1 };
            const currentSeverity = severityOrder[merged.severity] || 0;
            const newSeverity = severityOrder[newViolation.severity] || 0;
            
            if (newSeverity > currentSeverity) {
                merged.severity = newViolation.severity;
            }
        }

        // Preserve WAVE-specific data if this is a WAVE violation
        if (newToolKey === 'wave') {
            merged.wave_specific_data = {
                is_wave_unique: newViolation.is_wave_unique,
                wave_type: newViolation.wave_type,
                remediation: newViolation.remediation,
                impact: newViolation.impact
            };
        }

        // Add cross-tool validation confidence
        merged.cross_tool_confidence = 'high'; // Multiple tools detected same issue

        return merged;
    }

    /**
     * Apply result deduplication during automation execution
     */
    async processResultsWithDeduplication(sessionId, results, userId) {
        console.log('🔍 Starting result deduplication process...');
        
        // Group results by tool
        const resultsByTool = {};
        results.forEach(result => {
            const toolKey = result.tool || 'unknown';
            if (!resultsByTool[toolKey]) {
                resultsByTool[toolKey] = { violations: [], passes: [] };
            }
            
            if (result.violations) {
                resultsByTool[toolKey].violations.push(...result.violations);
            }
            if (result.passes) {
                resultsByTool[toolKey].passes.push(...result.passes);
            }
        });

        // Apply deduplication
        const deduplicationResult = this.deduplicateAutomationResults(resultsByTool);
        
        // Log deduplication statistics
        console.log('📊 Deduplication Statistics:', {
            total_input_violations: deduplicationResult.deduplication_stats.total_input_results,
            duplicates_removed: deduplicationResult.deduplication_stats.duplicates_removed,
            wave_unique_preserved: deduplicationResult.deduplication_stats.wave_unique_preserved,
            final_violation_count: deduplicationResult.consolidated_violations.length
        });

        // Create audit log entry for deduplication process
        await this.createSessionAuditLogEntry(
            sessionId,
            'result_deduplication',
            userId,
            `Result deduplication completed: ${deduplicationResult.deduplication_stats.duplicates_removed} duplicates removed`,
            {
                deduplication_stats: deduplicationResult.deduplication_stats,
                tools_analyzed: Object.keys(resultsByTool),
                final_violation_count: deduplicationResult.consolidated_violations.length,
                cross_tool_validations: deduplicationResult.consolidated_violations.filter(v => v.cross_tool_validation).length
            }
        );

        return {
            original_results: results,
            deduplicated_results: deduplicationResult.deduplicated_results,
            consolidated_violations: deduplicationResult.consolidated_violations,
            deduplication_applied: true
        };
    }

    /**
     * Create session-level audit log entry for automation events
     */
    async createSessionAuditLogEntry(sessionId, actionType, userId, reason, metadata = {}) {
        // Validate userId - must be a proper UUID, no fallbacks
        if (userId) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userId)) {
                throw new Error(`Authentication required: Invalid user ID format. Please ensure you are properly logged in.`);
            }
        } else {
            throw new Error(`Authentication required: User ID is required for audit logging. Please ensure you are properly logged in.`);
        }

        // Get user information for better tracking
        let userInfo = null;
            try {
                const userQuery = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
            if (userQuery.rows.length === 0) {
                throw new Error(`Authentication required: User not found in database. Please log in again.`);
            }
            userInfo = userQuery.rows[0];
            } catch (error) {
            if (error.message.includes('Authentication required')) {
                throw error; // Re-throw auth errors
            }
            throw new Error(`Authentication required: Could not validate user. Please log in again. (${error.message})`);
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
                test_instance_id, session_id, action_type, user_id, timestamp, 
                change_description, details
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

        console.log(`📋 Session audit logged: ${actionType} by ${userInfo.username} for session ${sessionId}`);
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
                SELECT * FROM get_automation_runs_summary($1)
            `;

            const result = await pool.query(query, [sessionId]);
            const summary = result.rows[0] || {};

            return {
                current_status: this.runningTests.has(sessionId) ? 'running' : 'idle',
                summary: {
                    total_runs: summary.total_runs || 0,
                    last_run_date: summary.last_run_date,
                    total_issues_found: summary.total_violations || 0,
                    critical_issues_found: summary.critical_violations || 0,
                    test_instances_updated: summary.test_instances_updated || 0,
                    tools_used: summary.tools_used || []
                },
                latest_run: summary.last_run_date ? {
                    date: summary.last_run_date,
                    issues: summary.total_violations,
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
     * Get automation history for a session - UNIFIED ONLY
     */
    async getAutomationHistory(sessionId, options = {}) {
        const { limit = 10, offset = 0 } = options;

        try {
            // Query only the unified automation_runs_v2 table (using existing columns only)
            const query = `
                SELECT 
                    id::text as id,
                    id as run_id,
                    created_at as started_at,
                    completed_at,
                    status,
                    0 as total_issues,  -- Default to 0 since column doesn't exist yet
                    0 as critical_violations,  -- Default to 0 since column doesn't exist yet
                    0 as test_instances_updated,  -- Default to 0 since column doesn't exist yet
                    1 as pages_tested,  -- Default to 1 since column doesn't exist yet
                    tools_used,
                    error_message as error,
                    EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000 as duration_ms,
                    CASE 
                        WHEN status = 'completed' THEN 'success'
                        WHEN status = 'failed' THEN 'danger'
                        ELSE 'pending'
                    END as result_type,
                    0 as total_passes,  -- Default to 0 since column doesn't exist yet
                    target_mode,
                    target_metadata
                FROM automation_runs_v2 
                WHERE session_id = $1
                ORDER BY created_at DESC 
                LIMIT $2 OFFSET $3
            `;

            const countQuery = `
                SELECT COUNT(*) as total 
                FROM automation_runs_v2 
                WHERE session_id = $1
            `;

            const [runsResult, countResult] = await Promise.all([
                pool.query(query, [sessionId, limit, offset]),
                pool.query(countQuery, [sessionId])
            ]);

            // Enhance run data with additional details
            const enhancedRuns = runsResult.rows.map(run => {
                const toolsArray = Array.isArray(run.tools_used) ? run.tools_used : 
                    (run.tools_used ? JSON.parse(run.tools_used) : []);
                
                return {
                    ...run,
                    tools_used: toolsArray,
                    summary: `${toolsArray.length} tools, ${run.pages_tested || 0} pages, ${run.total_issues || 0} issues found`,
                    success_rate: run.total_issues > 0 ? '0' : '100',
                    avg_issues_per_page: (run.pages_tested && run.pages_tested > 0) ? 
                        (run.total_issues / run.pages_tested).toFixed(1) : '0',
                    formatted_duration: this.formatDuration(run.duration_ms),
                    tools_display: toolsArray.map(tool => 
                        tool.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ).join(', ') || 'Unknown',
                    target_display: run.target_mode || 'session' // Show what was targeted
                };
            });

            console.log(`📊 Loaded ${enhancedRuns.length} unified automation runs for session ${sessionId}`);

            return {
                runs: enhancedRuns,
                pagination: {
                    total: parseInt(countResult.rows[0].total),
                    limit: limit,
                    offset: offset,
                    has_more: (offset + enhancedRuns.length) < parseInt(countResult.rows[0].total)
                }
            };

        } catch (error) {
            console.error('Error getting automation history:', error);
            return { runs: [], pagination: { total: 0, limit, offset, has_more: false } };
        }
    }

    // Helper function to format duration
    formatDuration(ms) {
        if (!ms || ms < 1000) return '< 1s';
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    /**
     * Get detailed automation results
     */
    async getAutomationResults(runId) {
        try {
            // Query the unified automation_runs_v2 table
            const runQuery = `
                SELECT ar.*, 
                       COUNT(te.id) as evidence_count
                FROM automation_runs_v2 ar
                LEFT JOIN test_evidence te ON te.metadata->>'run_id' = ar.id::text
                WHERE ar.id = $1
                GROUP BY ar.id
            `;

            const result = await pool.query(runQuery, [runId]);
            
            if (result.rows.length === 0) {
                    throw new Error('Automation run not found');
            }

            const run = result.rows[0];
            
            // Get requirements that were tested in this session
            const requirementsQuery = `
                SELECT 
                    ur.requirement_id as criterion_number,
                    ur.title,
                    ur.level,
                    ur.test_method,
                    ti.result,
                    ti.status,
                    CASE 
                        WHEN ti.result IS NOT NULL AND ti.result::text LIKE '%violations%' 
                        THEN COALESCE((ti.result->>'violations_count')::int, 0)
                        ELSE 0
                    END as violations
                FROM test_instances ti
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1
                AND (ur.test_method = 'automated' OR ur.test_method = 'both')
                AND ti.updated_at >= $2::timestamp - interval '5 minutes'
                AND ti.updated_at <= $2::timestamp + interval '5 minutes'
                ORDER BY ur.requirement_id
            `;
            
            const requirementsResult = await pool.query(requirementsQuery, [
                run.session_id, 
                run.created_at
            ]);

            // Extract results data from target_metadata
            const resultsData = run.target_metadata?.results || {};
            
            // For unified automation runs, we return a summary based on the stored results data
            const summaryResults = [{
                tool_name: 'unified_automation',
                violations_count: resultsData.total_issues || 0,
                warnings_count: 0, // Not tracked in unified system
                passes_count: 0, // Not tracked separately in unified system
                raw_results: resultsData || {},
                executed_at: run.created_at,
                page_url: 'session_wide',
                result_id: run.id
            }];
            
            return {
                detailed_results: summaryResults,
                summary: {
                    tools_used: Array.isArray(run.tools_used) ? run.tools_used : [],
                    pages_tested: resultsData.pages_tested || 0,
                    total_issues: resultsData.total_issues || 0,
                    critical_issues: resultsData.critical_issues || 0,
                    test_instances_updated: resultsData.test_instances_updated || 0,
                    evidence_files_created: resultsData.evidence_files_created || 0,
                    duration: run.completed_at && run.created_at ? 
                        new Date(run.completed_at) - new Date(run.created_at) : null,
                    duration_ms: resultsData.duration_ms || null
                },
                evidence_files: run.evidence_count || 0,
                test_instances_updated: resultsData.test_instances_updated || 0,
                requirements_tested: requirementsResult.rows || []
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
            },
            {
                name: 'contrast-analyzer',
                description: 'Advanced color contrast analysis for accessibility compliance',
                version: '1.0.0',
                capabilities: ['color-contrast', 'wcag-aa', 'wcag-aaa', 'gradient-analysis']
            },
            {
                name: 'mobile-accessibility',
                description: 'Mobile accessibility testing across multiple viewports and touch interfaces',
                version: '1.0.0',
                capabilities: ['touch-targets', 'responsive-design', 'mobile-viewport', 'tablet-testing']
            },
            {
                name: 'wave',
                description: 'WebAIM\'s WAVE API for comprehensive accessibility analysis',
                version: '2.0.0',
                capabilities: ['wcag-compliance', 'structure-analysis', 'aria-validation', 'comprehensive-scanning'],
                rateLimited: true,
                monthlyLimit: 500
            }
        ];
    }

    /**
     * Cancel automation run
     */
    async cancelAutomationRun(runId, userId) {
        const cancelledAt = new Date();
        
        // Note: Run status updates handled by UnifiedAutomationController
        console.log(`🚫 Automation run ${runId} cancelled`, {
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

        try {
            console.log(`🔍 Running automated test for instance: ${instanceId}`);
            
            // Get the test instance details
            const { pool } = require('../../database/config');
            const instanceQuery = `
                SELECT 
                    ti.id,
                    ti.session_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.test_method_used,
                    dp.url as page_url,
                    tr.criterion_number,
                    tr.title as requirement_title
                FROM test_instances ti
                LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.id = $1
            `;
            
            const instanceResult = await pool.query(instanceQuery, [instanceId]);
            
            if (instanceResult.rows.length === 0) {
                throw new Error(`Test instance ${instanceId} not found`);
            }
            
            const instance = instanceResult.rows[0];
            console.log(`🔍 Testing page: ${instance.page_url} for requirement: ${instance.requirement_title}`);
            
            // Update status to running
            await this.updateTestInstanceStatus(instanceId, 'running', userId);
            
            // Run the automation tools against the specific page
            const pages = [{ url: instance.page_url, id: instance.page_id }];
            let allResults = [];
            
            for (const tool of tools) {
                console.log(`🔧 Running ${tool} against ${instance.page_url}`);
                
                let toolResults;
                switch (tool) {
                    case 'axe-core':
                        toolResults = await this.runAxe(pages, instance.session_id);
                        break;
                    case 'pa11y':
                        toolResults = await this.runPa11y(pages, instance.session_id);
                        break;
                    case 'lighthouse':
                        toolResults = await this.runLighthouse(pages);
                        break;
                    default:
                        console.log(`⚠️ Unknown tool: ${tool}, skipping`);
                        continue;
                }
                
                if (toolResults && toolResults.length > 0) {
                    allResults = allResults.concat(toolResults);
                }
            }
            
            // Map results to test instances
            if (allResults.length > 0) {
                await this.mapViolationsToTestInstances(instance.session_id, instance.page_url, allResults, tools.join(','));
            }
            
            // Update test instance status to completed
            await this.updateTestInstanceStatus(instanceId, 'passed', userId);
            
            console.log(`✅ Completed automated test for instance: ${instanceId}`);
            
            return {
                results: { 
                    message: 'Instance-specific testing completed',
                    tools_used: tools,
                    results_count: allResults.length,
                    page_tested: instance.page_url
                },
                status_updated: true,
                evidence_created: true
            };
            
        } catch (error) {
            console.error(`❌ Error running test for instance ${instanceId}:`, error);
            
            // Update status to failed
            await this.updateTestInstanceStatus(instanceId, 'failed', userId, error.message);
            
            throw error;
        }
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
     * Count violations from tool results
     */
    countViolationsFromResults(toolResults) {
        if (!toolResults) return 0;
        
        // Use standardized total_violations field
        if (typeof toolResults.total_violations === 'number') {
            return toolResults.total_violations;
        }
        
        // Fallback: count from violations_by_page object format
        if (toolResults.violations_by_page) {
            return Object.values(toolResults.violations_by_page).reduce((total, pageViolations) => {
                if (pageViolations && typeof pageViolations.violations === 'number') {
                    return total + pageViolations.violations;
                }
                return total;
            }, 0);
        }
        
        return 0;
    }

    /**
     * Get tool icon identifier for UI display
     */
        getToolIcon(tool) {
        const icons = {
            'axe': 'shield-alt',
            'pa11y': 'universal-access',
            'lighthouse': 'lighthouse',
            'contrast-analyzer': 'palette',
                                'mobile-accessibility': 'mobile-alt',
                                    'wave': 'water',
                'form-accessibility': 'form',
                'heading-structure': 'heading',
                'aria-testing': 'universal-access',
                'playwright': 'theater-masks',
        'cypress': 'tree'
        };
        return icons[tool] || 'tools';
    }

    /**
     * Get confidence level based on tool type and results
     */
    getToolConfidenceLevel(tool, results) {
        // Higher confidence for tools with more comprehensive coverage
        const toolConfidence = {
            'axe': 'high',
            'lighthouse': 'high', 
            'pa11y': 'medium',
            'contrast-analyzer': 'high',
            'mobile-accessibility': 'medium',
            'wave': 'high'
        };

        let baseConfidence = toolConfidence[tool] || 'medium';

        // Adjust confidence based on results quality
        if (results) {
            const violationCount = results.total_violations || 0;
            const pagesCount = results.pages_tested?.length || 0;
            
            // Lower confidence if no pages were tested
            if (pagesCount === 0) {
                baseConfidence = 'low';
            }
            // High confidence if comprehensive testing with clear results
            else if (pagesCount > 1 && (violationCount > 0 || results.passes_count > 0)) {
                baseConfidence = 'high';
            }
        }

        return baseConfidence;
    }

    /**
     * Run WAVE API analysis on pages
     */
    async runWaveApi(pages, sessionId = null) {
        const WaveApiTester = require('../../scripts/wave-api-tester.js');
        const waveApi = new WaveApiTester();
        
        const results = {
            tool: 'wave',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {},
            rate_limit_status: {
                requests_made: 0,
                credits_remaining: waveApi.getRemainingCredits(),
                rate_limited: false
            }
        };

        for (const page of pages) {
            try {
                console.log(`🌊 Running WAVE API analysis for ${page.url}`);
                
                // Enhanced rate limiting with WebSocket notifications
                await waveApi.enforceRateLimit(this.wsService);
                
                const waveResults = await waveApi.analyzeUrl(page.url, {
                    reporttype: '4', // Full detailed report
                    userId: 'vpat-automation'
                });
                
                results.pages_tested.push({
                    url: page.url,
                    violations: waveResults.summary.totalIssues,
                    critical: waveResults.summary.criticalIssues,
                    moderate: waveResults.summary.moderateIssues,
                    minor: waveResults.summary.minorIssues,
                    page_title: waveResults.statistics.pageTitle,
                    wcag_violations: waveResults.violations || []
                });
                
                results.total_violations += waveResults.summary.totalIssues;
                results.critical_violations += waveResults.summary.criticalIssues;
                results.violations_by_page[page.url] = {
                    url: page.url,
                    violations: waveResults.summary.totalIssues,
                    critical: waveResults.summary.criticalIssues,
                    details: waveResults.violations || [],
                    title_at_test_time: ""
                };
                results.rate_limit_status.requests_made = waveApi.requestCount;
                results.rate_limit_status.credits_remaining = waveApi.getRemainingCredits();

                console.log(`✅ WAVE analysis completed for ${page.url}: ${waveResults.summary.totalIssues} issues found`);

            } catch (error) {
                console.error(`❌ WAVE API error for ${page.url}:`, error.message);
                
                // Handle rate limiting with enhanced audit trail
                if (error.message.includes('WAVE_RATE_LIMIT_EXCEEDED') || 
                    error.message.includes('WAVE_MONTHLY_LIMIT_EXCEEDED')) {
                    console.warn('🚫 WAVE API rate limit exceeded, stopping analysis');
                    results.rate_limit_status.rate_limited = true;
                    
                    // Create audit log entry for rate limit event
                    try {
                        await this.createSessionAuditLogEntry(sessionId, 'automation_paused', null, {
                            message: `WAVE API rate limit reached - automation paused`,
                            tool: 'wave',
                            credits_remaining: waveApi.getRemainingCredits(),
                            requests_made: waveApi.requestCount,
                            pages_processed: results.pages_tested.length
                        });
                    } catch (auditError) {
                        console.error('Failed to create audit log entry:', auditError.message);
                    }
                    
                    // Enhanced WebSocket notification
                    if (this.wsService) {
                        this.wsService.emitRateLimitNotification('wave', {
                            message: 'WAVE API rate limit exceeded. Automation paused indefinitely.',
                            creditsRemaining: waveApi.getRemainingCredits(),
                            requestsMade: waveApi.requestCount,
                            action: 'automation_paused'
                        });
                    }
                    break;
                }
                
                results.pages_tested.push({
                    url: page.url,
                    error: error.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        console.log(`🌊 WAVE API analysis completed: ${results.pages_tested.length} pages processed`);
        console.log(`📊 Total violations found: ${results.total_violations} (${results.critical_violations} critical)`);
        console.log(`🎫 Credits remaining: ${results.rate_limit_status.credits_remaining}`);

        return results;
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

  /**
   * Run form accessibility analysis using specialized form tester
   */
    async runFormAccessibilityTester(pages, sessionId = null) {
        const FormAccessibilityTester = require('../../scripts/form-accessibility-tester.js');
        const formTester = new FormAccessibilityTester();
        
        const results = {
            tool: 'form-accessibility',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {},
            form_statistics: {
                total_forms_analyzed: 0,
                forms_with_issues: 0,
                total_inputs_analyzed: 0,
                inputs_with_issues: 0
            }
        };

        for (const page of pages) {
            try {
                console.log(`📝 Running form accessibility analysis for ${page.url}`);
                
                const formResults = await formTester.analyzeUrl(page.url, {
                    userId: 'vpat-automation'
                });
                
                results.pages_tested.push({
                    url: page.url,
                    violations: formResults.summary.totalIssues,
                    critical: formResults.summary.criticalIssues,
                    high: formResults.summary.highIssues,
                    medium: formResults.summary.mediumIssues,
                    low: formResults.summary.lowIssues,
                    forms_analyzed: formResults.summary.totalForms,
                    forms_with_issues: formResults.summary.formsWithIssues,
                    inputs_analyzed: formResults.summary.totalInputs,
                    inputs_with_issues: formResults.summary.inputsWithIssues,
                    workflows_tested: formResults.summary.workflowsTested,
                    workflow_issues: formResults.summary.workflowIssues,
                    wcag_violations: formResults.violations || [],
                    workflow_results: formResults.workflows || {}
                });
                
                results.total_violations += formResults.summary.totalIssues;
                results.critical_violations += formResults.summary.criticalIssues;
                results.violations_by_page[page.url] = {
                    url: page.url,
                    violations: formResults.summary.totalIssues,
                    critical: formResults.summary.criticalIssues,
                    details: formResults.violations || [],
                    title_at_test_time: ""
                };
                results.form_statistics.total_forms_analyzed += formResults.summary.totalForms;
                results.form_statistics.forms_with_issues += formResults.summary.formsWithIssues;
                results.form_statistics.total_inputs_analyzed += formResults.summary.totalInputs;
                results.form_statistics.inputs_with_issues += formResults.summary.inputsWithIssues;

                console.log(`✅ Form accessibility analysis completed for ${page.url}: ${formResults.summary.totalIssues} issues found (${formResults.summary.totalForms} forms, ${formResults.summary.totalInputs} inputs)`);

            } catch (error) {
                console.error(`❌ Form accessibility analysis error for ${page.url}:`, error.message);
                
                results.pages_tested.push({
                    url: page.url,
                    error: error.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        console.log(`📝 Form accessibility analysis completed: ${results.pages_tested.length} pages processed`);
        console.log(`📊 Total issues found: ${results.total_violations} (${results.critical_violations} critical)`);
        console.log(`📊 Form statistics: ${results.form_statistics.total_forms_analyzed} forms analyzed, ${results.form_statistics.forms_with_issues} with issues`);

        return results;
    }

    /**
     * Run heading structure analysis using specialized heading analyzer
     */
    async runHeadingStructureAnalyzer(pages, sessionId = null) {
        const HeadingStructureAnalyzer = require('../../scripts/heading-structure-analyzer.js');
        const headingAnalyzer = new HeadingStructureAnalyzer();
        
        const results = {
            tool: 'heading-structure',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {},
            heading_statistics: {
                total_headings_analyzed: 0,
                pages_with_h1: 0,
                pages_with_hierarchy_issues: 0,
                total_hierarchy_violations: 0,
                total_missing_levels: 0
            }
        };

        for (const page of pages) {
            try {
                console.log(`📋 Running heading structure analysis for ${page.url}`);
                
                const headingResults = await headingAnalyzer.analyzeUrl(page.url, {
                    userId: 'vpat-automation'
                });
                
                results.pages_tested.push({
                    url: page.url,
                    violations: headingResults.summary.totalIssues,
                    critical: headingResults.summary.criticalIssues,
                    high: headingResults.summary.highIssues,
                    medium: headingResults.summary.mediumIssues,
                    low: headingResults.summary.lowIssues,
                    headings_analyzed: headingResults.summary.totalHeadings,
                    has_main_heading: headingResults.summary.hasMainHeading,
                    hierarchy_violations: headingResults.summary.hierarchyViolations,
                    missing_levels: headingResults.summary.missingLevels,
                    landmarks_count: headingResults.landmarks?.length || 0,
                    wcag_violations: headingResults.violations || []
                });
                
                results.total_violations += headingResults.summary.totalIssues;
                results.critical_violations += headingResults.summary.criticalIssues;
                results.violations_by_page[page.url] = {
                    url: page.url,
                    violations: headingResults.summary.totalIssues,
                    critical: headingResults.summary.criticalIssues,
                    details: headingResults.violations || [],
                    title_at_test_time: ""
                };
                results.heading_statistics.total_headings_analyzed += headingResults.summary.totalHeadings;
                results.heading_statistics.total_hierarchy_violations += headingResults.summary.hierarchyViolations;
                results.heading_statistics.total_missing_levels += headingResults.summary.missingLevels;
                
                if (headingResults.summary.hasMainHeading) {
                    results.heading_statistics.pages_with_h1++;
                }
                
                if (headingResults.summary.hierarchyViolations > 0) {
                    results.heading_statistics.pages_with_hierarchy_issues++;
                }

                console.log(`✅ Heading structure analysis completed for ${page.url}: ${headingResults.summary.totalIssues} issues found (${headingResults.summary.totalHeadings} headings)`);

            } catch (error) {
                console.error(`❌ Heading structure analysis error for ${page.url}:`, error.message);
                
                results.pages_tested.push({
                    url: page.url,
                    error: error.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        console.log(`📋 Heading structure analysis completed: ${results.pages_tested.length} pages processed`);
        console.log(`📊 Total issues found: ${results.total_violations} (${results.critical_violations} critical)`);
        console.log(`📊 Heading statistics: ${results.heading_statistics.total_headings_analyzed} headings analyzed, ${results.heading_statistics.pages_with_h1} pages with H1`);

        return results;
    }

    /**
     * Run ARIA testing analysis using specialized ARIA analyzer
     */
    async runAriaTestingAnalyzer(pages, sessionId = null) {
        const AriaTestingAnalyzer = require('../../scripts/aria-testing-analyzer.js');
        const ariaAnalyzer = new AriaTestingAnalyzer();
        
        const results = {
            tool: 'aria-testing',
            pages_tested: [],
            total_violations: 0,
            critical_violations: 0,
            violations_by_page: {},
            aria_statistics: {
                total_aria_elements: 0,
                total_widgets: 0,
                total_live_regions: 0,
                total_relationships: 0,
                widget_pattern_violations: 0,
                live_region_issues: 0,
                relationship_issues: 0,
                accessible_name_issues: 0
            }
        };

        for (const page of pages) {
            try {
                console.log(`🎭 Running ARIA testing analysis for ${page.url}`);
                
                const ariaResults = await ariaAnalyzer.analyzeUrl(page.url, {
                    userId: 'vpat-automation'
                });
                
                results.pages_tested.push({
                    url: page.url,
                    violations: ariaResults.summary.totalIssues,
                    critical: ariaResults.summary.criticalIssues,
                    high: ariaResults.summary.highIssues,
                    medium: ariaResults.summary.mediumIssues,
                    low: ariaResults.summary.lowIssues,
                    aria_elements: ariaResults.summary.totalAriaElements,
                    widgets: ariaResults.summary.totalWidgets,
                    live_regions: ariaResults.summary.totalLiveRegions,
                    relationships: ariaResults.summary.totalRelationships,
                    widget_violations: ariaResults.summary.widgetPatternViolations,
                    live_region_issues: ariaResults.summary.liveRegionIssues,
                    relationship_issues: ariaResults.summary.relationshipIssues,
                    accessible_name_issues: ariaResults.summary.accessibleNameIssues,
                    wcag_violations: ariaResults.violations || []
                });
                
                results.total_violations += ariaResults.summary.totalIssues;
                results.critical_violations += ariaResults.summary.criticalIssues;
                results.violations_by_page[page.url] = {
                    url: page.url,
                    violations: ariaResults.summary.totalIssues,
                    critical: ariaResults.summary.criticalIssues,
                    details: ariaResults.violations || [],
                    title_at_test_time: ""
                };
                results.aria_statistics.total_aria_elements += ariaResults.summary.totalAriaElements;
                results.aria_statistics.total_widgets += ariaResults.summary.totalWidgets;
                results.aria_statistics.total_live_regions += ariaResults.summary.totalLiveRegions;
                results.aria_statistics.total_relationships += ariaResults.summary.totalRelationships;
                results.aria_statistics.widget_pattern_violations += ariaResults.summary.widgetPatternViolations;
                results.aria_statistics.live_region_issues += ariaResults.summary.liveRegionIssues;
                results.aria_statistics.relationship_issues += ariaResults.summary.relationshipIssues;
                results.aria_statistics.accessible_name_issues += ariaResults.summary.accessibleNameIssues;

                console.log(`✅ ARIA testing analysis completed for ${page.url}: ${ariaResults.summary.totalIssues} issues found (${ariaResults.summary.totalAriaElements} ARIA elements, ${ariaResults.summary.totalWidgets} widgets)`);

            } catch (error) {
                console.error(`❌ ARIA testing analysis error for ${page.url}:`, error.message);
                
                results.pages_tested.push({
                    url: page.url,
                    error: error.message,
                    violations: 0,
                    critical: 0
                });
            }
        }

        console.log(`🎭 ARIA testing analysis completed: ${results.pages_tested.length} pages processed`);
        console.log(`📊 Total issues found: ${results.total_violations} (${results.critical_violations} critical)`);
        console.log(`📊 ARIA statistics: ${results.aria_statistics.total_aria_elements} ARIA elements, ${results.aria_statistics.total_widgets} widgets, ${results.aria_statistics.total_live_regions} live regions`);

        return results;
    }

    /**
     * Run comprehensive coverage analysis
     */
    async runCoverageAnalysis(sessionIds = [], options = {}) {
        const CoverageAnalysisService = require('../../scripts/coverage-analysis-service.js');
        const coverageAnalyzer = new CoverageAnalysisService();
        
        try {
            console.log(`📊 Starting comprehensive coverage analysis for ${sessionIds.length || 'all'} sessions`);
            
            const analysis = await coverageAnalyzer.analyzeCoverage(sessionIds, options);
            
            console.log(`✅ Coverage analysis completed:`);
            console.log(`📈 Overall coverage score: ${analysis.overall.coverage_score.toFixed(1)}%`);
            console.log(`🎯 WCAG AA coverage: ${analysis.overall.wcag_aa_coverage.toFixed(1)}%`);
            console.log(`🔧 Automated coverage: ${analysis.overall.automated_coverage.toFixed(1)}%`);
            console.log(`⚠️  Coverage gaps found: ${analysis.coverage_gaps.length}`);
            console.log(`💡 Optimization recommendations: ${analysis.optimization_recommendations.length}`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Coverage analysis error:', error.message);
            throw error;
        }
    }

    /**
     * Generate optimization recommendations based on current tool usage
     */
    async generateOptimizationRecommendations(sessionData = {}) {
        const CoverageAnalysisService = require('../../scripts/coverage-analysis-service.js');
        const coverageAnalyzer = new CoverageAnalysisService();
        
        try {
            // Analyze current tool effectiveness
            const toolEffectiveness = await coverageAnalyzer.analyzeToolEffectiveness(sessionData);
            
            const recommendations = {
                timestamp: new Date().toISOString(),
                tool_optimization: [],
                pipeline_optimization: [],
                coverage_enhancement: [],
                performance_improvements: []
            };

            // Generate tool-specific recommendations
            for (const [toolName, effectiveness] of Object.entries(toolEffectiveness)) {
                if (effectiveness.overall_score < 0.6) {
                    recommendations.tool_optimization.push({
                        tool: toolName,
                        issue: 'Low effectiveness score',
                        recommendation: effectiveness.recommendation,
                        priority: 'high'
                    });
                }

                // Check for high overlap
                const highOverlapTools = Object.entries(effectiveness.overlap_with_other_tools)
                    .filter(([_, overlap]) => overlap > 0.7)
                    .map(([tool]) => tool);

                if (highOverlapTools.length > 0) {
                    recommendations.pipeline_optimization.push({
                        tool: toolName,
                        issue: 'High overlap with other tools',
                        overlapping_tools: highOverlapTools,
                        recommendation: 'Consider running in sequence or optimizing tool selection',
                        priority: 'medium'
                    });
                }
            }

            // Performance optimization recommendations
            recommendations.performance_improvements = [
                {
                    category: 'parallel_execution',
                    recommendation: 'Run complementary tools in parallel',
                    tools: ['axe', 'wave', 'lighthouse'],
                    expected_improvement: '30-40% faster execution'
                },
                {
                    category: 'selective_execution',
                    recommendation: 'Run specialized tools only on relevant pages',
                    tools: ['form-accessibility', 'aria-testing'],
                    expected_improvement: '20-25% resource optimization'
                },
                {
                    category: 'result_caching',
                    recommendation: 'Implement intelligent result caching',
                    expected_improvement: '50% faster re-runs on unchanged pages'
                }
            ];

            return recommendations;
            
        } catch (error) {
            console.error('❌ Optimization analysis error:', error.message);
            throw error;
        }
    }

    /**
     * Implement smart result deduplication across tools
     */
    async deduplicateResults(results, options = {}) {
        const deduplicated = {
            unique_violations: [],
            merged_violations: [],
            duplicate_count: 0,
            tool_contributions: {},
            confidence_scores: {}
        };

        try {
            const allViolations = [];
            
            // Collect all violations from all tools
            for (const [toolName, toolResults] of Object.entries(results)) {
                if (toolResults.violations) {
                    for (const violation of toolResults.violations) {
                        allViolations.push({
                            ...violation,
                            source_tool: toolName,
                            tool_confidence: this.getToolConfidence(toolName, violation.id)
                        });
                    }
                }
            }

            // Group similar violations
            const violationGroups = this.groupSimilarViolations(allViolations);
            
            // Merge and deduplicate each group
            for (const group of violationGroups) {
                const mergedViolation = this.mergeViolationGroup(group);
                deduplicated.unique_violations.push(mergedViolation);
                
                if (group.length > 1) {
                    deduplicated.merged_violations.push({
                        merged_violation: mergedViolation,
                        source_violations: group,
                        merge_confidence: this.calculateMergeConfidence(group)
                    });
                    deduplicated.duplicate_count += group.length - 1;
                }
            }

            // Calculate tool contributions
            for (const [toolName] of Object.entries(results)) {
                const toolViolations = deduplicated.unique_violations.filter(v => 
                    v.source_tools.includes(toolName)
                );
                deduplicated.tool_contributions[toolName] = {
                    unique_detections: toolViolations.filter(v => v.source_tools.length === 1).length,
                    shared_detections: toolViolations.filter(v => v.source_tools.length > 1).length,
                    total_contribution: toolViolations.length
                };
            }

            console.log(`🔍 Result deduplication completed:`);
            console.log(`📊 Total violations processed: ${allViolations.length}`);
            console.log(`✨ Unique violations: ${deduplicated.unique_violations.length}`);
            console.log(`🔄 Duplicates removed: ${deduplicated.duplicate_count}`);
            console.log(`📈 Deduplication efficiency: ${((deduplicated.duplicate_count / allViolations.length) * 100).toFixed(1)}%`);

            return deduplicated;
            
        } catch (error) {
            console.error('❌ Result deduplication error:', error.message);
            throw error;
        }
    }

    /**
     * Group similar violations from different tools
     */
    groupSimilarViolations(violations) {
        const groups = [];
        const processed = new Set();

        for (let i = 0; i < violations.length; i++) {
            if (processed.has(i)) continue;
            
            const group = [violations[i]];
            processed.add(i);

            for (let j = i + 1; j < violations.length; j++) {
                if (processed.has(j)) continue;
                
                const similarity = this.calculateViolationSimilarity(violations[i], violations[j]);
                if (similarity > 0.8) {
                    group.push(violations[j]);
                    processed.add(j);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Calculate similarity between two violations
     */
    calculateViolationSimilarity(violation1, violation2) {
        let similarity = 0;

        // Check if same WCAG criteria
        const wcag1 = new Set(violation1.tags || []);
        const wcag2 = new Set(violation2.tags || []);
        const wcagIntersection = new Set([...wcag1].filter(x => wcag2.has(x)));
        const wcagUnion = new Set([...wcag1, ...wcag2]);
        
        if (wcagUnion.size > 0) {
            similarity += (wcagIntersection.size / wcagUnion.size) * 0.4;
        }

        // Check description similarity
        const desc1 = (violation1.description || '').toLowerCase();
        const desc2 = (violation2.description || '').toLowerCase();
        const descSimilarity = this.calculateStringSimilarity(desc1, desc2);
        similarity += descSimilarity * 0.3;

        // Check element selector similarity
        const selector1 = this.extractMainSelector(violation1);
        const selector2 = this.extractMainSelector(violation2);
        if (selector1 && selector2) {
            const selectorSimilarity = this.calculateStringSimilarity(selector1, selector2);
            similarity += selectorSimilarity * 0.3;
        }

        return similarity;
    }

    /**
     * Calculate string similarity using Levenshtein distance
     */
    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Extract main selector from violation
     */
    extractMainSelector(violation) {
        if (violation.nodes && violation.nodes[0] && violation.nodes[0].target) {
            return violation.nodes[0].target[0];
        }
        return violation.element || violation.selector || null;
    }

    /**
     * Merge a group of similar violations
     */
    mergeViolationGroup(group) {
        if (group.length === 1) {
            return {
                ...group[0],
                source_tools: [group[0].source_tool],
                confidence: group[0].tool_confidence
            };
        }

        // Determine primary violation (highest confidence)
        const primaryViolation = group.reduce((prev, current) => 
            (current.tool_confidence > prev.tool_confidence) ? current : prev
        );

        // Collect all source tools
        const sourceTools = [...new Set(group.map(v => v.source_tool))];
        
        // Calculate merged confidence
        const avgConfidence = group.reduce((sum, v) => sum + v.tool_confidence, 0) / group.length;
        const consensusBonus = group.length > 1 ? Math.min(0.2, (group.length - 1) * 0.05) : 0;
        const mergedConfidence = Math.min(1.0, avgConfidence + consensusBonus);

        return {
            ...primaryViolation,
            source_tools: sourceTools,
            confidence: mergedConfidence,
            detection_count: group.length,
            supporting_evidence: group.map(v => ({
                tool: v.source_tool,
                description: v.description,
                confidence: v.tool_confidence
            }))
        };
    }

    /**
     * Calculate merge confidence
     */
    calculateMergeConfidence(group) {
        if (group.length < 2) return 1.0;
        
        let totalSimilarity = 0;
        let comparisons = 0;
        
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                totalSimilarity += this.calculateViolationSimilarity(group[i], group[j]);
                comparisons++;
            }
        }
        
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    /**
     * Get tool confidence for a specific violation type
     */
    getToolConfidence(toolName, violationType) {
        const toolConfidenceMap = {
            'axe': {
                'color-contrast': 0.9,
                'aria-required-attr': 0.95,
                'html-has-lang': 0.95,
                'landmark-one-main': 0.9,
                'page-has-heading-one': 0.85,
                'default': 0.8
            },
            'pa11y': {
                'img-alt': 0.9,
                'heading-order': 0.85,
                'link-text': 0.8,
                'default': 0.7
            },
            'wave': {
                'contrast': 0.95,
                'alt_missing': 0.9,
                'heading_missing': 0.85,
                'default': 0.75
            },
            'lighthouse': {
                'color-contrast': 0.85,
                'image-alt': 0.8,
                'default': 0.6
            },
            'contrast-analyzer': {
                'contrast': 0.98,
                'default': 0.95
            },
            'heading-structure': {
                'heading-order': 0.95,
                'heading-structure': 0.9,
                'landmark-structure': 0.85,
                'default': 0.85
            },
            'aria-testing': {
                'aria-roles': 0.95,
                'aria-attributes': 0.9,
                'widget-patterns': 0.85,
                'default': 0.8
            },
            'form-accessibility': {
                'form-labels': 0.95,
                'form-validation': 0.9,
                'default': 0.85
            }
        };

        const toolMap = toolConfidenceMap[toolName];
        if (!toolMap) return 0.7;

        return toolMap[violationType] || toolMap.default;
    }

    /**
     * Optimize testing pipeline for improved performance
     */
    async optimizeTestingPipeline(tools, pages, options = {}) {
        const PipelineOptimizer = require('../../scripts/pipeline-optimizer.js');
        const optimizer = new PipelineOptimizer();
        
        try {
            console.log(`🔧 Optimizing testing pipeline for ${tools.length} tools, ${pages.length} pages`);
            
            const optimization = await optimizer.optimizePipeline(tools, pages, options);
            
            console.log(`✅ Pipeline optimization completed:`);
            console.log(`📈 Predicted improvement: ${optimization.performance_prediction.improvement_percentage.toFixed(1)}%`);
            console.log(`🔄 Parallel execution phases: ${optimization.execution_plan.phases.length}`);
            console.log(`💾 Cacheable pages: ${optimization.caching_plan.cacheable_pages.length}/${pages.length}`);
            
            return optimization;
            
        } catch (error) {
            console.error('❌ Pipeline optimization error:', error.message);
            throw error;
        }
    }

    /**
     * Execute tests with pipeline optimization
     */
    async runOptimizedAutomatedTests(sessionId, options = {}) {
        try {
            const { tools = ['axe', 'pa11y'], optimize_pipeline = true } = options;
            
            console.log(`🚀 Starting optimized automated test run for session ${sessionId}`);
            
            // Get pages for the session
            const pages = await this.getSessionPages(sessionId);
            
            if (pages.length === 0) {
                throw new Error('No pages found for testing session');
            }

            let executionResults;
            
            if (optimize_pipeline && pages.length > 1) {
                // Use pipeline optimization for multiple pages
                const optimization = await this.optimizeTestingPipeline(tools, pages, options);
                
                // Execute with optimization
                const PipelineOptimizer = require('../../scripts/pipeline-optimizer.js');
                const optimizer = new PipelineOptimizer();
                executionResults = await optimizer.executeOptimizedPipeline(optimization, this);
                
                console.log(`⚡ Optimized execution completed with ${executionResults.performance_metrics.actual_improvement.improvement_percentage.toFixed(1)}% improvement`);
                
                return {
                    success: true,
                    session_id: sessionId,
                    optimization_used: true,
                    results: executionResults.total_results,
                    performance_metrics: executionResults.performance_metrics,
                    cache_performance: executionResults.cache_performance
                };
                
            } else {
                // Use standard execution for single pages or when optimization is disabled
                const results = await this.executeAutomatedTests(tools, pages, { sessionId });
                
                return {
                    success: true,
                    session_id: sessionId,
                    optimization_used: false,
                    results: results
                };
            }
            
        } catch (error) {
            console.error(`❌ Optimized test execution error for session ${sessionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get performance recommendations for the current pipeline
     */
    async generatePerformanceRecommendations(sessionData = {}) {
        try {
            const recommendations = {
                timestamp: new Date().toISOString(),
                pipeline_optimizations: [],
                tool_recommendations: [],
                caching_opportunities: [],
                performance_improvements: []
            };

            // Analyze current tool usage patterns
            const toolUsageAnalysis = await this.analyzeToolUsagePatterns(sessionData);
            
            // Generate tool-specific recommendations
            if (toolUsageAnalysis.high_failure_tools.length > 0) {
                recommendations.tool_recommendations.push({
                    type: 'tool_reliability',
                    priority: 'high',
                    recommendation: 'Review and optimize high-failure tools',
                    affected_tools: toolUsageAnalysis.high_failure_tools,
                    expected_improvement: '15-20% reliability increase'
                });
            }

            // Pipeline optimization recommendations
            if (toolUsageAnalysis.sequential_execution_detected) {
                recommendations.pipeline_optimizations.push({
                    type: 'parallel_execution',
                    priority: 'high',
                    recommendation: 'Implement parallel tool execution',
                    estimated_speedup: '30-50%',
                    applicable_tools: toolUsageAnalysis.parallelizable_tools
                });
            }

            // Caching recommendations
            if (toolUsageAnalysis.repeated_page_tests > 10) {
                recommendations.caching_opportunities.push({
                    type: 'result_caching',
                    priority: 'medium',
                    recommendation: 'Implement smart result caching for unchanged pages',
                    estimated_speedup: '40-60% for repeated tests',
                    cache_hit_potential: toolUsageAnalysis.cache_hit_rate
                });
            }

            // Performance improvements
            recommendations.performance_improvements = [
                {
                    category: 'execution_order',
                    recommendation: 'Optimize tool execution order based on dependencies',
                    priority: 'medium',
                    implementation: 'automatic'
                },
                {
                    category: 'resource_management',
                    recommendation: 'Implement resource-aware scheduling',
                    priority: 'low',
                    implementation: 'configuration'
                }
            ];

            return recommendations;
            
        } catch (error) {
            console.error('❌ Performance recommendations error:', error.message);
            throw error;
        }
    }

    /**
     * Analyze tool usage patterns for optimization insights
     */
    async analyzeToolUsagePatterns(sessionData) {
        // This would analyze actual usage data from the database
        // For now, we'll provide a structure with estimated analysis

        return {
            total_test_runs: 150,
            sequential_execution_detected: true,
            parallelizable_tools: ['axe', 'contrast-analyzer', 'heading-structure'],
            high_failure_tools: [],
            repeated_page_tests: 25,
            cache_hit_rate: 0.35,
            avg_execution_time_ms: 45000,
            bottleneck_tools: ['lighthouse', 'wave'],
            optimization_potential: 0.45
        };
    }

    /**
     * Store automated test results in database
     */
    async storeToolResults(sessionId, pageId, tool, toolResults) {
        try {
            console.log(`🔍 DEBUG: Storing ${tool} results for session ${sessionId}, page ${pageId}`);
            console.log(`🔍 DEBUG: Tool results structure:`, {
                hasResults: !!toolResults,
                hasViolationsByPage: !!(toolResults && toolResults.violations_by_page),
                totalViolations: toolResults?.total_violations,
                violationsByPageKeys: toolResults?.violations_by_page ? Object.keys(toolResults.violations_by_page) : [],
                sampleViolations: toolResults?.violations_by_page ? Object.values(toolResults.violations_by_page)[0] : null
            });
            
            // Extract violations and passes count from results
            let violationsCount = 0;
            let passesCount = 0;
            
            if (toolResults && toolResults.violations_by_page) {
                // Sum violations across all pages for this tool
                Object.values(toolResults.violations_by_page).forEach(pageViolations => {
                    if (pageViolations && typeof pageViolations === 'object' && typeof pageViolations.violations === 'number') {
                        violationsCount += pageViolations.violations;
                        console.log(`🔍 DEBUG: Page violations count: ${pageViolations.violations} for ${pageViolations.url}`);
                    } else {
                        console.log(`🔍 DEBUG: Invalid page violations format:`, pageViolations);
                    }
                });
            }
            
            // Use total_violations if provided, otherwise calculate from violations_by_page
            if (toolResults && typeof toolResults.total_violations === 'number') {
                violationsCount = toolResults.total_violations;
            }
            
            // Estimate passes count (rough calculation)
            passesCount = Math.max(0, 50 - violationsCount); // Rough estimate

            const query = `
                INSERT INTO automated_test_results 
                (test_session_id, page_id, tool_name, raw_results, violations_count, passes_count, status, started_at, completed_at)
                VALUES ($4, $5, $6, $1, $2, $3, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (test_session_id, page_id, tool_name) 
                DO UPDATE SET 
                    raw_results = EXCLUDED.raw_results,
                    violations_count = EXCLUDED.violations_count,
                    passes_count = EXCLUDED.passes_count,
                    status = 'completed',
                    completed_at = CURRENT_TIMESTAMP
                RETURNING id
            `;

            console.log(`🔍 DEBUG: About to execute UPSERT query with:`, {
                tool,
                sessionId,
                pageId,
                violationsCount,
                passesCount,
                rawResultsSize: JSON.stringify(toolResults).length
            });

            const result = await pool.query(query, [
                JSON.stringify(toolResults),
                violationsCount,
                passesCount,
                sessionId,
                pageId,
                tool
            ]);

            console.log(`🔍 DEBUG: UPSERT query result:`, {
                rowsAffected: result.rowCount,
                rowsReturned: result.rows.length
            });

            if (result.rows.length > 0) {
                const automatedResultId = result.rows[0].id;
                console.log(`💾 Stored ${tool} results: ${violationsCount} violations, ${passesCount} passes`);
                
                // Parse and store individual violations
                if (violationsCount > 0) {
                    await this.parseAndStoreViolations(automatedResultId, tool, toolResults);
                }
                
                return result.rows[0];
            } else {
                console.error(`❌ Failed to store ${tool} results - unexpected error`);
                console.error(`🔍 DEBUG: Query was:`, query);
                console.error(`🔍 DEBUG: Parameters were:`, [JSON.stringify(toolResults), violationsCount, passesCount, sessionId, pageId, tool]);
                return null;
            }

        } catch (error) {
            console.error(`❌ Error storing ${tool} results:`, error);
            throw error;
        }
    }

    /**
     * Get pages to test for a session
     */
    async getSessionPages(sessionId) {
        try {
            const query = `
                SELECT dp.id as page_id, dp.url, dp.title
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                WHERE ti.session_id = $1
                AND dp.url IS NOT NULL
            `;

            const result = await pool.query(query, [sessionId]);
            return result.rows.map(row => ({
                id: row.page_id,
                url: row.url,
                title: row.title
            }));
        } catch (error) {
            console.error('Error getting session pages:', error);
            throw error;
        }
    }

    /**
     * Run per-instance tests in background - CORRECT APPROACH
     * Tests each page × WCAG criterion combination individually
     */
    async runPerInstanceTestsInBackground(runId, sessionId, tools, testInstances, batchSize, userId, clientMetadata = {}) {
        try {
            console.log(`🎯 Starting per-instance background testing for run ${runId}: ${testInstances.length} instances, batch size ${batchSize}`);
            
            // Execute per-instance tests
            await this.executePerInstanceTests(runId, sessionId, tools, testInstances, batchSize, userId, clientMetadata);
            
        } catch (error) {
            console.error(`❌ Background per-instance test execution failed for run ${runId}:`, error);
            await this.updateRunStatus(runId, 'failed', { error: error.message });
            
            // Log session-level audit entry for failure
            await this.createSessionAuditLogEntry(
                sessionId, 
                'automation_failed', 
                userId, 
                `Per-instance automation run ${runId} failed: ${error.message}`,
                { run_id: runId, error: error.message, client_ip: clientMetadata.ip }
            );
        }
    }

    /**
     * Execute per-instance automated tests - CORRECT APPROACH
     * This runs each tool against each test instance individually
     */
    async executePerInstanceTests(runId, sessionId, tools, testInstances, batchSize, userId, clientMetadata = {}) {
        const startTime = new Date();
        let totalIssues = 0;
        let criticalIssues = 0;
        let testInstancesUpdated = 0;
        const results = {};

        try {
            // Update run status to running
            // Note: Run status updates handled by UnifiedAutomationController
            
            console.log(`🎯 Starting per-instance execution: ${testInstances.length} instances, ${tools.length} tools`);

            // Group test instances by page for efficient testing
            const instancesByPage = this.groupTestInstancesByPage(testInstances);
            const pageUrls = Object.keys(instancesByPage);
            
            console.log(`📄 Testing ${pageUrls.length} unique pages with ${testInstances.length} total test instances`);

            // Process pages in batches
            for (let i = 0; i < pageUrls.length; i += batchSize) {
                const pageBatch = pageUrls.slice(i, i + batchSize);
                
                this.emitProgress(sessionId, {
                    percentage: Math.round((i / pageUrls.length) * 100),
                    message: `Testing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(pageUrls.length / batchSize)}`,
                    stage: 'testing',
                    currentPage: pageBatch[0],
                    completedPages: i,
                    totalPages: pageUrls.length
                });

                // Test each page in the batch
                for (const pageUrl of pageBatch) {
                    const pageInstances = instancesByPage[pageUrl];
                    console.log(`🌐 Testing page: ${pageUrl} (${pageInstances.length} instances)`);

                    // Run each tool against this page
                    for (const tool of tools) {
                        try {
                            console.log(`🔧 Running ${tool} against ${pageUrl}`);
                            
                            // Run tool against the page
                            const toolResults = await this.runToolAgainstPage(tool, pageUrl, pageInstances, executionOptions.use_interactive_auth);
                            
                            if (toolResults && toolResults.violations) {
                                // Get ALL test instances for this page and session (not just the ones selected for automation)
                                const allPageInstances = await this.getAllTestInstancesForPage(sessionId, pageUrl);
                                
                                // Map violations to ALL test instances on the page
                                const mappingResults = await this.mapViolationsToTestInstances(
                                    toolResults.violations,
                                    allPageInstances,
                                    tool,
                                    pageUrl
                                );
                                
                                totalIssues += toolResults.violations.length;
                                criticalIssues += toolResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
                                testInstancesUpdated += mappingResults.updated;
                                
                                // Store in results
                                if (!results[tool]) results[tool] = { pages_tested: [], violations_by_page: {} };
                                results[tool].pages_tested.push(pageUrl);
                                results[tool].violations_by_page[pageUrl] = {
                                    url: pageUrl,
                                    violations: toolResults.violations || 0,
                                    critical: toolResults.critical || 0,
                                    details: toolResults.details || [],
                                    title_at_test_time: toolResults.title || ""
                                };
                                
                                // Store tool results in database
                                const pageInstances = instancesByPage[pageUrl];
                                if (pageInstances && pageInstances.length > 0) {
                                    const pageId = pageInstances[0].page_id;
                                    await this.storeToolResults(sessionId, pageId, tool, {
                                        violations_by_page: { [pageUrl]: toolResults.violations },
                                        pages_tested: [pageUrl],
                                        total_violations: toolResults.violations.length
                                    });
                                }
                                
                                console.log(`✅ ${tool} tested ${pageUrl}: ${toolResults.violations.length} violations, updated ${mappingResults.updated} instances`);
                            } else {
                                console.log(`✅ ${tool} tested ${pageUrl}: 0 violations`);
                                
                                // Store empty results in database for tools that found no violations
                                const pageInstances = instancesByPage[pageUrl];
                                if (pageInstances && pageInstances.length > 0) {
                                    const pageId = pageInstances[0].page_id;
                                    await this.storeToolResults(sessionId, pageId, tool, {
                                        violations_by_page: { [pageUrl]: [] },
                                        pages_tested: [pageUrl],
                                        total_violations: 0
                                    });
                                }
                            }
                            
                        } catch (toolError) {
                            console.error(`❌ Error running ${tool} against ${pageUrl}:`, toolError);
                        }
                    }
                }
            }

            // Create evidence files per page per tool
            let evidenceFilesCreated = 0;
            for (const tool of tools) {
                if (results[tool]) {
                    for (const pageUrl of results[tool].pages_tested) {
                        const pageInstances = instancesByPage[pageUrl];
                        const violations = results[tool].violations_by_page[pageUrl];
                        
                        const evidenceFile = await this.createPageSpecificEvidenceFile(
                            tool,
                            pageUrl,
                            pageInstances[0].page_id, // Get page_id from first instance
                            violations,
                            sessionId,
                            runId
                        );
                        
                        if (evidenceFile) {
                            evidenceFilesCreated++;
                        }
                    }
                }
            }

            console.log(`📁 Created ${evidenceFilesCreated} page-specific evidence files`);

            // Update run status to completed
            const completedAt = new Date();
            // Note: Run status updates handled by UnifiedAutomationController
            console.log(`✅ Per-instance automation completed for run ${runId}:`, {
                completed_at: completedAt,
                pages_tested: pageUrls.length,
                total_issues: totalIssues,
                critical_issues: criticalIssues,
                test_instances_updated: testInstancesUpdated,
                evidence_files_created: evidenceFilesCreated,
                raw_results: results
            });

            this.emitProgress(sessionId, {
                percentage: 100,
                message: 'Per-instance testing completed',
                stage: 'completed',
                totalIssues,
                criticalIssues,
                testInstancesUpdated,
                evidenceFilesCreated
            });

            console.log(`✅ Per-instance automation run ${runId} completed: ${testInstancesUpdated} instances updated, ${evidenceFilesCreated} evidence files`);

            // Log session audit
            await this.createSessionAuditLogEntry(
                sessionId,
                'automation_completed',
                userId,
                `Per-instance automation completed: ${testInstancesUpdated} test instances updated`,
                {
                    run_id: runId,
                    test_instances_updated: testInstancesUpdated,
                    evidence_files_created: evidenceFilesCreated,
                    pages_tested: pageUrls.length
                }
            );

        } catch (error) {
            console.error(`❌ Per-instance test execution failed:`, error);
            await this.updateRunStatus(runId, 'failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get ALL test instances for a specific page and session (for violation mapping)
     * This ensures violations can be mapped to any relevant test instance on the page
     */
    async getAllTestInstancesForPage(sessionId, pageUrl) {
        try {
            const query = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.test_method_used,
                    ti.status,
                    dp.url,
                    dp.title as page_title,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title,
                    ur.description,
                    ur.standard_type
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1
                AND dp.url = $2
                AND ur.requirement_id IS NOT NULL
                ORDER BY ur.requirement_id
            `;

            const result = await pool.query(query, [sessionId, pageUrl]);
            
            console.log(`🔍 DEBUG: Found ${result.rows.length} total test instances for page ${pageUrl} in session ${sessionId}`);
            
            return result.rows;

        } catch (error) {
            console.error('❌ Error getting all test instances for page:', error);
            return [];
        }
    }

    /**
     * Get test instances to run for per-instance automation
     * This is the CORRECT approach - gets individual test instances (page × WCAG criterion combinations)
     */
    async getTestInstancesToRun(sessionId, specificInstances = null) {
        try {
            console.log(`🔍 DEBUG getTestInstancesToRun: sessionId=${sessionId}, specificInstances=${JSON.stringify(specificInstances)}`);
            
            if (specificInstances && Array.isArray(specificInstances)) {
                console.log(`🎯 DEBUG: Using specific instances branch with ${specificInstances.length} instances`);
                // Run specific test instances
                const query = `
                    SELECT 
                        ti.id as test_instance_id,
                        ti.page_id,
                        ti.requirement_id,
                        ti.test_method_used,
                        dp.url,
                        dp.title as page_title,
                        ur.requirement_id as criterion_number,
                        ur.title as requirement_title,
                        ur.description
                    FROM test_instances ti
                    JOIN discovered_pages dp ON ti.page_id = dp.id
                    JOIN unified_requirements ur ON ti.requirement_id = ur.id
                    WHERE ti.id = ANY($1)
                    AND ti.session_id = $2
                    ORDER BY dp.url, ur.requirement_id
                `;
                
                const result = await pool.query(query, [specificInstances, sessionId]);
                return result.rows;
            }

            console.log(`🎯 DEBUG: Using main query branch for all automated instances`);
            
            // Get test instances with REAL WCAG criteria for proper mapping
            const query = `
                SELECT 
                    ti.id as test_instance_id,
                    ti.page_id,
                    ti.requirement_id,
                    ti.test_method_used,
                    ti.status,
                    dp.url,
                    dp.title as page_title,
                    ur.requirement_id as criterion_number,
                    ur.title as requirement_title,
                    ur.description,
                    ur.standard_type,
                    ur.tool_mappings,
                    ur.automation_coverage
                FROM test_instances ti
                JOIN discovered_pages dp ON ti.page_id = dp.id
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                WHERE ti.session_id = $1
                AND dp.url IS NOT NULL
                AND (ti.test_method_used = 'automated' OR ur.test_method IN ('automated', 'both'))
                AND ur.requirement_id IS NOT NULL
                ORDER BY dp.url, ur.requirement_id
                LIMIT 50
            `;

            const result = await pool.query(query, [sessionId]);
            
            console.log(`📋 Found ${result.rows.length} test instances for per-instance automation in session ${sessionId}`);
            
            // Group by pages for logging
            const pageGroups = result.rows.reduce((groups, instance) => {
                const pageUrl = instance.url;
                if (!groups[pageUrl]) {
                    groups[pageUrl] = [];
                }
                groups[pageUrl].push(instance);
                return groups;
            }, {});
            
            console.log(`📄 Test instances across ${Object.keys(pageGroups).length} pages:`);
            Object.entries(pageGroups).forEach(([url, instances]) => {
                console.log(`   - ${url}: ${instances.length} test instances`);
            });
            
            return result.rows;

        } catch (error) {
            console.error('❌ Error getting test instances to run:', error);
            throw error;
        }
    }

    /**
     * Group test instances by page URL for efficient testing
     */
    groupTestInstancesByPage(testInstances) {
        const grouped = {};
        
        testInstances.forEach(instance => {
            const pageUrl = instance.url;
            if (!grouped[pageUrl]) {
                grouped[pageUrl] = [];
            }
            grouped[pageUrl].push(instance);
        });
        
        return grouped;
    }

    /**
     * Run a specific tool against a single page - CORRECT APPROACH
     * Returns page-specific results that can be mapped to test instances
     */
    async runToolAgainstPage(tool, pageUrl, pageInstances, useInteractiveAuth = false) {
        try {
            console.log(`🔧 Running ${tool} against page: ${pageUrl}`);

            switch (tool.toLowerCase()) {
                case 'axe-core':
                case 'axe':
                    return await this.runAxeAgainstPage(pageUrl, pageInstances, useInteractiveAuth);
                
                case 'pa11y':
                    return await this.runPa11yAgainstPage(pageUrl, pageInstances, useInteractiveAuth);
                
                case 'lighthouse':
                    return await this.runLighthouseAgainstPage(pageUrl, pageInstances, useInteractiveAuth);
                
                case 'contrast-analyzer':
                    return await this.runContrastAnalyzerAgainstPage(pageUrl, pageInstances, useInteractiveAuth);
                
                default:
                    console.warn(`❌ Unsupported tool: ${tool}`);
                    return null;
            }
        } catch (error) {
            console.error(`❌ Error running ${tool} against ${pageUrl}:`, error);
            return null;
        }
    }

    /**
     * Run Axe-core against multiple pages
     */
    async runAxe(pages, sessionId, useInteractiveAuth = false) {
        const results = {};
        
        for (const page of pages) {
            try {
                // Get test instances for this page
                const pageInstances = await this.getTestInstancesForPage(sessionId, page.page_id);
                
                const pageResults = await this.runAxeAgainstPage(page.url, pageInstances, useInteractiveAuth);
                
                // Check if authentication is pending - stop execution
                if (pageResults && pageResults.isPending) {
                    console.log(`🔐 Interactive authentication pending - stopping all Axe automation`);
                    return { isPending: true, message: pageResults.message };
                }
                
                if (pageResults) {
                    results[page.url] = pageResults;
                }
            } catch (error) {
                console.error(`❌ Error running Axe against ${page.url}:`, error);
                results[page.url] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Run Pa11y against multiple pages
     */
    async runPa11y(pages, sessionId, useInteractiveAuth = false) {
        const results = {};
        
        for (const page of pages) {
            try {
                // Get test instances for this page
                const pageInstances = await this.getTestInstancesForPage(sessionId, page.page_id);
                
                const pageResults = await this.runPa11yAgainstPage(page.url, pageInstances, useInteractiveAuth);
                
                // Check if authentication is pending - stop execution
                if (pageResults && pageResults.isPending) {
                    console.log(`🔐 Interactive authentication pending - stopping all Pa11y automation`);
                    return { isPending: true, message: pageResults.message };
                }
                
                if (pageResults) {
                    results[page.url] = pageResults;
                }
            } catch (error) {
                console.error(`❌ Error running Pa11y against ${page.url}:`, error);
                results[page.url] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Run Lighthouse against multiple pages
     */
    async runLighthouse(pages, useInteractiveAuth = false) {
        const results = {};
        
        for (const page of pages) {
            try {
                // Get test instances for this page - need sessionId from page info
                const pageInstances = page.test_instances || [];
                
                const pageResults = await this.runLighthouseAgainstPage(page.url, pageInstances, useInteractiveAuth);
                
                // Check if authentication is pending - stop execution
                if (pageResults && pageResults.isPending) {
                    console.log(`🔐 Interactive authentication pending - stopping all Lighthouse automation`);
                    return { isPending: true, message: pageResults.message };
                }
                
                if (pageResults) {
                    results[page.url] = pageResults;
                }
            } catch (error) {
                console.error(`❌ Error running Lighthouse against ${page.url}:`, error);
                results[page.url] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Run Contrast Analyzer against multiple pages
     */
    async runContrastAnalyzer(pages, useInteractiveAuth = false) {
        const results = {};
        
        for (const page of pages) {
            try {
                // Get test instances for this page
                const pageInstances = page.test_instances || [];
                
                const pageResults = await this.runContrastAnalyzerAgainstPage(page.url, pageInstances, useInteractiveAuth);
                
                // Check if authentication is pending - stop execution
                if (pageResults && pageResults.isPending) {
                    console.log(`🔐 Interactive authentication pending - stopping all Contrast Analyzer automation`);
                    return { isPending: true, message: pageResults.message };
                }
                
                if (pageResults) {
                    results[page.url] = pageResults;
                }
            } catch (error) {
                console.error(`❌ Error running Contrast Analyzer against ${page.url}:`, error);
                results[page.url] = { error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Get test instances for a specific page
     */
    async getTestInstancesForPage(sessionId, pageId) {
        try {
            const query = `
                SELECT ti.*, ur.criterion_number, ts.id as session_id
                FROM test_instances ti
                JOIN unified_requirements ur ON ti.requirement_id = ur.id
                JOIN test_sessions ts ON ti.session_id = ts.id
                WHERE ti.session_id = $1 AND ti.page_id = $2
                ORDER BY ur.criterion_number
            `;
            const result = await pool.query(query, [sessionId, pageId]);
            console.log(`📋 Found ${result.rows.length} test instances for page ${pageId} in session ${sessionId}`);
            return result.rows;
        } catch (error) {
            console.error(`❌ Error fetching test instances for page ${pageId}:`, error);
            
            // Fallback: try to get test instances without the join to unified_requirements
            try {
                console.log(`🔄 Trying fallback query without unified_requirements join...`);
                const fallbackQuery = `
                    SELECT ti.*, ts.id as session_id
                    FROM test_instances ti
                    JOIN test_sessions ts ON ti.session_id = ts.id
                    WHERE ti.session_id = $1 AND ti.page_id = $2
                `;
                const fallbackResult = await pool.query(fallbackQuery, [sessionId, pageId]);
                console.log(`📋 Fallback: Found ${fallbackResult.rows.length} test instances for page ${pageId} in session ${sessionId}`);
                return fallbackResult.rows;
            } catch (fallbackError) {
                console.error(`❌ Fallback query also failed:`, fallbackError);
                return [];
            }
        }
    }

    /**
     * Run Axe-core against a specific page
     */
    async runAxeAgainstPage(pageUrl, pageInstances, useInteractiveAuth = false) {
        let browser;
        let context = null;
        try {
            console.log(`🔧 Running Axe against: ${pageUrl} (${pageInstances.length} test instances)`);
            
            browser = await puppeteer.launch({
                headless: false, // TEMPORARILY DISABLED for debugging
                slowMo: 250, // Slow down interactions for visibility
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });

            // Get authentication context if available
            if (pageInstances && pageInstances.length > 0) {
                const sessionId = pageInstances[0].session_id;
                console.log(`🔍 DEBUG: Looking for auth context for session: ${sessionId}`);
                console.log(`🔐 Interactive auth mode: ${useInteractiveAuth ? 'ENABLED' : 'DISABLED'}`);
                if (sessionId) {
                    const authContext = await this.getAuthContextForSession(sessionId, useInteractiveAuth);
                    console.log(`🔍 DEBUG: Auth context result:`, authContext ? `${authContext.cookies?.length || 0} cookies found` : 'No auth context');
                    
                    // Handle interactive auth pending state
                    if (authContext && authContext.isPending) {
                        console.log(`🔐 Interactive authentication pending - stopping automation`);
                        console.log(`🔐 Please complete login in browser and click "Successfully Logged In" in UI`);
                        return {
                            error: 'Interactive authentication pending',
                            message: 'Please complete login in browser window and click "Successfully Logged In" button',
                            isPending: true
                        };
                    }
                    
                    if (authContext && authContext.storageState) {
                        // Create context with stored authentication state
                        context = await browser.createBrowserContext({
                            storageState: authContext.storageState || authContext
                        });
                        console.log(`🔐 Crawler authentication session loaded successfully for Axe`);
                    } else {
                        console.log(`⚠️ No authentication context found - pages may redirect to login`);
                        console.log(`💡 To fix this: Go to Web Crawler → Session Capture → Re-capture authentication`);
                    }
                } else {
                    console.log(`⚠️ No session ID found in pageInstances`);
                }
            } else {
                console.log(`⚠️ No pageInstances provided for authentication`);
            }

            // Use authenticated context if available, otherwise create new page
            const page = context ? await context.newPage() : await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Set timeout and navigate
            const timeout = 30000;
            await page.goto(pageUrl, { 
                waitUntil: 'networkidle0',
                timeout 
            });

            // Inject Axe and run analysis
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/axe-core@latest/axe.min.js';
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            });

            // Run Axe with specific rules based on WCAG criteria in pageInstances
            const wcagCriteria = pageInstances.map(instance => instance.requirement_id);
            const axeRules = this.mapWcagCriteriaToAxeRules(wcagCriteria);

            const results = await page.evaluate((rules) => {
                return new Promise((resolve) => {
                    axe.run({
                        rules: rules.length > 0 ? rules.reduce((acc, rule) => {
                            acc[rule] = { enabled: true };
                            return acc;
                        }, {}) : undefined
                    }, (err, results) => {
                        if (err) {
                            console.error('Axe error:', err);
                            resolve({ violations: [] });
                        } else {
                            resolve(results);
                        }
                    });
                });
            }, axeRules);

            console.log(`✅ Axe completed for ${pageUrl}: ${results.violations?.length || 0} violations`);
            
            return {
                violations: results.violations || [],
                passes: results.passes || [],
                tool: 'axe-core',
                pageUrl,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Axe error for ${pageUrl}:`, error);
            return { violations: [], error: error.message };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Validate authentication by testing a protected page
     */
    async validateAuthContext(storageState, testUrl) {
        const { chromium } = require('playwright');
        const browser = await chromium.launch({ headless: true });
        let isValid = false;
        
        try {
            // Create context with storage state (cookies, localStorage, sessionStorage)
            const context = await browser.newContext({
                storageState: {
                    cookies: storageState.cookies || [],
                    localStorage: storageState.localStorage || [],
                    sessionStorage: storageState.sessionStorage || []
                }
            });
            
            const page = await context.newPage();
            
            console.log(`🔍 Validating auth by testing: ${testUrl}`);
            console.log(`🔍 Using ${storageState.cookies?.length || 0} cookies for validation`);
            
            // Navigate and wait for page to stabilize
            const response = await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 15000 });
            
            const currentUrl = page.url();
            const pageTitle = await page.title();
            const responseStatus = response?.status() || 'unknown';
            
            console.log(`🔍 Validation response: ${responseStatus}, Final URL: ${currentUrl}`);
            console.log(`🔍 Page title: "${pageTitle}"`);
            
            const isRedirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('/signin');
            const hasLoginContent = await page.locator('input[type="password"], input[name*="password"], form[action*="login"]').count() > 0;
            
            if (isRedirectedToLogin || hasLoginContent) {
                console.log(`❌ Auth validation failed - ${isRedirectedToLogin ? 'redirected to login' : 'login form detected'}`);
                isValid = false;
            } else {
                console.log(`✅ Auth validation successful - authenticated page loaded`);
                isValid = true;
            }
            
        } catch (error) {
            console.log(`❌ Auth validation error: ${error.message}`);
            isValid = false;
        } finally {
            await browser.close();
        }
        
        return isValid;
    }

    /**
     * Perform interactive authentication by opening a browser for manual login
     * This method only opens the browser and stores the session - completion happens via UI
     */
    async performInteractiveAuthentication(sessionId) {
        console.log(`🔐 Starting interactive authentication for session: ${sessionId}`);
        
        try {
            // Check if there's already an active session for this sessionId
            if (this.interactiveAuthSessions.has(sessionId)) {
                console.log(`🔐 Interactive auth session already active for ${sessionId}`);
                return { success: true, message: 'Browser already open for authentication' };
            }
            
            // Get session details
            const sessionResult = await pool.query(`
                SELECT ts.project_id, p.primary_url, p.name as project_name
                FROM test_sessions ts 
                JOIN projects p ON ts.project_id = p.id 
                WHERE ts.id = $1
            `, [sessionId]);
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Session ${sessionId} not found`);
            }
            
            const session = sessionResult.rows[0];
            const loginUrl = session.primary_url;
            
            console.log(`🔐 Opening browser for manual login to: ${loginUrl}`);
            console.log(`🔐 Project: ${session.project_name}`);
            
            // Launch browser in non-headless mode
            const { chromium } = require('playwright');
            const browser = await chromium.launch({ 
                headless: false,
                slowMo: 1000  // Slow down actions for better UX
            });
            
            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            const page = await context.newPage();
            
            // Navigate to login page
            console.log(`🌐 Navigating to: ${loginUrl}`);
            await page.goto(loginUrl, { waitUntil: 'networkidle' });
            
            // Store the browser session for later completion
            this.interactiveAuthSessions.set(sessionId, {
                browser,
                context,
                page,
                session,
                loginUrl,
                startedAt: new Date().toISOString()
            });
            
            // Display instructions to user (like crawler does)
            console.log(`\n🔐 INTERACTIVE AUTHENTICATION MODE`);
            console.log(`================================================`);
            console.log(`📱 A browser window has opened for manual login`);
            console.log(`👤 Please complete the following steps:`);
            console.log(`   1. Log in using your credentials in the browser window`);
            console.log(`   2. Click 'Successfully Logged In' button in the UI when done`);
            console.log(`   3. DO NOT close the browser - it will close automatically`);
            console.log(`================================================\n`);
            
            return {
                success: true,
                message: 'Browser opened for interactive authentication',
                instructions: 'Please log in to the opened browser window, then click "Successfully Logged In" in the UI'
            };
            
        } catch (error) {
            console.error(`❌ Interactive authentication setup failed:`, error.message);
            throw error;
        }
    }

    /**
     * Complete interactive authentication after user confirms login via UI
     */
    async completeInteractiveAuthentication(sessionId) {
        console.log(`🔐 Completing interactive authentication for session: ${sessionId}`);
        
        try {
            // Get the stored browser session
            const authSession = this.interactiveAuthSessions.get(sessionId);
            if (!authSession) {
                throw new Error(`No active interactive authentication session found for ${sessionId}`);
            }
            
            const { browser, context, page, session } = authSession;
            
            // Capture the authentication state
            console.log(`📦 Capturing authentication state...`);
            const storageState = await context.storageState();
            
            // Test authentication by checking current URL
            const currentUrl = page.url();
            console.log(`🔍 Current URL after login: ${currentUrl}`);
            
            // Extract cookies for database storage
            const cookies = storageState.cookies || [];
            console.log(`🍪 Captured ${cookies.length} cookies`);
            
            // Save authentication session to database
            const authSessionResult = await pool.query(`
                INSERT INTO crawler_auth_sessions (
                    crawler_id, cookies, is_active, created_at, last_used_at, storage_state
                ) VALUES (
                    (SELECT id FROM web_crawlers WHERE project_id = $1 LIMIT 1),
                    $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3
                ) RETURNING id
            `, [session.project_id, JSON.stringify(cookies), JSON.stringify(storageState)]);
            
            const authSessionId = authSessionResult.rows[0]?.id;
            console.log(`💾 Saved authentication session with ID: ${authSessionId}`);
            
            // Clean up browser
            await browser.close();
            
            // Remove from active sessions
            this.interactiveAuthSessions.delete(sessionId);
            
            // Return the captured authentication data
            return {
                success: true,
                storageState,
                cookies,
                authSessionId,
                cookieCount: cookies.length,
                currentUrl,
                capturedAt: new Date().toISOString(),
                authenticationComplete: true,
                message: 'Authentication captured successfully. Ready to run tests.'
            };
            
        } catch (error) {
            console.error(`❌ Interactive authentication completion failed:`, error.message);
            
            // Clean up on error
            const authSession = this.interactiveAuthSessions.get(sessionId);
            if (authSession) {
                try {
                    await authSession.browser.close();
                } catch (cleanupError) {
                    console.error(`❌ Error cleaning up browser:`, cleanupError);
                }
                this.interactiveAuthSessions.delete(sessionId);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Wait for user input in terminal
     */
    async waitForUserInput(message) {
        return new Promise((resolve) => {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question(message + ' ', () => {
                rl.close();
                resolve();
            });
        });
    }

    /**
     * Get authentication context for a session
     */
    async getAuthContextForSession(sessionId, useInteractiveAuth = false) {
        if (!sessionId) return null;
        
        // If interactive auth is requested, use the interactive login flow
        if (useInteractiveAuth) {
            const result = await this.performInteractiveAuthentication(sessionId);
            // Return special "pending" result to pause automation until UI completion
            return {
                isPending: true,
                message: result.message,
                sessionId: sessionId,
                authType: 'interactive'
            };
        }
        
        try {
            // Get the test session's project and find crawler auth sessions
            const sessionResult = await pool.query(`
                SELECT ts.project_id, p.primary_url 
                FROM test_sessions ts 
                JOIN projects p ON ts.project_id = p.id 
                WHERE ts.id = $1
            `, [sessionId]);
            
            if (sessionResult.rows.length === 0) {
                console.log(`⚠️ No session found for ID: ${sessionId}`);
                return null;
            }
            
            const session = sessionResult.rows[0];
            
            // Look for active crawler authentication sessions for this project
            const crawlerAuthResult = await pool.query(`
                SELECT cas.*, wc.name as crawler_name, wc.base_url
                FROM crawler_auth_sessions cas
                JOIN web_crawlers wc ON cas.crawler_id = wc.id
                WHERE wc.project_id = $1 
                AND cas.is_active = true
                AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
                AND cas.cookies IS NOT NULL
                AND jsonb_array_length(cas.cookies) > 0
                ORDER BY cas.created_at DESC, cas.last_used_at DESC
                LIMIT 1
            `, [session.project_id]);
            
            if (crawlerAuthResult.rows.length > 0) {
                const crawlerAuthSession = crawlerAuthResult.rows[0];
                console.log(`🔐 Found crawler auth session for project ${session.project_id}: ${crawlerAuthSession.crawler_name} (${crawlerAuthSession.cookies ? crawlerAuthSession.cookies.length : 0} cookies)`);
                
                // Create storage state from crawler session data
                const storageState = {
                    cookies: crawlerAuthSession.cookies || [],
                    localStorage: crawlerAuthSession.local_storage || [],
                    sessionStorage: crawlerAuthSession.session_storage || []
                };
                
                console.log(`🔐 Using ${storageState.cookies.length} cookies from crawler session`);
                
                // Validate authentication with a test URL from the project
                const testUrl = crawlerAuthSession.base_url || session.primary_url;
                if (testUrl) {
                    console.log(`🔍 Validating authentication context...`);
                    const isValid = await this.validateAuthContext(storageState, testUrl);
                    
                    if (!isValid) {
                        console.log(`❌ Crawler auth session is expired/invalid. User should refresh session capture.`);
                        console.log(`💡 Suggestion: Re-run session capture in web crawler to refresh authentication`);
                        return null; // Return null to indicate auth failure
                    } else {
                        console.log(`✅ Crawler auth session validated successfully`);
                    }
                }
                
                return storageState;
            } else {
                console.log(`⚠️ No active crawler auth sessions found for project ${session.project_id}`);
                return null;
            }
        } catch (error) {
            console.log(`❌ Error fetching auth config: ${error.message}`);
            return null;
        }
    }

    /**
     * Run Pa11y against a specific page
     */
    async runPa11yAgainstPage(pageUrl, pageInstances, useInteractiveAuth = false) {
        try {
            console.log(`🔧 Running Pa11y against: ${pageUrl}`);
            
            // Get authentication context if available
            let authContext = null;
            if (pageInstances && pageInstances.length > 0) {
                const sessionId = pageInstances[0].session_id;
                if (sessionId) {
                    authContext = await this.getAuthContextForSession(sessionId, useInteractiveAuth);
                    
                    // Handle interactive auth pending state
                    if (authContext && authContext.isPending) {
                        console.log(`🔐 Interactive authentication pending - stopping Pa11y automation`);
                        console.log(`🔐 Please complete login in browser and click "Successfully Logged In" in UI`);
                        return {
                            error: 'Interactive authentication pending',
                            message: 'Please complete login in browser window and click "Successfully Logged In" button',
                            isPending: true
                        };
                    }
                }
            }
            
            // Configure Pa11y for specific WCAG criteria
            const wcagCriteria = pageInstances.map(instance => instance.requirement_id);
            const pa11yRules = this.mapWcagCriteriaToPa11yRules(wcagCriteria);

            const options = {
                timeout: 30000,
                chromeLaunchConfig: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ]
                },
                rules: pa11yRules.length > 0 ? pa11yRules : undefined
            };

            // Add authentication if available
            if (authContext) {
                console.log(`🔐 Using authenticated context for Pa11y`);
                options.chromeLaunchConfig.storageState = authContext;
            }

            const results = await pa11y(pageUrl, options);
            
            const violations = results.issues ? results.issues.filter(issue => issue.type === 'error') : [];
            
            console.log(`✅ Pa11y completed for ${pageUrl}: ${violations.length} violations`);
            
            return {
                violations: violations,
                tool: 'pa11y',
                pageUrl,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Pa11y error for ${pageUrl}:`, error);
            return { violations: [], error: error.message };
        }
    }

    /**
     * Run Contrast Analyzer against a specific page
     */
    async runContrastAnalyzerAgainstPage(pageUrl, pageInstances, useInteractiveAuth = false) {
        try {
            console.log(`🎨 Running contrast analyzer against page: ${pageUrl}`);
            
            // Get authentication context if available
            let authContext = null;
            if (pageInstances && pageInstances.length > 0) {
                const sessionId = pageInstances[0].session_id;
                if (sessionId) {
                    authContext = await this.getAuthContextForSession(sessionId, useInteractiveAuth);
                    
                    // Handle interactive auth pending state
                    if (authContext && authContext.isPending) {
                        console.log(`🔐 Interactive authentication pending - stopping Contrast Analyzer automation`);
                        console.log(`🔐 Please complete login in browser and click "Successfully Logged In" in UI`);
                        return {
                            error: 'Interactive authentication pending',
                            message: 'Please complete login in browser window and click "Successfully Logged In" button',
                            isPending: true
                        };
                    }
                }
            }
            
            const ContrastAnalyzer = require('../../scripts/contrast-analyzer.js');
            const analyzer = new ContrastAnalyzer();
            
            // Determine WCAG level based on page instances
            const wcagCriteria = pageInstances.map(instance => instance.requirement_id);
            const hasAAARequirements = wcagCriteria.some(criterion => 
                criterion === '1.4.6' || criterion === '1.4.11'
            );
            
            const analysisOptions = {
                level: hasAAARequirements ? 'AAA' : 'AA',
                includeAAA: hasAAARequirements,
                analyzeBackgroundImages: true,
                analyzeGradients: true,
                captureScreenshots: false
            };
            
            // Add authentication if available
            if (authContext) {
                console.log(`🔐 Using authenticated context for Contrast Analyzer`);
                analysisOptions.authContext = authContext;
            }
            
            const contrastResults = await analyzer.analyzeContrast(pageUrl, analysisOptions);
            
            const violations = contrastResults.violations || [];
            const passes = contrastResults.passes || [];
            
            console.log(`✅ Contrast analyzer completed for ${pageUrl}: ${violations.length} violations, ${passes.length} passes`);
            
            return {
                violations: violations,
                passes: passes,
                tool: 'contrast-analyzer',
                pageUrl,
                timestamp: new Date().toISOString(),
                analysisOptions: analysisOptions,
                statistics: contrastResults.statistics || {}
            };
            
        } catch (error) {
            console.error(`❌ Contrast analyzer error for ${pageUrl}:`, error);
            return { 
                violations: [], 
                passes: [],
                error: error.message,
                tool: 'contrast-analyzer',
                pageUrl,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Run Lighthouse against a specific page
     */
    async runLighthouseAgainstPage(pageUrl, pageInstances, useInteractiveAuth = false) {
        let chrome;
        try {
            console.log(`🔧 Running Lighthouse against: ${pageUrl}`);
            
            // Get authentication context if available
            let authContext = null;
            if (pageInstances && pageInstances.length > 0) {
                const sessionId = pageInstances[0].session_id;
                if (sessionId) {
                    authContext = await this.getAuthContextForSession(sessionId, useInteractiveAuth);
                    
                    // Handle interactive auth pending state
                    if (authContext && authContext.isPending) {
                        console.log(`🔐 Interactive authentication pending - stopping Lighthouse automation`);
                        console.log(`🔐 Please complete login in browser and click "Successfully Logged In" in UI`);
                        return {
                            error: 'Interactive authentication pending',
                            message: 'Please complete login in browser window and click "Successfully Logged In" button',
                            isPending: true
                        };
                    }
                }
            }
            
            // Dynamic import for Lighthouse (ES module)
            if (!this.lighthouse) {
                this.lighthouse = (await import('lighthouse')).default;
            }
            const chromeLauncher = require('chrome-launcher');

            // Prepare Chrome flags
            const chromeFlags = ['--headless', '--no-sandbox', '--disable-setuid-sandbox'];
            
            // Add authentication if available
            if (authContext) {
                console.log(`🔐 Using authenticated context for Lighthouse`);
                // For Lighthouse, we need to use a different approach for authentication
                // We'll use Puppeteer to set up the authenticated session first
                const puppeteer = require('puppeteer');
                const browser = await puppeteer.launch({ headless: false, slowMo: 250 }); // DEBUG MODE
                const context = await browser.createBrowserContext({
                    storageState: authContext
                });
                const page = await context.newPage();
                
                // Navigate to the page with authentication
                await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 });
                
                // Get the authenticated cookies
                const cookies = await page.context().cookies();
                await browser.close();
                
                // Add cookies to Chrome flags
                const cookieArgs = cookies.map(cookie => 
                    `--cookie="${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}"`
                );
                chromeFlags.push(...cookieArgs);
            }

            chrome = await chromeLauncher.launch({ 
                chromeFlags: chromeFlags
            });
            
            const lighthouseResults = await this.lighthouse(pageUrl, {
                port: chrome.port,
                onlyCategories: ['accessibility'],
                logLevel: 'error',
                output: 'json'
            });

            const accessibilityScore = lighthouseResults.lhr.categories.accessibility.score * 100;
            const audits = lighthouseResults.lhr.audits;
            
            // Extract failed accessibility audits as violations
            const violations = Object.values(audits)
                .filter(audit => audit.score !== null && audit.score < 1 && audit.details)
                .map(audit => ({
                    id: audit.id,
                    title: audit.title,
                    description: audit.description,
                    score: audit.score,
                    details: audit.details,
                    helpText: audit.helpText,
                    helpUrl: audit.helpUrl
                }));

            console.log(`✅ Lighthouse completed for ${pageUrl}: ${accessibilityScore}% score, ${violations.length} violations`);
            
            return {
                violations: violations,
                passes: Object.values(audits).filter(audit => audit.score === 1),
                tool: 'lighthouse',
                pageUrl,
                accessibilityScore,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Lighthouse error for ${pageUrl}:`, error);
            return { violations: [], error: error.message };
        } finally {
            if (chrome) {
                await chrome.kill();
            }
        }
    }

    /**
     * Map WCAG criteria to Axe rules - CRITICAL for filtering violations
     */
    mapWcagCriteriaToAxeRules(wcagCriteria) {
        const wcagToAxeMapping = {
            '1.1.1': ['image-alt', 'input-image-alt', 'area-alt', 'svg-img-alt'],
            '1.2.1': ['audio-caption', 'video-caption'],
            '1.2.2': ['video-caption'],
            '1.2.3': ['audio-description', 'video-description'],
            '1.3.1': ['heading-order', 'list', 'definition-list', 'table-headers'],
            '1.3.2': ['css-orientation-lock'],
            '1.3.3': ['color-contrast'],
            '1.3.4': ['meta-viewport'],
            '1.3.5': ['label', 'autocomplete-valid'],
            '1.4.1': ['color-contrast'],
            '1.4.2': ['audio-control'],
            '1.4.3': ['color-contrast'],
            '1.4.4': ['meta-viewport-large'],
            '1.4.5': ['color-contrast-enhanced'],
            '1.4.10': ['meta-viewport', 'css-orientation-lock'],
            '1.4.11': ['color-contrast'],
            '1.4.12': ['meta-viewport', 'css-orientation-lock'],
            '1.4.13': ['color-contrast'],
            '2.1.1': ['keyboard', 'keyboard-no-exception'],
            '2.1.2': ['keyboard-no-exception'],
            '2.1.4': ['keyboard'],
            '2.4.1': ['bypass', 'skip-link'],
            '2.4.2': ['document-title'],
            '2.4.3': ['tabindex', 'focus-order-semantics'],
            '2.4.4': ['link-name'],
            '2.4.5': ['multiple-ways'],
            '2.4.6': ['page-has-heading-one', 'heading-order'],
            '2.4.7': ['focus-order-semantics'],
            '2.5.1': ['pointer-gestures-used'],
            '2.5.2': ['pointer-cancellation'],
            '2.5.3': ['label-content-name-mismatch'],
            '2.5.4': ['motion-actuation'],
            '3.1.1': ['html-has-lang'],
            '3.1.2': ['html-lang-valid'],
            '3.2.1': ['focus'],
            '3.2.2': ['focus'],
            '3.3.1': ['label'],
            '3.3.2': ['label', 'form-field-multiple-labels'],
            '3.3.3': ['error-message'],
            '3.3.4': ['error-message'],
            '4.1.1': ['valid-html'],
            '4.1.2': ['button-name', 'input-button-name', 'link-name'],
            '4.1.3': ['status-messages']
        };

        const axeRules = [];
        wcagCriteria.forEach(criterion => {
            const rules = wcagToAxeMapping[criterion];
            if (rules) {
                axeRules.push(...rules);
            }
        });

        return [...new Set(axeRules)]; // Remove duplicates
    }

    /**
     * Map WCAG criteria to Pa11y rules - CRITICAL for filtering violations
     */
    mapWcagCriteriaToPa11yRules(wcagCriteria) {
        const wcagToPa11yMapping = {
            '1.1.1': ['WCAG2A.Principle1.Guideline1_1.1_1_1'],
            '1.2.1': ['WCAG2A.Principle1.Guideline1_2.1_2_1'],
            '1.2.2': ['WCAG2A.Principle1.Guideline1_2.1_2_2'],
            '1.2.3': ['WCAG2A.Principle1.Guideline1_2.1_2_3'],
            '1.3.1': ['WCAG2A.Principle1.Guideline1_3.1_3_1'],
            '1.3.2': ['WCAG2A.Principle1.Guideline1_3.1_3_2'],
            '1.3.3': ['WCAG2A.Principle1.Guideline1_3.1_3_3'],
            '1.4.1': ['WCAG2A.Principle1.Guideline1_4.1_4_1'],
            '1.4.2': ['WCAG2A.Principle1.Guideline1_4.1_4_2'],
            '1.4.3': ['WCAG2AA.Principle1.Guideline1_4.1_4_3'],
            '1.4.4': ['WCAG2AA.Principle1.Guideline1_4.1_4_4'],
            '1.4.5': ['WCAG2AAA.Principle1.Guideline1_4.1_4_5'],
            '2.1.1': ['WCAG2A.Principle2.Guideline2_1.2_1_1'],
            '2.1.2': ['WCAG2A.Principle2.Guideline2_1.2_1_2'],
            '2.4.1': ['WCAG2A.Principle2.Guideline2_4.2_4_1'],
            '2.4.2': ['WCAG2A.Principle2.Guideline2_4.2_4_2'],
            '2.4.3': ['WCAG2A.Principle2.Guideline2_4.2_4_3'],
            '2.4.4': ['WCAG2A.Principle2.Guideline2_4.2_4_4'],
            '3.1.1': ['WCAG2A.Principle3.Guideline3_1.3_1_1'],
            '3.2.1': ['WCAG2A.Principle3.Guideline3_2.3_2_1'],
            '3.2.2': ['WCAG2A.Principle3.Guideline3_2.3_2_2'],
            '3.3.1': ['WCAG2A.Principle3.Guideline3_3.3_3_1'],
            '3.3.2': ['WCAG2A.Principle3.Guideline3_3.3_3_2'],
            '4.1.1': ['WCAG2A.Principle4.Guideline4_1.4_1_1'],
            '4.1.2': ['WCAG2A.Principle4.Guideline4_1.4_1_2']
        };

        const pa11yRules = [];
        wcagCriteria.forEach(criterion => {
            const rules = wcagToPa11yMapping[criterion];
            if (rules) {
                pa11yRules.push(...rules);
            }
        });

        return [...new Set(pa11yRules)]; // Remove duplicates
    }

    /**
     * Map violations to specific test instances - CRITICAL LOGIC
     * This determines which page × WCAG criterion gets which violation
     */
    async mapViolationsToTestInstances(violations, pageInstances, tool, pageUrl) {
        let updated = 0;
        const updatedInstanceIds = new Set(); // Track which instances were updated with violations

        try {
            console.log(`🔍 DEBUG: Mapping ${violations.length} violations to ${pageInstances.length} test instances`);
            console.log(`🔍 DEBUG: Page instances preview:`, pageInstances.slice(0, 2).map(inst => ({
                test_instance_id: inst.test_instance_id,
                requirement_id: inst.requirement_id,
                criterion_number: inst.criterion_number,
                page_id: inst.page_id,
                url: inst.url
            })));
            
            // Check if criterion_number field is missing from JOIN
            const missingCriterion = pageInstances.filter(inst => !inst.criterion_number);
            if (missingCriterion.length > 0) {
                console.log(`⚠️ WARNING: ${missingCriterion.length} test instances missing criterion_number (JOIN issue)`);
                console.log(`🔍 DEBUG: Sample missing instances:`, missingCriterion.slice(0, 2).map(inst => ({
                    test_instance_id: inst.test_instance_id,
                    requirement_id: inst.requirement_id,
                    criterion_number: inst.criterion_number
                })));
            }

            // Fallback: If any instances are missing criterion_number, try to fetch them
            if (missingCriterion.length > 0) {
                console.log(`🔧 FIXING: Attempting to resolve missing criterion numbers for ${missingCriterion.length} instances`);
                
                for (const instance of missingCriterion) {
                    try {
                        const query = `SELECT requirement_id FROM unified_requirements WHERE id = $1 AND standard_type = 'wcag'`;
                        const result = await pool.query(query, [instance.requirement_id]);
                        
                        if (result.rows.length > 0) {
                            instance.criterion_number = result.rows[0].requirement_id;
                            console.log(`✅ FIXED: Instance ${instance.test_instance_id} criterion_number: ${instance.criterion_number}`);
                        } else {
                            console.log(`❌ UNFIXABLE: No WCAG requirement found for instance ${instance.test_instance_id} requirement_id: ${instance.requirement_id}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error resolving criterion for instance ${instance.test_instance_id}:`, error.message);
                    }
                }
            }

            for (const violation of violations) {
                // Determine which WCAG criteria this violation maps to
                const wcagCriteria = this.mapViolationToWcagCriteria(violation, tool);
                console.log(`🔍 DEBUG: Violation "${violation.id || violation.code}" mapped to WCAG:`, wcagCriteria);
                
                // Find matching test instances for this page and WCAG criteria
                const matchingInstances = pageInstances.filter(instance => {
                    const instanceCriterion = instance.criterion_number; // Use the WCAG string, not UUID
                    const matches = wcagCriteria.includes(instanceCriterion);
                    
                    if (!instanceCriterion) {
                        console.log(`🔍 DEBUG: Instance ${instance.test_instance_id} missing criterion_number, requirement_id: ${instance.requirement_id}`);
                    }
                    
                    return matches;
                });

                console.log(`🔍 DEBUG: Found ${matchingInstances.length} matching instances for WCAG criteria:`, wcagCriteria);

                // Update each matching test instance
                for (const instance of matchingInstances) {
                    const result = {
                        tool: tool,
                        pageUrl: pageUrl,
                        violation: violation,
                        timestamp: new Date().toISOString(),
                        status: violation.impact === 'critical' || violation.impact === 'serious' ? 'failed' : 'human_review'
                    };

                    await this.updateTestInstanceWithResult(instance.test_instance_id, result);
                    updated++;
                    
                    // Track that this instance was updated with a violation
                    updatedInstanceIds.add(instance.test_instance_id);
                    
                    // Log automation change to audit trail
                    await this.logAutomationChange(instance.test_instance_id, tool, violation, result.status);
                    
                    console.log(`📊 Updated test instance ${instance.test_instance_id} (${instance.requirement_id || instance.criterion_number}) with ${tool} violation`);
                }
            }

            // Update all test instances for this page with automation status, but skip ones with violations
            const allInstancesUpdated = await this.updateAllTestInstancesForPage(pageInstances, tool, pageUrl, violations.length > 0, updatedInstanceIds);
            
            console.log(`✅ Mapped ${violations.length} violations to ${updated} test instances for ${pageUrl}`);
            console.log(`✅ Updated ${allInstancesUpdated} total test instances with automation status`);
            return { updated: allInstancesUpdated, violations: violations.length };

        } catch (error) {
            console.error('❌ Error mapping violations to test instances:', error);
            return { updated: 0, violations: violations.length };
        }
    }

    /**
     * Update all test instances for a page with automation status
     */
    async updateAllTestInstancesForPage(pageInstances, tool, pageUrl, hasViolations, excludeInstanceIds = new Set()) {
        let updated = 0;
        
        try {
            console.log(`🔍 Updating all ${pageInstances.length} test instances for page ${pageUrl} with ${tool} automation status`);
            
            for (const instance of pageInstances) {
                // Skip instances that were already updated with violations
                if (excludeInstanceIds.has(instance.test_instance_id)) {
                    console.log(`⏭️ Skipping test instance ${instance.test_instance_id} - already updated with violation result`);
                    continue;
                }
                
                // Check if this instance already has automation results
                const existingResult = instance.result ? 
                    (typeof instance.result === 'string' ? JSON.parse(instance.result) : instance.result) : 
                    null;
                
                // If this instance already has results from this tool, skip it
                if (existingResult && existingResult.tool === tool) {
                    continue;
                }
                
                // Create automation result for this test instance
                const result = {
                    tool: tool,
                    pageUrl: pageUrl,
                    timestamp: new Date().toISOString(),
                    status: 'passed', // Default to passed unless violations are found
                    automation_status: 'completed',
                    message: `Automated test completed by ${tool}. No violations found for this requirement.`
                };
                
                // Update the test instance with automation result
                await this.updateTestInstanceWithResult(instance.test_instance_id, result);
                updated++;
                
                console.log(`✅ Updated test instance ${instance.test_instance_id} (${instance.criterion_number}) with ${tool} automation status: passed`);
            }
            
            console.log(`✅ Updated ${updated} test instances for page ${pageUrl} with ${tool} automation status`);
            return updated;
            
        } catch (error) {
            console.error('❌ Error updating all test instances for page:', error);
            return 0;
        }
    }

    /**
     * Log automation changes to audit trail
     */
    async logAutomationChange(instanceId, tool, violation, status) {
        try {
            const auditQuery = `
                INSERT INTO test_audit_log (
                    test_instance_id, 
                    user_id, 
                    action_type, 
                    change_description,
                    old_value,
                    new_value,
                    timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            `;
            
            const changeDescription = `Automated testing with ${tool} detected violation: ${violation.id || violation.code}`;
            const oldValue = JSON.stringify({ status: 'pending', source: 'manual' });
            const newValue = JSON.stringify({ 
                status: status,
                source: 'automation',
                tool: tool,
                violation_id: violation.id || violation.code,
                violation_description: violation.description || violation.help,
                impact: violation.impact
            });
            
            await pool.query(auditQuery, [
                instanceId,
                null, // NULL for automated system actions
                'automated_test_result',
                changeDescription,
                oldValue,
                newValue
            ]);
            
            console.log(`📝 Logged automation change for instance ${instanceId}: ${tool} - ${violation.id || violation.code}`);
            
        } catch (error) {
            console.error('Error logging automation change to audit trail:', error);
            // Don't fail the automation if audit logging fails
        }
    }

    /**
     * Map a specific violation to WCAG criteria - CRITICAL MAPPING
     */
    mapViolationToWcagCriteria(violation, tool) {
        if (tool === 'axe-core' || tool === 'axe') {
            return this.mapAxeViolationToWcag(violation);
        } else if (tool === 'pa11y') {
            return this.mapPa11yViolationToWcag(violation);
        } else if (tool === 'lighthouse') {
            return this.mapLighthouseViolationToWcag(violation);
        } else if (tool === 'contrast-analyzer') {
            return this.mapContrastAnalyzerViolationToWcag(violation);
        }
        return [];
    }

    /**
     * Map axe-core violations to WCAG criteria
     */
    mapAxeViolationToWcag(violation) {
        const axeToWcagMapping = {
            'image-alt': ['1.1.1'],
            'input-image-alt': ['1.1.1'],
            'area-alt': ['1.1.1'],
            'svg-img-alt': ['1.1.1'],
            'color-contrast': ['1.4.3', '1.4.11'],
            'color-contrast-enhanced': ['1.4.6'],
            'heading-order': ['1.3.1', '2.4.6'],
            'list': ['1.3.1'],
            'table-headers': ['1.3.1'],
            'label': ['3.3.2'],
            'button-name': ['4.1.2'],
            'link-name': ['2.4.4', '4.1.2'],
            'document-title': ['2.4.2'],
            'html-has-lang': ['3.1.1'],
            'html-lang-valid': ['3.1.2'],
            'keyboard': ['2.1.1'],
            'focus-order-semantics': ['2.4.3'],
            'bypass': ['2.4.1'],
            'meta-viewport': ['1.3.4', '1.4.4'],
            'page-has-heading-one': ['2.4.6']
        };

        const ruleId = violation.id || violation.rule;
        return axeToWcagMapping[ruleId] || [];
    }

    /**
     * Map pa11y violations to WCAG criteria
     */
    mapPa11yViolationToWcag(violation) {
        const code = violation.code || '';
        
        // Extract WCAG criterion from Pa11y code
        const wcagMatch = code.match(/(\d+)_(\d+)_(\d+)/);
        if (wcagMatch) {
            return [`${wcagMatch[1]}.${wcagMatch[2]}.${wcagMatch[3]}`];
        }
        
        return [];
    }

    /**
     * Map lighthouse violations to WCAG criteria
     */
    mapLighthouseViolationToWcag(violation) {
        const lighthouseToWcagMapping = {
            'document-title': ['2.4.2'],
            'html-has-lang': ['3.1.1'],
            'html-lang-valid': ['3.1.1'],
            'image-alt': ['1.1.1'],
            'label': ['3.3.2'],
            'link-name': ['2.4.4'],
            'list': ['1.3.1'],
            'listitem': ['1.3.1'],
            'meta-viewport': ['1.3.4'],
            'color-contrast': ['1.4.3'],
            'heading-order': ['2.4.6'],
            'bypass': ['2.4.1']
        };

        const auditId = violation.id;
        return lighthouseToWcagMapping[auditId] || [];
    }

    /**
     * Map contrast analyzer violations to WCAG criteria
     */
    mapContrastAnalyzerViolationToWcag(violation) {
        // Contrast analyzer violations typically map to color contrast criteria
        return ['1.4.3', '1.4.6', '1.4.11'];
    }

    /**
     * Parse and store individual violations for detailed tracking
     */
    async parseAndStoreViolations(automatedResultId, tool, toolResults) {
        try {
            console.log(`🔍 DEBUG: parseAndStoreViolations called for ${tool} result ${automatedResultId}`);
            
            // For now, this is a placeholder - individual violation tracking could be added here
            // The main results are already stored in the automated_test_results table
            
            return true;
        } catch (error) {
            console.error(`❌ Error parsing individual violations for ${tool}:`, error);
            return false;
        }
    }

    /**
     * Update test instance with automation result
     */
    async updateTestInstanceWithResult(testInstanceId, result) {
        try {
            console.log(`🔍 DEBUG: Updating test instance ${testInstanceId} with result:`, {
                tool: result.tool,
                status: result.status,
                pageUrl: result.pageUrl
            });

            const updateQuery = `
                UPDATE test_instances 
                SET 
                    status = $2,
                    test_method_used = 'automated',
                    result = $3,
                    updated_at = CURRENT_TIMESTAMP,
                    notes = COALESCE(notes, '') || $4
                WHERE id = $1
                RETURNING id, status
            `;

            const updateResult = JSON.stringify({
                tool: result.tool,
                pageUrl: result.pageUrl,
                violation: result.violation,
                timestamp: result.timestamp,
                automated: true
            });

            const notes = `\n[${new Date().toISOString()}] Automated ${result.tool} result: ${result.status}`;

            const queryResult = await pool.query(updateQuery, [
                testInstanceId,
                result.status,
                updateResult,
                notes
            ]);

            if (queryResult.rows.length > 0) {
                console.log(`✅ Updated test instance ${testInstanceId} status to ${result.status}`);
                return true;
            } else {
                console.log(`⚠️ No test instance found with ID ${testInstanceId}`);
                return false;
            }

        } catch (error) {
            console.error(`❌ Error updating test instance ${testInstanceId}:`, error);
            return false;
        }
    }
}

module.exports = TestAutomationService; 
