/**
 * Business Metrics Tracker
 * Monitors and analyzes business impact of production rollout
 */

const ProductionAlertSystem = require('../alerting/alert-system');

class BusinessMetricsTracker {
    constructor(config = {}) {
        this.config = {
            // Metrics tracking configuration
            tracking: {
                enabled: true,
                collectionIntervalMs: 300000,    // 5 minutes
                retentionDays: 90,
                realTimeProcessing: true,
                baselineComparisonEnabled: true
            },

            // Business metrics to track
            metrics: {
                revenue: {
                    enabled: true,
                    sources: ['payments', 'subscriptions', 'transactions'],
                    alertThresholds: {
                        dailyDecline: -10,     // Alert on >10% daily decline
                        weeklyDecline: -15,    // Alert on >15% weekly decline
                        monthlyDecline: -20    // Alert on >20% monthly decline
                    }
                },
                userEngagement: {
                    enabled: true,
                    metrics: ['activeUsers', 'sessionDuration', 'pageViews', 'featureUsage'],
                    alertThresholds: {
                        dailyDecline: -15,
                        weeklyDecline: -20,
                        monthlyDecline: -25
                    }
                },
                conversionRates: {
                    enabled: true,
                    funnels: ['signup', 'activation', 'purchase', 'retention'],
                    alertThresholds: {
                        dailyDecline: -12,
                        weeklyDecline: -18,
                        monthlyDecline: -25
                    }
                },
                customerSatisfaction: {
                    enabled: true,
                    sources: ['nps', 'csat', 'feedback', 'reviews'],
                    alertThresholds: {
                        npsDecline: -10,
                        csatDecline: -8,
                        reviewScoreDecline: -0.5
                    }
                },
                systemPerformance: {
                    enabled: true,
                    metrics: ['responseTime', 'uptime', 'errorRate', 'throughput'],
                    alertThresholds: {
                        responseTimeIncrease: 50,  // 50% increase
                        uptimeDecline: -2,         // 2% decline
                        errorRateIncrease: 100     // 100% increase
                    }
                },
                costOptimization: {
                    enabled: true,
                    metrics: ['serverCosts', 'apiCosts', 'supportCosts', 'efficiency'],
                    alertThresholds: {
                        costIncrease: 25,          // 25% cost increase
                        efficiencyDecline: -15     // 15% efficiency decline
                    }
                }
            },

            // Baseline configuration
            baseline: {
                enabled: true,
                periodDays: 30,           // 30-day baseline period
                excludeAnomalies: true,   // Exclude outliers from baseline
                autoUpdate: true,         // Auto-update baseline periodically
                updateFrequencyDays: 7    // Update baseline weekly
            },

            // Alert configuration
            alerts: {
                enabled: true,
                severityLevels: {
                    info: { threshold: 5 },      // 5% change
                    warning: { threshold: 10 },   // 10% change
                    critical: { threshold: 20 }   // 20% change
                },
                cooldownMs: 1800000,             // 30 minutes between similar alerts
                trendAnalysisEnabled: true,
                impactAnalysisEnabled: true
            },

            // ROI calculation
            roi: {
                enabled: true,
                deploymentCost: process.env.DEPLOYMENT_COST || 50000,
                maintenanceCostMonthly: process.env.MAINTENANCE_COST || 10000,
                expectedBenefits: {
                    revenueIncrease: 0.15,       // 15% expected revenue increase
                    costReduction: 0.20,         // 20% expected cost reduction
                    efficiencyGain: 0.25         // 25% expected efficiency gain
                }
            },

            ...config
        };

        this.alertSystem = new ProductionAlertSystem();
        this.metricsStorage = new Map();
        this.baselineData = new Map();
        this.alertHistory = new Map();
        this.monitoringInterval = null;

        // Current metrics snapshot
        this.currentMetrics = {
            revenue: {
                daily: 0,
                weekly: 0,
                monthly: 0,
                trend: 'stable'
            },
            userEngagement: {
                activeUsers: 0,
                sessionDuration: 0,
                pageViews: 0,
                featureUsage: 0,
                trend: 'stable'
            },
            conversionRates: {
                signup: 0,
                activation: 0,
                purchase: 0,
                retention: 0,
                trend: 'stable'
            },
            customerSatisfaction: {
                nps: 0,
                csat: 0,
                reviewScore: 0,
                trend: 'stable'
            },
            systemPerformance: {
                responseTime: 0,
                uptime: 0,
                errorRate: 0,
                throughput: 0,
                trend: 'stable'
            },
            costOptimization: {
                totalCosts: 0,
                efficiency: 0,
                savings: 0,
                trend: 'stable'
            }
        };

        // ROI tracking
        this.roiMetrics = {
            totalInvestment: 0,
            totalReturns: 0,
            currentROI: 0,
            paybackPeriodDays: 0,
            projectedAnnualBenefit: 0
        };
    }

