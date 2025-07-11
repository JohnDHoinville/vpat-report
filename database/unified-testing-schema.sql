-- Unified Testing Session Architecture Schema
-- Created: December 11, 2024
-- Purpose: Enterprise-grade accessibility compliance management platform

-- =============================================================================
-- CORE TABLES FOR UNIFIED TESTING SESSION ARCHITECTURE
-- =============================================================================

-- Testing session management
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conformance_level VARCHAR(20) NOT NULL CHECK (conformance_level IN ('wcag_a', 'wcag_aa', 'wcag_aaa', 'section_508', 'combined')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth_users(id),
    updated_by UUID REFERENCES auth_users(id),
    
    -- Session metadata
    total_tests_count INTEGER DEFAULT 0,
    completed_tests_count INTEGER DEFAULT 0,
    passed_tests_count INTEGER DEFAULT 0,
    failed_tests_count INTEGER DEFAULT 0,
    
    -- Audit fields
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    estimated_completion_date DATE,
    
    CONSTRAINT valid_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Pre-defined test requirements (WCAG, Section 508)
CREATE TABLE test_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_type VARCHAR(20) NOT NULL CHECK (requirement_type IN ('wcag', 'section_508')),
    criterion_number VARCHAR(20) NOT NULL, -- e.g., '1.1.1', '1.2.2', '502.2.1'
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    level VARCHAR(10) CHECK (level IN ('a', 'aa', 'aaa', 'base', 'enhanced')), -- WCAG levels or Section 508 levels
    test_method VARCHAR(20) NOT NULL CHECK (test_method IN ('automated', 'manual', 'both')),
    
    -- Testing instructions
    testing_instructions TEXT,
    acceptance_criteria TEXT,
    failure_examples TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    estimated_time_minutes INTEGER DEFAULT 30,
    
    -- Standards references
    wcag_url VARCHAR(500),
    section_508_url VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(requirement_type, criterion_number)
);

-- Individual test instances for each session
CREATE TABLE test_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES test_requirements(id),
    page_id UUID REFERENCES discovered_pages(id), -- Optional: test can be site-wide
    
    -- Test execution details
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review')),
    assigned_tester UUID REFERENCES auth_users(id),
    reviewer UUID REFERENCES auth_users(id),
    confidence_level VARCHAR(10) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    
    -- Test results and documentation
    notes TEXT,
    remediation_notes TEXT,
    evidence JSONB DEFAULT '[]'::jsonb, -- Array of evidence files/screenshots
    
    -- Test execution metadata
    test_method_used VARCHAR(20) CHECK (test_method_used IN ('automated', 'manual')),
    tool_used VARCHAR(100), -- e.g., 'axe-core', 'pa11y', 'manual', 'wave'
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Assignment tracking
    assigned_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Automated test integration
    automated_result_id UUID REFERENCES automated_test_results(id),
    manual_result_id UUID REFERENCES manual_test_results(id),
    
    UNIQUE(session_id, requirement_id, page_id)
);

-- Comprehensive audit trail for all test changes
CREATE TABLE test_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth_users(id),
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'created', 'assignment', 'status_change', 'note_added', 'note_updated', 
        'evidence_uploaded', 'evidence_removed', 'review_requested', 'reviewed', 
        'approved', 'rejected', 'remediation_added', 'automated_update'
    )),
    
    -- Change tracking
    old_value JSONB,
    new_value JSONB,
    change_description TEXT,
    
    -- Context information
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255), -- HTTP session ID
    
    -- Additional context
    details JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Test Sessions indexes
CREATE INDEX idx_test_sessions_project_id ON test_sessions(project_id);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);
CREATE INDEX idx_test_sessions_conformance_level ON test_sessions(conformance_level);
CREATE INDEX idx_test_sessions_created_by ON test_sessions(created_by);
CREATE INDEX idx_test_sessions_updated_at ON test_sessions(updated_at);

