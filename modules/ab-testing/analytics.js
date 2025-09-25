/**
 * Advanced Analytics System for A/B Testing
 * Tracks engagement, performance, and user behavior
 */

const fs = require('fs');
const path = require('path');
const ErrorHandler = require('./error-handler');

class AnalyticsEngine {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(__dirname, '../../data');
        this.engagementFile = path.join(this.dataDir, 'engagement-metrics.json');
        this.performanceFile = path.join(this.dataDir, 'performance-metrics.json');
        this.conversionFile = path.join(this.dataDir, 'conversion-metrics.json');
        this.userJourneyFile = path.join(this.dataDir, 'user-journeys.json');

        this.errorHandler = new ErrorHandler(options);
        this.initializeFiles();

        // Real-time metrics cache
        this.realtimeMetrics = {
            activeUsers: new Set(),
            featureUsage: new Map(),
            errors: [],
            lastCleanup: Date.now()
        };

        // Start background cleanup
        this.startBackgroundTasks();

        console.log('📊 Analytics Engine initialized');
    }

    initializeFiles() {
        const files = [
            { path: this.engagementFile, data: [] },
            { path: this.performanceFile, data: [] },
            { path: this.conversionFile, data: [] },
            { path: this.userJourneyFile, data: {} }
        ];

        files.forEach(({ path: filePath, data }) => {
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        });
    }

    // ==================== ENGAGEMENT TRACKING ====================

    trackEngagement(userId, eventData) {
        const engagement = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            userId,
            sessionId: eventData.sessionId,
            eventType: eventData.eventType,
            feature: eventData.feature,
            variant: eventData.variant,
            segment: eventData.segment,
            metadata: {
                duration: eventData.duration || 0,
                clicks: eventData.clicks || 0,
                scrollDepth: eventData.scrollDepth || 0,
                interactions: eventData.interactions || 0,
                completionRate: eventData.completionRate || 0,
                userAgent: eventData.userAgent,
                viewport: eventData.viewport,
                pageLoadTime: eventData.pageLoadTime
            }
        };

        this.saveEngagementEvent(engagement);
        this.updateRealtimeMetrics(engagement);

        return engagement.id;
    }

    trackFeatureEngagement(userId, featureName, engagementData) {
        const baseEvent = {
            eventType: 'feature_engagement',
            feature: featureName,
            sessionId: engagementData.sessionId,
            segment: engagementData.segment,
            variant: engagementData.variant,
            ...engagementData
        };

        return this.trackEngagement(userId, baseEvent);
    }

    trackUserAction(userId, action, context = {}) {
        const actionEvent = {
            eventType: 'user_action',
            feature: context.feature,
            sessionId: context.sessionId,
            segment: context.segment,
            clicks: 1,
            interactions: 1,
            metadata: {
                action: action,
                elementId: context.elementId,
                elementType: context.elementType,
                value: context.value,
                context: context.additionalContext
            }
        };

        return this.trackEngagement(userId, actionEvent);
    }

    // ==================== PERFORMANCE TRACKING ====================

    trackPerformance(featureName, performanceData) {
        const performance = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            feature: featureName,
            variant: performanceData.variant,
            metrics: {
                responseTime: performanceData.responseTime,
                renderTime: performanceData.renderTime,
                errorRate: performanceData.errorRate,
                memoryUsage: performanceData.memoryUsage,
                cpuUsage: performanceData.cpuUsage,
                networkLatency: performanceData.networkLatency,
                cacheHitRate: performanceData.cacheHitRate
            },
            environment: {
                userAgent: performanceData.userAgent,
                connection: performanceData.connection,
                deviceType: performanceData.deviceType,
                browserVersion: performanceData.browserVersion
            }
        };

        this.savePerformanceEvent(performance);
        return performance.id;
    }

    trackApiPerformance(endpoint, method, duration, statusCode) {
        return this.trackPerformance('api_call', {
            responseTime: duration,
            variant: 'api',
            metadata: {
                endpoint,
                method,
                statusCode,
                success: statusCode < 400
            }
        });
    }

    trackFeatureError(featureName, error, context = {}) {
        const errorEvent = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            feature: featureName,
            variant: context.variant,
            error: {
                message: error.message,
                stack: error.stack,
                type: error.constructor.name
            },
            context: {
                userId: context.userId,
                sessionId: context.sessionId,
                segment: context.segment,
                userAgent: context.userAgent,
                url: context.url
            }
        };

        // Add to realtime errors
        this.realtimeMetrics.errors.push(errorEvent);

        // Keep only recent errors
        if (this.realtimeMetrics.errors.length > 100) {
            this.realtimeMetrics.errors = this.realtimeMetrics.errors.slice(-100);
        }

        console.error(`🔥 Feature error tracked: ${featureName}`, errorEvent);
        return errorEvent.id;
    }

    // ==================== CONVERSION TRACKING ====================

    trackConversion(userId, conversionData) {
        const conversion = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            userId,
            sessionId: conversionData.sessionId,
            segment: conversionData.segment,
            conversionType: conversionData.type,
            value: conversionData.value || 0,
            currency: conversionData.currency || 'USD',
            funnel: {
                source: conversionData.source,
                medium: conversionData.medium,
                campaign: conversionData.campaign,
                step: conversionData.funnelStep,
                totalSteps: conversionData.totalSteps
            },
            features: conversionData.featuresUsed || [],
            attribution: {
                firstTouch: conversionData.firstTouch,
                lastTouch: conversionData.lastTouch,
                touchpoints: conversionData.touchpoints || []
            }
        };

        this.saveConversionEvent(conversion);
        return conversion.id;
    }

    trackFunnelStep(userId, step, funnelData) {
        return this.trackConversion(userId, {
            type: 'funnel_step',
            funnelStep: step,
            totalSteps: funnelData.totalSteps,
            sessionId: funnelData.sessionId,
            segment: funnelData.segment,
            featuresUsed: funnelData.featuresUsed
        });
    }

    // ==================== USER JOURNEY TRACKING ====================

    startUserJourney(userId, journeyType, initialData = {}) {
        const journeys = this.getUserJourneys();

        const journeyId = this.generateId();
        const journey = {
            id: journeyId,
            userId,
            type: journeyType,
            status: 'active',
            startTime: new Date().toISOString(),
            steps: [],
            features: new Set(),
            segments: new Set(),
            metadata: initialData
        };

        if (!journeys[userId]) {
            journeys[userId] = [];
        }

        journeys[userId].push(journey);
        this.saveUserJourneys(journeys);

        return journeyId;
    }

    addJourneyStep(userId, journeyId, stepData) {
        const journeys = this.getUserJourneys();
        const userJourneys = journeys[userId] || [];
        const journey = userJourneys.find(j => j.id === journeyId);

        if (journey && journey.status === 'active') {
            const step = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                action: stepData.action,
                feature: stepData.feature,
                variant: stepData.variant,
                segment: stepData.segment,
                duration: stepData.duration,
                outcome: stepData.outcome,
                metadata: stepData.metadata || {}
            };

            journey.steps.push(step);

            if (stepData.feature) {
                journey.features.add(stepData.feature);
            }
            if (stepData.segment) {
                journey.segments.add(stepData.segment);
            }

            // Convert Sets to Arrays for JSON serialization
            journey.features = Array.from(journey.features);
            journey.segments = Array.from(journey.segments);

            this.saveUserJourneys(journeys);
        }

        return journey;
    }

    completeUserJourney(userId, journeyId, outcome) {
        const journeys = this.getUserJourneys();
        const userJourneys = journeys[userId] || [];
        const journey = userJourneys.find(j => j.id === journeyId);

        if (journey) {
            journey.status = 'completed';
            journey.endTime = new Date().toISOString();
            journey.outcome = outcome;
            journey.duration = new Date(journey.endTime) - new Date(journey.startTime);

            this.saveUserJourneys(journeys);
        }

        return journey;
    }

    // ==================== ANALYTICS QUERIES ====================

    getEngagementMetrics(timeRange = 7, segment = null, feature = null) {
        const events = this.getEngagementEvents();
        const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

        let filteredEvents = events.filter(event =>
            new Date(event.timestamp) >= cutoffDate
        );

        if (segment) {
            filteredEvents = filteredEvents.filter(event => event.segment === segment);
        }

        if (feature) {
            filteredEvents = filteredEvents.filter(event => event.feature === feature);
        }

        const metrics = {
            totalEvents: filteredEvents.length,
            uniqueUsers: new Set(filteredEvents.map(e => e.userId)).size,
            avgDuration: this.average(filteredEvents.map(e => e.metadata.duration || 0)),
            avgInteractions: this.average(filteredEvents.map(e => e.metadata.interactions || 0)),
            avgScrollDepth: this.average(filteredEvents.map(e => e.metadata.scrollDepth || 0)),
            completionRate: this.average(filteredEvents.map(e => e.metadata.completionRate || 0)),
            byFeature: {},
            bySegment: {},
            byDay: {}
        };

        // Group by feature
        filteredEvents.forEach(event => {
            const feature = event.feature || 'unknown';
            if (!metrics.byFeature[feature]) {
                metrics.byFeature[feature] = { count: 0, users: new Set() };
            }
            metrics.byFeature[feature].count++;
            metrics.byFeature[feature].users.add(event.userId);
        });

        // Convert Sets to counts
        Object.keys(metrics.byFeature).forEach(feature => {
            metrics.byFeature[feature].uniqueUsers = metrics.byFeature[feature].users.size;
            delete metrics.byFeature[feature].users;
        });

        return metrics;
    }

    getPerformanceMetrics(timeRange = 7, feature = null) {
        const events = this.getPerformanceEvents();
        const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

        let filteredEvents = events.filter(event =>
            new Date(event.timestamp) >= cutoffDate
        );

        if (feature) {
            filteredEvents = filteredEvents.filter(event => event.feature === feature);
        }

        return {
            totalEvents: filteredEvents.length,
            avgResponseTime: this.average(filteredEvents.map(e => e.metrics.responseTime || 0)),
            avgRenderTime: this.average(filteredEvents.map(e => e.metrics.renderTime || 0)),
            errorRate: this.average(filteredEvents.map(e => e.metrics.errorRate || 0)),
            avgMemoryUsage: this.average(filteredEvents.map(e => e.metrics.memoryUsage || 0)),
            p95ResponseTime: this.percentile(filteredEvents.map(e => e.metrics.responseTime || 0), 95),
            p99ResponseTime: this.percentile(filteredEvents.map(e => e.metrics.responseTime || 0), 99)
        };
    }

    getConversionMetrics(timeRange = 7, segment = null) {
        const events = this.getConversionEvents();
        const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

        let filteredEvents = events.filter(event =>
            new Date(event.timestamp) >= cutoffDate
        );

        if (segment) {
            filteredEvents = filteredEvents.filter(event => event.segment === segment);
        }

        const totalValue = filteredEvents.reduce((sum, event) => sum + (event.value || 0), 0);
        const conversions = filteredEvents.filter(event => event.conversionType !== 'funnel_step');

        return {
            totalConversions: conversions.length,
            totalValue: totalValue,
            avgConversionValue: conversions.length > 0 ? totalValue / conversions.length : 0,
            conversionRate: this.calculateConversionRate(filteredEvents),
            byType: this.groupBy(conversions, 'conversionType'),
            funnelAnalysis: this.analyzeFunnel(filteredEvents)
        };
    }

    // ==================== REAL-TIME METRICS ====================

    getRealtimeMetrics() {
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        return {
            timestamp: new Date().toISOString(),
            activeUsers: this.realtimeMetrics.activeUsers.size,
            featureUsage: Object.fromEntries(this.realtimeMetrics.featureUsage),
            recentErrors: this.realtimeMetrics.errors.filter(e =>
                new Date(e.timestamp).getTime() > fiveMinutesAgo
            ).length,
            systemHealth: this.calculateSystemHealth()
        };
    }

    updateRealtimeMetrics(event) {
        // Track active users
        this.realtimeMetrics.activeUsers.add(event.userId);

        // Track feature usage
        if (event.feature) {
            const current = this.realtimeMetrics.featureUsage.get(event.feature) || 0;
            this.realtimeMetrics.featureUsage.set(event.feature, current + 1);
        }

        // Cleanup old data periodically
        if (Date.now() - this.realtimeMetrics.lastCleanup > 5 * 60 * 1000) {
            this.cleanupRealtimeMetrics();
        }
    }

    cleanupRealtimeMetrics() {
        // Clear active users (they'll be re-added by new events)
        this.realtimeMetrics.activeUsers.clear();

        // Decay feature usage counts
        for (const [feature, count] of this.realtimeMetrics.featureUsage.entries()) {
            this.realtimeMetrics.featureUsage.set(feature, Math.max(0, Math.floor(count * 0.8)));
        }

        this.realtimeMetrics.lastCleanup = Date.now();
    }

    // ==================== ADVANCED ANALYTICS ====================

    generateInsights(timeRange = 7) {
        const insights = [];

        try {
            const engagementMetrics = this.getEngagementMetrics(timeRange);
            const performanceMetrics = this.getPerformanceMetrics(timeRange);
            const conversionMetrics = this.getConversionMetrics(timeRange);

            // Engagement insights
            if (engagementMetrics.avgDuration > 120) {
                insights.push({
                    type: 'positive',
                    category: 'engagement',
                    message: `High user engagement detected: average session duration is ${Math.round(engagementMetrics.avgDuration)}s`,
                    metric: engagementMetrics.avgDuration,
                    threshold: 120
                });
            }

            // Performance insights
            if (performanceMetrics.avgResponseTime > 2000) {
                insights.push({
                    type: 'warning',
                    category: 'performance',
                    message: `Slow response times detected: average ${Math.round(performanceMetrics.avgResponseTime)}ms`,
                    metric: performanceMetrics.avgResponseTime,
                    threshold: 2000
                });
            }

            // Feature adoption insights
            const topFeatures = Object.entries(engagementMetrics.byFeature)
                .sort(([,a], [,b]) => b.count - a.count)
                .slice(0, 3);

            if (topFeatures.length > 0) {
                insights.push({
                    type: 'info',
                    category: 'adoption',
                    message: `Top performing features: ${topFeatures.map(([name]) => name).join(', ')}`,
                    data: topFeatures
                });
            }

            // Conversion insights
            if (conversionMetrics.conversionRate > 0.1) {
                insights.push({
                    type: 'positive',
                    category: 'conversion',
                    message: `Good conversion rate: ${(conversionMetrics.conversionRate * 100).toFixed(1)}%`,
                    metric: conversionMetrics.conversionRate
                });
            }

        } catch (error) {
            console.error('Error generating insights:', error);
            insights.push({
                type: 'error',
                category: 'system',
                message: 'Unable to generate insights due to data processing error'
            });
        }

        return insights;
    }

    // ==================== UTILITY METHODS ====================

    generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    average(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    percentile(numbers, p) {
        if (numbers.length === 0) return 0;
        const sorted = numbers.sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p / 100) - 1;
        return sorted[index];
    }

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || { count: 0, items: [] };
            groups[group].count++;
            groups[group].items.push(item);
            return groups;
        }, {});
    }

    calculateConversionRate(events) {
        const funnelSteps = events.filter(e => e.conversionType === 'funnel_step');
        const conversions = events.filter(e => e.conversionType !== 'funnel_step');

        if (funnelSteps.length === 0) return 0;
        return conversions.length / funnelSteps.length;
    }

    analyzeFunnel(events) {
        const funnelSteps = events.filter(e => e.conversionType === 'funnel_step');
        const stepCounts = {};

        funnelSteps.forEach(event => {
            const step = event.funnel.step;
            stepCounts[step] = (stepCounts[step] || 0) + 1;
        });

        return stepCounts;
    }

    calculateSystemHealth() {
        const recentErrors = this.realtimeMetrics.errors.length;
        const errorThreshold = 10;

        if (recentErrors === 0) return 'excellent';
        if (recentErrors < errorThreshold * 0.3) return 'good';
        if (recentErrors < errorThreshold * 0.7) return 'warning';
        return 'critical';
    }

    // ==================== DATA ACCESS METHODS ====================

    getEngagementEvents() {
        try {
            return JSON.parse(fs.readFileSync(this.engagementFile, 'utf8'));
        } catch {
            return [];
        }
    }

    getPerformanceEvents() {
        try {
            return JSON.parse(fs.readFileSync(this.performanceFile, 'utf8'));
        } catch {
            return [];
        }
    }

    getConversionEvents() {
        try {
            return JSON.parse(fs.readFileSync(this.conversionFile, 'utf8'));
        } catch {
            return [];
        }
    }

    getUserJourneys() {
        try {
            return JSON.parse(fs.readFileSync(this.userJourneyFile, 'utf8'));
        } catch {
            return {};
        }
    }

    saveEngagementEvent(event) {
        const events = this.getEngagementEvents();
        events.push(event);

        // Keep only recent events to manage file size
        if (events.length > 10000) {
            events.splice(0, events.length - 10000);
        }

        fs.writeFileSync(this.engagementFile, JSON.stringify(events, null, 2));
    }

    savePerformanceEvent(event) {
        const events = this.getPerformanceEvents();
        events.push(event);

        if (events.length > 5000) {
            events.splice(0, events.length - 5000);
        }

        fs.writeFileSync(this.performanceFile, JSON.stringify(events, null, 2));
    }

    saveConversionEvent(event) {
        const events = this.getConversionEvents();
        events.push(event);
        fs.writeFileSync(this.conversionFile, JSON.stringify(events, null, 2));
    }

    saveUserJourneys(journeys) {
        fs.writeFileSync(this.userJourneyFile, JSON.stringify(journeys, null, 2));
    }

    startBackgroundTasks() {
        // Cleanup task every 5 minutes
        setInterval(() => {
            this.cleanupRealtimeMetrics();
        }, 5 * 60 * 1000);

        console.log('🔄 Background analytics tasks started');
    }
}

module.exports = AnalyticsEngine;