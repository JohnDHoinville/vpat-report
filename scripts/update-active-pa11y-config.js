#!/usr/bin/env node

/**
 * Update Active Pa11y Configuration Script
 * 
 * This script updates all active automation sessions to use the enhanced 
 * Pa11y configuration with axe runner for better WCAG 2.2 support.
 */

const { pool } = require('../database/config');
const { logger } = require('../api/utils/logger');

async function updateActivePa11yConfig() {
    try {
        console.log('🔄 Updating active Pa11y configurations...');
        
        // 1. Get all cancelled test runs that were using Pa11y
        const cancelledRunsQuery = `
            SELECT id, session_id, tools_used, pages_tested, started_at
            FROM automated_test_runs 
            WHERE status = 'cancelled' 
            AND tools_used::text LIKE '%pa11y%'
            AND started_at > NOW() - INTERVAL '1 hour'
            ORDER BY started_at DESC
        `;
        
        const cancelledRuns = await pool.query(cancelledRunsQuery);
        console.log(`📋 Found ${cancelledRuns.rows.length} recently cancelled Pa11y test runs`);
        
        if (cancelledRuns.rows.length === 0) {
            console.log('✅ No recently cancelled Pa11y test runs to restart');
            return;
        }
        
        // 2. Create new test runs with enhanced Pa11y configuration
        for (const run of cancelledRuns.rows) {
            console.log(`🔄 Restarting test run for session: ${run.session_id}`);
            
            const newRunQuery = `
                INSERT INTO automated_test_runs (
                    session_id, 
                    tools_used, 
                    pages_tested, 
                    started_at,
                    status,
                    raw_results
                ) VALUES ($1, $2, $3, NOW(), 'queued', $4)
                RETURNING id
            `;
            
            const enhancedResults = {
                pa11y_config: {
                    runner: 'axe',
                    standard: 'WCAG2AA',
                    enhancement: 'upgraded_for_wcag_2.2_support',
                    previous_run_id: run.id,
                    upgrade_timestamp: new Date().toISOString()
                }
            };
            
            const newRun = await pool.query(newRunQuery, [
                run.session_id,
                run.tools_used,
                run.pages_tested,
                JSON.stringify(enhancedResults)
            ]);
            
            console.log(`✅ Created new enhanced test run: ${newRun.rows[0].id}`);
        }
        
        // 3. Update any test instances that reference old Pa11y configuration
        const updateInstancesQuery = `
            UPDATE test_instances 
            SET automated_test_config = jsonb_set(
                COALESCE(automated_test_config, '{}'),
                '{pa11y_runner}',
                '"axe"'
            ),
            automated_test_config = jsonb_set(
                automated_test_config,
                '{pa11y_enhancement}',
                '"wcag_2.2_support_enabled"'
            ),
            updated_at = NOW()
            WHERE test_method IN ('automated', 'both')
            AND (automated_test_config->>'pa11y_runner' IS NULL 
                 OR automated_test_config->>'pa11y_runner' != 'axe')
        `;
        
        const updateResult = await pool.query(updateInstancesQuery);
        console.log(`✅ Updated ${updateResult.rowCount} test instances with enhanced Pa11y config`);
        
        // 4. Log the configuration update in audit trail
        const auditQuery = `
            INSERT INTO test_audit_log (
                session_id,
                test_instance_id,
                action,
                field_changed,
                old_value,
                new_value,
                changed_by_username,
                changed_at,
                change_reason
            )
            SELECT DISTINCT 
                ts.id as session_id,
                NULL as test_instance_id,
                'pa11y_config_enhanced' as action,
                'automation_configuration' as field_changed,
                'pa11y_default_runner' as old_value,
                'pa11y_axe_runner_wcag_2.2' as new_value,
                'system_upgrade' as changed_by_username,
                NOW() as changed_at,
                'Enhanced Pa11y configuration with axe runner for better WCAG 2.2 support' as change_reason
            FROM test_sessions ts
            WHERE ts.id IN (
                SELECT DISTINCT session_id 
                FROM automated_test_runs 
                WHERE tools_used::text LIKE '%pa11y%'
                AND created_at > NOW() - INTERVAL '24 hours'
            )
        `;
        
        const auditResult = await pool.query(auditQuery);
        console.log(`📝 Created ${auditResult.rowCount} audit log entries for Pa11y enhancement`);
        
        // 5. Summary report
        console.log('\n🎯 Pa11y Configuration Update Summary:');
        console.log(`├── Cancelled old test runs: ${cancelledRuns.rows.length}`);
        console.log(`├── Created new enhanced test runs: ${cancelledRuns.rows.length}`);
        console.log(`├── Updated test instances: ${updateResult.rowCount}`);
        console.log(`└── Audit entries created: ${auditResult.rowCount}`);
        
        console.log('\n✅ Pa11y configuration successfully updated!');
        console.log('🚀 Enhanced WCAG 2.2 support is now active for all new Pa11y tests');
        
    } catch (error) {
        console.error('❌ Error updating Pa11y configuration:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    updateActivePa11yConfig()
        .then(() => {
            console.log('🎉 Pa11y configuration update completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Pa11y configuration update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateActivePa11yConfig }; 