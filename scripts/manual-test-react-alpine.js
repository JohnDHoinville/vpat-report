#!/usr/bin/env node

/**
 * Manual Test Script for React-Alpine Integration
 * 
 * This script provides instructions and validation commands
 * for manually testing the React-Alpine bridge system.
 */

const http = require('http');

console.log('🧪 React-Alpine Integration Manual Test Guide');
console.log('='.repeat(60));

// Check if server is running
const checkServer = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
};

const checkReactBundle = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080/dashboard/dist/react-components.js', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
};

async function runManualTest() {
  console.log('\n📋 Pre-flight Checks:');
  
  // Check server
  const serverRunning = await checkServer();
  console.log(`${serverRunning ? '✅' : '❌'} HTTP Server: ${serverRunning ? 'Running on port 8080' : 'Not accessible'}`);
  
  if (!serverRunning) {
    console.log('\n🚨 Error: HTTP server not running!');
    console.log('💡 Fix: Run `npm start` first');
    process.exit(1);
  }
  
  // Check React bundle
  const bundleAvailable = await checkReactBundle();
  console.log(`${bundleAvailable ? '✅' : '❌'} React Bundle: ${bundleAvailable ? 'Available' : 'Not found'}`);
  
  if (!bundleAvailable) {
    console.log('\n🚨 Error: React components bundle not found!');
    console.log('💡 Fix: Run `npm run build:dev` first');
    process.exit(1);
  }
  
  console.log('\n🎯 Manual Testing Instructions:');
  console.log('='.repeat(50));
  
  console.log('\n1. 🌐 Open Browser and Navigate to Test Page:');
  console.log('   Open: http://localhost:8080/test-react-alpine-bridge.html');
  
  console.log('\n2. 🔍 Open Browser Developer Console (F12)');
  
  console.log('\n3. ✅ Verify Framework Loading:');
  console.log('   Run these commands in the browser console:');
  console.log('');
  console.log('   // Check Alpine.js loaded');
  console.log('   !!window.Alpine');
  console.log('');
  console.log('   // Check React components loaded');
  console.log('   !!window.ReactComponents');
  console.log('');
  console.log('   // Check bridge initialized');
  console.log('   !!window.alpineReactBridge');
  
  console.log('\n4. 🧪 Test Basic Component Rendering:');
  console.log('   Run this command:');
  console.log('');
  console.log('   window.ReactComponents.render(\'TestComponent\', {message: \'Manual Test!\'}, \'static-react-component\')');
  
  console.log('\n5. 📊 Check Bridge Status:');
  console.log('   Run this command:');
  console.log('');
  console.log('   window.ReactComponents.debug()');
  
  console.log('\n6. 🔄 Test State Bridge:');
  console.log('   Set state: window.bridgeState.set(\'testKey\', \'Hello Bridge!\')');
  console.log('   Get state: window.bridgeState.get(\'testKey\')');
  
  console.log('\n7. 🎛️ Test Interactive Features:');
  console.log('   - Click the "+1" button in Alpine section');
  console.log('   - Click "Send to Bridge" button');
  console.log('   - Click "Mount" button for Portal 1');
  console.log('   - Verify React component appears');
  console.log('   - Click "Unmount" to test cleanup');
  
  console.log('\n8. 🔍 Verify Expected Results:');
  console.log('   ✅ Static React component should render automatically');
  console.log('   ✅ Alpine controls should update state bridge');
  console.log('   ✅ React portals should mount/unmount correctly');
  console.log('   ✅ State should sync between Alpine and React');
  console.log('   ✅ Debug info should show registered components');
  
  console.log('\n🎯 Success Criteria:');
  console.log('='.repeat(40));
  console.log('✅ All framework objects are defined');
  console.log('✅ Static React component renders on page load');
  console.log('✅ Dynamic components mount/unmount correctly');
  console.log('✅ State synchronization works bidirectionally');
  console.log('✅ No console errors during operation');
  console.log('✅ Debug info shows healthy bridge status');
  
  console.log('\n🚨 Common Issues and Solutions:');
  console.log('='.repeat(40));
  console.log('❌ "ReactComponents is not defined"');
  console.log('   → Check webpack bundle loaded: network tab should show react-components.js');
  console.log('   → Rebuild with: npm run build:dev');
  
  console.log('\n❌ "Alpine is not defined"');
  console.log('   → Check Alpine.js CDN loading in network tab');
  console.log('   → Verify script tags in HTML');
  
  console.log('\n❌ React component not rendering');
  console.log('   → Check console for component registration errors');
  console.log('   → Verify container element exists');
  console.log('   → Run: window.ReactComponents.debug()');
  
  console.log('\n❌ State bridge not working');
  console.log('   → Check bridge initialization: !!window.alpineReactBridge');
  console.log('   → Verify state listeners: window.alpineReactBridge.listeners');
  
  console.log('\n🎉 If all tests pass, the React-Alpine integration is working correctly!');
  console.log('\n💡 You can now proceed with migrating dashboard components using this bridge system.');
  
  console.log('\n📝 Next Steps for Development:');
  console.log('- Extract utilities from dashboard.js (Phase 2)');
  console.log('- Create API service layer (Phase 3)');
  console.log('- Migrate individual dashboard sections to React');
  console.log('- Implement global state management');
}

