// Projects Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Projects Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 */
function projectsComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Modal States
        showCreateProject: false,
        showEditProject: false,
        showDeleteProject: false,
        
        // Form Data
        newProject: {
            name: '',
            description: '',
            primary_url: '',
            client_name: '',
            conformance_level: 'AA',
            status: 'active'
        },
        
        editingProject: {},
        deletingProject: null,
        
        // Local Loading State
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        // Access to parent dashboard data
        get projects() {
            return this.$data.projects || [];
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        // ========================================
        // PROJECT MANAGEMENT METHODS
        // ========================================
        
        async createProject() {
            if (!this.newProject.name || !this.newProject.primary_url) {
                this.addNotification('error', 'Validation Error', 'Project name and URL are required');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                // Use API client if available
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const result = await apiClient.createProject(this.newProject);
                    
                    if (result.success || result.data) {
                        this.addNotification('success', 'Project Created', `${this.newProject.name} has been created successfully`);
                        this.showCreateProject = false;
                        this.resetNewProjectForm();
                        await this.loadProjects();
                    } else {
                        throw new Error(result.error || 'Failed to create project');
                    }
                } else {
                    // Fallback to direct API call
                    const response = await fetch(`${this.$data.API_BASE_URL}/projects`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.$data.token}`
                        },
                        body: JSON.stringify(this.newProject)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        this.addNotification('success', 'Project Created', `${this.newProject.name} has been created successfully`);
                        this.showCreateProject = false;
                        this.resetNewProjectForm();
                        await this.loadProjects();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to create project');
                    }
                }
                
            } catch (error) {
                console.error('Error creating project:', error);
                this.addNotification('error', 'Error', `Failed to create project: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        async updateProject() {
            if (!this.editingProject.name || !this.editingProject.primary_url) {
                this.addNotification('error', 'Validation Error', 'Project name and URL are required');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const result = await apiClient.updateProject(this.editingProject.id, this.editingProject);
                    
                    if (result.success || result.data) {
                        this.addNotification('success', 'Project Updated', `${this.editingProject.name} has been updated successfully`);
                        this.showEditProject = false;
                        await this.loadProjects();
                    } else {
                        throw new Error(result.error || 'Failed to update project');
                    }
                } else {
                    // Fallback to direct API call
                    const response = await fetch(`${this.$data.API_BASE_URL}/projects/${this.editingProject.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.$data.token}`
                        },
                        body: JSON.stringify(this.editingProject)
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Project Updated', `${this.editingProject.name} has been updated successfully`);
                        this.showEditProject = false;
                        await this.loadProjects();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to update project');
                    }
                }
                
            } catch (error) {
                console.error('Error updating project:', error);
                this.addNotification('error', 'Error', `Failed to update project: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        async confirmDeleteProject() {
            if (!this.deletingProject) return;
            
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const result = await apiClient.deleteProject(this.deletingProject.id);
                    
                    if (result.success) {
                        this.addNotification('success', 'Project Deleted', `${this.deletingProject.name} has been deleted`);
                        this.showDeleteProject = false;
                        this.deletingProject = null;
                        
                        // Clear selection if deleted project was selected
                        if (this.$data.selectedProject?.id === this.deletingProject.id) {
                            this.$data.selectedProject = null;
                        }
                        
                        await this.loadProjects();
                    } else {
                        throw new Error(result.error || 'Failed to delete project');
                    }
                } else {
                    // Fallback to direct API call
                    const response = await fetch(`${this.$data.API_BASE_URL}/projects/${this.deletingProject.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.$data.token}`
                        }
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Project Deleted', `${this.deletingProject.name} has been deleted`);
                        this.showDeleteProject = false;
                        this.deletingProject = null;
                        await this.loadProjects();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to delete project');
                    }
                }
                
            } catch (error) {
                console.error('Error deleting project:', error);
                this.addNotification('error', 'Error', `Failed to delete project: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        // ========================================
        // PROJECT ACTIONS
        // ========================================
        
        selectProject(project) {
            this.$data.selectedProject = project;
            console.log(`📂 Selected project: ${project.name}`);
            
            // Join WebSocket room for this project if available
            if (window.webSocketManager && window.webSocketManager.isConnected()) {
                window.webSocketManager.joinProject(project.id);
            }
            
            this.addNotification('info', 'Project Selected', `Working with ${project.name}`);
            
            // Load project-specific data
            this.loadProjectData(project);
        },
        
        editProject(project) {
            this.editingProject = { ...project };
            this.showEditProject = true;
        },
        
        deleteProject(project) {
            this.deletingProject = project;
            this.showDeleteProject = true;
        },
        
        // ========================================
        // DATA LOADING
        // ========================================
        
        async loadProjects() {
            try {
                this.componentLoading = true;
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const result = await apiClient.loadProjects();
                    this.$data.projects = result.data || result.projects || [];
                    console.log(`📁 Loaded ${this.$data.projects.length} projects`);
                } else if (this.$data.apiCall) {
                    // Use dashboard's API call method
                    const data = await this.$data.apiCall('/projects');
                    this.$data.projects = data.data || data.projects || [];
                    console.log(`📁 Loaded ${this.$data.projects.length} projects`);
                } else {
                    console.warn('No API client available');
                }
                
            } catch (error) {
                console.error('Failed to load projects:', error);
                this.addNotification('error', 'Error', 'Failed to load projects');
                this.$data.projects = [];
            } finally {
                this.componentLoading = false;
            }
        },
        
        async loadProjectData(project) {
            // Load related data for the selected project
            try {
                // Load project-specific data in parallel
                const promises = [];
                
                // Load web crawlers if method exists
                if (this.$data.loadWebCrawlers) {
                    promises.push(this.$data.loadWebCrawlers());
                }
                
                // Load testing sessions if method exists
                if (this.$data.loadTestingSessions) {
                    promises.push(this.$data.loadTestingSessions());
                }
                
                // Load auth configs if method exists
                if (this.$data.loadAuthConfigs) {
                    promises.push(this.$data.loadAuthConfigs());
                }
                
                await Promise.all(promises);
                
            } catch (error) {
                console.error('Error loading project data:', error);
            }
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'paused': 'bg-yellow-100 text-yellow-800',
                'completed': 'bg-blue-100 text-blue-800',
                'archived': 'bg-gray-100 text-gray-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (error) {
                return 'Invalid Date';
            }
        },
        
        resetNewProjectForm() {
            this.newProject = {
                name: '',
                description: '',
                primary_url: '',
                client_name: '',
                conformance_level: 'AA',
                status: 'active'
            };
        },
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('🚀 Projects component initialized');
            
            // Load projects if not already loaded
            if (this.projects.length === 0) {
                this.loadProjects();
            }
        },
        
        // ========================================
        // SHARED METHODS ACCESS
        // ========================================
        
        addNotification(type, title, message) {
            if (this.$data.addNotification) {
                this.$data.addNotification(type, title, message);
            } else {
                console.log(`${type.toUpperCase()}: ${title} - ${message}`);
            }
        }
    };
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
    window.projectsComponent = projectsComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { projectsComponent };
} 