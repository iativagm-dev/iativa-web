/**
 * Advanced Response Time Monitoring System
 * Real-time performance tracking with alerts, analytics, and optimization insights
 */

const fs = require('fs');
const path = require('path');

class ResponseTimeMonitor {
    constructor(options = {}) {
        this.config = {
            // Monitoring thresholds
            warningThreshold: options.warningThreshold || 500, // 500ms
            criticalThreshold: options.criticalThreshold || 1000, // 1000ms
            slowRequestThreshold: options.slowRequestThreshold || 2000, // 2000ms

            // Data collection
            sampleRate: options.sampleRate || 1.0, // Sample 100% of requests
            maxHistorySize: options.maxHistorySize || 10000,
            aggregationWindow: options.aggregationWindow || 60000, // 1 minute windows

            // Alerting
            enableAlerts: options.enableAlerts !== false,
            alertCooldown: options.alertCooldown || 5 * 60 * 1000, // 5 minutes
            maxAlertsPerHour: options.maxAlertsPerHour || 12,

            // Persistence
            enablePersistence: options.enablePersistence !== false,
            dataDir: options.dataDir || path.join(__dirname, '../../data/performance'),
            autoSaveInterval: options.autoSaveInterval || 5 * 60 * 1000, // 5 minutes

            // Analysis
            percentiles: options.percentiles || [50, 90, 95, 99],
            enableTrendAnalysis: options.enableTrendAnalysis !== false,
            trendWindowSize: options.trendWindowSize || 100
        };

        // Real-time metrics storage
        this.metrics = {
            requests: [],
            currentWindow: {
                startTime: Date.now(),
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0
            },
            aggregated: [],
            alerts: [],
            trends: new Map()
        };

        // Route-specific metrics
        this.routeMetrics = new Map();

        // Performance counters
        this.counters = {
            totalRequests: 0,
            slowRequests: 0,
            errorRequests: 0,
            timeouts: 0,
            lastReset: Date.now()
        };

        // Alert state management
        this.alertState = {
            lastAlertTime: 0,
            alertsThisHour: 0,
            hourStartTime: Date.now(),
            activeAlerts: new Set()
        };

        // Performance baselines
        this.baselines = {
            avgResponseTime: 200, // Target average response time
            maxResponseTime: 1000, // Target max response time
            errorRate: 0.01, // Target error rate (1%)
            throughput: 100 // Target requests per minute
        };

        this.initializeMonitor();
    }

    initializeMonitor() {
        // Ensure data directory exists
        if (this.config.enablePersistence && !fs.existsSync(this.config.dataDir)) {
            fs.mkdirSync(this.config.dataDir, { recursive: true });
        }

        // Load historical data
        if (this.config.enablePersistence) {
            this.loadHistoricalData();
        }

        // Start background tasks
        this.startAggregationTask();
        this.startTrendAnalysis();

        if (this.config.enablePersistence) {
            this.startAutoSave();
        }

        console.log('📊 Response Time Monitor initialized');
        console.log(`⚠️ Thresholds: Warning ${this.config.warningThreshold}ms, Critical ${this.config.criticalThreshold}ms`);
    }

    // ==================== MIDDLEWARE FUNCTION ====================

    middleware() {
        return (req, res, next) => {
            const startTime = process.hrtime.bigint();
            const requestId = this.generateRequestId();

            // Sample requests based on sample rate
            if (Math.random() > this.config.sampleRate) {
                return next();
            }

            // Track request start
            req.monitoringId = requestId;
            req.startTime = startTime;

            // Override res.end to capture response time
            const originalEnd = res.end;
            let ended = false;

            res.end = (...args) => {
                if (ended) return;
                ended = true;

                const endTime = process.hrtime.bigint();
                const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

                // Record the request
                this.recordRequest({
                    id: requestId,
                    method: req.method,
                    url: req.originalUrl || req.url,
                    route: this.extractRoute(req),
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    timestamp: Date.now(),
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress,
                    contentLength: res.get('Content-Length') || 0
                });

                return originalEnd.apply(res, args);
            };

            next();
        };
    }

    // ==================== REQUEST RECORDING ====================

