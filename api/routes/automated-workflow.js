const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../../database/config');
const AutomatedToManualWorkflowService = require('../../database/services/automated-to-manual-workflow-service');

// Initialize the workflow service
const workflowService = new AutomatedToManualWorkflowService();

/**
 * POST /api/automated-workflow/process-results/:sessionId
 * Process automated test results and create manual workflow tasks
 */
router.post('/process-results/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { automatedResults } = req.body;

        if (!automatedResults) {
            return res.status(400).json({
                success: false,
                error: 'Automated results are required'
            });
        }

        const workflowResult = await workflowService.processAutomatedResults(sessionId, automatedResults);

        res.json({
            success: true,
            data: workflowResult
        });

    } catch (error) {
        console.error('Error processing automated results for workflow:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process automated results',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-workflow/tasks/:sessionId
 * Get pending manual workflow tasks for a session
 */
router.get('/tasks/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { priority, urgency, assignedTester, status } = req.query;

        const tasks = await workflowService.getPendingWorkflowTasks(sessionId, {
            priority: priority ? parseInt(priority) : undefined,
            urgency,
            assignedTester
        });

        // Group tasks by various criteria for dashboard display
        const groupedTasks = {
            byPriority: {
                critical: tasks.filter(t => t.priority === 5),
                high: tasks.filter(t => t.priority === 4),
                medium: tasks.filter(t => t.priority === 3),
                low: tasks.filter(t => t.priority <= 2)
            },
            byUrgency: {
                high: tasks.filter(t => t.urgency_level === 'high'),
                medium: tasks.filter(t => t.urgency_level === 'medium'),
                low: tasks.filter(t => t.urgency_level === 'low')
            },
            byWorkflowType: {},
            byStatus: {
                pending: tasks.filter(t => t.status === 'pending'),
                in_progress: tasks.filter(t => t.status === 'in_progress'),
                blocked: tasks.filter(t => t.status === 'blocked')
            }
        };

        // Group by workflow type
        tasks.forEach(task => {
            if (!groupedTasks.byWorkflowType[task.workflow_type]) {
                groupedTasks.byWorkflowType[task.workflow_type] = [];
            }
            groupedTasks.byWorkflowType[task.workflow_type].push(task);
        });

        res.json({
            success: true,
            data: {
                tasks,
                grouped: groupedTasks,
                summary: {
                    total: tasks.length,
                    pending: groupedTasks.byStatus.pending.length,
                    inProgress: groupedTasks.byStatus.in_progress.length,
                    blocked: groupedTasks.byStatus.blocked.length,
                    critical: groupedTasks.byPriority.critical.length,
                    overdue: tasks.filter(t => this.isTaskOverdue(t)).length
                }
            }
        });

    } catch (error) {
        console.error('Error getting workflow tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get workflow tasks',
            details: error.message
        });
    }
});

/**
 * PUT /api/automated-workflow/tasks/:taskId/assign
 * Assign a manual workflow task to a tester
 */
router.put('/tasks/:taskId/assign', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { testerId } = req.body;
        const assignedBy = req.user.id;

        if (!testerId) {
            return res.status(400).json({
                success: false,
                error: 'Tester ID is required'
            });
        }

        const assignedTask = await workflowService.assignWorkflowTask(taskId, testerId, assignedBy);

        if (!assignedTask) {
            return res.status(404).json({
                success: false,
                error: 'Task not found or already assigned'
            });
        }

        res.json({
            success: true,
            data: assignedTask,
            message: 'Task assigned successfully'
        });

    } catch (error) {
        console.error('Error assigning workflow task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign task',
            details: error.message
        });
    }
});

/**
 * PUT /api/automated-workflow/tasks/:taskId/complete
 * Complete a manual workflow task with results
 */
