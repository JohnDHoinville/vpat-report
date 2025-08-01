import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../../utils/alpineIntegration.js';
import TestInstanceList from './TestInstanceList.jsx';
import TestReview from './TestReview.jsx';
import TestStatusManager from './TestStatusManager.jsx';

/**
 * ManualTestingInterface Component
 * 
 * Main container component for the manual testing workflow.
 * Orchestrates TestInstanceList, TestReview, and TestStatusManager components.
 * Provides the primary interface for manual accessibility testing.
 */
const ManualTestingInterface = () => {
  // Get state from Alpine.js bridge
  const [selectedProject] = useAlpineState('selectedProject', null);
  const [manualTestingSession] = useAlpineState('manualTestingSession', null);
  const [manualTestingAssignments] = useAlpineState('manualTestingAssignments', []);
  const [showManualTestingModal] = useAlpineState('showManualTestingModal', false);
  const [currentManualTest] = useAlpineState('currentManualTest', null);
  const [loading] = useAlpineState('loading', false);

  // Local state for interface management
  const [activeView, setActiveView] = useState('assignments'); // 'assignments', 'status', 'overview'
  const [showQuickStats, setShowQuickStats] = useState(true);

  // Calculate quick stats
  const quickStats = React.useMemo(() => {
    if (!manualTestingAssignments || manualTestingAssignments.length === 0) {
      return { total: 0, pending: 0, inProgress: 0, completed: 0, needsReview: 0 };
    }

    return manualTestingAssignments.reduce((stats, assignment) => {
      stats.total++;
      switch (assignment.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'needs_review':
          stats.needsReview++;
          break;
      }
      return stats;
    }, { total: 0, pending: 0, inProgress: 0, completed: 0, needsReview: 0 });
  }, [manualTestingAssignments]);

  // Handle view switching
  const handleViewChange = (view) => {
    setActiveView(view);
  };

  // Start a new manual testing session
  const startNewSession = async () => {
    if (!selectedProject) {
      alert('Please select a project first.');
      return;
    }

    try {
      // Use Alpine.js function to start manual testing
      if (window.dashboardInstance && window.dashboardInstance.startManualTesting) {
        await window.dashboardInstance.startManualTesting();
      } else {
        console.warn('Manual testing start function not available in Alpine.js');
      }
    } catch (error) {
      console.error('Failed to start manual testing session:', error);
      alert('Failed to start manual testing session. Please try again.');
    }
  };

  // Get view title
  const getViewTitle = () => {
    switch (activeView) {
      case 'assignments':
        return 'Test Assignments';
      case 'status':
        return 'Status Management';
      case 'overview':
        return 'Session Overview';
      default:
        return 'Manual Testing';
    }
  };

  // No project selected state
  if (!selectedProject) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <i className="fas fa-project-diagram text-gray-400 text-6xl mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-6">
            Please select a project from the Projects tab to begin manual testing.
          </p>
          <div className="text-sm text-gray-500">
            Manual testing requires an active project with discovered pages and test instances.
          </div>
        </div>
      </div>
    );
  }

  // No manual testing session state
  if (!manualTestingSession) {
    return (
      <div className="space-y-6">
        {/* Quick Project Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manual Testing</h2>
              <p className="text-gray-600 mt-1">
                Project: <span className="font-medium">{selectedProject.name}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Ready to start testing</div>
            </div>
          </div>
        </div>

        {/* Start Session */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <i className="fas fa-clipboard-check text-blue-500 text-6xl mb-4"></i>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Manual Testing</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Begin manual accessibility testing for this project. This will create test assignments 
              for each WCAG criterion that requires manual verification.
            </p>
            <button
              onClick={startNewSession}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Session...
                </>
              ) : (
                <>
                  <i className="fas fa-play mr-2"></i>
                  Start Manual Testing
                </>
              )}
            </button>
            <div className="mt-4 text-sm text-gray-500">
              This will analyze your project and create manual test assignments.
            </div>
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
            Manual Testing Guidelines
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h5 className="font-medium mb-2">Before You Begin:</h5>
              <ul className="space-y-1">
                <li>• Ensure your project has discovered pages</li>
                <li>• Review WCAG 2.2 success criteria</li>
                <li>• Prepare testing tools (screen readers, etc.)</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">During Testing:</h5>
              <ul className="space-y-1">
                <li>• Test each criterion methodically</li>
                <li>• Document findings with evidence</li>
                <li>• Use provided testing procedures</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Session Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{getViewTitle()}</h2>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <span>Session: <span className="font-medium">{manualTestingSession.name}</span></span>
              <span className="mx-2">•</span>
              <span>Project: <span className="font-medium">{selectedProject.name}</span></span>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewChange('assignments')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeView === 'assignments'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-tasks mr-2"></i>Assignments
            </button>
            <button
              onClick={() => handleViewChange('status')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeView === 'status'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className="fas fa-chart-pie mr-2"></i>Status
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        {showQuickStats && quickStats.total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{quickStats.total}</div>
                <div className="text-xs text-gray-500">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{quickStats.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{quickStats.inProgress}</div>
                <div className="text-xs text-yellow-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{quickStats.completed}</div>
                <div className="text-xs text-green-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{quickStats.needsReview}</div>
                <div className="text-xs text-orange-600">Needs Review</div>
              </div>
            </div>
            <button
              onClick={() => setShowQuickStats(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Hide Stats
            </button>
          </div>
        )}

        {!showQuickStats && quickStats.total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowQuickStats(true)}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              <i className="fas fa-chart-bar mr-1"></i>Show Quick Stats
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="min-h-screen">
        {activeView === 'assignments' && <TestInstanceList />}
        {activeView === 'status' && <TestStatusManager />}
      </div>

      {/* Test Review Modal */}
      {showManualTestingModal && currentManualTest && <TestReview />}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-purple-600 text-3xl mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing</h3>
              <p className="text-gray-600 text-sm">Please wait while we process your request...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualTestingInterface; 