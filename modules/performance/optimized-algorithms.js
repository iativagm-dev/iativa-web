/**
 * Optimized Algorithms for Intelligent Costing System
 * High-performance cost validation, classification, and recommendation algorithms
 */

const CacheManager = require('./cache-manager');

class OptimizedAlgorithms {
    constructor(options = {}) {
        this.cache = new CacheManager(options.cache || {});

        // Pre-computed industry benchmarks for fast lookup
        this.industryBenchmarks = this.initializeBenchmarks();

        // Optimized validation rules
        this.validationRules = this.initializeValidationRules();

        // Business classification patterns (compiled for performance)
        this.classificationPatterns = this.compileClassificationPatterns();

        // Performance monitoring
        this.performanceMetrics = {
            classificationTimes: [],
            validationTimes: [],
            recommendationTimes: [],
            totalRequests: 0
        };

        console.log('⚡ Optimized Algorithms initialized with production caching');
    }

    // ==================== OPTIMIZED BUSINESS CLASSIFICATION ====================

    async classifyBusinessOptimized(businessInfo) {
        const startTime = process.hrtime.bigint();

        try {
            // Check cache first
            const cached = await this.cache.getCachedBusinessClassification(businessInfo);
            if (cached) {
                this.recordPerformance('classification', startTime, true);
                return cached;
            }

            // Fast classification using pre-compiled patterns
            const classification = this.performFastClassification(businessInfo);

            // Cache result
            await this.cache.cacheBusinessClassification(businessInfo, classification);

            this.recordPerformance('classification', startTime, false);
            return classification;

        } catch (error) {
            console.error('Classification error:', error);
            this.recordPerformance('classification', startTime, false);

            // Return fallback classification
            return {
                industry: 'general',
                confidence: 0.0,
                businessType: 'general',
                fallback: true
            };
        }
    }

    performFastClassification(businessInfo) {
        const text = this.normalizeBusinessText(businessInfo);
        const tokens = this.tokenizeText(text);

        let bestMatch = { industry: 'general', confidence: 0.0 };

        // Use pre-compiled patterns for O(1) average lookup
        for (const [industry, patterns] of Object.entries(this.classificationPatterns)) {
            const score = this.calculateIndustryScore(tokens, patterns);

            if (score > bestMatch.confidence) {
                bestMatch = {
                    industry,
                    confidence: score,
                    businessType: industry
                };
            }
        }

        // Boost confidence for exact matches
        if (bestMatch.confidence > 0.8) {
            bestMatch.confidence = Math.min(0.95, bestMatch.confidence * 1.1);
        }

        return bestMatch;
    }

    normalizeBusinessText(businessInfo) {
        const fields = [
            businessInfo.nombreNegocio || '',
            businessInfo.tipoNegocio || '',
            businessInfo.producto || '',
            businessInfo.descripcion || ''
        ];

        return fields
            .join(' ')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    tokenizeText(text) {
        return new Set(text.split(' ').filter(token => token.length > 2));
    }

    calculateIndustryScore(tokens, patterns) {
        let score = 0;
        let matchedTerms = 0;

        for (const token of tokens) {
            if (patterns.exact.has(token)) {
                score += patterns.exact.get(token);
                matchedTerms++;
            } else if (patterns.partial.has(token)) {
                score += patterns.partial.get(token);
                matchedTerms++;
            }
        }

        // Normalize score by number of tokens for better accuracy
        return matchedTerms > 0 ? Math.min(0.95, score / Math.max(tokens.size, 3)) : 0;
    }

    // ==================== OPTIMIZED COST VALIDATION ====================

    async validateCostOptimized(category, value, businessType) {
        const startTime = process.hrtime.bigint();

        try {
            // Check cache first
            const cached = await this.cache.getCachedCostValidation(category, value, businessType);
            if (cached) {
                this.recordPerformance('validation', startTime, true);
                return cached;
            }

            // Fast validation using pre-computed benchmarks
            const validation = this.performFastValidation(category, value, businessType);

            // Cache result
            await this.cache.cacheCostValidation(category, value, businessType, validation);

            this.recordPerformance('validation', startTime, false);
            return validation;

        } catch (error) {
            console.error('Validation error:', error);
            this.recordPerformance('validation', startTime, false);

            // Return safe fallback
            return {
                type: 'info',
                message: 'Validación no disponible temporalmente',
                suggestion: 'Revisa este costo manualmente',
                fallback: true
            };
        }
    }

    performFastValidation(category, value, businessType) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            return {
                type: 'error',
                message: 'Valor inválido para validación',
                suggestion: 'Ingresa un valor numérico positivo'
            };
        }