router.put('/tasks/:taskId/complete', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { results } = req.body;
        const completedBy = req.user.id;

        if (!results) {
            return res.status(400).json({
                success: false,
                error: 'Test results are required'
            });
        }

        // Validate required result fields
        const requiredFields = ['isViolation', 'confidenceLevel', 'notes'];
        const missingFields = requiredFields.filter(field => !(field in results));
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const completedTask = await workflowService.completeWorkflowTask(taskId, results, completedBy);

        if (!completedTask) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            data: completedTask,
            message: 'Task completed successfully'
        });

    } catch (error) {
        console.error('Error completing workflow task:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete task',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-workflow/tasks/:taskId
 * Get detailed information about a specific workflow task
 */
router.get('/tasks/:taskId', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;

        const taskQuery = `
            SELECT 
                mwt.*,
                wr.title as requirement_title,
                wr.description as requirement_description,
                wr.level as requirement_level,
                dp.url as page_url,
                dp.title as page_title,
                u1.username as assigned_tester_name,
                u2.username as completed_by_name
            FROM manual_workflow_tasks mwt
            LEFT JOIN wcag_requirements wr ON mwt.criterion_number = wr.criterion_number
            LEFT JOIN discovered_pages dp ON mwt.page_id = dp.id
            LEFT JOIN users u1 ON mwt.assigned_tester = u1.id
            LEFT JOIN users u2 ON mwt.completed_by = u2.id
            WHERE mwt.id = $1
        `;

        const taskResult = await pool.query(taskQuery, [taskId]);

        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Workflow task not found'
            });
        }

        const task = taskResult.rows[0];

        // Get related notifications
        const notificationsQuery = `
            SELECT * FROM workflow_notifications 
            WHERE task_id = $1 
            ORDER BY created_at DESC
        `;
        const notifications = await pool.query(notificationsQuery, [taskId]);

        // Get task dependencies
        const dependenciesQuery = `
            SELECT 
                wtd.*,
                mwt.criterion_number as dependency_criterion,
                mwt.status as dependency_status
            FROM workflow_task_dependencies wtd
            JOIN manual_workflow_tasks mwt ON wtd.depends_on_task_id = mwt.id
            WHERE wtd.task_id = $1
        `;
        const dependencies = await pool.query(dependenciesQuery, [taskId]);

        res.json({
            success: true,
            data: {
                task,
                notifications: notifications.rows,
                dependencies: dependencies.rows,
                isOverdue: this.isTaskOverdue(task),
                timeRemaining: this.calculateTimeRemaining(task)
            }
        });

    } catch (error) {
        console.error('Error getting workflow task details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get task details',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-workflow/notifications/:sessionId
 * Get workflow notifications for a session
 */
router.get('/notifications/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status, type, limit = 50 } = req.query;
        const userId = req.user.id;

        let query = `
            SELECT 
                wn.*,
                mwt.criterion_number,
                mwt.priority as task_priority
            FROM workflow_notifications wn
            LEFT JOIN manual_workflow_tasks mwt ON wn.task_id = mwt.id
            WHERE wn.session_id = $1 
            AND (wn.recipient_user_id = $2 OR wn.recipient_user_id IS NULL)
        `;

        const params = [sessionId, userId];
        let paramCount = 2;

        if (status) {
            paramCount++;
            query += ` AND wn.status = $${paramCount}`;
            params.push(status);
        }

        if (type) {
            paramCount++;
            query += ` AND wn.notification_type = $${paramCount}`;
            params.push(type);
        }

        query += ` ORDER BY wn.created_at DESC LIMIT $${paramCount + 1}`;
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: {
                notifications: result.rows,
                unreadCount: result.rows.filter(n => n.status === 'unread').length
            }
        });

    } catch (error) {
        console.error('Error getting workflow notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notifications',
            details: error.message
        });
    }
});

/**
 * PUT /api/automated-workflow/notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const updateQuery = `
            UPDATE workflow_notifications 
            SET status = 'read', read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND (recipient_user_id = $2 OR recipient_user_id IS NULL)
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [notificationId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read',
            details: error.message
        });
    }
});

/**
 * GET /api/automated-workflow/metrics/:sessionId
 * Get workflow metrics and analytics for a session
 */
