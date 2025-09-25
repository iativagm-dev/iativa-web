/**
 * Intelligent Throttling System - Advanced Request Rate Limiting
 * Sophisticated rate limiting with adaptive algorithms, burst protection, and intelligent user-based throttling
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class IntelligentThrottlingSystem extends EventEmitter {
    constructor(options = {}) {
        super();

        this.config = {
            // Base rate limiting
            defaultRateLimit: options.defaultRateLimit || 100, // requests per minute
            burstAllowance: options.burstAllowance || 20,       // burst requests
            burstWindow: options.burstWindow || 60000,          // 1 minute burst window

            // Intelligent features
            adaptiveThrottling: options.adaptiveThrottling !== false,
            userBasedLimits: options.userBasedLimits !== false,
            priorityQueuing: options.priorityQueuing !== false,
            systemLoadAware: options.systemLoadAware !== false,

            // Advanced configuration
            maxConcurrentRequests: options.maxConcurrentRequests || 500,
            queueTimeout: options.queueTimeout || 30000, // 30 seconds
            backoffMultiplier: options.backoffMultiplier || 2,
            maxBackoffDelay: options.maxBackoffDelay || 60000, // 1 minute

            // Persistence
            enablePersistence: options.enablePersistence !== false,
            persistenceFile: options.persistenceFile || path.join(__dirname, '../../data/performance/throttling.json'),

            ...options
        };

        // Rate limiting storage
        this.rateLimits = new Map();          // userId/IP -> rate limit data
        this.burstLimits = new Map();         // userId/IP -> burst tracking
        this.requestQueues = new Map();       // priority -> request queue
        this.activeRequests = new Set();      // currently processing requests
        this.backoffTimers = new Map();       // userId/IP -> backoff data

        // User classification and limits
        this.userTiers = new Map();           // userId -> tier (premium, free, etc.)
        this.tierLimits = new Map();          // tier -> limits configuration
        this.systemMetrics = {
            cpu: 0,
            memory: 0,
            responseTime: 0,
            errorRate: 0
        };

        // Analytics and monitoring
        this.metrics = {
            totalRequests: 0,
            throttledRequests: 0,
            queuedRequests: 0,
            completedRequests: 0,
            timeoutRequests: 0,
            burstRequests: 0,
            averageWaitTime: 0,
            systemOverloadEvents: 0
        };

        // Request patterns and adaptation
        this.requestPatterns = new Map();     // Pattern analysis for adaptive limits
        this.adaptiveFactors = new Map();     // User/endpoint -> adaptive multipliers

        this.init();
    }

    async init() {
        console.log('🚦 Initializing Intelligent Throttling System...');

        this.initializeTierLimits();
        this.initializePriorityQueues();
        await this.loadPersistedData();
        this.setupSystemMonitoring();
        this.setupAdaptiveAnalysis();

        console.log('✅ Intelligent Throttling System ready');
    }

    // ==================== MAIN THROTTLING INTERFACE ====================

    async checkRateLimit(requestContext) {
        const identifier = this.getRequestIdentifier(requestContext);
        const priority = this.calculateRequestPriority(requestContext);

        try {
            // Pre-flight checks
            const preflightResult = await this.preflightCheck(requestContext, identifier);
            if (!preflightResult.allowed) {
                return preflightResult;
            }

            // Check system load
            const systemCheck = this.checkSystemLoad(requestContext);
            if (!systemCheck.allowed) {
                return systemCheck;
            }

            // Check rate limits
            const rateLimitResult = this.checkUserRateLimit(identifier, requestContext);
            if (!rateLimitResult.allowed) {
                return rateLimitResult;
            }

            // Check burst limits
            const burstResult = this.checkBurstLimit(identifier, requestContext);
            if (!burstResult.allowed) {
                return burstResult;
            }

            // Check concurrent request limits
            const concurrencyResult = this.checkConcurrencyLimit(requestContext);
            if (!concurrencyResult.allowed) {
                return this.queueRequest(requestContext, priority);
            }

            // Request approved
            return this.approveRequest(requestContext, identifier);

        } catch (error) {
            console.error('Rate limit check error:', error);
            return {
                allowed: false,
                reason: 'system_error',
                retryAfter: 60000 // 1 minute default retry
            };
        }
    }

    async completeRequest(requestId, requestContext) {
        // Remove from active requests
        this.activeRequests.delete(requestId);

        // Update metrics
        this.metrics.completedRequests++;

        // Process queued requests
        await this.processQueue();

        // Update request patterns for adaptive learning
        if (this.config.adaptiveThrottling) {
            this.updateRequestPattern(requestContext);
        }

        // Emit completion event
        this.emit('request_completed', { requestId, timestamp: Date.now() });
    }

    // ==================== RATE LIMIT CHECKING ====================

    checkUserRateLimit(identifier, requestContext) {
        const now = Date.now();
        const windowSize = 60000; // 1 minute window

        // Get or create rate limit entry
        if (!this.rateLimits.has(identifier)) {
            this.rateLimits.set(identifier, {
                requests: [],
                tier: this.getUserTier(identifier),
                adaptiveFactor: 1.0
            });
        }

        const rateLimitData = this.rateLimits.get(identifier);

        // Clean old requests outside window
        rateLimitData.requests = rateLimitData.requests.filter(
            timestamp => now - timestamp < windowSize
        );

        // Calculate effective rate limit
        const baseLimit = this.getTierRateLimit(rateLimitData.tier);
        const adaptiveLimit = Math.floor(baseLimit * rateLimitData.adaptiveFactor);
        const systemLoadFactor = this.getSystemLoadFactor();
        const effectiveLimit = Math.floor(adaptiveLimit * systemLoadFactor);

        // Check if within limits
        if (rateLimitData.requests.length >= effectiveLimit) {
            this.metrics.throttledRequests++;

            // Calculate retry after
            const oldestRequest = Math.min(...rateLimitData.requests);
            const retryAfter = windowSize - (now - oldestRequest);

            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                retryAfter,
                currentCount: rateLimitData.requests.length,
                limit: effectiveLimit,
                resetTime: oldestRequest + windowSize
            };
        }

        // Record request
        rateLimitData.requests.push(now);
        this.metrics.totalRequests++;

        return { allowed: true };
    }

    checkBurstLimit(identifier, requestContext) {
        const now = Date.now();
        const burstWindow = this.config.burstWindow;

        if (!this.burstLimits.has(identifier)) {
            this.burstLimits.set(identifier, {
                requests: [],
                violations: 0,
                lastViolation: 0
            });
        }

        const burstData = this.burstLimits.get(identifier);

        // Clean old burst requests
        burstData.requests = burstData.requests.filter(
            timestamp => now - timestamp < burstWindow
        );

        // Check burst allowance
        const userTier = this.getUserTier(identifier);
        const burstAllowance = this.getTierBurstAllowance(userTier);

        if (burstData.requests.length >= burstAllowance) {
            // Calculate progressive penalty for repeat violators
            const penalty = this.calculateBurstPenalty(burstData);

            burstData.violations++;
            burstData.lastViolation = now;

            return {
                allowed: false,
                reason: 'burst_limit_exceeded',
                retryAfter: burstWindow + penalty,
                burstCount: burstData.requests.length,
                burstLimit: burstAllowance
            };
        }

        // Record burst request
        burstData.requests.push(now);
        this.metrics.burstRequests++;

        return { allowed: true };
    }

    checkConcurrencyLimit(requestContext) {
        const activeCount = this.activeRequests.size;
        const maxConcurrent = this.getEffectiveMaxConcurrency();

        if (activeCount >= maxConcurrent) {
            return {
                allowed: false,
                reason: 'concurrency_limit_exceeded',
                activeRequests: activeCount,
                maxConcurrent,
                shouldQueue: true
            };
        }

        return { allowed: true };
    }

    checkSystemLoad(requestContext) {
        if (!this.config.systemLoadAware) {
            return { allowed: true };
        }

        const loadScore = this.calculateSystemLoadScore();

        // Reject requests if system is overloaded
        if (loadScore > 0.9) {
            this.metrics.systemOverloadEvents++;

            return {
                allowed: false,
                reason: 'system_overloaded',
                loadScore,
                retryAfter: this.calculateOverloadRetryDelay(loadScore)
            };
        }

        // Apply graduated throttling based on load
        if (loadScore > 0.7) {
            const throttleFactor = 1 - ((loadScore - 0.7) * 2); // Reduce capacity by up to 40%

            // Probabilistic throttling
            if (Math.random() > throttleFactor) {
                return {
                    allowed: false,
                    reason: 'load_based_throttling',
                    loadScore,
                    retryAfter: 5000 + Math.random() * 10000 // 5-15 second retry
                };
            }
        }

        return { allowed: true };
    }

    preflightCheck(requestContext, identifier) {
        // Check if user is in backoff
        if (this.backoffTimers.has(identifier)) {
            const backoffData = this.backoffTimers.get(identifier);
            const now = Date.now();

            if (now < backoffData.releaseTime) {
                return {
                    allowed: false,
                    reason: 'backoff_period',
                    retryAfter: backoffData.releaseTime - now,
                    backoffLevel: backoffData.level
                };
            } else {
                // Backoff period expired
                this.backoffTimers.delete(identifier);
            }
        }

        // Check for blocked users/IPs (could be integrated with security system)
        if (this.isBlocked(identifier)) {
            return {
                allowed: false,
                reason: 'blocked',
                permanent: true
            };
        }

        return { allowed: true };
    }

    // ==================== REQUEST QUEUING SYSTEM ====================

    async queueRequest(requestContext, priority) {
        if (!this.config.priorityQueuing) {
            return {
                allowed: false,
                reason: 'concurrency_limit_exceeded',
                retryAfter: 5000
            };
        }

        const requestId = this.generateRequestId();
        const queueEntry = {
            id: requestId,
            context: requestContext,
            priority,
            timestamp: Date.now(),
            timeoutHandler: null
        };

        // Add to appropriate priority queue
        if (!this.requestQueues.has(priority)) {
            this.requestQueues.set(priority, []);
        }

        const queue = this.requestQueues.get(priority);
        queue.push(queueEntry);

        // Sort queue by priority (higher priority first)
        queue.sort((a, b) => b.priority - a.priority);

        // Set timeout for queued request
        queueEntry.timeoutHandler = setTimeout(() => {
            this.timeoutQueuedRequest(requestId);
        }, this.config.queueTimeout);

        this.metrics.queuedRequests++;

        return new Promise((resolve) => {
            queueEntry.resolve = resolve;
        });
    }

    async processQueue() {
        while (this.activeRequests.size < this.getEffectiveMaxConcurrency()) {
            const nextRequest = this.getNextQueuedRequest();

            if (!nextRequest) {
                break; // No queued requests
            }

            // Remove from queue
            this.removeFromQueue(nextRequest);

            // Clear timeout
            if (nextRequest.timeoutHandler) {
                clearTimeout(nextRequest.timeoutHandler);
            }

            // Calculate wait time
            const waitTime = Date.now() - nextRequest.timestamp;
            this.updateAverageWaitTime(waitTime);

            // Approve request
            const approval = this.approveRequest(nextRequest.context,
                this.getRequestIdentifier(nextRequest.context));

            // Resolve the promise
            if (nextRequest.resolve) {
                nextRequest.resolve(approval);
            }
        }
    }

    getNextQueuedRequest() {
        // Find highest priority queue with requests
        const priorities = Array.from(this.requestQueues.keys()).sort((a, b) => b - a);

        for (const priority of priorities) {
            const queue = this.requestQueues.get(priority);
            if (queue.length > 0) {
                return queue[0];
            }
        }

        return null;
    }

    removeFromQueue(request) {
        for (const [priority, queue] of this.requestQueues) {
            const index = queue.findIndex(r => r.id === request.id);
            if (index !== -1) {
                queue.splice(index, 1);
                break;
            }
        }
    }

    timeoutQueuedRequest(requestId) {
        // Find and remove timed out request
        for (const [priority, queue] of this.requestQueues) {
            const index = queue.findIndex(r => r.id === requestId);
            if (index !== -1) {
                const request = queue.splice(index, 1)[0];

                this.metrics.timeoutRequests++;

                if (request.resolve) {
                    request.resolve({
                        allowed: false,
                        reason: 'queue_timeout',
                        retryAfter: 10000 // 10 second retry
                    });
                }
                break;
            }
        }
    }

    // ==================== ADAPTIVE INTELLIGENCE ====================

    updateRequestPattern(requestContext) {
        const identifier = this.getRequestIdentifier(requestContext);
        const endpoint = requestContext.endpoint || 'unknown';
        const patternKey = `${identifier}:${endpoint}`;

        if (!this.requestPatterns.has(patternKey)) {
            this.requestPatterns.set(patternKey, {
                count: 0,
                avgResponseTime: 0,
                errorRate: 0,
                lastSeen: Date.now(),
                successStreak: 0,
                errorStreak: 0
            });
        }

        const pattern = this.requestPatterns.get(patternKey);
        pattern.count++;
        pattern.lastSeen = Date.now();

        if (requestContext.success) {
            pattern.successStreak++;
            pattern.errorStreak = 0;
        } else {
            pattern.errorStreak++;
            pattern.successStreak = 0;
            pattern.errorRate = (pattern.errorRate * 0.9) + (1 * 0.1); // Exponential moving average
        }

        // Update response time
        if (requestContext.responseTime) {
            pattern.avgResponseTime = (pattern.avgResponseTime * 0.9) + (requestContext.responseTime * 0.1);
        }

        // Adjust adaptive factors
        this.adjustAdaptiveFactors(identifier, pattern);
    }

    adjustAdaptiveFactors(identifier, pattern) {
        if (!this.adaptiveFactors.has(identifier)) {
            this.adaptiveFactors.set(identifier, 1.0);
        }

        let currentFactor = this.adaptiveFactors.get(identifier);

        // Reward good behavior
        if (pattern.successStreak > 20 && pattern.errorRate < 0.01) {
            currentFactor = Math.min(currentFactor * 1.1, 2.0); // Max 2x increase
        }

        // Penalize bad behavior
        if (pattern.errorStreak > 5 || pattern.errorRate > 0.1) {
            currentFactor = Math.max(currentFactor * 0.8, 0.1); // Min 0.1x (90% reduction)
        }

        // Adjust based on response time (slower responses get lower limits)
        if (pattern.avgResponseTime > 2000) {
            currentFactor = Math.max(currentFactor * 0.9, 0.5);
        }

        this.adaptiveFactors.set(identifier, currentFactor);

        // Update user's rate limit data
        if (this.rateLimits.has(identifier)) {
            this.rateLimits.get(identifier).adaptiveFactor = currentFactor;
        }
    }

    // ==================== SYSTEM MONITORING ====================

    setupSystemMonitoring() {
        if (!this.config.systemLoadAware) return;

        setInterval(() => {
            this.updateSystemMetrics();
        }, 5000); // Update every 5 seconds
    }

    updateSystemMetrics() {
        // Get system metrics
        const memUsage = process.memoryUsage();
        this.systemMetrics.memory = memUsage.heapUsed / memUsage.heapTotal;

        // CPU usage (simplified - in production, use proper CPU monitoring)
        this.systemMetrics.cpu = Math.min(this.activeRequests.size / this.config.maxConcurrentRequests, 1.0);

        // Calculate load score
        const loadScore = this.calculateSystemLoadScore();

        // Emit system load event if high
        if (loadScore > 0.8) {
            this.emit('high_system_load', {
                loadScore,
                metrics: this.systemMetrics,
                timestamp: Date.now()
            });
        }
    }

    calculateSystemLoadScore() {
        const weights = {
            cpu: 0.4,
            memory: 0.3,
            responseTime: 0.2,
            errorRate: 0.1
        };

        return (
            this.systemMetrics.cpu * weights.cpu +
            this.systemMetrics.memory * weights.memory +
            Math.min(this.systemMetrics.responseTime / 2000, 1.0) * weights.responseTime +
            Math.min(this.systemMetrics.errorRate * 10, 1.0) * weights.errorRate
        );
    }

    getSystemLoadFactor() {
        const loadScore = this.calculateSystemLoadScore();

        if (loadScore < 0.5) return 1.0;      // Normal operation
        if (loadScore < 0.7) return 0.8;      // Slight reduction
        if (loadScore < 0.9) return 0.6;      // Significant reduction
        return 0.3;                           // Emergency mode
    }

    // ==================== USER TIER MANAGEMENT ====================

    initializeTierLimits() {
        // Define different user tiers and their limits
        this.tierLimits.set('free', {
            rateLimit: 50,           // requests per minute
            burstAllowance: 10,      // burst requests
            priority: 1,             // lowest priority
            maxConcurrent: 5
        });

        this.tierLimits.set('premium', {
            rateLimit: 200,
            burstAllowance: 30,
            priority: 3,             // high priority
            maxConcurrent: 20
        });

        this.tierLimits.set('enterprise', {
            rateLimit: 1000,
            burstAllowance: 100,
            priority: 5,             // highest priority
            maxConcurrent: 100
        });

        this.tierLimits.set('admin', {
            rateLimit: Number.MAX_SAFE_INTEGER,
            burstAllowance: Number.MAX_SAFE_INTEGER,
            priority: 10,            // admin priority
            maxConcurrent: Number.MAX_SAFE_INTEGER
        });
    }

    getUserTier(identifier) {
        return this.userTiers.get(identifier) || 'free';
    }

    setUserTier(identifier, tier) {
        this.userTiers.set(identifier, tier);
    }

    getTierRateLimit(tier) {
        const tierConfig = this.tierLimits.get(tier);
        return tierConfig ? tierConfig.rateLimit : this.config.defaultRateLimit;
    }

    getTierBurstAllowance(tier) {
        const tierConfig = this.tierLimits.get(tier);
        return tierConfig ? tierConfig.burstAllowance : this.config.burstAllowance;
    }

    getTierPriority(tier) {
        const tierConfig = this.tierLimits.get(tier);
        return tierConfig ? tierConfig.priority : 1;
    }

    // ==================== UTILITY FUNCTIONS ====================

    getRequestIdentifier(requestContext) {
        // Use user ID if available, otherwise fall back to IP
        return requestContext.userId ||
               requestContext.sessionId ||
               requestContext.ip ||
               'anonymous';
    }

    calculateRequestPriority(requestContext) {
        const identifier = this.getRequestIdentifier(requestContext);
        const userTier = this.getUserTier(identifier);
        let priority = this.getTierPriority(userTier);

        // Adjust priority based on request type
        if (requestContext.critical) priority += 5;
        if (requestContext.readonly) priority -= 1;
        if (requestContext.batch) priority -= 2;

        return Math.max(priority, 0);
    }

    approveRequest(requestContext, identifier) {
        const requestId = this.generateRequestId();
        this.activeRequests.add(requestId);

        return {
            allowed: true,
            requestId,
            identifier,
            timestamp: Date.now()
        };
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    getEffectiveMaxConcurrency() {
        const systemLoadFactor = this.getSystemLoadFactor();
        return Math.floor(this.config.maxConcurrentRequests * systemLoadFactor);
    }

    calculateBurstPenalty(burstData) {
        // Progressive penalty for repeat burst violators
        const violationCount = burstData.violations;
        const baseDelay = 5000; // 5 seconds

        return Math.min(
            baseDelay * Math.pow(this.config.backoffMultiplier, violationCount - 1),
            this.config.maxBackoffDelay
        );
    }

    calculateOverloadRetryDelay(loadScore) {
        // Exponential backoff based on load score
        const baseDelay = 10000; // 10 seconds
        const loadFactor = Math.pow((loadScore - 0.7) * 3.33, 2); // Scale 0.7-1.0 to 0-1
        return Math.min(baseDelay * (1 + loadFactor * 5), 60000); // Max 1 minute
    }

    isBlocked(identifier) {
        // Placeholder for security integration
        // In production, this would check against a security blacklist
        return false;
    }

    updateAverageWaitTime(waitTime) {
        const total = this.metrics.queuedRequests;
        const current = this.metrics.averageWaitTime;
        this.metrics.averageWaitTime = ((current * (total - 1)) + waitTime) / total;
    }

    // ==================== BACKOFF MANAGEMENT ====================

    applyBackoff(identifier, reason = 'rate_limit') {
        if (!this.backoffTimers.has(identifier)) {
            this.backoffTimers.set(identifier, {
                level: 0,
                reason,
                firstViolation: Date.now()
            });
        }

        const backoffData = this.backoffTimers.get(identifier);
        backoffData.level++;

        const delay = Math.min(
            1000 * Math.pow(this.config.backoffMultiplier, backoffData.level - 1),
            this.config.maxBackoffDelay
        );

        backoffData.releaseTime = Date.now() + delay;

        console.log(`⏸️ Applied backoff to ${identifier}: level ${backoffData.level}, delay ${delay}ms`);
    }

    // ==================== MONITORING AND ANALYTICS ====================

    initializePriorityQueues() {
        // Initialize priority queues
        for (let priority = 0; priority <= 10; priority++) {
            this.requestQueues.set(priority, []);
        }
    }

    setupAdaptiveAnalysis() {
        if (!this.config.adaptiveThrottling) return;

        // Analyze patterns every 5 minutes
        setInterval(() => {
            this.analyzeRequestPatterns();
        }, 5 * 60 * 1000);

        // Clean old patterns every hour
        setInterval(() => {
            this.cleanOldPatterns();
        }, 60 * 60 * 1000);
    }

    analyzeRequestPatterns() {
        console.log('📊 Analyzing request patterns for adaptive optimization...');

        let adaptiveAdjustments = 0;

        for (const [key, pattern] of this.requestPatterns) {
            const [identifier] = key.split(':');

            // Skip if pattern is too new (less than 10 requests)
            if (pattern.count < 10) continue;

            // Analyze behavior trends
            const isWellBehaved = pattern.successStreak > 50 && pattern.errorRate < 0.01;
            const isPoorlyBehaved = pattern.errorStreak > 10 || pattern.errorRate > 0.2;

            if (isWellBehaved || isPoorlyBehaved) {
                this.adjustAdaptiveFactors(identifier, pattern);
                adaptiveAdjustments++;
            }
        }

        if (adaptiveAdjustments > 0) {
            console.log(`🎯 Made ${adaptiveAdjustments} adaptive rate limit adjustments`);
        }
    }

    cleanOldPatterns() {
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        let cleaned = 0;

        for (const [key, pattern] of this.requestPatterns) {
            if (pattern.lastSeen < cutoffTime) {
                this.requestPatterns.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old request patterns`);
        }
    }

    getMetrics() {
        const throttleRate = this.metrics.totalRequests > 0 ?
            (this.metrics.throttledRequests / this.metrics.totalRequests * 100).toFixed(2) : 0;

        return {
            ...this.metrics,
            throttleRate: parseFloat(throttleRate),
            queueSizes: this.getQueueSizes(),
            activeRequests: this.activeRequests.size,
            systemLoad: this.calculateSystemLoadScore().toFixed(3),
            adaptiveFactorsCount: this.adaptiveFactors.size,
            backoffUsersCount: this.backoffTimers.size,
            avgWaitTime: Math.round(this.metrics.averageWaitTime)
        };
    }

    getQueueSizes() {
        const sizes = {};
        for (const [priority, queue] of this.requestQueues) {
            if (queue.length > 0) {
                sizes[`priority_${priority}`] = queue.length;
            }
        }
        return sizes;
    }

    healthCheck() {
        const metrics = this.getMetrics();
        const throttleRate = parseFloat(metrics.throttleRate);
        const systemLoad = parseFloat(metrics.systemLoad);

        let status = 'healthy';
        if (systemLoad > 0.8 || throttleRate > 50) status = 'degraded';
        if (systemLoad > 0.9 || throttleRate > 80) status = 'unhealthy';

        return {
            status,
            throttleRate: `${throttleRate}%`,
            systemLoad: `${(systemLoad * 100).toFixed(1)}%`,
            activeRequests: metrics.activeRequests,
            queuedRequests: Object.values(metrics.queueSizes).reduce((sum, count) => sum + count, 0),
            recommendations: this.generateHealthRecommendations(metrics)
        };
    }

    generateHealthRecommendations(metrics) {
        const recommendations = [];
        const throttleRate = parseFloat(metrics.throttleRate);
        const systemLoad = parseFloat(metrics.systemLoad);

        if (throttleRate > 30) {
            recommendations.push('High throttle rate - consider increasing rate limits or system capacity');
        }

        if (systemLoad > 0.7) {
            recommendations.push('High system load - monitor resource usage');
        }

        if (metrics.avgWaitTime > 10000) {
            recommendations.push('High average wait time in queues - consider priority adjustments');
        }

        if (metrics.backoffUsersCount > 100) {
            recommendations.push('Many users in backoff - review rate limit thresholds');
        }

        return recommendations;
    }

    // ==================== PERSISTENCE ====================

    async loadPersistedData() {
        if (!this.config.enablePersistence) return;

        try {
            if (fs.existsSync(this.config.persistenceFile)) {
                const data = JSON.parse(fs.readFileSync(this.config.persistenceFile, 'utf8'));

                if (data.userTiers) {
                    data.userTiers.forEach(([id, tier]) => {
                        this.userTiers.set(id, tier);
                    });
                }

                if (data.adaptiveFactors) {
                    data.adaptiveFactors.forEach(([id, factor]) => {
                        this.adaptiveFactors.set(id, factor);
                    });
                }

                if (data.metrics) {
                    this.metrics = { ...this.metrics, ...data.metrics };
                }

                console.log(`📥 Loaded throttling data for ${this.userTiers.size} users`);
            }
        } catch (error) {
            console.error('Failed to load throttling data:', error);
        }
    }

    async persistData() {
        if (!this.config.enablePersistence) return;

        try {
            const data = {
                userTiers: Array.from(this.userTiers.entries()),
                adaptiveFactors: Array.from(this.adaptiveFactors.entries()),
                metrics: this.metrics,
                timestamp: Date.now()
            };

            const dir = path.dirname(this.config.persistenceFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.config.persistenceFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to persist throttling data:', error);
        }
    }

    // ==================== MIDDLEWARE INTERFACE ====================

    middleware() {
        return async (req, res, next) => {
            const requestContext = {
                userId: req.user?.id,
                sessionId: req.sessionID,
                ip: req.ip || req.connection.remoteAddress,
                endpoint: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                critical: req.headers['x-priority'] === 'critical',
                readonly: req.method === 'GET',
                batch: req.headers['x-batch-request'] === 'true'
            };

            const startTime = Date.now();

            try {
                const result = await this.checkRateLimit(requestContext);

                if (!result.allowed) {
                    // Set rate limit headers
                    res.set({
                        'X-RateLimit-Limit': result.limit || 'N/A',
                        'X-RateLimit-Remaining': result.limit ? Math.max(0, result.limit - (result.currentCount || 0)) : 'N/A',
                        'X-RateLimit-Reset': result.resetTime || Date.now() + 60000,
                        'Retry-After': Math.ceil((result.retryAfter || 60000) / 1000)
                    });

                    const statusCode = result.reason === 'system_overloaded' ? 503 :
                                     result.reason === 'blocked' ? 403 : 429;

                    return res.status(statusCode).json({
                        error: 'Rate limit exceeded',
                        reason: result.reason,
                        retryAfter: result.retryAfter,
                        message: this.getThrottleMessage(result.reason)
                    });
                }

                // Request approved
                req.throttleData = {
                    requestId: result.requestId,
                    identifier: result.identifier,
                    startTime
                };

                // Override res.end to track completion
                const originalEnd = res.end;
                res.end = (...args) => {
                    const responseTime = Date.now() - startTime;
                    const success = res.statusCode < 400;

                    this.completeRequest(result.requestId, {
                        ...requestContext,
                        responseTime,
                        success,
                        statusCode: res.statusCode
                    });

                    return originalEnd.apply(res, args);
                };

                next();

            } catch (error) {
                console.error('Throttling middleware error:', error);
                next(); // Allow request through on error
            }
        };
    }

    getThrottleMessage(reason) {
        const messages = {
            'rate_limit_exceeded': 'Too many requests. Please slow down and try again later.',
            'burst_limit_exceeded': 'Request burst detected. Please wait before sending more requests.',
            'concurrency_limit_exceeded': 'Server is busy processing other requests. Please try again.',
            'system_overloaded': 'System is temporarily overloaded. Please try again later.',
            'backoff_period': 'Account is temporarily restricted due to excessive requests.',
            'blocked': 'Access denied.',
            'queue_timeout': 'Request queued too long and timed out.'
        };

        return messages[reason] || 'Request throttled. Please try again later.';
    }
}

module.exports = IntelligentThrottlingSystem;