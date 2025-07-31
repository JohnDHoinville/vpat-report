/**
 * React Components Entry Point
 * 
 * This file initializes the Alpine-React integration system and
 * registers all React components for use within the Alpine.js dashboard.
 */

import alpineReactBridge from './utils/alpineIntegration.js';
import TestComponent from './TestComponent.jsx';

console.log('🚀 Initializing React Components for Alpine.js Dashboard...');

// Register React components with the bridge
alpineReactBridge.registerComponent('TestComponent', TestComponent);

// Register Alpine.js directive (x-react)
document.addEventListener('alpine:init', () => {
  alpineReactBridge.registerAlpineDirective();
  console.log('✅ Alpine.js x-react directive registered');
});

// Initialize bridge state with default values
alpineReactBridge.setState('reactCounter', 0);
alpineReactBridge.setState('reactMessage', '');
alpineReactBridge.setState('testMessage', 'Welcome to Alpine-React Bridge!');
alpineReactBridge.setState('alpineTestValue', '');

// Setup global helpers for easy access from Alpine.js
window.ReactComponents = {
  // Easy component rendering
  render: (component, props, container, options) => {
    return alpineReactBridge.renderComponent(component, props, container, options);
  },
  
  // Easy component updating
  update: (instanceId, props) => {
    return alpineReactBridge.updateComponent(instanceId, props);
  },
  
  // Easy component unmounting
  unmount: (instanceId) => {
    return alpineReactBridge.unmountComponent(instanceId);
  },
  
  // State helpers
  getState: alpineReactBridge.getState.bind(alpineReactBridge),
  setState: alpineReactBridge.setState.bind(alpineReactBridge),
  subscribe: alpineReactBridge.subscribe.bind(alpineReactBridge),
  
  // Bridge instance for advanced usage
  bridge: alpineReactBridge,
  
  // Debug helper
  debug: () => alpineReactBridge.getDebugInfo()
};

// Setup cleanup on page unload
window.addEventListener('beforeunload', () => {
  alpineReactBridge.cleanup();
});

// Log successful initialization
console.log('✅ React Components initialized successfully!');
console.log('🔧 Available components:', Object.keys(window.ReactComponents));
console.log('💡 Usage: ReactComponents.render("TestComponent", {message: "Hello!"}, "container-id")');

// Export for module usage
export default alpineReactBridge;
export { TestComponent }; 