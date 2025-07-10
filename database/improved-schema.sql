-- Improved Accessibility Testing Platform Database Schema
-- Separates site discovery, comprehensive requirements management, and testing workflows
-- Supports WCAG 1.0-2.2 (A, AA, AAA) + Section 508 with detailed manual testing procedures

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===========================
-- PROJECT MANAGEMENT
-- ===========================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    project_type VARCHAR(100) DEFAULT 'accessibility_audit',
    target_compliance JSONB DEFAULT '{"wcag": ["2.1-AA"], "section508": true}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active'
);

-- ===========================
-- SITE DISCOVERY & CRAWLING (Separated System)
-- ===========================

CREATE TABLE site_discovery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    primary_url VARCHAR(2048) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    
    -- Crawling Configuration
    crawl_config JSONB DEFAULT '{
        "maxDepth": 3,
        "maxPages": 100,
        "respectRobots": true,
        "followExternalLinks": false,
        "includeMedia": false,
        "crawlFrequency": "weekly"
    }',
    
    -- Authentication Configuration
    auth_config JSONB DEFAULT '{
        "requiresAuth": false,
        "authType": "none",
        "loginUrl": null,
        "credentials": {},
        "sessionManagement": "cookies"
    }',
    
    -- Discovery Results
    status VARCHAR(50) DEFAULT 'pending',
    last_crawled TIMESTAMP WITH TIME ZONE,
    total_pages_found INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    crawl_duration_ms INTEGER,
    
    -- Metadata
    user_agent VARCHAR(255) DEFAULT 'AccessibilityTester/1.0',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discovered_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID NOT NULL REFERENCES site_discovery(id) ON DELETE CASCADE,
    
    -- Page Information
    url VARCHAR(2048) NOT NULL,
    path VARCHAR(1024),
    title VARCHAR(512),
    page_type VARCHAR(100), -- 'homepage', 'form', 'content', 'navigation', 'media', etc.
    
    -- Discovery Metadata
    discovery_method VARCHAR(50), -- 'crawl', 'sitemap', 'manual', 'form_submission'
    parent_url VARCHAR(2048),
    depth_level INTEGER DEFAULT 0,
    
    -- Page Characteristics
    requires_auth BOOLEAN DEFAULT false,
    has_forms BOOLEAN DEFAULT false,
    has_media BOOLEAN DEFAULT false,
    has_interactive_elements BOOLEAN DEFAULT false,
    estimated_complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    
    -- Technical Details
    response_status INTEGER,
    content_type VARCHAR(100),
    page_size_bytes INTEGER,
    load_time_ms INTEGER,
    
    -- Testing Priority
    testing_priority VARCHAR(20) DEFAULT 'normal', -- 'critical', 'high', 'normal', 'low'
    include_in_testing BOOLEAN DEFAULT true,
    
    page_metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(discovery_id, url)
);

-- ===========================
-- COMPREHENSIVE REQUIREMENTS SYSTEM
-- ===========================

