-- Automated-to-Manual Workflow Schema
-- Tables to support the workflow from automated detection to manual resolution

-- Manual workflow tasks created from automated violations
CREATE TABLE IF NOT EXISTS manual_workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    criterion_number VARCHAR(20) NOT NULL, -- WCAG criterion like '1.1.1'
    page_id UUID REFERENCES discovered_pages(id),
    
    -- Workflow details
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN (
        'violation_verification', 'false_positive_check', 
        'manual_confirmation', 'remediation_validation'
    )),
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=critical
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high')),
    
    -- Task status and assignment
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'cancelled', 'blocked'
    )),
    assigned_tester UUID, -- User ID of assigned tester
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID, -- User ID who made the assignment
    
    -- Automated violation context
    automated_violation_data JSONB NOT NULL DEFAULT '{}', -- Original violation details
    manual_procedure JSONB NOT NULL DEFAULT '{}', -- Contextual manual test procedure
    
    -- Completion details
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID, -- User ID who completed the task
    manual_test_results JSONB DEFAULT '{}', -- Results of manual testing
    resolution VARCHAR(50) CHECK (resolution IN (
        'violation_confirmed', 'false_positive', 'resolved', 'not_applicable'
    )),
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('low', 'medium', 'high')),
    
    -- Time tracking
    estimated_time_minutes INTEGER DEFAULT 20,
    actual_time_minutes INTEGER,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_manual_workflow_tasks_session (session_id),
    INDEX idx_manual_workflow_tasks_status (status),
    INDEX idx_manual_workflow_tasks_assigned (assigned_tester),
    INDEX idx_manual_workflow_tasks_priority (priority, urgency_level),
    INDEX idx_manual_workflow_tasks_criterion (criterion_number)
);

-- Workflow notifications for team communication
CREATE TABLE IF NOT EXISTS workflow_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES manual_workflow_tasks(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'manual_task_created', 'task_assigned', 'task_completed', 
        'task_overdue', 'violation_escalated', 'workflow_blocked'
    )),
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500), -- URL to take action on the notification
    
    -- Recipients
    recipient_user_id UUID, -- Specific user (null for broadcast)
    recipient_role VARCHAR(50), -- Role-based notification (e.g., 'manual_tester')
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Auto-dismiss after this time
    
    -- Indexes
    INDEX idx_workflow_notifications_recipient (recipient_user_id, status),
    INDEX idx_workflow_notifications_session (session_id),
    INDEX idx_workflow_notifications_type (notification_type),
    INDEX idx_workflow_notifications_created (created_at)
);

-- Workflow task dependencies (for complex workflows)
CREATE TABLE IF NOT EXISTS workflow_task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES manual_workflow_tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES manual_workflow_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks' CHECK (dependency_type IN (
        'blocks', 'informs', 'validates'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent circular dependencies
    UNIQUE(task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id)
);

-- Workflow metrics for reporting and optimization
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Automated test metrics
    total_automated_violations INTEGER DEFAULT 0,
    violations_requiring_manual_review INTEGER DEFAULT 0,
    false_positive_candidates INTEGER DEFAULT 0,
    
    -- Manual workflow metrics
    manual_tasks_created INTEGER DEFAULT 0,
    manual_tasks_completed INTEGER DEFAULT 0,
    manual_tasks_pending INTEGER DEFAULT 0,
    average_task_completion_time_minutes DECIMAL(10,2),
    
    -- Quality metrics
    violations_confirmed INTEGER DEFAULT 0,
    false_positives_identified INTEGER DEFAULT 0,
    manual_only_violations_found INTEGER DEFAULT 0,
    
    -- Efficiency metrics
    automated_to_manual_conversion_rate DECIMAL(5,2), -- % of automated violations needing manual review
    manual_task_completion_rate DECIMAL(5,2), -- % of manual tasks completed
    average_confidence_score DECIMAL(3,2), -- Average confidence in manual results
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(session_id, metric_date)
);

