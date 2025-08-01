/**
 * Testing Store
 * 
 * Manages automated and manual testing state, including test execution,
 * progress tracking, and results management.
 */

import { useGlobalState, useGlobalDispatch, actions } from './GlobalStateContext.jsx';
import { useCallback } from 'react';

// Testing store hook
export function useTestingStore() {
  const state = useGlobalState();
  const dispatch = useGlobalDispatch();
  
  const automatedState = state.testing.automated;
  const manualState = state.testing.manual;
  
  // Automated testing actions
  const automatedActions = {
    // Load test sessions
    loadTestSessions: useCallback(async () => {
      dispatch(actions.setTestingLoading(true));
      
      try {
        const response = await window.DashboardAPI.testingSessions.getAll();
        
        if (response.success) {
          dispatch(actions.setTestSessions(response.data));
          
          // Sync with Alpine.js
          if (window.dashboardInstance) {
            window.dashboardInstance.testingSessions = response.data;
          }
          
          return { success: true, sessions: response.data };
        } else {
          throw new Error(response.message || 'Failed to load test sessions');
        }
      } catch (error) {
        console.error('Error loading test sessions:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: 'Failed to load test sessions. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setTestingLoading(false));
      }
    }, [dispatch]),
    
    // Run automated tests
    runAutomatedTests: useCallback(async (sessionId, configuration = {}) => {
      dispatch(actions.setTestingRunning(true));
      
      try {
        const testConfig = {
          ...automatedState.configuration,
          ...configuration
        };
        
        const response = await window.DashboardAPI.automatedTesting.run(sessionId, testConfig);
        
        if (response.success) {
          // Start progress monitoring
          automatedActions.startProgressMonitoring(sessionId);
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Automated testing started successfully!',
            timeout: 3000
          }));
          
          return { success: true, runId: response.runId };
        } else {
          throw new Error(response.message || 'Failed to start automated tests');
        }
      } catch (error) {
        console.error('Error running automated tests:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to start automated tests. Please try again.',
          timeout: 5000
        }));
        
        dispatch(actions.setTestingRunning(false));
        return { success: false, error: error.message };
      }
    }, [dispatch, automatedState.configuration]),
    
    // Start progress monitoring
    startProgressMonitoring: useCallback((sessionId) => {
      // Clear any existing interval
      if (window.testingProgressInterval) {
        clearInterval(window.testingProgressInterval);
      }
      
      // Start new interval
      window.testingProgressInterval = setInterval(async () => {
        try {
          const response = await window.DashboardAPI.automatedTesting.getProgress(sessionId);
          
          if (response.success) {
            dispatch(actions.setAutomationProgress(response.data));
            
            // Stop monitoring if tests are complete or failed
            if (response.data.status === 'completed' || response.data.status === 'failed') {
              automatedActions.stopProgressMonitoring();
              dispatch(actions.setTestingRunning(false));
              
              // Load updated results
              await automatedActions.loadTestResults(sessionId);
              
              // Show completion notification
              dispatch(actions.addNotification({
                type: response.data.status === 'completed' ? 'success' : 'error',
                message: response.data.status === 'completed' 
                  ? 'Automated testing completed successfully!'
                  : 'Automated testing failed. Please check the logs.',
                timeout: 5000
              }));
            }
          }
        } catch (error) {
          console.error('Error monitoring progress:', error);
        }
      }, 2000); // Check every 2 seconds
    }, [dispatch]),
    
    // Stop progress monitoring
    stopProgressMonitoring: useCallback(() => {
      if (window.testingProgressInterval) {
        clearInterval(window.testingProgressInterval);
        window.testingProgressInterval = null;
      }
    }, []),
    
    // Load test results
    loadTestResults: useCallback(async (sessionId) => {
      try {
        const response = await window.DashboardAPI.automatedTesting.getResults(sessionId);
        
        if (response.success) {
          dispatch(actions.setTestResults(response.data));
          return { success: true, results: response.data };
        } else {
          throw new Error(response.message || 'Failed to load test results');
        }
      } catch (error) {
        console.error('Error loading test results:', error);
        return { success: false, error: error.message };
      }
    }, [dispatch]),
    
    // Update test configuration
    updateConfiguration: useCallback((updates) => {
      dispatch(actions.setTestConfiguration({
        ...automatedState.configuration,
        ...updates
      }));
    }, [dispatch, automatedState.configuration]),
    
    // Show/hide test configuration modal
    showTestConfiguration: useCallback(() => {
      dispatch(actions.showTestConfiguration());
    }, [dispatch]),
    
    hideTestConfiguration: useCallback(() => {
      dispatch(actions.hideTestConfiguration());
    }, [dispatch])
  };
  
  // Manual testing actions
  const manualActions = {
    // Load manual test sessions
    loadManualSessions: useCallback(async () => {
      dispatch(actions.setManualLoading(true));
      
      try {
        const response = await window.DashboardAPI.manualTesting.getSessions();
        
        if (response.success) {
          dispatch(actions.setManualSessions(response.data));
          return { success: true, sessions: response.data };
        } else {
          throw new Error(response.message || 'Failed to load manual test sessions');
        }
      } catch (error) {
        console.error('Error loading manual sessions:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: 'Failed to load manual test sessions. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setManualLoading(false));
      }
    }, [dispatch]),
    
    // Load test assignments
    loadAssignments: useCallback(async (sessionId) => {
      dispatch(actions.setManualLoading(true));
      
      try {
        const response = await window.DashboardAPI.manualTesting.getAssignments(sessionId);
        
        if (response.success) {
          dispatch(actions.setAssignments(response.data));
          return { success: true, assignments: response.data };
        } else {
          throw new Error(response.message || 'Failed to load assignments');
        }
      } catch (error) {
        console.error('Error loading assignments:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: 'Failed to load assignments. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setManualLoading(false));
      }
    }, [dispatch]),
    
    // Submit test result
    submitTestResult: useCallback(async (testInstanceId, result) => {
      dispatch(actions.setManualLoading(true));
      
      try {
        const response = await window.DashboardAPI.manualTesting.submitResult(testInstanceId, result);
        
        if (response.success) {
          // Reload assignments to get updated data
          if (manualState.selectedSession) {
            await manualActions.loadAssignments(manualState.selectedSession.id);
          }
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Test result submitted successfully!',
            timeout: 3000
          }));
          
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to submit test result');
        }
      } catch (error) {
        console.error('Error submitting test result:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to submit test result. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setManualLoading(false));
      }
    }, [dispatch, manualState.selectedSession]),
    
    // Upload evidence
    uploadEvidence: useCallback(async (testInstanceId, files, description) => {
      dispatch(actions.setManualLoading(true));
      
      try {
        const response = await window.DashboardAPI.manualTesting.uploadEvidence(
          testInstanceId, 
          files, 
          description
        );
        
        if (response.success) {
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Evidence uploaded successfully!',
            timeout: 3000
          }));
          
          return { success: true, evidence: response.data };
        } else {
          throw new Error(response.message || 'Failed to upload evidence');
        }
      } catch (error) {
        console.error('Error uploading evidence:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to upload evidence. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setManualLoading(false));
      }
    }, [dispatch]),
    
    // Set filters
    setFilters: useCallback((filters) => {
      dispatch(actions.setManualFilters(filters));
    }, [dispatch]),
    
    // Select session
    selectManualSession: useCallback(async (session) => {
      dispatch(actions.setManualSelectedSession(session));
      
      if (session) {
        await manualActions.loadAssignments(session.id);
      }
    }, [dispatch])
  };
  
  // Computed values
  const computed = {
    // Automated testing
    isAutomatedTestingRunning: automatedState.running,
    automatedProgress: automatedState.automationProgress?.progress || 0,
    automatedStatus: automatedState.automationProgress?.status || 'idle',
    hasAutomatedResults: automatedState.testResults.length > 0,
    
    // Manual testing
    isManualTestingLoading: manualState.loading,
    hasManualSessions: manualState.sessions.length > 0,
    hasAssignments: manualState.assignments.length > 0,
    filteredAssignmentsCount: manualState.filteredAssignments.length,
    
    // Statistics
    getTestingStats: (sessionId) => {
      const automatedResults = automatedState.testResults.filter(r => r.session_id === sessionId);
      const manualAssignments = manualState.assignments.filter(a => a.session_id === sessionId);
      
      return {
        automated: {
          total: automatedResults.length,
          passed: automatedResults.filter(r => r.status === 'passed').length,
          failed: automatedResults.filter(r => r.status === 'failed').length,
          warning: automatedResults.filter(r => r.status === 'warning').length
        },
        manual: {
          total: manualAssignments.length,
          completed: manualAssignments.filter(a => a.status === 'completed').length,
          inProgress: manualAssignments.filter(a => a.status === 'in_progress').length,
          pending: manualAssignments.filter(a => a.status === 'pending').length
        }
      };
    },
    
    // Progress calculations
    getOverallProgress: (sessionId) => {
      const stats = computed.getTestingStats(sessionId);
      const totalTests = stats.automated.total + stats.manual.total;
      
      if (totalTests === 0) return 0;
      
      const completedTests = stats.automated.total + stats.manual.completed;
      return Math.round((completedTests / totalTests) * 100);
    }
  };
  
  return {
    // State
    automated: automatedState,
    manual: manualState,
    
    // Actions
    ...automatedActions,
    ...manualActions,
    
    // Computed values
    ...computed
  };
}

