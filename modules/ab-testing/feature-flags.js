/**
 * Enhanced Feature Flags System
 * Integrates with A/B testing and intelligent features
 */

const ABTestingManager = require('./index');
const ErrorHandler = require('./error-handler');

class FeatureFlagManager {
    constructor(options = {}) {
        this.abTestingManager = new ABTestingManager(options);
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.errorHandler = new ErrorHandler(options);

        // Feature flag configurations
        this.featureConfigs = {
            // Intelligent Features
            intelligentCosting: {
                name: 'Intelligent Costing',
                description: 'Core intelligent costing functionality',
                dependencies: [],
                variants: {
                    basic: { description: 'Basic costing calculations', weight: 0.4 },
                    advanced: { description: 'Advanced ML-powered costing', weight: 0.4 },
                    premium: { description: 'Premium AI-enhanced costing', weight: 0.2 }
                }
            },
            businessClassification: {
                name: 'Business Classification',
                description: 'Automatic business type detection',
                dependencies: ['intelligentCosting'],
                variants: {
                    standard: { description: 'Standard classification', weight: 0.6 },
                    advanced: { description: 'Advanced ML classification', weight: 0.4 }
                }
            },
            adaptiveQuestions: {
                name: 'Adaptive Questions',
                description: 'Dynamic question generation',
                dependencies: ['businessClassification'],
                variants: {
                    none: { description: 'No adaptive questions', weight: 0.3 },
                    dynamic: { description: 'Basic adaptive questions', weight: 0.4 },
                    personalized: { description: 'Personalized question flow', weight: 0.3 }
                }
            },
            intelligentValidation: {
                name: 'Intelligent Validation',
                description: 'Smart cost validation',
                dependencies: ['businessClassification'],
                variants: {
                    standard: { description: 'Standard validation rules', weight: 0.5 },
                    strict: { description: 'Strict validation with warnings', weight: 0.3 },
                    comprehensive: { description: 'Comprehensive AI validation', weight: 0.2 }
                }
            },
            advancedRecommendations: {
                name: 'Advanced Recommendations',
                description: 'AI-powered business recommendations',
                dependencies: ['businessClassification', 'intelligentValidation'],
                variants: {
                    none: { description: 'No recommendations', weight: 0.4 },
                    basic: { description: 'Basic recommendations', weight: 0.3 },
                    ai_powered: { description: 'AI-powered recommendations', weight: 0.3 }
                }
            },
            realTimeInsights: {
                name: 'Real-time Insights',
                description: 'Live business insights and benchmarks',
                dependencies: ['businessClassification'],
                variants: {
                    none: { description: 'No real-time insights', weight: 0.6 },
                    basic: { description: 'Basic industry insights', weight: 0.4 }
                }
            }
        };

        console.log('🚩 Feature Flag Manager initialized');
    }

    // ==================== FEATURE FLAG EVALUATION ====================

    async evaluateFeature(featureName, userId, context = {}) {
        return await this.errorHandler.executeWithCircuitBreaker(
            `feature_evaluation_${featureName}`,
            async () => {
                const cacheKey = `${featureName}_${userId}`;
                const cached = this.getCachedResult(cacheKey);

                if (cached) {
                    return cached;
                }

                // Get user profile for better segmentation
                const userProfile = await this.getUserProfile(userId, context);
                const userSegment = this.abTestingManager.getUserSegment(userId, userProfile);

                // Check feature dependencies
                const dependenciesMet = await this.checkDependencies(featureName, userId, userSegment);
                if (!dependenciesMet.met) {
                    const result = {
                        enabled: false,
                        variant: 'none',
                        reason: `Dependencies not met: ${dependenciesMet.missing.join(', ')}`
                    };
                    this.setCachedResult(cacheKey, result);
                    return result;
                }

                // Evaluate feature flag
                const isEnabled = this.abTestingManager.isFeatureEnabled(featureName, userId, userSegment);
                const variant = this.abTestingManager.getFeatureVariant(featureName, userId, userSegment);

                // Additional context-based logic
                const finalResult = this.applyContextualLogic(featureName, isEnabled, variant, context, userProfile);

                // Track evaluation
                this.abTestingManager.trackEvent({
                    type: 'feature_evaluation',
                    userId,
                    userSegment,
                    feature: featureName,
                    enabled: finalResult.enabled,
                    variant: finalResult.variant,
                    context: context
                });

                this.setCachedResult(cacheKey, finalResult);
                return finalResult;
            },
            // Fallback function
            (error) => {
                this.errorHandler.logError('feature_evaluation_failed', error, {
                    featureName,
                    userId,
                    context
                });

                return this.errorHandler.getDefaultFallback('featureFlags')(featureName);
            }
        );
    }

