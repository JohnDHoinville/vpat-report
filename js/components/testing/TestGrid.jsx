import React, { useState, useEffect, useRef } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const TestGrid = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTestSession, setSelectedTestSession] = useState(null);
  const [testGridInstances, setTestGridInstances] = useState([]);
  const [filteredTestGridInstances, setFilteredTestGridInstances] = useState([]);
  const [selectedTestGridInstances, setSelectedTestGridInstances] = useState([]);
  const [loadingTestInstances, setLoadingTestInstances] = useState(false);
  const [testGridFilters, setTestGridFilters] = useState({
    status: '',
    level: '',
    testMethod: '',
    search: ''
  });
  const [testGridSort, setTestGridSort] = useState({
    field: 'criterion_number',
    direction: 'asc'
  });

  const modalRef = useRef(null);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('testingState');

  useEffect(() => {
    // Subscribe to Alpine.js state changes for modal visibility
    const unsubscribe = subscribe((newState) => {
      if (newState.showTestGrid !== undefined) {
        setIsOpen(newState.showTestGrid);
        if (newState.showTestGrid && newState.selectedTestSession) {
          setSelectedTestSession(newState.selectedTestSession);
          loadTestInstances(newState.selectedTestSession.id);
        }
      }
      if (newState.testGridInstances !== undefined) {
        setTestGridInstances(newState.testGridInstances);
      }
      if (newState.loadingTestInstances !== undefined) {
        setLoadingTestInstances(newState.loadingTestInstances);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // Load test instances for the grid
  const loadTestInstances = async (sessionId) => {
    if (!sessionId) return;

    try {
      setLoadingTestInstances(true);
      
      // Use existing Alpine.js function or API call
      if (window.dashboardInstance?.loadTestInstancesForGrid) {
        await window.dashboardInstance.loadTestInstancesForGrid(sessionId);
      } else if (window.DashboardAPI?.testInstances?.getBySession) {
        const response = await window.DashboardAPI.testInstances.getBySession(sessionId);
        setTestGridInstances(response.data || []);
        setState({ testGridInstances: response.data || [] });
      }
    } catch (error) {
      console.error('Error loading test instances:', error);
    } finally {
      setLoadingTestInstances(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...testGridInstances];

    // Apply filters
    if (testGridFilters.status) {
      filtered = filtered.filter(instance => instance.status === testGridFilters.status);
    }
    if (testGridFilters.level) {
      filtered = filtered.filter(instance => instance.level === testGridFilters.level);
    }
    if (testGridFilters.testMethod) {
      filtered = filtered.filter(instance => instance.test_method === testGridFilters.testMethod);
    }
    if (testGridFilters.search) {
      const searchLower = testGridFilters.search.toLowerCase();
      filtered = filtered.filter(instance => 
        instance.criterion_number?.toLowerCase().includes(searchLower) ||
        instance.requirement_title?.toLowerCase().includes(searchLower) ||
        instance.page_title?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[testGridSort.field] || '';
      const bVal = b[testGridSort.field] || '';
      
      if (testGridSort.direction === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    setFilteredTestGridInstances(filtered);
  }, [testGridInstances, testGridFilters, testGridSort]);

  const handleClose = () => {
    setIsOpen(false);
    setState({ showTestGrid: false });
    setSelectedTestSession(null);
    setTestGridInstances([]);
    setFilteredTestGridInstances([]);
    setSelectedTestGridInstances([]);
    
    // Restore body scroll
    document.body.style.overflow = '';
  };

  const handleFilterChange = (key, value) => {
    setTestGridFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (field) => {
    setTestGridSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedTestGridInstances(filteredTestGridInstances.map(instance => instance.id));
    } else {
      setSelectedTestGridInstances([]);
    }
  };

  const toggleSelectInstance = (instanceId, checked) => {
    if (checked) {
      setSelectedTestGridInstances(prev => [...prev, instanceId]);
    } else {
      setSelectedTestGridInstances(prev => prev.filter(id => id !== instanceId));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800';
      case 'not_tested': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSortIcon = (field) => {
    if (testGridSort.field !== field) return 'fa-sort';
    return testGridSort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  };

  const handleRunSelectedTests = async () => {
    if (selectedTestGridInstances.length === 0) return;

    try {
      // Use Alpine.js function or API call
      if (window.dashboardInstance?.runAutomatedTestsForInstances) {
        await window.dashboardInstance.runAutomatedTestsForInstances(selectedTestGridInstances);
      }
    } catch (error) {
      console.error('Error running tests:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={handleClose}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-[98vw] max-h-[95vh] overflow-hidden flex flex-col relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              Test Grid: {selectedTestSession?.name || 'Testing Session'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage and execute test instances ({filteredTestGridInstances.length} of {testGridInstances.length} shown)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filters:</label>
              <select
                value={testGridFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="needs_review">Needs Review</option>
                <option value="not_tested">Not Tested</option>
              </select>
              
              <select
                value={testGridFilters.testMethod}
                onChange={(e) => handleFilterChange('testMethod', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="automated">Automated</option>
                <option value="manual">Manual</option>
                <option value="hybrid">Hybrid</option>
              </select>

              <input
                type="text"
                placeholder="Search..."
                value={testGridFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedTestGridInstances.length > 0 && (
              <button
                onClick={handleRunSelectedTests}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-play mr-1"></i>
                Run Selected ({selectedTestGridInstances.length})
              </button>
            )}
            
            <button
              onClick={() => loadTestInstances(selectedTestSession?.id)}
              disabled={loadingTestInstances}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              <i className={`fas ${loadingTestInstances ? 'fa-spin fa-spinner' : 'fa-sync'} mr-1`}></i>
              Refresh
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden">
          {loadingTestInstances ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={selectedTestGridInstances.length === filteredTestGridInstances.length && filteredTestGridInstances.length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('criterion_number')}
                    >
                      <div className="flex items-center">
                        Requirement
                        <i className={`fas ${getSortIcon('criterion_number')} ml-1`}></i>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('page_title')}
                    >
                      <div className="flex items-center">
                        Page
                        <i className={`fas ${getSortIcon('page_title')} ml-1`}></i>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <i className={`fas ${getSortIcon('status')} ml-1`}></i>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('test_method')}
                    >
                      <div className="flex items-center">
                        Method
                        <i className={`fas ${getSortIcon('test_method')} ml-1`}></i>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTestGridInstances.map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTestGridInstances.includes(instance.id)}
                          onChange={(e) => toggleSelectInstance(instance.id, e.target.checked)}
                          className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {instance.criterion_number}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {instance.requirement_title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {instance.page_title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {instance.page_url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                          {instance.status || 'not_tested'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {instance.test_method || 'automated'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              // View details
                              if (window.dashboardInstance?.viewTestInstanceDetails) {
                                window.dashboardInstance.viewTestInstanceDetails(instance);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            onClick={() => {
                              // Run single test
                              if (window.dashboardInstance?.runAutomatedTestsForInstances) {
                                window.dashboardInstance.runAutomatedTestsForInstances([instance.id]);
                              }
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <i className="fas fa-play"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Empty State */}
              {filteredTestGridInstances.length === 0 && !loadingTestInstances && (
                <div className="text-center py-12">
                  <i className="fas fa-table text-gray-400 text-6xl mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No test instances found</h3>
                  <p className="text-gray-500">
                    {testGridInstances.length === 0 
                      ? 'No test instances available for this session.'
                      : 'Try adjusting your filters to see more results.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredTestGridInstances.length} of {testGridInstances.length} test instances
              {selectedTestGridInstances.length > 0 && (
                <span className="ml-2 font-medium">
                  ({selectedTestGridInstances.length} selected)
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestGrid; 