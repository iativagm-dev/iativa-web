/**
 * Performance Monitoring and Optimization Routes
 * Provides endpoints for monitoring, metrics, and performance management
 */

const express = require('express');
const router = express.Router();

// Import performance modules
const CacheManager = require('../modules/performance/cache-manager');
const CompressionMiddleware = require('../modules/performance/compression-middleware');
const ResponseTimeMonitor = require('../modules/performance/response-time-monitor');
const IntelligentCostingOptimized = require('../modules/intelligent-costing-optimized');

// Initialize performance components
const cacheManager = new CacheManager({
    maxMemorySize: 100 * 1024 * 1024, // 100MB
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    enableMetrics: true
});

const compressionMiddleware = new CompressionMiddleware({
    threshold: 1024, // Compress responses > 1KB
    level: 6, // Balanced compression
    enableCache: true,
    enableQoS: true
});

const responseTimeMonitor = new ResponseTimeMonitor({
    warningThreshold: 300, // 300ms warning
    criticalThreshold: 1000, // 1000ms critical
    enableAlerts: true,
    enablePersistence: true
});

const optimizedCosting = new IntelligentCostingOptimized({
    enableLogging: true,
    cacheSize: 50 * 1024 * 1024, // 50MB cache
    enablePrefetch: true
});

// Apply compression middleware to all routes
router.use(compressionMiddleware.middleware());

// Apply response time monitoring to all routes
router.use(responseTimeMonitor.middleware());

// ==================== PERFORMANCE METRICS ENDPOINTS ====================

// Get comprehensive performance overview
router.get('/performance/overview', async (req, res) => {
    try {
        const overview = {
            timestamp: new Date().toISOString(),
            system: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            },
            cache: cacheManager.getMetrics(),
            compression: compressionMiddleware.getMetrics(),
            responseTime: responseTimeMonitor.getCurrentMetrics(),
            intelligentCosting: optimizedCosting.getPerformanceMetrics()
        };

        // Calculate overall health score
        const healthScores = [
            cacheManager.healthCheck().status === 'healthy' ? 100 : 50,
            compressionMiddleware.getHealthStatus().status === 'healthy' ? 100 : 50,
            responseTimeMonitor.getHealthStatus().status === 'healthy' ? 100 : 50,
            optimizedCosting.getHealthStatus().status === 'healthy' ? 100 : 50
        ];

        overview.system.healthScore = (healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length).toFixed(1);
        overview.system.status = overview.system.healthScore > 80 ? 'healthy' : overview.system.healthScore > 60 ? 'degraded' : 'unhealthy';

        res.json(overview);

    } catch (error) {
        console.error('Performance overview error:', error);
        res.status(500).json({
            error: 'Failed to get performance overview',
            timestamp: new Date().toISOString()
        });
    }
});

// Get detailed cache metrics
router.get('/performance/cache', (req, res) => {
    try {
        const metrics = cacheManager.getMetrics();
        const health = cacheManager.healthCheck();

        res.json({
            ...metrics,
            health,
            recommendations: health.recommendations
        });

    } catch (error) {
        console.error('Cache metrics error:', error);
        res.status(500).json({ error: 'Failed to get cache metrics' });
    }
});

// Get compression statistics
router.get('/performance/compression', (req, res) => {
    try {
        const metrics = compressionMiddleware.getMetrics();
        const health = compressionMiddleware.getHealthStatus();

        res.json({
            ...metrics,
            health,
            recommendations: health.recommendations
        });

    } catch (error) {
        console.error('Compression metrics error:', error);
        res.status(500).json({ error: 'Failed to get compression metrics' });
    }
});

// Get response time analytics
router.get('/performance/response-time', (req, res) => {
    try {
        const current = responseTimeMonitor.getCurrentMetrics();
        const routes = responseTimeMonitor.getRouteMetrics();
        const health = responseTimeMonitor.getHealthStatus();

        res.json({
            current,
            routes,
            health,
            recommendations: health.recommendations
        });

    } catch (error) {
        console.error('Response time metrics error:', error);
        res.status(500).json({ error: 'Failed to get response time metrics' });
    }
});

