/**
 * Feature Flags Middleware
 * Integrates feature flag system with Express requests
 */

const ProductionFeatureFlagsConfig = require('../config/production-feature-flags');

class FeatureFlagsMiddleware {
    constructor(options = {}) {
        this.flagsConfig = new ProductionFeatureFlagsConfig();
        this.options = {
            enableLogging: options.enableLogging !== false,
            enableMetrics: options.enableMetrics !== false,
            cacheTimeout: options.cacheTimeout || 60000, // 1 minute
            ...options
        };

        // Usage metrics
        this.metrics = {
            featureUsage: new Map(),
            flagChecks: 0,
            cacheHits: 0,
            cacheMisses: 0
        };

        // Simple cache for flag evaluations
        this.evaluationCache = new Map();
        this.setupCacheCleanup();
    }

    // Express middleware
    middleware() {
        return (req, res, next) => {
            // Extract user context from request
            const userContext = this.extractUserContext(req);

            // Add feature flag helpers to request
            req.featureFlags = {
                isEnabled: (featureKey) => this.isFeatureEnabled(featureKey, userContext),
                getFlag: (featureKey) => this.getFeatureFlag(featureKey, userContext),
                getAllFlags: () => this.getAllFeatureFlags(userContext),
                userContext: userContext
            };

            // Add response helper for feature flag headers
            res.setFeatureFlagHeaders = () => {
                const enabledFlags = this.getEnabledFlagKeys(userContext);
                res.set('X-Feature-Flags', enabledFlags.join(','));
                res.set('X-Feature-Rollout-User', userContext.userId || 'anonymous');
            };

            next();
        };
    }

