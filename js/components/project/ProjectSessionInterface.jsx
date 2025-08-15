import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';
import ProjectList from './ProjectList';
import CreateProject from './CreateProject';
import SessionList from '../session/SessionList';
import CreateTestingSession from '../session/CreateTestingSession';

const ProjectSessionInterface = () => {
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);

  // Alpine.js integration for both project and session state
  const { getState: getProjectState, setState: setProjectState, subscribe: subscribeProject } = useAlpineState('projectState');
  const { getState: getSessionState, setState: setSessionState, subscribe: subscribeSession } = useAlpineState('sessionState');

  useEffect(() => {
    // Load initial project data from Alpine.js
    const projectState = getProjectState();
    if (projectState) {
      setSelectedProject(projectState.selectedProject || null);
      setCurrentProject(projectState.currentProject || null);
      
      // Set active tab based on Alpine.js state
      if (window.dashboardInstance?.activeTab) {
        setActiveTab(window.dashboardInstance.activeTab);
      }
    }

    // Subscribe to Alpine.js project state changes
    const unsubscribeProject = subscribeProject((newState) => {
      if (newState.selectedProject !== undefined) {
        setSelectedProject(newState.selectedProject);
      }
      if (newState.currentProject !== undefined) {
        setCurrentProject(newState.currentProject);
      }
    });

    // Subscribe to Alpine.js session state changes
    const unsubscribeSession = subscribeSession((newState) => {
      // Sync session state with project state
      if (newState.selectedProject !== undefined) {
        setSelectedProject(newState.selectedProject);
        setProjectState({ selectedProject: newState.selectedProject });
      }
    });

    return () => {
      unsubscribeProject();
      unsubscribeSession();
    };
  }, [getProjectState, subscribeProject, subscribeSession, setProjectState]);

  // Sync tab changes with Alpine.js
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Update Alpine.js state
    if (window.dashboardInstance) {
      window.dashboardInstance.activeTab = tab;
    }

    // If switching to sessions, ensure we have project and session state synced
    if (tab === 'testing-sessions') {
      setSessionState({
        selectedProject,
        currentProject,
        activeTab: tab
      });
      
      // Load testing sessions for selected project
      if (selectedProject && window.dashboardInstance?.loadTestingSessions) {
        window.dashboardInstance.loadTestingSessions();
      }
    }
  };

  const tabs = [
    { id: 'projects', label: 'Projects', icon: 'fas fa-folder' },
    { id: 'testing-sessions', label: 'Testing Sessions', icon: 'fas fa-clipboard-list' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Project/Session Indicator */}
        {selectedProject && currentProject && (
          <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center text-sm">
              <i className="fas fa-folder text-blue-600 mr-2"></i>
              <span className="text-gray-600">Selected Project:</span>
              <span className="font-medium text-blue-900 ml-2">{currentProject.name}</span>
              <span className="text-gray-400 mx-2">•</span>
              <span className="text-gray-600">{currentProject.primary_url}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'projects' && (
          <div>
            <ProjectList />
            <CreateProject />
          </div>
        )}

        {activeTab === 'testing-sessions' && (
          <div>
            <SessionList />
            <CreateTestingSession />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSessionInterface; 