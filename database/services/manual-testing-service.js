// Manual Testing Service
// Manages comprehensive manual accessibility testing with step-by-step procedures

const { db } = require('../config');

class ManualTestingService {
    constructor() {
        this.testingQueue = new Map();
    }

    // ===========================
    // TEST ASSIGNMENT CREATION
    // ===========================

    async createManualTestAssignments(testSessionId, config = {}) {
        try {
            console.log(`📋 Creating manual test assignments for session: ${testSessionId}`);
            
            const testSession = await db.findById('test_sessions', testSessionId);
            if (!testSession) {
                throw new Error('Test session not found');
            }

            // Get pages for testing
            const pages = await this.getPagesForManualTesting(testSession.project_id, config.pageFilters);
            
            // Get requirements based on scope
            const requirements = await this.getRequirementsForTesting(testSession.scope_definition);
            
            // Create assignments
            const assignments = await this.generateAssignments(testSessionId, pages, requirements, config);
            
            console.log(`✅ Created ${assignments.length} manual test assignments`);
            return assignments;

        } catch (error) {
            console.error('❌ Error creating manual test assignments:', error);
            throw error;
        }
    }

    async getPagesForManualTesting(projectId, filters = {}) {
        const query = `
            SELECT dp.*, sd.domain
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1 
            AND dp.include_in_testing = true
            ${filters.pageType ? 'AND dp.page_type = $2' : ''}
            ${filters.priority ? 'AND dp.testing_priority = $3' : ''}
            ORDER BY dp.testing_priority DESC, dp.page_type, dp.created_at ASC
        `;
        
        const params = [projectId];
        if (filters.pageType) params.push(filters.pageType);
        if (filters.priority) params.push(filters.priority);
        
        const result = await db.query(query, params);
        return result.rows;
    }

    async getRequirementsForTesting(scopeDefinition) {
        const requirements = [];
        
        // Get WCAG requirements
        if (scopeDefinition.wcag_versions && scopeDefinition.wcag_levels) {
            for (const version of scopeDefinition.wcag_versions) {
                for (const level of scopeDefinition.wcag_levels) {
                    const wcagRequirements = await db.findMany('wcag_requirements', {
                        wcag_version: version,
                        level: level,
                        status: 'active'
                    }, 'criterion_number ASC');
                    
                    requirements.push(...wcagRequirements.map(req => ({
                        ...req,
                        requirement_type: 'wcag'
                    })));
                }
            }
        }
        
        // Get Section 508 requirements
        if (scopeDefinition.include_section_508) {
            const section508Requirements = await db.findMany('section_508_requirements', {
                status: 'active'
            }, 'criterion_id ASC');
            
            requirements.push(...section508Requirements.map(req => ({
                ...req,
                requirement_type: 'section_508'
            })));
        }
        
        return requirements;
    }

    async generateAssignments(testSessionId, pages, requirements, config) {
        const assignments = [];
        const assignmentStrategy = config.assignmentStrategy || 'comprehensive';
        
        for (const page of pages) {
            // Filter requirements based on page characteristics
            const relevantRequirements = await this.filterRequirementsForPage(page, requirements);
            
            for (const requirement of relevantRequirements) {
                // Check if this combination should be tested
                if (await this.shouldCreateAssignment(page, requirement, assignmentStrategy)) {
                    const assignment = await db.insert('manual_test_assignments', {
                        test_session_id: testSessionId,
                        page_id: page.id,
                        requirement_id: requirement.id,
                        requirement_type: requirement.requirement_type,
                        assigned_to: config.defaultTester || 'unassigned',
                        testing_priority: this.calculateTestingPriority(page, requirement),
                        estimated_duration_minutes: this.estimateTestingDuration(page, requirement),
                        requires_assistive_tech: this.getRequiredAssistiveTech(requirement),
                        special_instructions: this.generateSpecialInstructions(page, requirement),
                        status: 'assigned'
                    });
                    
                    assignments.push(assignment);
                }
            }
        }
        
        return assignments;
    }

    // ===========================
    // REQUIREMENT FILTERING & ASSIGNMENT LOGIC
    // ===========================

