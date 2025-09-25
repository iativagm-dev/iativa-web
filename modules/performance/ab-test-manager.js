/**
 * A/B Test Manager - Advanced Testing and Analytics System
 * Handles test creation, execution, data collection, and statistical analysis
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class ABTestManager extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            enablePersistence: options.enablePersistence !== false,
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/ab-tests.json'),
            minSampleSize: options.minSampleSize || 100,
            maxTestDuration: options.maxTestDuration || 30 * 24 * 60 * 60 * 1000, // 30 days
            significanceLevel: options.significanceLevel || 0.05, // 95% confidence
            enableAutoStop: options.enableAutoStop !== false,
            enableRealTimeAnalysis: options.enableRealTimeAnalysis !== false,
            ...options
        };

        // Test storage
        this.tests = new Map();
        this.participantSessions = new Map();
        this.testResults = new Map();

        // Analytics
        this.analytics = {
            totalTests: 0,
            activeTests: 0,
            completedTests: 0,
            totalParticipants: 0,
            averageTestDuration: 0,
            significantResults: 0
        };

        this.init();
    }

    init() {
        console.log('🧪 Initializing A/B Test Manager...');

        this.loadPersistedTests();
        this.setupAnalyticsTracking();
        this.setupTestMonitoring();

        console.log('✅ A/B Test Manager initialized');
    }

    // ==================== TEST CREATION AND MANAGEMENT ====================

    async createTest(testConfig) {
        try {
            const test = {
                id: testConfig.id || this.generateTestId(),
                name: testConfig.name,
                description: testConfig.description,
                hypothesis: testConfig.hypothesis,
                variants: testConfig.variants.map((variant, index) => ({
                    id: variant.id || `variant_${index}`,
                    name: variant.name,
                    description: variant.description,
                    trafficSplit: variant.trafficSplit || (1 / testConfig.variants.length),
                    config: variant.config || {},
                    participants: 0,
                    conversions: 0,
                    conversionRate: 0,
                    revenue: 0,
                    bounceRate: 0,
                    sessionDuration: 0,
                    pageViews: 0
                })),
                metrics: testConfig.metrics || ['conversion_rate', 'revenue', 'bounce_rate'],
                targeting: testConfig.targeting || {},
                status: 'draft',
                createdAt: Date.now(),
                startedAt: null,
                endedAt: null,
                duration: null,
                creator: testConfig.creator || 'system',
                tags: testConfig.tags || [],
                priority: testConfig.priority || 'medium',
                significanceLevel: testConfig.significanceLevel || this.config.significanceLevel,
                minSampleSize: testConfig.minSampleSize || this.config.minSampleSize,
                maxDuration: testConfig.maxDuration || this.config.maxTestDuration,
                autoStop: testConfig.autoStop !== false
            };

            // Validate test configuration
            const validation = this.validateTestConfig(test);
            if (!validation.valid) {
                throw new Error(`Test validation failed: ${validation.errors.join(', ')}`);
            }

            // Store test
            this.tests.set(test.id, test);
            this.testResults.set(test.id, {
                timeline: [],
                snapshots: [],
                events: []
            });

            // Update analytics
            this.analytics.totalTests++;

            // Persist
            if (this.config.enablePersistence) {
                this.persistTests();
            }

            // Emit event
            this.emit('test_created', test);

            console.log(`🧪 A/B test created: ${test.name} (${test.id})`);

            return { success: true, test };

        } catch (error) {
            console.error('Test creation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async startTest(testId) {
        try {
            const test = this.tests.get(testId);
            if (!test) {
                throw new Error('Test not found');
            }

            if (test.status !== 'draft') {
                throw new Error(`Cannot start test in ${test.status} status`);
            }

            // Update test status
            test.status = 'running';
            test.startedAt = Date.now();

            // Reset variant metrics
            test.variants.forEach(variant => {
                variant.participants = 0;
                variant.conversions = 0;
                variant.conversionRate = 0;
                variant.revenue = 0;
                variant.bounceRate = 0;
                variant.sessionDuration = 0;
                variant.pageViews = 0;
            });

            // Update analytics
            this.analytics.activeTests++;

            // Persist
            if (this.config.enablePersistence) {
                this.persistTests();
            }

            // Start monitoring
            this.startTestMonitoring(testId);

            // Emit event
            this.emit('test_started', test);

            console.log(`🚀 A/B test started: ${test.name} (${test.id})`);

            return { success: true, test };

        } catch (error) {
            console.error('Test start failed:', error);
            return { success: false, error: error.message };
        }
    }

    async stopTest(testId, reason = 'manual') {
        try {
            const test = this.tests.get(testId);
            if (!test) {
                throw new Error('Test not found');
            }

            if (test.status !== 'running') {
                throw new Error(`Cannot stop test in ${test.status} status`);
            }

            // Update test status
            test.status = 'completed';
            test.endedAt = Date.now();
            test.duration = test.endedAt - test.startedAt;
            test.stopReason = reason;

            // Calculate final results
            const finalResults = this.calculateTestResults(testId);
            test.finalResults = finalResults;

            // Update analytics
            this.analytics.activeTests--;
            this.analytics.completedTests++;
            this.updateAverageTestDuration(test.duration);

            if (finalResults.isSignificant) {
                this.analytics.significantResults++;
            }

            // Persist
            if (this.config.enablePersistence) {
                this.persistTests();
            }

            // Stop monitoring
            this.stopTestMonitoring(testId);

            // Emit event
            this.emit('test_stopped', { test, reason, results: finalResults });

            console.log(`🏁 A/B test stopped: ${test.name} (${test.id}) - Reason: ${reason}`);

            return { success: true, test, results: finalResults };

        } catch (error) {
            console.error('Test stop failed:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== PARTICIPANT ASSIGNMENT ====================

    assignParticipant(sessionId, testId, userAgent = '', ipAddress = '') {
        try {
            const test = this.tests.get(testId);
            if (!test || test.status !== 'running') {
                return null;
            }

            // Check if user already assigned
            const existingAssignment = this.participantSessions.get(sessionId);
            if (existingAssignment && existingAssignment[testId]) {
                return existingAssignment[testId];
            }

            // Check targeting criteria
            if (!this.matchesTargeting(test.targeting, { sessionId, userAgent, ipAddress })) {
                return null;
            }

            // Assign to variant based on traffic split
            const variant = this.selectVariant(test, sessionId);

            // Create assignment
            const assignment = {
                testId,
                variantId: variant.id,
                variant: variant.name,
                assignedAt: Date.now(),
                sessionId,
                converted: false,
                conversionValue: 0,
                events: []
            };

            // Store assignment
            if (!this.participantSessions.has(sessionId)) {
                this.participantSessions.set(sessionId, {});
            }
            this.participantSessions.get(sessionId)[testId] = assignment;

            // Update variant participant count
            variant.participants++;

            // Update analytics
            this.analytics.totalParticipants++;

            // Log event
            this.logTestEvent(testId, 'participant_assigned', {
                sessionId,
                variantId: variant.id,
                timestamp: Date.now()
            });

            console.log(`👤 Participant assigned: ${sessionId} to ${variant.name} in test ${testId}`);

            return assignment;

        } catch (error) {
            console.error('Participant assignment failed:', error);
            return null;
        }
    }

    selectVariant(test, sessionId) {
        // Use session ID for deterministic assignment
        const hash = this.hashCode(sessionId + test.id);
        const normalizedHash = Math.abs(hash) / Math.pow(2, 31);

        let cumulativeWeight = 0;
        for (const variant of test.variants) {
            cumulativeWeight += variant.trafficSplit;
            if (normalizedHash <= cumulativeWeight) {
                return variant;
            }
        }

        // Fallback to first variant
        return test.variants[0];
    }

    // ==================== CONVERSION TRACKING ====================

    recordConversion(sessionId, testId, conversionData = {}) {
        try {
            const assignment = this.participantSessions.get(sessionId)?.[testId];
            if (!assignment || assignment.converted) {
                return false;
            }

            const test = this.tests.get(testId);
            if (!test || test.status !== 'running') {
                return false;
            }

            // Mark as converted
            assignment.converted = true;
            assignment.conversionValue = conversionData.value || 0;
            assignment.convertedAt = Date.now();

            // Find variant and update metrics
            const variant = test.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                variant.conversions++;
                variant.revenue += assignment.conversionValue;
                variant.conversionRate = (variant.conversions / variant.participants) * 100;
            }

            // Log event
            this.logTestEvent(testId, 'conversion', {
                sessionId,
                variantId: assignment.variantId,
                value: assignment.conversionValue,
                timestamp: Date.now(),
                ...conversionData
            });

            // Check for statistical significance
            if (this.config.enableAutoStop && test.autoStop) {
                this.checkSignificance(testId);
            }

            console.log(`💰 Conversion recorded: ${sessionId} in test ${testId} (value: ${assignment.conversionValue})`);

            return true;

        } catch (error) {
            console.error('Conversion recording failed:', error);
            return false;
        }
    }

    recordEvent(sessionId, testId, eventType, eventData = {}) {
        try {
            const assignment = this.participantSessions.get(sessionId)?.[testId];
            if (!assignment) {
                return false;
            }

            const test = this.tests.get(testId);
            if (!test || test.status !== 'running') {
                return false;
            }

            // Add to assignment events
            assignment.events.push({
                type: eventType,
                data: eventData,
                timestamp: Date.now()
            });

            // Update variant metrics based on event type
            const variant = test.variants.find(v => v.id === assignment.variantId);
            if (variant) {
                switch (eventType) {
                    case 'page_view':
                        variant.pageViews++;
                        break;
                    case 'bounce':
                        variant.bounceRate = ((variant.bounceRate * (variant.participants - 1)) + 1) / variant.participants;
                        break;
                    case 'session_duration':
                        const duration = eventData.duration || 0;
                        variant.sessionDuration = ((variant.sessionDuration * (variant.participants - 1)) + duration) / variant.participants;
                        break;
                }
            }

            // Log event
            this.logTestEvent(testId, eventType, {
                sessionId,
                variantId: assignment.variantId,
                timestamp: Date.now(),
                ...eventData
            });

            return true;

        } catch (error) {
            console.error('Event recording failed:', error);
            return false;
        }
    }

    // ==================== STATISTICAL ANALYSIS ====================

    calculateTestResults(testId) {
        try {
            const test = this.tests.get(testId);
            if (!test) {
                throw new Error('Test not found');
            }

            const results = {
                testId,
                isSignificant: false,
                confidence: 0,
                pValue: 1,
                effect: 0,
                winner: null,
                variants: []
            };

            if (test.variants.length < 2) {
                return results;
            }

            // Sort variants by conversion rate
            const sortedVariants = [...test.variants].sort((a, b) => b.conversionRate - a.conversionRate);
            const control = test.variants[0]; // First variant is typically control
            const best = sortedVariants[0];

            results.variants = test.variants.map(variant => ({
                id: variant.id,
                name: variant.name,
                participants: variant.participants,
                conversions: variant.conversions,
                conversionRate: variant.conversionRate,
                revenue: variant.revenue,
                revenuePerUser: variant.participants > 0 ? variant.revenue / variant.participants : 0,
                bounceRate: variant.bounceRate,
                sessionDuration: variant.sessionDuration,
                pageViews: variant.pageViews,
                confidence: this.calculateConfidence(variant, control),
                isWinner: variant.id === best.id
            }));

            // Calculate statistical significance
            if (control.participants >= this.config.minSampleSize &&
                best.participants >= this.config.minSampleSize) {

                const significance = this.calculateSignificance(control, best);
                results.isSignificant = significance.pValue < test.significanceLevel;
                results.confidence = (1 - significance.pValue) * 100;
                results.pValue = significance.pValue;
                results.effect = ((best.conversionRate - control.conversionRate) / control.conversionRate) * 100;

                if (results.isSignificant && best.id !== control.id) {
                    results.winner = best.id;
                }
            }

            return results;

        } catch (error) {
            console.error('Results calculation failed:', error);
            return { error: error.message };
        }
    }

    calculateSignificance(controlVariant, testVariant) {
        // Two-proportion z-test
        const n1 = controlVariant.participants;
        const n2 = testVariant.participants;
        const x1 = controlVariant.conversions;
        const x2 = testVariant.conversions;

        if (n1 === 0 || n2 === 0) {
            return { pValue: 1, zScore: 0 };
        }

        const p1 = x1 / n1;
        const p2 = x2 / n2;
        const pPooled = (x1 + x2) / (n1 + n2);
        const se = Math.sqrt(pPooled * (1 - pPooled) * (1/n1 + 1/n2));

        if (se === 0) {
            return { pValue: 1, zScore: 0 };
        }

        const zScore = (p2 - p1) / se;
        const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

        return { pValue, zScore };
    }

    calculateConfidence(variant, control) {
        if (variant.participants === 0 || control.participants === 0) {
            return 0;
        }

        const significance = this.calculateSignificance(control, variant);
        return Math.max(0, (1 - significance.pValue) * 100);
    }

    // ==================== MONITORING AND AUTO-STOPPING ====================

    checkSignificance(testId) {
        const test = this.tests.get(testId);
        if (!test || test.status !== 'running') {
            return;
        }

        const results = this.calculateTestResults(testId);

        // Check for auto-stop conditions
        const shouldStop = this.shouldAutoStop(test, results);

        if (shouldStop.stop) {
            this.stopTest(testId, shouldStop.reason);
        }
    }

    shouldAutoStop(test, results) {
        // Check minimum sample size
        const hasMinSample = test.variants.every(v => v.participants >= test.minSampleSize);
        if (!hasMinSample) {
            return { stop: false };
        }

        // Check statistical significance
        if (results.isSignificant && results.confidence >= 95) {
            return { stop: true, reason: 'statistical_significance' };
        }

        // Check maximum duration
        if (Date.now() - test.startedAt >= test.maxDuration) {
            return { stop: true, reason: 'max_duration_reached' };
        }

        // Check for no conversions after reasonable time
        const totalConversions = test.variants.reduce((sum, v) => sum + v.conversions, 0);
        const runningFor = Date.now() - test.startedAt;

        if (totalConversions === 0 && runningFor > 7 * 24 * 60 * 60 * 1000) { // 7 days
            return { stop: true, reason: 'no_conversions' };
        }

        return { stop: false };
    }

    startTestMonitoring(testId) {
        const monitoringInterval = setInterval(() => {
            this.checkSignificance(testId);
        }, 3600000); // Check every hour

        // Store interval ID
        if (!this.monitoringIntervals) {
            this.monitoringIntervals = new Map();
        }
        this.monitoringIntervals.set(testId, monitoringInterval);
    }

    stopTestMonitoring(testId) {
        if (this.monitoringIntervals && this.monitoringIntervals.has(testId)) {
            clearInterval(this.monitoringIntervals.get(testId));
            this.monitoringIntervals.delete(testId);
        }
    }

    // ==================== DATA MANAGEMENT ====================

    getTest(testId) {
        return this.tests.get(testId);
    }

    getAllTests() {
        return Array.from(this.tests.values());
    }

    getRunningTests() {
        return Array.from(this.tests.values()).filter(test => test.status === 'running');
    }

    getTestResults(testId) {
        const test = this.tests.get(testId);
        if (!test) {
            return null;
        }

        return {
            test,
            results: this.calculateTestResults(testId),
            timeline: this.testResults.get(testId)?.timeline || [],
            events: this.testResults.get(testId)?.events || []
        };
    }

    // ==================== UTILITY FUNCTIONS ====================

    validateTestConfig(test) {
        const errors = [];

        if (!test.name || test.name.trim().length === 0) {
            errors.push('Test name is required');
        }

        if (!test.variants || test.variants.length < 2) {
            errors.push('At least 2 variants are required');
        }

        if (test.variants) {
            const totalSplit = test.variants.reduce((sum, v) => sum + (v.trafficSplit || 0), 0);
            if (Math.abs(totalSplit - 1) > 0.01) {
                errors.push('Traffic splits must sum to 1.0');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    generateTestId() {
        return `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    normalCDF(x) {
        // Approximation of the standard normal cumulative distribution function
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    erf(x) {
        // Abramowitz and Stegun approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    matchesTargeting(targeting, userInfo) {
        // Simple targeting implementation
        return true; // For now, include all users
    }

    logTestEvent(testId, eventType, eventData) {
        const results = this.testResults.get(testId);
        if (results) {
            results.events.push({
                type: eventType,
                data: eventData,
                timestamp: Date.now()
            });
        }
    }

    updateAverageTestDuration(duration) {
        const total = this.analytics.completedTests;
        const current = this.analytics.averageTestDuration;
        this.analytics.averageTestDuration = ((current * (total - 1)) + duration) / total;
    }

    // ==================== PERSISTENCE ====================

    persistTests() {
        if (!this.config.enablePersistence) return;

        try {
            const data = {
                tests: Array.from(this.tests.entries()),
                participantSessions: Array.from(this.participantSessions.entries()),
                testResults: Array.from(this.testResults.entries()),
                analytics: this.analytics,
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist A/B tests:', error);
        }
    }

    loadPersistedTests() {
        if (!this.config.enablePersistence) return;

        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                if (data.tests) {
                    data.tests.forEach(([key, test]) => {
                        this.tests.set(key, test);
                    });
                }

                if (data.participantSessions) {
                    data.participantSessions.forEach(([key, sessions]) => {
                        this.participantSessions.set(key, sessions);
                    });
                }

                if (data.testResults) {
                    data.testResults.forEach(([key, results]) => {
                        this.testResults.set(key, results);
                    });
                }

                if (data.analytics) {
                    this.analytics = { ...this.analytics, ...data.analytics };
                }

                console.log(`📥 Loaded ${this.tests.size} persisted A/B tests`);

                // Restart monitoring for running tests
                this.getRunningTests().forEach(test => {
                    this.startTestMonitoring(test.id);
                });
            }
        } catch (error) {
            console.error('Failed to load persisted A/B tests:', error);
        }
    }

    setupAnalyticsTracking() {
        setInterval(() => {
            this.analytics.activeTests = this.getRunningTests().length;
            this.emit('analytics_update', this.analytics);
        }, 60000); // Every minute
    }

    setupTestMonitoring() {
        setInterval(() => {
            this.getRunningTests().forEach(test => {
                const results = this.calculateTestResults(test.id);
                this.emit('test_results_update', { test, results });
            });
        }, 300000); // Every 5 minutes
    }

    getAnalytics() {
        return {
            ...this.analytics,
            totalTests: this.tests.size,
            activeTests: this.getRunningTests().length,
            completedTests: Array.from(this.tests.values()).filter(t => t.status === 'completed').length
        };
    }

    healthCheck() {
        const runningTests = this.getRunningTests();
        const oldTests = runningTests.filter(test =>
            Date.now() - test.startedAt > this.config.maxTestDuration
        );

        return {
            status: oldTests.length > 0 ? 'warning' : 'healthy',
            activeTests: runningTests.length,
            oldTests: oldTests.length,
            totalParticipants: this.analytics.totalParticipants,
            significantResults: this.analytics.significantResults,
            recommendations: oldTests.length > 0 ?
                ['Some tests have been running longer than maximum duration'] : []
        };
    }
}

module.exports = ABTestManager;