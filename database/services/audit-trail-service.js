/**
 * Audit Trail Service
 * Manages complete audit trail for test instances and review workflow
 */

const { Pool } = require('pg');
const AutomatedEvidenceService = require('./automated-evidence-service');

class AuditTrailService {
    constructor(pool) {
        this.pool = pool;
        this.evidenceService = new AutomatedEvidenceService(pool);
    }

    /**
     * Process automated test result with audit trail and review workflow
     * @param {string} testInstanceId - Test instance UUID
     * @param {Object} automatedResult - Automated test result
     * @param {string} wcagCriterion - WCAG criterion being tested
     * @param {Object} existingClient - Optional database client (for transactions)
     */
    async processAutomatedResult(testInstanceId, automatedResult, wcagCriterion, existingClient = null) {
        const shouldManageConnection = !existingClient;
        const client = existingClient || await this.pool.connect();
        
        try {
            if (shouldManageConnection) {
                await client.query('BEGIN');
            }
            
            console.log(`📋 Processing automated result for test instance ${testInstanceId}`);
            
            // 1. Extract detailed evidence
            const evidence = await this.evidenceService.extractEvidence(automatedResult, wcagCriterion);
            
            // 2. Get current test instance status
            const currentInstance = await this.getTestInstance(client, testInstanceId);
            if (!currentInstance) {
                throw new Error(`Test instance ${testInstanceId} not found`);
            }
            
            // 3. Determine preliminary status based on automated result
            const preliminaryStatus = this.determinePreliminaryStatus(automatedResult, evidence);
            
            // 4. Check if human review is required
            const needsReview = evidence.review_indicators?.requires_human_review || false;
            const finalStatus = needsReview ? 'needs_review' : preliminaryStatus;
            
            // 5. Set audit context for trigger
            await this.setAuditContext(client, {
                changed_by_type: 'automated_tool',
                tool_name: automatedResult.tool_name,
                change_reason: 'initial_automated_result',
                change_description: `Automated ${preliminaryStatus} result from ${automatedResult.tool_name}${needsReview ? ' - flagged for review' : ''}`
            });
            
            // 6. Update test instance status
            await client.query(`
                UPDATE test_instances 
                SET status = $1, 
                    test_method_used = 'automated',
                    tool_used = $2,
                    updated_at = CURRENT_TIMESTAMP,
                    automated_result_id = NULL
                WHERE id = $4
            `, [finalStatus, automatedResult.tool_name, testInstanceId]);
            
            // 7. Create audit log entry manually (with full evidence)
            const auditLogId = await this.createAuditLogEntry(client, {
                test_instance_id: testInstanceId,
                status_from: currentInstance.status,
                status_to: finalStatus,
                changed_by_type: 'automated_tool',
                tool_name: automatedResult.tool_name,
                change_reason: 'initial_automated_result',
                change_description: `Automated ${preliminaryStatus} result from ${automatedResult.tool_name}`,
                evidence: evidence,
                raw_tool_output: automatedResult.raw_results,
                automated_result_id: automatedResult.id,
                tool_confidence_score: evidence.confidence_level === 'high' ? 0.9 : evidence.confidence_level === 'medium' ? 0.7 : 0.5,
                tool_execution_time_ms: evidence.test_execution?.execution_time
            });
            
            // 8. Add to review queue if needed
            let reviewQueueId = null;
            if (needsReview) {
                reviewQueueId = await this.addToReviewQueue(client, {
                    test_instance_id: testInstanceId,
                    automated_result_id: automatedResult.id,
                    tool_name: automatedResult.tool_name,
                    tool_result: preliminaryStatus,
                    wcag_criterion: wcagCriterion,
                    automated_evidence: evidence,
                    priority: this.determinePriority(evidence, wcagCriterion),
                    review_category: this.determineReviewCategory(wcagCriterion, evidence)
                });
                
                console.log(`📝 Added to review queue: ${reviewQueueId}`);
            }
            
            if (shouldManageConnection) {
                await client.query('COMMIT');
            }
            
            console.log(`✅ Processed automated result: ${finalStatus}${needsReview ? ' (review required)' : ''}`);
            
            return {
                audit_log_id: auditLogId,
                review_queue_id: reviewQueueId,
                final_status: finalStatus,
                needs_review: needsReview,
                evidence: evidence
            };
            
        } catch (error) {
            if (shouldManageConnection) {
                await client.query('ROLLBACK');
            }
            console.error('❌ Error processing automated result:', error);
            throw error;
        } finally {
            await this.clearAuditContext(client);
            if (shouldManageConnection) {
                client.release();
            }
        }
    }

