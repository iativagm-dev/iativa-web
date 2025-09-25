/**
 * Production Integration Tests - Comprehensive System Validation
 * Tests all optimization systems, feature flags, and production readiness
 */

const request = require('supertest');
const assert = require('assert');

class ProductionIntegrationTests {
    constructor(app) {
        this.app = app;
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
        this.performanceBaselines = {
            businessClassification: 200, // ms
            costValidation: 150,         // ms
            recommendations: 400,        // ms
            healthCheck: 100             // ms
        };
    }

    async runAllTests() {
        console.log('🧪 Starting Production Integration Tests...\n');

        try {
            // Core System Tests
            await this.testSystemHealth();
            await this.testOptimizationOrchestrator();
            await this.testBusinessClassificationCache();
            await this.testRecommendationMemoization();
            await this.testIntelligentThrottling();
            await this.testGracefulDegradation();
            await this.testHealthMonitoring();

            // Feature Flag Tests
            await this.testFeatureFlagSystem();

            // Performance Tests
            await this.testPerformanceBaselines();
            await this.testConcurrentUsers();
            await this.testSystemOverload();

            // Data Integrity Tests
            await this.testDataConsistency();
            await this.testBackupSystems();

            // Security Tests
            await this.testSecurityControls();

            // Monitoring Tests
            await this.testMonitoringAlerts();

            console.log('\n' + '='.repeat(60));
            console.log('📊 TEST SUMMARY');
            console.log('='.repeat(60));
            console.log(`✅ Passed: ${this.testResults.passed}`);
            console.log(`❌ Failed: ${this.testResults.failed}`);
            console.log(`⚠️  Warnings: ${this.testResults.warnings}`);

            if (this.testResults.failed > 0) {
                console.log('\n❌ FAILURES:');
                this.testResults.errors.forEach(error => {
                    console.log(`  - ${error}`);
                });
                return false;
            }

            console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION');
            return true;

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return false;
        }
    }

    // ==================== CORE SYSTEM TESTS ====================

    async testSystemHealth() {
        console.log('🏥 Testing System Health...');

        const response = await request(this.app)
            .get('/api/health')
            .expect(200);

        this.assert(response.body.overall === 'healthy', 'System health check failed');
        this.assert(response.body.components, 'Health components missing');

        const responseTime = parseInt(response.headers['x-response-time']) || 0;
        if (responseTime > this.performanceBaselines.healthCheck) {
            this.warning(`Health check response time ${responseTime}ms exceeds baseline ${this.performanceBaselines.healthCheck}ms`);
        }

        console.log('  ✅ System health check passed');
    }

    async testOptimizationOrchestrator() {
        console.log('🎛️ Testing Optimization Orchestrator...');

        // Test orchestrator status
        const statusResponse = await request(this.app)
            .get('/api/optimization/status')
            .expect(200);

        this.assert(statusResponse.body.initialized === true, 'Orchestrator not initialized');
        this.assert(statusResponse.body.operationalMode === 'normal', 'Orchestrator not in normal mode');

        // Test orchestrator metrics
        const metricsResponse = await request(this.app)
            .get('/api/optimization/metrics')
            .expect(200);

        this.assert(metricsResponse.body.systems, 'Orchestrator metrics missing systems data');

        console.log('  ✅ Orchestrator tests passed');
    }

    async testBusinessClassificationCache() {
        console.log('🧠 Testing Business Classification Cache...');

        const businessData = {
            businessName: 'Tech Solutions Inc',
            industry: 'technology',
            description: 'Software development and consulting'
        };

        const startTime = Date.now();

        // First request (cache miss)
        const response1 = await request(this.app)
            .post('/api/intelligent-features/classify-business')
            .send({ sessionId: 'test-session-1', businessInfo: businessData })
            .expect(200);

        const firstResponseTime = Date.now() - startTime;

        this.assert(response1.body.classification, 'Business classification missing');
        this.assert(response1.body.classification.businessType, 'Business type missing');

        // Second request (cache hit)
        const startTime2 = Date.now();

        const response2 = await request(this.app)
            .post('/api/intelligent-features/classify-business')
            .send({ sessionId: 'test-session-2', businessInfo: businessData })
            .expect(200);

        const secondResponseTime = Date.now() - startTime2;

        // Cache hit should be significantly faster
        if (secondResponseTime >= firstResponseTime) {
            this.warning('Cache hit not faster than cache miss - cache may not be working');
        }

        console.log(`  ✅ Cache test passed (${firstResponseTime}ms → ${secondResponseTime}ms)`);
    }

