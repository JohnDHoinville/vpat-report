/**
 * React Components Entry Point
 * 
 * This file initializes the Alpine-React integration system and
 * registers all React components for use within the Alpine.js dashboard.
 */

import alpineReactBridge from './utils/alpineIntegration.js';
import TestComponent from './TestComponent.jsx';
import AuthModals from './auth/AuthModals.jsx';
import WebCrawlerInterface from './crawler/WebCrawlerInterface.jsx';
import ProjectSessionInterface from './project/ProjectSessionInterface.jsx';
import AutomatedTestingInterface from './testing/AutomatedTestingInterface.jsx';
import ManualTestingInterface from './testing/manual/ManualTestingInterface.jsx';
import ReportingInterface from './reporting/ReportingInterface.jsx';

console.log('🚀 Initializing React Components for Alpine.js Dashboard...');

// Register React components with the bridge
alpineReactBridge.registerComponent('TestComponent', TestComponent);
alpineReactBridge.registerComponent('AuthModals', AuthModals);
alpineReactBridge.registerComponent('WebCrawlerInterface', WebCrawlerInterface);
alpineReactBridge.registerComponent('ProjectSessionInterface', ProjectSessionInterface);
alpineReactBridge.registerComponent('AutomatedTestingInterface', AutomatedTestingInterface);
alpineReactBridge.registerComponent('ManualTestingInterface', ManualTestingInterface);
alpineReactBridge.registerComponent('ReportingInterface', ReportingInterface);

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
  showTestReview: false,
  showStatusManager: false,
  showEvidenceUpload: false,
  filters: {
    status: 'all',
    wcagLevel: 'all',
    pageId: 'all',
    assignedTo: 'all'
  },
  manualTestingSortBy: 'criterion_number',
  manualTestingSortDirection: 'asc',
  manualTestingViewMode: 'list', // 'list', 'grid', 'kanban'
  loading: false,
  error: null
});

// Initialize reporting state bridge
alpineReactBridge.setState('reportingState', {
  activeTab: 'overview',
  selectedSession: null,
  sessions: [],
  vpatConfig: {
    format: 'html',
    includeEvidence: true,
    organizationName: '',
    productName: '',
    productVersion: '1.0',
    evaluationDate: new Date().toISOString().split('T')[0],
    conformanceLevel: 'AA'
  },
  exportConfig: {
    format: 'json',
    includeEvidence: true,
    includeAuditTrail: false,
    includeMetadata: true,
    status: 'all',
    testMethod: 'all',
    wcagLevel: 'all'
  },
  exportHistory: [],
  reportData: null,
  analyticsData: null,
  loading: false,
  generating: false,
  exporting: false
});

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