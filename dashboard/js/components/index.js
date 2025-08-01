/**
 * React Components Entry Point
 * 
 * This file initializes the Alpine-React integration system and
 * registers all React components for use within the Alpine.js dashboard.
 * Updated to use the new Global State Management system.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import alpineReactBridge from './utils/alpineIntegration.js';
import { GlobalStateProvider } from '../stores/GlobalStateContext.jsx';
import TestComponent from './TestComponent.jsx';
import AuthModals from './auth/AuthModals.jsx';
import WebCrawlerInterface from './crawler/WebCrawlerInterface.jsx';
import ProjectSessionInterface from './project/ProjectSessionInterface.jsx';
import AutomatedTestingInterface from './testing/AutomatedTestingInterface.jsx';
import ManualTestingInterface from './testing/manual/ManualTestingInterface.jsx';
import ReportingInterface from './reporting/ReportingInterface.jsx';

console.log('🚀 Initializing React Components for Alpine.js Dashboard...');

// Create enhanced component wrapper that includes global state
function createComponentWithGlobalState(Component) {
  return function WrappedComponent(props) {
    return (
      <GlobalStateProvider>
        <Component {...props} />
      </GlobalStateProvider>
    );
  };
}

// Wrap all components with global state
const ComponentsWithGlobalState = {
  TestComponent: createComponentWithGlobalState(TestComponent),
  AuthModals: createComponentWithGlobalState(AuthModals),
  WebCrawlerInterface: createComponentWithGlobalState(WebCrawlerInterface),
  ProjectSessionInterface: createComponentWithGlobalState(ProjectSessionInterface),
  AutomatedTestingInterface: createComponentWithGlobalState(AutomatedTestingInterface),
  ManualTestingInterface: createComponentWithGlobalState(ManualTestingInterface),
  ReportingInterface: createComponentWithGlobalState(ReportingInterface)
};

// Register React components with the bridge
Object.entries(ComponentsWithGlobalState).forEach(([name, Component]) => {
  alpineReactBridge.registerComponent(name, Component);
});

// Register Alpine.js directive (x-react)
document.addEventListener('alpine:init', () => {
  alpineReactBridge.registerAlpineDirective();
  console.log('✅ Alpine.js x-react directive registered');
});

// Initialize bridge state with default values (maintaining backward compatibility)
alpineReactBridge.setState('reactCounter', 0);
alpineReactBridge.setState('reactMessage', '');
alpineReactBridge.setState('testMessage', 'Welcome to Alpine-React Bridge!');
alpineReactBridge.setState('alpineTestValue', '');

// Initialize authentication state bridge
alpineReactBridge.setState('authState', {
  showLogin: false,
  showProfile: false,
  showChangePassword: false,
  user: null,
  loading: false
});

// Initialize web crawler state bridge
alpineReactBridge.setState('crawlerState', {
  showCreateCrawler: false,
  webCrawlers: [],
  selectedCrawler: null,
  discoveredPages: [],
  loading: false,
  sessionCapturing: false,
  sessionAwaitingLogin: false,
  sessionInfo: {
    isActive: false,
    authenticationType: null,
    capturedCredentials: false,
    capturedSession: false
  }
});

// Initialize project/session management state bridge
alpineReactBridge.setState('projectSessionState', {
  showCreateProject: false,
  showSessionWizard: false,
  projects: [],
  selectedProject: null,
  sessions: [],
  selectedSession: null,
  loading: false,
  wizardStep: 1,
  wizardData: {}
});

// Initialize automated testing state bridge
alpineReactBridge.setState('automatedTestingState', {
  showTestConfiguration: false,
  testSessions: [],
  selectedTestSession: null,
  automationProgress: null,
  testResults: [],
  loading: false,
  running: false,
  configuration: {
    tools: ['axe-core', 'pa11y'],
    conformanceLevel: 'AA',
    includeWarnings: false,
    runAsync: true
  }
});

// Initialize manual testing state bridge
alpineReactBridge.setState('manualTestingState', {
  sessions: [],
  selectedSession: null,
  assignments: [],
  filteredAssignments: [],
  currentTest: null,
  testDetails: null,
  evidence: [],
  loading: false,
  filters: {
    status: 'all',
    assignee: 'all',
    priority: 'all',
    search: ''
  }
});

// Initialize reporting state bridge
alpineReactBridge.setState('reportingState', {
  activeTab: 'overview',
  selectedSession: null,
  sessions: [],
  vpatConfig: {
    organizationName: '',
    contactInfo: '',
    testingDate: new Date().toISOString().split('T')[0],
    conformanceLevel: 'AA'
  },
  exportConfig: {
    format: 'pdf',
    includeScreenshots: true,
    includeDetails: true
  },
  reports: [],
  loading: false
});

// Enhanced render function that provides global context
function renderComponentWithGlobalState(componentName, props = {}, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found`);
    return;
  }
  
  const Component = ComponentsWithGlobalState[componentName];
  if (!Component) {
    console.error(`Component "${componentName}" not found`);
    return;
  }
  
  const root = ReactDOM.createRoot(container);
  root.render(<Component {...props} />);
  
  console.log(`✅ Rendered ${componentName} with global state in container ${containerId}`);
  return root;
}

// Enhanced React Components API with global state
window.ReactComponents = {
  render: renderComponentWithGlobalState,
  
  // Legacy compatibility methods
  update: (componentName, props, containerId) => {
    return renderComponentWithGlobalState(componentName, props, containerId);
  },
  
  unmount: (containerId) => {
    const container = document.getElementById(containerId);
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.unmount();
      console.log(`✅ Unmounted component from container ${containerId}`);
    }
  },
  
  // State management utilities
  getState: () => {
    console.warn('getState is deprecated. Use global state hooks within components.');
    return alpineReactBridge.getState();
  },
  
  setState: (key, value) => {
    console.warn('setState is deprecated. Use global state actions within components.');
    return alpineReactBridge.setState(key, value);
  },
  
  // Subscribe to Alpine state changes (maintained for backward compatibility)
  subscribe: (key, callback) => {
    return alpineReactBridge.subscribe(key, callback);
  },
  
  // Get bridge instance for advanced usage
  getBridge: () => alpineReactBridge,
  
  // Global state utilities
  GlobalState: {
    // Access to store hooks (for use outside of React components)
    getAuthUtils: () => import('../stores/AuthStore.js').then(m => m.AuthUtils),
    getProjectUtils: () => import('../stores/ProjectStore.js').then(m => m.ProjectUtils),
    getTestingUtils: () => import('../stores/TestingStore.js').then(m => m.TestingUtils),
    getUIUtils: () => import('../stores/UIStore.js').then(m => m.UIUtils)
  }
};

// Global state synchronization with Alpine.js
let globalStateSync = null;

// Function to initialize global state synchronization
function initializeGlobalStateSync() {
  // This will be called when the first component mounts
  if (!globalStateSync && window.alpineReactBridge) {
    console.log('🔄 Initializing global state synchronization with Alpine.js');
    
    // Set up bidirectional sync
    globalStateSync = {
      // Sync from React to Alpine
      syncToAlpine: (state) => {
        if (window.dashboardInstance) {
          // Authentication sync
          if (state.auth) {
            window.dashboardInstance.user = state.auth.user;
            window.dashboardInstance.isAuthenticated = state.auth.isAuthenticated;
          }
          
          // Projects sync
          if (state.projects) {
            window.dashboardInstance.projects = state.projects.list;
            window.dashboardInstance.selectedProject = state.projects.selectedProject;
          }
          
          // Sessions sync
          if (state.sessions) {
            window.dashboardInstance.testingSessions = state.sessions.list;
            window.dashboardInstance.selectedSession = state.sessions.selectedSession;
          }
        }
      },
      
      // Sync from Alpine to React (if needed)
      syncFromAlpine: () => {
        if (window.dashboardInstance) {
          // This could trigger React state updates if Alpine state changes
          // Implementation depends on specific requirements
        }
      }
    };
  }
}

// Initialize sync when Alpine is ready
document.addEventListener('alpine:initialized', () => {
  initializeGlobalStateSync();
});

console.log('✅ React Components initialized successfully!');
console.log('🔧 Available components:', Object.keys(ComponentsWithGlobalState));
console.log('🌐 Global state management enabled');
console.log('🔗 Alpine-React bridge active');

// Test functionality
window.testReactComponents = {
  // Test basic component rendering
  testBasicRender: () => {
    console.log('🧪 Testing basic component rendering...');
    
    const testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    testContainer.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 20px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    document.body.appendChild(testContainer);
    
    window.ReactComponents.render('TestComponent', { 
      message: 'Global State Test!',
      showCounter: true 
    }, 'test-container');
    
    // Clean up after 5 seconds
    setTimeout(() => {
      document.body.removeChild(testContainer);
      console.log('🧪 Test completed and cleaned up');
    }, 5000);
  },
  
  // Test global state management
  testGlobalState: () => {
    console.log('🧪 Testing global state management...');
    
    // This would test the global state functionality
    // Implementation would depend on specific test requirements
    console.log('🧪 Global state test completed');
  },
  
  // Test Alpine integration
  testAlpineIntegration: () => {
    console.log('🧪 Testing Alpine integration...');
    
    if (window.dashboardInstance) {
      console.log('✅ Alpine dashboard instance found');
      console.log('📊 Current Alpine state:', {
        user: window.dashboardInstance.user,
        projects: window.dashboardInstance.projects?.length || 0,
        sessions: window.dashboardInstance.testingSessions?.length || 0
      });
    } else {
      console.log('❌ Alpine dashboard instance not found');
    }
  }
};

// Export for module systems
export default {
  render: renderComponentWithGlobalState,
  bridge: alpineReactBridge,
  components: ComponentsWithGlobalState
}; 