/**
 * UI Store
 * 
 * Manages UI state including modals, notifications, loading states,
 * and other user interface elements.
 */

import { useGlobalState, useGlobalDispatch, actions } from './GlobalStateContext.jsx';
import { useCallback } from 'react';

// UI store hook
export function useUIStore() {
  const state = useGlobalState();
  const dispatch = useGlobalDispatch();
  
  const uiState = state.ui;
  
  // Modal management actions
  const modalActions = {
    // Show modal
    showModal: useCallback((modalType, data = {}) => {
      dispatch(actions.showModal(modalType, data));
      
      // Sync with Alpine.js modals
      if (window.dashboardInstance) {
        switch (modalType) {
          case 'sessionDetails':
            window.dashboardInstance.sessionDetailsModal = {
              show: true,
              sessionId: data.sessionId
            };
            break;
          case 'auditTimeline':
            window.dashboardInstance.auditTimelineModal = {
              show: true,
              sessionId: data.sessionId
            };
            break;
          case 'createProject':
            window.dashboardInstance.showCreateProject = true;
            break;
          case 'sessionWizard':
            window.dashboardInstance.showSessionWizard = true;
            break;
        }
      }
    }, [dispatch]),
    
    // Hide modal
    hideModal: useCallback((modalType) => {
      dispatch(actions.hideModal(modalType));
      
      // Sync with Alpine.js modals
      if (window.dashboardInstance) {
        switch (modalType) {
          case 'sessionDetails':
            window.dashboardInstance.sessionDetailsModal = {
              show: false,
              sessionId: null
            };
            break;
          case 'auditTimeline':
            window.dashboardInstance.auditTimelineModal = {
              show: false,
              sessionId: null
            };
            break;
          case 'createProject':
            window.dashboardInstance.showCreateProject = false;
            break;
          case 'sessionWizard':
            window.dashboardInstance.showSessionWizard = false;
            break;
        }
      }
    }, [dispatch]),
    
    // Hide all modals
    hideAllModals: useCallback(() => {
      Object.keys(uiState.modals).forEach(modalType => {
        modalActions.hideModal(modalType);
      });
    }, [uiState.modals]),
    
    // Toggle modal
    toggleModal: useCallback((modalType, data = {}) => {
      const modal = uiState.modals[modalType];
      if (modal?.isOpen) {
        modalActions.hideModal(modalType);
      } else {
        modalActions.showModal(modalType, data);
      }
    }, [uiState.modals])
  };
  
  // Notification management actions
  const notificationActions = {
    // Add notification
    addNotification: useCallback((notification) => {
      const id = Date.now() + Math.random();
      const fullNotification = {
        id,
        type: 'info',
        timeout: 5000,
        ...notification
      };
      
      dispatch(actions.addNotification(fullNotification));
      
      // Auto-remove notification after timeout
      if (fullNotification.timeout > 0) {
        setTimeout(() => {
          notificationActions.removeNotification(id);
        }, fullNotification.timeout);
      }
      
      return id;
    }, [dispatch]),
    
    // Remove notification
    removeNotification: useCallback((id) => {
      dispatch(actions.removeNotification(id));
    }, [dispatch]),
    
    // Clear all notifications
    clearAllNotifications: useCallback(() => {
      uiState.notifications.forEach(notification => {
        notificationActions.removeNotification(notification.id);
      });
    }, [uiState.notifications]),
    
    // Show success notification
    showSuccess: useCallback((message, timeout = 3000) => {
      return notificationActions.addNotification({
        type: 'success',
        message,
        timeout
      });
    }, []),
    
    // Show error notification
    showError: useCallback((message, timeout = 5000) => {
      return notificationActions.addNotification({
        type: 'error',
        message,
        timeout
      });
    }, []),
    
    // Show warning notification
    showWarning: useCallback((message, timeout = 4000) => {
      return notificationActions.addNotification({
        type: 'warning',
        message,
        timeout
      });
    }, []),
    
    // Show info notification
    showInfo: useCallback((message, timeout = 3000) => {
      return notificationActions.addNotification({
        type: 'info',
        message,
        timeout
      });
    }, [])
  };
  
  // Loading state actions
  const loadingActions = {
    // Set global loading state
    setLoading: useCallback((loading) => {
      dispatch(actions.setUILoading(loading));
    }, [dispatch]),
    
    // Show loading overlay
    showLoading: useCallback((message = 'Loading...') => {
      loadingActions.setLoading(true);
      if (message !== 'Loading...') {
        notificationActions.showInfo(message, 0); // No timeout for loading messages
      }
    }, []),
    
    // Hide loading overlay
    hideLoading: useCallback(() => {
      loadingActions.setLoading(false);
    }, [])
  };
  
  // Sidebar actions
  const sidebarActions = {
    // Toggle sidebar
    toggleSidebar: useCallback(() => {
      dispatch(actions.toggleSidebar());
      
      // Sync with Alpine.js
      if (window.dashboardInstance) {
        window.dashboardInstance.sidebarCollapsed = !uiState.sidebarCollapsed;
      }
    }, [dispatch, uiState.sidebarCollapsed]),
    
    // Collapse sidebar
    collapseSidebar: useCallback(() => {
      if (!uiState.sidebarCollapsed) {
        sidebarActions.toggleSidebar();
      }
    }, [uiState.sidebarCollapsed]),
    
    // Expand sidebar
    expandSidebar: useCallback(() => {
      if (uiState.sidebarCollapsed) {
        sidebarActions.toggleSidebar();
      }
    }, [uiState.sidebarCollapsed])
  };
  
  // Page navigation actions
  const navigationActions = {
    // Set active tab/page
    setActivePage: useCallback((page) => {
      // Sync with Alpine.js navigation
      if (window.dashboardInstance) {
        window.dashboardInstance.activeTab = page;
      }
    }, []),
    
    // Navigate to session details
    navigateToSession: useCallback((sessionId) => {
      modalActions.showModal('sessionDetails', { sessionId });
    }, []),
    
    // Navigate to project
    navigateToProject: useCallback((projectId) => {
      // This would trigger project selection in the project store
      navigationActions.setActivePage('projects');
    }, [])
  };
  
  // Computed values
  const computed = {
    // Modal states
    isAnyModalOpen: Object.values(uiState.modals).some(modal => modal.isOpen),
    openModals: Object.entries(uiState.modals)
      .filter(([, modal]) => modal.isOpen)
      .map(([type]) => type),
    
    // Notification states
    hasNotifications: uiState.notifications.length > 0,
    notificationCount: uiState.notifications.length,
    errorNotifications: uiState.notifications.filter(n => n.type === 'error'),
    hasErrors: uiState.notifications.some(n => n.type === 'error'),
    
    // Loading states
    isGlobalLoading: uiState.loading,
    
    // Sidebar states
    isSidebarCollapsed: uiState.sidebarCollapsed,
    sidebarWidth: uiState.sidebarCollapsed ? '64px' : '256px',
    
    // Helper functions
    getModalData: (modalType) => {
      return uiState.modals[modalType] || { isOpen: false };
    },
    
    isModalOpen: (modalType) => {
      return uiState.modals[modalType]?.isOpen || false;
    }
  };
  
  return {
    // State
    ...uiState,
    
    // Actions
    ...modalActions,
    ...notificationActions,
    ...loadingActions,
    ...sidebarActions,
    ...navigationActions,
    
    // Computed values
    ...computed
  };
}

