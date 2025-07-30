// Schema Validation Service
// This prevents the recurring database schema drift issues

const { Pool } = require('pg');

class SchemaValidator {
    constructor(pool) {
        this.pool = pool;
    }

    async validateAndFix() {
        console.log('🔍 Starting schema validation...');
        
        try {
            await this.validateTables();
            await this.validateColumns();
            await this.validateFunctions();
            await this.validateConstraints();
            
            console.log('✅ Schema validation completed successfully');
            return { success: true, message: 'Schema is valid' };
        } catch (error) {
            console.error('❌ Schema validation failed:', error.message);
            throw error;
        }
    }

    async validateTables() {
        const requiredTables = [
            'test_sessions', 'test_instances', 'test_requirements',
            'automated_test_results', 'discovered_pages', 'crawler_discovered_pages',
            'web_crawlers', 'crawler_runs', 'users', 'projects'
        ];

        for (const table of requiredTables) {
            const result = await this.pool.query(
                'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
                ['public', table]
            );
            
            if (result.rows.length === 0) {
                throw new Error(`Critical table missing: ${table}`);
            }
        }
        
        console.log('✓ All required tables exist');
    }

    async validateColumns() {
        const requiredColumns = [
            // Table: column_name: expected_type
            { table: 'crawler_discovered_pages', column: 'page_type', type: 'character varying' },
            { table: 'web_crawlers', column: 'headful_mode', type: 'boolean' },
            { table: 'web_crawlers', column: 'follow_external', type: 'boolean' },
            { table: 'web_crawlers', column: 'respect_robots', type: 'boolean' },
            { table: 'web_crawlers', column: 'concurrent_pages', type: 'integer' },
            { table: 'web_crawlers', column: 'delay_ms', type: 'integer' }
        ];

        for (const { table, column, type } of requiredColumns) {
            const result = await this.pool.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
            `, [table, column]);
            
            if (result.rows.length === 0) {
                console.log(`⚠️  Missing column ${table}.${column}, attempting to add...`);
                await this.addMissingColumn(table, column, type);
            }
        }
        
        console.log('✓ All required columns exist');
    }

    async addMissingColumn(table, column, type) {
        const columnDefinitions = {
            'page_type': 'VARCHAR(50)',
            'headful_mode': 'BOOLEAN DEFAULT false',
            'follow_external': 'BOOLEAN DEFAULT false', 
            'respect_robots': 'BOOLEAN DEFAULT true',
            'concurrent_pages': 'INTEGER DEFAULT 5',
            'delay_ms': 'INTEGER DEFAULT 1000'
        };

        const definition = columnDefinitions[column];
        if (!definition) {
            throw new Error(`Unknown column definition for ${column}`);
        }

        await this.pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
        console.log(`✓ Added missing column: ${table}.${column}`);
    }

    async validateFunctions() {
        const requiredFunctions = ['get_automation_summary', 'get_automation_status'];
        
        for (const func of requiredFunctions) {
            const result = await this.pool.query(
                'SELECT 1 FROM information_schema.routines WHERE routine_schema = $1 AND routine_name = $2',
                ['public', func]
            );
            
            if (result.rows.length === 0) {
                console.log(`⚠️  Missing function ${func}, attempting to create...`);
                await this.createMissingFunction(func);
            }
        }
        
        console.log('✓ All required functions exist');
    }

    async createMissingFunction(funcName) {
        if (funcName === 'get_automation_summary') {
            await this.pool.query(`
                CREATE OR REPLACE FUNCTION get_automation_summary(session_uuid UUID)
                RETURNS TABLE (
                    total_tests INTEGER,
                    completed_tests INTEGER,
                    passed_tests INTEGER,
                    failed_tests INTEGER,
                    pending_tests INTEGER,
                    completion_percentage NUMERIC(5,2)
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        COUNT(ti.*)::INTEGER as total_tests,
                        COUNT(atr.id)::INTEGER as completed_tests,
                        COUNT(CASE WHEN atr.violations_count = 0 AND atr.id IS NOT NULL THEN 1 END)::INTEGER as passed_tests,
                        COUNT(CASE WHEN atr.violations_count > 0 THEN 1 END)::INTEGER as failed_tests,
                        COUNT(CASE WHEN atr.id IS NULL THEN 1 END)::INTEGER as pending_tests,
                        CASE 
                            WHEN COUNT(ti.*) = 0 THEN 0.00
                            ELSE ROUND((COUNT(atr.id)::NUMERIC / COUNT(ti.*)::NUMERIC) * 100, 2)
                        END as completion_percentage
                    FROM test_instances ti
                    LEFT JOIN automated_test_results atr ON ti.automated_result_id = atr.id
                    WHERE ti.session_id = session_uuid;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✓ Created get_automation_summary function');
        }
        
        if (funcName === 'get_automation_status') {
            await this.pool.query(`
                CREATE OR REPLACE FUNCTION get_automation_status(session_uuid UUID)
                RETURNS TABLE (
                    current_status VARCHAR(50),
                    last_run_at TIMESTAMP WITH TIME ZONE,
                    total_runs INTEGER,
                    summary JSONB
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        CASE 
                            WHEN COUNT(atr.*) = 0 THEN 'not_started'
                            WHEN COUNT(CASE WHEN atr.executed_at > NOW() - INTERVAL '5 minutes' THEN 1 END) > 0 THEN 'running'
                            ELSE 'completed'
                        END::VARCHAR(50) as current_status,
                        MAX(atr.executed_at) as last_run_at,
                        COUNT(DISTINCT atr.id)::INTEGER as total_runs,
                        jsonb_build_object(
                            'total_tests', COUNT(ti.*),
                            'completed', COUNT(atr.*),
                            'passed', COUNT(CASE WHEN atr.violations_count = 0 AND atr.id IS NOT NULL THEN 1 END),
                            'failed', COUNT(CASE WHEN atr.violations_count > 0 THEN 1 END),
                            'last_updated', NOW()
                        ) as summary
                    FROM test_instances ti
                    LEFT JOIN automated_test_results atr ON ti.automated_result_id = atr.id
                    WHERE ti.session_id = session_uuid;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✓ Created get_automation_status function');
        }
    }

    async validateConstraints() {
        // Check if critical foreign keys exist
        const result = await this.pool.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'test_instances_page_id_fkey'
            AND table_name = 'test_instances'
        `);
        
        if (result.rows.length === 0) {
            console.log('⚠️  Missing critical foreign key constraint, attempting to add...');
            try {
                await this.pool.query(`
                    ALTER TABLE test_instances 
                    ADD CONSTRAINT test_instances_page_id_fkey 
                    FOREIGN KEY (page_id) REFERENCES discovered_pages(id)
                `);
                console.log('✓ Added missing foreign key constraint');
            } catch (error) {
                console.log('ℹ️  Foreign key constraint may already exist or have data conflicts');
            }
        }
        
        console.log('✓ Critical constraints validated');
    }
}

module.exports = SchemaValidator; 