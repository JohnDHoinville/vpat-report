import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const CreateProject = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primary_url: '',
    compliance_standard: 'wcag_2_2_aa'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('projectState');

  useEffect(() => {
    // Subscribe to Alpine.js state changes for modal visibility
    const unsubscribe = subscribe((newState) => {
      if (newState.showCreateProject !== undefined) {
        setIsOpen(newState.showCreateProject);
        if (newState.showCreateProject) {
          // Reset form when modal opens
          setFormData({
            name: '',
            description: '',
            primary_url: '',
            compliance_standard: 'wcag_2_2_aa'
          });
          setErrors({});
        }
      }
      if (newState.loading !== undefined) {
        setLoading(newState.loading);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const handleClose = () => {
    setIsOpen(false);
    setState({ showCreateProject: false });
    setFormData({
      name: '',
      description: '',
      primary_url: '',
      compliance_standard: 'wcag_2_2_aa'
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.primary_url.trim()) {
      newErrors.primary_url = 'Primary URL is required';
    } else {
      // Basic URL validation
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      const url = formData.primary_url.trim();
      if (!urlPattern.test(url) && !url.includes('.')) {
        newErrors.primary_url = 'Please enter a valid URL';
      }
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
      
      // Normalize the URL
      let normalizedUrl = formData.primary_url.trim();
      if (normalizedUrl && !normalizedUrl.match(/^https?:\/\//)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      const projectData = {
        ...formData,
        primary_url: normalizedUrl
      };

      // Use the DashboardAPI service
      const response = await window.DashboardAPI.projects.create(projectData);
      
      // Update Alpine.js state with new project
      const currentState = getState();
      const updatedProjects = [...(currentState.projects || []), response.data];
      setState({
        projects: updatedProjects,
        showCreateProject: false
      });

      // Show success notification
      if (window.dashboardInstance?.showNotification) {
        window.dashboardInstance.showNotification('success', 'Project Created', `Project "${response.data.name}" has been created successfully.`);
      }

      handleClose();
    } catch (error) {
      console.error('Error creating project:', error);
      if (window.dashboardInstance?.showNotification) {
        window.dashboardInstance.showNotification('error', 'Creation Failed', error.message || 'Failed to create project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter project name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="primary_url"
              value={formData.primary_url}
              onChange={handleInputChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.primary_url ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="example.com or https://example.com"
            />
            {errors.primary_url && (
              <p className="mt-1 text-sm text-red-600">{errors.primary_url}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Compliance Standard</label>
            <select
              name="compliance_standard"
              value={formData.compliance_standard}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="wcag_2_2_aa">WCAG 2.2 AA</option>
              <option value="wcag_2_2_aaa">WCAG 2.2 AAA</option>
              <option value="section_508">Section 508</option>
              <option value="both">WCAG 2.2 AA + Section 508</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject; 