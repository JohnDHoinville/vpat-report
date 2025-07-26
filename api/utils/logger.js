const fs = require('fs');
const path = require('path');

class StructuredLogger {
    constructor() {
        this.logLevel = this.getLogLevel();
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    getLogLevel() {
        const level = process.env.LOG_LEVEL || 'info';
        return level.toLowerCase();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    shouldLog(level) {
        return this.logLevels[level] >= this.logLevels[this.logLevel];
    }

    formatLogEntry(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            pid: process.pid,
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            ...context
        };

        return logEntry;
    }

    writeToFile(level, logEntry) {
        const filename = `${level}-${new Date().toISOString().split('T')[0]}.log`;
        const filePath = path.join(this.logDir, filename);
        const logLine = JSON.stringify(logEntry) + '\n';
        
        fs.appendFileSync(filePath, logLine);
    }

    log(level, message, context = {}) {
        if (!this.shouldLog(level)) return;

        const logEntry = this.formatLogEntry(level, message, context);
        
        // Console output with colors
        const colors = {
            debug: '\x1b[36m', // Cyan
            info: '\x1b[32m',  // Green
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m'  // Red
        };
        const reset = '\x1b[0m';
        
        console.log(
            `${colors[level]}[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}${reset}`,
            Object.keys(context).length > 0 ? context : ''
        );

        // Write to file
        this.writeToFile(level, logEntry);
    }

    debug(message, context = {}) {
        this.log('debug', message, context);
    }

    info(message, context = {}) {
        this.log('info', message, context);
    }

    warn(message, context = {}) {
        this.log('warn', message, context);
    }

    error(message, error = null, context = {}) {
        const errorContext = {
            ...context,
            ...(error && {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                }
            })
        };
        this.log('error', message, errorContext);
    }

    // Performance logging
    startTimer(operation) {
        const startTime = process.hrtime.bigint();
        return {
            end: (context = {}) => {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
                
                this.info(`Operation completed: ${operation}`, {
                    operation,
                    duration: `${duration.toFixed(2)}ms`,
                    ...context
                });
                
                // Log slow operations as warnings
                if (duration > 1000) {
                    this.warn(`Slow operation detected: ${operation}`, {
                        operation,
                        duration: `${duration.toFixed(2)}ms`,
                        ...context
                    });
                }
                
                return duration;
            }
        };
    }

    // Database query logging
    logDatabaseQuery(query, params = [], duration = 0, context = {}) {
        const logContext = {
            query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
            paramCount: params.length,
            duration: `${duration}ms`,
            ...context
        };

        if (duration > 100) {
            this.warn('Slow database query detected', logContext);
        } else {
            this.debug('Database query executed', logContext);
        }
    }

    // API request logging
    logApiRequest(req, res, duration) {
        const context = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user ? req.user.id : 'anonymous'
        };

        if (res.statusCode >= 500) {
            this.error('API request failed with server error', null, context);
        } else if (res.statusCode >= 400) {
            this.warn('API request failed with client error', context);
        } else if (duration > 2000) {
            this.warn('Slow API request detected', context);
        } else {
            this.info('API request completed', context);
        }
    }

    // Session and user activity logging
    logUserActivity(userId, action, context = {}) {
        this.info('User activity logged', {
            userId,
            action,
            timestamp: new Date().toISOString(),
            ...context
        });
    }

    // Accessibility testing specific logging
    logAccessibilityTest(testType, url, result, context = {}) {
        this.info('Accessibility test completed', {
            testType,
            url,
            result: {
                passed: result.passed,
                violations: result.violations ? result.violations.length : 0,
                totalChecks: result.totalChecks || 0
            },
            ...context
        });
    }

    // Error rate monitoring
    logErrorRate(endpoint, errorCount, totalRequests, timeWindow = '1h') {
        const errorRate = (errorCount / totalRequests) * 100;
        
        if (errorRate > 5) { // 5% error rate threshold
            this.error('High error rate detected', null, {
                endpoint,
                errorRate: `${errorRate.toFixed(2)}%`,
                errorCount,
                totalRequests,
                timeWindow
            });
        } else if (errorRate > 1) { // 1% error rate threshold
            this.warn('Elevated error rate detected', {
                endpoint,
                errorRate: `${errorRate.toFixed(2)}%`,
                errorCount,
                totalRequests,
                timeWindow
            });
        }
    }

    // Compliance and audit logging
    logComplianceEvent(event, details, userId) {
        this.info('Compliance event logged', {
            event,
            details,
            userId,
            timestamp: new Date().toISOString(),
            auditTrail: true
        });
    }

    // System health monitoring
    logSystemHealth(componentStatus) {
        const unhealthyComponents = Object.entries(componentStatus)
            .filter(([_, status]) => status !== 'healthy')
            .map(([component, status]) => ({ component, status }));

        if (unhealthyComponents.length > 0) {
            this.warn('System health degraded', {
                unhealthyComponents,
                allComponents: componentStatus
            });
        } else {
            this.debug('System health check passed', { componentStatus });
        }
    }

    // Log rotation helper
    rotateLogFiles() {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        const now = Date.now();

        try {
            const files = fs.readdirSync(this.logDir);
            files.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    this.info('Rotated old log file', { file });
                }
            });
        } catch (error) {
            this.error('Failed to rotate log files', error);
        }
    }
}

// Create singleton instance
const logger = new StructuredLogger();

// Express middleware for request logging
const requestLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original end function
    const originalEnd = res.end;
    
    res.end = function(...args) {
        const duration = Date.now() - startTime;
        logger.logApiRequest(req, res, duration);
        originalEnd.apply(this, args);
    };
    
    next();
};

// Database query wrapper with logging
const loggedQuery = async (pool, query, params = []) => {
    const timer = logger.startTimer('database_query');
    
    try {
        const result = await pool.query(query, params);
        const duration = timer.end({
            rowCount: result.rowCount
        });
        
        logger.logDatabaseQuery(query, params, duration);
        return result;
    } catch (error) {
        timer.end();
        logger.error('Database query failed', error, {
            query: query.substring(0, 200),
            params: params.length
        });
        throw error;
    }
};

module.exports = {
    logger,
    requestLoggingMiddleware,
    loggedQuery
}; 