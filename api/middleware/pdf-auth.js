const { authenticateToken, requirePermission } = require('./auth');
const { logger } = require('../utils/logger');

/**
 * PDF Upload Authentication Middleware
 * Enhanced authentication for PDF upload operations with additional security
 */

/**
 * Rate limiting store for PDF uploads per user
 */
const uploadRateLimits = new Map();
const UPLOAD_RATE_LIMIT = {
    maxUploads: 10,        // Max 10 uploads per window
    windowMs: 60 * 60 * 1000, // 1 hour window
    cleanupInterval: 15 * 60 * 1000 // Cleanup every 15 minutes
};

// Cleanup old rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [userId, data] of uploadRateLimits.entries()) {
        if (now - data.firstUpload > UPLOAD_RATE_LIMIT.windowMs) {
            uploadRateLimits.delete(userId);
        }
    }
}, UPLOAD_RATE_LIMIT.cleanupInterval);

/**
 * Check upload rate limits for user
 */
function checkUploadRateLimit(userId) {
    const now = Date.now();
    const userLimits = uploadRateLimits.get(userId);
    
    if (!userLimits) {
        // First upload in window
        uploadRateLimits.set(userId, {
            count: 1,
            firstUpload: now,
            lastUpload: now
        });
        return { allowed: true, remaining: UPLOAD_RATE_LIMIT.maxUploads - 1 };
    }
    
    // Check if window has expired
    if (now - userLimits.firstUpload > UPLOAD_RATE_LIMIT.windowMs) {
        // Reset window
        uploadRateLimits.set(userId, {
            count: 1,
            firstUpload: now,
            lastUpload: now
        });
        return { allowed: true, remaining: UPLOAD_RATE_LIMIT.maxUploads - 1 };
    }
    
    // Check if limit exceeded
    if (userLimits.count >= UPLOAD_RATE_LIMIT.maxUploads) {
        const resetTime = userLimits.firstUpload + UPLOAD_RATE_LIMIT.windowMs;
        return { 
            allowed: false, 
            remaining: 0, 
            resetTime: new Date(resetTime).toISOString() 
        };
    }
    
    // Increment count
    userLimits.count++;
    userLimits.lastUpload = now;
    
    return { 
        allowed: true, 
        remaining: UPLOAD_RATE_LIMIT.maxUploads - userLimits.count 
    };
}

/**
 * Enhanced authentication middleware for PDF uploads
 */
const authenticatePDFUpload = [
    // First, standard token authentication
    authenticateToken,
    
    // Then, check upload-specific permissions and rate limits
    async (req, res, next) => {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            
            logger.info(`🔐 PDF upload authentication for user: ${req.user.username} (${userRole})`, {
                userId,
                userAgent: req.headers['user-agent'],
                ip: req.ip || req.connection.remoteAddress
            });
            
            // Check if user has upload permissions
            const allowedRoles = ['admin', 'tester', 'manager'];
            if (!allowedRoles.includes(userRole)) {
                logger.warn(`🚫 PDF upload denied - insufficient role: ${userRole}`, { userId });
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions for PDF upload',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredRoles: allowedRoles
                });
            }
            
            // Check upload rate limits
            const rateLimit = checkUploadRateLimit(userId);
            if (!rateLimit.allowed) {
                logger.warn(`🚫 PDF upload rate limit exceeded for user: ${userId}`, {
                    attempts: UPLOAD_RATE_LIMIT.maxUploads,
                    resetTime: rateLimit.resetTime
                });
                
                return res.status(429).json({
                    success: false,
                    error: 'Upload rate limit exceeded',
                    code: 'RATE_LIMIT_EXCEEDED',
                    details: {
                        maxUploads: UPLOAD_RATE_LIMIT.maxUploads,
                        windowMs: UPLOAD_RATE_LIMIT.windowMs,
                        resetTime: rateLimit.resetTime
                    }
                });
            }
            
            // Add rate limit info to request for response headers
            req.uploadRateLimit = {
                remaining: rateLimit.remaining,
                limit: UPLOAD_RATE_LIMIT.maxUploads,
                windowMs: UPLOAD_RATE_LIMIT.windowMs
            };
            
            // Add user activity tracking
            req.userActivity = {
                action: 'pdf_upload_initiated',
                timestamp: new Date().toISOString(),
                userId: userId,
                sessionId: req.user.sessionId
            };
            
            logger.info(`✅ PDF upload authentication successful`, {
                userId,
                remaining: rateLimit.remaining,
                userRole
            });
            
            next();
            
        } catch (error) {
            logger.error('PDF upload authentication error:', error);
            return res.status(500).json({
                success: false,
                error: 'Authentication processing failed',
                code: 'AUTH_PROCESSING_ERROR'
            });
        }
    }
];

