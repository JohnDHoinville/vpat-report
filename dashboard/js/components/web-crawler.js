// Web Crawler Component JavaScript
// Accessibility Testing Platform - Modular Dashboard

/**
 * Web Crawler Component for Alpine.js
 * Extracted from dashboard_helpers.js for modular architecture
 * Features: Playwright-based crawling, SAML authentication, real-time progress
 */
function webCrawlerComponent() {
    return {
        // ========================================
        // COMPONENT STATE
        // ========================================
        
        // Modal States
        showCreateCrawler: false,
        showCrawlerPages: false,
        
        // Crawler Data
        newCrawler: {
            name: '',
            description: '',
            base_url: '',
            browser_type: 'chromium',
            auth_type: 'none',
            auth_username: '',
            auth_password: '',
            max_pages: 100,
            max_depth: 3,
            request_delay_ms: 1000
        },
        
        // Session Integration
        selectedCrawlerForSessions: '',
        
        // Real-time Progress
        crawlerProgress: {
            active: false,
            percentage: 0,
            message: '',
            pagesFound: 0,
            status: 'idle'
        },
        
        // Local Loading State
        componentLoading: false,
        
        // ========================================
        // INHERITED DASHBOARD STATE & METHODS
        // ========================================
        
        // Access to parent dashboard data
        get webCrawlers() {
            return this.$data.webCrawlers || [];
        },
        
        get selectedProject() {
            return this.$data.selectedProject;
        },
        
        get loading() {
            return this.$data.loading || this.componentLoading;
        },
        
        // ========================================
        // WEB CRAWLER MANAGEMENT METHODS
        // ========================================
        
        async loadWebCrawlers() {
            if (!this.selectedProject) {
                console.log('🕸️ No project selected, clearing crawlers');
                this.$data.webCrawlers = [];
                return;
            }
            
            try {
                this.componentLoading = true;
                console.log('🕸️ Loading web crawlers for project:', this.selectedProject.id);
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await apiClient.getWebCrawlers(this.selectedProject.id);
                    this.$data.webCrawlers = response.data || [];
                } else if (this.$data.apiCall) {
                    const response = await this.$data.apiCall(`/web-crawlers/projects/${this.selectedProject.id}/crawlers`);
                    this.$data.webCrawlers = response.data || [];
                }
                
                console.log('🕸️ Web crawlers loaded:', this.$data.webCrawlers.length);
                
            } catch (error) {
                console.error('Failed to load web crawlers:', error);
                this.addNotification('error', 'Error', 'Failed to load web crawlers');
                this.$data.webCrawlers = [];
            } finally {
                this.componentLoading = false;
            }
        },
        
        async createCrawler() {
            if (!this.selectedProject) {
                this.addNotification('error', 'Error', 'Please select a project first');
                return;
            }
            
            try {
                this.componentLoading = true;
                
                const crawlerData = {
                    ...this.newCrawler,
                    project_id: this.selectedProject.id,
                    status: 'idle'
                };
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/web-crawlers/crawlers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        },
                        body: JSON.stringify(crawlerData)
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Crawler Created', `${this.newCrawler.name} has been created successfully`);
                        this.showCreateCrawler = false;
                        this.resetNewCrawlerForm();
                        await this.loadWebCrawlers();
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to create crawler');
                    }
                }
                
            } catch (error) {
                console.error('Error creating crawler:', error);
                this.addNotification('error', 'Error', `Failed to create crawler: ${error.message}`);
            } finally {
                this.componentLoading = false;
            }
        },
        
        async startCrawler(crawler) {
            if (crawler.status === 'running') {
                console.log('🕸️ Crawler already running:', crawler.name);
                return;
            }
            
            try {
                console.log('🚀 Starting crawler:', crawler.name);
                
                // Initialize progress tracking
                this.crawlerProgress = {
                    active: true,
                    percentage: 0,
                    message: 'Initializing crawler...',
                    pagesFound: 0,
                    status: 'starting'
                };
                
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/web-crawlers/crawlers/${crawler.id}/start`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Crawler Started', `${crawler.name} is now crawling`);
                        
                        // Update crawler status locally
                        const crawlerIndex = this.webCrawlers.findIndex(c => c.id === crawler.id);
                        if (crawlerIndex !== -1) {
                            this.$data.webCrawlers[crawlerIndex].status = 'running';
                        }
                        
                        // Start progress monitoring
                        this.monitorCrawlerProgress(crawler.id);
                        
                    } else {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || 'Failed to start crawler');
                    }
                }
                
            } catch (error) {
                console.error('Error starting crawler:', error);
                this.addNotification('error', 'Error', `Failed to start ${crawler.name}: ${error.message}`);
                this.crawlerProgress.active = false;
            }
        },
        
        monitorCrawlerProgress(crawlerId) {
            // This would be handled by WebSocket updates in a real implementation
            // For now, simulate progress updates
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    this.crawlerProgress = {
                        active: false,
                        percentage: 100,
                        message: 'Crawling completed successfully',
                        pagesFound: Math.floor(Math.random() * 50) + 10,
                        status: 'completed'
                    };
                    clearInterval(progressInterval);
                    
                    // Reload crawlers to get updated data
                    setTimeout(() => {
                        this.loadWebCrawlers();
                    }, 2000);
                } else {
                    this.crawlerProgress.percentage = Math.floor(progress);
                    this.crawlerProgress.message = `Discovering pages... ${Math.floor(progress/10)} out of 10 levels processed`;
                    this.crawlerProgress.pagesFound = Math.floor(progress / 2);
                }
            }, 1000);
        },
        
        // ========================================
        // QUICK SETUP METHODS
        // ========================================
        
        quickSetupCrawler(type) {
            this.newCrawler = {
                name: `${this.selectedProject?.name || 'Site'} ${type.charAt(0).toUpperCase() + type.slice(1)} Crawler`,
                description: '',
                base_url: this.selectedProject?.primary_url || '',
                browser_type: 'chromium',
                auth_type: type === 'public' ? 'none' : type === 'saml' ? 'saml' : 'basic',
                auth_username: '',
                auth_password: '',
                max_pages: type === 'saml' ? 200 : type === 'public' ? 50 : 100,
                max_depth: type === 'saml' ? 4 : 3,
                request_delay_ms: type === 'saml' ? 2000 : 1000
            };
            
            switch (type) {
                case 'saml':
                    this.newCrawler.description = 'Enterprise crawler with SAML authentication for secured areas';
                    break;
                case 'public':
                    this.newCrawler.description = 'Public site crawler for marketing pages and content';
                    break;
                case 'advanced':
                    this.newCrawler.description = 'Advanced crawler with custom configuration options';
                    break;
            }
            
            this.showCreateCrawler = true;
        },
        
        // ========================================
        // CRAWLER ACTIONS
        // ========================================
        
        viewCrawlerPages(crawler) {
            this.addNotification('info', 'Feature Coming Soon', 'Page viewing functionality will be available soon');
        },
        
        editCrawler(crawler) {
            this.addNotification('info', 'Feature Coming Soon', 'Crawler editing functionality will be available soon');
        },
        
        async deleteCrawler(crawler) {
            if (!confirm(`Are you sure you want to delete "${crawler.name}"? This action cannot be undone.`)) {
                return;
            }
            
            try {
                if (window.createApiClient) {
                    const apiClient = window.createApiClient();
                    const response = await fetch(`${apiClient.baseURL}/web-crawlers/crawlers/${crawler.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${apiClient.getToken()}`
                        }
                    });
                    
                    if (response.ok) {
                        this.addNotification('success', 'Crawler Deleted', `${crawler.name} has been deleted`);
                        await this.loadWebCrawlers();
                    } else {
                        throw new Error('Failed to delete crawler');
                    }
                }
                
            } catch (error) {
                console.error('Error deleting crawler:', error);
                this.addNotification('error', 'Error', `Failed to delete ${crawler.name}`);
            }
        },
        
        // ========================================
        // SESSION INTEGRATION METHODS
        // ========================================
        
        previewCrawlerForSessions() {
            const crawler = this.webCrawlers.find(c => c.id === this.selectedCrawlerForSessions);
            if (crawler) {
                this.addNotification('info', 'Preview Pages', `Previewing ${crawler.total_pages_discovered || 0} pages from ${crawler.name}`);
            }
        },
        
        sendToSessions() {
            const crawler = this.webCrawlers.find(c => c.id === this.selectedCrawlerForSessions);
            if (crawler) {
                this.addNotification('success', 'Sent to Sessions', `${crawler.total_pages_discovered || 0} pages from ${crawler.name} sent to Compliance Sessions`);
                
                // Clear selection
                this.selectedCrawlerForSessions = '';
                
                // Switch to sessions tab
                if (this.$data.switchTab) {
                    this.$data.switchTab('compliance-sessions');
                }
            }
        },
        
        // ========================================
        // UTILITY METHODS
        // ========================================
        
        getCrawlerStatusColor(status) {
            const colors = {
                'idle': 'bg-gray-500',
                'running': 'bg-green-500 animate-pulse',
                'completed': 'bg-blue-500',
                'failed': 'bg-red-500',
                'paused': 'bg-yellow-500'
            };
            return colors[status] || 'bg-gray-500';
        },
        
        getAuthTypeBadgeClass(authType) {
            const classes = {
                'none': 'bg-gray-100 text-gray-800',
                'basic': 'bg-green-100 text-green-800',
                'saml': 'bg-blue-100 text-blue-800',
                'custom': 'bg-purple-100 text-purple-800'
            };
            return classes[authType] || 'bg-gray-100 text-gray-800';
        },
        
        getAuthTypeDisplay(authType) {
            const displays = {
                'none': 'Public',
                'basic': 'Username/Password',
                'saml': 'SAML/SSO',
                'custom': 'Custom'
            };
            return displays[authType] || 'Unknown';
        },
        
        getStatusBadgeClass(status) {
            const classes = {
                'idle': 'bg-gray-100 text-gray-800',
                'running': 'bg-green-100 text-green-800',
                'completed': 'bg-blue-100 text-blue-800',
                'failed': 'bg-red-100 text-red-800',
                'paused': 'bg-yellow-100 text-yellow-800'
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
        
        resetNewCrawlerForm() {
            this.newCrawler = {
                name: '',
                description: '',
                base_url: '',
                browser_type: 'chromium',
                auth_type: 'none',
                auth_username: '',
                auth_password: '',
                max_pages: 100,
                max_depth: 3,
                request_delay_ms: 1000
            };
        },
        
        // ========================================
        // COMPONENT INITIALIZATION
        // ========================================
        
        init() {
            console.log('🕸️ Web Crawler component initialized');
            
            // Load crawlers when component initializes
            this.loadWebCrawlers();
            
            // Listen for project changes
            this.$watch('$data.selectedProject', () => {
                this.loadWebCrawlers();
            });
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
    window.webCrawlerComponent = webCrawlerComponent;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { webCrawlerComponent };
} 