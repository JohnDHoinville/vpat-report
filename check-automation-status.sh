#!/bin/bash

echo "🔍 Checking automation status..."

# Check if backend server is running
if ! curl -sf http://localhost:3001/health >/dev/null; then
    echo "❌ Backend server is not responding"
    exit 1
fi

echo "✅ Backend server is running"

# Check pending test results
PENDING_TESTS=$(psql -U postgres -d accessibility_testing -t -c "SELECT COUNT(*) FROM automated_test_results WHERE status = 'pending';" 2>/dev/null | tr -d ' ')

if [ -z "$PENDING_TESTS" ]; then
    echo "❌ Could not query database"
    exit 1
fi

echo "📊 Pending tests: $PENDING_TESTS"

# Check if worker is running
WORKER_PIDS=$(ps aux | grep "automated-testing-worker" | grep -v grep | awk '{print $2}')

if [ -z "$WORKER_PIDS" ]; then
    echo "⚠️  No worker processes found"
    if [ "$PENDING_TESTS" -gt 0 ]; then
        echo "🚀 Starting worker to process $PENDING_TESTS pending tests..."
        nohup node scripts/automated-testing-worker.js > logs/worker.log 2>&1 &
        NEW_PID=$!
        echo "✅ Worker started with PID: $NEW_PID"
    fi
else
    echo "✅ Worker is running (PIDs: $WORKER_PIDS)"
fi

# Check recent automation runs
RECENT_RUNS=$(psql -U postgres -d accessibility_testing -t -c "SELECT COUNT(*) FROM automation_runs_v2 WHERE created_at > NOW() - INTERVAL '10 minutes';" 2>/dev/null | tr -d ' ')

if [ -n "$RECENT_RUNS" ] && [ "$RECENT_RUNS" -gt 0 ]; then
    echo "📈 Recent automation runs: $RECENT_RUNS"
    
    # Show latest run status
    psql -U postgres -d accessibility_testing -c "
        SELECT 
            id, 
            status, 
            target_mode,
            (SELECT COUNT(*) FROM automated_test_results WHERE automation_run_id = ar.id) as test_count,
            created_at
        FROM automation_runs_v2 ar 
        WHERE created_at > NOW() - INTERVAL '10 minutes' 
        ORDER BY created_at DESC 
        LIMIT 3;
    " 2>/dev/null
else
    echo "📊 No recent automation runs found"
fi

echo "🔍 Automation status check complete"