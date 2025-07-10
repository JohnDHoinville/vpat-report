-- Accessibility Testing Platform Database Schema
-- Single-user simplified design for PostgreSQL 12+
-- Created: Database Conversion Project

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROJECTS TABLE
-- Main project container for accessibility testing
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    primary_url TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SITE_DISCOVERY TABLE  
-- Site crawling and page discovery results
CREATE TABLE site_discovery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    primary_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    total_pages_found INTEGER DEFAULT 0,
    crawl_depth INTEGER DEFAULT 3,
    discovery_settings JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. DISCOVERED_PAGES TABLE
-- Individual pages found during site discovery
CREATE TABLE discovered_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID NOT NULL REFERENCES site_discovery(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(500),
    page_type VARCHAR(100) DEFAULT 'content' CHECK (page_type IN ('homepage', 'content', 'form', 'navigation', 'media', 'document', 'application')),
    http_status INTEGER,
    content_length INTEGER,
    last_modified TIMESTAMP WITH TIME ZONE,
    meta_description TEXT,
    page_metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(discovery_id, url)
);

-- 4. WCAG_REQUIREMENTS TABLE
-- WCAG 2.1 Level AA & AAA requirements with testing procedures
CREATE TABLE wcag_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wcag_version VARCHAR(10) NOT NULL DEFAULT '2.1',
    level VARCHAR(5) NOT NULL CHECK (level IN ('A', 'AA', 'AAA')),
    criterion_number VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    manual_test_procedure JSONB NOT NULL DEFAULT '{}',
    tool_mappings JSONB DEFAULT '{}',
    understanding_url TEXT,
    applies_to_page_types TEXT[] DEFAULT ARRAY['all'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(wcag_version, criterion_number)
);

-- 5. SECTION_508_REQUIREMENTS TABLE
-- Section 508 requirements and testing procedures
CREATE TABLE section_508_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_number VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    manual_test_procedure JSONB NOT NULL DEFAULT '{}',
    tool_mappings JSONB DEFAULT '{}',
    reference_url TEXT,
    applies_to_page_types TEXT[] DEFAULT ARRAY['all'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(section_number)
);

-- 6. TEST_SESSIONS TABLE
-- Testing session management and progress tracking
CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')),
    test_type VARCHAR(50) DEFAULT 'full' CHECK (test_type IN ('full', 'automated_only', 'manual_only', 'followup')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_summary JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. AUTOMATED_TEST_RESULTS TABLE
-- Results from axe, pa11y, lighthouse automated testing
CREATE TABLE automated_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    tool_name VARCHAR(50) NOT NULL CHECK (tool_name IN ('axe', 'pa11y', 'lighthouse', 'migrated_data')),
    tool_version VARCHAR(50),
    raw_results JSONB NOT NULL DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    passes_count INTEGER DEFAULT 0,
    test_duration_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(test_session_id, page_id, tool_name)
);

-- 8. MANUAL_TEST_RESULTS TABLE
-- Manual testing results with evidence capture
CREATE TABLE manual_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID,
    requirement_type VARCHAR(20) NOT NULL CHECK (requirement_type IN ('wcag', 'section_508')),
    result VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'not_applicable', 'not_tested')),
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    notes TEXT,
    evidence JSONB DEFAULT '{}',
    tester_name VARCHAR(255),
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retested_at TIMESTAMP WITH TIME ZONE
);

-- 9. VIOLATIONS TABLE
-- Detailed accessibility violations and remediation guidance
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    automated_result_id UUID REFERENCES automated_test_results(id) ON DELETE CASCADE,
    manual_result_id UUID REFERENCES manual_test_results(id) ON DELETE CASCADE,
    violation_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
    wcag_criterion VARCHAR(20),
    section_508_criterion VARCHAR(20),
    element_selector TEXT,
    element_html TEXT,
    description TEXT NOT NULL,
    remediation_guidance TEXT,
    impact_description TEXT,
    help_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Must be associated with either automated or manual result
    CHECK (
        (automated_result_id IS NOT NULL AND manual_result_id IS NULL) OR
        (automated_result_id IS NULL AND manual_result_id IS NOT NULL)
    )
);

