const axeCore = require('axe-core');
const chromeLauncher = require('chrome-launcher');
const pa11y = require('pa11y');
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../../database/config');

/**
 * Automated Test Orchestration Service
 * Implements Task 3.2 from PRD: Automated test execution and integration
 * 
 * Features:
 * - Axe-core accessibility scanning
 * - Pa11y command-line testing
 * - Lighthouse accessibility audits
 * - Intelligent finding-to-requirement mapping
 * - Automatic test status updates
 * - Evidence collection and storage
 */

class TestAutomationService {
    constructor() {
        this.supportedTools = ['axe-core', 'pa11y', 'lighthouse'];
        this.resultsMappings = this.initializeResultsMappings();
    }

    /**
     * Initialize mapping between tool results and WCAG/Section 508 requirements
     */
    initializeResultsMappings() {
        return {
            'axe-core': {
                'color-contrast': ['1.4.3', '1.4.6'],
                'image-alt': ['1.1.1'],
                'document-title': ['2.4.2'],
                'html-has-lang': ['3.1.1'],
                'heading-order': ['1.3.1', '2.4.6'],
                'label': ['3.3.2', '1.3.1'],
                'link-name': ['2.4.4'],
                'list': ['1.3.1'],
                'aria-*': ['4.1.1', '4.1.2'],
                'keyboard': ['2.1.1', '2.1.2'],
                'focus-order-semantics': ['2.4.3', '2.4.7']
            },
            'pa11y': {
                'WCAG2.1.1.1': ['1.1.1'],
                'WCAG2.1.3.1': ['1.3.1'],
                'WCAG2.1.4.3': ['1.4.3'],
                'WCAG2.2.4.2': ['2.4.2'],
                'WCAG2.3.1.1': ['3.1.1'],
                'WCAG2.3.3.2': ['3.3.2'],
                'WCAG2.4.1.1': ['4.1.1'],
                'WCAG2.4.1.2': ['4.1.2']
            },
            'lighthouse': {
                'color-contrast': ['1.4.3'],
                'image-alt': ['1.1.1'],
                'document-title': ['2.4.2'],
                'html-has-lang': ['3.1.1'],
                'heading-order': ['1.3.1'],
                'label': ['3.3.2'],
                'link-name': ['2.4.4']
            }
        };
    }

