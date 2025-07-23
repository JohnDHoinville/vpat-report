// WebSocket Manager for Real-time Updates
// Accessibility Testing Platform - Modular Dashboard

/**
 * WebSocket Manager for handling real-time communications
 * Extracted from dashboard_helpers.js for modular architecture
 */
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.token = null;
        this.dashboardStore = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventHandlers = new Map();
    }

    // ========================================
    // CONNECTION MANAGEMENT
    // ========================================

    async initialize(token, dashboardStore) {
        if (!token || !window.io) {
            console.warn('⚠️ WebSocket not available - missing token or Socket.IO');
            return false;
        }

        this.token = token;
        this.dashboardStore = dashboardStore;

        try {
            this.socket = io('http://localhost:3001', {
                auth: {
                    token: this.token
                },
                transports: ['websocket', 'polling']
            });

            this.setupEventHandlers();
            return true;
        } catch (error) {
            console.error('WebSocket initialization failed:', error);
            return false;
        }
    }

    setupEventHandlers() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => {
            console.log('🔌 WebSocket connected');
            this.connected = true;
            this.reconnectAttempts = 0;
            
            if (this.dashboardStore) {
                this.dashboardStore.wsConnected = true;
                this.dashboardStore.addNotification('success', 'Live Updates', 'Real-time updates connected');
                
                // Join project room if one is selected
                if (this.dashboardStore.selectedProject) {
                    this.socket.emit('join_project', this.dashboardStore.selectedProject.id);
                }
            }
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
            this.connected = false;
            
            if (this.dashboardStore) {
                this.dashboardStore.wsConnected = false;
            }
            
            this.attemptReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.connected = false;
            
            if (this.dashboardStore) {
                this.dashboardStore.wsConnected = false;
            }
        });

        // ========================================
        // AUTHENTICATION EVENTS
        // ========================================

        this.socket.on('auth_prompt', (data) => {
            console.log('🔐 Auth prompt received:', data);
            this.handleAuthPrompt(data.authPrompt);
        });

        // ========================================
        // DISCOVERY/CRAWLER EVENTS
        // ========================================

        this.socket.on('discovery_progress', (data) => {
            console.log('📡 Discovery progress:', data);
            this.handleDiscoveryProgress(data);
        });

        this.socket.on('discovery_complete', (data) => {
            console.log('🏁 Discovery complete:', data);
            this.handleDiscoveryComplete(data);
        });

        this.socket.on('crawler_progress', (data) => {
            console.log('🕷️ Crawler progress:', data);
            this.handleCrawlerProgress(data);
        });

        this.socket.on('crawler_update', (data) => {
            console.log('🔄 Crawler update:', data);
            this.handleCrawlerUpdate(data);
        });

        this.socket.on('discovery_milestone', (data) => {
            this.handleDiscoveryMilestone(data);
        });

        // ========================================
        // TESTING EVENTS
        // ========================================

        this.socket.on('session_progress', (data) => {
            console.log('📊 Session progress:', data);
            this.handleSessionProgress(data);
        });

        this.socket.on('session_complete', (data) => {
            console.log('✅ Session complete:', data);
            this.handleSessionComplete(data);
        });

        this.socket.on('testing_milestone', (data) => {
            this.handleTestingMilestone(data);
        });

        this.socket.on('test_status_changed', (data) => {
            console.log('🔄 Test status changed:', data);
            this.handleTestStatusChanged(data);
        });

        this.socket.on('evidence_uploaded', (data) => {
            console.log('📎 Evidence uploaded:', data);
            this.handleEvidenceUploaded(data);
        });

        this.socket.on('test_assigned', (data) => {
            console.log('👤 Test assigned:', data);
            this.handleTestAssigned(data);
        });

        this.socket.on('review_requested', (data) => {
            console.log('👀 Review requested:', data);
            this.handleReviewRequested(data);
        });

        // ========================================
        // GENERAL EVENTS
        // ========================================

        this.socket.on('notification', (data) => {
            if (this.dashboardStore) {
                this.dashboardStore.addNotification(data.type || 'info', data.title || 'Update', data.message);
            }
        });

        this.socket.on('activity_update', (data) => {
            console.log('📢 Activity update:', data);
            this.handleActivityFeedUpdate(data);
        });

        // ========================================
        // USER PRESENCE EVENTS
        // ========================================

        this.socket.on('user_joined_project', (data) => {
            if (this.dashboardStore) {
                this.dashboardStore.addNotification('info', 'User Joined', `${data.username} joined the project`);
            }
        });

        this.socket.on('user_left_project', (data) => {
            if (this.dashboardStore) {
                this.dashboardStore.addNotification('info', 'User Left', `${data.username} left the project`);
            }
        });
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    handleAuthPrompt(authPrompt) {
        if (!this.dashboardStore) return;
        
        console.log('🔐 Handling auth prompt:', authPrompt);
        this.dashboardStore.authPrompt = authPrompt;
        this.dashboardStore.showAuthPrompt = true;
    }

    handleDiscoveryProgress(data) {
        if (!this.dashboardStore) return;

        this.dashboardStore.discoveryProgress = {
            active: true,
            discoveryId: data.discoveryId,
            percentage: data.progress.percentage,
            pagesFound: data.progress.pagesFound,
            currentUrl: data.progress.currentUrl,
            depth: data.progress.depth,
            message: data.progress.message,
            stage: data.progress.stage,
            estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
            startTime: data.progress.startTime,
            errors: data.progress.errors,
            statistics: data.progress.statistics
        };

        // Update progress notification
        this.updateProgressNotification('discovery', data.progress.percentage, data.progress.message);
    }

    handleDiscoveryComplete(data) {
        if (!this.dashboardStore) return;

        this.dashboardStore.discoveryProgress.active = false;
        this.dashboardStore.discoveryProgress.stage = 'complete';
        this.dashboardStore.discoveryProgress.percentage = 100;

        this.dashboardStore.addNotification('success', 'Discovery Complete', 
            `Found ${data.pagesFound} pages. Ready for testing.`);
    }

    handleCrawlerProgress(data) {
        if (!this.dashboardStore) return;

        const crawlerRun = data.crawlerRun;
        if (!crawlerRun) return;

        // Update crawler progress state
        this.dashboardStore.crawlerProgress.active = crawlerRun.status === 'running';
        this.dashboardStore.crawlerProgress.percentage = Math.round((crawlerRun.pages_found / Math.max(crawlerRun.pages_found + 50, 100)) * 100);
        this.dashboardStore.crawlerProgress.message = `Crawling ${crawlerRun.crawler_name}...`;
        this.dashboardStore.crawlerProgress.pagesFound = crawlerRun.pages_found || 0;
        this.dashboardStore.crawlerProgress.status = crawlerRun.status;

        // Update statistics if available
        if (crawlerRun.statistics) {
            this.dashboardStore.crawlerProgress.statistics = {
                urlsQueued: crawlerRun.statistics.urlsQueued || 0,
                urlsProcessed: crawlerRun.statistics.urlsProcessed || 0,
                averageTime: crawlerRun.statistics.averageTime || 0,
                currentDepth: crawlerRun.statistics.currentDepth || 1,
                maxDepth: crawlerRun.statistics.maxDepth || 3
            };
        }

        // Handle completion
        if (crawlerRun.status === 'completed') {
            this.dashboardStore.crawlerProgress.active = false;
            this.dashboardStore.addNotification('success', 'Crawler Complete', 
                `Found ${crawlerRun.pages_found} pages for ${crawlerRun.crawler_name}`);
            
            // Reload crawlers to update UI if the function exists
            if (typeof this.dashboardStore.loadWebCrawlers === 'function') {
                this.dashboardStore.loadWebCrawlers();
            }
        } else if (crawlerRun.status === 'failed') {
            this.dashboardStore.crawlerProgress.active = false;
            this.dashboardStore.addNotification('error', 'Crawler Failed', 
                `Crawler ${crawlerRun.crawler_name} encountered an error`);
        }
    }

    handleCrawlerUpdate(data) {
        console.log('🔄 Processing crawler update:', data);
        
        if (data.type === 'status_change' && this.dashboardStore && typeof this.dashboardStore.loadWebCrawlers === 'function') {
            this.dashboardStore.loadWebCrawlers(); // Refresh the crawler list
        }
    }

    handleSessionProgress(data) {
        if (!this.dashboardStore) return;

        this.dashboardStore.testingProgress = {
            active: true,
            sessionId: data.sessionId,
            percentage: data.progress.percentage,
            completedTests: data.progress.completedTests,
            totalTests: data.progress.totalTests,
            currentPage: data.progress.currentPage,
            currentTool: data.progress.currentTool,
            message: data.progress.message,
            stage: data.progress.stage,
            estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
            startTime: data.progress.startTime,
            errors: data.progress.errors,
            violationsFound: data.progress.violationsFound,
            passesFound: data.progress.passesFound,
            warningsFound: data.progress.warningsFound,
            statistics: data.progress.statistics
        };

        // Update progress notification
        this.updateProgressNotification('testing', data.progress.percentage, data.progress.message);
    }

    handleSessionComplete(data) {
        if (!this.dashboardStore) return;

        this.dashboardStore.testingProgress.active = false;
        this.dashboardStore.testingProgress.stage = 'complete';
        this.dashboardStore.testingProgress.percentage = 100;

        this.dashboardStore.addNotification('success', 'Testing Complete', 
            `Session completed with ${data.violationsFound} violations found.`);
    }

    handleTestStatusChanged(data) {
        this.handleActivityFeedUpdate({
            session_id: data.session_id,
            action_type: 'status_change',
            change_description: `Status changed from ${data.old_status} to ${data.new_status}`,
            username: data.username,
            criterion_number: data.criterion_number,
            test_instance_id: data.test_instance_id,
            timestamp: new Date().toISOString()
        });
    }

    handleEvidenceUploaded(data) {
        this.handleActivityFeedUpdate({
            session_id: data.session_id,
            action_type: 'evidence_uploaded',
            change_description: `Evidence uploaded: ${data.filename}`,
            username: data.username,
            criterion_number: data.criterion_number,
            test_instance_id: data.test_instance_id,
            timestamp: new Date().toISOString()
        });
    }

    handleTestAssigned(data) {
        this.handleActivityFeedUpdate({
            session_id: data.session_id,
            action_type: 'assignment',
            change_description: `Test assigned to ${data.assigned_to}`,
            username: data.assigned_by,
            criterion_number: data.criterion_number,
            test_instance_id: data.test_instance_id,
            timestamp: new Date().toISOString()
        });
    }

    handleReviewRequested(data) {
        this.handleActivityFeedUpdate({
            session_id: data.session_id,
            action_type: 'review_requested',
            change_description: `Review requested`,
            username: data.requested_by,
            criterion_number: data.criterion_number,
            test_instance_id: data.test_instance_id,
            timestamp: new Date().toISOString()
        });
    }

    handleActivityFeedUpdate(data) {
        if (!this.dashboardStore || !this.dashboardStore.activityFeed) return;

        // Add new activity to the feed
        this.dashboardStore.activityFeed.activities.unshift({
            id: `ws_${Date.now()}`,
            action_type: data.action_type,
            change_description: data.change_description || 'Real-time update',
            timestamp: data.timestamp || new Date().toISOString(),
            username: data.username || 'System',
            full_name: data.full_name || 'System',
            criterion_number: data.criterion_number,
            page_url: data.page_url,
            test_instance_id: data.test_instance_id
        });

        // Increment unread count if feed is closed
        if (!this.dashboardStore.activityFeed.isOpen) {
            this.dashboardStore.activityFeed.unreadCount++;
        }

        // Limit activities to prevent memory issues
        if (this.dashboardStore.activityFeed.activities.length > 100) {
            this.dashboardStore.activityFeed.activities = this.dashboardStore.activityFeed.activities.slice(0, 100);
        }
    }

    handleDiscoveryMilestone(data) {
        if (!this.dashboardStore) return;
        
        this.dashboardStore.addNotification('info', 'Discovery Milestone', 
            `${data.milestone}: ${data.message}`);
    }

    handleTestingMilestone(data) {
        if (!this.dashboardStore) return;
        
        this.dashboardStore.addNotification('info', 'Testing Milestone', 
            `${data.milestone}: ${data.message}`);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    updateProgressNotification(type, percentage, message) {
        if (!this.dashboardStore) return;

        const title = type === 'discovery' ? 'Discovery Progress' : 'Testing Progress';
        const notificationMessage = `${Math.round(percentage)}% - ${message}`;
        
        // Only show periodic notifications to avoid spam
        if (percentage % 25 === 0 || percentage >= 95) {
            this.dashboardStore.addNotification('info', title, notificationMessage);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

        setTimeout(() => {
            if (this.socket && !this.connected) {
                this.socket.connect();
            }
        }, delay);
    }

    // ========================================
    // PUBLIC METHODS
    // ========================================

    joinProject(projectId) {
        if (this.socket && this.connected) {
            this.socket.emit('join_project', projectId);
            console.log(`📁 Joined project room: ${projectId}`);
        }
    }

    leaveProject(projectId) {
        if (this.socket && this.connected) {
            this.socket.emit('leave_project', projectId);
            console.log(`📁 Left project room: ${projectId}`);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    isConnected() {
        return this.connected;
    }

    // Custom event handling
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);

        // If socket is available, register the handler
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }

        // If socket is available, remove the handler
        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        }
    }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

// Alpine.js integration function
function createWebSocketManager() {
    return {
        // Initialize WebSocket connection
        async initializeWebSocket(token, dashboardStore) {
            return await webSocketManager.initialize(token, dashboardStore);
        },

        // Connection status
        isWebSocketConnected() {
            return webSocketManager.isConnected();
        },

        // Project room management
        joinProject(projectId) {
            webSocketManager.joinProject(projectId);
        },

        leaveProject(projectId) {
            webSocketManager.leaveProject(projectId);
        },

        // Event handling
        onWebSocketEvent(event, handler) {
            webSocketManager.on(event, handler);
        },

        offWebSocketEvent(event, handler) {
            webSocketManager.off(event, handler);
        },

        emitWebSocketEvent(event, data) {
            webSocketManager.emit(event, data);
        },

        // Cleanup
        disconnectWebSocket() {
            webSocketManager.disconnect();
        }
    };
}

// Export for both module and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WebSocketManager, webSocketManager, createWebSocketManager };
}

// Make available globally for Alpine.js
if (typeof window !== 'undefined') {
    window.WebSocketManager = WebSocketManager;
    window.webSocketManager = webSocketManager;
    window.createWebSocketManager = createWebSocketManager;
} 