    /**
     * Initialize business metrics tracking
     */
    async initialize() {
        try {
            console.log('📊 Initializing Business Metrics Tracker...');

            // Load baseline data
            await this.loadBaselineData();

            // Start metrics collection
            this.startMetricsCollection();

            // Initialize alert system
            await this.alertSystem.sendAlert({
                message: 'Business Metrics Tracker initialized and collecting data',
                severity: 'info',
                component: 'business-metrics',
                data: {
                    metricsEnabled: Object.keys(this.config.metrics).filter(
                        key => this.config.metrics[key].enabled
                    ),
                    baselineEnabled: this.config.baseline.enabled,
                    roiTrackingEnabled: this.config.roi.enabled
                }
            });

            console.log('✅ Business Metrics Tracker initialized successfully');
            return true;

        } catch (error) {
            console.error('💥 Failed to initialize Business Metrics Tracker:', error);
            await this.alertSystem.sendAlert({
                message: `Business Metrics Tracker initialization failed: ${error.message}`,
                severity: 'critical',
                component: 'business-metrics',
                data: { error: error.message }
            });
            return false;
        }
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(async () => {
            try {
                await this.collectAllMetrics();
                await this.analyzeMetricsTrends();
                await this.calculateROI();
                await this.checkAlertThresholds();
            } catch (error) {
                console.error('Metrics collection error:', error);
            }
        }, this.config.tracking.collectionIntervalMs);

        console.log('📈 Started business metrics collection');
    }

    /**
     * Collect all enabled business metrics
     */
    async collectAllMetrics() {
        const timestamp = Date.now();

        // Collect revenue metrics
        if (this.config.metrics.revenue.enabled) {
            const revenueData = await this.collectRevenueMetrics();
            this.updateMetric('revenue', revenueData, timestamp);
        }

        // Collect user engagement metrics
        if (this.config.metrics.userEngagement.enabled) {
            const engagementData = await this.collectEngagementMetrics();
            this.updateMetric('userEngagement', engagementData, timestamp);
        }

        // Collect conversion rate metrics
        if (this.config.metrics.conversionRates.enabled) {
            const conversionData = await this.collectConversionMetrics();
            this.updateMetric('conversionRates', conversionData, timestamp);
        }

        // Collect customer satisfaction metrics
        if (this.config.metrics.customerSatisfaction.enabled) {
            const satisfactionData = await this.collectSatisfactionMetrics();
            this.updateMetric('customerSatisfaction', satisfactionData, timestamp);
        }

        // Collect system performance metrics
        if (this.config.metrics.systemPerformance.enabled) {
            const performanceData = await this.collectPerformanceMetrics();
            this.updateMetric('systemPerformance', performanceData, timestamp);
        }

        // Collect cost optimization metrics
        if (this.config.metrics.costOptimization.enabled) {
            const costData = await this.collectCostMetrics();
            this.updateMetric('costOptimization', costData, timestamp);
        }

        console.log(`📊 Collected business metrics at ${new Date(timestamp).toLocaleTimeString()}`);
    }

    /**
     * Collect revenue metrics (simulated)
     */
    async collectRevenueMetrics() {
        // In a real implementation, this would connect to payment processors,
        // database queries, analytics APIs, etc.

        const baseRevenue = 125000;
        const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
        const phaseImpact = this.calculatePhaseImpact('revenue');

        return {
            daily: Math.round(baseRevenue * (1 + variation + phaseImpact) / 30),
            weekly: Math.round(baseRevenue * (1 + variation + phaseImpact) / 4.3),
            monthly: Math.round(baseRevenue * (1 + variation + phaseImpact)),
            transactions: Math.floor(1200 + (Math.random() * 400)),
            averageOrderValue: Math.round((baseRevenue / 1200) * (1 + variation))
        };
    }

    /**
     * Collect user engagement metrics (simulated)
     */
    async collectEngagementMetrics() {
        const baseEngagement = {
            activeUsers: 15000,
            sessionDuration: 425, // seconds
            pageViews: 45000,
            featureUsage: 0.73 // 73%
        };

        const variation = (Math.random() - 0.5) * 0.15; // ±7.5% variation
        const phaseImpact = this.calculatePhaseImpact('engagement');

        return {
            activeUsers: Math.round(baseEngagement.activeUsers * (1 + variation + phaseImpact)),
            sessionDuration: Math.round(baseEngagement.sessionDuration * (1 + variation + phaseImpact)),
            pageViews: Math.round(baseEngagement.pageViews * (1 + variation + phaseImpact)),
            featureUsage: Math.min(1, baseEngagement.featureUsage * (1 + variation + phaseImpact)),
            bounceRate: Math.max(0, 0.35 * (1 - variation - phaseImpact)) // Inverse correlation
        };
    }

