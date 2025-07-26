const express = require('express');
const { pool } = require('../../database/config');
const router = express.Router();

// Simple health check endpoint
router.get('/', async (req, res) => {
    try {
        // Quick database connectivity check
        const dbResult = await pool.query('SELECT NOW() as timestamp');
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        components: {}
    };

    // Database connectivity check
    try {
        const dbStart = Date.now();
        const dbResult = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
        const dbResponseTime = Date.now() - dbStart;
        
        healthStatus.components.database = {
            status: 'healthy',
            responseTime: `${dbResponseTime}ms`,
            tableCount: parseInt(dbResult.rows[0].table_count),
            poolSize: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount
        };
    } catch (error) {
        healthStatus.status = 'degraded';
        healthStatus.components.database = {
            status: 'unhealthy',
            error: error.message
        };
    }

    // Check critical tables
    try {
        const criticalTables = ['test_sessions', 'test_requirements', 'test_instances', 'projects'];
        const tableChecks = {};
        
        for (const table of criticalTables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
                tableChecks[table] = {
                    status: 'accessible',
                    recordCount: parseInt(result.rows[0].count)
                };
            } catch (error) {
                tableChecks[table] = {
                    status: 'error',
                    error: error.message
                };
                healthStatus.status = 'degraded';
            }
        }
        
        healthStatus.components.tables = tableChecks;
    } catch (error) {
        healthStatus.components.tables = {
            status: 'error',
            error: error.message
        };
    }

    // Memory and process information
    const memUsage = process.memoryUsage();
    healthStatus.components.process = {
        status: 'healthy',
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        cpuUsage: process.cpuUsage()
    };

    // Environment validation
    const requiredEnvVars = ['NODE_ENV', 'DB_HOST', 'DB_NAME', 'DB_USER'];
    const envStatus = {};
    let envHealthy = true;
    
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            envStatus[envVar] = 'present';
        } else {
            envStatus[envVar] = 'missing';
            envHealthy = false;
        }
    }
    
    healthStatus.components.environment = {
        status: envHealthy ? 'healthy' : 'degraded',
        variables: envStatus,
        nodeEnv: process.env.NODE_ENV || 'undefined'
    };

    if (!envHealthy && healthStatus.status === 'healthy') {
        healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
});

// Readiness check (for Kubernetes/container orchestration)
router.get('/ready', async (req, res) => {
    try {
        // Check if we can execute a simple query
        await pool.query('SELECT 1');
        
        // Check if critical tables exist
        await pool.query('SELECT 1 FROM test_sessions LIMIT 1');
        
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Liveness check (for Kubernetes/container orchestration)
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router; 