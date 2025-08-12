#!/usr/bin/env node

// Debug version of the worker to see what's happening
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || 'johnhoinville',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function debugWorker() {
    try {
        console.log('🔍 Debug Worker Starting...');
        
        // Test basic database connection
        const testQuery = await pool.query('SELECT NOW()');
        console.log('✅ Database connected at:', testQuery.rows[0].now);
        
        // Check all pending tests
        const allPendingQuery = `
            SELECT COUNT(*) as count 
            FROM automated_test_results 
            WHERE status = 'pending'
        `;
        const allPendingResult = await pool.query(allPendingQuery);
        console.log('📊 Total pending tests (simple):', allPendingResult.rows[0].count);
        
        // Check pending tests with JOIN (worker's query)
        const workerQuery = `
            SELECT 
                atr.id,
                atr.test_session_id,
                atr.page_id,
                atr.tool_name,
                atr.status,
                atr.started_at,
                dp.url as page_url,
                dp.title as page_title
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.status = 'pending'
            ORDER BY atr.started_at ASC
            LIMIT 5
        `;
        
        const workerResult = await pool.query(workerQuery);
        console.log('📊 Pending tests (worker query):', workerResult.rows.length);
        
        if (workerResult.rows.length > 0) {
            console.log('🔍 Sample pending test:', {
                id: workerResult.rows[0].id,
                tool: workerResult.rows[0].tool_name,
                status: workerResult.rows[0].status,
                url: workerResult.rows[0].page_url
            });
        }
        
        // Check if pages exist for our tests
        const pageCheckQuery = `
            SELECT 
                atr.id as test_id,
                atr.page_id,
                dp.id as page_exists,
                dp.url
            FROM automated_test_results atr
            LEFT JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.status = 'pending'
        `;
        
        const pageCheckResult = await pool.query(pageCheckQuery);
        console.log('📄 Page existence check:');
        pageCheckResult.rows.forEach(row => {
            console.log(`  Test ${row.test_id}: Page ${row.page_id} ${row.page_exists ? 'EXISTS' : 'MISSING'} (${row.url || 'NO URL'})`);
        });
        
    } catch (error) {
        console.error('❌ Debug worker error:', error);
    } finally {
        await pool.end();
    }
}

debugWorker();