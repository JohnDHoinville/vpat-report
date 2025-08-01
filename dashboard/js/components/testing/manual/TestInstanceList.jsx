import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../../utils/alpineIntegration.js';

/**
 * TestInstanceList Component
 * 
 * Displays manual testing assignments grouped by page with filtering capabilities.
 * Replaces the assignment list section from dashboard/views/manual-testing.html
 */
const TestInstanceList = () => {
  // Get manual testing state from Alpine.js bridge
  const [manualTestingSession] = useAlpineState('manualTestingSession', null);
  const [manualTestingAssignments] = useAlpineState('manualTestingAssignments', []);
  const [manualTestingProgress] = useAlpineState('manualTestingProgress', null);
  const [selectedProject] = useAlpineState('selectedProject', null);

  // Local state for filtering
  const [filters, setFilters] = useState({
    status: '',
    wcag_level: '',
    page_id: '',
    search: ''
  });

  const [filteredAssignments, setFilteredAssignments] = useState([]);

  // Apply filters when assignments or filters change
  useEffect(() => {
    if (!manualTestingAssignments || manualTestingAssignments.length === 0) {
      setFilteredAssignments([]);
      return;
    }

    // Group assignments by page
    const grouped = manualTestingAssignments.reduce((acc, assignment) => {
      const pageId = assignment.page_id;
      if (!acc[pageId]) {
        acc[pageId] = {
          page_id: pageId,
          page_title: assignment.page_title || 'Unknown Page',
          page_url: assignment.page_url || '',
          assignments: []
        };
      }
      acc[pageId].assignments.push(assignment);
      return acc;
    }, {});

    // Convert to array and apply filters
    let filtered = Object.values(grouped);

    // Filter by page if specified
    if (filters.page_id) {
      filtered = filtered.filter(pageGroup => pageGroup.page_id === filters.page_id);
    }

    // Filter assignments within each page group
    filtered = filtered.map(pageGroup => ({
      ...pageGroup,
      assignments: pageGroup.assignments.filter(assignment => {
        // Status filter
        if (filters.status && assignment.status !== filters.status) {
          return false;
        }

        // WCAG level filter
        if (filters.wcag_level && assignment.wcag_level !== filters.wcag_level) {
          return false;
        }

        // Search filter (criterion number or title)
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          const criterionMatch = assignment.criterion_number?.toLowerCase().includes(searchTerm);
          const titleMatch = assignment.title?.toLowerCase().includes(searchTerm);
          if (!criterionMatch && !titleMatch) {
            return false;
          }
        }

        return true;
      })
    })).filter(pageGroup => pageGroup.assignments.length > 0); // Remove empty page groups

    setFilteredAssignments(filtered);
  }, [manualTestingAssignments, filters]);

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  // Handle starting a manual test
  const handleStartManualTest = async (pageGroup, assignment) => {
    try {
      // Call Alpine.js function to start manual test
      if (window.dashboardInstance && window.dashboardInstance.startManualTest) {
        window.dashboardInstance.startManualTest(pageGroup, assignment);
      }
    } catch (error) {
      console.error('Error starting manual test:', error);
    }
  };

  // Get status badge classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format status text
  const formatStatus = (status) => {
    return status ? status.replace('_', ' ').toUpperCase() : 'PENDING';
  };

  // Get unique pages for filter dropdown
  const availablePages = manualTestingAssignments
    ? [...new Set(manualTestingAssignments.map(a => ({ 
        id: a.page_id, 
        title: a.page_title || 'Unknown Page' 
      })))]
    : [];

  // Don't render if no session or project selected
  if (!selectedProject || !manualTestingSession) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with Session Info */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Manual Testing Assignments</h3>
            {manualTestingSession && (
              <p className="text-sm text-gray-600 mt-1">
                Session: {manualTestingSession.name}
              </p>
            )}
          </div>
          {manualTestingProgress && (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Progress: {manualTestingProgress.completed_tests}/{manualTestingProgress.total_tests}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round((manualTestingProgress.completed_tests / manualTestingProgress.total_tests) * 100)}% Complete
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded w-full"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* WCAG Level Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">WCAG Level</label>
            <select
              value={filters.wcag_level}
              onChange={(e) => handleFilterChange('wcag_level', e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded w-full"
            >
              <option value="">All Levels</option>
              <option value="A">Level A</option>
              <option value="AA">Level AA</option>
              <option value="AAA">Level AAA</option>
            </select>
          </div>

          {/* Page Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Page</label>
            <select
              value={filters.page_id}
              onChange={(e) => handleFilterChange('page_id', e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded w-full"
            >
              <option value="">All Pages</option>
              {availablePages.map(page => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Criterion or title..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded w-full"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setFilters({ status: '', wcag_level: '', page_id: '', search: '' })}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Assignment List */}
      <div className="divide-y divide-gray-200">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map(pageGroup => (
            <div key={pageGroup.page_id} className="p-6">
              {/* Page Header */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-1">{pageGroup.page_title}</h4>
                <p className="text-sm text-gray-600">{pageGroup.page_url}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {pageGroup.assignments.length} test{pageGroup.assignments.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Assignment Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pageGroup.assignments.map(assignment => (
                  <div key={assignment.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    {/* Assignment Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {assignment.criterion_number}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(assignment.status)}`}>
                        {formatStatus(assignment.status)}
                      </span>
                    </div>

                    {/* Assignment Info */}
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {assignment.title}
                    </p>

                    {/* WCAG Level Badge */}
                    {assignment.wcag_level && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          WCAG {assignment.wcag_level}
                        </span>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => handleStartManualTest(pageGroup, assignment)}
                      className="w-full px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                    >
                      <i className="fas fa-play mr-1"></i>
                      {assignment.status === 'completed' ? 'Review' : 'Test'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          /* Empty State */
          <div className="p-6">
            <div className="text-center py-12">
              <i className="fas fa-clipboard-list text-gray-400 text-6xl mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments Found</h3>
              <p className="text-gray-500 mb-6">
                {manualTestingAssignments.length === 0 
                  ? "No manual testing assignments available for this session."
                  : "No assignments match your current filters. Try adjusting the filters above."}
              </p>
              {filters.status || filters.wcag_level || filters.page_id || filters.search ? (
                <button
                  onClick={() => setFilters({ status: '', wcag_level: '', page_id: '', search: '' })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-filter mr-2"></i>Clear Filters
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestInstanceList; 