// Utility functions
export const TestingUtils = {
  // Format test status
  formatTestStatus: (status) => {
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'passed': 'Passed',
      'failed': 'Failed',
      'warning': 'Warning',
      'skipped': 'Skipped'
    };
    return statusMap[status] || status;
  },
  
  // Get status color
  getStatusColor: (status) => {
    const colorMap = {
      'pending': 'gray',
      'in_progress': 'blue',
      'completed': 'green',
      'passed': 'green',
      'failed': 'red',
      'warning': 'yellow',
      'skipped': 'gray'
    };
    return colorMap[status] || 'gray';
  },
  
  // Calculate test score
  calculateTestScore: (results) => {
    if (!results || results.length === 0) return 0;
    
    const passed = results.filter(r => r.status === 'passed').length;
    return Math.round((passed / results.length) * 100);
  },
  
  // Get conformance level display
  formatConformanceLevel: (level) => {
    const levelMap = {
      'A': 'Level A',
      'AA': 'Level AA',
      'AAA': 'Level AAA'
    };
    return levelMap[level] || level;
  },
  
  // Validate test configuration
  validateTestConfiguration: (config) => {
    const errors = [];
    
    if (!config.tools || config.tools.length === 0) {
      errors.push('At least one testing tool must be selected');
    }
    
    if (!config.conformanceLevel) {
      errors.push('Conformance level is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export default useTestingStore; 