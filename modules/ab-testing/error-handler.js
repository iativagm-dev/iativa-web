/**
 * Error Handler and Fallback Mechanisms for A/B Testing System
 * Provides comprehensive error handling, circuit breaker patterns, and graceful degradation
 */

const fs = require('fs');
const path = require('path');

class ErrorHandler {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(__dirname, '../../data');
        this.errorLogFile = path.join(this.dataDir, 'ab-testing-errors.json');
        this.metricsFile = path.join(this.dataDir, 'error-metrics.json');

        // Circuit breaker configuration
        this.circuitBreakers = new Map();
        this.circuitBreakerDefaults = {
            failureThreshold: 5,
            resetTimeout: 60000, // 1 minute
            monitoringPeriod: 300000 // 5 minutes
        };

        // Retry configuration
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2
        };

        // Fallback data
        this.fallbackData = {
            userSegment: 'regular',
            featureFlags: {
                businessClassification: { enabled: false, variant: 'basic' },
                intelligentCosting: { enabled: true, variant: 'basic' },
                adaptiveQuestions: { enabled: false, variant: 'none' },
                intelligentValidation: { enabled: true, variant: 'standard' },
                advancedRecommendations: { enabled: false, variant: 'none' }
            },
            defaultRecommendations: [
                {
                    text: 'Mantén un control detallado de tus gastos',
                    priority: 'high',
                    impact: 'Mejora la visibilidad financiera'
                }
            ]
        };

        this.ensureDataDirectory();
        this.initializeErrorTracking();

        console.log('🛡️ Error Handler initialized with fallback mechanisms');
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    initializeErrorTracking() {
        if (!fs.existsSync(this.errorLogFile)) {
            fs.writeFileSync(this.errorLogFile, JSON.stringify([], null, 2));
        }

        if (!fs.existsSync(this.metricsFile)) {
            fs.writeFileSync(this.metricsFile, JSON.stringify({
                totalErrors: 0,
                errorsByType: {},
                errorsByService: {},
                lastReset: new Date().toISOString()
            }, null, 2));
        }
    }

    // ==================== CIRCUIT BREAKER PATTERN ====================

    getCircuitBreaker(serviceName, config = {}) {
        const finalConfig = { ...this.circuitBreakerDefaults, ...config };

        if (!this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.set(serviceName, {
                state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                failures: 0,
                lastFailure: null,
                lastSuccess: null,
                config: finalConfig
            });
        }

        return this.circuitBreakers.get(serviceName);
    }

    async executeWithCircuitBreaker(serviceName, operation, fallbackFn = null, config = {}) {
        const breaker = this.getCircuitBreaker(serviceName, config);

        // Check if circuit is open
        if (breaker.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - breaker.lastFailure;
            if (timeSinceLastFailure < breaker.config.resetTimeout) {
                console.warn(`🔴 Circuit breaker OPEN for ${serviceName}, using fallback`);
                return this.handleFallback(serviceName, fallbackFn, new Error('Circuit breaker open'));
            } else {
                // Try to half-open the circuit
                breaker.state = 'HALF_OPEN';
                console.log(`🟡 Circuit breaker HALF_OPEN for ${serviceName}, attempting recovery`);
            }
        }

        try {
            const result = await operation();

            // Success - close circuit if it was half-open
            if (breaker.state === 'HALF_OPEN') {
                breaker.state = 'CLOSED';
                breaker.failures = 0;
                console.log(`🟢 Circuit breaker CLOSED for ${serviceName}, service recovered`);
            }

            breaker.lastSuccess = Date.now();
            return result;

        } catch (error) {
            breaker.failures++;
            breaker.lastFailure = Date.now();

            // Open circuit if threshold is reached
            if (breaker.failures >= breaker.config.failureThreshold) {
                breaker.state = 'OPEN';
                console.error(`🔴 Circuit breaker OPEN for ${serviceName} after ${breaker.failures} failures`);
            }

            this.logError('circuit_breaker_failure', error, {
                serviceName,
                failures: breaker.failures,
                state: breaker.state
            });

            return this.handleFallback(serviceName, fallbackFn, error);
        }
    }

    // ==================== RETRY MECHANISM ====================

    async executeWithRetry(operation, options = {}) {
        const config = { ...this.retryConfig, ...options };
        let lastError;

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt === config.maxRetries) {
                    this.logError('retry_exhausted', error, {
                        attempts: attempt + 1,
                        maxRetries: config.maxRetries
                    });
                    throw error;
                }

                // Calculate delay for next attempt
                const delay = Math.min(
                    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
                    config.maxDelay
                );

                console.warn(`⚠️ Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, error.message);

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }

    // ==================== FALLBACK MECHANISMS ====================

    handleFallback(serviceName, fallbackFn, error) {
        console.warn(`🔄 Using fallback for ${serviceName}:`, error.message);

        if (fallbackFn && typeof fallbackFn === 'function') {
            try {
                return fallbackFn(error);
            } catch (fallbackError) {
                console.error('Fallback function failed:', fallbackError);
                return this.getDefaultFallback(serviceName);
            }
        }

        return this.getDefaultFallback(serviceName);
    }

    getDefaultFallback(serviceName) {
        const fallbacks = {
            userSegmentation: () => this.fallbackData.userSegment,
            featureFlags: (flagName) => this.fallbackData.featureFlags[flagName] || { enabled: false, variant: 'none' },
            businessClassification: () => ({
                industry: 'general',
                confidence: 0.0,
                businessType: 'general',
                fallback: true
            }),
            costValidation: () => ({
                type: 'info',
                message: 'Validación no disponible temporalmente',
                suggestion: 'Revisa este costo manualmente',
                fallback: true
            }),
            recommendations: () => this.fallbackData.defaultRecommendations,
            analytics: () => ({
                engagement: { sessions: 0, avgDuration: 0 },
                performance: { avgResponseTime: 0, errorRate: 0.1, uptime: 95 },
                funnel: { steps: [] },
                fallback: true
            })
        };

        const fallbackFn = fallbacks[serviceName];
        return fallbackFn ? fallbackFn() : { fallback: true, error: 'No fallback available' };
    }

    // ==================== ERROR LOGGING ====================

    logError(type, error, context = {}) {
        const errorEntry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            type,
            message: error.message,
            stack: error.stack,
            context,
            severity: this.getSeverity(type),
            resolved: false
        };

        try {
            // Read existing errors
            let errors = [];
            if (fs.existsSync(this.errorLogFile)) {
                errors = JSON.parse(fs.readFileSync(this.errorLogFile, 'utf8'));
            }

            // Add new error
            errors.push(errorEntry);

            // Keep only recent errors (last 1000)
            if (errors.length > 1000) {
                errors = errors.slice(-1000);
            }

            // Save errors
            fs.writeFileSync(this.errorLogFile, JSON.stringify(errors, null, 2));

            // Update error metrics
            this.updateErrorMetrics(type);

            console.error(`❌ [${type}] ${error.message}`, context);

        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        // Trigger alerts for critical errors
        if (errorEntry.severity === 'critical') {
            this.triggerAlert(errorEntry);
        }
    }

    getSeverity(errorType) {
        const severityMap = {
            circuit_breaker_failure: 'high',
            retry_exhausted: 'high',
            data_corruption: 'critical',
            auth_failure: 'high',
            network_error: 'medium',
            validation_error: 'low',
            fallback_used: 'medium'
        };

        return severityMap[errorType] || 'medium';
    }

    updateErrorMetrics(errorType) {
        try {
            let metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));

            metrics.totalErrors++;
            metrics.errorsByType[errorType] = (metrics.errorsByType[errorType] || 0) + 1;
            metrics.lastUpdated = new Date().toISOString();

            fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));

        } catch (error) {
            console.error('Failed to update error metrics:', error);
        }
    }

    // ==================== HEALTH MONITORING ====================

    getHealthStatus() {
        try {
            const errors = JSON.parse(fs.readFileSync(this.errorLogFile, 'utf8'));
            const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));

            // Count recent errors (last hour)
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const recentErrors = errors.filter(error =>
                new Date(error.timestamp).getTime() > oneHourAgo
            );

            // Check circuit breaker states
            const openCircuits = Array.from(this.circuitBreakers.entries())
                .filter(([name, breaker]) => breaker.state === 'OPEN');

            const status = {
                overall: 'healthy',
                timestamp: new Date().toISOString(),
                errors: {
                    total: metrics.totalErrors,
                    recentCount: recentErrors.length,
                    types: metrics.errorsByType
                },
                circuitBreakers: {
                    total: this.circuitBreakers.size,
                    open: openCircuits.length,
                    openCircuits: openCircuits.map(([name, breaker]) => ({
                        name,
                        failures: breaker.failures,
                        lastFailure: breaker.lastFailure
                    }))
                },
                fallbacks: {
                    available: Object.keys(this.fallbackData.featureFlags).length,
                    active: recentErrors.filter(e => e.context.fallback).length
                }
            };

            // Determine overall health
            if (openCircuits.length > 2 || recentErrors.length > 10) {
                status.overall = 'degraded';
            }

            if (openCircuits.length > 5 || recentErrors.length > 50) {
                status.overall = 'unhealthy';
            }

            return status;

        } catch (error) {
            console.error('Error getting health status:', error);
            return {
                overall: 'unknown',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // ==================== ALERT SYSTEM ====================

    triggerAlert(errorEntry) {
        console.error(`🚨 CRITICAL ALERT: ${errorEntry.type} - ${errorEntry.message}`);

        // In production, this would send alerts to monitoring systems
        // like Slack, email, or monitoring dashboards
        const alert = {
            timestamp: new Date().toISOString(),
            level: 'CRITICAL',
            service: 'ab-testing',
            error: errorEntry,
            actions: [
                'Check system logs',
                'Verify fallback mechanisms',
                'Monitor user impact'
            ]
        };

        console.error('📧 Alert details:', JSON.stringify(alert, null, 2));
    }

    // ==================== RECOVERY OPERATIONS ====================

    async recoverService(serviceName) {
        console.log(`🔧 Attempting to recover service: ${serviceName}`);

        const breaker = this.circuitBreakers.get(serviceName);
        if (breaker) {
            // Reset circuit breaker
            breaker.state = 'CLOSED';
            breaker.failures = 0;
            breaker.lastFailure = null;

            console.log(`✅ Circuit breaker reset for ${serviceName}`);
        }

        // Log recovery attempt
        this.logError('service_recovery_attempt', new Error(`Recovery initiated for ${serviceName}`), {
            serviceName,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    async resetAllCircuitBreakers() {
        console.log('🔄 Resetting all circuit breakers...');

        for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
            breaker.state = 'CLOSED';
            breaker.failures = 0;
            breaker.lastFailure = null;
            console.log(`✅ Reset circuit breaker: ${serviceName}`);
        }

        return this.circuitBreakers.size;
    }

    // ==================== UTILITIES ====================

    clearErrorLog() {
        try {
            fs.writeFileSync(this.errorLogFile, JSON.stringify([], null, 2));
            console.log('🗑️ Error log cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear error log:', error);
            return false;
        }
    }

    exportErrorReport() {
        try {
            const errors = JSON.parse(fs.readFileSync(this.errorLogFile, 'utf8'));
            const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));

            const report = {
                generatedAt: new Date().toISOString(),
                summary: metrics,
                recentErrors: errors.slice(-100), // Last 100 errors
                circuitBreakerStatus: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
                    name,
                    state: breaker.state,
                    failures: breaker.failures,
                    lastFailure: breaker.lastFailure,
                    lastSuccess: breaker.lastSuccess
                }))
            };

            return report;

        } catch (error) {
            console.error('Failed to export error report:', error);
            return null;
        }
    }
}

module.exports = ErrorHandler;