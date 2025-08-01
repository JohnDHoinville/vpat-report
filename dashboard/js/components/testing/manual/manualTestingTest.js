/**
 * Manual Testing Test Suite
 * 
 * Browser console utilities for testing manual testing React components.
 * 
 * Usage in browser console:
 * - manualTestingTest.runDemo() - Full workflow demonstration
 * - manualTestingTest.renderInterface() - Render the manual testing interface
 * - manualTestingTest.simulateSession() - Create a mock manual testing session
 * - manualTestingTest.simulateAssignments() - Create mock test assignments
 * - manualTestingTest.openTestReview() - Open a test review modal
 * - manualTestingTest.showStatusManager() - Show the status management view
 */

window.manualTestingTest = {
  
  /**
   * Run a complete demonstration of the manual testing workflow
   */
  runDemo: async () => {
    console.log('🧪 Starting Manual Testing Demo...');
    
    try {
      // Step 1: Ensure project is selected
      if (!window.alpineReactBridge) {
        console.error('❌ Alpine React bridge not available');
        return;
      }

      const selectedProject = window.alpineReactBridge.getState('selectedProject');
      if (!selectedProject) {
        console.log('📋 Setting up demo project...');
        window.alpineReactBridge.setState('selectedProject', {
          id: 'demo-project-manual',
          name: 'Manual Testing Demo Project',
          description: 'Demo project for manual testing workflow',
          primary_url: 'https://example.com',
          compliance_standard: 'wcag_2_2_aa'
        });
      }

      // Step 2: Render the interface
      await manualTestingTest.renderInterface();
      
      // Step 3: Wait and simulate session
      setTimeout(() => {
        manualTestingTest.simulateSession();
      }, 1000);
      
      // Step 4: Wait and simulate assignments
      setTimeout(() => {
        manualTestingTest.simulateAssignments();
      }, 2000);
      
      // Step 5: Wait and show different views
      setTimeout(() => {
        console.log('✅ Manual Testing Demo completed! Try:');
        console.log('   • manualTestingTest.openTestReview() - Open test modal');
        console.log('   • manualTestingTest.showStatusManager() - View status manager');
        console.log('   • manualTestingTest.simulateBulkAction() - Test bulk operations');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  },

  /**
   * Render the manual testing interface in the testing portals container
   */
  renderInterface: () => {
    console.log('🎨 Rendering Manual Testing Interface...');
    
    if (!window.ReactComponents) {
      console.error('❌ ReactComponents not available');
      return false;
    }

    const container = document.getElementById('react-testing-portals');
    if (!container) {
      console.error('❌ Testing portals container not found');
      return false;
    }

    // Clear container
    container.innerHTML = '<div id="manual-testing-interface"></div>';
    
    try {
      const instanceId = window.ReactComponents.render(
        'ManualTestingInterface',
        {},
        'manual-testing-interface',
        { portal: true }
      );
      
      console.log('✅ Manual Testing Interface rendered with ID:', instanceId);
      return instanceId;
    } catch (error) {
      console.error('❌ Failed to render interface:', error);
      return false;
    }
  },

  /**
   * Simulate a manual testing session
   */
  simulateSession: () => {
    console.log('📝 Creating mock manual testing session...');
    
    const mockSession = {
      id: 'manual-session-demo',
      name: 'Demo Manual Testing Session',
      description: 'Comprehensive accessibility testing session',
      project_id: 'demo-project-manual',
      status: 'active',
      created_at: new Date().toISOString(),
      test_types: ['manual'],
      conformance_levels: ['wcag_2_2_aa'],
      total_tests: 25,
      completed_tests: 8,
      progress_percentage: 32
    };

    // Set session state
    window.alpineReactBridge.setState('manualTestingSession', mockSession);
    
    // Also sync to legacy Alpine.js state if available
    if (window.dashboardInstance) {
      window.dashboardInstance.manualTestingSession = mockSession;
    }
    
    console.log('✅ Manual testing session created:', mockSession.name);
  },

  /**
   * Simulate test assignments for the session
   */
  simulateAssignments: () => {
    console.log('📋 Creating mock test assignments...');
    
    const mockAssignments = [
      {
        id: 'test-1',
        criterion_number: '1.1.1',
        title: 'Non-text Content',
        description: 'All non-text content has appropriate text alternatives',
        page_id: 'page-1',
        page_title: 'Homepage',
        page_url: 'https://example.com/',
        status: 'pending',
        wcag_level: 'A',
        test_method: 'manual',
        assignee: null,
        priority: 'high',
        estimated_time: 15,
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-2',
        criterion_number: '1.4.3',
        title: 'Contrast (Minimum)',
        description: 'Text has sufficient color contrast ratio',
        page_id: 'page-1',
        page_title: 'Homepage',
        page_url: 'https://example.com/',
        status: 'in_progress',
        wcag_level: 'AA',
        test_method: 'manual',
        assignee: 'user1',
        priority: 'medium',
        estimated_time: 10,
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-3',
        criterion_number: '2.1.1',
        title: 'Keyboard',
        description: 'All functionality available via keyboard',
        page_id: 'page-2',
        page_title: 'Contact Form',
        page_url: 'https://example.com/contact',
        status: 'completed',
        wcag_level: 'A',
        test_method: 'manual',
        assignee: 'user2',
        priority: 'high',
        estimated_time: 20,
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-4',
        criterion_number: '3.3.2',
        title: 'Labels or Instructions',
        description: 'Form fields have appropriate labels',
        page_id: 'page-2',
        page_title: 'Contact Form',
        page_url: 'https://example.com/contact',
        status: 'needs_review',
        wcag_level: 'A',
        test_method: 'manual',
        assignee: 'user1',
        priority: 'medium',
        estimated_time: 12,
        updated_at: new Date().toISOString()
      }
    ];

    // Set assignments state
    window.alpineReactBridge.setState('manualTestingAssignments', mockAssignments);
    
    // Also sync to legacy Alpine.js state if available
    if (window.dashboardInstance) {
      window.dashboardInstance.manualTestingAssignments = mockAssignments;
    }
    
    console.log('✅ Manual testing assignments created:', mockAssignments.length, 'tests');
    return mockAssignments;
  },

  /**
   * Open the test review modal for a specific test
   */
  openTestReview: (testId = 'test-1') => {
    console.log('🔍 Opening test review modal for test:', testId);
    
    const assignments = window.alpineReactBridge.getState('manualTestingAssignments', []);
    const testToReview = assignments.find(test => test.id === testId);
    
    if (!testToReview) {
      console.error('❌ Test not found:', testId);
      return;
    }

    // Set current test
    window.alpineReactBridge.setState('currentManualTest', testToReview);
    
    // Create mock testing procedure
    const mockProcedure = {
      id: testToReview.criterion_number,
      title: testToReview.title,
      description: testToReview.description,
      instructions: `
        <h4>Testing Procedure for ${testToReview.criterion_number}</h4>
        <ol>
          <li>Navigate to the page: <a href="${testToReview.page_url}" target="_blank">${testToReview.page_url}</a></li>
          <li>Identify all relevant elements for this criterion</li>
          <li>Test each element according to WCAG ${testToReview.wcag_level} standards</li>
          <li>Document any violations or issues found</li>
          <li>Capture evidence (screenshots, element selectors)</li>
        </ol>
        <p><strong>Expected Outcome:</strong> All elements should meet the success criteria requirements.</p>
      `,
      wcag_reference: `https://www.w3.org/WAI/WCAG22/Understanding/${testToReview.criterion_number.replace('.', '')}.html`
    };
    
    window.alpineReactBridge.setState('manualTestingProcedure', mockProcedure);
    
    // Create mock context (related automated findings)
    const mockContext = {
      automated_findings: [
        {
          tool: 'axe-core',
          rule_id: 'color-contrast',
          severity: 'serious',
          description: 'Elements must have sufficient color contrast',
          element_count: 3,
          elements: ['button.submit', 'a.nav-link', 'span.error']
        }
      ],
      related_tests: [
        {
          criterion: '1.4.6',
          title: 'Contrast (Enhanced)',
          status: 'pending'
        }
      ]
    };
    
    window.alpineReactBridge.setState('manualTestingContext', mockContext);
    
    // Show the modal
    window.alpineReactBridge.setState('showManualTestingModal', true);
    
    // Also sync to legacy Alpine.js state if available
    if (window.dashboardInstance) {
      window.dashboardInstance.currentManualTest = testToReview;
      window.dashboardInstance.showManualTestingModal = true;
    }
    
    console.log('✅ Test review modal opened for:', testToReview.title);
  },

  /**
   * Show the status manager view
   */
  showStatusManager: () => {
    console.log('📊 Switching to status manager view...');
    
    // This would typically be handled by the ManualTestingInterface component's view switching
    // For testing, we can trigger it by updating the interface state
    console.log('💡 In the actual interface, use the "Status" tab to view the TestStatusManager');
    console.log('💡 The StatusManager shows progress overview, bulk actions, and filtering');
  },

  /**
   * Simulate bulk action on selected tests
   */
  simulateBulkAction: () => {
    console.log('⚡ Simulating bulk action...');
    
    const assignments = window.alpineReactBridge.getState('manualTestingAssignments', []);
    const selectedTests = assignments.slice(0, 2).map(test => test.id);
    
    console.log('📝 Selected tests for bulk action:', selectedTests);
    console.log('💡 In the real interface, you would:');
    console.log('   1. Select tests using checkboxes');
    console.log('   2. Choose an action (assign, mark complete, etc.)');
    console.log('   3. Apply the action to all selected tests');
    
    // Simulate updating the test statuses
    const updatedAssignments = assignments.map(test => {
      if (selectedTests.includes(test.id)) {
        return { ...test, status: 'in_progress', assignee: 'user1' };
      }
      return test;
    });
    
    window.alpineReactBridge.setState('manualTestingAssignments', updatedAssignments);
    console.log('✅ Bulk action simulated - tests marked as in progress');
  },

  /**
   * Clean up demo data
   */
  cleanup: () => {
    console.log('🧹 Cleaning up manual testing demo data...');
    
    // Reset states
    window.alpineReactBridge.setState('manualTestingSession', null);
    window.alpineReactBridge.setState('manualTestingAssignments', []);
    window.alpineReactBridge.setState('currentManualTest', null);
    window.alpineReactBridge.setState('showManualTestingModal', false);
    window.alpineReactBridge.setState('manualTestingProcedure', null);
    window.alpineReactBridge.setState('manualTestingContext', null);
    
    // Clear interface
    const container = document.getElementById('react-testing-portals');
    if (container) {
      container.innerHTML = '';
    }
    
    console.log('✅ Manual testing demo cleaned up');
  },

  /**
   * Show available test functions
   */
  help: () => {
    console.log('🔧 Manual Testing Test Functions:');
    console.log('  • manualTestingTest.runDemo() - Full workflow demo');
    console.log('  • manualTestingTest.renderInterface() - Render interface');
    console.log('  • manualTestingTest.simulateSession() - Create mock session');
    console.log('  • manualTestingTest.simulateAssignments() - Create mock assignments');
    console.log('  • manualTestingTest.openTestReview() - Open test modal');
    console.log('  • manualTestingTest.showStatusManager() - Show status view');
    console.log('  • manualTestingTest.simulateBulkAction() - Test bulk operations');
    console.log('  • manualTestingTest.cleanup() - Clean up demo data');
    console.log('');
    console.log('💡 Start with: manualTestingTest.runDemo()');
  }
};

// Auto-show help on load
console.log('🧪 Manual Testing Test Suite loaded!');
console.log('💡 Run manualTestingTest.help() to see available functions');
console.log('🚀 Quick start: manualTestingTest.runDemo()');

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.manualTestingTest;
} 