-- Test Requirements indexes
CREATE INDEX idx_test_requirements_type_level ON test_requirements(requirement_type, level);
CREATE INDEX idx_test_requirements_test_method ON test_requirements(test_method);
CREATE INDEX idx_test_requirements_active ON test_requirements(is_active);
CREATE INDEX idx_test_requirements_priority ON test_requirements(priority);

-- Test Instances indexes
CREATE INDEX idx_test_instances_session_id ON test_instances(session_id);
CREATE INDEX idx_test_instances_requirement_id ON test_instances(requirement_id);
CREATE INDEX idx_test_instances_page_id ON test_instances(page_id);
CREATE INDEX idx_test_instances_status ON test_instances(status);
CREATE INDEX idx_test_instances_assigned_tester ON test_instances(assigned_tester);
CREATE INDEX idx_test_instances_reviewer ON test_instances(reviewer);
CREATE INDEX idx_test_instances_updated_at ON test_instances(updated_at);
CREATE INDEX idx_test_instances_session_status ON test_instances(session_id, status);

-- Audit Log indexes
CREATE INDEX idx_test_audit_log_test_instance_id ON test_audit_log(test_instance_id);
CREATE INDEX idx_test_audit_log_user_id ON test_audit_log(user_id);
CREATE INDEX idx_test_audit_log_action_type ON test_audit_log(action_type);
CREATE INDEX idx_test_audit_log_timestamp ON test_audit_log(timestamp);
CREATE INDEX idx_test_audit_log_instance_timestamp ON test_audit_log(test_instance_id, timestamp);

-- =============================================================================
-- TRIGGERS FOR AUDIT LOGGING AND AUTOMATIC UPDATES
-- =============================================================================

-- Function to update test session statistics
CREATE OR REPLACE FUNCTION update_test_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session statistics when test instance status changes
    UPDATE test_sessions 
    SET 
        total_tests_count = (
            SELECT COUNT(*) 
            FROM test_instances 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        ),
        completed_tests_count = (
            SELECT COUNT(*) 
            FROM test_instances 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND status IN ('passed', 'failed', 'untestable', 'not_applicable')
        ),
        passed_tests_count = (
            SELECT COUNT(*) 
            FROM test_instances 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND status = 'passed'
        ),
        failed_tests_count = (
            SELECT COUNT(*) 
            FROM test_instances 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
            AND status = 'failed'
        ),
        completion_percentage = (
            SELECT 
                CASE 
                    WHEN COUNT(*) = 0 THEN 0 
                    ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('passed', 'failed', 'untestable', 'not_applicable'))::DECIMAL / COUNT(*)) * 100, 2)
                END
            FROM test_instances 
            WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for test session statistics updates
CREATE TRIGGER trigger_update_test_session_stats
    AFTER INSERT OR UPDATE OR DELETE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_test_session_stats();

-- Function to log test instance changes
CREATE OR REPLACE FUNCTION log_test_instance_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_type_val TEXT;
    old_val JSONB;
    new_val JSONB;
    change_desc TEXT;
BEGIN
    -- Determine action type and build change description
    IF TG_OP = 'INSERT' THEN
        action_type_val := 'created';
        new_val := to_jsonb(NEW);
        change_desc := 'Test instance created';
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine specific type of update
        IF OLD.status != NEW.status THEN
            action_type_val := 'status_change';
            change_desc := 'Status changed from ' || OLD.status || ' to ' || NEW.status;
        ELSIF OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester THEN
            action_type_val := 'assignment';
            change_desc := 'Assignment changed';
        ELSIF OLD.notes IS DISTINCT FROM NEW.notes THEN
            action_type_val := 'note_updated';
            change_desc := 'Notes updated';
        ELSIF OLD.evidence IS DISTINCT FROM NEW.evidence THEN
            action_type_val := 'evidence_uploaded';
            change_desc := 'Evidence modified';
        ELSE
            action_type_val := 'updated';
            change_desc := 'Test instance updated';
        END IF;
        
        old_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_type_val := 'deleted';
        old_val := to_jsonb(OLD);
        change_desc := 'Test instance deleted';
    END IF;
    
    -- Insert audit log entry
    INSERT INTO test_audit_log (
        test_instance_id,
        user_id,
        action_type,
        old_value,
        new_value,
        change_description,
        timestamp
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.updated_by, OLD.updated_by),
        action_type_val,
        old_val,
        new_val,
        change_desc,
        CURRENT_TIMESTAMP
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
CREATE TRIGGER trigger_log_test_instance_changes
    AFTER INSERT OR UPDATE OR DELETE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION log_test_instance_changes();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER trigger_test_sessions_updated_at
    BEFORE UPDATE ON test_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_test_requirements_updated_at
    BEFORE UPDATE ON test_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_test_instances_updated_at
    BEFORE UPDATE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- Session progress summary view
