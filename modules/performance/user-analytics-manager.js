/**
 * User Analytics Manager - Advanced User Segmentation and Behavioral Analytics
 * Provides comprehensive user tracking, segmentation, and behavioral analysis
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class UserAnalyticsManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            enablePersistence: options.enablePersistence !== false,
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/user-analytics.json'),
            sessionTimeout: options.sessionTimeout || 30 * 60 * 1000, // 30 minutes
            enableRealTimeTracking: options.enableRealTimeTracking !== false,
            enableCohortAnalysis: options.enableCohortAnalysis !== false,
            enableBehaviorFlow: options.enableBehaviorFlow !== false,
            maxEventsPerSession: options.maxEventsPerSession || 1000,
            dataRetentionDays: options.dataRetentionDays || 90,
            ...options
        };

        // Data storage
        this.users = new Map();           // userId -> user data
        this.sessions = new Map();        // sessionId -> session data
        this.events = [];                 // All events chronologically
        this.segments = new Map();        // segmentId -> segment definition
        this.cohorts = new Map();         // cohort tracking
        this.behaviorFlow = new Map();    // page flow tracking

        // Analytics metrics
        this.metrics = {
            totalUsers: 0,
            activeUsers: 0,
            newUsers: 0,
            returningUsers: 0,
            totalSessions: 0,
            activeSessions: 0,
            averageSessionDuration: 0,
            bounceRate: 0,
            conversionRate: 0,
            pageViews: 0,
            lastUpdated: Date.now()
        };

        // Predefined segments
        this.initializeSegments();
        this.init();
    }

    init() {
        console.log('👥 Initializing User Analytics Manager...');

        this.loadPersistedData();
        this.setupCleanupTasks();
        this.setupRealTimeTracking();

        console.log('✅ User Analytics Manager initialized');
    }

    initializeSegments() {
        // Define standard user segments
        const standardSegments = [
            {
                id: 'new_users',
                name: 'New Users',
                description: 'Users who joined in the last 7 days',
                criteria: (user) => Date.now() - user.firstSeen < 7 * 24 * 60 * 60 * 1000
            },
            {
                id: 'power_users',
                name: 'Power Users',
                description: 'Users with >10 sessions and >30 minutes avg session',
                criteria: (user) => user.sessionCount > 10 && user.averageSessionDuration > 30 * 60 * 1000
            },
            {
                id: 'at_risk',
                name: 'At Risk',
                description: 'Users who haven\'t been active in 14+ days',
                criteria: (user) => Date.now() - user.lastSeen > 14 * 24 * 60 * 60 * 1000
            },
            {
                id: 'converters',
                name: 'Converters',
                description: 'Users who completed at least one conversion',
                criteria: (user) => user.conversionCount > 0
            },
            {
                id: 'mobile_users',
                name: 'Mobile Users',
                description: 'Users primarily accessing via mobile devices',
                criteria: (user) => user.deviceInfo?.type === 'mobile' || user.mobileSessionRatio > 0.7
            },
            {
                id: 'high_value',
                name: 'High Value',
                description: 'Users with high engagement and conversion value',
                criteria: (user) => user.totalRevenue > 100 || (user.conversionRate > 0.1 && user.sessionCount > 5)
            }
        ];

        standardSegments.forEach(segment => {
            this.segments.set(segment.id, segment);
        });
    }

    // ==================== EVENT TRACKING ====================

    trackEvent(eventData) {
        try {
            const event = {
                id: this.generateEventId(),
                timestamp: Date.now(),
                sessionId: eventData.sessionId,
                userId: eventData.userId,
                type: eventData.type,
                properties: eventData.properties || {},
                page: eventData.page,
                userAgent: eventData.userAgent,
                ipAddress: eventData.ipAddress,
                referrer: eventData.referrer
            };

            // Store event
            this.events.push(event);

            // Update user data
            this.updateUserData(event);

            // Update session data
            this.updateSessionData(event);

            // Update behavior flow
            if (this.config.enableBehaviorFlow) {
                this.updateBehaviorFlow(event);
            }

            // Update real-time metrics
            this.updateMetrics();

            // Emit event for real-time processing
            this.emit('event_tracked', event);

            // Cleanup old events
            this.cleanupOldEvents();

            return { success: true, eventId: event.id };

        } catch (error) {
            console.error('Event tracking failed:', error);
            return { success: false, error: error.message };
        }
    }

    updateUserData(event) {
        const { userId, sessionId, timestamp, type, properties, userAgent } = event;

        if (!userId) return;

        let user = this.users.get(userId);

        if (!user) {
            // New user
            user = {
                id: userId,
                firstSeen: timestamp,
                lastSeen: timestamp,
                sessionCount: 0,
                totalSessionDuration: 0,
                averageSessionDuration: 0,
                pageViews: 0,
                conversionCount: 0,
                conversionRate: 0,
                totalRevenue: 0,
                bounceCount: 0,
                bounceRate: 0,
                deviceInfo: this.parseUserAgent(userAgent),
                sessions: new Set(),
                events: [],
                segments: new Set(),
                mobileSessionCount: 0,
                desktopSessionCount: 0,
                mobileSessionRatio: 0
            };

            this.users.set(userId, user);
            this.metrics.totalUsers++;
            this.metrics.newUsers++;
        }

        // Update user data
        user.lastSeen = timestamp;
        user.sessions.add(sessionId);
        user.events.push(event.id);

        // Track specific event types
        switch (type) {
            case 'page_view':
                user.pageViews++;
                this.metrics.pageViews++;
                break;

            case 'conversion':
                user.conversionCount++;
                user.totalRevenue += properties.value || 0;
                user.conversionRate = user.conversionCount / user.sessionCount;
                break;

            case 'bounce':
                user.bounceCount++;
                user.bounceRate = user.bounceCount / user.sessionCount;
                break;
        }

        // Update device tracking
        const deviceType = user.deviceInfo?.type;
        if (deviceType === 'mobile') {
            user.mobileSessionCount++;
        } else {
            user.desktopSessionCount++;
        }

        user.mobileSessionRatio = user.mobileSessionCount / (user.mobileSessionCount + user.desktopSessionCount);

        // Update segments
        this.updateUserSegments(user);
    }

    updateSessionData(event) {
        const { sessionId, timestamp, type, userId } = event;

        let session = this.sessions.get(sessionId);

        if (!session) {
            // New session
            session = {
                id: sessionId,
                userId: userId,
                startTime: timestamp,
                lastActivity: timestamp,
                duration: 0,
                pageViews: 0,
                events: [],
                pages: new Set(),
                isActive: true,
                bounced: false,
                converted: false,
                conversionValue: 0
            };

            this.sessions.set(sessionId, session);
            this.metrics.totalSessions++;

            // Update user session count
            const user = this.users.get(userId);
            if (user) {
                user.sessionCount++;
            }
        }

        // Update session
        session.lastActivity = timestamp;
        session.duration = timestamp - session.startTime;
        session.events.push(event.id);

        if (event.page) {
            session.pages.add(event.page);
        }

        // Track specific events
        switch (type) {
            case 'page_view':
                session.pageViews++;
                break;

            case 'conversion':
                session.converted = true;
                session.conversionValue += event.properties?.value || 0;
                break;
        }

        // Check for bounce (single page view and short duration)
        session.bounced = session.pageViews === 1 && session.duration < 30000; // 30 seconds

        // Update user session metrics
        if (userId) {
            const user = this.users.get(userId);
            if (user && user.sessionCount > 0) {
                user.totalSessionDuration += session.duration;
                user.averageSessionDuration = user.totalSessionDuration / user.sessionCount;
            }
        }
    }

    updateBehaviorFlow(event) {
        if (event.type !== 'page_view' || !event.page) return;

        const { sessionId, page } = event;
        const session = this.sessions.get(sessionId);

        if (!session || session.events.length < 2) return;

        // Get previous page from session events
        const previousEvents = session.events.slice(0, -1);
        const lastPageEvent = this.events.find(e =>
            previousEvents.includes(e.id) && e.type === 'page_view' && e.page
        );

        if (!lastPageEvent) return;

        const transition = `${lastPageEvent.page} -> ${page}`;

        if (!this.behaviorFlow.has(transition)) {
            this.behaviorFlow.set(transition, 0);
        }

        this.behaviorFlow.set(transition, this.behaviorFlow.get(transition) + 1);
    }

    updateUserSegments(user) {
        const previousSegments = new Set(user.segments);
        user.segments.clear();

        // Apply segment criteria
        for (const [segmentId, segment] of this.segments) {
            if (segment.criteria(user)) {
                user.segments.add(segmentId);
            }
        }

        // Emit segment changes
        const newSegments = [...user.segments].filter(s => !previousSegments.has(s));
        const removedSegments = [...previousSegments].filter(s => !user.segments.has(s));

        if (newSegments.length > 0) {
            this.emit('user_segment_added', { userId: user.id, segments: newSegments });
        }

        if (removedSegments.length > 0) {
            this.emit('user_segment_removed', { userId: user.id, segments: removedSegments });
        }
    }

    // ==================== ANALYTICS QUERIES ====================

    getUserSegments() {
        const segmentCounts = new Map();

        // Initialize counts
        for (const segmentId of this.segments.keys()) {
            segmentCounts.set(segmentId, 0);
        }

        // Count users in each segment
        for (const user of this.users.values()) {
            for (const segmentId of user.segments) {
                const currentCount = segmentCounts.get(segmentId) || 0;
                segmentCounts.set(segmentId, currentCount + 1);
            }
        }

        return Array.from(this.segments.values()).map(segment => ({
            id: segment.id,
            name: segment.name,
            description: segment.description,
            userCount: segmentCounts.get(segment.id) || 0,
            percentage: this.metrics.totalUsers > 0 ?
                ((segmentCounts.get(segment.id) || 0) / this.metrics.totalUsers * 100).toFixed(1) : 0
        }));
    }

    getBehaviorFlow(limit = 20) {
        const flows = Array.from(this.behaviorFlow.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([transition, count]) => {
                const [from, to] = transition.split(' -> ');
                return { from, to, count, percentage: 0 };
            });

        // Calculate percentages
        const totalFlows = flows.reduce((sum, flow) => sum + flow.count, 0);
        flows.forEach(flow => {
            flow.percentage = totalFlows > 0 ? ((flow.count / totalFlows) * 100).toFixed(1) : 0;
        });

        return flows;
    }

    getCohortAnalysis(cohortType = 'weekly', metric = 'retention') {
        const cohorts = new Map();
        const now = Date.now();

        // Group users by cohort (signup week/month)
        for (const user of this.users.values()) {
            const cohortKey = this.getCohortKey(user.firstSeen, cohortType);

            if (!cohorts.has(cohortKey)) {
                cohorts.set(cohortKey, {
                    cohort: cohortKey,
                    users: [],
                    periods: new Map()
                });
            }

            cohorts.get(cohortKey).users.push(user);
        }

        // Calculate retention/revenue for each period
        const result = Array.from(cohorts.values()).map(cohort => {
            const periods = [];
            const cohortStart = this.parseCohortKey(cohort.cohort, cohortType);

            for (let period = 0; period < 12; period++) { // 12 periods
                const periodStart = this.addPeriod(cohortStart, period, cohortType);
                const periodEnd = this.addPeriod(cohortStart, period + 1, cohortType);

                let value = 0;
                let userCount = 0;

                for (const user of cohort.users) {
                    const wasActive = user.lastSeen >= periodStart && user.lastSeen < periodEnd;

                    if (metric === 'retention' && wasActive) {
                        userCount++;
                    } else if (metric === 'revenue') {
                        // Calculate revenue for this period (simplified)
                        const periodRevenue = this.getUserRevenueForPeriod(user, periodStart, periodEnd);
                        value += periodRevenue;
                    }
                }

                if (metric === 'retention') {
                    value = cohort.users.length > 0 ? (userCount / cohort.users.length) * 100 : 0;
                }

                periods.push({
                    period,
                    value: Number(value.toFixed(2)),
                    userCount: metric === 'retention' ? userCount : cohort.users.length
                });
            }

            return {
                cohort: cohort.cohort,
                size: cohort.users.length,
                periods
            };
        });

        return result.sort((a, b) => b.cohort.localeCompare(a.cohort));
    }

    getConversionFunnel(steps) {
        const funnel = steps.map(step => ({
            step: step.name,
            users: 0,
            conversionRate: 0,
            dropoffRate: 0
        }));

        let previousUsers = this.metrics.totalUsers;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            let usersInStep = 0;

            // Count users who completed this step
            for (const user of this.users.values()) {
                const completedStep = this.hasUserCompletedStep(user, step);
                if (completedStep) {
                    usersInStep++;
                }
            }

            funnel[i].users = usersInStep;
            funnel[i].conversionRate = previousUsers > 0 ? (usersInStep / previousUsers) * 100 : 0;
            funnel[i].dropoffRate = previousUsers > 0 ? ((previousUsers - usersInStep) / previousUsers) * 100 : 0;

            previousUsers = usersInStep;
        }

        return funnel;
    }

    // ==================== REAL-TIME ANALYTICS ====================

    updateMetrics() {
        const now = Date.now();
        const activeSessionThreshold = now - this.config.sessionTimeout;

        // Count active users and sessions
        this.metrics.activeUsers = Array.from(this.users.values())
            .filter(user => user.lastSeen > now - 24 * 60 * 60 * 1000).length; // Last 24 hours

        this.metrics.activeSessions = Array.from(this.sessions.values())
            .filter(session => session.lastActivity > activeSessionThreshold).length;

        // Calculate averages
        if (this.metrics.totalSessions > 0) {
            const totalDuration = Array.from(this.sessions.values())
                .reduce((sum, session) => sum + session.duration, 0);
            this.metrics.averageSessionDuration = totalDuration / this.metrics.totalSessions;

            const bounced = Array.from(this.sessions.values())
                .filter(session => session.bounced).length;
            this.metrics.bounceRate = (bounced / this.metrics.totalSessions) * 100;

            const converted = Array.from(this.sessions.values())
                .filter(session => session.converted).length;
            this.metrics.conversionRate = (converted / this.metrics.totalSessions) * 100;
        }

        this.metrics.lastUpdated = now;

        // Emit metrics update
        this.emit('metrics_updated', this.metrics);
    }

    getRealTimeMetrics() {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        const lastHour = now - 60 * 60 * 1000;

        return {
            current: this.metrics,
            last24Hours: {
                newUsers: Array.from(this.users.values())
                    .filter(user => user.firstSeen > last24h).length,
                sessions: Array.from(this.sessions.values())
                    .filter(session => session.startTime > last24h).length,
                pageViews: this.events
                    .filter(event => event.timestamp > last24h && event.type === 'page_view').length,
                conversions: this.events
                    .filter(event => event.timestamp > last24h && event.type === 'conversion').length
            },
            lastHour: {
                newUsers: Array.from(this.users.values())
                    .filter(user => user.firstSeen > lastHour).length,
                sessions: Array.from(this.sessions.values())
                    .filter(session => session.startTime > lastHour).length,
                pageViews: this.events
                    .filter(event => event.timestamp > lastHour && event.type === 'page_view').length
            }
        };
    }

    // ==================== UTILITY FUNCTIONS ====================

    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    parseUserAgent(userAgent) {
        if (!userAgent) return { type: 'unknown', browser: 'unknown', os: 'unknown' };

        // Simple user agent parsing (in production, use a proper library)
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);

        let type = 'desktop';
        if (isMobile && !isTablet) type = 'mobile';
        if (isTablet) type = 'tablet';

        return {
            type,
            browser: this.extractBrowser(userAgent),
            os: this.extractOS(userAgent)
        };
    }

    extractBrowser(userAgent) {
        if (!userAgent) return 'unknown';

        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Other';
    }

    extractOS(userAgent) {
        if (!userAgent) return 'unknown';

        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        return 'Other';
    }

    getCohortKey(timestamp, cohortType) {
        const date = new Date(timestamp);

        if (cohortType === 'daily') {
            return date.toISOString().split('T')[0];
        } else if (cohortType === 'weekly') {
            const yearWeek = this.getYearWeek(date);
            return `${yearWeek.year}-W${yearWeek.week}`;
        } else if (cohortType === 'monthly') {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        return date.toISOString().split('T')[0];
    }

    parseCohortKey(cohortKey, cohortType) {
        if (cohortType === 'weekly') {
            const [year, week] = cohortKey.split('-W');
            return this.getDateFromYearWeek(parseInt(year), parseInt(week));
        } else if (cohortType === 'monthly') {
            const [year, month] = cohortKey.split('-');
            return new Date(parseInt(year), parseInt(month) - 1, 1);
        }

        return new Date(cohortKey);
    }

    addPeriod(date, periods, cohortType) {
        const newDate = new Date(date);

        if (cohortType === 'daily') {
            newDate.setDate(newDate.getDate() + periods);
        } else if (cohortType === 'weekly') {
            newDate.setDate(newDate.getDate() + (periods * 7));
        } else if (cohortType === 'monthly') {
            newDate.setMonth(newDate.getMonth() + periods);
        }

        return newDate.getTime();
    }

    getYearWeek(date) {
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - startOfYear) / 86400000;
        return {
            year: date.getFullYear(),
            week: Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7)
        };
    }

    getDateFromYearWeek(year, week) {
        const firstDayOfYear = new Date(year, 0, 1);
        const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
        return new Date(year, 0, 1 + daysToAdd);
    }

    getUserRevenueForPeriod(user, startTime, endTime) {
        // Simplified revenue calculation - in practice, you'd track this more precisely
        return user.events
            .map(eventId => this.events.find(e => e.id === eventId))
            .filter(event => event &&
                event.type === 'conversion' &&
                event.timestamp >= startTime &&
                event.timestamp < endTime)
            .reduce((sum, event) => sum + (event.properties?.value || 0), 0);
    }

    hasUserCompletedStep(user, step) {
        return user.events
            .map(eventId => this.events.find(e => e.id === eventId))
            .some(event => event && this.matchesStepCriteria(event, step));
    }

    matchesStepCriteria(event, step) {
        if (step.type && event.type !== step.type) return false;
        if (step.page && event.page !== step.page) return false;
        if (step.properties) {
            for (const [key, value] of Object.entries(step.properties)) {
                if (event.properties?.[key] !== value) return false;
            }
        }
        return true;
    }

    // ==================== DATA MANAGEMENT ====================

    cleanupOldEvents() {
        const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
        const initialLength = this.events.length;

        this.events = this.events.filter(event => event.timestamp > cutoffTime);

        if (this.events.length < initialLength) {
            console.log(`🧹 Cleaned up ${initialLength - this.events.length} old events`);
        }
    }

    cleanupInactiveSessions() {
        const cutoffTime = Date.now() - this.config.sessionTimeout;
        const inactiveSessions = [];

        for (const [sessionId, session] of this.sessions) {
            if (session.lastActivity < cutoffTime) {
                session.isActive = false;
                inactiveSessions.push(sessionId);
            }
        }

        console.log(`📝 Marked ${inactiveSessions.length} sessions as inactive`);
    }

    setupCleanupTasks() {
        // Cleanup old events daily
        setInterval(() => {
            this.cleanupOldEvents();
        }, 24 * 60 * 60 * 1000);

        // Cleanup inactive sessions every 5 minutes
        setInterval(() => {
            this.cleanupInactiveSessions();
        }, 5 * 60 * 1000);
    }

    setupRealTimeTracking() {
        if (!this.config.enableRealTimeTracking) return;

        // Update metrics every 30 seconds
        setInterval(() => {
            this.updateMetrics();
        }, 30000);
    }

    // ==================== PERSISTENCE ====================

    persistData() {
        if (!this.config.enablePersistence) return;

        try {
            const data = {
                users: Array.from(this.users.entries()).map(([id, user]) => [
                    id,
                    {
                        ...user,
                        sessions: Array.from(user.sessions),
                        segments: Array.from(user.segments)
                    }
                ]),
                sessions: Array.from(this.sessions.entries()),
                events: this.events.slice(-10000), // Keep last 10k events
                segments: Array.from(this.segments.entries()),
                behaviorFlow: Array.from(this.behaviorFlow.entries()),
                metrics: this.metrics,
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist user analytics:', error);
        }
    }

    loadPersistedData() {
        if (!this.config.enablePersistence) return;

        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                if (data.users) {
                    data.users.forEach(([id, userData]) => {
                        this.users.set(id, {
                            ...userData,
                            sessions: new Set(userData.sessions),
                            segments: new Set(userData.segments)
                        });
                    });
                }

                if (data.sessions) {
                    data.sessions.forEach(([id, sessionData]) => {
                        this.sessions.set(id, sessionData);
                    });
                }

                if (data.events) {
                    this.events = data.events;
                }

                if (data.behaviorFlow) {
                    data.behaviorFlow.forEach(([key, value]) => {
                        this.behaviorFlow.set(key, value);
                    });
                }

                if (data.metrics) {
                    this.metrics = { ...this.metrics, ...data.metrics };
                }

                console.log(`📥 Loaded ${this.users.size} users, ${this.sessions.size} sessions, ${this.events.length} events`);
            }
        } catch (error) {
            console.error('Failed to load persisted user analytics:', error);
        }
    }

    // ==================== API METHODS ====================

    getAnalyticsOverview() {
        return {
            metrics: this.metrics,
            segments: this.getUserSegments(),
            realtimeMetrics: this.getRealTimeMetrics(),
            timestamp: Date.now()
        };
    }

    healthCheck() {
        const oldestEvent = this.events.length > 0 ?
            Math.min(...this.events.map(e => e.timestamp)) : Date.now();
        const dataAge = Date.now() - oldestEvent;

        return {
            status: this.events.length > 100000 ? 'warning' : 'healthy',
            totalEvents: this.events.length,
            totalUsers: this.users.size,
            activeSessions: this.metrics.activeSessions,
            dataAge: dataAge,
            recommendations: this.events.length > 100000 ?
                ['Consider increasing cleanup frequency'] : []
        };
    }
}

module.exports = UserAnalyticsManager;