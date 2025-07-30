// ALPINE DEFER FIX - Defer Alpine.js initialization until dashboard is ready
console.log('🎯 ALPINE DEFER: Installing Alpine.js deferral system');

(function() {
    'use strict';
    
    // Flag to track if we've already initialized
    let alpineInitialized = false;
    
    // Defer Alpine.js initialization until dashboard is ready
    function deferAlpineInitialization() {
        console.log('⏸️ ALPINE DEFER: Deferring Alpine start until dashboard is ready...');
        
        // Ensure Alpine object exists
        window.Alpine = window.Alpine || {};
        
        // Save the original start function
        if (window.Alpine.start && !window.Alpine._originalStart) {
            window.Alpine._originalStart = window.Alpine.start;
        }
        
        // Override Alpine's start function to prevent auto-start
        window.Alpine.start = function() {
            console.log('⏸️ ALPINE DEFER: Alpine start blocked - waiting for dashboard');
        };
        
        console.log('✅ ALPINE DEFER: Alpine auto-start successfully deferred');
    }
    
    // Check for dashboard function availability and initialize when ready
    function initializeWhenReady() {
        console.log(`🔍 ALPINE DEFER: Checking readiness - dashboard: ${!!window.dashboard}, Alpine.data: ${!!(window.Alpine && window.Alpine.data)}`);
        
        if (typeof window.dashboard === 'function' && window.Alpine && window.Alpine.data) {
            if (alpineInitialized) {
                console.log('✅ ALPINE DEFER: Already initialized, skipping');
                return;
            }
            
            console.log('✅ ALPINE DEFER: Dashboard function available, registering with Alpine');
            
            try {
                // Register the dashboard component
                window.Alpine.data('dashboard', window.dashboard);
                console.log('✅ ALPINE DEFER: Dashboard component registered');
                
                // Now start Alpine with the original start function
                if (window.Alpine._originalStart) {
                    window.Alpine._originalStart();
                    console.log('🚀 ALPINE DEFER: Alpine.js started with dashboard registered');
                } else if (window.Alpine.start !== window.Alpine.start) {
                    // Fallback: call start directly
                    delete window.Alpine.start; // Remove our override
                    if (window.Alpine.start) {
                        window.Alpine.start();
                    }
                    console.log('🚀 ALPINE DEFER: Alpine.js started (fallback method)');
                }
                
                alpineInitialized = true;
                console.log('✅ ALPINE DEFER: Initialization complete');
                
                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('dashboardAlpineReady'));
                
            } catch (error) {
                console.error('❌ ALPINE DEFER: Registration failed:', error);
                // Retry after a delay
                setTimeout(initializeWhenReady, 100);
            }
            
        } else {
            console.log('⏳ ALPINE DEFER: Still waiting...');
            setTimeout(initializeWhenReady, 50);
        }
    }
    
    // Start the process
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 ALPINE DEFER: DOM ready, starting defer process');
            deferAlpineInitialization();
            
            // Give scripts a moment to load, then start checking
            setTimeout(initializeWhenReady, 100);
        });
    } else {
        console.log('🎯 ALPINE DEFER: DOM already ready, starting defer process');
        deferAlpineInitialization();
        setTimeout(initializeWhenReady, 100);
    }
    
    // Also listen for script ready events
    window.addEventListener('dashboardReady', () => {
        console.log('🎯 ALPINE DEFER: Dashboard ready event received');
        setTimeout(initializeWhenReady, 10);
    });
    
    // Backup initialization if Alpine is already available
    if (window.Alpine) {
        console.log('🎯 ALPINE DEFER: Alpine already available, deferring immediately');
        deferAlpineInitialization();
    }
    
})(); 