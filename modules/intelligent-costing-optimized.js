/**
 * Production-Optimized Intelligent Costing System
 * High-performance version with caching, lazy loading, and advanced monitoring
 */

const OptimizedAlgorithms = require('./performance/optimized-algorithms');
const CacheManager = require('./performance/cache-manager');
const LazyLoader = require('./performance/lazy-loader');

class IntelligentCostingOptimized {
    constructor(options = {}) {
        this.enableLogging = options.enableLogging !== false;

        // Initialize performance components
        this.algorithms = new OptimizedAlgorithms({
            cache: {
                maxMemorySize: options.cacheSize || 50 * 1024 * 1024, // 50MB
                defaultTTL: options.cacheTTL || 30 * 60 * 1000, // 30 minutes
                enableMetrics: true
            }
        });

        this.lazyLoader = new LazyLoader({
            batchSize: options.batchSize || 3,
            prefetchDelay: options.prefetchDelay || 2000,
            maxConcurrentLoads: options.maxConcurrent || 5,
            enablePrefetch: options.enablePrefetch !== false
        });

        // Session management
        this.sessions = new Map();
        this.sessionTTL = options.sessionTTL || 60 * 60 * 1000; // 1 hour

        // Performance metrics
        this.metrics = {
            classificationsPerformed: 0,
            validationsPerformed: 0,
            recommendationsGenerated: 0,
            totalProcessingTime: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };

        // Industry expertise configurations (optimized for quick lookup)
        this.industryExpertise = this.initializeIndustryExpertise();

        this.startSessionCleanup();

        console.log('🚀 Intelligent Costing System (Production Optimized) initialized');
    }

    // ==================== OPTIMIZED BUSINESS CLASSIFICATION ====================

    async processBusinessInfo(businessInfo, sessionId) {
        const startTime = process.hrtime.bigint();

        try {
            // Use optimized classification algorithm with caching
            const classification = await this.algorithms.classifyBusinessOptimized(businessInfo);

            // Update session with classification result
            const session = this.getOrCreateSession(sessionId);
            session.businessClassification = classification;
            session.lastActivity = Date.now();

            // Track metrics
            this.metrics.classificationsPerformed++;
            this.recordProcessingTime(startTime);

            // Lazy load related industry insights
            this.lazyLoader.lazyLoadBusinessInsights(classification.industry, {
                confidence: classification.confidence,
                businessType: classification.businessType
            }).then(insights => {
                session.industryInsights = insights;
            }).catch(error => {
                console.warn('Industry insights loading failed:', error.message);
            });

            if (this.enableLogging) {
                console.log(`🏢 Business classified as: ${classification.industry} (${classification.confidence}% confidence)`);
            }

            return classification;

        } catch (error) {
            console.error('Business classification error:', error);
            this.recordProcessingTime(startTime);

            // Return fallback classification
            return {
                industry: 'general',
                confidence: 0.0,
                businessType: 'general',
                fallback: true,
                error: error.message
            };
        }
    }

    // ==================== OPTIMIZED COST VALIDATION ====================

    async validateCostInput(category, value, sessionId) {
        const startTime = process.hrtime.bigint();

        try {
            const session = this.getSession(sessionId);
            const businessType = session?.businessClassification?.industry || 'general';

            // Use optimized validation algorithm with caching
            const validation = await this.algorithms.validateCostOptimized(category, value, businessType);

            // Update session with validation result
            if (session) {
                if (!session.costValidations) {
                    session.costValidations = {};
                }
                session.costValidations[category] = validation;
                session.lastActivity = Date.now();
            }

            // Track metrics
            this.metrics.validationsPerformed++;
            this.recordProcessingTime(startTime);

            if (this.enableLogging) {
                console.log(`💰 Cost validation for ${category}: ${validation.type}`);
            }

            return validation;

        } catch (error) {
            console.error('Cost validation error:', error);
            this.recordProcessingTime(startTime);

            return {
                type: 'error',
                message: 'Validación no disponible',
                suggestion: 'Intenta nuevamente o verifica el valor ingresado',
                error: error.message,
                fallback: true
            };
        }
    }

    // ==================== OPTIMIZED RECOMMENDATIONS SYSTEM ====================

