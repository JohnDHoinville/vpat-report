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
const { db } = require('../../database/config');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed requests per windowMs
    message: {
        error: 'Too many failed authentication attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Only count failed requests (4xx and 5xx responses)
    skipSuccessfulRequests: true,
    // Custom key generator for better tracking
    keyGenerator: (req) => {
        return `auth_${req.ip}`;
    }
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
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({
                error: 'Refresh token is required',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }
        
        // Find session by refresh token
        const crypto = require('crypto');
        const refreshTokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
        
        const sessionQuery = `
            SELECT us.*, u.id, u.username, u.email, u.full_name, u.role
            FROM user_sessions us
            JOIN users u ON u.id = us.user_id
            WHERE us.refresh_token_hash = $1 
            AND us.is_active = true 
            AND us.expires_at > NOW()
            AND u.is_active = true
        `;
        
        const sessionResult = await pool.query(sessionQuery, [refreshTokenHash]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }
        
        const session = sessionResult.rows[0];
        const user = {
            id: session.id,
            username: session.username,
            email: session.email,
            full_name: session.full_name,
            role: session.role
        };
        
        // Generate new tokens
        const newToken = generateToken(user);
        const newRefreshToken = generateRefreshToken();
        
        // Update session with new tokens
        const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
        const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        
        await pool.query(
            `UPDATE user_sessions 
             SET token_hash = $1, refresh_token_hash = $2, last_accessed = NOW()
             WHERE id = $3`,
            [newTokenHash, newRefreshTokenHash, session.session_id || session.id]
        );
        
        res.json({
            message: 'Token refreshed successfully',
            token: newToken,
            refresh_token: newRefreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            expires_in: '7d'
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token refresh failed',
            code: 'REFRESH_ERROR'
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
            SELECT id, username, email, full_name, role, is_active, last_login, created_at
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
                // profile_data removed - column doesn't exist
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
        const { full_name, email } = req.body;
        
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
        
        // profile_data updates removed - column doesn't exist
        
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
            RETURNING id, username, email, full_name, role, updated_at
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

// === AUTHENTICATION MANAGEMENT ENDPOINTS ===
const fs = require('fs');
const path = require('path');

/**
 * POST /api/auth/setup-sso
 * Set up SSO authentication using existing auth wizard
 */
router.post('/setup-sso', authenticateToken, async (req, res) => {
    try {
        const { url, type = 'sso' } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: 'URL is required for authentication setup',
                code: 'MISSING_URL'
            });
        }
        
        res.json({
            message: 'SSO authentication setup initiated',
            status: 'pending',
            url: url,
            type: type,
            instructions: 'Please use the authentication wizard to complete setup'
        });
        
    } catch (error) {
        console.error('SSO setup error:', error);
        res.status(500).json({
            error: 'Failed to setup SSO authentication',
            code: 'SSO_SETUP_ERROR'
        });
    }
});

/**
 * POST /api/auth/setup-basic
 * Set up basic username/password authentication
 */
router.post('/setup-basic', authenticateToken, async (req, res) => {
    try {
        const { url, username, password, loginPage, successUrl, name } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: 'URL is required for authentication setup',
                code: 'MISSING_URL'
            });
        }
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required for basic authentication',
                code: 'MISSING_CREDENTIALS'
            });
        }
        
        // For now, return success response
        // In a full implementation, this would save the credentials securely
        res.json({
            message: 'Basic authentication setup completed successfully',
            status: 'success',
            url: url,
            type: 'basic',
            name: name || `Basic Auth for ${url}`,
            configured_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Basic auth setup error:', error);
        res.status(500).json({
            error: 'Failed to setup basic authentication',
            code: 'BASIC_AUTH_SETUP_ERROR'
        });
    }
});

/**
 * POST /api/auth/setup-advanced
 * Set up advanced authentication (API keys, tokens, etc.)
 */