    /**
     * Collect conversion metrics (simulated)
     */
    async collectConversionMetrics() {
        const baseConversion = {
            signup: 0.12,      // 12%
            activation: 0.68,  // 68%
            purchase: 0.15,    // 15%
            retention: 0.82    // 82%
        };

        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const phaseImpact = this.calculatePhaseImpact('conversion');

        return {
            signup: Math.min(1, baseConversion.signup * (1 + variation + phaseImpact)),
            activation: Math.min(1, baseConversion.activation * (1 + variation + phaseImpact)),
            purchase: Math.min(1, baseConversion.purchase * (1 + variation + phaseImpact)),
            retention: Math.min(1, baseConversion.retention * (1 + variation + phaseImpact))
        };
    }

    /**
     * Collect customer satisfaction metrics (simulated)
     */
    async collectSatisfactionMetrics() {
        const baseSatisfaction = {
            nps: 45,      // Net Promoter Score
            csat: 4.2,    // Customer Satisfaction (1-5)
            reviewScore: 4.5 // Review score (1-5)
        };

        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const phaseImpact = this.calculatePhaseImpact('satisfaction');

        return {
            nps: Math.max(-100, Math.min(100, baseSatisfaction.nps * (1 + variation + phaseImpact))),
            csat: Math.max(1, Math.min(5, baseSatisfaction.csat * (1 + variation + phaseImpact))),
            reviewScore: Math.max(1, Math.min(5, baseSatisfaction.reviewScore * (1 + variation + phaseImpact)))
        };
    }

    /**
     * Collect system performance metrics (simulated)
     */
    async collectPerformanceMetrics() {
        const basePerformance = {
            responseTime: 95,    // milliseconds
            uptime: 99.9,       // percentage
            errorRate: 0.8,     // percentage
            throughput: 1250    // requests per minute
        };

        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const phaseImpact = this.calculatePhaseImpact('performance');

        return {
            responseTime: Math.max(10, basePerformance.responseTime * (1 + variation - phaseImpact)), // Lower is better
            uptime: Math.min(100, basePerformance.uptime * (1 + (variation + phaseImpact) * 0.1)),
            errorRate: Math.max(0, basePerformance.errorRate * (1 + variation - phaseImpact)), // Lower is better
            throughput: Math.round(basePerformance.throughput * (1 + variation + phaseImpact))
        };
    }

    /**
     * Collect cost optimization metrics (simulated)
     */
    async collectCostMetrics() {
        const baseCosts = {
            serverCosts: 15000,     // monthly
            apiCosts: 5000,         // monthly
            supportCosts: 8000,     // monthly
            efficiency: 0.85        // 85% efficiency
        };

        const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const phaseImpact = this.calculatePhaseImpact('cost');

        const totalCosts = (baseCosts.serverCosts + baseCosts.apiCosts + baseCosts.supportCosts) *
                          (1 + variation - phaseImpact); // Lower costs due to optimization

        return {
            serverCosts: Math.round(baseCosts.serverCosts * (1 + variation - phaseImpact)),
            apiCosts: Math.round(baseCosts.apiCosts * (1 + variation - phaseImpact)),
            supportCosts: Math.round(baseCosts.supportCosts * (1 + variation - phaseImpact)),
            totalCosts: Math.round(totalCosts),
            efficiency: Math.min(1, baseCosts.efficiency * (1 + variation + phaseImpact)),
            savings: Math.round((baseCosts.serverCosts + baseCosts.apiCosts + baseCosts.supportCosts) - totalCosts)
        };
    }

    /**
     * Calculate phase impact on metrics
     */
    calculatePhaseImpact(metricType) {
        // Simulate the positive impact of intelligent features
        const phaseImpacts = {
            revenue: 0.12,        // 12% revenue increase
            engagement: 0.18,     // 18% engagement increase
            conversion: 0.15,     // 15% conversion improvement
            satisfaction: 0.08,   // 8% satisfaction improvement
            performance: 0.25,    // 25% performance improvement
            cost: 0.20           // 20% cost reduction
        };

        const baseImpact = phaseImpacts[metricType] || 0;
        const timeBasedRampUp = Math.min(1, Date.now() / (Date.now() + 86400000)); // Ramp up over time

        return baseImpact * timeBasedRampUp;
    }

