-- Accessibility Testing Platform Database Schema
-- Supports WCAG 1.0, 2.0, 2.1, 2.2 (A, AA, AAA) + Section 508 + Manual Testing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================
-- CORE PROJECT MANAGEMENT
-- ===========================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_url VARCHAR(2048) NOT NULL,
    client_name VARCHAR(255),
    project_type VARCHAR(100) DEFAULT 'accessibility_audit',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    crawl_config JSONB DEFAULT '{"maxDepth": 2, "maxPages": 50, "respectRobots": true}',
    last_crawled TIMESTAMP WITH TIME ZONE,
    total_pages_discovered INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL UNIQUE,
    path VARCHAR(1024),
    title VARCHAR(512),
    page_type VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- ACCESSIBILITY STANDARDS
-- ===========================

CREATE TABLE wcag_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wcag_version VARCHAR(10) NOT NULL, -- '1.0', '2.0', '2.1', '2.2'
    level VARCHAR(3) NOT NULL,         -- 'A', 'AA', 'AAA'
    criterion_number VARCHAR(20) NOT NULL, -- '1.1.1', '1.4.3', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    understanding_url VARCHAR(512),
    techniques JSONB DEFAULT '[]',
    test_rules JSONB DEFAULT '{}',     -- Tool-specific test mappings
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wcag_version, criterion_number)
);

CREATE TABLE section_508_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section VARCHAR(10) NOT NULL,      -- 'A', 'B', 'C', 'D', 'E'
    criterion_id VARCHAR(20) NOT NULL, -- 'A.1.1.1', 'B.2.1.1', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    related_wcag JSONB DEFAULT '[]',   -- Array of related WCAG criteria
    test_procedures TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section, criterion_id)
);

-- ===========================
-- TESTING INFRASTRUCTURE
-- ===========================

CREATE TABLE test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    batch_id VARCHAR(255) NOT NULL,
    run_type VARCHAR(50) NOT NULL,     -- 'automated', 'manual', 'hybrid'
    test_scope JSONB DEFAULT '{}',     -- Pages, criteria, tools to test
    configuration JSONB DEFAULT '{}',  -- Test-specific settings
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    initiated_by VARCHAR(255),
    summary_stats JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE automated_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,   -- 'axe-core', 'pa11y', 'lighthouse', etc.
    tool_version VARCHAR(50),
    raw_results JSONB NOT NULL DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    wcag_coverage JSONB DEFAULT '[]',  -- Which WCAG criteria this test covers
    section_508_coverage JSONB DEFAULT '[]',
    execution_time_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT
);

CREATE TABLE manual_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL,       -- References wcag_criteria OR section_508_criteria
    criterion_type VARCHAR(20) NOT NULL, -- 'wcag' or 'section_508'
    test_procedure TEXT,
    result VARCHAR(50) NOT NULL,      -- 'pass', 'fail', 'not_applicable', 'not_tested'
    confidence_level VARCHAR(20),     -- 'high', 'medium', 'low'
    notes TEXT,
    evidence JSONB DEFAULT '{}',      -- Screenshots, code samples, etc.
    remediation_notes TEXT,
    tested_by VARCHAR(255) NOT NULL,
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'completed'
);

-- ===========================
-- VIOLATIONS AND ISSUES
-- ===========================

CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL,            -- References automated_tests OR manual_tests
    test_type VARCHAR(20) NOT NULL,   -- 'automated' or 'manual'
    violation_id VARCHAR(255),        -- Tool-specific violation ID
    severity VARCHAR(20) NOT NULL,    -- 'critical', 'serious', 'moderate', 'minor'
    impact VARCHAR(20),               -- 'blocker', 'critical', 'serious', 'moderate', 'minor'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    wcag_criteria JSONB DEFAULT '[]', -- Array of applicable WCAG criteria
    section_508_criteria JSONB DEFAULT '[]',
    location_data JSONB DEFAULT '{}', -- CSS selectors, XPath, coordinates
    suggested_fixes JSONB DEFAULT '[]',
    code_sample TEXT,
    help_url VARCHAR(512),
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ===========================
-- REPORTING AND ANALYTICS
-- ===========================

