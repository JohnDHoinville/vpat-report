const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, requireRole, hashPassword } = require('../middleware/auth');
const { pool } = require('../middleware/auth');

/**
 * User Management Routes
 * Admin-only endpoints for managing users
 */

/**
 * GET /api/users
 * Get all users with filtering and pagination (admin only)
 */
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            role,
            status,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        let whereClause = 'WHERE 1=1';
        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex + 1} OR full_name ILIKE $${paramIndex + 2})`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            paramIndex += 3;
        }

        if (role) {
            whereClause += ` AND role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        if (status !== undefined) {
            whereClause += ` AND is_active = $${paramIndex}`;
            queryParams.push(status === 'active');
            paramIndex++;
        }

        // Validate sort column
        const allowedSortColumns = ['username', 'email', 'full_name', 'role', 'created_at', 'last_login'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) 
            FROM users 
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalCount = parseInt(countResult.rows[0].count);

        // Get users
        const usersQuery = `
            SELECT 
                id,
                username,
                email,
                full_name,
                role,
                is_active,
                last_login,
                created_at,
                updated_at,
                password_changed_at
            FROM users 
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        queryParams.push(limitNum, offset);

        const usersResult = await pool.query(usersQuery, queryParams);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        res.json({
            success: true,
            data: {
                users: usersResult.rows,
                pagination: {
                    current_page: pageNum,
                    total_pages: totalPages,
                    total_count: totalCount,
                    limit: limitNum,
                    has_next_page: hasNextPage,
                    has_prev_page: hasPrevPage
                }
            }
        });

    } catch (error) {
        console.error('❌ Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.message
        });
    }
});

/**
 * GET /api/users/stats
 * Get user statistics (admin only)
 */
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
                COUNT(CASE WHEN role = 'viewer' THEN 1 END) as viewer_users,
                COUNT(CASE WHEN last_login > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_logins,
                COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as weekly_active,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month
            FROM users
        `;

        const result = await pool.query(statsQuery);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics',
            details: error.message
        });
    }
});

/**
 * GET /api/users/:id
 * Get a specific user by ID (admin only)
 */
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const userQuery = `
            SELECT 
                id,
                username,
                email,
                full_name,
                role,
                is_active,
                last_login,
                created_at,
                updated_at,
                password_changed_at
            FROM users 
            WHERE id = $1
        `;

        const result = await pool.query(userQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user's session count and recent activity
        const sessionQuery = `
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
                MAX(created_at) as last_session_created
            FROM user_sessions 
            WHERE user_id = $1
        `;
        const sessionResult = await pool.query(sessionQuery, [id]);

        res.json({
            success: true,
            data: {
                user: result.rows[0],
                session_stats: sessionResult.rows[0]
            }
        });

    } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user',
            details: error.message
        });
    }
});

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, email, password, full_name, role = 'user', is_active = true } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        if (!['admin', 'user', 'viewer'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role specified. Must be admin, user, or viewer'
            });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User already exists with this username or email'
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const userQuery = `
            INSERT INTO users (username, email, password_hash, full_name, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, email, full_name, role, is_active, created_at
        `;

        const result = await pool.query(userQuery, [
            username, email, passwordHash, full_name, role, is_active
        ]);

        const newUser = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: newUser
            }
        });

    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            details: error.message
        });
    }
});

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, full_name, role, is_active } = req.body;

        // Check if user exists
        const existingUser = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check for duplicate username/email (excluding current user)
        if (username || email) {
            const duplicateCheck = await pool.query(
                'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
                [username || '', email || '', id]
            );

            if (duplicateCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Username or email already exists'
                });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username !== undefined) {
            updates.push(`username = $${paramCount++}`);
            values.push(username);
        }

        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }

        if (role !== undefined) {
            if (!['admin', 'user', 'viewer'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role specified'
                });
            }
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }

        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }



        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE users SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, email, full_name, role, is_active, updated_at
        `;

        const result = await pool.query(query, values);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                user: result.rows[0]
            }
        });

    } catch (error) {
        console.error('❌ Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            details: error.message
        });
    }
});

/**
 * PUT /api/users/:id/password
 * Reset user password (admin only)
 */
router.put('/:id/password', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({
                success: false,
                error: 'New password is required'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long'
            });
        }

        // Check if user exists
        const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Hash new password
        const passwordHash = await hashPassword(new_password);

        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
            [passwordHash, id]
        );

        // Invalidate all user sessions
        await pool.query(
            'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Password reset successfully. User will need to login again.'
        });

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset password',
            details: error.message
        });
    }
});

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const userExists = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent deleting the current admin user
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        // Check if user has active test assignments
        const activeAssignments = await pool.query(
            'SELECT COUNT(*) FROM test_instances WHERE assigned_tester = $1 AND status IN (\'pending\', \'in_progress\')',
            [id]
        );

        if (parseInt(activeAssignments.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete user with active test assignments. Please reassign tests first.'
            });
        }

        // Soft delete: deactivate instead of hard delete to preserve audit trail
        await pool.query(
            'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
            [id]
        );

        // Invalidate all user sessions
        await pool.query(
            'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            details: error.message
        });
    }
});

/**
 * POST /api/users/:id/activate
 * Reactivate a deactivated user (admin only)
 */
router.post('/:id/activate', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const userExists = await pool.query('SELECT id, is_active FROM users WHERE id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (userExists.rows[0].is_active) {
            return res.status(400).json({
                success: false,
                error: 'User is already active'
            });
        }

        // Reactivate user
        await pool.query(
            'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'User reactivated successfully'
        });

    } catch (error) {
        console.error('❌ Error reactivating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reactivate user',
            details: error.message
        });
    }
});

module.exports = router; 