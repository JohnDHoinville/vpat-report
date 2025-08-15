/**
 * Test script for Unified Automation Service
 * Use this to verify the service is working correctly
 */

// Test function to verify unified automation service
window.testUnifiedAutomation = function() {
    console.log('🧪 Testing Unified Automation Service...');
    
    try {
        // Check if UnifiedAutomationService is available
        if (typeof UnifiedAutomationService === 'undefined') {
            console.error('❌ UnifiedAutomationService is not defined');
            return false;
        }
        
        console.log('✅ UnifiedAutomationService class is available');
        
        // Check if we can create an instance
        const mockApiCall = async (url, options) => {
            console.log(`🔧 Mock API call: ${url}`, options);
            return { success: true, run_id: 'test-run-123', summary: { targets_resolved: 5 } };
        };
        
        const mockShowNotification = (type, title, message) => {
            console.log(`🔔 Mock notification: [${type}] ${title}: ${message}`);
        };
        
        const service = new UnifiedAutomationService(mockApiCall, mockShowNotification);
        console.log('✅ Successfully created UnifiedAutomationService instance');
        
        // Test session automation (mock)
        console.log('🚀 Testing session automation...');
        service.runSessionAutomation('test-session-123', { preview_mode: true })
            .then(result => {
                console.log('✅ Session automation test successful:', result);
            })
            .catch(error => {
                console.error('❌ Session automation test failed:', error);
            });
        
        return true;
        
    } catch (error) {
        console.error('❌ Error testing unified automation service:', error);
        return false;
    }
};

// Test dashboard integration
window.testDashboardIntegration = function() {
    console.log('🧪 Testing Dashboard Integration...');
    
    // Check if dashboard instance exists
    const dashboardInstance = window.dashboardInstance || window._dashboardInstance;
    
    if (!dashboardInstance) {
        console.error('❌ Dashboard instance not found');
        return false;
    }
    
    console.log('✅ Dashboard instance found');
    
    // Check if unified automation is initialized in dashboard
    if (!dashboardInstance.unifiedAutomation) {
        console.log('🔧 Initializing unified automation in dashboard...');
        try {
            dashboardInstance.unifiedAutomation = new UnifiedAutomationService(
                dashboardInstance.apiCall.bind(dashboardInstance),
                dashboardInstance.showNotification.bind(dashboardInstance)
            );
            console.log('✅ Unified automation initialized in dashboard');
        } catch (error) {
            console.error('❌ Failed to initialize unified automation:', error);
            return false;
        }
    } else {
        console.log('✅ Unified automation already initialized in dashboard');
    }
    
    // Check if progress tracking is available
    if (typeof dashboardInstance.startProgressTracking === 'function') {
        console.log('✅ Progress tracking is available');
    } else {
        console.error('❌ Progress tracking is not available');
        return false;
    }
    
    return true;
};

// Test the unified automation trigger
window.testUnifiedTrigger = function(sessionId) {
    console.log('🧪 Testing Unified Automation Trigger...');
    
    if (!sessionId) {
        console.error('❌ Session ID required for testing');
        return false;
    }
    
    const dashboardInstance = window.dashboardInstance || window._dashboardInstance;
    
    if (!dashboardInstance) {
        console.error('❌ Dashboard instance not found');
        return false;
    }
    
    // Test session automation
    dashboardInstance.triggerAutomatedTest(sessionId)
        .then(() => {
            console.log('✅ Unified automation triggered successfully');
        })
        .catch(error => {
            console.error('❌ Failed to trigger unified automation:', error);
        });
    
    return true;
};

console.log('🧪 Unified Automation Test Functions loaded');
console.log('💡 Available functions:');
console.log('  - testUnifiedAutomation() - Test service availability');
console.log('  - testDashboardIntegration() - Test dashboard integration');
console.log('  - testUnifiedTrigger(sessionId) - Test automation trigger');