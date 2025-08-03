/**
 * DASHBOARD LOADING DIAGNOSTIC
 * Paste this in browser console to debug why dashboard.js isn't creating window.dashboard
 */

console.log('🔍 DASHBOARD LOADING DIAGNOSTIC');

// Check script loading
console.log('\n1. Script Elements:');
const scripts = Array.from(document.scripts);
scripts.forEach((script, i) => {
    if (script.src && script.src.includes('dashboard')) {
        console.log(`   ${i}: ${script.src} - loaded: ${script.readyState || 'unknown'}`);
    }
});

// Check for JavaScript errors
console.log('\n2. Error Detection:');
const originalError = console.error;
const errors = [];
console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
};

// Check window objects
console.log('\n3. Window Objects:');
console.log('   - window.dashboard:', typeof window.dashboard);
console.log('   - window.Alpine:', typeof window.Alpine);
console.log('   - window.DashboardUtils:', typeof window.DashboardUtils);

// Try to manually load dashboard function
console.log('\n4. Manual Dashboard Test:');
try {
    // Check if the function exists in a different scope
    if (typeof dashboard !== 'undefined') {
        console.log('   ✅ dashboard function exists in global scope');
        window.dashboard = dashboard;
    } else {
        console.log('   ❌ dashboard function not in global scope');
    }
} catch (error) {
    console.log('   ❌ Error accessing dashboard:', error.message);
}

// Check for network loading issues
console.log('\n5. Network Status:');
fetch('dashboard/js/dashboard.js', { method: 'HEAD' })
    .then(response => {
        console.log(`   dashboard.js fetch: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    })
    .catch(error => {
        console.log('   ❌ Error fetching dashboard.js:', error.message);
    });

// List any captured errors
setTimeout(() => {
    console.log('\n6. Captured Errors:');
    if (errors.length === 0) {
        console.log('   ✅ No JavaScript errors detected');
    } else {
        errors.forEach((error, i) => {
            console.log(`   ${i + 1}: ${error}`);
        });
    }
}, 1000);

console.log('\n📊 Diagnostic complete. Check the output above for issues.');