/**
 * Automated Backup System for Intelligent Data
 * Handles backup of business classifications, recommendations, and analytical data
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class AutomatedBackupSystem {
    constructor(options = {}) {
        this.options = {
            backupDirectory: options.backupDirectory || path.join(__dirname, '../../backups'),
            maxBackups: options.maxBackups || 30, // Keep 30 backups
            compressionLevel: options.compressionLevel || 6,
            backupInterval: options.backupInterval || 24 * 60 * 60 * 1000, // Daily backups
            enableEncryption: options.enableEncryption || false,
            retentionDays: options.retentionDays || 90,
            ...options
        };

        this.isRunning = false;
        this.backupTimer = null;
        this.backupQueue = [];
        this.stats = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            lastBackupTime: null,
            lastBackupSize: 0,
            totalDataBacked: 0
        };

        // Initialize backup directory
        this.initializeBackupDirectory();

        // Start automatic backup schedule if enabled
        if (options.autoStart !== false) {
            this.startAutomaticBackups();
        }
    }

    async initializeBackupDirectory() {
        try {
            await fs.mkdir(this.options.backupDirectory, { recursive: true });

            // Create subdirectories for different data types
            await fs.mkdir(path.join(this.options.backupDirectory, 'classifications'), { recursive: true });
            await fs.mkdir(path.join(this.options.backupDirectory, 'recommendations'), { recursive: true });
            await fs.mkdir(path.join(this.options.backupDirectory, 'analytics'), { recursive: true });
            await fs.mkdir(path.join(this.options.backupDirectory, 'feature-flags'), { recursive: true });
            await fs.mkdir(path.join(this.options.backupDirectory, 'cache-snapshots'), { recursive: true });
            await fs.mkdir(path.join(this.options.backupDirectory, 'system-state'), { recursive: true });

            console.log('Backup directories initialized successfully');
        } catch (error) {
            console.error('Failed to initialize backup directories:', error);
            throw error;
        }
    }

    // Start automatic backup scheduling
    startAutomaticBackups() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        this.backupTimer = setInterval(async () => {
            try {
                await this.performFullBackup();
            } catch (error) {
                console.error('Scheduled backup failed:', error);
                this.stats.failedBackups++;
            }
        }, this.options.backupInterval);

        this.isRunning = true;
        console.log(`Automatic backups started (interval: ${this.options.backupInterval}ms)`);
    }

    // Stop automatic backups
    stopAutomaticBackups() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }
        this.isRunning = false;
        console.log('Automatic backups stopped');
    }

    // Perform full system backup
    async performFullBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `full-backup-${timestamp}`;

        console.log(`Starting full backup: ${backupId}`);

        try {
            const backupData = {
                backupId,
                timestamp: Date.now(),
                version: '1.0.0',
                type: 'full',
                data: {}
            };

            // Backup business classifications
            backupData.data.classifications = await this.backupClassifications();

            // Backup recommendations data
            backupData.data.recommendations = await this.backupRecommendations();

            // Backup analytics data
            backupData.data.analytics = await this.backupAnalytics();

            // Backup feature flags configuration
            backupData.data.featureFlags = await this.backupFeatureFlags();

            // Backup cache snapshots
            backupData.data.cacheSnapshots = await this.backupCacheSnapshots();

            // Backup system state
            backupData.data.systemState = await this.backupSystemState();

            // Save backup
            const backupResult = await this.saveBackup(backupData, 'system-state');

            // Clean up old backups
            await this.cleanupOldBackups();

            this.stats.successfulBackups++;
            this.stats.totalBackups++;
            this.stats.lastBackupTime = Date.now();
            this.stats.lastBackupSize = backupResult.size;
            this.stats.totalDataBacked += backupResult.size;

            console.log(`Full backup completed successfully: ${backupId} (${this.formatBytes(backupResult.size)})`);

            return {
                success: true,
                backupId,
                size: backupResult.size,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Full backup failed:', error);
            this.stats.failedBackups++;
            this.stats.totalBackups++;

            throw error;
        }
    }

    // Backup business classifications data
    async backupClassifications() {
        // In production, this would connect to actual data sources
        const classificationsData = {
            businessTypes: await this.getBusinessTypesData(),
            industryMappings: await this.getIndustryMappings(),
            confidenceScores: await this.getConfidenceScores(),
            patternRecognition: await this.getPatternRecognitionData(),
            timestamp: Date.now()
        };

        const backupResult = await this.saveBackup(classificationsData, 'classifications');

        return {
            recordCount: classificationsData.businessTypes?.length || 0,
            size: backupResult.size,
            timestamp: Date.now()
        };
    }

    // Backup recommendations data
    async backupRecommendations() {
        const recommendationsData = {
            recommendations: await this.getRecommendationsData(),
            templates: await this.getRecommendationTemplates(),
            userPreferences: await this.getUserPreferences(),
            performanceMetrics: await this.getRecommendationMetrics(),
            timestamp: Date.now()
        };

        const backupResult = await this.saveBackup(recommendationsData, 'recommendations');

        return {
            recordCount: recommendationsData.recommendations?.length || 0,
            size: backupResult.size,
            timestamp: Date.now()
        };
    }

    // Backup analytics data
    async backupAnalytics() {
        const analyticsData = {
            userAnalytics: await this.getUserAnalytics(),
            systemMetrics: await this.getSystemMetrics(),
            performanceTrends: await this.getPerformanceTrends(),
            errorAnalytics: await this.getErrorAnalytics(),
            timestamp: Date.now()
        };

        const backupResult = await this.saveBackup(analyticsData, 'analytics');

        return {
            recordCount: Object.keys(analyticsData.userAnalytics || {}).length,
            size: backupResult.size,
            timestamp: Date.now()
        };
    }

    // Backup feature flags configuration
    async backupFeatureFlags() {
        const featureFlagsData = {
            flags: await this.getFeatureFlags(),
            userSegments: await this.getUserSegments(),
            rolloutHistory: await this.getRolloutHistory(),
            abTestResults: await this.getABTestResults(),
            timestamp: Date.now()
        };

        const backupResult = await this.saveBackup(featureFlagsData, 'feature-flags');

        return {
            flagCount: Object.keys(featureFlagsData.flags || {}).length,
            size: backupResult.size,
            timestamp: Date.now()
        };
    }

    // Backup cache snapshots
    async backupCacheSnapshots() {
        const cacheData = {
            businessClassificationCache: await this.getBusinessClassificationCache(),
            recommendationCache: await this.getRecommendationCache(),
            analyticsCache: await this.getAnalyticsCache(),
            cacheMetrics: await this.getCacheMetrics(),
            timestamp: Date.now()
        };

        const backupResult = await this.saveBackup(cacheData, 'cache-snapshots');

        return {
            cacheSize: Object.keys(cacheData.businessClassificationCache || {}).length,
            size: backupResult.size,
            timestamp: Date.now()
        };
    }

    // Backup system state
    async backupSystemState() {
        const systemState = {
            health: await this.getSystemHealth(),
            configuration: await this.getSystemConfiguration(),
            activeConnections: await this.getActiveConnections(),
            resourceUsage: await this.getResourceUsage(),
            timestamp: Date.now()
        };

        return systemState;
    }

    // Save backup data to file
    async saveBackup(data, category) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${category}-backup-${timestamp}.json.gz`;
        const filePath = path.join(this.options.backupDirectory, category, filename);

        try {
            // Convert data to JSON
            const jsonData = JSON.stringify(data, null, 2);

            // Compress data
            const compressedData = await gzip(Buffer.from(jsonData), {
                level: this.options.compressionLevel
            });

            // Write to file
            await fs.writeFile(filePath, compressedData);

            const stats = await fs.stat(filePath);

            console.log(`Backup saved: ${filename} (${this.formatBytes(stats.size)})`);

            return {
                filename,
                path: filePath,
                size: stats.size,
                compressed: true,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error(`Failed to save backup ${filename}:`, error);
            throw error;
        }
    }

    // Restore backup from file
    async restoreBackup(backupPath) {
        try {
            console.log(`Restoring backup from: ${backupPath}`);

            // Read compressed file
            const compressedData = await fs.readFile(backupPath);

            // Decompress
            const jsonData = await gunzip(compressedData);

            // Parse JSON
            const backupData = JSON.parse(jsonData.toString());

            console.log(`Backup restored successfully: ${backupData.backupId || 'unknown'}`);

            return backupData;

        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw error;
        }
    }

    // List available backups
    async listBackups(category = null) {
        try {
            const backups = [];
            const searchDir = category ?
                path.join(this.options.backupDirectory, category) :
                this.options.backupDirectory;

            const items = await fs.readdir(searchDir, { withFileTypes: true });

            for (const item of items) {
                if (item.isDirectory() && !category) {
                    // Recursively list backups in subdirectories
                    const subBackups = await this.listBackups(item.name);
                    backups.push(...subBackups);
                } else if (item.isFile() && item.name.endsWith('.json.gz')) {
                    const filePath = path.join(searchDir, item.name);
                    const stats = await fs.stat(filePath);

                    backups.push({
                        name: item.name,
                        path: filePath,
                        category: category || path.basename(path.dirname(filePath)),
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime
                    });
                }
            }

            return backups.sort((a, b) => b.created - a.created);

        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    // Clean up old backups based on retention policy
    async cleanupOldBackups() {
        try {
            const allBackups = await this.listBackups();
            const cutoffDate = new Date(Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000));

            let deletedCount = 0;
            let deletedSize = 0;

            for (const backup of allBackups) {
                if (backup.created < cutoffDate) {
                    try {
                        await fs.unlink(backup.path);
                        deletedCount++;
                        deletedSize += backup.size;
                        console.log(`Deleted old backup: ${backup.name}`);
                    } catch (error) {
                        console.error(`Failed to delete backup ${backup.name}:`, error);
                    }
                }
            }

            if (deletedCount > 0) {
                console.log(`Cleanup completed: ${deletedCount} backups deleted (${this.formatBytes(deletedSize)} freed)`);
            }

            return {
                deletedCount,
                deletedSize,
                remainingBackups: allBackups.length - deletedCount
            };

        } catch (error) {
            console.error('Backup cleanup failed:', error);
            throw error;
        }
    }

    // Get backup statistics
    getBackupStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            backupDirectory: this.options.backupDirectory,
            maxBackups: this.options.maxBackups,
            retentionDays: this.options.retentionDays,
            nextBackup: this.backupTimer ? Date.now() + this.options.backupInterval : null
        };
    }

    // Health check for backup system
    async healthCheck() {
        try {
            // Check backup directory accessibility
            await fs.access(this.options.backupDirectory);

            // Check recent backup status
            const recentBackups = await this.listBackups();
            const hasRecentBackup = recentBackups.some(backup =>
                Date.now() - backup.created.getTime() < this.options.backupInterval * 2
            );

            return {
                healthy: true,
                isRunning: this.isRunning,
                backupDirectoryAccessible: true,
                hasRecentBackup,
                totalBackups: recentBackups.length,
                lastBackupTime: this.stats.lastBackupTime,
                stats: this.stats
            };

        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                isRunning: this.isRunning,
                stats: this.stats
            };
        }
    }

    // Format bytes for human reading
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // ==================== DATA RETRIEVAL METHODS ====================
    // These methods would interface with actual data sources in production

    async getBusinessTypesData() {
        // Mock data - in production, this would connect to database
        return [
            { id: 1, businessType: 'technology', confidence: 0.95, timestamp: Date.now() },
            { id: 2, businessType: 'retail', confidence: 0.87, timestamp: Date.now() },
            { id: 3, businessType: 'manufacturing', confidence: 0.92, timestamp: Date.now() }
        ];
    }

    async getIndustryMappings() {
        return {
            technology: ['software', 'hardware', 'IT services'],
            retail: ['e-commerce', 'brick-and-mortar', 'wholesale'],
            manufacturing: ['automotive', 'electronics', 'textiles']
        };
    }

    async getConfidenceScores() {
        return {
            averageConfidence: 0.91,
            highConfidenceThreshold: 0.85,
            totalClassifications: 1500,
            timestamp: Date.now()
        };
    }

    async getPatternRecognitionData() {
        return {
            patterns: [
                { pattern: 'tech-startup', frequency: 245, accuracy: 0.92 },
                { pattern: 'retail-chain', frequency: 189, accuracy: 0.88 }
            ],
            timestamp: Date.now()
        };
    }

    async getRecommendationsData() {
        return [
            { id: 1, businessId: 'biz-001', recommendations: ['cost-optimization'], timestamp: Date.now() },
            { id: 2, businessId: 'biz-002', recommendations: ['efficiency-improvement'], timestamp: Date.now() }
        ];
    }

    async getRecommendationTemplates() {
        return {
            'cost-optimization': { title: 'Cost Optimization', priority: 'high' },
            'efficiency-improvement': { title: 'Efficiency Improvement', priority: 'medium' }
        };
    }

    async getUserPreferences() {
        return {
            'user-001': { preferredRecommendations: ['cost-optimization'], frequency: 'weekly' },
            'user-002': { preferredRecommendations: ['efficiency-improvement'], frequency: 'monthly' }
        };
    }

    async getRecommendationMetrics() {
        return {
            totalRecommendations: 500,
            acceptanceRate: 0.73,
            implementationRate: 0.45,
            timestamp: Date.now()
        };
    }

    async getUserAnalytics() {
        return {
            totalUsers: 1200,
            activeUsers: 850,
            conversionRate: 0.12,
            timestamp: Date.now()
        };
    }

    async getSystemMetrics() {
        return {
            responseTime: 95,
            errorRate: 0.3,
            throughput: 150,
            timestamp: Date.now()
        };
    }

    async getPerformanceTrends() {
        return {
            weekly: { responseTime: [90, 95, 88, 92, 87], trend: 'stable' },
            monthly: { throughput: [140, 145, 150, 148, 155], trend: 'improving' }
        };
    }

    async getErrorAnalytics() {
        return {
            totalErrors: 15,
            errorTypes: { validation: 8, timeout: 4, system: 3 },
            timestamp: Date.now()
        };
    }

    async getFeatureFlags() {
        return {
            business_classification: { enabled: true, rollout: 100 },
            cost_validation: { enabled: true, rollout: 80 }
        };
    }

    async getUserSegments() {
        return {
            premium: { count: 300, criteria: { tier: 'premium' } },
            enterprise: { count: 50, criteria: { tier: 'enterprise' } }
        };
    }

    async getRolloutHistory() {
        return [
            { flag: 'cost_validation', rollout: 80, timestamp: Date.now() - 86400000 },
            { flag: 'business_classification', rollout: 100, timestamp: Date.now() - 172800000 }
        ];
    }

    async getABTestResults() {
        return {
            'test-001': { variant: 'A', conversions: 45, participants: 200 },
            'test-002': { variant: 'B', conversions: 52, participants: 200 }
        };
    }

    async getBusinessClassificationCache() {
        return {
            'cache-key-001': { businessType: 'technology', confidence: 0.95 },
            'cache-key-002': { businessType: 'retail', confidence: 0.87 }
        };
    }

    async getRecommendationCache() {
        return {
            'rec-cache-001': { recommendations: ['cost-optimization'], timestamp: Date.now() },
            'rec-cache-002': { recommendations: ['efficiency'], timestamp: Date.now() }
        };
    }

    async getAnalyticsCache() {
        return {
            userMetrics: { totalUsers: 1200, activeUsers: 850 },
            systemMetrics: { responseTime: 95, errorRate: 0.3 }
        };
    }

    async getCacheMetrics() {
        return {
            hitRate: 0.82,
            totalRequests: 5000,
            cacheSize: '75MB',
            timestamp: Date.now()
        };
    }

    async getSystemHealth() {
        return {
            overall: 'healthy',
            components: {
                database: 'healthy',
                cache: 'healthy',
                api: 'healthy'
            },
            timestamp: Date.now()
        };
    }

    async getSystemConfiguration() {
        return {
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            features: ['caching', 'throttling', 'monitoring'],
            timestamp: Date.now()
        };
    }

    async getActiveConnections() {
        return {
            totalConnections: 150,
            activeRequests: 25,
            queuedRequests: 5,
            timestamp: Date.now()
        };
    }

    async getResourceUsage() {
        return {
            memory: { used: '180MB', total: '512MB', percentage: 35 },
            cpu: { usage: 25, cores: 4 },
            disk: { used: '2.1GB', total: '10GB', percentage: 21 },
            timestamp: Date.now()
        };
    }
}

module.exports = AutomatedBackupSystem;