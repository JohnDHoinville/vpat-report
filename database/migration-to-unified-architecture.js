/**
 * Data Migration Script: Legacy to Unified Testing Session Architecture
 * Migrates existing data while preserving all information and audit trails
 * Created: December 11, 2024
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
};

const pool = new Pool(dbConfig);

class UnifiedArchitectureMigration {

    /**
     * Main migration execution
     */
    static async runMigration() {
        console.log('🚀 Starting Unified Testing Session Architecture Migration...');
        
        try {
            // Step 1: Create backup
            await this.createBackup();
            
            // Step 2: Apply new schema
            await this.applyNewSchema();
            
            // Step 3: Seed test requirements
            await this.seedTestRequirements();
            
            // Step 4: Create default testing sessions from existing data
            await this.createDefaultTestingSessions();
            
            // Step 5: Migrate existing violations to test instances
            await this.migrateViolationsToTestInstances();
            
            // Step 6: Migrate automated test results to test instances
            await this.migrateAutomatedResultsToTestInstances();
            
            // Step 7: Migrate manual test results to test instances
            await this.migrateManualResultsToTestInstances();
            
            // Step 8: Create historical audit trail
            await this.createHistoricalAuditTrail();
            
            // Step 9: Update session statistics
            await this.updateSessionStatistics();
            
            // Step 10: Validate migration
            await this.validateMigration();
            
            console.log('✅ Migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            console.log('🔄 Starting rollback...');
            await this.rollbackMigration();
            throw error;
        }
    }

    /**
     * Create backup of existing data
     */
    static async createBackup() {
        console.log('📦 Creating backup of existing data...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, 'backups', `migration-${timestamp}`);
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Backup critical tables
        const tablesToBackup = [
            'violations',
            'automated_test_results', 
            'manual_test_results',
            'test_sessions',
            'projects',
            'discovered_pages'
        ];

        for (const table of tablesToBackup) {
            try {
                const result = await pool.query(`SELECT * FROM ${table}`);
                const backupFile = path.join(backupDir, `${table}.json`);
                fs.writeFileSync(backupFile, JSON.stringify(result.rows, null, 2));
                console.log(`  ✅ Backed up ${table}: ${result.rows.length} records`);
            } catch (error) {
                if (error.code === '42P01') {
                    console.log(`  ⚠️  Table ${table} doesn't exist, skipping backup`);
                } else {
                    throw error;
                }
            }
        }

        console.log(`📦 Backup created in: ${backupDir}`);
        return backupDir;
    }

    /**
     * Apply new schema
     */
    static async applyNewSchema() {
        console.log('🏗️  Applying new unified schema...');
        
        try {
            // Read and execute schema file
            const schemaPath = path.join(__dirname, 'unified-testing-schema.sql');
            const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
            
            await pool.query(schemaSQL);
            console.log('✅ New schema applied successfully');
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️  Schema file not found, assuming schema already exists');
            } else {
                throw error;
            }
        }
    }

    /**
     * Seed test requirements
     */
    static async seedTestRequirements() {
        console.log('🌱 Seeding test requirements...');
        
        try {
            // Check if requirements already exist
            const existingCount = await pool.query('SELECT COUNT(*) FROM test_requirements');
            if (parseInt(existingCount.rows[0].count) > 0) {
                console.log('✅ Test requirements already seeded, skipping');
                return;
            }

            // Read and execute seed file
            const seedPath = path.join(__dirname, 'seed-test-requirements.sql');
            const seedSQL = fs.readFileSync(seedPath, 'utf8');
            
            await pool.query(seedSQL);
            
            const requirementCount = await pool.query('SELECT COUNT(*) FROM test_requirements');
            console.log(`✅ Seeded ${requirementCount.rows[0].count} test requirements`);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('⚠️  Seed file not found, manual seeding required');
            } else {
                throw error;
            }
        }
    }

    /**
     * Create default testing sessions from existing projects
     */
    static async createDefaultTestingSessions() {
        console.log('📋 Creating default testing sessions...');
        
        // Get all projects
        const projectsResult = await pool.query('SELECT * FROM projects ORDER BY created_at');
        const projects = projectsResult.rows;
        
        for (const project of projects) {
            try {
                // Create a default session for each project
                const sessionResult = await pool.query(`
                    INSERT INTO test_sessions (
                        project_id, name, description, conformance_level, 
                        status, created_at, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT DO NOTHING
                    RETURNING id
                `, [
                    project.id,
                    `${project.name} - Migrated Session`,
                    `Default testing session created during migration from legacy data`,
                    'wcag_aa', // Default to WCAG AA
                    'active',
                    project.created_at || new Date(),
                    project.created_by || null
                ]);

                if (sessionResult.rows.length > 0) {
                    console.log(`  ✅ Created session for project: ${project.name}`);
                    
                    // Store session ID for later use
                    project.default_session_id = sessionResult.rows[0].id;
                } else {
                    // Session already exists, find it
                    const existingSession = await pool.query(`
                        SELECT id FROM test_sessions 
                        WHERE project_id = $1 
                        ORDER BY created_at LIMIT 1
                    `, [project.id]);
                    
                    if (existingSession.rows.length > 0) {
                        project.default_session_id = existingSession.rows[0].id;
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error creating session for project ${project.name}:`, error);
            }
        }

        // Store project sessions mapping for later use
        this.projectSessions = projects;
        console.log(`✅ Created/found ${projects.length} testing sessions`);
    }

    /**
     * Migrate violations to test instances
     */
    static async migrateViolationsToTestInstances() {
        console.log('🔄 Migrating violations to test instances...');
        
        try {
            const violationsResult = await pool.query(`
                SELECT v.*, atr.test_session_id, atr.tool_name, p.id as project_id,
                       dp.id as page_id, dp.url as page_url
                FROM violations v
                LEFT JOIN automated_test_results atr ON v.automated_result_id = atr.id
                LEFT JOIN manual_test_results mtr ON v.manual_result_id = mtr.id
                LEFT JOIN discovered_pages dp ON v.page_url = dp.url
                LEFT JOIN projects p ON dp.project_id = p.id
                ORDER BY v.created_at
            `);

            const violations = violationsResult.rows;
            let migratedCount = 0;
            let skippedCount = 0;

            for (const violation of violations) {
                try {
                    // Find appropriate session
                    let sessionId = null;
                    
                    if (violation.test_session_id) {
                        // Try to find migrated session for this test session
                        const sessionMapping = this.projectSessions.find(p => 
                            p.id === violation.project_id
                        );
                        sessionId = sessionMapping?.default_session_id;
                    }
                    
                    if (!sessionId && violation.project_id) {
                        // Find session by project
                        const sessionResult = await pool.query(`
                            SELECT id FROM test_sessions WHERE project_id = $1 LIMIT 1
                        `, [violation.project_id]);
                        
                        if (sessionResult.rows.length > 0) {
                            sessionId = sessionResult.rows[0].id;
                        }
                    }

                    if (!sessionId) {
                        skippedCount++;
                        continue;
                    }

                    // Find matching test requirement
                    const requirementId = await this.findMatchingRequirement(violation);

                    if (!requirementId) {
                        skippedCount++;
                        continue;
                    }

                    // Create test instance
                    await pool.query(`
                        INSERT INTO test_instances (
                            session_id, requirement_id, page_id, status,
                            notes, evidence, test_method_used, tool_used,
                            created_at, updated_at, completed_at,
                            automated_result_id, manual_result_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        ON CONFLICT (session_id, requirement_id, page_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            notes = COALESCE(EXCLUDED.notes, test_instances.notes),
                            evidence = EXCLUDED.evidence,
                            updated_at = EXCLUDED.updated_at
                    `, [
                        sessionId,
                        requirementId,
                        violation.page_id,
                        'failed', // Violations represent failed tests
                        violation.description || violation.help_text,
                        JSON.stringify([{
                            type: 'violation_details',
                            selector: violation.element_selector,
                            html: violation.element_html,
                            wcag_criterion: violation.wcag_criterion,
                            help_url: violation.help_url,
                            migrated_from: 'violations'
                        }]),
                        violation.tool_name ? 'automated' : 'manual',
                        violation.tool_name,
                        violation.created_at,
                        violation.created_at,
                        violation.created_at,
                        violation.automated_result_id,
                        violation.manual_result_id
                    ]);

                    migratedCount++;

                } catch (error) {
                    console.error(`❌ Error migrating violation ${violation.id}:`, error);
                    skippedCount++;
                }
            }

            console.log(`✅ Migrated ${migratedCount} violations, skipped ${skippedCount}`);
            
        } catch (error) {
            if (error.code === '42P01') {
                console.log('⚠️  Violations table not found, skipping violation migration');
            } else {
                throw error;
            }
        }
    }

    /**
     * Migrate automated test results to test instances
     */
    static async migrateAutomatedResultsToTestInstances() {
        console.log('🤖 Migrating automated test results to test instances...');
        
        try {
            const automatedResults = await pool.query(`
                SELECT atr.*, p.id as project_id
                FROM automated_test_results atr
                LEFT JOIN projects p ON atr.project_id = p.id
                WHERE atr.passes_count > 0
                ORDER BY atr.executed_at
            `);

            let migratedCount = 0;
            let skippedCount = 0;

            for (const result of automatedResults.rows) {
                try {
                    // Find session for this result
                    const sessionMapping = this.projectSessions.find(p => 
                        p.id === result.project_id
                    );
                    
                    if (!sessionMapping?.default_session_id) {
                        skippedCount++;
                        continue;
                    }

                    // Extract pass information from raw_results
                    const passes = this.extractPassesFromRawResults(result.raw_results);
                    
                    for (const pass of passes) {
                        const requirementId = await this.findMatchingRequirement(pass);
                        
                        if (!requirementId) continue;

                        await pool.query(`
                            INSERT INTO test_instances (
                                session_id, requirement_id, page_id, status,
                                notes, evidence, test_method_used, tool_used,
                                created_at, updated_at, completed_at,
                                automated_result_id, confidence_level
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                            ON CONFLICT (session_id, requirement_id, page_id) DO UPDATE SET
                                status = CASE 
                                    WHEN test_instances.status = 'failed' THEN test_instances.status
                                    ELSE EXCLUDED.status
                                END,
                                updated_at = EXCLUDED.updated_at
                        `, [
                            sessionMapping.default_session_id,
                            requirementId,
                            pass.page_id,
                            'passed',
                            `Automated test passed: ${pass.description || pass.rule_id}`,
                            JSON.stringify([{
                                type: 'automated_pass',
                                rule_id: pass.rule_id,
                                help_url: pass.help_url,
                                migrated_from: 'automated_test_results'
                            }]),
                            'automated',
                            result.tool_name,
                            result.executed_at,
                            result.executed_at,
                            result.executed_at,
                            result.id,
                            'high' // Automated tests have high confidence
                        ]);

                        migratedCount++;
                    }

                } catch (error) {
                    console.error(`❌ Error migrating automated result ${result.id}:`, error);
                    skippedCount++;
                }
            }

            console.log(`✅ Migrated ${migratedCount} automated test passes, skipped ${skippedCount}`);
            
        } catch (error) {
            if (error.code === '42P01') {
                console.log('⚠️  Automated test results table not found, skipping migration');
            } else {
                throw error;
            }
        }
    }

    /**
     * Migrate manual test results to test instances
     */
    static async migrateManualResultsToTestInstances() {
        console.log('👤 Migrating manual test results to test instances...');
        
        try {
            const manualResults = await pool.query(`
                SELECT mtr.*, p.id as project_id, dp.id as page_id
                FROM manual_test_results mtr
                LEFT JOIN projects p ON mtr.project_id = p.id
                LEFT JOIN discovered_pages dp ON mtr.page_url = dp.url
                ORDER BY mtr.tested_at
            `);

            let migratedCount = 0;
            let skippedCount = 0;

            for (const result of manualResults.rows) {
                try {
                    // Find session for this result
                    const sessionMapping = this.projectSessions.find(p => 
                        p.id === result.project_id
                    );
                    
                    if (!sessionMapping?.default_session_id) {
                        skippedCount++;
                        continue;
                    }

                    // Find matching requirement
                    const requirementId = await this.findMatchingRequirement(result);
                    
                    if (!requirementId) {
                        skippedCount++;
                        continue;
                    }

                    await pool.query(`
                        INSERT INTO test_instances (
                            session_id, requirement_id, page_id, status,
                            assigned_tester, notes, evidence, test_method_used,
                            created_at, updated_at, completed_at,
                            manual_result_id, confidence_level
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                        ON CONFLICT (session_id, requirement_id, page_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            assigned_tester = COALESCE(EXCLUDED.assigned_tester, test_instances.assigned_tester),
                            notes = COALESCE(EXCLUDED.notes, test_instances.notes),
                            updated_at = EXCLUDED.updated_at
                    `, [
                        sessionMapping.default_session_id,
                        requirementId,
                        result.page_id,
                        result.result || 'passed', // Default to passed for manual tests
                        result.tester_id,
                        result.notes,
                        JSON.stringify([{
                            type: 'manual_test_result',
                            wcag_criterion: result.wcag_criterion,
                            migrated_from: 'manual_test_results'
                        }]),
                        'manual',
                        result.tested_at,
                        result.retested_at || result.tested_at,
                        result.retested_at || result.tested_at,
                        result.id,
                        'medium' // Manual tests have medium confidence by default
                    ]);

                    migratedCount++;

                } catch (error) {
                    console.error(`❌ Error migrating manual result ${result.id}:`, error);
                    skippedCount++;
                }
            }

            console.log(`✅ Migrated ${migratedCount} manual test results, skipped ${skippedCount}`);
            
        } catch (error) {
            if (error.code === '42P01') {
                console.log('⚠️  Manual test results table not found, skipping migration');
            } else {
                throw error;
            }
        }
    }

    /**
     * Create historical audit trail for migrated data
     */
    static async createHistoricalAuditTrail() {
        console.log('📝 Creating historical audit trail...');
        
        // Create audit entries for all migrated test instances
        await pool.query(`
            INSERT INTO test_audit_log (
                test_instance_id, user_id, action_type, change_description,
                timestamp, details
            )
            SELECT 
                ti.id,
                ti.assigned_tester,
                'created',
                'Test instance created during data migration from legacy system',
                ti.created_at,
                jsonb_build_object(
                    'migration_source', 
                    CASE 
                        WHEN ti.automated_result_id IS NOT NULL THEN 'automated_test_results'
                        WHEN ti.manual_result_id IS NOT NULL THEN 'manual_test_results'
                        ELSE 'violations'
                    END,
                    'original_id',
                    COALESCE(ti.automated_result_id::text, ti.manual_result_id::text, 'unknown')
                )
            FROM test_instances ti
            WHERE NOT EXISTS (
                SELECT 1 FROM test_audit_log tal 
                WHERE tal.test_instance_id = ti.id AND tal.action_type = 'created'
            )
        `);

        const auditCount = await pool.query(`
            SELECT COUNT(*) FROM test_audit_log 
            WHERE change_description LIKE '%migration%'
        `);

        console.log(`✅ Created ${auditCount.rows[0].count} historical audit entries`);
    }

    /**
     * Update session statistics
     */
    static async updateSessionStatistics() {
        console.log('📊 Updating session statistics...');
        
        // Trigger the update function for all sessions
        await pool.query(`
            UPDATE test_sessions SET updated_at = CURRENT_TIMESTAMP
        `);

        const sessionStats = await pool.query(`
            SELECT COUNT(*) as session_count,
                   SUM(total_tests_count) as total_tests,
                   SUM(completed_tests_count) as completed_tests,
                   ROUND(AVG(completion_percentage), 2) as avg_completion
            FROM test_sessions
        `);

        const stats = sessionStats.rows[0];
        console.log(`✅ Updated ${stats.session_count} sessions`);
        console.log(`   📊 Total tests: ${stats.total_tests}`);
        console.log(`   ✅ Completed tests: ${stats.completed_tests}`);
        console.log(`   📈 Average completion: ${stats.avg_completion}%`);
    }

    /**
     * Validate migration results
     */
    static async validateMigration() {
        console.log('🔍 Validating migration results...');
        
        const validation = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM test_sessions) as sessions_count,
                (SELECT COUNT(*) FROM test_requirements) as requirements_count,
                (SELECT COUNT(*) FROM test_instances) as instances_count,
                (SELECT COUNT(*) FROM test_audit_log) as audit_entries_count,
                (SELECT COUNT(*) FROM test_instances WHERE status = 'passed') as passed_tests,
                (SELECT COUNT(*) FROM test_instances WHERE status = 'failed') as failed_tests
        `);

        const results = validation.rows[0];
        
        console.log('📋 Migration Validation Results:');
        console.log(`   🎯 Test Sessions: ${results.sessions_count}`);
        console.log(`   📚 Test Requirements: ${results.requirements_count}`);
        console.log(`   🧪 Test Instances: ${results.instances_count}`);
        console.log(`   📝 Audit Entries: ${results.audit_entries_count}`);
        console.log(`   ✅ Passed Tests: ${results.passed_tests}`);
        console.log(`   ❌ Failed Tests: ${results.failed_tests}`);

        // Validate minimum requirements
        if (results.requirements_count < 50) {
            throw new Error('Migration validation failed: Not enough test requirements seeded');
        }

        if (results.instances_count === 0) {
            console.log('⚠️  No test instances created - this might be expected if no legacy data exists');
        }

        console.log('✅ Migration validation passed');
    }

    /**
     * Helper: Find matching test requirement for a violation/result
     */
    static async findMatchingRequirement(item) {
        // Try to match by WCAG criterion
        if (item.wcag_criterion) {
            const wcagMatch = await pool.query(`
                SELECT id FROM test_requirements 
                WHERE criterion_number = $1 AND requirement_type = 'wcag'
                LIMIT 1
            `, [item.wcag_criterion]);
            
            if (wcagMatch.rows.length > 0) {
                return wcagMatch.rows[0].id;
            }
        }

        // Try to match by rule ID or test name
        if (item.rule_id || item.test_name) {
            const ruleMatch = await pool.query(`
                SELECT id FROM test_requirements 
                WHERE title ILIKE $1 OR description ILIKE $1
                LIMIT 1
            `, [`%${item.rule_id || item.test_name}%`]);
            
            if (ruleMatch.rows.length > 0) {
                return ruleMatch.rows[0].id;
            }
        }

        // Default to a generic requirement if no match found
        const defaultRequirement = await pool.query(`
            SELECT id FROM test_requirements 
            WHERE criterion_number = '4.1.2' AND requirement_type = 'wcag'
            LIMIT 1
        `);

        return defaultRequirement.rows.length > 0 ? defaultRequirement.rows[0].id : null;
    }

    /**
     * Helper: Extract passes from raw automated test results
     */
    static extractPassesFromRawResults(rawResults) {
        const passes = [];
        
        try {
            const results = typeof rawResults === 'string' ? JSON.parse(rawResults) : rawResults;
            
            // Handle different result formats
            if (results.passes && Array.isArray(results.passes)) {
                passes.push(...results.passes);
            }
            
            if (results.result && results.result.passes && Array.isArray(results.result.passes)) {
                passes.push(...results.result.passes);
            }
            
        } catch (error) {
            console.error('Error parsing raw results:', error);
        }
        
        return passes;
    }

    /**
     * Rollback migration in case of failure
     */
    static async rollbackMigration() {
        console.log('🔄 Rolling back migration...');
        
        try {
            // Drop new tables in reverse order
            const tablesToDrop = [
                'test_audit_log',
                'test_instances', 
                'test_requirements',
                'test_sessions'
            ];

            for (const table of tablesToDrop) {
                try {
                    await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                    console.log(`  ✅ Dropped ${table}`);
                } catch (error) {
                    console.error(`  ❌ Error dropping ${table}:`, error.message);
                }
            }

            console.log('✅ Rollback completed');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error);
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    UnifiedArchitectureMigration.runMigration()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = UnifiedArchitectureMigration; 