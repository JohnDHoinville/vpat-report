// CONSOLE TEST - Run this in browser console to test Alpine blocking
console.log('🧪 CONSOLE TEST: Loading Alpine block test...');

// Method 1: Load the Alpine block script
let blockScript = document.createElement('script');
blockScript.src = 'alpine-block-autostart.js?' + new Date().getTime();
blockScript.onload = () => {
    console.log('✅ Alpine block script loaded');
    
    // Method 2: If that doesn't work, try loading the test script
    let testScript = document.createElement('script');
    testScript.src = 'test-alpine-block.js?' + new Date().getTime();
    document.head.appendChild(testScript);
};
blockScript.onerror = () => {
    console.error('❌ Failed to load Alpine block script');
};
document.head.appendChild(blockScript);