    /**
     * Run comprehensive automated testing for a specific test session
     */
    async runAutomatedTests(sessionId, options = {}) {
        const {
            tools = ['axe-core', 'pa11y', 'lighthouse'],
            pages = null, // null = all pages, array = specific pages
            updateTestInstances = true,
            createEvidence = true
        } = options;

        console.log(`🤖 Starting automated testing for session ${sessionId}`);

        try {
            // Get session and pages to test
            const sessionData = await this.getSessionData(sessionId, pages);
            if (!sessionData.pages.length) {
                throw new Error('No pages found for testing');
            }

            const results = {
                session_id: sessionId,
                tools_used: tools,
                pages_tested: sessionData.pages.length,
                started_at: new Date().toISOString(),
                results: {},
                summary: {
                    total_issues: 0,
                    critical_issues: 0,
                    test_instances_updated: 0,
                    evidence_files_created: 0
                }
            };

            // Run tests for each tool
            for (const tool of tools) {
                console.log(`🔧 Running ${tool} tests...`);
                results.results[tool] = await this.runToolTests(tool, sessionData.pages);
                
                // Process results and update test instances
                if (updateTestInstances) {
                    const updates = await this.processAutomatedResults(
                        sessionId, 
                        tool, 
                        results.results[tool],
                        createEvidence
                    );
                    results.summary.test_instances_updated += updates.updated_count;
                    results.summary.evidence_files_created += updates.evidence_count;
                }
            }

            // Calculate summary statistics
            results.summary.total_issues = this.calculateTotalIssues(results.results);
            results.summary.critical_issues = this.calculateCriticalIssues(results.results);
            results.completed_at = new Date().toISOString();

            // Store automation run results
            await this.storeAutomationResults(sessionId, results);

            console.log(`✅ Automated testing completed for session ${sessionId}`);
            console.log(`📊 Results: ${results.summary.total_issues} issues, ${results.summary.test_instances_updated} tests updated`);

            return results;

        } catch (error) {
            console.error(`❌ Error in automated testing for session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Get session data and pages for testing
     */
    async getSessionData(sessionId, specificPages = null) {
        const client = await pool.connect();
        
        try {
            // Get session details
            const sessionQuery = `
                SELECT ts.*, p.name as project_name, p.url as project_url
                FROM test_sessions ts
                LEFT JOIN projects p ON ts.project_id = p.id
                WHERE ts.id = $1
            `;
            const sessionResult = await client.query(sessionQuery, [sessionId]);
            
            if (sessionResult.rows.length === 0) {
                throw new Error(`Session ${sessionId} not found`);
            }

            const session = sessionResult.rows[0];

            // Get pages to test
            let pagesQuery;
            let pagesParams;

            if (specificPages && specificPages.length > 0) {
                pagesQuery = `
                    SELECT id, url, title, page_type, discovered_at
                    FROM discovered_pages 
                    WHERE id = ANY($1) AND project_id = $2
                    ORDER BY url
                `;
                pagesParams = [specificPages, session.project_id];
            } else {
                pagesQuery = `
                    SELECT id, url, title, page_type, discovered_at
                    FROM discovered_pages 
                    WHERE project_id = $1
                    ORDER BY url
                    LIMIT 50
                `;
                pagesParams = [session.project_id];
            }

            const pagesResult = await client.query(pagesQuery, pagesParams);

            return {
                session,
                pages: pagesResult.rows
            };

        } finally {
            client.release();
        }
    }

    /**
     * Run tests for a specific tool across all pages
     */
    async runToolTests(tool, pages) {
        const toolResults = {
            tool: tool,
            started_at: new Date().toISOString(),
            pages: {},
            summary: {
                pages_tested: 0,
                pages_failed: 0,
                total_violations: 0
            }
        };

        for (const page of pages) {
            try {
                console.log(`🔍 Testing ${page.url} with ${tool}`);
                
                switch (tool) {
                    case 'axe-core':
                        toolResults.pages[page.id] = await this.runAxeTest(page);
                        break;
                    case 'pa11y':
                        toolResults.pages[page.id] = await this.runPa11yTest(page);
                        break;
                    case 'lighthouse':
                        toolResults.pages[page.id] = await this.runLighthouseTest(page);
                        break;
                    default:
                        throw new Error(`Unsupported tool: ${tool}`);
                }

                toolResults.summary.pages_tested++;
                toolResults.summary.total_violations += toolResults.pages[page.id].violations?.length || 0;

            } catch (error) {
                console.error(`❌ Error testing ${page.url} with ${tool}:`, error.message);
                toolResults.pages[page.id] = {
                    url: page.url,
                    error: error.message,
                    tested_at: new Date().toISOString()
                };
                toolResults.summary.pages_failed++;
            }
        }

        toolResults.completed_at = new Date().toISOString();
        return toolResults;
    }

    /**
     * Run Axe-core accessibility test
     */
    async runAxeTest(page) {
        const puppeteer = require('puppeteer');
        
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const browserPage = await browser.newPage();
            await browserPage.goto(page.url, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Inject Axe-core
            await browserPage.addScriptTag({ path: require.resolve('axe-core') });
            
            // Run Axe analysis
            const results = await browserPage.evaluate(() => {
                return axe.run();
            });

            return {
                page_id: page.id,
                url: page.url,
                tool: 'axe-core',
                tested_at: new Date().toISOString(),
                violations: results.violations.map(violation => ({
                    id: violation.id,
                    impact: violation.impact,
                    description: violation.description,
                    help: violation.help,
                    helpUrl: violation.helpUrl,
                    tags: violation.tags,
                    nodes: violation.nodes.map(node => ({
                        html: node.html,
                        target: node.target,
                        failureSummary: node.failureSummary
                    }))
                })),
                passes: results.passes.length,
                incomplete: results.incomplete.length,
                inapplicable: results.inapplicable.length,
                execution_time: results.timestamp
            };

        } finally {
            await browser.close();
        }
    }

    /**
     * Run Pa11y accessibility test
     */
    async runPa11yTest(page) {
        const pa11yOptions = {
            standard: 'WCAG2AA',
            includeNotices: false,
            includeWarnings: true,
            timeout: 30000,
            wait: 500
        };

        const results = await pa11y(page.url, pa11yOptions);

        return {
            page_id: page.id,
            url: page.url,
            tool: 'pa11y',
            tested_at: new Date().toISOString(),
            violations: results.issues.filter(issue => issue.type === 'error').map(issue => ({
                code: issue.code,
                type: issue.type,
                message: issue.message,
                context: issue.context,
                selector: issue.selector,
                runner: issue.runner
            })),
            warnings: results.issues.filter(issue => issue.type === 'warning').length,
            notices: results.issues.filter(issue => issue.type === 'notice').length,
            total_issues: results.issues.length
        };
    }

    /**
     * Run Lighthouse accessibility audit
     */
    async runLighthouseTest(page) {
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
        
        try {
            // Dynamic import for Lighthouse (ES module)
            const lighthouse = (await import('lighthouse')).default;
            
            const options = {
                logLevel: 'info',
                output: 'json',
                onlyCategories: ['accessibility'],
                port: chrome.port
            };

            const runnerResult = await lighthouse(page.url, options);
            const accessibilityCategory = runnerResult.lhr.categories.accessibility;
            const accessibilityAudits = runnerResult.lhr.audits;

            // Extract accessibility violations
            const violations = [];
            for (const [auditId, audit] of Object.entries(accessibilityAudits)) {
                if (audit.score !== null && audit.score < 1 && accessibilityCategory.auditRefs.some(ref => ref.id === auditId)) {
                    violations.push({
                        id: auditId,
                        title: audit.title,
                        description: audit.description,
                        score: audit.score,
                        displayValue: audit.displayValue,
                        details: audit.details
                    });
                }
            }

            return {
                page_id: page.id,
                url: page.url,
                tool: 'lighthouse',
                tested_at: new Date().toISOString(),
                accessibility_score: accessibilityCategory.score,
                violations: violations,
                total_audits: Object.keys(accessibilityAudits).length,
                performance_metrics: {
                    first_contentful_paint: runnerResult.lhr.audits['first-contentful-paint']?.numericValue,
                    largest_contentful_paint: runnerResult.lhr.audits['largest-contentful-paint']?.numericValue
                }
            };

        } finally {
            await chrome.kill();
        }
    }

    /**
     * Process automated results and update test instances
     */
    async processAutomatedResults(sessionId, tool, toolResults, createEvidence = true) {
        const client = await pool.connect();
        const updates = {
            updated_count: 0,
            evidence_count: 0,
            mappings_created: 0
        };

        try {
            await client.query('BEGIN');

            // Get test instances for this session
            const testInstancesQuery = `
                SELECT ti.*, tr.criterion_number, tr.test_method, tr.automated_tools
                FROM test_instances ti
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE ti.session_id = $1 
                AND (tr.test_method = 'automated' OR tr.test_method = 'both')
            `;
            
            const testInstancesResult = await client.query(testInstancesQuery, [sessionId]);
            const testInstances = testInstancesResult.rows;

            // Process each page's results
            for (const [pageId, pageResults] of Object.entries(toolResults.pages)) {
                if (pageResults.error) continue;

                const violations = pageResults.violations || [];
                
                for (const violation of violations) {
                    // Map violation to WCAG criteria
                    const mappedCriteria = this.mapViolationToCriteria(tool, violation);
                    
                    for (const criterion of mappedCriteria) {
                        // Find matching test instance
                        const testInstance = testInstances.find(ti => 
                            ti.criterion_number === criterion &&
                            (ti.page_id === pageId || ti.page_id === null)
                        );

                        if (testInstance) {
                            // Update test instance status
                            await this.updateTestInstanceFromAutomation(
                                client, 
                                testInstance.id, 
                                'failed', 
                                tool, 
                                violation,
                                pageResults
                            );
                            updates.updated_count++;

                            // Create evidence if requested
                            if (createEvidence) {
                                await this.createAutomatedEvidence(
                                    client,
                                    testInstance.id,
                                    tool,
                                    violation,
                                    pageResults
                                );
                                updates.evidence_count++;
                            }
                        }
                    }
                }

                // Mark passing tests for criteria that had no violations
                const passedCriteria = this.getPassedCriteria(tool, violations, testInstances);
                for (const criterion of passedCriteria) {
                    const testInstance = testInstances.find(ti => 
                        ti.criterion_number === criterion &&
                        (ti.page_id === pageId || ti.page_id === null) &&
                        ti.status === 'pending'
                    );

                    if (testInstance) {
                        await this.updateTestInstanceFromAutomation(
                            client,
                            testInstance.id,
                            'passed',
                            tool,
                            null,
                            pageResults
                        );
                        updates.updated_count++;
                    }
                }
            }

            await client.query('COMMIT');
            console.log(`📊 Updated ${updates.updated_count} test instances from ${tool} results`);
            return updates;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Error processing ${tool} results:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Map tool violation to WCAG criteria
     */
    mapViolationToCriteria(tool, violation) {
        const mappings = this.resultsMappings[tool] || {};
        
        // Try exact match first
        let violationKey = violation.id || violation.code;
        if (mappings[violationKey]) {
            return mappings[violationKey];
        }

        // Try pattern matching for Axe rules
        if (tool === 'axe-core') {
            for (const [pattern, criteria] of Object.entries(mappings)) {
                if (pattern.includes('*') && violationKey.includes(pattern.replace('*', ''))) {
                    return criteria;
                }
            }
        }

        // Try tag-based mapping for Axe
        if (tool === 'axe-core' && violation.tags) {
            const wcagTags = violation.tags.filter(tag => tag.startsWith('wcag'));
            return wcagTags.map(tag => tag.replace('wcag', '').replace(/(\d)(\d)(\d)/, '$1.$2.$3'));
        }

        return [];
    }

    /**
     * Get criteria that passed (no violations found)
     */
    getPassedCriteria(tool, violations, testInstances) {
        const allMappedCriteria = Object.values(this.resultsMappings[tool] || {}).flat();
        const failedCriteria = violations.map(v => this.mapViolationToCriteria(tool, v)).flat();
        const passedCriteria = allMappedCriteria.filter(c => !failedCriteria.includes(c));
        
        // Only return criteria that have test instances
        return passedCriteria.filter(criterion => 
            testInstances.some(ti => ti.criterion_number === criterion)
        );
    }

    /**
     * Update test instance based on automated results
     */
    async updateTestInstanceFromAutomation(client, testInstanceId, status, tool, violation, pageResults) {
        const updateQuery = `
            UPDATE test_instances 
            SET 
                status = $1,
                test_method_used = 'automated',
                tool_used = $2,
                notes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `;

        const notes = violation ? 
            `Automated ${tool} test found: ${violation.description || violation.message}` :
            `Automated ${tool} test passed - no violations detected`;

        await client.query(updateQuery, [status, tool, notes, testInstanceId]);

        // Create audit log entry
        const auditQuery = `
            INSERT INTO test_audit_log (
                test_instance_id, changed_by, action_type, reason,
                old_value, new_value, changed_at, metadata
            ) VALUES ($1, $2, 'automated_test_result', $3, 'pending', $4, CURRENT_TIMESTAMP, $5)
        `;

        const auditMetadata = {
            tool,
            automated: true,
            violation_id: violation?.id || violation?.code,
            page_url: pageResults.url,
            test_run_timestamp: pageResults.tested_at
        };

        await client.query(auditQuery, [
            testInstanceId,
            null, // No user for automated changes
            `Automated ${tool} test result`,
            status,
            JSON.stringify(auditMetadata)
        ]);
    }

    /**
     * Create evidence record for automated test result
     */
    async createAutomatedEvidence(client, testInstanceId, tool, violation, pageResults) {
        const evidenceQuery = `
            INSERT INTO test_evidence (
                test_instance_id, evidence_type, description, 
                file_path, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;

        const evidenceMetadata = {
            tool,
            violation: violation || 'no_violations',
            page_url: pageResults.url,
            tested_at: pageResults.tested_at,
            raw_results: violation
        };

        const description = violation ?
            `${tool} violation: ${violation.description || violation.message}` :
            `${tool} test passed - no violations detected`;

        await client.query(evidenceQuery, [
            testInstanceId,
            'automated_result',
            description,
            null, // No file path for raw results
            JSON.stringify(evidenceMetadata)
        ]);
    }

    /**
     * Calculate total issues across all tools
     */
    calculateTotalIssues(results) {
        let total = 0;
        for (const [tool, toolResults] of Object.entries(results)) {
            total += toolResults.summary?.total_violations || 0;
        }
        return total;
    }

    /**
     * Calculate critical issues across all tools
     */
    calculateCriticalIssues(results) {
        let critical = 0;
        for (const [tool, toolResults] of Object.entries(results)) {
            for (const [pageId, pageResults] of Object.entries(toolResults.pages || {})) {
                if (pageResults.violations) {
                    critical += pageResults.violations.filter(v => 
                        v.impact === 'critical' || v.impact === 'serious' || v.type === 'error'
                    ).length;
                }
            }
        }
        return critical;
    }

    /**
     * Store automation run results
     */
    async storeAutomationResults(sessionId, results) {
        const query = `
            INSERT INTO automated_test_runs (
                session_id, tools_used, pages_tested, started_at, completed_at,
                total_issues, critical_issues, test_instances_updated, 
                evidence_files_created, raw_results
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `;

        const client = await pool.connect();
        try {
            await client.query(query, [
                sessionId,
                JSON.stringify(results.tools_used),
                results.pages_tested,
                results.started_at,
                results.completed_at,
                results.summary.total_issues,
                results.summary.critical_issues,
                results.summary.test_instances_updated,
                results.summary.evidence_files_created,
                JSON.stringify(results.results)
            ]);
        } finally {
            client.release();
        }
    }

    /**
     * Get automation run history for a session
     */
    async getAutomationHistory(sessionId) {
        const query = `
            SELECT * FROM automated_test_runs 
            WHERE session_id = $1 
            ORDER BY started_at DESC
        `;

        const client = await pool.connect();
        try {
            const result = await client.query(query, [sessionId]);
            return result.rows;
        } finally {
            client.release();
        }
    }
}

module.exports = TestAutomationService; 