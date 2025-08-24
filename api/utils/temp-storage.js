const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

/**
 * Temporary File Storage Management Utility
 * Handles PDF upload temporary storage with cleanup and monitoring
 */
class TempStorageManager {
    constructor() {
        this.baseDir = path.join(__dirname, '../../uploads');
        this.tempDir = path.join(this.baseDir, 'temp');
        this.processedDir = path.join(this.baseDir, 'processed');
        this.archivedDir = path.join(this.baseDir, 'archived');
        
        // File retention settings
        this.maxAge = {
            temp: 30 * 60 * 1000,      // 30 minutes for temp files
            processed: 24 * 60 * 60 * 1000, // 24 hours for processed files
            archived: 7 * 24 * 60 * 60 * 1000 // 7 days for archived files
        };
        
        this.maxStorageSize = 100 * 1024 * 1024; // 100MB total storage limit
        
        // Initialize storage on creation
        this.init();
        
        // Start cleanup scheduler
        this.startCleanupScheduler();
    }

    /**
     * Initialize storage directories
     */
    async init() {
        try {
            const directories = [this.tempDir, this.processedDir, this.archivedDir];
            
            for (const dir of directories) {
                try {
                    await fs.access(dir);
                } catch (error) {
                    await fs.mkdir(dir, { recursive: true });
                    logger.info(`📁 Created storage directory: ${path.basename(dir)}`);
                }
            }
            
            logger.info('📦 Temporary storage manager initialized', {
                tempDir: this.tempDir,
                processedDir: this.processedDir,
                archivedDir: this.archivedDir
            });
            
            // Initial cleanup
            await this.cleanup();
            
        } catch (error) {
            logger.error('Failed to initialize temp storage:', error);
            throw error;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats() {
        try {
            const stats = {
                temp: await this.getDirectoryStats(this.tempDir),
                processed: await this.getDirectoryStats(this.processedDir),
                archived: await this.getDirectoryStats(this.archivedDir),
                totalSize: 0,
                totalFiles: 0
            };
            
            stats.totalSize = stats.temp.size + stats.processed.size + stats.archived.size;
            stats.totalFiles = stats.temp.count + stats.processed.count + stats.archived.count;
            
            return stats;
        } catch (error) {
            logger.error('Failed to get storage stats:', error);
            return null;
        }
    }

    /**
     * Get directory statistics
     */
    async getDirectoryStats(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            let totalSize = 0;
            let count = 0;
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isFile()) {
                        totalSize += stat.size;
                        count++;
                    }
                } catch (error) {
                    // File might have been deleted, continue
                    continue;
                }
            }
            
