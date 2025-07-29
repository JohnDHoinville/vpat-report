const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { validateSession } = require('../middleware/auth');

/**
 * WebSocket Service for Real-time Progress Tracking
 * Provides authenticated real-time communication for testing progress
 */
class WebSocketService {
    constructor(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || [
                    'http://localhost:3000', 
                    'http://localhost:8080',
                    'http://127.0.0.1:3000',
                    'http://127.0.0.1:8080'
                ],
                credentials: true,
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling']
        });

        this.clients = new Map(); // Map of userId -> socket instances
        this.projectRooms = new Map(); // Map of projectId -> Set of userIds
        this.sessionRooms = new Map(); // Map of sessionId -> Set of userIds

        this.setupAuthentication();
        this.setupEventHandlers();
        
        console.log('🔄 WebSocket service initialized');
    }

    /**
     * Setup authentication middleware for WebSocket connections
     */
    setupAuthentication() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                // Development bypass for 'test' token
                if (token === 'test' && process.env.NODE_ENV === 'development') {
                    console.log('🔧 Development mode: Bypassing WebSocket authentication with test token');
                    socket.userId = 'ef726585-0873-44a9-99e5-d8f81fd4ef35'; // Use the actual admin user UUID
                    socket.username = 'admin';
                    socket.role = 'admin';
                    socket.sessionId = 'test-session';
                    console.log(`🔌 WebSocket authenticated: ${socket.username} (${socket.userId})`);
                    return next();
                }

                // Validate JWT token
                const JWT_SECRET = process.env.JWT_SECRET || 'accessibility-testing-secret-key-change-in-production';
                const decoded = jwt.verify(token, JWT_SECRET);

                // Validate session in database
                const session = await validateSession(token);
                
                if (!session) {
                    return next(new Error('Invalid or expired session'));
                }

                // Attach user info to socket
                socket.userId = decoded.userId;
                socket.username = decoded.username;
                socket.role = decoded.role;
                socket.sessionId = session.id;

                console.log(`🔌 WebSocket authenticated: ${socket.username} (${socket.userId})`);
                next();
            } catch (error) {
                console.error('WebSocket authentication failed:', error.message);
                next(new Error('Authentication failed'));
            }
        });
    }

    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`✅ WebSocket connected: ${socket.username} (${socket.userId})`);

            // Store client connection
            this.clients.set(socket.userId, socket);

            // Handle user joining project room
            socket.on('join_project', (projectId) => {
                if (projectId) {
                    socket.join(`project_${projectId}`);
                    
                    if (!this.projectRooms.has(projectId)) {
                        this.projectRooms.set(projectId, new Set());
                    }
                    this.projectRooms.get(projectId).add(socket.userId);
                    
                    console.log(`📁 User ${socket.username} joined project ${projectId}`);
                    
                    // Notify other users in the project
                    socket.to(`project_${projectId}`).emit('user_joined_project', {
                        userId: socket.userId,
                        username: socket.username,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Handle user joining session room
            socket.on('join_session', (sessionId) => {
                if (sessionId) {
                    socket.join(`session_${sessionId}`);
                    
                    if (!this.sessionRooms.has(sessionId)) {
                        this.sessionRooms.set(sessionId, new Set());
                    }
                    this.sessionRooms.get(sessionId).add(socket.userId);
                    
                    console.log(`🧪 User ${socket.username} joined session ${sessionId}`);
                    
                    // Notify other users in the session
                    socket.to(`session_${sessionId}`).emit('user_joined_session', {
                        userId: socket.userId,
                        username: socket.username,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Handle heartbeat/ping
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: new Date().toISOString() });
            });

            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log(`🔌 WebSocket disconnected: ${socket.username} (${reason})`);
                
                // Remove from clients map
                this.clients.delete(socket.userId);
                
                // Remove from project rooms
                for (const [projectId, users] of this.projectRooms.entries()) {
                    if (users.has(socket.userId)) {
                        users.delete(socket.userId);
                        socket.to(`project_${projectId}`).emit('user_left_project', {
                            userId: socket.userId,
                            username: socket.username,
                            timestamp: new Date().toISOString()
                        });
                        
                        if (users.size === 0) {
                            this.projectRooms.delete(projectId);
                        }
                    }
                }
                
                // Remove from session rooms
                for (const [sessionId, users] of this.sessionRooms.entries()) {
                    if (users.has(socket.userId)) {
                        users.delete(socket.userId);
                        socket.to(`session_${sessionId}`).emit('user_left_session', {
                            userId: socket.userId,
                            username: socket.username,
                            timestamp: new Date().toISOString()
                        });
                        
                        if (users.size === 0) {
                            this.sessionRooms.delete(sessionId);
                        }
                    }
                }
            });
        });
    }

    /**
     * Broadcast site discovery progress update
     */
    emitDiscoveryProgress(projectId, discoveryId, progressData) {
        const message = {
            type: 'discovery_progress',
            projectId,
            discoveryId,
            progress: {
                percentage: progressData.percentage || 0,
                pagesFound: progressData.pagesFound || 0,
                currentUrl: progressData.currentUrl || '',
                depth: progressData.depth || 0,
                maxDepth: progressData.maxDepth || 3,
                message: progressData.message || 'Discovery in progress...',
                stage: progressData.stage || 'crawling',
                estimatedTimeRemaining: progressData.estimatedTimeRemaining,
                startTime: progressData.startTime,
                errors: progressData.errors || [],
                statistics: {
                    urlsQueued: progressData.urlsQueued || 0,
                    urlsProcessed: progressData.urlsProcessed || 0,
                    urlsSkipped: progressData.urlsSkipped || 0,
                    totalSize: progressData.totalSize || 0,
                    averageLoadTime: progressData.averageLoadTime || 0
                }
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('discovery_progress', message);
        console.log(`📡 Discovery progress broadcast: ${projectId} - ${progressData.percentage}% (${progressData.stage})`);
    }

    /**
     * Broadcast authentication prompt for dynamic authentication
     */
    emitAuthPrompt(projectId, discoveryId, authPromptData) {
        const message = {
            type: 'auth_prompt',
            projectId,
            discoveryId,
            authPrompt: {
                promptId: authPromptData.promptId,
                loginUrl: authPromptData.loginUrl,
                authType: authPromptData.authType,
                formFields: authPromptData.formFields,
                message: authPromptData.message
            },
            timestamp: new Date().toISOString()
        };

        // Emit to project room
        this.io.to(`project_${projectId}`).emit('auth_prompt', message);
        console.log(`🔐 Auth prompt emitted for discovery ${discoveryId} in project ${projectId}`);
    }

    /**
     * Broadcast discovery completion
     */
    emitDiscoveryComplete(projectId, discoveryId, results) {
        const message = {
            type: 'discovery_complete',
            projectId,
            discoveryId,
            results,
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('discovery_complete', message);
        console.log(`🏁 Discovery complete broadcast: ${projectId} - ${results.total_pages_found} pages`);
    }

    /**
     * Broadcast discovery deletion
     */
    emitDiscoveryDeleted(projectId, discoveryId) {
        const message = {
            type: 'discovery_deleted',
            projectId,
            discoveryId,
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('discovery_deleted', message);
        console.log(`🗑️ Discovery deletion broadcast: ${projectId} - ${discoveryId}`);
    }

    /**
     * Broadcast test session progress update
     */
    emitSessionProgress(sessionId, projectId, progressData) {
        const message = {
            type: 'session_progress',
            sessionId,
            projectId,
            progress: {
                percentage: progressData.percentage || 0,
                completedTests: progressData.completedTests || 0,
                totalTests: progressData.totalTests || 0,
                currentPage: progressData.currentPage || '',
                currentTool: progressData.currentTool || '',
                message: progressData.message || 'Testing in progress...',
                stage: progressData.stage || 'testing',
                estimatedTimeRemaining: progressData.estimatedTimeRemaining,
                startTime: progressData.startTime,
                errors: progressData.errors || [],
                violationsFound: progressData.violationsFound || 0,
                passesFound: progressData.passesFound || 0,
                warningsFound: progressData.warningsFound || 0,
                statistics: {
                    axeTests: progressData.axeTests || 0,
                    pa11yTests: progressData.pa11yTests || 0,
                    lighthouseTests: progressData.lighthouseTests || 0,
                    averageTestTime: progressData.averageTestTime || 0,
                    criticalViolations: progressData.criticalViolations || 0,
                    moderateViolations: progressData.moderateViolations || 0,
                    minorViolations: progressData.minorViolations || 0
                }
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`session_${sessionId}`).emit('session_progress', message);
        this.io.to(`project_${projectId}`).emit('session_progress', message);
        console.log(`📡 Session progress broadcast: ${sessionId} - ${progressData.percentage}% (${progressData.stage})`);
    }

    /**
     * Broadcast test session completion
     */
    emitSessionComplete(sessionId, projectId, results) {
        const message = {
            type: 'session_complete',
            sessionId,
            projectId,
            results,
            timestamp: new Date().toISOString()
        };

        this.io.to(`session_${sessionId}`).emit('session_complete', message);
        this.io.to(`project_${projectId}`).emit('session_complete', message);
        console.log(`🏁 Session complete broadcast: ${sessionId}`);
    }

    /**
     * Broadcast test results update
     */
    emitTestResults(sessionId, projectId, pageId, testData) {
        const message = {
            type: 'test_results',
            sessionId,
            projectId,
            pageId,
            testData,
            timestamp: new Date().toISOString()
        };

        this.io.to(`session_${sessionId}`).emit('test_results', message);
        console.log(`📊 Test results broadcast: ${sessionId} - ${testData.tool_name}`);
    }

    /**
     * Enhanced testing milestone with detailed context
     */
    emitTestingMilestone(sessionId, projectId, milestone) {
        const message = {
            type: 'testing_milestone',
            sessionId,
            projectId,
            milestone: {
                type: milestone.type,
                message: milestone.message,
                timestamp: new Date().toISOString(),
                // Context-specific data based on milestone type
                ...(milestone.type === 'tool_complete' && {
                    tool: milestone.tool,
                    violationsFound: milestone.violationsFound,
                    passesFound: milestone.passesFound,
                    timeElapsed: milestone.timeElapsed
                }),
                ...(milestone.type === 'high_violations' && {
                    count: milestone.count,
                    threshold: milestone.threshold,
                    averagePerPage: milestone.averagePerPage
                }),
                ...(milestone.type === 'critical_violation' && {
                    description: milestone.description,
                    wcagCriteria: milestone.wcagCriteria,
                    url: milestone.url,
                    severity: milestone.severity
                }),
                ...(milestone.type.startsWith('progress_') && {
                    percentage: milestone.percentage,
                    violationsFound: milestone.violationsFound,
                    estimatedCompletion: milestone.estimatedCompletion
                })
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`session_${sessionId}`).emit('testing_milestone', message);
        this.io.to(`project_${projectId}`).emit('testing_milestone', message);
        console.log(`🎯 Testing milestone: ${sessionId} - ${milestone.type}`);
    }

    /**
     * Enhanced discovery milestone with detailed context
     */
    emitDiscoveryMilestone(projectId, discoveryId, milestone) {
        const message = {
            type: 'discovery_milestone',
            projectId,
            discoveryId,
            milestone: {
                type: milestone.type,
                message: milestone.message,
                timestamp: new Date().toISOString(),
                // Context-specific data based on milestone type
                ...(milestone.type === 'depth_complete' && {
                    depth: milestone.depth,
                    pagesFound: milestone.pagesFound,
                    timeElapsed: milestone.timeElapsed
                }),
                ...(milestone.type === 'large_site_detected' && {
                    totalPages: milestone.totalPages,
                    recommendedMaxPages: milestone.recommendedMaxPages
                }),

                ...(milestone.type === 'error_threshold' && {
                    errorRate: milestone.errorRate,
                    errorCount: milestone.errorCount,
                    totalAttempts: milestone.totalAttempts
                })
            },
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('discovery_milestone', message);
        console.log(`🎯 Discovery milestone: ${discoveryId} - ${milestone.type}`);
    }

    /**
     * Broadcast crawler status update to project members
     */
    emitCrawlerUpdate(projectId, crawlerData) {
        const message = {
            type: 'crawler_update',
            projectId,
            crawler: crawlerData,
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('crawler_update', message);
        console.log(`🕷️ Crawler update broadcast: ${projectId} - ${crawlerData.name} (${crawlerData.status})`);
    }

    /**
     * Broadcast crawler run progress to project members
     */
    emitCrawlerProgress(projectId, crawlerRunData) {
        const message = {
            type: 'crawler_progress',
            projectId,
            crawlerRun: crawlerRunData,
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('crawler_progress', message);
        console.log(`📊 Crawler progress: ${projectId} - ${crawlerRunData.status} (${crawlerRunData.pages_found || 0} pages)`);
    }

    /**
     * Send notification to specific user
     */
    emitUserNotification(userId, notification) {
        const socket = this.clients.get(userId);
        if (socket) {
            socket.emit('notification', {
                type: 'notification',
                ...notification,
                timestamp: new Date().toISOString()
            });
            console.log(`🔔 Notification sent to ${userId}: ${notification.message}`);
        }
    }

    /**
     * Broadcast notification to project members
     */
    emitProjectNotification(projectId, notification) {
        const message = {
            type: 'project_notification',
            projectId,
            ...notification,
            timestamp: new Date().toISOString()
        };

        this.io.to(`project_${projectId}`).emit('notification', message);
        console.log(`📢 Project notification broadcast: ${projectId} - ${notification.message}`);
    }

    /**
     * Get connection statistics
     */
    getStats() {
        return {
            connectedClients: this.clients.size,
            activeProjects: this.projectRooms.size,
            activeSessions: this.sessionRooms.size,
            totalRooms: this.io.sockets.adapter.rooms.size
        };
    }

    /**
     * Get list of connected users for a project
     */
    getProjectUsers(projectId) {
        return Array.from(this.projectRooms.get(projectId) || []);
    }

    /**
     * Get list of connected users for a session
     */
    getSessionUsers(sessionId) {
        return Array.from(this.sessionRooms.get(sessionId) || []);
    }

    /**
     * Close WebSocket service
     */
    close() {
        console.log('🔌 Closing WebSocket service...');
        this.io.close();
    }
}

module.exports = WebSocketService; 