router.get('/metrics/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { startDate, endDate } = req.query;

        // Get current workflow metrics
        const metricsQuery = `
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN priority = 5 THEN 1 END) as critical_tasks,
                COUNT(CASE WHEN urgency_level = 'high' THEN 1 END) as urgent_tasks,
                AVG(actual_time_minutes) as avg_completion_time,
                AVG(CASE WHEN status = 'completed' THEN 
                    EXTRACT(EPOCH FROM (completed_at - created_at))/60 
                END) as avg_turnaround_minutes
            FROM manual_workflow_tasks
            WHERE session_id = $1
        `;

        const metricsResult = await pool.query(metricsQuery, [sessionId]);
        const metrics = metricsResult.rows[0];

        // Get completion rate by workflow type
        const workflowTypeQuery = `
            SELECT 
                workflow_type,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                AVG(actual_time_minutes) as avg_time
            FROM manual_workflow_tasks
            WHERE session_id = $1
            GROUP BY workflow_type
        `;

        const workflowTypeResult = await pool.query(workflowTypeQuery, [sessionId]);

        // Get daily metrics if date range provided
        let dailyMetrics = [];
        if (startDate && endDate) {
            const dailyQuery = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as tasks_created,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as tasks_completed
                FROM manual_workflow_tasks
                WHERE session_id = $1 AND created_at BETWEEN $2 AND $3
                GROUP BY DATE(created_at)
                ORDER BY date
            `;

            const dailyResult = await pool.query(dailyQuery, [sessionId, startDate, endDate]);
            dailyMetrics = dailyResult.rows;
        }

        // Calculate efficiency metrics
        const totalTasks = parseInt(metrics.total_tasks) || 0;
        const completedTasks = parseInt(metrics.completed_tasks) || 0;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        res.json({
            success: true,
            data: {
                overview: {
                    totalTasks: totalTasks,
                    pendingTasks: parseInt(metrics.pending_tasks) || 0,
                    inProgressTasks: parseInt(metrics.in_progress_tasks) || 0,
                    completedTasks: completedTasks,
                    criticalTasks: parseInt(metrics.critical_tasks) || 0,
                    urgentTasks: parseInt(metrics.urgent_tasks) || 0,
                    completionRate: Math.round(completionRate),
                    avgCompletionTime: Math.round(parseFloat(metrics.avg_completion_time) || 0),
                    avgTurnaroundTime: Math.round(parseFloat(metrics.avg_turnaround_minutes) || 0)
                },
                byWorkflowType: workflowTypeResult.rows.map(row => ({
                    type: row.workflow_type,
                    total: parseInt(row.total),
                    completed: parseInt(row.completed),
                    completionRate: Math.round((parseInt(row.completed) / parseInt(row.total)) * 100),
                    avgTime: Math.round(parseFloat(row.avg_time) || 0)
                })),
                dailyMetrics
            }
        });

    } catch (error) {
        console.error('Error getting workflow metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get workflow metrics',
            details: error.message
        });
    }
});

/**
 * POST /api/automated-workflow/bulk-assign
 * Bulk assign multiple tasks to testers
 */
router.post('/bulk-assign', authenticateToken, async (req, res) => {
    try {
        const { assignments } = req.body; // Array of {taskId, testerId}
        const assignedBy = req.user.id;

        if (!assignments || !Array.isArray(assignments)) {
            return res.status(400).json({
                success: false,
                error: 'Assignments array is required'
            });
        }

        const results = [];
        const errors = [];

        for (const assignment of assignments) {
            try {
                const result = await workflowService.assignWorkflowTask(
                    assignment.taskId, 
                    assignment.testerId, 
                    assignedBy
                );
                
                if (result) {
                    results.push(result);
                } else {
                    errors.push({
                        taskId: assignment.taskId,
                        error: 'Task not found or already assigned'
                    });
                }
            } catch (error) {
                errors.push({
                    taskId: assignment.taskId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                assigned: results,
                errors: errors,
                summary: {
                    total: assignments.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        console.error('Error bulk assigning tasks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk assign tasks',
            details: error.message
        });
    }
});

// Helper functions
function isTaskOverdue(task) {
    if (!task.created_at || task.status === 'completed') return false;
    
    const created = new Date(task.created_at);
    const now = new Date();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);
    
    const overdueThresholds = {
        'high': 24,
        'medium': 72,
        'low': 168
    };
    
    const threshold = overdueThresholds[task.urgency_level] || 72;
    return hoursElapsed > threshold;
}

function calculateTimeRemaining(task) {
    if (!task.created_at || task.status === 'completed') return null;
    
    const created = new Date(task.created_at);
    const now = new Date();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);
    
    const overdueThresholds = {
        'high': 24,
        'medium': 72,
        'low': 168
    };
    
    const threshold = overdueThresholds[task.urgency_level] || 72;
    const remaining = threshold - hoursElapsed;
    
    return remaining > 0 ? Math.round(remaining) : 0;
}

module.exports = router; 