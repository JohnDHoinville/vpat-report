const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/accessibility_testing'
});

async function addWaveToRequirements() {
    const client = await pool.connect();
    
    try {
        console.log('🌊 Adding WAVE to appropriate WCAG requirements...\n');
        
        // Requirements that would benefit from WAVE based on our analysis
        const waveRequirements = [
            // Perceivable - Text Alternatives
            '1.1.1', // Non-text Content
            '1.2.1', // Audio-only and Video-only (Prerecorded)
            '1.2.2', // Captions (Prerecorded)
            '1.2.3', // Audio Description or Media Alternative (Prerecorded)
            
            // Perceivable - Adaptable
            '1.3.1', // Info and Relationships
            '1.3.2', // Meaningful Sequence
            '1.3.3', // Sensory Characteristics
            
            // Perceivable - Distinguishable
            '1.4.1', // Use of Color
            '1.4.2', // Audio Control
            '1.4.3', // Contrast (Minimum)
            '1.4.4', // Resize Text
            '1.4.5', // Images of Text
            
            // Operable - Keyboard Accessible
            '2.1.1', // Keyboard
            '2.1.2', // No Keyboard Trap
            
            // Operable - Enough Time
            '2.2.1', // Timing Adjustable
            '2.2.2', // Pause, Stop, Hide
            
            // Operable - Seizures and Physical Reactions
            '2.3.1', // Three Flashes or Below Threshold
            
            // Operable - Navigable
            '2.4.1', // Bypass Blocks
            '2.4.2', // Page Titled
            '2.4.3', // Focus Order
            '2.4.4', // Link Purpose (In Context)
            '2.4.6', // Headings and Labels
            '2.4.7', // Focus Visible
            
            // Operable - Input Modalities
            '2.5.1', // Pointer Gestures
            '2.5.2', // Pointer Cancellation
            '2.5.3', // Label in Name
            '2.5.4', // Motion Actuation
            
            // Understandable - Readable
            '3.1.1', // Language of Page
            '3.1.2', // Language of Parts
            
            // Understandable - Predictable
            '3.2.1', // On Focus
            '3.2.2', // On Input
            
            // Understandable - Input Assistance
            '3.3.1', // Error Identification
            '3.3.2', // Labels or Instructions
            '3.3.3', // Error Suggestion
            '3.3.4', // Error Prevention (Legal, Financial, Data)
            
            // Robust - Compatible
            '4.1.1', // Parsing
            '4.1.2'  // Name, Role, Value
        ];
        
        console.log(`📋 Adding WAVE to ${waveRequirements.length} requirements...`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const requirementId of waveRequirements) {
            try {
                // Get current tool mappings for this requirement
                const getQuery = `
                    SELECT id, requirement_id, title, tool_mappings
                    FROM unified_requirements
                    WHERE requirement_id = $1 AND standard_type = 'wcag'
                `;
                
                const getResult = await client.query(getQuery, [requirementId]);
                
                if (getResult.rows.length === 0) {
                    console.log(`⚠️  Requirement ${requirementId} not found, skipping...`);
                    skippedCount++;
                    continue;
                }
                
                const requirement = getResult.rows[0];
                let toolMappings = requirement.tool_mappings;
                
                // Parse tool_mappings if it's a string
                if (typeof toolMappings === 'string') {
                    toolMappings = JSON.parse(toolMappings);
                }
                
                // Check if WAVE is already in automated_tools
                const automatedTools = toolMappings.automated_tools || [];
                if (automatedTools.includes('wave')) {
                    console.log(`✅ ${requirementId}: ${requirement.title} - WAVE already present`);
                    skippedCount++;
                    continue;
                }
                
                // Add WAVE to automated_tools array
                automatedTools.push('wave');
                toolMappings.automated_tools = automatedTools;
                
                // Update the requirement
                const updateQuery = `
                    UPDATE unified_requirements
                    SET tool_mappings = $1
                    WHERE id = $2
                `;
                
                await client.query(updateQuery, [JSON.stringify(toolMappings), requirement.id]);
                
                console.log(`✅ ${requirementId}: ${requirement.title} - Added WAVE`);
                updatedCount++;
                
            } catch (error) {
                console.error(`❌ Error updating ${requirementId}:`, error.message);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`  - Requirements updated: ${updatedCount}`);
        console.log(`  - Requirements skipped: ${skippedCount}`);
        console.log(`  - Total processed: ${waveRequirements.length}`);
        
        // Verify the changes
        console.log(`\n🔍 Verifying changes...`);
        
        const verifyQuery = `
            SELECT 
                requirement_id,
                title,
                tool_mappings->'automated_tools' as automated_tools
            FROM unified_requirements
            WHERE requirement_id = ANY($1)
            AND standard_type = 'wcag'
            ORDER BY requirement_id
        `;
        
        const verifyResult = await client.query(verifyQuery, [waveRequirements]);
        
        console.log(`\n📋 Requirements with WAVE:`);
        verifyResult.rows.forEach(row => {
            const tools = row.automated_tools || [];
            const hasWave = tools.includes('wave');
            const status = hasWave ? '✅' : '❌';
            console.log(`  ${status} ${row.requirement_id}: ${row.title}`);
            if (hasWave) {
                console.log(`    Tools: ${tools.join(', ')}`);
            }
        });
        
        // Show requirements that still don't have WAVE
        const missingWave = verifyResult.rows.filter(row => {
            const tools = row.automated_tools || [];
            return !tools.includes('wave');
        });
        
        if (missingWave.length > 0) {
            console.log(`\n⚠️  Requirements still missing WAVE:`);
            missingWave.forEach(row => {
                console.log(`  - ${row.requirement_id}: ${row.title}`);
            });
        }
        
        console.log(`\n🎉 WAVE integration complete!`);
        console.log(`\n💡 Next steps:`);
        console.log(`  1. Test WAVE in a new session`);
        console.log(`  2. Verify WAVE appears in tool selection`);
        console.log(`  3. Check that WAVE results are processed correctly`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

addWaveToRequirements(); 