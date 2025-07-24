const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path'); // Added for serving static files

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
const requirementsRoutes = require('./routes/requirements');
const requirementMappingsRoutes = require('./routes/requirement-mappings');
const unifiedResultsRoutes = require('./routes/unified-results');
const automatedWorkflowRoutes = require('./routes/automated-workflow');
const testInstancesRoutes = require('./routes/test-instances');
const pageRoutes = require('./routes/pages');
const resultRoutes = require('./routes/results');
const violationRoutes = require('./routes/violations');
const manualTestingRoutes = require('./routes/manual-testing');
const usersRoutes = require('./routes/users');
const unifiedTestResultsRoutes = require('./routes/unified-test-results');
const unifiedRequirementsRoutes = require('./routes/unified-requirements');
const webCrawlersRoutes = require('./routes/web-crawlers');

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
        'http://localhost:8081', // Dashboard frontend
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081' // Dashboard frontend
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

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve dashboard and static files from project root
app.use(express.static(path.join(__dirname, '..'), { 
    index: 'dashboard.html',
    dotfiles: 'ignore',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Initialize testing services
const testingService = new SimpleTestingService(wsService);
const discoveryService = new SiteDiscoveryService(wsService);

// Initialize crawler services with WebSocket support
webCrawlersRoutes.initializeServices(wsService);

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
app.use('/api/session', sessionRoutes); // Browser session management endpoints
app.use('/api/requirements', requirementsRoutes);
app.use('/api/requirement-mappings', requirementMappingsRoutes);
app.use('/api/unified-results', unifiedResultsRoutes);
app.use('/api/unified-requirements', unifiedRequirementsRoutes);
app.use('/api/automated-workflow', automatedWorkflowRoutes);
app.use('/api/test-instances', testInstancesRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/manual-testing', manualTestingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/unified-test-results', unifiedTestResultsRoutes);
app.use('/api/unified-requirements', unifiedRequirementsRoutes);
app.use('/api/web-crawlers', webCrawlersRoutes);

// Add API health check endpoint
app.get('/api/health', asyncHandler(async (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
}));



// Add missing endpoint that frontend is calling
app.get('/api/automated-test-results', asyncHandler(async (req, res) => {
    // Redirect to the correct endpoint
    const { session_id } = req.query;
    
    if (!session_id) {
        return res.status(400).json({ 
            error: 'session_id is required' 
        });
    }

    // Forward to the actual endpoint
    const redirectUrl = `/api/results/automated-test-results?session_id=${encodeURIComponent(session_id)}`;
    
    // Make internal request to correct endpoint
    try {
        const { db } = require('../database/config');
        
        const query = `
            SELECT 
                atr.id,
                atr.tool_name,
                atr.test_session_id,
                atr.page_id,
                atr.violations_count,
                atr.warnings_count,
                atr.passes_count,
                atr.test_duration_ms,
                atr.executed_at,
                atr.raw_results,
                dp.url as page_url,
                dp.title as page_title,
                dp.page_type,
                CASE 
                    WHEN atr.violations_count > 0 THEN 'fail'
                    WHEN atr.passes_count > 0 THEN 'pass'
                    ELSE 'unknown'
                END as result_status,
                -- Extract WCAG criterion from raw_results if available
                COALESCE(
                    atr.raw_results->>'wcag_criterion',
                    atr.raw_results->'violations'->0->>'criterion',
                    'unknown'
                ) as wcag_criterion
            FROM automated_test_results atr
            JOIN discovered_pages dp ON atr.page_id = dp.id
            WHERE atr.test_session_id = $1
            ORDER BY atr.tool_name, dp.url, atr.executed_at DESC
        `;

        const result = await db.query(query, [session_id]);
        
        res.json({
            data: result.rows,
            total: result.rows.length,
            session_id: session_id
        });
        
    } catch (error) {
        console.error('Error fetching automated test results:', error);
        res.status(500).json({ 
            error: 'Failed to fetch automated test results',
            details: error.message 
        });
    }
}));

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
            requirements: {
                list: 'GET /api/requirements',
                get: 'GET /api/requirements/:id',
                byConformance: 'GET /api/requirements/conformance/:level',
                stats: 'GET /api/requirements/stats/summary',
                update: 'PUT /api/requirements/:id',
                validate: 'POST /api/requirements/validate'
            },
            testInstances: {
                list: 'GET /api/test-instances',
                get: 'GET /api/test-instances/:id',
                create: 'POST /api/test-instances',
                update: 'PUT /api/test-instances/:id',
                assign: 'POST /api/test-instances/:id/assign',
                addEvidence: 'POST /api/test-instances/:id/evidence',
                auditTrail: 'GET /api/test-instances/:id/audit-trail',
                statistics: 'GET /api/test-instances/:id/statistics',
                delete: 'DELETE /api/test-instances/:id'
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