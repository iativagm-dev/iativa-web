/**
 * Feature Flags Management Routes
 * API endpoints for managing feature flags in production
 */

const express = require('express');
const router = express.Router();
const FeatureFlagsMiddleware = require('../middleware/feature-flags');

// Initialize feature flags middleware
const featureFlagsMiddleware = new FeatureFlagsMiddleware({
    enableLogging: true,
    enableMetrics: true,
    cacheTimeout: 60000 // 1 minute
});

// Apply feature flags middleware to all routes
router.use(featureFlagsMiddleware.middleware());

// ==================== PUBLIC ENDPOINTS ====================

// Get feature flags for current user
router.get('/flags', (req, res) => {
    try {
        const flags = req.featureFlags.getAllFlags();

        // Add response headers
        res.setFeatureFlagHeaders();

        res.json({
            success: true,
            flags: flags,
            userContext: {
                userId: req.featureFlags.userContext.userId,
                tier: req.featureFlags.userContext.tier,
                betaUser: req.featureFlags.userContext.betaUser
            },
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error getting feature flags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve feature flags',
            flags: {} // Return empty flags as fallback
        });
    }
});

// Check specific feature flag
router.get('/flags/:featureKey', (req, res) => {
    try {
        const { featureKey } = req.params;
        const flag = req.featureFlags.getFlag(featureKey);

        if (!flag) {
            return res.status(404).json({
                success: false,
                error: `Feature flag '${featureKey}' not found`,
                enabled: false
            });
        }

        res.json({
            success: true,
            flag: flag,
            enabled: flag.enabled,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error checking feature flag:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check feature flag',
            enabled: false
        });
    }
});

// ==================== ADMIN ENDPOINTS ====================