CREATE TABLE wcag_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- WCAG Identification
    wcag_version VARCHAR(10) NOT NULL, -- '1.0', '2.0', '2.1', '2.2'
    level VARCHAR(3) NOT NULL,         -- 'A', 'AA', 'AAA'
    criterion_number VARCHAR(20) NOT NULL, -- '1.1.1', '1.4.3', etc.
    title VARCHAR(255) NOT NULL,
    
    -- Detailed Descriptions
    description TEXT NOT NULL,
    purpose TEXT NOT NULL, -- Why this requirement exists
    who_benefits TEXT,     -- Who benefits from this requirement
    
    -- Manual Testing Procedures
    manual_test_procedures JSONB DEFAULT '{
        "overview": "",
        "steps": [],
        "tools_needed": [],
        "expected_results": "",
        "common_failures": [],
        "edge_cases": []
    }',
    
    -- Automated Tool Integration
    automated_tool_mappings JSONB DEFAULT '{
        "axe_core": {"rules": [], "impact_mapping": {}},
        "pa11y": {"rules": [], "selectors": []},
        "lighthouse": {"audits": [], "scoring": {}},
        "wave": {"indicators": [], "alerts": []}
    }',
    
    -- Success and Failure Information
    success_techniques JSONB DEFAULT '[]',    -- Array of technique IDs and descriptions
    failure_examples JSONB DEFAULT '[]',      -- Common failure patterns
    sufficient_techniques JSONB DEFAULT '[]', -- Sufficient techniques to pass
    
    -- External Resources
    understanding_url VARCHAR(512),
    how_to_meet_url VARCHAR(512),
    
    -- Testing Guidance
    testing_complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    requires_assistive_tech BOOLEAN DEFAULT false,
    requires_manual_testing BOOLEAN DEFAULT true,
    can_be_automated BOOLEAN DEFAULT false,
    
    -- Administrative
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(wcag_version, criterion_number)
);

CREATE TABLE section_508_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Section 508 Identification  
    section VARCHAR(10) NOT NULL,      -- 'A', 'B', 'C', 'D', 'E'
    criterion_id VARCHAR(20) NOT NULL, -- 'A.1.1.1', 'B.2.1.1', etc.
    title VARCHAR(255) NOT NULL,
    
    -- Detailed Descriptions
    description TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_requirements TEXT,
    
    -- WCAG Relationship
    related_wcag_criteria JSONB DEFAULT '[]', -- Array of related WCAG criteria
    
    -- Manual Testing Procedures
    manual_test_procedures JSONB DEFAULT '{
        "overview": "",
        "steps": [],
        "tools_needed": [],
        "expected_results": "",
        "documentation_requirements": [],
        "compliance_notes": []
    }',
    
    -- Testing Methods
    testing_methods JSONB DEFAULT '{
        "keyboard_testing": false,
        "screen_reader_testing": false,
        "color_contrast_testing": false,
        "code_inspection": false,
        "user_testing": false
    }',
    
    -- Administrative
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(section, criterion_id)
);

-- ===========================
-- TEST SESSION MANAGEMENT
-- ===========================

CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Session Details
    session_name VARCHAR(255) NOT NULL,
    session_type VARCHAR(50) NOT NULL, -- 'automated_only', 'manual_only', 'comprehensive'
    description TEXT,
    
    -- Scope Definition
    scope_definition JSONB DEFAULT '{
        "pages": "all",
        "wcag_versions": ["2.1"],
        "wcag_levels": ["A", "AA"],
        "include_section_508": true,
        "automated_tools": ["axe", "pa11y", "lighthouse"],
        "manual_testing_required": true
    }',
    
    -- Session Status
    status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'in_progress', 'completed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- People
    initiated_by VARCHAR(255) NOT NULL,
    assigned_testers JSONB DEFAULT '[]',
    
    -- Configuration
    testing_environment JSONB DEFAULT '{}',
    browser_requirements JSONB DEFAULT '[]',
    assistive_tech_requirements JSONB DEFAULT '[]',
    
    -- Progress Tracking
    progress_summary JSONB DEFAULT '{
        "automated_tests": {"total": 0, "completed": 0, "failed": 0},
        "manual_tests": {"total": 0, "completed": 0, "pending": 0},
        "violations_found": 0,
        "compliance_score": null
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- AUTOMATED TESTING
-- ===========================

