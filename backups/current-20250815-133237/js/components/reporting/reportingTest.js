/**
 * Reporting Components Test Suite
 * 
 * Console-based testing utilities for the reporting interface components.
 * Provides functions to test VPAT generation, report viewing, export management,
 * and progress analytics in the browser console.
 */

window.reportingTest = {
  // Test state
  testState: {
    testSessionId: null,
    testInstanceId: null,
    reportingContainer: null,
    vpatContainer: null,
    exportContainer: null,
    analyticsContainer: null
  },

  /**
   * Run a complete demo of the reporting interface
   */
  async runDemo() {
    console.log('🚀 Starting Reporting Interface Demo...');
    
    try {
      // Clean up any existing tests
      this.cleanup();
      
      // Step 1: Initialize main reporting interface
      console.log('\n📊 Step 1: Rendering ReportingInterface');
      await this.renderReportingInterface();
      
      // Step 2: Test individual components
      console.log('\n📋 Step 2: Testing individual components');
      await this.testVPATGenerator();
      await this.testReportViewer();
      await this.testExportManager();
      await this.testProgressCharts();
      
      // Step 3: Test data flow
      console.log('\n🔄 Step 3: Testing component interactions');
      await this.testComponentInteractions();
      
      console.log('\n✅ Reporting Interface Demo completed successfully!');
      console.log('💡 Use reportingTest.cleanup() to clean up when done');
      
      return {
        success: true,
        components: ['ReportingInterface', 'VPATGenerator', 'ReportViewer', 'ExportManager', 'ProgressCharts'],
        containers: Object.keys(this.testState).filter(key => key.endsWith('Container'))
      };
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Render the main reporting interface
   */
  async renderReportingInterface() {
    // Create container
    this.testState.reportingContainer = this.createTestContainer('reporting-test-container', 'Reporting Interface Test');
    
    // Mock session data
    const mockSession = this.getMockSessionId();
    
    // Render component
    const instanceId = window.ReactComponents.render(
      'ReportingInterface',
      {
        sessionId: mockSession,
        defaultTab: 'overview',
        onTabChange: (tab) => console.log('📑 Tab changed to:', tab),
        onNotification: (type, title, message) => console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`),
        className: 'w-full h-full'
      },
      this.testState.reportingContainer
    );
    
    console.log('✅ ReportingInterface rendered with ID:', instanceId);
    
    // Wait for component to load
    await this.wait(1000);
    
    return instanceId;
  },

  /**
   * Test VPAT Generator component
   */
  async testVPATGenerator() {
    console.log('📄 Testing VPATGenerator component...');
    
    // Create container
    this.testState.vpatContainer = this.createTestContainer('vpat-test-container', 'VPAT Generator Test');
    
    const mockSession = this.getMockSessionId();
    
    // Render component
    const instanceId = window.ReactComponents.render(
      'VPATGenerator',
      {
        sessionId: mockSession,
        onGenerate: (vpatInfo) => {
          console.log('📋 VPAT Generated:', vpatInfo);
          this.simulateNotification('success', 'VPAT Generated', `File: ${vpatInfo.filename}`);
        },
        onError: (error) => {
          console.error('❌ VPAT Error:', error);
          this.simulateNotification('error', 'VPAT Error', error);
        }
      },
      this.testState.vpatContainer
    );
    
    console.log('✅ VPATGenerator rendered with ID:', instanceId);
    await this.wait(500);
    
    return instanceId;
  },

  /**
   * Test Report Viewer component
   */
  async testReportViewer() {
    console.log('📊 Testing ReportViewer component...');
    
    // Create container
    const container = this.createTestContainer('report-viewer-test-container', 'Report Viewer Test');
    
    const mockSession = this.getMockSessionId();
    
    // Render component
    const instanceId = window.ReactComponents.render(
      'ReportViewer',
      {
        sessionId: mockSession,
        reportType: 'session',
        onViewDetails: (instance) => {
          console.log('🔍 Viewing details for instance:', instance);
          this.simulateNotification('info', 'Details', `Viewing ${instance.criterion_number}`);
        },
        onError: (error) => {
          console.error('❌ Report Viewer Error:', error);
          this.simulateNotification('error', 'Report Error', error);
        }
      },
      container
    );
    
    console.log('✅ ReportViewer rendered with ID:', instanceId);
    await this.wait(500);
    
    return instanceId;
  },

  /**
   * Test Export Manager component
   */
  async testExportManager() {
    console.log('📤 Testing ExportManager component...');
    
    // Create container
    this.testState.exportContainer = this.createTestContainer('export-test-container', 'Export Manager Test');
    
    const mockSession = this.getMockSessionId();
    
    // Render component
    const instanceId = window.ReactComponents.render(
      'ExportManager',
      {
        sessionId: mockSession,
        onExport: (exportInfo) => {
          console.log('📥 Export completed:', exportInfo);
          this.simulateNotification('success', 'Export Complete', `File: ${exportInfo.filename}`);
        },
        onError: (error) => {
          console.error('❌ Export Error:', error);
          this.simulateNotification('error', 'Export Error', error);
        }
      },
      this.testState.exportContainer
    );
    
    console.log('✅ ExportManager rendered with ID:', instanceId);
    await this.wait(500);
    
    return instanceId;
  },

  /**
   * Test Progress Charts component
   */
  async testProgressCharts() {
    console.log('📈 Testing ProgressCharts component...');
    
    // Create container
    this.testState.analyticsContainer = this.createTestContainer('analytics-test-container', 'Progress Charts Test');
    
    const mockSession = this.getMockSessionId();
    
    // Render component
    const instanceId = window.ReactComponents.render(
      'ProgressCharts',
      {
        sessionId: mockSession,
        chartType: 'all',
        onDataUpdate: (data) => {
          console.log('📊 Analytics data updated:', data);
        },
        onError: (error) => {
          console.error('❌ Analytics Error:', error);
          this.simulateNotification('error', 'Analytics Error', error);
        }
      },
      this.testState.analyticsContainer
    );
    
    console.log('✅ ProgressCharts rendered with ID:', instanceId);
    await this.wait(500);
    
    return instanceId;
  },

  /**
   * Test component interactions and state management
   */
  async testComponentInteractions() {
    console.log('🔄 Testing component interactions...');
    
    // Test state updates
    if (window.ReactComponents && window.ReactComponents.setState) {
      console.log('📊 Updating reporting state...');
      
      window.ReactComponents.setState('reportingState', {
        activeTab: 'vpat',
        selectedSession: this.getMockSessionId(),
        vpatConfig: {
          format: 'html',
          includeEvidence: true,
          organizationName: 'Test Organization',
          productName: 'Test Product',
          productVersion: '2.0',
          evaluationDate: new Date().toISOString().split('T')[0],
          conformanceLevel: 'AA'
        }
      });
      
      console.log('✅ State updated successfully');
      await this.wait(500);
      
      // Test state retrieval
      const currentState = window.ReactComponents.getState('reportingState');
      console.log('📋 Current reporting state:', currentState);
    }
    
    // Test mock data scenarios
    await this.simulateDataScenarios();
  },

  /**
   * Simulate different data scenarios
   */
  async simulateDataScenarios() {
    console.log('📊 Simulating data scenarios...');
    
    const scenarios = [
      {
        name: 'Empty Session',
        data: { stats: { total: 0, passed: 0, failed: 0, notTested: 0 } }
      },
      {
        name: 'Complete Testing Session',
        data: { stats: { total: 100, passed: 75, failed: 15, notTested: 10 } }
      },
      {
        name: 'Failed Testing Session',
        data: { stats: { total: 50, passed: 10, failed: 30, notTested: 10 } }
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`🎭 Scenario: ${scenario.name}`, scenario.data);
      await this.wait(200);
    }
  },

  /**
   * Simulate Alpine.js notification system
   */
  simulateNotification(type, title, message) {
    console.log(`🔔 ${type.toUpperCase()} Notification: ${title} - ${message}`);
    
    // Create visual notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 
      type === 'error' ? 'bg-red-500' : 
      type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.innerHTML = `
      <div class="font-medium">${title}</div>
      <div class="text-sm opacity-90">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  },

  /**
   * Create a test container
   */
  createTestContainer(id, title) {
    // Remove existing container
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
    
    // Create new container
    const container = document.createElement('div');
    container.id = id;
    container.className = 'fixed inset-4 bg-white border border-gray-300 rounded-lg shadow-lg z-40 overflow-auto';
    container.innerHTML = `
      <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 class="font-medium text-gray-900">${title}</h3>
        <button onclick="reportingTest.removeContainer('${id}')" class="text-gray-400 hover:text-gray-600">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-4 h-full overflow-auto react-component-container"></div>
    `;
    
    document.body.appendChild(container);
    return container.querySelector('.react-component-container');
  },

  /**
   * Remove a test container
   */
  removeContainer(id) {
    const container = document.getElementById(id);
    if (container) {
      container.remove();
      console.log(`🗑️ Removed container: ${id}`);
    }
  },

  /**
   * Get a mock session ID (use existing or create one)
   */
  getMockSessionId() {
    // Try to get from Alpine.js state first
    if (window.Alpine && window.Alpine.store && window.Alpine.store('dashboard')) {
      const dashboard = window.Alpine.store('dashboard');
      if (dashboard.selectedTestSession && dashboard.selectedTestSession.id) {
        return dashboard.selectedTestSession.id;
      }
    }
    
    // Use a default mock ID
    return 'test-session-' + Date.now();
  },

  /**
   * Wait for a specified amount of time
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Clean up all test containers and components
   */
  cleanup() {
    console.log('🧹 Cleaning up reporting test environment...');
    
    // Remove all test containers
    const containers = [
      'reporting-test-container',
      'vpat-test-container', 
      'report-viewer-test-container',
      'export-test-container',
      'analytics-test-container'
    ];
    
    containers.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
    
    // Reset test state
    this.testState = {
      testSessionId: null,
      testInstanceId: null,
      reportingContainer: null,
      vpatContainer: null,
      exportContainer: null,
      analyticsContainer: null
    };
    
    console.log('✅ Cleanup completed');
  },

  /**
   * Show help information
   */
  help() {
    console.log(`
🚀 Reporting Components Test Suite Help
=====================================

Available Commands:
- reportingTest.runDemo()           : Run complete demo workflow
- reportingTest.renderReportingInterface() : Test main interface
- reportingTest.testVPATGenerator() : Test VPAT generation
- reportingTest.testReportViewer()  : Test report viewing
- reportingTest.testExportManager() : Test export functionality
- reportingTest.testProgressCharts(): Test analytics charts
- reportingTest.cleanup()           : Clean up all test components
- reportingTest.help()              : Show this help

Example Usage:
--------------
// Run complete demo
await reportingTest.runDemo();

// Test individual components
await reportingTest.testVPATGenerator();
await reportingTest.testProgressCharts();

// Clean up when done
reportingTest.cleanup();

State Management:
-----------------
// Access React-Alpine bridge state
const state = ReactComponents.getState('reportingState');
console.log('Current reporting state:', state);

// Update state
ReactComponents.setState('reportingState', {
  activeTab: 'analytics',
  selectedSession: 'your-session-id'
});
    `);
  }
};

// Initialize on load
console.log('📊 Reporting Components Test Suite loaded!');
console.log('💡 Type "reportingTest.help()" for usage instructions');
console.log('🚀 Type "reportingTest.runDemo()" to start the demo'); 