    recordRequest(requestData) {
        this.counters.totalRequests++;

        // Add to current requests
        this.metrics.requests.push(requestData);

        // Trim history if needed
        if (this.metrics.requests.length > this.config.maxHistorySize) {
            this.metrics.requests.shift();
        }

        // Update current window
        this.updateCurrentWindow(requestData);

        // Update route-specific metrics
        this.updateRouteMetrics(requestData);

        // Check for performance issues
        this.checkPerformanceThresholds(requestData);

        // Check for slow requests
        if (requestData.responseTime > this.config.slowRequestThreshold) {
            this.counters.slowRequests++;
            this.recordSlowRequest(requestData);
        }

        // Check for errors
        if (requestData.statusCode >= 400) {
            this.counters.errorRequests++;
            this.metrics.currentWindow.errors++;
        }
    }

    updateCurrentWindow(requestData) {
        const window = this.metrics.currentWindow;

        window.count++;
        window.totalTime += requestData.responseTime;
        window.minTime = Math.min(window.minTime, requestData.responseTime);
        window.maxTime = Math.max(window.maxTime, requestData.responseTime);

        // Check if window should be aggregated
        const windowDuration = Date.now() - window.startTime;
        if (windowDuration >= this.config.aggregationWindow) {
            this.aggregateCurrentWindow();
        }
    }

    updateRouteMetrics(requestData) {
        const route = requestData.route;

        if (!this.routeMetrics.has(route)) {
            this.routeMetrics.set(route, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0,
                recentTimes: []
            });
        }

        const routeStats = this.routeMetrics.get(route);
        routeStats.count++;
        routeStats.totalTime += requestData.responseTime;
        routeStats.minTime = Math.min(routeStats.minTime, requestData.responseTime);
        routeStats.maxTime = Math.max(routeStats.maxTime, requestData.responseTime);

        if (requestData.statusCode >= 400) {
            routeStats.errors++;
        }