// Utility functions
export const UIUtils = {
  // Get notification icon
  getNotificationIcon: (type) => {
    const iconMap = {
      'success': 'fas fa-check-circle',
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle'
    };
    return iconMap[type] || 'fas fa-info-circle';
  },
  
  // Get notification color
  getNotificationColor: (type) => {
    const colorMap = {
      'success': 'green',
      'error': 'red',
      'warning': 'yellow',
      'info': 'blue'
    };
    return colorMap[type] || 'blue';
  },
  
  // Format notification time
  formatNotificationTime: (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    if (diff < 60000) { // Less than 1 minute
      return 'just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      return time.toLocaleDateString();
    }
  },
  
  // Generate unique modal ID
  generateModalId: (type, data = {}) => {
    return `${type}-${Object.values(data).join('-')}-${Date.now()}`;
  },
  
  // Validate modal type
  isValidModalType: (type) => {
    const validTypes = [
      'sessionDetails',
      'auditTimeline',
      'createProject',
      'sessionWizard',
      'testConfiguration',
      'userManagement',
      'adminBackup'
    ];
    return validTypes.includes(type);
  },
  
  // Get modal size
  getModalSize: (type) => {
    const sizeMap = {
      'sessionDetails': 'xl',
      'auditTimeline': 'lg',
      'createProject': 'md',
      'sessionWizard': 'xl',
      'testConfiguration': 'lg',
      'userManagement': 'lg',
      'adminBackup': 'md'
    };
    return sizeMap[type] || 'md';
  },
  
  // Keyboard shortcuts
  handleKeyboardShortcuts: (event, actions) => {
    // ESC key - close all modals
    if (event.key === 'Escape') {
      actions.hideAllModals();
    }
    
    // Ctrl/Cmd + K - global search (if implemented)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      // Implement global search modal
    }
    
    // Ctrl/Cmd + N - new project/session (context dependent)
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      // Context-dependent new item creation
    }
  }
};

// Hook for keyboard shortcuts
export function useKeyboardShortcuts() {
  const uiStore = useUIStore();
  
  useCallback((event) => {
    UIUtils.handleKeyboardShortcuts(event, uiStore);
  }, [uiStore]);
}

export default useUIStore; 