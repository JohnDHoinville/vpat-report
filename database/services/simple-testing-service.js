// Simplified Testing Service for Single-User Operation
// Focuses on efficiency and organization without enterprise overhead

const { db } = require('../config');

class SimpleTestingService {
    constructor() {
        // No complex state management needed for single user
    }

    // ===========================
    // PROJECT & DISCOVERY WORKFLOW
    // ===========================

    async createProject(name, clientName, primaryUrl) {
        const project = await db.insert('projects', {
            name,
            client_name: clientName,
            description: `Accessibility audit for ${clientName}`
        });

        // Automatically create site discovery
        const discovery = await this.addSiteToProject(project.id, primaryUrl);
        
        return { project, discovery };
    }

    async addSiteToProject(projectId, url) {
        const domain = new URL(url).hostname;
        
        return await db.insert('site_discovery', {
            project_id: projectId,
            primary_url: url,
            domain: domain
        });
    }

    async discoverPages(discoveryId, options = {}) {
        console.log(`🕷️ Starting page discovery...`);
        
        // Use your existing crawler
        const SiteCrawler = require('../../scripts/site-crawler');
        const crawler = new SiteCrawler();
        
        const crawlResults = await crawler.crawl({
            startUrl: options.url,
            maxDepth: options.maxDepth || 2,
            maxPages: options.maxPages || 50
        });

        // Store discovered pages
        const pages = [];
        for (const pageData of crawlResults.pages || []) {
            const page = await db.insert('discovered_pages', {
                discovery_id: discoveryId,
                url: pageData.url,
                title: pageData.title || this.extractTitle(pageData.url),
                page_type: this.classifyPage(pageData.url),
                has_forms: pageData.hasForms || false,
                has_media: pageData.hasMedia || false,
                complexity: this.estimateComplexity(pageData),
                priority: this.assignPriority(pageData.url)
            });
            pages.push(page);
        }

        // Update discovery status
        await db.update('site_discovery', discoveryId, {
            status: 'completed',
            last_crawled: new Date(),
            total_pages_found: pages.length
        });

        console.log(`✅ Discovered ${pages.length} pages`);
        return pages;
    }

    // ===========================
    // TESTING SESSION MANAGEMENT
    // ===========================

    async createTestSession(projectId, name, scope = {}) {
        return await db.insert('test_sessions', {
            project_id: projectId,
            name,
            description: `Testing session: ${name}`,
            scope: {
                wcag_version: scope.wcagVersion || '2.1',
                levels: scope.levels || ['A', 'AA'],
                include_section_508: scope.includeSection508 || true
            }
        });
    }

    async getTestSessionOverview(sessionId) {
        // Get basic session info
        const session = await db.findById('test_sessions', sessionId);
        
        // Get pages to test
        const pagesQuery = `
            SELECT dp.* FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1 AND dp.include_in_testing = true
            ORDER BY dp.priority DESC, dp.page_type
        `;
        const pagesResult = await db.query(pagesQuery, [session.project_id]);
        
        // Get requirements to test
        const requirements = await this.getRequirementsForScope(session.scope);
        
        // Get current progress
        const progressQuery = `
            SELECT 
                COUNT(DISTINCT page_id) as pages_tested,
                COUNT(*) as total_tests,
                SUM(CASE WHEN result = 'pass' THEN 1 ELSE 0 END) as passed_tests,
                SUM(CASE WHEN result = 'fail' THEN 1 ELSE 0 END) as failed_tests
            FROM manual_test_results 
            WHERE test_session_id = $1
        `;
        const progressResult = await db.query(progressQuery, [sessionId]);
        
        return {
            session,
            pages: pagesResult.rows,
            requirements: requirements,
            progress: progressResult.rows[0],
            total_possible_tests: pagesResult.rows.length * requirements.length
        };
    }

    // ===========================
    // MANUAL TESTING HELPERS
    // ===========================

    async getNextTestsToPerform(sessionId, pageId = null) {
        // Get what still needs testing
        const query = `
            WITH required_tests AS (
                SELECT 
                    dp.id as page_id,
                    dp.url,
                    dp.title,
                    dp.page_type,
                    wr.id as requirement_id,
                    'wcag' as requirement_type,
                    wr.criterion_number,
                    wr.title as requirement_title,
                    wr.manual_test_procedure
                FROM discovered_pages dp
                JOIN site_discovery sd ON dp.discovery_id = sd.id
                JOIN test_sessions ts ON sd.project_id = ts.project_id
                CROSS JOIN wcag_requirements wr
                WHERE ts.id = $1 
                AND dp.include_in_testing = true
                AND (wr.applies_to_page_types ? dp.page_type OR wr.applies_to_page_types @> '["all"]')
                ${pageId ? 'AND dp.id = $2' : ''}
            )
            SELECT rt.*
            FROM required_tests rt
            LEFT JOIN manual_test_results mtr ON (
                rt.page_id = mtr.page_id 
                AND rt.requirement_id = mtr.requirement_id
                AND mtr.test_session_id = $1
            )
            WHERE mtr.id IS NULL
            ORDER BY rt.page_type, rt.criterion_number
            LIMIT 20
        `;
        
        const params = [sessionId];
        if (pageId) params.push(pageId);
        
        const result = await db.query(query, params);
        return result.rows;
    }

