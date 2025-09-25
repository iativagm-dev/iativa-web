const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

/**
 * Production Monitoring Routes
 * Real-time monitoring endpoints for production activation progress
 */

// In-memory storage for real-time metrics
let productionMetrics = {
    phases: {
        phase1: {
            name: 'Business Classification',
            status: 'ACTIVE',
            accuracy: 90.2,
            responseTime: 95,
            errorRate: 0.8,
            uptime: 99.9,
            userEngagement: 85.3,
            businessImpact: {
                classificationCount: 15420,
                userSatisfaction: 4.7,
                accuracyTrend: 'increasing'
            }
        },
        phase2: {
            name: 'Cost Validation (80%)',
            status: 'READY',
            accuracy: 0,
            responseTime: 0,
            errorRate: 0,
            uptime: 0,
            userEngagement: 0,
            businessImpact: {
                validationCount: 0,
                costOptimization: 0,
                userAdoption: 0
            }
        },
        phase3: {
            name: 'Recommendation Engine',
            status: 'PENDING',
            accuracy: 0,
            responseTime: 0,
            errorRate: 0,
            uptime: 0,
            userEngagement: 0,
            businessImpact: {
                recommendationCount: 0,
                clickThroughRate: 0,
                conversionRate: 0
            }
        },
        phase4: {
            name: 'Full System Rollout',
            status: 'PENDING',
            accuracy: 0,
            responseTime: 0,
            errorRate: 0,
            uptime: 0,
            userEngagement: 0,
            businessImpact: {
                totalUsers: 0,
                systemEfficiency: 0,
                overallSatisfaction: 0
            }
        }
    },
    alerts: [],
    systemHealth: {
        overall: 'healthy',
        lastUpdated: new Date().toISOString(),
        components: {
            database: 'healthy',
            cache: 'healthy',
            api: 'healthy',
            monitoring: 'healthy'
        }
    },
    rollbackStatus: {
        ready: true,
        lastTest: new Date().toISOString(),
        estimatedTime: '30 seconds'
    }
};

// User feedback storage
let userFeedback = {
    ratings: [],
    comments: [],
    issues: [],
    suggestions: []
};

// Business metrics tracking
let businessMetrics = {
    revenue: {
        current: 125000,
        baseline: 120000,
        change: 4.2
    },
    userEngagement: {
        current: 85.3,
        baseline: 78.1,
        change: 9.2
    },
    systemEfficiency: {
        current: 94.7,
        baseline: 86.3,
        change: 9.7
    },
    costOptimization: {
        current: 18.5,
        baseline: 12.2,
        change: 51.6
    }
};

// Simulate real-time metrics updates
setInterval(() => {
    updateMetrics();
}, 30000); // Update every 30 seconds

function updateMetrics() {
    const phase1 = productionMetrics.phases.phase1;

    // Simulate Phase 1 metrics fluctuation
    phase1.accuracy = Math.min(100, Math.max(85, phase1.accuracy + (Math.random() - 0.5) * 2));
    phase1.responseTime = Math.max(50, phase1.responseTime + (Math.random() - 0.5) * 10);
    phase1.errorRate = Math.max(0, Math.min(5, phase1.errorRate + (Math.random() - 0.5) * 0.5));
    phase1.userEngagement = Math.min(100, Math.max(70, phase1.userEngagement + (Math.random() - 0.5) * 3));

    // Update business impact
    phase1.businessImpact.classificationCount += Math.floor(Math.random() * 50) + 20;
    phase1.businessImpact.userSatisfaction = Math.min(5, Math.max(3, phase1.businessImpact.userSatisfaction + (Math.random() - 0.5) * 0.1));

    // Update system health
    productionMetrics.systemHealth.lastUpdated = new Date().toISOString();

    // Update business metrics
    businessMetrics.revenue.current += Math.floor(Math.random() * 1000) - 400;
    businessMetrics.userEngagement.current = phase1.userEngagement;
    businessMetrics.systemEfficiency.current = Math.min(100, Math.max(80, businessMetrics.systemEfficiency.current + (Math.random() - 0.5) * 1));
}

// Routes

// Get real-time dashboard data
router.get('/dashboard/live', (req, res) => {
    res.json({
        timestamp: new Date().toISOString(),
        phases: productionMetrics.phases,
        systemHealth: productionMetrics.systemHealth,
        rollbackStatus: productionMetrics.rollbackStatus,
        businessMetrics: businessMetrics,
        alerts: productionMetrics.alerts.slice(-10), // Last 10 alerts
        uptime: process.uptime()
    });
});

// Get phase-specific metrics
router.get('/phases/:phase/metrics', (req, res) => {
    const phase = req.params.phase;
    const phaseData = productionMetrics.phases[phase];

    if (!phaseData) {
        return res.status(404).json({ error: 'Phase not found' });
    }

    res.json({
        phase,
        ...phaseData,
        timestamp: new Date().toISOString()
    });
});

// Get system health status
router.get('/health/detailed', (req, res) => {
    res.json({
        ...productionMetrics.systemHealth,
        memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        cpu: {
            uptime: process.uptime(),
            loadAverage: require('os').loadavg()
        },
        timestamp: new Date().toISOString()
    });
});

// Get alerts
router.get('/alerts', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const severity = req.query.severity;

    let alerts = productionMetrics.alerts;

    if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
    }

    res.json({
        alerts: alerts.slice(-limit),
        total: alerts.length,
        timestamp: new Date().toISOString()
    });
});

