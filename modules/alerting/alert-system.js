/**
 * Production Alert System
 * Comprehensive alerting with Slack, Email, and Webhook integrations
 */

const nodemailer = require('nodemailer');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;

class ProductionAlertSystem {
    constructor(config = {}) {
        this.config = {
            // Email configuration
            email: {
                enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
                smtp: {
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                },
                from: process.env.ALERT_FROM_EMAIL || 'alerts@yourcompany.com',
                to: process.env.ALERT_TO_EMAIL ? process.env.ALERT_TO_EMAIL.split(',') : []
            },

            // Slack configuration
            slack: {
                enabled: process.env.ENABLE_SLACK_ALERTS === 'true',
                webhookUrl: process.env.SLACK_WEBHOOK_URL,
                channel: process.env.SLACK_CHANNEL || '#production-alerts',
                username: 'Production Monitor',
                icon: ':rotating_light:'
            },

            // Webhook configuration
            webhook: {
                enabled: process.env.ENABLE_WEBHOOK_ALERTS === 'true',
                url: process.env.WEBHOOK_URL,
                secret: process.env.WEBHOOK_SECRET,
                timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000
            },

            // Console alerts (always enabled)
            console: {
                enabled: true,
                colorize: true,
                includeStackTrace: true
            },

            // Alert filtering and throttling
            throttling: {
                enabled: true,
                windowMinutes: 5,
                maxAlertsPerWindow: 10,
                duplicateSuppressionMinutes: 30
            },

            // Alert severity levels
            severityLevels: {
                critical: { priority: 4, color: '#ff0000', emoji: '🚨' },
                warning: { priority: 3, color: '#ffaa00', emoji: '⚠️' },
                info: { priority: 2, color: '#0088ff', emoji: 'ℹ️' },
                debug: { priority: 1, color: '#888888', emoji: '🔍' }
            },

            ...config
        };

        // Initialize email transporter if enabled
        if (this.config.email.enabled && this.config.email.smtp.auth.user) {
            try {
                this.emailTransporter = nodemailer.createTransporter(this.config.email.smtp);
            } catch (error) {
                console.error('Failed to initialize email transporter:', error.message);
                this.config.email.enabled = false;
            }
        }

        // Alert throttling storage
        this.alertThrottling = new Map();
        this.recentAlerts = [];

        // Start cleanup interval
        setInterval(() => this.cleanupThrottling(), 60000); // Cleanup every minute
    }

