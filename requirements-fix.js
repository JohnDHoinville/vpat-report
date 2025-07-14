// Temporary fix for Requirements Analysis issues
// Add these functions to dashboard_helpers.js

// 1. Fix for enhanceRequirementsWithTestData function
async enhanceRequirementsWithTestData(requirements, sessionId) {
    try {
        console.log(`📊 Enhancing ${requirements.length} requirements with test data for session ${sessionId}`);
        
        // Get automated test results with safe error handling
        let automatedResults = [];
        try {
            const automatedResponse = await this.apiCall(`/results/automated-test-results?session_id=${sessionId}`);
            automatedResults = Array.isArray(automatedResponse?.data) ? automatedResponse.data : [];
        } catch (error) {
            console.warn('Failed to load automated test results:', error);
            automatedResults = [];
        }
        
        console.log(`🤖 Found ${automatedResults.length} automated test results`);
        
        // Get manual test instances with safe error handling  
        let manualTests = [];
        try {
            const manualResponse = await this.apiCall(`/test-instances?session_id=${sessionId}`);
            // CRITICAL FIX: Ensure manualTests is always an array
            manualTests = Array.isArray(manualResponse?.data) ? manualResponse.data : 
                         Array.isArray(manualResponse) ? manualResponse : [];
        } catch (error) {
            console.warn('Failed to load manual test instances:', error);
            manualTests = [];
        }
        
        console.log(`👤 Found ${manualTests.length} manual test instances`);
        
        // Group results by requirement
        const automatedByRequirement = {};
        const manualByRequirement = {};
        
        automatedResults.forEach(result => {
            const reqId = result.wcag_criterion || result.requirement_id;
            if (reqId) {
                if (!automatedByRequirement[reqId]) {
                    automatedByRequirement[reqId] = [];
                }
                automatedByRequirement[reqId].push(result);
            }
        });
        
        // CRITICAL FIX: Safe forEach iteration
        if (Array.isArray(manualTests)) {
            manualTests.forEach(test => {
                const reqId = test.requirement_id || test.criterion_number;
                if (reqId) {
                    if (!manualByRequirement[reqId]) {
                        manualByRequirement[reqId] = [];
                    }
                    manualByRequirement[reqId].push(test);
                }
            });
        }
        
        // Enhance each requirement with guaranteed arrays
        return requirements.map(req => {
            const automated = automatedByRequirement[req.criterion_number] || [];
            const manual = manualByRequirement[req.criterion_number] || [];
            
            return {
                ...req,
                automated_tests: automated,
                manual_tests: manual,
                automated_status: this.getAutomatedTestStatus(automated),
                manual_status: this.getManualTestStatus(manual),
                overall_status: this.getRequirementOverallStatus(automated, manual)
            };
        });
        
    } catch (error) {
        console.error('Error enhancing requirements with test data:', error);
        return requirements.map(req => ({
            ...req,
            automated_tests: [],
            manual_tests: [],
            automated_status: 'not_tested',
            manual_status: 'not_tested',
            overall_status: 'not_tested'
        }));
    }
}

// 2. Safe helper for Alpine.js templates
safeGetRequirementStatus(requirement) {
    if (!requirement) return 'Unknown';
    
    if (requirement.overall_status) {
        switch (requirement.overall_status) {
            case 'passed': return 'Passed';
            case 'failed': return 'Failed';
            case 'in_progress': return 'In Progress';
            case 'not_tested': return 'Not Tested';
            default: return 'Unknown';
        }
    }
    
    return 'Not Tested';
}

// Instructions:
// 1. Replace the existing enhanceRequirementsWithTestData function in dashboard_helpers.js
// 2. Add the safeGetRequirementStatus function
// 3. In dashboard.html, change the Alpine.js expression from:
//    x-text="getRequirementOverallStatus(requirement)"
//    to:
//    x-text="safeGetRequirementStatus(requirement)" 