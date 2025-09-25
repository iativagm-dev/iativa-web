/**
 * Alert Manager - Performance Monitoring and Alerting System
 * Handles real-time alerts, notifications, and automated responses
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AlertManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            enablePersistence: options.enablePersistence !== false,
            alertCooldown: options.alertCooldown || 300000, // 5 minutes
            maxAlertsPerMinute: options.maxAlertsPerMinute || 10,
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/alerts.json'),
            enableEmailNotifications: options.enableEmailNotifications || false,
            enableSlackNotifications: options.enableSlackNotifications || false,
            enableAutoRecovery: options.enableAutoRecovery !== false,
            ...options
        };

        // Alert thresholds
        this.thresholds = {
            responseTime: {
                warning: 300,
                critical: 1000,
                ...options.thresholds?.responseTime
            },
            errorRate: {
                warning: 5,
                critical: 15,
                ...options.thresholds?.errorRate
            },
            memoryUsage: {
                warning: 80,
                critical: 95,
                ...options.thresholds?.memoryUsage
            },
            cacheHitRate: {
                warning: 30,
                critical: 10,
                ...options.thresholds?.cacheHitRate
            },
            throughput: {
                warning: 10, // requests per second minimum
                critical: 5,
                ...options.thresholds?.throughput
            }
        };

        // Alert state management
        this.alerts = new Map();
        this.alertHistory = [];
        this.cooldowns = new Map();
        this.alertCounts = new Map();
        this.autoRecoveryActions = new Map();

        // Metrics tracking
        this.metrics = {
            totalAlerts: 0,
            criticalAlerts: 0,
            warningAlerts: 0,
            resolvedAlerts: 0,
            averageResolutionTime: 0,
            uptime: Date.now(),
            lastAlert: null
        };

        this.init();
    }

    init() {
        console.log('🚨 Initializing Alert Manager...');

        this.loadPersistedAlerts();
        this.setupCleanupInterval();
        this.setupMetricsTracking();

        console.log('✅ Alert Manager initialized');
    }

    // ==================== ALERT PROCESSING ====================

    async processMetrics(metricsData) {
        try {
            const alerts = [];

            // Check response time
            if (metricsData.performance?.responseTime?.average) {
                const responseTimeAlert = this.checkResponseTime(metricsData.performance.responseTime.average);
                if (responseTimeAlert) alerts.push(responseTimeAlert);
            }

            // Check error rate
            if (metricsData.performance?.errorRate !== undefined) {
                const errorRateAlert = this.checkErrorRate(metricsData.performance.errorRate);
                if (errorRateAlert) alerts.push(errorRateAlert);
            }

            // Check memory usage
            if (metricsData.system?.memory?.heapUsed && metricsData.system?.memory?.heapTotal) {
                const memoryUsagePercent = (metricsData.system.memory.heapUsed / metricsData.system.memory.heapTotal) * 100;
                const memoryAlert = this.checkMemoryUsage(memoryUsagePercent);
                if (memoryAlert) alerts.push(memoryAlert);
            }

            // Check cache hit rate
            if (metricsData.cache?.hitRate !== undefined) {
                const cacheAlert = this.checkCacheHitRate(metricsData.cache.hitRate);
                if (cacheAlert) alerts.push(cacheAlert);
            }

            // Check throughput
            if (metricsData.performance?.throughput?.rps !== undefined) {
                const throughputAlert = this.checkThroughput(metricsData.performance.throughput.rps);
                if (throughputAlert) alerts.push(throughputAlert);
            }

            // Process all alerts
            for (const alert of alerts) {
                await this.processAlert(alert);
            }

            // Check for resolved alerts
            await this.checkResolvedAlerts(metricsData);

            return {
                processed: alerts.length,
                active: this.getActiveAlerts().length,
                total: this.alerts.size
            };

        } catch (error) {
            console.error('Alert processing error:', error);
            return { error: error.message };
        }
    }

    checkResponseTime(avgResponseTime) {
        const { warning, critical } = this.thresholds.responseTime;

        if (avgResponseTime >= critical) {
            return this.createAlert('response_time_critical', {
                severity: 'critical',
                metric: 'response_time',
                value: avgResponseTime,
                threshold: critical,
                message: `Critical response time: ${avgResponseTime}ms (threshold: ${critical}ms)`,
                autoRecovery: true
            });
        } else if (avgResponseTime >= warning) {
            return this.createAlert('response_time_warning', {
                severity: 'warning',
                metric: 'response_time',
                value: avgResponseTime,
                threshold: warning,
                message: `High response time: ${avgResponseTime}ms (threshold: ${warning}ms)`,
                autoRecovery: false
            });
        }

        return null;
    }

    checkErrorRate(errorRate) {
        const { warning, critical } = this.thresholds.errorRate;

        if (errorRate >= critical) {
            return this.createAlert('error_rate_critical', {
                severity: 'critical',
                metric: 'error_rate',
                value: errorRate,
                threshold: critical,
                message: `Critical error rate: ${errorRate}% (threshold: ${critical}%)`,
                autoRecovery: true
            });
        } else if (errorRate >= warning) {
            return this.createAlert('error_rate_warning', {
                severity: 'warning',
                metric: 'error_rate',
                value: errorRate,
                threshold: warning,
                message: `High error rate: ${errorRate}% (threshold: ${warning}%)`,
                autoRecovery: false
            });
        }

        return null;
    }

    checkMemoryUsage(memoryPercent) {
        const { warning, critical } = this.thresholds.memoryUsage;

        if (memoryPercent >= critical) {
            return this.createAlert('memory_critical', {
                severity: 'critical',
                metric: 'memory_usage',
                value: memoryPercent,
                threshold: critical,
                message: `Critical memory usage: ${memoryPercent.toFixed(1)}% (threshold: ${critical}%)`,
                autoRecovery: true
            });
        } else if (memoryPercent >= warning) {
            return this.createAlert('memory_warning', {
                severity: 'warning',
                metric: 'memory_usage',
                value: memoryPercent,
                threshold: warning,
                message: `High memory usage: ${memoryPercent.toFixed(1)}% (threshold: ${warning}%)`,
                autoRecovery: false
            });
        }

        return null;
    }

    checkCacheHitRate(hitRate) {
        const { warning, critical } = this.thresholds.cacheHitRate;

        if (hitRate <= critical) {
            return this.createAlert('cache_hit_rate_critical', {
                severity: 'critical',
                metric: 'cache_hit_rate',
                value: hitRate,
                threshold: critical,
                message: `Critical cache hit rate: ${hitRate}% (threshold: ${critical}%)`,
                autoRecovery: true
            });
        } else if (hitRate <= warning) {
            return this.createAlert('cache_hit_rate_warning', {
                severity: 'warning',
                metric: 'cache_hit_rate',
                value: hitRate,
                threshold: warning,
                message: `Low cache hit rate: ${hitRate}% (threshold: ${warning}%)`,
                autoRecovery: false
            });
        }

        return null;
    }

    checkThroughput(throughput) {
        const { warning, critical } = this.thresholds.throughput;

        if (throughput <= critical) {
            return this.createAlert('throughput_critical', {
                severity: 'critical',
                metric: 'throughput',
                value: throughput,
                threshold: critical,
                message: `Critical low throughput: ${throughput} req/s (threshold: ${critical} req/s)`,
                autoRecovery: true
            });
        } else if (throughput <= warning) {
            return this.createAlert('throughput_warning', {
                severity: 'warning',
                metric: 'throughput',
                value: throughput,
                threshold: warning,
                message: `Low throughput: ${throughput} req/s (threshold: ${warning} req/s)`,
                autoRecovery: false
            });
        }

        return null;
    }

    // ==================== ALERT MANAGEMENT ====================

    createAlert(id, alertData) {
        return {
            id,
            timestamp: Date.now(),
            resolved: false,
            resolvedAt: null,
            ...alertData
        };
    }

    async processAlert(alert) {
        const alertKey = `${alert.metric}_${alert.severity}`;

        // Check cooldown
        if (this.isInCooldown(alertKey)) {
            return { skipped: true, reason: 'cooldown' };
        }

        // Check rate limiting
        if (!this.checkRateLimit(alertKey)) {
            return { skipped: true, reason: 'rate_limit' };
        }

        // Check if alert already exists and is similar
        const existingAlert = this.alerts.get(alertKey);
        if (existingAlert && !existingAlert.resolved &&
            Math.abs(existingAlert.value - alert.value) < this.getValueThreshold(alert.metric)) {
            return { skipped: true, reason: 'duplicate' };
        }

        // Store alert
        this.alerts.set(alertKey, alert);
        this.alertHistory.push({ ...alert, processed: Date.now() });

        // Update metrics
        this.updateAlertMetrics(alert);

        // Set cooldown
        this.setCooldown(alertKey);

        // Emit alert event
        this.emit('alert', alert);

        // Send notifications
        await this.sendNotifications(alert);

        // Trigger auto-recovery if enabled
        if (alert.autoRecovery && this.config.enableAutoRecovery) {
            await this.triggerAutoRecovery(alert);
        }

        // Persist alerts
        if (this.config.enablePersistence) {
            this.persistAlerts();
        }

        console.log(`🚨 Alert triggered: ${alert.message}`);

        return { processed: true, alert };
    }

    async checkResolvedAlerts(currentMetrics) {
        const resolvedAlerts = [];

        for (const [key, alert] of this.alerts.entries()) {
            if (alert.resolved) continue;

            const isResolved = this.isAlertResolved(alert, currentMetrics);

            if (isResolved) {
                alert.resolved = true;
                alert.resolvedAt = Date.now();
                alert.resolutionTime = alert.resolvedAt - alert.timestamp;

                resolvedAlerts.push(alert);

                // Update metrics
                this.metrics.resolvedAlerts++;
                this.updateAverageResolutionTime(alert.resolutionTime);

                // Emit resolution event
                this.emit('alert_resolved', alert);

                console.log(`✅ Alert resolved: ${alert.message} (resolved in ${alert.resolutionTime}ms)`);
            }
        }

        return resolvedAlerts;
    }

    isAlertResolved(alert, currentMetrics) {
        switch (alert.metric) {
            case 'response_time':
                return currentMetrics.performance?.responseTime?.average < this.thresholds.responseTime.warning;

            case 'error_rate':
                return currentMetrics.performance?.errorRate < this.thresholds.errorRate.warning;

            case 'memory_usage':
                const memoryPercent = (currentMetrics.system?.memory?.heapUsed /
                                    currentMetrics.system?.memory?.heapTotal) * 100;
                return memoryPercent < this.thresholds.memoryUsage.warning;

            case 'cache_hit_rate':
                return currentMetrics.cache?.hitRate > this.thresholds.cacheHitRate.warning;

            case 'throughput':
                return currentMetrics.performance?.throughput?.rps > this.thresholds.throughput.warning;

            default:
                return false;
        }
    }

    // ==================== AUTO-RECOVERY ACTIONS ====================

    async triggerAutoRecovery(alert) {
        const actionKey = `${alert.metric}_${alert.severity}`;

        // Prevent multiple recovery actions for the same alert
        if (this.autoRecoveryActions.has(actionKey)) {
            return;
        }

        this.autoRecoveryActions.set(actionKey, Date.now());

        try {
            switch (alert.metric) {
                case 'memory_usage':
                    await this.performMemoryRecovery();
                    break;

                case 'cache_hit_rate':
                    await this.performCacheRecovery();
                    break;

                case 'response_time':
                    await this.performResponseTimeRecovery();
                    break;

                case 'error_rate':
                    await this.performErrorRecovery();
                    break;

                default:
                    console.log(`No auto-recovery action defined for metric: ${alert.metric}`);
            }

            console.log(`🔧 Auto-recovery triggered for: ${alert.message}`);
            this.emit('auto_recovery', { alert, action: alert.metric });

        } catch (error) {
            console.error('Auto-recovery failed:', error);
            this.emit('auto_recovery_failed', { alert, error: error.message });
        } finally {
            // Remove action lock after 10 minutes
            setTimeout(() => {
                this.autoRecoveryActions.delete(actionKey);
            }, 600000);
        }
    }

    async performMemoryRecovery() {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        // Clear non-essential caches
        this.emit('clear_optional_caches');

        console.log('🧹 Memory recovery actions performed');
    }

    async performCacheRecovery() {
        // Warm up caches
        this.emit('warmup_caches');

        console.log('🔄 Cache recovery actions performed');
    }

    async performResponseTimeRecovery() {
        // Enable aggressive caching
        this.emit('enable_aggressive_caching');

        // Reduce compression level temporarily
        this.emit('reduce_compression_level');

        console.log('⚡ Response time recovery actions performed');
    }

    async performErrorRecovery() {
        // Enable circuit breaker
        this.emit('enable_circuit_breaker');

        // Log detailed error information
        this.emit('enable_detailed_logging');

        console.log('🛡️ Error recovery actions performed');
    }

    // ==================== NOTIFICATIONS ====================

    async sendNotifications(alert) {
        const notifications = [];

        // Console notification (always enabled)
        notifications.push(this.sendConsoleNotification(alert));

        // Email notifications
        if (this.config.enableEmailNotifications) {
            notifications.push(this.sendEmailNotification(alert));
        }

        // Slack notifications
        if (this.config.enableSlackNotifications) {
            notifications.push(this.sendSlackNotification(alert));
        }

        // Web notifications
        this.emit('web_notification', alert);

        await Promise.allSettled(notifications);
    }

    sendConsoleNotification(alert) {
        const severityEmoji = alert.severity === 'critical' ? '🔴' : '🟡';
        console.log(`${severityEmoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
        return Promise.resolve();
    }

    async sendEmailNotification(alert) {
        // Placeholder for email notification implementation
        console.log(`📧 Email notification would be sent for: ${alert.message}`);
        return Promise.resolve();
    }

    async sendSlackNotification(alert) {
        // Placeholder for Slack notification implementation
        console.log(`📱 Slack notification would be sent for: ${alert.message}`);
        return Promise.resolve();
    }

    // ==================== UTILITY FUNCTIONS ====================

    isInCooldown(alertKey) {
        const cooldown = this.cooldowns.get(alertKey);
        return cooldown && Date.now() - cooldown < this.config.alertCooldown;
    }

    setCooldown(alertKey) {
        this.cooldowns.set(alertKey, Date.now());
    }

    checkRateLimit(alertKey) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);
        const rateLimitKey = `${alertKey}_${minute}`;

        const count = this.alertCounts.get(rateLimitKey) || 0;

        if (count >= this.config.maxAlertsPerMinute) {
            return false;
        }

        this.alertCounts.set(rateLimitKey, count + 1);

        // Clean up old rate limit counters
        setTimeout(() => {
            this.alertCounts.delete(rateLimitKey);
        }, 60000);

        return true;
    }

    getValueThreshold(metric) {
        const thresholds = {
            response_time: 10, // 10ms difference
            error_rate: 1,     // 1% difference
            memory_usage: 2,   // 2% difference
            cache_hit_rate: 5, // 5% difference
            throughput: 1      // 1 req/s difference
        };

        return thresholds[metric] || 1;
    }

    updateAlertMetrics(alert) {
        this.metrics.totalAlerts++;

        if (alert.severity === 'critical') {
            this.metrics.criticalAlerts++;
        } else if (alert.severity === 'warning') {
            this.metrics.warningAlerts++;
        }

        this.metrics.lastAlert = Date.now();
    }

    updateAverageResolutionTime(resolutionTime) {
        const totalResolved = this.metrics.resolvedAlerts;
        const currentAvg = this.metrics.averageResolutionTime;

        this.metrics.averageResolutionTime =
            ((currentAvg * (totalResolved - 1)) + resolutionTime) / totalResolved;
    }

    // ==================== DATA MANAGEMENT ====================

    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    }

    getAllAlerts() {
        return Array.from(this.alerts.values());
    }

    getAlertHistory(limit = 100) {
        return this.alertHistory.slice(-limit);
    }

    getMetrics() {
        return {
            ...this.metrics,
            activeAlerts: this.getActiveAlerts().length,
            totalStoredAlerts: this.alerts.size,
            uptime: Date.now() - this.metrics.uptime
        };
    }

    clearResolvedAlerts() {
        let cleared = 0;

        for (const [key, alert] of this.alerts.entries()) {
            if (alert.resolved && Date.now() - alert.resolvedAt > 3600000) { // 1 hour
                this.alerts.delete(key);
                cleared++;
            }
        }

        console.log(`🧹 Cleared ${cleared} resolved alerts`);
        return cleared;
    }

    // ==================== PERSISTENCE ====================

    persistAlerts() {
        if (!this.config.enablePersistence) return;

        try {
            const data = {
                alerts: Array.from(this.alerts.entries()),
                metrics: this.metrics,
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist alerts:', error);
        }
    }

    loadPersistedAlerts() {
        if (!this.config.enablePersistence) return;

        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                // Restore alerts (only active ones)
                if (data.alerts) {
                    data.alerts.forEach(([key, alert]) => {
                        if (!alert.resolved || Date.now() - alert.timestamp < 3600000) { // Keep alerts from last hour
                            this.alerts.set(key, alert);
                        }
                    });
                }

                // Restore metrics
                if (data.metrics) {
                    this.metrics = { ...this.metrics, ...data.metrics };
                }

                console.log(`📥 Loaded ${this.alerts.size} persisted alerts`);
            }
        } catch (error) {
            console.error('Failed to load persisted alerts:', error);
        }
    }

    // ==================== CLEANUP ====================

    setupCleanupInterval() {
        // Clean up old alerts every hour
        setInterval(() => {
            this.clearResolvedAlerts();

            // Clean up old cooldowns
            const now = Date.now();
            for (const [key, timestamp] of this.cooldowns.entries()) {
                if (now - timestamp > this.config.alertCooldown * 2) {
                    this.cooldowns.delete(key);
                }
            }

            // Clean up old rate limit counters
            const currentMinute = Math.floor(now / 60000);
            for (const key of this.alertCounts.keys()) {
                const minute = parseInt(key.split('_').pop());
                if (currentMinute - minute > 5) { // Keep last 5 minutes
                    this.alertCounts.delete(key);
                }
            }

            // Persist after cleanup
            if (this.config.enablePersistence) {
                this.persistAlerts();
            }

        }, 3600000); // Every hour
    }

    setupMetricsTracking() {
        // Update uptime tracking
        setInterval(() => {
            this.emit('metrics_update', this.getMetrics());
        }, 30000); // Every 30 seconds
    }

    // ==================== CONFIGURATION ====================

    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        console.log('📊 Alert thresholds updated');
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Alert configuration updated');
    }

    healthCheck() {
        const now = Date.now();
        const activeAlerts = this.getActiveAlerts();
        const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

        return {
            status: criticalAlerts.length > 0 ? 'critical' :
                   activeAlerts.length > 5 ? 'degraded' : 'healthy',
            activeAlerts: activeAlerts.length,
            criticalAlerts: criticalAlerts.length,
            uptime: now - this.metrics.uptime,
            lastAlert: this.metrics.lastAlert ? now - this.metrics.lastAlert : null,
            averageResolutionTime: this.metrics.averageResolutionTime,
            recommendations: this.generateRecommendations(activeAlerts)
        };
    }

    generateRecommendations(activeAlerts) {
        const recommendations = [];

        if (activeAlerts.length > 10) {
            recommendations.push('Consider reviewing alert thresholds - high alert volume detected');
        }

        const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push('Critical alerts require immediate attention');
        }

        const oldAlerts = activeAlerts.filter(alert => Date.now() - alert.timestamp > 1800000); // 30 minutes
        if (oldAlerts.length > 0) {
            recommendations.push(`${oldAlerts.length} alerts have been active for over 30 minutes`);
        }

        return recommendations;
    }
}

module.exports = AlertManager;