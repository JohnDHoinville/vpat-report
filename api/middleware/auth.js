const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection using same config as main app
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'accessibility_testing',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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
 * Authentication middleware - verify JWT token
 */
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            code: 'NO_TOKEN'
        });
    }
    
    try {
        // Verify JWT token
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

module.exports = {
    generateToken,
    generateRefreshToken,
    hashPassword,
    verifyPassword,
    storeSession,
    validateSession,
    invalidateSession,
    authenticateToken,
    requireRole,
    requirePermission,
    optionalAuth,
    pool
}; 