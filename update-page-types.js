const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'accessibility_testing',
    user: 'postgres',
    password: 'postgres'
});

async function updatePageTypes() {
    const client = await pool.connect();

    try {
        console.log('🔄 Updating page types based on URL patterns...');
        
        const projectId = '73e05c7d-6f2c-4c0c-b385-3030224c0de4';

        // Update page types based on URL patterns
        const updateQuery = `
            UPDATE discovered_pages 
            SET page_type = CASE 
                WHEN url LIKE '%/login%' OR url LIKE '%/register%' OR url LIKE '%/new%' OR url LIKE '%/join%' THEN 'form'
                WHEN url LIKE '%/admin_dashboard%' OR url LIKE '%/dashboard%' OR url LIKE '%/certs/%' OR url LIKE '%/service_orders/%' OR url LIKE '%/entity_attribute_types%' OR url LIKE '%/metadata_health%' OR url LIKE '%/jobs%' OR url LIKE '%/users%' OR url LIKE '%/organizations/index_with_providers%' THEN 'application'
                WHEN url = (SELECT primary_url FROM site_discovery WHERE project_id = $1::uuid LIMIT 1) THEN 'homepage'
                ELSE 'content'
            END
            WHERE discovery_id IN (
                SELECT id FROM site_discovery WHERE project_id = $1::uuid
            )
        `;

        const result = await client.query(updateQuery, [projectId]);
        console.log(`✅ Updated ${result.rowCount} pages`);

        // Show the updated distribution
        const distributionQuery = `
            SELECT page_type, COUNT(*) as count 
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1::uuid
            GROUP BY page_type
            ORDER BY count DESC
        `;

        const distribution = await client.query(distributionQuery, [projectId]);
        console.log('\n📊 Updated page type distribution:');
        distribution.rows.forEach(row => {
            console.log(`  ${row.page_type}: ${row.count} pages`);
        });

        // Show some examples of each type
        const examplesQuery = `
            SELECT page_type, url 
            FROM discovered_pages dp
            JOIN site_discovery sd ON dp.discovery_id = sd.id
            WHERE sd.project_id = $1::uuid
            ORDER BY page_type, url
            LIMIT 20
        `;

        const examples = await client.query(examplesQuery, [projectId]);
        console.log('\n📄 Examples of updated page types:');
        examples.rows.forEach(row => {
            console.log(`  ${row.page_type}: ${row.url}`);
        });

    } catch (error) {
        console.error('❌ Error updating page types:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the update
updatePageTypes()
    .then(() => {
        console.log('🎉 Page type update completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Page type update failed:', error);
        process.exit(1);
    }); 