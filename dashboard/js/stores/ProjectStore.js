/**
 * Project Store
 * 
 * Manages project and session state, including creation, selection, and management.
 * Integrates with the global state context and Alpine.js bridge.
 */

import { useGlobalState, useGlobalDispatch, actions } from './GlobalStateContext.jsx';
import { useCallback } from 'react';

// Project store hook
export function useProjectStore() {
  const state = useGlobalState();
  const dispatch = useGlobalDispatch();
  
  const projectState = state.projects;
  const sessionState = state.sessions;
  
  // Project actions
  const projectActions = {
    // Load projects
    loadProjects: useCallback(async () => {
      dispatch(actions.setProjectsLoading(true));
      
      try {
        const response = await window.DashboardAPI.projects.getAll();
        
        if (response.success) {
          dispatch(actions.setProjects(response.data));
          
          // Sync with Alpine.js
          if (window.dashboardInstance) {
            window.dashboardInstance.projects = response.data;
          }
          
          return { success: true, projects: response.data };
        } else {
          throw new Error(response.message || 'Failed to load projects');
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: 'Failed to load projects. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setProjectsLoading(false));
      }
    }, [dispatch]),
    
    // Create project
    createProject: useCallback(async (projectData) => {
      dispatch(actions.setProjectsLoading(true));
      
      try {
        const response = await window.DashboardAPI.projects.create(projectData);
        
        if (response.success) {
          // Reload projects to get the updated list
          await projectActions.loadProjects();
          
          dispatch(actions.addNotification({
            type: 'success',
            message: `Project "${projectData.name}" created successfully!`,
            timeout: 3000
          }));
          
          return { success: true, project: response.data };
        } else {
          throw new Error(response.message || 'Failed to create project');
        }
      } catch (error) {
        console.error('Error creating project:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to create project. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setProjectsLoading(false));
      }
    }, [dispatch]),
    
    // Select project
    selectProject: useCallback(async (project) => {
      dispatch(actions.setSelectedProject(project));
      
      // Load sessions for this project
      if (project) {
        await sessionActions.loadSessionsForProject(project.id);
      } else {
        dispatch(actions.setSessions([]));
      }
      
      // Sync with Alpine.js
      if (window.dashboardInstance) {
        window.dashboardInstance.selectedProject = project;
        window.dashboardInstance.currentProject = project;
      }
    }, [dispatch]),
    
    // Update project
    updateProject: useCallback(async (projectId, updates) => {
      dispatch(actions.setProjectsLoading(true));
      
      try {
        const response = await window.DashboardAPI.projects.update(projectId, updates);
        
        if (response.success) {
          // Reload projects to get the updated list
          await projectActions.loadProjects();
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Project updated successfully!',
            timeout: 3000
          }));
          
          return { success: true, project: response.data };
        } else {
          throw new Error(response.message || 'Failed to update project');
        }
      } catch (error) {
        console.error('Error updating project:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to update project. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setProjectsLoading(false));
      }
    }, [dispatch]),
    
    // Delete project
    deleteProject: useCallback(async (projectId) => {
      dispatch(actions.setProjectsLoading(true));
      
      try {
        const response = await window.DashboardAPI.projects.delete(projectId);
        
        if (response.success) {
          // Remove from state
          const updatedProjects = projectState.list.filter(p => p.id !== projectId);
          dispatch(actions.setProjects(updatedProjects));
          
          // Clear selection if deleted project was selected
          if (projectState.selectedProject?.id === projectId) {
            dispatch(actions.setSelectedProject(null));
            dispatch(actions.setSessions([]));
          }
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Project deleted successfully!',
            timeout: 3000
          }));
          
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to delete project');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to delete project. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setProjectsLoading(false));
      }
    }, [dispatch, projectState])
  };
  
  // Session actions
  const sessionActions = {
    // Load sessions for a project
    loadSessionsForProject: useCallback(async (projectId) => {
      dispatch(actions.setSessionsLoading(true));
      
      try {
        const response = await window.DashboardAPI.testingSessions.getByProject(projectId);
        
        if (response.success) {
          dispatch(actions.setSessions(response.data));
          
          // Sync with Alpine.js
          if (window.dashboardInstance) {
            window.dashboardInstance.testingSessions = response.data;
          }
          
          return { success: true, sessions: response.data };
        } else {
          throw new Error(response.message || 'Failed to load sessions');
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: 'Failed to load sessions. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setSessionsLoading(false));
      }
    }, [dispatch]),
    
    // Create session
    createSession: useCallback(async (sessionData) => {
      dispatch(actions.setSessionsLoading(true));
      
      try {
        const response = await window.DashboardAPI.testingSessions.create(sessionData);
        
        if (response.success) {
          // Reload sessions for the current project
          if (projectState.selectedProject) {
            await sessionActions.loadSessionsForProject(projectState.selectedProject.id);
          }
          
          dispatch(actions.addNotification({
            type: 'success',
            message: `Session "${sessionData.name}" created successfully!`,
            timeout: 3000
          }));
          
          // Hide wizard
          dispatch(actions.hideSessionWizard());
          
          return { success: true, session: response.data };
        } else {
          throw new Error(response.message || 'Failed to create session');
        }
      } catch (error) {
        console.error('Error creating session:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to create session. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setSessionsLoading(false));
      }
    }, [dispatch, projectState]),
    
    // Select session
    selectSession: useCallback((session) => {
      dispatch(actions.setSelectedSession(session));
      
      // Sync with Alpine.js
      if (window.dashboardInstance) {
        window.dashboardInstance.selectedSession = session;
        window.dashboardInstance.currentSession = session;
      }
      
      // Show session details modal if session is provided
      if (session) {
        dispatch(actions.showModal('sessionDetails', { sessionId: session.id }));
      }
    }, [dispatch]),
    
    // Delete session
    deleteSession: useCallback(async (sessionId) => {
      dispatch(actions.setSessionsLoading(true));
      
      try {
        const response = await window.DashboardAPI.testingSessions.delete(sessionId);
        
        if (response.success) {
          // Remove from state
          const updatedSessions = sessionState.list.filter(s => s.id !== sessionId);
          dispatch(actions.setSessions(updatedSessions));
          
          // Clear selection if deleted session was selected
          if (sessionState.selectedSession?.id === sessionId) {
            dispatch(actions.setSelectedSession(null));
          }
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Session deleted successfully!',
            timeout: 3000
          }));
          
          return { success: true };
        } else {
          throw new Error(response.message || 'Failed to delete session');
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to delete session. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        dispatch(actions.setSessionsLoading(false));
      }
    }, [dispatch, sessionState]),
    
    // Session wizard management
    showSessionWizard: useCallback(() => {
      dispatch(actions.showSessionWizard());
    }, [dispatch]),
    
    hideSessionWizard: useCallback(() => {
      dispatch(actions.hideSessionWizard());
    }, [dispatch]),
    
    setWizardStep: useCallback((step) => {
      dispatch(actions.setWizardStep(step));
    }, [dispatch]),
    
    setWizardData: useCallback((data) => {
      dispatch(actions.setWizardData(data));
    }, [dispatch]),
    
    nextWizardStep: useCallback(() => {
      dispatch(actions.setWizardStep(sessionState.wizardStep + 1));
    }, [dispatch, sessionState.wizardStep]),
    
    previousWizardStep: useCallback(() => {
      if (sessionState.wizardStep > 1) {
        dispatch(actions.setWizardStep(sessionState.wizardStep - 1));
      }
    }, [dispatch, sessionState.wizardStep])
  };
  
  // Computed values
  const computed = {
    // Projects
    hasProjects: projectState.list.length > 0,
    projectCount: projectState.list.length,
    selectedProjectName: projectState.selectedProject?.name || '',
    
    // Sessions
    hasSessions: sessionState.list.length > 0,
    sessionCount: sessionState.list.length,
    selectedSessionName: sessionState.selectedSession?.name || '',
    
    // Session wizard
    isFirstWizardStep: sessionState.wizardStep === 1,
    isLastWizardStep: sessionState.wizardStep >= 4, // Assuming 4 steps
    wizardProgress: (sessionState.wizardStep / 4) * 100,
    
    // Loading states
    isLoading: projectState.loading || sessionState.loading,
    
    // Statistics
    getProjectStats: (projectId) => {
      if (!projectId) return null;
      
      const project = projectState.list.find(p => p.id === projectId);
      const projectSessions = sessionState.list.filter(s => s.project_id === projectId);
      
      return {
        project,
        sessionCount: projectSessions.length,
        completedSessions: projectSessions.filter(s => s.status === 'completed').length,
        runningSessions: projectSessions.filter(s => s.status === 'running').length,
        lastActivity: projectSessions.length > 0 
          ? Math.max(...projectSessions.map(s => new Date(s.updated_at).getTime()))
          : null
      };
    }
  };
  
  return {
    // State
    projects: projectState,
    sessions: sessionState,
    
    // Actions
    ...projectActions,
    ...sessionActions,
    
    // Computed values
    ...computed
  };
}

