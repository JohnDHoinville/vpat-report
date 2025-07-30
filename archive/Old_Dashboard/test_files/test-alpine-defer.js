// TEST ALPINE DEFER - Console test script
console.log('🧪 TESTING: Alpine defer solution...');

// Load the modern script loader with Alpine defer fix
let script = document.createElement('script');
script.src = 'modern-script-loader.js?' + new Date().getTime();
script.onload = () => {
    console.log('✅ TESTING: Modern script loader with Alpine defer loaded');
    
    // Watch for Alpine ready event
    window.addEventListener('dashboardAlpineReady', () => {
        console.log('🎉 TESTING: Dashboard Alpine ready event fired!');
        
        // Test the solution after a brief delay
        setTimeout(() => {
            console.log('🧪 TESTING: Final status check:', {
                Alpine: !!window.Alpine,
                dashboard: !!window.dashboard,
                dashboardType: typeof window.dashboard,
                alpineErrors: document.querySelectorAll('.alpine-error').length,
                visibleDashboard: !!document.querySelector('[x-data*="dashboard"]'),
                modalErrors: document.querySelectorAll('*').length > 0 ? 'Page loaded' : 'Page empty'
            });
            
            // Check for Alpine errors
            setTimeout(() => {
                const errors = [...document.querySelectorAll('*')].filter(el => 
                    el.textContent && el.textContent.includes('Alpine Expression Error')
                );
                console.log(`🧪 TESTING: Found ${errors.length} Alpine errors`);
            }, 1000);
            
        }, 1000);
    });
};
script.onerror = () => {
    console.error('❌ TESTING: Failed to load modern script loader');
};
document.head.appendChild(script);
