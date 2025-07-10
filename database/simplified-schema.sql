-- Simplified Accessibility Testing Database Schema
-- Designed for single-user operation with focus on efficiency and organization
-- Removes enterprise overhead while maintaining core benefits

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================
-- CORE PROJECT ORGANIZATION
-- ===========================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),
    description TEXT,
    target_compliance JSONB DEFAULT '{"wcag": "2.1-AA", "section508": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- ===========================
-- SEPARATED SITE DISCOVERY
-- ===========================

CREATE TABLE site_discovery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    primary_url VARCHAR(2048) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    crawl_config JSONB DEFAULT '{"maxDepth": 3, "maxPages": 100}',
    auth_config JSONB DEFAULT '{"requiresAuth": false}',
    status VARCHAR(50) DEFAULT 'pending',
    last_crawled TIMESTAMP WITH TIME ZONE,
    total_pages_found INTEGER DEFAULT 0,
    notes TEXT
);

CREATE TABLE discovered_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discovery_id UUID NOT NULL REFERENCES site_discovery(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL UNIQUE,
    title VARCHAR(512),
    page_type VARCHAR(100), -- 'homepage', 'form', 'content', etc.
    has_forms BOOLEAN DEFAULT false,
    has_media BOOLEAN DEFAULT false,
    complexity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    priority VARCHAR(20) DEFAULT 'normal',   -- 'critical', 'high', 'normal', 'low'
    include_in_testing BOOLEAN DEFAULT true,
    notes TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- REQUIREMENTS DATABASE (The Key Value)
-- ===========================

CREATE TABLE wcag_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wcag_version VARCHAR(10) NOT NULL, -- '2.1', '2.2'
    level VARCHAR(3) NOT NULL,         -- 'A', 'AA', 'AAA'
    criterion_number VARCHAR(20) NOT NULL, -- '1.1.1', '1.4.3'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- The real value: step-by-step manual testing procedures
    manual_test_procedure JSONB DEFAULT '{
        "overview": "",
        "steps": [],
        "tools_needed": [],
        "what_to_look_for": "",
        "common_failures": []
    }',
    
    -- Automated tool mappings for your existing tools
    tool_mappings JSONB DEFAULT '{
        "axe": [],
        "pa11y": [],
        "lighthouse": []
    }',
    
    understanding_url VARCHAR(512),
    applies_to_page_types JSONB DEFAULT '["all"]', -- Which page types this applies to
    
    UNIQUE(wcag_version, criterion_number)
);

CREATE TABLE section_508_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section VARCHAR(10) NOT NULL,
    criterion_id VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    manual_test_procedure JSONB DEFAULT '{}',
    related_wcag JSONB DEFAULT '[]',
    
    UNIQUE(section, criterion_id)
);

-- ===========================
-- SIMPLIFIED TESTING WORKFLOW
-- ===========================

CREATE TABLE test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scope JSONB DEFAULT '{"wcag_version": "2.1", "levels": ["A", "AA"]}',
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Automated test results (from your existing tools)
CREATE TABLE automated_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    raw_results JSONB NOT NULL DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple manual test tracking (no complex assignments)
CREATE TABLE manual_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL, -- wcag_requirements or section_508_requirements
    requirement_type VARCHAR(20) NOT NULL, -- 'wcag' or 'section_508'
    
    -- Simple test result
    result VARCHAR(50) NOT NULL, -- 'pass', 'fail', 'not_applicable', 'not_tested'
    notes TEXT,
    evidence JSONB DEFAULT '{}', -- screenshots, etc.
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unified violations (combines automated + manual findings)
CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    
    -- Violation details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    
    -- Source tracking
    source_type VARCHAR(20) NOT NULL, -- 'automated' or 'manual'
    source_test_id UUID, -- References automated_test_results or manual_test_results
    
    -- WCAG/508 mapping
    wcag_criteria JSONB DEFAULT '[]',
    section_508_criteria JSONB DEFAULT '[]',
    
    -- Remediation
    suggested_fix TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'fixed', 'wont_fix'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- SIMPLIFIED REPORTING
-- ===========================

CREATE TABLE vpat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    report_data JSONB NOT NULL DEFAULT '{}',
    format VARCHAR(20) DEFAULT 'html',
    file_path VARCHAR(1024),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- ESSENTIAL INDEXES ONLY
-- ===========================

CREATE INDEX idx_discovered_pages_discovery_id ON discovered_pages(discovery_id);
CREATE INDEX idx_automated_test_results_session_id ON automated_test_results(test_session_id);
CREATE INDEX idx_manual_test_results_session_id ON manual_test_results(test_session_id);
CREATE INDEX idx_violations_session_id ON violations(test_session_id);
CREATE INDEX idx_wcag_requirements_version_level ON wcag_requirements(wcag_version, level); 