const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { pool } = require('../../database/config');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Database backup management routes
// All routes require admin authentication

/**
 * Get database status information
 */
router.get('/database/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            // Get database size
            const sizeResult = await client.query(`
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            `);
            
            // Get table count
            const tableResult = await client.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            
            // Get last backup info (we'll store this in a metadata table later)
            const lastBackupResult = await client.query(`
                SELECT created_at 
                FROM database_backups 
                ORDER BY created_at DESC 
                LIMIT 1
            `).catch(() => ({ rows: [] })); // Table might not exist yet
            
            const lastBackup = lastBackupResult.rows.length > 0 
                ? lastBackupResult.rows[0].created_at 
                : null;
            
            res.json({
                success: true,
                data: {
                    size: sizeResult.rows[0].size,
                    tables: parseInt(tableResult.rows[0].count),
                    lastBackup: lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'
                }
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error getting database status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * List all available backups
 */
router.get('/backups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const client = await pool.connect();
        
        try {
            // Create backups table if it doesn't exist
            await client.query(`
                CREATE TABLE IF NOT EXISTS database_backups (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    filename VARCHAR(255) NOT NULL,
                    description TEXT,
                    file_path TEXT NOT NULL,
                    file_size BIGINT,
                    includes_schema BOOLEAN DEFAULT true,
                    includes_data BOOLEAN DEFAULT true,
                    compressed BOOLEAN DEFAULT false,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_by UUID REFERENCES users(id)
                )
            `);
            
            const result = await client.query(`
                SELECT 
                    b.*,
                    u.username as created_by_username,
                    pg_size_pretty(b.file_size) as size_formatted
                FROM database_backups b
                LEFT JOIN users u ON b.created_by = u.id
                ORDER BY b.created_at DESC
            `);
            
            res.json({
                success: true,
                data: result.rows
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Create a new database backup
 */
router.post('/backups', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { description, include_schema = true, include_data = true, compress = true } = req.body;
        
        if (!description || description.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Backup description is required'
            });
        }
        
        // Create backups directory if it doesn't exist
        const backupsDir = path.join(__dirname, '../../database/backups');
        try {
            await fs.mkdir(backupsDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }
        
        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = uuidv4().substring(0, 8);
        const filename = `backup-${timestamp}-${backupId}.sql${compress ? '.gz' : ''}`;
        const filePath = path.join(backupsDir, filename);
        
        // Build pg_dump command
        const dumpArgs = [
            '-h', 'localhost',
            '-U', 'johnhoinville',
            '-d', 'accessibility_testing',
            '--verbose'
        ];
        
        if (include_schema && include_data) {
            // Include both schema and data (default)
        } else if (include_schema && !include_data) {
            dumpArgs.push('--schema-only');
        } else if (!include_schema && include_data) {
            dumpArgs.push('--data-only');
        }
        
        // Execute backup
        const pgDump = spawn('pg_dump', dumpArgs);
        
        let output = '';
        let errorOutput = '';
        
        // Handle compression if requested
        let finalProcess = pgDump;
        if (compress) {
            const gzip = spawn('gzip', ['-c']);
            pgDump.stdout.pipe(gzip.stdin);
            finalProcess = gzip;
        }
        
        // Write to file
        const writeStream = require('fs').createWriteStream(filePath);
        finalProcess.stdout.pipe(writeStream);
        
        pgDump.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        await new Promise((resolve, reject) => {
            finalProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Backup process failed with code ${code}: ${errorOutput}`));
                }
            });
            
            finalProcess.on('error', (error) => {
                reject(error);
            });
        });
        
        // Get file size
        const stats = await fs.stat(filePath);
        
        // Save backup info to database
        const client = await pool.connect();
        try {
            const result = await client.query(`
                INSERT INTO database_backups (
                    filename, description, file_path, file_size,
                    includes_schema, includes_data, compressed, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                filename,
                description.trim(),
                filePath,
                stats.size,
                include_schema,
                include_data,
                compress,
                req.user.id
            ]);
            
            res.json({
                success: true,
                message: 'Database backup created successfully',
                data: result.rows[0]
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Download a backup file
 */
router.get('/backups/:id/download', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM database_backups WHERE id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }
            
            const backup = result.rows[0];
            
            // Check if file exists
            try {
                await fs.access(backup.file_path);
            } catch (err) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup file not found on disk'
                });
            }
            
            // Send file
            res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
            res.setHeader('Content-Type', backup.compressed ? 'application/gzip' : 'text/plain');
            
            const readStream = require('fs').createReadStream(backup.file_path);
            readStream.pipe(res);
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Restore database from backup
 */
router.post('/backups/:id/restore', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM database_backups WHERE id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }
            
            const backup = result.rows[0];
            
            // Check if file exists
            try {
                await fs.access(backup.file_path);
            } catch (err) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup file not found on disk'
                });
            }
            
            // Build psql command for restore
            const restoreArgs = [
                '-h', 'localhost',
                '-U', 'johnhoinville',
                '-d', 'accessibility_testing',
                '--verbose'
            ];
            
            // Handle compressed files
            let restoreProcess;
            if (backup.compressed) {
                // Use gunzip to decompress and pipe to psql
                const gunzip = spawn('gunzip', ['-c', backup.file_path]);
                restoreProcess = spawn('psql', restoreArgs);
                gunzip.stdout.pipe(restoreProcess.stdin);
            } else {
                restoreArgs.push('-f', backup.file_path);
                restoreProcess = spawn('psql', restoreArgs);
            }
            
            let errorOutput = '';
            restoreProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            await new Promise((resolve, reject) => {
                restoreProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Restore process failed with code ${code}: ${errorOutput}`));
                    }
                });
                
                restoreProcess.on('error', (error) => {
                    reject(error);
                });
            });
            
            res.json({
                success: true,
                message: 'Database restored successfully'
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Delete a backup
 */
router.delete('/backups/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT * FROM database_backups WHERE id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Backup not found'
                });
            }
            
            const backup = result.rows[0];
            
            // Delete file from disk
            try {
                await fs.unlink(backup.file_path);
            } catch (err) {
                console.warn('Could not delete backup file from disk:', err.message);
                // Continue with database deletion even if file deletion fails
            }
            
            // Delete from database
            await client.query(`
                DELETE FROM database_backups WHERE id = $1
            `, [id]);
            
            res.json({
                success: true,
                message: 'Backup deleted successfully'
            });
            
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 