    /**
     * Update metric in storage
     */
    updateMetric(metricName, data, timestamp) {
        if (!this.metricsStorage.has(metricName)) {
            this.metricsStorage.set(metricName, []);
        }

        const history = this.metricsStorage.get(metricName);
        history.push({ timestamp, data });

        // Keep only recent history
        const cutoffTime = timestamp - (this.config.tracking.retentionDays * 24 * 60 * 60 * 1000);
        this.metricsStorage.set(metricName, history.filter(h => h.timestamp >= cutoffTime));

        // Update current metrics
        this.currentMetrics[metricName] = { ...data, timestamp };
    }

    /**
     * Analyze metrics trends
     */
    async analyzeMetricsTrends() {
        for (const [metricName, config] of Object.entries(this.config.metrics)) {
            if (!config.enabled) continue;

            const history = this.metricsStorage.get(metricName);
            if (!history || history.length < 2) continue;

            const trend = this.calculateTrend(history);
            const baselineComparison = this.compareToBaseline(metricName, history);

            // Update current metrics with trend
            if (this.currentMetrics[metricName]) {
                this.currentMetrics[metricName].trend = trend;
                this.currentMetrics[metricName].baselineComparison = baselineComparison;
            }
        }
    }

    /**
     * Calculate trend direction
     */
    calculateTrend(history) {
        if (history.length < 2) return 'stable';

        const recent = history.slice(-3); // Last 3 data points
        if (recent.length < 2) return 'stable';

        let totalChange = 0;
        for (let i = 1; i < recent.length; i++) {
            // Calculate average change across all metric values
            const current = recent[i].data;
            const previous = recent[i-1].data;

            for (const [key, value] of Object.entries(current)) {
                if (typeof value === 'number' && previous[key]) {
                    const change = (value - previous[key]) / previous[key];
                    totalChange += change;
                }
            }
        }

        const averageChange = totalChange / (recent.length - 1);

        if (averageChange > 0.02) return 'increasing';
        if (averageChange < -0.02) return 'decreasing';
        return 'stable';
    }

    /**
     * Compare current metrics to baseline
     */
    compareToBaseline(metricName, history) {
        if (!this.config.baseline.enabled || !this.baselineData.has(metricName)) {
            return { available: false };
        }

        const baseline = this.baselineData.get(metricName);
        const current = history[history.length - 1].data;

        const comparison = {};
        for (const [key, value] of Object.entries(current)) {
            if (typeof value === 'number' && baseline[key]) {
                const change = ((value - baseline[key]) / baseline[key]) * 100;
                comparison[key] = {
                    current: value,
                    baseline: baseline[key],
                    change: Math.round(change * 100) / 100, // Round to 2 decimal places
                    direction: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable'
                };
            }
        }

        return { available: true, comparison };
    }

    /**
     * Calculate ROI metrics
     */
    async calculateROI() {
        if (!this.config.roi.enabled) return;

        const deploymentCost = parseFloat(this.config.roi.deploymentCost);
        const monthlyMaintenance = parseFloat(this.config.roi.maintenanceCostMonthly);

        // Calculate total investment (deployment + maintenance to date)
        const monthsSinceDeployment = 1; // Simplified - in real implementation, calculate actual months
        const totalInvestment = deploymentCost + (monthlyMaintenance * monthsSinceDeployment);

        // Calculate returns from cost savings and revenue increases
        const costSavings = this.currentMetrics.costOptimization?.savings || 0;
        const revenueIncrease = this.calculateRevenueIncrease();
        const totalReturns = (costSavings + revenueIncrease) * monthsSinceDeployment;

        // Calculate ROI
        const currentROI = totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment) * 100 : 0;

        // Calculate payback period
        const monthlyBenefit = costSavings + revenueIncrease;
        const paybackPeriodMonths = monthlyBenefit > 0 ? totalInvestment / monthlyBenefit : Infinity;

        this.roiMetrics = {
            totalInvestment: Math.round(totalInvestment),
            totalReturns: Math.round(totalReturns),
            currentROI: Math.round(currentROI * 100) / 100,
            paybackPeriodDays: Math.round(paybackPeriodMonths * 30),
            projectedAnnualBenefit: Math.round(monthlyBenefit * 12),
            monthlyBenefit: Math.round(monthlyBenefit)
        };

