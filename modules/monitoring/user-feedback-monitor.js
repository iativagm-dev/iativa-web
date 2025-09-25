/**
 * User Feedback Monitoring System
 * Collects, analyzes, and monitors user feedback during production rollout
 */

const ProductionAlertSystem = require('../alerting/alert-system');

class UserFeedbackMonitor {
    constructor(config = {}) {
        this.config = {
            // Feedback collection settings
            collection: {
                enabled: true,
                sources: ['api', 'dashboard', 'embedded-widget', 'email', 'chat'],
                autoSentimentAnalysis: true,
                realTimeProcessing: true,
                retentionDays: 90
            },

            // Feedback analysis thresholds
            thresholds: {
                negativeFeedbackRate: {
                    warning: 20,    // 20% negative feedback triggers warning
                    critical: 35    // 35% negative feedback triggers critical alert
                },
                averageRating: {
                    warning: 3.5,   // Below 3.5 stars triggers warning
                    critical: 2.8   // Below 2.8 stars triggers critical alert
                },
                issueReportRate: {
                    warning: 5,     // 5% of users reporting issues triggers warning
                    critical: 10    // 10% of users reporting issues triggers critical alert
                },
                satisfactionScore: {
                    warning: 70,    // Below 70% satisfaction triggers warning
                    critical: 50    // Below 50% satisfaction triggers critical alert
                }
            },

            // Feedback categorization
            categories: {
                bugs: ['bug', 'error', 'broken', 'not working', 'issue', 'problem'],
                performance: ['slow', 'loading', 'timeout', 'lag', 'performance'],
                usability: ['confusing', 'difficult', 'hard to use', 'ui', 'ux'],
                features: ['missing', 'wish', 'would like', 'feature request'],
                positive: ['great', 'love', 'excellent', 'amazing', 'perfect', 'good']
            },

            // Alert settings
            alerts: {
                enabled: true,
                checkIntervalMs: 300000,      // Check every 5 minutes
                trendAnalysisWindowMs: 3600000, // 1 hour trend analysis
                alertCooldownMs: 1800000      // 30 minutes between similar alerts
            },

            // Business impact tracking
            businessImpact: {
                enabled: true,
                trackConversionImpact: true,
                trackEngagementImpact: true,
                trackRetentionImpact: true
            },

            ...config
        };

        this.alertSystem = new ProductionAlertSystem();
        this.feedbackStorage = new Map();
        this.analysisCache = new Map();
        this.alertHistory = new Map();
        this.monitoringInterval = null;

        // Real-time feedback statistics
        this.stats = {
            totalFeedback: 0,
            byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            byCategory: {
                bugs: 0,
                performance: 0,
                usability: 0,
                features: 0,
                positive: 0,
                uncategorized: 0
            },
            bySentiment: {
                positive: 0,
                neutral: 0,
                negative: 0
            },
            byPhase: {},
            trends: {
                hourly: [],
                daily: []
            }
        };
    }

    /**
     * Initialize the user feedback monitoring system
     */
    async initialize() {
        try {
            console.log('💬 Initializing User Feedback Monitor...');

            // Load existing feedback if any
            await this.loadExistingFeedback();

            // Start monitoring interval
            this.startMonitoring();

            // Initialize alert system
            await this.alertSystem.sendAlert({
                message: 'User Feedback Monitor initialized and active',
                severity: 'info',
                component: 'feedback-monitor',
                data: {
                    sources: this.config.collection.sources,
                    thresholds: this.config.thresholds
                }
            });

            console.log('✅ User Feedback Monitor initialized successfully');
            return true;

        } catch (error) {
            console.error('💥 Failed to initialize User Feedback Monitor:', error);
            await this.alertSystem.sendAlert({
                message: `User Feedback Monitor initialization failed: ${error.message}`,
                severity: 'critical',
                component: 'feedback-monitor',
                data: { error: error.message }
            });
            return false;
        }
    }