// Self-test validation commands that can be copy-pasted into browser console
const generateValidationScript = () => {
  return `
// === React-Alpine Integration Validation Script ===
// Copy and paste this entire block into your browser console

console.log('🧪 Starting React-Alpine Integration Validation...');

const tests = [];
const results = { passed: 0, failed: 0, errors: [] };

// Test 1: Framework Loading
tests.push({
  name: 'Alpine.js Loading',
  test: () => !!window.Alpine,
  expected: true
});

tests.push({
  name: 'React Components Loading',
  test: () => !!window.ReactComponents,
  expected: true
});

tests.push({
  name: 'Alpine-React Bridge Loading',
  test: () => !!window.alpineReactBridge,
  expected: true
});

tests.push({
  name: 'Bridge State Available',
  test: () => !!window.bridgeState,
  expected: true
});

// Test 2: Component Registration
tests.push({
  name: 'TestComponent Registered',
  test: () => window.ReactComponents.bridge && window.ReactComponents.bridge.componentRegistry.has('TestComponent'),
  expected: true
});

// Test 3: API Functions
tests.push({
  name: 'Render Function Available',
  test: () => typeof window.ReactComponents.render === 'function',
  expected: true
});

tests.push({
  name: 'State Functions Available',
  test: () => typeof window.bridgeState.set === 'function' && typeof window.bridgeState.get === 'function',
  expected: true
});

// Test 4: State Bridge Functionality
tests.push({
  name: 'State Bridge Set/Get',
  test: () => {
    window.bridgeState.set('validationTest', 'success');
    return window.bridgeState.get('validationTest') === 'success';
  },
  expected: true
});

// Test 5: Component Rendering
tests.push({
  name: 'Component Rendering',
  test: () => {
    try {
      const instanceId = window.ReactComponents.render('TestComponent', 
        { message: 'Validation Test' }, 
        'static-react-component'
      );
      return typeof instanceId === 'string' && instanceId.length > 0;
    } catch (error) {
      console.error('Component rendering error:', error);
      return false;
    }
  },
  expected: true
});

// Run all tests
console.log('🔍 Running validation tests...');
tests.forEach((test, index) => {
  try {
    const result = test.test();
    const passed = result === test.expected;
    
    console.log(\`\${passed ? '✅' : '❌'} \${test.name}: \${result}\`);
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(\`\${test.name}: Expected \${test.expected}, got \${result}\`);
    }
  } catch (error) {
    console.error(\`❌ \${test.name}: Error - \${error.message}\`);
    results.failed++;
    results.errors.push(\`\${test.name}: \${error.message}\`);
  }
});

// Summary
console.log('\\n📊 Validation Results:');
console.log(\`✅ Passed: \${results.passed}\`);
console.log(\`❌ Failed: \${results.failed}\`);
console.log(\`📝 Total: \${results.passed + results.failed}\`);

if (results.errors.length > 0) {
  console.log('\\n🚨 Errors:');
  results.errors.forEach((error, index) => {
    console.log(\`\${index + 1}. \${error}\`);
  });
}

const success = results.failed === 0;
console.log(\`\\n\${success ? '🎉' : '💥'} Integration \${success ? 'PASSED' : 'FAILED'}\`);

if (success) {
  console.log('✅ React-Alpine integration is working correctly!');
  console.log('🚀 Ready to proceed with dashboard migration.');
} else {
  console.log('❌ Integration issues detected. Please fix errors before proceeding.');
}

// Additional debug information
console.log('\\n🔍 Debug Information:');
if (window.ReactComponents && window.ReactComponents.debug) {
  console.log('Bridge Status:', window.ReactComponents.debug());
}
  `;
};

if (require.main === module) {
  runManualTest().catch(console.error);
}

module.exports = {
  runManualTest,
  generateValidationScript
}; 