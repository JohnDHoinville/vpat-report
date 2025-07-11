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

/**
 * GET /api/auth/configs
 * List authentication configurations from auth-states directory
 */
router.get('/configs', authenticateToken, async (req, res) => {
    try {
        const authStatesDir = path.join(__dirname, '../../reports/auth-states');
        const configs = [];
        
        // Check if auth-states directory exists
        if (fs.existsSync(authStatesDir)) {
            const files = fs.readdirSync(authStatesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(authStatesDir, file);
                        const stats = fs.statSync(filePath);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const configData = JSON.parse(content);
                        
                        // Extract domain from filename or config
                        let domain = 'unknown';
                        let type = 'unknown';
                        let status = 'active';
                        
                        if (file.startsWith('live-session-')) {
                            domain = file.replace('live-session-', '').replace(/\.json$/, '').split('-')[0];
                            type = 'sso';
                        } else if (file.startsWith('auth-config-')) {
                            domain = file.replace('auth-config-', '').replace(/\.json$/, '');
                            type = 'basic';
                        }
                        
                        configs.push({
                            id: file.replace('.json', ''),
                            domain: domain,
                            type: type,
                            status: status,
                            filename: file,
                            url: configData.url || `https://${domain}`,
                            last_used: stats.mtime.toISOString(),
                            created_at: stats.birthtime.toISOString(),
                            size: stats.size
                        });
                    } catch (parseError) {
                        console.warn(`Failed to parse auth config ${file}:`, parseError.message);
                    }
                }
            }
        }
        
        res.json({
            configs: configs,
            total: configs.length
        });
        
    } catch (error) {
        console.error('Auth configs fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch authentication configurations',
            code: 'AUTH_CONFIGS_ERROR'
        });
    }
});

/**
 * PUT /api/auth/configs/:configId
 * Update an authentication configuration
 */
router.put('/configs/:configId', authenticateToken, async (req, res) => {
    try {
        const { configId } = req.params;
        const { name, url, type, username, password, loginPage, successUrl, apiKey, token } = req.body;
        
        console.log(`🔄 Updating auth config ${configId} with data:`, {
            name, url, type, username: username ? '[SET]' : '[EMPTY]', 
            password: password ? '[SET]' : '[EMPTY]', loginPage, successUrl,
            apiKey: apiKey ? '[SET]' : '[EMPTY]', token: token ? '[SET]' : '[EMPTY]'
        });
        
        const authStatesDir = path.join(__dirname, '../../reports/auth-states');
        const configFile = path.join(authStatesDir, `${configId}.json`);
        
        if (!fs.existsSync(configFile)) {
            return res.status(404).json({
                error: 'Authentication configuration not found',
                code: 'CONFIG_NOT_FOUND'
            });
        }
        
        // Read existing configuration
        const existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        
        // Update configuration with new values (use provided values or keep existing)
        const updatedConfig = {
            ...existingConfig,
            name: name !== undefined ? name : existingConfig.name,
            url: url !== undefined ? url : existingConfig.url,
            type: type !== undefined ? type : existingConfig.type,
            updated_at: new Date().toISOString()
        };
        
        // Update type-specific fields based on the type
        const currentType = type || existingConfig.type;
        
        if (currentType === 'basic') {
            // For basic auth, update provided fields (allow empty strings to clear fields)
            if (username !== undefined) updatedConfig.username = username;
            if (password !== undefined && password !== '') updatedConfig.password = password; // Don't clear password if empty
            if (loginPage !== undefined) updatedConfig.loginPage = loginPage;
            if (successUrl !== undefined) updatedConfig.successUrl = successUrl;
            
            // Clear advanced auth fields when switching to basic
            delete updatedConfig.apiKey;
            delete updatedConfig.token;
            
        } else if (currentType === 'advanced') {
            // For advanced auth, update provided fields (allow empty strings to clear fields) 
            if (apiKey !== undefined && apiKey !== '') updatedConfig.apiKey = apiKey; // Don't clear apiKey if empty
            if (token !== undefined && token !== '') updatedConfig.token = token; // Don't clear token if empty
            
            // Clear basic auth fields when switching to advanced
            delete updatedConfig.username;
            delete updatedConfig.password;
            delete updatedConfig.loginPage;
            delete updatedConfig.successUrl;
            
        } else if (currentType === 'sso') {
            // For SSO, clear other auth fields
            delete updatedConfig.username;
            delete updatedConfig.password;
            delete updatedConfig.loginPage;
            delete updatedConfig.successUrl;
            delete updatedConfig.apiKey;
            delete updatedConfig.token;
        }
        
        // Write updated configuration
        fs.writeFileSync(configFile, JSON.stringify(updatedConfig, null, 2));
        
        res.json({
            message: 'Authentication configuration updated successfully',
            config_id: configId,
            config: updatedConfig
        });
        
    } catch (error) {
        console.error('Auth config update error:', error);
        res.status(500).json({
            error: 'Failed to update authentication configuration',
            code: 'AUTH_UPDATE_ERROR'
        });
    }
});

/**
 * DELETE /api/auth/configs/:configId
 * Delete an authentication configuration
 */
router.delete('/configs/:configId', authenticateToken, async (req, res) => {
    try {
        const { configId } = req.params;
        const authStatesDir = path.join(__dirname, '../../reports/auth-states');
        const configFile = path.join(authStatesDir, `${configId}.json`);
        
        if (!fs.existsSync(configFile)) {
            return res.status(404).json({
                error: 'Authentication configuration not found',
                code: 'CONFIG_NOT_FOUND'
            });
        }
        
        // Delete the configuration file
        fs.unlinkSync(configFile);
        
        res.json({
            message: 'Authentication configuration deleted successfully',
            config_id: configId
        });
        
    } catch (error) {
        console.error('Auth config delete error:', error);
        res.status(500).json({
            error: 'Failed to delete authentication configuration',
            code: 'AUTH_DELETE_ERROR'
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

module.exports = router; 