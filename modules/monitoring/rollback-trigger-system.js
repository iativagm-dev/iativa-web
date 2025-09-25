/**
 * Automatic Rollback Trigger System
 * Monitors system metrics and triggers automatic rollbacks based on configurable criteria
 */

const ProductionAlertSystem = require('../alerting/alert-system');

class RollbackTriggerSystem {
    constructor(config = {}) {
        this.config = {
            // Rollback trigger thresholds
            triggers: {
                accuracy: {
                    enabled: true,
                    criticalThreshold: 70,      // Accuracy below 70% triggers immediate rollback
                    warningThreshold: 80,       // Accuracy below 80% triggers warning
                    sustainedPeriodMs: 300000,  // 5 minutes of sustained low accuracy
                    checkIntervalMs: 30000      // Check every 30 seconds
                },
                errorRate: {
                    enabled: true,
                    criticalThreshold: 10,      // Error rate above 10% triggers immediate rollback
                    warningThreshold: 5,        // Error rate above 5% triggers warning
                    sustainedPeriodMs: 180000,  // 3 minutes of high error rate
                    checkIntervalMs: 30000
                },
                responseTime: {
                    enabled: true,
                    criticalThreshold: 5000,    // Response time above 5s triggers rollback
                    warningThreshold: 2000,     // Response time above 2s triggers warning
                    sustainedPeriodMs: 600000,  // 10 minutes of slow response
                    checkIntervalMs: 60000      // Check every minute
                },
                uptime: {
                    enabled: true,
                    criticalThreshold: 90,      // Uptime below 90% triggers rollback
                    warningThreshold: 95,       // Uptime below 95% triggers warning
                    sustainedPeriodMs: 900000,  // 15 minutes of low uptime
                    checkIntervalMs: 300000     // Check every 5 minutes
                },
                userEngagement: {
                    enabled: true,
                    criticalThreshold: 50,      // Engagement below 50% triggers rollback
                    warningThreshold: 70,       // Engagement below 70% triggers warning
                    sustainedPeriodMs: 1800000, // 30 minutes of low engagement
                    checkIntervalMs: 300000     // Check every 5 minutes
                },
                businessImpact: {
                    enabled: true,
                    criticalThreshold: -25,     // 25% negative impact triggers rollback
                    warningThreshold: -10,      // 10% negative impact triggers warning
                    sustainedPeriodMs: 1800000, // 30 minutes of negative impact
                    checkIntervalMs: 300000
                }
            },

            // Rollback execution settings
            rollback: {
                enabled: process.env.ENABLE_AUTOMATIC_ROLLBACK !== 'false',
                confirmationRequired: process.env.ROLLBACK_CONFIRMATION === 'true',
                maxRollbacksPerHour: 3,
                cooldownPeriodMs: 3600000,     // 1 hour between rollbacks
                phases: ['phase4', 'phase3', 'phase2'] // Rollback order (reverse deployment)
            },

            // Monitoring settings
            monitoring: {
                enabled: true,
                healthCheckIntervalMs: 30000,
                metricsRetentionMs: 3600000,   // 1 hour of metrics history
                alertOnTriggerEvaluation: true
            },

            ...config
        };

        this.alertSystem = new ProductionAlertSystem();
        this.isInitialized = false;
        this.monitoringIntervals = new Map();
        this.metricsHistory = new Map();
        this.rollbackHistory = [];
        this.sustainedIssues = new Map();

        // Current system state
        this.currentMetrics = {
            accuracy: 0,
            errorRate: 0,
            responseTime: 0,
            uptime: 0,
            userEngagement: 0,
            businessImpact: 0
        };

        this.activePhases = new Set();
    }

    /**
     * Initialize the rollback trigger system
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Rollback Trigger System...');

            // Validate configuration
            this.validateConfiguration();

            // Start monitoring for each enabled trigger
            this.startMonitoring();

            // Initialize alert system
            await this.alertSystem.testAlerts();

            this.isInitialized = true;

            await this.alertSystem.sendAlert({
                message: 'Rollback Trigger System initialized and monitoring',
                severity: 'info',
                component: 'rollback-system',
                data: {
                    triggersEnabled: this.getEnabledTriggers(),
                    rollbackEnabled: this.config.rollback.enabled
                }
            });

            console.log('✅ Rollback Trigger System initialized successfully');
            return true;

        } catch (error) {
            console.error('💥 Failed to initialize Rollback Trigger System:', error);
            await this.alertSystem.sendAlert({
                message: `Rollback Trigger System initialization failed: ${error.message}`,
                severity: 'critical',
                component: 'rollback-system',
                data: { error: error.message }
            });
            return false;
        }
    }

    /**
     * Validate system configuration
     */
    validateConfiguration() {
        const requiredTriggers = ['accuracy', 'errorRate', 'responseTime'];

        for (const triggerName of requiredTriggers) {
            const trigger = this.config.triggers[triggerName];
            if (!trigger) {
                throw new Error(`Missing required trigger configuration: ${triggerName}`);
            }

            if (trigger.enabled && !trigger.criticalThreshold) {
                throw new Error(`Critical threshold not defined for trigger: ${triggerName}`);
            }
        }

        if (this.config.rollback.enabled && this.config.rollback.phases.length === 0) {
            throw new Error('Rollback phases not configured');
        }
    }

