const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function analyzeMissingTools() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Analyzing missing tools and comprehensive tool coverage...\n');
        
        // Get all requirements with their tool mappings
        const query = `
            SELECT 
                requirement_id as criterion,
                title,
                level,
                test_method,
                tool_mappings
            FROM unified_requirements 
            WHERE standard_type = 'wcag'
            ORDER BY requirement_id
        `;
        
        const result = await client.query(query);
        
        // Analyze tool coverage
        const toolCoverage = {
            'pa11y': [],
            'axe_core': [],
            'lighthouse': [],
            'contrast-analyzer': [],
            'playwright': [],
            'wave': [] // This will be empty if WAVE is missing
        };
        
        const automatedToolsCoverage = {
            'pa11y': [],
            'lighthouse': [],
            'contrast-analyzer': [],
            'playwright': [],
            'axe-core': []
        };
        
        result.rows.forEach(row => {
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    // Check top-level tool keys
                    Object.keys(toolMappings).forEach(tool => {
                        if (tool !== 'manual' && toolCoverage[tool]) {
                            toolCoverage[tool].push({
                                criterion: row.criterion,
                                title: row.title,
                                level: row.level
                            });
                        }
                    });
                    
                    // Check automated_tools arrays
                    if (toolMappings.automated_tools && Array.isArray(toolMappings.automated_tools)) {
                        toolMappings.automated_tools.forEach(tool => {
                            if (automatedToolsCoverage[tool]) {
                                automatedToolsCoverage[tool].push({
                                    criterion: row.criterion,
                                    title: row.title,
                                    level: row.level
                                });
                            }
                        });
                    }
                } catch (e) {
                    // Skip parsing errors
                }
            }
        });
        
        console.log('📊 Tool Coverage Analysis:');
        console.log('==========================');
        
        console.log('\n🔧 Top-level Tool Keys:');
        Object.keys(toolCoverage).forEach(tool => {
            console.log(`\n${tool.toUpperCase()} (${toolCoverage[tool].length} requirements):`);
            if (toolCoverage[tool].length > 0) {
                toolCoverage[tool].forEach(req => {
                    console.log(`  - ${req.criterion}: ${req.title} (${req.level})`);
                });
            } else {
                console.log('  No requirements found');
            }
        });
        
        console.log('\n🔧 Automated Tools Arrays:');
        Object.keys(automatedToolsCoverage).forEach(tool => {
            console.log(`\n${tool.toUpperCase()} (${automatedToolsCoverage[tool].length} requirements):`);
            if (automatedToolsCoverage[tool].length > 0) {
                automatedToolsCoverage[tool].forEach(req => {
                    console.log(`  - ${req.criterion}: ${req.title} (${req.level})`);
                });
            } else {
                console.log('  No requirements found');
            }
        });
        
        // Check for WAVE specifically
        console.log('\n🔍 WAVE Tool Analysis:');
        console.log('=====================');
        
        const waveQuery = `
            SELECT 
                requirement_id,
                title,
                level,
                tool_mappings
            FROM unified_requirements 
            WHERE standard_type = 'wcag'
            AND (
                tool_mappings::text ILIKE '%wave%' 
                OR tool_mappings::text ILIKE '%Wave%' 
                OR tool_mappings::text ILIKE '%WAVE%'
                OR tool_mappings::text ILIKE '%webaim%'
            )
        `;
        
        const waveResult = await client.query(waveQuery);
        
        if (waveResult.rows.length > 0) {
            console.log(`Found ${waveResult.rows.length} requirements with WAVE references:`);
            waveResult.rows.forEach(row => {
                console.log(`  - ${row.requirement_id}: ${row.title}`);
                console.log(`    Tool mappings: ${JSON.stringify(row.tool_mappings, null, 2)}`);
            });
        } else {
            console.log('❌ No WAVE references found in the database');
        }
        
        // Check what tools should be there based on common accessibility testing
        console.log('\n📋 Expected Tools vs Actual Tools:');
        console.log('===================================');
        
        const expectedTools = ['pa11y', 'axe-core', 'lighthouse', 'contrast-analyzer', 'wave', 'playwright'];
        const actualTopLevelTools = Object.keys(toolCoverage).filter(tool => toolCoverage[tool].length > 0);
        const actualAutomatedTools = Object.keys(automatedToolsCoverage).filter(tool => automatedToolsCoverage[tool].length > 0);
        
        console.log('\nExpected Tools:');
        expectedTools.forEach(tool => console.log(`  - ${tool}`));
        
        console.log('\nActual Top-level Tools:');
        actualTopLevelTools.forEach(tool => console.log(`  - ${tool}`));
        
        console.log('\nActual Automated Tools:');
        actualAutomatedTools.forEach(tool => console.log(`  - ${tool}`));
        
        console.log('\nMissing Tools:');
        const missingTools = expectedTools.filter(tool => 
            !actualTopLevelTools.includes(tool) && !actualAutomatedTools.includes(tool)
        );
        missingTools.forEach(tool => console.log(`  - ${tool}`));
        
        // Show requirements that should have WAVE
        console.log('\n🔍 Requirements that typically use WAVE:');
        console.log('========================================');
        
        const typicalWaveRequirements = ['1.1.1', '1.3.1', '1.4.3', '2.1.1', '2.4.1', '2.4.2', '3.1.1', '4.1.1'];
        
        typicalWaveRequirements.forEach(criterion => {
            const req = result.rows.find(r => r.criterion === criterion);
            if (req) {
                console.log(`\n${criterion}: ${req.title}`);
                console.log(`  Current tools: ${JSON.stringify(req.tool_mappings, null, 2)}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

analyzeMissingTools(); 