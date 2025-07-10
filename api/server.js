const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { db } = require('../database/config');

// Import route modules
const projectRoutes = require('./routes/projects');
const sessionRoutes = require('./routes/sessions');
const pageRoutes = require('./routes/pages');
const resultRoutes = require('./routes/results');

/**
 * Accessibility Testing API Server
 * Provides REST endpoints for managing accessibility test data
 */

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const dbConnected = await db.testConnection();
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbConnected ? 'connected' : 'disconnected',
            version: process.env.npm_package_version || '1.0.0'
        };

        res.status(dbConnected ? 200 : 503).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Accessibility Testing API',
        version: '1.0.0',
        description: 'REST API for managing accessibility test data',
        endpoints: {
            health: 'GET /health',
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

// Mount API routes
app.use('/api/projects', projectRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/results', resultRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: '/api'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, error);
    
    // Database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: 'Database connection failed',
            message: 'Please check database configuration'
        });
    }
    
    // Validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.message
        });
    }
    
    // PostgreSQL errors
    if (error.code && error.code.startsWith('23')) {
        return res.status(409).json({
            error: 'Database constraint violation',
            message: 'The operation conflicts with existing data'
        });
    }
    
    // Default error response
    res.status(error.status || 500).json({
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

/**
 * Start the server
 */
async function startServer() {
    try {
        // Test database connection before starting
        console.log('🔍 Testing database connection...');
        const dbConnected = await db.testConnection();
        
        if (!dbConnected) {
            console.error('❌ Failed to connect to database');
            process.exit(1);
        }
        
        console.log('✅ Database connection successful');
        
        // Start the server
        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Accessibility Testing API Server`);
            console.log(`📡 Listening on port ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API docs: http://localhost:${PORT}/api`);
            console.log(`🗄️ Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
            
            server.close(async () => {
                console.log('🔌 HTTP server closed');
                
                try {
                    await db.end();
                    console.log('🗄️ Database connections closed');
                } catch (error) {
                    console.error('❌ Error closing database:', error.message);
                }
                
                console.log('✅ Graceful shutdown completed');
                process.exit(0);
            });
            
            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('⚠️ Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
    } catch (error) {
        console.error('💥 Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer }; 