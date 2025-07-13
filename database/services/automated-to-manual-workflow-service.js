/**
 * Automated-to-Manual Workflow Service
 * Automatically triggers manual review when automated tests find violations
 * Creates guided workflows from automated detection to manual resolution
 */

const { pool } = require('../config');
const RequirementTestMappingService = require('./requirement-test-mapping-service');

class AutomatedToManualWorkflowService {
    constructor() {
        this.mappingService = new RequirementTestMappingService();
        this.workflowTypes = {
            VIOLATION_VERIFICATION: 'violation_verification',
            FALSE_POSITIVE_CHECK: 'false_positive_check',
            MANUAL_CONFIRMATION: 'manual_confirmation',
            REMEDIATION_VALIDATION: 'remediation_validation'
        };
    }

    /**
     * Process automated test results and create manual workflow tasks
     */
    async processAutomatedResults(sessionId, automatedResults) {
        try {
            console.log(`🔄 Processing automated results for session ${sessionId}`);
            
            // Analyze automated results to identify violations requiring manual review
            const violationAnalysis = await this.analyzeViolationsForManualReview(automatedResults);
            
            // Create manual workflow tasks for each violation requiring review
            const workflowTasks = [];
            
            for (const violation of violationAnalysis.requiresManualReview) {
                const task = await this.createManualWorkflowTask(sessionId, violation);
                if (task) {
                    workflowTasks.push(task);
                }
            }

            // Update session progress to reflect new manual tasks
            await this.updateSessionProgress(sessionId, workflowTasks);

            return {
                success: true,
                processedViolations: violationAnalysis.totalViolations,
                manualTasksCreated: workflowTasks.length,
                workflowTasks,
                summary: {
                    requiresManualReview: violationAnalysis.requiresManualReview.length,
                    automatedOnly: violationAnalysis.automatedOnly.length,
                    falsePositiveCandidates: violationAnalysis.falsePositiveCandidates.length
                }
            };

        } catch (error) {
            console.error('Error processing automated results:', error);
            throw error;
        }
    }

    /**
     * Analyze violations to determine which require manual review
     */
    async analyzeViolationsForManualReview(automatedResults) {
        const analysis = {
            totalViolations: 0,
            requiresManualReview: [],
            automatedOnly: [],
            falsePositiveCandidates: []
        };

        // Process violations from each tool
        if (automatedResults.tools) {
            for (const [toolName, toolResults] of Object.entries(automatedResults.tools)) {
                if (toolResults.violations) {
                    for (const violation of toolResults.violations) {
                        analysis.totalViolations++;
                        
                        const wcagCriteria = await this.mapViolationToWCAG(toolName, violation);
                        
                        for (const criterionNumber of wcagCriteria) {
                            const requirementMapping = await this.mappingService.getRequirementMapping(criterionNumber);
                            
                            const reviewDecision = this.determineManualReviewNeed(
                                violation, 
                                toolName, 
                                requirementMapping
                            );

                            const violationData = {
                                toolName,
                                violation,
                                criterionNumber,
                                requirementMapping,
                                reviewDecision,
                                priority: this.calculatePriority(violation, requirementMapping)
                            };

                            switch (reviewDecision.action) {
                                case 'MANUAL_REVIEW_REQUIRED':
                                    analysis.requiresManualReview.push(violationData);
                                    break;
                                case 'FALSE_POSITIVE_CHECK':
                                    analysis.falsePositiveCandidates.push(violationData);
                                    break;
                                case 'AUTOMATED_SUFFICIENT':
                                    analysis.automatedOnly.push(violationData);
                                    break;
                            }
                        }
                    }
                }
            }
        }

        return analysis;
    }

