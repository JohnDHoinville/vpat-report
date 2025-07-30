// TEST DYNAMIC ALPINE - Console test for the dynamic loading approach
console.log('🧪 TESTING: Dynamic Alpine loading approach...');

// Test the dynamic loader
function testDynamicAlpine() {
    console.log('🧪 TESTING: Current state:', {
        dashboard: typeof window.dashboard,
        Alpine: !!window.Alpine,
        alpineData: window.Alpine && typeof window.Alpine.data,
        dashboardRegistered: window.Alpine && window.Alpine.data && window.Alpine.data._components && Object.keys(window.Alpine.data._components).includes('dashboard')
    });
    
    // Listen for the dynamic Alpine ready event
    window.addEventListener('dynamicAlpineReady', (event) => {
        console.log('🎉 TESTING: Dynamic Alpine ready event fired!', event.detail);
        
        setTimeout(() => {
            console.log('🧪 TESTING: Final verification:', {
                Alpine: !!window.Alpine,
                dashboard: !!window.dashboard,
                alpineErrors: document.querySelectorAll('[x-data]').length,
                dashboardType: typeof window.dashboard,
                noErrors: !document.querySelector('.alpine-error')
            });
        }, 1000);
    });
}

// Start test
testDynamicAlpine();