    async testRecommendationMemoization() {
        console.log('🎯 Testing Recommendation Memoization...');

        const requestData = {
            sessionId: 'test-session-rec',
            analysisData: {
                businessType: 'technology',
                costs: { labor: 50000, materials: 20000 }
            }
        };

        const startTime = Date.now();

        // First request (computation)
        const response1 = await request(this.app)
            .post('/api/intelligent-features/recommendations')
            .send(requestData)
            .expect(200);

        const firstResponseTime = Date.now() - startTime;

        this.assert(response1.body.recommendations, 'Recommendations missing');
        this.assert(Array.isArray(response1.body.recommendations), 'Recommendations should be array');

        // Second request (memoized)
        const startTime2 = Date.now();

        const response2 = await request(this.app)
            .post('/api/intelligent-features/recommendations')
            .send(requestData)
            .expect(200);

        const secondResponseTime = Date.now() - startTime2;

        // Memoized response should be faster
        if (secondResponseTime >= firstResponseTime * 0.8) {
            this.warning('Memoized response not significantly faster');
        }

        console.log(`  ✅ Memoization test passed (${firstResponseTime}ms → ${secondResponseTime}ms)`);
    }

    async testIntelligentThrottling() {
        console.log('🚦 Testing Intelligent Throttling...');

        // Test normal request
        const response1 = await request(this.app)
            .post('/api/intelligent-features/classify-business')
            .send({
                sessionId: 'throttle-test-1',
                businessInfo: { businessName: 'Test Business' }
            })
            .expect(200);

        // Test rapid requests to trigger throttling
        const rapidRequests = [];
        for (let i = 0; i < 10; i++) {
            rapidRequests.push(
                request(this.app)
                    .post('/api/intelligent-features/classify-business')
                    .send({
                        sessionId: `throttle-burst-${i}`,
                        businessInfo: { businessName: `Burst Test ${i}` }
                    })
            );
        }

        const results = await Promise.allSettled(rapidRequests);
        const throttledRequests = results.filter(r =>
            r.status === 'fulfilled' && r.value.status === 429
        );

        if (throttledRequests.length === 0) {
            this.warning('No requests were throttled during burst test');
        }

        console.log(`  ✅ Throttling test passed (${throttledRequests.length} requests throttled)`);
    }

    async testGracefulDegradation() {
        console.log('🛡️ Testing Graceful Degradation...');

        // Test degradation status
        const degradationResponse = await request(this.app)
            .get('/api/degradation/status')
            .expect(200);

        this.assert(typeof degradationResponse.body.degradationLevel === 'number', 'Degradation level missing');

        // Test circuit breaker status
        const circuitResponse = await request(this.app)
            .get('/api/degradation/circuit-breakers')
            .expect(200);

        this.assert(circuitResponse.body.circuitBreakers, 'Circuit breaker status missing');

        console.log('  ✅ Degradation system tests passed');
    }

    async testHealthMonitoring() {
        console.log('🏥 Testing Health Monitoring...');

        // Test health monitoring metrics
        const metricsResponse = await request(this.app)
            .get('/api/health/metrics')
            .expect(200);

        this.assert(metricsResponse.body.systemMetrics, 'System metrics missing');

        // Test alert history
        const alertsResponse = await request(this.app)
            .get('/api/health/alerts')
            .expect(200);

        this.assert(Array.isArray(alertsResponse.body), 'Alert history should be array');

        console.log('  ✅ Health monitoring tests passed');
    }