        // Get pre-computed benchmarks
        const benchmarks = this.industryBenchmarks[businessType]?.[category] ||
                          this.industryBenchmarks.general[category];

        if (!benchmarks) {
            return {
                type: 'info',
                message: 'Categoría de costo no reconocida',
                suggestion: 'Verifica que la categoría sea válida'
            };
        }

        // Fast range validation
        const deviation = this.calculateDeviation(numValue, benchmarks);

        if (deviation <= 0.15) {
            return {
                type: 'success',
                message: 'Costo dentro del rango esperado',
                suggestion: 'El costo está alineado with los benchmarks de la industria',
                benchmark: benchmarks,
                deviation: deviation
            };
        } else if (deviation <= 0.35) {
            return {
                type: 'warning',
                message: 'Costo ligeramente fuera del rango',
                suggestion: this.generateOptimizationSuggestion(category, numValue, benchmarks),
                benchmark: benchmarks,
                deviation: deviation
            };
        } else {
            return {
                type: 'error',
                message: 'Costo significativamente fuera del rango',
                suggestion: this.generateCriticalSuggestion(category, numValue, benchmarks),
                benchmark: benchmarks,
                deviation: deviation
            };
        }
    }

    calculateDeviation(value, benchmark) {
        const expected = (benchmark.min + benchmark.max) / 2;
        return Math.abs(value - expected) / expected;
    }

    generateOptimizationSuggestion(category, value, benchmark) {
        const expected = (benchmark.min + benchmark.max) / 2;

        const suggestions = {
            materiales: value > expected ?
                'Considera negociar mejores precios con proveedores' :
                'Verifica la calidad de los materiales con este precio',
            mano_obra: value > expected ?
                'Evalúa la productividad del equipo o considera capacitación' :
                'Asegúrate de cumplir con las regulaciones laborales',
            gastos_fijos: value > expected ?
                'Revisa contratos de servicios y busca optimizaciones' :
                'Verifica que no falten gastos fijos importantes',
            marketing: value > expected ?
                'Optimiza el ROI de tus campañas de marketing' :
                'Considera aumentar la inversión en marketing para crecimiento'
        };

        return suggestions[category] || 'Revisa este costo y compara con la competencia';
    }

    generateCriticalSuggestion(category, value, benchmark) {
        const expected = (benchmark.min + benchmark.max) / 2;

        return value > expected ?
            `Costo muy alto (${((value - expected) / expected * 100).toFixed(0)}% sobre promedio). Revisa proveedores y procesos.` :
            `Costo muy bajo (${((expected - value) / expected * 100).toFixed(0)}% bajo promedio). Verifica calidad y completitud.`;
    }

    // ==================== OPTIMIZED RECOMMENDATIONS ====================

    async generateRecommendationsOptimized(businessType, analysisData) {
        const startTime = process.hrtime.bigint();

        try {
            // Check cache first
            const cached = await this.cache.getCachedRecommendations(businessType, analysisData);
            if (cached) {
                this.recordPerformance('recommendation', startTime, true);
                return cached;
            }

            // Generate recommendations using optimized algorithm
            const recommendations = this.performFastRecommendationGeneration(businessType, analysisData);

            // Cache result
            await this.cache.cacheRecommendations(businessType, analysisData, recommendations);

            this.recordPerformance('recommendation', startTime, false);
            return recommendations;

        } catch (error) {
            console.error('Recommendation error:', error);
            this.recordPerformance('recommendation', startTime, false);

            // Return fallback recommendations
            return [{
                text: 'Mantén un control detallado de tus gastos y ingresos',
                priority: 'high',
                impact: 'Mejora la visibilidad financiera del negocio',
                fallback: true
            }];
        }
    }

    performFastRecommendationGeneration(businessType, analysisData) {
        const rules = this.validationRules[businessType] || this.validationRules.general;
        const recommendations = [];

        // Fast rule evaluation using pre-computed conditions
        for (const rule of rules) {
            if (this.evaluateRule(rule.condition, analysisData)) {
                recommendations.push({
                    text: rule.recommendation,
                    priority: rule.priority,
                    impact: rule.impact,
                    confidence: rule.confidence || 0.8
                });

                // Limit to top recommendations for performance
                if (recommendations.length >= 3) break;
            }
        }

        // Sort by priority and confidence
        return recommendations
            .sort((a, b) => {
                const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0) ||
                       (b.confidence || 0) - (a.confidence || 0);
            })
            .slice(0, 3);
    }

    evaluateRule(condition, data) {
        try {
            // Safe evaluation of pre-compiled conditions
            return condition(data);
        } catch {
            return false;
        }
    }

    // ==================== INITIALIZATION METHODS ====================

    initializeBenchmarks() {
        return {
            restaurante: {
                materiales: { min: 2000, max: 8000, avg: 4500 },
                mano_obra: { min: 3000, max: 12000, avg: 6500 },
                gastos_fijos: { min: 1500, max: 6000, avg: 3200 },
                marketing: { min: 500, max: 3000, avg: 1200 }
            },
            tecnologia: {
                materiales: { min: 500, max: 3000, avg: 1200 },
                mano_obra: { min: 5000, max: 25000, avg: 12000 },
                gastos_fijos: { min: 2000, max: 8000, avg: 4000 },
                marketing: { min: 1000, max: 8000, avg: 3500 }
            },
            retail: {
                materiales: { min: 5000, max: 25000, avg: 12000 },
                mano_obra: { min: 2000, max: 8000, avg: 4000 },
                gastos_fijos: { min: 2500, max: 10000, avg: 5000 },
                marketing: { min: 800, max: 5000, avg: 2000 }
            },
            belleza: {
                materiales: { min: 1000, max: 5000, avg: 2500 },
                mano_obra: { min: 2500, max: 10000, avg: 5000 },
                gastos_fijos: { min: 1200, max: 4000, avg: 2200 },
                marketing: { min: 600, max: 3000, avg: 1400 }
            },
            servicios: {
                materiales: { min: 300, max: 2000, avg: 800 },
                mano_obra: { min: 3000, max: 15000, avg: 7000 },
                gastos_fijos: { min: 800, max: 3500, avg: 1800 },
                marketing: { min: 500, max: 4000, avg: 1500 }
            },
            general: {
                materiales: { min: 1000, max: 10000, avg: 4000 },
                mano_obra: { min: 2500, max: 15000, avg: 6000 },
                gastos_fijos: { min: 1500, max: 6000, avg: 3000 },
                marketing: { min: 600, max: 4000, avg: 1800 }
            }
        };
    }

    compileClassificationPatterns() {
        const rawPatterns = {
            restaurante: {
                exact: { restaurante: 0.9, comida: 0.8, cocina: 0.7, chef: 0.8, menu: 0.7 },
                partial: { comedor: 0.5, servicio: 0.4, alimento: 0.6, bar: 0.6, cafe: 0.7 }
            },
            tecnologia: {
                exact: { tecnologia: 0.9, software: 0.8, desarrollo: 0.7, app: 0.8, web: 0.7 },
                partial: { digital: 0.5, sistema: 0.6, programa: 0.6, informatica: 0.7 }
            },
            retail: {
                exact: { tienda: 0.8, venta: 0.7, comercio: 0.8, retail: 0.9, almacen: 0.7 },
                partial: { producto: 0.5, inventario: 0.6, cliente: 0.4, mercancia: 0.6 }
            },
            belleza: {
                exact: { belleza: 0.9, salon: 0.8, estetica: 0.8, spa: 0.8, peluqueria: 0.8 },
                partial: { cuidado: 0.5, tratamiento: 0.6, cosmetico: 0.6, imagen: 0.5 }
            },
            servicios: {
                exact: { servicio: 0.7, consultoria: 0.8, asesoria: 0.8, profesional: 0.6 },
                partial: { atencion: 0.4, soporte: 0.5, ayuda: 0.4, especializado: 0.6 }
            }
        };

        // Convert to Maps for O(1) lookup
        const compiled = {};
        for (const [industry, patterns] of Object.entries(rawPatterns)) {
            compiled[industry] = {
                exact: new Map(Object.entries(patterns.exact)),
                partial: new Map(Object.entries(patterns.partial))
            };
        }

        return compiled;
    }

    initializeValidationRules() {
        return {
            restaurante: [
                {
                    condition: (data) => (data.margin || 0) < 0.15,
                    recommendation: 'Incrementa precios o reduce costos de ingredientes para mejorar márgenes',
                    priority: 'high',
                    impact: 'Mejora la rentabilidad hasta un 25%',
                    confidence: 0.9
                },
                {
                    condition: (data) => (data.breakEvenPoint || 0) > 150,
                    recommendation: 'Optimiza el menú eliminando platos de baja rotación',
                    priority: 'medium',
                    impact: 'Reduce punto de equilibrio en 20-30%',
                    confidence: 0.8
                }
            ],
            tecnologia: [
                {
                    condition: (data) => (data.margin || 0) > 0.6,
                    recommendation: 'Considera expandir el equipo para acelerar el crecimiento',
                    priority: 'high',
                    impact: 'Incrementa capacidad de atención en 40%',
                    confidence: 0.85
                }
            ],
            general: [
                {
                    condition: (data) => (data.margin || 0) < 0.1,
                    recommendation: 'Revisa estructura de costos y precios de venta',
                    priority: 'high',
                    impact: 'Mejora la viabilidad del negocio',
                    confidence: 0.9
                }
            ]
        };
    }

    // ==================== PERFORMANCE MONITORING ====================

    recordPerformance(operation, startTime, fromCache) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        this.performanceMetrics.totalRequests++;

        if (!this.performanceMetrics[`${operation}Times`]) {
            this.performanceMetrics[`${operation}Times`] = [];
        }

        this.performanceMetrics[`${operation}Times`].push({
            duration,
            fromCache,
            timestamp: Date.now()
        });

        // Keep only recent measurements (last 1000)
        if (this.performanceMetrics[`${operation}Times`].length > 1000) {
            this.performanceMetrics[`${operation}Times`].shift();
        }
    }

    getPerformanceMetrics() {
        const metrics = {};

        for (const operation of ['classification', 'validation', 'recommendation']) {
            const times = this.performanceMetrics[`${operation}Times`] || [];

            if (times.length > 0) {
                const cacheTimes = times.filter(t => t.fromCache).map(t => t.duration);
                const directTimes = times.filter(t => !t.fromCache).map(t => t.duration);

                metrics[operation] = {
                    totalRequests: times.length,
                    cacheHits: cacheTimes.length,
                    cacheHitRate: ((cacheTimes.length / times.length) * 100).toFixed(2) + '%',
                    avgResponseTime: times.reduce((sum, t) => sum + t.duration, 0) / times.length,
                    avgCacheTime: cacheTimes.length > 0 ?
                        cacheTimes.reduce((sum, t) => sum + t, 0) / cacheTimes.length : 0,
                    avgDirectTime: directTimes.length > 0 ?
                        directTimes.reduce((sum, t) => sum + t, 0) / directTimes.length : 0
                };
            }
        }

        return {
            ...metrics,
            total: {
                requests: this.performanceMetrics.totalRequests,
                cacheMetrics: this.cache.getMetrics()
            }
        };
    }

    // ==================== OPTIMIZATION METHODS ====================

    async optimizeCache() {
        console.log('🔧 Starting cache optimization...');

        // Warm up cache with common patterns
        await this.cache.warmupCache();

        // Analyze performance patterns
        const metrics = this.getPerformanceMetrics();

        console.log('📊 Performance analysis:', JSON.stringify(metrics, null, 2));

        return metrics;
    }

    resetPerformanceMetrics() {
        this.performanceMetrics = {
            classificationTimes: [],
            validationTimes: [],
            recommendationTimes: [],
            totalRequests: 0
        };

        this.cache.resetMetrics();
        console.log('📊 Performance metrics reset');
    }
}

module.exports = OptimizedAlgorithms;