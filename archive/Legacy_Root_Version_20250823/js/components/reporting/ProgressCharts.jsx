/**
 * ProgressCharts Component
 * 
 * Provides visual charts and progress indicators for accessibility testing data
 * including completion rates, pass/fail ratios, and trend analysis.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAlpineState } from '../utils/alpineIntegration';

const ProgressCharts = ({ 
  sessionId = null,
  chartType = 'all',
  onDataUpdate = () => {},
  onError = () => {},
  className = ''
}) => {
  // Alpine.js state integration
  const [alpineState, updateAlpineState] = useAlpineState();

  // Local state
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [sessions, setSessions] = useState([]);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');

  // Load sessions and initial data on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load test data when session changes
  useEffect(() => {
    if (selectedSession) {
      loadTestData(selectedSession);
    }
  }, [selectedSession, timeRange]);

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
   * Load test data for charts
   */
  const loadTestData = async (sessionId) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      console.log('📊 Loading test data for charts:', sessionId);

      const [sessionResponse, instancesResponse, auditResponse] = await Promise.all([
        window.DashboardAPI.getTestingSession(sessionId),
        window.DashboardAPI.getTestInstances(sessionId),
        window.DashboardAPI.getAuditTrail(sessionId, { limit: 100, includeMetadata: true })
      ]);

      if (sessionResponse.success && instancesResponse.success) {
        const session = sessionResponse.data;
        const instances = Array.isArray(instancesResponse.data) ? instancesResponse.data : [];
        const auditTrail = auditResponse.success ? auditResponse.data : [];

        const processedData = processTestData(session, instances, auditTrail);
        setTestData(processedData);
        onDataUpdate(processedData);

        console.log('✅ Test data loaded for charts');
      } else {
        throw new Error('Failed to load test data');
      }
    } catch (error) {
      console.error('Error loading test data:', error);
      onError('Failed to load test data');
      setTestData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Process raw data for charts
   */
  const processTestData = (session, instances, auditTrail) => {
    // Basic statistics
    const stats = {
      total: instances.length,
      passed: instances.filter(i => i.status === 'passed').length,
      failed: instances.filter(i => i.status === 'failed').length,
      notTested: instances.filter(i => i.status === 'not_tested' || !i.status).length,
      inProgress: instances.filter(i => i.status === 'in_progress').length,
      automated: instances.filter(i => i.test_method_used === 'automated').length,
      manual: instances.filter(i => i.test_method_used === 'manual').length
    };

    // WCAG level breakdown
    const wcagBreakdown = {
      A: instances.filter(i => i.wcag_level === 'A'),
      AA: instances.filter(i => i.wcag_level === 'AA'),
      AAA: instances.filter(i => i.wcag_level === 'AAA')
    };

    // Page breakdown
    const pageStats = {};
    instances.forEach(instance => {
      const pageId = instance.page_id;
      if (!pageStats[pageId]) {
        pageStats[pageId] = {
          page_id: pageId,
          url: instance.page_url || `Page ${pageId}`,
          total: 0,
          passed: 0,
          failed: 0,
          notTested: 0
        };
      }
      pageStats[pageId].total++;
      if (instance.status === 'passed') pageStats[pageId].passed++;
      else if (instance.status === 'failed') pageStats[pageId].failed++;
      else pageStats[pageId].notTested++;
    });

    // Time series data from audit trail
    const timeSeriesData = processTimeSeriesData(auditTrail, instances);

    // Test method efficiency
    const methodStats = {
      automated: {
        total: stats.automated,
        passed: instances.filter(i => i.test_method_used === 'automated' && i.status === 'passed').length,
        failed: instances.filter(i => i.test_method_used === 'automated' && i.status === 'failed').length
      },
      manual: {
        total: stats.manual,
        passed: instances.filter(i => i.test_method_used === 'manual' && i.status === 'passed').length,
        failed: instances.filter(i => i.test_method_used === 'manual' && i.status === 'failed').length
      }
    };

    return {
      session,
      stats,
      wcagBreakdown,
      pageStats: Object.values(pageStats),
      timeSeriesData,
      methodStats,
      instances
    };
  };

  /**
   * Process time series data for progress over time
   */
  const processTimeSeriesData = (auditTrail, instances) => {
    const timePoints = {};
    
    // Group audit events by date
    auditTrail.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!timePoints[date]) {
        timePoints[date] = {
          date,
          events: [],
          completed: 0,
          total: instances.length
        };
      }
      timePoints[date].events.push(event);
    });

    // Calculate cumulative completion
    const sortedDates = Object.keys(timePoints).sort();
    let cumulativeCompleted = 0;

    return sortedDates.map(date => {
      const point = timePoints[date];
      // Count test completions for this date
      const completions = point.events.filter(event => 
        event.action_type === 'test_completed' || 
        event.action_type === 'result_updated'
      ).length;
      
      cumulativeCompleted += completions;
      
      return {
        date,
        completed: cumulativeCompleted,
        total: instances.length,
        completionRate: instances.length > 0 ? (cumulativeCompleted / instances.length) * 100 : 0,
        events: point.events.length
      };
    });
  };

  /**
   * Calculate percentage for progress bars
   */
  const getPercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  /**
   * Handle session selection change
   */
  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
  };

  /**
   * Render overview charts
   */
  const renderOverviewCharts = () => {
    if (!testData) return null;

    const { stats } = testData;
    const total = stats.total;
    const tested = stats.passed + stats.failed;
    const completionRate = getPercentage(tested, total);
    const passRate = tested > 0 ? getPercentage(stats.passed, tested) : 0;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-blue-100">Total Tests</div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="text-2xl font-bold">{stats.passed}</div>
            <div className="text-green-100">Passed</div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white">
            <div className="text-2xl font-bold">{stats.failed}</div>
            <div className="text-red-100">Failed</div>
          </div>
          <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg p-4 text-white">
            <div className="text-2xl font-bold">{stats.notTested}</div>
            <div className="text-gray-100">Not Tested</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Completion Rate */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Testing Progress</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Completion</span>
                  <span className="font-medium">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                    style={{width: `${completionRate}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {tested} of {total} tests completed
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Pass Rate</span>
                  <span className="font-medium">{passRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                    style={{width: `${passRate}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {stats.passed} of {tested} tests passed
                </div>
              </div>
            </div>
          </div>

          {/* Test Method Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Test Methods</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm text-gray-700">Automated</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {stats.automated} tests ({getPercentage(stats.automated, total)}%)
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-gray-700">Manual</span>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {stats.manual} tests ({getPercentage(stats.manual, total)}%)
                </div>
              </div>
              
              {/* Visual representation */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3 flex overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full" 
                    style={{width: `${getPercentage(stats.automated, total)}%`}}
                  ></div>
                  <div 
                    className="bg-yellow-500 h-full" 
                    style={{width: `${getPercentage(stats.manual, total)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WCAG Level Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">WCAG Level Distribution</h4>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(testData.wcagBreakdown).map(([level, instances]) => {
              const passed = instances.filter(i => i.status === 'passed').length;
              const failed = instances.filter(i => i.status === 'failed').length;
              const passRate = instances.length > 0 ? getPercentage(passed, instances.length) : 0;
              
              return (
                <div key={level} className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{instances.length}</div>
                  <div className="text-sm text-gray-600 mb-2">Level {level}</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{width: `${passRate}%`}}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">{passRate}% pass rate</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render page breakdown chart
   */
  const renderPageBreakdown = () => {
    if (!testData) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Progress by Page</h4>
        <div className="space-y-4">
          {testData.pageStats.map((page, index) => {
            const completionRate = getPercentage(page.passed + page.failed, page.total);
            const passRate = (page.passed + page.failed) > 0 ? getPercentage(page.passed, page.passed + page.failed) : 0;
            
            return (
              <div key={page.page_id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {page.url}
                    </div>
                    <div className="text-xs text-gray-500">
                      {page.total} tests • {page.passed} passed • {page.failed} failed
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 ml-4">
                    {completionRate}% complete
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{width: `${completionRate}%`}}
                    ></div>
                  </div>
                  {completionRate > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full transition-all duration-300" 
                        style={{width: `${passRate}%`}}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * Render timeline chart
   */
  const renderTimeline = () => {
    if (!testData || !testData.timeSeriesData.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Progress Timeline</h4>
          <div className="text-center py-8 text-gray-500">
            No timeline data available
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Progress Timeline</h4>
        <div className="space-y-3">
          {testData.timeSeriesData.map((point, index) => (
            <div key={point.date} className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 w-24">
                {new Date(point.date).toLocaleDateString()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">
                    {point.completed} of {point.total} completed
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {point.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{width: `${point.completionRate}%`}}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500 w-16 text-right">
                {point.events} events
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className={`progress-charts bg-gray-50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Progress Analytics</h3>
            <p className="text-sm text-gray-600 mt-1">
              Visual analysis of testing progress and statistics
            </p>
          </div>
        </div>
      </div>

      {/* Session Selection */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
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
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        ) : testData ? (
          <div>
            {/* Chart Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveChart('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeChart === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveChart('pages')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeChart === 'pages'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  By Page
                </button>
                <button
                  onClick={() => setActiveChart('timeline')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeChart === 'timeline'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Timeline
                </button>
              </nav>
            </div>

            {/* Chart Content */}
            {activeChart === 'overview' && renderOverviewCharts()}
            {activeChart === 'pages' && renderPageBreakdown()}
            {activeChart === 'timeline' && renderTimeline()}
          </div>
        ) : selectedSession ? (
          <div className="text-center py-12 text-gray-500">
            No analytics data available for the selected session
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Please select a testing session to view analytics
          </div>
        )}
      </div>
    </div>
  );
};

ProgressCharts.propTypes = {
  sessionId: PropTypes.string,
  chartType: PropTypes.oneOf(['all', 'overview', 'timeline', 'breakdown']),
  onDataUpdate: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string
};

export default ProgressCharts; 