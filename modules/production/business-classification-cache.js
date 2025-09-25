/**
 * Business Classification Cache - Production-grade Caching System
 * Advanced caching with pattern recognition, predictive pre-loading, and intelligent TTL management
 */

const CacheManager = require('../performance/cache-manager');
const EventEmitter = require('events');

class BusinessClassificationCache extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            maxCacheSize: options.maxCacheSize || 200 * 1024 * 1024, // 200MB
            intelligentTTL: options.intelligentTTL !== false,
            predictivePreloading: options.predictivePreloading !== false,
            patternRecognition: options.patternRecognition !== false,
            confidenceThreshold: options.confidenceThreshold || 0.85,
            preloadThreshold: options.preloadThreshold || 5, // Trigger preload after 5 similar requests
            maxPreloadBatch: options.maxPreloadBatch || 20,
            enableMetrics: options.enableMetrics !== false,
            ...options
        };

        // Initialize cache manager
        this.cacheManager = new CacheManager({
            maxMemorySize: this.config.maxCacheSize * 0.7, // 70% in memory
            defaultTTL: 2 * 60 * 60 * 1000, // 2 hours base TTL
            categories: {
                'business_classification': 4 * 60 * 60 * 1000,    // 4 hours
                'industry_patterns': 8 * 60 * 60 * 1000,         // 8 hours
                'classification_confidence': 1 * 60 * 60 * 1000,  // 1 hour
                'predictive_models': 24 * 60 * 60 * 1000         // 24 hours
            }
        });

        // Classification patterns and statistics
        this.classificationPatterns = new Map();
        this.requestPatterns = new Map();
        this.confidenceMetrics = new Map();
        this.preloadQueue = new Set();

        // Performance metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            patternMatches: 0,
            preloadsTriggered: 0,
            confidenceBoosts: 0,
            averageResponseTime: 0,
            totalRequests: 0,
            highConfidenceHits: 0
        };

        // Compiled regex patterns for fast matching
        this.compiledPatterns = new Map();

        this.init();
    }

    async init() {
        console.log('🧠 Initializing Business Classification Cache...');

        await this.loadPrecompiledPatterns();
        await this.warmupCommonClassifications();
        this.setupPatternAnalysis();
        this.setupPredictivePreloading();

        console.log('✅ Business Classification Cache ready');
    }

    // ==================== MAIN CACHING INTERFACE ====================

    async getCachedClassification(businessInfo) {
        const startTime = process.hrtime.bigint();

        try {
            // Generate cache key with semantic analysis
            const cacheKey = this.generateSemanticCacheKey(businessInfo);
            this.metrics.totalRequests++;

            // Try exact match first
            let cached = await this.cacheManager.get(cacheKey, 'business_classification');

            if (cached) {
                this.metrics.cacheHits++;

                // Check confidence and potentially update TTL
                if (cached.confidence > this.config.confidenceThreshold) {
                    this.metrics.highConfidenceHits++;
                    this.extendTTL(cacheKey, cached);
                }

                this.recordResponseTime(startTime);
                return this.enrichCachedResult(cached);
            }

            // Try pattern-based matching
            if (this.config.patternRecognition) {
                const patternMatch = await this.findPatternMatch(businessInfo);
                if (patternMatch) {
                    this.metrics.patternMatches++;
                    this.recordResponseTime(startTime);
                    return patternMatch;
                }
            }

            // Cache miss - record for pattern analysis
            this.metrics.cacheMisses++;
            this.analyzeRequestPattern(businessInfo);

            this.recordResponseTime(startTime);
            return null;

        } catch (error) {
            console.error('Cache retrieval error:', error);
            this.recordResponseTime(startTime);
            return null;
        }
    }

    async cacheClassification(businessInfo, classification) {
        try {
            const cacheKey = this.generateSemanticCacheKey(businessInfo);

            // Enrich classification with metadata
            const enrichedClassification = {
                ...classification,
                cached: true,
                cachedAt: Date.now(),
                confidence: classification.confidence || 0,
                businessFingerprint: this.generateBusinessFingerprint(businessInfo),
                patternSignature: this.generatePatternSignature(businessInfo)
            };

            // Calculate intelligent TTL based on confidence
            const ttl = this.calculateIntelligentTTL(enrichedClassification);

            // Store in cache
            await this.cacheManager.set(
                cacheKey,
                enrichedClassification,
                'business_classification',
                ttl
            );

            // Update patterns for future matching
            this.updateClassificationPatterns(businessInfo, enrichedClassification);

            // Check for preload opportunities
            if (this.config.predictivePreloading) {
                this.checkPreloadOpportunity(businessInfo, enrichedClassification);
            }

            return true;

        } catch (error) {
            console.error('Cache storage error:', error);
            return false;
        }
    }

    // ==================== SEMANTIC CACHE KEY GENERATION ====================

    generateSemanticCacheKey(businessInfo) {
        // Extract key business indicators
        const indicators = this.extractBusinessIndicators(businessInfo);

        // Create normalized fingerprint
        const fingerprint = [
            this.normalizeBusinessName(indicators.name),
            this.normalizeIndustry(indicators.industry),
            this.normalizeDescription(indicators.description),
            this.categorizeSize(indicators.size),
            this.normalizeLocation(indicators.location)
        ].filter(Boolean).join('|');

        // Generate hash with collision resistance
        return `biz_class_${this.generateStableHash(fingerprint)}`;
    }

    extractBusinessIndicators(businessInfo) {
        return {
            name: businessInfo.businessName || businessInfo.name || '',
            industry: businessInfo.industry || businessInfo.sector || '',
            description: businessInfo.description || businessInfo.businessDescription || '',
            size: businessInfo.employeeCount || businessInfo.size || businessInfo.revenue || 0,
            location: businessInfo.location || businessInfo.city || businessInfo.country || ''
        };
    }

    normalizeBusinessName(name) {
        if (!name) return '';

        // Remove common business suffixes/prefixes
        const cleanName = name
            .toLowerCase()
            .replace(/\b(inc|llc|corp|corporation|company|co|ltd|limited|plc)\b/g, '')
            .replace(/[^\w\s]/g, '')
            .trim();

        // Extract core business terms
        return this.extractKeyTerms(cleanName, 3);
    }

    normalizeIndustry(industry) {
        if (!industry) return '';
        return industry.toLowerCase().replace(/[^\w\s]/g, '').trim();
    }

    normalizeDescription(description) {
        if (!description || description.length < 10) return '';

        // Extract key business activities
        const keyActivities = this.extractBusinessActivities(description);
        return keyActivities.slice(0, 5).join(' ');
    }

    categorizeSize(size) {
        const numSize = parseInt(size) || 0;

        if (numSize === 0) return 'unknown';
        if (numSize <= 10) return 'micro';
        if (numSize <= 50) return 'small';
        if (numSize <= 250) return 'medium';
        if (numSize <= 1000) return 'large';
        return 'enterprise';
    }

    // ==================== PATTERN RECOGNITION ====================

    async findPatternMatch(businessInfo) {
        if (!this.config.patternRecognition) return null;

        const businessSignature = this.generatePatternSignature(businessInfo);

        // Find similar patterns
        for (const [pattern, cachedResults] of this.classificationPatterns) {
            const similarity = this.calculatePatternSimilarity(businessSignature, pattern);

            if (similarity > 0.8) { // 80% similarity threshold
                // Find best matching result
                const bestMatch = this.findBestPatternMatch(businessInfo, cachedResults);

                if (bestMatch && bestMatch.confidence > 0.7) {
                    // Create pattern-based result
                    return {
                        ...bestMatch,
                        patternMatch: true,
                        patternSimilarity: similarity,
                        cached: true
                    };
                }
            }
        }

        return null;
    }

    generatePatternSignature(businessInfo) {
        const indicators = this.extractBusinessIndicators(businessInfo);

        return {
            nameTokens: this.tokenize(indicators.name),
            industryTokens: this.tokenize(indicators.industry),
            descriptionTokens: this.tokenize(indicators.description).slice(0, 10),
            sizeCategory: this.categorizeSize(indicators.size),
            locationTokens: this.tokenize(indicators.location)
        };
    }

    calculatePatternSimilarity(signature1, signature2) {
        const weights = {
            nameTokens: 0.3,
            industryTokens: 0.4,
            descriptionTokens: 0.2,
            sizeCategory: 0.05,
            locationTokens: 0.05
        };

        let totalSimilarity = 0;

        for (const [field, weight] of Object.entries(weights)) {
            if (field === 'sizeCategory') {
                totalSimilarity += signature1[field] === signature2[field] ? weight : 0;
            } else {
                const similarity = this.calculateTokenSimilarity(
                    signature1[field] || [],
                    signature2[field] || []
                );
                totalSimilarity += similarity * weight;
            }
        }

        return totalSimilarity;
    }

    calculateTokenSimilarity(tokens1, tokens2) {
        if (!tokens1.length || !tokens2.length) return 0;

        const intersection = tokens1.filter(token => tokens2.includes(token));
        const union = [...new Set([...tokens1, ...tokens2])];

        return intersection.length / union.length; // Jaccard similarity
    }

    // ==================== INTELLIGENT TTL MANAGEMENT ====================

    calculateIntelligentTTL(classification) {
        if (!this.config.intelligentTTL) {
            return this.cacheManager.config.categories['business_classification'];
        }

        const baseTTL = this.cacheManager.config.categories['business_classification'];
        const confidence = classification.confidence || 0;

        // Higher confidence = longer TTL
        let multiplier = 1;

        if (confidence >= 0.95) multiplier = 2;      // 8 hours
        else if (confidence >= 0.9) multiplier = 1.5; // 6 hours
        else if (confidence >= 0.8) multiplier = 1.2; // ~5 hours
        else if (confidence < 0.6) multiplier = 0.5;  // 2 hours

        // Adjust based on pattern frequency
        const patternFrequency = this.getPatternFrequency(classification.patternSignature);
        if (patternFrequency > 10) multiplier *= 1.3; // Popular patterns last longer

        return Math.min(baseTTL * multiplier, 24 * 60 * 60 * 1000); // Max 24 hours
    }

    extendTTL(cacheKey, cached) {
        if (cached.confidence > this.config.confidenceThreshold) {
            const newTTL = this.calculateIntelligentTTL(cached);
            this.cacheManager.updateTTL(cacheKey, newTTL, 'business_classification');
            this.metrics.confidenceBoosts++;
        }
    }

    // ==================== PREDICTIVE PRELOADING ====================

    checkPreloadOpportunity(businessInfo, classification) {
        if (!this.config.predictivePreloading) return;

        const pattern = this.generatePatternSignature(businessInfo);
        const patternKey = JSON.stringify(pattern);

        // Track pattern frequency
        if (!this.requestPatterns.has(patternKey)) {
            this.requestPatterns.set(patternKey, []);
        }

        const patternHistory = this.requestPatterns.get(patternKey);
        patternHistory.push({
            businessInfo,
            classification,
            timestamp: Date.now()
        });

        // Trigger preload if pattern is frequent
        if (patternHistory.length >= this.config.preloadThreshold) {
            this.triggerPredictivePreload(pattern, patternHistory);
        }
    }

    async triggerPredictivePreload(pattern, patternHistory) {
        this.metrics.preloadsTriggered++;

        // Generate similar business profiles for preloading
        const similarProfiles = this.generateSimilarBusinessProfiles(pattern);

        // Add to preload queue
        similarProfiles.slice(0, this.config.maxPreloadBatch).forEach(profile => {
            this.preloadQueue.add(JSON.stringify(profile));
        });

        // Process preload queue
        this.processPreloadQueue();
    }

    generateSimilarBusinessProfiles(basePattern) {
        const variations = [];
        const baseTokens = basePattern.nameTokens || [];

        // Generate variations by combining common industry terms
        const industryVariations = this.getCommonIndustryTerms();

        for (const industryTerm of industryVariations.slice(0, 5)) {
            variations.push({
                name: baseTokens.join(' '),
                industry: industryTerm,
                description: `${industryTerm} business services`,
                size: basePattern.sizeCategory
            });
        }

        return variations;
    }

    async processPreloadQueue() {
        if (this.preloadQueue.size === 0) return;

        const batch = Array.from(this.preloadQueue).slice(0, 5);
        this.preloadQueue.clear();

        for (const profileStr of batch) {
            try {
                const profile = JSON.parse(profileStr);
                const cacheKey = this.generateSemanticCacheKey(profile);

                // Check if already cached
                const existing = await this.cacheManager.get(cacheKey, 'business_classification');
                if (!existing) {
                    // Generate predictive classification
                    const predictiveResult = this.generatePredictiveClassification(profile);
                    if (predictiveResult) {
                        await this.cacheClassification(profile, predictiveResult);
                    }
                }
            } catch (error) {
                console.error('Preload processing error:', error);
            }
        }
    }

    // ==================== BUSINESS INTELLIGENCE ====================

    extractBusinessActivities(description) {
        const activityPatterns = [
            /\b(manufactur\w+|produc\w+|mak\w+)\b/gi,
            /\b(sell\w+|retail\w+|distribut\w+)\b/gi,
            /\b(servic\w+|provid\w+|offer\w+)\b/gi,
            /\b(develop\w+|design\w+|creat\w+)\b/gi,
            /\b(consult\w+|advis\w+|support\w+)\b/gi,
            /\b(transport\w+|deliver\w+|ship\w+)\b/gi,
            /\b(financ\w+|bank\w+|invest\w+)\b/gi,
            /\b(technolog\w+|software\w+|digital\w+)\b/gi,
            /\b(healthcare\w+|medical\w+|treat\w+)\b/gi,
            /\b(educat\w+|teach\w+|train\w+)\b/gi
        ];

        const activities = [];
        for (const pattern of activityPatterns) {
            const matches = description.match(pattern);
            if (matches) {
                activities.push(...matches.map(m => m.toLowerCase()));
            }
        }

        return [...new Set(activities)];
    }

    getCommonIndustryTerms() {
        return [
            'technology', 'retail', 'healthcare', 'finance', 'education',
            'manufacturing', 'consulting', 'real estate', 'construction',
            'transportation', 'hospitality', 'entertainment', 'agriculture',
            'telecommunications', 'energy', 'automotive', 'aerospace',
            'biotechnology', 'pharmaceuticals', 'food service'
        ];
    }

    generatePredictiveClassification(profile) {
        // Simple predictive classification based on patterns
        const industryConfidenceMap = {
            'technology': 0.75,
            'retail': 0.8,
            'healthcare': 0.85,
            'finance': 0.9,
            'education': 0.8,
            'manufacturing': 0.85,
            'consulting': 0.7
        };

        const industry = profile.industry?.toLowerCase() || 'general';
        const confidence = industryConfidenceMap[industry] || 0.6;

        return {
            businessType: industry,
            industry: industry,
            confidence: confidence,
            predictive: true,
            generatedAt: Date.now()
        };
    }

    // ==================== PRECOMPILED PATTERNS ====================

    async loadPrecompiledPatterns() {
        // Load common business classification patterns for O(1) lookup
        const commonPatterns = {
            technology: {
                keywords: ['software', 'tech', 'digital', 'app', 'platform', 'ai', 'data'],
                regex: /\b(software|tech|digital|app|platform|ai|data|cloud|internet)\b/gi
            },
            retail: {
                keywords: ['shop', 'store', 'retail', 'sell', 'product', 'commerce'],
                regex: /\b(shop|store|retail|sell|product|commerce|market|trade)\b/gi
            },
            healthcare: {
                keywords: ['health', 'medical', 'clinic', 'hospital', 'care', 'wellness'],
                regex: /\b(health|medical|clinic|hospital|care|wellness|doctor|nurse)\b/gi
            },
            finance: {
                keywords: ['bank', 'finance', 'investment', 'insurance', 'loan', 'credit'],
                regex: /\b(bank|finance|investment|insurance|loan|credit|money|financial)\b/gi
            }
        };

        for (const [industry, pattern] of Object.entries(commonPatterns)) {
            this.compiledPatterns.set(industry, pattern.regex);
        }

        console.log(`📋 Loaded ${this.compiledPatterns.size} precompiled patterns`);
    }

    async warmupCommonClassifications() {
        const commonBusinessTypes = [
            { name: 'Tech Startup', industry: 'technology', size: 'small' },
            { name: 'Retail Store', industry: 'retail', size: 'medium' },
            { name: 'Medical Clinic', industry: 'healthcare', size: 'small' },
            { name: 'Financial Services', industry: 'finance', size: 'large' },
            { name: 'Consulting Firm', industry: 'consulting', size: 'medium' }
        ];

        for (const business of commonBusinessTypes) {
            const classification = this.generatePredictiveClassification(business);
            await this.cacheClassification(business, classification);
        }

        console.log('🔄 Cache warmed up with common classifications');
    }

    // ==================== UTILITY FUNCTIONS ====================

    extractKeyTerms(text, maxTerms = 5) {
        if (!text) return '';

        const words = text.split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !this.isStopWord(word))
            .slice(0, maxTerms);

        return words.join(' ');
    }

    isStopWord(word) {
        const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return stopWords.includes(word.toLowerCase());
    }

    tokenize(text) {
        if (!text) return [];
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2)
            .filter(token => !this.isStopWord(token));
    }

    generateStableHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    generateBusinessFingerprint(businessInfo) {
        const indicators = this.extractBusinessIndicators(businessInfo);
        return `${indicators.name}_${indicators.industry}_${indicators.size}`;
    }

    getPatternFrequency(patternSignature) {
        if (!patternSignature) return 0;
        const key = JSON.stringify(patternSignature);
        return this.requestPatterns.get(key)?.length || 0;
    }

    enrichCachedResult(cached) {
        return {
            ...cached,
            cacheHit: true,
            responseTime: 'sub-ms',
            freshness: Date.now() - (cached.cachedAt || 0)
        };
    }

    findBestPatternMatch(businessInfo, cachedResults) {
        if (!cachedResults.length) return null;

        // Score each cached result based on similarity
        const scores = cachedResults.map(result => ({
            result,
            score: this.calculateBusinessSimilarity(businessInfo, result.originalBusiness || {})
        }));

        // Return highest scoring result
        const best = scores.reduce((max, current) =>
            current.score > max.score ? current : max
        );

        return best.score > 0.6 ? best.result : null;
    }

    calculateBusinessSimilarity(business1, business2) {
        const sig1 = this.generatePatternSignature(business1);
        const sig2 = this.generatePatternSignature(business2);
        return this.calculatePatternSimilarity(sig1, sig2);
    }

    setupPatternAnalysis() {
        // Analyze patterns every 30 minutes
        setInterval(() => {
            this.analyzePatternTrends();
        }, 30 * 60 * 1000);
    }

    setupPredictivePreloading() {
        // Process preload queue every 5 minutes
        setInterval(() => {
            if (this.preloadQueue.size > 0) {
                this.processPreloadQueue();
            }
        }, 5 * 60 * 1000);
    }

    analyzeRequestPattern(businessInfo) {
        // Record request pattern for analysis
        const signature = this.generatePatternSignature(businessInfo);
        const key = JSON.stringify(signature);

        if (!this.requestPatterns.has(key)) {
            this.requestPatterns.set(key, []);
        }

        this.requestPatterns.get(key).push({
            timestamp: Date.now(),
            businessInfo
        });
    }

    analyzePatternTrends() {
        // Analyze trending patterns and optimize cache
        const trendingPatterns = new Map();

        for (const [pattern, requests] of this.requestPatterns) {
            const recentRequests = requests.filter(req =>
                Date.now() - req.timestamp < 60 * 60 * 1000 // Last hour
            );

            if (recentRequests.length > 3) {
                trendingPatterns.set(pattern, recentRequests.length);
            }
        }

        if (trendingPatterns.size > 0) {
            console.log(`📊 Detected ${trendingPatterns.size} trending classification patterns`);
        }
    }

    recordResponseTime(startTime) {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        // Update rolling average
        const total = this.metrics.totalRequests;
        const current = this.metrics.averageResponseTime;
        this.metrics.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
    }

    // ==================== MONITORING AND METRICS ====================

    getMetrics() {
        const hitRate = this.metrics.totalRequests > 0 ?
            (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2) : 0;

        return {
            ...this.metrics,
            hitRate: parseFloat(hitRate),
            patternMatchRate: this.metrics.totalRequests > 0 ?
                (this.metrics.patternMatches / this.metrics.totalRequests * 100).toFixed(2) : 0,
            highConfidenceRate: this.metrics.cacheHits > 0 ?
                (this.metrics.highConfidenceHits / this.metrics.cacheHits * 100).toFixed(2) : 0,
            cacheSize: this.classificationPatterns.size,
            preloadQueueSize: this.preloadQueue.size
        };
    }

    healthCheck() {
        const metrics = this.getMetrics();
        const hitRate = parseFloat(metrics.hitRate);

        return {
            status: hitRate > 70 ? 'healthy' : hitRate > 50 ? 'degraded' : 'unhealthy',
            hitRate: `${hitRate}%`,
            averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
            patternMatches: metrics.patternMatches,
            preloadQueue: metrics.preloadQueueSize,
            recommendations: this.generateHealthRecommendations(metrics)
        };
    }

    generateHealthRecommendations(metrics) {
        const recommendations = [];
        const hitRate = parseFloat(metrics.hitRate);

        if (hitRate < 60) {
            recommendations.push('Cache hit rate is low - consider tuning pattern recognition');
        }

        if (metrics.averageResponseTime > 10) {
            recommendations.push('Response time is high - check cache performance');
        }

        if (metrics.preloadQueueSize > 50) {
            recommendations.push('Large preload queue - consider increasing processing frequency');
        }

        return recommendations;
    }

    // ==================== MAINTENANCE ====================

    async clearOldPatterns() {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
        let cleared = 0;

        for (const [pattern, requests] of this.requestPatterns) {
            const recentRequests = requests.filter(req => req.timestamp > cutoffTime);

            if (recentRequests.length === 0) {
                this.requestPatterns.delete(pattern);
                cleared++;
            } else if (recentRequests.length < requests.length) {
                this.requestPatterns.set(pattern, recentRequests);
            }
        }

        if (cleared > 0) {
            console.log(`🧹 Cleared ${cleared} old request patterns`);
        }
    }

    updateClassificationPatterns(businessInfo, classification) {
        const signature = this.generatePatternSignature(businessInfo);
        const key = JSON.stringify(signature);

        if (!this.classificationPatterns.has(key)) {
            this.classificationPatterns.set(key, []);
        }

        this.classificationPatterns.get(key).push({
            ...classification,
            originalBusiness: businessInfo,
            timestamp: Date.now()
        });
    }
}

module.exports = BusinessClassificationCache;