            return { size: totalSize, count, files };
        } catch (error) {
            return { size: 0, count: 0, files: [] };
        }
    }

    /**
     * Move file from temp to processed
     */
    async moveToProcessed(tempFilePath, newFilename = null) {
        try {
            const filename = newFilename || path.basename(tempFilePath);
            const processedPath = path.join(this.processedDir, filename);
            
            await fs.rename(tempFilePath, processedPath);
            
            logger.info(`📁 Moved file to processed: ${filename}`);
            return processedPath;
        } catch (error) {
            logger.error('Failed to move file to processed:', error);
            throw error;
        }
    }

    /**
     * Archive processed file
     */
    async archiveFile(filePath, metadata = {}) {
        try {
            const filename = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archivedFilename = `${timestamp}_${filename}`;
            const archivedPath = path.join(this.archivedDir, archivedFilename);
            
            await fs.rename(filePath, archivedPath);
            
            // Create metadata file
            const metadataPath = archivedPath + '.meta.json';
            await fs.writeFile(metadataPath, JSON.stringify({
                originalFilename: filename,
                archivedAt: new Date().toISOString(),
                metadata
            }, null, 2));
            
            logger.info(`📦 Archived file: ${archivedFilename}`);
            return archivedPath;
        } catch (error) {
            logger.error('Failed to archive file:', error);
            throw error;
        }
    }

    /**
     * Clean up old files based on retention policies
     */
    async cleanup() {
        try {
            const now = Date.now();
            let cleaned = {
                temp: { count: 0, size: 0 },
                processed: { count: 0, size: 0 },
                archived: { count: 0, size: 0 }
            };

            // Clean temp files
            cleaned.temp = await this.cleanupDirectory(this.tempDir, now - this.maxAge.temp);
            
            // Clean processed files
            cleaned.processed = await this.cleanupDirectory(this.processedDir, now - this.maxAge.processed);
            
            // Clean archived files
            cleaned.archived = await this.cleanupDirectory(this.archivedDir, now - this.maxAge.archived);
            
            const totalCleaned = cleaned.temp.count + cleaned.processed.count + cleaned.archived.count;
            const totalSize = cleaned.temp.size + cleaned.processed.size + cleaned.archived.size;
            
            if (totalCleaned > 0) {
                logger.info(`🧹 Cleanup completed: ${totalCleaned} files removed (${this.formatBytes(totalSize)})`, cleaned);
            }
            
            // Check storage size limits
            await this.enforceStorageLimits();
            
            return cleaned;
        } catch (error) {
            logger.error('Storage cleanup failed:', error);
            return null;
        }
    }

    /**
     * Clean up files in a specific directory older than cutoff time
     */
    async cleanupDirectory(dirPath, cutoffTime) {
        try {
            const files = await fs.readdir(dirPath);
            let count = 0;
            let size = 0;
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                try {
                    const stat = await fs.stat(filePath);
                    
                    if (stat.isFile() && stat.mtime.getTime() < cutoffTime) {
                        size += stat.size;
                        await fs.unlink(filePath);
                        count++;
                    }
                } catch (error) {
                    // File might already be deleted or inaccessible
                    continue;
                }
            }
            
            return { count, size };
        } catch (error) {
            return { count: 0, size: 0 };
        }
    }

    /**
     * Enforce storage size limits by removing oldest files
     */
    async enforceStorageLimits() {
        try {
            const stats = await this.getStorageStats();
            
            if (stats && stats.totalSize > this.maxStorageSize) {
                logger.warn(`💾 Storage limit exceeded: ${this.formatBytes(stats.totalSize)} > ${this.formatBytes(this.maxStorageSize)}`);
                
                // Remove oldest archived files first
                await this.removeOldestFiles(this.archivedDir, stats.totalSize - this.maxStorageSize);
            }
        } catch (error) {
            logger.error('Failed to enforce storage limits:', error);
        }
    }

    /**
     * Remove oldest files to free up space
     */
    async removeOldestFiles(dirPath, bytesToFree) {
        try {
            const files = await fs.readdir(dirPath);
            const fileStats = [];
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isFile()) {
                        fileStats.push({
                            path: filePath,
                            name: file,
                            size: stat.size,
                            mtime: stat.mtime
                        });
                    }
                } catch (error) {
                    continue;
                }
            }
            
            // Sort by modification time (oldest first)
            fileStats.sort((a, b) => a.mtime - b.mtime);
            
            let freedBytes = 0;
            let removedCount = 0;
            
            for (const file of fileStats) {
                if (freedBytes >= bytesToFree) break;
                
                try {
                    await fs.unlink(file.path);
                    freedBytes += file.size;
                    removedCount++;
                } catch (error) {
                    continue;
                }
            }
            
            if (removedCount > 0) {
                logger.info(`💾 Freed storage: removed ${removedCount} files (${this.formatBytes(freedBytes)})`);
            }
            
        } catch (error) {
            logger.error('Failed to remove oldest files:', error);
        }
    }

    /**
     * Start the cleanup scheduler
     */
    startCleanupScheduler() {
        // Run cleanup every 15 minutes
        setInterval(() => {
            this.cleanup().catch(error => {
                logger.error('Scheduled cleanup failed:', error);
            });
        }, 15 * 60 * 1000);
        
        logger.info('🕐 Cleanup scheduler started (15-minute intervals)');
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get storage health status
     */
    async getHealthStatus() {
        try {
            const stats = await this.getStorageStats();
            const usagePercent = (stats.totalSize / this.maxStorageSize) * 100;
            
            return {
                status: usagePercent > 90 ? 'critical' : usagePercent > 75 ? 'warning' : 'healthy',
                usage: {
                    total: this.formatBytes(stats.totalSize),
                    limit: this.formatBytes(this.maxStorageSize),
                    percent: Math.round(usagePercent)
                },
                directories: {
                    temp: this.formatBytes(stats.temp.size),
                    processed: this.formatBytes(stats.processed.size),
                    archived: this.formatBytes(stats.archived.size)
                },
                fileCount: stats.totalFiles
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }
}

// Create singleton instance
const tempStorage = new TempStorageManager();

module.exports = {
    tempStorage,
    TempStorageManager
};
