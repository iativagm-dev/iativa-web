/**
 * Advanced Compression Middleware for Intelligent Costing System
 * Multi-tier compression with intelligent content type detection and caching
 */

const zlib = require('zlib');
const crypto = require('crypto');

class CompressionMiddleware {
    constructor(options = {}) {
        this.config = {
            threshold: options.threshold || 1024, // Minimum bytes to compress
            level: options.level || 6, // Compression level (1-9)
            chunkSize: options.chunkSize || 16 * 1024, // 16KB chunks
            windowBits: options.windowBits || 15,
            memLevel: options.memLevel || 8,
            strategy: options.strategy || zlib.constants.Z_DEFAULT_STRATEGY,

            // Content type specific settings
            jsonLevel: options.jsonLevel || 9, // Max compression for JSON
            htmlLevel: options.htmlLevel || 8,
            textLevel: options.textLevel || 7,
            imageLevel: options.imageLevel || 3, // Light compression for images

            // Caching options
            enableCache: options.enableCache !== false,
            cacheSize: options.cacheSize || 100, // Number of compressed responses to cache
            cacheTTL: options.cacheTTL || 10 * 60 * 1000, // 10 minutes

            // Quality of Service
            enableQoS: options.enableQoS !== false,
            maxCompressionTime: options.maxCompressionTime || 100, // Max 100ms for compression
            adaptiveCompression: options.adaptiveCompression !== false
        };

        // Compression cache
        this.compressionCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            size: 0
        };

        // Performance metrics
        this.metrics = {
            totalRequests: 0,
            compressedRequests: 0,
            bytesOriginal: 0,
            bytesCompressed: 0,
            compressionTime: 0,
            avgCompressionRatio: 0,
            compressionsByType: new Map()
        };

        // Content type detection patterns
        this.contentTypes = this.initializeContentTypes();

        // QoS adaptive settings
        this.adaptiveSettings = {
            avgResponseTime: 0,
            loadLevel: 'normal', // normal, high, critical
            compressionLevel: this.config.level
        };