    async filterRequirementsForPage(page, requirements) {
        const relevantRequirements = [];
        
        for (const requirement of requirements) {
            // Always include basic requirements
            if (this.isBasicRequirement(requirement)) {
                relevantRequirements.push(requirement);
                continue;
            }
            
            // Filter based on page characteristics
            if (page.has_forms && this.isFormRelatedRequirement(requirement)) {
                relevantRequirements.push(requirement);
            }
            
            if (page.has_media && this.isMediaRelatedRequirement(requirement)) {
                relevantRequirements.push(requirement);
            }
            
            if (page.has_interactive_elements && this.isInteractiveRequirement(requirement)) {
                relevantRequirements.push(requirement);
            }
            
            if (page.page_type === 'authentication' && this.isAuthRequirement(requirement)) {
                relevantRequirements.push(requirement);
            }
        }
        
        return relevantRequirements;
    }

    isBasicRequirement(requirement) {
        // Core requirements that apply to all pages
        const basicCriteria = [
            '1.1.1', '1.3.1', '1.4.3', '2.1.1', '2.4.1', '2.4.2', '3.1.1', '4.1.1', '4.1.2'
        ];
        
        if (requirement.requirement_type === 'wcag') {
            return basicCriteria.includes(requirement.criterion_number);
        }
        
        return requirement.section === 'A'; // Basic Section 508 requirements
    }

    isFormRelatedRequirement(requirement) {
        const formCriteria = [
            '1.3.5', '2.4.6', '3.2.1', '3.2.2', '3.3.1', '3.3.2', '3.3.3', '3.3.4'
        ];
        
        return requirement.requirement_type === 'wcag' && 
               formCriteria.includes(requirement.criterion_number);
    }

    isMediaRelatedRequirement(requirement) {
        const mediaCriteria = [
            '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6', '1.2.7', '1.2.8', '1.2.9'
        ];
        
        return requirement.requirement_type === 'wcag' && 
               mediaCriteria.includes(requirement.criterion_number);
    }

    isInteractiveRequirement(requirement) {
        const interactiveCriteria = [
            '2.1.2', '2.4.3', '2.4.7', '2.5.1', '2.5.2', '2.5.3', '2.5.4'
        ];
        
        return requirement.requirement_type === 'wcag' && 
               interactiveCriteria.includes(requirement.criterion_number);
    }

    isAuthRequirement(requirement) {
        const authCriteria = ['3.2.1', '3.2.2', '3.3.1', '3.3.3'];
        
        return requirement.requirement_type === 'wcag' && 
               authCriteria.includes(requirement.criterion_number);
    }

    async shouldCreateAssignment(page, requirement, strategy) {
        // Different assignment strategies
        switch (strategy) {
            case 'comprehensive':
                return true; // Test everything
                
            case 'risk_based':
                return this.isHighRiskCombination(page, requirement);
                
            case 'sample_based':
                return this.isSampleWorthy(page, requirement);
                
            default:
                return true;
        }
    }

    // ===========================
    // TESTING PROCEDURES & GUIDANCE
    // ===========================

    async getDetailedTestingProcedure(assignmentId) {
        try {
            const assignment = await this.getAssignmentWithDetails(assignmentId);
            
            if (!assignment) {
                throw new Error('Assignment not found');
            }
            
            // Get the requirement details with manual testing procedures
            const requirement = assignment.requirement_type === 'wcag' 
                ? await db.findById('wcag_requirements', assignment.requirement_id)
                : await db.findById('section_508_requirements', assignment.requirement_id);
                
            // Generate contextual testing procedure
            const procedure = this.generateContextualProcedure(assignment.page, requirement);
            
            return {
                assignment: assignment,
                requirement: requirement,
                procedure: procedure,
                tools: this.getRecommendedTools(requirement),
                evidence_requirements: this.getEvidenceRequirements(requirement)
            };
            
        } catch (error) {
            console.error('❌ Error getting testing procedure:', error);
            throw error;
        }
    }

    async getAssignmentWithDetails(assignmentId) {
        const query = `
            SELECT 
                mta.*,
                dp.url, dp.title, dp.page_type, dp.has_forms, dp.has_media, dp.has_interactive_elements,
                dp.estimated_complexity, dp.testing_priority as page_priority,
                sd.domain, sd.auth_config
            FROM manual_test_assignments mta
            JOIN discovered_pages dp ON mta.page_id = dp.id
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE mta.id = $1
        `;
        
        const result = await db.query(query, [assignmentId]);
        return result.rows[0];
    }

    generateContextualProcedure(page, requirement) {
        // Start with the base manual testing procedure
        let procedure = { ...requirement.manual_test_procedures };
        
        // Customize based on page characteristics
        if (page.has_forms && this.isFormRelatedRequirement(requirement)) {
            procedure = this.addFormSpecificSteps(procedure, page);
        }
        
        if (page.has_media && this.isMediaRelatedRequirement(requirement)) {
            procedure = this.addMediaSpecificSteps(procedure, page);
        }
        
        if (page.page_type === 'authentication') {
            procedure = this.addAuthSpecificSteps(procedure, page);
        }
        
        // Add page-specific context
        procedure.page_context = {
            url: page.url,
            page_type: page.page_type,
            complexity: page.estimated_complexity,
            special_considerations: this.getSpecialConsiderations(page, requirement)
        };
        
        return procedure;
    }

