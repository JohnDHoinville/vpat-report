-- Create missing automated_test_runs records from existing automated_test_results
-- This fixes the issue where we have detailed results but no run metadata

WITH run_groups AS (
  -- Group results by session and execution day to identify distinct runs
  -- Only include results for sessions that still exist
  SELECT 
    atr.test_session_id,
    atr.executed_at::date as run_date,
    MIN(atr.executed_at) as first_execution,
    MAX(atr.executed_at) as last_execution,
    ARRAY_AGG(DISTINCT atr.tool_name) as tools_used,
    COUNT(*) as pages_tested,
    SUM(atr.violations_count) as total_violations,
    SUM(atr.passes_count) as total_passes,
    COUNT(DISTINCT atr.test_instance_id) as test_instances_updated
  FROM automated_test_results atr 
  INNER JOIN test_sessions ts ON atr.test_session_id = ts.id
  WHERE atr.executed_at IS NOT NULL
  GROUP BY atr.test_session_id, atr.executed_at::date
),
run_inserts AS (
  -- Generate unique run IDs and prepare for insertion
  SELECT 
    test_session_id,
    'run-' || test_session_id || '-' || run_date as run_id,
    to_jsonb(tools_used) as tools_used,
    pages_tested,
    first_execution as started_at,
    last_execution as completed_at,
    CASE 
      WHEN last_execution IS NOT NULL THEN 'completed'
      ELSE 'pending'
    END as status,
    total_violations,
    0 as critical_violations, -- We'll calculate this separately if needed
    test_instances_updated
  FROM run_groups
)
INSERT INTO automated_test_runs (
  test_session_id,
  run_id,
  tools_used,
  pages_tested,
  started_at,
  completed_at,
  status,
  total_violations,
  critical_violations,
  test_instances_updated,
  created_at,
  client_metadata
)
SELECT 
  test_session_id,
  run_id,
  tools_used,
  pages_tested,
  started_at,
  completed_at,
  status,
  total_violations,
  critical_violations,
  test_instances_updated,
  started_at as created_at,
  '{"source": "reconstructed_from_results", "created_by": "database_repair"}'::jsonb
FROM run_inserts
ON CONFLICT (run_id) DO NOTHING;

-- Display what we created
SELECT 
  'Created runs:' as message,
  run_id,
  tools_used,
  pages_tested,
  total_violations,
  started_at
FROM automated_test_runs 
WHERE client_metadata->>'source' = 'reconstructed_from_results'
ORDER BY started_at DESC;