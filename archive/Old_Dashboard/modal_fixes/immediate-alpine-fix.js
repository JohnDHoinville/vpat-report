// IMMEDIATE ALPINE FIX - Load this in console to fix Alpine timing issues NOW
console.log('🚨 IMMEDIATE ALPINE FIX: Installing emergency Alpine.js timing correction');

(function() {
    'use strict';
    
    // STEP 1: Stop Alpine if it's already running and causing errors
    if (window.Alpine && window.Alpine.store) {
        console.log('🛑 IMMEDIATE FIX: Stopping current Alpine instance');
        try {
            // Clear any existing Alpine errors
            document.querySelectorAll('.alpine-error').forEach(el => el.remove());
        } catch (e) {}
    }
    
    // STEP 2: Wait for dashboard function and re-register
    let attempts = 0;
    const maxAttempts = 100;
    
    function fixAlpineRegistration() {
        attempts++;
        console.log(`🔧 IMMEDIATE FIX: Attempt ${attempts} - Dashboard: ${!!window.dashboard}, Alpine: ${!!window.Alpine}`);
        
        if (window.dashboard && typeof window.dashboard === 'function' && window.Alpine && window.Alpine.data) {
            
            console.log('✅ IMMEDIATE FIX: Both dashboard and Alpine available - fixing registration');
            
            try {
                // Force register dashboard component
                window.Alpine.data('dashboard', window.dashboard);
                console.log('✅ IMMEDIATE FIX: Dashboard registered with Alpine');
                
                // Force Alpine to reinitialize the page
                if (window.Alpine.initTree) {
                    const dashboardElement = document.querySelector('[x-data*="dashboard"]');
                    if (dashboardElement) {
                        console.log('🔄 IMMEDIATE FIX: Reinitializing dashboard element');
                        window.Alpine.initTree(dashboardElement);
                    }
                }
                
                // Success message
                console.log('🎉 IMMEDIATE FIX: Alpine.js registration completed successfully!');
                
                // Check for errors after a brief delay
                setTimeout(() => {
                    const errors = document.querySelectorAll('*');
                    let errorCount = 0;
                    errors.forEach(el => {
                        if (el.textContent && el.textContent.includes('Alpine Expression Error')) {
                            errorCount++;
                        }
                    });
                    console.log(`📊 IMMEDIATE FIX: Found ${errorCount} remaining Alpine errors`);
                    
                    if (errorCount === 0) {
                        console.log('🎉 SUCCESS: All Alpine.js errors resolved!');
                    }
                }, 1000);
                
                return; // Success - stop trying
                
            } catch (error) {
                console.error('❌ IMMEDIATE FIX: Registration failed:', error);
            }
        }
        
        // Retry if not ready yet
        if (attempts < maxAttempts) {
            setTimeout(fixAlpineRegistration, 100);
        } else {
            console.error('❌ IMMEDIATE FIX: Max attempts reached');
            console.log('📊 Final status:', {
                dashboard: !!window.dashboard,
                dashboardType: typeof window.dashboard,
                Alpine: !!window.Alpine,
                AlpineData: !!(window.Alpine && window.Alpine.data)
            });
        }
    }
    
    // Start the fix process
    fixAlpineRegistration();
    
})();

console.log('✅ IMMEDIATE ALPINE FIX: Emergency fix installed - monitoring for dashboard function...'); 