/**
 * Middleware to add upload rate limit headers to response
 */
const addUploadRateLimitHeaders = (req, res, next) => {
    if (req.uploadRateLimit) {
        res.set({
            'X-Upload-RateLimit-Limit': req.uploadRateLimit.limit,
            'X-Upload-RateLimit-Remaining': req.uploadRateLimit.remaining,
            'X-Upload-RateLimit-Window': req.uploadRateLimit.windowMs
        });
    }
    next();
};

/**
 * Middleware to validate requirement context for uploads
 */
const validateUploadContext = async (req, res, next) => {
    try {
        const requirementId = req.query.requirementId || req.body.requirementId;
        
        if (requirementId) {
            // Basic UUID validation
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(requirementId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid requirement ID format',
                    code: 'INVALID_REQUIREMENT_ID'
                });
            }
            
            // Add to request context
            req.uploadContext = {
                requirementId,
                validated: true
            };
            
            logger.info(`📋 Upload context validated for requirement: ${requirementId}`, {
                userId: req.user.id
            });
        } else {
            req.uploadContext = {
                requirementId: null,
                validated: false
            };
            
            logger.info(`📋 Upload without specific requirement context`, {
                userId: req.user.id
            });
        }
        
        next();
        
    } catch (error) {
        logger.error('Upload context validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Context validation failed',
            code: 'CONTEXT_VALIDATION_ERROR'
        });
    }
};

/**
 * Audit logging middleware for PDF uploads
 */
const auditPDFUpload = (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to capture response
    res.send = function(data) {
        // Log the upload attempt
        const success = res.statusCode < 400;
        
        logger.info(`📝 PDF upload audit log`, {
            userId: req.user.id,
            username: req.user.username,
            action: 'pdf_upload_attempt',
            success: success,
            statusCode: res.statusCode,
            filename: req.file?.originalname,
            fileSize: req.file?.size,
            requirementId: req.uploadContext?.requirementId,
            timestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });
        
        // Call original send
        originalSend.call(this, data);
    };
    
    next();
};

/**
 * Get upload rate limit statistics
 */
function getUploadRateLimitStats() {
    const now = Date.now();
    const activeUsers = [];
    
    for (const [userId, data] of uploadRateLimits.entries()) {
        if (now - data.firstUpload <= UPLOAD_RATE_LIMIT.windowMs) {
            activeUsers.push({
                userId,
                uploads: data.count,
                firstUpload: new Date(data.firstUpload).toISOString(),
                lastUpload: new Date(data.lastUpload).toISOString(),
                remaining: UPLOAD_RATE_LIMIT.maxUploads - data.count
            });
        }
    }
    
    return {
        configuration: UPLOAD_RATE_LIMIT,
        activeUsers: activeUsers.length,
        userDetails: activeUsers
    };
}

module.exports = {
    authenticatePDFUpload,
    addUploadRateLimitHeaders,
    validateUploadContext,
    auditPDFUpload,
    getUploadRateLimitStats,
    checkUploadRateLimit
};