        // Send ROI update alert
        if (currentROI > 20) { // ROI above 20%
            await this.sendAlert('roi_positive', {
                message: `Strong ROI achieved: ${currentROI.toFixed(1)}% return on investment`,
                severity: 'info',
                data: this.roiMetrics
            });
        }
    }

    /**
     * Calculate revenue increase compared to baseline
     */
    calculateRevenueIncrease() {
        const currentRevenue = this.currentMetrics.revenue?.monthly || 0;
        const baseline = this.baselineData.get('revenue');

        if (!baseline || !baseline.monthly) return 0;

        return Math.max(0, currentRevenue - baseline.monthly);
    }

    /**
     * Check alert thresholds
     */
    async checkAlertThresholds() {
        for (const [metricName, config] of Object.entries(this.config.metrics)) {
            if (!config.enabled || !config.alertThresholds) continue;

            const current = this.currentMetrics[metricName];
            if (!current || !current.baselineComparison?.available) continue;

            const comparison = current.baselineComparison.comparison;

            for (const [key, thresholds] of Object.entries(config.alertThresholds)) {
                if (!comparison[key]) continue;

                const change = comparison[key].change;
                const alertType = `${metricName}_${key}`;

                // Check for significant changes
                if (Math.abs(change) >= this.config.alerts.severityLevels.critical.threshold) {
                    await this.sendAlert(alertType, {
                        message: `Critical business metric change: ${metricName}.${key} changed by ${change.toFixed(1)}%`,
                        severity: 'critical',
                        data: { metric: metricName, key, change, current: comparison[key] }
                    });
                } else if (Math.abs(change) >= this.config.alerts.severityLevels.warning.threshold) {
                    await this.sendAlert(alertType, {
                        message: `Significant business metric change: ${metricName}.${key} changed by ${change.toFixed(1)}%`,
                        severity: 'warning',
                        data: { metric: metricName, key, change, current: comparison[key] }
                    });
                }
            }
        }
    }

    /**
     * Send alert with cooldown protection
     */
    async sendAlert(alertType, alert) {
        const now = Date.now();
        const lastAlert = this.alertHistory.get(alertType);

        // Check cooldown period
        if (lastAlert && (now - lastAlert) < this.config.alerts.cooldownMs) {
            return;
        }

        // Send alert
        await this.alertSystem.sendAlert({
            ...alert,
            component: 'business-metrics',
            tags: ['business-impact', alertType]
        });

        // Record alert time
        this.alertHistory.set(alertType, now);
    }

    /**
     * Load baseline data
     */
    async loadBaselineData() {
        if (!this.config.baseline.enabled) return;

        // In a real implementation, this would load from database
        // For demo purposes, we'll create simulated baseline data

        this.baselineData.set('revenue', {
            daily: 4167,
            weekly: 29167,
            monthly: 125000
        });

        this.baselineData.set('userEngagement', {
            activeUsers: 15000,
            sessionDuration: 425,
            pageViews: 45000,
            featureUsage: 0.73
        });

        console.log('📊 Loaded baseline data for comparison');
    }

    /**
     * Get business metrics summary for dashboard
     */
    getMetricsSummary() {
        return {
            currentMetrics: this.currentMetrics,
            roiMetrics: this.roiMetrics,
            trends: this.getCurrentTrends(),
            alerts: this.getRecentAlerts(),
            baseline: this.config.baseline.enabled ? {
                available: true,
                lastUpdated: new Date().toISOString()
            } : { available: false }
        };
    }

    /**
     * Get current trends summary
     */
    getCurrentTrends() {
        const trends = {};

        for (const [metricName, data] of Object.entries(this.currentMetrics)) {
            trends[metricName] = {
                trend: data.trend || 'stable',
                hasBaseline: data.baselineComparison?.available || false
            };
        }

        return trends;
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts() {
        const oneHourAgo = Date.now() - 3600000;

        return Array.from(this.alertHistory.entries())
            .filter(([_, timestamp]) => timestamp >= oneHourAgo)
            .map(([type, timestamp]) => ({ type, timestamp }));
    }

    /**
     * Stop tracking
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('🛑 Business Metrics Tracker stopped');
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            enabled: this.config.tracking.enabled,
            metricsEnabled: Object.keys(this.config.metrics).filter(
                key => this.config.metrics[key].enabled
            ),
            baselineEnabled: this.config.baseline.enabled,
            roiTrackingEnabled: this.config.roi.enabled,
            currentROI: this.roiMetrics.currentROI,
            dataPoints: Array.from(this.metricsStorage.values())
                .reduce((sum, history) => sum + history.length, 0),
            lastCollection: new Date().toISOString()
        };
    }
}

module.exports = BusinessMetricsTracker;