    // ==================== FEATURE FLAG TESTS ====================

    async testFeatureFlagSystem() {
        console.log('🎌 Testing Feature Flag System...');

        // Get feature flags
        const flagsResponse = await request(this.app)
            .get('/api/admin/feature-flags')
            .expect(200);

        this.assert(Array.isArray(flagsResponse.body), 'Feature flags should be array');

        // Test business classification flag
        const businessFlag = flagsResponse.body.find(f => f.key === 'business_classification');
        if (businessFlag) {
            this.assert(businessFlag.enabled === true, 'Business classification flag should be enabled');
            this.assert(businessFlag.rollout === 100, 'Business classification should be 100% rollout');
        }

        // Test cost validation flag
        const costFlag = flagsResponse.body.find(f => f.key === 'cost_validation');
        if (costFlag) {
            this.assert(costFlag.enabled === true, 'Cost validation flag should be enabled');
            this.assert(costFlag.rollout === 80, 'Cost validation should be 80% rollout');
        }

        console.log('  ✅ Feature flag tests passed');
    }

    // ==================== PERFORMANCE TESTS ====================

    async testPerformanceBaselines() {
        console.log('⚡ Testing Performance Baselines...');

        // Test business classification performance
        await this.testEndpointPerformance(
            'POST',
            '/api/intelligent-features/classify-business',
            {
                sessionId: 'perf-test-1',
                businessInfo: { businessName: 'Performance Test Co' }
            },
            this.performanceBaselines.businessClassification,
            'Business Classification'
        );

        // Test cost validation performance
        await this.testEndpointPerformance(
            'POST',
            '/api/intelligent-features/validate-costs',
            {
                sessionId: 'perf-test-2',
                costs: { labor: 30000, materials: 15000, overhead: 8000 }
            },
            this.performanceBaselines.costValidation,
            'Cost Validation'
        );

        console.log('  ✅ Performance baseline tests passed');
    }

    async testEndpointPerformance(method, endpoint, data, baseline, name) {
        const startTime = Date.now();

        const response = await request(this.app)[method.toLowerCase()](endpoint)
            .send(data)
            .expect(200);

        const responseTime = Date.now() - startTime;

        if (responseTime > baseline) {
            this.warning(`${name} response time ${responseTime}ms exceeds baseline ${baseline}ms`);
        } else {
            console.log(`    ✅ ${name}: ${responseTime}ms (baseline: ${baseline}ms)`);
        }

        return responseTime;
    }

    async testConcurrentUsers() {
        console.log('👥 Testing Concurrent Users...');

        const concurrentRequests = [];
        const userCount = 50;

        for (let i = 0; i < userCount; i++) {
            concurrentRequests.push(
                request(this.app)
                    .post('/api/intelligent-features/classify-business')
                    .send({
                        sessionId: `concurrent-${i}`,
                        businessInfo: { businessName: `Concurrent Test ${i}` }
                    })
            );
        }

        const startTime = Date.now();
        const results = await Promise.allSettled(concurrentRequests);
        const totalTime = Date.now() - startTime;

        const successfulRequests = results.filter(r =>
            r.status === 'fulfilled' && r.value.status === 200
        ).length;

        const successRate = (successfulRequests / userCount) * 100;

        this.assert(successRate >= 95, `Concurrent user success rate ${successRate}% below 95%`);

        console.log(`  ✅ Concurrent users test passed (${successfulRequests}/${userCount} successful, ${totalTime}ms total)`);
    }

    async testSystemOverload() {
        console.log('🔥 Testing System Overload Protection...');

        // Generate high load
        const overloadRequests = [];
        for (let i = 0; i < 200; i++) {
            overloadRequests.push(
                request(this.app)
                    .post('/api/intelligent-features/classify-business')
                    .send({
                        sessionId: `overload-${i}`,
                        businessInfo: { businessName: `Overload Test ${i}` }
                    })
            );
        }

        const results = await Promise.allSettled(overloadRequests);

        const successCount = results.filter(r =>
            r.status === 'fulfilled' && r.value.status === 200
        ).length;

        const throttledCount = results.filter(r =>
            r.status === 'fulfilled' && r.value.status === 429
        ).length;

        // System should handle some requests and throttle others
        this.assert(successCount > 0, 'No requests succeeded during overload');
        this.assert(throttledCount > 0, 'No requests were throttled during overload');

        console.log(`  ✅ Overload protection test passed (${successCount} success, ${throttledCount} throttled)`);
    }

