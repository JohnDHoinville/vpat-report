-- Web Crawler System Database Schema
-- Comprehensive crawler configurations with SAML authentication and advanced features

-- Web crawler configurations table
CREATE TABLE IF NOT EXISTS web_crawlers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_url TEXT NOT NULL,
    
    -- SAML Authentication Configuration
    auth_type VARCHAR(50) DEFAULT 'none' CHECK (auth_type IN ('none', 'saml', 'basic', 'custom')),
    saml_config JSONB DEFAULT '{}', -- SAML IdP settings, endpoints, certificates
    auth_credentials JSONB DEFAULT '{}', -- Encrypted credentials storage
    auth_workflow JSONB DEFAULT '{}', -- Custom authentication steps/selectors
    
    -- Advanced Crawler Settings
    max_pages INTEGER DEFAULT 100,
    max_depth INTEGER DEFAULT 3,
    concurrent_requests INTEGER DEFAULT 5,
    request_delay_ms INTEGER DEFAULT 1000,
    
    -- Custom Wait Conditions
    wait_conditions JSONB DEFAULT '[]', -- Array of wait conditions per page type
    custom_selectors JSONB DEFAULT '{}', -- CSS selectors for specific elements
    javascript_execution JSONB DEFAULT '{}', -- Custom JS to run on pages
    
    -- Data Extraction Rules
    extraction_rules JSONB DEFAULT '{}', -- Rules for extracting page metadata
    content_filters JSONB DEFAULT '{}', -- Filters for content analysis
    url_patterns JSONB DEFAULT '[]', -- URL patterns to include/exclude
    
    -- Browser Configuration
    browser_type VARCHAR(20) DEFAULT 'chromium' CHECK (browser_type IN ('chromium', 'firefox', 'webkit')),
    viewport_config JSONB DEFAULT '{"width": 1920, "height": 1080}',
    user_agent TEXT,
    headers JSONB DEFAULT '{}', -- Custom HTTP headers
    
    -- Performance & Persistence
    enable_caching BOOLEAN DEFAULT true,
    cache_duration_hours INTEGER DEFAULT 24,
    session_persistence BOOLEAN DEFAULT true,
    respect_robots_txt BOOLEAN DEFAULT true,
    
    -- UI and Workflow Metadata
    metadata JSONB DEFAULT '{}', -- UI state, page selections, workflow data
    
    -- Status and Metadata
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'running', 'paused', 'error')),
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_duration_ms INTEGER,
    total_pages_found INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_crawler_name_per_project UNIQUE(project_id, name)
);

-- Crawler execution runs table
CREATE TABLE IF NOT EXISTS crawler_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_id UUID NOT NULL REFERENCES web_crawlers(id) ON DELETE CASCADE,
    
    -- Run Configuration
    triggered_by VARCHAR(50) DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled', 'api', 'testing_workflow')),
    run_config JSONB DEFAULT '{}', -- Override settings for this specific run
    
    -- Execution Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Results Summary
    pages_discovered INTEGER DEFAULT 0,
    pages_crawled INTEGER DEFAULT 0,
    pages_failed INTEGER DEFAULT 0,
    auth_successful BOOLEAN,
    
    -- Session and Context Data
    browser_session_data JSONB DEFAULT '{}', -- Cookies, storage, context
    authentication_data JSONB DEFAULT '{}', -- Auth tokens, session info
    
    -- Error Tracking
    errors JSONB DEFAULT '[]', -- Array of error objects
    warnings JSONB DEFAULT '[]', -- Array of warning objects
    
    -- Progress Tracking
    current_url TEXT,
    current_depth INTEGER DEFAULT 0,
    queue_size INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discovered pages from crawler runs
CREATE TABLE IF NOT EXISTS crawler_discovered_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_run_id UUID NOT NULL REFERENCES crawler_runs(id) ON DELETE CASCADE,
    crawler_id UUID NOT NULL REFERENCES web_crawlers(id) ON DELETE CASCADE,
    
    -- Page Information
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    content_type VARCHAR(100),
    status_code INTEGER,
    response_time_ms INTEGER,
    
    -- Page Hierarchy
    depth INTEGER DEFAULT 0,
    parent_url TEXT,
    discovered_from TEXT, -- URL where this page was discovered
    
    -- Content Analysis
    page_size_bytes INTEGER,
    content_hash VARCHAR(64), -- SHA-256 hash for change detection
    has_forms BOOLEAN DEFAULT false,
    has_auth_required BOOLEAN DEFAULT false,
    accessibility_score DECIMAL(5,2), -- Initial accessibility score if available
    
    -- Extracted Metadata
    meta_data JSONB DEFAULT '{}', -- Custom extracted data per extraction rules
    page_elements JSONB DEFAULT '{}', -- Key page elements found
    links_found JSONB DEFAULT '[]', -- Links discovered on this page
    
    -- Authentication Context
    requires_auth BOOLEAN DEFAULT false,
    auth_state TEXT, -- Authentication state when page was accessed
    
    -- Testing Integration
    selected_for_testing BOOLEAN DEFAULT false, -- Simplified: include page in testing sessions
    selected_for_manual_testing BOOLEAN DEFAULT false, -- Legacy - will be deprecated
    selected_for_automated_testing BOOLEAN DEFAULT false, -- Legacy - will be deprecated
    testing_priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high
    testing_notes TEXT,
    
    -- Caching and Updates
    first_discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_modified_at TIMESTAMP WITH TIME ZONE,
    cache_expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_url_per_run UNIQUE(crawler_run_id, url)
);

