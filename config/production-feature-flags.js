/**
 * Production Feature Flags Configuration
 * Manages gradual rollout and feature enablement for production deployment
 */

class ProductionFeatureFlagsConfig {
    constructor() {
        this.flags = {
            // Core Intelligence Features
            business_classification: {
                key: 'business_classification',
                name: 'Business Classification',
                description: 'AI-powered business type classification',
                enabled: true,
                rollout: 100, // 100% of users
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['all'],
                conditions: {
                    userTier: ['free', 'premium', 'enterprise'],
                    userStatus: ['active'],
                    minVersion: '1.0.0'
                },
                fallback: {
                    enabled: true,
                    strategy: 'rule_based_classification',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackUsage: true,
                    trackPerformance: true,
                    trackErrors: true,
                    alertOnFailure: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            cost_validation: {
                key: 'cost_validation',
                name: 'Cost Validation',
                description: 'Intelligent cost validation and anomaly detection',
                enabled: true,
                rollout: 80, // 80% of users as requested
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['premium', 'enterprise', 'beta_users'],
                conditions: {
                    userTier: ['premium', 'enterprise'],
                    userStatus: ['active'],
                    minVersion: '1.0.0',
                    hasBusinessData: true
                },
                fallback: {
                    enabled: true,
                    strategy: 'basic_validation',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackUsage: true,
                    trackPerformance: true,
                    trackErrors: true,
                    alertOnFailure: true,
                    conversionTracking: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            recommendations_engine: {
                key: 'recommendations_engine',
                name: 'Recommendations Engine',
                description: 'AI-powered business recommendations',
                enabled: true,
                rollout: 90, // High rollout for valuable feature
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['premium', 'enterprise', 'high_engagement'],
                conditions: {
                    userTier: ['premium', 'enterprise'],
                    userStatus: ['active'],
                    minVersion: '1.0.0',
                    hasCompletedClassification: true
                },
                fallback: {
                    enabled: true,
                    strategy: 'template_recommendations',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackUsage: true,
                    trackPerformance: true,
                    trackErrors: true,
                    alertOnFailure: true,
                    qualityTracking: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            comprehensive_analysis: {
                key: 'comprehensive_analysis',
                name: 'Comprehensive Analysis',
                description: 'Full business analysis with all intelligence features',
                enabled: true,
                rollout: 70, // Gradual rollout for resource-intensive feature
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['enterprise', 'power_users'],
                conditions: {
                    userTier: ['enterprise'],
                    userStatus: ['active'],
                    minVersion: '1.0.0',
                    systemLoad: 'normal'
                },
                fallback: {
                    enabled: true,
                    strategy: 'partial_analysis',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackUsage: true,
                    trackPerformance: true,
                    trackErrors: true,
                    alertOnFailure: true,
                    resourceTracking: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            // System Optimization Features
            intelligent_caching: {
                key: 'intelligent_caching',
                name: 'Intelligent Caching',
                description: 'Advanced caching with pattern recognition',
                enabled: true,
                rollout: 100, // System feature, all users benefit
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['all'],
                conditions: {
                    systemHealth: 'healthy'
                },
                fallback: {
                    enabled: true,
                    strategy: 'basic_caching',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackPerformance: true,
                    trackHitRate: true,
                    alertOnFailure: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            adaptive_throttling: {
                key: 'adaptive_throttling',
                name: 'Adaptive Throttling',
                description: 'Intelligent rate limiting based on user behavior',
                enabled: true,
                rollout: 100, // System protection, all users
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['all'],
                conditions: {
                    systemHealth: 'healthy'
                },
                fallback: {
                    enabled: true,
                    strategy: 'basic_rate_limiting',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackThrottling: true,
                    trackBypass: true,
                    alertOnFailure: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            graceful_degradation: {
                key: 'graceful_degradation',
                name: 'Graceful Degradation',
                description: 'System resilience and failover capabilities',
                enabled: true,
                rollout: 100, // Critical system feature
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['all'],
                conditions: {},
                fallback: {
                    enabled: false, // This IS the fallback system
                    strategy: 'emergency_mode'
                },
                monitoring: {
                    trackDegradation: true,
                    trackRecovery: true,
                    alertOnActivation: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            // Monitoring and Analytics
            advanced_monitoring: {
                key: 'advanced_monitoring',
                name: 'Advanced Monitoring',
                description: 'Comprehensive system monitoring and analytics',
                enabled: true,
                rollout: 100, // System feature
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['all'],
                conditions: {},
                fallback: {
                    enabled: true,
                    strategy: 'basic_monitoring'
                },
                monitoring: {
                    selfMonitoring: true,
                    alertOnFailure: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },

            predictive_analytics: {
                key: 'predictive_analytics',
                name: 'Predictive Analytics',
                description: 'Predictive insights and trend analysis',
                enabled: true,
                rollout: 60, // Advanced feature, gradual rollout
                version: '1.0.0',
                environment: 'production',
                targetSegments: ['enterprise', 'beta_users'],
                conditions: {
                    userTier: ['enterprise'],
                    dataHistory: 'sufficient',
                    systemLoad: 'normal'
                },
                fallback: {
                    enabled: true,
                    strategy: 'historical_analysis',
                    gracefulDegradation: true
                },
                monitoring: {
                    trackAccuracy: true,
                    trackUsage: true,
                    alertOnFailure: true
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        };

        // User segments for targeting
        this.userSegments = {
            all: {
                name: 'All Users',
                criteria: {},
                priority: 1
            },
            free: {
                name: 'Free Tier Users',
                criteria: { tier: 'free' },
                priority: 2
            },
            premium: {
                name: 'Premium Users',
                criteria: { tier: 'premium' },
                priority: 3
            },
            enterprise: {
                name: 'Enterprise Users',
                criteria: { tier: 'enterprise' },
                priority: 4
            },
            beta_users: {
                name: 'Beta Users',
                criteria: { betaUser: true },
                priority: 5
            },
            power_users: {
                name: 'Power Users',
                criteria: { requestsPerDay: { $gte: 100 } },
                priority: 4
            },
            high_engagement: {
                name: 'High Engagement Users',
                criteria: { sessionsPerWeek: { $gte: 5 } },
                priority: 3
            }
        };

        // Rollout strategies
        this.rolloutStrategies = {
            percentage: {
                name: 'Percentage Rollout',
                description: 'Roll out to percentage of users based on user ID hash'
            },
            segment: {
                name: 'Segment Rollout',
                description: 'Roll out to specific user segments'
            },
            conditional: {
                name: 'Conditional Rollout',
                description: 'Roll out based on user conditions and system state'
            },
            canary: {
                name: 'Canary Rollout',
                description: 'Roll out to small percentage first, then increase'
            }
        };

        // Environment-specific overrides
        this.environmentOverrides = {
            development: {
                default_rollout: 100,
                override_conditions: false,
                enable_all_features: true
            },
            staging: {
                default_rollout: 100,
                override_conditions: false,
                enable_testing_features: true
            },
            production: {
                default_rollout: null, // Use configured rollout
                override_conditions: true,
                enable_monitoring: true
            }
        };
    }

    // Check if feature is enabled for user
    isFeatureEnabled(featureKey, userContext = {}) {
        const flag = this.flags[featureKey];
        if (!flag) return false;

        // Check if feature is globally enabled
        if (!flag.enabled) return false;

        // Check environment overrides
        const env = process.env.NODE_ENV || 'development';
        const envOverride = this.environmentOverrides[env];

        if (envOverride && envOverride.enable_all_features && env !== 'production') {
            return true;
        }

        // Check rollout percentage
        if (!this.isUserInRollout(flag.rollout, userContext)) {
            return false;
        }

        // Check user segment targeting
        if (!this.isUserInTargetSegment(flag.targetSegments, userContext)) {
            return false;
        }

        // Check feature conditions
        if (!this.checkFeatureConditions(flag.conditions, userContext)) {
            return false;
        }

        return true;
    }

    // Check if user is in rollout percentage
    isUserInRollout(rolloutPercentage, userContext) {
        if (rolloutPercentage >= 100) return true;
        if (rolloutPercentage <= 0) return false;

        // Use consistent hash based on user ID for stable rollout
        const userId = userContext.userId || userContext.sessionId || 'anonymous';
        const hash = this.hashString(userId.toString());
        const userPercentile = hash % 100;

        return userPercentile < rolloutPercentage;
    }

    // Check if user is in target segment
    isUserInTargetSegment(targetSegments, userContext) {
        if (!targetSegments || targetSegments.includes('all')) return true;

        return targetSegments.some(segment => {
            const segmentConfig = this.userSegments[segment];
            if (!segmentConfig) return false;

            return this.matchesCriteria(userContext, segmentConfig.criteria);
        });
    }

    // Check feature conditions
    checkFeatureConditions(conditions, userContext) {
        if (!conditions || Object.keys(conditions).length === 0) return true;

        return Object.entries(conditions).every(([key, value]) => {
            switch (key) {
                case 'userTier':
                    return value.includes(userContext.tier);
                case 'userStatus':
                    return value.includes(userContext.status || 'active');
                case 'minVersion':
                    return this.versionCompare(userContext.version || '1.0.0', value) >= 0;
                case 'hasBusinessData':
                    return !!userContext.businessData;
                case 'hasCompletedClassification':
                    return !!userContext.completedClassification;
                case 'systemHealth':
                    return this.getSystemHealth() === value;
                case 'systemLoad':
                    return this.getSystemLoad() === value;
                case 'dataHistory':
                    return userContext.dataHistory === value;
                default:
                    return userContext[key] === value;
            }
        });
    }

    // Get feature flag for user
    getFeatureFlag(featureKey, userContext = {}) {
        const flag = this.flags[featureKey];
        if (!flag) return null;

        return {
            key: flag.key,
            name: flag.name,
            enabled: this.isFeatureEnabled(featureKey, userContext),
            rollout: flag.rollout,
            version: flag.version,
            fallbackEnabled: flag.fallback?.enabled || false,
            fallbackStrategy: flag.fallback?.strategy
        };
    }

    // Get all feature flags for user
    getAllFeatureFlags(userContext = {}) {
        const flags = {};

        Object.keys(this.flags).forEach(key => {
            flags[key] = this.getFeatureFlag(key, userContext);
        });

        return flags;
    }

    // Update feature flag
    updateFeatureFlag(featureKey, updates) {
        if (!this.flags[featureKey]) {
            throw new Error(`Feature flag '${featureKey}' not found`);
        }

        const flag = this.flags[featureKey];
        Object.assign(flag, updates, { updatedAt: Date.now() });

        // Validate rollout percentage
        if (updates.rollout !== undefined) {
            flag.rollout = Math.max(0, Math.min(100, updates.rollout));
        }

        return flag;
    }

    // Create new feature flag
    createFeatureFlag(config) {
        const flag = {
            key: config.key,
            name: config.name,
            description: config.description || '',
            enabled: config.enabled || false,
            rollout: Math.max(0, Math.min(100, config.rollout || 0)),
            version: config.version || '1.0.0',
            environment: config.environment || 'development',
            targetSegments: config.targetSegments || ['all'],
            conditions: config.conditions || {},
            fallback: config.fallback || { enabled: false },
            monitoring: config.monitoring || { trackUsage: true },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.flags[config.key] = flag;
        return flag;
    }

    // Delete feature flag
    deleteFeatureFlag(featureKey) {
        if (!this.flags[featureKey]) {
            throw new Error(`Feature flag '${featureKey}' not found`);
        }

        const flag = this.flags[featureKey];
        delete this.flags[featureKey];
        return flag;
    }

    // Get feature usage statistics
    getFeatureStats(featureKey) {
        const flag = this.flags[featureKey];
        if (!flag) return null;

        // In production, this would integrate with monitoring system
        return {
            key: featureKey,
            name: flag.name,
            enabled: flag.enabled,
            rollout: flag.rollout,
            estimatedUsers: this.estimateAffectedUsers(flag),
            monitoring: flag.monitoring,
            lastUpdated: flag.updatedAt
        };
    }

    // Estimate affected users (mock calculation)
    estimateAffectedUsers(flag) {
        const totalUsers = 10000; // This would come from user analytics
        let affected = Math.floor(totalUsers * (flag.rollout / 100));

        // Adjust for segment targeting
        if (!flag.targetSegments.includes('all')) {
            affected = Math.floor(affected * 0.6); // Rough segment adjustment
        }

        return affected;
    }

    // Utility methods
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    versionCompare(version1, version2) {
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;

            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        return 0;
    }

    matchesCriteria(userContext, criteria) {
        return Object.entries(criteria).every(([key, value]) => {
            if (typeof value === 'object' && value.$gte !== undefined) {
                return userContext[key] >= value.$gte;
            }
            return userContext[key] === value;
        });
    }

    getSystemHealth() {
        // In production, this would check actual system health
        return 'healthy';
    }

    getSystemLoad() {
        // In production, this would check actual system load
        return 'normal';
    }

    // Export configuration
    exportConfig() {
        return {
            flags: this.flags,
            userSegments: this.userSegments,
            rolloutStrategies: this.rolloutStrategies,
            environmentOverrides: this.environmentOverrides,
            exportedAt: Date.now()
        };
    }

    // Validate configuration
    validateConfig() {
        const errors = [];

        Object.entries(this.flags).forEach(([key, flag]) => {
            if (!flag.key || !flag.name) {
                errors.push(`Flag ${key} missing required fields`);
            }

            if (flag.rollout < 0 || flag.rollout > 100) {
                errors.push(`Flag ${key} has invalid rollout percentage`);
            }

            if (flag.targetSegments) {
                flag.targetSegments.forEach(segment => {
                    if (!this.userSegments[segment] && segment !== 'all') {
                        errors.push(`Flag ${key} references unknown segment: ${segment}`);
                    }
                });
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Get configuration summary
    getConfigSummary() {
        const totalFlags = Object.keys(this.flags).length;
        const enabledFlags = Object.values(this.flags).filter(f => f.enabled).length;
        const productionFlags = Object.values(this.flags).filter(f => f.environment === 'production').length;

        const rolloutDistribution = {
            full: 0,      // 100%
            high: 0,      // 80-99%
            medium: 0,    // 50-79%
            low: 0,       // 1-49%
            disabled: 0   // 0%
        };

        Object.values(this.flags).forEach(flag => {
            if (!flag.enabled || flag.rollout === 0) rolloutDistribution.disabled++;
            else if (flag.rollout === 100) rolloutDistribution.full++;
            else if (flag.rollout >= 80) rolloutDistribution.high++;
            else if (flag.rollout >= 50) rolloutDistribution.medium++;
            else rolloutDistribution.low++;
        });

        return {
            totalFlags,
            enabledFlags,
            productionFlags,
            rolloutDistribution,
            userSegments: Object.keys(this.userSegments).length,
            lastUpdated: Math.max(...Object.values(this.flags).map(f => f.updatedAt))
        };
    }
}

module.exports = ProductionFeatureFlagsConfig;