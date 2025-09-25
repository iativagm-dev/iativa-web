/**
 * Automated Health Monitor - Production System Monitoring
 * Comprehensive health monitoring with intelligent alerting, predictive analysis, and automated recovery
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class AutomatedHealthMonitor extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            // Monitoring intervals
            healthCheckInterval: options.healthCheckInterval || 30000,      // 30 seconds
            deepHealthInterval: options.deepHealthInterval || 300000,       // 5 minutes
            trendAnalysisInterval: options.trendAnalysisInterval || 900000, // 15 minutes

            // Alert thresholds
            criticalResponseTime: options.criticalResponseTime || 5000,     // 5 seconds
            warningResponseTime: options.warningResponseTime || 2000,       // 2 seconds
            errorRateThreshold: options.errorRateThreshold || 5,            // 5%
            memoryThreshold: options.memoryThreshold || 85,                 // 85%
            cpuThreshold: options.cpuThreshold || 80,                       // 80%

            // Advanced features
            predictiveAnalysis: options.predictiveAnalysis !== false,
            anomalyDetection: options.anomalyDetection !== false,
            autoRecovery: options.autoRecovery !== false,
            escalationRules: options.escalationRules !== false,

            // Alert channels
            enableConsoleAlerts: options.enableConsoleAlerts !== false,
            enableFileLogging: options.enableFileLogging !== false,
            enableWebhookAlerts: options.enableWebhookAlerts || false,
            enableEmailAlerts: options.enableEmailAlerts || false,

            // Persistence
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/health-monitor.json'),
            alertHistoryFile: options.alertHistoryFile || path.join(__dirname, '../../logs/performance/health-alerts.log'),

            ...options
        };

        // Health monitoring systems
        this.healthCheckers = new Map();      // component -> health checker
        this.alertRules = new Map();          // rule_id -> alert rule
        this.activeAlerts = new Map();        // alert_id -> alert data
        this.alertHistory = [];               // Historical alerts
        this.escalationTimers = new Map();    // alert_id -> timeout

        // Health metrics and trends
        this.systemMetrics = {
            responseTime: { current: 0, trend: [], avg: 0 },
            errorRate: { current: 0, trend: [], avg: 0 },
            memoryUsage: { current: 0, trend: [], avg: 0 },
            cpuUsage: { current: 0, trend: [], avg: 0 },
            throughput: { current: 0, trend: [], avg: 0 },
            uptime: process.uptime() * 1000,
            lastUpdate: Date.now()
        };

        // Component health status
        this.componentHealth = new Map();
        this.healthHistory = new Map();       // component -> health timeline

        // Anomaly detection
        this.anomalyBaselines = new Map();    // metric -> baseline data
        this.anomalyBuffer = new Map();       // metric -> recent values

        // Recovery actions
        this.recoveryActions = new Map();     // action_type -> recovery function
        this.recoveryHistory = [];            // Recovery attempt history

        // Alert management
        this.alertCooldowns = new Map();      // alert_type -> cooldown timestamp
        this.alertSuppressions = new Set();   // Suppressed alert types

        this.init();
    }

    async init() {
        console.log('🏥 Initializing Automated Health Monitor...');

        this.registerHealthCheckers();
        this.defineAlertRules();
        this.registerRecoveryActions();
        await this.loadPersistedData();
        this.startMonitoring();
        this.setupAnomalyDetection();

        console.log('✅ Automated Health Monitor active');
    }

    // ==================== HEALTH CHECKING SYSTEM ====================

    registerHealthCheckers() {
        // System resource health checker
        this.healthCheckers.set('system_resources', {
            name: 'System Resources',
            check: this.checkSystemResources.bind(this),
            critical: true,
            interval: 30000 // 30 seconds
        });

        // Database connectivity (placeholder)
        this.healthCheckers.set('database', {
            name: 'Database Connectivity',
            check: this.checkDatabaseHealth.bind(this),
            critical: true,
            interval: 60000 // 1 minute
        });

        // Cache system health
        this.healthCheckers.set('cache_system', {
            name: 'Cache System',
            check: this.checkCacheHealth.bind(this),
            critical: false,
            interval: 120000 // 2 minutes
        });

        // API response health
        this.healthCheckers.set('api_response', {
            name: 'API Response Performance',
            check: this.checkAPIResponseHealth.bind(this),
            critical: true,
            interval: 30000 // 30 seconds
        });

        // Business logic health
        this.healthCheckers.set('business_logic', {
            name: 'Business Logic Components',
            check: this.checkBusinessLogicHealth.bind(this),
            critical: true,
            interval: 60000 // 1 minute
        });

        // External dependencies
        this.healthCheckers.set('external_deps', {
            name: 'External Dependencies',
            check: this.checkExternalDependencies.bind(this),
            critical: false,
            interval: 300000 // 5 minutes
        });
    }

    async runHealthCheck(componentId) {
        const checker = this.healthCheckers.get(componentId);
        if (!checker) {
            throw new Error(`Unknown health checker: ${componentId}`);
        }

        const startTime = Date.now();

        try {
            const result = await Promise.race([
                checker.check(),
                this.createTimeoutPromise(10000) // 10 second timeout
            ]);

            const responseTime = Date.now() - startTime;

            const healthData = {
                componentId,
                name: checker.name,
                status: result.status || 'healthy',
                message: result.message || 'OK',
                metrics: result.metrics || {},
                responseTime,
                timestamp: Date.now(),
                critical: checker.critical
            };

            this.updateComponentHealth(componentId, healthData);

            return healthData;

        } catch (error) {
            const responseTime = Date.now() - startTime;

            const healthData = {
                componentId,
                name: checker.name,
                status: 'unhealthy',
                message: error.message,
                error: true,
                responseTime,
                timestamp: Date.now(),
                critical: checker.critical
            };

            this.updateComponentHealth(componentId, healthData);

            return healthData;
        }
    }

    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Health check timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }

    // ==================== HEALTH CHECKER IMPLEMENTATIONS ====================

    async checkSystemResources() {
        const memUsage = process.memoryUsage();
        const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        // Simple CPU approximation (in production, use proper CPU monitoring)
        const loadAverage = this.calculateLoadAverage();

        this.systemMetrics.memoryUsage.current = memPercentage;
        this.systemMetrics.cpuUsage.current = loadAverage;

        let status = 'healthy';
        let issues = [];

        if (memPercentage > this.config.memoryThreshold) {
            status = 'degraded';
            issues.push(`High memory usage: ${memPercentage.toFixed(1)}%`);
        }

        if (loadAverage > this.config.cpuThreshold) {
            status = 'degraded';
            issues.push(`High CPU load: ${loadAverage.toFixed(1)}%`);
        }

        if (memPercentage > 95 || loadAverage > 90) {
            status = 'critical';
        }

        return {
            status,
            message: issues.length > 0 ? issues.join(', ') : 'System resources normal',
            metrics: {
                memoryUsage: memPercentage,
                cpuUsage: loadAverage,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal
            }
        };
    }

    async checkDatabaseHealth() {
        // Placeholder for database health check
        // In production, this would test actual database connectivity
        const latency = Math.random() * 100; // Simulated latency

        return {
            status: latency < 200 ? 'healthy' : 'degraded',
            message: `Database latency: ${latency.toFixed(0)}ms`,
            metrics: {
                latency,
                connectionPool: 'healthy'
            }
        };
    }

    async checkCacheHealth() {
        // Placeholder for cache health check
        const hitRate = 75 + Math.random() * 20; // Simulated hit rate

        return {
            status: hitRate > 60 ? 'healthy' : 'degraded',
            message: `Cache hit rate: ${hitRate.toFixed(1)}%`,
            metrics: {
                hitRate,
                size: 'within_limits'
            }
        };
    }

    async checkAPIResponseHealth() {
        // Check recent API response metrics
        const avgResponseTime = this.systemMetrics.responseTime.avg;
        const errorRate = this.systemMetrics.errorRate.current;

        let status = 'healthy';
        let issues = [];

        if (avgResponseTime > this.config.criticalResponseTime) {
            status = 'critical';
            issues.push(`Critical response time: ${avgResponseTime}ms`);
        } else if (avgResponseTime > this.config.warningResponseTime) {
            status = 'degraded';
            issues.push(`Elevated response time: ${avgResponseTime}ms`);
        }

        if (errorRate > this.config.errorRateThreshold) {
            status = status === 'critical' ? 'critical' : 'degraded';
            issues.push(`High error rate: ${errorRate}%`);
        }

        return {
            status,
            message: issues.length > 0 ? issues.join(', ') : 'API responses healthy',
            metrics: {
                avgResponseTime,
                errorRate,
                throughput: this.systemMetrics.throughput.current
            }
        };
    }

    async checkBusinessLogicHealth() {
        // Check health of business logic components
        const issues = [];
        let overallStatus = 'healthy';

        // This would integrate with actual business logic health checks
        const components = {
            'intelligent_costing': Math.random() > 0.05,
            'recommendation_engine': Math.random() > 0.03,
            'cost_validation': Math.random() > 0.02,
            'analytics_engine': Math.random() > 0.07
        };

        for (const [component, isHealthy] of Object.entries(components)) {
            if (!isHealthy) {
                issues.push(`${component} failing`);
                overallStatus = 'degraded';
            }
        }

        if (issues.length > 2) {
            overallStatus = 'critical';
        }

        return {
            status: overallStatus,
            message: issues.length > 0 ? issues.join(', ') : 'Business logic components healthy',
            metrics: {
                healthyComponents: Object.values(components).filter(h => h).length,
                totalComponents: Object.keys(components).length
            }
        };
    }

    async checkExternalDependencies() {
        // Check external service dependencies
        const dependencies = {
            'payment_service': await this.pingExternalService('payment'),
            'analytics_service': await this.pingExternalService('analytics'),
            'notification_service': await this.pingExternalService('notification')
        };

        const healthyDeps = Object.values(dependencies).filter(d => d.healthy).length;
        const totalDeps = Object.keys(dependencies).length;

        let status = 'healthy';
        if (healthyDeps < totalDeps * 0.5) status = 'critical';
        else if (healthyDeps < totalDeps * 0.8) status = 'degraded';

        return {
            status,
            message: `${healthyDeps}/${totalDeps} external dependencies healthy`,
            metrics: {
                healthyDependencies: healthyDeps,
                totalDependencies: totalDeps,
                dependencies
            }
        };
    }

    async pingExternalService(serviceName) {
        // Simulate external service ping
        const latency = Math.random() * 500;
        const isHealthy = Math.random() > 0.1; // 90% uptime simulation

        return {
            healthy: isHealthy && latency < 300,
            latency,
            lastCheck: Date.now()
        };
    }

    // ==================== ALERT SYSTEM ====================

    defineAlertRules() {
        // Critical system alerts
        this.alertRules.set('critical_response_time', {
            name: 'Critical Response Time',
            condition: (metrics) => metrics.responseTime.current > this.config.criticalResponseTime,
            severity: 'critical',
            cooldown: 300000, // 5 minutes
            escalation: true,
            message: 'System response time is critically high'
        });

        this.alertRules.set('high_error_rate', {
            name: 'High Error Rate',
            condition: (metrics) => metrics.errorRate.current > this.config.errorRateThreshold,
            severity: 'warning',
            cooldown: 600000, // 10 minutes
            escalation: true,
            message: 'Error rate is above acceptable threshold'
        });

        this.alertRules.set('memory_pressure', {
            name: 'Memory Pressure',
            condition: (metrics) => metrics.memoryUsage.current > this.config.memoryThreshold,
            severity: 'warning',
            cooldown: 180000, // 3 minutes
            escalation: false,
            message: 'System memory usage is high'
        });

        this.alertRules.set('component_failure', {
            name: 'Component Failure',
            condition: () => this.hasCriticalComponentFailures(),
            severity: 'critical',
            cooldown: 60000, // 1 minute
            escalation: true,
            message: 'Critical system component has failed'
        });

        this.alertRules.set('degraded_performance', {
            name: 'Degraded Performance',
            condition: (metrics) => this.isPerformanceDegraded(metrics),
            severity: 'warning',
            cooldown: 900000, // 15 minutes
            escalation: false,
            message: 'System performance has degraded'
        });

        this.alertRules.set('anomaly_detected', {
            name: 'Anomaly Detected',
            condition: () => this.hasActiveAnomalies(),
            severity: 'info',
            cooldown: 1800000, // 30 minutes
            escalation: false,
            message: 'Performance anomaly detected'
        });
    }

    async evaluateAlerts() {
        for (const [ruleId, rule] of this.alertRules) {
            try {
                const shouldAlert = rule.condition(this.systemMetrics, this.componentHealth);

                if (shouldAlert) {
                    await this.triggerAlert(ruleId, rule);
                } else {
                    // Check if we should clear an existing alert
                    const existingAlert = this.activeAlerts.get(ruleId);
                    if (existingAlert) {
                        await this.clearAlert(ruleId);
                    }
                }
            } catch (error) {
                console.error(`Error evaluating alert rule ${ruleId}:`, error);
            }
        }
    }

    async triggerAlert(ruleId, rule) {
        // Check cooldown
        if (this.isInCooldown(ruleId)) {
            return;
        }

        // Check if suppressed
        if (this.alertSuppressions.has(ruleId)) {
            return;
        }

        const alertId = this.generateAlertId();
        const alertData = {
            id: alertId,
            ruleId,
            name: rule.name,
            message: rule.message,
            severity: rule.severity,
            timestamp: Date.now(),
            resolved: false,
            escalated: false,
            context: this.gatherAlertContext()
        };

        // Store active alert
        this.activeAlerts.set(ruleId, alertData);

        // Add to history
        this.alertHistory.push(alertData);

        // Set cooldown
        this.setCooldown(ruleId, rule.cooldown);

        // Send alert notifications
        await this.sendAlert(alertData);

        // Setup escalation if needed
        if (rule.escalation) {
            this.setupEscalation(alertId, rule);
        }

        // Trigger auto-recovery if configured
        if (this.config.autoRecovery && rule.severity === 'critical') {
            await this.triggerAutoRecovery(alertData);
        }

        this.emit('alert_triggered', alertData);

        console.log(`🚨 Alert triggered: ${rule.name} (${rule.severity})`);
    }

    async clearAlert(ruleId) {
        const alert = this.activeAlerts.get(ruleId);
        if (!alert) return;

        alert.resolved = true;
        alert.resolvedAt = Date.now();
        alert.duration = alert.resolvedAt - alert.timestamp;

        // Remove from active alerts
        this.activeAlerts.delete(ruleId);

        // Clear escalation timer
        if (this.escalationTimers.has(alert.id)) {
            clearTimeout(this.escalationTimers.get(alert.id));
            this.escalationTimers.delete(alert.id);
        }

        this.emit('alert_cleared', alert);

        console.log(`✅ Alert cleared: ${alert.name}`);

        // Send resolution notification
        await this.sendAlertResolution(alert);
    }

    // ==================== ALERT NOTIFICATIONS ====================

    async sendAlert(alertData) {
        const notifications = [];

        if (this.config.enableConsoleAlerts) {
            notifications.push(this.sendConsoleAlert(alertData));
        }

        if (this.config.enableFileLogging) {
            notifications.push(this.logAlertToFile(alertData));
        }

        if (this.config.enableWebhookAlerts) {
            notifications.push(this.sendWebhookAlert(alertData));
        }

        if (this.config.enableEmailAlerts) {
            notifications.push(this.sendEmailAlert(alertData));
        }

        await Promise.allSettled(notifications);
    }

    async sendConsoleAlert(alertData) {
        const emoji = {
            'critical': '🔴',
            'warning': '🟡',
            'info': '🔵'
        };

        console.log(`${emoji[alertData.severity]} ALERT [${alertData.severity.toUpperCase()}]: ${alertData.message}`);
        if (alertData.context.details) {
            console.log(`   Details: ${alertData.context.details}`);
        }
    }

    async logAlertToFile(alertData) {
        try {
            const logEntry = {
                timestamp: new Date(alertData.timestamp).toISOString(),
                id: alertData.id,
                severity: alertData.severity,
                name: alertData.name,
                message: alertData.message,
                context: alertData.context
            };

            const logLine = JSON.stringify(logEntry) + '\n';

            const logDir = path.dirname(this.config.alertHistoryFile);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            fs.appendFileSync(this.config.alertHistoryFile, logLine);
        } catch (error) {
            console.error('Failed to log alert to file:', error);
        }
    }

    async sendWebhookAlert(alertData) {
        // Placeholder for webhook alert implementation
        console.log(`📡 Webhook alert would be sent: ${alertData.name}`);
    }

    async sendEmailAlert(alertData) {
        // Placeholder for email alert implementation
        console.log(`📧 Email alert would be sent: ${alertData.name}`);
    }

    async sendAlertResolution(alertData) {
        if (this.config.enableConsoleAlerts) {
            console.log(`✅ RESOLVED: ${alertData.name} (duration: ${this.formatDuration(alertData.duration)})`);
        }

        if (this.config.enableFileLogging) {
            const resolutionEntry = {
                timestamp: new Date().toISOString(),
                type: 'resolution',
                alertId: alertData.id,
                name: alertData.name,
                duration: alertData.duration
            };

            const logLine = JSON.stringify(resolutionEntry) + '\n';
            fs.appendFileSync(this.config.alertHistoryFile, logLine);
        }
    }

    // ==================== ESCALATION SYSTEM ====================

    setupEscalation(alertId, rule) {
        const escalationDelay = this.calculateEscalationDelay(rule.severity);

        const timer = setTimeout(async () => {
            await this.escalateAlert(alertId);
        }, escalationDelay);

        this.escalationTimers.set(alertId, timer);
    }

    async escalateAlert(alertId) {
        const alert = Array.from(this.activeAlerts.values()).find(a => a.id === alertId);
        if (!alert || alert.escalated) return;

        alert.escalated = true;
        alert.escalatedAt = Date.now();

        console.log(`⬆️ Escalating alert: ${alert.name}`);

        // Send escalated notifications (higher priority channels)
        await this.sendEscalatedAlert(alert);

        this.emit('alert_escalated', alert);
    }

    async sendEscalatedAlert(alertData) {
        console.log(`🚨 ESCALATED ALERT [${alertData.severity.toUpperCase()}]: ${alertData.message}`);

        // In production, this would trigger high-priority notifications:
        // - SMS alerts
        // - Phone calls
        // - Slack/Teams notifications
        // - PagerDuty integration
    }

    calculateEscalationDelay(severity) {
        switch (severity) {
            case 'critical': return 5 * 60 * 1000;  // 5 minutes
            case 'warning': return 15 * 60 * 1000;  // 15 minutes
            case 'info': return 60 * 60 * 1000;     // 1 hour
            default: return 15 * 60 * 1000;
        }
    }

    // ==================== AUTO RECOVERY SYSTEM ====================

    registerRecoveryActions() {
        this.recoveryActions.set('restart_service', {
            name: 'Restart Service',
            action: this.restartService.bind(this),
            risk: 'medium'
        });

        this.recoveryActions.set('clear_cache', {
            name: 'Clear Cache',
            action: this.clearSystemCache.bind(this),
            risk: 'low'
        });

        this.recoveryActions.set('garbage_collect', {
            name: 'Force Garbage Collection',
            action: this.forceGarbageCollection.bind(this),
            risk: 'low'
        });

        this.recoveryActions.set('scale_resources', {
            name: 'Scale Resources',
            action: this.scaleResources.bind(this),
            risk: 'low'
        });

        this.recoveryActions.set('circuit_breaker_reset', {
            name: 'Reset Circuit Breakers',
            action: this.resetCircuitBreakers.bind(this),
            risk: 'medium'
        });
    }

    async triggerAutoRecovery(alertData) {
        console.log(`🔧 Triggering auto-recovery for: ${alertData.name}`);

        const recoveryPlan = this.createRecoveryPlan(alertData);

        for (const action of recoveryPlan) {
            try {
                await this.executeRecoveryAction(action, alertData);
            } catch (error) {
                console.error(`Recovery action failed: ${action.name}`, error);
            }
        }
    }

    createRecoveryPlan(alertData) {
        const plan = [];

        // Memory pressure recovery
        if (alertData.ruleId === 'memory_pressure') {
            plan.push(this.recoveryActions.get('garbage_collect'));
            plan.push(this.recoveryActions.get('clear_cache'));
        }

        // Response time issues
        if (alertData.ruleId === 'critical_response_time') {
            plan.push(this.recoveryActions.get('clear_cache'));
            plan.push(this.recoveryActions.get('circuit_breaker_reset'));
        }

        // Component failures
        if (alertData.ruleId === 'component_failure') {
            plan.push(this.recoveryActions.get('restart_service'));
        }

        return plan.filter(Boolean);
    }

    async executeRecoveryAction(action, alertData) {
        const recoveryAttempt = {
            id: this.generateRecoveryId(),
            alertId: alertData.id,
            actionName: action.name,
            startTime: Date.now(),
            status: 'running'
        };

        this.recoveryHistory.push(recoveryAttempt);

        try {
            await action.action(alertData);

            recoveryAttempt.status = 'success';
            recoveryAttempt.endTime = Date.now();
            recoveryAttempt.duration = recoveryAttempt.endTime - recoveryAttempt.startTime;

            console.log(`✅ Recovery action completed: ${action.name}`);

        } catch (error) {
            recoveryAttempt.status = 'failed';
            recoveryAttempt.endTime = Date.now();
            recoveryAttempt.error = error.message;

            console.error(`❌ Recovery action failed: ${action.name}`, error);
        }
    }

    // ==================== RECOVERY ACTION IMPLEMENTATIONS ====================

    async restartService(alertData) {
        console.log('🔄 Simulating service restart...');
        // In production, this would restart specific services
        await this.simulateDelay(2000);
        this.emit('service_restarted', { reason: alertData.ruleId });
    }

    async clearSystemCache(alertData) {
        console.log('🧹 Clearing system caches...');
        this.emit('cache_cleared', { reason: alertData.ruleId });
    }

    async forceGarbageCollection(alertData) {
        console.log('🗑️ Forcing garbage collection...');
        if (global.gc) {
            global.gc();
        }
        this.emit('gc_forced', { reason: alertData.ruleId });
    }

    async scaleResources(alertData) {
        console.log('📈 Scaling resources...');
        // In production, this would scale up resources (containers, instances, etc.)
        this.emit('resources_scaled', { reason: alertData.ruleId });
    }

    async resetCircuitBreakers(alertData) {
        console.log('⚡ Resetting circuit breakers...');
        this.emit('circuit_breakers_reset', { reason: alertData.ruleId });
    }

    // ==================== ANOMALY DETECTION ====================

    setupAnomalyDetection() {
        if (!this.config.anomalyDetection) return;

        // Analyze metrics for anomalies every 5 minutes
        setInterval(() => {
            this.detectAnomalies();
        }, 5 * 60 * 1000);
    }

    detectAnomalies() {
        const metricsToAnalyze = [
            'responseTime',
            'errorRate',
            'memoryUsage',
            'cpuUsage',
            'throughput'
        ];

        for (const metric of metricsToAnalyze) {
            this.analyzeMetricForAnomalies(metric);
        }
    }

    analyzeMetricForAnomalies(metricName) {
        const metricData = this.systemMetrics[metricName];
        if (!metricData || metricData.trend.length < 10) return;

        // Calculate baseline statistics
        const baseline = this.getOrCreateBaseline(metricName);
        const currentValue = metricData.current;

        // Z-score anomaly detection
        const zScore = Math.abs((currentValue - baseline.mean) / baseline.stdDev);

        if (zScore > 3) { // 3 standard deviations
            this.recordAnomaly(metricName, {
                value: currentValue,
                zScore,
                baseline: baseline.mean,
                deviation: currentValue - baseline.mean,
                timestamp: Date.now()
            });
        }

        // Update baseline with new data
        this.updateBaseline(metricName, currentValue);
    }

    getOrCreateBaseline(metricName) {
        if (!this.anomalyBaselines.has(metricName)) {
            this.anomalyBaselines.set(metricName, {
                mean: 0,
                stdDev: 1,
                count: 0,
                sumSquares: 0
            });
        }

        return this.anomalyBaselines.get(metricName);
    }

    updateBaseline(metricName, newValue) {
        const baseline = this.getOrCreateBaseline(metricName);

        // Update running statistics
        baseline.count++;
        const oldMean = baseline.mean;
        baseline.mean = oldMean + (newValue - oldMean) / baseline.count;

        baseline.sumSquares += (newValue - oldMean) * (newValue - baseline.mean);

        if (baseline.count > 1) {
            const variance = baseline.sumSquares / (baseline.count - 1);
            baseline.stdDev = Math.sqrt(variance);
        }
    }

    recordAnomaly(metricName, anomalyData) {
        if (!this.anomalyBuffer.has(metricName)) {
            this.anomalyBuffer.set(metricName, []);
        }

        const anomalies = this.anomalyBuffer.get(metricName);
        anomalies.push(anomalyData);

        // Keep only recent anomalies
        const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
        this.anomalyBuffer.set(metricName,
            anomalies.filter(a => a.timestamp > cutoff)
        );

        console.log(`🔍 Anomaly detected in ${metricName}: ${anomalyData.value} (z-score: ${anomalyData.zScore.toFixed(2)})`);

        this.emit('anomaly_detected', {
            metric: metricName,
            anomaly: anomalyData
        });
    }

    hasActiveAnomalies() {
        for (const anomalies of this.anomalyBuffer.values()) {
            if (anomalies.length > 0) return true;
        }
        return false;
    }

    // ==================== MONITORING LOOP ====================

    startMonitoring() {
        // Main health check loop
        setInterval(async () => {
            await this.runAllHealthChecks();
        }, this.config.healthCheckInterval);

        // Deep health analysis
        setInterval(async () => {
            await this.runDeepHealthAnalysis();
        }, this.config.deepHealthInterval);

        // Trend analysis
        setInterval(() => {
            this.analyzeTrends();
        }, this.config.trendAnalysisInterval);

        // Alert evaluation
        setInterval(async () => {
            await this.evaluateAlerts();
        }, 60000); // Every minute

        // Initial health check
        setTimeout(async () => {
            await this.runAllHealthChecks();
        }, 5000);
    }

    async runAllHealthChecks() {
        const results = [];

        for (const componentId of this.healthCheckers.keys()) {
            try {
                const result = await this.runHealthCheck(componentId);
                results.push(result);
            } catch (error) {
                console.error(`Health check failed for ${componentId}:`, error);
            }
        }

        // Update system metrics
        this.updateSystemMetrics(results);

        return results;
    }

    async runDeepHealthAnalysis() {
        console.log('🔬 Running deep health analysis...');

        // Analyze component trends
        for (const [componentId, history] of this.healthHistory) {
            const trend = this.analyzeComponentTrend(history);
            if (trend.degrading) {
                console.log(`📉 Component ${componentId} showing degradation trend`);
            }
        }

        // Check for resource leaks
        const memoryTrend = this.systemMetrics.memoryUsage.trend.slice(-10);
        if (this.isIncreasingTrend(memoryTrend)) {
            console.log('⚠️ Potential memory leak detected');
        }

        // Analyze error patterns
        this.analyzeErrorPatterns();
    }

    analyzeTrends() {
        const metrics = ['responseTime', 'errorRate', 'memoryUsage', 'cpuUsage'];

        for (const metric of metrics) {
            const trend = this.calculateTrend(this.systemMetrics[metric].trend);

            if (trend.direction === 'increasing' && trend.confidence > 0.8) {
                console.log(`📈 Increasing trend detected in ${metric}: ${trend.slope.toFixed(3)}/min`);
            }
        }
    }

    // ==================== UTILITY FUNCTIONS ====================

    updateComponentHealth(componentId, healthData) {
        this.componentHealth.set(componentId, healthData);

        // Update health history
        if (!this.healthHistory.has(componentId)) {
            this.healthHistory.set(componentId, []);
        }

        const history = this.healthHistory.get(componentId);
        history.push({
            status: healthData.status,
            responseTime: healthData.responseTime,
            timestamp: healthData.timestamp
        });

        // Keep last 100 entries
        if (history.length > 100) {
            history.shift();
        }
    }

    updateSystemMetrics(healthResults) {
        // Extract metrics from health check results
        const apiResult = healthResults.find(r => r.componentId === 'api_response');
        const sysResult = healthResults.find(r => r.componentId === 'system_resources');

        if (apiResult && apiResult.metrics) {
            this.updateMetricTrend('responseTime', apiResult.metrics.avgResponseTime);
            this.updateMetricTrend('errorRate', apiResult.metrics.errorRate);
            this.updateMetricTrend('throughput', apiResult.metrics.throughput);
        }

        if (sysResult && sysResult.metrics) {
            this.updateMetricTrend('memoryUsage', sysResult.metrics.memoryUsage);
            this.updateMetricTrend('cpuUsage', sysResult.metrics.cpuUsage);
        }

        this.systemMetrics.lastUpdate = Date.now();
    }

    updateMetricTrend(metricName, value) {
        if (value === undefined || value === null) return;

        const metric = this.systemMetrics[metricName];
        metric.current = value;
        metric.trend.push({ value, timestamp: Date.now() });

        // Keep last 100 data points
        if (metric.trend.length > 100) {
            metric.trend.shift();
        }

        // Update average
        if (metric.trend.length > 0) {
            metric.avg = metric.trend.reduce((sum, item) => sum + item.value, 0) / metric.trend.length;
        }
    }

    calculateTrend(dataPoints) {
        if (dataPoints.length < 5) {
            return { direction: 'insufficient_data', confidence: 0 };
        }

        // Simple linear regression
        const n = dataPoints.length;
        const recent = dataPoints.slice(-Math.min(20, n));

        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        recent.forEach((point, index) => {
            const x = index;
            const y = point.value;

            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const correlation = Math.abs(slope) / (1 + Math.abs(slope)); // Normalized confidence

        return {
            direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
            slope,
            confidence: correlation
        };
    }

    isIncreasingTrend(dataPoints) {
        if (dataPoints.length < 5) return false;

        const trend = this.calculateTrend(dataPoints.map((v, i) => ({ value: v, timestamp: i })));
        return trend.direction === 'increasing' && trend.confidence > 0.7;
    }

    analyzeComponentTrend(history) {
        if (history.length < 10) return { degrading: false };

        const recentHealth = history.slice(-10);
        const unhealthyCount = recentHealth.filter(h => h.status !== 'healthy').length;

        return {
            degrading: unhealthyCount > 3,
            unhealthyRatio: unhealthyCount / recentHealth.length
        };
    }

    analyzeErrorPatterns() {
        // Placeholder for error pattern analysis
        // This would analyze error logs and identify patterns
    }

    hasCriticalComponentFailures() {
        for (const [componentId, health] of this.componentHealth) {
            const checker = this.healthCheckers.get(componentId);
            if (checker?.critical && health.status === 'critical') {
                return true;
            }
        }
        return false;
    }

    isPerformanceDegraded(metrics) {
        const degradationIndicators = [
            metrics.responseTime.current > this.config.warningResponseTime * 1.5,
            metrics.errorRate.current > this.config.errorRateThreshold * 0.7,
            metrics.memoryUsage.current > this.config.memoryThreshold * 0.9
        ];

        return degradationIndicators.filter(Boolean).length >= 2;
    }

    calculateLoadAverage() {
        // Simplified load calculation
        // In production, use proper system monitoring libraries
        return Math.random() * 100;
    }

    isInCooldown(ruleId) {
        const cooldownTime = this.alertCooldowns.get(ruleId);
        return cooldownTime && Date.now() - cooldownTime < 0;
    }

    setCooldown(ruleId, cooldownMs) {
        this.alertCooldowns.set(ruleId, Date.now() + cooldownMs);
    }

    gatherAlertContext() {
        return {
            systemMetrics: this.systemMetrics,
            componentHealth: Array.from(this.componentHealth.entries()),
            activeRequests: process.env.ACTIVE_REQUESTS || 0,
            uptime: process.uptime(),
            nodeVersion: process.version,
            details: 'System health monitoring detected an issue'
        };
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    generateRecoveryId() {
        return `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== PUBLIC API ====================

    getSystemHealth() {
        return {
            overall: this.calculateOverallHealth(),
            components: Array.from(this.componentHealth.entries()),
            metrics: this.systemMetrics,
            activeAlerts: Array.from(this.activeAlerts.values()),
            uptime: process.uptime() * 1000,
            lastUpdate: this.systemMetrics.lastUpdate
        };
    }

    getAlertHistory(limit = 50) {
        return this.alertHistory
            .slice(-limit)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    getRecoveryHistory(limit = 20) {
        return this.recoveryHistory
            .slice(-limit)
            .sort((a, b) => b.startTime - a.startTime);
    }

    suppressAlert(ruleId, durationMs = 3600000) {
        this.alertSuppressions.add(ruleId);

        setTimeout(() => {
            this.alertSuppressions.delete(ruleId);
        }, durationMs);

        console.log(`🔇 Alert suppressed: ${ruleId} for ${this.formatDuration(durationMs)}`);
    }

    calculateOverallHealth() {
        const componentStates = Array.from(this.componentHealth.values());

        if (componentStates.some(c => c.status === 'critical' && c.critical)) {
            return 'critical';
        }

        if (componentStates.some(c => c.status === 'degraded')) {
            return 'degraded';
        }

        return 'healthy';
    }

    // ==================== PERSISTENCE ====================

    async loadPersistedData() {
        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                if (data.alertHistory) {
                    this.alertHistory = data.alertHistory.slice(-100); // Keep last 100
                }

                if (data.recoveryHistory) {
                    this.recoveryHistory = data.recoveryHistory.slice(-50); // Keep last 50
                }

                console.log('📥 Loaded health monitor data');
            }
        } catch (error) {
            console.error('Failed to load health monitor data:', error);
        }
    }

    async persistData() {
        try {
            const data = {
                alertHistory: this.alertHistory.slice(-100),
                recoveryHistory: this.recoveryHistory.slice(-50),
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist health monitor data:', error);
        }
    }
}

module.exports = AutomatedHealthMonitor;