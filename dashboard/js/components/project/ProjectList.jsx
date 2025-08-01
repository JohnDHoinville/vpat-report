import React, { useState, useEffect } from 'react';
import { useAlpineState } from '../utils/alpineIntegration';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Alpine.js integration
  const { getState, setState, subscribe } = useAlpineState('projectState');

  useEffect(() => {
    // Load initial data from Alpine.js
    const alpineState = getState();
    if (alpineState) {
      setProjects(alpineState.projects || []);
      setSelectedProject(alpineState.selectedProject || null);
      setLoading(alpineState.loading || false);
    }

    // Subscribe to Alpine.js state changes
    const unsubscribe = subscribe((newState) => {
      if (newState.projects !== undefined) setProjects(newState.projects);
      if (newState.selectedProject !== undefined) setSelectedProject(newState.selectedProject);
      if (newState.loading !== undefined) setLoading(newState.loading);
    });

    return unsubscribe;
  }, [getState, subscribe]);

  const handleSelectProject = async (project) => {
    try {
      // Update Alpine.js state
      setState({
        selectedProject: project.id,
        currentProject: project
      });
      
      // Call Alpine.js function for project selection
      if (window.dashboardInstance?.selectProject) {
        await window.dashboardInstance.selectProject(project);
      }
    } catch (error) {
      console.error('Error selecting project:', error);
    }
  };

  const handleEditProject = (project) => {
    // Trigger Alpine.js edit function
    if (window.dashboardInstance?.editProject) {
      window.dashboardInstance.editProject(project);
    }
  };

  const handleDeleteProject = (project) => {
    // Trigger Alpine.js delete function
    if (window.dashboardInstance?.deleteProject) {
      window.dashboardInstance.deleteProject(project);
    }
  };

  const handleCreateProject = () => {
    // Trigger Alpine.js create project modal
    setState({ showCreateProject: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <button 
          onClick={handleCreateProject}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.filter(p => p && p.id).map((project) => (
          <div
            key={project.id}
            className={`rounded-lg shadow-md border-2 p-6 hover:shadow-lg transition-all duration-200 relative ${
              selectedProject === project.id
                ? 'bg-blue-50 border-blue-300 shadow-lg'
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Selection Indicator */}
            {selectedProject === project.id && (
              <div className="absolute top-3 right-3">
                <i className="fas fa-check-circle text-blue-600 text-xl"></i>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">
                {project.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3 break-all">
                {project.primary_url}
              </p>
              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Standard:</span>
                <span className="font-medium">
                  {project.compliance_standard?.replace(/_/g, ' ').toUpperCase() || 'WCAG 2.2 AA'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Sessions:</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                  {project.testing_sessions_count || 0}
                </span>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              {selectedProject !== project.id ? (
                <button
                  onClick={() => handleSelectProject(project)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-arrow-right mr-1"></i>Select
                </button>
              ) : (
                <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm cursor-default">
                  <i className="fas fa-check mr-1"></i>Selected
                </button>
              )}
              
              <button
                onClick={() => handleEditProject(project)}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                <i className="fas fa-edit"></i>
              </button>
              
              <button
                onClick={() => handleDeleteProject(project)}
                className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-folder-open text-gray-400 text-6xl mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first accessibility testing project.</p>
          <button
            onClick={handleCreateProject}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-plus mr-2"></i>Create Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectList; 