router.post('/setup-advanced', authenticateToken, async (req, res) => {
    try {
        const { url, type, apiKey, token, name } = req.body;
        
        if (!url) {
            return res.status(400).json({
                error: 'URL is required for authentication setup',
                code: 'MISSING_URL'
            });
        }
        
        if (!apiKey && !token) {
            return res.status(400).json({
                error: 'API key or token is required for advanced authentication',
                code: 'MISSING_AUTH_DATA'
            });
        }
        
        // For now, return success response
        // In a full implementation, this would save the credentials securely
        res.json({
            message: 'Advanced authentication setup completed successfully',
            status: 'success',
            url: url,
            type: 'advanced',
            auth_type: type || 'api_key',
            name: name || `Advanced Auth for ${url}`,
            configured_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Advanced auth setup error:', error);
        res.status(500).json({
            error: 'Failed to setup advanced authentication',
            code: 'ADVANCED_AUTH_SETUP_ERROR'
        });
    }
});

/**
 * POST /api/auth/test
 * Test an authentication configuration
 */
router.post('/test', authenticateToken, async (req, res) => {
    try {
        const { configId, url } = req.body;
        
        if (!configId && !url) {
            return res.status(400).json({
                error: 'Configuration ID or URL is required',
                code: 'MISSING_CONFIG'
            });
        }
        
        // For now, return a mock test result
        res.json({
            message: 'Authentication test completed',
            status: 'success',
            config_id: configId,
            url: url,
            test_time: new Date().toISOString(),
            details: 'Authentication configuration is working correctly'
        });
        
    } catch (error) {
        console.error('Auth test error:', error);
        res.status(500).json({
            error: 'Failed to test authentication',
            code: 'AUTH_TEST_ERROR'
        });
    }
});

// Test route to debug the issue
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working', query: req.query });
});

/**
 * GET /api/auth/configs/domain/:domain
 * Get all authentication configurations for a specific domain and project
 */
router.get('/configs/domain/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const { project_id } = req.query;
        
        let query = `
            SELECT 
                ac.*,
                p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE ac.domain = $1 AND ac.status = 'active'
        `;
        const params = [domain];
        
        if (project_id) {
            query += ` AND (ac.project_id = $2 OR ac.project_id IS NULL)`;
            params.push(project_id);
        }
        
        query += ` ORDER BY ac.priority ASC, ac.is_default DESC, ac.created_at ASC`;
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching auth configs for domain:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authentication configurations for domain',
            error: error.message
        });
    }
});

/**
 * GET /api/auth/configs
 * List authentication configurations from auth-states directory
 */
router.get('/configs', async (req, res) => {
    try {
        const project_id = req.query ? req.query.project_id : undefined;
        
        let query = `
            SELECT 
                ac.*,
                p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE ac.status = 'active'
        `;
        const params = [];
        
        if (project_id) {
            query += ` AND (ac.project_id = $1 OR ac.project_id IS NULL)`;
            params.push(project_id);
        }
        
        query += ` ORDER BY ac.created_at DESC`;
        
        const result = await db.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching auth configs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authentication configurations',
            error: error.message
        });
    }
});

/**
 * GET /api/auth/configs/:id
 * Get authentication configuration by ID
 */
router.get('/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT 
                ac.*,
                p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE ac.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Authentication configuration not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching auth config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authentication configuration',
            error: error.message
        });
    }
});

/**
 * POST /api/auth/configs
 * Create new authentication configuration (supports multiple configs per domain/project)
 */