    async getTestingProcedure(requirementId, requirementType, pageContext = {}) {
        let requirement;
        
        if (requirementType === 'wcag') {
            requirement = await db.findById('wcag_requirements', requirementId);
        } else {
            requirement = await db.findById('section_508_requirements', requirementId);
        }
        
        if (!requirement) {
            throw new Error('Requirement not found');
        }
        
        // Customize procedure based on page context
        let procedure = { ...requirement.manual_test_procedure };
        
        if (pageContext.has_forms && this.isFormRelatedRequirement(requirement)) {
            procedure.steps = [
                ...procedure.steps,
                'Pay special attention to form controls',
                'Test form validation and error messages',
                'Verify form submission feedback'
            ];
        }
        
        if (pageContext.has_media && this.isMediaRelatedRequirement(requirement)) {
            procedure.steps = [
                ...procedure.steps,
                'Check all media elements on the page',
                'Verify alternative content is available',
                'Test media controls accessibility'
            ];
        }
        
        return {
            requirement,
            procedure,
            pageContext
        };
    }

    // ===========================
    // RESULTS MANAGEMENT
    // ===========================

    async recordTestResult(sessionId, pageId, requirementId, requirementType, result, notes = '', evidence = {}) {
        const testResult = await db.insert('manual_test_results', {
            test_session_id: sessionId,
            page_id: pageId,
            requirement_id: requirementId,
            requirement_type: requirementType,
            result: result,
            notes: notes,
            evidence: evidence
        });

        // If it's a failure, create a violation record
        if (result === 'fail') {
            await this.createViolationFromFailure(testResult);
        }

        return testResult;
    }

    async createViolationFromFailure(testResult) {
        const page = await db.findById('discovered_pages', testResult.page_id);
        
        let requirement;
        if (testResult.requirement_type === 'wcag') {
            requirement = await db.findById('wcag_requirements', testResult.requirement_id);
        } else {
            requirement = await db.findById('section_508_requirements', testResult.requirement_id);
        }

        return await db.insert('violations', {
            test_session_id: testResult.test_session_id,
            page_id: testResult.page_id,
            title: `${requirement.title} - ${page.title}`,
            description: testResult.notes || `Manual test failure for ${requirement.title}`,
            severity: this.assessSeverity(requirement, testResult),
            source_type: 'manual',
            source_test_id: testResult.id,
            wcag_criteria: testResult.requirement_type === 'wcag' ? [requirement.criterion_number] : [],
            section_508_criteria: testResult.requirement_type === 'section_508' ? [requirement.criterion_id] : []
        });
    }

    // ===========================
    // AUTOMATED TEST INTEGRATION
    // ===========================

    async storeAutomatedTestResults(sessionId, pageId, toolName, rawResults) {
        const testResult = await db.insert('automated_test_results', {
            test_session_id: sessionId,
            page_id: pageId,
            tool_name: toolName,
            raw_results: rawResults,
            violations_count: rawResults.violations ? rawResults.violations.length : 0
        });

        // Extract violations from automated results
        if (rawResults.violations && rawResults.violations.length > 0) {
            await this.extractAutomatedViolations(testResult, rawResults.violations);
        }

        return testResult;
    }

    async extractAutomatedViolations(testResult, violations) {
        for (const violation of violations) {
            await db.insert('violations', {
                test_session_id: testResult.test_session_id,
                page_id: testResult.page_id,
                title: violation.title || violation.id,
                description: violation.description || violation.help,
                severity: this.mapAutomatedSeverity(violation.impact),
                source_type: 'automated',
                source_test_id: testResult.id,
                wcag_criteria: violation.wcagCriteria || [],
                suggested_fix: violation.helpUrl
            });
        }
    }

    // ===========================
    // SIMPLE VPAT GENERATION
    // ===========================

