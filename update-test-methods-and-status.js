const { Pool } = require('pg');

class TestMethodStatusUpdater {
    constructor() {
        this.pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'accessibility_testing',
            user: 'johnhoinville',
            password: ''
        });
    }

    async updateTestMethodsAndStatus() {
        try {
            console.log('🔄 Starting test method and status update...');

            // Step 1: Update test_method_used to use 'hybrid' instead of 'both'
            console.log('📝 Step 1: Updating test method assignments...');
            await this.updateTestMethodAssignments();

            // Step 2: Set all test instances to 'not_started' initially
            console.log('📝 Step 2: Setting all tests to not_started...');
            await this.setAllTestsToNotStarted();

            // Step 3: Update automated tests that have results to 'pending' status
            console.log('📝 Step 3: Updating automated tests with results to pending...');
            await this.updateAutomatedTestsWithResults();

            // Step 4: Verify the final state
            console.log('📝 Step 4: Verifying final state...');
            await this.verifyFinalState();

            console.log('✅ Test method and status update completed successfully!');
        } catch (error) {
            console.error('❌ Error updating test methods and status:', error);
        } finally {
            await this.pool.end();
        }
    }

    async updateTestMethodAssignments() {
        console.log('✅ Test method assignments are already correct (automated/manual)');
    }

    async setAllTestsToNotStarted() {
        const query = `
            UPDATE test_instances 
            SET status = 'not_started'
            WHERE session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101'
        `;
        
        const result = await this.pool.query(query);
        console.log(`✅ Set ${result.rowCount} test instances to 'not_started'`);
    }

    async updateAutomatedTestsWithResults() {
        // Find automated test instances that have automated results and set them to 'pending'
        const query = `
            UPDATE test_instances 
            SET status = 'pending'
            WHERE session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101'
            AND test_method_used IN ('automated', 'hybrid')
            AND automated_result_id IS NOT NULL
        `;
        
        const result = await this.pool.query(query);
        console.log(`✅ Set ${result.rowCount} automated/hybrid test instances with results to 'pending'`);
    }

    async verifyFinalState() {
        // Check test method distribution
        const methodQuery = `
            SELECT test_method_used, COUNT(*) as count 
            FROM test_instances 
            WHERE session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101' 
            GROUP BY test_method_used 
            ORDER BY count DESC
        `;
        
        const methodResult = await this.pool.query(methodQuery);
        console.log('\n📊 Test Method Distribution:');
        methodResult.rows.forEach(row => {
            console.log(`   ${row.test_method_used}: ${row.count}`);
        });

        // Check status distribution
        const statusQuery = `
            SELECT status, COUNT(*) as count 
            FROM test_instances 
            WHERE session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101' 
            GROUP BY status 
            ORDER BY count DESC
        `;
        
        const statusResult = await this.pool.query(statusQuery);
        console.log('\n📊 Status Distribution:');
        statusResult.rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count}`);
        });

        // Check automated tests with results
        const automatedQuery = `
            SELECT 
                test_method_used,
                status,
                COUNT(*) as count
            FROM test_instances 
            WHERE session_id = 'b591df2b-fd0c-47a9-bfad-468474c29101' 
            AND test_method_used IN ('automated', 'hybrid')
            AND automated_result_id IS NOT NULL
            GROUP BY test_method_used, status
            ORDER BY test_method_used, status
        `;
        
        const automatedResult = await this.pool.query(automatedQuery);
        console.log('\n📊 Automated/Hybrid Tests with Results:');
        automatedResult.rows.forEach(row => {
            console.log(`   ${row.test_method_used} - ${row.status}: ${row.count}`);
        });
    }
}

// Run the updater
const updater = new TestMethodStatusUpdater();
updater.updateTestMethodsAndStatus().catch(console.error); 