    // Extract user context from request
    extractUserContext(req) {
        const user = req.user || {};
        const session = req.session || {};

        return {
            userId: user.id || session.userId,
            sessionId: req.sessionID || req.headers['x-session-id'],
            tier: user.tier || session.tier || 'free',
            status: user.status || 'active',
            version: req.headers['x-client-version'] || '1.0.0',
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],

            // Business context
            businessData: !!user.businessProfile,
            completedClassification: !!session.completedClassification,
            dataHistory: session.dataHistory || 'none',

            // Engagement metrics
            requestsPerDay: session.requestsPerDay || 0,
            sessionsPerWeek: session.sessionsPerWeek || 0,

            // Special flags
            betaUser: user.betaUser || false,
            isAdmin: user.isAdmin || false,

            // Request context
            requestTime: Date.now(),
            endpoint: req.path,
            method: req.method
        };
    }

    // Check if feature is enabled with caching
    isFeatureEnabled(featureKey, userContext) {
        const cacheKey = this.getCacheKey(featureKey, userContext);

        // Check cache first
        if (this.evaluationCache.has(cacheKey)) {
            this.metrics.cacheHits++;
            const cached = this.evaluationCache.get(cacheKey);

            if (Date.now() - cached.timestamp < this.options.cacheTimeout) {
                return cached.enabled;
            }

            this.evaluationCache.delete(cacheKey);
        }

        this.metrics.cacheMisses++;
        this.metrics.flagChecks++;

        // Evaluate feature flag
        const enabled = this.flagsConfig.isFeatureEnabled(featureKey, userContext);

        // Cache result
        this.evaluationCache.set(cacheKey, {
            enabled,
            timestamp: Date.now()
        });

        // Track usage
        this.trackFeatureUsage(featureKey, enabled, userContext);

        if (this.options.enableLogging) {
            console.log(`Feature flag '${featureKey}' ${enabled ? 'enabled' : 'disabled'} for user ${userContext.userId || 'anonymous'}`);
        }

        return enabled;
    }

    // Get feature flag with metadata
    getFeatureFlag(featureKey, userContext) {
        const flag = this.flagsConfig.getFeatureFlag(featureKey, userContext);

        if (flag && this.options.enableMetrics) {
            this.trackFeatureUsage(featureKey, flag.enabled, userContext);
        }

        return flag;
    }

    // Get all feature flags for user
    getAllFeatureFlags(userContext) {
        return this.flagsConfig.getAllFeatureFlags(userContext);
    }

    // Get enabled flag keys
    getEnabledFlagKeys(userContext) {
        const allFlags = this.getAllFeatureFlags(userContext);
        return Object.keys(allFlags).filter(key => allFlags[key].enabled);
    }

    // Track feature usage
    trackFeatureUsage(featureKey, enabled, userContext) {
        if (!this.options.enableMetrics) return;

        const usage = this.metrics.featureUsage.get(featureKey) || {
            totalChecks: 0,
            enabledChecks: 0,
            disabledChecks: 0,
            uniqueUsers: new Set(),
            lastUsed: null
        };

        usage.totalChecks++;
        if (enabled) {
            usage.enabledChecks++;
        } else {
            usage.disabledChecks++;
        }

        if (userContext.userId) {
            usage.uniqueUsers.add(userContext.userId);
        }

        usage.lastUsed = Date.now();

        this.metrics.featureUsage.set(featureKey, usage);
    }

    // Generate cache key
    getCacheKey(featureKey, userContext) {
        // Create a stable cache key based on relevant user context
        const keyData = {
            feature: featureKey,
            userId: userContext.userId,
            tier: userContext.tier,
            status: userContext.status,
            businessData: userContext.businessData,
            betaUser: userContext.betaUser
        };

        return `flag_${featureKey}_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
    }

    // Get usage metrics
    getMetrics() {
        const featureMetrics = {};

        this.metrics.featureUsage.forEach((usage, featureKey) => {
            featureMetrics[featureKey] = {
                totalChecks: usage.totalChecks,
                enabledChecks: usage.enabledChecks,
                disabledChecks: usage.disabledChecks,
                uniqueUsers: usage.uniqueUsers.size,
                enabledRate: usage.totalChecks > 0 ? (usage.enabledChecks / usage.totalChecks) * 100 : 0,
                lastUsed: usage.lastUsed
            };
        });

        return {
            totalFlagChecks: this.metrics.flagChecks,
            cacheHitRate: this.metrics.flagChecks > 0 ?
                (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0,
            cacheSize: this.evaluationCache.size,
            featureMetrics
        };
    }

    // Clear metrics
    clearMetrics() {
        this.metrics.featureUsage.clear();
        this.metrics.flagChecks = 0;
        this.metrics.cacheHits = 0;
        this.metrics.cacheMisses = 0;
    }

    // Clear cache
    clearCache() {
        this.evaluationCache.clear();
    }

    // Setup cache cleanup
    setupCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.evaluationCache.entries()) {
                if (now - value.timestamp > this.options.cacheTimeout * 2) {
                    this.evaluationCache.delete(key);
                }
            }
        }, this.options.cacheTimeout);
    }

    // Update feature flag
    updateFeatureFlag(featureKey, updates) {
        const result = this.flagsConfig.updateFeatureFlag(featureKey, updates);

        // Clear related cache entries
        this.clearFeatureCache(featureKey);

        if (this.options.enableLogging) {
            console.log(`Feature flag '${featureKey}' updated:`, updates);
        }

        return result;
    }

    // Clear cache for specific feature
    clearFeatureCache(featureKey) {
        const keysToDelete = [];
        for (const key of this.evaluationCache.keys()) {
            if (key.includes(`flag_${featureKey}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.evaluationCache.delete(key));
    }

    // Feature flag guards for route protection
    requireFeature(featureKey, options = {}) {
        return (req, res, next) => {
            const userContext = req.featureFlags?.userContext || this.extractUserContext(req);
            const enabled = this.isFeatureEnabled(featureKey, userContext);

            if (!enabled) {
                const fallback = options.fallback || 'feature_disabled';
                const statusCode = options.statusCode || 403;

                if (fallback === 'redirect' && options.redirectUrl) {
                    return res.redirect(options.redirectUrl);
                }

                if (fallback === 'next') {
                    return next();
                }

                return res.status(statusCode).json({
                    error: `Feature '${featureKey}' is not available`,
                    featureDisabled: true,
                    fallback: options.fallbackMessage || 'This feature is currently unavailable'
                });
            }

            next();
        };
    }

    // Conditional middleware based on feature flag
    conditionalMiddleware(featureKey, middleware, fallbackMiddleware = null) {
        return (req, res, next) => {
            const userContext = req.featureFlags?.userContext || this.extractUserContext(req);
            const enabled = this.isFeatureEnabled(featureKey, userContext);

            if (enabled) {
                return middleware(req, res, next);
            } else if (fallbackMiddleware) {
                return fallbackMiddleware(req, res, next);
            } else {
                return next();
            }
        };
    }

    // Get feature configuration
    getFeatureConfig() {
        return this.flagsConfig;
    }

    // Health check for feature flag system
    healthCheck() {
        const validation = this.flagsConfig.validateConfig();
        const metrics = this.getMetrics();

        return {
            healthy: validation.valid,
            errors: validation.errors,
            cacheSize: this.evaluationCache.size,
            totalFlagChecks: metrics.totalFlagChecks,
            cacheHitRate: metrics.cacheHitRate,
            featuresMonitored: Object.keys(metrics.featureMetrics).length,
            timestamp: Date.now()
        };
    }
}

module.exports = FeatureFlagsMiddleware;