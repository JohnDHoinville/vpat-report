// TEST MODERN LOADER - Run this in console to test the new loading system
console.log('🧪 TESTING: Loading modern script loader...');

// Load the modern script loader
let script = document.createElement('script');
script.src = 'modern-script-loader.js?' + new Date().getTime();
script.onload = () => {
    console.log('✅ TESTING: Modern script loader loaded');
    
    // Watch for dashboard ready event
    window.addEventListener('dashboardReady', () => {
        console.log('🎉 TESTING: Dashboard ready event fired!');
        
        // Test Alpine.js registration
        setTimeout(() => {
            console.log('🧪 TESTING: Alpine.js status:', {
                Alpine: !!window.Alpine,
                dashboard: !!window.dashboard,
                dashboardType: typeof window.dashboard,
                registered: window.Alpine && window.Alpine.data && window.Alpine.data._registered && window.Alpine.data._registered.dashboard
            });
        }, 500);
    });
};
script.onerror = () => {
    console.error('❌ TESTING: Failed to load modern script loader');
};
document.head.appendChild(script);
