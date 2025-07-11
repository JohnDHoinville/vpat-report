const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

// Import error handling middleware
const {
    errorHandler,
    notFoundHandler,
    accessLogger,
    asyncHandler,
    getErrorStats
} = require('./middleware/error-handler');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const sessionRoutes = require('./routes/sessions');
const pageRoutes = require('./routes/pages');
const resultRoutes = require('./routes/results');
const violationRoutes = require('./routes/violations');

// Import services
const WebSocketService = require('./services/websocket-service');
const SimpleTestingService = require('../database/services/simple-testing-service');
const SiteDiscoveryService = require('../database/services/site-discovery-service');

const app = express();
const server = http.createServer(app);

// Security and performance middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Access logging (before other middleware)
app.use(accessLogger);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Initialize testing services
const testingService = new SimpleTestingService(wsService);
const discoveryService = new SiteDiscoveryService(wsService);

// Make services available to routes
app.set('wsService', wsService);
app.set('testingService', testingService);
app.set('discoveryService', discoveryService);

// Health check endpoint with comprehensive system status
app.get('/health', asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Test database connectivity
        const { Pool } = require('pg');
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'accessibility_testing',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            max: 1,
            connectionTimeoutMillis: 3000
        });
        
        await pool.query('SELECT 1');
        await pool.end();
        
        // Get error statistics
        const errorStats = await getErrorStats();
        
        // WebSocket connection stats
        const wsStats = wsService.getStats();
        
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            response_time: `${Date.now() - startTime}ms`,
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            database: {
                status: 'connected',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'accessibility_testing'
            },
            websocket: {
                status: 'active',
                connected_clients: wsStats.connectedClients,
                active_projects: wsStats.activeProjects,
                active_sessions: wsStats.activeSessions
            },
            system: {
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                    external: Math.round(process.memoryUsage().external / 1024 / 1024)
                },
                cpu: {
                    usage: process.cpuUsage()
                },
                node_version: process.version
            },
            error_stats: errorStats,
            features: {
                authentication: 'enabled',
                rate_limiting: 'enabled',
                websocket: 'enabled',
                logging: 'enabled',
                compression: 'enabled',
                security_headers: 'enabled'
            }
        };
        
        res.json(healthData);
        
    } catch (error) {
        const errorStats = await getErrorStats().catch(() => ({}));
        
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed',
            response_time: `${Date.now() - startTime}ms`,
            error_stats: errorStats
        });
    }
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/violations', violationRoutes);

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Accessibility Testing API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'REST API for managing accessibility test data',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /health',
            auth: {
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                register: 'POST /api/auth/register',
                profile: 'GET /api/auth/profile',
                updateProfile: 'PUT /api/auth/profile',
                changePassword: 'POST /api/auth/change-password',
                sessions: 'GET /api/auth/sessions',
                revokeSession: 'DELETE /api/auth/sessions/:id',
                health: 'GET /api/auth/health'
            },
            projects: {
                list: 'GET /api/projects',
                get: 'GET /api/projects/:id',
                create: 'POST /api/projects',
                update: 'PUT /api/projects/:id',
                delete: 'DELETE /api/projects/:id'
            },
            sessions: {
                list: 'GET /api/sessions',
                get: 'GET /api/sessions/:id',
                create: 'POST /api/sessions',
                update: 'PUT /api/sessions/:id',
                delete: 'DELETE /api/sessions/:id',
                byProject: 'GET /api/projects/:id/sessions'
            },
            pages: {
                list: 'GET /api/pages',
                get: 'GET /api/pages/:id',
                bySession: 'GET /api/sessions/:id/pages'
            },
            results: {
                list: 'GET /api/results',
                get: 'GET /api/results/:id',
                bySession: 'GET /api/sessions/:id/results',
                byPage: 'GET /api/pages/:id/results'
            }
        },
        documentation: 'See README.md for detailed API documentation'
    });
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        wsService.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        wsService.close();
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Accessibility Testing API Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📚 API docs: http://${HOST}:${PORT}/api`);
    console.log(`🔄 WebSocket service initialized`);
    console.log(`🛡️  Security features: Helmet, CORS, Rate Limiting`);
    console.log(`📝 Logging: Access and Error logs enabled`);
});

module.exports = { app, server, wsService }; 