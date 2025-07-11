-- Fix Database Schema for VPAT System
-- Add missing tables and columns expected by the API

-- Create test_sessions table with proper structure
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conformance_level VARCHAR(20) NOT NULL DEFAULT 'AA',
    status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Session metadata
    total_tests_count INTEGER DEFAULT 0,
    completed_tests_count INTEGER DEFAULT 0,
    passed_tests_count INTEGER DEFAULT 0,
    failed_tests_count INTEGER DEFAULT 0,
    
    -- Audit fields
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    estimated_completion_date DATE,
    
    -- Additional fields from simplified schema
    scope JSONB DEFAULT '{}',
    test_type VARCHAR(50) DEFAULT 'full' CHECK (test_type IN ('full', 'automated_only', 'manual_only', 'followup')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_summary JSONB DEFAULT '{}',
    
    CONSTRAINT valid_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Create test_instances table
CREATE TABLE test_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES test_requirements(id),
    page_id UUID REFERENCES discovered_pages(id),
    
    -- Test execution details
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review')),
    assigned_tester UUID REFERENCES users(id),
    reviewer UUID REFERENCES users(id),
    confidence_level VARCHAR(10) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    
    -- Test results and documentation
    notes TEXT,
    remediation_notes TEXT,
    evidence JSONB DEFAULT '[]'::jsonb,
    
    -- Test execution metadata
    test_method_used VARCHAR(20) CHECK (test_method_used IN ('automated', 'manual')),
    tool_used VARCHAR(100),
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Assignment tracking
    assigned_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Restore foreign key constraints for existing tables
ALTER TABLE automated_test_results 
ADD CONSTRAINT automated_test_results_test_session_id_fkey 
FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE;

ALTER TABLE manual_test_results 
ADD CONSTRAINT manual_test_results_test_session_id_fkey 
FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE;

ALTER TABLE vpat_reports 
ADD CONSTRAINT vpat_reports_test_session_id_fkey 
FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_test_sessions_project_id ON test_sessions(project_id);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);
CREATE INDEX idx_test_sessions_conformance_level ON test_sessions(conformance_level);
CREATE INDEX idx_test_sessions_created_by ON test_sessions(created_by);
CREATE INDEX idx_test_sessions_updated_at ON test_sessions(updated_at);

CREATE INDEX idx_test_instances_session_id ON test_instances(session_id);
CREATE INDEX idx_test_instances_requirement_id ON test_instances(requirement_id);
CREATE INDEX idx_test_instances_page_id ON test_instances(page_id);
CREATE INDEX idx_test_instances_status ON test_instances(status);
CREATE INDEX idx_test_instances_assigned_tester ON test_instances(assigned_tester);
CREATE INDEX idx_test_instances_reviewer ON test_instances(reviewer);
CREATE INDEX idx_test_instances_updated_at ON test_instances(updated_at);

-- Add trigger for updated_at timestamps
CREATE TRIGGER trigger_test_sessions_updated_at
    BEFORE UPDATE ON test_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_test_instances_updated_at
    BEFORE UPDATE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Schema fixed successfully' as status; 