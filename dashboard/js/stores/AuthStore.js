/**
 * Authentication Store
 * 
 * Manages authentication state, user information, and auth-related UI state.
 * Integrates with the global state context and Alpine.js bridge.
 */

import { useGlobalState, useGlobalDispatch, actions } from './GlobalStateContext.jsx';
import { useCallback } from 'react';

// Authentication store hook
export function useAuthStore() {
  const state = useGlobalState();
  const dispatch = useGlobalDispatch();
  
  const authState = state.auth;
  
  // Action creators
  const authActions = {
    // User management
    setUser: useCallback((user) => {
      dispatch(actions.setUser(user));
      
      // Store user in localStorage for persistence
      if (user) {
        localStorage.setItem('vpat_user', JSON.stringify(user));
        localStorage.setItem('vpat_auth_token', user.token || '');
      } else {
        localStorage.removeItem('vpat_user');
        localStorage.removeItem('vpat_auth_token');
      }
      
      // Sync with Alpine.js if available
      if (window.dashboardInstance) {
        window.dashboardInstance.user = user;
        window.dashboardInstance.isAuthenticated = !!user;
      }
    }, [dispatch]),
    
    // Loading state
    setLoading: useCallback((loading) => {
      dispatch(actions.setAuthLoading(loading));
    }, [dispatch]),
    
    // Modal management
    showLogin: useCallback(() => {
      dispatch(actions.showAuthModal('showLogin'));
    }, [dispatch]),
    
    showProfile: useCallback(() => {
      dispatch(actions.showAuthModal('showProfile'));
    }, [dispatch]),
    
    showChangePassword: useCallback(() => {
      dispatch(actions.showAuthModal('showChangePassword'));
    }, [dispatch]),
    
    hideAllModals: useCallback(() => {
      dispatch(actions.hideAuthModal());
    }, [dispatch]),
    
    // Authentication methods
    login: useCallback(async (credentials) => {
      authActions.setLoading(true);
      
      try {
        const response = await window.DashboardAPI.auth.login(credentials);
        
        if (response.success) {
          const user = {
            id: response.user.id,
            username: response.user.username,
            role: response.user.role,
            token: response.token,
            loginTime: new Date().toISOString()
          };
          
          authActions.setUser(user);
          authActions.hideAllModals();
          
          // Show success notification
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Successfully logged in!',
            timeout: 3000
          }));
          
          return { success: true, user };
        } else {
          throw new Error(response.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Login failed. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        authActions.setLoading(false);
      }
    }, [dispatch]),
    
    logout: useCallback(async () => {
      authActions.setLoading(true);
      
      try {
        // Call logout API if available
        if (window.DashboardAPI?.auth?.logout) {
          await window.DashboardAPI.auth.logout();
        }
        
        // Clear user state
        authActions.setUser(null);
        
        // Clear Alpine.js state
        if (window.dashboardInstance) {
          window.dashboardInstance.user = null;
          window.dashboardInstance.isAuthenticated = false;
          
          // Reset other state that depends on authentication
          window.dashboardInstance.projects = [];
          window.dashboardInstance.testingSessions = [];
        }
        
        // Show success notification
        dispatch(actions.addNotification({
          type: 'info',
          message: 'Successfully logged out',
          timeout: 3000
        }));
        
        return { success: true };
      } catch (error) {
        console.error('Logout error:', error);
        
        // Even if logout API fails, clear local state
        authActions.setUser(null);
        
        return { success: false, error: error.message };
      } finally {
        authActions.setLoading(false);
      }
    }, [dispatch]),
    
    changePassword: useCallback(async (passwordData) => {
      authActions.setLoading(true);
      
      try {
        const response = await window.DashboardAPI.auth.changePassword(passwordData);
        
        if (response.success) {
          authActions.hideAllModals();
          
          dispatch(actions.addNotification({
            type: 'success',
            message: 'Password changed successfully!',
            timeout: 3000
          }));
          
          return { success: true };
        } else {
          throw new Error(response.message || 'Password change failed');
        }
      } catch (error) {
        console.error('Change password error:', error);
        
        dispatch(actions.addNotification({
          type: 'error',
          message: error.message || 'Failed to change password. Please try again.',
          timeout: 5000
        }));
        
        return { success: false, error: error.message };
      } finally {
        authActions.setLoading(false);
      }
    }, [dispatch]),
    
    // Session management
    initializeFromStorage: useCallback(() => {
      try {
        const storedUser = localStorage.getItem('vpat_user');
        const storedToken = localStorage.getItem('vpat_auth_token');
        
        if (storedUser && storedToken) {
          const user = JSON.parse(storedUser);
          
          // Validate token is not expired (basic check)
          if (user.loginTime) {
            const loginTime = new Date(user.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            // Token expires after 24 hours
            if (hoursSinceLogin < 24) {
              authActions.setUser(user);
              return true;
            }
          }
        }
        
        // Clear invalid/expired data
        localStorage.removeItem('vpat_user');
        localStorage.removeItem('vpat_auth_token');
        return false;
      } catch (error) {
        console.error('Error initializing auth from storage:', error);
        return false;
      }
    }, []),
    
    // Token validation
    validateToken: useCallback(async () => {
      const token = localStorage.getItem('vpat_auth_token');
      
      if (!token) {
        return false;
      }
      
      try {
        const response = await window.DashboardAPI.auth.validateToken();
        
        if (response.success) {
          return true;
        } else {
          // Token is invalid, clear auth state
          authActions.setUser(null);
          return false;
        }
      } catch (error) {
        console.error('Token validation error:', error);
        authActions.setUser(null);
        return false;
      }
    }, [])
  };
  
  // Computed values
  const computed = {
    isAuthenticated: !!authState.user,
    userRole: authState.user?.role || 'guest',
    userName: authState.user?.username || '',
    hasValidToken: !!authState.user?.token,
    
    // Permission checks
    canManageProjects: authState.user?.role === 'admin' || authState.user?.role === 'manager',
    canManageUsers: authState.user?.role === 'admin',
    canRunTests: authState.user?.role !== 'viewer',
    canViewReports: true, // All authenticated users can view reports
    
    // UI state helpers
    shouldShowLogin: !authState.user && authState.showLogin,
    shouldShowProfile: !!authState.user && authState.showProfile,
    shouldShowChangePassword: !!authState.user && authState.showChangePassword
  };
  
  return {
    // State
    ...authState,
    
    // Actions
    ...authActions,
    
    // Computed values
    ...computed
  };
}

// Utility functions for authentication
export const AuthUtils = {
  // Get current user from localStorage
  getCurrentUser: () => {
    try {
      const storedUser = localStorage.getItem('vpat_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Get current token
  getCurrentToken: () => {
    return localStorage.getItem('vpat_auth_token') || '';
  },
  
  // Check if user has specific role
  hasRole: (requiredRole) => {
    const user = AuthUtils.getCurrentUser();
    if (!user) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'tester': 1,
      'viewer': 0
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  },
  
  // Format role for display
  formatRole: (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'manager': 'Project Manager',
      'tester': 'Tester',
      'viewer': 'Viewer'
    };
    
    return roleNames[role] || role;
  }
};

export default useAuthStore; 