// DYNAMIC ALPINE LOADER - Load Alpine.js only AFTER dashboard function is ready
console.log('🎯 DYNAMIC ALPINE LOADER: Waiting for dashboard before loading Alpine.js');

(function() {
    'use strict';
    
    let attempts = 0;
    const maxAttempts = 200; // 20 seconds max wait
    
    // Nuclear Option: Load Alpine.js dynamically ONLY after dashboard is ready
    function loadAlpineWhenReady() {
        attempts++;
        
        if (typeof window.dashboard === 'function') {
            console.log('✅ DYNAMIC ALPINE: Dashboard ready, loading Alpine.js dynamically');
            
            // Create Alpine.js script element
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js';
            script.defer = true;
            
            // Pre-register dashboard before Alpine processes the DOM
            script.onload = () => {
                console.log('🎯 DYNAMIC ALPINE: Alpine.js loaded, pre-registering dashboard');
                
                // Register dashboard component immediately
                if (window.Alpine && window.Alpine.data) {
                    window.Alpine.data('dashboard', window.dashboard);
                    console.log('✅ DYNAMIC ALPINE: Dashboard pre-registered with Alpine.js');
                    
                    // Fire completion event
                    window.dispatchEvent(new CustomEvent('dynamicAlpineReady', {
                        detail: { dashboard: true, alpine: true }
                    }));
                } else {
                    console.error('❌ DYNAMIC ALPINE: Alpine.js loaded but data registration not available');
                }
            };
            
            script.onerror = () => {
                console.error('❌ DYNAMIC ALPINE: Failed to load Alpine.js');
            };
            
            // Add to document - this will start Alpine with dashboard pre-registered
            document.head.appendChild(script);
            
        } else if (attempts < maxAttempts) {
            // Keep waiting for dashboard function
            if (attempts % 20 === 0) {
                console.log(`⏳ DYNAMIC ALPINE: Still waiting for dashboard function (attempt ${attempts})`);
            }
            setTimeout(loadAlpineWhenReady, 100);
        } else {
            console.error('❌ DYNAMIC ALPINE: Timeout waiting for dashboard function after 20 seconds');
        }
    }
    
    // Start the process immediately
    loadAlpineWhenReady();
    
})(); 