// Utility functions
export const ProjectUtils = {
  // Format project status
  formatProjectStatus: (status) => {
    const statusMap = {
      'active': 'Active',
      'archived': 'Archived',
      'draft': 'Draft'
    };
    return statusMap[status] || status;
  },
  
  // Get project color
  getProjectColor: (status) => {
    const colorMap = {
      'active': 'green',
      'archived': 'gray',
      'draft': 'yellow'
    };
    return colorMap[status] || 'blue';
  },
  
  // Format session status
  formatSessionStatus: (status) => {
    const statusMap = {
      'draft': 'Draft',
      'running': 'Running',
      'paused': 'Paused',
      'completed': 'Completed',
      'failed': 'Failed'
    };
    return statusMap[status] || status;
  },
  
  // Get session progress
  getSessionProgress: (session) => {
    if (!session.test_instances_total || session.test_instances_total === 0) {
      return 0;
    }
    
    const completed = session.test_instances_completed || 0;
    return Math.round((completed / session.test_instances_total) * 100);
  },
  
  // Validate wizard data
  validateWizardStep: (step, data) => {
    switch (step) {
      case 1: // Project selection
        return {
          valid: !!data.project_id,
          errors: data.project_id ? [] : ['Please select a project']
        };
        
      case 2: // Basic info
        return {
          valid: !!(data.name && data.conformance_levels?.length),
          errors: [
            ...(!data.name ? ['Session name is required'] : []),
            ...(!data.conformance_levels?.length ? ['At least one conformance level is required'] : [])
          ]
        };
        
      case 3: // Pages selection
        return {
          valid: !!(data.selected_page_ids?.length || data.selected_crawler_ids?.length),
          errors: [
            ...(!data.selected_page_ids?.length && !data.selected_crawler_ids?.length 
              ? ['Please select pages or crawlers for testing'] : [])
          ]
        };
        
      case 4: // Review
        return { valid: true, errors: [] };
        
      default:
        return { valid: false, errors: ['Invalid wizard step'] };
    }
  }
};

export default useProjectStore; 