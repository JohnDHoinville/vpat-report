const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const {
    generateToken,
    generateRefreshToken,
    hashPassword,
    verifyPassword,
    storeSession,
    invalidateSession,
    authenticateToken,
    requireRole,
    pool
} = require('../middleware/auth');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many authentication attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: {
        error: 'Too many registration attempts',
        code: 'REGISTRATION_RATE_LIMIT',
        retry_after: '1 hour'
    }
});

/**
 * POST /api/auth/login
 * User login with username/email and password
 */
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password, remember_me = false } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        // Find user by username or email
        const userQuery = `
            SELECT id, username, email, password_hash, full_name, role, is_active, last_login
            FROM users 
            WHERE (username = $1 OR email = $1) AND is_active = true
        `;
        
        const userResult = await pool.query(userQuery, [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        const user = userResult.rows[0];
        
        // Verify password
        const isValidPassword = await verifyPassword(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Generate tokens
        const token = generateToken(user);
        const refreshToken = generateRefreshToken();
        
        // Store session
        const deviceInfo = {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            platform: req.get('Sec-CH-UA-Platform') || 'unknown'
        };
        
        const sessionId = await storeSession(user.id, token, refreshToken, deviceInfo);
        
        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );
        
        // Return success with user info and token
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                last_login: user.last_login
            },
            token,
            refresh_token: refreshToken,
            session_id: sessionId,
            expires_in: '7d'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
});

/**
 * POST /api/auth/logout
 * User logout - invalidate session
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            await invalidateSession(token);
        }
        
        res.json({
            message: 'Logout successful'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            code: 'LOGOUT_ERROR'
        });
    }
});

/**
 * POST /api/auth/register
 * User registration (admin only)
 */
router.post('/register', registerLimiter, authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role = 'user' } = req.body;
        
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Username, email, and password are required',
                code: 'MISSING_FIELDS'
            });
        }
        
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }
        
        if (!['admin', 'user', 'viewer'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role specified',
                code: 'INVALID_ROLE'
            });
        }
        
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'User already exists with this username or email',
                code: 'USER_EXISTS'
            });
        }
        
        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create user
        const userQuery = `
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, full_name, role, created_at
        `;
        
        const result = await pool.query(userQuery, [
            username, email, passwordHash, full_name, role
        ]);
        
        const newUser = result.rows[0];
        
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
                created_at: newUser.created_at
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userQuery = `
            SELECT id, username, email, full_name, role, is_active, last_login, created_at, profile_data
            FROM users 
            WHERE id = $1
        `;
        
        const result = await pool.query(userQuery, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at,
                profile_data: user.profile_data
            }
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile',
            code: 'PROFILE_ERROR'
        });
    }
});

/**
 * PUT /api/auth/profile
 * Update current user profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, email, profile_data } = req.body;
        
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        
        if (email !== undefined) {
            // Check if email is already taken by another user
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, req.user.id]
            );
            
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({
                    error: 'Email already in use',
                    code: 'EMAIL_EXISTS'
                });
            }
            
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        
        if (profile_data !== undefined) {
            updates.push(`profile_data = $${paramCount++}`);
            values.push(JSON.stringify(profile_data));
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                code: 'NO_UPDATES'
            });
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(req.user.id);
        
        const query = `
            UPDATE users SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, email, full_name, role, updated_at, profile_data
        `;
        
        const result = await pool.query(query, values);
        
        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Failed to update profile',
            code: 'UPDATE_ERROR'
        });
    }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({
                error: 'Current and new passwords are required',
                code: 'MISSING_PASSWORDS'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long',
                code: 'WEAK_PASSWORD'
            });
        }
        
        // Get current password hash
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Verify current password
        const isValidPassword = await verifyPassword(current_password, userResult.rows[0].password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        
        // Hash new password
        const newPasswordHash = await hashPassword(new_password);
        
        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        
        res.json({
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Failed to change password',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
});

/**
 * GET /api/auth/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT id, device_info, ip_address, user_agent, last_accessed, expires_at, created_at
            FROM user_sessions 
            WHERE user_id = $1 AND is_active = true
            ORDER BY last_accessed DESC
        `;
        
        const result = await pool.query(query, [req.user.id]);
        
        res.json({
            sessions: result.rows.map(session => ({
                id: session.id,
                device_info: session.device_info,
                ip_address: session.ip_address,
                user_agent: session.user_agent,
                last_accessed: session.last_accessed,
                expires_at: session.expires_at,
                created_at: session.created_at,
                is_current: session.id === req.user.sessionId
            }))
        });
        
    } catch (error) {
        console.error('Sessions fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch sessions',
            code: 'SESSIONS_ERROR'
        });
    }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const result = await pool.query(
            'UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id',
            [sessionId, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Session not found',
                code: 'SESSION_NOT_FOUND'
            });
        }
        
        res.json({
            message: 'Session revoked successfully'
        });
        
    } catch (error) {
        console.error('Session revoke error:', error);
        res.status(500).json({
            error: 'Failed to revoke session',
            code: 'SESSION_REVOKE_ERROR'
        });
    }
});

module.exports = router; 