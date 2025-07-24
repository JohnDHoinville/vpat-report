// ALPINE BLOCK AUTOSTART - Prevent Alpine.js from auto-starting until dashboard is ready
console.log('🛑 ALPINE BLOCK: Preventing Alpine.js auto-start until dashboard is ready');

(function() {
    'use strict';
    
    // STEP 1: Block Alpine.js auto-start IMMEDIATELY
    if (window.Alpine) {
        console.log('🛑 ALPINE BLOCK: Alpine.js already loaded - blocking start');
        window.Alpine.stop();
    }
    
    // STEP 2: Override Alpine.js when it loads
    Object.defineProperty(window, 'Alpine', {
        get() {
            return this._alpine;
        },
        set(alpine) {
            console.log('🛑 ALPINE BLOCK: Alpine.js loaded - installing auto-start blocker');
            
            // Store the original Alpine
            this._alpine = alpine;
            
            // Override the start method
            const originalStart = alpine.start;
            alpine.start = function() {
                console.log('🛑 ALPINE BLOCK: Blocked Alpine.js auto-start');
                // Don't start - we'll start it manually when ready
            };
            
            // Store the original start for later use
            alpine._originalStart = originalStart;
            
            console.log('✅ ALPINE BLOCK: Auto-start blocker installed');
        }
    });
    
    // STEP 3: Wait for dashboard function and manually start Alpine
    let attempts = 0;
    const maxAttempts = 100;
    
    function checkDashboardAndStart() {
        attempts++;
        
        if (window.dashboard && typeof window.dashboard === 'function' && window.Alpine && window.Alpine._originalStart) {
            console.log('🎯 ALPINE BLOCK: Dashboard function found - registering and starting Alpine');
            
            // Register dashboard with Alpine
            window.Alpine.data('dashboard', window.dashboard);
            
            // Now start Alpine with the dashboard registered
            window.Alpine._originalStart.call(window.Alpine);
            
            console.log('✅ ALPINE BLOCK: Alpine.js started successfully with dashboard registered');
            
            // Fire a custom event to signal completion
            window.dispatchEvent(new CustomEvent('alpineDashboardReady'));
            
        } else if (attempts < maxAttempts) {
            // Keep checking
            setTimeout(checkDashboardAndStart, 100);
            if (attempts % 20 === 0) {
                console.log(`🔍 ALPINE BLOCK: Still waiting for dashboard (attempt ${attempts})`);
            }
        } else {
            console.error('❌ ALPINE BLOCK: Timeout waiting for dashboard function');
        }
    }
    
    // Start checking immediately
    checkDashboardAndStart();
    
})(); 