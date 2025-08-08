const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'accessibility_testing',
    user: 'postgres',
    password: 'postgres'
});

async function implementSmartRequirementAssignment() {
    const client = await pool.connect();

    try {
        console.log('🚀 Implementing Smart Requirement Assignment...');
        
        const sessionId = 'b591df2b-fd0c-47a9-bfad-468474c29101';
        const projectId = '73e05c7d-6f2c-4c0c-b385-3030224c0de4';

        // Step 1: Synchronize page data from crawler to discovered_pages
        console.log('\n📄 Step 1: Synchronizing page data...');
        
        const syncPagesQuery = `
            INSERT INTO discovered_pages (discovery_id, url, title, page_type)
            SELECT
                (SELECT id FROM site_discovery WHERE project_id = $1::uuid LIMIT 1),
                cdp.url,
                cdp.title,
                CASE 
                    WHEN cdp.url LIKE '%form%' OR cdp.url LIKE '%login%' OR cdp.url LIKE '%register%' THEN 'form'
                    WHEN cdp.url LIKE '%app%' OR cdp.url LIKE '%dashboard%' OR cdp.url LIKE '%admin%' THEN 'application'
                    WHEN cdp.url = (SELECT primary_url FROM site_discovery WHERE project_id = $1::uuid LIMIT 1) THEN 'homepage'
                    ELSE 'content'
                END as page_type
            FROM crawler_discovered_pages cdp
            WHERE cdp.selected_for_testing = true
            AND NOT EXISTS (
                SELECT 1 FROM discovered_pages dp WHERE dp.url = cdp.url
            )
        `;

        const syncResult = await client.query(syncPagesQuery, [projectId]);
        console.log(`✅ Synchronized ${syncResult.rowCount} new pages from crawler`);

        // Step 2: Delete existing test instances to start fresh
        console.log('\n🗑️ Step 2: Cleaning existing test instances...');
        
        const deleteTestInstancesQuery = `
            DELETE FROM test_instances 
            WHERE session_id = $1::uuid
        `;

        await client.query(deleteTestInstancesQuery, [sessionId]);
        console.log('✅ Deleted existing test instances');

        // Step 3: Get current page count and types
        console.log('\n📊 Step 3: Analyzing page types...');
        
        const pageTypesQuery = `
            SELECT page_type, COUNT(*) as count 
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1::uuid
            GROUP BY page_type
            ORDER BY count DESC
        `;

        const pageTypes = await client.query(pageTypesQuery, [projectId]);
        console.log('📄 Current page types:');
        pageTypes.rows.forEach(row => {
            console.log(`  ${row.page_type}: ${row.count} pages`);
        });

        // Step 4: Create smart test instances based on page types
        console.log('\n🎯 Step 4: Creating smart test instances...');

        // Get all requirements with their page type restrictions
        const requirementsQuery = `
            SELECT 
                ur.id as requirement_id,
                ur.requirement_id as requirement_code,
                ur.title,
                ur.test_method,
                ur.applies_to_page_types
            FROM unified_requirements ur
            ORDER BY ur.requirement_id
        `;

        const requirements = await client.query(requirementsQuery);
        console.log(`📋 Found ${requirements.rows.length} requirements`);

        // Get all pages for this session
        const pagesQuery = `
            SELECT dp.id, dp.url, dp.page_type
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1::uuid
            ORDER BY dp.url
        `;

        const pages = await client.query(pagesQuery, [projectId]);
        console.log(`🌐 Found ${pages.rows.length} pages to test`);

        let totalTestInstances = 0;
        let automatedCount = 0;
        let manualCount = 0;
        let hybridCount = 0;

        // Create test instances for each page-requirement combination
        for (const page of pages.rows) {
            for (const requirement of requirements.rows) {
                // Check if requirement applies to this page type
                const appliesToPage = requirement.applies_to_page_types.includes('all') ||
                    requirement.applies_to_page_types.includes(page.page_type);

                if (!appliesToPage) {
                    console.log(`⏭️ Skipping ${requirement.requirement_code} for ${page.page_type} page: ${page.url}`);
                    continue;
                }

                // Handle different test methods
                if (requirement.test_method === 'both') {
                    // Create both automated AND manual test instances
                    const automatedInstance = {
                        session_id: sessionId,
                        requirement_id: requirement.requirement_id,
                        page_id: page.id,
                        test_method_used: 'automated',
                        status: 'not_started',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    const manualInstance = {
                        session_id: sessionId,
                        requirement_id: requirement.requirement_id,
                        page_id: page.id,
                        test_method_used: 'manual',
                        status: 'not_started',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    // Insert automated instance
                    const automatedInsertQuery = `
                        INSERT INTO test_instances 
                        (session_id, requirement_id, page_id, test_method_used, status, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
                    `;

                    await client.query(automatedInsertQuery, [
                        automatedInstance.session_id,
                        automatedInstance.requirement_id,
                        automatedInstance.page_id,
                        automatedInstance.test_method_used,
                        automatedInstance.status,
                        automatedInstance.created_at,
                        automatedInstance.updated_at
                    ]);

                    // Insert manual instance
                    const manualInsertQuery = `
                        INSERT INTO test_instances 
                        (session_id, requirement_id, page_id, test_method_used, status, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
                    `;

                    await client.query(manualInsertQuery, [
                        manualInstance.session_id,
                        manualInstance.requirement_id,
                        manualInstance.page_id,
                        manualInstance.test_method_used,
                        manualInstance.status,
                        manualInstance.created_at,
                        manualInstance.updated_at
                    ]);

                    totalTestInstances += 2;
                    automatedCount++;
                    manualCount++;
                    hybridCount++;

                } else if (requirement.test_method === 'automated') {
                    // Create only automated test instance
                    const automatedInstance = {
                        session_id: sessionId,
                        requirement_id: requirement.requirement_id,
                        page_id: page.id,
                        test_method_used: 'automated',
                        status: 'not_started',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    const insertQuery = `
                        INSERT INTO test_instances 
                        (session_id, requirement_id, page_id, test_method_used, status, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
                    `;

                    await client.query(insertQuery, [
                        automatedInstance.session_id,
                        automatedInstance.requirement_id,
                        automatedInstance.page_id,
                        automatedInstance.test_method_used,
                        automatedInstance.status,
                        automatedInstance.created_at,
                        automatedInstance.updated_at
                    ]);

                    totalTestInstances++;
                    automatedCount++;

                } else if (requirement.test_method === 'manual') {
                    // Create only manual test instance
                    const manualInstance = {
                        session_id: sessionId,
                        requirement_id: requirement.requirement_id,
                        page_id: page.id,
                        test_method_used: 'manual',
                        status: 'not_started',
                        created_at: new Date(),
                        updated_at: new Date()
                    };

                    const insertQuery = `
                        INSERT INTO test_instances 
                        (session_id, requirement_id, page_id, test_method_used, status, created_at, updated_at)
                        VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
                    `;

                    await client.query(insertQuery, [
                        manualInstance.session_id,
                        manualInstance.requirement_id,
                        manualInstance.page_id,
                        manualInstance.test_method_used,
                        manualInstance.status,
                        manualInstance.created_at,
                        manualInstance.updated_at
                    ]);

                    totalTestInstances++;
                    manualCount++;
                }
            }
        }

        console.log(`✅ Created ${totalTestInstances} test instances:`);
        console.log(`  📊 Automated: ${automatedCount}`);
        console.log(`  📝 Manual: ${manualCount}`);
        console.log(`  🔄 Hybrid (both): ${hybridCount}`);

        // Step 5: Create automated_test_results entries for pending tests
        console.log('\n🤖 Step 5: Creating automated test results entries...');

        const createAutomatedResultsQuery = `
            INSERT INTO automated_test_results 
            (test_session_id, page_id, tool_name, status, started_at)
            SELECT 
                ti.session_id,
                ti.page_id,
                tool.tool_name,
                'pending',
                NOW()
            FROM test_instances ti
            CROSS JOIN (
                SELECT 'axe-core' as tool_name
                UNION SELECT 'pa11y'
                UNION SELECT 'lighthouse'
            ) tool
            WHERE ti.session_id = $1::uuid
            AND ti.test_method_used = 'automated'
            AND ti.status = 'not_started'
            AND NOT EXISTS (
                SELECT 1 FROM automated_test_results atr
                WHERE atr.test_session_id = ti.session_id
                AND atr.page_id = ti.page_id
                AND atr.tool_name = tool.tool_name
            )
        `;

        const automatedResultsResult = await client.query(createAutomatedResultsQuery, [sessionId]);
        console.log(`✅ Created ${automatedResultsResult.rowCount} automated test results entries`);

        // Step 6: Show final statistics
        console.log('\n📊 Step 6: Final statistics...');

        const finalStatsQuery = `
            SELECT 
                ti.test_method_used,
                ti.status,
                COUNT(*) as count
            FROM test_instances ti
            WHERE ti.session_id = $1::uuid
            GROUP BY ti.test_method_used, ti.status
            ORDER BY ti.test_method_used, ti.status
        `;

        const finalStats = await client.query(finalStatsQuery, [sessionId]);
        console.log('📈 Final test instance breakdown:');
        finalStats.rows.forEach(row => {
            console.log(`  ${row.test_method_used} - ${row.status}: ${row.count}`);
        });

        // Show page type distribution
        const pageTypeStatsQuery = `
            SELECT 
                dp.page_type,
                COUNT(DISTINCT ti.page_id) as pages_tested,
                COUNT(ti.id) as total_tests
            FROM test_instances ti
            JOIN discovered_pages dp ON ti.page_id = dp.id
            WHERE ti.session_id = $1::uuid
            GROUP BY dp.page_type
            ORDER BY dp.page_type
        `;

        const pageTypeStats = await client.query(pageTypeStatsQuery, [sessionId]);
        console.log('\n📄 Test distribution by page type:');
        pageTypeStats.rows.forEach(row => {
            console.log(`  ${row.page_type}: ${row.pages_tested} pages, ${row.total_tests} tests`);
        });

        console.log('\n🎉 Smart requirement assignment implementation completed!');
        console.log('\n📋 Summary of improvements:');
        console.log('  ✅ Synchronized pages from crawler to discovered_pages');
        console.log('  ✅ Implemented smart requirement assignment based on page types');
        console.log('  ✅ Fixed test method mapping (created both automated AND manual for "both" requirements)');
        console.log('  ✅ Created proper automated_test_results entries');
        console.log('  ✅ Reduced irrelevant test instances by filtering by page type');

    } catch (error) {
        console.error('❌ Error implementing smart requirement assignment:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the implementation
implementSmartRequirementAssignment()
    .then(() => {
        console.log('🎉 Smart requirement assignment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Smart requirement assignment failed:', error);
        process.exit(1);
    }); 