    /**
     * Send alert through all configured channels
     */
    async sendAlert(alert) {
        try {
            // Validate and normalize alert
            const normalizedAlert = this.normalizeAlert(alert);

            // Check throttling
            if (this.isThrottled(normalizedAlert)) {
                console.log(`Alert throttled: ${normalizedAlert.message}`);
                return { success: true, throttled: true };
            }

            // Send to all enabled channels
            const results = await Promise.allSettled([
                this.sendConsoleAlert(normalizedAlert),
                this.sendEmailAlert(normalizedAlert),
                this.sendSlackAlert(normalizedAlert),
                this.sendWebhookAlert(normalizedAlert)
            ]);

            // Record alert for throttling
            this.recordAlert(normalizedAlert);

            // Analyze results
            const channelResults = {
                console: results[0].status === 'fulfilled' ? results[0].value : results[0].reason,
                email: results[1].status === 'fulfilled' ? results[1].value : results[1].reason,
                slack: results[2].status === 'fulfilled' ? results[2].value : results[2].reason,
                webhook: results[3].status === 'fulfilled' ? results[3].value : results[3].reason
            };

            return {
                success: true,
                alert: normalizedAlert,
                channels: channelResults
            };

        } catch (error) {
            console.error('Alert system error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Normalize alert format
     */
    normalizeAlert(alert) {
        if (typeof alert === 'string') {
            alert = { message: alert };
        }

        return {
            id: alert.id || Date.now().toString(),
            timestamp: alert.timestamp || new Date().toISOString(),
            severity: alert.severity || 'info',
            message: alert.message,
            component: alert.component || 'system',
            phase: alert.phase || null,
            data: alert.data || {},
            source: alert.source || 'production-monitor',
            tags: alert.tags || []
        };
    }

    /**
     * Check if alert should be throttled
     */
    isThrottled(alert) {
        if (!this.config.throttling.enabled) return false;

        const alertKey = this.getAlertKey(alert);
        const now = Date.now();
        const windowMs = this.config.throttling.windowMinutes * 60 * 1000;
        const suppressionMs = this.config.throttling.duplicateSuppressionMinutes * 60 * 1000;

        // Check duplicate suppression
        const throttleData = this.alertThrottling.get(alertKey);
        if (throttleData && (now - throttleData.lastSent) < suppressionMs) {
            return true;
        }

        // Check rate limiting
        const recentCount = this.recentAlerts.filter(
            a => (now - a.timestamp) < windowMs && a.severity === alert.severity
        ).length;

        return recentCount >= this.config.throttling.maxAlertsPerWindow;
    }

    /**
     * Record alert for throttling purposes
     */
    recordAlert(alert) {
        const alertKey = this.getAlertKey(alert);
        const now = Date.now();

        // Update throttling data
        this.alertThrottling.set(alertKey, {
            lastSent: now,
            count: (this.alertThrottling.get(alertKey)?.count || 0) + 1
        });

        // Add to recent alerts
        this.recentAlerts.push({
            timestamp: now,
            severity: alert.severity,
            key: alertKey
        });
    }

    /**
     * Generate unique key for alert throttling
     */
    getAlertKey(alert) {
        return `${alert.severity}:${alert.component}:${alert.message.substring(0, 50)}`;
    }

    /**
     * Clean up old throttling data
     */
    cleanupThrottling() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        // Clean up recent alerts
        this.recentAlerts = this.recentAlerts.filter(
            a => (now - a.timestamp) < maxAge
        );

        // Clean up throttling data
        for (const [key, data] of this.alertThrottling.entries()) {
            if ((now - data.lastSent) > maxAge) {
                this.alertThrottling.delete(key);
            }
        }
    }

    /**
     * Send console alert
     */
    async sendConsoleAlert(alert) {
        if (!this.config.console.enabled) {
            return { sent: false, reason: 'Console alerts disabled' };
        }

        const severityConfig = this.config.severityLevels[alert.severity] || this.config.severityLevels.info;
        const emoji = severityConfig.emoji;
        const timestamp = new Date(alert.timestamp).toLocaleString();

        console.log(`\n${emoji} PRODUCTION ALERT - ${alert.severity.toUpperCase()}`);
        console.log(`⏰ Time: ${timestamp}`);
        console.log(`🔧 Component: ${alert.component}`);
        console.log(`📱 Message: ${alert.message}`);

        if (alert.phase) {
            console.log(`🚀 Phase: ${alert.phase}`);
        }

        if (Object.keys(alert.data).length > 0) {
            console.log(`📊 Data:`, JSON.stringify(alert.data, null, 2));
        }

        if (alert.tags.length > 0) {
            console.log(`🏷️  Tags: ${alert.tags.join(', ')}`);
        }

        console.log(`🆔 Alert ID: ${alert.id}`);
        console.log('─'.repeat(80));

        return { sent: true, channel: 'console' };
    }

    /**
     * Send email alert
     */
    async sendEmailAlert(alert) {
        if (!this.config.email.enabled || !this.emailTransporter) {
            return { sent: false, reason: 'Email alerts disabled or not configured' };
        }

        if (!this.config.email.to || this.config.email.to.length === 0) {
            return { sent: false, reason: 'No email recipients configured' };
        }

        const severityConfig = this.config.severityLevels[alert.severity] || this.config.severityLevels.info;
        const emoji = severityConfig.emoji;

        const subject = `${emoji} Production Alert: ${alert.component} - ${alert.severity.toUpperCase()}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${severityConfig.color}; color: white; padding: 20px; text-align: center;">
                    <h1>${emoji} Production Alert</h1>
                    <h2>${alert.severity.toUpperCase()}</h2>
                </div>

                <div style="padding: 20px; background: #f9f9f9;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Message:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.message}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Component:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.component}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Time:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(alert.timestamp).toLocaleString()}</td>
                        </tr>
                        ${alert.phase ? `
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Phase:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.phase}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Alert ID:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${alert.id}</td>
                        </tr>
                    </table>

                    ${Object.keys(alert.data).length > 0 ? `
                    <div style="margin-top: 20px;">
                        <h3>Additional Data:</h3>
                        <pre style="background: #eee; padding: 15px; border-radius: 5px; overflow: auto;">${JSON.stringify(alert.data, null, 2)}</pre>
                    </div>
                    ` : ''}

                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3;">
                        <strong>Production Monitoring System</strong><br>
                        This alert was generated automatically by the production monitoring system.
                    </div>
                </div>
            </div>
        `;

        try {
            const info = await this.emailTransporter.sendMail({
                from: this.config.email.from,
                to: this.config.email.to,
                subject,
                html
            });

            return { sent: true, channel: 'email', messageId: info.messageId };
        } catch (error) {
            return { sent: false, channel: 'email', error: error.message };
        }
    }

    /**
     * Send Slack alert
     */
    async sendSlackAlert(alert) {
        if (!this.config.slack.enabled || !this.config.slack.webhookUrl) {
            return { sent: false, reason: 'Slack alerts disabled or webhook URL not configured' };
        }

        const severityConfig = this.config.severityLevels[alert.severity] || this.config.severityLevels.info;
        const emoji = severityConfig.emoji;
        const color = severityConfig.color;

        const payload = {
            channel: this.config.slack.channel,
            username: this.config.slack.username,
            icon_emoji: this.config.slack.icon,
            attachments: [
                {
                    color: color,
                    title: `${emoji} Production Alert - ${alert.severity.toUpperCase()}`,
                    text: alert.message,
                    fields: [
                        {
                            title: 'Component',
                            value: alert.component,
                            short: true
                        },
                        {
                            title: 'Time',
                            value: new Date(alert.timestamp).toLocaleString(),
                            short: true
                        }
                    ],
                    footer: 'Production Monitoring System',
                    footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
                    ts: Math.floor(Date.parse(alert.timestamp) / 1000)
                }
            ]
        };

        // Add phase field if present
        if (alert.phase) {
            payload.attachments[0].fields.push({
                title: 'Phase',
                value: alert.phase,
                short: true
            });
        }

        // Add data field if present
        if (Object.keys(alert.data).length > 0) {
            payload.attachments[0].fields.push({
                title: 'Data',
                value: '```' + JSON.stringify(alert.data, null, 2) + '```',
                short: false
            });
        }

        try {
            const response = await this.sendHttpRequest(this.config.slack.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                timeout: 10000
            });

            return { sent: true, channel: 'slack', response };
        } catch (error) {
            return { sent: false, channel: 'slack', error: error.message };
        }
    }

    /**
     * Send webhook alert
     */
    async sendWebhookAlert(alert) {
        if (!this.config.webhook.enabled || !this.config.webhook.url) {
            return { sent: false, reason: 'Webhook alerts disabled or URL not configured' };
        }

        const payload = {
            alert,
            timestamp: new Date().toISOString(),
            source: 'production-alert-system'
        };

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'ProductionAlertSystem/1.0'
        };

        // Add secret header if configured
        if (this.config.webhook.secret) {
            headers['X-Alert-Secret'] = this.config.webhook.secret;
        }

        try {
            const response = await this.sendHttpRequest(this.config.webhook.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                timeout: this.config.webhook.timeout
            });

            return { sent: true, channel: 'webhook', response };
        } catch (error) {
            return { sent: false, channel: 'webhook', error: error.message };
        }
    }

    /**
     * Send HTTP request (helper method)
     */
    sendHttpRequest(url, options) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const req = client.request({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {}
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, data });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);

            if (options.timeout) {
                req.setTimeout(options.timeout, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
            }

            if (options.body) {
                req.write(options.body);
            }

            req.end();
        });
    }

    /**
     * Test all configured alert channels
     */
    async testAlerts() {
        const testAlert = {
            message: 'Test alert - all systems operational',
            severity: 'info',
            component: 'alert-system',
            data: {
                test: true,
                timestamp: new Date().toISOString()
            },
            tags: ['test', 'system-check']
        };

        console.log('🧪 Testing alert system...');
        const result = await this.sendAlert(testAlert);

        console.log('📊 Test results:');
        console.log(JSON.stringify(result, null, 2));

        return result;
    }

    /**
     * Get alert system status
     */
    getStatus() {
        return {
            configured: {
                console: this.config.console.enabled,
                email: this.config.email.enabled && !!this.emailTransporter,
                slack: this.config.slack.enabled && !!this.config.slack.webhookUrl,
                webhook: this.config.webhook.enabled && !!this.config.webhook.url
            },
            throttling: {
                enabled: this.config.throttling.enabled,
                recentAlerts: this.recentAlerts.length,
                throttledKeys: this.alertThrottling.size
            },
            statistics: {
                totalAlertsSent: Array.from(this.alertThrottling.values())
                    .reduce((sum, data) => sum + data.count, 0)
            }
        };
    }
}

module.exports = ProductionAlertSystem;