/**
 * ExportManager Component
 * 
 * Provides interface for managing various export formats and download options
 * for accessibility testing data and reports.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAlpineState } from '../utils/alpineIntegration';

const ExportManager = ({ 
  sessionId = null,
  onExport = () => {},
  onError = () => {},
  className = ''
}) => {
  // Alpine.js state integration
  const [alpineState, updateAlpineState] = useAlpineState();

  // Local state
  const [selectedSession, setSelectedSession] = useState(sessionId);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [exportConfig, setExportConfig] = useState({
    format: 'json',
    includeEvidence: true,
    includeAuditTrail: false,
    includeMetadata: true,
    dateRange: 'all',
    status: 'all',
    testMethod: 'all',
    wcagLevel: 'all'
  });

  // Available export formats
  const exportFormats = [
    { value: 'json', label: 'JSON Data', description: 'Structured data format for programmatic use' },
    { value: 'csv', label: 'CSV Spreadsheet', description: 'Tabular format for Excel and analysis tools' },
    { value: 'pdf', label: 'PDF Report', description: 'Formatted document for sharing and printing' },
    { value: 'html', label: 'HTML Report', description: 'Web-based interactive report' },
    { value: 'xlsx', label: 'Excel Workbook', description: 'Microsoft Excel format with multiple sheets' }
  ];

  // Load sessions and export history on mount
  useEffect(() => {
    loadSessions();
    loadExportHistory();
  }, []);

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
        
        // Auto-select current session if available
        if (alpineState.selectedTestSession && !selectedSession) {
          setSelectedSession(alpineState.selectedTestSession.id);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      onError('Failed to load testing sessions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load export history
   */
  const loadExportHistory = () => {
    // Load from localStorage or API
    const stored = localStorage.getItem('exportHistory');
    if (stored) {
      try {
        setExportHistory(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing export history:', error);
      }
    }
  };

  /**
   * Save export to history
   */
  const saveToHistory = (exportInfo) => {
    const newHistory = [exportInfo, ...exportHistory.slice(0, 9)]; // Keep last 10
    setExportHistory(newHistory);
    localStorage.setItem('exportHistory', JSON.stringify(newHistory));
  };

  /**
   * Handle session selection change
   */
  const handleSessionChange = (e) => {
    const sessionId = e.target.value;
    setSelectedSession(sessionId);
  };

  /**
   * Handle configuration field changes
   */
  const handleConfigChange = (field, value) => {
    setExportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Export session results
   */
  const exportSessionResults = async () => {
    if (!selectedSession) {
      onError('Please select a testing session');
      return;
    }

    setExporting(true);
    try {
      console.log('📤 Exporting session results:', selectedSession);

      // Build query parameters based on configuration
      const params = new URLSearchParams({
        format: exportConfig.format,
        include_evidence: exportConfig.includeEvidence.toString(),
        include_audit_trail: exportConfig.includeAuditTrail.toString(),
        include_metadata: exportConfig.includeMetadata.toString(),
        status: exportConfig.status,
        test_method: exportConfig.testMethod,
        wcag_level: exportConfig.wcagLevel,
        date_range: exportConfig.dateRange
      });

      // Call export API
      const response = await fetch(`${window.DashboardAPI.apiBaseUrl}/sessions/${selectedSession}/export?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${window.DashboardAPI.getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get session info for filename
      const sessionInfo = sessions.find(s => s.id === selectedSession);
      const sessionName = sessionInfo?.name || 'session';

      // Handle download based on format
      let content, mimeType, fileExtension;
      
      if (exportConfig.format === 'json') {
        content = await response.text();
        mimeType = 'application/json';
        fileExtension = 'json';
      } else if (exportConfig.format === 'csv') {
        content = await response.text();
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else if (exportConfig.format === 'pdf') {
        content = await response.blob();
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
      } else if (exportConfig.format === 'html') {
        content = await response.text();
        mimeType = 'text/html';
        fileExtension = 'html';
      } else if (exportConfig.format === 'xlsx') {
        content = await response.blob();
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
      }

      // Create and trigger download
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${sessionName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to history
      const exportInfo = {
        id: Date.now().toString(),
        sessionId: selectedSession,
        sessionName: sessionName,
        format: exportConfig.format,
        config: { ...exportConfig },
        timestamp: new Date().toISOString(),
        filename: a.download
      };
      saveToHistory(exportInfo);

      // Success callback
      onExport(exportInfo);

      console.log('✅ Session results exported successfully');

    } catch (error) {
      console.error('Error exporting session results:', error);
      onError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export test grid data
   */
  const exportTestGrid = async () => {
    if (!selectedSession) {
      onError('Please select a testing session');
      return;
    }

    setExporting(true);
    try {
      console.log('📊 Exporting test grid data:', selectedSession);

      const response = await window.DashboardAPI.getTestInstances(selectedSession);
      if (!response.success) {
        throw new Error('Failed to load test instances');
      }

      const instances = Array.isArray(response.data) ? response.data : [];
      const sessionInfo = sessions.find(s => s.id === selectedSession);

      const exportData = {
        session: sessionInfo,
        test_instances: instances,
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: alpineState.currentUser?.username || 'System',
          total_instances: instances.length,
          format: 'test_grid'
        }
      };

      // Create CSV format for test grid
      if (exportConfig.format === 'csv') {
        const csvHeaders = ['Criterion', 'Page URL', 'Status', 'Test Method', 'WCAG Level', 'Last Updated'];
        const csvRows = instances.map(instance => [
          instance.criterion_number || instance.requirement_id || '',
          instance.page_url || '',
          instance.status || 'not_tested',
          instance.test_method_used || '',
          instance.wcag_level || 'AA',
          instance.updated_at ? new Date(instance.updated_at).toLocaleDateString() : ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-grid-${sessionInfo?.name.replace(/\s+/g, '-') || 'session'}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // JSON format
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-grid-${sessionInfo?.name.replace(/\s+/g, '-') || 'session'}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      console.log('✅ Test grid exported successfully');

    } catch (error) {
      console.error('Error exporting test grid:', error);
      onError(`Test grid export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  /**
   * Re-download from history
   */
  const redownloadFromHistory = (historyItem) => {
    // This would trigger the same export with the saved configuration
    setExportConfig(historyItem.config);
    setSelectedSession(historyItem.sessionId);
    
    // Wait for state to update, then export
    setTimeout(() => {
      exportSessionResults();
    }, 100);
  };

  /**
   * Clear export history
   */
  const clearHistory = () => {
    setExportHistory([]);
    localStorage.removeItem('exportHistory');
  };

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className={`export-manager bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Export Manager</h3>
            <p className="text-sm text-gray-600 mt-1">
              Export accessibility testing data in various formats
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportTestGrid}
              disabled={!selectedSession || exporting}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Export Grid
            </button>
            <button
              onClick={exportSessionResults}
              disabled={!selectedSession || exporting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export</span>
                </>
              )}
            </button>
          </div>
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
            <span className="text-gray-600">Loading sessions...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Testing Session <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSession || ''}
                onChange={handleSessionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={exporting}
              >
                <option value="">Select a testing session...</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} - {session.project_name} ({new Date(session.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
              {selectedSessionData && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedSessionData.name}
                    {selectedSessionData.description && (
                      <div className="mt-1">{selectedSessionData.description}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Export Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Export Configuration</h4>
              
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exportFormats.map(format => (
                    <label key={format.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value={format.value}
                        checked={exportConfig.format === format.value}
                        onChange={(e) => handleConfigChange('format', e.target.value)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        disabled={exporting}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{format.label}</div>
                        <div className="text-xs text-gray-600">{format.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={exportConfig.status}
                    onChange={(e) => handleConfigChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={exporting}
                  >
                    <option value="all">All Statuses</option>
                    <option value="passed">Passed Only</option>
                    <option value="failed">Failed Only</option>
                    <option value="not_tested">Not Tested Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Method</label>
                  <select
                    value={exportConfig.testMethod}
                    onChange={(e) => handleConfigChange('testMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={exporting}
                  >
                    <option value="all">All Methods</option>
                    <option value="automated">Automated Only</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WCAG Level</label>
                  <select
                    value={exportConfig.wcagLevel}
                    onChange={(e) => handleConfigChange('wcagLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={exporting}
                  >
                    <option value="all">All Levels</option>
                    <option value="A">Level A Only</option>
                    <option value="AA">Level AA Only</option>
                    <option value="AAA">Level AAA Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={exportConfig.dateRange}
                    onChange={(e) => handleConfigChange('dateRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={exporting}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>

              {/* Include Options */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-900">Include in Export</h5>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeEvidence}
                      onChange={(e) => handleConfigChange('includeEvidence', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={exporting}
                    />
                    <span className="ml-2 text-sm text-gray-700">Evidence files and screenshots</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeAuditTrail}
                      onChange={(e) => handleConfigChange('includeAuditTrail', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={exporting}
                    />
                    <span className="ml-2 text-sm text-gray-700">Audit trail and change history</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportConfig.includeMetadata}
                      onChange={(e) => handleConfigChange('includeMetadata', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      disabled={exporting}
                    />
                    <span className="ml-2 text-sm text-gray-700">Session metadata and configuration</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Export History */}
            {exportHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Recent Exports</h4>
                  <button
                    onClick={clearHistory}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear History
                  </button>
                </div>
                <div className="space-y-2">
                  {exportHistory.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {item.sessionName} ({item.format.toUpperCase()})
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => redownloadFromHistory(item)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        disabled={exporting}
                      >
                        Re-download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ExportManager.propTypes = {
  sessionId: PropTypes.string,
  onExport: PropTypes.func,
  onError: PropTypes.func,
  className: PropTypes.string
};

export default ExportManager; 