    /**
     * Start monitoring all enabled triggers
     */
    startMonitoring() {
        console.log('📊 Starting trigger monitoring...');

        for (const [triggerName, triggerConfig] of Object.entries(this.config.triggers)) {
            if (triggerConfig.enabled) {
                this.startTriggerMonitoring(triggerName, triggerConfig);
            }
        }

        // Start general health monitoring
        this.startHealthMonitoring();
    }

    /**
     * Start monitoring for a specific trigger
     */
    startTriggerMonitoring(triggerName, triggerConfig) {
        const interval = setInterval(async () => {
            try {
                await this.evaluateTrigger(triggerName, triggerConfig);
            } catch (error) {
                console.error(`Error evaluating trigger ${triggerName}:`, error);
            }
        }, triggerConfig.checkIntervalMs);

        this.monitoringIntervals.set(triggerName, interval);
        console.log(`🔍 Started monitoring for ${triggerName} trigger (interval: ${triggerConfig.checkIntervalMs}ms)`);
    }

    /**
     * Start general health monitoring
     */
    startHealthMonitoring() {
        const interval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('Health monitoring error:', error);
            }
        }, this.config.monitoring.healthCheckIntervalMs);

        this.monitoringIntervals.set('health', interval);
        console.log('🏥 Started general health monitoring');
    }

    /**
     * Update current metrics (called by monitoring system)
     */
    updateMetrics(newMetrics) {
        const timestamp = Date.now();

        // Update current metrics
        this.currentMetrics = {
            ...this.currentMetrics,
            ...newMetrics,
            timestamp
        };

        // Store metrics history
        for (const [metric, value] of Object.entries(newMetrics)) {
            if (!this.metricsHistory.has(metric)) {
                this.metricsHistory.set(metric, []);
            }

            const history = this.metricsHistory.get(metric);
            history.push({ timestamp, value });

            // Keep only recent history
            const cutoffTime = timestamp - this.config.monitoring.metricsRetentionMs;
            this.metricsHistory.set(metric, history.filter(h => h.timestamp >= cutoffTime));
        }
    }

    /**
     * Update active phases
     */
    updateActivePhases(phases) {
        this.activePhases = new Set(phases);
    }

    /**
     * Evaluate a specific trigger
     */
    async evaluateTrigger(triggerName, triggerConfig) {
        const currentValue = this.currentMetrics[triggerName];

        if (currentValue === undefined || currentValue === null) {
            return; // No data available for this trigger
        }

        const now = Date.now();
        const isCritical = this.isValueCritical(currentValue, triggerConfig);
        const isWarning = this.isValueWarning(currentValue, triggerConfig);

        // Handle critical threshold breach
        if (isCritical) {
            const sustainedIssue = this.sustainedIssues.get(triggerName);

            if (!sustainedIssue) {
                // First occurrence
                this.sustainedIssues.set(triggerName, {
                    startTime: now,
                    triggerType: 'critical',
                    currentValue,
                    threshold: triggerConfig.criticalThreshold
                });

                await this.alertSystem.sendAlert({
                    message: `Critical threshold breached for ${triggerName}: ${currentValue} (threshold: ${triggerConfig.criticalThreshold})`,
                    severity: 'critical',
                    component: 'rollback-system',
                    data: {
                        trigger: triggerName,
                        currentValue,
                        threshold: triggerConfig.criticalThreshold,
                        sustainedPeriodRequired: triggerConfig.sustainedPeriodMs
                    }
                });

            } else if ((now - sustainedIssue.startTime) >= triggerConfig.sustainedPeriodMs) {
                // Sustained critical issue - trigger rollback
                await this.triggerAutomaticRollback(triggerName, {
                    reason: `Sustained critical ${triggerName}: ${currentValue} for ${Math.round((now - sustainedIssue.startTime) / 1000)}s`,
                    currentValue,
                    threshold: triggerConfig.criticalThreshold,
                    duration: now - sustainedIssue.startTime
                });

                // Clear the sustained issue
                this.sustainedIssues.delete(triggerName);
            }

        } else if (isWarning) {
            // Handle warning threshold
            const sustainedIssue = this.sustainedIssues.get(triggerName);

            if (!sustainedIssue || sustainedIssue.triggerType !== 'warning') {
                await this.alertSystem.sendAlert({
                    message: `Warning threshold breached for ${triggerName}: ${currentValue} (threshold: ${triggerConfig.warningThreshold})`,
                    severity: 'warning',
                    component: 'rollback-system',
                    data: {
                        trigger: triggerName,
                        currentValue,
                        threshold: triggerConfig.warningThreshold
                    }
                });
            }

        } else {
            // Normal values - clear any sustained issues
            if (this.sustainedIssues.has(triggerName)) {
                const clearedIssue = this.sustainedIssues.get(triggerName);
                this.sustainedIssues.delete(triggerName);

                await this.alertSystem.sendAlert({
                    message: `${triggerName} returned to normal: ${currentValue}`,
                    severity: 'info',
                    component: 'rollback-system',
                    data: {
                        trigger: triggerName,
                        currentValue,
                        previousIssue: clearedIssue
                    }
                });
            }
        }
    }

    /**
     * Check if value breaches critical threshold
     */
    isValueCritical(value, triggerConfig) {
        if (triggerConfig.criticalThreshold === undefined) return false;

        // Different triggers have different comparison logic
        const threshold = triggerConfig.criticalThreshold;

        switch (true) {
            case ['accuracy', 'uptime', 'userEngagement'].some(t => t in triggerConfig):
                return value < threshold; // These should be above threshold
            case ['errorRate', 'responseTime'].some(t => t in triggerConfig):
                return value > threshold; // These should be below threshold
            case 'businessImpact' in triggerConfig:
                return value < threshold; // Negative impact
            default:
                return false;
        }
    }

    /**
     * Check if value breaches warning threshold
     */
    isValueWarning(value, triggerConfig) {
        if (triggerConfig.warningThreshold === undefined) return false;

        const threshold = triggerConfig.warningThreshold;

        switch (true) {
            case ['accuracy', 'uptime', 'userEngagement'].some(t => t in triggerConfig):
                return value < threshold;
            case ['errorRate', 'responseTime'].some(t => t in triggerConfig):
                return value > threshold;
            case 'businessImpact' in triggerConfig:
                return value < threshold;
            default:
                return false;
        }
    }

    /**
     * Trigger automatic rollback
     */
    async triggerAutomaticRollback(triggerName, details) {
        try {
            console.log(`🚨 TRIGGERING AUTOMATIC ROLLBACK: ${triggerName}`);

            // Check rollback rate limiting
            const recentRollbacks = this.rollbackHistory.filter(
                r => (Date.now() - r.timestamp) < this.config.rollback.cooldownPeriodMs
            ).length;

            if (recentRollbacks >= this.config.rollback.maxRollbacksPerHour) {
                await this.alertSystem.sendAlert({
                    message: `Rollback rate limit exceeded. Manual intervention required for ${triggerName}`,
                    severity: 'critical',
                    component: 'rollback-system',
                    data: {
                        trigger: triggerName,
                        details,
                        recentRollbacks,
                        rateLimit: this.config.rollback.maxRollbacksPerHour
                    }
                });
                return false;
            }

            // Check if automatic rollback is enabled
            if (!this.config.rollback.enabled) {
                await this.alertSystem.sendAlert({
                    message: `Rollback trigger activated but automatic rollback disabled. Manual intervention required for ${triggerName}`,
                    severity: 'critical',
                    component: 'rollback-system',
                    data: { trigger: triggerName, details }
                });
                return false;
            }

            // Send pre-rollback alert
            await this.alertSystem.sendAlert({
                message: `🚨 INITIATING AUTOMATIC ROLLBACK: ${details.reason}`,
                severity: 'critical',
                component: 'rollback-system',
                data: {
                    trigger: triggerName,
                    details,
                    activePhases: Array.from(this.activePhases),
                    rollbackPhases: this.config.rollback.phases
                }
            });

            // Execute rollback for each phase in reverse order
            const rollbackResults = [];

            for (const phase of this.config.rollback.phases) {
                if (this.activePhases.has(phase)) {
                    try {
                        console.log(`🔄 Rolling back ${phase}...`);
                        const result = await this.executePhaseRollback(phase, triggerName, details);
                        rollbackResults.push({ phase, success: true, result });

                        // Remove phase from active phases
                        this.activePhases.delete(phase);

                        await this.alertSystem.sendAlert({
                            message: `Phase ${phase} rolled back successfully`,
                            severity: 'warning',
                            component: 'rollback-system',
                            data: { phase, trigger: triggerName, result }
                        });

                    } catch (error) {
                        console.error(`Failed to rollback ${phase}:`, error);
                        rollbackResults.push({ phase, success: false, error: error.message });

                        await this.alertSystem.sendAlert({
                            message: `Failed to rollback ${phase}: ${error.message}`,
                            severity: 'critical',
                            component: 'rollback-system',
                            data: { phase, trigger: triggerName, error: error.message }
                        });
                    }
                }
            }

            // Record rollback in history
            const rollbackRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                trigger: triggerName,
                details,
                phases: rollbackResults,
                success: rollbackResults.every(r => r.success)
            };

            this.rollbackHistory.push(rollbackRecord);

            // Send completion alert
            await this.alertSystem.sendAlert({
                message: `Automatic rollback completed. ${rollbackResults.filter(r => r.success).length}/${rollbackResults.length} phases rolled back successfully`,
                severity: rollbackRecord.success ? 'warning' : 'critical',
                component: 'rollback-system',
                data: {
                    rollbackId: rollbackRecord.id,
                    trigger: triggerName,
                    results: rollbackResults
                }
            });

            console.log(`✅ Automatic rollback completed: ${rollbackRecord.id}`);
            return rollbackRecord.success;

        } catch (error) {
            console.error('💥 Automatic rollback failed:', error);

            await this.alertSystem.sendAlert({
                message: `Automatic rollback system failure: ${error.message}`,
                severity: 'critical',
                component: 'rollback-system',
                data: {
                    trigger: triggerName,
                    details,
                    error: error.message
                }
            });

            return false;
        }
    }

    /**
     * Execute rollback for a specific phase
     */
    async executePhaseRollback(phase, trigger, details) {
        // This would integrate with your actual deployment system
        // For now, we'll simulate the rollback process

        const rollbackSteps = [
            'Disabling feature flags',
            'Stopping phase services',
            'Reverting configuration',
            'Clearing cache',
            'Updating monitoring'
        ];

        for (const step of rollbackSteps) {
            console.log(`  ${step} for ${phase}...`);
            await this.sleep(1000); // Simulate rollback time
        }

        return {
            phase,
            trigger,
            steps: rollbackSteps,
            duration: rollbackSteps.length * 1000,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Perform general health check
     */
    async performHealthCheck() {
        // Check if we have recent metrics
        const now = Date.now();
        const metricsAge = now - (this.currentMetrics.timestamp || 0);
        const maxAge = this.config.monitoring.healthCheckIntervalMs * 3;

        if (metricsAge > maxAge) {
            await this.alertSystem.sendAlert({
                message: `Metrics data is stale (${Math.round(metricsAge / 1000)}s old)`,
                severity: 'warning',
                component: 'rollback-system',
                data: { metricsAge, maxAge }
            });
        }

        // Check system responsiveness
        if (this.sustainedIssues.size > 3) {
            await this.alertSystem.sendAlert({
                message: `Multiple sustained issues detected: ${Array.from(this.sustainedIssues.keys()).join(', ')}`,
                severity: 'critical',
                component: 'rollback-system',
                data: { sustainedIssues: Array.from(this.sustainedIssues.keys()) }
            });
        }
    }

    /**
     * Get enabled triggers list
     */
    getEnabledTriggers() {
        return Object.entries(this.config.triggers)
            .filter(([_, config]) => config.enabled)
            .map(([name, _]) => name);
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            rollbackEnabled: this.config.rollback.enabled,
            activePhases: Array.from(this.activePhases),
            enabledTriggers: this.getEnabledTriggers(),
            sustainedIssues: Object.fromEntries(this.sustainedIssues),
            recentRollbacks: this.rollbackHistory.filter(
                r => (Date.now() - r.timestamp) < 3600000 // Last hour
            ).length,
            currentMetrics: this.currentMetrics,
            metricsAge: this.currentMetrics.timestamp ? Date.now() - this.currentMetrics.timestamp : null
        };
    }

    /**
     * Manually trigger rollback
     */
    async manualRollback(reason, userId = 'system') {
        return await this.triggerAutomaticRollback('manual', {
            reason: `Manual rollback: ${reason}`,
            triggeredBy: userId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Stop monitoring
     */
    stop() {
        console.log('🛑 Stopping Rollback Trigger System...');

        // Clear all intervals
        for (const [name, interval] of this.monitoringIntervals.entries()) {
            clearInterval(interval);
            console.log(`  Stopped ${name} monitoring`);
        }

        this.monitoringIntervals.clear();
        this.isInitialized = false;

        console.log('✅ Rollback Trigger System stopped');
    }

    /**
     * Helper method for sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RollbackTriggerSystem;