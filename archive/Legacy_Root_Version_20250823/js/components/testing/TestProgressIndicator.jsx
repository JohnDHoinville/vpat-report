import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const TestProgressIndicator = () => {
  const [testingProgress, setTestingProgress] = useState({
    percentage: 0,
    message: '',
    completedPages: 0,
    totalPages: 0,
    currentPage: '',
    estimatedTimeRemaining: null
  });
  const [automatedTestingInProgress, setAutomatedTestingInProgress] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(null);
  const [showProgress, setShowProgress] = useState(false);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('testingState');

  useEffect(() => {
    // Load initial data from Alpine.js
    const alpineState = getState();
    if (alpineState) {
      setTestingProgress(alpineState.testingProgress || testingProgress);
      setAutomatedTestingInProgress(alpineState.automatedTestingInProgress || false);
      setAutomationProgress(alpineState.automationProgress || null);
    }

    // Subscribe to Alpine.js state changes
    const unsubscribe = subscribe((newState) => {
      if (newState.testingProgress !== undefined) {
        setTestingProgress(newState.testingProgress);
        setShowProgress(newState.testingProgress.percentage > 0 || newState.automatedTestingInProgress);
      }
      if (newState.automatedTestingInProgress !== undefined) {
        setAutomatedTestingInProgress(newState.automatedTestingInProgress);
        setShowProgress(newState.automatedTestingInProgress || newState.testingProgress?.percentage > 0);
      }
      if (newState.automationProgress !== undefined) {
        setAutomationProgress(newState.automationProgress);
      }
    });

    return unsubscribe;
  }, [getState, subscribe]);

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (automationProgress?.total_instances > 0) {
      return Math.round((automationProgress.completed_instances / automationProgress.total_instances) * 100);
    }
    return testingProgress.percentage || 0;
  };

  // Get current status message
  const getCurrentMessage = () => {
    if (automationProgress?.current_status) {
      return automationProgress.current_status;
    }
    return testingProgress.message || 'Preparing tests...';
  };

  // Get current page info
  const getCurrentPageInfo = () => {
    if (automationProgress) {
      return {
        completed: automationProgress.completed_instances || 0,
        total: automationProgress.total_instances || 0,
        current: automationProgress.current_instance_info?.page_title || automationProgress.current_instance_info?.url || ''
      };
    }
    return {
      completed: testingProgress.completedPages || 0,
      total: testingProgress.totalPages || 0,
      current: testingProgress.currentPage || ''
    };
  };

  if (!showProgress && !automatedTestingInProgress) {
    return null;
  }

  const progressPercentage = getProgressPercentage();
  const currentMessage = getCurrentMessage();
  const pageInfo = getCurrentPageInfo();

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {automatedTestingInProgress ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : progressPercentage === 100 ? (
              <div className="rounded-full h-8 w-8 bg-green-100 flex items-center justify-center">
                <i className="fas fa-check text-green-600"></i>
              </div>
            ) : (
              <div className="rounded-full h-8 w-8 bg-blue-100 flex items-center justify-center">
                <i className="fas fa-cog text-blue-600"></i>
              </div>
            )}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900">
              {automatedTestingInProgress ? 'Testing in Progress' : 
               progressPercentage === 100 ? 'Testing Complete' : 'Testing Status'}
            </h3>
            <p className="text-sm text-gray-600">{currentMessage}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{progressPercentage}%</div>
          {testingProgress.estimatedTimeRemaining && (
            <div className="text-sm text-gray-500">
              {formatTimeRemaining(testingProgress.estimatedTimeRemaining)} remaining
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{pageInfo.completed} of {pageInfo.total} test instances</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Current Page Info */}
      {pageInfo.current && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            <strong>Current:</strong> {pageInfo.current}
          </div>
        </div>
      )}

      {/* Detailed Progress (if available from automation) */}
      {automationProgress && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900">Run ID</div>
              <div className="text-gray-600 truncate" title={automationProgress.run_id}>
                {automationProgress.run_id ? automationProgress.run_id.slice(0, 8) + '...' : 'N/A'}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Session</div>
              <div className="text-gray-600">{automationProgress.session_name || 'Unnamed Session'}</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Tools</div>
              <div className="text-gray-600">
                {automationProgress.tools ? automationProgress.tools.join(', ') : 'axe, pa11y'}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-900">Started</div>
              <div className="text-gray-600">
                {automationProgress.started_at ? 
                  new Date(automationProgress.started_at).toLocaleTimeString() : 
                  'Just now'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {automatedTestingInProgress && (
        <div className="border-t border-gray-200 pt-4 mt-4 flex justify-end">
          <button
            onClick={() => {
              if (window.dashboardInstance?.stopAutomatedTesting) {
                window.dashboardInstance.stopAutomatedTesting();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            <i className="fas fa-stop mr-2"></i>Stop Testing
          </button>
        </div>
      )}
    </div>
  );
};

export default TestProgressIndicator; 