-- 10. VPAT_REPORTS TABLE
-- Generated VPAT reports combining automated and manual results
CREATE TABLE vpat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    report_type VARCHAR(50) DEFAULT 'standard' CHECK (report_type IN ('standard', 'management', 'developer', 'followup')),
    report_format VARCHAR(20) DEFAULT 'html' CHECK (report_format IN ('html', 'pdf', 'json')),
    report_data JSONB NOT NULL DEFAULT '{}',
    compliance_summary JSONB DEFAULT '{}',
    generated_by VARCHAR(255),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    file_size INTEGER,
    notes TEXT
);

-- INDEXES for performance optimization
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

CREATE INDEX idx_site_discovery_project_id ON site_discovery(project_id);
CREATE INDEX idx_site_discovery_status ON site_discovery(status);

CREATE INDEX idx_discovered_pages_discovery_id ON discovered_pages(discovery_id);
CREATE INDEX idx_discovered_pages_page_type ON discovered_pages(page_type);

CREATE INDEX idx_wcag_requirements_level ON wcag_requirements(level);
CREATE INDEX idx_wcag_requirements_criterion ON wcag_requirements(criterion_number);

CREATE INDEX idx_section_508_section_number ON section_508_requirements(section_number);

CREATE INDEX idx_test_sessions_project_id ON test_sessions(project_id);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);

CREATE INDEX idx_automated_results_session_id ON automated_test_results(test_session_id);
CREATE INDEX idx_automated_results_page_id ON automated_test_results(page_id);
CREATE INDEX idx_automated_results_tool ON automated_test_results(tool_name);

CREATE INDEX idx_manual_results_session_id ON manual_test_results(test_session_id);
CREATE INDEX idx_manual_results_page_id ON manual_test_results(page_id);
CREATE INDEX idx_manual_results_requirement ON manual_test_results(requirement_type, requirement_id);
CREATE INDEX idx_manual_results_result ON manual_test_results(result);

CREATE INDEX idx_violations_automated_result ON violations(automated_result_id);
CREATE INDEX idx_violations_manual_result ON violations(manual_result_id);
CREATE INDEX idx_violations_severity ON violations(severity);

CREATE INDEX idx_vpat_reports_session_id ON vpat_reports(test_session_id);
CREATE INDEX idx_vpat_reports_type ON vpat_reports(report_type);

-- TRIGGERS for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- COMMENTS for documentation
COMMENT ON TABLE projects IS 'Main project container for accessibility testing engagements';
COMMENT ON TABLE site_discovery IS 'Site crawling and page discovery results for comprehensive testing';
COMMENT ON TABLE discovered_pages IS 'Individual pages found during site discovery process';
COMMENT ON TABLE wcag_requirements IS 'WCAG 2.1 Level AA & AAA requirements with step-by-step testing procedures';
COMMENT ON TABLE section_508_requirements IS 'Section 508 requirements and testing procedures';
COMMENT ON TABLE test_sessions IS 'Testing session management and progress tracking';
COMMENT ON TABLE automated_test_results IS 'Results from automated testing tools (axe, pa11y, lighthouse)';
COMMENT ON TABLE manual_test_results IS 'Manual testing results with evidence capture and retesting support';
COMMENT ON TABLE violations IS 'Detailed accessibility violations with remediation guidance';
COMMENT ON TABLE vpat_reports IS 'Generated VPAT reports combining automated and manual test results';

-- Initial data validation
SELECT 'Schema created successfully with ' || count(*) || ' tables' as status 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN (
    'projects', 'site_discovery', 'discovered_pages', 'wcag_requirements', 
    'section_508_requirements', 'test_sessions', 'automated_test_results', 
    'manual_test_results', 'violations', 'vpat_reports'
); 