CREATE VIEW test_session_progress AS
SELECT 
    ts.id AS session_id,
    ts.name AS session_name,
    ts.conformance_level,
    ts.status AS session_status,
    ts.total_tests_count,
    ts.completed_tests_count,
    ts.passed_tests_count,
    ts.failed_tests_count,
    ts.completion_percentage,
    COUNT(ti.id) FILTER (WHERE ti.status = 'pending') AS pending_count,
    COUNT(ti.id) FILTER (WHERE ti.status = 'in_progress') AS in_progress_count,
    COUNT(ti.id) FILTER (WHERE ti.status = 'needs_review') AS needs_review_count,
    COUNT(ti.id) FILTER (WHERE ti.status = 'untestable') AS untestable_count,
    COUNT(ti.id) FILTER (WHERE ti.status = 'not_applicable') AS not_applicable_count,
    ts.created_at,
    ts.updated_at
FROM test_sessions ts
LEFT JOIN test_instances ti ON ts.id = ti.session_id
GROUP BY ts.id, ts.name, ts.conformance_level, ts.status, ts.total_tests_count, 
         ts.completed_tests_count, ts.passed_tests_count, ts.failed_tests_count, 
         ts.completion_percentage, ts.created_at, ts.updated_at;

-- Test instance details with requirement information
CREATE VIEW test_instance_details AS
SELECT 
    ti.id AS test_instance_id,
    ti.session_id,
    ts.name AS session_name,
    ti.requirement_id,
    tr.requirement_type,
    tr.criterion_number,
    tr.title AS requirement_title,
    tr.description AS requirement_description,
    tr.level AS requirement_level,
    tr.test_method AS required_test_method,
    ti.page_id,
    dp.url AS page_url,
    dp.title AS page_title,
    ti.status,
    ti.assigned_tester,
    ti.reviewer,
    ti.confidence_level,
    ti.notes,
    ti.remediation_notes,
    ti.evidence,
    ti.test_method_used,
    ti.tool_used,
    ti.created_at,
    ti.updated_at,
    ti.started_at,
    ti.completed_at,
    ti.assigned_at,
    ti.reviewed_at
FROM test_instances ti
JOIN test_requirements tr ON ti.requirement_id = tr.id
JOIN test_sessions ts ON ti.session_id = ts.id
LEFT JOIN discovered_pages dp ON ti.page_id = dp.id;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE test_sessions IS 'Testing sessions that define scope and conformance level for accessibility testing';
COMMENT ON TABLE test_requirements IS 'Pre-defined accessibility requirements from WCAG 2.1 and Section 508';
COMMENT ON TABLE test_instances IS 'Individual test executions linking requirements to specific pages in a session';
COMMENT ON TABLE test_audit_log IS 'Comprehensive audit trail of all changes to test instances';

COMMENT ON COLUMN test_sessions.conformance_level IS 'Target conformance level: wcag_a, wcag_aa, wcag_aaa, section_508, or combined';
COMMENT ON COLUMN test_requirements.criterion_number IS 'Official criterion number like 1.1.1 for WCAG or 502.2.1 for Section 508';
COMMENT ON COLUMN test_instances.evidence IS 'JSON array of evidence files, screenshots, and documentation';
COMMENT ON COLUMN test_audit_log.old_value IS 'Complete previous state of the test instance';
COMMENT ON COLUMN test_audit_log.new_value IS 'Complete new state of the test instance after change'; 