CREATE TABLE vpat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_run_ids JSONB NOT NULL DEFAULT '[]', -- Array of test run IDs included
    version VARCHAR(50) NOT NULL DEFAULT '2.4',
    report_type VARCHAR(50) DEFAULT 'comprehensive', -- 'wcag_only', 'section_508_only', 'comprehensive'
    report_data JSONB NOT NULL DEFAULT '{}',
    summary_stats JSONB DEFAULT '{}',
    format VARCHAR(20) DEFAULT 'html',    -- 'html', 'pdf', 'json'
    file_path VARCHAR(1024),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'generated',
    metadata JSONB DEFAULT '{}'
);

-- ===========================
-- USER MANAGEMENT
-- ===========================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'tester', -- 'admin', 'manager', 'tester', 'viewer'
    permissions JSONB DEFAULT '{}',
    password_hash VARCHAR(255), -- For future authentication
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Manual test evidence table for storing uploaded images and files
CREATE TABLE IF NOT EXISTS manual_test_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL,
    manual_result_id UUID REFERENCES manual_test_results(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for manual_test_evidence
CREATE INDEX IF NOT EXISTS idx_manual_test_evidence_session_id ON manual_test_evidence(test_session_id);
CREATE INDEX IF NOT EXISTS idx_manual_test_evidence_page_id ON manual_test_evidence(page_id);
CREATE INDEX IF NOT EXISTS idx_manual_test_evidence_requirement_id ON manual_test_evidence(requirement_id);
CREATE INDEX IF NOT EXISTS idx_manual_test_evidence_manual_result_id ON manual_test_evidence(manual_result_id);
CREATE INDEX IF NOT EXISTS idx_manual_test_evidence_uploaded_by ON manual_test_evidence(uploaded_by);

-- Add missing columns to manual_test_results if they don't exist
ALTER TABLE manual_test_results 
ADD COLUMN IF NOT EXISTS tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS retested_at TIMESTAMP WITH TIME ZONE;

-- ===========================
-- INDEXES FOR PERFORMANCE
-- ===========================

-- Core entity indexes
CREATE INDEX idx_sites_project_id ON sites(project_id);
CREATE INDEX idx_pages_site_id ON pages(site_id);
CREATE INDEX idx_pages_url ON pages USING gin(url gin_trgm_ops);

-- Testing indexes
CREATE INDEX idx_test_runs_project_id ON test_runs(project_id);
CREATE INDEX idx_test_runs_batch_id ON test_runs(batch_id);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_started_at ON test_runs(started_at);

CREATE INDEX idx_automated_tests_test_run_id ON automated_tests(test_run_id);
CREATE INDEX idx_automated_tests_page_id ON automated_tests(page_id);
CREATE INDEX idx_automated_tests_tool_name ON automated_tests(tool_name);

CREATE INDEX idx_manual_tests_test_run_id ON manual_tests(test_run_id);
CREATE INDEX idx_manual_tests_page_id ON manual_tests(page_id);
CREATE INDEX idx_manual_tests_criterion_id ON manual_tests(criterion_id);
CREATE INDEX idx_manual_tests_tested_by ON manual_tests(tested_by);

-- Violations indexes
CREATE INDEX idx_violations_test_id ON violations(test_id);
CREATE INDEX idx_violations_test_type ON violations(test_type);
CREATE INDEX idx_violations_severity ON violations(severity);
CREATE INDEX idx_violations_status ON violations(status);

-- Standards indexes
CREATE INDEX idx_wcag_criteria_version_level ON wcag_criteria(wcag_version, level);
CREATE INDEX idx_wcag_criteria_number ON wcag_criteria(criterion_number);
CREATE INDEX idx_section_508_criteria_section ON section_508_criteria(section);

-- ===========================
-- TRIGGERS FOR UPDATED_AT
-- ===========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 