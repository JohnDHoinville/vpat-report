import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const CreateTestingSession = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    conformance_levels: ['wcag_22_aa'],
    project_id: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentProject, setCurrentProject] = useState(null);

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('sessionState');

  useEffect(() => {
    // Subscribe to Alpine.js state changes for modal visibility
    const unsubscribe = subscribe((newState) => {
      if (newState.showSessionWizard !== undefined) {
        setIsOpen(newState.showSessionWizard);
        if (newState.showSessionWizard) {
          // Reset form when modal opens
          setFormData({
            name: '',
            description: '',
            priority: 'medium',
            conformance_levels: ['wcag_22_aa'],
            project_id: newState.selectedProject || null
          });
          setErrors({});
        }
      }
      if (newState.currentProject !== undefined) {
        setCurrentProject(newState.currentProject);
      }
      if (newState.loading !== undefined) {
        setLoading(newState.loading);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const handleClose = () => {
    setIsOpen(false);
    if (window.dashboardInstance?.closeSessionWizard) {
      window.dashboardInstance.closeSessionWizard();
    }
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      conformance_levels: ['wcag_22_aa'],
      project_id: null
    });
    setErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleConformanceLevelChange = (level, checked) => {
    setFormData(prev => ({
      ...prev,
      conformance_levels: checked
        ? [...prev.conformance_levels, level]
        : prev.conformance_levels.filter(l => l !== level)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required';
    }
    
    if (formData.conformance_levels.length === 0) {
      newErrors.conformance_levels = 'At least one conformance level must be selected';
    }
    
    if (!formData.project_id) {
      newErrors.project_id = 'Project is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Use the DashboardAPI service
      const response = await window.DashboardAPI.testingSessions.create(formData);
      
      // Update Alpine.js state with new session
      const currentState = getState();
      const updatedSessions = [...(currentState.testingSessions || []), response.data];
      setState({
        testingSessions: updatedSessions,
        showSessionWizard: false
      });

      // Show success notification
      if (window.dashboardInstance?.showNotification) {
        window.dashboardInstance.showNotification('success', 'Session Created', `Testing session "${response.data.name}" has been created successfully.`);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating testing session:', error);
      if (window.dashboardInstance?.showNotification) {
        window.dashboardInstance.showNotification('error', 'Creation Failed', error.message || 'Failed to create testing session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const conformanceLevelOptions = [
    { value: 'wcag_22_a', label: 'WCAG 2.2 Level A', description: 'Basic accessibility requirements' },
    { value: 'wcag_22_aa', label: 'WCAG 2.2 Level AA', description: 'Standard accessibility requirements (recommended)' },
    { value: 'wcag_22_aaa', label: 'WCAG 2.2 Level AAA', description: 'Enhanced accessibility requirements' },
    { value: 'section_508', label: 'Section 508', description: 'U.S. federal accessibility standards' }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Create Testing Session</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set up a comprehensive accessibility testing session with automated requirement population
              </p>
              {currentProject && (
                <p className="text-sm text-blue-600 mt-1">
                  Project: <strong>{currentProject.name}</strong>
                </p>
              )}
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., WCAG 2.2 AA Compliance Audit"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Choose a descriptive name that identifies the purpose and scope</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Testing Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the objectives, scope, and any special considerations for this testing session..."
            />
          </div>
          
          {/* Conformance Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Conformance Levels <span className="text-red-500">*</span>
            </label>
            {errors.conformance_levels && (
              <p className="mb-2 text-sm text-red-600">{errors.conformance_levels}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conformanceLevelOptions.map((option) => (
                <div
                  key={option.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    formData.conformance_levels.includes(option.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleConformanceLevelChange(
                    option.value,
                    !formData.conformance_levels.includes(option.value)
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.conformance_levels.includes(option.value)}
                      onChange={(e) => handleConformanceLevelChange(option.value, e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{option.label}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Session...
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  Create Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTestingSession; 