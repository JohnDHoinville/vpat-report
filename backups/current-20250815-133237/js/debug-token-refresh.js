/**
 * Debug Token Refresh Functionality
 * Use this script to test and debug the token refresh system
 * 
 * Open browser console and use:
 * - debugTokenRefresh.status() - Get current token status
 * - debugTokenRefresh.forceRefresh() - Force a token refresh
 * - debugTokenRefresh.simulateExpiry() - Simulate token expiry for testing
 * - debugTokenRefresh.enableVerboseLogging() - Enable detailed logs
 */

window.debugTokenRefresh = {
    
    /**
     * Get comprehensive token status
     */
    status() {
        if (!window.AuthTokenService) {
            console.error('❌ AuthTokenService not loaded');
            return null;
        }
        
        const status = window.AuthTokenService.getStatus();
        console.log('🔍 Token Status:');
        console.table(status);
        
        // Additional debugging info
        console.log('🔧 Storage Contents:');
        console.log('- Auth Token:', localStorage.getItem('authToken')?.substring(0, 50) + '...');
        console.log('- Refresh Token:', localStorage.getItem('refreshToken')?.substring(0, 50) + '...');
        console.log('- Token Expiry:', localStorage.getItem('tokenExpiry'));
        
        return status;
    },
    
    /**
     * Force a token refresh
     */
    async forceRefresh() {
        if (!window.AuthTokenService) {
            console.error('❌ AuthTokenService not loaded');
            return false;
        }
        
        console.log('🔄 Forcing token refresh...');
        const result = await window.AuthTokenService.refreshToken();
        console.log(result ? '✅ Refresh successful' : '❌ Refresh failed');
        return result;
    },
    
    /**
     * Simulate token expiry for testing
     */
    simulateExpiry() {
        console.log('⏰ Simulating token expiry...');
        
        // Set expiry to 1 minute ago
        const pastTime = new Date();
        pastTime.setMinutes(pastTime.getMinutes() - 1);
        localStorage.setItem('tokenExpiry', pastTime.toISOString());
        
        if (window.AuthTokenService) {
            window.AuthTokenService.state.tokenExpiryTime = pastTime;
            console.log('✅ Token expiry simulated - next check should trigger refresh');
        }
    },
    
    /**
     * Simulate token near expiry (within refresh threshold)
     */
    simulateNearExpiry() {
        console.log('⚠️ Simulating token near expiry...');
        
        // Set expiry to 5 minutes from now (within refresh threshold)
        const nearTime = new Date();
        nearTime.setMinutes(nearTime.getMinutes() + 5);
        localStorage.setItem('tokenExpiry', nearTime.toISOString());
        
        if (window.AuthTokenService) {
            window.AuthTokenService.state.tokenExpiryTime = nearTime;
            console.log('✅ Token near expiry simulated - should trigger refresh soon');
        }
    },
    
    /**
     * Test API call with current token
     */
    async testApiCall() {
        if (!window.DashboardAPI) {
            console.error('❌ DashboardAPI not loaded');
            return false;
        }
        
        try {
            console.log('🧪 Testing API call...');
            const result = await window.DashboardAPI.health.check();
            console.log('✅ API call successful:', result);
            return true;
        } catch (error) {
            console.error('❌ API call failed:', error);
            return false;
        }
    },
    
    /**
     * Enable verbose logging for debugging
     */
    enableVerboseLogging() {
        console.log('🔊 Enabling verbose token refresh logging...');
        
        // Store original console.log
        if (!window._originalConsoleLog) {
            window._originalConsoleLog = console.log;
        }
        
        // Enhanced logging for auth-related messages
        console.log = function(...args) {
            const message = args.join(' ');
            if (message.includes('Token') || message.includes('Auth') || message.includes('🔐') || message.includes('🔄')) {
                window._originalConsoleLog.apply(console, ['🔊', ...args]);
            } else {
                window._originalConsoleLog.apply(console, args);
            }
        };
        
        console.log('✅ Verbose logging enabled');
    },
    
    /**
     * Disable verbose logging
     */
    disableVerboseLogging() {
        if (window._originalConsoleLog) {
            console.log = window._originalConsoleLog;
            console.log('🔇 Verbose logging disabled');
        }
    },
    
    /**
     * Run comprehensive token system test
     */
    async runFullTest() {
        console.log('🧪 Running comprehensive token refresh test...');
        
        // 1. Check initial status
        console.log('\n1. Initial Status:');
        this.status();
        
        // 2. Test API call
        console.log('\n2. Testing API call:');
        await this.testApiCall();
        
        // 3. Simulate near expiry and test refresh
        console.log('\n3. Testing refresh on near expiry:');
        this.simulateNearExpiry();
        const refreshResult = await this.forceRefresh();
        
        // 4. Test API call after refresh
        if (refreshResult) {
            console.log('\n4. Testing API call after refresh:');
            await this.testApiCall();
        }
        
        // 5. Final status
        console.log('\n5. Final Status:');
        this.status();
        
        console.log('✅ Comprehensive test completed');
    },
    
    /**
     * Monitor token status in real-time
     */
    startMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        console.log('👁️ Starting real-time token monitoring (every 10 seconds)...');
        
        this.monitorInterval = setInterval(() => {
            if (window.AuthTokenService) {
                const status = window.AuthTokenService.getStatus();
                console.log(`⏰ ${new Date().toLocaleTimeString()} - Token: ${status.timeUntilExpiry}, Should Refresh: ${status.shouldRefresh}, Is Refreshing: ${status.isRefreshing}`);
            }
        }, 10000);
    },
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log('🛑 Token monitoring stopped');
        }
    }
};

console.log('🔍 Token Refresh Debug Tools loaded');
console.log('💡 Usage: debugTokenRefresh.status(), debugTokenRefresh.forceRefresh(), debugTokenRefresh.runFullTest()');
