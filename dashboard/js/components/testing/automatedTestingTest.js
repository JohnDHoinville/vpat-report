/**
 * Automated Testing React Components Test Utilities
 * 
 * Test functions to demonstrate and verify React component functionality
 * in the browser console.
 */

window.automatedTestingTest = {
  
  /**
   * Render the complete Automated Testing interface
   */
  renderInterface: () => {
    const container = document.getElementById('react-testing-portals');
    if (!container) {
      console.error('❌ Portal container not found: react-testing-portals');
      return;
    }

    try {
      const instanceId = window.ReactComponents.render(
        'AutomatedTestingInterface',
        {},
        container
      );
      console.log('✅ Automated Testing Interface rendered with ID:', instanceId);
      return instanceId;
    } catch (error) {
      console.error('❌ Failed to render Automated Testing Interface:', error);
    }
  },

  /**
   * Initialize testing state with test data
   */
  initializeTestData: () => {
    try {
      // Set test project (sync with project state)
      window.ReactComponents.setState('projectState', {
        selectedProject: 'test-project-1',
        currentProject: {
          id: 'test-project-1',
          name: 'E-commerce Website',
          primary_url: 'https://example-store.com',
          compliance_standard: 'wcag_2_2_aa'
        }
      });

      // Set testing state with sample data
      window.ReactComponents.setState('testingState', {
        selectedProject: 'test-project-1',
        currentProject: {
          id: 'test-project-1',
          name: 'E-commerce Website',
          primary_url: 'https://example-store.com',
          compliance_standard: 'wcag_2_2_aa'
        },
        automatedTestingInProgress: false,
        testingConfig: {
          useAxe: true,
          usePa11y: true,
          useLighthouse: false,
          wcagLevel: 'AA',
          browser: 'chromium'
        },
        testingProgress: null,
        automationProgress: null,
        automatedTestResults: [
          {
            id: 'test-result-1',
            test_name: 'WCAG 2.2 AA Compliance Test',
            status: 'completed',
            pages_tested: 15,
            total_violations: 8,
            wcag_level: 'AA',
            test_duration_ms: 45000,
            compliance_score: 87.5,
            session_id: 'session-1',
            created_at: '2025-08-01T00:30:00Z'
          },
          {
            id: 'test-result-2',
            test_name: 'Automated Accessibility Scan',
            status: 'completed',
            pages_tested: 8,
            total_violations: 12,
            wcag_level: 'AA',
            test_duration_ms: 28000,
            compliance_score: 72.3,
            session_id: 'session-2',
            created_at: '2025-07-31T18:15:00Z'
          },
          {
            id: 'test-result-3',
            test_name: 'Quick Accessibility Check',
            status: 'failed',
            pages_tested: 3,
            total_violations: 25,
            wcag_level: 'AA',
            test_duration_ms: 12000,
            compliance_score: 45.2,
            session_id: 'session-3',
            created_at: '2025-07-31T14:22:00Z'
          }
        ],
        showTestGrid: false,
        selectedTestSession: null,
        testGridInstances: [],
        loadingTestInstances: false,
        showAdvancedConfig: false
      });

      console.log('✅ Test data initialized for Automated Testing components');
    } catch (error) {
      console.error('❌ Failed to initialize test data:', error);
    }
  },

  /**
   * Simulate testing in progress
   */
  simulateTestingInProgress: () => {
    try {
      // Set testing in progress
      window.ReactComponents.setState('testingState', {
        automatedTestingInProgress: true,
        testingProgress: {
          percentage: 25,
          message: 'Testing homepage accessibility...',
          completedPages: 3,
          totalPages: 12,
          currentPage: 'https://example-store.com/products',
          estimatedTimeRemaining: 180
        }
      });

      // Simulate progress updates
      let progress = 25;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Complete testing
          window.ReactComponents.setState('testingState', {
            automatedTestingInProgress: false,
            testingProgress: {
              percentage: 100,
              message: 'Testing completed successfully!',
              completedPages: 12,
              totalPages: 12,
              currentPage: '',
              estimatedTimeRemaining: 0
            }
          });
          
          console.log('✅ Testing simulation completed');
        } else {
          window.ReactComponents.setState('testingState', {
            testingProgress: {
              percentage: Math.min(progress, 100),
              message: `Testing page ${Math.floor(progress / 8.33) + 1} of 12...`,
              completedPages: Math.floor(progress / 8.33),
              totalPages: 12,
              currentPage: `https://example-store.com/page-${Math.floor(progress / 8.33) + 1}`,
              estimatedTimeRemaining: Math.max(0, Math.floor((100 - progress) * 2))
            }
          });
        }
      }, 2000);

      console.log('✅ Testing simulation started');
      return interval;
    } catch (error) {
      console.error('❌ Failed to simulate testing:', error);
    }
  },

  /**
   * Simulate automation progress updates (WebSocket-style)
   */
  simulateAutomationProgress: () => {
    try {
      window.ReactComponents.setState('testingState', {
        automatedTestingInProgress: true,
        automationProgress: {
          run_id: 'test-run-12345678',
          session_name: 'E-commerce WCAG Testing',
          total_instances: 45,
          completed_instances: 12,
          current_status: 'Running axe-core tests on product pages',
          current_instance_info: {
            page_title: 'Product Detail - Wireless Headphones',
            url: 'https://example-store.com/products/wireless-headphones',
            criterion_number: '1.4.3'
          },
          tools: ['axe-core', 'pa11y'],
          started_at: new Date().toISOString()
        }
      });

      console.log('✅ Automation progress simulation active');
    } catch (error) {
      console.error('❌ Failed to simulate automation progress:', error);
    }
  },

  /**
   * Show test grid with sample data
   */
  showTestGrid: () => {
    try {
      const testInstances = [
        {
          id: 'instance-1',
          criterion_number: '1.1.1',
          requirement_title: 'Non-text Content',
          page_title: 'Homepage',
          page_url: 'https://example-store.com/',
          status: 'pass',
          test_method: 'automated'
        },
        {
          id: 'instance-2',
          criterion_number: '1.4.3',
          requirement_title: 'Contrast (Minimum)',
          page_title: 'Product Page',
          page_url: 'https://example-store.com/products/shoes',
          status: 'fail',
          test_method: 'automated'
        },
        {
          id: 'instance-3',
          criterion_number: '2.1.1',
          requirement_title: 'Keyboard',
          page_title: 'Checkout',
          page_url: 'https://example-store.com/checkout',
          status: 'needs_review',
          test_method: 'manual'
        },
        {
          id: 'instance-4',
          criterion_number: '3.3.2',
          requirement_title: 'Labels or Instructions',
          page_title: 'Contact Form',
          page_url: 'https://example-store.com/contact',
          status: 'not_tested',
          test_method: 'automated'
        }
      ];

      window.ReactComponents.setState('testingState', {
        showTestGrid: true,
        selectedTestSession: {
          id: 'session-1',
          name: 'WCAG 2.2 AA Compliance Test'
        },
        testGridInstances: testInstances,
        loadingTestInstances: false
      });

      console.log('✅ Test grid opened with sample data');
    } catch (error) {
      console.error('❌ Failed to show test grid:', error);
    }
  },

  /**
   * Hide test grid
   */
  hideTestGrid: () => {
    try {
      window.ReactComponents.setState('testingState', {
        showTestGrid: false,
        selectedTestSession: null,
        testGridInstances: [],
        loadingTestInstances: false
      });
      console.log('✅ Test grid closed');
    } catch (error) {
      console.error('❌ Failed to hide test grid:', error);
    }
  },

  /**
   * Update testing configuration
   */
  updateConfig: (config = {}) => {
    try {
      const currentState = window.ReactComponents.getState('testingState');
      const newConfig = { ...currentState.testingConfig, ...config };
      
      window.ReactComponents.setState('testingState', {
        testingConfig: newConfig
      });
      
      console.log('✅ Testing configuration updated:', newConfig);
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
    }
  },

  /**
   * Cleanup - remove all React components
   */
  cleanup: () => {
    try {
      const container = document.getElementById('react-testing-portals');
      if (container) {
        container.innerHTML = '';
        console.log('✅ Automated Testing components cleaned up');
      }
    } catch (error) {
      console.error('❌ Failed to cleanup components:', error);
    }
  },

  /**
   * Get current state for debugging
   */
  getState: () => {
    try {
      const testingState = window.ReactComponents.getState('testingState');
      const projectState = window.ReactComponents.getState('projectState');
      
      console.log('📊 Current State:');
      console.log('Testing State:', testingState);
      console.log('Project State:', projectState);
      
      return { testingState, projectState };
    } catch (error) {
      console.error('❌ Failed to get state:', error);
    }
  },

  /**
   * Run a complete demo
   */
  runDemo: async () => {
    console.log('🎬 Starting Automated Testing Interface Demo...');
    
    try {
      // 1. Initialize test data
      automatedTestingTest.initializeTestData();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. Render interface
      automatedTestingTest.renderInterface();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Show some testing progress
      automatedTestingTest.simulateAutomationProgress();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Show test grid
      automatedTestingTest.showTestGrid();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. Hide test grid
      automatedTestingTest.hideTestGrid();
      
      console.log('🎉 Demo complete! Try these commands:');
      console.log('  automatedTestingTest.simulateTestingInProgress() - Simulate testing');
      console.log('  automatedTestingTest.showTestGrid() - Open test grid');
      console.log('  automatedTestingTest.updateConfig({wcagLevel: "AAA"}) - Update config');
      console.log('  automatedTestingTest.getState() - View current state');
      console.log('  automatedTestingTest.cleanup() - Remove components');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
};

console.log('🧪 Automated Testing Test Utilities loaded!');
console.log('💡 Usage: automatedTestingTest.runDemo() to start');
console.log('📚 Available commands:', Object.keys(window.automatedTestingTest)); 