    /**
     * Map violation to WCAG criteria using the mapping service
     */
    async mapViolationToWCAG(toolName, violation) {
        const ruleId = violation.id || violation.code;
        const tools = this.mappingService.getAutomatedToolsForRequirement('1.1.1'); // Get all tools to find mapping
        
        // Find which WCAG criteria this violation maps to
        const mappedCriteria = [];
        const toolMappings = this.mappingService.automatedToolMappings[toolName];
        
        if (toolMappings && toolMappings.rules[ruleId]) {
            mappedCriteria.push(...toolMappings.rules[ruleId].wcag);
        }

        // If no direct mapping found, try to infer from tags
        if (mappedCriteria.length === 0 && violation.wcagCriteria) {
            mappedCriteria.push(...violation.wcagCriteria);
        }

        return mappedCriteria.length > 0 ? mappedCriteria : ['2.1.1']; // Fallback
    }

    /**
     * Determine if a violation needs manual review
     */
    determineManualReviewNeed(violation, toolName, requirementMapping) {
        const confidence = this.getToolConfidence(toolName, violation);
        const testStrategy = requirementMapping.testStrategy;
        const severity = violation.impact || violation.severity || 'unknown';

        // High priority for manual review
        if (severity === 'critical' || severity === 'serious') {
            if (testStrategy.primary === 'hybrid' || testStrategy.primary === 'manual') {
                return {
                    action: 'MANUAL_REVIEW_REQUIRED',
                    reason: 'Critical/serious violation in requirement that benefits from manual verification',
                    workflowType: this.workflowTypes.VIOLATION_VERIFICATION,
                    urgency: 'high'
                };
            }
        }

        // Medium priority for manual review
        if (confidence === 'medium' && testStrategy.automatedCoverage !== 'high') {
            return {
                action: 'MANUAL_REVIEW_REQUIRED',
                reason: 'Medium confidence automated detection requires manual verification',
                workflowType: this.workflowTypes.MANUAL_CONFIRMATION,
                urgency: 'medium'
            };
        }

        // False positive check
        if (confidence === 'low' || severity === 'minor') {
            return {
                action: 'FALSE_POSITIVE_CHECK',
                reason: 'Low confidence or minor severity - check for false positive',
                workflowType: this.workflowTypes.FALSE_POSITIVE_CHECK,
                urgency: 'low'
            };
        }

        // High confidence automated tools are sufficient
        if (confidence === 'high' && testStrategy.automatedCoverage === 'high') {
            return {
                action: 'AUTOMATED_SUFFICIENT',
                reason: 'High confidence automated detection is sufficient',
                workflowType: null,
                urgency: 'none'
            };
        }

        // Default to manual review for safety
        return {
            action: 'MANUAL_REVIEW_REQUIRED',
            reason: 'Default safety check - manual verification recommended',
            workflowType: this.workflowTypes.MANUAL_CONFIRMATION,
            urgency: 'medium'
        };
    }

    /**
     * Get tool confidence level for a violation
     */
    getToolConfidence(toolName, violation) {
        const toolConfidenceMap = {
            'axe-core': 'high',
            'lighthouse': 'medium',
            'pa11y': 'medium',
            'contrast-analyzer': 'high'
        };

        let baseConfidence = toolConfidenceMap[toolName] || 'medium';

        // Adjust confidence based on violation characteristics
        const severity = violation.impact || violation.severity;
        if (severity === 'critical') {
            return 'high';
        } else if (severity === 'minor') {
            return baseConfidence === 'high' ? 'medium' : 'low';
        }

        return baseConfidence;
    }

    /**
     * Calculate priority for manual review task
     */
    calculatePriority(violation, requirementMapping) {
        let priority = 3; // Default medium priority

        // Increase priority for critical violations
        const severity = violation.impact || violation.severity;
        if (severity === 'critical') {
            priority = 5;
        } else if (severity === 'serious') {
            priority = 4;
        }

        // Increase priority for Level A requirements
        if (requirementMapping.requirement?.level === 'A') {
            priority = Math.min(priority + 1, 5);
        }

        // Increase priority for high-impact principles
        const principle = requirementMapping.requirement?.principle;
        if (principle === 'Perceivable' || principle === 'Operable') {
            priority = Math.min(priority + 1, 5);
        }

        return priority;
    }