    /**
     * Process manual review of automated result
     * @param {string} reviewQueueId - Review queue item ID
     * @param {Object} reviewDecision - Reviewer's decision and evidence
     */
    async processManualReview(reviewQueueId, reviewDecision) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            console.log(`👤 Processing manual review for queue item ${reviewQueueId}`);
            
            // 1. Get review queue item
            const queueItem = await this.getReviewQueueItem(client, reviewQueueId);
            if (!queueItem) {
                throw new Error(`Review queue item ${reviewQueueId} not found`);
            }
            
            // 2. Get current test instance
            const currentInstance = await this.getTestInstance(client, queueItem.test_instance_id);
            
            // 3. Determine final status based on review decision
            const finalStatus = this.resolveFinalStatus(queueItem.tool_result, reviewDecision);
            
            // 4. Set audit context
            await this.setAuditContext(client, {
                changed_by_type: 'manual_tester',
                changed_by_user: reviewDecision.reviewer_id,
                change_reason: 'manual_review',
                change_description: `Manual review: ${reviewDecision.decision} - ${reviewDecision.reason}`
            });
            
            // 5. Update test instance
            await client.query(`
                UPDATE test_instances 
                SET status = $1,
                    reviewer = $2,
                    confidence_level = $3,
                    notes = COALESCE(notes, '') || $4,
                    updated_at = CURRENT_TIMESTAMP,
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = $5
            `, [
                finalStatus,
                reviewDecision.reviewer_id,
                reviewDecision.confidence_level || currentInstance.confidence_level,
                `\n[Review ${new Date().toISOString()}] ${reviewDecision.notes || ''}`,
                queueItem.test_instance_id
            ]);
            
            // 6. Create audit log entry
            const auditLogId = await this.createAuditLogEntry(client, {
                test_instance_id: queueItem.test_instance_id,
                status_from: currentInstance.status,
                status_to: finalStatus,
                changed_by_type: 'manual_tester',
                changed_by_user: reviewDecision.reviewer_id,
                change_reason: 'manual_review',
                change_description: `Manual review completed: ${reviewDecision.decision}`,
                reviewer_notes: reviewDecision.notes,
                evidence: reviewDecision.additional_evidence || {},
                supporting_files: reviewDecision.evidence_files || []
            });
            
            // 7. Update review queue item
            await client.query(`
                UPDATE automated_result_review_queue
                SET review_status = 'completed',
                    review_decision = $1,
                    reviewer_notes = $2,
                    review_evidence = $3,
                    review_completed_at = CURRENT_TIMESTAMP,
                    time_to_completion = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/60
                WHERE id = $4
            `, [
                reviewDecision.decision,
                reviewDecision.notes,
                reviewDecision.additional_evidence || {},
                reviewQueueId
            ]);
            
            await client.query('COMMIT');
            
            console.log(`✅ Manual review completed: ${finalStatus}`);
            