        console.log('🗜️ Advanced Compression Middleware initialized');
        console.log(`📊 Threshold: ${this.config.threshold} bytes, Level: ${this.config.level}`);
    }

    // ==================== MAIN MIDDLEWARE FUNCTION ====================

    middleware() {
        return (req, res, next) => {
            const originalSend = res.send;
            const originalJson = res.json;

            // Override res.send
            res.send = (body) => {
                return this.handleCompression(req, res, body, originalSend);
            };

            // Override res.json
            res.json = (obj) => {
                const body = JSON.stringify(obj);
                return this.handleCompression(req, res, body, originalSend, 'application/json');
            };

            next();
        };
    }

    async handleCompression(req, res, body, originalSend, contentType = null) {
        const startTime = process.hrtime.bigint();
        this.metrics.totalRequests++;

        try {
            // Determine if compression should be applied
            const shouldCompress = this.shouldCompress(req, res, body, contentType);

            if (!shouldCompress) {
                return originalSend.call(res, body);
            }

            // Get content type
            const detectedContentType = contentType || this.detectContentType(body, res.getHeader('content-type'));

            // Check compression cache
            const cacheKey = this.generateCacheKey(body, detectedContentType);
            const cached = this.getCachedCompression(cacheKey);

            if (cached) {
                this.cacheStats.hits++;
                this.setCompressionHeaders(res, cached.encoding, detectedContentType);
                this.recordMetrics(startTime, body.length, cached.compressed.length, true, detectedContentType);
                return originalSend.call(res, cached.compressed);
            }

            this.cacheStats.misses++;

            // Perform compression
            const compressionResult = await this.compressContent(body, detectedContentType);

            if (!compressionResult.success) {
                return originalSend.call(res, body);
            }

            // Cache the result
            if (this.config.enableCache) {
                this.cacheCompression(cacheKey, {
                    compressed: compressionResult.compressed,
                    encoding: compressionResult.encoding,
                    timestamp: Date.now()
                });
            }

            // Set response headers
            this.setCompressionHeaders(res, compressionResult.encoding, detectedContentType);

            // Record metrics
            this.recordMetrics(startTime, body.length, compressionResult.compressed.length, false, detectedContentType);

            return originalSend.call(res, compressionResult.compressed);

        } catch (error) {
            console.error('Compression error:', error);
            return originalSend.call(res, body);
        }
    }

    // ==================== COMPRESSION LOGIC ====================

    shouldCompress(req, res, body, contentType) {
        // Check if client accepts compression
        const acceptEncoding = req.headers['accept-encoding'] || '';
        if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate') && !acceptEncoding.includes('br')) {
            return false;
        }

        // Check content size threshold
        const bodyLength = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body.toString());
        if (bodyLength < this.config.threshold) {
            return false;
        }

        // Check if already compressed
        const currentEncoding = res.getHeader('content-encoding');
        if (currentEncoding && currentEncoding !== 'identity') {
            return false;
        }

        // Check content type
        const detectedContentType = contentType || this.detectContentType(body, res.getHeader('content-type'));
        if (!this.isCompressibleType(detectedContentType)) {
            return false;
        }

        // QoS check - skip compression if system is overloaded
        if (this.config.enableQoS && this.adaptiveSettings.loadLevel === 'critical') {
            return false;
        }

        return true;
    }

    async compressContent(content, contentType) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content.toString());

        try {
            // Choose compression method based on content type and client support
            const method = this.selectCompressionMethod(contentType);
            const level = this.getCompressionLevel(contentType);

            const startTime = Date.now();
            let compressed;
            let encoding;

            switch (method) {
                case 'br':
                    compressed = await this.brotliCompress(buffer, level);
                    encoding = 'br';
                    break;

                case 'gzip':
                    compressed = await this.gzipCompress(buffer, level);
                    encoding = 'gzip';
                    break;

                case 'deflate':
                    compressed = await this.deflateCompress(buffer, level);
                    encoding = 'deflate';
                    break;

                default:
                    return { success: false };
            }

            const compressionTime = Date.now() - startTime;

            // QoS check - if compression takes too long, skip it next time for similar content
            if (this.config.enableQoS && compressionTime > this.config.maxCompressionTime) {
                this.adjustCompressionSettings(contentType, compressionTime);
            }

            return {
                success: true,
                compressed,
                encoding,
                originalSize: buffer.length,
                compressedSize: compressed.length,
                ratio: compressed.length / buffer.length,
                time: compressionTime
            };

        } catch (error) {
            console.error('Compression failed:', error);
            return { success: false };
        }
    }

    // ==================== COMPRESSION METHODS ====================

    async brotliCompress(buffer, level) {
        return new Promise((resolve, reject) => {
            const options = {
                [zlib.constants.BROTLI_PARAM_QUALITY]: level,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
            };

            zlib.brotliCompress(buffer, options, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
    }

    async gzipCompress(buffer, level) {
        return new Promise((resolve, reject) => {
            const options = {
                level,
                chunkSize: this.config.chunkSize,
                windowBits: this.config.windowBits,
                memLevel: this.config.memLevel,
                strategy: this.config.strategy
            };

            zlib.gzip(buffer, options, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
    }

    async deflateCompress(buffer, level) {
        return new Promise((resolve, reject) => {
            const options = {
                level,
                chunkSize: this.config.chunkSize,
                windowBits: this.config.windowBits,
                memLevel: this.config.memLevel,
                strategy: this.config.strategy
            };

            zlib.deflate(buffer, options, (error, result) => {
                if (error) reject(error);
                else resolve(result);
            });
        });
    }

    // ==================== CONTENT TYPE DETECTION ====================

    detectContentType(content, headerContentType) {
        if (headerContentType) {
            return headerContentType.split(';')[0].trim();
        }

        // Analyze content to detect type
        const contentStr = content.toString().trim();

        if (contentStr.startsWith('{') || contentStr.startsWith('[')) {
            return 'application/json';
        }

        if (contentStr.startsWith('<!DOCTYPE') || contentStr.startsWith('<html')) {
            return 'text/html';
        }

        if (contentStr.includes('<') && contentStr.includes('>')) {
            return 'text/html';
        }

        return 'text/plain';
    }

    isCompressibleType(contentType) {
        const compressible = [
            'text/',
            'application/json',
            'application/javascript',
            'application/xml',
            'application/x-javascript',
            'application/rss+xml',
            'application/atom+xml'
        ];

        return compressible.some(type => contentType.startsWith(type));
    }

    selectCompressionMethod(contentType) {
        // Brotli is best for text content
        if (contentType.startsWith('text/') || contentType.includes('json')) {
            return 'br';
        }

        // Gzip for general content
        return 'gzip';
    }

    getCompressionLevel(contentType) {
        if (contentType.includes('json')) {
            return this.adaptiveSettings.compressionLevel || this.config.jsonLevel;
        }

        if (contentType.startsWith('text/html')) {
            return this.config.htmlLevel;
        }

        if (contentType.startsWith('text/')) {
            return this.config.textLevel;
        }

        if (contentType.startsWith('image/')) {
            return this.config.imageLevel;
        }

        return this.config.level;
    }

    // ==================== CACHING SYSTEM ====================

    generateCacheKey(content, contentType) {
        const hash = crypto.createHash('md5');
        hash.update(content);
        hash.update(contentType);
        return hash.digest('hex');
    }

    getCachedCompression(key) {
        const cached = this.compressionCache.get(key);

        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
            return cached;
        }

        if (cached) {
            this.compressionCache.delete(key);
        }

        return null;
    }

    cacheCompression(key, data) {
        // Implement LRU eviction
        if (this.compressionCache.size >= this.config.cacheSize) {
            const firstKey = this.compressionCache.keys().next().value;
            this.compressionCache.delete(firstKey);
        }

        this.compressionCache.set(key, data);
        this.cacheStats.size = this.compressionCache.size;
    }

    // ==================== RESPONSE HEADERS ====================

    setCompressionHeaders(res, encoding, contentType) {
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Cache control for compressed content
        if (!res.getHeader('Cache-Control')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }

    // ==================== ADAPTIVE COMPRESSION ====================

    adjustCompressionSettings(contentType, compressionTime) {
        if (!this.config.adaptiveCompression) return;

        // Reduce compression level if taking too long
        if (compressionTime > this.config.maxCompressionTime) {
            this.adaptiveSettings.compressionLevel = Math.max(1, this.adaptiveSettings.compressionLevel - 1);
            console.log(`🔧 Reduced compression level to ${this.adaptiveSettings.compressionLevel} for ${contentType}`);
        }
    }

    updateLoadLevel(responseTime, errorRate) {
        if (!this.config.enableQoS) return;

        this.adaptiveSettings.avgResponseTime = (this.adaptiveSettings.avgResponseTime * 0.9) + (responseTime * 0.1);

        if (this.adaptiveSettings.avgResponseTime > 1000 || errorRate > 0.05) {
            this.adaptiveSettings.loadLevel = 'critical';
            this.adaptiveSettings.compressionLevel = Math.max(1, this.config.level - 2);
        } else if (this.adaptiveSettings.avgResponseTime > 500 || errorRate > 0.02) {
            this.adaptiveSettings.loadLevel = 'high';
            this.adaptiveSettings.compressionLevel = Math.max(1, this.config.level - 1);
        } else {
            this.adaptiveSettings.loadLevel = 'normal';
            this.adaptiveSettings.compressionLevel = this.config.level;
        }
    }

    // ==================== METRICS AND MONITORING ====================

    recordMetrics(startTime, originalSize, compressedSize, fromCache, contentType) {
        const endTime = process.hrtime.bigint();
        const compressionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        this.metrics.compressedRequests++;
        this.metrics.bytesOriginal += originalSize;
        this.metrics.bytesCompressed += compressedSize;
        this.metrics.compressionTime += compressionTime;

        const ratio = compressedSize / originalSize;
        this.metrics.avgCompressionRatio = (
            (this.metrics.avgCompressionRatio * (this.metrics.compressedRequests - 1)) + ratio
        ) / this.metrics.compressedRequests;

        // Track by content type
        if (!this.metrics.compressionsByType.has(contentType)) {
            this.metrics.compressionsByType.set(contentType, {
                count: 0,
                originalBytes: 0,
                compressedBytes: 0,
                avgRatio: 0
            });
        }

        const typeStats = this.metrics.compressionsByType.get(contentType);
        typeStats.count++;
        typeStats.originalBytes += originalSize;
        typeStats.compressedBytes += compressedSize;
        typeStats.avgRatio = typeStats.compressedBytes / typeStats.originalBytes;
    }

    getMetrics() {
        const compressionRate = (this.metrics.compressedRequests / this.metrics.totalRequests) * 100;
        const avgCompressionTime = this.metrics.compressionTime / this.metrics.compressedRequests;
        const totalBytesSaved = this.metrics.bytesOriginal - this.metrics.bytesCompressed;
        const bytesSavedPercent = (totalBytesSaved / this.metrics.bytesOriginal) * 100;

        return {
            requests: {
                total: this.metrics.totalRequests,
                compressed: this.metrics.compressedRequests,
                compressionRate: compressionRate.toFixed(2) + '%'
            },
            performance: {
                avgCompressionTime: avgCompressionTime.toFixed(2) + 'ms',
                avgCompressionRatio: (this.metrics.avgCompressionRatio * 100).toFixed(2) + '%'
            },
            bandwidth: {
                originalBytes: this.formatBytes(this.metrics.bytesOriginal),
                compressedBytes: this.formatBytes(this.metrics.bytesCompressed),
                bytesSaved: this.formatBytes(totalBytesSaved),
                bytesSavedPercent: bytesSavedPercent.toFixed(2) + '%'
            },
            cache: {
                hits: this.cacheStats.hits,
                misses: this.cacheStats.misses,
                hitRate: ((this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100).toFixed(2) + '%',
                size: this.cacheStats.size,
                maxSize: this.config.cacheSize
            },
            adaptive: {
                loadLevel: this.adaptiveSettings.loadLevel,
                currentCompressionLevel: this.adaptiveSettings.compressionLevel,
                avgResponseTime: this.adaptiveSettings.avgResponseTime.toFixed(2) + 'ms'
            },
            contentTypes: Array.from(this.metrics.compressionsByType.entries()).map(([type, stats]) => ({
                type,
                count: stats.count,
                compressionRatio: (stats.avgRatio * 100).toFixed(2) + '%',
                bytesSaved: this.formatBytes(stats.originalBytes - stats.compressedBytes)
            }))
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ==================== CONFIGURATION ====================

    initializeContentTypes() {
        return {
            compressible: new Set([
                'text/html',
                'text/plain',
                'text/css',
                'text/javascript',
                'application/json',
                'application/javascript',
                'application/xml',
                'application/rss+xml',
                'application/atom+xml'
            ]),

            incompressible: new Set([
                'image/jpeg',
                'image/png',
                'image/gif',
                'video/mp4',
                'audio/mpeg',
                'application/gzip',
                'application/zip'
            ])
        };
    }

    // ==================== HEALTH CHECK ====================

    getHealthStatus() {
        const metrics = this.getMetrics();
        const compressionRate = parseFloat(metrics.requests.compressionRate);
        const hitRate = parseFloat(metrics.cache.hitRate);
        const avgTime = parseFloat(metrics.performance.avgCompressionTime);

        return {
            status: (compressionRate > 50 && hitRate > 70 && avgTime < 50) ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            metrics,
            recommendations: this.getHealthRecommendations(compressionRate, hitRate, avgTime)
        };
    }

    getHealthRecommendations(compressionRate, hitRate, avgTime) {
        const recommendations = [];

        if (compressionRate < 30) {
            recommendations.push('Low compression rate detected. Check threshold settings.');
        }

        if (hitRate < 50) {
            recommendations.push('Low cache hit rate. Consider increasing cache size or TTL.');
        }

        if (avgTime > 100) {
            recommendations.push('High compression time. Consider reducing compression level.');
        }

        return recommendations;
    }

    // ==================== UTILITIES ====================

    clearCache() {
        this.compressionCache.clear();
        this.cacheStats = { hits: 0, misses: 0, size: 0 };
        console.log('🗑️ Compression cache cleared');
    }

    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            compressedRequests: 0,
            bytesOriginal: 0,
            bytesCompressed: 0,
            compressionTime: 0,
            avgCompressionRatio: 0,
            compressionsByType: new Map()
        };
        console.log('📊 Compression metrics reset');
    }
}

module.exports = CompressionMiddleware;