// Get historical performance data
router.get('/performance/history', (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 3600000; // Default 1 hour
        const historical = responseTimeMonitor.getHistoricalMetrics(timeRange);

        res.json(historical);

    } catch (error) {
        console.error('Historical metrics error:', error);
        res.status(500).json({ error: 'Failed to get historical metrics' });
    }
});

// Get intelligent costing performance
router.get('/performance/intelligent-costing', (req, res) => {
    try {
        const metrics = optimizedCosting.getPerformanceMetrics();
        const health = optimizedCosting.getHealthStatus();

        res.json({
            ...metrics,
            health,
            recommendations: health.recommendations
        });

    } catch (error) {
        console.error('Intelligent costing metrics error:', error);
        res.status(500).json({ error: 'Failed to get intelligent costing metrics' });
    }
});

// ==================== PERFORMANCE MANAGEMENT ENDPOINTS ====================

// Warm up caches
router.post('/performance/cache/warmup', async (req, res) => {
    try {
        await cacheManager.warmupCache();
        await optimizedCosting.warmupCache();

        res.json({
            success: true,
            message: 'Cache warmup completed',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache warmup error:', error);
        res.status(500).json({
            success: false,
            error: 'Cache warmup failed'
        });
    }
});

// Clear specific cache category
router.delete('/performance/cache/:category', async (req, res) => {
    try {
        const category = req.params.category;
        await cacheManager.clear(category);

        res.json({
            success: true,
            message: `Cache category '${category}' cleared`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({
            success: false,
            error: 'Cache clear failed'
        });
    }
});

// Clear all caches
router.delete('/performance/cache', async (req, res) => {
    try {
        await cacheManager.clear();
        await optimizedCosting.clearCaches();
        compressionMiddleware.clearCache();

        res.json({
            success: true,
            message: 'All caches cleared',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache clear all error:', error);
        res.status(500).json({
            success: false,
            error: 'Cache clear failed'
        });
    }
});

// Reset performance metrics
router.post('/performance/metrics/reset', (req, res) => {
    try {
        cacheManager.resetMetrics();
        compressionMiddleware.resetMetrics();
        responseTimeMonitor.resetMetrics();
        optimizedCosting.resetMetrics();

        res.json({
            success: true,
            message: 'Performance metrics reset',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Metrics reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Metrics reset failed'
        });
    }
});

// Update compression settings
router.post('/performance/compression/settings', (req, res) => {
    try {
        const { level, threshold, enableQoS } = req.body;

        if (level) compressionMiddleware.config.level = Math.max(1, Math.min(9, level));
        if (threshold) compressionMiddleware.config.threshold = Math.max(100, threshold);
        if (typeof enableQoS === 'boolean') compressionMiddleware.config.enableQoS = enableQoS;

        res.json({
            success: true,
            message: 'Compression settings updated',
            settings: {
                level: compressionMiddleware.config.level,
                threshold: compressionMiddleware.config.threshold,
                enableQoS: compressionMiddleware.config.enableQoS
            }
        });

    } catch (error) {
        console.error('Compression settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update compression settings'
        });
    }
});

// ==================== OPTIMIZED INTELLIGENT COSTING ENDPOINTS ====================

// Optimized business classification
router.post('/performance/classify-business', async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, businessInfo } = req.body;

        if (!sessionId || !businessInfo) {
            return res.status(400).json({
                error: 'sessionId and businessInfo are required'
            });
        }

        const classification = await optimizedCosting.processBusinessInfo(businessInfo, sessionId);

        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Cache-Status', classification.fallback ? 'miss' : 'processed');

        res.json({
            ...classification,
            metadata: {
                responseTime: `${responseTime}ms`,
                cached: false,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Optimized classification error:', error);
        const responseTime = Date.now() - startTime;

        res.status(500).json({
            error: 'Classification failed',
            details: error.message,
            responseTime: `${responseTime}ms`,
            fallback: true
        });
    }
});

// Optimized cost validation
router.post('/performance/validate-cost', async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, category, value } = req.body;

        if (!sessionId || !category || value === undefined) {
            return res.status(400).json({
                error: 'sessionId, category, and value are required'
            });
        }

        const validation = await optimizedCosting.validateCostInput(category, value, sessionId);

        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Cache-Status', validation.fallback ? 'miss' : 'processed');

        res.json({
            ...validation,
            metadata: {
                responseTime: `${responseTime}ms`,
                category,
                value,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Optimized validation error:', error);
        const responseTime = Date.now() - startTime;

        res.status(500).json({
            error: 'Validation failed',
            details: error.message,
            responseTime: `${responseTime}ms`,
            fallback: true
        });
    }
});

// Batch cost validation (optimized)
router.post('/performance/validate-costs-batch', async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, costs } = req.body;

        if (!sessionId || !costs || typeof costs !== 'object') {
            return res.status(400).json({
                error: 'sessionId and costs object are required'
            });
        }

        const validations = await optimizedCosting.batchValidateCosts(costs, sessionId);

        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Batch-Size', Object.keys(costs).length.toString());

        res.json({
            validations,
            metadata: {
                responseTime: `${responseTime}ms`,
                batchSize: Object.keys(costs).length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Optimized batch validation error:', error);
        const responseTime = Date.now() - startTime;

        res.status(500).json({
            error: 'Batch validation failed',
            details: error.message,
            responseTime: `${responseTime}ms`,
            fallback: true
        });
    }
});

// Optimized recommendations with lazy loading
router.post('/performance/recommendations', async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, analysisData, priority } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                error: 'sessionId is required'
            });
        }

        const recommendations = await optimizedCosting.generateIntelligentRecommendations(
            sessionId,
            analysisData || {},
            priority || 'normal'
        );

        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Lazy-Loaded', 'true');

        res.json({
            recommendations,
            metadata: {
                responseTime: `${responseTime}ms`,
                count: recommendations.length,
                priority: priority || 'normal',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Optimized recommendations error:', error);
        const responseTime = Date.now() - startTime;

        res.status(500).json({
            error: 'Recommendations failed',
            details: error.message,
            responseTime: `${responseTime}ms`,
            fallback: true
        });
    }
});

// Comprehensive business analysis (optimized)
router.post('/performance/comprehensive-analysis', async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, businessData } = req.body;

        if (!sessionId || !businessData) {
            return res.status(400).json({
                error: 'sessionId and businessData are required'
            });
        }

        const analysis = await optimizedCosting.performComprehensiveAnalysis(sessionId, businessData);

        const responseTime = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Analysis-Type', 'comprehensive');

        res.json({
            ...analysis,
            performance: {
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString(),
                optimized: true
            }
        });

    } catch (error) {
        console.error('Comprehensive analysis error:', error);
        const responseTime = Date.now() - startTime;

        res.status(500).json({
            error: 'Comprehensive analysis failed',
            details: error.message,
            responseTime: `${responseTime}ms`,
            fallback: true
        });
    }
});

// ==================== HEALTH CHECK ENDPOINTS ====================

// Comprehensive health check
router.get('/performance/health', (req, res) => {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            components: {
                cache: cacheManager.healthCheck(),
                compression: compressionMiddleware.getHealthStatus(),
                responseTime: responseTimeMonitor.getHealthStatus(),
                intelligentCosting: optimizedCosting.getHealthStatus()
            }
        };

        // Determine overall health
        const componentStates = Object.values(health.components).map(component => component.status);
        const unhealthyCount = componentStates.filter(state => state === 'unhealthy').length;
        const degradedCount = componentStates.filter(state => state === 'degraded').length;

        if (unhealthyCount > 0) {
            health.overall = 'unhealthy';
        } else if (degradedCount > 1) {
            health.overall = 'degraded';
        }

        const statusCode = health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 206 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            timestamp: new Date().toISOString(),
            overall: 'unhealthy',
            error: error.message
        });
    }
});

// Performance dashboard page
router.get('/performance/dashboard', (req, res) => {
    try {
        res.render('performance-dashboard', {
            title: 'Performance Dashboard - Sistema Optimizado',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Performance dashboard error:', error);
        res.status(500).json({
            error: 'Failed to load performance dashboard'
        });
    }
});

module.exports = router;