    addFormSpecificSteps(procedure, page) {
        const formSteps = [
            'Navigate to each form on the page',
            'Test form field labels and instructions',
            'Test error validation and messaging',
            'Verify form submission feedback',
            'Test keyboard navigation through form fields'
        ];
        
        return {
            ...procedure,
            steps: [...procedure.steps, ...formSteps],
            form_specific: true
        };
    }

    addMediaSpecificSteps(procedure, page) {
        const mediaSteps = [
            'Identify all media elements (audio, video, animations)',
            'Check for alternative text or descriptions',
            'Test media controls accessibility',
            'Verify caption and transcript availability',
            'Test auto-playing media behavior'
        ];
        
        return {
            ...procedure,
            steps: [...procedure.steps, ...mediaSteps],
            media_specific: true
        };
    }

    getRecommendedTools(requirement) {
        const tools = [];
        
        if (requirement.requires_assistive_tech) {
            tools.push('Screen reader (NVDA, JAWS, or VoiceOver)');
        }
        
        if (requirement.requirement_type === 'wcag' && 
            ['1.4.3', '1.4.6', '1.4.11'].includes(requirement.criterion_number)) {
            tools.push('Color contrast analyzer');
        }
        
        tools.push('Keyboard only navigation');
        tools.push('Browser developer tools');
        
        return tools;
    }

    // ===========================
    // TEST RESULT MANAGEMENT
    // ===========================

    async submitTestResult(assignmentId, resultData) {
        try {
            console.log(`📝 Submitting test result for assignment: ${assignmentId}`);
            
            // Validate result data
            this.validateResultData(resultData);
            
            // Create test result record
            const testResult = await db.insert('manual_test_results', {
                assignment_id: assignmentId,
                result: resultData.result,
                confidence_level: resultData.confidence_level || 'high',
                notes: resultData.notes,
                steps_performed: resultData.steps_performed,
                actual_behavior: resultData.actual_behavior,
                expected_behavior: resultData.expected_behavior,
                evidence: resultData.evidence || {},
                remediation_suggestions: resultData.remediation_suggestions,
                severity_assessment: resultData.severity_assessment,
                effort_estimate: resultData.effort_estimate,
                testing_environment: resultData.testing_environment || {},
                assistive_tech_used: resultData.assistive_tech_used || [],
                browser_used: resultData.browser_used,
                tested_by: resultData.tested_by,
                testing_duration_minutes: resultData.testing_duration_minutes,
                review_status: 'pending_review'
            });
            
            // Update assignment status
            await db.update('manual_test_assignments', assignmentId, {
                status: 'completed',
                completed_at: new Date()
            });
            
            // Create consolidated violation if test failed
            if (resultData.result === 'fail') {
                await this.createConsolidatedViolation(assignmentId, testResult, resultData);
            }
            
            console.log(`✅ Test result submitted: ${testResult.id}`);
            return testResult;
            
        } catch (error) {
            console.error('❌ Error submitting test result:', error);
            throw error;
        }
    }

