const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection using same config as main app
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || 'johnhoinville',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'accessibility-testing-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Generate refresh token
 */
function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Store session in database
 */
async function storeSession(userId, token, refreshToken, deviceInfo) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for JWT
    
    const query = `
        INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `;
    
    const result = await pool.query(query, [
        userId,
        tokenHash,
        refreshTokenHash,
        deviceInfo || {},
        deviceInfo?.ip || null,
        deviceInfo?.userAgent || null,
        expiresAt
    ]);
    
    return result.rows[0].id;
}

/**
 * Validate session token
 */
async function validateSession(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const query = `
        SELECT us.*, u.id as user_id, u.username, u.email, u.role, u.is_active
        FROM user_sessions us
        JOIN users u ON u.id = us.user_id
        WHERE us.token_hash = $1 
        AND us.is_active = true 
        AND us.expires_at > NOW()
        AND u.is_active = true
    `;
    
    const result = await pool.query(query, [tokenHash]);
    
    if (result.rows.length === 0) {
        return null;
    }
    
    // Update last accessed time
    await pool.query(
        'UPDATE user_sessions SET last_accessed = NOW() WHERE id = $1',
        [result.rows[0].id]
    );
    
    return result.rows[0];
}

/**
 * Invalidate session
 */
async function invalidateSession(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await pool.query(
        'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
        [tokenHash]
    );
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
    try {
        const result = await pool.query(
            'UPDATE user_sessions SET is_active = false WHERE expires_at < NOW() AND is_active = true'
        );
        console.log(`Cleaned up ${result.rowCount} expired sessions`);
        return result.rowCount;
    } catch (error) {
        console.error('Session cleanup error:', error);
        return 0;
    }
}

/**
 * Get session statistics for monitoring
 */
async function getSessionStats() {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
                COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_sessions,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_sessions,
                COUNT(*) as total_sessions
            FROM user_sessions
        `);
        
        return stats.rows[0];
    } catch (error) {
        console.error('Session stats error:', error);
        return null;
    }
}

/**
 * Authentication middleware - verify JWT token
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    console.log('🔍 DEBUG: JWT_SECRET =', JWT_SECRET);
    console.log('🔍 DEBUG: Token received =', token ? token.substring(0, 50) + '...' : 'null');
    
    // No development bypass - proper authentication required
    if (token === 'test') {
        return res.status(401).json({ 
            error: 'Test token not allowed - proper authentication required',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        // Verify JWT token
        console.log('🔍 DEBUG: Attempting to verify token with secret:', JWT_SECRET);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Validate session in database
        const session = await validateSession(token);
        
        if (!session) {
            return res.status(401).json({ 
                error: 'Invalid or expired session',
                code: 'INVALID_SESSION'
            });
        }
        
        // Add user info to request
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            sessionId: session.id
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(403).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
}

/**
 * Admin authorization middleware - requires user to be authenticated and have admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }
    
    next();
}

/**
 * Enhanced authentication middleware with rate limiting per user
 */
const userRateLimitMap = new Map();

async function authenticateWithRateLimit(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // No development bypass - proper authentication required
    if (token === 'test') {
        return res.status(401).json({ 
            error: 'Test token not allowed - proper authentication required',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        // Verify JWT token first (fast check)
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Rate limiting per user
        const userId = decoded.userId;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute
        const maxRequests = 100; // 100 requests per minute per user
        
        if (!userRateLimitMap.has(userId)) {
            userRateLimitMap.set(userId, []);
        }
        
        const userRequests = userRateLimitMap.get(userId);
        
        // Clean old requests
        while (userRequests.length > 0 && userRequests[0] < now - windowMs) {
            userRequests.shift();
        }
        
        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                code: 'USER_RATE_LIMIT',
                retry_after: Math.ceil((userRequests[0] + windowMs - now) / 1000)
            });
        }
        
        userRequests.push(now);
        
        // Validate session in database
        const session = await validateSession(token);
        
        if (!session) {
            return res.status(401).json({ 
                error: 'Invalid or expired session',
                code: 'INVALID_SESSION'
            });
        }
        
        // Add user info to request
        req.user = {
            id: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            sessionId: session.id
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        return res.status(403).json({ 
            error: 'Invalid token',
            code: 'INVALID_TOKEN'
        });
    }
}

/**
 * Authorization middleware - check user permissions
 */
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_AUTH'
            });
        }
        
        if (!Array.isArray(roles)) {
            roles = [roles];
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: req.user.role
            });
        }
        
        next();
    };
}

/**
 * Permission-based authorization middleware
 */
async function requirePermission(permissionType, resourceType = 'global') {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_AUTH'
            });
        }
        
        try {
            // Admin role has all permissions
            if (req.user.role === 'admin') {
                return next();
            }
            
            // Check specific permission
            const query = `
                SELECT 1 FROM user_permissions 
                WHERE user_id = $1 
                AND permission_type = $2 
                AND resource_type = $3
                AND (expires_at IS NULL OR expires_at > NOW())
            `;
            
            const result = await pool.query(query, [
                req.user.id,
                permissionType,
                resourceType
            ]);
            
            if (result.rows.length === 0) {
                return res.status(403).json({ 
                    error: 'Permission denied',
                    code: 'PERMISSION_DENIED',
                    required_permission: permissionType,
                    resource_type: resourceType
                });
            }
            
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ 
                error: 'Permission validation failed',
                code: 'PERMISSION_ERROR'
            });
        }
    };
}

/**
 * Optional authentication - sets user if token present but doesn't require it
 */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const session = await validateSession(token);
            
            if (session) {
                req.user = {
                    id: decoded.userId,
                    username: decoded.username,
                    email: decoded.email,
                    role: decoded.role,
                    sessionId: session.id
                };
            }
        } catch (error) {
            // Ignore errors in optional auth
            console.log('Optional auth failed:', error.message);
        }
    }
    
    next();
}

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

/**
 * Middleware to authorize project access
 * Ensures user has access to the specified project
 */
async function authorizeProjectAccess(req, res, next) {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;
        
        // For now, allow all authenticated users access to any project
        // In the future, this could check project membership/permissions
        if (!projectId || !userId) {
            return res.status(400).json({ 
                error: 'Missing project ID or user authentication' 
            });
        }
        
        // Add project access check here if needed
        // const hasAccess = await checkProjectAccess(userId, projectId);
        // if (!hasAccess) {
        //     return res.status(403).json({ error: 'Access denied to this project' });
        // }
        
        next();
    } catch (error) {
        console.error('Project authorization error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
}

module.exports = {
    generateToken,
    generateRefreshToken,
    hashPassword,
    verifyPassword,
    storeSession,
    validateSession,
    invalidateSession,
    cleanupExpiredSessions,
    getSessionStats,
    authenticateToken,
    authenticateWithRateLimit,
    requireRole,
    requirePermission,
    requireAdmin,
    optionalAuth,
    authorizeProjectAccess,
    pool
}; 