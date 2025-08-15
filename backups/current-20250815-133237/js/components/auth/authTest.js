/**
 * Authentication Component Integration Test
 * This script can be run in the browser console to verify React auth components
 */

window.AuthTest = {
    // Test that React components are available
    testComponentsAvailable() {
        console.log('🧪 Testing React Authentication Components...');
        
        const checks = {
            'React Available': typeof React !== 'undefined',
            'ReactDOM Available': typeof ReactDOM !== 'undefined',
            'DashboardAPI Available': typeof window.DashboardAPI !== 'undefined',
            'Auth API Methods': window.DashboardAPI?.auth && 
                              typeof window.DashboardAPI.auth.login === 'function' &&
                              typeof window.DashboardAPI.auth.logout === 'function' &&
                              typeof window.DashboardAPI.auth.updateProfile === 'function',
            'Portal Container': document.getElementById('react-auth-portals') !== null,
            'Dashboard Function': typeof window.dashboard === 'function'
        };
        
        console.table(checks);
        
        const allPassed = Object.values(checks).every(Boolean);
        console.log(allPassed ? '✅ All checks passed!' : '❌ Some checks failed');
        
        return checks;
    },

    // Test API service methods
    async testAPIService() {
        console.log('🧪 Testing API Service Integration...');
        
        try {
            // Test that API methods exist and can be called
            const apiMethods = [
                'login', 'logout', 'getProfile', 'updateProfile', 'changePassword'
            ];
            
            const methodChecks = {};
            for (const method of apiMethods) {
                methodChecks[`auth.${method}`] = typeof window.DashboardAPI.auth[method] === 'function';
            }
            
            console.table(methodChecks);
            
            // Test API client configuration
            console.log('📝 API Configuration:', {
                baseUrl: window.DashboardAPI.config.baseUrl,
                timeout: window.DashboardAPI.config.timeout,
                retryAttempts: window.DashboardAPI.config.retryAttempts
            });
            
            return methodChecks;
        } catch (error) {
            console.error('❌ API Service test failed:', error);
            return false;
        }
    },

    // Test portal rendering capability
    testPortalContainer() {
        console.log('🧪 Testing React Portal Container...');
        
        const container = document.getElementById('react-auth-portals');
        if (!container) {
            console.error('❌ Portal container not found');
            return false;
        }
        
        console.log('✅ Portal container found:', {
            id: container.id,
            children: container.children.length,
            innerHTML: container.innerHTML.length + ' characters'
        });
        
        return true;
    },

    // Test Alpine.js integration
    testAlpineIntegration() {
        console.log('🧪 Testing Alpine.js Integration...');
        
        try {
            if (typeof window.dashboard !== 'function') {
                console.error('❌ Dashboard function not available');
                return false;
            }
            
            const dashboardInstance = window.dashboard();
            const authProps = {
                'showLogin': typeof dashboardInstance.showLogin !== 'undefined',
                'showProfile': typeof dashboardInstance.showProfile !== 'undefined', 
                'showChangePassword': typeof dashboardInstance.showChangePassword !== 'undefined',
                'user': typeof dashboardInstance.user !== 'undefined',
                'loginForm': typeof dashboardInstance.loginForm !== 'undefined',
                'profileForm': typeof dashboardInstance.profileForm !== 'undefined',
                'passwordForm': typeof dashboardInstance.passwordForm !== 'undefined'
            };
            
            console.table(authProps);
            
            const allPropsAvailable = Object.values(authProps).every(Boolean);
            console.log(allPropsAvailable ? '✅ Alpine.js auth properties available' : '❌ Some Alpine.js auth properties missing');
            
            return authProps;
        } catch (error) {
            console.error('❌ Alpine.js integration test failed:', error);
            return false;
        }
    },

    // Run all tests
    runAllTests() {
        console.log('🚀 Running Complete Authentication Integration Test Suite...');
        console.log('=====================================================');
        
        const results = {
            components: this.testComponentsAvailable(),
            apiService: this.testAPIService(),
            portal: this.testPortalContainer(),
            alpine: this.testAlpineIntegration()
        };
        
        console.log('=====================================================');
        console.log('📊 Test Summary:');
        console.log('✅ Components Test:', Object.values(results.components).every(Boolean));
        console.log('✅ Portal Test:', results.portal);
        console.log('✅ Alpine Test:', results.alpine && Object.values(results.alpine).every(Boolean));
        
        return results;
    }
};

// Auto-run tests when loaded (with delay to ensure everything is initialized)
setTimeout(() => {
    if (window.location.pathname.includes('dashboard')) {
        console.log('🔧 Authentication test utilities loaded. Run AuthTest.runAllTests() to test integration.');
    }
}, 1000);

console.log('✅ Authentication Test Suite loaded successfully'); 