    async checkDependencies(featureName, userId, userSegment) {
        const featureConfig = this.featureConfigs[featureName];
        if (!featureConfig || !featureConfig.dependencies.length) {
            return { met: true, missing: [] };
        }

        const missing = [];

        for (const dependency of featureConfig.dependencies) {
            const isEnabled = this.abTestingManager.isFeatureEnabled(dependency, userId, userSegment);
            if (!isEnabled) {
                missing.push(dependency);
            }
        }

        return {
            met: missing.length === 0,
            missing
        };
    }

    applyContextualLogic(featureName, isEnabled, variant, context, userProfile) {
        // Apply business logic based on context
        let finalEnabled = isEnabled;
        let finalVariant = variant;
        let reason = null;

        // Time-based logic
        if (context.timeOfDay) {
            const hour = new Date().getHours();
            if (featureName === 'realTimeInsights' && (hour < 6 || hour > 22)) {
                finalEnabled = false;
                reason = 'Feature disabled during low-traffic hours';
            }
        }

        // Performance-based logic
        if (context.systemLoad && context.systemLoad > 0.8) {
            if (['advancedRecommendations', 'realTimeInsights'].includes(featureName)) {
                finalEnabled = false;
                reason = 'Feature disabled due to high system load';
            }
        }

        // User experience logic
        if (context.sessionDuration && context.sessionDuration < 30) {
            // Don't show complex features to users with very short sessions
            if (featureName === 'adaptiveQuestions' && finalVariant === 'personalized') {
                finalVariant = 'dynamic';
                reason = 'Simplified variant for short session';
            }
        }

        // Error rate logic
        if (context.errorRate && context.errorRate > 0.1) {
            if (['advancedRecommendations', 'realTimeInsights'].includes(featureName)) {
                finalEnabled = false;
                reason = 'Feature disabled due to high error rate';
            }
        }

        return {
            enabled: finalEnabled,
            variant: finalVariant,
            reason: reason,
            timestamp: new Date().toISOString()
        };
    }

    // ==================== GRADUAL ROLLOUT ====================

    async updateRolloutPercentage(featureName, newPercentage, segment = 'all') {
        try {
            const config = this.abTestingManager.getConfig();

            if (segment === 'all') {
                // Update global feature flag
                if (config.featureFlags[featureName]) {
                    config.featureFlags[featureName].rollout = newPercentage;
                }
            } else {
                // Update segment-specific rollout
                if (config.segments[segment]) {
                    // Custom segment rollout logic can be implemented here
                    console.log(`Rollout update for ${featureName} in ${segment}: ${newPercentage}%`);
                }
            }

            // Clear relevant caches
            this.clearFeatureCache(featureName);

            // Track rollout change
            this.abTestingManager.trackEvent({
                type: 'rollout_change',
                feature: featureName,
                segment: segment,
                oldPercentage: config.featureFlags[featureName]?.rollout || 0,
                newPercentage: newPercentage,
                timestamp: new Date().toISOString()
            });

            console.log(`🚀 Rollout updated: ${featureName} -> ${newPercentage}% (${segment})`);
            return true;

        } catch (error) {
            console.error(`Error updating rollout for ${featureName}:`, error);
            return false;
        }
    }

    async gradualRollout(featureName, targetPercentage, stepSize = 5, intervalMinutes = 60) {
        const config = this.abTestingManager.getConfig();
        const currentPercentage = config.featureFlags[featureName]?.rollout || 0;

        if (currentPercentage >= targetPercentage) {
            console.log(`✅ Feature ${featureName} already at or above target rollout`);
            return;
        }

        console.log(`📈 Starting gradual rollout: ${featureName} ${currentPercentage}% -> ${targetPercentage}%`);

        const steps = Math.ceil((targetPercentage - currentPercentage) / stepSize);
        let currentStep = currentPercentage;

        for (let i = 0; i < steps; i++) {
            currentStep = Math.min(currentStep + stepSize, targetPercentage);

            await this.updateRolloutPercentage(featureName, currentStep);

            console.log(`📊 Rollout step ${i + 1}/${steps}: ${featureName} -> ${currentStep}%`);

            // Wait for next step (except on last iteration)
            if (i < steps - 1) {
                await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
            }
        }

        console.log(`🎉 Gradual rollout complete: ${featureName} -> ${targetPercentage}%`);
    }

    // ==================== EMERGENCY CONTROLS ====================

