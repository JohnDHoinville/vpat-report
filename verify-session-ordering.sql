-- Verify Browser Session Ordering Fix
-- Run this to see which sessions are selected for each project

-- Show all sessions for verification
SELECT 
    wc.project_id,
    p.name as project_name,
    wc.name as crawler_name,
    cas.id as session_id,
    cas.authenticated_user,
    cas.created_at,
    cas.last_used_at,
    COALESCE(cas.last_used_at, cas.created_at) as effective_timestamp,
    cas.expires_at,
    CASE 
        WHEN cas.expires_at IS NULL THEN 'no_expiry'
        WHEN cas.expires_at > CURRENT_TIMESTAMP THEN 'valid'
        ELSE 'expired'
    END as expiry_status,
    cas.is_active,
    CASE 
        WHEN cas.cookies IS NULL THEN 0
        ELSE jsonb_array_length(cas.cookies)
    END as cookie_count
FROM crawler_auth_sessions cas
JOIN web_crawlers wc ON cas.crawler_id = wc.id
JOIN projects p ON wc.project_id = p.id
WHERE cas.is_active = true
ORDER BY wc.project_id, 
         COALESCE(cas.last_used_at, cas.created_at) DESC NULLS LAST,
         cas.created_at DESC NULLS LAST;

-- Show which session would be selected for each project (NEW LOGIC)
WITH ranked_sessions AS (
    SELECT 
        wc.project_id,
        p.name as project_name,
        cas.*,
        wc.name as crawler_name,
        ROW_NUMBER() OVER (
            PARTITION BY wc.project_id 
            ORDER BY COALESCE(cas.last_used_at, cas.created_at) DESC NULLS LAST,
                     cas.created_at DESC NULLS LAST
        ) as rank
    FROM crawler_auth_sessions cas
    JOIN web_crawlers wc ON cas.crawler_id = wc.id
    JOIN projects p ON wc.project_id = p.id
    WHERE cas.is_active = true
    AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
    AND cas.cookies IS NOT NULL
    AND jsonb_array_length(cas.cookies) > 0
)
SELECT 
    project_id,
    project_name,
    crawler_name,
    id as selected_session_id,
    authenticated_user,
    created_at,
    last_used_at,
    COALESCE(last_used_at, created_at) as effective_timestamp,
    expires_at,
    jsonb_array_length(cookies) as cookie_count
FROM ranked_sessions 
WHERE rank = 1
ORDER BY project_name;

-- Compare with OLD LOGIC (what was broken)
WITH old_ranked_sessions AS (
    SELECT 
        wc.project_id,
        p.name as project_name,
        cas.*,
        wc.name as crawler_name,
        ROW_NUMBER() OVER (
            PARTITION BY wc.project_id 
            ORDER BY cas.created_at DESC, cas.last_used_at DESC  -- OLD BROKEN LOGIC
        ) as rank
    FROM crawler_auth_sessions cas
    JOIN web_crawlers wc ON cas.crawler_id = wc.id
    JOIN projects p ON wc.project_id = p.id
    WHERE cas.is_active = true
    AND (cas.expires_at IS NULL OR cas.expires_at > CURRENT_TIMESTAMP)
    AND cas.cookies IS NOT NULL
    AND jsonb_array_length(cas.cookies) > 0
)
SELECT 
    'OLD_LOGIC' as comparison,
    project_id,
    project_name,
    crawler_name,
    id as selected_session_id,
    authenticated_user,
    created_at,
    last_used_at,
    COALESCE(last_used_at, created_at) as effective_timestamp,
    expires_at,
    jsonb_array_length(cookies) as cookie_count
FROM old_ranked_sessions 
WHERE rank = 1
ORDER BY project_name;
