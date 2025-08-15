import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';
import AutomatedTestControls from './AutomatedTestControls';
import TestProgressIndicator from './TestProgressIndicator';
import TestGrid from './TestGrid';

const AutomatedTestingInterface = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [automatedTestingInProgress, setAutomatedTestingInProgress] = useState(false);
  const [testingProgress, setTestingProgress] = useState(null);
  const [automationProgress, setAutomationProgress] = useState(null);
  const [automatedTestResults, setAutomatedTestResults] = useState([]);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('testingState');

  useEffect(() => {
    // Load initial data from Alpine.js
    const projectState = window.ReactComponents?.getState('projectState');
    if (projectState) {
      setSelectedProject(projectState.selectedProject || null);
      setCurrentProject(projectState.currentProject || null);
    }

    const alpineState = getState();
    if (alpineState) {
      setAutomatedTestingInProgress(alpineState.automatedTestingInProgress || false);
      setTestingProgress(alpineState.testingProgress || null);
      setAutomationProgress(alpineState.automationProgress || null);
      setAutomatedTestResults(alpineState.automatedTestResults || []);
    }

    // Subscribe to project state changes
    const unsubscribeProject = window.ReactComponents?.subscribe('projectState', (newState) => {
      if (newState.selectedProject !== undefined) {
        setSelectedProject(newState.selectedProject);
        setState({ selectedProject: newState.selectedProject });
      }
      if (newState.currentProject !== undefined) {
        setCurrentProject(newState.currentProject);
        setState({ currentProject: newState.currentProject });
      }
    });

    // Subscribe to testing state changes
    const unsubscribe = subscribe((newState) => {
      if (newState.automatedTestingInProgress !== undefined) {
        setAutomatedTestingInProgress(newState.automatedTestingInProgress);
      }
      if (newState.testingProgress !== undefined) {
        setTestingProgress(newState.testingProgress);
      }
      if (newState.automationProgress !== undefined) {
        setAutomationProgress(newState.automationProgress);
      }
      if (newState.automatedTestResults !== undefined) {
        setAutomatedTestResults(newState.automatedTestResults);
      }
    });

    return () => {
      if (unsubscribeProject) unsubscribeProject();
      unsubscribe();
    };
  }, [getState, setState, subscribe]);

  // Format duration for display
  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Controls */}
      <AutomatedTestControls />

      {/* Progress Indicator */}
      {(automatedTestingInProgress || testingProgress || automationProgress) && (
        <TestProgressIndicator />
      )}

      {/* Testing Results Summary */}
      {selectedProject && automatedTestResults.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Test Results</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {automatedTestResults.map((result) => (
              <div key={result.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h4 className="font-medium text-gray-900">
                        {result.test_name || 'Automated Test'}
                      </h4>
                      <span 
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          result.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : result.status === 'failed' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div>
                        <strong>Pages Tested:</strong> <span>{result.pages_tested || 0}</span>
                      </div>
                      <div>
                        <strong>Issues Found:</strong> <span>{result.total_violations || 0}</span>
                      </div>
                      <div>
                        <strong>WCAG Level:</strong> <span>{result.wcag_level || 'AA'}</span>
                      </div>
                      <div>
                        <strong>Runtime:</strong> <span>{formatDuration(result.test_duration_ms)}</span>
                      </div>
                    </div>
                    {result.compliance_score !== undefined && (
                      <div className="mt-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Compliance Score: {Math.round(result.compliance_score)}%
                          </span>
                          <div className="ml-3 flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className={`h-2 rounded-full ${
                                result.compliance_score >= 80
                                  ? 'bg-green-500'
                                  : result.compliance_score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${result.compliance_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // View detailed results
                        if (window.dashboardInstance?.viewTestResults) {
                          window.dashboardInstance.viewTestResults(result);
                        }
                      }}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <i className="fas fa-eye mr-1"></i>View Details
                    </button>
                    {result.session_id && (
                      <button
                        onClick={() => {
                          // Open test grid for this session
                          setState({ 
                            showTestGrid: true,
                            selectedTestSession: {
                              id: result.session_id,
                              name: result.test_name || 'Test Session'
                            }
                          });
                        }}
                        className="px-3 py-1 text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        <i className="fas fa-table mr-1"></i>Test Grid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Grid Modal */}
      <TestGrid />

      {/* Integration Help */}
      {selectedProject && automatedTestResults.length === 0 && !automatedTestingInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <i className="fas fa-info-circle text-blue-400 mr-3 mt-1"></i>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Ready to Start Testing</h3>
              <div className="mt-2 text-sm text-blue-800">
                <p className="mb-2">Your automated testing interface is ready. Here's what you can do:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Configure testing tools and WCAG compliance levels above</li>
                  <li>Click "Quick Start" to begin automated accessibility testing</li>
                  <li>Monitor progress in real-time with detailed status updates</li>
                  <li>Review results and manage test instances in the Test Grid</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedTestingInterface; 