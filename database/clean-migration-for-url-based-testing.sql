-- Clean Migration for URL-Based Testing Architecture
-- Date: 2025-07-26
-- Purpose: Remove existing test sessions/instances to start fresh with URL-based testing
-- Preserves: projects, auth_users, web_crawlers, crawler_discovered_pages

-- ============================================================================
-- BACKUP CRITICAL DATA (in case we need to restore)
-- ============================================================================

-- Create backup tables with timestamps
CREATE TABLE IF NOT EXISTS projects_backup_20250726 AS 
SELECT * FROM projects;

CREATE TABLE IF NOT EXISTS auth_users_backup_20250726 AS 
SELECT * FROM auth_users;

CREATE TABLE IF NOT EXISTS web_crawlers_backup_20250726 AS 
SELECT * FROM web_crawlers;

-- ============================================================================
-- CLEAN SLATE - REMOVE TEST DATA
-- ============================================================================

-- Remove test instances first (has foreign keys to sessions)
DELETE FROM test_instances;
COMMENT ON TABLE test_instances IS 'Cleared for URL-based testing architecture - 2025-07-26';

-- Remove test sessions 
DELETE FROM test_sessions;
COMMENT ON TABLE test_sessions IS 'Cleared for URL-based testing architecture - 2025-07-26';

-- Remove audit logs related to testing
DELETE FROM test_audit_log;
COMMENT ON TABLE test_audit_log IS 'Cleared for URL-based testing architecture - 2025-07-26';

-- Remove any automated test results
DELETE FROM automated_test_results WHERE test_session_id IS NOT NULL;

-- Remove manual test results  
DELETE FROM manual_test_results WHERE test_session_id IS NOT NULL;

-- ============================================================================
-- PRESERVE CRITICAL DATA - VERIFY PRESERVATION
-- ============================================================================

DO $$
DECLARE
    project_count INTEGER;
    user_count INTEGER;
    crawler_count INTEGER;
    pages_count INTEGER;
BEGIN
    -- Count preserved data
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO user_count FROM auth_users;
    SELECT COUNT(*) INTO crawler_count FROM web_crawlers;
    SELECT COUNT(*) INTO pages_count FROM crawler_discovered_pages;
    
    -- Log preservation status
    RAISE NOTICE 'MIGRATION COMPLETE - DATA PRESERVED:';
    RAISE NOTICE '  Projects: % records', project_count;
    RAISE NOTICE '  Users: % records', user_count;
    RAISE NOTICE '  Crawlers: % records', crawler_count;
    RAISE NOTICE '  Pages: % records', pages_count;
    RAISE NOTICE 'Ready for URL-based testing architecture!';
END $$;

-- ============================================================================
-- RESET SEQUENCES (for clean IDs in new architecture)
-- ============================================================================

-- Reset test-related sequences to start fresh
-- Note: Only reset test-related sequences, preserve others
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'test_sessions_id_seq') 
    THEN setval('test_sessions_id_seq', 1, false)
END;

SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'test_instances_id_seq') 
    THEN setval('test_instances_id_seq', 1, false)
END;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify clean slate
SELECT 
    'test_sessions' as table_name, 
    COUNT(*) as remaining_records 
FROM test_sessions
UNION ALL
SELECT 
    'test_instances' as table_name, 
    COUNT(*) as remaining_records 
FROM test_instances
UNION ALL
SELECT 
    'test_audit_log' as table_name, 
    COUNT(*) as remaining_records 
FROM test_audit_log;

-- Verify preserved data
SELECT 
    'projects' as table_name, 
    COUNT(*) as preserved_records 
FROM projects
UNION ALL
SELECT 
    'auth_users' as table_name, 
    COUNT(*) as preserved_records 
FROM auth_users
UNION ALL
SELECT 
    'web_crawlers' as table_name, 
    COUNT(*) as preserved_records 
FROM web_crawlers
UNION ALL
SELECT 
    'crawler_discovered_pages' as table_name, 
    COUNT(*) as preserved_records 
FROM crawler_discovered_pages; 