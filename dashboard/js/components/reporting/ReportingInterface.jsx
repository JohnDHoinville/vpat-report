/**
 * ReportingInterface Component
 * 
 * Main container component for all reporting functionality including
 * VPAT generation, report viewing, export management, and progress analytics.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAlpineState } from '../utils/alpineIntegration';

import VPATGenerator from './VPATGenerator';
import ReportViewer from './ReportViewer';
import ExportManager from './ExportManager';
import ProgressCharts from './ProgressCharts';

const ReportingInterface = ({ 
  sessionId = null,
  defaultTab = 'overview',
  onTabChange = () => {},
  onNotification = () => {},
  className = ''
}) => {
  // Alpine.js state integration
  const [alpineState, updateAlpineState] = useAlpineState();

  // Local state
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Available tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'chart-bar' },
    { id: 'reports', label: 'Reports', icon: 'document-text' },
    { id: 'vpat', label: 'VPAT Generator', icon: 'document-download' },
    { id: 'exports', label: 'Export Manager', icon: 'download' },
    { id: 'analytics', label: 'Analytics', icon: 'chart-pie' }
  ];

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Sync with Alpine.js state
  useEffect(() => {
    if (alpineState.selectedTestSession && !selectedSession) {
      setSelectedSession(alpineState.selectedTestSession.id);
    }
  }, [alpineState.selectedTestSession]);

  // Update session if passed as prop
  useEffect(() => {
    if (sessionId && sessionId !== selectedSession) {
      setSelectedSession(sessionId);
    }
  }, [sessionId]);

  /**
   * Load available testing sessions
   */
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await window.DashboardAPI.getTestingSessions();
      if (response.success) {
        setSessions(response.data || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      handleError('Failed to load testing sessions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle tab changes
   */
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    onTabChange(tabId);
    
    // Update Alpine.js state if needed
    updateAlpineState({
      activeReportingTab: tabId
    });
  };

  /**
   * Handle session selection
   */
  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
    
    // Update Alpine.js state
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      updateAlpineState({
        selectedTestSession: session
      });
    }
  };

  /**
   * Handle error messages
   */
  const handleError = (message) => {
    console.error('ReportingInterface Error:', message);
    onNotification('error', 'Error', message);
    
    // Also show in Alpine.js notification system
    if (alpineState.showNotification) {
      alpineState.showNotification('error', 'Error', message);
    }
  };

  /**
   * Handle success messages
   */
  const handleSuccess = (message) => {
    console.log('ReportingInterface Success:', message);
    onNotification('success', 'Success', message);
    
    // Also show in Alpine.js notification system
    if (alpineState.showNotification) {
      alpineState.showNotification('success', 'Success', message);
    }
  };

  /**
   * Handle VPAT generation
   */
  const handleVPATGenerate = (vpatInfo) => {
    handleSuccess(`VPAT report generated: ${vpatInfo.filename}`);
  };

  /**
   * Handle export completion
   */
  const handleExportComplete = (exportInfo) => {
    handleSuccess(`Export completed: ${exportInfo.filename}`);
  };

  /**
   * Handle report detail viewing
   */
  const handleViewDetails = (instance) => {
    // Open test instance details modal or navigate to details
    console.log('View details for instance:', instance);
    
    // You could trigger Alpine.js modal here
    if (alpineState.viewTestGrid) {
      alpineState.viewTestGrid(alpineState.selectedTestSession);
    }
  };

  /**
   * Handle analytics data updates
   */
  const handleAnalyticsUpdate = (data) => {
    // Update any global state or trigger other actions
    console.log('Analytics data updated:', data);
  };

  /**
   * Get icon SVG
   */
  const getTabIcon = (iconName) => {
    const icons = {
      'chart-bar': (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'document-text': (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      'document-download': (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      'download': (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
      'chart-pie': (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    };
    return icons[iconName] || icons['chart-bar'];
  };

  /**
   * Render overview tab content
   */
  const renderOverview = () => {
    const selectedSessionData = sessions.find(s => s.id === selectedSession);
    
    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        {selectedSessionData && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-blue-900 mb-3">Session Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Session:</span> {selectedSessionData.name}
              </div>
              <div>
                <span className="font-medium text-blue-800">Project:</span> {selectedSessionData.project_name}
              </div>
              <div>
                <span className="font-medium text-blue-800">Created:</span> {new Date(selectedSessionData.created_at).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium text-blue-800">Conformance Level:</span> {selectedSessionData.conformance_level || 'AA'}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => handleTabChange('reports')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              {getTabIcon('document-text')}
              <div>
                <div className="font-medium text-gray-900 group-hover:text-blue-600">View Reports</div>
                <div className="text-sm text-gray-600">Browse test results</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('vpat')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              {getTabIcon('document-download')}
              <div>
                <div className="font-medium text-gray-900 group-hover:text-blue-600">Generate VPAT</div>
                <div className="text-sm text-gray-600">Create compliance reports</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('exports')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              {getTabIcon('download')}
              <div>
                <div className="font-medium text-gray-900 group-hover:text-blue-600">Export Data</div>
                <div className="text-sm text-gray-600">Download test data</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleTabChange('analytics')}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
          >
            <div className="flex items-center space-x-3">
              {getTabIcon('chart-pie')}
              <div>
                <div className="font-medium text-gray-900 group-hover:text-blue-600">View Analytics</div>
                <div className="text-sm text-gray-600">Progress insights</div>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Activity or Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Available Reports</h4>
          <div className="text-sm text-gray-600">
            {selectedSession ? (
              <p>Select a tab above to generate reports, view analytics, or export data for the selected testing session.</p>
            ) : (
              <p>Please select a testing session to view available reporting options.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className={`reporting-interface bg-gray-50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reporting & Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate reports, analyze progress, and export accessibility testing data
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Session Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Session:</label>
              <select
                value={selectedSession || ''}
                onChange={handleSessionChange}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={loading}
              >
                <option value="">Select session...</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} - {session.project_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 bg-white border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {getTabIcon(tab.icon)}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-600">Loading reporting interface...</span>
          </div>
        ) : (
          <div>
            {activeTab === 'overview' && renderOverview()}
            
            {activeTab === 'reports' && (
              <ReportViewer
                sessionId={selectedSession}
                onViewDetails={handleViewDetails}
                onError={handleError}
              />
            )}
            
            {activeTab === 'vpat' && (
              <VPATGenerator
                sessionId={selectedSession}
                onGenerate={handleVPATGenerate}
                onError={handleError}
              />
            )}
            
            {activeTab === 'exports' && (
              <ExportManager
                sessionId={selectedSession}
                onExport={handleExportComplete}
                onError={handleError}
              />
            )}
            
            {activeTab === 'analytics' && (
              <ProgressCharts
                sessionId={selectedSession}
                onDataUpdate={handleAnalyticsUpdate}
                onError={handleError}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ReportingInterface.propTypes = {
  sessionId: PropTypes.string,
  defaultTab: PropTypes.oneOf(['overview', 'reports', 'vpat', 'exports', 'analytics']),
  onTabChange: PropTypes.func,
  onNotification: PropTypes.func,
  className: PropTypes.string
};

export default ReportingInterface; 