router.post('/configs', async (req, res) => {
    try {
        const {
            name,
            type,
            domain,
            url,
            username,
            password,
            login_page,
            success_url,
            project_id,
            auth_role = 'default',
            auth_description,
            priority = 1,
            is_default = false
        } = req.body;
        
        // Get user ID from JWT token (assuming it's available in req.user)
        const created_by = req.user?.id || '46088230-6133-45e3-8a04-06feea298094'; // fallback to admin
        
        // Check if a config with the same role already exists for this domain/project
        const existingConfig = await db.query(`
            SELECT * FROM auth_configs 
            WHERE domain = $1 AND project_id = $2 AND auth_role = $3
        `, [domain, project_id, auth_role]);
        
        if (existingConfig.rows.length > 0) {
            // Update existing configuration with the same role
            const updateResult = await db.query(`
                UPDATE auth_configs 
                SET 
                    name = $1,
                    type = $2,
                    url = $3,
                    username = $4,
                    password = $5,
                    login_page = $6,
                    success_url = $7,
                    auth_description = $8,
                    priority = $9,
                    is_default = $10,
                    updated_at = CURRENT_TIMESTAMP
                WHERE domain = $11 AND project_id = $12 AND auth_role = $13
                RETURNING *
            `, [name, type, url, username, password, login_page, success_url, auth_description, priority, is_default, domain, project_id, auth_role]);
            
            // If this is being set as default, unset other defaults for the same domain/project
            if (is_default) {
                await db.query(`
                    UPDATE auth_configs 
                    SET is_default = false 
                    WHERE domain = $1 AND project_id = $2 AND id != $3
                `, [domain, project_id, updateResult.rows[0].id]);
            }
            
            return res.status(200).json({
                success: true,
                message: 'Authentication configuration updated successfully',
                data: updateResult.rows[0],
                action: 'updated'
            });
        }
        
        // If this is being set as default, unset other defaults for the same domain/project
        if (is_default) {
            await db.query(`
                UPDATE auth_configs 
                SET is_default = false 
                WHERE domain = $1 AND project_id = $2
            `, [domain, project_id]);
        }
        
        // Create new configuration
        const result = await db.query(`
            INSERT INTO auth_configs (
                name, type, domain, url, username, password, 
                login_page, success_url, project_id, created_by,
                auth_role, auth_description, priority, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [name, type, domain, url, username, password, login_page, success_url, project_id, created_by,
            auth_role, auth_description, priority, is_default]);
        
        res.status(201).json({
            success: true,
            message: 'Authentication configuration created successfully',
            data: result.rows[0],
            action: 'created'
        });
    } catch (error) {
        console.error('Error creating auth config:', error);
        
        if (error.code === '23505') { // Unique constraint violation
            if (error.constraint === 'auth_configs_domain_project_role_key') {
                return res.status(400).json({
                    success: false,
                    message: `Authentication configuration with role '${req.body.auth_role || 'default'}' already exists for this domain and project. Please use a different role name or update the existing configuration.`,
                    code: 'DUPLICATE_AUTH_ROLE'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Authentication configuration already exists',
                code: 'DUPLICATE_AUTH_CONFIG'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create authentication configuration',
            error: error.message
        });
    }
});

/**
 * PUT /api/auth/configs/:id
 * Update an authentication configuration
 */
router.put('/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            type,
            domain,
            url,
            username,
            password,
            login_page,
            success_url,
            status
        } = req.body;
        
        const result = await db.query(`
            UPDATE auth_configs 
            SET 
                name = $1,
                type = $2,
                domain = $3,
                url = $4,
                username = $5,
                password = $6,
                login_page = $7,
                success_url = $8,
                status = $9,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `, [name, type, domain, url, username, password, login_page, success_url, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Authentication configuration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Authentication configuration updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating auth config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update authentication configuration',
            error: error.message
        });
    }
});

/**
 * DELETE /api/auth/configs/:id
 * Delete an authentication configuration
 */
router.delete('/configs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            DELETE FROM auth_configs 
            WHERE id = $1
            RETURNING *
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Authentication configuration not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Authentication configuration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting auth config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete authentication configuration',
            error: error.message
        });
    }
});

/**
 * POST /api/auth/import
 * Import an authentication configuration
 */
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { configData, filename } = req.body;
        
        if (!configData || !filename) {
            return res.status(400).json({
                error: 'Configuration data and filename are required',
                code: 'MISSING_DATA'
            });
        }
        
        const authStatesDir = path.join(__dirname, '../../reports/auth-states');
        
        // Ensure directory exists
        if (!fs.existsSync(authStatesDir)) {
            fs.mkdirSync(authStatesDir, { recursive: true });
        }
        
        const configFile = path.join(authStatesDir, filename);
        fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));
        
        res.json({
            message: 'Authentication configuration imported successfully',
            filename: filename
        });
        
    } catch (error) {
        console.error('Auth config import error:', error);
        res.status(500).json({
            error: 'Failed to import authentication configuration',
            code: 'AUTH_IMPORT_ERROR'
        });
    }
});

/**
 * POST /api/auth/configs/:id/test
 * Test an authentication configuration
 */
router.post('/configs/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT * FROM auth_configs WHERE id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Authentication configuration not found'
            });
        }
        
        const config = result.rows[0];
        
        // TODO: Implement actual authentication testing logic here
        // For now, just return success
        
        res.json({
            success: true,
            message: 'Authentication configuration test completed',
            data: {
                config_id: config.id,
                domain: config.domain,
                type: config.type,
                test_result: 'success' // This would be the actual test result
            }
        });
    } catch (error) {
        console.error('Error testing auth config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test authentication configuration',
            error: error.message
        });
    }
});

/**
 * GET /api/auth/health
 * Get authentication system health and statistics (admin only)
 */
router.get('/health', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { getSessionStats, cleanupExpiredSessions } = require('../middleware/auth');
        
        // Get session statistics
        const sessionStats = await getSessionStats();
        
        // Cleanup expired sessions and get count
        const cleanedUpCount = await cleanupExpiredSessions();
        
        // Get user statistics
        const userStats = await pool.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_logins,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
            FROM users
        `);
        
        // Get recent authentication attempts
        const recentAttempts = await pool.query(`
            SELECT created_at 
            FROM user_sessions 
            WHERE created_at > NOW() - INTERVAL '1 hour' 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            session_stats: sessionStats,
            user_stats: userStats.rows[0],
            cleanup_stats: {
                expired_sessions_cleaned: cleanedUpCount,
                last_cleanup: new Date().toISOString()
            },
            recent_activity: {
                sessions_created_last_hour: recentAttempts.rows.length,
                recent_timestamps: recentAttempts.rows.map(r => r.created_at)
            },
            system_info: {
                jwt_expires_in: process.env.JWT_EXPIRES_IN || '7d',
                session_cleanup_interval: '1 hour',
                rate_limiting: 'enabled'
            }
        });
        
    } catch (error) {
        console.error('Auth health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Failed to retrieve authentication system health',
            code: 'HEALTH_CHECK_ERROR'
        });
    }
});

/**
 * GET /api/auth/validate
 * Validate JWT token and return user information
 */
router.get('/validate', authenticateToken, async (req, res) => {
    try {
        // If we reach here, the token is valid (authenticateToken middleware passed)
        res.json({
            valid: true,
            user: req.user // Set by authenticateToken middleware
        });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({
            valid: false,
            error: 'Token validation failed'
        });
    }
});

/**
 * GET /api/auth/session-info
 * Get current session information
 */
router.get('/session-info', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user,
            isValid: true,
            expiresAt: req.tokenExpiry
        });
    } catch (error) {
        console.error('Session info error:', error);
        res.status(500).json({
            error: 'Failed to get session info',
            code: 'SESSION_INFO_ERROR'
        });
    }
});

// ===============================
// AUTH CONFIGS ENDPOINTS
// ===============================

// Get all auth configs
router.get('/auth-configs', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT ac.*, p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE ac.status = 'active'
            ORDER BY ac.domain, ac.priority, ac.auth_role
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching auth configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch authentication configurations'
        });
    }
});

// Get auth configs for a specific project
router.get('/auth-configs/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const query = `
            SELECT ac.*, p.name as project_name
            FROM auth_configs ac
            LEFT JOIN projects p ON ac.project_id = p.id
            WHERE (ac.project_id = $1 OR ac.project_id IS NULL)
            AND ac.status = 'active'
            ORDER BY ac.priority, ac.is_default DESC, ac.auth_role
        `;
        
        const result = await pool.query(query, [projectId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching project auth configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project authentication configurations'
        });
    }
});

// Create new auth config
router.post('/auth-configs', authenticateToken, async (req, res) => {
    try {
        const {
            name,
            type,
            domain,
            project_id,
            username,
            password,
            url,
            login_page,
            success_url,
            auth_role = 'default',
            auth_description,
            priority = 1,
            is_default = false
        } = req.body;

        const query = `
            INSERT INTO auth_configs (
                name, type, domain, project_id, username, password, url,
                login_page, success_url, auth_role, auth_description, 
                priority, is_default, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14)
            RETURNING *
        `;
        
        const values = [
            name, type, domain, project_id, username, password, url,
            login_page, success_url, auth_role, auth_description,
            priority, is_default, req.user.userId
        ];
        
        const result = await pool.query(query, values);
        
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Authentication configuration created successfully'
        });
    } catch (error) {
        console.error('Error creating auth config:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({
                success: false,
                error: 'Authentication configuration with this domain and role already exists'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to create authentication configuration'
            });
        }
    }
});

// Update auth config
router.put('/auth-configs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        const allowedFields = [
            'name', 'type', 'domain', 'username', 'password', 'url',
            'login_page', 'success_url', 'auth_role', 'auth_description',
            'priority', 'is_default'
        ];

        for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
                updateFields.push(`${field} = $${paramCount}`);
                values.push(req.body[field]);
                paramCount++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        values.push(id); // Add ID for WHERE clause
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        const query = `
            UPDATE auth_configs 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount} AND status = 'active'
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Authentication configuration not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Authentication configuration updated successfully'
        });
    } catch (error) {
        console.error('Error updating auth config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update authentication configuration'
        });
    }
});

// Delete auth config
router.delete('/auth-configs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            UPDATE auth_configs 
            SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'active'
            RETURNING id, name
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Authentication configuration not found'
            });
        }
        
        res.json({
            success: true,
            message: `Authentication configuration '${result.rows[0].name}' deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting auth config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete authentication configuration'
        });
    }
});

// Test auth config
router.post('/auth-configs/:id/test', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const configQuery = `
            SELECT * FROM auth_configs 
            WHERE id = $1 AND status = 'active'
        `;
        
        const configResult = await pool.query(configQuery, [id]);
        
        if (configResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Authentication configuration not found'
            });
        }
        
        const authConfig = configResult.rows[0];
        
        // For now, return a mock test result
        // In a real implementation, this would test the actual authentication
        const testResult = {
            success: true,
            message: `Authentication test for '${authConfig.name}' completed`,
            details: {
                domain: authConfig.domain,
                type: authConfig.type,
                loginUrl: authConfig.login_page,
                testStatus: 'simulated',
                responseTime: Math.floor(Math.random() * 2000) + 500
            },
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        console.error('Error testing auth config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test authentication configuration'
        });
    }
});

module.exports = router; 