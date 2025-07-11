const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Error Handling Middleware
 * Provides consistent error logging, formatting, and user-friendly responses
 */

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Error log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

/**
 * Log error to file with structured format
 */
function logError(error, req, additionalContext = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'ERROR',
        message: error.message,
        stack: error.stack,
        request: {
            method: req?.method,
            url: req?.url,
            headers: req?.headers,
            body: req?.body,
            params: req?.params,
            query: req?.query,
            user: req?.user ? {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            } : null,
            ip: req?.ip,
            userAgent: req?.get('User-Agent')
        },
        error: {
            name: error.name,
            code: error.code,
            statusCode: error.statusCode || error.status || 500,
            isOperational: error.isOperational || false
        },
        context: additionalContext
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
        fs.appendFileSync(errorLogPath, logLine);
    } catch (writeError) {
        console.error('Failed to write to error log:', writeError);
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('🚨 ERROR LOGGED:', {
            timestamp,
            error: error.message,
            path: req?.url,
            user: req?.user?.username || 'anonymous'
        });
    }
}

/**
 * Log access/request information
 */
function logAccess(req, res, duration) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'INFO',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? {
            id: req.user.id,
            username: req.user.username
        } : null,
        contentLength: res.get('Content-Length') || 0
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
        fs.appendFileSync(accessLogPath, logLine);
    } catch (writeError) {
        console.error('Failed to write to access log:', writeError);
    }
}

/**
 * Custom error classes for different types of errors
 */
class AppError extends Error {
    constructor(message, statusCode, code = null, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;
        this.code = code;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, fields = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.fields = fields;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}

class ExternalServiceError extends AppError {
    constructor(service, message = 'External service unavailable') {
        super(`${service}: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
    }
}

/**
 * Determine user-friendly error message
 */
function getUserFriendlyMessage(error) {
    const friendlyMessages = {
        'VALIDATION_ERROR': 'The information provided is invalid. Please check your input and try again.',
        'AUTHENTICATION_ERROR': 'Please log in to access this resource.',
        'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
        'NOT_FOUND_ERROR': 'The requested resource could not be found.',
        'CONFLICT_ERROR': 'This action conflicts with existing data. Please refresh and try again.',
        'RATE_LIMIT_ERROR': 'Too many requests. Please wait a moment before trying again.',
        'DATABASE_ERROR': 'A database error occurred. Please try again later.',
        'EXTERNAL_SERVICE_ERROR': 'An external service is temporarily unavailable. Please try again later.'
    };

    if (error.code && friendlyMessages[error.code]) {
        return friendlyMessages[error.code];
    }

    // Default messages based on status code
    if (error.statusCode >= 500) {
        return 'An internal server error occurred. Please try again later.';
    } else if (error.statusCode >= 400) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}

/**
 * Main error handling middleware
 */
function errorHandler(error, req, res, next) {
    // Log the error
    logError(error, req);

    // Handle specific error types
    let statusCode = error.statusCode || error.status || 500;
    let code = error.code || 'INTERNAL_ERROR';
    let message = error.message;

    // Handle specific error types that might not extend AppError
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = error.message;
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Invalid authentication token';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Authentication token has expired';
    } else if (error.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'This entry already exists';
    } else if (error.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        code = 'INVALID_REFERENCE';
        message = 'Referenced resource does not exist';
    } else if (error.code === 'ECONNREFUSED') {
        statusCode = 503;
        code = 'DATABASE_CONNECTION_ERROR';
        message = 'Database connection failed';
    }

    // Prepare error response
    const errorResponse = {
        error: true,
        message: getUserFriendlyMessage({ statusCode, code, message }),
        code,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    };

    // Add additional details in development
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.details = {
            originalMessage: error.message,
            stack: error.stack,
            ...(error.fields && { fields: error.fields }),
            ...(error.originalError && { originalError: error.originalError.message })
        };
    }

    // Add request ID if available
    if (req.requestId) {
        errorResponse.requestId = req.requestId;
    }

    // Set security headers for error responses
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });

    res.status(statusCode).json(errorResponse);
}

/**
 * Handle 404 errors (routes not found)
 */
function notFoundHandler(req, res, next) {
    const error = new NotFoundError('Endpoint');
    error.statusCode = 404;
    error.message = `Cannot ${req.method} ${req.url}`;
    
    logError(error, req, { type: '404_NOT_FOUND' });
    
    res.status(404).json({
        error: true,
        message: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
        available_endpoints: process.env.NODE_ENV !== 'production' ? '/api' : undefined
    });
}

/**
 * Access logging middleware
 */
function accessLogger(req, res, next) {
    const startTime = Date.now();
    
    // Generate request ID
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logAccess(req, res, duration);
    });
    
    next();
}

/**
 * Async error wrapper - catches async errors and passes to error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Get error statistics for monitoring
 */
async function getErrorStats() {
    try {
        const errorLogContent = fs.readFileSync(errorLogPath, 'utf8');
        const lines = errorLogContent.trim().split('\n').filter(line => line);
        const errors = lines.map(line => JSON.parse(line));
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const recentErrors = errors.filter(error => new Date(error.timestamp) > oneDayAgo);
        const lastHourErrors = errors.filter(error => new Date(error.timestamp) > oneHourAgo);
        
        const errorsByCode = {};
        const errorsByPath = {};
        
        recentErrors.forEach(error => {
            const code = error.error.code || 'UNKNOWN';
            const path = error.request.url || 'unknown';
            
            errorsByCode[code] = (errorsByCode[code] || 0) + 1;
            errorsByPath[path] = (errorsByPath[path] || 0) + 1;
        });
        
        return {
            total_errors_24h: recentErrors.length,
            total_errors_1h: lastHourErrors.length,
            errors_by_code: errorsByCode,
            errors_by_path: errorsByPath,
            most_common_error: Object.keys(errorsByCode).reduce((a, b) => 
                errorsByCode[a] > errorsByCode[b] ? a : b, 'NONE'),
            error_rate_per_hour: lastHourErrors.length
        };
    } catch (error) {
        console.error('Failed to calculate error stats:', error);
        return {
            total_errors_24h: 0,
            total_errors_1h: 0,
            errors_by_code: {},
            errors_by_path: {},
            most_common_error: 'NONE',
            error_rate_per_hour: 0
        };
    }
}

module.exports = {
    errorHandler,
    notFoundHandler,
    accessLogger,
    asyncHandler,
    logError,
    logAccess,
    getErrorStats,
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError
}; 