const axios = require('axios');

async function testSessionsEndpoint() {
    try {
        console.log('🧪 Testing testing-sessions endpoint...');
        
        // Test without auth (should get 401)
        const response = await axios.get('http://localhost:3001/api/testing-sessions?project_id=73e05c7d-6f2c-4c0c-b385-3030224c0de4', {
            validateStatus: () => true // Don't throw on error status codes
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
        
        if (response.status === 401) {
            console.log('✅ Endpoint working correctly - requires authentication as expected');
        } else if (response.status === 500) {
            console.log('❌ Still getting 500 error - backend issue remains');
        } else {
            console.log(`🤔 Unexpected status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
    }
}

testSessionsEndpoint();