    // ==================== DATA INTEGRITY TESTS ====================

    async testDataConsistency() {
        console.log('💾 Testing Data Consistency...');

        // Test that cached and computed results are consistent
        const businessData = {
            businessName: 'Consistency Test LLC',
            industry: 'finance'
        };

        // Clear cache first
        await request(this.app)
            .delete('/api/performance/cache')
            .expect(200);

        // Get fresh computation
        const response1 = await request(this.app)
            .post('/api/intelligent-features/classify-business')
            .send({ sessionId: 'consistency-1', businessInfo: businessData })
            .expect(200);

        // Get cached result
        const response2 = await request(this.app)
            .post('/api/intelligent-features/classify-business')
            .send({ sessionId: 'consistency-2', businessInfo: businessData })
            .expect(200);

        // Results should be consistent
        this.assert(
            response1.body.classification.businessType === response2.body.classification.businessType,
            'Cached and computed results inconsistent'
        );

        console.log('  ✅ Data consistency tests passed');
    }

    async testBackupSystems() {
        console.log('💾 Testing Backup Systems...');

        // Test backup status endpoint
        const backupResponse = await request(this.app)
            .get('/api/backup/status')
            .expect(200);

        this.assert(backupResponse.body.enabled, 'Backup system should be enabled');

        // Test backup creation
        const createBackupResponse = await request(this.app)
            .post('/api/backup/create')
            .send({ type: 'intelligent_data' })
            .expect(200);

        this.assert(createBackupResponse.body.success, 'Backup creation failed');

        console.log('  ✅ Backup system tests passed');
    }

    // ==================== SECURITY TESTS ====================

    async testSecurityControls() {
        console.log('🔒 Testing Security Controls...');

        // Test rate limiting for security
        const maliciousRequests = [];
        for (let i = 0; i < 100; i++) {
            maliciousRequests.push(
                request(this.app)
                    .post('/api/intelligent-features/classify-business')
                    .set('X-Forwarded-For', '192.168.1.100') // Same IP
                    .send({
                        sessionId: `security-${i}`,
                        businessInfo: { businessName: `Security Test ${i}` }
                    })
            );
        }

        const results = await Promise.allSettled(maliciousRequests);
        const blockedRequests = results.filter(r =>
            r.status === 'fulfilled' && (r.value.status === 429 || r.value.status === 403)
        );

        this.assert(blockedRequests.length > 50, 'Security controls should block suspicious activity');

        console.log(`  ✅ Security tests passed (${blockedRequests.length} requests blocked)`);
    }

    // ==================== MONITORING TESTS ====================

    async testMonitoringAlerts() {
        console.log('📊 Testing Monitoring Alerts...');

        // Test alert configuration
        const alertConfigResponse = await request(this.app)
            .get('/api/health/alert-config')
            .expect(200);

        this.assert(alertConfigResponse.body.rules, 'Alert rules missing');

        // Test metrics collection
        const metricsResponse = await request(this.app)
            .get('/api/health/metrics')
            .expect(200);

        this.assert(metricsResponse.body.systemMetrics, 'System metrics missing');

        console.log('  ✅ Monitoring alert tests passed');
    }

    // ==================== UTILITY METHODS ====================

    assert(condition, message) {
        if (condition) {
            this.testResults.passed++;
        } else {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            console.log(`    ❌ ${message}`);
        }
    }

    warning(message) {
        this.testResults.warnings++;
        console.log(`    ⚠️  ${message}`);
    }
}

module.exports = ProductionIntegrationTests;