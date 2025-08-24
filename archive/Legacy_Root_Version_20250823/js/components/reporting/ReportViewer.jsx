/**
 * ReportViewer Component
 * 
 * Provides interface for viewing, analyzing, and managing accessibility reports
 * including session reports, compliance summaries, and detailed findings.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAlpineState } from '../utils/alpineIntegration';

const ReportViewer = ({ 
  sessionId = null,
  reportType = 'session',
  onViewDetails = () => {},
  onError = () => {},
  className = ''
}) => {
  // Alpine.js state integration
  const [alpineState, updateAlpineState] = useAlpineState();

  // Local state
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [sessions, setSessions] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: 'all',
    wcagLevel: 'all',
    testMethod: 'all',
    showPassed: true,
    showFailed: true,
    showNotTested: true
  });

  // Load sessions and initial data on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load report when session changes
  useEffect(() => {
    if (selectedSession) {
      loadReportData(selectedSession);
    }
  }, [selectedSession, reportType]);

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
    try {
      const response = await window.DashboardAPI.getTestingSessions();
      if (response.success) {
        setSessions(response.data || []);
        
        // Auto-select current session if available
        if (alpineState.selectedTestSession && !selectedSession) {
          setSelectedSession(alpineState.selectedTestSession.id);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      onError('Failed to load testing sessions');
    }
  };

  /**
   * Load report data for selected session
   */
  const loadReportData = async (sessionId) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      console.log('📊 Loading report data for session:', sessionId);

      // Load session details, test instances, and compliance report
      const [sessionResponse, instancesResponse, complianceResponse] = await Promise.all([
        window.DashboardAPI.getTestingSession(sessionId),
        window.DashboardAPI.getTestInstances(sessionId),
        window.DashboardAPI.getComplianceReport(sessionId)
      ]);

      if (sessionResponse.success && instancesResponse.success) {
        const session = sessionResponse.data;
        const instances = Array.isArray(instancesResponse.data) ? instancesResponse.data : [];
        const compliance = complianceResponse.success ? complianceResponse.data : null;

        // Process and organize the data
        const processedData = processReportData(session, instances, compliance);
        setReportData(processedData);

        console.log('✅ Report data loaded successfully');
      } else {
        throw new Error('Failed to load report data');
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      onError('Failed to load report data');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process raw data into structured report format
   */
  const processReportData = (session, instances, compliance) => {
    // Group instances by requirement
    const instancesByRequirement = {};
    instances.forEach(instance => {
      const reqId = instance.requirement_id || instance.criterion_number;
      if (!instancesByRequirement[reqId]) {
        instancesByRequirement[reqId] = [];
      }
      instancesByRequirement[reqId].push(instance);
    });

    // Calculate statistics
    const stats = {
      total: instances.length,
      passed: instances.filter(i => i.status === 'passed').length,
      failed: instances.filter(i => i.status === 'failed').length,
      notTested: instances.filter(i => i.status === 'not_tested' || !i.status).length,
      inProgress: instances.filter(i => i.status === 'in_progress').length,
      automated: instances.filter(i => i.test_method_used === 'automated').length,
      manual: instances.filter(i => i.test_method_used === 'manual').length
    };

    // Group by WCAG level
    const byWcagLevel = {
      A: instances.filter(i => i.wcag_level === 'A'),
      AA: instances.filter(i => i.wcag_level === 'AA'),
      AAA: instances.filter(i => i.wcag_level === 'AAA')
    };

    // Group by page
    const byPage = {};
    instances.forEach(instance => {
      const pageId = instance.page_id;
      if (!byPage[pageId]) {
        byPage[pageId] = {
          page_id: pageId,
          url: instance.page_url || `Page ${pageId}`,
          instances: []
        };
      }
      byPage[pageId].instances.push(instance);
    });

    return {
      session,
      instances,
      instancesByRequirement,
      stats,
      byWcagLevel,
      byPage: Object.values(byPage),
      compliance
    };
  };

  /**
   * Filter instances based on current filters
   */
  const getFilteredInstances = () => {
    if (!reportData) return [];

    return reportData.instances.filter(instance => {
      // Status filter
      if (filters.status !== 'all' && instance.status !== filters.status) {
        return false;
      }

      // WCAG level filter
      if (filters.wcagLevel !== 'all' && instance.wcag_level !== filters.wcagLevel) {
        return false;
      }

      // Test method filter
      if (filters.testMethod !== 'all' && instance.test_method_used !== filters.testMethod) {
        return false;
      }

      // Show/hide passed
      if (!filters.showPassed && instance.status === 'passed') {
        return false;
      }

      // Show/hide failed
      if (!filters.showFailed && instance.status === 'failed') {
        return false;
      }

      // Show/hide not tested
      if (!filters.showNotTested && (instance.status === 'not_tested' || !instance.status)) {
        return false;
      }

      return true;
    });
  };

  /**
   * Handle session selection change
   */
  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  /**
   * Export current report view
   */
  const exportReport = async () => {
    if (!selectedSession || !reportData) return;

    try {
      const exportData = {
        session: reportData.session,
        statistics: reportData.stats,
        filtered_instances: getFilteredInstances(),
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: alpineState.currentUser?.username || 'System',
          filters: filters,
          active_tab: activeTab
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportData.session.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('📥 Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      onError('Failed to export report');
    }
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status) => {
    const badges = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      not_tested: 'bg-gray-100 text-gray-800'
    };

    return badges[status] || badges.not_tested;
  };

  /**
   * Render overview statistics
   */
  const renderOverview = () => {
    if (!reportData) return null;

    const { stats, session } = reportData;
    const completionRate = stats.total > 0 ? ((stats.passed + stats.failed) / stats.total * 100).toFixed(1) : 0;
    const passRate = (stats.passed + stats.failed) > 0 ? (stats.passed / (stats.passed + stats.failed) * 100).toFixed(1) : 0;

    return (
      <div className="space-y-6">
        {/* Session Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Session Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Name:</span> {session.name}
            </div>
            <div>
              <span className="font-medium text-blue-800">Project:</span> {session.project_name}
            </div>
            <div>
              <span className="font-medium text-blue-800">Created:</span> {new Date(session.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium text-blue-800">Conformance Level:</span> {session.conformance_level || 'AA'}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-sm text-gray-600">Passed</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.notTested}</div>
            <div className="text-sm text-gray-600">Not Tested</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Completion Rate</span>
              <span>{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: `${completionRate}%`}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Pass Rate</span>
              <span>{passRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{width: `${passRate}%`}}></div>
            </div>
          </div>
        </div>

        {/* WCAG Level Breakdown */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">WCAG Level Breakdown</h4>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(reportData.byWcagLevel).map(([level, instances]) => (
              <div key={level} className="text-center">
                <div className="text-lg font-semibold text-gray-900">{instances.length}</div>
                <div className="text-sm text-gray-600">Level {level}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render detailed results table
   */
  const renderDetails = () => {
    const filteredInstances = getFilteredInstances();

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="in_progress">In Progress</option>
                <option value="not_tested">Not Tested</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WCAG Level</label>
              <select
                value={filters.wcagLevel}
                onChange={(e) => handleFilterChange('wcagLevel', e.target.value)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="A">Level A</option>
                <option value="AA">Level AA</option>
                <option value="AAA">Level AAA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Method</label>
              <select
                value={filters.testMethod}
                onChange={(e) => handleFilterChange('testMethod', e.target.value)}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="automated">Automated</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => setFilters({
                  status: 'all',
                  wcagLevel: 'all',
                  testMethod: 'all',
                  showPassed: true,
                  showFailed: true,
                  showNotTested: true
                })}
                className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criterion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstances.map((instance, index) => (
                  <tr key={instance.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {instance.criterion_number || instance.requirement_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {instance.requirement_title || 'No title'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instance.page_url || `Page ${instance.page_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(instance.status)}`}>
                        {instance.status || 'not_tested'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instance.test_method_used || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {instance.wcag_level || 'AA'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onViewDetails(instance)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredInstances.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No results found with current filters
            </div>
          )}
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredInstances.length} of {reportData?.instances.length || 0} results
        </div>
      </div>
    );
  };

  return (
    <div className={`report-viewer bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Report Viewer</h3>
            <p className="text-sm text-gray-600 mt-1">
              View and analyze accessibility testing reports
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportReport}
              disabled={!reportData}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Session Selection */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Session:</label>
          <select
            value={selectedSession || ''}
            onChange={handleSessionChange}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a testing session...</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.name} - {session.project_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-600">Loading report data...</span>
          </div>
        ) : reportData ? (
          <div>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'details'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Detailed Results
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'details' && renderDetails()}
          </div>
        ) : selectedSession ? (
          <div className="text-center py-8 text-gray-500">
            No report data available for the selected session
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Please select a testing session to view the report
          </div>
        )}
      </div>
    </div>
  );
};

ReportViewer.propTypes = {
  sessionId: PropTypes.string,
  reportType: PropTypes.oneOf(['session', 'compliance', 'summary']),
  onViewDetails: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string
};

export default ReportViewer; 