        // Keep recent times for percentile calculation
        routeStats.recentTimes.push(requestData.responseTime);
        if (routeStats.recentTimes.length > 100) {
            routeStats.recentTimes.shift();
        }
    }

    // ==================== AGGREGATION ====================

    aggregateCurrentWindow() {
        const window = this.metrics.currentWindow;

        if (window.count === 0) {
            return;
        }

        const aggregated = {
            timestamp: window.startTime,
            duration: Date.now() - window.startTime,
            count: window.count,
            avgTime: window.totalTime / window.count,
            minTime: window.minTime,
            maxTime: window.maxTime,
            errors: window.errors,
            errorRate: window.errors / window.count,
            throughput: (window.count / (Date.now() - window.startTime)) * 1000 * 60 // requests per minute
        };

        this.metrics.aggregated.push(aggregated);

        // Keep limited aggregated history
        if (this.metrics.aggregated.length > 1440) { // 24 hours of 1-minute windows
            this.metrics.aggregated.shift();
        }

        // Reset current window
        this.metrics.currentWindow = {
            startTime: Date.now(),
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            errors: 0
        };

        // Analyze aggregated data
        this.analyzePerformanceTrends(aggregated);
    }

    startAggregationTask() {
        setInterval(() => {
            this.aggregateCurrentWindow();
        }, this.config.aggregationWindow);
    }

    // ==================== PERFORMANCE ANALYSIS ====================

    checkPerformanceThresholds(requestData) {
        const responseTime = requestData.responseTime;

        // Critical threshold
        if (responseTime > this.config.criticalThreshold) {
            this.triggerAlert('critical', `Critical response time: ${responseTime.toFixed(0)}ms`, requestData);
        }
        // Warning threshold
        else if (responseTime > this.config.warningThreshold) {
            this.triggerAlert('warning', `Slow response time: ${responseTime.toFixed(0)}ms`, requestData);
        }
    }

    analyzePerformanceTrends(aggregatedData) {
        if (!this.config.enableTrendAnalysis) return;

        const route = 'overall';
        if (!this.metrics.trends.has(route)) {
            this.metrics.trends.set(route, {
                dataPoints: [],
                trend: 'stable',
                slope: 0,
                lastAnalysis: Date.now()
            });
        }

        const trendData = this.metrics.trends.get(route);
        trendData.dataPoints.push({
            time: aggregatedData.timestamp,
            avgTime: aggregatedData.avgTime,
            errorRate: aggregatedData.errorRate,
            throughput: aggregatedData.throughput
        });

        // Keep limited trend data
        if (trendData.dataPoints.length > this.config.trendWindowSize) {
            trendData.dataPoints.shift();
        }

        // Analyze trend if enough data points
        if (trendData.dataPoints.length >= 10) {
            const analysis = this.calculateTrend(trendData.dataPoints);
            trendData.trend = analysis.trend;
            trendData.slope = analysis.slope;

            // Alert on significant degradation
            if (analysis.trend === 'degrading' && Math.abs(analysis.slope) > 10) {
                this.triggerAlert('warning', `Performance degrading: ${analysis.slope.toFixed(1)}ms/min increase`, {
                    trend: analysis,
                    route: route
                });
            }
        }
    }

    calculateTrend(dataPoints) {
        if (dataPoints.length < 2) {
            return { trend: 'stable', slope: 0 };
        }

        // Simple linear regression for response time trend
        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        dataPoints.forEach((point, index) => {
            const x = index;
            const y = point.avgTime;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

        return {
            trend: slope > 5 ? 'degrading' : slope < -5 ? 'improving' : 'stable',
            slope: slope
        };
    }

    // ==================== ALERTING SYSTEM ====================

    triggerAlert(level, message, data) {
        if (!this.config.enableAlerts) return;

        const now = Date.now();

        // Check cooldown period
        if (now - this.alertState.lastAlertTime < this.config.alertCooldown) {
            return;
        }

        // Check hourly limit
        if (now - this.alertState.hourStartTime > 60 * 60 * 1000) {
            this.alertState.hourStartTime = now;
            this.alertState.alertsThisHour = 0;
        }

        if (this.alertState.alertsThisHour >= this.config.maxAlertsPerHour) {
            return;
        }

        const alert = {
            id: this.generateRequestId(),
            level,
            message,
            timestamp: now,
            data: this.sanitizeAlertData(data)
        };

        this.metrics.alerts.push(alert);
        this.alertState.lastAlertTime = now;
        this.alertState.alertsThisHour++;
        this.alertState.activeAlerts.add(alert.id);

        // Keep limited alert history
        if (this.metrics.alerts.length > 1000) {
            this.metrics.alerts.shift();
        }

        console.error(`🚨 [${level.toUpperCase()}] Performance Alert: ${message}`);

        // In production, this would send to external monitoring systems
        this.sendExternalAlert(alert);
    }

    sanitizeAlertData(data) {
        // Remove sensitive information from alert data
        const sanitized = { ...data };
        delete sanitized.userAgent;
        delete sanitized.ip;
        return sanitized;
    }

    sendExternalAlert(alert) {
        // Placeholder for external alert integration
        // Could send to Slack, email, monitoring systems, etc.
        console.log('📬 External alert would be sent:', alert);
    }

    // ==================== METRICS CALCULATION ====================

    getCurrentMetrics() {
        const recentRequests = this.getRecentRequests(300000); // Last 5 minutes
        const currentWindow = this.metrics.currentWindow;

        if (recentRequests.length === 0) {
            return this.getEmptyMetrics();
        }

        const responseTimes = recentRequests.map(r => r.responseTime);
        const errorCount = recentRequests.filter(r => r.statusCode >= 400).length;

        return {
            timestamp: new Date().toISOString(),
            window: {
                duration: '5 minutes',
                requestCount: recentRequests.length,
                currentWindow: {
                    count: currentWindow.count,
                    avgTime: currentWindow.count > 0 ? (currentWindow.totalTime / currentWindow.count).toFixed(2) + 'ms' : '0ms'
                }
            },
            responseTime: {
                average: this.calculateMean(responseTimes).toFixed(2) + 'ms',
                median: this.calculatePercentile(responseTimes, 50).toFixed(2) + 'ms',
                p90: this.calculatePercentile(responseTimes, 90).toFixed(2) + 'ms',
                p95: this.calculatePercentile(responseTimes, 95).toFixed(2) + 'ms',
                p99: this.calculatePercentile(responseTimes, 99).toFixed(2) + 'ms',
                min: Math.min(...responseTimes).toFixed(2) + 'ms',
                max: Math.max(...responseTimes).toFixed(2) + 'ms'
            },
            throughput: {
                rpm: ((recentRequests.length / 5)).toFixed(1), // Requests per minute
                rps: ((recentRequests.length / 300)).toFixed(2) // Requests per second
            },
            errors: {
                count: errorCount,
                rate: ((errorCount / recentRequests.length) * 100).toFixed(2) + '%'
            },
            performance: {
                healthScore: this.calculateHealthScore(responseTimes, errorCount / recentRequests.length),
                trend: this.getOverallTrend(),
                bottlenecks: this.identifyBottlenecks()
            }
        };
    }

    getRouteMetrics() {
        const routes = {};

        for (const [route, stats] of this.routeMetrics.entries()) {
            if (stats.count > 0) {
                routes[route] = {
                    requests: stats.count,
                    avgTime: (stats.totalTime / stats.count).toFixed(2) + 'ms',
                    minTime: stats.minTime.toFixed(2) + 'ms',
                    maxTime: stats.maxTime.toFixed(2) + 'ms',
                    errorRate: ((stats.errors / stats.count) * 100).toFixed(2) + '%',
                    percentiles: stats.recentTimes.length > 0 ? {
                        p50: this.calculatePercentile(stats.recentTimes, 50).toFixed(2) + 'ms',
                        p90: this.calculatePercentile(stats.recentTimes, 90).toFixed(2) + 'ms',
                        p95: this.calculatePercentile(stats.recentTimes, 95).toFixed(2) + 'ms'
                    } : null
                };
            }
        }

        return routes;
    }

    getHistoricalMetrics(timeRange = 3600000) { // Default 1 hour
        const cutoffTime = Date.now() - timeRange;
        const historicalData = this.metrics.aggregated.filter(d => d.timestamp >= cutoffTime);

        if (historicalData.length === 0) {
            return { message: 'No historical data available for the specified time range' };
        }

        return {
            timeRange: `${timeRange / 60000} minutes`,
            dataPoints: historicalData.length,
            summary: {
                avgResponseTime: (historicalData.reduce((sum, d) => sum + d.avgTime, 0) / historicalData.length).toFixed(2) + 'ms',
                maxResponseTime: Math.max(...historicalData.map(d => d.maxTime)).toFixed(2) + 'ms',
                avgThroughput: (historicalData.reduce((sum, d) => sum + d.throughput, 0) / historicalData.length).toFixed(1) + ' rpm',
                avgErrorRate: ((historicalData.reduce((sum, d) => sum + d.errorRate, 0) / historicalData.length) * 100).toFixed(2) + '%'
            },
            data: historicalData
        };
    }

    // ==================== UTILITY METHODS ====================

    getRecentRequests(timeWindow) {
        const cutoffTime = Date.now() - timeWindow;
        return this.metrics.requests.filter(req => req.timestamp >= cutoffTime);
    }

    calculateMean(values) {
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    calculateHealthScore(responseTimes, errorRate) {
        const avgResponseTime = this.calculateMean(responseTimes);

        // Health score based on response time and error rate
        let score = 100;

        // Penalize for slow response times
        if (avgResponseTime > this.baselines.avgResponseTime) {
            score -= Math.min(40, (avgResponseTime - this.baselines.avgResponseTime) / 10);
        }

        // Penalize for high error rate
        if (errorRate > this.baselines.errorRate) {
            score -= Math.min(40, (errorRate - this.baselines.errorRate) * 1000);
        }

        return Math.max(0, score).toFixed(1);
    }

    getOverallTrend() {
        const trendData = this.metrics.trends.get('overall');
        return trendData ? trendData.trend : 'unknown';
    }

    identifyBottlenecks() {
        const bottlenecks = [];

        // Identify slow routes
        for (const [route, stats] of this.routeMetrics.entries()) {
            const avgTime = stats.totalTime / stats.count;
            if (avgTime > this.config.warningThreshold && stats.count > 10) {
                bottlenecks.push({
                    type: 'slow_route',
                    route: route,
                    avgTime: avgTime.toFixed(2) + 'ms',
                    requests: stats.count
                });
            }
        }

        // Check for memory or system issues
        const recentRequests = this.getRecentRequests(300000);
        const recentErrors = recentRequests.filter(r => r.statusCode >= 500).length;
        const errorRate = recentErrors / recentRequests.length;

        if (errorRate > 0.05) {
            bottlenecks.push({
                type: 'high_error_rate',
                errorRate: (errorRate * 100).toFixed(2) + '%',
                errors: recentErrors
            });
        }

        return bottlenecks;
    }

    // ==================== HELPER METHODS ====================

    generateRequestId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    extractRoute(req) {
        // Extract route pattern from request
        if (req.route && req.route.path) {
            return req.route.path;
        }

        // Fallback to URL path
        const url = req.originalUrl || req.url;
        return url.split('?')[0]; // Remove query parameters
    }

    recordSlowRequest(requestData) {
        console.warn(`🐌 Slow request detected: ${requestData.method} ${requestData.url} - ${requestData.responseTime.toFixed(0)}ms`);
    }

    getEmptyMetrics() {
        return {
            timestamp: new Date().toISOString(),
            message: 'No recent requests to analyze',
            responseTime: { average: '0ms', median: '0ms', p95: '0ms' },
            throughput: { rpm: '0', rps: '0' },
            errors: { count: 0, rate: '0%' }
        };
    }

    // ==================== PERSISTENCE ====================

    startAutoSave() {
        setInterval(() => {
            this.saveMetrics();
        }, this.config.autoSaveInterval);
    }

    saveMetrics() {
        if (!this.config.enablePersistence) return;

        try {
            const metricsData = {
                timestamp: new Date().toISOString(),
                counters: this.counters,
                aggregated: this.metrics.aggregated.slice(-100), // Save recent aggregated data
                alerts: this.metrics.alerts.slice(-50), // Save recent alerts
                routeMetrics: Object.fromEntries(this.routeMetrics)
            };

            const filePath = path.join(this.config.dataDir, `metrics-${new Date().toISOString().split('T')[0]}.json`);
            fs.writeFileSync(filePath, JSON.stringify(metricsData, null, 2));

        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    loadHistoricalData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const filePath = path.join(this.config.dataDir, `metrics-${today}.json`);

            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                if (data.counters) this.counters = { ...this.counters, ...data.counters };
                if (data.aggregated) this.metrics.aggregated = data.aggregated;
                if (data.alerts) this.metrics.alerts = data.alerts;
                if (data.routeMetrics) {
                    this.routeMetrics = new Map(Object.entries(data.routeMetrics));
                }

                console.log('📁 Historical performance data loaded');
            }

        } catch (error) {
            console.error('Error loading historical data:', error);
        }
    }

    startTrendAnalysis() {
        if (!this.config.enableTrendAnalysis) return;

        setInterval(() => {
            // Analyze trends for each route
            for (const [route] of this.routeMetrics.entries()) {
                this.analyzeRouteTrend(route);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    analyzeRouteTrend(route) {
        // Implementation for individual route trend analysis
        // This would be similar to analyzePerformanceTrends but for specific routes
    }

    // ==================== PUBLIC API ====================

    getHealthStatus() {
        const metrics = this.getCurrentMetrics();
        const avgResponseTime = parseFloat(metrics.responseTime.average);
        const errorRate = parseFloat(metrics.errors.rate);
        const healthScore = parseFloat(metrics.performance.healthScore);

        return {
            status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'degraded' : 'unhealthy',
            timestamp: new Date().toISOString(),
            healthScore: healthScore,
            metrics: metrics,
            thresholds: {
                warning: this.config.warningThreshold + 'ms',
                critical: this.config.criticalThreshold + 'ms'
            },
            recommendations: this.getPerformanceRecommendations(avgResponseTime, errorRate)
        };
    }

    getPerformanceRecommendations(avgResponseTime, errorRate) {
        const recommendations = [];

        if (avgResponseTime > this.config.warningThreshold) {
            recommendations.push('Consider optimizing slow endpoints or adding caching');
        }

        if (errorRate > 5) {
            recommendations.push('High error rate detected, investigate application issues');
        }

        if (this.counters.slowRequests > this.counters.totalRequests * 0.1) {
            recommendations.push('More than 10% of requests are slow, consider performance optimization');
        }

        return recommendations;
    }

    resetMetrics() {
        this.metrics = {
            requests: [],
            currentWindow: {
                startTime: Date.now(),
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                errors: 0
            },
            aggregated: [],
            alerts: [],
            trends: new Map()
        };

        this.counters = {
            totalRequests: 0,
            slowRequests: 0,
            errorRequests: 0,
            timeouts: 0,
            lastReset: Date.now()
        };

        this.routeMetrics.clear();

        console.log('📊 Performance metrics reset');
    }
}

module.exports = ResponseTimeMonitor;