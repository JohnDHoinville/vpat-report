import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const AutomatedTestControls = () => {
  const [testingConfig, setTestingConfig] = useState({
    useAxe: true,
    usePa11y: true,
    useLighthouse: false,
    wcagLevel: 'AA',
    browser: 'chromium'
  });
  const [automatedTestingInProgress, setAutomatedTestingInProgress] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('testingState');

  useEffect(() => {
    // Load initial data from Alpine.js
    const alpineState = getState();
    if (alpineState) {
      setTestingConfig(alpineState.testingConfig || testingConfig);
      setAutomatedTestingInProgress(alpineState.automatedTestingInProgress || false);
      setSelectedProject(alpineState.selectedProject || null);
      setCurrentProject(alpineState.currentProject || null);
      setShowAdvancedConfig(alpineState.showAdvancedConfig || false);
    }

    // Subscribe to Alpine.js state changes
    const unsubscribe = subscribe((newState) => {
      if (newState.testingConfig !== undefined) setTestingConfig(newState.testingConfig);
      if (newState.automatedTestingInProgress !== undefined) setAutomatedTestingInProgress(newState.automatedTestingInProgress);
      if (newState.selectedProject !== undefined) setSelectedProject(newState.selectedProject);
      if (newState.currentProject !== undefined) setCurrentProject(newState.currentProject);
      if (newState.showAdvancedConfig !== undefined) setShowAdvancedConfig(newState.showAdvancedConfig);
    });

    return unsubscribe;
  }, [getState, subscribe]);

  const handleConfigChange = (key, value) => {
    const newConfig = { ...testingConfig, [key]: value };
    setTestingConfig(newConfig);
    setState({ testingConfig: newConfig });
    
    // Sync with Alpine.js dashboard
    if (window.dashboardInstance) {
      window.dashboardInstance.testingConfig = newConfig;
    }
  };

  const handleStartTesting = async () => {
    if (!selectedProject || automatedTestingInProgress) return;

    try {
      // Use Alpine.js function or DashboardAPI
      if (window.dashboardInstance?.startAutomatedTesting) {
        await window.dashboardInstance.startAutomatedTesting();
      } else if (window.DashboardAPI?.automatedTesting?.startTesting) {
        const response = await window.DashboardAPI.automatedTesting.startTesting({
          project_id: selectedProject,
          testing_config: testingConfig
        });
        
        // Update state
        setState({ 
          automatedTestingInProgress: true,
          testingProgress: {
            percentage: 0,
            message: 'Starting automated tests...',
            completedPages: 0,
            totalPages: 0,
            currentPage: ''
          }
        });
        
        // Show notification
        if (window.dashboardInstance?.showNotification) {
          window.dashboardInstance.showNotification('success', 'Testing Started', 'Automated accessibility testing has begun');
        }
      }
    } catch (error) {
      console.error('Error starting automated testing:', error);
      if (window.dashboardInstance?.showNotification) {
        window.dashboardInstance.showNotification('error', 'Testing Failed', error.message || 'Failed to start automated testing');
      }
    }
  };

  const handleShowAdvancedConfig = () => {
    setShowAdvancedConfig(true);
    setState({ showAdvancedConfig: true });
    
    // Trigger Alpine.js function if available
    if (window.dashboardInstance?.showAdvancedTestConfiguration) {
      window.dashboardInstance.showAdvancedTestConfiguration();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Automated Testing</h2>
            <p className="mt-2 text-gray-600">Run automated accessibility tests using axe, pa11y, and Lighthouse</p>
            {currentProject && (
              <p className="mt-1 text-sm text-blue-600">
                Project: <strong>{currentProject.name}</strong>
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleShowAdvancedConfig}
              disabled={!selectedProject || automatedTestingInProgress}
              className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                !selectedProject || automatedTestingInProgress
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <i className="fas fa-cog mr-2"></i>Advanced Config
            </button>
            <button
              onClick={handleStartTesting}
              disabled={!selectedProject || automatedTestingInProgress}
              className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${
                !selectedProject || automatedTestingInProgress
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <i className={`fas mr-2 ${automatedTestingInProgress ? 'fa-spin fa-spinner' : 'fa-play'}`}></i>
              <span>{automatedTestingInProgress ? 'Testing...' : 'Quick Start'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Selection Warning */}
      {!selectedProject && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <i className="fas fa-exclamation-triangle text-yellow-400 mr-3 mt-1"></i>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Select a Project</h3>
              <p className="text-sm text-yellow-700 mt-1">Please select a project from the Projects tab to start automated testing.</p>
            </div>
          </div>
        </div>
      )}

      {/* Testing Configuration */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Testing Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testing Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testing Tools</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testingConfig.useAxe}
                    onChange={(e) => handleConfigChange('useAxe', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">axe-core (WCAG Rules)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testingConfig.usePa11y}
                    onChange={(e) => handleConfigChange('usePa11y', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Pa11y (HTML Validation)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testingConfig.useLighthouse}
                    onChange={(e) => handleConfigChange('useLighthouse', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">Lighthouse (Performance + A11y)</span>
                </label>
              </div>
            </div>

            {/* WCAG Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WCAG Conformance Level</label>
              <select
                value={testingConfig.wcagLevel}
                onChange={(e) => handleConfigChange('wcagLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">Level A (Basic)</option>
                <option value="AA">Level AA (Standard)</option>
                <option value="AAA">Level AAA (Enhanced)</option>
              </select>
            </div>

            {/* Browser */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Browser Engine</label>
              <select
                value={testingConfig.browser}
                onChange={(e) => handleConfigChange('browser', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit (Safari)</option>
              </select>
            </div>
          </div>

          {/* Advanced Configuration Preview */}
          {showAdvancedConfig && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Advanced Settings Active</h4>
              <p className="text-sm text-gray-600">Additional testing options are configured. Use the Advanced Config button to modify detailed settings.</p>
            </div>
          )}

          {/* Configuration Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Current Configuration</h4>
            <div className="text-sm text-blue-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <strong>Tools:</strong>{' '}
                  {[
                    testingConfig.useAxe && 'axe',
                    testingConfig.usePa11y && 'pa11y',
                    testingConfig.useLighthouse && 'lighthouse'
                  ].filter(Boolean).join(', ') || 'None selected'}
                </div>
                <div><strong>WCAG:</strong> Level {testingConfig.wcagLevel}</div>
                <div><strong>Browser:</strong> {testingConfig.browser}</div>
                <div><strong>Status:</strong> {automatedTestingInProgress ? 'Running' : 'Ready'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedTestControls; 