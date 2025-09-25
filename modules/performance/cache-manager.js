/**
 * Production Cache Manager for Intelligent Costing System
 * Multi-tier caching with TTL, LRU eviction, and performance monitoring
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CacheManager {
    constructor(options = {}) {
        this.options = {
            maxMemorySize: options.maxMemorySize || 50 * 1024 * 1024, // 50MB
            defaultTTL: options.defaultTTL || 30 * 60 * 1000, // 30 minutes
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
            persistCache: options.persistCache || true,
            cacheDir: options.cacheDir || path.join(__dirname, '../../data/cache'),
            enableMetrics: options.enableMetrics || true
        };

        // Multi-tier cache system
        this.memoryCache = new Map();
        this.diskCache = new Map();
        this.lruList = new Map(); // For LRU eviction

        // Performance metrics
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            memoryUsage: 0,
            responseTimeSum: 0,
            requestCount: 0
        };

        // Cache categories with different TTL
        this.cacheCategories = {
            'business_classification': 60 * 60 * 1000, // 1 hour
            'cost_validation': 30 * 60 * 1000, // 30 minutes
            'recommendations': 45 * 60 * 1000, // 45 minutes
            'user_profile': 20 * 60 * 1000, // 20 minutes
            'analytics': 10 * 60 * 1000, // 10 minutes
            'system_config': 2 * 60 * 60 * 1000 // 2 hours
        };

        this.initializeCache();
        this.startCleanupTask();

        console.log('🚀 Production Cache Manager initialized');
        console.log(`📊 Memory limit: ${(this.options.maxMemorySize / 1024 / 1024).toFixed(1)}MB`);
        console.log(`⏱️ Default TTL: ${(this.options.defaultTTL / 1000 / 60).toFixed(1)} minutes`);
    }

    initializeCache() {
        // Ensure cache directory exists
        if (!fs.existsSync(this.options.cacheDir)) {
            fs.mkdirSync(this.options.cacheDir, { recursive: true });
        }

        // Load persistent cache if enabled
        if (this.options.persistCache) {
            this.loadDiskCache();
        }
    }

    // ==================== CACHE OPERATIONS ====================

    async get(key, category = 'default') {
        const startTime = process.hrtime();
        const cacheKey = this.generateCacheKey(key, category);

        try {
            // Check memory cache first (L1)
            if (this.memoryCache.has(cacheKey)) {
                const item = this.memoryCache.get(cacheKey);

                if (this.isValid(item)) {
                    this.updateLRU(cacheKey);
                    this.metrics.hits++;
                    this.recordResponseTime(startTime);
                    return item.data;
                } else {
                    this.memoryCache.delete(cacheKey);
                }
            }

            // Check disk cache (L2)
            if (this.diskCache.has(cacheKey)) {
                const item = this.diskCache.get(cacheKey);

                if (this.isValid(item)) {
                    // Promote to memory cache
                    this.setMemoryCache(cacheKey, item.data, item.ttl);
                    this.metrics.hits++;
                    this.recordResponseTime(startTime);
                    return item.data;
                } else {
                    this.diskCache.delete(cacheKey);
                }
            }

            this.metrics.misses++;
            this.recordResponseTime(startTime);
            return null;

        } catch (error) {
            console.error('Cache get error:', error);
            this.metrics.misses++;
            this.recordResponseTime(startTime);
            return null;
        }
    }

    async set(key, data, category = 'default', customTTL = null) {
        const startTime = process.hrtime();
        const cacheKey = this.generateCacheKey(key, category);
        const ttl = customTTL || this.cacheCategories[category] || this.options.defaultTTL;
        const expiresAt = Date.now() + ttl;

        try {
            const cacheItem = {
                data,
                expiresAt,
                ttl,
                category,
                createdAt: Date.now(),
                accessCount: 0,
                size: this.calculateSize(data)
            };

            // Set in memory cache
            this.setMemoryCache(cacheKey, data, ttl);

            // Set in disk cache if enabled
            if (this.options.persistCache) {
                this.setDiskCache(cacheKey, cacheItem);
            }

            this.metrics.sets++;
            this.recordResponseTime(startTime);
            return true;

        } catch (error) {
            console.error('Cache set error:', error);
            this.recordResponseTime(startTime);
            return false;
        }
    }

    async delete(key, category = 'default') {
        const cacheKey = this.generateCacheKey(key, category);

        try {
            let deleted = false;

            if (this.memoryCache.has(cacheKey)) {
                this.memoryCache.delete(cacheKey);
                this.lruList.delete(cacheKey);
                deleted = true;
            }

            if (this.diskCache.has(cacheKey)) {
                this.diskCache.delete(cacheKey);
                deleted = true;
            }

            if (deleted) {
                this.metrics.deletes++;
            }

            return deleted;

        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    // ==================== SPECIALIZED CACHE METHODS ====================

    async cacheBusinessClassification(businessInfo, result) {
        const key = this.createBusinessKey(businessInfo);
        return await this.set(key, result, 'business_classification');
    }

    async getCachedBusinessClassification(businessInfo) {
        const key = this.createBusinessKey(businessInfo);
        return await this.get(key, 'business_classification');
    }

    async cacheCostValidation(category, value, businessType, result) {
        const key = `${category}_${value}_${businessType}`;
        return await this.set(key, result, 'cost_validation');
    }

    async getCachedCostValidation(category, value, businessType) {
        const key = `${category}_${value}_${businessType}`;
        return await this.get(key, 'cost_validation');
    }

    async cacheRecommendations(businessType, analysisData, recommendations) {
        const key = this.createRecommendationsKey(businessType, analysisData);
        return await this.set(key, recommendations, 'recommendations');
    }

    async getCachedRecommendations(businessType, analysisData) {
        const key = this.createRecommendationsKey(businessType, analysisData);
        return await this.get(key, 'recommendations');
    }

    // ==================== MEMORY MANAGEMENT ====================

    setMemoryCache(cacheKey, data, ttl) {
        const item = {
            data,
            expiresAt: Date.now() + ttl,
            size: this.calculateSize(data),
            accessCount: 1
        };

        // Check memory limit before adding
        if (this.getCurrentMemoryUsage() + item.size > this.options.maxMemorySize) {
            this.evictLRU(item.size);
        }

        this.memoryCache.set(cacheKey, item);
        this.updateLRU(cacheKey);
        this.updateMemoryUsage();
    }

    evictLRU(requiredSize) {
        const sortedByAccess = Array.from(this.lruList.entries())
            .sort((a, b) => a[1] - b[1]);

        let freedSize = 0;

        for (const [key, lastAccess] of sortedByAccess) {
            if (freedSize >= requiredSize) break;

            const item = this.memoryCache.get(key);
            if (item) {
                freedSize += item.size;
                this.memoryCache.delete(key);
                this.lruList.delete(key);
                this.metrics.evictions++;
            }
        }

        this.updateMemoryUsage();
    }

    updateLRU(key) {
        this.lruList.set(key, Date.now());
    }

    getCurrentMemoryUsage() {
        let total = 0;
        for (const item of this.memoryCache.values()) {
            total += item.size;
        }
        return total;
    }

    updateMemoryUsage() {
        this.metrics.memoryUsage = this.getCurrentMemoryUsage();
    }

    // ==================== DISK CACHE OPERATIONS ====================

    setDiskCache(key, item) {
        try {
            this.diskCache.set(key, item);

            // Persist to file for important categories
            if (['business_classification', 'system_config'].includes(item.category)) {
                const filePath = path.join(this.options.cacheDir, `${key}.json`);
                fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
            }

        } catch (error) {
            console.error('Disk cache write error:', error);
        }
    }

    loadDiskCache() {
        try {
            if (!fs.existsSync(this.options.cacheDir)) return;

            const files = fs.readdirSync(this.options.cacheDir);
            let loaded = 0;

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.options.cacheDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const item = JSON.parse(content);

                        if (this.isValid(item)) {
                            const key = file.replace('.json', '');
                            this.diskCache.set(key, item);
                            loaded++;
                        }
                    } catch (fileError) {
                        console.warn('Failed to load cache file:', file, fileError.message);
                    }
                }
            }

            console.log(`📁 Loaded ${loaded} cache entries from disk`);

        } catch (error) {
            console.error('Failed to load disk cache:', error);
        }
    }

    // ==================== UTILITY METHODS ====================

    generateCacheKey(key, category) {
        return crypto.createHash('md5').update(`${category}:${key}`).digest('hex');
    }

    createBusinessKey(businessInfo) {
        const keyData = {
            nombre: businessInfo.nombreNegocio || '',
            tipo: businessInfo.tipoNegocio || '',
            producto: businessInfo.producto || '',
            descripcion: businessInfo.descripcion || ''
        };

        return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
    }

    createRecommendationsKey(businessType, analysisData) {
        const keyData = {
            businessType,
            margin: analysisData?.margin || 0,
            breakEvenPoint: analysisData?.breakEvenPoint || 0,
            totalCosts: analysisData?.totalCosts || 0
        };

        return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
    }

    calculateSize(data) {
        try {
            return JSON.stringify(data).length * 2; // Rough estimate in bytes
        } catch {
            return 1024; // Default size if can't calculate
        }
    }

    isValid(item) {
        return item && item.expiresAt > Date.now();
    }

    recordResponseTime(startTime) {
        const diff = process.hrtime(startTime);
        const responseTime = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds

        this.metrics.responseTimeSum += responseTime;
        this.metrics.requestCount++;
    }

    // ==================== CLEANUP AND MAINTENANCE ====================

    startCleanupTask() {
        setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
    }

    cleanup() {
        const now = Date.now();
        let memoryCleanedCount = 0;
        let diskCleanedCount = 0;

        // Clean memory cache
        for (const [key, item] of this.memoryCache.entries()) {
            if (!this.isValid(item)) {
                this.memoryCache.delete(key);
                this.lruList.delete(key);
                memoryCleanedCount++;
            }
        }

        // Clean disk cache
        for (const [key, item] of this.diskCache.entries()) {
            if (!this.isValid(item)) {
                this.diskCache.delete(key);
                diskCleanedCount++;
            }
        }

        this.updateMemoryUsage();

        if (memoryCleanedCount > 0 || diskCleanedCount > 0) {
            console.log(`🧹 Cache cleanup: ${memoryCleanedCount} memory, ${diskCleanedCount} disk entries removed`);
        }
    }

    // ==================== CACHE WARMING ====================

    async warmupCache() {
        console.log('🔥 Starting cache warmup...');

        // Warm up common business classifications
        const commonBusinessTypes = ['restaurante', 'tecnologia', 'retail', 'belleza', 'servicios'];

        for (const type of commonBusinessTypes) {
            const mockBusinessInfo = { tipoNegocio: type, nombreNegocio: `sample_${type}` };
            const classification = {
                industry: type,
                confidence: 0.95,
                businessType: type,
                warmedUp: true
            };

            await this.cacheBusinessClassification(mockBusinessInfo, classification);
        }

        // Warm up common cost validations
        const costCategories = ['materiales', 'mano_obra', 'gastos_fijos', 'marketing'];

        for (const category of costCategories) {
            for (const businessType of commonBusinessTypes) {
                const validation = {
                    type: 'success',
                    message: 'Costo dentro del rango esperado',
                    suggestion: 'Validación pre-calculada',
                    warmedUp: true
                };

                await this.cacheCostValidation(category, 1000, businessType, validation);
            }
        }

        console.log('✅ Cache warmup completed');
    }

    // ==================== METRICS AND MONITORING ====================

    getMetrics() {
        const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
        const avgResponseTime = this.metrics.responseTimeSum / this.metrics.requestCount || 0;

        return {
            performance: {
                hitRate: (hitRate * 100).toFixed(2) + '%',
                avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
                totalRequests: this.metrics.hits + this.metrics.misses
            },
            operations: {
                hits: this.metrics.hits,
                misses: this.metrics.misses,
                sets: this.metrics.sets,
                deletes: this.metrics.deletes,
                evictions: this.metrics.evictions
            },
            memory: {
                usage: (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
                limit: (this.options.maxMemorySize / 1024 / 1024).toFixed(2) + 'MB',
                utilizationPercent: ((this.metrics.memoryUsage / this.options.maxMemorySize) * 100).toFixed(2) + '%'
            },
            cache: {
                memoryEntries: this.memoryCache.size,
                diskEntries: this.diskCache.size,
                categories: Object.keys(this.cacheCategories).length
            }
        };
    }

    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            evictions: 0,
            memoryUsage: this.getCurrentMemoryUsage(),
            responseTimeSum: 0,
            requestCount: 0
        };

        console.log('📊 Cache metrics reset');
    }

    // ==================== CACHE CONTROL ====================

    async clear(category = null) {
        if (category) {
            // Clear specific category
            const keysToDelete = [];

            for (const [key, item] of this.memoryCache.entries()) {
                if (item.category === category) {
                    keysToDelete.push(key);
                }
            }

            for (const key of keysToDelete) {
                await this.delete(key);
            }

            console.log(`🗑️ Cleared ${keysToDelete.length} entries from category: ${category}`);
        } else {
            // Clear all cache
            this.memoryCache.clear();
            this.diskCache.clear();
            this.lruList.clear();

            console.log('🗑️ All cache cleared');
        }
    }

    // ==================== HEALTH CHECK ====================

    healthCheck() {
        const metrics = this.getMetrics();
        const memoryUsagePercent = parseFloat(metrics.memory.utilizationPercent);
        const hitRate = parseFloat(metrics.performance.hitRate);

        return {
            status: (memoryUsagePercent < 90 && hitRate > 50) ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            metrics,
            recommendations: this.getRecommendations(memoryUsagePercent, hitRate)
        };
    }

    getRecommendations(memoryUsage, hitRate) {
        const recommendations = [];

        if (memoryUsage > 85) {
            recommendations.push('Consider increasing memory cache size or reducing TTL');
        }

        if (hitRate < 30) {
            recommendations.push('Low hit rate detected, consider cache warming or TTL optimization');
        }

        if (this.metrics.evictions > 100) {
            recommendations.push('High eviction rate, consider increasing memory limit');
        }

        return recommendations;
    }
}

module.exports = CacheManager;