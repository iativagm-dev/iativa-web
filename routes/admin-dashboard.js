/**
 * Admin Dashboard API Routes
 * Comprehensive monitoring and management endpoints for intelligent features
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Import performance and A/B testing modules
const ABTestingManager = require('../modules/ab-testing/index');
const FeatureFlagManager = require('../modules/ab-testing/feature-flags');
const AnalyticsEngine = require('../modules/ab-testing/analytics');
const ErrorHandler = require('../modules/ab-testing/error-handler');
const IntelligentCostingOptimized = require('../modules/intelligent-costing-optimized');

// Initialize components
const abTesting = new ABTestingManager();
const featureFlags = new FeatureFlagManager();
const analytics = new AnalyticsEngine();
const errorHandler = new ErrorHandler();
const intelligentCosting = new IntelligentCostingOptimized();

// Data file paths
const dataDir = path.join(__dirname, '../data');
const metricsFile = path.join(dataDir, 'admin-metrics.json');
const alertsFile = path.join(dataDir, 'admin-alerts.json');

// Initialize metrics storage
let realtimeMetrics = {
    coherenceScores: [],
    conversionRates: [],
    businessTypeDistribution: {},
    performanceMetrics: {},
    lastUpdated: Date.now()
};

// ==================== AUTHENTICATION MIDDLEWARE ====================

const requireAdmin = (req, res, next) => {
    // In production, implement proper authentication
    // For demo purposes, we'll use a simple header check
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

    if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Admin access required'
        });
    }

    next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// ==================== REAL-TIME METRICS ENDPOINTS ====================

// Get comprehensive dashboard overview
router.get('/overview', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 24; // hours

        const overview = {
            timestamp: new Date().toISOString(),
            timeRange: timeRange + ' hours',

            // System Health
            systemHealth: {
                overall: await getSystemHealth(),
                components: {
                    abTesting: abTesting.healthCheck(),
                    featureFlags: await featureFlags.getHealthStatus(),
                    analytics: analytics.getSystemHealth(),
                    intelligentCosting: intelligentCosting.getHealthStatus()
                }
            },

            // Key Metrics
            metrics: {
                coherenceScores: await getCoherenceScores(timeRange),
                conversionRates: await getConversionRates(timeRange),
                businessTypeDistribution: await getBusinessTypeDistribution(timeRange),
                userSegmentAnalytics: await getUserSegmentAnalytics(timeRange)
            },

            // Performance Summary
            performance: {
                responseTime: await getAverageResponseTime(timeRange),
                errorRate: await getErrorRate(timeRange),
                throughput: await getThroughput(timeRange),
                cacheHitRate: await getCacheHitRate()
            },

            // Active Experiments
            experiments: {
                active: await getActiveExperiments(),
                recentResults: await getRecentExperimentResults(timeRange)
            },

            // Feature Flags Status
            featureFlags: await getFeatureFlagsStatus(),

            // Recent Alerts
            alerts: await getRecentAlerts(24) // Last 24 hours
        };

        res.json(overview);

    } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({
            error: 'Failed to get dashboard overview',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Real-time metrics stream (SSE)
router.get('/metrics/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const sendMetrics = async () => {
        try {
            const metrics = await getRealTimeMetrics();
            res.write(`data: ${JSON.stringify(metrics)}\n\n`);
        } catch (error) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        }
    };

    // Send initial metrics
    sendMetrics();

    // Send updates every 5 seconds
    const interval = setInterval(sendMetrics, 5000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// Get coherence scores analytics
router.get('/metrics/coherence', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 24;
        const granularity = req.query.granularity || 'hour'; // hour, day, week

        const coherenceData = await getDetailedCoherenceScores(timeRange, granularity);

        res.json({
            timeRange: timeRange + ' hours',
            granularity,
            data: coherenceData,
            summary: {
                average: coherenceData.reduce((sum, item) => sum + item.score, 0) / coherenceData.length,
                trend: calculateTrend(coherenceData.map(item => item.score)),
                distribution: getScoreDistribution(coherenceData)
            }
        });

    } catch (error) {
        console.error('Coherence metrics error:', error);
        res.status(500).json({ error: 'Failed to get coherence metrics' });
    }
});

// Get conversion rates analytics
router.get('/metrics/conversion', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 24;
        const segment = req.query.segment || 'all';

        const conversionData = await getDetailedConversionRates(timeRange, segment);

        res.json({
            timeRange: timeRange + ' hours',
            segment,
            data: conversionData,
            funnel: await getConversionFunnel(timeRange, segment),
            segmentComparison: await getSegmentConversionComparison(timeRange)
        });

    } catch (error) {
        console.error('Conversion metrics error:', error);
        res.status(500).json({ error: 'Failed to get conversion metrics' });
    }
});

// Get business type distribution
router.get('/metrics/business-types', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 24;
        const includeConfidence = req.query.includeConfidence === 'true';

        const businessTypeData = await getDetailedBusinessTypeDistribution(timeRange, includeConfidence);

        res.json({
            timeRange: timeRange + ' hours',
            distribution: businessTypeData.distribution,
            trends: businessTypeData.trends,
            confidence: includeConfidence ? businessTypeData.confidence : undefined,
            topPerformers: businessTypeData.topPerformers
        });

    } catch (error) {
        console.error('Business type metrics error:', error);
        res.status(500).json({ error: 'Failed to get business type metrics' });
    }
});

// ==================== FEATURE FLAG MANAGEMENT ====================

// Get all feature flags with detailed status
router.get('/feature-flags', async (req, res) => {
    try {
        const flagsStatus = await featureFlags.getFeatureStatus();
        const flagsHealth = await featureFlags.getHealthStatus();

        const enhancedFlags = {};

        for (const [flagName, flagData] of Object.entries(flagsStatus)) {
            enhancedFlags[flagName] = {
                ...flagData,
                usage: await getFeatureFlagUsage(flagName, 24),
                performance: await getFeatureFlagPerformance(flagName, 24),
                errors: await getFeatureFlagErrors(flagName, 24)
            };
        }

        res.json({
            flags: enhancedFlags,
            health: flagsHealth,
            summary: {
                total: Object.keys(enhancedFlags).length,
                enabled: Object.values(enhancedFlags).filter(f => f.enabled).length,
                rolloutProgress: calculateOverallRolloutProgress(enhancedFlags)
            }
        });

    } catch (error) {
        console.error('Feature flags error:', error);
        res.status(500).json({ error: 'Failed to get feature flags' });
    }
});

// Update feature flag configuration
router.put('/feature-flags/:flagName', async (req, res) => {
    try {
        const flagName = req.params.flagName;
        const { enabled, rollout, variant, config } = req.body;

        // Validate input
        if (rollout !== undefined && (rollout < 0 || rollout > 100)) {
            return res.status(400).json({
                error: 'Invalid rollout percentage',
                message: 'Rollout must be between 0 and 100'
            });
        }

        // Update flag configuration
        const updateResult = await updateFeatureFlag(flagName, { enabled, rollout, variant, config });

        if (!updateResult.success) {
            return res.status(400).json({
                error: 'Failed to update feature flag',
                details: updateResult.error
            });
        }

        // Log the change
        await logAdminAction(req, 'feature_flag_update', {
            flagName,
            changes: { enabled, rollout, variant, config },
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            flagName,
            updatedConfig: updateResult.config,
            message: `Feature flag ${flagName} updated successfully`
        });

    } catch (error) {
        console.error('Feature flag update error:', error);
        res.status(500).json({
            error: 'Failed to update feature flag',
            details: error.message
        });
    }
});

// Gradual rollout management
router.post('/feature-flags/:flagName/rollout', async (req, res) => {
    try {
        const flagName = req.params.flagName;
        const { targetPercentage, stepSize, intervalMinutes } = req.body;

        if (!targetPercentage || targetPercentage < 0 || targetPercentage > 100) {
            return res.status(400).json({
                error: 'Invalid target percentage',
                message: 'Target percentage must be between 0 and 100'
            });
        }

        // Start gradual rollout
        const rolloutResult = await featureFlags.gradualRollout(
            flagName,
            targetPercentage,
            stepSize || 10,
            (intervalMinutes || 30) * 60 * 1000
        );

        // Log the rollout initiation
        await logAdminAction(req, 'gradual_rollout_started', {
            flagName,
            targetPercentage,
            stepSize,
            intervalMinutes,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            flagName,
            rolloutPlan: {
                target: targetPercentage,
                stepSize: stepSize || 10,
                interval: intervalMinutes || 30,
                estimatedDuration: Math.ceil(targetPercentage / (stepSize || 10)) * (intervalMinutes || 30)
            },
            message: `Gradual rollout initiated for ${flagName}`
        });

    } catch (error) {
        console.error('Gradual rollout error:', error);
        res.status(500).json({
            error: 'Failed to start gradual rollout',
            details: error.message
        });
    }
});

// Emergency disable feature flag
router.post('/feature-flags/:flagName/emergency-disable', async (req, res) => {
    try {
        const flagName = req.params.flagName;
        const { reason } = req.body;

        const disableResult = await featureFlags.emergencyDisable(
            flagName,
            reason || 'Emergency disable via admin dashboard'
        );

        if (disableResult) {
            await logAdminAction(req, 'emergency_disable', {
                flagName,
                reason,
                timestamp: new Date().toISOString(),
                severity: 'critical'
            });

            // Send alert to monitoring systems
            await sendAdminAlert({
                type: 'emergency_disable',
                flagName,
                reason,
                timestamp: new Date().toISOString(),
                action: 'immediate_attention_required'
            });

            res.json({
                success: true,
                flagName,
                action: 'emergency_disabled',
                reason,
                message: `Feature flag ${flagName} has been emergency disabled`
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to emergency disable feature flag'
            });
        }

    } catch (error) {
        console.error('Emergency disable error:', error);
        res.status(500).json({
            error: 'Failed to emergency disable feature flag',
            details: error.message
        });
    }
});

// ==================== A/B TESTING MANAGEMENT ====================

// Get A/B testing results
router.get('/ab-testing/results', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 7;
        const experimentId = req.query.experimentId;

        let results;
        if (experimentId) {
            results = await getExperimentResults(experimentId, timeRange);
        } else {
            results = await getAllExperimentResults(timeRange);
        }

        res.json({
            timeRange: timeRange + ' days',
            experiments: results.experiments,
            summary: results.summary,
            recommendations: results.recommendations
        });

    } catch (error) {
        console.error('A/B testing results error:', error);
        res.status(500).json({ error: 'Failed to get A/B testing results' });
    }
});

// Create new A/B test
router.post('/ab-testing/experiments', async (req, res) => {
    try {
        const experimentConfig = req.body;

        // Validate experiment configuration
        const validation = validateExperimentConfig(experimentConfig);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid experiment configuration',
                details: validation.errors
            });
        }

        const experimentId = abTesting.createExperiment(experimentConfig);

        if (experimentId) {
            await logAdminAction(req, 'experiment_created', {
                experimentId,
                config: experimentConfig,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                experimentId,
                message: 'A/B test experiment created successfully'
            });
        } else {
            res.status(500).json({
                error: 'Failed to create experiment'
            });
        }

    } catch (error) {
        console.error('Create experiment error:', error);
        res.status(500).json({
            error: 'Failed to create experiment',
            details: error.message
        });
    }
});

// Start/stop experiments
router.put('/ab-testing/experiments/:experimentId/status', async (req, res) => {
    try {
        const experimentId = req.params.experimentId;
        const { action } = req.body; // 'start' or 'stop'

        let result;
        if (action === 'start') {
            result = abTesting.startExperiment(experimentId);
        } else if (action === 'stop') {
            result = abTesting.stopExperiment(experimentId);
        } else {
            return res.status(400).json({
                error: 'Invalid action',
                message: 'Action must be either "start" or "stop"'
            });
        }

        if (result) {
            await logAdminAction(req, `experiment_${action}ed`, {
                experimentId,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                experimentId,
                action,
                message: `Experiment ${action}ed successfully`
            });
        } else {
            res.status(404).json({
                error: 'Experiment not found or action failed'
            });
        }

    } catch (error) {
        console.error('Experiment status change error:', error);
        res.status(500).json({
            error: 'Failed to change experiment status',
            details: error.message
        });
    }
});

// ==================== USER SEGMENT ANALYTICS ====================

// Get user segment analytics
router.get('/segments/analytics', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 7;

        const segmentAnalytics = await getUserSegmentAnalytics(timeRange);

        res.json({
            timeRange: timeRange + ' days',
            segments: segmentAnalytics.segments,
            migration: segmentAnalytics.migration,
            performance: segmentAnalytics.performance,
            recommendations: segmentAnalytics.recommendations
        });

    } catch (error) {
        console.error('Segment analytics error:', error);
        res.status(500).json({ error: 'Failed to get segment analytics' });
    }
});

// Update segment configuration
router.put('/segments/:segmentName/config', async (req, res) => {
    try {
        const segmentName = req.params.segmentName;
        const config = req.body;

        const updateResult = await updateSegmentConfig(segmentName, config);

        if (updateResult.success) {
            await logAdminAction(req, 'segment_config_updated', {
                segmentName,
                config,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                segmentName,
                updatedConfig: updateResult.config,
                message: `Segment ${segmentName} configuration updated`
            });
        } else {
            res.status(400).json({
                error: 'Failed to update segment configuration',
                details: updateResult.error
            });
        }

    } catch (error) {
        console.error('Segment config update error:', error);
        res.status(500).json({
            error: 'Failed to update segment configuration',
            details: error.message
        });
    }
});

// ==================== PERFORMANCE MONITORING ====================

// Get performance alerts
router.get('/performance/alerts', async (req, res) => {
    try {
        const severity = req.query.severity; // 'critical', 'warning', 'info'
        const limit = parseInt(req.query.limit) || 100;

        const alerts = await getPerformanceAlerts(severity, limit);

        res.json({
            alerts,
            summary: {
                total: alerts.length,
                bySeverity: alerts.reduce((acc, alert) => {
                    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
                    return acc;
                }, {}),
                recent: alerts.filter(alert =>
                    Date.now() - new Date(alert.timestamp).getTime() < 24 * 60 * 60 * 1000
                ).length
            }
        });

    } catch (error) {
        console.error('Performance alerts error:', error);
        res.status(500).json({ error: 'Failed to get performance alerts' });
    }
});

// Create custom alert rule
router.post('/performance/alert-rules', async (req, res) => {
    try {
        const alertRule = req.body;

        // Validate alert rule
        const validation = validateAlertRule(alertRule);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid alert rule configuration',
                details: validation.errors
            });
        }

        const ruleId = await createAlertRule(alertRule);

        await logAdminAction(req, 'alert_rule_created', {
            ruleId,
            rule: alertRule,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            ruleId,
            message: 'Alert rule created successfully'
        });

    } catch (error) {
        console.error('Create alert rule error:', error);
        res.status(500).json({
            error: 'Failed to create alert rule',
            details: error.message
        });
    }
});

// ==================== SYSTEM ADMINISTRATION ====================

// Get system logs
router.get('/system/logs', async (req, res) => {
    try {
        const level = req.query.level || 'all'; // 'error', 'warn', 'info', 'debug', 'all'
        const limit = parseInt(req.query.limit) || 1000;
        const startTime = req.query.startTime;

        const logs = await getSystemLogs(level, limit, startTime);

        res.json({
            logs,
            summary: {
                total: logs.length,
                byLevel: logs.reduce((acc, log) => {
                    acc[log.level] = (acc[log.level] || 0) + 1;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('System logs error:', error);
        res.status(500).json({ error: 'Failed to get system logs' });
    }
});

// Execute system maintenance tasks
router.post('/system/maintenance', async (req, res) => {
    try {
        const { task, parameters } = req.body;

        let result;
        switch (task) {
            case 'clear_cache':
                result = await clearSystemCache(parameters);
                break;
            case 'cleanup_logs':
                result = await cleanupLogs(parameters);
                break;
            case 'reset_metrics':
                result = await resetMetrics(parameters);
                break;
            case 'backup_data':
                result = await backupData(parameters);
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid maintenance task',
                    supportedTasks: ['clear_cache', 'cleanup_logs', 'reset_metrics', 'backup_data']
                });
        }

        await logAdminAction(req, 'maintenance_task', {
            task,
            parameters,
            result,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            task,
            result,
            message: `Maintenance task ${task} completed successfully`
        });

    } catch (error) {
        console.error('Maintenance task error:', error);
        res.status(500).json({
            error: 'Failed to execute maintenance task',
            details: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

async function getSystemHealth() {
    try {
        const components = [
            { name: 'abTesting', health: abTesting.healthCheck() },
            { name: 'featureFlags', health: await featureFlags.getHealthStatus() },
            { name: 'analytics', health: analytics.getSystemHealth() },
            { name: 'intelligentCosting', health: intelligentCosting.getHealthStatus() }
        ];

        const healthyComponents = components.filter(c => c.health.status === 'healthy').length;
        const totalComponents = components.length;

        return {
            overall: healthyComponents === totalComponents ? 'healthy' :
                    healthyComponents >= totalComponents * 0.7 ? 'degraded' : 'unhealthy',
            score: Math.round((healthyComponents / totalComponents) * 100),
            components: components.reduce((acc, c) => {
                acc[c.name] = c.health;
                return acc;
            }, {})
        };
    } catch (error) {
        return { overall: 'unknown', error: error.message };
    }
}

async function getRealTimeMetrics() {
    // Implementation for real-time metrics collection
    return {
        timestamp: new Date().toISOString(),
        coherenceScore: Math.random() * 40 + 60, // Mock data
        conversionRate: Math.random() * 10 + 15,
        activeUsers: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.random() * 100 + 50,
        errorRate: Math.random() * 2
    };
}

async function logAdminAction(req, action, data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        data,
        user: req.headers['x-admin-user'] || 'anonymous',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    // In production, save to secure audit log
    console.log('Admin Action:', logEntry);
}

async function sendAdminAlert(alert) {
    // In production, send to monitoring systems
    console.log('Admin Alert:', alert);
}

// Additional helper functions would be implemented here...

module.exports = router;