    async emergencyDisable(featureName, reason = 'Emergency disable') {
        try {
            console.log(`🚨 EMERGENCY DISABLE: ${featureName} - ${reason}`);

            const config = this.abTestingManager.getConfig();

            // Disable in feature flags
            if (config.featureFlags[featureName]) {
                config.featureFlags[featureName].enabled = false;
                config.featureFlags[featureName].rollout = 0;
            }

            // Disable in all segments
            Object.keys(config.segments).forEach(segment => {
                if (config.segments[segment].features[featureName]) {
                    config.segments[segment].features[featureName].enabled = false;
                }
            });

            // Clear all caches for this feature
            this.clearFeatureCache(featureName);

            // Track emergency disable
            this.abTestingManager.trackEvent({
                type: 'emergency_disable',
                feature: featureName,
                reason: reason,
                timestamp: new Date().toISOString(),
                severity: 'critical'
            });

            console.log(`⛔ Feature ${featureName} disabled across all segments`);
            return true;

        } catch (error) {
            console.error(`Error in emergency disable for ${featureName}:`, error);
            return false;
        }
    }

    async circuitBreaker(featureName, errorThreshold = 0.1, timeWindowMinutes = 5) {
        const recentErrors = this.getRecentErrors(featureName, timeWindowMinutes);
        const recentUsage = this.getRecentUsage(featureName, timeWindowMinutes);

        const errorRate = recentUsage > 0 ? recentErrors / recentUsage : 0;

        if (errorRate >= errorThreshold) {
            await this.emergencyDisable(featureName, `Circuit breaker triggered: ${(errorRate * 100).toFixed(1)}% error rate`);
            return true;
        }

        return false;
    }

    // ==================== CACHE MANAGEMENT ====================

    getCachedResult(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.result;
        }
        return null;
    }

    setCachedResult(cacheKey, result) {
        this.cache.set(cacheKey, {
            result,
            timestamp: Date.now()
        });
    }

    clearFeatureCache(featureName) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${featureName}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${featureName}`);
    }

    clearAllCache() {
        this.cache.clear();
        console.log('🗑️ Cleared all feature flag cache');
    }

    // ==================== UTILITIES ====================

    async getUserProfile(userId, context) {
        // This would typically fetch from your user database
        // For now, we'll use context and some defaults
        return {
            sessionCount: context.sessionCount || 1,
            userType: context.userType || 'regular',
            signupDate: context.signupDate || new Date(),
            isPremium: context.isPremium || false,
            engagementScore: context.engagementScore || 0.5
        };
    }

    getRecentErrors(featureName, timeWindowMinutes) {
        // This would typically query your error logging system
        // For now, return a mock value
        return Math.floor(Math.random() * 5);
    }

    getRecentUsage(featureName, timeWindowMinutes) {
        // This would typically query your usage analytics
        // For now, return a mock value
        return Math.floor(Math.random() * 100) + 50;
    }

    // ==================== MONITORING ====================

    getFeatureStatus() {
        const config = this.abTestingManager.getConfig();
        const status = {};

        Object.keys(this.featureConfigs).forEach(featureName => {
            const featureFlag = config.featureFlags[featureName];
            const featureConfig = this.featureConfigs[featureName];

            status[featureName] = {
                name: featureConfig.name,
                description: featureConfig.description,
                enabled: featureFlag?.enabled || false,
                rollout: featureFlag?.rollout || 0,
                variants: Object.keys(featureConfig.variants),
                dependencies: featureConfig.dependencies,
                segmentStatus: {}
            };

            // Add segment-specific status
            Object.keys(config.segments).forEach(segment => {
                const segmentFeature = config.segments[segment].features[featureName];
                if (segmentFeature) {
                    status[featureName].segmentStatus[segment] = {
                        enabled: segmentFeature.enabled,
                        variant: segmentFeature.variant
                    };
                }
            });
        });

        return status;
    }

    async getHealthStatus() {
        const abHealth = this.abTestingManager.healthCheck();
        const featureStatus = this.getFeatureStatus();
        const errorHandlerHealth = this.errorHandler.getHealthStatus();

        const combinedStatus = (abHealth.status === 'healthy' && errorHandlerHealth.overall === 'healthy')
            ? 'healthy'
            : (errorHandlerHealth.overall === 'unhealthy' ? 'unhealthy' : 'degraded');

        return {
            status: combinedStatus,
            timestamp: new Date().toISOString(),
            abTesting: abHealth,
            errorHandler: errorHandlerHealth,
            features: {
                total: Object.keys(this.featureConfigs).length,
                enabled: Object.values(featureStatus).filter(f => f.enabled).length,
                status: featureStatus
            },
            cache: {
                size: this.cache.size,
                timeout: this.cacheTimeout
            },
            circuitBreakers: errorHandlerHealth.circuitBreakers,
            recentErrors: errorHandlerHealth.errors?.recentCount || 0
        };
    }
}

module.exports = FeatureFlagManager;