-- Authentication session management
CREATE TABLE IF NOT EXISTS crawler_auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_id UUID NOT NULL REFERENCES web_crawlers(id) ON DELETE CASCADE,
    
    -- Session Identification
    session_name VARCHAR(255) NOT NULL,
    auth_provider VARCHAR(100), -- SAML IdP identifier
    
    -- Session Data (Encrypted)
    cookies JSONB DEFAULT '{}',
    local_storage JSONB DEFAULT '{}',
    session_storage JSONB DEFAULT '{}',
    auth_tokens JSONB DEFAULT '{}',
    
    -- Session Metadata
    authenticated_user VARCHAR(255),
    auth_level VARCHAR(50), -- e.g., 'basic', 'admin', 'readonly'
    permissions JSONB DEFAULT '[]',
    
    -- Lifecycle Management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Validation
    last_validation_at TIMESTAMP WITH TIME ZONE,
    validation_successful BOOLEAN DEFAULT true,
    validation_errors JSONB DEFAULT '[]',
    
    CONSTRAINT unique_session_per_crawler UNIQUE(crawler_id, session_name)
);

-- Crawler performance metrics
CREATE TABLE IF NOT EXISTS crawler_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crawler_run_id UUID NOT NULL REFERENCES crawler_runs(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    metric_name VARCHAR(100) NOT NULL, -- e.g., 'page_load_time', 'auth_time', 'extraction_time'
    metric_value DECIMAL(10,3) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL, -- e.g., 'ms', 'seconds', 'count'
    
    -- Context
    page_url TEXT,
    depth INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Data
    context_data JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_web_crawlers_project_id ON web_crawlers(project_id);
CREATE INDEX IF NOT EXISTS idx_web_crawlers_status ON web_crawlers(status);
CREATE INDEX IF NOT EXISTS idx_crawler_runs_crawler_id ON crawler_runs(crawler_id);
CREATE INDEX IF NOT EXISTS idx_crawler_runs_status ON crawler_runs(status);
CREATE INDEX IF NOT EXISTS idx_crawler_discovered_pages_run_id ON crawler_discovered_pages(crawler_run_id);
CREATE INDEX IF NOT EXISTS idx_crawler_discovered_pages_url ON crawler_discovered_pages(url);
CREATE INDEX IF NOT EXISTS idx_crawler_discovered_pages_testing ON crawler_discovered_pages(selected_for_manual_testing, selected_for_automated_testing);
CREATE INDEX IF NOT EXISTS idx_crawler_auth_sessions_crawler_id ON crawler_auth_sessions(crawler_id);
CREATE INDEX IF NOT EXISTS idx_crawler_auth_sessions_active ON crawler_auth_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_crawler_metrics_run_id ON crawler_metrics(crawler_run_id);

-- Update timestamp trigger for web_crawlers
CREATE OR REPLACE FUNCTION update_crawler_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crawler_updated_at
    BEFORE UPDATE ON web_crawlers
    FOR EACH ROW
    EXECUTE FUNCTION update_crawler_updated_at();

-- Comments for documentation
COMMENT ON TABLE web_crawlers IS 'Main table for storing web crawler configurations with SAML authentication and advanced features';
COMMENT ON TABLE crawler_runs IS 'Individual execution runs of web crawlers with detailed progress tracking';
COMMENT ON TABLE crawler_discovered_pages IS 'Pages discovered during crawler runs, integrated with testing workflow';
COMMENT ON TABLE crawler_auth_sessions IS 'Persistent authentication sessions for SAML and other auth methods';
COMMENT ON TABLE crawler_metrics IS 'Performance and operational metrics for crawler optimization';

COMMENT ON COLUMN web_crawlers.saml_config IS 'SAML Identity Provider configuration including endpoints, certificates, and metadata';
COMMENT ON COLUMN web_crawlers.wait_conditions IS 'Array of custom wait conditions: [{selector: "...", timeout: 5000, condition: "visible"}]';
COMMENT ON COLUMN web_crawlers.extraction_rules IS 'Custom data extraction rules: {title: "h1", description: "meta[name=description]"}';
COMMENT ON COLUMN crawler_discovered_pages.content_hash IS 'SHA-256 hash of page content for efficient change detection and caching';
COMMENT ON COLUMN crawler_auth_sessions.cookies IS 'Encrypted browser cookies for session persistence across runs'; 