    async generateSimpleVPAT(sessionId) {
        console.log('📋 Generating VPAT report...');
        
        const session = await db.findById('test_sessions', sessionId);
        const project = await db.findById('projects', session.project_id);
        
        // Get all manual test results
        const manualResults = await db.findMany('manual_test_results', {
            test_session_id: sessionId
        });
        
        // Get all violations
        const violations = await db.findMany('violations', {
            test_session_id: sessionId
        });
        
        // Group results by WCAG criteria
        const criteriaResults = await this.groupResultsByCriteria(sessionId);
        
        const vpatData = {
            project: project,
            session: session,
            generated_at: new Date().toISOString(),
            summary: {
                total_criteria_tested: criteriaResults.length,
                criteria_passed: criteriaResults.filter(c => c.result === 'pass').length,
                criteria_failed: criteriaResults.filter(c => c.result === 'fail').length,
                total_violations: violations.length
            },
            criteria_results: criteriaResults,
            violations: violations
        };
        
        // Store VPAT record
        const vpat = await db.insert('vpat_reports', {
            project_id: session.project_id,
            test_session_id: sessionId,
            report_data: vpatData
        });
        
        console.log('✅ VPAT generated');
        return { vpat, data: vpatData };
    }

    // ===========================
    // HELPER METHODS
    // ===========================

    async getRequirementsForScope(scope) {
        const requirements = [];
        
        // Get WCAG requirements
        const wcagRequirements = await db.findMany('wcag_requirements', {
            wcag_version: scope.wcag_version
        });
        
        const filteredWcag = wcagRequirements.filter(req => 
            scope.levels.includes(req.level)
        );
        
        requirements.push(...filteredWcag.map(req => ({
            ...req,
            requirement_type: 'wcag'
        })));
        
        // Get Section 508 if included
        if (scope.include_section_508) {
            const section508Requirements = await db.findMany('section_508_requirements', {});
            requirements.push(...section508Requirements.map(req => ({
                ...req,
                requirement_type: 'section_508'
            })));
        }
        
        return requirements;
    }

    async groupResultsByCriteria(sessionId) {
        const query = `
            SELECT 
                wr.criterion_number,
                wr.title,
                wr.level,
                CASE 
                    WHEN COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) > 0 THEN 'fail'
                    WHEN COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) > 0 THEN 'pass'
                    ELSE 'not_tested'
                END as overall_result,
                COUNT(*) as total_tests,
                COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) as passed_tests,
                COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) as failed_tests
            FROM wcag_requirements wr
            LEFT JOIN manual_test_results mtr ON (
                wr.id = mtr.requirement_id 
                AND mtr.requirement_type = 'wcag'
                AND mtr.test_session_id = $1
            )
            GROUP BY wr.id, wr.criterion_number, wr.title, wr.level
            ORDER BY wr.criterion_number
        `;
        
        const result = await db.query(query, [sessionId]);
        return result.rows;
    }

    // Simple classification helpers
    classifyPage(url) {
        const path = url.toLowerCase();
        if (path === '/' || path.endsWith('/index')) return 'homepage';
        if (path.includes('contact') || path.includes('form')) return 'form';
        if (path.includes('login') || path.includes('auth')) return 'authentication';
        return 'content';
    }

    estimateComplexity(pageData) {
        let score = 0;
        if (pageData.hasForms) score += 2;
        if (pageData.hasMedia) score += 1;
        if (pageData.hasInteractive) score += 1;
        
        return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
    }

    assignPriority(url) {
        if (url === '/' || url.endsWith('/index')) return 'critical';
        if (url.includes('login') || url.includes('contact')) return 'high';
        return 'normal';
    }

    extractTitle(url) {
        const path = new URL(url).pathname;
        return path === '/' ? 'Homepage' : `Page: ${path}`;
    }

    isFormRelatedRequirement(requirement) {
        if (requirement.requirement_type === 'wcag') {
            return ['3.3.1', '3.3.2', '3.3.3', '3.3.4', '1.3.5'].includes(requirement.criterion_number);
        }
        return false;
    }

    isMediaRelatedRequirement(requirement) {
        if (requirement.requirement_type === 'wcag') {
            return requirement.criterion_number.startsWith('1.2.');
        }
        return false;
    }

    assessSeverity(requirement, testResult) {
        if (requirement.requirement_type === 'wcag' && requirement.level === 'A') {
            return 'high';
        }
        return 'medium';
    }

    mapAutomatedSeverity(impact) {
        const mapping = {
            'critical': 'critical',
            'serious': 'high',
            'moderate': 'medium',
            'minor': 'low'
        };
        return mapping[impact] || 'medium';
    }
}

module.exports = SimpleTestingService; 