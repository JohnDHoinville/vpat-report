import React, { useState, useEffect, useMemo } from 'react';
import { useAlpineState } from '../../utils/alpineIntegration.js';

/**
 * TestStatusManager Component
 * 
 * Comprehensive management interface for manual testing progress and coordination.
 * Provides status overview, bulk updates, progress visualization, and assignment management.
 */
const TestStatusManager = () => {
  // Get manual testing state from Alpine.js bridge
  const [manualTestingSession] = useAlpineState('manualTestingSession', null);
  const [manualTestingAssignments] = useAlpineState('manualTestingAssignments', []);
  const [manualTestingProgress] = useAlpineState('manualTestingProgress', null);
  const [selectedProject] = useAlpineState('selectedProject', null);

  // Local state
  const [selectedTests, setSelectedTests] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'detailed', 'chart'
  const [filters, setFilters] = useState({
    status: '',
    assignee: '',
    priority: '',
    wcag_level: ''
  });
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration (replace with real API calls)
  const [availableTesters] = useState([
    { id: 'user1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 'user2', name: 'Bob Smith', email: 'bob@example.com' },
    { id: 'user3', name: 'Carol Wilson', email: 'carol@example.com' }
  ]);

  // Calculate progress statistics
  const progressStats = useMemo(() => {
    if (!manualTestingAssignments || manualTestingAssignments.length === 0) {
      return {
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        needs_review: 0,
        percentage: 0
      };
    }

    const stats = manualTestingAssignments.reduce((acc, test) => {
      acc.total++;
      acc[test.status] = (acc[test.status] || 0) + 1;
      return acc;
    }, { total: 0, pending: 0, in_progress: 0, completed: 0, needs_review: 0 });

    stats.percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return stats;
  }, [manualTestingAssignments]);

  // Filter and group tests
  const filteredTests = useMemo(() => {
    let filtered = manualTestingAssignments || [];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(test => test[key] === value);
      }
    });

    return filtered;
  }, [manualTestingAssignments, filters]);

  // Handle test selection
  const handleTestSelection = (testId, checked) => {
    setSelectedTests(prev => 
      checked 
        ? [...prev, testId]
        : prev.filter(id => id !== testId)
    );
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    setSelectedTests(checked ? filteredTests.map(test => test.id) : []);
  };

  // Handle bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedTests.length === 0) return;

    setLoading(true);
    try {
      // Call API for bulk updates
      const updates = {
        testIds: selectedTests,
        action: bulkAction,
        assignee: bulkAssignee
      };

      // Mock API call (replace with actual implementation)
      console.log('Bulk action:', updates);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset selections
      setSelectedTests([]);
      setBulkAction('');
      setBulkAssignee('');

      // Show success message
      alert(`Successfully applied ${bulkAction} to ${selectedTests.length} tests.`);
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Failed to apply bulk action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ status: '', assignee: '', priority: '', wcag_level: '' });
  };

  // Export status report
  const exportStatusReport = () => {
    const csvData = filteredTests.map(test => ({
      'Test ID': test.id,
      'Criterion': test.criterion_number,
      'Title': test.title,
      'Status': test.status,
      'Page': test.page_title,
      'Assignee': test.assignee || 'Unassigned',
      'Priority': test.priority || 'Medium',
      'Last Updated': test.updated_at
    }));

    // Convert to CSV (simplified)
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual-testing-status-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      needs_review: 'bg-orange-100 text-orange-800'
    };
    return styles[status] || styles.pending;
  };

  // Don't render if no session
  if (!selectedProject || !manualTestingSession) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <i className="fas fa-tasks text-gray-400 text-4xl mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Manual Testing Session</h3>
          <p className="text-gray-500">Start a manual testing session to manage test statuses.</p>
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
            <h2 className="text-2xl font-bold text-gray-900">Test Status Manager</h2>
            <p className="text-gray-600 mt-1">
              Session: {manualTestingSession.name} • {progressStats.total} total tests
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportStatusReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-download mr-2"></i>Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h3>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{progressStats.percentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressStats.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{progressStats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{progressStats.in_progress}</div>
            <div className="text-sm text-yellow-600">In Progress</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{progressStats.completed}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{progressStats.needs_review}</div>
            <div className="text-sm text-orange-600">Needs Review</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Management</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'overview' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1 text-sm rounded ${viewMode === 'detailed' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="needs_review">Needs Review</option>
          </select>

          <select
            value={filters.wcag_level}
            onChange={(e) => handleFilterChange('wcag_level', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="">All WCAG Levels</option>
            <option value="A">Level A</option>
            <option value="AA">Level AA</option>
            <option value="AAA">Level AAA</option>
          </select>

          <select
            value={filters.assignee}
            onChange={(e) => handleFilterChange('assignee', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="">All Assignees</option>
            <option value="">Unassigned</option>
            {availableTesters.map(tester => (
              <option key={tester.id} value={tester.id}>{tester.name}</option>
            ))}
          </select>

          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedTests.length === filteredTests.length && filteredTests.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700">
              {selectedTests.length} of {filteredTests.length} selected
            </span>
          </div>

          {selectedTests.length > 0 && (
            <div className="flex items-center space-x-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Action</option>
                <option value="assign">Assign to Tester</option>
                <option value="mark_in_progress">Mark In Progress</option>
                <option value="mark_completed">Mark Completed</option>
                <option value="mark_needs_review">Mark Needs Review</option>
                <option value="reset_status">Reset to Pending</option>
              </select>

              {bulkAction === 'assign' && (
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Tester</option>
                  {availableTesters.map(tester => (
                    <option key={tester.id} value={tester.id}>{tester.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || loading || (bulkAction === 'assign' && !bulkAssignee)}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Applying...
                  </>
                ) : (
                  'Apply Action'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Test Assignments ({filteredTests.length})
          </h3>
        </div>

        {filteredTests.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredTests.map((test) => (
              <div key={test.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(test.id)}
                    onChange={(e) => handleTestSelection(test.id, e.target.checked)}
                    className="mt-1 rounded text-purple-600 focus:ring-purple-500"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">
                          {test.criterion_number}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(test.status)}`}>
                          {test.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {test.wcag_level && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            WCAG {test.wcag_level}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {test.updated_at && (
                          <span>Updated {new Date(test.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{test.title}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Page: {test.page_title}</span>
                      <span>
                        Assignee: {test.assignee ? 
                          availableTesters.find(t => t.id === test.assignee)?.name || test.assignee 
                          : 'Unassigned'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center py-8">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Found</h3>
              <p className="text-gray-500">
                No tests match your current filters. Try adjusting the filters above.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestStatusManager; 