    /**
     * Create a manual workflow task for a violation
     */
    async createManualWorkflowTask(sessionId, violationData) {
        try {
            const { violation, criterionNumber, requirementMapping, reviewDecision, priority } = violationData;

            // Check if a manual workflow task already exists for this requirement and page
            const existingTaskQuery = `
                SELECT id FROM manual_workflow_tasks 
                WHERE session_id = $1 AND criterion_number = $2 AND page_id = $3 AND status IN ('pending', 'in_progress')
            `;
            
            const pageId = violation.pageId || this.extractPageIdFromViolation(violation);
            const existingTask = await pool.query(existingTaskQuery, [sessionId, criterionNumber, pageId]);

            if (existingTask.rows.length > 0) {
                console.log(`Manual task already exists for ${criterionNumber} on page ${pageId}`);
                return null;
            }

            // Create the manual workflow task
            const insertTaskQuery = `
                INSERT INTO manual_workflow_tasks (
                    id, session_id, criterion_number, page_id, workflow_type, 
                    priority, status, automated_violation_data, manual_procedure,
                    created_at, estimated_time_minutes, urgency_level
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4, $5, 'pending', $6, $7, 
                    CURRENT_TIMESTAMP, $8, $9
                ) RETURNING *
            `;

            const manualProcedure = this.generateContextualManualProcedure(
                requirementMapping.manualProcedure, 
                violation, 
                reviewDecision.workflowType
            );

            const estimatedTime = this.calculateEstimatedTime(
                requirementMapping.estimatedEffort, 
                reviewDecision.workflowType
            );

            const taskResult = await pool.query(insertTaskQuery, [
                sessionId,
                criterionNumber,
                pageId,
                reviewDecision.workflowType,
                priority,
                JSON.stringify({
                    toolName: violationData.toolName,
                    ruleId: violation.id || violation.code,
                    severity: violation.impact || violation.severity,
                    description: violation.description || violation.message,
                    xpath: violation.xpath || violation.selector,
                    helpUrl: violation.helpUrl,
                    elementHtml: violation.elementHtml || violation.html
                }),
                JSON.stringify(manualProcedure),
                estimatedTime,
                reviewDecision.urgency
            ]);

            const createdTask = taskResult.rows[0];

            // Create notification for the manual testing team
            await this.createWorkflowNotification(sessionId, createdTask, violationData);

            console.log(`✅ Created manual workflow task ${createdTask.id} for ${criterionNumber}`);
            return createdTask;

        } catch (error) {
            console.error('Error creating manual workflow task:', error);
            return null;
        }
    }

    /**
     * Generate contextual manual procedure based on the violation
     */
    generateContextualManualProcedure(baseProcedure, violation, workflowType) {
        if (!baseProcedure) {
            return this.getDefaultProcedureForWorkflowType(workflowType);
        }

        const contextualProcedure = {
            ...baseProcedure,
            contextualSteps: [],
            violationContext: {
                description: violation.description || violation.message,
                severity: violation.impact || violation.severity,
                xpath: violation.xpath || violation.selector,
                elementHtml: violation.elementHtml || violation.html
            }
        };

        // Add workflow-specific steps
        switch (workflowType) {
            case this.workflowTypes.VIOLATION_VERIFICATION:
                contextualProcedure.contextualSteps = [
                    `Navigate to the page where the automated tool detected the violation`,
                    `Locate the element: ${violation.xpath || violation.selector || 'See violation details'}`,
                    `Verify the automated tool's finding: ${violation.description || violation.message}`,
                    ...baseProcedure.manualSteps,
                    `Document whether the automated violation is a true positive or false positive`,
                    `If true positive, document the impact on users with disabilities`,
                    `Provide recommendations for remediation`
                ];
                break;

            case this.workflowTypes.FALSE_POSITIVE_CHECK:
                contextualProcedure.contextualSteps = [
                    `Review the automated violation: ${violation.description || violation.message}`,
                    `Navigate to the problematic element: ${violation.xpath || violation.selector || 'See details'}`,
                    `Assess whether this is a genuine accessibility issue or a false positive`,
                    `Test with assistive technology if needed`,
                    `Document findings and rationale for false positive determination`
                ];
                break;

            case this.workflowTypes.MANUAL_CONFIRMATION:
                contextualProcedure.contextualSteps = [
                    `Automated tool detected: ${violation.description || violation.message}`,
                    `Perform comprehensive manual testing to confirm the violation`,
                    ...baseProcedure.manualSteps,
                    `Validate findings with multiple testing methods`,
                    `Document confidence level in the manual test results`
                ];
                break;

            case this.workflowTypes.REMEDIATION_VALIDATION:
                contextualProcedure.contextualSteps = [
                    `Original violation: ${violation.description || violation.message}`,
                    `Verify that the reported fix addresses the accessibility issue`,
                    ...baseProcedure.manualSteps,
                    `Test with assistive technologies to confirm the fix works`,
                    `Document that the violation has been successfully resolved`
                ];
                break;
        }

        return contextualProcedure;
    }

