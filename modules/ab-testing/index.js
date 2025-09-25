/**
 * A/B Testing System for Intelligent Features
 * Handles user segments, feature flags, and analytics
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ABTestingManager {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(__dirname, '../../data');
        this.configFile = path.join(this.dataDir, 'ab-testing-config.json');
        this.experimentsFile = path.join(this.dataDir, 'ab-experiments.json');
        this.userSegmentsFile = path.join(this.dataDir, 'user-segments.json');
        this.analyticsFile = path.join(this.dataDir, 'ab-analytics.json');

        this.ensureDataDirectory();
        this.initializeConfig();

        // Cache for performance
        this.cache = {
            config: null,
            experiments: null,
            userSegments: null,
            lastUpdate: null
        };

        console.log('🧪 A/B Testing Manager initialized');
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    initializeConfig() {
        if (!fs.existsSync(this.configFile)) {
            const defaultConfig = {
                version: "1.0.0",
                enabled: true,
                segments: {
                    beta: {
                        name: "Beta Users",
                        description: "Early adopters testing new features",
                        percentage: 15,
                        criteria: {
                            minSessions: 3,
                            userTypes: ["power_user", "early_adopter"],
                            signupDaysAgo: 7
                        },
                        features: {
                            intelligentCosting: { enabled: true, variant: "full" },
                            businessClassification: { enabled: true, variant: "advanced" },
                            adaptiveQuestions: { enabled: true, variant: "dynamic" },
                            intelligentValidation: { enabled: true, variant: "strict" },
                            advancedRecommendations: { enabled: true, variant: "ai_powered" }
                        }
                    },
                    regular: {
                        name: "Regular Users",
                        description: "Standard user experience",
                        percentage: 70,
                        criteria: {
                            minSessions: 1,
                            userTypes: ["regular", "new"],
                            signupDaysAgo: 0
                        },
                        features: {
                            intelligentCosting: { enabled: true, variant: "basic" },
                            businessClassification: { enabled: true, variant: "standard" },
                            adaptiveQuestions: { enabled: false, variant: "none" },
                            intelligentValidation: { enabled: true, variant: "standard" },
                            advancedRecommendations: { enabled: false, variant: "none" }
                        }
                    },
                    premium: {
                        name: "Premium Users",
                        description: "Paying customers with full features",
                        percentage: 15,
                        criteria: {
                            minSessions: 1,
                            userTypes: ["premium", "subscriber"],
                            signupDaysAgo: 0
                        },
                        features: {
                            intelligentCosting: { enabled: true, variant: "premium" },
                            businessClassification: { enabled: true, variant: "advanced" },
                            adaptiveQuestions: { enabled: true, variant: "personalized" },
                            intelligentValidation: { enabled: true, variant: "comprehensive" },
                            advancedRecommendations: { enabled: true, variant: "ai_powered" }
                        }
                    }
                },
                experiments: {
                    "intelligent_features_rollout": {
                        name: "Intelligent Features Gradual Rollout",
                        description: "Testing engagement with intelligent features",
                        status: "active",
                        startDate: new Date().toISOString(),
                        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                        segments: ["beta", "regular", "premium"],
                        metrics: ["engagement", "session_duration", "feature_usage", "conversion"],
                        successCriteria: {
                            engagement: { increase: 20 },
                            session_duration: { increase: 15 },
                            feature_usage: { adoption: 60 }
                        }
                    }
                },
                featureFlags: {
                    enableSmartClassification: { enabled: true, rollout: 85 },
                    enableAdvancedValidation: { enabled: true, rollout: 70 },
                    enablePersonalizedQuestions: { enabled: false, rollout: 25 },
                    enableAIRecommendations: { enabled: false, rollout: 15 },
                    enableRealTimeInsights: { enabled: false, rollout: 10 }
                }
            };

            fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2));
        }

        if (!fs.existsSync(this.experimentsFile)) {
            fs.writeFileSync(this.experimentsFile, JSON.stringify([], null, 2));
        }

        if (!fs.existsSync(this.userSegmentsFile)) {
            fs.writeFileSync(this.userSegmentsFile, JSON.stringify({}, null, 2));
        }

        if (!fs.existsSync(this.analyticsFile)) {
            fs.writeFileSync(this.analyticsFile, JSON.stringify([], null, 2));
        }
    }

    // ==================== USER SEGMENTATION ====================

    getUserSegment(userId, userProfile = {}) {
        try {
            const config = this.getConfig();
            const userSegments = this.getUserSegments();

            // Check if user already has a segment assigned
            if (userSegments[userId] && userSegments[userId].segment) {
                return userSegments[userId].segment;
            }

            // Determine segment based on user profile and criteria
            const segment = this.determineUserSegment(userProfile, config.segments);

            // Save user segment assignment
            userSegments[userId] = {
                segment: segment,
                assignedAt: new Date().toISOString(),
                profile: userProfile,
                experiments: []
            };

            this.saveUserSegments(userSegments);

            console.log(`👥 User ${userId} assigned to segment: ${segment}`);
            return segment;

        } catch (error) {
            console.error('Error determining user segment:', error);
            return 'regular'; // Default fallback
        }
    }

    determineUserSegment(userProfile, segments) {
        const {
            sessionCount = 0,
            userType = 'new',
            signupDate = new Date(),
            isPremium = false,
            engagementScore = 0
        } = userProfile;

        const daysSinceSignup = Math.floor((Date.now() - new Date(signupDate)) / (1000 * 60 * 60 * 24));

        // Premium users get premium segment
        if (isPremium || userType === 'premium' || userType === 'subscriber') {
            return 'premium';
        }

        // Beta criteria
        const betaCriteria = segments.beta.criteria;
        if (sessionCount >= betaCriteria.minSessions &&
            betaCriteria.userTypes.includes(userType) &&
            daysSinceSignup >= betaCriteria.signupDaysAgo &&
            engagementScore > 0.7) {
            return 'beta';
        }

        // Default to regular
        return 'regular';
    }

    // ==================== FEATURE FLAGS ====================

    isFeatureEnabled(featureName, userId, userSegment = null) {
        try {
            const config = this.getConfig();
            const segment = userSegment || this.getUserSegment(userId);

            // Check feature flag rollout
            const featureFlag = config.featureFlags[featureName];
            if (featureFlag) {
                const userHash = this.getUserHash(userId);
                const rolloutThreshold = featureFlag.rollout / 100;
                const isInRollout = userHash < rolloutThreshold;

                if (!featureFlag.enabled || !isInRollout) {
                    return false;
                }
            }

            // Check segment-specific feature configuration
            const segmentConfig = config.segments[segment];
            if (!segmentConfig) return false;

            const featureConfig = segmentConfig.features[featureName];
            return featureConfig ? featureConfig.enabled : false;

        } catch (error) {
            console.error(`Error checking feature ${featureName}:`, error);
            return false; // Safe fallback
        }
    }

    getFeatureVariant(featureName, userId, userSegment = null) {
        try {
            const config = this.getConfig();
            const segment = userSegment || this.getUserSegment(userId);

            const segmentConfig = config.segments[segment];
            if (!segmentConfig) return 'none';

            const featureConfig = segmentConfig.features[featureName];
            return featureConfig ? featureConfig.variant : 'none';

        } catch (error) {
            console.error(`Error getting variant for ${featureName}:`, error);
            return 'basic'; // Safe fallback
        }
    }

    getUserHash(userId) {
        // Consistent hash for user-based feature rollouts
        const hash = crypto.createHash('md5').update(userId.toString()).digest('hex');
        return parseInt(hash.substr(0, 8), 16) / 0xffffffff;
    }

    // ==================== ANALYTICS TRACKING ====================

    trackEvent(eventData) {
        try {
            const analytics = this.getAnalytics();

            const event = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                ...eventData
            };

            analytics.push(event);

            // Keep only recent events (last 10000 to manage file size)
            if (analytics.length > 10000) {
                analytics.splice(0, analytics.length - 10000);
            }

            this.saveAnalytics(analytics);

        } catch (error) {
            console.error('Error tracking AB test event:', error);
        }
    }

    trackFeatureUsage(userId, featureName, action = 'used', metadata = {}) {
        const userSegment = this.getUserSegment(userId);

        this.trackEvent({
            type: 'feature_usage',
            userId,
            userSegment,
            feature: featureName,
            action,
            variant: this.getFeatureVariant(featureName, userId, userSegment),
            metadata
        });
    }

    trackExperimentEvent(experimentId, userId, eventType, data = {}) {
        const userSegment = this.getUserSegment(userId);

        this.trackEvent({
            type: 'experiment_event',
            experimentId,
            userId,
            userSegment,
            eventType,
            data
        });
    }

    // ==================== EXPERIMENT MANAGEMENT ====================

    createExperiment(experimentConfig) {
        try {
            const experiments = this.getExperiments();

            const experiment = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                createdAt: new Date().toISOString(),
                status: 'draft',
                ...experimentConfig
            };

            experiments.push(experiment);
            this.saveExperiments(experiments);

            console.log(`🧪 Experiment created: ${experiment.name}`);
            return experiment.id;

        } catch (error) {
            console.error('Error creating experiment:', error);
            return null;
        }
    }

    startExperiment(experimentId) {
        try {
            const experiments = this.getExperiments();
            const experiment = experiments.find(e => e.id === experimentId);

            if (experiment) {
                experiment.status = 'active';
                experiment.startedAt = new Date().toISOString();
                this.saveExperiments(experiments);

                console.log(`🚀 Experiment started: ${experiment.name}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Error starting experiment:', error);
            return false;
        }
    }

    stopExperiment(experimentId) {
        try {
            const experiments = this.getExperiments();
            const experiment = experiments.find(e => e.id === experimentId);

            if (experiment) {
                experiment.status = 'completed';
                experiment.completedAt = new Date().toISOString();
                this.saveExperiments(experiments);

                console.log(`⏹️ Experiment stopped: ${experiment.name}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Error stopping experiment:', error);
            return false;
        }
    }

    // ==================== ANALYTICS & REPORTING ====================

    generateAnalyticsReport(timeRange = 7) {
        try {
            const analytics = this.getAnalytics();
            const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

            const recentEvents = analytics.filter(event =>
                new Date(event.timestamp) >= cutoffDate
            );

            const report = {
                timeRange: `${timeRange} days`,
                totalEvents: recentEvents.length,
                segmentBreakdown: {},
                featureUsage: {},
                experiments: {}
            };

            // Segment breakdown
            recentEvents.forEach(event => {
                const segment = event.userSegment || 'unknown';
                if (!report.segmentBreakdown[segment]) {
                    report.segmentBreakdown[segment] = { count: 0, events: {} };
                }
                report.segmentBreakdown[segment].count++;

                const eventType = event.type || 'unknown';
                if (!report.segmentBreakdown[segment].events[eventType]) {
                    report.segmentBreakdown[segment].events[eventType] = 0;
                }
                report.segmentBreakdown[segment].events[eventType]++;
            });

            // Feature usage
            const featureEvents = recentEvents.filter(e => e.type === 'feature_usage');
            featureEvents.forEach(event => {
                const feature = event.feature;
                if (!report.featureUsage[feature]) {
                    report.featureUsage[feature] = {
                        total: 0,
                        variants: {},
                        segments: {}
                    };
                }

                report.featureUsage[feature].total++;

                const variant = event.variant || 'unknown';
                if (!report.featureUsage[feature].variants[variant]) {
                    report.featureUsage[feature].variants[variant] = 0;
                }
                report.featureUsage[feature].variants[variant]++;

                const segment = event.userSegment || 'unknown';
                if (!report.featureUsage[feature].segments[segment]) {
                    report.featureUsage[feature].segments[segment] = 0;
                }
                report.featureUsage[feature].segments[segment]++;
            });

            // Experiment data
            const experimentEvents = recentEvents.filter(e => e.type === 'experiment_event');
            experimentEvents.forEach(event => {
                const expId = event.experimentId;
                if (!report.experiments[expId]) {
                    report.experiments[expId] = {
                        events: 0,
                        segments: {},
                        eventTypes: {}
                    };
                }

                report.experiments[expId].events++;

                const segment = event.userSegment || 'unknown';
                if (!report.experiments[expId].segments[segment]) {
                    report.experiments[expId].segments[segment] = 0;
                }
                report.experiments[expId].segments[segment]++;

                const eventType = event.eventType || 'unknown';
                if (!report.experiments[expId].eventTypes[eventType]) {
                    report.experiments[expId].eventTypes[eventType] = 0;
                }
                report.experiments[expId].eventTypes[eventType]++;
            });

            return report;

        } catch (error) {
            console.error('Error generating analytics report:', error);
            return null;
        }
    }

    // ==================== DATA ACCESS METHODS ====================

    getConfig() {
        if (!this.cache.config || this.isCacheStale()) {
            this.cache.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
            this.cache.lastUpdate = Date.now();
        }
        return this.cache.config;
    }

    getExperiments() {
        try {
            return JSON.parse(fs.readFileSync(this.experimentsFile, 'utf8'));
        } catch {
            return [];
        }
    }

    getUserSegments() {
        try {
            return JSON.parse(fs.readFileSync(this.userSegmentsFile, 'utf8'));
        } catch {
            return {};
        }
    }

    getAnalytics() {
        try {
            return JSON.parse(fs.readFileSync(this.analyticsFile, 'utf8'));
        } catch {
            return [];
        }
    }

    saveExperiments(experiments) {
        fs.writeFileSync(this.experimentsFile, JSON.stringify(experiments, null, 2));
    }

    saveUserSegments(userSegments) {
        fs.writeFileSync(this.userSegmentsFile, JSON.stringify(userSegments, null, 2));
        this.cache.userSegments = userSegments; // Update cache
    }

    saveAnalytics(analytics) {
        fs.writeFileSync(this.analyticsFile, JSON.stringify(analytics, null, 2));
    }

    isCacheStale() {
        return !this.cache.lastUpdate || (Date.now() - this.cache.lastUpdate) > 60000; // 1 minute
    }

    // ==================== HEALTH CHECK ====================

    healthCheck() {
        try {
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                config: {
                    exists: fs.existsSync(this.configFile),
                    valid: !!this.getConfig()
                },
                experiments: {
                    count: this.getExperiments().length
                },
                userSegments: {
                    count: Object.keys(this.getUserSegments()).length
                },
                analytics: {
                    count: this.getAnalytics().length
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = ABTestingManager;