/**
 * Interactive Authentication Test
 * Copy and paste this into your browser console at http://localhost:8080
 */

async function testInteractiveAuth() {
    try {
        console.log('🔐 Starting Interactive Authentication Test...');
        
        // Get session data from the dashboard
        const dashboardData = window.dashboard || window.componentInstance;
        if (!dashboardData) {
            console.error('❌ Dashboard not found. Make sure you\'re on http://localhost:8080');
            return;
        }
        
        // Try to get the current session ID
        const sessionId = dashboardData.currentSession?.id || dashboardData.selectedSession?.id;
        if (!sessionId) {
            console.error('❌ No session selected. Please select a testing session in the dashboard first.');
            console.log('💡 Go to Projects → Select a project → Select a testing session');
            return;
        }
        
        console.log(`✅ Found session ID: ${sessionId}`);
        console.log('🚀 Sending interactive auth request...');
        
        // Make the API request
        const response = await fetch(`/api/automated-testing/unified-run/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            },
            body: JSON.stringify({
                target_mode: 'session',
                target_ids: [],
                tools: ['axe-core'],
                run_async: false,
                options: {
                    use_interactive_auth: true,
                    preview_mode: false
                }
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Interactive auth request sent successfully!');
            console.log('📋 Response:', result);
            console.log('');
            console.log('🔍 Check the backend terminal - you should see:');
            console.log('- Browser opening with login page');
            console.log('- Instructions to login manually');
            console.log('- Prompt to press ENTER when done');
        } else {
            console.error('❌ Request failed:', result);
            if (response.status === 401) {
                console.log('💡 Try logging in to the dashboard first');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Instructions
console.log('🔐 INTERACTIVE AUTHENTICATION TEST LOADED');
console.log('');
console.log('📝 INSTRUCTIONS:');
console.log('1. Make sure you\'re logged in to the dashboard');
console.log('2. Select a project and testing session');
console.log('3. Run: testInteractiveAuth()');
console.log('');
console.log('🚀 Ready! Type: testInteractiveAuth()');