    async generateIntelligentRecommendations(sessionId, analysisData = {}, priority = 'normal') {
        const startTime = process.hrtime.bigint();

        try {
            const session = this.getSession(sessionId);
            const businessType = session?.businessClassification?.industry || 'general';

            // Enhanced analysis data with session context
            const enhancedAnalysisData = {
                ...analysisData,
                businessType,
                sessionData: session ? {
                    hasClassification: !!session.businessClassification,
                    validationCount: session.costValidations ? Object.keys(session.costValidations).length : 0,
                    confidence: session.businessClassification?.confidence || 0
                } : null
            };

            // Use lazy loading for recommendations
            const result = await this.lazyLoader.lazyLoadRecommendations(businessType, enhancedAnalysisData, priority);

            // Update session
            if (session) {
                session.recommendations = result.data;
                session.lastActivity = Date.now();
            }

            // Track metrics
            this.metrics.recommendationsGenerated++;
            this.recordProcessingTime(startTime);

            if (this.enableLogging) {
                console.log(`💡 Generated ${result.data?.length || 0} recommendations for ${businessType}`);
            }

            return result.data || [];

        } catch (error) {
            console.error('Recommendations generation error:', error);
            this.recordProcessingTime(startTime);

            return [{
                text: 'Mantén un registro detallado de todos tus ingresos y gastos',
                priority: 'high',
                impact: 'Base fundamental para cualquier análisis financiero',
                category: 'financial_management',
                fallback: true
            }];
        }
    }

    // ==================== ENHANCED BUSINESS INSIGHTS ====================

    async getBusinessInsights(sessionId, contextData = {}) {
        try {
            const session = this.getSession(sessionId);
            const businessType = session?.businessClassification?.industry || 'general';

            // Check if insights are already loaded in session
            if (session?.industryInsights && !this.isInsightsStale(session.industryInsights)) {
                return session.industryInsights.data;
            }

            // Use lazy loader for insights
            const result = await this.lazyLoader.lazyLoadBusinessInsights(businessType, {
                ...contextData,
                confidence: session?.businessClassification?.confidence || 0,
                validations: session?.costValidations || {}
            });

            // Update session
            if (session) {
                session.industryInsights = result;
                session.lastActivity = Date.now();
            }

            return result.data;

        } catch (error) {
            console.error('Business insights error:', error);

            return {
                message: 'Insights no disponibles temporalmente',
                fallback: true,
                error: error.message
            };
        }
    }

    // ==================== PERFORMANCE-OPTIMIZED SESSION MANAGEMENT ====================

    getOrCreateSession(sessionId) {
        let session = this.sessions.get(sessionId);

        if (!session) {
            session = {
                id: sessionId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                businessClassification: null,
                costValidations: {},
                recommendations: [],
                industryInsights: null,
                analysisState: 'initialized'
            };

            this.sessions.set(sessionId, session);

            if (this.enableLogging) {
                console.log(`📝 New session created: ${sessionId}`);
            }
        } else {
            session.lastActivity = Date.now();
        }

        return session;
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);

        if (session && this.isSessionValid(session)) {
            session.lastActivity = Date.now();
            return session;
        }

        if (session) {
            this.sessions.delete(sessionId);
        }

