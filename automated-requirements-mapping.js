const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function mapAutomatedRequirements() {
    const client = await pool.connect();
    
    try {
        console.log('🤖 Mapping all automated requirements with their automation tools...\n');
        
        // Get all requirements that have automation (automated or both)
        const query = `
            SELECT 
                requirement_id as criterion,
                title,
                level,
                test_method,
                tool_mappings
            FROM unified_requirements 
            WHERE standard_type = 'wcag' 
            AND (test_method = 'automated' OR test_method = 'both')
            ORDER BY requirement_id
        `;
        
        const result = await client.query(query);
        
        console.log('| Criterion | Title | Level | Test Method | Automation Tools | Rules |');
        console.log('|-----------|-------|-------|-------------|------------------|-------|');
        
        result.rows.forEach(row => {
            const criterion = row.criterion.padEnd(8);
            const title = (row.title.length > 30 ? row.title.substring(0, 27) + '...' : row.title).padEnd(33);
            const level = row.level.padEnd(5);
            const testMethod = row.test_method.padEnd(11);
            
            let tools = 'None';
            let rules = 'None';
            
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    if (toolMappings && Object.keys(toolMappings).length > 0) {
                        const toolNames = Object.keys(toolMappings).filter(key => key !== 'manual');
                        tools = toolNames.length > 0 ? toolNames.join(', ') : 'None';
                        
                        // Extract rules from tool mappings
                        const allRules = [];
                        Object.keys(toolMappings).forEach(tool => {
                            if (tool !== 'manual' && toolMappings[tool].rules) {
                                allRules.push(...toolMappings[tool].rules);
                            }
                        });
                        rules = allRules.length > 0 ? allRules.join(', ') : 'None';
                    }
                } catch (e) {
                    tools = 'Error parsing';
                    rules = 'Error parsing';
                }
            }
            
            const toolsDisplay = (tools.length > 16 ? tools.substring(0, 13) + '...' : tools).padEnd(18);
            const rulesDisplay = (rules.length > 20 ? rules.substring(0, 17) + '...' : rules).padEnd(21);
            
            console.log(`| ${criterion} | ${title} | ${level} | ${testMethod} | ${toolsDisplay} | ${rulesDisplay} |`);
        });
        
        // Summary by automation tool
        console.log('\n📊 Summary by Automation Tool:');
        const toolSummary = {};
        
        result.rows.forEach(row => {
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    Object.keys(toolMappings).forEach(tool => {
                        if (tool !== 'manual') {
                            if (!toolSummary[tool]) {
                                toolSummary[tool] = [];
                            }
                            toolSummary[tool].push(row.criterion);
                        }
                    });
                } catch (e) {
                    // Skip parsing errors
                }
            }
        });
        
        Object.keys(toolSummary).forEach(tool => {
            console.log(`\n🔧 ${tool.toUpperCase()}:`);
            console.log(`   Requirements: ${toolSummary[tool].join(', ')}`);
            console.log(`   Count: ${toolSummary[tool].length}`);
        });
        
        // Detailed breakdown for each tool
        console.log('\n🔍 Detailed Automation Breakdown:');
        
        Object.keys(toolSummary).forEach(tool => {
            console.log(`\n🤖 ${tool.toUpperCase()} AUTOMATION:`);
            console.log('| Criterion | Title | Rules |');
            console.log('|-----------|-------|-------|');
            
            result.rows.forEach(row => {
                if (row.tool_mappings) {
                    try {
                        const toolMappings = typeof row.tool_mappings === 'string' 
                            ? JSON.parse(row.tool_mappings) 
                            : row.tool_mappings;
                        
                        if (toolMappings[tool] && toolMappings[tool].rules) {
                            const criterion = row.criterion.padEnd(8);
                            const title = (row.title.length > 30 ? row.title.substring(0, 27) + '...' : row.title).padEnd(33);
                            const rules = toolMappings[tool].rules.join(', ');
                            const rulesDisplay = (rules.length > 20 ? rules.substring(0, 17) + '...' : rules).padEnd(21);
                            
                            console.log(`| ${criterion} | ${title} | ${rulesDisplay} |`);
                        }
                    } catch (e) {
                        // Skip parsing errors
                    }
                }
            });
        });
        
        // Manual-only requirements for comparison
        const manualQuery = `
            SELECT 
                requirement_id as criterion,
                title,
                level,
                test_method
            FROM unified_requirements 
            WHERE standard_type = 'wcag' 
            AND test_method = 'manual'
            ORDER BY requirement_id
        `;
        
        const manualResult = await client.query(manualQuery);
        
        console.log('\n📝 MANUAL-ONLY REQUIREMENTS (for comparison):');
        console.log('| Criterion | Title | Level |');
        console.log('|-----------|-------|-------|');
        
        manualResult.rows.forEach(row => {
            const criterion = row.criterion.padEnd(8);
            const title = (row.title.length > 40 ? row.title.substring(0, 37) + '...' : row.title).padEnd(43);
            const level = row.level.padEnd(5);
            console.log(`| ${criterion} | ${title} | ${level} |`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

mapAutomatedRequirements(); 