    /**
     * Start monitoring feedback metrics
     */
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(async () => {
            try {
                await this.analyzeFeedbackTrends();
                await this.checkAlertThresholds();
                this.updateTrendData();
            } catch (error) {
                console.error('Feedback monitoring error:', error);
            }
        }, this.config.alerts.checkIntervalMs);

        console.log('📊 Started feedback trend monitoring');
    }

    /**
     * Collect new user feedback
     */
    async collectFeedback(feedback) {
        try {
            // Normalize feedback format
            const normalizedFeedback = this.normalizeFeedback(feedback);

            // Store feedback
            const feedbackId = this.generateFeedbackId();
            this.feedbackStorage.set(feedbackId, normalizedFeedback);

            // Update statistics
            this.updateStatistics(normalizedFeedback);

            // Perform real-time analysis
            const analysis = await this.analyzeFeedback(normalizedFeedback);

            // Check for immediate alerts
            await this.checkImmediateAlerts(normalizedFeedback, analysis);

            console.log(`📝 Collected feedback: ${normalizedFeedback.type} (${analysis.sentiment})`);

            return {
                success: true,
                feedbackId,
                analysis
            };

        } catch (error) {
            console.error('Error collecting feedback:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Normalize feedback to standard format
     */
    normalizeFeedback(feedback) {
        return {
            id: feedback.id || this.generateFeedbackId(),
            timestamp: feedback.timestamp || new Date().toISOString(),
            userId: feedback.userId || 'anonymous',
            source: feedback.source || 'api',
            type: feedback.type || 'comment',
            rating: feedback.rating || null,
            comment: feedback.comment || '',
            feature: feedback.feature || 'general',
            phase: feedback.phase || 'unknown',
            metadata: feedback.metadata || {},
            processed: false
        };
    }

    /**
     * Analyze individual feedback
     */
    async analyzeFeedback(feedback) {
        const analysis = {
            sentiment: this.analyzeSentiment(feedback.comment),
            categories: this.categorizeComment(feedback.comment),
            urgency: this.assessUrgency(feedback),
            businessImpact: this.assessBusinessImpact(feedback)
        };

        // Cache analysis
        this.analysisCache.set(feedback.id, analysis);

        return analysis;
    }

    /**
     * Perform basic sentiment analysis
     */
    analyzeSentiment(text) {
        if (!text) return 'neutral';

        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'useless', 'worst', 'horrible'];

        const words = text.toLowerCase().split(/\s+/);
        let positiveScore = 0;
        let negativeScore = 0;

        words.forEach(word => {
            if (positiveWords.includes(word)) positiveScore++;
            if (negativeWords.includes(word)) negativeScore++;
        });

        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }

    /**
     * Categorize feedback comment
     */
    categorizeComment(comment) {
        if (!comment) return ['uncategorized'];

        const text = comment.toLowerCase();
        const categories = [];

        for (const [category, keywords] of Object.entries(this.config.categories)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                categories.push(category);
            }
        }

        return categories.length > 0 ? categories : ['uncategorized'];
    }

    /**
     * Assess feedback urgency
     */
    assessUrgency(feedback) {
        let urgencyScore = 0;

        // Rating-based urgency
        if (feedback.rating && feedback.rating <= 2) urgencyScore += 3;
        else if (feedback.rating && feedback.rating <= 3) urgencyScore += 1;

        // Comment-based urgency
        const urgentKeywords = ['broken', 'error', 'bug', 'crash', 'not working', 'urgent'];
        const comment = (feedback.comment || '').toLowerCase();

        urgentKeywords.forEach(keyword => {
            if (comment.includes(keyword)) urgencyScore += 2;
        });

        if (urgencyScore >= 5) return 'critical';
        if (urgencyScore >= 3) return 'high';
        if (urgencyScore >= 1) return 'medium';
        return 'low';
    }

    /**
     * Assess business impact of feedback
     */
    assessBusinessImpact(feedback) {
        let impactScore = 0;

        // Feature-specific impact
        if (feedback.feature === 'core') impactScore += 3;
        if (['payment', 'checkout'].includes(feedback.feature)) impactScore += 4;

        // User type impact (if available)
        if (feedback.metadata?.userType === 'premium') impactScore += 2;
        if (feedback.metadata?.userType === 'enterprise') impactScore += 3;

        // Phase impact
        if (['phase1', 'phase2'].includes(feedback.phase)) impactScore += 2;

        if (impactScore >= 6) return 'high';
        if (impactScore >= 3) return 'medium';
        return 'low';
    }

    /**
     * Update feedback statistics
     */
    updateStatistics(feedback) {
        this.stats.totalFeedback++;

        // Update rating statistics
        if (feedback.rating) {
            this.stats.byRating[feedback.rating] = (this.stats.byRating[feedback.rating] || 0) + 1;
        }

        // Update phase statistics
        if (feedback.phase) {
            this.stats.byPhase[feedback.phase] = (this.stats.byPhase[feedback.phase] || 0) + 1;
        }

        // Update sentiment statistics
        const analysis = this.analysisCache.get(feedback.id);
        if (analysis) {
            this.stats.bySentiment[analysis.sentiment]++;

            // Update category statistics
            analysis.categories.forEach(category => {
                this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;
            });
        }
    }

    /**
     * Check for immediate alerts based on single feedback
     */
    async checkImmediateAlerts(feedback, analysis) {
        // Critical rating alert
        if (feedback.rating && feedback.rating <= 1) {
            await this.sendAlert('critical_rating', {
                message: `Critical rating received: ${feedback.rating}/5 stars`,
                severity: 'warning',
                data: { feedback, analysis }
            });
        }

        // Bug report alert
        if (analysis.categories.includes('bugs') && analysis.urgency === 'critical') {
            await this.sendAlert('critical_bug', {
                message: `Critical bug reported: ${feedback.comment.substring(0, 100)}...`,
                severity: 'critical',
                data: { feedback, analysis }
            });
        }

        // High business impact alert
        if (analysis.businessImpact === 'high' && analysis.sentiment === 'negative') {
            await this.sendAlert('high_impact_negative', {
                message: `High business impact negative feedback received`,
                severity: 'warning',
                data: { feedback, analysis }
            });
        }
    }

    /**
     * Analyze feedback trends over time
     */
    async analyzeFeedbackTrends() {
        const now = Date.now();
        const windowMs = this.config.alerts.trendAnalysisWindowMs;
        const cutoffTime = now - windowMs;

        // Get recent feedback
        const recentFeedback = Array.from(this.feedbackStorage.values())
            .filter(f => new Date(f.timestamp).getTime() >= cutoffTime);

        if (recentFeedback.length === 0) {
            return;
        }

        // Calculate trend metrics
        const trends = {
            totalFeedback: recentFeedback.length,
            averageRating: this.calculateAverageRating(recentFeedback),
            negativeFeedbackRate: this.calculateNegativeFeedbackRate(recentFeedback),
            issueReportRate: this.calculateIssueReportRate(recentFeedback),
            satisfactionScore: this.calculateSatisfactionScore(recentFeedback),
            topCategories: this.getTopCategories(recentFeedback),
            sentimentDistribution: this.getSentimentDistribution(recentFeedback)
        };

        // Store trends for API access
        this.currentTrends = trends;

        return trends;
    }

    /**
     * Check alert thresholds based on trends
     */
    async checkAlertThresholds() {
        if (!this.currentTrends) {
            return;
        }

        const trends = this.currentTrends;
        const thresholds = this.config.thresholds;

        // Check negative feedback rate
        if (trends.negativeFeedbackRate >= thresholds.negativeFeedbackRate.critical) {
            await this.sendAlert('negative_feedback_critical', {
                message: `Critical: ${trends.negativeFeedbackRate.toFixed(1)}% negative feedback rate`,
                severity: 'critical',
                data: { trends }
            });
        } else if (trends.negativeFeedbackRate >= thresholds.negativeFeedbackRate.warning) {
            await this.sendAlert('negative_feedback_warning', {
                message: `Warning: ${trends.negativeFeedbackRate.toFixed(1)}% negative feedback rate`,
                severity: 'warning',
                data: { trends }
            });
        }

        // Check average rating
        if (trends.averageRating <= thresholds.averageRating.critical) {
            await this.sendAlert('rating_critical', {
                message: `Critical: Average rating dropped to ${trends.averageRating.toFixed(1)}/5`,
                severity: 'critical',
                data: { trends }
            });
        } else if (trends.averageRating <= thresholds.averageRating.warning) {
            await this.sendAlert('rating_warning', {
                message: `Warning: Average rating at ${trends.averageRating.toFixed(1)}/5`,
                severity: 'warning',
                data: { trends }
            });
        }

        // Check issue report rate
        if (trends.issueReportRate >= thresholds.issueReportRate.critical) {
            await this.sendAlert('issue_rate_critical', {
                message: `Critical: ${trends.issueReportRate.toFixed(1)}% issue report rate`,
                severity: 'critical',
                data: { trends }
            });
        } else if (trends.issueReportRate >= thresholds.issueReportRate.warning) {
            await this.sendAlert('issue_rate_warning', {
                message: `Warning: ${trends.issueReportRate.toFixed(1)}% issue report rate`,
                severity: 'warning',
                data: { trends }
            });
        }

        // Check satisfaction score
        if (trends.satisfactionScore <= thresholds.satisfactionScore.critical) {
            await this.sendAlert('satisfaction_critical', {
                message: `Critical: Customer satisfaction at ${trends.satisfactionScore.toFixed(1)}%`,
                severity: 'critical',
                data: { trends }
            });
        } else if (trends.satisfactionScore <= thresholds.satisfactionScore.warning) {
            await this.sendAlert('satisfaction_warning', {
                message: `Warning: Customer satisfaction at ${trends.satisfactionScore.toFixed(1)}%`,
                severity: 'warning',
                data: { trends }
            });
        }
    }

    /**
     * Send alert with cooldown protection
     */
    async sendAlert(alertType, alert) {
        const now = Date.now();
        const lastAlert = this.alertHistory.get(alertType);

        // Check cooldown period
        if (lastAlert && (now - lastAlert) < this.config.alerts.alertCooldownMs) {
            return;
        }

        // Send alert
        await this.alertSystem.sendAlert({
            ...alert,
            component: 'feedback-monitor',
            tags: ['user-feedback', alertType]
        });

        // Record alert time
        this.alertHistory.set(alertType, now);
    }

    /**
     * Calculate average rating from recent feedback
     */
    calculateAverageRating(feedback) {
        const ratingsOnly = feedback.filter(f => f.rating).map(f => f.rating);
        if (ratingsOnly.length === 0) return 0;

        return ratingsOnly.reduce((sum, rating) => sum + rating, 0) / ratingsOnly.length;
    }

    /**
     * Calculate negative feedback rate
     */
    calculateNegativeFeedbackRate(feedback) {
        if (feedback.length === 0) return 0;

        const negativeFeedback = feedback.filter(f => {
            const analysis = this.analysisCache.get(f.id);
            return analysis?.sentiment === 'negative' || f.rating <= 2;
        });

        return (negativeFeedback.length / feedback.length) * 100;
    }

    /**
     * Calculate issue report rate
     */
    calculateIssueReportRate(feedback) {
        if (feedback.length === 0) return 0;

        const issueReports = feedback.filter(f => {
            const analysis = this.analysisCache.get(f.id);
            return analysis?.categories.includes('bugs') || analysis?.urgency === 'critical';
        });

        return (issueReports.length / feedback.length) * 100;
    }

    /**
     * Calculate satisfaction score
     */
    calculateSatisfactionScore(feedback) {
        const ratingsOnly = feedback.filter(f => f.rating).map(f => f.rating);
        if (ratingsOnly.length === 0) return 0;

        const satisfiedUsers = ratingsOnly.filter(rating => rating >= 4).length;
        return (satisfiedUsers / ratingsOnly.length) * 100;
    }

    /**
     * Get top feedback categories
     */
    getTopCategories(feedback) {
        const categoryCounts = {};

        feedback.forEach(f => {
            const analysis = this.analysisCache.get(f.id);
            if (analysis && analysis.categories) {
                analysis.categories.forEach(category => {
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                });
            }
        });

        return Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
    }

    /**
     * Get sentiment distribution
     */
    getSentimentDistribution(feedback) {
        const distribution = { positive: 0, neutral: 0, negative: 0 };

        feedback.forEach(f => {
            const analysis = this.analysisCache.get(f.id);
            if (analysis && analysis.sentiment) {
                distribution[analysis.sentiment]++;
            }
        });

        return distribution;
    }

    /**
     * Update trend data for charts
     */
    updateTrendData() {
        const now = new Date();
        const hour = now.getHours();

        // Update hourly trends
        const hourlyTrend = {
            timestamp: now.toISOString(),
            hour,
            totalFeedback: this.stats.totalFeedback,
            averageRating: this.calculateAverageRating(Array.from(this.feedbackStorage.values())),
            negativeFeedbackRate: this.calculateNegativeFeedbackRate(Array.from(this.feedbackStorage.values()))
        };

        this.stats.trends.hourly.push(hourlyTrend);

        // Keep only last 24 hours
        this.stats.trends.hourly = this.stats.trends.hourly.slice(-24);
    }

    /**
     * Get feedback summary for dashboard
     */
    getFeedbackSummary() {
        return {
            stats: this.stats,
            currentTrends: this.currentTrends,
            recentFeedback: Array.from(this.feedbackStorage.values())
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10),
            topIssues: this.getTopIssues(),
            satisfactionTrend: this.getSatisfactionTrend()
        };
    }

    /**
     * Get top reported issues
     */
    getTopIssues() {
        const issues = Array.from(this.feedbackStorage.values())
            .filter(f => {
                const analysis = this.analysisCache.get(f.id);
                return analysis?.categories.includes('bugs') || analysis?.urgency === 'high';
            })
            .slice(0, 5);

        return issues.map(issue => ({
            id: issue.id,
            comment: issue.comment.substring(0, 100) + '...',
            rating: issue.rating,
            timestamp: issue.timestamp,
            urgency: this.analysisCache.get(issue.id)?.urgency
        }));
    }

    /**
     * Get satisfaction trend data
     */
    getSatisfactionTrend() {
        return this.stats.trends.hourly.map(trend => ({
            timestamp: trend.timestamp,
            satisfactionScore: this.calculateSatisfactionScore(
                Array.from(this.feedbackStorage.values())
                    .filter(f => new Date(f.timestamp).getHours() === trend.hour)
            )
        }));
    }

    /**
     * Load existing feedback from storage
     */
    async loadExistingFeedback() {
        // In a real implementation, this would load from a database
        // For now, we'll start with empty storage
        console.log('📂 Loaded existing feedback data');
    }

    /**
     * Generate unique feedback ID
     */
    generateFeedbackId() {
        return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('🛑 User Feedback Monitor stopped');
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            enabled: this.config.collection.enabled,
            totalFeedback: this.stats.totalFeedback,
            monitoringActive: !!this.monitoringInterval,
            currentTrends: this.currentTrends,
            alertsEnabled: this.config.alerts.enabled,
            sources: this.config.collection.sources
        };
    }
}

module.exports = UserFeedbackMonitor;