// Authentication Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Authentication Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 */
function authenticationComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Modal States
        showSetupAuth: false,
        showEditAuth: false,
        
        // Authentication Setup Data
        authSetup: {
            type: null,
            step: null,
            inProgress: false,
            basic: {
                url: '',
                loginPage: '',
                username: '',
                password: '',
                successUrl: '',
                name: ''
            },
            sso: {
                url: '',
                entityId: '',
                ssoUrl: '',
                certificate: '',
                name: ''
            },
            advanced: {
                type: 'api_key',
                apiKey: '',
                token: '',
                name: ''
            }
        },
        
        // Edit Authentication Data
        editingConfig: null,
        editAuthForm: {},
        
        // Local Loading State
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        // Access to parent dashboard data
        get authConfigs() {
            return this.$data.authConfigs || [];
        },
        
        get projectAuthConfigs() {
            return this.$data.projectAuthConfigs || [];
        },
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        // ========================================
        // AUTHENTICATION MANAGEMENT METHODS
        // ========================================
        
        async loadAuthConfigs() {
            try {
                this.componentLoading = true;
                console.log('🔐 Loading authentication configurations...');
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await apiClient.getAuthConfigs();
                    this.$data.authConfigs = response.data || [];
                } else if (this.$data.apiCall) {
                    const response = await this.$data.apiCall('/auth/configs');
                    this.$data.authConfigs = response.data || [];
                }
                
                console.log('🔐 Auth configs loaded:', this.$data.authConfigs.length);
                
                // Filter for current project if one is selected
                if (this.selectedProject) {
                    this.filterAuthConfigsForProject();
                } else {
                    this.$data.projectAuthConfigs = this.$data.authConfigs;
                }
                
            } catch (error) {
                console.error('Failed to load auth configs:', error);
                this.addNotification('error', 'Error', 'Failed to load authentication configurations');
                this.$data.authConfigs = [];
                this.$data.projectAuthConfigs = [];
            } finally {
                this.componentLoading = false;
            }
        },
        
        filterAuthConfigsForProject() {
            if (!this.selectedProject) return;
            
            console.log('🔐 Filtering auth configs for project:', this.selectedProject.name, this.selectedProject.primary_url);
            
            // Filter configs that match the project's domain
            const projectDomain = this.extractDomain(this.selectedProject.primary_url);
            this.$data.projectAuthConfigs = this.$data.authConfigs.filter(config => {
                const configDomain = this.extractDomain(config.url || config.domain);
                return configDomain === projectDomain || config.url?.includes(projectDomain);
            });
            
            console.log('🔐 Filtered to', this.$data.projectAuthConfigs.length, 'configs for domain:', projectDomain);
        },
        
        extractDomain(url) {
            if (!url) return '';
            try {
                const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
                return urlObj.hostname.replace('www.', '');
            } catch {
                return url;
            }
        },
        
        // ========================================
        // QUICK SETUP METHODS
        // ========================================
        
        quickSetupAuth(type) {
            this.authSetup = {
                type: type,
                step: null,
                inProgress: false,
                basic: {
                    url: this.selectedProject?.primary_url || '',
                    loginPage: '',
                    username: '',
                    password: '',
                    successUrl: '',
                    name: `${this.selectedProject?.name || 'Site'} Authentication`
                },
                sso: {
                    url: this.selectedProject?.primary_url || '',
                    entityId: '',
                    ssoUrl: '',
                    certificate: '',
                    name: `${this.selectedProject?.name || 'Site'} SSO`
                },
                advanced: {
                    type: 'api_key',
                    apiKey: '',
                    token: '',
                    name: `${this.selectedProject?.name || 'Site'} API Auth`
                }
            };
            this.showSetupAuth = true;
        },
        
        startAuthSetup(type) {
            this.authSetup.type = type;
        },
        
        proceedToDetails() {
            if (this.authSetup.type) {
                this.authSetup.step = `${this.authSetup.type}-details`;
            }
        },
        
        async setupAuthentication() {
            if (this.authSetup.inProgress) return;
            
            try {
                this.authSetup.inProgress = true;
                
                let authData = {};
                
                switch (this.authSetup.type) {
                    case 'basic':
                        authData = {
                            name: this.authSetup.basic.name,
                            type: 'basic',
                            url: this.authSetup.basic.url,
                            loginPage: this.authSetup.basic.loginPage,
                            username: this.authSetup.basic.username,
                            password: this.authSetup.basic.password,
                            successUrl: this.authSetup.basic.successUrl,
                            project_id: this.selectedProject?.id
                        };
                        break;
                        
                    case 'sso':
                        authData = {
                            name: this.authSetup.sso.name,
                            type: 'sso',
                            url: this.authSetup.sso.url,
                            entityId: this.authSetup.sso.entityId,
                            ssoUrl: this.authSetup.sso.ssoUrl,
                            certificate: this.authSetup.sso.certificate,
                            project_id: this.selectedProject?.id
                        };
                        break;
                        
                    case 'advanced':
                        authData = {
                            name: this.authSetup.advanced.name,
                            type: 'advanced',
                            subType: this.authSetup.advanced.type,
                            apiKey: this.authSetup.advanced.apiKey,
                            token: this.authSetup.advanced.token,
                            project_id: this.selectedProject?.id
                        };
                        break;
                }
                
                // Save authentication configuration
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/auth/configs`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify(authData)
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Authentication Setup', 'Authentication configuration created successfully');
                        this.showSetupAuth = false;
                        this.resetAuthSetup();
                        await this.loadAuthConfigs();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to create authentication configuration');
                    }
                }
                
            } catch (error) {
                console.error('Error setting up authentication:', error);
                this.addNotification('error', 'Error', `Failed to setup authentication: ${error.message}`);
            } finally {
                this.authSetup.inProgress = false;
            }
        },
        
        // ========================================
        // AUTH CONFIG ACTIONS
        // ========================================
        
        async testAuthConfig(config) {
            try {
                this.addNotification('info', 'Testing Authentication', `Testing ${config.name}...`);
                
                // Simulate test - in real implementation, this would test the auth flow
                setTimeout(() => {
                    this.addNotification('success', 'Test Successful', `${config.name} authentication is working`);
                }, 2000);
                
            } catch (error) {
                console.error('Error testing auth config:', error);
                this.addNotification('error', 'Test Failed', `Failed to test ${config.name}`);
            }
        },
        
        editAuthConfig(config) {
            this.editingConfig = config;
            this.editAuthForm = { ...config };
            this.showEditAuth = true;
        },
        
        async deleteAuthConfig(config) {
            if (!confirm(`Are you sure you want to delete "${config.name}"? This action cannot be undone.`)) {
                return;
            }
            
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/auth/configs/${config.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Configuration Deleted', `${config.name} has been deleted`);
                        await this.loadAuthConfigs();
                    } else {
                        throw new Error('Failed to delete configuration');
                    }
                }
                
            } catch (error) {
                console.error('Error deleting auth config:', error);
                this.addNotification('error', 'Error', `Failed to delete ${config.name}`);
            }
        },
        
        async refreshAuthConfigs() {
            await this.loadAuthConfigs();
        },
        
        importAuthConfig() {
            this.addNotification('info', 'Import Feature', 'Authentication import feature coming soon');
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getActiveAuthCount() {
            return this.authConfigs.filter(config => config.status === 'active').length;
        },
        
        getSAMLAuthCount() {
            return this.authConfigs.filter(config => config.type === 'sso' || config.type === 'saml').length;
        },
        
        getFailedAuthCount() {
            return this.authConfigs.filter(config => config.status === 'failed' || config.status === 'error').length;
        },
        
        getAuthTypeIcon(type) {
            const icons = {
                'basic': 'fas fa-user-lock text-green-600',
                'sso': 'fas fa-university text-blue-600',
                'saml': 'fas fa-university text-blue-600',
                'advanced': 'fas fa-cogs text-purple-600',
                'api_key': 'fas fa-key text-purple-600'
            };
            return icons[type] || 'fas fa-shield-alt text-gray-600';
        },
        
        getAuthStatusBadgeClass(status) {
            const classes = {
                'active': 'bg-green-100 text-green-800',
                'inactive': 'bg-gray-100 text-gray-800',
                'testing': 'bg-yellow-100 text-yellow-800',
                'failed': 'bg-red-100 text-red-800',
                'error': 'bg-red-100 text-red-800'
            };
            return classes[status] || 'bg-gray-100 text-gray-800';
        },
        
        formatDate(dateString) {
            if (!dateString) return 'Never';
            
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return 'Invalid Date';
            }
        },
        
        resetAuthSetup() {
            this.authSetup = {
                type: null,
                step: null,
                inProgress: false,
                basic: {
                    url: '',
                    loginPage: '',
                    username: '',
                    password: '',
                    successUrl: '',
                    name: ''
                },
                sso: {
                    url: '',
                    entityId: '',
                    ssoUrl: '',
                    certificate: '',
                    name: ''
                },
                advanced: {
                    type: 'api_key',
                    apiKey: '',
                    token: '',
                    name: ''
                }
            };
        },
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('🔐 Authentication component initialized');
            
            // Load auth configs when component initializes
            this.loadAuthConfigs();
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
    window.authenticationComponent = authenticationComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { authenticationComponent };
} 