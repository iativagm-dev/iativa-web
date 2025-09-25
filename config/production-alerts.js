/**
 * Production Monitoring Alerts Configuration
 * Comprehensive alerting system for production deployment
 */

class ProductionAlertsConfig {
    constructor() {
        this.alertRules = {
            // Critical System Alerts
            critical_response_time: {
                name: 'Critical Response Time',
                severity: 'critical',
                condition: 'responseTime > 5000', // 5 seconds
                description: 'System response time is critically high',
                escalation: true,
                escalationTime: 300000, // 5 minutes
                cooldown: 300000, // 5 minutes
                channels: ['console', 'email', 'webhook'],
                autoRecovery: true,
                recoveryActions: ['clear_cache', 'garbage_collect', 'scale_resources']
            },

            system_failure: {
                name: 'System Failure',
                severity: 'critical',
                condition: 'componentFailures > 0',
                description: 'One or more critical system components have failed',
                escalation: true,
                escalationTime: 180000, // 3 minutes
                cooldown: 600000, // 10 minutes
                channels: ['console', 'email', 'webhook', 'sms'],
                autoRecovery: true,
                recoveryActions: ['restart_service', 'reset_circuit_breakers']
            },

            high_error_rate: {
                name: 'High Error Rate',
                severity: 'critical',
                condition: 'errorRate > 10', // 10%
                description: 'System error rate is critically high',
                escalation: true,
                escalationTime: 600000, // 10 minutes
                cooldown: 900000, // 15 minutes
                channels: ['console', 'email', 'webhook'],
                autoRecovery: true,
                recoveryActions: ['enable_circuit_breaker', 'reduce_load']
            },

            // Warning Level Alerts
            degraded_performance: {
                name: 'Degraded Performance',
                severity: 'warning',
                condition: 'responseTime > 2000 OR errorRate > 5', // 2 seconds or 5%
                description: 'System performance is degraded',
                escalation: false,
                cooldown: 1800000, // 30 minutes
                channels: ['console', 'email'],
                autoRecovery: false,
                monitoring: true
            },

            high_memory_usage: {
                name: 'High Memory Usage',
                severity: 'warning',
                condition: 'memoryUsage > 85', // 85%
                description: 'System memory usage is high',
                escalation: false,
                cooldown: 600000, // 10 minutes
                channels: ['console', 'email'],
                autoRecovery: true,
                recoveryActions: ['garbage_collect', 'clear_cache']
            },

            low_cache_hit_rate: {
                name: 'Low Cache Hit Rate',
                severity: 'warning',
                condition: 'cacheHitRate < 40', // 40%
                description: 'Cache hit rate is below optimal threshold',
                escalation: false,
                cooldown: 3600000, // 1 hour
                channels: ['console'],
                autoRecovery: true,
                recoveryActions: ['warmup_cache', 'analyze_cache_patterns']
            },

            circuit_breaker_open: {
                name: 'Circuit Breaker Open',
                severity: 'warning',
                condition: 'circuitBreakerOpen = true',
                description: 'Circuit breaker has opened for a feature',
                escalation: true,
                escalationTime: 1800000, // 30 minutes
                cooldown: 300000, // 5 minutes
                channels: ['console', 'email'],
                autoRecovery: false,
                monitoring: true
            },

            // Info Level Alerts
            anomaly_detected: {
                name: 'Performance Anomaly',
                severity: 'info',
                condition: 'anomalyDetected = true',
                description: 'Performance anomaly detected in system metrics',
                escalation: false,
                cooldown: 3600000, // 1 hour
                channels: ['console'],
                autoRecovery: false,
                monitoring: true
            },

            backup_failure: {
                name: 'Backup Failure',
                severity: 'warning',
                condition: 'backupFailed = true',
                description: 'Automated backup process failed',
                escalation: false,
                cooldown: 7200000, // 2 hours
                channels: ['console', 'email'],
                autoRecovery: true,
                recoveryActions: ['retry_backup']
            },

            feature_flag_change: {
                name: 'Feature Flag Changed',
                severity: 'info',
                condition: 'featureFlagChanged = true',
                description: 'Feature flag configuration has been modified',
                escalation: false,
                cooldown: 300000, // 5 minutes
                channels: ['console'],
                autoRecovery: false,
                monitoring: true
            }
        };

        // Notification channels configuration
        this.channels = {
            console: {
                enabled: true,
                config: {
                    colors: true,
                    timestamps: true,
                    logLevel: 'info'
                }
            },

            email: {
                enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
                config: {
                    smtp: {
                        host: process.env.SMTP_HOST || 'localhost',
                        port: process.env.SMTP_PORT || 587,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS
                        }
                    },
                    from: process.env.ALERT_FROM_EMAIL || 'alerts@company.com',
                    to: process.env.ALERT_TO_EMAIL || 'admin@company.com',
                    subject: 'Sistema Optimizado - Production Alert'
                }
            },

            webhook: {
                enabled: process.env.ENABLE_WEBHOOK_ALERTS === 'true',
                config: {
                    url: process.env.WEBHOOK_URL,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`
                    },
                    timeout: 5000
                }
            },

            slack: {
                enabled: process.env.ENABLE_SLACK_ALERTS === 'true',
                config: {
                    webhookUrl: process.env.SLACK_WEBHOOK_URL,
                    channel: process.env.SLACK_CHANNEL || '#alerts',
                    username: 'Sistema Optimizado Alerts',
                    iconEmoji: ':warning:'
                }
            },

            sms: {
                enabled: process.env.ENABLE_SMS_ALERTS === 'true',
                config: {
                    service: process.env.SMS_SERVICE || 'twilio',
                    accountSid: process.env.TWILIO_ACCOUNT_SID,
                    authToken: process.env.TWILIO_AUTH_TOKEN,
                    from: process.env.SMS_FROM_NUMBER,
                    to: process.env.SMS_TO_NUMBER
                }
            }
        };

        // Escalation rules
        this.escalationRules = {
            critical: {
                levels: [
                    { delay: 0, channels: ['console', 'email'] },
                    { delay: 300000, channels: ['webhook', 'sms'] }, // 5 minutes
                    { delay: 900000, channels: ['sms'] } // 15 minutes (repeat)
                ]
            },
            warning: {
                levels: [
                    { delay: 0, channels: ['console'] },
                    { delay: 1800000, channels: ['email'] } // 30 minutes
                ]
            },
            info: {
                levels: [
                    { delay: 0, channels: ['console'] }
                ]
            }
        };

        // Recovery actions configuration
        this.recoveryActions = {
            clear_cache: {
                name: 'Clear Cache',
                description: 'Clear system caches to free memory',
                risk: 'low',
                timeout: 30000,
                endpoint: '/api/performance/cache',
                method: 'DELETE'
            },

            garbage_collect: {
                name: 'Force Garbage Collection',
                description: 'Force garbage collection to free memory',
                risk: 'low',
                timeout: 10000,
                action: 'gc'
            },

            scale_resources: {
                name: 'Scale Resources',
                description: 'Scale up system resources',
                risk: 'medium',
                timeout: 120000,
                action: 'scale'
            },

            restart_service: {
                name: 'Restart Service',
                description: 'Restart the application service',
                risk: 'high',
                timeout: 60000,
                action: 'restart'
            },

            reset_circuit_breakers: {
                name: 'Reset Circuit Breakers',
                description: 'Reset all circuit breakers to closed state',
                risk: 'medium',
                timeout: 15000,
                endpoint: '/api/degradation/circuit-breakers/reset',
                method: 'POST'
            },

            enable_circuit_breaker: {
                name: 'Enable Circuit Breaker',
                description: 'Enable circuit breaker protection',
                risk: 'low',
                timeout: 5000,
                action: 'enable_circuit_breaker'
            },

            reduce_load: {
                name: 'Reduce Load',
                description: 'Reduce system load by increasing throttling',
                risk: 'medium',
                timeout: 10000,
                action: 'increase_throttling'
            },

            warmup_cache: {
                name: 'Warm Up Cache',
                description: 'Pre-populate cache with common data',
                risk: 'low',
                timeout: 60000,
                endpoint: '/api/performance/cache/warmup',
                method: 'POST'
            },

            retry_backup: {
                name: 'Retry Backup',
                description: 'Retry failed backup operation',
                risk: 'low',
                timeout: 300000,
                endpoint: '/api/backup/retry',
                method: 'POST'
            }
        };

        // Monitoring thresholds
        this.thresholds = {
            responseTime: {
                warning: 2000,  // 2 seconds
                critical: 5000  // 5 seconds
            },
            errorRate: {
                warning: 5,     // 5%
                critical: 10    // 10%
            },
            memoryUsage: {
                warning: 85,    // 85%
                critical: 95    // 95%
            },
            cpuUsage: {
                warning: 80,    // 80%
                critical: 90    // 90%
            },
            cacheHitRate: {
                warning: 40,    // 40%
                critical: 20    // 20%
            },
            diskSpace: {
                warning: 85,    // 85%
                critical: 95    // 95%
            },
            throughput: {
                warning: 10,    // req/s minimum
                critical: 5     // req/s minimum
            }
        };
    }

    // Get alert configuration
    getAlertRules() {
        return this.alertRules;
    }

    getChannels() {
        return this.channels;
    }

    getEscalationRules() {
        return this.escalationRules;
    }

    getRecoveryActions() {
        return this.recoveryActions;
    }

    getThresholds() {
        return this.thresholds;
    }

    // Validate configuration
    validateConfig() {
        const errors = [];

        // Check required environment variables for enabled channels
        if (this.channels.email.enabled) {
            if (!process.env.SMTP_HOST) errors.push('SMTP_HOST required for email alerts');
            if (!process.env.ALERT_TO_EMAIL) errors.push('ALERT_TO_EMAIL required for email alerts');
        }

        if (this.channels.webhook.enabled) {
            if (!process.env.WEBHOOK_URL) errors.push('WEBHOOK_URL required for webhook alerts');
        }

        if (this.channels.slack.enabled) {
            if (!process.env.SLACK_WEBHOOK_URL) errors.push('SLACK_WEBHOOK_URL required for Slack alerts');
        }

        if (this.channels.sms.enabled) {
            if (!process.env.TWILIO_ACCOUNT_SID) errors.push('TWILIO_ACCOUNT_SID required for SMS alerts');
            if (!process.env.SMS_TO_NUMBER) errors.push('SMS_TO_NUMBER required for SMS alerts');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Generate configuration summary
    getConfigSummary() {
        const enabledChannels = Object.keys(this.channels).filter(
            channel => this.channels[channel].enabled
        );

        const alertCount = Object.keys(this.alertRules).length;
        const recoveryActionCount = Object.keys(this.recoveryActions).length;

        return {
            totalAlertRules: alertCount,
            enabledChannels: enabledChannels,
            recoveryActions: recoveryActionCount,
            escalationEnabled: Object.values(this.alertRules).some(rule => rule.escalation),
            autoRecoveryEnabled: Object.values(this.alertRules).some(rule => rule.autoRecovery)
        };
    }
}

module.exports = ProductionAlertsConfig;