    /**
     * Get default procedure for workflow type when no base procedure exists
     */
    getDefaultProcedureForWorkflowType(workflowType) {
        const defaultProcedures = {
            [this.workflowTypes.VIOLATION_VERIFICATION]: {
                title: 'Verify Automated Violation',
                overview: 'Manually verify that the automated tool correctly identified an accessibility violation',
                manualSteps: [
                    'Navigate to the page and locate the flagged element',
                    'Review the automated tool\'s findings and reasoning',
                    'Test the element with assistive technologies',
                    'Determine if the violation is a true positive',
                    'Document the impact on users with disabilities',
                    'Provide remediation recommendations'
                ],
                toolsNeeded: ['screen_reader', 'keyboard_only', 'browser_dev_tools'],
                estimatedTime: 20
            },
            [this.workflowTypes.FALSE_POSITIVE_CHECK]: {
                title: 'Check for False Positive',
                overview: 'Determine if an automated violation is a false positive',
                manualSteps: [
                    'Review the automated violation details',
                    'Examine the flagged element in context',
                    'Test accessibility with assistive technologies',
                    'Determine if the violation is legitimate',
                    'Document rationale for false positive determination'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools'],
                estimatedTime: 15
            },
            [this.workflowTypes.MANUAL_CONFIRMATION]: {
                title: 'Manual Confirmation Required',
                overview: 'Perform manual testing to confirm automated findings',
                manualSteps: [
                    'Review automated test results',
                    'Perform comprehensive manual testing',
                    'Test with multiple assistive technologies',
                    'Validate findings across different scenarios',
                    'Document confidence in results'
                ],
                toolsNeeded: ['screen_reader', 'keyboard_only', 'browser_dev_tools'],
                estimatedTime: 25
            },
            [this.workflowTypes.REMEDIATION_VALIDATION]: {
                title: 'Validate Remediation',
                overview: 'Verify that accessibility fixes resolve the identified issues',
                manualSteps: [
                    'Review the original violation and proposed fix',
                    'Test the fixed element with assistive technologies',
                    'Verify the fix doesn\'t introduce new issues',
                    'Confirm the violation is fully resolved',
                    'Document successful remediation'
                ],
                toolsNeeded: ['screen_reader', 'keyboard_only', 'browser_dev_tools'],
                estimatedTime: 20
            }
        };

        return defaultProcedures[workflowType] || defaultProcedures[this.workflowTypes.MANUAL_CONFIRMATION];
    }

    /**
     * Calculate estimated time for manual task
     */
    calculateEstimatedTime(baseEffort, workflowType) {
        let baseTime = baseEffort?.manual || 20;

        // Adjust based on workflow type
        const adjustments = {
            [this.workflowTypes.VIOLATION_VERIFICATION]: 1.0,
            [this.workflowTypes.FALSE_POSITIVE_CHECK]: 0.7,
            [this.workflowTypes.MANUAL_CONFIRMATION]: 1.2,
            [this.workflowTypes.REMEDIATION_VALIDATION]: 0.9
        };

        const adjustment = adjustments[workflowType] || 1.0;
        return Math.round(baseTime * adjustment);
    }

    /**
     * Extract page ID from violation data
     */
    extractPageIdFromViolation(violation) {
        return violation.pageId || violation.page_id || null;
    }

    /**
     * Create notification for manual testing team
     */
    async createWorkflowNotification(sessionId, task, violationData) {
        try {
            const notificationQuery = `
                INSERT INTO workflow_notifications (
                    id, session_id, task_id, notification_type, priority,
                    title, message, created_at, status
                ) VALUES (
                    gen_random_uuid(), $1, $2, 'manual_task_created', $3, $4, $5,
                    CURRENT_TIMESTAMP, 'unread'
                )
            `;

            const title = `Manual Review Required: ${violationData.criterionNumber}`;
            const message = `Automated testing detected a ${violationData.violation.impact || 'violation'} in ${violationData.criterionNumber}. Manual verification is needed to confirm the finding and provide remediation guidance.`;

            await pool.query(notificationQuery, [
                sessionId,
                task.id,
                task.priority,
                title,
                message
            ]);

        } catch (error) {
            console.error('Error creating workflow notification:', error);
        }
    }

    /**
     * Update session progress to reflect new manual tasks
     */
    async updateSessionProgress(sessionId, workflowTasks) {
        try {
            const progressQuery = `
                UPDATE test_sessions 
                SET progress_summary = COALESCE(progress_summary, '{}'::jsonb) || $1
                WHERE id = $2
            `;

            const progressUpdate = {
                manual_workflow_tasks: workflowTasks.length,
                last_automated_to_manual_sync: new Date().toISOString(),
                pending_manual_reviews: workflowTasks.filter(t => t.status === 'pending').length
            };

            await pool.query(progressQuery, [JSON.stringify(progressUpdate), sessionId]);

        } catch (error) {
            console.error('Error updating session progress:', error);
        }
    }

    /**
     * Get pending manual workflow tasks for a session
     */
    async getPendingWorkflowTasks(sessionId, options = {}) {
        try {
            const { priority, urgency, assignedTester } = options;

            let query = `
                SELECT 
                    mwt.*,
                    wr.title as requirement_title,
                    wr.description as requirement_description,
                    dp.url as page_url,
                    dp.title as page_title
                FROM manual_workflow_tasks mwt
                LEFT JOIN wcag_requirements wr ON mwt.criterion_number = wr.criterion_number
                LEFT JOIN discovered_pages dp ON mwt.page_id = dp.id
                WHERE mwt.session_id = $1 AND mwt.status IN ('pending', 'in_progress')
            `;

            const params = [sessionId];
            let paramCount = 1;

            if (priority) {
                paramCount++;
                query += ` AND mwt.priority = $${paramCount}`;
                params.push(priority);
            }

            if (urgency) {
                paramCount++;
                query += ` AND mwt.urgency_level = $${paramCount}`;
                params.push(urgency);
            }

            if (assignedTester) {
                paramCount++;
                query += ` AND mwt.assigned_tester = $${paramCount}`;
                params.push(assignedTester);
            }

            query += ` ORDER BY mwt.priority DESC, mwt.created_at ASC`;

            const result = await pool.query(query, params);
            return result.rows;

        } catch (error) {
            console.error('Error getting pending workflow tasks:', error);
            throw error;
        }
    }

    /**
     * Assign manual workflow task to a tester
     */
    async assignWorkflowTask(taskId, testerId, assignedBy) {
        try {
            const updateQuery = `
                UPDATE manual_workflow_tasks 
                SET assigned_tester = $1, assigned_at = CURRENT_TIMESTAMP, 
                    assigned_by = $2, status = 'in_progress'
                WHERE id = $3 AND status = 'pending'
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [testerId, assignedBy, taskId]);
            
            if (result.rows.length > 0) {
                // Create assignment notification
                await this.createAssignmentNotification(result.rows[0], testerId);
                return result.rows[0];
            }

            return null;

        } catch (error) {
            console.error('Error assigning workflow task:', error);
            throw error;
        }
    }

    /**
     * Complete manual workflow task with results
     */
    async completeWorkflowTask(taskId, results, completedBy) {
        try {
            const updateQuery = `
                UPDATE manual_workflow_tasks 
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    completed_by = $1, manual_test_results = $2,
                    resolution = $3, confidence_level = $4
                WHERE id = $5
                RETURNING *
            `;

            const resolution = results.isViolation ? 'violation_confirmed' : 
                             results.isFalsePositive ? 'false_positive' : 'resolved';

            const result = await pool.query(updateQuery, [
                completedBy,
                JSON.stringify(results),
                resolution,
                results.confidenceLevel || 'medium',
                taskId
            ]);

            if (result.rows.length > 0) {
                // Update related manual test results table
                await this.updateManualTestResults(result.rows[0], results);
                return result.rows[0];
            }

            return null;

        } catch (error) {
            console.error('Error completing workflow task:', error);
            throw error;
        }
    }

    /**
     * Update manual test results based on workflow completion
     */
    async updateManualTestResults(workflowTask, results) {
        try {
            // Check if manual test result already exists
            const existingQuery = `
                SELECT id FROM manual_test_results 
                WHERE test_session_id = $1 AND page_id = $2 AND requirement_id = (
                    SELECT id FROM wcag_requirements WHERE criterion_number = $3
                )
            `;

            const existing = await pool.query(existingQuery, [
                workflowTask.session_id,
                workflowTask.page_id,
                workflowTask.criterion_number
            ]);

            const testResult = results.isViolation ? 'fail' : 
                             results.isFalsePositive ? 'not_applicable' : 'pass';

            if (existing.rows.length > 0) {
                // Update existing result
                const updateQuery = `
                    UPDATE manual_test_results 
                    SET result = $1, confidence_level = $2, notes = $3, 
                        evidence = $4, tested_at = CURRENT_TIMESTAMP,
                        tester_name = $5, testing_time_minutes = $6
                    WHERE id = $7
                `;

                await pool.query(updateQuery, [
                    testResult,
                    results.confidenceLevel || 'medium',
                    results.notes || '',
                    JSON.stringify(results.evidence || {}),
                    results.testerName,
                    workflowTask.estimated_time_minutes,
                    existing.rows[0].id
                ]);
            } else {
                // Create new result
                const insertQuery = `
                    INSERT INTO manual_test_results (
                        id, test_session_id, page_id, requirement_id, result,
                        confidence_level, notes, evidence, tested_at, tester_name,
                        testing_time_minutes
                    ) VALUES (
                        gen_random_uuid(), $1, $2, 
                        (SELECT id FROM wcag_requirements WHERE criterion_number = $3),
                        $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, $9
                    )
                `;

                await pool.query(insertQuery, [
                    workflowTask.session_id,
                    workflowTask.page_id,
                    workflowTask.criterion_number,
                    testResult,
                    results.confidenceLevel || 'medium',
                    results.notes || '',
                    JSON.stringify(results.evidence || {}),
                    results.testerName,
                    workflowTask.estimated_time_minutes
                ]);
            }

        } catch (error) {
            console.error('Error updating manual test results:', error);
        }
    }

    /**
     * Create assignment notification
     */
    async createAssignmentNotification(task, testerId) {
        try {
            const notificationQuery = `
                INSERT INTO workflow_notifications (
                    id, session_id, task_id, notification_type, priority,
                    title, message, recipient_user_id, created_at, status
                ) VALUES (
                    gen_random_uuid(), $1, $2, 'task_assigned', $3, $4, $5, $6,
                    CURRENT_TIMESTAMP, 'unread'
                )
            `;

            const title = `Manual Task Assigned: ${task.criterion_number}`;
            const message = `You have been assigned a manual testing task for WCAG requirement ${task.criterion_number}. Estimated time: ${task.estimated_time_minutes} minutes.`;

            await pool.query(notificationQuery, [
                task.session_id,
                task.id,
                task.priority,
                title,
                message,
                testerId
            ]);

        } catch (error) {
            console.error('Error creating assignment notification:', error);
        }
    }
}

module.exports = AutomatedToManualWorkflowService; 