// Admin middleware - require admin access
const requireAdmin = (req, res, next) => {
    const user = req.user || {};
    if (!user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

// Get all feature flag configurations (Admin only)
router.get('/admin/flags', requireAdmin, (req, res) => {
    try {
        const flagsConfig = featureFlagsMiddleware.getFeatureConfig();
        const summary = flagsConfig.getConfigSummary();
        const validation = flagsConfig.validateConfig();

        res.json({
            success: true,
            flags: flagsConfig.flags,
            summary: summary,
            validation: validation,
            userSegments: flagsConfig.userSegments,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error getting admin flags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve flag configuration'
        });
    }
});

// Update feature flag (Admin only)
router.put('/admin/flags/:featureKey', requireAdmin, (req, res) => {
    try {
        const { featureKey } = req.params;
        const updates = req.body;

        // Validate updates
        if (updates.rollout !== undefined) {
            if (updates.rollout < 0 || updates.rollout > 100) {
                return res.status(400).json({
                    success: false,
                    error: 'Rollout percentage must be between 0 and 100'
                });
            }
        }

        const updatedFlag = featureFlagsMiddleware.updateFeatureFlag(featureKey, updates);

        // Log the change
        console.log(`Feature flag '${featureKey}' updated by admin:`, updates);

        res.json({
            success: true,
            flag: updatedFlag,
            message: `Feature flag '${featureKey}' updated successfully`,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error updating feature flag:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to update feature flag'
        });
    }
});

// Create new feature flag (Admin only)
router.post('/admin/flags', requireAdmin, (req, res) => {
    try {
        const flagConfig = req.body;

        // Validate required fields
        if (!flagConfig.key || !flagConfig.name) {
            return res.status(400).json({
                success: false,
                error: 'Feature flag key and name are required'
            });
        }

        const flagsConfig = featureFlagsMiddleware.getFeatureConfig();
        const newFlag = flagsConfig.createFeatureFlag(flagConfig);

        console.log(`New feature flag '${flagConfig.key}' created by admin`);

        res.status(201).json({
            success: true,
            flag: newFlag,
            message: `Feature flag '${flagConfig.key}' created successfully`,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error creating feature flag:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create feature flag'
        });
    }
});

// Delete feature flag (Admin only)
router.delete('/admin/flags/:featureKey', requireAdmin, (req, res) => {
    try {
        const { featureKey } = req.params;

        const flagsConfig = featureFlagsMiddleware.getFeatureConfig();
        const deletedFlag = flagsConfig.deleteFeatureFlag(featureKey);

        // Clear related cache
        featureFlagsMiddleware.clearFeatureCache(featureKey);

        console.log(`Feature flag '${featureKey}' deleted by admin`);

        res.json({
            success: true,
            deletedFlag: deletedFlag,
            message: `Feature flag '${featureKey}' deleted successfully`,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error deleting feature flag:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to delete feature flag'
        });
    }
});

// Get feature flag statistics (Admin only)
router.get('/admin/metrics', requireAdmin, (req, res) => {
    try {
        const metrics = featureFlagsMiddleware.getMetrics();
        const flagsConfig = featureFlagsMiddleware.getFeatureConfig();

        // Get stats for each flag
        const flagStats = {};
        Object.keys(flagsConfig.flags).forEach(key => {
            flagStats[key] = flagsConfig.getFeatureStats(key);
        });

        res.json({
            success: true,
            metrics: metrics,
            flagStats: flagStats,
            healthCheck: featureFlagsMiddleware.healthCheck(),
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error getting feature flag metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});

// Clear metrics cache (Admin only)
router.delete('/admin/metrics', requireAdmin, (req, res) => {
    try {
        featureFlagsMiddleware.clearMetrics();

        res.json({
            success: true,
            message: 'Feature flag metrics cleared successfully',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error clearing metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear metrics'
        });
    }
});

// Clear evaluation cache (Admin only)
router.delete('/admin/cache', requireAdmin, (req, res) => {
    try {
        featureFlagsMiddleware.clearCache();

        res.json({
            success: true,
            message: 'Feature flag cache cleared successfully',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear cache'
        });
    }
});

// Gradual rollout endpoint (Admin only)
router.post('/admin/flags/:featureKey/rollout', requireAdmin, (req, res) => {
    try {
        const { featureKey } = req.params;
        const { targetRollout, incrementStep = 10, intervalMinutes = 30 } = req.body;

        const flagsConfig = featureFlagsMiddleware.getFeatureConfig();
        const currentFlag = flagsConfig.flags[featureKey];

        if (!currentFlag) {
            return res.status(404).json({
                success: false,
                error: `Feature flag '${featureKey}' not found`
            });
        }

        // Start gradual rollout
        const rolloutPlan = createRolloutPlan(
            currentFlag.rollout,
            targetRollout,
            incrementStep,
            intervalMinutes
        );

        // Execute rollout plan (in production, this would use a job queue)
        executeRolloutPlan(featureKey, rolloutPlan, featureFlagsMiddleware);

        res.json({
            success: true,
            message: `Gradual rollout initiated for '${featureKey}'`,
            rolloutPlan: rolloutPlan,
            currentRollout: currentFlag.rollout,
            targetRollout: targetRollout,
            estimatedDuration: rolloutPlan.length * intervalMinutes,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error starting gradual rollout:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start gradual rollout'
        });
    }
});

// ==================== UTILITY FUNCTIONS ====================

// Create gradual rollout plan
function createRolloutPlan(currentRollout, targetRollout, incrementStep, intervalMinutes) {
    const plan = [];
    let current = currentRollout;

    if (targetRollout > currentRollout) {
        // Incremental rollout
        while (current < targetRollout) {
            current = Math.min(current + incrementStep, targetRollout);
            plan.push({
                rollout: current,
                delay: intervalMinutes * 60 * 1000, // Convert to milliseconds
                direction: 'increase'
            });
        }
    } else {
        // Rollback
        while (current > targetRollout) {
            current = Math.max(current - incrementStep, targetRollout);
            plan.push({
                rollout: current,
                delay: intervalMinutes * 60 * 1000,
                direction: 'decrease'
            });
        }
    }

    return plan;
}

// Execute rollout plan
function executeRolloutPlan(featureKey, rolloutPlan, middleware) {
    let stepIndex = 0;

    function executeNextStep() {
        if (stepIndex >= rolloutPlan.length) {
            console.log(`Gradual rollout completed for '${featureKey}'`);
            return;
        }

        const step = rolloutPlan[stepIndex];

        setTimeout(() => {
            try {
                middleware.updateFeatureFlag(featureKey, { rollout: step.rollout });
                console.log(`Feature flag '${featureKey}' rollout updated to ${step.rollout}%`);

                stepIndex++;
                executeNextStep();

            } catch (error) {
                console.error(`Error executing rollout step for '${featureKey}':`, error);
            }
        }, step.delay);
    }

    // Start execution
    executeNextStep();
}

// ==================== HEALTH CHECK ====================

// Health check endpoint
router.get('/health', (req, res) => {
    try {
        const health = featureFlagsMiddleware.healthCheck();

        const statusCode = health.healthy ? 200 : 503;

        res.status(statusCode).json({
            service: 'feature-flags',
            healthy: health.healthy,
            details: health,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Feature flags health check failed:', error);
        res.status(503).json({
            service: 'feature-flags',
            healthy: false,
            error: 'Health check failed',
            timestamp: Date.now()
        });
    }
});

// Export middleware instance for use in other modules
module.exports = {
    router,
    featureFlagsMiddleware
};