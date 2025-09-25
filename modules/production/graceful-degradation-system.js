/**
 * Graceful Degradation System - AI Feature Resilience
 * Advanced circuit breaker patterns, intelligent fallbacks, and progressive feature degradation
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class GracefulDegradationSystem extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            // Circuit breaker configuration
            failureThreshold: options.failureThreshold || 5,
            recoveryTimeout: options.recoveryTimeout || 60000,        // 1 minute
            halfOpenMaxCalls: options.halfOpenMaxCalls || 3,
            responseTimeThreshold: options.responseTimeThreshold || 10000, // 10 seconds

            // Degradation levels
            enableProgressiveDegradation: options.enableProgressiveDegradation !== false,
            degradationLevels: options.degradationLevels || 5,
            autoRecovery: options.autoRecovery !== false,

            // Feature management
            criticalFeatures: options.criticalFeatures || ['cost_validation', 'business_classification'],
            optionalFeatures: options.optionalFeatures || ['recommendations', 'analytics', 'insights'],

            // Monitoring and persistence
            enablePersistence: options.enablePersistence !== false,
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/degradation.json'),
            healthCheckInterval: options.healthCheckInterval || 30000,  // 30 seconds

            ...options
        };

        // Circuit breaker states
        this.circuitBreakers = new Map();    // feature -> circuit breaker
        this.featureHealth = new Map();      // feature -> health metrics
        this.fallbackStrategies = new Map(); // feature -> fallback functions
        this.degradationLevel = 0;           // Current system degradation level

        // Feature status tracking
        this.featureStatus = new Map();      // feature -> status info
        this.errorPatterns = new Map();      // feature -> error analysis
        this.recoveryAttempts = new Map();   // feature -> recovery tracking

        // Performance metrics
        this.metrics = {
            totalCalls: 0,
            failedCalls: 0,
            fallbackCalls: 0,
            circuitBreakerTrips: 0,
            recoverySuccesses: 0,
            degradationEvents: 0,
            avgResponseTime: 0
        };

        // System state
        this.systemHealth = {
            overall: 'healthy',
            lastUpdate: Date.now(),
            criticalFailures: 0,
            availableFeatures: new Set()
        };

        this.init();
    }

    async init() {
        console.log('🛡️ Initializing Graceful Degradation System...');

        this.initializeCircuitBreakers();
        this.registerFallbackStrategies();
        await this.loadPersistedState();
        this.setupHealthMonitoring();
        this.setupAutoRecovery();

        console.log('✅ Graceful Degradation System ready');
    }

    // ==================== MAIN INTERFACE ====================

    async executeWithDegradation(featureName, primaryFunction, context = {}) {
        const startTime = Date.now();
        this.metrics.totalCalls++;

        try {
            // Check if feature is available
            const availability = this.checkFeatureAvailability(featureName);

            if (!availability.available) {
                return await this.handleFeatureUnavailable(featureName, context, availability.reason);
            }

            // Execute with circuit breaker protection
            const result = await this.executeWithCircuitBreaker(
                featureName,
                primaryFunction,
                context
            );

            // Record success
            this.recordSuccess(featureName, Date.now() - startTime);

            return {
                ...result,
                degraded: false,
                executedAt: 'primary',
                featureHealth: this.getFeatureHealth(featureName)
            };

        } catch (error) {
            // Record failure
            this.recordFailure(featureName, error, Date.now() - startTime);

            // Attempt graceful degradation
            return await this.handleFeatureFailure(featureName, error, context);
        }
    }

    async executeWithCircuitBreaker(featureName, primaryFunction, context) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        switch (circuitBreaker.state) {
            case 'OPEN':
                throw new Error(`Circuit breaker OPEN for feature: ${featureName}`);

            case 'HALF_OPEN':
                return await this.executeHalfOpen(featureName, primaryFunction, context);

            case 'CLOSED':
            default:
                return await this.executeClosed(featureName, primaryFunction, context);
        }
    }

    // ==================== CIRCUIT BREAKER IMPLEMENTATION ====================

    async executeClosed(featureName, primaryFunction, context) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        try {
            const result = await this.executeWithTimeout(primaryFunction, context);

            // Reset failure count on success
            circuitBreaker.failureCount = 0;
            circuitBreaker.lastSuccess = Date.now();

            return result;

        } catch (error) {
            circuitBreaker.failureCount++;
            circuitBreaker.lastFailure = Date.now();

            // Check if we should trip to OPEN
            if (circuitBreaker.failureCount >= this.config.failureThreshold) {
                this.tripCircuitBreaker(featureName);
            }

            throw error;
        }
    }

    async executeHalfOpen(featureName, primaryFunction, context) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        if (circuitBreaker.halfOpenCalls >= this.config.halfOpenMaxCalls) {
            throw new Error(`Half-open call limit reached for: ${featureName}`);
        }

        circuitBreaker.halfOpenCalls++;

        try {
            const result = await this.executeWithTimeout(primaryFunction, context);

            // Success in half-open - close the circuit
            this.closeCircuitBreaker(featureName);

            return result;

        } catch (error) {
            // Failure in half-open - back to open
            this.tripCircuitBreaker(featureName);
            throw error;
        }
    }

    async executeWithTimeout(primaryFunction, context) {
        return await Promise.race([
            primaryFunction(context),
            this.createTimeoutPromise(this.config.responseTimeThreshold)
        ]);
    }

    createTimeoutPromise(timeoutMs) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Operation timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }

    // ==================== CIRCUIT BREAKER MANAGEMENT ====================

    initializeCircuitBreakers() {
        const allFeatures = [
            ...this.config.criticalFeatures,
            ...this.config.optionalFeatures
        ];

        allFeatures.forEach(feature => {
            this.circuitBreakers.set(feature, {
                state: 'CLOSED',
                failureCount: 0,
                lastFailure: null,
                lastSuccess: null,
                halfOpenCalls: 0,
                trippedAt: null,
                recoveryTimeout: null
            });

            this.featureHealth.set(feature, {
                isHealthy: true,
                errorRate: 0,
                avgResponseTime: 0,
                successStreak: 0,
                failureStreak: 0,
                lastHealthCheck: Date.now()
            });

            this.featureStatus.set(feature, {
                status: 'active',
                degradationLevel: 0,
                fallbacksUsed: 0,
                lastError: null
            });

            // Initialize as available
            this.systemHealth.availableFeatures.add(feature);
        });
    }

    getCircuitBreaker(featureName) {
        return this.circuitBreakers.get(featureName) || this.createCircuitBreaker(featureName);
    }

    createCircuitBreaker(featureName) {
        const circuitBreaker = {
            state: 'CLOSED',
            failureCount: 0,
            lastFailure: null,
            lastSuccess: null,
            halfOpenCalls: 0,
            trippedAt: null,
            recoveryTimeout: null
        };

        this.circuitBreakers.set(featureName, circuitBreaker);
        return circuitBreaker;
    }

    tripCircuitBreaker(featureName) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        circuitBreaker.state = 'OPEN';
        circuitBreaker.trippedAt = Date.now();
        circuitBreaker.halfOpenCalls = 0;

        // Set recovery timeout
        circuitBreaker.recoveryTimeout = setTimeout(() => {
            this.attemptCircuitBreakerRecovery(featureName);
        }, this.config.recoveryTimeout);

        this.metrics.circuitBreakerTrips++;

        console.log(`⚡ Circuit breaker TRIPPED for feature: ${featureName}`);
        this.emit('circuit_breaker_opened', { featureName, timestamp: Date.now() });

        // Update system degradation
        this.evaluateSystemDegradation();
    }

    attemptCircuitBreakerRecovery(featureName) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        circuitBreaker.state = 'HALF_OPEN';
        circuitBreaker.halfOpenCalls = 0;

        console.log(`🔄 Circuit breaker attempting recovery for feature: ${featureName}`);
        this.emit('circuit_breaker_recovery', { featureName, timestamp: Date.now() });
    }

    closeCircuitBreaker(featureName) {
        const circuitBreaker = this.getCircuitBreaker(featureName);

        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
        circuitBreaker.halfOpenCalls = 0;
        circuitBreaker.trippedAt = null;

        if (circuitBreaker.recoveryTimeout) {
            clearTimeout(circuitBreaker.recoveryTimeout);
            circuitBreaker.recoveryTimeout = null;
        }

        this.metrics.recoverySuccesses++;

        console.log(`✅ Circuit breaker CLOSED for feature: ${featureName}`);
        this.emit('circuit_breaker_closed', { featureName, timestamp: Date.now() });

        // Update system health
        this.evaluateSystemDegradation();
    }

    // ==================== FEATURE AVAILABILITY ====================

    checkFeatureAvailability(featureName) {
        const circuitBreaker = this.getCircuitBreaker(featureName);
        const featureHealth = this.getFeatureHealth(featureName);

        // Circuit breaker check
        if (circuitBreaker.state === 'OPEN') {
            return {
                available: false,
                reason: 'circuit_breaker_open',
                details: 'Feature temporarily unavailable due to repeated failures'
            };
        }

        // System degradation check
        if (this.isFeatureDegraded(featureName)) {
            return {
                available: false,
                reason: 'system_degradation',
                details: 'Feature disabled due to system-wide degradation'
            };
        }

        // Health check
        if (!featureHealth.isHealthy) {
            return {
                available: false,
                reason: 'unhealthy',
                details: 'Feature health check failed'
            };
        }

        return { available: true };
    }

    isFeatureDegraded(featureName) {
        const status = this.featureStatus.get(featureName);

        if (!status) return false;

        // Critical features are only disabled at high degradation levels
        if (this.config.criticalFeatures.includes(featureName)) {
            return this.degradationLevel >= 4; // Only disable critical features at level 4+
        }

        // Optional features disabled at lower degradation levels
        return this.degradationLevel >= 2;
    }

    // ==================== FALLBACK STRATEGIES ====================

    registerFallbackStrategies() {
        // Business classification fallbacks
        this.fallbackStrategies.set('business_classification', {
            primary: this.fallbackBusinessClassification.bind(this),
            secondary: this.staticBusinessClassification.bind(this),
            tertiary: this.minimalBusinessClassification.bind(this)
        });

        // Cost validation fallbacks
        this.fallbackStrategies.set('cost_validation', {
            primary: this.fallbackCostValidation.bind(this),
            secondary: this.simpleCostValidation.bind(this),
            tertiary: this.basicCostValidation.bind(this)
        });

        // Recommendation fallbacks
        this.fallbackStrategies.set('recommendations', {
            primary: this.fallbackRecommendations.bind(this),
            secondary: this.templatedRecommendations.bind(this),
            tertiary: this.genericRecommendations.bind(this)
        });

        // Analytics fallbacks
        this.fallbackStrategies.set('analytics', {
            primary: this.fallbackAnalytics.bind(this),
            secondary: this.basicAnalytics.bind(this),
            tertiary: this.noAnalytics.bind(this)
        });

        // Insights fallbacks
        this.fallbackStrategies.set('insights', {
            primary: this.fallbackInsights.bind(this),
            secondary: this.staticInsights.bind(this),
            tertiary: this.noInsights.bind(this)
        });
    }

    async handleFeatureUnavailable(featureName, context, reason) {
        console.log(`⚠️ Feature unavailable: ${featureName} (${reason})`);

        // Try fallback strategies
        return await this.executeFallbackStrategy(featureName, context, reason);
    }

    async handleFeatureFailure(featureName, error, context) {
        this.metrics.failedCalls++;

        console.log(`❌ Feature failed: ${featureName} - ${error.message}`);

        // Analyze error pattern
        this.analyzeErrorPattern(featureName, error);

        // Try fallback strategies
        return await this.executeFallbackStrategy(featureName, context, 'feature_error');
    }

    async executeFallbackStrategy(featureName, context, reason) {
        const strategies = this.fallbackStrategies.get(featureName);

        if (!strategies) {
            return this.generateEmergencyFallback(featureName, context, reason);
        }

        const strategyLevels = ['primary', 'secondary', 'tertiary'];

        for (const level of strategyLevels) {
            if (strategies[level]) {
                try {
                    console.log(`🔄 Trying ${level} fallback for ${featureName}`);

                    const result = await strategies[level](context, reason);

                    this.metrics.fallbackCalls++;

                    return {
                        ...result,
                        degraded: true,
                        executedAt: `fallback_${level}`,
                        originalReason: reason,
                        featureHealth: this.getFeatureHealth(featureName)
                    };

                } catch (fallbackError) {
                    console.log(`❌ ${level} fallback failed for ${featureName}:`, fallbackError.message);
                    continue; // Try next level
                }
            }
        }

        // All fallbacks failed - return emergency response
        return this.generateEmergencyFallback(featureName, context, reason);
    }

    // ==================== FALLBACK IMPLEMENTATIONS ====================

    async fallbackBusinessClassification(context, reason) {
        // Use rule-based classification instead of AI
        const businessInfo = context.businessInfo || {};

        const classification = {
            businessType: this.inferBusinessTypeFromRules(businessInfo),
            confidence: 0.6,
            industry: this.inferIndustryFromRules(businessInfo),
            fallback: true,
            method: 'rule_based',
            reason
        };

        return { classification };
    }

    async staticBusinessClassification(context, reason) {
        // Return generic classification
        return {
            classification: {
                businessType: 'general',
                confidence: 0.3,
                industry: 'general',
                fallback: true,
                method: 'static',
                reason
            }
        };
    }

    async minimalBusinessClassification(context, reason) {
        // Minimal response
        return {
            classification: {
                businessType: 'unknown',
                confidence: 0.1,
                fallback: true,
                method: 'minimal',
                reason
            }
        };
    }

    async fallbackCostValidation(context, reason) {
        // Simple range validation
        const costs = context.costs || {};
        const validations = {};

        for (const [category, value] of Object.entries(costs)) {
            validations[category] = this.simpleRangeValidation(category, value);
        }

        return {
            validations,
            fallback: true,
            method: 'simple_range',
            reason
        };
    }

    async simpleCostValidation(context, reason) {
        // Basic sanity checks only
        const costs = context.costs || {};
        const validations = {};

        for (const [category, value] of Object.entries(costs)) {
            validations[category] = {
                valid: value >= 0 && value < 1000000, // Basic sanity check
                confidence: 0.3,
                message: value < 0 ? 'Negative cost not allowed' : 'Cost appears reasonable'
            };
        }

        return {
            validations,
            fallback: true,
            method: 'basic_sanity',
            reason
        };
    }

    async basicCostValidation(context, reason) {
        // Accept all costs as valid
        const costs = context.costs || {};
        const validations = {};

        for (const category of Object.keys(costs)) {
            validations[category] = {
                valid: true,
                confidence: 0.1,
                message: 'Cost validation unavailable'
            };
        }

        return {
            validations,
            fallback: true,
            method: 'accept_all',
            reason
        };
    }

    async fallbackRecommendations(context, reason) {
        // Template-based recommendations
        const recommendations = this.generateTemplateRecommendations(context);

        return {
            recommendations,
            fallback: true,
            method: 'template_based',
            reason
        };
    }

    async templatedRecommendations(context, reason) {
        // Generic recommendations
        return {
            recommendations: [
                {
                    title: 'Review Cost Structure',
                    description: 'Analyze your current cost allocation and identify optimization opportunities',
                    priority: 'medium',
                    confidence: 0.4
                },
                {
                    title: 'Monitor Key Metrics',
                    description: 'Set up regular monitoring of your key business metrics',
                    priority: 'low',
                    confidence: 0.3
                }
            ],
            fallback: true,
            method: 'generic_templates',
            reason
        };
    }

    async genericRecommendations(context, reason) {
        // Single generic recommendation
        return {
            recommendations: [
                {
                    title: 'Business Review',
                    description: 'Conduct a comprehensive business review when system is available',
                    priority: 'low',
                    confidence: 0.2
                }
            ],
            fallback: true,
            method: 'generic',
            reason
        };
    }

    async fallbackAnalytics(context, reason) {
        // Basic analytics calculation
        return {
            analytics: {
                totalCosts: this.calculateTotalCosts(context.costs || {}),
                summary: 'Basic cost summary available',
                trends: 'Trend analysis unavailable'
            },
            fallback: true,
            method: 'basic_calculation',
            reason
        };
    }

    async basicAnalytics(context, reason) {
        return {
            analytics: {
                message: 'Advanced analytics temporarily unavailable'
            },
            fallback: true,
            method: 'unavailable_message',
            reason
        };
    }

    async noAnalytics(context, reason) {
        return {
            analytics: null,
            fallback: true,
            method: 'disabled',
            reason
        };
    }

    async fallbackInsights(context, reason) {
        return {
            insights: [
                'Review your cost structure regularly',
                'Monitor industry benchmarks',
                'Consider process automation opportunities'
            ],
            fallback: true,
            method: 'static_insights',
            reason
        };
    }

    async staticInsights(context, reason) {
        return {
            insights: ['System insights temporarily unavailable'],
            fallback: true,
            method: 'unavailable_message',
            reason
        };
    }

    async noInsights(context, reason) {
        return {
            insights: null,
            fallback: true,
            method: 'disabled',
            reason
        };
    }

    generateEmergencyFallback(featureName, context, reason) {
        return {
            error: 'Feature temporarily unavailable',
            featureName,
            reason,
            fallback: true,
            method: 'emergency',
            retryAfter: 60000, // 1 minute
            timestamp: Date.now()
        };
    }

    // ==================== HELPER FUNCTIONS ====================

    inferBusinessTypeFromRules(businessInfo) {
        const name = (businessInfo.businessName || '').toLowerCase();
        const description = (businessInfo.description || '').toLowerCase();
        const text = `${name} ${description}`;

        if (text.includes('tech') || text.includes('software') || text.includes('app')) return 'technology';
        if (text.includes('retail') || text.includes('shop') || text.includes('store')) return 'retail';
        if (text.includes('health') || text.includes('medical') || text.includes('clinic')) return 'healthcare';
        if (text.includes('finance') || text.includes('bank') || text.includes('invest')) return 'finance';
        if (text.includes('food') || text.includes('restaurant') || text.includes('cafe')) return 'food_service';

        return 'general';
    }

    inferIndustryFromRules(businessInfo) {
        const businessType = this.inferBusinessTypeFromRules(businessInfo);
        const industryMap = {
            'technology': 'Information Technology',
            'retail': 'Retail Trade',
            'healthcare': 'Healthcare',
            'finance': 'Financial Services',
            'food_service': 'Food Service',
            'general': 'Other Services'
        };

        return industryMap[businessType] || 'Other Services';
    }

    simpleRangeValidation(category, value) {
        const ranges = {
            'labor': { min: 0, max: 500000 },
            'materials': { min: 0, max: 200000 },
            'overhead': { min: 0, max: 100000 },
            'marketing': { min: 0, max: 50000 },
            'default': { min: 0, max: 1000000 }
        };

        const range = ranges[category] || ranges['default'];
        const valid = value >= range.min && value <= range.max;

        return {
            valid,
            confidence: valid ? 0.7 : 0.9,
            message: valid ?
                'Cost within expected range' :
                `Cost outside expected range (${range.min} - ${range.max})`
        };
    }

    generateTemplateRecommendations(context) {
        const recommendations = [];
        const costs = context.costs || {};

        // Cost-based recommendations
        if (Object.keys(costs).length > 0) {
            const totalCosts = this.calculateTotalCosts(costs);

            if (totalCosts > 100000) {
                recommendations.push({
                    title: 'Cost Optimization Review',
                    description: 'Consider reviewing your cost structure for optimization opportunities',
                    priority: 'high',
                    confidence: 0.6
                });
            }

            // Labor cost recommendations
            if (costs.labor && costs.labor > totalCosts * 0.6) {
                recommendations.push({
                    title: 'Labor Cost Analysis',
                    description: 'Labor costs appear high relative to total costs',
                    priority: 'medium',
                    confidence: 0.5
                });
            }
        }

        return recommendations.length > 0 ? recommendations : [
            {
                title: 'Business Process Review',
                description: 'Regular review of business processes is recommended',
                priority: 'low',
                confidence: 0.3
            }
        ];
    }

    calculateTotalCosts(costs) {
        return Object.values(costs)
            .filter(value => typeof value === 'number' && value >= 0)
            .reduce((sum, value) => sum + value, 0);
    }

    // ==================== ERROR ANALYSIS ====================

    analyzeErrorPattern(featureName, error) {
        if (!this.errorPatterns.has(featureName)) {
            this.errorPatterns.set(featureName, {
                errors: [],
                patterns: new Map(),
                lastAnalysis: Date.now()
            });
        }

        const errorData = this.errorPatterns.get(featureName);
        const errorKey = this.categorizeError(error);

        // Record error
        errorData.errors.push({
            type: errorKey,
            message: error.message,
            timestamp: Date.now()
        });

        // Update pattern count
        const currentCount = errorData.patterns.get(errorKey) || 0;
        errorData.patterns.set(errorKey, currentCount + 1);

        // Keep only recent errors (last hour)
        const cutoff = Date.now() - 60 * 60 * 1000;
        errorData.errors = errorData.errors.filter(e => e.timestamp > cutoff);

        // Analyze pattern if we have enough data
        if (errorData.errors.length >= 5) {
            this.analyzeErrorTrends(featureName, errorData);
        }
    }

    categorizeError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('timeout')) return 'timeout';
        if (message.includes('network') || message.includes('connection')) return 'network';
        if (message.includes('parse') || message.includes('json')) return 'parsing';
        if (message.includes('validation')) return 'validation';
        if (message.includes('auth')) return 'authentication';
        if (message.includes('rate') || message.includes('limit')) return 'rate_limiting';

        return 'unknown';
    }

    analyzeErrorTrends(featureName, errorData) {
        const recentErrors = errorData.errors.slice(-10); // Last 10 errors
        const errorTypes = new Set(recentErrors.map(e => e.type));

        // If all recent errors are the same type, it might indicate a systemic issue
        if (errorTypes.size === 1 && recentErrors.length >= 5) {
            const errorType = recentErrors[0].type;
            console.log(`🚨 Error pattern detected for ${featureName}: ${errorType}`);

            this.emit('error_pattern_detected', {
                featureName,
                errorType,
                count: recentErrors.length,
                timestamp: Date.now()
            });
        }
    }

    // ==================== HEALTH MONITORING ====================

    setupHealthMonitoring() {
        setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);

        // Initial health check
        setTimeout(() => {
            this.performHealthChecks();
        }, 5000);
    }

    performHealthChecks() {
        for (const featureName of this.circuitBreakers.keys()) {
            this.checkFeatureHealth(featureName);
        }

        this.updateSystemHealth();
    }

    checkFeatureHealth(featureName) {
        const health = this.getFeatureHealth(featureName);
        const circuitBreaker = this.getCircuitBreaker(featureName);
        const now = Date.now();

        // Update health metrics
        if (circuitBreaker.state === 'CLOSED' && health.successStreak > 10) {
            health.isHealthy = true;
        } else if (circuitBreaker.state === 'OPEN' || health.failureStreak > 5) {
            health.isHealthy = false;
        }

        health.lastHealthCheck = now;

        // Calculate error rate (last hour)
        const errorData = this.errorPatterns.get(featureName);
        if (errorData) {
            const recentErrors = errorData.errors.filter(e => now - e.timestamp < 3600000);
            const totalCalls = this.metrics.totalCalls || 1;
            health.errorRate = recentErrors.length / totalCalls;
        }
    }

    updateSystemHealth() {
        const healthyFeatures = Array.from(this.featureHealth.entries())
            .filter(([_, health]) => health.isHealthy)
            .map(([name]) => name);

        const unhealthyFeatures = Array.from(this.featureHealth.entries())
            .filter(([_, health]) => !health.isHealthy)
            .map(([name]) => name);

        // Update available features
        this.systemHealth.availableFeatures.clear();
        healthyFeatures.forEach(feature => {
            this.systemHealth.availableFeatures.add(feature);
        });

        // Determine overall health
        const criticalUnhealthy = unhealthyFeatures.filter(f =>
            this.config.criticalFeatures.includes(f)
        );

        if (criticalUnhealthy.length > 0) {
            this.systemHealth.overall = 'degraded';
        } else if (unhealthyFeatures.length > healthyFeatures.length / 2) {
            this.systemHealth.overall = 'degraded';
        } else {
            this.systemHealth.overall = 'healthy';
        }

        this.systemHealth.lastUpdate = Date.now();
        this.systemHealth.criticalFailures = criticalUnhealthy.length;

        // Emit health update
        this.emit('system_health_update', {
            overall: this.systemHealth.overall,
            healthyFeatures: healthyFeatures.length,
            unhealthyFeatures: unhealthyFeatures.length,
            criticalFailures: this.systemHealth.criticalFailures
        });
    }

    // ==================== SYSTEM DEGRADATION ====================

    evaluateSystemDegradation() {
        const totalFeatures = this.circuitBreakers.size;
        const openCircuits = Array.from(this.circuitBreakers.values())
            .filter(cb => cb.state === 'OPEN').length;

        const criticalFailures = Array.from(this.circuitBreakers.entries())
            .filter(([name, cb]) =>
                this.config.criticalFeatures.includes(name) && cb.state === 'OPEN'
            ).length;

        // Calculate degradation level
        let newDegradationLevel = 0;

        if (criticalFailures > 0) {
            newDegradationLevel = Math.min(4 + criticalFailures, 5);
        } else {
            const failureRatio = openCircuits / totalFeatures;
            newDegradationLevel = Math.floor(failureRatio * 5);
        }

        if (newDegradationLevel !== this.degradationLevel) {
            const previousLevel = this.degradationLevel;
            this.degradationLevel = newDegradationLevel;

            this.metrics.degradationEvents++;

            console.log(`📉 System degradation level changed: ${previousLevel} → ${newDegradationLevel}`);

            this.emit('degradation_level_changed', {
                previousLevel,
                newLevel: newDegradationLevel,
                criticalFailures,
                totalFailures: openCircuits,
                timestamp: Date.now()
            });
        }
    }

    // ==================== AUTO RECOVERY ====================

    setupAutoRecovery() {
        if (!this.config.autoRecovery) return;

        // Check for recovery opportunities every 2 minutes
        setInterval(() => {
            this.attemptAutoRecovery();
        }, 2 * 60 * 1000);
    }

    attemptAutoRecovery() {
        for (const [featureName, circuitBreaker] of this.circuitBreakers) {
            if (circuitBreaker.state === 'OPEN') {
                const timeSinceTrip = Date.now() - (circuitBreaker.trippedAt || 0);

                // Extended recovery time for repeated failures
                const recoveryTime = this.calculateRecoveryTime(featureName);

                if (timeSinceTrip > recoveryTime) {
                    console.log(`🔧 Attempting auto-recovery for ${featureName}`);
                    this.attemptCircuitBreakerRecovery(featureName);
                }
            }
        }
    }

    calculateRecoveryTime(featureName) {
        const baseTime = this.config.recoveryTimeout;
        const circuitBreaker = this.getCircuitBreaker(featureName);

        // Increase recovery time based on failure history
        const failureMultiplier = Math.min(circuitBreaker.failureCount / 5, 3);

        return baseTime * (1 + failureMultiplier);
    }

    // ==================== MONITORING AND METRICS ====================

    recordSuccess(featureName, responseTime) {
        const health = this.getFeatureHealth(featureName);

        health.successStreak++;
        health.failureStreak = 0;

        // Update average response time
        health.avgResponseTime = (health.avgResponseTime * 0.9) + (responseTime * 0.1);

        // Update overall metrics
        this.updateAverageResponseTime(responseTime);
    }

    recordFailure(featureName, error, responseTime) {
        const health = this.getFeatureHealth(featureName);

        health.failureStreak++;
        health.successStreak = 0;

        const status = this.featureStatus.get(featureName);
        if (status) {
            status.lastError = {
                message: error.message,
                timestamp: Date.now()
            };
        }

        this.updateAverageResponseTime(responseTime);
    }

    getFeatureHealth(featureName) {
        return this.featureHealth.get(featureName) || {
            isHealthy: true,
            errorRate: 0,
            avgResponseTime: 0,
            successStreak: 0,
            failureStreak: 0,
            lastHealthCheck: Date.now()
        };
    }

    updateAverageResponseTime(responseTime) {
        const total = this.metrics.totalCalls;
        const current = this.metrics.avgResponseTime;
        this.metrics.avgResponseTime = ((current * (total - 1)) + responseTime) / total;
    }

    getMetrics() {
        const failureRate = this.metrics.totalCalls > 0 ?
            (this.metrics.failedCalls / this.metrics.totalCalls * 100).toFixed(2) : 0;

        const fallbackRate = this.metrics.totalCalls > 0 ?
            (this.metrics.fallbackCalls / this.metrics.totalCalls * 100).toFixed(2) : 0;

        return {
            ...this.metrics,
            failureRate: parseFloat(failureRate),
            fallbackRate: parseFloat(fallbackRate),
            degradationLevel: this.degradationLevel,
            healthyFeatures: Array.from(this.systemHealth.availableFeatures).length,
            totalFeatures: this.circuitBreakers.size,
            systemHealth: this.systemHealth.overall,
            circuitBreakerStatus: this.getCircuitBreakerStatus()
        };
    }

    getCircuitBreakerStatus() {
        const status = {};

        for (const [featureName, circuitBreaker] of this.circuitBreakers) {
            status[featureName] = {
                state: circuitBreaker.state,
                failureCount: circuitBreaker.failureCount,
                isHealthy: this.getFeatureHealth(featureName).isHealthy
            };
        }

        return status;
    }

    healthCheck() {
        const metrics = this.getMetrics();

        return {
            status: this.systemHealth.overall,
            degradationLevel: this.degradationLevel,
            availableFeatures: metrics.healthyFeatures,
            totalFeatures: metrics.totalFeatures,
            failureRate: `${metrics.failureRate}%`,
            fallbackRate: `${metrics.fallbackRate}%`,
            recommendations: this.generateHealthRecommendations(metrics)
        };
    }

    generateHealthRecommendations(metrics) {
        const recommendations = [];

        if (this.degradationLevel > 2) {
            recommendations.push('System degradation detected - investigate failed features');
        }

        if (parseFloat(metrics.failureRate) > 20) {
            recommendations.push('High failure rate - check system resources and dependencies');
        }

        if (parseFloat(metrics.fallbackRate) > 50) {
            recommendations.push('Excessive fallback usage - primary features may need attention');
        }

        if (metrics.circuitBreakerTrips > 5) {
            recommendations.push('Multiple circuit breaker trips - investigate root causes');
        }

        return recommendations;
    }

    // ==================== PERSISTENCE ====================

    async loadPersistedState() {
        if (!this.config.enablePersistence) return;

        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                if (data.metrics) {
                    this.metrics = { ...this.metrics, ...data.metrics };
                }

                if (data.degradationLevel !== undefined) {
                    this.degradationLevel = data.degradationLevel;
                }

                console.log(`📥 Loaded degradation system state`);
            }
        } catch (error) {
            console.error('Failed to load degradation state:', error);
        }
    }

    async persistState() {
        if (!this.config.enablePersistence) return;

        try {
            const data = {
                metrics: this.metrics,
                degradationLevel: this.degradationLevel,
                systemHealth: this.systemHealth,
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist degradation state:', error);
        }
    }
}

module.exports = GracefulDegradationSystem;