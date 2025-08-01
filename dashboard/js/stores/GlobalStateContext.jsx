/**
 * Global State Context
 * 
 * Provides centralized state management for all React components
 * while maintaining integration with Alpine.js through the bridge system.
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial global state
const initialState = {
  // Authentication state
  auth: {
    user: null,
    isAuthenticated: false,
    loading: false,
    showLogin: false,
    showProfile: false,
    showChangePassword: false
  },
  
  // Project and session state
  projects: {
    list: [],
    selectedProject: null,
    loading: false,
    showCreateProject: false
  },
  
  sessions: {
    list: [],
    selectedSession: null,
    loading: false,
    showSessionWizard: false,
    wizardStep: 1,
    wizardData: {}
  },
  
  // Web crawler state
  crawler: {
    webCrawlers: [],
    selectedCrawler: null,
    discoveredPages: [],
    loading: false,
    showCreateCrawler: false,
    sessionCapturing: false,
    sessionAwaitingLogin: false,
    sessionInfo: {
      isActive: false,
      authenticationType: null,
      capturedCredentials: false,
      capturedSession: false
    }
  },
  
  // Testing state
  testing: {
    automated: {
      testSessions: [],
      selectedTestSession: null,
      automationProgress: null,
      testResults: [],
      loading: false,
      running: false,
      showTestConfiguration: false,
      configuration: {
        tools: ['axe-core', 'pa11y'],
        conformanceLevel: 'AA',
        includeWarnings: false,
        runAsync: true
      }
    },
    manual: {
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
    }
  },
  
  // Reporting state
  reporting: {
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
  },
  
  // UI state
  ui: {
    modals: {
      sessionDetails: {
        isOpen: false,
        sessionId: null
      },
      auditTimeline: {
        isOpen: false,
        sessionId: null
      }
    },
    notifications: [],
    loading: false,
    sidebarCollapsed: false
  }
};

// Action types
const ActionTypes = {
  // Authentication actions
  SET_USER: 'SET_USER',
  SET_AUTH_LOADING: 'SET_AUTH_LOADING',
  SHOW_AUTH_MODAL: 'SHOW_AUTH_MODAL',
  HIDE_AUTH_MODAL: 'HIDE_AUTH_MODAL',
  
  // Project actions
  SET_PROJECTS: 'SET_PROJECTS',
  SET_SELECTED_PROJECT: 'SET_SELECTED_PROJECT',
  SET_PROJECTS_LOADING: 'SET_PROJECTS_LOADING',
  SHOW_CREATE_PROJECT: 'SHOW_CREATE_PROJECT',
  HIDE_CREATE_PROJECT: 'HIDE_CREATE_PROJECT',
  
  // Session actions
  SET_SESSIONS: 'SET_SESSIONS',
  SET_SELECTED_SESSION: 'SET_SELECTED_SESSION',
  SET_SESSIONS_LOADING: 'SET_SESSIONS_LOADING',
  SHOW_SESSION_WIZARD: 'SHOW_SESSION_WIZARD',
  HIDE_SESSION_WIZARD: 'HIDE_SESSION_WIZARD',
  SET_WIZARD_STEP: 'SET_WIZARD_STEP',
  SET_WIZARD_DATA: 'SET_WIZARD_DATA',
  
  // Crawler actions
  SET_CRAWLERS: 'SET_CRAWLERS',
  SET_SELECTED_CRAWLER: 'SET_SELECTED_CRAWLER',
  SET_DISCOVERED_PAGES: 'SET_DISCOVERED_PAGES',
  SET_CRAWLER_LOADING: 'SET_CRAWLER_LOADING',
  SHOW_CREATE_CRAWLER: 'SHOW_CREATE_CRAWLER',
  HIDE_CREATE_CRAWLER: 'HIDE_CREATE_CRAWLER',
  SET_SESSION_CAPTURING: 'SET_SESSION_CAPTURING',
  SET_SESSION_INFO: 'SET_SESSION_INFO',
  
  // Testing actions
  SET_TEST_SESSIONS: 'SET_TEST_SESSIONS',
  SET_SELECTED_TEST_SESSION: 'SET_SELECTED_TEST_SESSION',
  SET_AUTOMATION_PROGRESS: 'SET_AUTOMATION_PROGRESS',
  SET_TEST_RESULTS: 'SET_TEST_RESULTS',
  SET_TESTING_LOADING: 'SET_TESTING_LOADING',
  SET_TESTING_RUNNING: 'SET_TESTING_RUNNING',
  SHOW_TEST_CONFIGURATION: 'SHOW_TEST_CONFIGURATION',
  HIDE_TEST_CONFIGURATION: 'HIDE_TEST_CONFIGURATION',
  SET_TEST_CONFIGURATION: 'SET_TEST_CONFIGURATION',
  
  // Manual testing actions
  SET_MANUAL_SESSIONS: 'SET_MANUAL_SESSIONS',
  SET_MANUAL_SELECTED_SESSION: 'SET_MANUAL_SELECTED_SESSION',
  SET_ASSIGNMENTS: 'SET_ASSIGNMENTS',
  SET_CURRENT_TEST: 'SET_CURRENT_TEST',
  SET_MANUAL_LOADING: 'SET_MANUAL_LOADING',
  SET_MANUAL_FILTERS: 'SET_MANUAL_FILTERS',
  
  // Reporting actions
  SET_REPORTING_TAB: 'SET_REPORTING_TAB',
  SET_REPORTING_SESSION: 'SET_REPORTING_SESSION',
  SET_REPORTING_SESSIONS: 'SET_REPORTING_SESSIONS',
  SET_VPAT_CONFIG: 'SET_VPAT_CONFIG',
  SET_EXPORT_CONFIG: 'SET_EXPORT_CONFIG',
  SET_REPORTS: 'SET_REPORTS',
  SET_REPORTING_LOADING: 'SET_REPORTING_LOADING',
  
  // UI actions
  SHOW_MODAL: 'SHOW_MODAL',
  HIDE_MODAL: 'HIDE_MODAL',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  SET_UI_LOADING: 'SET_UI_LOADING',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR'
};

// Reducer function
function globalStateReducer(state, action) {
  switch (action.type) {
    // Authentication reducers
    case ActionTypes.SET_USER:
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload,
          isAuthenticated: !!action.payload
        }
      };
      
    case ActionTypes.SET_AUTH_LOADING:
      return {
        ...state,
        auth: {
          ...state.auth,
          loading: action.payload
        }
      };
      
    case ActionTypes.SHOW_AUTH_MODAL:
      return {
        ...state,
        auth: {
          ...state.auth,
          [action.payload]: true
        }
      };
      
    case ActionTypes.HIDE_AUTH_MODAL:
      return {
        ...state,
        auth: {
          ...state.auth,
          showLogin: false,
          showProfile: false,
          showChangePassword: false
        }
      };
      
    // Project reducers
    case ActionTypes.SET_PROJECTS:
      return {
        ...state,
        projects: {
          ...state.projects,
          list: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_PROJECT:
      return {
        ...state,
        projects: {
          ...state.projects,
          selectedProject: action.payload
        }
      };
      
    case ActionTypes.SET_PROJECTS_LOADING:
      return {
        ...state,
        projects: {
          ...state.projects,
          loading: action.payload
        }
      };
      
    // Session reducers
    case ActionTypes.SET_SESSIONS:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          list: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_SESSION:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          selectedSession: action.payload
        }
      };
      
    case ActionTypes.SHOW_SESSION_WIZARD:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          showSessionWizard: true,
          wizardStep: 1,
          wizardData: {}
        }
      };
      
    case ActionTypes.HIDE_SESSION_WIZARD:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          showSessionWizard: false,
          wizardStep: 1,
          wizardData: {}
        }
      };
      
    case ActionTypes.SET_WIZARD_STEP:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          wizardStep: action.payload
        }
      };
      
    case ActionTypes.SET_WIZARD_DATA:
      return {
        ...state,
        sessions: {
          ...state.sessions,
          wizardData: {
            ...state.sessions.wizardData,
            ...action.payload
          }
        }
      };
      
    // Crawler reducers
    case ActionTypes.SET_CRAWLERS:
      return {
        ...state,
        crawler: {
          ...state.crawler,
          webCrawlers: action.payload
        }
      };
      
    case ActionTypes.SET_SELECTED_CRAWLER:
      return {
        ...state,
        crawler: {
          ...state.crawler,
          selectedCrawler: action.payload
        }
      };
      
    case ActionTypes.SET_DISCOVERED_PAGES:
      return {
        ...state,
        crawler: {
          ...state.crawler,
          discoveredPages: action.payload
        }
      };
      
    case ActionTypes.SHOW_CREATE_CRAWLER:
      return {
        ...state,
        crawler: {
          ...state.crawler,
          showCreateCrawler: true
        }
      };
      
    case ActionTypes.HIDE_CREATE_CRAWLER:
      return {
        ...state,
        crawler: {
          ...state.crawler,
          showCreateCrawler: false
        }
      };
      
    // Testing reducers
    case ActionTypes.SET_TEST_SESSIONS:
      return {
        ...state,
        testing: {
          ...state.testing,
          automated: {
            ...state.testing.automated,
            testSessions: action.payload
          }
        }
      };
      
    case ActionTypes.SET_AUTOMATION_PROGRESS:
      return {
        ...state,
        testing: {
          ...state.testing,
          automated: {
            ...state.testing.automated,
            automationProgress: action.payload
          }
        }
      };
      
    case ActionTypes.SET_TESTING_RUNNING:
      return {
        ...state,
        testing: {
          ...state.testing,
          automated: {
            ...state.testing.automated,
            running: action.payload
          }
        }
      };
      
    // Manual testing reducers
    case ActionTypes.SET_MANUAL_SESSIONS:
      return {
        ...state,
        testing: {
          ...state.testing,
          manual: {
            ...state.testing.manual,
            sessions: action.payload
          }
        }
      };
      
    case ActionTypes.SET_ASSIGNMENTS:
      return {
        ...state,
        testing: {
          ...state.testing,
          manual: {
            ...state.testing.manual,
            assignments: action.payload,
            filteredAssignments: action.payload
          }
        }
      };
      
    // Reporting reducers
    case ActionTypes.SET_REPORTING_TAB:
      return {
        ...state,
        reporting: {
          ...state.reporting,
          activeTab: action.payload
        }
      };
      
    case ActionTypes.SET_REPORTING_SESSION:
      return {
        ...state,
        reporting: {
          ...state.reporting,
          selectedSession: action.payload
        }
      };
      
    case ActionTypes.SET_VPAT_CONFIG:
      return {
        ...state,
        reporting: {
          ...state.reporting,
          vpatConfig: {
            ...state.reporting.vpatConfig,
            ...action.payload
          }
        }
      };
      
    // UI reducers
    case ActionTypes.SHOW_MODAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            [action.payload.modalType]: {
              isOpen: true,
              ...action.payload.data
            }
          }
        }
      };
      
    case ActionTypes.HIDE_MODAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            [action.payload]: {
              isOpen: false
            }
          }
        }
      };
      
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            {
              id: Date.now(),
              ...action.payload
            }
          ]
        }
      };
      
    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      };
      
    default:
      return state;
  }
}

// Create contexts
const GlobalStateContext = createContext();
const GlobalDispatchContext = createContext();

// Provider component
export function GlobalStateProvider({ children }) {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);
  
  // Sync with Alpine.js bridge if available
  useEffect(() => {
    if (window.alpineReactBridge) {
      // Sync authentication state
      window.alpineReactBridge.setState('authState', state.auth);
      
      // Sync crawler state
      window.alpineReactBridge.setState('crawlerState', state.crawler);
      
      // Sync project/session state
      window.alpineReactBridge.setState('projectSessionState', {
        ...state.projects,
        ...state.sessions
      });
      
      // Sync testing state
      window.alpineReactBridge.setState('automatedTestingState', state.testing.automated);
      window.alpineReactBridge.setState('manualTestingState', state.testing.manual);
      
      // Sync reporting state
      window.alpineReactBridge.setState('reportingState', state.reporting);
    }
  }, [state]);
  
  return (
    <GlobalStateContext.Provider value={state}>
      <GlobalDispatchContext.Provider value={dispatch}>
        {children}
      </GlobalDispatchContext.Provider>
    </GlobalStateContext.Provider>
  );
}

// Custom hooks
export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
}

export function useGlobalDispatch() {
  const context = useContext(GlobalDispatchContext);
  if (context === undefined) {
    throw new Error('useGlobalDispatch must be used within a GlobalStateProvider');
  }
  return context;
}

// Action creators
export const actions = {
  // Authentication actions
  setUser: (user) => ({ type: ActionTypes.SET_USER, payload: user }),
  setAuthLoading: (loading) => ({ type: ActionTypes.SET_AUTH_LOADING, payload: loading }),
  showAuthModal: (modalType) => ({ type: ActionTypes.SHOW_AUTH_MODAL, payload: modalType }),
  hideAuthModal: () => ({ type: ActionTypes.HIDE_AUTH_MODAL }),
  
  // Project actions
  setProjects: (projects) => ({ type: ActionTypes.SET_PROJECTS, payload: projects }),
  setSelectedProject: (project) => ({ type: ActionTypes.SET_SELECTED_PROJECT, payload: project }),
  setProjectsLoading: (loading) => ({ type: ActionTypes.SET_PROJECTS_LOADING, payload: loading }),
  
  // Session actions
  setSessions: (sessions) => ({ type: ActionTypes.SET_SESSIONS, payload: sessions }),
  setSelectedSession: (session) => ({ type: ActionTypes.SET_SELECTED_SESSION, payload: session }),
  showSessionWizard: () => ({ type: ActionTypes.SHOW_SESSION_WIZARD }),
  hideSessionWizard: () => ({ type: ActionTypes.HIDE_SESSION_WIZARD }),
  setWizardStep: (step) => ({ type: ActionTypes.SET_WIZARD_STEP, payload: step }),
  setWizardData: (data) => ({ type: ActionTypes.SET_WIZARD_DATA, payload: data }),
  
  // Crawler actions
  setCrawlers: (crawlers) => ({ type: ActionTypes.SET_CRAWLERS, payload: crawlers }),
  setSelectedCrawler: (crawler) => ({ type: ActionTypes.SET_SELECTED_CRAWLER, payload: crawler }),
  setDiscoveredPages: (pages) => ({ type: ActionTypes.SET_DISCOVERED_PAGES, payload: pages }),
  showCreateCrawler: () => ({ type: ActionTypes.SHOW_CREATE_CRAWLER }),
  hideCreateCrawler: () => ({ type: ActionTypes.HIDE_CREATE_CRAWLER }),
  
  // Testing actions
  setTestSessions: (sessions) => ({ type: ActionTypes.SET_TEST_SESSIONS, payload: sessions }),
  setAutomationProgress: (progress) => ({ type: ActionTypes.SET_AUTOMATION_PROGRESS, payload: progress }),
  setTestingRunning: (running) => ({ type: ActionTypes.SET_TESTING_RUNNING, payload: running }),
  
  // Manual testing actions
  setManualSessions: (sessions) => ({ type: ActionTypes.SET_MANUAL_SESSIONS, payload: sessions }),
  setAssignments: (assignments) => ({ type: ActionTypes.SET_ASSIGNMENTS, payload: assignments }),
  
  // Reporting actions
  setReportingTab: (tab) => ({ type: ActionTypes.SET_REPORTING_TAB, payload: tab }),
  setReportingSession: (session) => ({ type: ActionTypes.SET_REPORTING_SESSION, payload: session }),
  setVpatConfig: (config) => ({ type: ActionTypes.SET_VPAT_CONFIG, payload: config }),
  
  // UI actions
  showModal: (modalType, data = {}) => ({ 
    type: ActionTypes.SHOW_MODAL, 
    payload: { modalType, data } 
  }),
  hideModal: (modalType) => ({ type: ActionTypes.HIDE_MODAL, payload: modalType }),
  addNotification: (notification) => ({ type: ActionTypes.ADD_NOTIFICATION, payload: notification }),
  removeNotification: (id) => ({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id })
};

export { ActionTypes }; 