CREATE TABLE automated_test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    discovery_id UUID NOT NULL REFERENCES site_discovery(id) ON DELETE CASCADE,
    
    -- Tool Configuration
    tool_suite VARCHAR(100) NOT NULL, -- 'comprehensive', 'axe_only', 'lighthouse_only', etc.
    tool_configuration JSONB DEFAULT '{}',
    
    -- Execution Details
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_duration_ms INTEGER,
    
    -- Results Summary
    summary_results JSONB DEFAULT '{
        "total_pages_tested": 0,
        "total_violations": 0,
        "tools_executed": [],
        "wcag_compliance": {},
        "section_508_compliance": {}
    }',
    
    -- Error Handling
    errors_encountered JSONB DEFAULT '[]',
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automated_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID NOT NULL REFERENCES automated_test_runs(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    
    -- Tool Information
    tool_name VARCHAR(100) NOT NULL,
    tool_version VARCHAR(50),
    
    -- Raw Results
    raw_results JSONB NOT NULL DEFAULT '{}',
    
    -- Processed Results
    violations_found INTEGER DEFAULT 0,
    wcag_mappings JSONB DEFAULT '{}',      -- Which WCAG criteria were tested/violated
    section_508_mappings JSONB DEFAULT '{}', -- Which Section 508 criteria were tested/violated
    
    -- Performance
    execution_time_ms INTEGER,
    page_load_time_ms INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- MANUAL TESTING
-- ===========================

CREATE TABLE manual_test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL, -- References wcag_requirements OR section_508_requirements
    requirement_type VARCHAR(20) NOT NULL, -- 'wcag' or 'section_508'
    
    -- Assignment Details
    assigned_to VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Testing Context
    testing_priority VARCHAR(20) DEFAULT 'normal',
    estimated_duration_minutes INTEGER,
    requires_assistive_tech JSONB DEFAULT '[]',
    special_instructions TEXT,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed', 'blocked', 'skipped'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Review Process
    requires_review BOOLEAN DEFAULT false,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT
);

CREATE TABLE manual_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES manual_test_assignments(id) ON DELETE CASCADE,
    
    -- Test Result
    result VARCHAR(50) NOT NULL, -- 'pass', 'fail', 'not_applicable', 'not_testable', 'needs_review'
    confidence_level VARCHAR(20) DEFAULT 'high', -- 'high', 'medium', 'low'
    
    -- Detailed Findings
    notes TEXT,
    steps_performed TEXT,
    actual_behavior TEXT,
    expected_behavior TEXT,
    
    -- Evidence
    evidence JSONB DEFAULT '{
        "screenshots": [],
        "video_recordings": [],
        "code_samples": [],
        "assistive_tech_output": []
    }',
    
    -- Remediation
    remediation_suggestions TEXT,
    severity_assessment VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
    effort_estimate VARCHAR(20),     -- 'low', 'medium', 'high'
    
    -- Testing Context
    testing_environment JSONB DEFAULT '{}',
    assistive_tech_used JSONB DEFAULT '[]',
    browser_used VARCHAR(100),
    
    -- Tester Information
    tested_by VARCHAR(255) NOT NULL,
    testing_duration_minutes INTEGER,
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Review and Quality Assurance
    reviewed_by VARCHAR(255),
    review_status VARCHAR(50) DEFAULT 'pending_review',
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- ===========================
-- CONSOLIDATED VIOLATIONS
-- ===========================

CREATE TABLE consolidated_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL, -- References wcag_requirements OR section_508_requirements
    requirement_type VARCHAR(20) NOT NULL, -- 'wcag' or 'section_508'
    
    -- Violation Source
    violation_source VARCHAR(50) NOT NULL, -- 'automated', 'manual', 'both'
    automated_test_id UUID, -- References automated_test_results
    manual_test_id UUID,    -- References manual_test_results
    
    -- Violation Details
    severity VARCHAR(20) NOT NULL,
    impact VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Location Information
    location_data JSONB DEFAULT '{
        "selectors": [],
        "xpath": [],
        "coordinates": {},
        "context": ""
    }',
    
    -- Remediation
    suggested_fixes JSONB DEFAULT '[]',
    remediation_effort VARCHAR(20),
    remediation_priority VARCHAR(20),
    
    -- Tracking
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'wont_fix', 'duplicate'
    assigned_to VARCHAR(255),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- VPAT REPORTING
