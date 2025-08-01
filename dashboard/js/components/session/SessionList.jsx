import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const SessionList = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('sessionState');

  useEffect(() => {
    // Load initial data from Alpine.js
    const alpineState = getState();
    if (alpineState) {
      setSessions(alpineState.testingSessions || []);
      setSelectedProject(alpineState.selectedProject || null);
      setCurrentProject(alpineState.currentProject || null);
      setLoading(alpineState.loading || false);
    }

    // Subscribe to Alpine.js state changes
    const unsubscribe = subscribe((newState) => {
      if (newState.testingSessions !== undefined) setSessions(newState.testingSessions);
      if (newState.selectedProject !== undefined) setSelectedProject(newState.selectedProject);
      if (newState.currentProject !== undefined) setCurrentProject(newState.currentProject);
      if (newState.loading !== undefined) setLoading(newState.loading);
    });

    return unsubscribe;
  }, [getState, subscribe]);

  const handleCreateSession = () => {
    // Trigger Alpine.js session wizard
    if (window.dashboardInstance?.openSessionWizard) {
      window.dashboardInstance.openSessionWizard();
    }
  };

  const handleSessionClick = (session) => {
    // Trigger Alpine.js session details or redirect
    if (window.dashboardInstance?.selectSession) {
      window.dashboardInstance.selectSession(session.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConformanceLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'wcag_22_a': return 'bg-blue-100 text-blue-800';
      case 'wcag_22_aa': return 'bg-purple-100 text-purple-800';
      case 'wcag_22_aaa': return 'bg-red-100 text-red-800';
      case 'section_508': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedProject) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <i className="fas fa-folder-open text-gray-400 text-6xl mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
          <p className="text-gray-500">Choose a project to view and manage its testing sessions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Testing Sessions</h2>
            <p className="mt-2 text-gray-600">
              Manage unified accessibility testing sessions with comprehensive WCAG and Section 508 compliance
            </p>
            {currentProject && (
              <p className="mt-1 text-sm text-blue-600">
                Project: <strong>{currentProject.name}</strong>
              </p>
            )}
          </div>
          <button
            onClick={handleCreateSession}
            disabled={!selectedProject}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
              !selectedProject 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <i className="fas fa-magic mr-2"></i>Create Session
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : sessions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSessionClick(session)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                  {session.name}
                </h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                  {session.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                </span>
              </div>

              {session.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {session.description}
                </p>
              )}

              <div className="space-y-3">
                {/* Conformance Levels */}
                {session.conformance_levels && session.conformance_levels.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Conformance Levels:</span>
                    <div className="flex flex-wrap gap-1">
                      {session.conformance_levels.map((level, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getConformanceLevelColor(level)}`}
                        >
                          {level.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      {session.total_test_instances || 0}
                    </div>
                    <div className="text-xs text-gray-500">Total Tests</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">
                      {session.passed_tests || 0}
                    </div>
                    <div className="text-xs text-gray-500">Passed</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-red-600">
                      {session.failed_tests || 0}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {session.total_test_instances > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((session.passed_tests + session.failed_tests) / session.total_test_instances) * 100}%`
                      }}
                    ></div>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>Created: {formatDate(session.created_at)}</span>
                  <span>Priority: {session.priority || 'Medium'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <i className="fas fa-clipboard-list text-gray-400 text-6xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No testing sessions</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first testing session for this project.
            </p>
            <button
              onClick={handleCreateSession}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-magic mr-2"></i>Create Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionList; 