-- Fix Discovery Constraints and Cleanup Issues
-- Date: 2025-01-17
-- Description: Fix foreign key constraints causing discovery deletion errors and add recovery functionality

-- 1. SAFE DISCOVERY DELETION FUNCTION
-- This function will safely delete a discovery and all related data in the correct order
CREATE OR REPLACE FUNCTION safe_delete_discovery(discovery_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    deleted_pages INTEGER := 0;
    deleted_instances INTEGER := 0;
    deleted_results INTEGER := 0;
BEGIN
    -- Start transaction
    BEGIN
        -- First, delete test instances that reference pages from this discovery
        WITH discovery_pages AS (
            SELECT id FROM discovered_pages WHERE discovery_id = discovery_uuid
        ),
        deleted_test_instances AS (
            DELETE FROM test_instances 
            WHERE page_id IN (SELECT id FROM discovery_pages)
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_instances FROM deleted_test_instances;
        
        -- Delete automated test results that reference pages from this discovery
        WITH discovery_pages AS (
            SELECT id FROM discovered_pages WHERE discovery_id = discovery_uuid
        ),
        deleted_automated_results AS (
            DELETE FROM automated_test_results 
            WHERE page_id IN (SELECT id FROM discovery_pages)
            RETURNING id
        )
        SELECT COUNT(*) INTO deleted_results FROM deleted_automated_results;
        
        -- Delete manual test results that reference pages from this discovery
        WITH discovery_pages AS (
            SELECT id FROM discovered_pages WHERE discovery_id = discovery_uuid
        )
        DELETE FROM manual_test_results 
        WHERE page_id IN (SELECT id FROM discovery_pages);
        
        -- Delete discovered pages
        DELETE FROM discovered_pages 
        WHERE discovery_id = discovery_uuid;
        GET DIAGNOSTICS deleted_pages = ROW_COUNT;
        
        -- Finally, delete the discovery itself
        DELETE FROM site_discovery 
        WHERE id = discovery_uuid;
        
        -- Build result
        result := jsonb_build_object(
            'success', true,
            'deleted_pages', deleted_pages,
            'deleted_test_instances', deleted_instances,
            'deleted_results', deleted_results,
            'message', 'Discovery deleted successfully with all related data'
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Return error details
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'message', 'Failed to delete discovery: ' || SQLERRM
        );
        RETURN result;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. DISCOVERY RECOVERY FUNCTION
-- This function will recover stuck discoveries by analyzing their state
CREATE OR REPLACE FUNCTION recover_stuck_discovery(discovery_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    discovery_record RECORD;
    page_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Get discovery details
    SELECT * INTO discovery_record 
    FROM site_discovery 
    WHERE id = discovery_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Discovery not found',
            'discovery_id', discovery_uuid
        );
    END IF;
    
    -- Count discovered pages
    SELECT COUNT(*) INTO page_count 
    FROM discovered_pages 
    WHERE discovery_id = discovery_uuid;
    
    -- Update discovery based on its state
    IF discovery_record.status IN ('pending', 'in_progress') THEN
        IF page_count > 0 THEN
            -- Has pages, mark as completed
            UPDATE site_discovery 
            SET 
                status = 'completed',
                total_pages_found = page_count,
                completed_at = CURRENT_TIMESTAMP,
                notes = COALESCE(notes || ' | ', '') || 'Recovered from stuck state on ' || CURRENT_TIMESTAMP
            WHERE id = discovery_uuid;
            
            result := jsonb_build_object(
                'success', true,
                'action', 'marked_completed',
                'page_count', page_count,
                'previous_status', discovery_record.status,
                'new_status', 'completed',
                'message', 'Discovery recovered and marked as completed'
            );
        ELSE
            -- No pages, mark as failed
            UPDATE site_discovery 
            SET 
                status = 'failed',
                total_pages_found = 0,
                completed_at = CURRENT_TIMESTAMP,
                notes = COALESCE(notes || ' | ', '') || 'Marked as failed (no pages found) on ' || CURRENT_TIMESTAMP
            WHERE id = discovery_uuid;
            
            result := jsonb_build_object(
                'success', true,
                'action', 'marked_failed',
                'page_count', 0,
                'previous_status', discovery_record.status,
                'new_status', 'failed',
                'message', 'Discovery marked as failed (no pages found)'
            );
        END IF;
    ELSE
        -- Already in final state
        result := jsonb_build_object(
            'success', true,
            'action', 'no_change_needed',
            'current_status', discovery_record.status,
            'page_count', page_count,
            'message', 'Discovery is already in final state: ' || discovery_record.status
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. CLEANUP ORPHANED DATA FUNCTION
-- This function will clean up orphaned data from failed processes
CREATE OR REPLACE FUNCTION cleanup_orphaned_discovery_data()
RETURNS JSONB AS $$
DECLARE
    cleaned_discoveries INTEGER := 0;
    cleaned_pages INTEGER := 0;
    cleaned_instances INTEGER := 0;
    result JSONB;
BEGIN
    -- Clean up test instances with NULL page_id references
    DELETE FROM test_instances 
    WHERE page_id IS NOT NULL 
    AND page_id NOT IN (SELECT id FROM discovered_pages);
    GET DIAGNOSTICS cleaned_instances = ROW_COUNT;
    
    -- Clean up orphaned pages (pages without discoveries)
    DELETE FROM discovered_pages 
    WHERE discovery_id NOT IN (SELECT id FROM site_discovery);
    GET DIAGNOSTICS cleaned_pages = ROW_COUNT;
    
    -- Mark very old pending discoveries as failed (older than 1 hour)
    UPDATE site_discovery 
    SET 
        status = 'failed',
        notes = COALESCE(notes || ' | ', '') || 'Auto-failed due to timeout on ' || CURRENT_TIMESTAMP
    WHERE status IN ('pending', 'in_progress') 
    AND started_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour');
    GET DIAGNOSTICS cleaned_discoveries = ROW_COUNT;
    
    result := jsonb_build_object(
        'success', true,
        'cleaned_orphaned_instances', cleaned_instances,
        'cleaned_orphaned_pages', cleaned_pages,
        'auto_failed_discoveries', cleaned_discoveries,
        'message', 'Orphaned data cleanup completed'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. LIST PENDING DISCOVERIES FUNCTION
-- This function will show all pending/stuck discoveries for debugging
CREATE OR REPLACE FUNCTION list_pending_discoveries()
RETURNS TABLE (
    discovery_id UUID,
    project_id UUID,
    domain VARCHAR(255),
    status VARCHAR(50),
    pages_found INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    age_minutes INTEGER,
    needs_recovery BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.id as discovery_id,
        sd.project_id,
        sd.domain,
        sd.status,
        (SELECT COUNT(*)::INTEGER FROM discovered_pages dp WHERE dp.discovery_id = sd.id) as pages_found,
        sd.started_at,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sd.started_at))::INTEGER / 60 as age_minutes,
        (sd.status IN ('pending', 'in_progress') AND 
         EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sd.started_at)) > 300) as needs_recovery -- Older than 5 minutes
    FROM site_discovery sd 
    WHERE sd.status IN ('pending', 'in_progress', 'failed')
    ORDER BY sd.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. ADD CONSTRAINTS WITH PROPER CASCADE HANDLING
-- Make sure foreign key constraints allow proper cleanup

-- Drop existing constraint if it exists and recreate with proper cascade
DO $$
BEGIN
    -- Check if constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'test_instances_page_id_fkey'
    ) THEN
        ALTER TABLE test_instances DROP CONSTRAINT test_instances_page_id_fkey;
    END IF;
    
    -- Recreate with SET NULL on delete (so test instances aren't blocked from deletion)
    ALTER TABLE test_instances 
    ADD CONSTRAINT test_instances_page_id_fkey 
    FOREIGN KEY (page_id) REFERENCES discovered_pages(id) ON DELETE SET NULL;
    
EXCEPTION WHEN OTHERS THEN
    -- If there's an error, just log it and continue
    RAISE NOTICE 'Could not modify foreign key constraint: %', SQLERRM;
END $$;

-- 6. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_site_discovery_status_age ON site_discovery(status, started_at);
CREATE INDEX IF NOT EXISTS idx_discovered_pages_discovery_id_cascade ON discovered_pages(discovery_id);
CREATE INDEX IF NOT EXISTS idx_test_instances_page_id_null ON test_instances(page_id) WHERE page_id IS NOT NULL;

-- 7. ADD DISCOVERY CLEANUP TRIGGER
-- Automatically clean up when discoveries are deleted
CREATE OR REPLACE FUNCTION trigger_discovery_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- When a discovery is about to be deleted, clean up related data first
    PERFORM safe_delete_discovery(OLD.id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger
DROP TRIGGER IF EXISTS discovery_cleanup_trigger ON site_discovery;
CREATE TRIGGER discovery_cleanup_trigger
    BEFORE DELETE ON site_discovery
    FOR EACH ROW
    EXECUTE FUNCTION trigger_discovery_cleanup();

-- 8. GRANT PERMISSIONS (if using role-based access)
-- Grant execute permissions on the new functions
DO $$
BEGIN
    -- Grant to public for now (adjust based on your security needs)
    GRANT EXECUTE ON FUNCTION safe_delete_discovery(UUID) TO PUBLIC;
    GRANT EXECUTE ON FUNCTION recover_stuck_discovery(UUID) TO PUBLIC;
    GRANT EXECUTE ON FUNCTION cleanup_orphaned_discovery_data() TO PUBLIC;
    GRANT EXECUTE ON FUNCTION list_pending_discoveries() TO PUBLIC;
EXCEPTION WHEN OTHERS THEN
    -- Ignore permission errors if roles don't exist
    RAISE NOTICE 'Could not grant permissions: %', SQLERRM;
END $$;

-- Success message
SELECT 'Discovery constraints and cleanup functions have been successfully created!' as status; 