            return {
                audit_log_id: auditLogId,
                final_status: finalStatus,
                review_decision: reviewDecision.decision
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error processing manual review:', error);
            throw error;
        } finally {
            await this.clearAuditContext(client);
            client.release();
        }
    }

    /**
     * Get complete audit trail for a test instance
     */
    async getTestInstanceAuditTrail(testInstanceId) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    al.*,
                    au.username as changed_by_username,
                    ti.requirement_id,
                    tr.title as requirement_title,
                    tr.criterion_number
                FROM test_instance_audit_log al
                LEFT JOIN auth_users au ON al.changed_by_user = au.id
                LEFT JOIN test_instances ti ON al.test_instance_id = ti.id
                LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
                WHERE al.test_instance_id = $1
                ORDER BY al.created_at ASC
            `, [testInstanceId]);
            
            return result.rows.map(row => ({
                ...row,
                evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence,
                raw_tool_output: typeof row.raw_tool_output === 'string' ? JSON.parse(row.raw_tool_output) : row.raw_tool_output,
                screenshots: typeof row.screenshots === 'string' ? JSON.parse(row.screenshots) : row.screenshots,
                supporting_files: typeof row.supporting_files === 'string' ? JSON.parse(row.supporting_files) : row.supporting_files
            }));
            
        } finally {
            client.release();
        }
    }

    /**
     * Get review queue dashboard data
     */
    async getReviewQueueDashboard(filters = {}) {
        const client = await this.pool.connect();
        
        try {
            let whereClause = "WHERE rq.review_status IN ('pending', 'assigned', 'in_review', 'needs_clarification')";
            const queryParams = [];
            
            if (filters.assigned_reviewer) {
                queryParams.push(filters.assigned_reviewer);
                whereClause += ` AND rq.assigned_reviewer = $${queryParams.length}`;
            }
            
            if (filters.priority) {
                queryParams.push(filters.priority);
                whereClause += ` AND rq.priority = $${queryParams.length}`;
            }
            
            if (filters.wcag_criterion) {
                queryParams.push(filters.wcag_criterion);
                whereClause += ` AND rq.wcag_criterion = $${queryParams.length}`;
            }
            
            const result = await client.query(`
                SELECT * FROM review_queue_dashboard
                ${whereClause}
                ORDER BY 
                    CASE rq.priority 
                        WHEN 'critical' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        ELSE 4 
                    END,
                    rq.due_date ASC
            `, queryParams);
            
            return result.rows;
            
        } finally {
            client.release();
        }
    }

    /**
     * Get review queue statistics
     */
    async getReviewQueueStats() {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    COUNT(*) as total_items,
                    COUNT(*) FILTER (WHERE review_status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE review_status = 'assigned') as assigned,
                    COUNT(*) FILTER (WHERE review_status = 'in_review') as in_review,
                    COUNT(*) FILTER (WHERE review_status = 'needs_clarification') as needs_clarification,
                    COUNT(*) FILTER (WHERE due_date < CURRENT_TIMESTAMP) as overdue,
                    COUNT(*) FILTER (WHERE priority = 'critical') as critical_priority,
                    COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
                    AVG(time_to_completion) FILTER (WHERE review_status = 'completed') as avg_completion_time_minutes
                FROM automated_result_review_queue
                WHERE review_status IN ('pending', 'assigned', 'in_review', 'needs_clarification', 'completed')
            `);
            
            return result.rows[0];
            
        } finally {
            client.release();
        }
    }

    /**
     * Helper methods
     */

    async getTestInstance(client, testInstanceId) {
        const result = await client.query('SELECT * FROM test_instances WHERE id = $1', [testInstanceId]);
        return result.rows[0];
    }

    async getReviewQueueItem(client, reviewQueueId) {
        const result = await client.query('SELECT * FROM automated_result_review_queue WHERE id = $1', [reviewQueueId]);
        return result.rows[0];
    }

    determinePreliminaryStatus(automatedResult, evidence) {
        if (automatedResult.violations_count === 0) return 'passed';
        if (automatedResult.violations_count > 0) return 'failed';
        return 'pending';
    }

    determinePriority(evidence, wcagCriterion) {
        // Critical WCAG criteria get high priority
        const criticalCriteria = ['1.1.1', '2.1.1', '4.1.1', '4.1.2'];
        if (criticalCriteria.includes(wcagCriterion)) return 'high';
        
        // Financial/legal data contexts get high priority
        if (wcagCriterion === '3.3.4') return 'high';
        
        // Low confidence results get higher priority
        if (evidence.confidence_level === 'low') return 'high';
        
        return 'medium';
    }

    determineReviewCategory(wcagCriterion, evidence) {
        if (wcagCriterion === '3.3.4') return 'financial_data';
        if (['3.2.1', '3.2.2'].includes(wcagCriterion)) return 'legal_compliance';
        if (['1.1.1', '2.1.1', '4.1.1'].includes(wcagCriterion)) return 'accessibility_critical';
        return 'standard';
    }

    resolveFinalStatus(toolResult, reviewDecision) {
        if (reviewDecision.decision === 'accept') return toolResult === 'pass' ? 'passed' : 'failed';
        if (reviewDecision.decision === 'reject') return toolResult === 'pass' ? 'failed' : 'passed';
        if (reviewDecision.decision === 'modify') return reviewDecision.override_status || 'needs_review';
        return 'needs_review';
    }

    async setAuditContext(client, context) {
        // Set session variables for trigger
        for (const [key, value] of Object.entries(context)) {
            if (value !== null && value !== undefined) {
                await client.query(`SELECT set_config('app.audit.${key}', $1, true)`, [String(value)]);
            }
        }
    }

    async clearAuditContext(client) {
        const contextKeys = ['changed_by_type', 'changed_by_user', 'tool_name', 'change_reason', 'change_description'];
        for (const key of contextKeys) {
            await client.query(`SELECT set_config('app.audit.${key}', '', true)`);
        }
    }

    async createAuditLogEntry(client, data) {
        const result = await client.query(`
            INSERT INTO test_instance_audit_log (
                test_instance_id, status_from, status_to, changed_by_type, 
                changed_by_user, tool_name, change_reason, change_description,
                reviewer_notes, evidence, raw_tool_output, screenshots, 
                supporting_files, automated_result_id, tool_confidence_score,
                tool_execution_time_ms
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `, [
            data.test_instance_id,
            data.status_from,
            data.status_to,
            data.changed_by_type,
            data.changed_by_user,
            data.tool_name,
            data.change_reason,
            data.change_description,
            data.reviewer_notes,
            JSON.stringify(data.evidence || {}),
            JSON.stringify(data.raw_tool_output || {}),
            JSON.stringify(data.screenshots || []),
            JSON.stringify(data.supporting_files || []),
            data.automated_result_id,
            data.tool_confidence_score,
            data.tool_execution_time_ms
        ]);
        
        return result.rows[0].id;
    }

    async addToReviewQueue(client, data) {
        const result = await client.query(`
            INSERT INTO automated_result_review_queue (
                test_instance_id, automated_result_id, tool_name, tool_result,
                wcag_criterion, automated_evidence, priority, review_category,
                complexity_score, false_positive_risk, tool_confidence,
                due_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 
                CURRENT_TIMESTAMP + (CASE 
                    WHEN $7 = 'critical' THEN INTERVAL '4 hours'
                    WHEN $7 = 'high' THEN INTERVAL '12 hours' 
                    WHEN $7 = 'medium' THEN INTERVAL '24 hours'
                    ELSE INTERVAL '48 hours'
                END))
            RETURNING id
        `, [
            data.test_instance_id,
            data.automated_result_id,
            data.tool_name,
            data.tool_result,
            data.wcag_criterion,
            JSON.stringify(data.automated_evidence),
            data.priority,
            data.review_category,
            data.automated_evidence.review_indicators?.complexity_score || 0.5,
            data.automated_evidence.review_indicators?.false_positive_risk || 0.3,
            data.automated_evidence.confidence_level === 'high' ? 0.9 : 
                data.automated_evidence.confidence_level === 'medium' ? 0.7 : 0.5
        ]);
        
        return result.rows[0].id;
    }
}

module.exports = AuditTrailService; 