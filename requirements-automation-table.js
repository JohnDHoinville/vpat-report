const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function createRequirementsAutomationTable() {
    const client = await pool.connect();
    
    try {
        console.log('📋 Creating comprehensive requirements automation table...\n');
        
        // Get all WCAG requirements with their tool mappings
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
        
        console.log('| Criterion | Title | Level | Test Method | Automated Tools | Specific Rules |');
        console.log('|-----------|-------|-------|-------------|-----------------|----------------|');
        
        result.rows.forEach(row => {
            const criterion = row.criterion.padEnd(8);
            const title = (row.title.length > 25 ? row.title.substring(0, 22) + '...' : row.title).padEnd(28);
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
                        // Extract tool names (excluding manual)
                        const toolNames = Object.keys(toolMappings).filter(key => key !== 'manual');
                        tools = toolNames.length > 0 ? toolNames.join(', ') : 'None';
                        
                        // Extract specific rules for each tool
                        const allRules = [];
                        Object.keys(toolMappings).forEach(tool => {
                            if (tool !== 'manual' && toolMappings[tool].rules) {
                                const toolRules = toolMappings[tool].rules.map(rule => `${tool}:${rule}`).join(', ');
                                allRules.push(toolRules);
                            }
                        });
                        rules = allRules.length > 0 ? allRules.join('; ') : 'None';
                    }
                } catch (e) {
                    tools = 'Error parsing';
                    rules = 'Error parsing';
                }
            }
            
            const toolsDisplay = (tools.length > 14 ? tools.substring(0, 11) + '...' : tools).padEnd(16);
            const rulesDisplay = (rules.length > 18 ? rules.substring(0, 15) + '...' : rules).padEnd(19);
            
            console.log(`| ${criterion} | ${title} | ${level} | ${testMethod} | ${toolsDisplay} | ${rulesDisplay} |`);
        });
        
        // Summary by automation capability
        console.log('\n📊 Summary by Automation Capability:');
        
        const automationSummary = {
            automated: [],
            both: [],
            manual: []
        };
        
        result.rows.forEach(row => {
            automationSummary[row.test_method].push(row.criterion);
        });
        
        console.log(`\n🤖 Fully Automated (${automationSummary.automated.length}):`);
        console.log(`   ${automationSummary.automated.join(', ')}`);
        
        console.log(`\n🔀 Hybrid - Automated + Manual (${automationSummary.both.length}):`);
        console.log(`   ${automationSummary.both.join(', ')}`);
        
        console.log(`\n👤 Manual Only (${automationSummary.manual.length}):`);
        console.log(`   ${automationSummary.manual.join(', ')}`);
        
        // Detailed tool breakdown
        console.log('\n🔧 Detailed Tool Coverage:');
        
        const toolCoverage = {};
        
        result.rows.forEach(row => {
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    Object.keys(toolMappings).forEach(tool => {
                        if (tool !== 'manual') {
                            if (!toolCoverage[tool]) {
                                toolCoverage[tool] = [];
                            }
                            toolCoverage[tool].push({
                                criterion: row.criterion,
                                title: row.title,
                                level: row.level,
                                rules: toolMappings[tool].rules || []
                            });
                        }
                    });
                } catch (e) {
                    // Skip parsing errors
                }
            }
        });
        
        Object.keys(toolCoverage).forEach(tool => {
            console.log(`\n🔧 ${tool.toUpperCase()} (${toolCoverage[tool].length} requirements):`);
            console.log('| Criterion | Title | Level | Rules |');
            console.log('|-----------|-------|-------|-------|');
            
            toolCoverage[tool].forEach(req => {
                const criterion = req.criterion.padEnd(8);
                const title = (req.title.length > 25 ? req.title.substring(0, 22) + '...' : req.title).padEnd(28);
                const level = req.level.padEnd(5);
                const rules = req.rules.join(', ');
                const rulesDisplay = (rules.length > 15 ? rules.substring(0, 12) + '...' : rules).padEnd(16);
                
                console.log(`| ${criterion} | ${title} | ${level} | ${rulesDisplay} |`);
            });
        });
        
        // Automation confidence levels
        console.log('\n📈 Automation Confidence Levels:');
        
        const confidenceLevels = {};
        
        result.rows.forEach(row => {
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    Object.keys(toolMappings).forEach(tool => {
                        if (tool !== 'manual' && toolMappings[tool].automation_confidence) {
                            const confidence = toolMappings[tool].automation_confidence;
                            if (!confidenceLevels[confidence]) {
                                confidenceLevels[confidence] = [];
                            }
                            confidenceLevels[confidence].push(row.criterion);
                        }
                    });
                } catch (e) {
                    // Skip parsing errors
                }
            }
        });
        
        Object.keys(confidenceLevels).forEach(confidence => {
            console.log(`\n${confidence.toUpperCase()} Confidence (${confidenceLevels[confidence].length}):`);
            console.log(`   ${confidenceLevels[confidence].join(', ')}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createRequirementsAutomationTable(); 