// Create new alert
router.post('/alerts', (req, res) => {
    const { message, severity, component, data } = req.body;

    const alert = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        message,
        severity: severity || 'info',
        component: component || 'system',
        data: data || {},
        acknowledged: false
    };

    productionMetrics.alerts.push(alert);

    // Keep only last 1000 alerts
    if (productionMetrics.alerts.length > 1000) {
        productionMetrics.alerts = productionMetrics.alerts.slice(-1000);
    }

    res.status(201).json(alert);
});

// Acknowledge alert
router.put('/alerts/:alertId/acknowledge', (req, res) => {
    const alertId = req.params.alertId;
    const alert = productionMetrics.alerts.find(a => a.id === alertId);

    if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = req.body.userId || 'system';

    res.json(alert);
});

// Get user feedback
router.get('/feedback', (req, res) => {
    res.json({
        ...userFeedback,
        summary: {
            totalRatings: userFeedback.ratings.length,
            averageRating: userFeedback.ratings.length > 0
                ? userFeedback.ratings.reduce((a, b) => a + b.rating, 0) / userFeedback.ratings.length
                : 0,
            totalComments: userFeedback.comments.length,
            totalIssues: userFeedback.issues.length,
            totalSuggestions: userFeedback.suggestions.length
        },
        timestamp: new Date().toISOString()
    });
});

// Submit user feedback
router.post('/feedback', (req, res) => {
    const { type, rating, comment, userId, feature } = req.body;

    const feedback = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: userId || 'anonymous',
        feature: feature || 'general',
        type,
        rating,
        comment
    };

    switch (type) {
        case 'rating':
            userFeedback.ratings.push(feedback);
            break;
        case 'comment':
            userFeedback.comments.push(feedback);
            break;
        case 'issue':
            userFeedback.issues.push(feedback);
            break;
        case 'suggestion':
            userFeedback.suggestions.push(feedback);
            break;
        default:
            userFeedback.comments.push(feedback);
    }

    res.status(201).json(feedback);
});

// Get business metrics
router.get('/business-metrics', (req, res) => {
    res.json({
        ...businessMetrics,
        trends: {
            revenue: businessMetrics.revenue.change > 0 ? 'increasing' : 'decreasing',
            engagement: businessMetrics.userEngagement.change > 0 ? 'increasing' : 'decreasing',
            efficiency: businessMetrics.systemEfficiency.change > 0 ? 'increasing' : 'decreasing',
            costOptimization: businessMetrics.costOptimization.change > 0 ? 'increasing' : 'decreasing'
        },
        timestamp: new Date().toISOString()
    });
});

// Get rollback status
router.get('/rollback/status', (req, res) => {
    res.json({
        ...productionMetrics.rollbackStatus,
        phases: Object.keys(productionMetrics.phases).map(key => ({
            phase: key,
            name: productionMetrics.phases[key].name,
            status: productionMetrics.phases[key].status,
            rollbackReady: productionMetrics.phases[key].status === 'ACTIVE'
        })),
        timestamp: new Date().toISOString()
    });
});

// Trigger rollback (emergency endpoint)
router.post('/rollback/emergency', (req, res) => {
    const { phase, reason } = req.body;

    if (!phase || !reason) {
        return res.status(400).json({ error: 'Phase and reason are required' });
    }

    // Create emergency alert
    const alert = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        message: `Emergency rollback triggered for ${phase}: ${reason}`,
        severity: 'critical',
        component: phase,
        data: { reason, triggeredBy: req.body.userId || 'system' },
        acknowledged: false
    };

    productionMetrics.alerts.push(alert);

    // Update phase status
    if (productionMetrics.phases[phase]) {
        productionMetrics.phases[phase].status = 'ROLLING_BACK';
    }

    res.json({
        success: true,
        message: `Emergency rollback initiated for ${phase}`,
        alertId: alert.id,
        timestamp: new Date().toISOString()
    });
});

// Get metrics history (simplified - in production would use database)
router.get('/metrics/history', (req, res) => {
    const hours = parseInt(req.query.hours) || 24;
    const phase = req.query.phase;

    // Generate historical data (simplified simulation)
    const history = [];
    const now = Date.now();

    for (let i = 0; i < hours; i++) {
        const timestamp = new Date(now - (i * 3600000)); // 1 hour intervals

        if (phase && productionMetrics.phases[phase]) {
            const phaseData = productionMetrics.phases[phase];
            history.unshift({
                timestamp: timestamp.toISOString(),
                phase,
                accuracy: Math.max(75, Math.min(100, phaseData.accuracy + (Math.random() - 0.5) * 10)),
                responseTime: Math.max(50, phaseData.responseTime + (Math.random() - 0.5) * 30),
                errorRate: Math.max(0, Math.min(8, phaseData.errorRate + (Math.random() - 0.5) * 2))
            });
        } else {
            // System-wide metrics
            history.unshift({
                timestamp: timestamp.toISOString(),
                systemHealth: Math.random() > 0.1 ? 'healthy' : 'warning',
                overallAccuracy: Math.max(80, Math.min(95, 87 + (Math.random() - 0.5) * 10)),
                totalRequests: Math.floor(Math.random() * 5000) + 2000
            });
        }
    }

    res.json({
        history,
        period: `${hours} hours`,
        timestamp: new Date().toISOString()
    });
});

// Server-Sent Events endpoint for real-time updates
router.get('/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    const sendUpdate = () => {
        const data = {
            timestamp: new Date().toISOString(),
            phases: productionMetrics.phases,
            systemHealth: productionMetrics.systemHealth,
            alerts: productionMetrics.alerts.slice(-5)
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial data
    sendUpdate();

    // Send updates every 10 seconds
    const interval = setInterval(sendUpdate, 10000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

module.exports = { router, productionMetrics, userFeedback, businessMetrics };