    validateResultData(resultData) {
        const requiredFields = ['result', 'tested_by'];
        const validResults = ['pass', 'fail', 'not_applicable', 'not_testable', 'needs_review'];
        
        for (const field of requiredFields) {
            if (!resultData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        if (!validResults.includes(resultData.result)) {
            throw new Error(`Invalid result value: ${resultData.result}`);
        }
    }

    async createConsolidatedViolation(assignmentId, testResult, resultData) {
        const assignment = await this.getAssignmentWithDetails(assignmentId);
        
        const violation = await db.insert('consolidated_violations', {
            test_session_id: assignment.test_session_id,
            page_id: assignment.page_id,
            requirement_id: assignment.requirement_id,
            requirement_type: assignment.requirement_type,
            violation_source: 'manual',
            manual_test_id: testResult.id,
            severity: resultData.severity_assessment || 'medium',
            title: `Manual Test Failure: ${assignment.requirement_title}`,
            description: resultData.notes || 'Manual testing identified accessibility issue',
            location_data: resultData.location_data || {},
            suggested_fixes: resultData.remediation_suggestions 
                ? [resultData.remediation_suggestions] 
                : [],
            remediation_effort: resultData.effort_estimate,
            status: 'open'
        });
        
        return violation;
    }

    // ===========================
    // ASSIGNMENT MANAGEMENT
    // ===========================

    async getAssignmentsForTester(testerId, filters = {}) {
        let conditions = { assigned_to: testerId };
        
        if (filters.status) conditions.status = filters.status;
        if (filters.priority) conditions.testing_priority = filters.priority;
        
        const assignments = await db.findMany('manual_test_assignments', conditions, 'testing_priority DESC, due_date ASC');
        
        // Enrich with page and requirement details
        const enrichedAssignments = [];
        for (const assignment of assignments) {
            const details = await this.getAssignmentWithDetails(assignment.id);
            enrichedAssignments.push(details);
        }
        
        return enrichedAssignments;
    }

    async updateAssignmentStatus(assignmentId, status, notes = '') {
        const updates = { status };
        
        if (status === 'in_progress') {
            updates.started_at = new Date();
        } else if (status === 'completed') {
            updates.completed_at = new Date();
        }
        
        const assignment = await db.update('manual_test_assignments', assignmentId, updates);
        
        console.log(`✅ Updated assignment ${assignmentId} status to: ${status}`);
        return assignment;
    }

    // ===========================
    // HELPER METHODS
    // ===========================

    calculateTestingPriority(page, requirement) {
        let priority = 'normal';
        
        // Page-based priority boost
        if (page.testing_priority === 'critical') priority = 'high';
        
        // Requirement-based priority
        if (requirement.requirement_type === 'wcag' && requirement.level === 'A') {
            priority = 'high';
        }
        
        // Combination-based priority
        if (this.isHighRiskCombination(page, requirement)) {
            priority = 'high';
        }
        
        return priority;
    }

    estimateTestingDuration(page, requirement) {
        let minutes = 15; // Base time
        
        // Complexity adjustments
        if (page.estimated_complexity === 'high') minutes += 15;
        if (requirement.testing_complexity === 'high') minutes += 10;
        
        // Page type adjustments
        if (page.has_forms) minutes += 10;
        if (page.has_media) minutes += 15;
        if (page.has_interactive_elements) minutes += 5;
        
        return minutes;
    }

    getRequiredAssistiveTech(requirement) {
        const assistiveTech = [];
        
        if (requirement.requires_assistive_tech) {
            assistiveTech.push('screen_reader');
        }
        
        if (requirement.requirement_type === 'wcag') {
            const criteria = requirement.criterion_number;
            
            if (['2.1.1', '2.1.2', '2.4.3'].includes(criteria)) {
                assistiveTech.push('keyboard_only');
            }
            
            if (['1.4.3', '1.4.6', '1.4.11'].includes(criteria)) {
                assistiveTech.push('contrast_analyzer');
            }
        }
        
        return assistiveTech;
    }

    generateSpecialInstructions(page, requirement) {
        const instructions = [];
        
        if (page.requires_auth) {
            instructions.push('Test both authenticated and unauthenticated states');
        }
        
        if (page.page_type === 'form') {
            instructions.push('Test all form states: empty, valid, invalid, submitted');
        }
        
        if (requirement.testing_complexity === 'high') {
            instructions.push('Take extra time to thoroughly test this complex requirement');
        }
        
        return instructions.join('; ');
    }

    isHighRiskCombination(page, requirement) {
        // Critical pages with core accessibility requirements
        return page.testing_priority === 'critical' && 
               requirement.requirement_type === 'wcag' && 
               requirement.level === 'A';
    }

    getSpecialConsiderations(page, requirement) {
        const considerations = [];
        
        if (page.estimated_complexity === 'high') {
            considerations.push('Complex page - allow extra testing time');
        }
        
        if (requirement.requires_manual_testing && !requirement.can_be_automated) {
            considerations.push('Manual testing required - no automated alternative');
        }
        
        return considerations;
    }

    getEvidenceRequirements(requirement) {
        const evidence = {
            screenshots: true,
            required: []
        };
        
        if (requirement.requirement_type === 'wcag') {
            const criteria = requirement.criterion_number;
            
            if (['1.4.3', '1.4.6', '1.4.11'].includes(criteria)) {
                evidence.required.push('color_contrast_measurements');
            }
            
            if (criteria.startsWith('2.1.')) {
                evidence.required.push('keyboard_navigation_video');
            }
            
            if (criteria.startsWith('1.2.')) {
                evidence.required.push('media_alternative_documentation');
            }
        }
        
        return evidence;
    }
}

module.exports = ManualTestingService; 