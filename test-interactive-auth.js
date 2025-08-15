#!/usr/bin/env node

/**
 * Simple test script for interactive authentication
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testInteractiveAuth() {
    try {
        console.log('🔐 Testing Interactive Authentication...\n');
        
        // You'll need to replace this with your actual session ID
        const sessionId = 'your-session-id-here';
        
        const requestData = {
            target_mode: 'session',
            target_ids: [],
            tools: ['axe-core'],
            run_async: false,
            options: {
                use_interactive_auth: true,
                preview_mode: false
            }
        };
        
        console.log('📝 Request data:', JSON.stringify(requestData, null, 2));
        console.log('\n🚀 Sending request to automated testing endpoint...\n');
        
        const response = await axios.post(
            `${BASE_URL}/api/automated-testing/unified-run/${sessionId}`,
            requestData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    // You may need to add auth headers here
                    // 'Authorization': 'Bearer your-token'
                }
            }
        );
        
        console.log('✅ Response received:', response.status);
        console.log('📋 Response data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error testing interactive auth:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testInteractiveAuth();
