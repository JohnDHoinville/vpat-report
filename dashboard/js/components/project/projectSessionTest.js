/**
 * Project/Session React Components Test Utilities
 * 
 * Test functions to demonstrate and verify React component functionality
 * in the browser console.
 */

window.projectSessionTest = {
  
  /**
   * Render the complete Project/Session interface
   */
  renderInterface: () => {
    const container = document.getElementById('react-project-session-portals');
    if (!container) {
      console.error('❌ Portal container not found: react-project-session-portals');
      return;
    }

    try {
      const instanceId = window.ReactComponents.render(
        'ProjectSessionInterface',
        {},
        container
      );
      console.log('✅ Project/Session Interface rendered with ID:', instanceId);
      return instanceId;
    } catch (error) {
      console.error('❌ Failed to render Project/Session Interface:', error);
    }
  },

  /**
   * Initialize project state with test data
   */
  initializeTestData: () => {
    try {
      // Set test projects
      window.ReactComponents.setState('projectState', {
        projects: [
          {
            id: 'test-project-1',
            name: 'E-commerce Website',
            description: 'Main e-commerce platform for online sales',
            primary_url: 'https://example-store.com',
            compliance_standard: 'wcag_2_2_aa',
            testing_sessions_count: 3
          },
          {
            id: 'test-project-2',
            name: 'Corporate Portal',
            description: 'Internal employee portal and HR system',
            primary_url: 'https://portal.company.com',
            compliance_standard: 'section_508',
            testing_sessions_count: 1
          },
          {
            id: 'test-project-3',
            name: 'Public Website',
            description: 'Public-facing marketing and information site',
            primary_url: 'https://company.com',
            compliance_standard: 'both',
            testing_sessions_count: 0
          }
        ],
        selectedProject: null,
        currentProject: null,
        showCreateProject: false,
        loading: false,
        activeTab: 'projects'
      });

      // Set test sessions for when a project is selected
      window.ReactComponents.setState('sessionState', {
        testingSessions: [
          {
            id: 'session-1',
            name: 'WCAG 2.2 AA Compliance Audit',
            description: 'Comprehensive accessibility audit for WCAG 2.2 AA conformance',
            status: 'in_progress',
            priority: 'high',
            conformance_levels: ['wcag_22_aa'],
            total_test_instances: 150,
            passed_tests: 120,
            failed_tests: 15,
            created_at: '2025-01-15T10:00:00Z'
          },
          {
            id: 'session-2', 
            name: 'Section 508 Review',
            description: 'Federal compliance testing for Section 508 standards',
            status: 'completed',
            priority: 'medium',
            conformance_levels: ['section_508'],
            total_test_instances: 85,
            passed_tests: 80,
            failed_tests: 5,
            created_at: '2025-01-10T14:30:00Z'
          }
        ],
        selectedProject: null,
        currentProject: null,
        showSessionWizard: false,
        showCreateTestingSession: false,
        loading: false,
        activeTab: 'testing-sessions'
      });

      console.log('✅ Test data initialized for Project/Session components');
    } catch (error) {
      console.error('❌ Failed to initialize test data:', error);
    }
  },

  /**
   * Select a test project
   */
  selectTestProject: (projectId = 'test-project-1') => {
    try {
      const projectState = window.ReactComponents.getState('projectState');
      const project = projectState.projects.find(p => p.id === projectId);
      
      if (!project) {
        console.error(`❌ Project not found: ${projectId}`);
        return;
      }

      // Update both project and session state
      window.ReactComponents.setState('projectState', {
        selectedProject: projectId,
        currentProject: project
      });

      window.ReactComponents.setState('sessionState', {
        selectedProject: projectId,
        currentProject: project
      });

      console.log(`✅ Selected project: ${project.name} (${projectId})`);
    } catch (error) {
      console.error('❌ Failed to select project:', error);
    }
  },

  /**
   * Show create project modal
   */
  showCreateProject: () => {
    try {
      window.ReactComponents.setState('projectState', {
        showCreateProject: true
      });
      console.log('✅ Create project modal opened');
    } catch (error) {
      console.error('❌ Failed to show create project modal:', error);
    }
  },

  /**
   * Show create session wizard
   */
  showCreateSession: () => {
    try {
      window.ReactComponents.setState('sessionState', {
        showSessionWizard: true
      });
      console.log('✅ Create session wizard opened');
    } catch (error) {
      console.error('❌ Failed to show create session wizard:', error);
    }
  },

  /**
   * Switch to projects tab
   */
  switchToProjects: () => {
    try {
      window.ReactComponents.setState('projectState', {
        activeTab: 'projects'
      });
      console.log('✅ Switched to projects tab');
    } catch (error) {
      console.error('❌ Failed to switch to projects tab:', error);
    }
  },

  /**
   * Switch to sessions tab
   */
  switchToSessions: () => {
    try {
      window.ReactComponents.setState('sessionState', {
        activeTab: 'testing-sessions'
      });
      console.log('✅ Switched to sessions tab');
    } catch (error) {
      console.error('❌ Failed to switch to sessions tab:', error);
    }
  },

  /**
   * Cleanup - remove all React components
   */
  cleanup: () => {
    try {
      const container = document.getElementById('react-project-session-portals');
      if (container) {
        container.innerHTML = '';
        console.log('✅ Project/Session components cleaned up');
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
      const projectState = window.ReactComponents.getState('projectState');
      const sessionState = window.ReactComponents.getState('sessionState');
      
      console.log('📊 Current State:');
      console.log('Project State:', projectState);
      console.log('Session State:', sessionState);
      
      return { projectState, sessionState };
    } catch (error) {
      console.error('❌ Failed to get state:', error);
    }
  },

  /**
   * Run a complete demo
   */
  runDemo: async () => {
    console.log('🎬 Starting Project/Session Interface Demo...');
    
    try {
      // 1. Initialize test data
      projectSessionTest.initializeTestData();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 2. Render interface
      projectSessionTest.renderInterface();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Select a project
      projectSessionTest.selectTestProject('test-project-1');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Switch to sessions tab
      projectSessionTest.switchToSessions();
      
      console.log('🎉 Demo complete! Try these commands:');
      console.log('  projectSessionTest.showCreateProject() - Open create project modal');
      console.log('  projectSessionTest.showCreateSession() - Open create session wizard');
      console.log('  projectSessionTest.selectTestProject("test-project-2") - Select different project');
      console.log('  projectSessionTest.getState() - View current state');
      console.log('  projectSessionTest.cleanup() - Remove components');
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
};

console.log('🧪 Project/Session Test Utilities loaded!');
console.log('💡 Usage: projectSessionTest.runDemo() to start');
console.log('📚 Available commands:', Object.keys(window.projectSessionTest)); 