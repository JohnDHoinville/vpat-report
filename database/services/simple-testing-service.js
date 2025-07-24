const { Pool } = require('pg');
const { pool } = require('../config');
const { v4: uuidv4 } = require('uuid');
const ComprehensiveTestRunner = require('../../scripts/comprehensive-test-runner');
const WCAGCriteriaMapper = require('../../scripts/wcag-criteria-mapper');
const AuditTrailService = require('./audit-trail-service');

/**
 * Simple Testing Service
 * Orchestrates automated and manual accessibility testing
 * Integrates with database for session management and result storage
 */
class SimpleTestingService {
    constructor(wsService = null) {
        this.pool = pool;
        this.activeTestSessions = new Map(); // Track running test sessions
        this.auditTrailService = new AuditTrailService(pool);
        this.wcagMapper = new WCAGCriteriaMapper();
        this.wsService = wsService; // WebSocket service for real-time updates
    }

    /**
     * Create a new test session for a project
     * @param {string} projectId - Project UUID
     * @param {Object} sessionData - Session configuration
     * @returns {Object} Created test session
     */
    async createTestSession(projectId, sessionData) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validate project exists
            const projectCheck = await client.query(
                'SELECT id, name FROM projects WHERE id = $1',
                [projectId]
            );
            
            if (projectCheck.rows.length === 0) {
                throw new Error(`Project not found: ${projectId}`);
            }
            
            const project = projectCheck.rows[0];
            
            // Determine testing approach based on session type
            const testingApproach = this.determineTestingApproach(sessionData);
            const approachDetails = this.getApproachDetails(testingApproach);

            // Create test session with authentication configuration and testing approach
            const sessionResult = await client.query(
                `INSERT INTO test_sessions 
                 (project_id, name, description, conformance_level, scope, status, test_type, testing_approach, approach_details, progress_summary, created_by, auth_config_id, auth_role, auth_description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING *`,
                [
                    projectId,
                    sessionData.name || `Test Session - ${new Date().toISOString().split('T')[0]}`,
                    sessionData.description || 'Accessibility testing session',
                    sessionData.conformance_level || 'AA', // Default to WCAG AA
                    JSON.stringify(sessionData.scope || { testType: 'all', tools: 'all' }),  // Convert to proper JSON
                    'planning',
                    sessionData.testType || 'full',
                    testingApproach,
                    JSON.stringify(approachDetails),
                    JSON.stringify({
                        pagesDiscovered: 0,
                        automatedTestsCompleted: 0,
                        manualTestsCompleted: 0,
                        violationsFound: 0,
                        automatedViolations: 0,
                        manualViolations: 0
                    }),
                    sessionData.created_by || '46088230-6133-45e3-8a04-06feea298094', // Default admin user
                    sessionData.auth_config_id || null,
                    sessionData.auth_role || null,
                    sessionData.auth_description || null
                ]
            );
            
            const session = sessionResult.rows[0];
            
            await client.query('COMMIT');
            
