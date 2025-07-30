// ALPINE READY FIX - Proper timing for Alpine.js registration with async scripts
console.log('🎯 ALPINE READY FIX: Installing proper Alpine.js registration timing');

(function() {
    'use strict';
    
    let dashboardRegistered = false;
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds with 100ms intervals
    
    // Wait for both Alpine.js and dashboard function to be available
    function ensureDashboardRegistration() {
        console.log(`🎯 ALPINE READY: Checking registration attempt ${retryCount + 1}`);
        
        if (dashboardRegistered) {
            console.log('✅ ALPINE READY: Dashboard already registered');
            return;
        }
        
        // Check if both Alpine.js and dashboard function are available
        if (window.Alpine && window.dashboard && typeof window.dashboard === 'function') {
            console.log('🎯 ALPINE READY: Both Alpine.js and dashboard function are available');
            
            try {
                // Register dashboard component with Alpine.js
                console.log('🎯 ALPINE READY: Registering dashboard component...');
                window.Alpine.data('dashboard', window.dashboard);
                
                dashboardRegistered = true;
                console.log('✅ ALPINE READY: Dashboard component registered successfully');
                
                // Force Alpine.js to re-scan the page for the new component
                setTimeout(() => {
                    if (window.Alpine.initTree) {
                        console.log('🔄 ALPINE READY: Re-initializing Alpine.js tree...');
                        window.Alpine.initTree(document.body);
                    }
                }, 100);
                
                return;
                
            } catch (error) {
                console.error('❌ ALPINE READY: Registration failed:', error);
            }
        }
        
        // Retry if not ready yet
        retryCount++;
        if (retryCount < maxRetries) {
            console.log(`⏳ ALPINE READY: Retrying in 100ms... (${retryCount}/${maxRetries})`);
            setTimeout(ensureDashboardRegistration, 100);
        } else {
            console.error('❌ ALPINE READY: Max retries reached - dashboard registration failed');
            console.log('📊 ALPINE READY: Debug info:', {
                Alpine: !!window.Alpine,
                dashboard: !!window.dashboard,
                dashboardType: typeof window.dashboard,
                dashboardKeys: window.dashboard ? Object.keys(window.dashboard()) : 'N/A'
            });
        }
    }
    
    // Start checking immediately
    ensureDashboardRegistration();
    
    // Also handle Alpine.js init event if it hasn't fired yet
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(ensureDashboardRegistration, 50);
        });
    }
    
    // Handle alpine:init event
    document.addEventListener('alpine:init', () => {
        console.log('🎯 ALPINE READY: Alpine.js init event fired');
        setTimeout(ensureDashboardRegistration, 10);
    });
    
    // Backup registration on window load
    window.addEventListener('load', () => {
        setTimeout(ensureDashboardRegistration, 100);
    });
    
})(); 