-- Workflow configuration settings
CREATE TABLE IF NOT EXISTS workflow_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Auto-assignment rules
    auto_assign_enabled BOOLEAN DEFAULT false,
    auto_assign_by_expertise BOOLEAN DEFAULT true,
    auto_assign_by_workload BOOLEAN DEFAULT true,
    max_concurrent_tasks_per_user INTEGER DEFAULT 5,
    
    -- Priority escalation rules
    escalate_high_priority_after_hours INTEGER DEFAULT 24,
    escalate_medium_priority_after_hours INTEGER DEFAULT 72,
    escalate_low_priority_after_hours INTEGER DEFAULT 168, -- 1 week
    
    -- Notification preferences
    notify_on_task_creation BOOLEAN DEFAULT true,
    notify_on_task_assignment BOOLEAN DEFAULT true,
    notify_on_task_completion BOOLEAN DEFAULT true,
    notify_on_overdue_tasks BOOLEAN DEFAULT true,
    
    -- Quality thresholds
    minimum_confidence_threshold VARCHAR(20) DEFAULT 'medium',
    require_second_review_for_critical BOOLEAN DEFAULT true,
    auto_escalate_repeated_false_positives BOOLEAN DEFAULT true,
    
    -- Global settings (when session_id is null)
    is_global_config BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one global config
    UNIQUE(session_id),
    CHECK ((session_id IS NOT NULL) OR (is_global_config = true))
);

-- Workflow audit log for tracking all workflow actions
CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
    task_id UUID REFERENCES manual_workflow_tasks(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'task_created', 'task_assigned', 'task_started', 'task_completed',
        'task_cancelled', 'task_escalated', 'task_reassigned', 'status_changed',
        'priority_changed', 'deadline_extended', 'dependency_added'
    )),
    performed_by UUID NOT NULL, -- User ID
    
    -- Context
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    reason TEXT,
    
    -- System context
    ip_address INET,
    user_agent TEXT,
    session_token VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for audit queries
    INDEX idx_workflow_audit_log_session (session_id, created_at),
    INDEX idx_workflow_audit_log_task (task_id, created_at),
    INDEX idx_workflow_audit_log_user (performed_by, created_at),
    INDEX idx_workflow_audit_log_action (action_type, created_at)
);

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS trigger_manual_workflow_tasks_updated_at ON manual_workflow_tasks;
CREATE TRIGGER trigger_manual_workflow_tasks_updated_at
    BEFORE UPDATE ON manual_workflow_tasks
    FOR EACH ROW EXECUTE FUNCTION update_workflow_updated_at();

DROP TRIGGER IF EXISTS trigger_workflow_configuration_updated_at ON workflow_configuration;
CREATE TRIGGER trigger_workflow_configuration_updated_at
    BEFORE UPDATE ON workflow_configuration
    FOR EACH ROW EXECUTE FUNCTION update_workflow_updated_at();

-- Comments for documentation
COMMENT ON TABLE manual_workflow_tasks IS 'Manual testing tasks created from automated violation detection';
COMMENT ON TABLE workflow_notifications IS 'Notifications for workflow events and task assignments';
COMMENT ON TABLE workflow_task_dependencies IS 'Dependencies between workflow tasks';
COMMENT ON TABLE workflow_metrics IS 'Daily metrics for workflow performance and quality';
COMMENT ON TABLE workflow_configuration IS 'Configuration settings for workflow automation';
COMMENT ON TABLE workflow_audit_log IS 'Audit trail for all workflow actions and changes';

-- Sample workflow configuration (global defaults)
INSERT INTO workflow_configuration (
    is_global_config, auto_assign_enabled, auto_assign_by_expertise,
    escalate_high_priority_after_hours, notify_on_task_creation,
    minimum_confidence_threshold, require_second_review_for_critical
) VALUES (
    true, false, true, 24, true, 'medium', true
) ON CONFLICT (session_id) WHERE is_global_config = true DO NOTHING; 