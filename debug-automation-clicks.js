// Debug script to test automation button clicks
// Run this in browser console to test automation

console.log('🔧 Debugging automation button clicks...');

// Check dashboard instance
if (!window.dashboardInstance) {
    console.error('❌ Dashboard instance not found');
} else {
    console.log('✅ Dashboard instance found');
    
    // Check if required functions exist
    const functions = [
        'startAutomatedTesting',
        'triggerAutomatedTest', 
        'apiCall',
        'showNotification'
    ];
    
    functions.forEach(func => {
        if (typeof window.dashboardInstance[func] === 'function') {
            console.log(`✅ ${func} function exists`);
        } else {
            console.error(`❌ ${func} function missing`);
        }
    });
    
    // Check if session is selected
    const selectedSession = window.dashboardInstance.selectedSessionDetails;
    if (selectedSession) {
        console.log('✅ Session selected:', selectedSession.id);
        
        // Test the automation functions directly
        console.log('🧪 Testing triggerAutomatedTest...');
        window.dashboardInstance.triggerAutomatedTest(selectedSession.id)
            .then(result => {
                console.log('✅ triggerAutomatedTest successful:', result);
            })
            .catch(error => {
                console.error('❌ triggerAutomatedTest failed:', error);
            });
            
    } else {
        console.error('❌ No session selected');
    }
}

// Check UnifiedAutomationService
if (typeof UnifiedAutomationService === 'undefined') {
    console.error('❌ UnifiedAutomationService not defined');
} else {
    console.log('✅ UnifiedAutomationService available');
}

// Check if unified endpoint is accessible
if (window.dashboardInstance?.apiCall) {
    console.log('🧪 Testing unified endpoint...');
    window.dashboardInstance.apiCall('/automated-testing/health')
        .then(result => {
            console.log('✅ API endpoint accessible:', result);
        })
        .catch(error => {
            console.error('❌ API endpoint error:', error);
        });
}