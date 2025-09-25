/**
 * Backup Management Routes
 * API endpoints for managing automated backups
 */

const express = require('express');
const router = express.Router();
const AutomatedBackupSystem = require('../modules/production/automated-backup-system');

// Initialize backup system
const backupSystem = new AutomatedBackupSystem({
    backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
    maxBackups: parseInt(process.env.MAX_BACKUPS) || 30,
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 90,
    backupInterval: parseInt(process.env.BACKUP_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
    compressionLevel: 6,
    autoStart: true
});

// Admin middleware - require admin access
const requireAdmin = (req, res, next) => {
    const user = req.user || {};
    if (!user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

// ==================== BACKUP MANAGEMENT ENDPOINTS ====================

// Get backup system status
router.get('/status', (req, res) => {
    try {
        const stats = backupSystem.getBackupStats();

        res.json({
            success: true,
            status: {
                isRunning: stats.isRunning,
                totalBackups: stats.totalBackups,
                successfulBackups: stats.successfulBackups,
                failedBackups: stats.failedBackups,
                successRate: stats.totalBackups > 0 ? (stats.successfulBackups / stats.totalBackups) * 100 : 0,
                lastBackupTime: stats.lastBackupTime,
                lastBackupSize: stats.lastBackupSize,
                totalDataBacked: stats.totalDataBacked,
                nextBackup: stats.nextBackup,
                backupDirectory: stats.backupDirectory,
                retentionDays: stats.retentionDays
            },
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error getting backup status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve backup status'
        });
    }
});

// Trigger manual backup (Admin only)
router.post('/create', requireAdmin, async (req, res) => {
    try {
        console.log('Manual backup initiated by admin');

        const result = await backupSystem.performFullBackup();

        res.json({
            success: true,
            backup: result,
            message: 'Manual backup completed successfully',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Manual backup failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Manual backup failed'
        });
    }
});

// List all backups
router.get('/list', async (req, res) => {
    try {
        const category = req.query.category || null;
        const backups = await backupSystem.listBackups(category);

        // Add summary information
        const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
        const categories = [...new Set(backups.map(b => b.category))];

        res.json({
            success: true,
            backups: backups.map(backup => ({
                name: backup.name,
                category: backup.category,
                size: backup.size,
                sizeFormatted: backupSystem.formatBytes(backup.size),
                created: backup.created,
                age: Date.now() - backup.created.getTime(),
                path: backup.path
            })),
            summary: {
                totalBackups: backups.length,
                totalSize: totalSize,
                totalSizeFormatted: backupSystem.formatBytes(totalSize),
                categories: categories,
                oldestBackup: backups.length > 0 ? Math.min(...backups.map(b => b.created)) : null,
                newestBackup: backups.length > 0 ? Math.max(...backups.map(b => b.created)) : null
            },
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list backups'
        });
    }
});

// Download backup file (Admin only)
router.get('/download/:category/:filename', requireAdmin, async (req, res) => {
    try {
        const { category, filename } = req.params;
        const backupPath = path.join(
            backupSystem.options.backupDirectory,
            category,
            filename
        );

        // Verify file exists and is a backup file
        if (!filename.endsWith('.json.gz')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid backup file'
            });
        }

        const fs = require('fs');
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                error: 'Backup file not found'
            });
        }

        // Set headers for file download
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the file
        const fileStream = fs.createReadStream(backupPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download backup'
        });
    }
});

// Restore from backup (Admin only)
router.post('/restore', requireAdmin, async (req, res) => {
    try {
        const { backupPath, category, filename } = req.body;

        if (!backupPath && (!category || !filename)) {
            return res.status(400).json({
                success: false,
                error: 'Either backupPath or category+filename must be provided'
            });
        }

        const fullPath = backupPath || path.join(
            backupSystem.options.backupDirectory,
            category,
            filename
        );

        const restoredData = await backupSystem.restoreBackup(fullPath);

        // In production, this would actually restore the data to the appropriate systems
        console.log(`Backup restored by admin: ${fullPath}`);

        res.json({
            success: true,
            restoredData: {
                backupId: restoredData.backupId,
                timestamp: restoredData.timestamp,
                type: restoredData.type,
                version: restoredData.version,
                dataKeys: Object.keys(restoredData.data || {})
            },
            message: 'Backup restored successfully (dry run)',
            warning: 'This is a dry run. In production, data would be restored to live systems.',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to restore backup'
        });
    }
});

// Clean up old backups (Admin only)
router.post('/cleanup', requireAdmin, async (req, res) => {
    try {
        const result = await backupSystem.cleanupOldBackups();

        res.json({
            success: true,
            cleanup: result,
            message: `Cleanup completed: ${result.deletedCount} backups deleted`,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error during backup cleanup:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Backup cleanup failed'
        });
    }
});

// Start automatic backups (Admin only)
router.post('/start', requireAdmin, (req, res) => {
    try {
        backupSystem.startAutomaticBackups();

        res.json({
            success: true,
            message: 'Automatic backups started',
            status: backupSystem.getBackupStats(),
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error starting automatic backups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start automatic backups'
        });
    }
});

// Stop automatic backups (Admin only)
router.post('/stop', requireAdmin, (req, res) => {
    try {
        backupSystem.stopAutomaticBackups();

        res.json({
            success: true,
            message: 'Automatic backups stopped',
            status: backupSystem.getBackupStats(),
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error stopping automatic backups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop automatic backups'
        });
    }
});

// Health check for backup system
router.get('/health', async (req, res) => {
    try {
        const health = await backupSystem.healthCheck();

        const statusCode = health.healthy ? 200 : 503;

        res.status(statusCode).json({
            service: 'backup-system',
            healthy: health.healthy,
            details: health,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Backup system health check failed:', error);
        res.status(503).json({
            service: 'backup-system',
            healthy: false,
            error: 'Health check failed',
            timestamp: Date.now()
        });
    }
});

// Get backup configuration (Admin only)
router.get('/config', requireAdmin, (req, res) => {
    try {
        const config = {
            backupDirectory: backupSystem.options.backupDirectory,
            maxBackups: backupSystem.options.maxBackups,
            retentionDays: backupSystem.options.retentionDays,
            backupInterval: backupSystem.options.backupInterval,
            backupIntervalHours: backupSystem.options.backupInterval / (1000 * 60 * 60),
            compressionLevel: backupSystem.options.compressionLevel,
            enableEncryption: backupSystem.options.enableEncryption,
            isRunning: backupSystem.isRunning
        };

        res.json({
            success: true,
            config: config,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error getting backup configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve backup configuration'
        });
    }
});

// Update backup configuration (Admin only)
router.put('/config', requireAdmin, (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['maxBackups', 'retentionDays', 'backupInterval', 'compressionLevel'];

        // Apply valid updates
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                backupSystem.options[key] = updates[key];
                console.log(`Backup config updated: ${key} = ${updates[key]}`);
            }
        });

        // Restart automatic backups if interval changed
        if (updates.backupInterval && backupSystem.isRunning) {
            backupSystem.stopAutomaticBackups();
            backupSystem.startAutomaticBackups();
        }

        res.json({
            success: true,
            message: 'Backup configuration updated',
            config: {
                maxBackups: backupSystem.options.maxBackups,
                retentionDays: backupSystem.options.retentionDays,
                backupInterval: backupSystem.options.backupInterval,
                compressionLevel: backupSystem.options.compressionLevel
            },
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error updating backup configuration:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update backup configuration'
        });
    }
});

// Export backup system instance for use in other modules
module.exports = {
    router,
    backupSystem
};