-- ===========================

CREATE TABLE vpat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Report Configuration
    version VARCHAR(50) NOT NULL DEFAULT '2.4',
    report_type VARCHAR(50) DEFAULT 'comprehensive', -- 'wcag_only', 'section_508_only', 'comprehensive'
    
    -- Report Data
    compliance_data JSONB NOT NULL DEFAULT '{}',
    executive_summary JSONB DEFAULT '{}',
    detailed_findings JSONB DEFAULT '{}',
    
    -- Statistics
    summary_stats JSONB DEFAULT '{
        "total_criteria_tested": 0,
        "criteria_passed": 0,
        "criteria_failed": 0,
        "overall_compliance_percentage": 0,
        "critical_violations": 0
    }',
    
    -- File Management
    format VARCHAR(20) DEFAULT 'html',
    file_path VARCHAR(1024),
    file_size_bytes INTEGER,
    
    -- Generation Details
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(255),
    generation_duration_ms INTEGER,
    
    -- Status and Versioning
    status VARCHAR(50) DEFAULT 'generated',
    is_final BOOLEAN DEFAULT false,
    version_notes TEXT,
    
    metadata JSONB DEFAULT '{}'
);

-- ===========================
-- INDEXES FOR PERFORMANCE
-- ===========================

-- Site Discovery indexes
CREATE INDEX idx_site_discovery_project_id ON site_discovery(project_id);
CREATE INDEX idx_discovered_pages_discovery_id ON discovered_pages(discovery_id);
CREATE INDEX idx_discovered_pages_url ON discovered_pages USING gin(url gin_trgm_ops);
CREATE INDEX idx_discovered_pages_page_type ON discovered_pages(page_type);
CREATE INDEX idx_discovered_pages_testing_priority ON discovered_pages(testing_priority);

-- Requirements indexes
CREATE INDEX idx_wcag_requirements_version_level ON wcag_requirements(wcag_version, level);
CREATE INDEX idx_wcag_requirements_criterion_number ON wcag_requirements(criterion_number);
CREATE INDEX idx_section_508_requirements_section ON section_508_requirements(section);

-- Testing indexes
CREATE INDEX idx_test_sessions_project_id ON test_sessions(project_id);
CREATE INDEX idx_test_sessions_status ON test_sessions(status);
CREATE INDEX idx_automated_test_runs_session_id ON automated_test_runs(test_session_id);
CREATE INDEX idx_automated_test_results_run_id ON automated_test_results(test_run_id);
CREATE INDEX idx_automated_test_results_page_id ON automated_test_results(page_id);

-- Manual testing indexes
CREATE INDEX idx_manual_assignments_session_id ON manual_test_assignments(test_session_id);
CREATE INDEX idx_manual_assignments_assigned_to ON manual_test_assignments(assigned_to);
CREATE INDEX idx_manual_assignments_status ON manual_test_assignments(status);
CREATE INDEX idx_manual_results_assignment_id ON manual_test_results(assignment_id);
CREATE INDEX idx_manual_results_tested_by ON manual_test_results(tested_by);

-- Violations indexes
CREATE INDEX idx_consolidated_violations_session_id ON consolidated_violations(test_session_id);
CREATE INDEX idx_consolidated_violations_page_id ON consolidated_violations(page_id);
CREATE INDEX idx_consolidated_violations_severity ON consolidated_violations(severity);
CREATE INDEX idx_consolidated_violations_status ON consolidated_violations(status);

-- ===========================
-- TRIGGERS AND FUNCTIONS
-- ===========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_site_discovery_updated_at BEFORE UPDATE ON site_discovery FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wcag_requirements_updated_at BEFORE UPDATE ON wcag_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_section_508_requirements_updated_at BEFORE UPDATE ON section_508_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consolidated_violations_updated_at BEFORE UPDATE ON consolidated_violations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 