            return {
                ...session,
                projectName: project.name
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Start automated testing for a session
     * @param {string} sessionId - Test session UUID
     * @param {Object} options - Testing options
     * @returns {Object} Testing progress information
     */
    async startAutomatedTesting(sessionId, options = {}) {
        const client = await this.pool.connect();
        
        try {
            // Get session and validate
            const sessionResult = await client.query(
                'SELECT * FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Test session not found: ${sessionId}`);
            }
            
            const session = sessionResult.rows[0];
            
            // Get discovered pages for this project from WEB CRAWLERS - filter out non-HTML content
            const pagesResult = await client.query(
                `SELECT cdp.id, cdp.url, cdp.title, cdp.page_type, cdp.depth, cdp.discovered_from, cdp.first_discovered_at as discovered_at
                 FROM crawler_discovered_pages cdp
                 JOIN crawler_runs cr ON cdp.crawler_run_id = cr.id
                 JOIN web_crawlers wc ON cr.crawler_id = wc.id
                 WHERE wc.project_id = $1 AND cr.status = 'completed'
                 AND (cdp.page_type IS NULL OR cdp.page_type IN ('homepage', 'content', 'form', 'navigation', 'application'))
                 AND cdp.status_code BETWEEN 200 AND 299
                 AND NOT (cdp.url ~ '\\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|tar|gz|rar|exe|dmg|pkg|deb|rpm)$')
                 AND NOT (cdp.url ~ '\\.(jpg|jpeg|png|gif|svg|webp|ico|bmp|tiff?)$')
                 AND NOT (cdp.url ~ '\\.(mp3|mp4|wav|avi|mov|wmv|flv|webm|ogg)$')
                 AND NOT (cdp.url ~ '\\.(json|xml|rss|atom|txt|csv|log)$')
                 AND NOT (cdp.url ~ '\\.(css|js|map)$')
                 ORDER BY cdp.first_discovered_at
                 LIMIT $2`,
                [session.project_id, options.maxPages || 50]
            );
            
            const pages = pagesResult.rows;
            
            if (pages.length === 0) {
                throw new Error('No discovered pages found for testing. Please run web crawler first.');
            }
            
            // Update session status
            await client.query(
                'UPDATE test_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['in_progress', sessionId]
            );
            
            // Emit milestone: Testing started
            if (this.wsService) {
                const testTypes = options.testTypes || ['axe', 'pa11y'];
                this.wsService.emitTestingMilestone(sessionId, session.project_id, {
                    type: 'testing_started',
                    message: `Automated testing started with ${testTypes.length} tools on ${pages.length} pages`,
                    testTypes,
                    pageCount: pages.length
                });
            }

            // Start automated testing asynchronously
            this.runAutomatedTests(sessionId, pages, options)
                .catch(error => {
                    console.error(`Automated testing failed for session ${sessionId}:`, error);
                    this.updateSessionStatus(sessionId, 'failed', { error: error.message });
                });
            
            return {
                sessionId,
                status: 'in_progress',
                pagesFound: pages.length,
                testTypes: options.testTypes || ['axe', 'pa11y', 'lighthouse'],
                startedAt: new Date().toISOString()
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Insert a synthetic page into discovered_pages table for single URL tests
     * @param {string} sessionId - Test session UUID
     * @param {string} pageId - Page UUID
     * @param {string} url - Page URL
     * @private
     */
    async insertSyntheticPage(sessionId, pageId, url) {
        const client = await this.pool.connect();
        try {
            // Create a synthetic discovery session for this session
            const discoveryId = uuidv4();
            const projectResult = await client.query(
                'SELECT project_id FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            
            if (projectResult.rows.length > 0) {
                // Extract domain from URL
                const domain = new URL(url).hostname;
                
                // Create synthetic discovery session
                await client.query(
                    `INSERT INTO site_discovery (id, project_id, primary_url, domain, status, total_pages_found, created_at, completed_at)
                     VALUES ($1, $2, $3, $4, 'completed', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     ON CONFLICT (id) DO NOTHING`,
                    [discoveryId, projectResult.rows[0].project_id, url, domain]
                );
                
                // Insert the synthetic page
                await client.query(
                    `INSERT INTO discovered_pages (id, discovery_id, url, page_type, http_status, title, discovered_at)
                     VALUES ($1, $2, $3, 'content', 200, 'Manual Test Page', CURRENT_TIMESTAMP)
                     ON CONFLICT (id) DO NOTHING`,
                    [pageId, discoveryId, url]
                );
            }
            
        } finally {
            client.release();
        }
    }

    /**
     * Run automated tests for all pages in a session
     * @param {string} sessionId - Test session UUID
     * @param {Array} pages - Array of discovered pages
     * @param {Object} options - Testing options
     */
    async runAutomatedTests(sessionId, pages, options = {}) {
        try {
            this.activeTestSessions.set(sessionId, { status: 'running', progress: 0 });
            
            // Handle case where pages is actually a single URL or URL object
            if (!Array.isArray(pages)) {
                if (typeof pages === 'string') {
                    // Single URL string - need to create and insert the page first
                    const pageId = uuidv4();
                    await this.insertSyntheticPage(sessionId, pageId, pages);
                    pages = [{ id: pageId, url: pages, page_type: 'content' }];
                } else if (pages && pages.url) {
                    // URL object - ensure it exists in discovered_pages
                    const pageId = pages.id || uuidv4();
                    await this.insertSyntheticPage(sessionId, pageId, pages.url);
                    pages = [{ id: pageId, url: pages.url, page_type: 'content' }];
                } else {
                    throw new Error('Invalid pages parameter - must be array of page objects or single URL');
                }
            }
            
            const testTypes = options.testTypes || ['axe', 'pa11y', 'lighthouse'];
            const totalTests = pages.length * testTypes.length;
            let completedTests = 0;
            
            // Get project ID for WebSocket broadcasting
            const projectId = await this.getProjectIdFromSession(sessionId);
            
            // Get authentication configuration if specified
            let authConfig = null;
            if (options.auth_config_id) {
                const authResult = await this.pool.query(
                    'SELECT * FROM auth_configs WHERE id = $1 AND status = $2',
                    [options.auth_config_id, 'active']
                );
                
                if (authResult.rows.length > 0) {
                    authConfig = authResult.rows[0];
                    console.log(`🔐 Using authentication configuration: ${authConfig.name} (${authConfig.auth_role})`);
                }
            }
            
            // Create test runner with authentication
            const runnerOptions = {
                testTypes: testTypes.map(type => `a11y:${type}`),
                headless: true,
                timeout: 30000
            };
            
            // Add authentication configuration if available
            if (authConfig) {
                runnerOptions.useAuth = true;
                runnerOptions.authConfig = {
                    loginUrl: authConfig.login_page,
                    username: authConfig.username,
                    password: authConfig.password,
                    successUrl: authConfig.success_url,
                    usernameSelector: authConfig.username_selector || 'input[name="email"], input[name="username"]',
                    passwordSelector: authConfig.password_selector || 'input[name="password"]',
                    submitSelector: authConfig.submit_selector || 'button[type="submit"]'
                };
            }
            
            const runner = new ComprehensiveTestRunner(runnerOptions);
            
            for (const page of pages) {
                for (const toolName of testTypes) {
                    try {
                        console.log(`Running ${toolName} test for: ${page.url} ${authConfig ? `(as ${authConfig.auth_role})` : ''}`);
                        
                        // Run single test
                        const result = await runner.runSingleTest(page.url, `a11y:${toolName}`);
                        
                        // Store result in database with authentication info
                        await this.storeAutomatedTestResult(sessionId, page.id, toolName, result, {
                            auth_config_id: options.auth_config_id,
                            auth_role: options.auth_role
                        });
                        
                        completedTests++;
                        const progress = Math.round((completedTests / totalTests) * 100);
                        
                        // Update progress
                        await this.updateSessionProgress(sessionId, {
                            automatedTestsCompleted: completedTests,
                            totalAutomatedTests: totalTests,
                            progress: progress
                        });
                        
                        this.activeTestSessions.set(sessionId, { 
                            status: 'running', 
                            progress,
                            currentPage: page.url,
                            currentTool: toolName,
                            authRole: options.auth_role
                        });
                        
                        // Emit real-time progress via WebSocket
                        if (this.wsService) {
                            this.wsService.emitSessionProgress(sessionId, projectId, {
                                stage: 'automated_testing',
                                percentage: progress,
                                currentPage: page.url,
                                currentTool: toolName,
                                completedTests,
                                totalTests,
                                message: `Testing ${page.url} with ${toolName} (${completedTests}/${totalTests})`
                            });
                            
                            // Emit milestone events at key progress points
                            if (progress === 25) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_quarter_complete',
                                    message: '25% of testing completed',
                                    progress: 25
                                });
                            } else if (progress === 50) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_half_complete',
                                    message: 'Halfway through testing!',
                                    progress: 50
                                });
                            } else if (progress === 75) {
                                this.wsService.emitTestingMilestone(sessionId, projectId, {
                                    type: 'testing_three_quarter_complete',
                                    message: '75% of testing completed',
                                    progress: 75
                                });
                            }
                        }
                        
                    } catch (error) {
                        console.error(`Test failed for ${page.url} with ${toolName}:`, error);
                        
                        // Store error result
                        await this.storeAutomatedTestResult(sessionId, page.id, toolName, {
                            tool: toolName,
                            status: 'failed',
                            error: error.message,
                            violations: 0,
                            passes: 0
                        });
                        
                        completedTests++;
                    }
                }
            }
            
            // Calculate final violation summary
            const violationSummary = await this.calculateSessionViolationSummary(sessionId);
            
            // Mark session as completed with final violation counts
            await this.updateSessionStatus(sessionId, 'completed', {
                automatedTestsCompleted: completedTests,
                totalAutomatedTests: totalTests,
                violationsFound: violationSummary.totalViolations,
                automatedViolations: violationSummary.automatedViolations,
                manualViolations: violationSummary.manualViolations,
                passesFound: violationSummary.totalPasses,
                warningsFound: violationSummary.totalWarnings
            });
            
            // Emit completion event via WebSocket
            if (this.wsService) {
                this.wsService.emitSessionComplete(sessionId, projectId, {
                    status: 'completed',
                    automatedTestsCompleted: completedTests,
                    totalAutomatedTests: totalTests,
                    totalPages: pages.length,
                    message: `Automated testing completed! Tested ${pages.length} pages with ${testTypes.length} tools`
                });
            }
            
            this.activeTestSessions.delete(sessionId);
            
            console.log(`✅ Automated testing completed for session ${sessionId}`);
            
        } catch (error) {
            await this.updateSessionStatus(sessionId, 'failed', { error: error.message });
            this.activeTestSessions.delete(sessionId);
            throw error;
        }
    }

    /**
     * Store automated test result in database
     * @param {string} sessionId - Test session UUID
     * @param {string} pageId - Page UUID
     * @param {string} toolName - Tool name (axe, pa11y, lighthouse)
     * @param {Object} result - Test result data
     * @param {Object} authInfo - Authentication information (auth_config_id, auth_role)
     */
    async storeAutomatedTestResult(sessionId, pageId, toolName, result, authInfo = {}) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Extract counts from nested result structure
            const testData = result.result || result;  // Handle both nested and flat structures
            const violationsCount = testData.violations || 0;
            const warningsCount = testData.warnings || 0;
            const passesCount = testData.passes || 0;
            const duration = result.duration || testData.duration || 0;

            console.log(`📊 Storing test result - Tool: ${toolName}, Violations: ${violationsCount}, Warnings: ${warningsCount}, Passes: ${passesCount}${authInfo.auth_role ? ` (as ${authInfo.auth_role})` : ''}`);

            // Store main test result with authentication info - use proper UPSERT
            const testResult = await client.query(
                `INSERT INTO automated_test_results 
                 (test_session_id, page_id, tool_name, tool_version, raw_results, 
                  violations_count, warnings_count, passes_count, test_duration_ms, auth_config_id, auth_role)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (test_session_id, page_id, tool_name) DO UPDATE SET
                 tool_version = EXCLUDED.tool_version,
                 raw_results = EXCLUDED.raw_results,
                 violations_count = EXCLUDED.violations_count,
                 warnings_count = EXCLUDED.warnings_count,
                 passes_count = EXCLUDED.passes_count,
                 test_duration_ms = EXCLUDED.test_duration_ms,
                 auth_config_id = EXCLUDED.auth_config_id,
                 auth_role = EXCLUDED.auth_role,
                 executed_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [
                    sessionId,
                    pageId,
                    toolName,
                    result.tool_version || testData.tool_version || '1.0',
                    result,
                    violationsCount,
                    warningsCount,
                    passesCount,
                    duration,
                    authInfo.auth_config_id,
                    authInfo.auth_role
                ]
            );
            
            const testResultId = testResult.rows[0].id;
            
            // Store violations if any - check both nested and flat structures
            const detailedViolations = testData.detailedViolations || result.detailedViolations || [];
            
            if (detailedViolations && detailedViolations.length > 0) {
                console.log(`💾 Storing ${detailedViolations.length} detailed violations for ${toolName}`);
                
                for (const violation of detailedViolations) {
                    await client.query(
                        `INSERT INTO violations 
                         (automated_result_id, violation_type, severity, wcag_criterion, 
                          element_selector, element_html, description, remediation_guidance, help_url)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [
                            testResultId,
                            violation.id || 'unknown',
                            violation.impact || 'moderate',
                            (violation.wcagCriteria && violation.wcagCriteria[0]) || null,
                            violation.nodes && violation.nodes[0] ? violation.nodes[0].target?.join(', ') : null,
                            violation.nodes && violation.nodes[0] ? violation.nodes[0].html : null,
                            violation.description || violation.help,
                            violation.help,
                            violation.helpUrl
                        ]
                    );
                }
            } else {
                console.log(`ℹ️  No detailed violations found for ${toolName} (violations count: ${violationsCount})`);
            }
            
            // ===========================
            // CREATE TEST INSTANCES
            // ===========================
            
            // Commit the automated test result first to ensure it's saved
            await client.query('COMMIT');
            
            console.log(`🔗 Creating test instances for ${toolName} automated results...`);
            
            // Create test instances in a separate transaction to avoid rollback issues
            try {
                await this.createTestInstancesFromAutomatedResult(
                    client, 
                    sessionId, 
                    pageId, 
                    testResultId, 
                    toolName, 
                    result,
                    violationsCount,
                    testResult.rows[0] // Pass the automated result record for audit trail
                );
            } catch (testInstanceError) {
                console.error(`⚠️ Failed to create test instances, but automated result saved:`, testInstanceError.message);
                // Don't throw the error - the automated result was saved successfully
            }
            
        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                // Transaction might already be committed, ignore rollback error
                console.log(`ℹ️ Rollback not needed (transaction already committed)`);
            }
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Create test instances from automated test results with proper WCAG mapping
     * @private
     */
    async createTestInstancesFromAutomatedResult(client, sessionId, pageId, testResultId, toolName, result, violationsCount, automatedResult = null) {
        try {
            console.log(`🔗 Processing ${toolName} results for test instances...`);
            
            const violations = this.extractViolationsFromResult(result);
            const processedRequirements = new Set();
            
            // Process violations (failed tests) - handle transaction aborts
            for (const violation of violations) {
                const wcagCriteria = this.extractWCAGCriteriaFromViolation(violation);
                
                for (const criterion of wcagCriteria) {
                    const requirementKey = `${criterion}-${pageId}`;
                    if (processedRequirements.has(requirementKey)) continue;
                    
                    try {
                        await this.createTestInstanceForRequirement(
                            client,
                            sessionId,
                            pageId,
                            criterion,
                            'failed',
                            toolName,
                            testResultId,
                            violation,
                            automatedResult
                        );
                        
                        processedRequirements.add(requirementKey);
                    } catch (error) {
                        console.error(`❌ Error creating test instance for ${criterion}: ${error.message}`);
                        
                        // If transaction is aborted, we need to restart the transaction
                        if (error.code === '25P02') {
                            console.error(`🔄 Transaction aborted for ${criterion}, restarting transaction block`);
                            await client.query('ROLLBACK');
                            await client.query('BEGIN');
                            // Continue with next criteria - don't throw here
                            continue;
                        }
                        // For other errors, continue processing other criteria
                    }
                }
            }
            
            // Process passes (successful tests) for criteria that weren't violated
            const testedCriteria = this.getTestedCriteriaForTool(toolName, result);
            
            for (const criterion of testedCriteria) {
                const requirementKey = `${criterion}-${pageId}`;
                if (processedRequirements.has(requirementKey)) continue;
                
                // Only create passed test instance if this criterion wasn't violated
                const hasViolation = violations.some(v => 
                    this.extractWCAGCriteriaFromViolation(v).includes(criterion)
                );
                
                if (!hasViolation) {
                    try {
                        await this.createTestInstanceForRequirement(
                            client,
                            sessionId,
                            pageId,
                            criterion,
                            'passed',
                            toolName,
                            testResultId,
                            null,
                            automatedResult
                        );
                        
                        processedRequirements.add(requirementKey);
                    } catch (error) {
                        console.error(`❌ Error creating test instance for ${criterion}: ${error.message}`);
                        
                        // If transaction is aborted, restart the transaction
                        if (error.code === '25P02') {
                            console.error(`🔄 Transaction aborted for ${criterion}, restarting transaction block`);
                            await client.query('ROLLBACK');
                            await client.query('BEGIN');
                            // Continue with next criteria - don't throw here
                            continue;
                        }
                        // For other errors, continue processing other criteria
                    }
                }
            }
            
            console.log(`✅ Created test instances for ${processedRequirements.size} requirements from ${toolName} results`);
            
        } catch (error) {
            console.error(`❌ Error creating test instances from automated result:`, error);
            throw error;
        }
    }

    /**
     * Create a test instance for a specific requirement with full audit trail
     * @private
     */
    async createTestInstanceForRequirement(client, sessionId, pageId, wcagCriterion, status, toolName, testResultId, violationData, automatedResult = null) {
        try {
            // Find the requirement ID for this WCAG criterion
            const requirementQuery = await client.query(
                `SELECT id FROM test_requirements 
                 WHERE requirement_type = 'wcag' AND criterion_number = $1 AND is_active = true`,
                [wcagCriterion]
            );
            
            if (requirementQuery.rows.length === 0) {
                console.log(`⚠️  No requirement found for WCAG ${wcagCriterion}, skipping test instance creation`);
                return;
            }
            
            const requirementId = requirementQuery.rows[0].id;
            
            // testResultId should always be valid now due to proper conflict handling
            
            // Check if test instance already exists
            const existingQuery = await client.query(
                `SELECT id FROM test_instances 
                 WHERE session_id = $1 AND requirement_id = $2 AND page_id = $3`,
                [sessionId, requirementId, pageId]
            );
            
            let testInstanceId;
            
            if (existingQuery.rows.length > 0) {
                // Update existing test instance
                testInstanceId = existingQuery.rows[0].id;
                console.log(`📝 Updating existing test instance ${testInstanceId} for WCAG ${wcagCriterion}`);
                
                // Process with audit trail if available
                if (automatedResult) {
                    await this.auditTrailService.processAutomatedResult(testInstanceId, automatedResult, wcagCriterion);
                } else {
                    // Legacy update without audit trail
                    await client.query(
                        `UPDATE test_instances SET 
                         status = $1, test_method_used = 'automated', tool_used = $2,
                         updated_at = CURRENT_TIMESTAMP
                         WHERE id = $3`,
                        [status, toolName, testInstanceId]
                    );
                }
            } else {
                // Create new test instance
                console.log(`✨ Creating new test instance for WCAG ${wcagCriterion}`);
                
                // Basic evidence for legacy compatibility
                const basicEvidence = violationData ? [{
                    type: 'automated_violation',
                    tool: toolName,
                    violation_id: violationData.id,
                    description: violationData.description || violationData.help,
                    help_url: violationData.helpUrl,
                    impact: violationData.impact,
                    nodes: violationData.nodes || [],
                    created_at: new Date().toISOString()
                }] : [{
                    type: 'automated_pass',
                    tool: toolName,
                    description: `${toolName} automated test passed for WCAG ${wcagCriterion}`,
                    created_at: new Date().toISOString()
                }];
                
                // Create new test instance
                const result = await client.query(
                    `INSERT INTO test_instances (
                        session_id, requirement_id, page_id, status,
                        test_method_used, tool_used, confidence_level,
                        notes, evidence, automated_result_id,
                        started_at, completed_at, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING id`,
                    [
                        sessionId,
                        requirementId,
                        pageId,
                        status,
                        'automated',
                        toolName,
                        'high', // Automated tests have high confidence
                        violationData ? 
                            `Automated ${status} detected by ${toolName}: ${violationData.description || violationData.help}` :
                            `Automated test passed by ${toolName} for WCAG ${wcagCriterion}`,
                        JSON.stringify(basicEvidence),
                        null, // automated_result_id - set to null to avoid foreign key issues for now
                        new Date(), // started_at
                        new Date(), // completed_at
                        new Date(), // created_at
                        new Date()  // updated_at
                    ]
                );
                
                testInstanceId = result.rows[0].id;
                
                // Process with audit trail if available
                if (automatedResult) {
                    await this.auditTrailService.processAutomatedResult(testInstanceId, automatedResult, wcagCriterion, client);
                }
            }
            
            return testInstanceId;
            
        } catch (error) {
            console.error(`❌ Error creating test instance for ${wcagCriterion}: ${error.message}`);
            
            // If transaction is aborted, let the caller handle it
            if (error.code === '25P02') {
                console.error(`🔄 Transaction aborted during test instance creation for ${wcagCriterion}`);
                throw error; // Propagate to caller for transaction restart
            }
            
            // For other errors, we can continue but still throw to let caller handle
            throw error; 
        }
    }

    /**
     * Get WCAG criteria mappings for automated tools
     * @private
     */
    getToolWCAGMappings(toolName) {
        const mappings = {
            'axe': [
                '1.1.1', '1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.3', '1.4.4', '1.4.6', '1.4.12',
                '2.1.1', '2.1.2', '2.1.4', '2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.6', '2.4.7',
                '3.1.1', '3.1.2', '3.2.1', '3.2.2', '3.3.1', '3.3.2', '3.3.3', '3.3.4',
                '4.1.1', '4.1.2', '4.1.3'
            ],
            'pa11y': [
                '1.1.1', '1.3.1', '1.4.1', '1.4.3', '2.1.1', '2.4.1', '2.4.2', '2.4.4', '2.4.6',
                '3.1.1', '3.3.1', '3.3.2', '4.1.1', '4.1.2'
            ],
            'lighthouse': [
                '1.1.1', '1.3.1', '1.4.1', '1.4.3', '1.4.6', '2.1.1', '2.4.1', '2.4.2', '2.4.3',
                '2.4.4', '2.4.6', '2.4.7', '3.1.1', '3.3.2', '4.1.1', '4.1.2'
            ]
        };
        
        return mappings[toolName] || [];
    }

    /**
     * Extract violations from test result based on tool type
     * @private
     */
    extractViolationsFromResult(result) {
        if (!result) return [];
        
        // Handle different tool result formats
        if (result.violations && Array.isArray(result.violations)) {
            // axe-core format
            return result.violations;
        }
        
        if (result.issues && Array.isArray(result.issues)) {
            // pa11y format
            return result.issues;
        }
        
        if (result.audits) {
            // Lighthouse format - extract failed audits
            const violations = [];
            for (const [auditId, audit] of Object.entries(result.audits)) {
                if (audit.score !== null && audit.score < 1 && audit.details) {
                    violations.push({
                        id: auditId,
                        description: audit.description,
                        impact: audit.score < 0.5 ? 'serious' : 'moderate',
                        help: audit.title,
                        tags: audit.scoreDisplayMode === 'binary' ? ['wcag'] : [],
                        nodes: audit.details.items || []
                    });
                }
            }
            return violations;
        }
        
        // If result is directly an array of violations
        if (Array.isArray(result)) {
            return result;
        }
        
        return [];
    }

    /**
     * Extract WCAG criteria from violation data
     * @private
     */
    extractWCAGCriteriaFromViolation(violation) {
        const criteria = [];
        
        // Try different ways to extract WCAG criteria
        if (violation.wcagCriteria && Array.isArray(violation.wcagCriteria)) {
            criteria.push(...violation.wcagCriteria);
        }
        
        if (violation.tags && Array.isArray(violation.tags)) {
            // Look for WCAG criteria in tags (format: wcag21aa, wcag111, etc.)
            violation.tags.forEach(tag => {
                const wcagMatch = tag.match(/wcag(\d)(\d)(\d)/);
                if (wcagMatch) {
                    criteria.push(`${wcagMatch[1]}.${wcagMatch[2]}.${wcagMatch[3]}`);
                }
            });
        }
        
        // Try to extract from rule ID (common patterns)
        if (violation.id) {
            const ruleMappings = this.getRuleToWCAGMappings();
            if (ruleMappings[violation.id]) {
                criteria.push(...ruleMappings[violation.id]);
            }
        }
        
        return [...new Set(criteria)]; // Remove duplicates
    }

    /**
     * Get which WCAG criteria a tool tests for
     * @private
     */
    getTestedCriteriaForTool(toolName, result) {
        // Return the criteria this tool is capable of testing
        // This ensures we create "passed" test instances for criteria that weren't violated
        return this.getToolWCAGMappings(toolName);
    }

    /**
     * Get mapping from tool rule IDs to WCAG criteria
     * @private
     */
    getRuleToWCAGMappings() {
        return {
            // Common axe-core rules
            'color-contrast': ['1.4.3', '1.4.6'],
            'image-alt': ['1.1.1'],
            'label': ['1.3.1', '3.3.2'],
            'link-name': ['2.4.4'],
            'list': ['1.3.1'],
            'heading-order': ['1.3.1'],
            'page-has-heading-one': ['2.4.6'],
            'region': ['1.3.1'],
            'skip-link': ['2.4.1'],
            'html-has-lang': ['3.1.1'],
            'lang': ['3.1.2'],
            'document-title': ['2.4.2'],
            'focus-order-semantics': ['2.4.3'],
            'tabindex': ['2.1.1'],
            'button-name': ['4.1.2'],
            'form-field-multiple-labels': ['3.3.2'],
            
            // Common pa11y rules
            'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': ['1.1.1'],
            'WCAG2AA.Principle1.Guideline1_3.1_3_1.H42': ['1.3.1'],
            'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18': ['1.4.3'],
            'WCAG2AA.Principle2.Guideline2_1.2_1_1.G202': ['2.1.1'],
            'WCAG2AA.Principle2.Guideline2_4.2_4_1.H64.1': ['2.4.1'],
            'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.NoTitleEl': ['2.4.2'],
            'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2': ['3.1.1'],
            'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91': ['4.1.2']
        };
    }

    /**
     * Create manual test result
     * @param {string} sessionId - Test session UUID
     * @param {string} pageId - Page UUID
     * @param {Object} manualResult - Manual test data
     * @returns {Object} Created manual test result
     */
    async createManualTestResult(sessionId, pageId, manualResult) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Validate requirement if provided
            let requirementId = manualResult.requirementId;
            if (manualResult.requirementType === 'wcag' && manualResult.wcagCriterion) {
                const wcagResult = await client.query(
                    'SELECT id FROM wcag_requirements WHERE criterion_number = $1',
                    [manualResult.wcagCriterion]
                );
                if (wcagResult.rows.length > 0) {
                    requirementId = wcagResult.rows[0].id;
                }
            } else if (manualResult.requirementType === 'section_508' && manualResult.section508Criterion) {
                const section508Result = await client.query(
                    'SELECT id FROM section_508_requirements WHERE section_number = $1',
                    [manualResult.section508Criterion]
                );
                if (section508Result.rows.length > 0) {
                    requirementId = section508Result.rows[0].id;
                }
            }
            
            // Create manual test result
            const result = await client.query(
                `INSERT INTO manual_test_results 
                 (test_session_id, page_id, requirement_id, requirement_type, result, 
                  confidence_level, notes, evidence, tester_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    sessionId,
                    pageId,
                    requirementId,
                    manualResult.requirementType || 'wcag',
                    manualResult.result,
                    manualResult.confidenceLevel || 'medium',
                    manualResult.notes,
                    manualResult.evidence || {},
                    manualResult.testerName
                ]
            );
            
            const manualTestResult = result.rows[0];
            
            // If this is a failure, create a violation record
            if (manualResult.result === 'fail') {
                await client.query(
                    `INSERT INTO violations 
                     (manual_result_id, violation_type, severity, wcag_criterion, section_508_criterion,
                      description, remediation_guidance)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        manualTestResult.id,
                        manualResult.violationType || 'manual-finding',
                        manualResult.severity || 'moderate',
                        manualResult.wcagCriterion,
                        manualResult.section508Criterion,
                        manualResult.notes,
                        manualResult.remediationGuidance
                    ]
                );
            }
            
            await client.query('COMMIT');
            
            // Update session progress
            await this.updateSessionProgress(sessionId, {
                manualTestsCompleted: '+1'
            });
            
            return manualTestResult;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get WCAG requirements for manual testing
     * @param {string} level - WCAG level (A, AA, AAA)
     * @param {Array} pageTypes - Page types to filter requirements
     * @returns {Array} WCAG requirements
     */
    async getWCAGRequirements(level = 'AA', pageTypes = ['all']) {
        const client = await this.pool.connect();
        
        try {
            let query = `
                SELECT * FROM wcag_requirements 
                WHERE level IN ('A'${level === 'AA' || level === 'AAA' ? ", 'AA'" : ''}${level === 'AAA' ? ", 'AAA'" : ''})
            `;
            
            if (pageTypes.length > 0 && !pageTypes.includes('all')) {
                query += ` AND (applies_to_page_types @> $1 OR 'all' = ANY(applies_to_page_types))`;
                const result = await client.query(query, [JSON.stringify(pageTypes)]);
                return result.rows;
            } else {
                const result = await client.query(query);
                return result.rows;
            }
            
        } finally {
            client.release();
        }
    }

    /**
     * Get Section 508 requirements for manual testing
     * @param {Array} pageTypes - Page types to filter requirements
     * @returns {Array} Section 508 requirements
     */
    async getSection508Requirements(pageTypes = ['all']) {
        const client = await this.pool.connect();
        
        try {
            let query = 'SELECT * FROM section_508_requirements';
            
            if (pageTypes.length > 0 && !pageTypes.includes('all')) {
                query += ` WHERE applies_to_page_types @> $1 OR 'all' = ANY(applies_to_page_types)`;
                const result = await client.query(query, [JSON.stringify(pageTypes)]);
                return result.rows;
            } else {
                const result = await client.query(query);
                return result.rows;
            }
            
        } finally {
            client.release();
        }
    }

    /**
     * Get test session with detailed results
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Session with results
     */
    async getTestSession(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get session info
            const sessionResult = await client.query(
                `SELECT ts.*, p.name as project_name, p.primary_url 
                 FROM test_sessions ts 
                 JOIN projects p ON ts.project_id = p.id 
                 WHERE ts.id = $1`,
                [sessionId]
            );
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Test session not found: ${sessionId}`);
            }
            
            const session = sessionResult.rows[0];
            
            // Get automated test results summary
            const automatedSummary = await client.query(
                `SELECT 
                    tool_name,
                    COUNT(*) as tests_run,
                    SUM(violations_count) as total_violations,
                    SUM(warnings_count) as total_warnings,
                    SUM(passes_count) as total_passes
                 FROM automated_test_results 
                 WHERE test_session_id = $1 
                 GROUP BY tool_name`,
                [sessionId]
            );
            
            // Get manual test results summary
            const manualSummary = await client.query(
                `SELECT 
                    requirement_type,
                    result,
                    COUNT(*) as count
                 FROM manual_test_results 
                 WHERE test_session_id = $1 
                 GROUP BY requirement_type, result`,
                [sessionId]
            );
            
            // Get violations summary
            const violationsSummary = await client.query(
                `SELECT 
                    severity,
                    COUNT(*) as count
                 FROM violations v
                 LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                 WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
                 GROUP BY severity`,
                [sessionId]
            );
            
            return {
                ...session,
                isActive: this.activeTestSessions.has(sessionId),
                automatedResults: automatedSummary.rows,
                manualResults: manualSummary.rows,
                violationsSummary: violationsSummary.rows
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Get test session results for VPAT generation
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Comprehensive results data
     */
    async getSessionResultsForVPAT(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get session and project info
            const session = await this.getTestSession(sessionId);
            
            // Get detailed automated results
            const automatedResults = await client.query(
                `SELECT atr.*, dp.url, dp.title, dp.page_type
                 FROM automated_test_results atr
                 JOIN discovered_pages dp ON atr.page_id = dp.id
                 WHERE atr.test_session_id = $1
                 ORDER BY dp.url, atr.tool_name`,
                [sessionId]
            );
            
            // Get detailed manual results
            const manualResults = await client.query(
                `SELECT mtr.*, dp.url, dp.title, dp.page_type,
                        wr.criterion_number, wr.title as wcag_title,
                        sr.section_number, sr.title as section_508_title
                 FROM manual_test_results mtr
                 JOIN discovered_pages dp ON mtr.page_id = dp.id
                 LEFT JOIN wcag_requirements wr ON mtr.requirement_id = wr.id AND mtr.requirement_type = 'wcag'
                 LEFT JOIN section_508_requirements sr ON mtr.requirement_id = sr.id AND mtr.requirement_type = 'section_508'
                 WHERE mtr.test_session_id = $1
                 ORDER BY dp.url, wr.criterion_number, sr.section_number`,
                [sessionId]
            );
            
            // Get all violations with context
            const violations = await client.query(
                `SELECT v.*, 
                        atr.tool_name, atr.page_id as automated_page_id,
                        mtr.page_id as manual_page_id,
                        dp.url, dp.title, dp.page_type
                 FROM violations v
                 LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                 LEFT JOIN discovered_pages dp ON (atr.page_id = dp.id OR mtr.page_id = dp.id)
                 WHERE atr.test_session_id = $1 OR mtr.test_session_id = $1
                 ORDER BY v.severity DESC, dp.url`,
                [sessionId]
            );
            
            return {
                session,
                automatedResults: automatedResults.rows,
                manualResults: manualResults.rows,
                violations: violations.rows
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Update session status
     * @param {string} sessionId - Test session UUID
     * @param {string} status - New status
     * @param {Object} metadata - Additional metadata
     */
    async updateSessionStatus(sessionId, status, metadata = {}) {
        const client = await this.pool.connect();
        
        try {
            const updates = ['status = $2'];
            const values = [sessionId, status];
            let paramIndex = 3;

            if (metadata && Object.keys(metadata).length > 0) {
                updates.push(`progress_summary = progress_summary || $${paramIndex++}`);
                values.push(JSON.stringify(metadata));
            }

            // Always update the updated_at timestamp
            updates.push('updated_at = CURRENT_TIMESTAMP');

            const query = `UPDATE test_sessions SET ${updates.join(', ')} WHERE id = $1`;
            await client.query(query, values);
            
        } catch (error) {
            console.error('Error updating session status:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Update session progress
     * @param {string} sessionId - Test session UUID
     * @param {Object} progress - Progress updates
     */
    async updateSessionProgress(sessionId, progress) {
        const client = await this.pool.connect();
        
        try {
            // Handle incremental updates (e.g., '+1' for manualTestsCompleted)
            const updates = {};
            for (const [key, value] of Object.entries(progress)) {
                if (typeof value === 'string' && value.startsWith('+')) {
                    // Incremental update
                    const increment = parseInt(value.substring(1));
                    updates[key] = `COALESCE((progress_summary->>'${key}')::int, 0) + ${increment}`;
                } else {
                    updates[key] = value;
                }
            }
            
            const updateQuery = Object.keys(updates).map(key => 
                typeof updates[key] === 'string' && updates[key].includes('COALESCE') 
                    ? `'${key}', ${updates[key]}` 
                    : `'${key}', ${typeof updates[key] === 'number' ? updates[key] : `'${updates[key]}'`}`
            ).join(', ');
            
            await client.query(
                `UPDATE test_sessions 
                 SET progress_summary = jsonb_build_object(${updateQuery})
                 WHERE id = $1`,
                [sessionId]
            );
            
        } catch (error) {
            console.error('Error updating session progress:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Stop active test session
     * @param {string} sessionId - Test session UUID
     */
    async stopTestSession(sessionId) {
        if (this.activeTestSessions.has(sessionId)) {
            this.activeTestSessions.delete(sessionId);
            await this.updateSessionStatus(sessionId, 'cancelled');
            return true;
        }
        return false;
    }

    /**
     * Delete test session and all results
     * @param {string} sessionId - Test session UUID
     */
    async deleteTestSession(sessionId) {
        // Stop if active
        await this.stopTestSession(sessionId);
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete violations first (they reference results)
            await client.query(
                `DELETE FROM violations 
                 WHERE automated_result_id IN (
                     SELECT id FROM automated_test_results WHERE test_session_id = $1
                 ) OR manual_result_id IN (
                     SELECT id FROM manual_test_results WHERE test_session_id = $1
                 )`,
                [sessionId]
            );
            
            // Delete test results
            await client.query('DELETE FROM automated_test_results WHERE test_session_id = $1', [sessionId]);
            await client.query('DELETE FROM manual_test_results WHERE test_session_id = $1', [sessionId]);
            
            // Delete session
            const result = await client.query('DELETE FROM test_sessions WHERE id = $1', [sessionId]);
            
            await client.query('COMMIT');
            
            return result.rowCount > 0;
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get testing statistics for a project
     * @param {string} projectId - Project UUID
     * @returns {Object} Testing statistics
     */
    async getProjectTestingStats(projectId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    COUNT(DISTINCT ts.id) as total_sessions,
                    COUNT(DISTINCT CASE WHEN ts.status = 'completed' THEN ts.id END) as completed_sessions,
                    COUNT(DISTINCT CASE WHEN ts.status = 'in_progress' THEN ts.id END) as active_sessions,
                    COUNT(atr.id) as total_automated_tests,
                    COUNT(mtr.id) as total_manual_tests,
                    COUNT(v.id) as total_violations,
                    COUNT(DISTINCT CASE WHEN v.severity = 'critical' THEN v.id END) as critical_violations
                FROM test_sessions ts
                LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
                LEFT JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
                LEFT JOIN violations v ON (atr.id = v.automated_result_id OR mtr.id = v.manual_result_id)
                WHERE ts.project_id = $1
            `, [projectId]);
            
            return result.rows[0];
            
        } finally {
            client.release();
        }
    }

    /**
     * Get project ID from session ID
     * @param {string} sessionId - Session UUID
     * @returns {string} Project UUID
     */
    async getProjectIdFromSession(sessionId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT project_id FROM test_sessions WHERE id = $1',
                [sessionId]
            );
            return result.rows[0]?.project_id;
        } finally {
            client.release();
        }
    }

    /**
     * Calculate violation summary for a session
     * @param {string} sessionId - Test session UUID
     * @returns {Object} Violation summary
     */
    async calculateSessionViolationSummary(sessionId) {
        const client = await this.pool.connect();
        
        try {
            // Get summary from automated test results
            const automatedSummary = await client.query(
                `SELECT 
                    SUM(violations_count) as total_violations,
                    SUM(warnings_count) as total_warnings, 
                    SUM(passes_count) as total_passes,
                    COUNT(*) as total_tests
                 FROM automated_test_results 
                 WHERE test_session_id = $1`,
                [sessionId]
            );
            
            // Get count of automated violations from violations table
            const automatedViolationCount = await client.query(
                `SELECT COUNT(*) as automated_violations
                 FROM violations v
                 JOIN automated_test_results atr ON v.automated_result_id = atr.id
                 WHERE atr.test_session_id = $1`,
                [sessionId]
            );
            
            // Get count of manual violations from violations table
            const manualViolationCount = await client.query(
                `SELECT COUNT(*) as manual_violations
                 FROM violations v
                 JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                 WHERE mtr.test_session_id = $1`,
                [sessionId]
            );
            
            const summary = automatedSummary.rows[0];
            const automatedViolations = automatedViolationCount.rows[0];
            const manualViolations = manualViolationCount.rows[0];
            
            const automatedCount = parseInt(automatedViolations.automated_violations) || 0;
            const manualCount = parseInt(manualViolations.manual_violations) || 0;
            const totalViolations = automatedCount + manualCount;
            
            console.log(`📊 Session ${sessionId} summary: ${automatedCount} automated violations, ${manualCount} manual violations, ${summary.total_passes} passes`);
            
            return {
                totalViolations: totalViolations,
                automatedViolations: automatedCount,
                manualViolations: manualCount,
                totalWarnings: parseInt(summary.total_warnings) || 0,
                totalPasses: parseInt(summary.total_passes) || 0,
                totalTests: parseInt(summary.total_tests) || 0
            };
            
        } finally {
            client.release();
        }
    }

    /**
     * Set WebSocket service for real-time updates
     * @param {WebSocketService} wsService - WebSocket service instance
     */
    setWebSocketService(wsService) {
        this.wsService = wsService;
    }

    /**
     * Determine testing approach based on session data
     * @param {Object} sessionData - Session configuration data
     * @returns {string} Testing approach
     */
    determineTestingApproach(sessionData) {
        // If explicitly specified, use that approach
        if (sessionData.testing_approach) {
            return sessionData.testing_approach;
        }

        // Map session types to testing approaches
        if (sessionData.session_type === 'automated') {
            return 'automated_only';
        }
        if (sessionData.session_type === 'manual') {
            return 'manual_only';
        }

        // Map test types to approaches for backward compatibility
        switch (sessionData.testType) {
            case 'automated_only':
                return 'automated_only';
            case 'manual_only':
                return 'manual_only';
            case 'followup':
                return 'manual_only';
            case 'full':
            default:
                return 'hybrid';
        }
    }

    /**
     * Get detailed configuration for a testing approach
     * @param {string} approach - Testing approach type
     * @returns {Object} Approach details configuration
     */
    getApproachDetails(approach) {
        const approachConfigs = {
            automated_only: {
                automated_tools: ['axe', 'pa11y', 'lighthouse'],
                manual_techniques: [],
                coverage_target: 'wcag_aa',
                time_estimate_hours: 2,
                priority_criteria: ['automated_testable'],
                skip_automation_for: [],
                require_manual_for: [],
                description: 'Pure automated testing using accessibility tools'
            },
            manual_only: {
                automated_tools: [],
                manual_techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast', 'focus_management', 'cognitive_assessment'],
                coverage_target: 'wcag_aa',
                time_estimate_hours: 8,
                priority_criteria: ['manual_only', 'complex_interactions', 'cognitive_requirements'],
                skip_automation_for: ['all'],
                require_manual_for: ['all_applicable'],
                description: 'Human-driven accessibility testing with comprehensive evaluation'
            },
            hybrid: {
                automated_tools: ['axe', 'pa11y'],
                manual_techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast'],
                coverage_target: 'wcag_aa',
                time_estimate_hours: 4,
                priority_criteria: ['balanced_coverage'],
                skip_automation_for: [],
                require_manual_for: ['manual_only_criteria'],
                description: 'Balanced automated + manual approach for comprehensive coverage'
            },
            rapid_automated: {
                automated_tools: ['axe'],
                manual_techniques: [],
                coverage_target: 'critical_issues',
                time_estimate_hours: 1,
                priority_criteria: ['critical_violations', 'blocking_issues'],
                skip_automation_for: [],
                require_manual_for: [],
                description: 'Quick automated scan focusing on critical blocking issues'
            },
            comprehensive_manual: {
                automated_tools: ['axe', 'pa11y', 'lighthouse'],
                manual_techniques: ['keyboard_navigation', 'screen_reader', 'color_contrast', 'focus_management', 'cognitive_assessment', 'usability_testing'],
                coverage_target: 'wcag_aaa',
                time_estimate_hours: 16,
                priority_criteria: ['comprehensive_coverage', 'edge_cases', 'user_experience'],
                skip_automation_for: [],
                require_manual_for: ['all_criteria', 'edge_cases', 'user_workflows'],
                description: 'Exhaustive manual testing with automated baseline for certification-level compliance'
            }
        };

        return approachConfigs[approach] || approachConfigs.hybrid;
    }

    /**
     * Update testing approach for an existing session
     * @param {string} sessionId - Session UUID
     * @param {string} approach - New testing approach
     * @param {Object} customDetails - Custom approach details (optional)
     */
    async updateTestingApproach(sessionId, approach, customDetails = null) {
        const client = await this.pool.connect();
        
        try {
            const approachDetails = customDetails || this.getApproachDetails(approach);
            
            const result = await client.query(
                `UPDATE test_sessions 
                 SET testing_approach = $1, 
                     approach_details = $2, 
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3
                 RETURNING *`,
                [approach, JSON.stringify(approachDetails), sessionId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Session not found: ${sessionId}`);
            }

            // Emit WebSocket update if available
            if (this.wsService) {
                const projectId = await this.getProjectIdFromSession(sessionId);
                this.wsService.emitSessionProgress(sessionId, projectId, {
                    type: 'approach_updated',
                    approach: approach,
                    details: approachDetails,
                    message: `Testing approach updated to ${approach.replace('_', ' ')}`
                });
            }

            return result.rows[0];
            
        } finally {
            client.release();
        }
    }
}

module.exports = SimpleTestingService; 