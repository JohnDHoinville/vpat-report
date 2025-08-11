const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function analyzeWaveCoverage() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Analyzing WAVE coverage and unique capabilities...\n');
        
        // Get all requirements
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
        
        // Define WAVE's unique capabilities and rules
        const waveUniqueRules = {
            '1.1.1': ['image-alt', 'area-alt', 'input-image-alt', 'object-alt', 'svg-img-alt'],
            '1.2.1': ['audio-caption', 'video-caption'],
            '1.2.2': ['video-caption'],
            '1.2.3': ['video-audio-description'],
            '1.3.1': ['list', 'listitem', 'definition-list', 'dlitem', 'table-layout', 'th-has-data-cells'],
            '1.3.2': ['meaningful-sequence'],
            '1.3.3': ['sensory-characteristics'],
            '1.4.1': ['color-alone'],
            '1.4.2': ['audio-control'],
            '1.4.3': ['color-contrast'],
            '1.4.4': ['resize-text'],
            '1.4.5': ['images-of-text'],
            '2.1.1': ['keyboard-navigation', 'tabindex', 'focus-management'],
            '2.1.2': ['keyboard-trap'],
            '2.2.1': ['timing-adjustable'],
            '2.2.2': ['pause-stop-hide'],
            '2.3.1': ['three-flashes'],
            '2.4.1': ['bypass', 'skip-link'],
            '2.4.2': ['document-title'],
            '2.4.3': ['focus-order'],
            '2.4.4': ['link-purpose'],
            '2.4.6': ['headings-and-labels'],
            '2.4.7': ['focus-visible'],
            '2.5.1': ['pointer-gestures'],
            '2.5.2': ['pointer-cancellation'],
            '2.5.3': ['label-in-name'],
            '2.5.4': ['motion-actuation'],
            '3.1.1': ['html-has-lang', 'html-lang-valid'],
            '3.1.2': ['lang-valid'],
            '3.2.1': ['on-focus'],
            '3.2.2': ['on-input'],
            '3.3.1': ['error-identification'],
            '3.3.2': ['labels-or-instructions'],
            '3.3.3': ['error-suggestion'],
            '3.3.4': ['error-prevention'],
            '4.1.1': ['duplicate-id', 'valid-html'],
            '4.1.2': ['name-role-value', 'aria-valid-attr', 'aria-valid-attr-value']
        };
        
        // Analyze current coverage vs WAVE coverage
        const coverageAnalysis = {};
        
        result.rows.forEach(row => {
            const criterion = row.criterion;
            const currentTools = [];
            const currentRules = [];
            
            if (row.tool_mappings) {
                try {
                    const toolMappings = typeof row.tool_mappings === 'string' 
                        ? JSON.parse(row.tool_mappings) 
                        : row.tool_mappings;
                    
                    // Get current tools
                    Object.keys(toolMappings).forEach(tool => {
                        if (tool !== 'manual' && tool !== 'principle' && 
                            tool !== 'automated_rules' && tool !== 'automated_tools' &&
                            tool !== 'automation_confidence' && tool !== 'manual_verification_needed' &&
                            tool !== 'aaa_level' && tool !== 'specialized_testing') {
                            currentTools.push(tool);
                        }
                    });
                    
                    // Get current rules
                    if (toolMappings.automated_rules) {
                        currentRules.push(...toolMappings.automated_rules);
                    }
                } catch (e) {
                    // Skip parsing errors
                }
            }
            
            coverageAnalysis[criterion] = {
                title: row.title,
                level: row.level,
                currentTools: currentTools,
                currentRules: currentRules,
                waveRules: waveUniqueRules[criterion] || [],
                missingWaveRules: []
            };
            
            // Calculate missing WAVE rules
            if (waveUniqueRules[criterion]) {
                coverageAnalysis[criterion].missingWaveRules = waveUniqueRules[criterion].filter(rule => 
                    !currentRules.includes(rule)
                );
            }
        });
        
        // Show requirements that would benefit from WAVE
        console.log('📊 Requirements That Would Benefit from WAVE:');
        console.log('=============================================');
        
        const requirementsNeedingWave = Object.keys(coverageAnalysis).filter(criterion => {
            const analysis = coverageAnalysis[criterion];
            return analysis.missingWaveRules.length > 0 || 
                   (analysis.currentTools.length < 3 && waveUniqueRules[criterion]);
        });
        
        requirementsNeedingWave.forEach(criterion => {
            const analysis = coverageAnalysis[criterion];
            console.log(`\n${criterion}: ${analysis.title} (${analysis.level})`);
            console.log(`  Current tools: ${analysis.currentTools.join(', ') || 'None'}`);
            console.log(`  Current rules: ${analysis.currentRules.join(', ') || 'None'}`);
            console.log(`  WAVE rules: ${analysis.waveRules.join(', ') || 'None'}`);
            console.log(`  Missing WAVE rules: ${analysis.missingWaveRules.join(', ') || 'None'}`);
        });
        
        // Show WAVE's unique capabilities
        console.log('\n🔧 WAVE\'s Unique Capabilities:');
        console.log('==============================');
        
        const waveUniqueCapabilities = [
            'HTML validation and parsing',
            'Semantic structure analysis',
            'Form field analysis',
            'Table structure validation',
            'Language attribute validation',
            'Document outline analysis',
            'Skip link detection',
            'Focus management analysis',
            'Color contrast calculation',
            'Image alt text analysis',
            'Link purpose analysis',
            'Heading structure analysis'
        ];
        
        waveUniqueCapabilities.forEach(capability => {
            console.log(`  - ${capability}`);
        });
        
        // Show requirements currently missing automation
        console.log('\n📋 Requirements Currently Missing Automation:');
        console.log('=============================================');
        
        const requirementsMissingAutomation = result.rows.filter(row => 
            row.test_method === 'manual'
        );
        
        requirementsMissingAutomation.forEach(row => {
            console.log(`  - ${row.requirement_id}: ${row.title} (${row.level})`);
        });
        
        // Show requirements that could be automated with WAVE
        console.log('\n🤖 Requirements That Could Be Automated with WAVE:');
        console.log('==================================================');
        
        const requirementsThatCouldBeAutomated = requirementsMissingAutomation.filter(row => {
            return waveUniqueRules[row.requirement_id] && waveUniqueRules[row.requirement_id].length > 0;
        });
        
        requirementsThatCouldBeAutomated.forEach(row => {
            console.log(`  - ${row.requirement_id}: ${row.title} (${row.level})`);
            console.log(`    WAVE rules: ${waveUniqueRules[row.requirement_id].join(', ')}`);
        });
        
        // Summary statistics
        console.log('\n📊 Summary:');
        console.log('===========');
        console.log(`Total WCAG requirements: ${result.rows.length}`);
        console.log(`Requirements that would benefit from WAVE: ${requirementsNeedingWave.length}`);
        console.log(`Requirements currently manual-only: ${requirementsMissingAutomation.length}`);
        console.log(`Requirements that could be automated with WAVE: ${requirementsThatCouldBeAutomated.length}`);
        
        // Show specific WAVE advantages
        console.log('\n🎯 WAVE\'s Specific Advantages:');
        console.log('==============================');
        
        const waveAdvantages = {
            'HTML Validation': 'Better HTML parsing and validation than other tools',
            'Semantic Analysis': 'Deep analysis of semantic structure and relationships',
            'Form Accessibility': 'Comprehensive form field accessibility analysis',
            'Table Structure': 'Detailed table structure and header analysis',
            'Language Detection': 'Robust language attribute validation',
            'Document Outline': 'Analysis of document heading structure',
            'Skip Links': 'Detection and validation of skip navigation links',
            'Focus Management': 'Comprehensive focus management analysis',
            'Color Analysis': 'Advanced color contrast and color-alone analysis',
            'Image Analysis': 'Detailed image alt text and decorative image analysis',
            'Link Analysis': 'Link purpose and context analysis',
            'ARIA Validation': 'Comprehensive ARIA attribute validation'
        };
        
        Object.keys(waveAdvantages).forEach(advantage => {
            console.log(`  - ${advantage}: ${waveAdvantages[advantage]}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

analyzeWaveCoverage(); 