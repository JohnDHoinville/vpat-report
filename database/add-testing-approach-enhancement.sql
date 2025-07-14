-- =====================================================================================
-- Testing Approach Enhancement Migration
-- Adds comprehensive approach classification to test_sessions table
-- Created: January 2025
-- =====================================================================================

-- Add new approach field with comprehensive options
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS testing_approach VARCHAR(50) DEFAULT 'hybrid' 
CHECK (testing_approach IN ('automated_only', 'manual_only', 'hybrid', 'rapid_automated', 'comprehensive_manual'));

-- Add index for efficient filtering by approach
CREATE INDEX IF NOT EXISTS idx_test_sessions_approach ON test_sessions(testing_approach);

-- Add approach_details JSONB field for storing detailed configuration
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS approach_details JSONB DEFAULT '{
    "automated_tools": ["axe", "pa11y", "lighthouse"],
    "manual_techniques": ["keyboard_navigation", "screen_reader", "color_contrast", "focus_management"],
    "coverage_target": "wcag_aa",
    "time_estimate_hours": null,
    "priority_criteria": [],
    "skip_automation_for": [],
    "require_manual_for": []
}';

-- Update existing records based on current test_type values
UPDATE test_sessions 
SET testing_approach = CASE 
    WHEN test_type = 'automated_only' THEN 'automated_only'
    WHEN test_type = 'manual_only' THEN 'manual_only'
    WHEN test_type = 'followup' THEN 'manual_only'
    WHEN test_type = 'full' THEN 'hybrid'
    ELSE 'hybrid'
END
WHERE testing_approach IS NULL OR testing_approach = 'hybrid';

-- Add approach_details based on testing_approach
UPDATE test_sessions 
SET approach_details = CASE testing_approach
    WHEN 'automated_only' THEN '{
        "automated_tools": ["axe", "pa11y", "lighthouse"],
        "manual_techniques": [],
        "coverage_target": "wcag_aa",
        "time_estimate_hours": 2,
        "priority_criteria": ["automated_testable"],
        "skip_automation_for": [],
        "require_manual_for": []
    }'::jsonb
    WHEN 'manual_only' THEN '{
        "automated_tools": [],
        "manual_techniques": ["keyboard_navigation", "screen_reader", "color_contrast", "focus_management", "cognitive_assessment"],
        "coverage_target": "wcag_aa",
        "time_estimate_hours": 8,
        "priority_criteria": ["manual_only", "complex_interactions", "cognitive_requirements"],
        "skip_automation_for": ["all"],
        "require_manual_for": ["all_applicable"]
    }'::jsonb
    WHEN 'rapid_automated' THEN '{
        "automated_tools": ["axe"],
        "manual_techniques": [],
        "coverage_target": "critical_issues",
        "time_estimate_hours": 1,
        "priority_criteria": ["critical_violations", "blocking_issues"],
        "skip_automation_for": [],
        "require_manual_for": []
    }'::jsonb
    WHEN 'comprehensive_manual' THEN '{
        "automated_tools": ["axe", "pa11y", "lighthouse"],
        "manual_techniques": ["keyboard_navigation", "screen_reader", "color_contrast", "focus_management", "cognitive_assessment", "usability_testing"],
        "coverage_target": "wcag_aaa",
        "time_estimate_hours": 16,
        "priority_criteria": ["comprehensive_coverage", "edge_cases", "user_experience"],
        "skip_automation_for": [],
        "require_manual_for": ["all_criteria", "edge_cases", "user_workflows"]
    }'::jsonb
    ELSE '{
        "automated_tools": ["axe", "pa11y"],
        "manual_techniques": ["keyboard_navigation", "screen_reader", "color_contrast"],
        "coverage_target": "wcag_aa",
        "time_estimate_hours": 4,
        "priority_criteria": ["balanced_coverage"],
        "skip_automation_for": [],
        "require_manual_for": ["manual_only_criteria"]
    }'::jsonb
END
WHERE approach_details = '{"automated_tools": ["axe", "pa11y", "lighthouse"], "manual_techniques": ["keyboard_navigation", "screen_reader", "color_contrast", "focus_management"], "coverage_target": "wcag_aa", "time_estimate_hours": null, "priority_criteria": [], "skip_automation_for": [], "require_manual_for": []}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN test_sessions.testing_approach IS 'Defines the testing approach: automated_only (tools only), manual_only (human testing), hybrid (balanced mix), rapid_automated (quick scan), comprehensive_manual (thorough manual testing)';
COMMENT ON COLUMN test_sessions.approach_details IS 'JSON configuration for testing approach including tools, techniques, coverage targets, and time estimates';

-- Create view for easy approach analysis
CREATE OR REPLACE VIEW testing_approach_summary AS
SELECT 
    testing_approach,
    COUNT(*) as session_count,
    AVG((approach_details->>'time_estimate_hours')::numeric) as avg_time_estimate,
    array_agg(DISTINCT (approach_details->>'coverage_target')) as coverage_targets,
    array_agg(DISTINCT status) as session_statuses
FROM test_sessions 
WHERE testing_approach IS NOT NULL
GROUP BY testing_approach
ORDER BY session_count DESC;

-- Grant permissions
GRANT SELECT ON testing_approach_summary TO PUBLIC;

-- Add audit logging for approach changes
CREATE OR REPLACE FUNCTION log_approach_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.testing_approach IS DISTINCT FROM NEW.testing_approach THEN
        INSERT INTO test_audit_log (
            test_instance_id, 
            action_type, 
            change_description, 
            old_value, 
            new_value,
            details
        ) VALUES (
            NULL, -- No specific test instance
            'approach_change', 
            'Testing approach modified',
            OLD.testing_approach,
            NEW.testing_approach,
            jsonb_build_object(
                'session_id', NEW.id,
                'session_name', NEW.name,
                'old_approach_details', OLD.approach_details,
                'new_approach_details', NEW.approach_details
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for approach changes (only if test_audit_log table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_audit_log') THEN
        DROP TRIGGER IF EXISTS test_sessions_approach_audit ON test_sessions;
        CREATE TRIGGER test_sessions_approach_audit
            BEFORE UPDATE ON test_sessions
            FOR EACH ROW
            EXECUTE FUNCTION log_approach_changes();
    END IF;
END $$;

-- =====================================================================================
-- TESTING APPROACH DEFINITIONS
-- =====================================================================================

/*
APPROACH TYPES:

1. automated_only: Pure automated testing using tools like axe, pa11y, lighthouse
   - Fast execution (1-2 hours)
   - Good for CI/CD pipelines
   - Covers ~30-40% of WCAG criteria
   - Best for: Regression testing, development feedback

2. manual_only: Human-driven accessibility testing
   - Thorough evaluation (8+ hours)
   - Covers ~90% of WCAG criteria
   - Includes cognitive, usability, and complex interaction testing
   - Best for: Comprehensive audits, certification compliance

3. hybrid: Balanced automated + manual approach
   - Moderate time investment (4-6 hours)
   - Automated tools for quick wins, manual for complex criteria
   - Covers ~70% of WCAG criteria effectively
   - Best for: Regular compliance monitoring, most projects

4. rapid_automated: Quick automated scan for critical issues
   - Very fast (30 minutes - 1 hour)
   - Uses only fastest tools (typically just axe)
   - Focuses on blocking accessibility issues
   - Best for: Quick checks, pre-deployment validation

5. comprehensive_manual: Exhaustive manual testing
   - Extended timeline (12-20 hours)
   - Includes automated baseline + extensive manual testing
   - Covers edge cases, user workflows, assistive technology testing
   - Best for: Accessibility certifications, legal compliance
*/ 