        return null;
    }

    updateSession(sessionId, data) {
        const session = this.getSession(sessionId);

        if (session) {
            Object.assign(session, data);
            session.lastActivity = Date.now();
            return session;
        }

        return null;
    }

    cleanupSession(sessionId) {
        const deleted = this.sessions.delete(sessionId);

        if (deleted && this.enableLogging) {
            console.log(`🗑️ Session cleaned up: ${sessionId}`);
        }

        return deleted;
    }

    isSessionValid(session) {
        return (Date.now() - session.lastActivity) < this.sessionTTL;
    }

    isInsightsStale(insights) {
        if (!insights || !insights.metadata) return true;

        const age = Date.now() - new Date(insights.metadata.timestamp).getTime();
        return age > 10 * 60 * 1000; // 10 minutes
    }

    // ==================== BATCH OPERATIONS FOR PERFORMANCE ====================

    async batchValidateCosts(costData, sessionId) {
        const startTime = process.hrtime.bigint();

        try {
            const validationPromises = Object.entries(costData).map(async ([category, value]) => {
                const validation = await this.validateCostInput(category, value, sessionId);
                return { category, validation };
            });

            const results = await Promise.all(validationPromises);
            const validationsMap = {};

            results.forEach(({ category, validation }) => {
                validationsMap[category] = validation;
            });

            this.recordProcessingTime(startTime);

            if (this.enableLogging) {
                console.log(`⚡ Batch validated ${results.length} cost categories`);
            }

            return validationsMap;

        } catch (error) {
            console.error('Batch validation error:', error);
            this.recordProcessingTime(startTime);

            return Object.keys(costData).reduce((acc, category) => {
                acc[category] = {
                    type: 'error',
                    message: 'Error en validación por lotes',
                    fallback: true
                };
                return acc;
            }, {});
        }
    }

    // ==================== ADVANCED ANALYSIS CAPABILITIES ====================

    async performComprehensiveAnalysis(sessionId, businessData) {
        const startTime = process.hrtime.bigint();

        try {
            const session = this.getOrCreateSession(sessionId);

            // Step 1: Business classification (if not done)
            if (!session.businessClassification) {
                session.businessClassification = await this.processBusinessInfo(businessData.businessInfo || {}, sessionId);
            }

            // Step 2: Batch cost validation
            const costValidations = await this.batchValidateCosts(businessData.costs || {}, sessionId);

            // Step 3: Generate insights
            const insights = await this.getBusinessInsights(sessionId, {
                costs: businessData.costs,
                revenue: businessData.revenue
            });

            // Step 4: Calculate key metrics
            const metrics = this.calculateBusinessMetrics(businessData);

            // Step 5: Generate recommendations (high priority)
            const recommendations = await this.generateIntelligentRecommendations(sessionId, {
                ...metrics,
                costValidations,
                businessType: session.businessClassification.industry
            }, 'high');

            // Update session with comprehensive results
            session.analysisState = 'completed';
            session.comprehensiveAnalysis = {
                timestamp: new Date().toISOString(),
                businessClassification: session.businessClassification,
                costValidations,
                insights,
                metrics,
                recommendations
            };

            this.recordProcessingTime(startTime);

            if (this.enableLogging) {
                console.log(`🎯 Comprehensive analysis completed for ${session.businessClassification.industry}`);
            }

            return session.comprehensiveAnalysis;

        } catch (error) {
            console.error('Comprehensive analysis error:', error);
            this.recordProcessingTime(startTime);

            return {
                error: error.message,
                fallback: true,
                timestamp: new Date().toISOString()
            };
        }
    }

    calculateBusinessMetrics(businessData) {
        const { costs = {}, revenue = 0 } = businessData;

        const totalCosts = Object.values(costs).reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0);
        const margin = revenue > 0 ? (revenue - totalCosts) / revenue : 0;
        const breakEvenPoint = margin > 0 ? Math.ceil(totalCosts / (revenue * margin)) : Infinity;

        return {
            totalCosts,
            totalRevenue: revenue,
            margin,
            profit: revenue - totalCosts,
            breakEvenPoint: Math.min(breakEvenPoint, 9999), // Cap for reasonable display
            costBreakdown: costs
        };
    }

    // ==================== PERFORMANCE MONITORING ====================

    recordProcessingTime(startTime) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        this.metrics.totalProcessingTime += duration;

        // Calculate rolling average
        const totalOperations = this.metrics.classificationsPerformed +
                               this.metrics.validationsPerformed +
                               this.metrics.recommendationsGenerated;

        this.metrics.averageResponseTime = this.metrics.totalProcessingTime / Math.max(1, totalOperations);
    }

    getPerformanceMetrics() {
        const algorithmsMetrics = this.algorithms.getPerformanceMetrics();
        const lazyLoaderMetrics = this.lazyLoader.getPerformanceMetrics();

        return {
            system: {
                classificationsPerformed: this.metrics.classificationsPerformed,
                validationsPerformed: this.metrics.validationsPerformed,
                recommendationsGenerated: this.metrics.recommendationsGenerated,
                averageResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms',
                activeSessions: this.sessions.size
            },
            algorithms: algorithmsMetrics,
            lazyLoader: lazyLoaderMetrics,
            sessions: {
                active: this.sessions.size,
                totalCreated: this.metrics.classificationsPerformed // Approximation
            }
        };
    }

    getHealthStatus() {
        const algorithmsHealth = this.algorithms.getPerformanceMetrics();
        const lazyLoaderHealth = this.lazyLoader.getHealthStatus();

        const avgResponseTime = this.metrics.averageResponseTime;
        const isHealthy = avgResponseTime < 200 && this.sessions.size < 1000;

        return {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            metrics: this.getPerformanceMetrics(),
            components: {
                algorithms: {
                    status: algorithmHealth?.total?.cacheMetrics?.performance?.hitRate > '50%' ? 'healthy' : 'degraded'
                },
                lazyLoader: lazyLoaderHealth,
                sessions: {
                    status: this.sessions.size < 1000 ? 'healthy' : 'overloaded',
                    count: this.sessions.size
                }
            },
            recommendations: this.getOptimizationRecommendations(avgResponseTime)
        };
    }

    getOptimizationRecommendations(avgResponseTime) {
        const recommendations = [];

        if (avgResponseTime > 500) {
            recommendations.push('High average response time detected - consider reducing cache TTL or increasing memory');
        }

        if (this.sessions.size > 800) {
            recommendations.push('High session count - consider reducing session TTL or implementing session cleanup');
        }

        const algorithmsMetrics = this.algorithms.getPerformanceMetrics();
        const cacheHitRate = parseFloat(algorithmsMetrics.total?.cacheMetrics?.performance?.hitRate || '0%');

        if (cacheHitRate < 30) {
            recommendations.push('Low cache hit rate - consider cache warming or TTL optimization');
        }

        return recommendations;
    }

    // ==================== INITIALIZATION AND UTILITIES ====================

    initializeIndustryExpertise() {
        return {
            restaurante: {
                keyMetrics: ['food_cost_percentage', 'labor_cost_percentage', 'table_turnover'],
                benchmarks: { foodCost: 0.28, laborCost: 0.32, overhead: 0.25 },
                seasonality: 'high',
                recommendations: [
                    'Monitor food waste carefully',
                    'Optimize menu pricing based on actual costs',
                    'Consider delivery partnerships'
                ]
            },
            tecnologia: {
                keyMetrics: ['burn_rate', 'customer_acquisition_cost', 'monthly_recurring_revenue'],
                benchmarks: { development: 0.40, sales: 0.25, overhead: 0.20 },
                seasonality: 'low',
                recommendations: [
                    'Focus on recurring revenue models',
                    'Invest in automation for scalability',
                    'Monitor customer lifetime value'
                ]
            },
            retail: {
                keyMetrics: ['inventory_turnover', 'gross_margin', 'sales_per_square_foot'],
                benchmarks: { inventory: 0.45, labor: 0.15, overhead: 0.25 },
                seasonality: 'medium',
                recommendations: [
                    'Optimize inventory management',
                    'Focus on high-margin products',
                    'Consider omnichannel strategies'
                ]
            },
            belleza: {
                keyMetrics: ['service_utilization', 'average_ticket', 'retention_rate'],
                benchmarks: { products: 0.25, labor: 0.35, overhead: 0.20 },
                seasonality: 'medium',
                recommendations: [
                    'Offer package deals to increase ticket size',
                    'Focus on client retention programs',
                    'Consider retail product sales'
                ]
            },
            servicios: {
                keyMetrics: ['utilization_rate', 'hourly_rate', 'project_margin'],
                benchmarks: { labor: 0.45, tools: 0.10, overhead: 0.25 },
                seasonality: 'low',
                recommendations: [
                    'Track and improve utilization rates',
                    'Consider value-based pricing',
                    'Develop recurring service contracts'
                ]
            }
        };
    }

    startSessionCleanup() {
        // Clean up expired sessions every 15 minutes
        setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [sessionId, session] of this.sessions.entries()) {
                if (!this.isSessionValid(session)) {
                    this.sessions.delete(sessionId);
                    cleaned++;
                }
            }

            if (cleaned > 0 && this.enableLogging) {
                console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
            }
        }, 15 * 60 * 1000);
    }

    // ==================== CACHE MANAGEMENT ====================

    async warmupCache() {
        console.log('🔥 Warming up caches...');

        // Warm up algorithm caches
        await this.algorithms.optimizeCache();

        // Warm up lazy loader caches
        await this.lazyLoader.warmupCache();

        console.log('✅ Cache warmup completed');
    }

    async clearCaches() {
        await this.algorithms.cache.clear();
        await this.lazyLoader.clearCache();

        console.log('🗑️ All caches cleared');
    }

    resetMetrics() {
        this.metrics = {
            classificationsPerformed: 0,
            validationsPerformed: 0,
            recommendationsGenerated: 0,
            totalProcessingTime: 0,
            cacheHits: 0,
            averageResponseTime: 0
        };

        this.algorithms.resetPerformanceMetrics();
        console.log('📊 Performance metrics reset');
    }
}

module.exports = IntelligentCostingOptimized;