// TEST ALPINE BLOCK - Console test to verify Alpine blocking works
console.log('🧪 TESTING: Alpine block solution...');

// Check if Alpine is blocked from auto-starting
if (window.Alpine && window.Alpine._originalStart) {
    console.log('✅ TESTING: Alpine auto-start successfully blocked');
} else {
    console.log('❌ TESTING: Alpine auto-start blocking failed');
}

// Listen for our custom ready event
window.addEventListener('alpineDashboardReady', () => {
    console.log('🎉 TESTING: Alpine dashboard ready event fired!');
    
    // Test Alpine functionality
    setTimeout(() => {
        console.log('🧪 TESTING: Final verification:', {
            Alpine: !!window.Alpine,
            dashboard: !!window.dashboard,
            alpineStarted: !document.querySelector('.alpine-error'),
            alpineRegistered: window.Alpine && window.Alpine.data && typeof window.Alpine.data === 'function',
            dashboardType: typeof window.dashboard
        });
    }, 1000);
});

console.log('✅ TESTING: Test listeners installed');
