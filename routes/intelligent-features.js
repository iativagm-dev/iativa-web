/**
 * Intelligent Features API Routes
 * Handles all intelligent costing features endpoints
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Import intelligent costing modules
const { FeatureToggle, IntelligentCosting } = require('../modules/intelligent-costing');

// Import A/B testing modules
const ABTestingManager = require('../modules/ab-testing/index');
const FeatureFlagManager = require('../modules/ab-testing/feature-flags');
const AnalyticsEngine = require('../modules/ab-testing/analytics');
const ErrorHandler = require('../modules/ab-testing/error-handler');

// Initialize feature toggle and A/B testing
const featureToggle = new FeatureToggle();
const abTestingManager = new ABTestingManager();
const featureFlagManager = new FeatureFlagManager();
const analyticsEngine = new AnalyticsEngine();
const errorHandler = new ErrorHandler();

// Data file paths
const dataDir = path.join(__dirname, '../data');
const interactionPatternsFile = path.join(dataDir, 'interaction-patterns.json');
const costValidationsFile = path.join(dataDir, 'cost-validations.json');
const intelligentSessionsFile = path.join(dataDir, 'intelligent-sessions.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files
function initializeDataFiles() {
    const files = [
        { path: interactionPatternsFile, data: [] },
        { path: costValidationsFile, data: [] },
        { path: intelligentSessionsFile, data: {} }
    ];

    files.forEach(({ path: filePath, data }) => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
    });
}

initializeDataFiles();

// Analytics logging function
function logAnalytics(event, req, data) {
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        event,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...data
    };

    console.log(`📊 [Analytics] ${event}:`, logData);

    // Save to analytics file (optional)
    try {
        const analyticsFile = path.join(dataDir, 'analytics.json');
        let analytics = [];

        if (fs.existsSync(analyticsFile)) {
            analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        }

        analytics.push(logData);

        // Keep only last 1000 entries
        if (analytics.length > 1000) {
            analytics = analytics.slice(-1000);
        }

        fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2));
    } catch (error) {
        console.error('Error saving analytics:', error);
    }
}

// ==================== API ENDPOINTS ====================

// Get intelligent features status
router.get('/features/status', (req, res) => {
    try {
        const features = featureToggle.getFeatureStatus();
        res.json(features);
    } catch (error) {
        console.error('Error getting features status:', error);
        res.status(500).json({ error: 'Failed to get features status' });
    }
});

// Business classification endpoint
router.post('/intelligent/classify', async (req, res) => {
    try {
        if (!featureToggle.isEnabled('businessClassification')) {
            return res.status(503).json({ error: 'Business classification feature not enabled' });
        }

        const { sessionId, businessInfo } = req.body;

        if (!sessionId || !businessInfo) {
            return res.status(400).json({ error: 'Session ID and business info required' });
        }

        const intelligentCosting = new IntelligentCosting({ enableLogging: true });

        // Initialize or get existing session
        const sessionData = intelligentCosting.getSession(sessionId) ||
                           intelligentCosting.initializeSession(sessionId);

        // Classify the business
        const classification = intelligentCosting.processBusinessInfo(businessInfo, sessionId);

        // Track interaction pattern
        const interactionData = {
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            user_id: req.session.tempUser?.id || 'anonymous',
            session_id: sessionId,
            action: 'business_classification',
            message_length: JSON.stringify(businessInfo).length,
            response_time: Date.now() - (req.startTime || Date.now()),
            features_used: ['businessClassification'],
            is_demo: true
        };

        // Save interaction pattern
        let patterns = [];
        try {
            if (fs.existsSync(interactionPatternsFile)) {
                patterns = JSON.parse(fs.readFileSync(interactionPatternsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error reading interaction patterns:', error);
        }

        patterns.push(interactionData);

        try {
            fs.writeFileSync(interactionPatternsFile, JSON.stringify(patterns, null, 2));
        } catch (error) {
            console.error('Error saving interaction pattern:', error);
        }

        logAnalytics('business_classification', req, {
            sessionId,
            industry: classification.industry,
            confidence: classification.confidence
        });

        res.json(classification);

    } catch (error) {
        console.error('Error in business classification:', error);
        res.status(500).json({ error: 'Classification failed', details: error.message });
    }
});

// Cost validation endpoint
router.post('/intelligent/validate-cost', async (req, res) => {
    try {
        if (!featureToggle.isEnabled('intelligentValidation')) {
            return res.status(503).json({ error: 'Cost validation feature not enabled' });
        }

        const { sessionId, category, value, businessType } = req.body;

        if (!sessionId || !category || value === undefined) {
            return res.status(400).json({ error: 'Session ID, category, and value required' });
        }

        const intelligentCosting = new IntelligentCosting({ enableLogging: true });

        const validation = intelligentCosting.validateCostInput(category, value, sessionId);

        // Save validation result
        let validations = [];
        try {
            if (fs.existsSync(costValidationsFile)) {
                validations = JSON.parse(fs.readFileSync(costValidationsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error reading cost validations:', error);
        }

        validations.push({
            id: Date.now().toString(),
            session_id: sessionId,
            category,
            value,
            business_type: businessType,
            validation_result: validation,
            created_at: new Date().toISOString()
        });

        try {
            fs.writeFileSync(costValidationsFile, JSON.stringify(validations, null, 2));
        } catch (error) {
            console.error('Error saving cost validation:', error);
        }

        logAnalytics('cost_validation', req, {
            sessionId,
            category,
            value,
            businessType,
            validationType: validation.type
        });

        res.json(validation);

    } catch (error) {
        console.error('Error in cost validation:', error);
        res.status(500).json({ error: 'Cost validation failed', details: error.message });
    }
});

// Adaptive questions endpoint
router.post('/intelligent/adaptive-questions', async (req, res) => {
    try {
        if (!featureToggle.isEnabled('adaptiveQuestions')) {
            return res.status(503).json({ error: 'Adaptive questions feature not enabled' });
        }

        const { sessionId, context, businessType } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        // Generate adaptive questions based on business type and context
        const questions = generateAdaptiveQuestions(businessType, context);

        logAnalytics('adaptive_questions', req, {
            sessionId,
            businessType,
            questionCount: questions.length
        });

        res.json(questions);

    } catch (error) {
        console.error('Error generating adaptive questions:', error);
        res.status(500).json({ error: 'Failed to generate adaptive questions', details: error.message });
    }
});

// Recommendations endpoint
router.post('/intelligent/recommendations', async (req, res) => {
    try {
        const { sessionId, analysisData, businessType } = req.body;

        if (!sessionId || !analysisData) {
            return res.status(400).json({ error: 'Session ID and analysis data required' });
        }

        // Generate recommendations based on business type and analysis
        const recommendations = generateIntelligentRecommendations(businessType, analysisData);

        logAnalytics('intelligent_recommendations', req, {
            sessionId,
            businessType,
            recommendationCount: recommendations.length
        });

        res.json(recommendations);

    } catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
    }
});

// Analytics for intelligent features
router.post('/analytics/intelligent-features', (req, res) => {
    try {
        const analyticsData = req.body;

        logAnalytics('intelligent_feature_usage', req, {
            ...analyticsData,
            timestamp: new Date().toISOString(),
            user_agent: req.get('User-Agent')
        });

        res.json({ success: true });

    } catch (error) {
        console.error('Error logging intelligent features analytics:', error);
        res.status(500).json({ error: 'Analytics logging failed' });
    }
});

// Session management endpoint
router.post('/intelligent/session', (req, res) => {
    try {
        const { action, sessionId, data } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        const intelligentCosting = new IntelligentCosting({ enableLogging: true });

        let result;
        switch (action) {
            case 'initialize':
                result = intelligentCosting.initializeSession(sessionId);
                break;
            case 'get':
                result = intelligentCosting.getSession(sessionId);
                break;
            case 'update':
                result = intelligentCosting.updateSession(sessionId, data);
                break;
            case 'cleanup':
                result = intelligentCosting.cleanupSession(sessionId);
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        logAnalytics('session_management', req, {
            sessionId,
            action
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error in session management:', error);
        res.status(500).json({ error: 'Session management failed', details: error.message });
    }
});

// Get monitoring data for intelligent features
router.get('/intelligent/monitoring', (req, res) => {
    try {
        const data = {
            totalSessions: 0,
            classifications: 0,
            validations: 0,
            recommendations: 0,
            industryDistribution: {}
        };

        // Read interaction patterns
        try {
            if (fs.existsSync(interactionPatternsFile)) {
                const patterns = JSON.parse(fs.readFileSync(interactionPatternsFile, 'utf8'));
                data.totalSessions = new Set(patterns.map(p => p.session_id)).size;

                patterns.forEach(pattern => {
                    if (pattern.action === 'business_classification') {
                        data.classifications++;
                    }
                });
            }
        } catch (error) {
            console.error('Error reading interaction patterns:', error);
        }

        // Read cost validations
        try {
            if (fs.existsSync(costValidationsFile)) {
                const validations = JSON.parse(fs.readFileSync(costValidationsFile, 'utf8'));
                data.validations = validations.length;

                validations.forEach(validation => {
                    const industry = validation.business_type || 'unknown';
                    data.industryDistribution[industry] = (data.industryDistribution[industry] || 0) + 1;
                });
            }
        } catch (error) {
            console.error('Error reading cost validations:', error);
        }

        res.json(data);

    } catch (error) {
        console.error('Error getting monitoring data:', error);
        res.status(500).json({ error: 'Failed to get monitoring data' });
    }
});

// ==================== HELPER FUNCTIONS ====================

function generateAdaptiveQuestions(businessType, context) {
    const questionSets = {
        'restaurante': [
            '¿Cuál es tu especialidad culinaria principal?',
            '¿Ofreces servicio a domicilio?',
            '¿Cuántas mesas tienes en tu restaurante?',
            '¿Tienes licencia de licores?',
            '¿Cuál es tu horario de atención?'
        ],
        'tecnologia': [
            '¿Qué tipo de productos/servicios tecnológicos ofreces?',
            '¿Trabajas con clientes B2B o B2C?',
            '¿Tienes un equipo de desarrollo?',
            '¿Ofreces soporte técnico?',
            '¿Utilizas metodologías ágiles?'
        ],
        'retail': [
            '¿Vendes productos físicos o digitales?',
            '¿Tienes tienda física, online o ambas?',
            '¿Trabajas con proveedores directos?',
            '¿Manejas inventario?',
            '¿Qué categorías de productos vendes?'
        ],
        'belleza': [
            '¿Qué servicios de belleza ofreces?',
            '¿Tienes productos propios o trabajas con marcas?',
            '¿Cuántos clientes atiendes por día?',
            '¿Ofreces servicios a domicilio?',
            '¿Tienes personal adicional?'
        ],
        'servicios': [
            '¿Qué tipo de servicios profesionales ofreces?',
            '¿Trabajas por horas o por proyecto?',
            '¿Tienes empleados o trabajas solo?',
            '¿Requieres herramientas especializadas?',
            '¿Ofreces garantía en tus servicios?'
        ]
    };

    const defaultQuestions = [
        '¿Cuál es tu mercado objetivo?',
        '¿Cuánto tiempo llevas en el negocio?',
        '¿Cuál es tu principal canal de ventas?',
        '¿Tienes competencia directa?',
        '¿Cuáles son tus gastos fijos mensuales?'
    ];

    return questionSets[businessType] || defaultQuestions;
}

function generateIntelligentRecommendations(businessType, analysisData) {
    const baseRecommendations = {
        'restaurante': [
            {
                text: 'Considera implementar un programa de fidelización para clientes frecuentes',
                priority: 'high',
                impact: 'Incrementa la retención de clientes en un 30%'
            },
            {
                text: 'Optimiza tu menú eliminando platos de baja rotación',
                priority: 'medium',
                impact: 'Reduce costos de inventario hasta un 15%'
            },
            {
                text: 'Implementa un sistema de pedidos online',
                priority: 'high',
                impact: 'Aumenta las ventas en un 25-40%'
            }
        ],
        'tecnologia': [
            {
                text: 'Considera un modelo de suscripción recurrente',
                priority: 'high',
                impact: 'Genera ingresos predecibles y mejora el flujo de caja'
            },
            {
                text: 'Invierte en automatización de procesos',
                priority: 'medium',
                impact: 'Reduce costos operativos hasta un 30%'
            },
            {
                text: 'Desarrolla partnerships estratégicos',
                priority: 'medium',
                impact: 'Expande tu mercado sin costos adicionales significativos'
            }
        ],
        'retail': [
            {
                text: 'Implementa un sistema de gestión de inventario inteligente',
                priority: 'high',
                impact: 'Reduce pérdidas por inventario obsoleto en un 20%'
            },
            {
                text: 'Considera ventas omnicanal (online + física)',
                priority: 'high',
                impact: 'Incrementa las ventas hasta un 50%'
            },
            {
                text: 'Negocia mejores términos con proveedores',
                priority: 'medium',
                impact: 'Mejora márgenes entre 5-10%'
            }
        ],
        'belleza': [
            {
                text: 'Ofrece paquetes de servicios para incrementar ticket promedio',
                priority: 'high',
                impact: 'Aumenta ingresos por cliente entre 35-50%'
            },
            {
                text: 'Implementa un sistema de citas online',
                priority: 'medium',
                impact: 'Reduce tiempo de gestión y mejora experiencia del cliente'
            },
            {
                text: 'Desarrolla productos complementarios o de marca propia',
                priority: 'medium',
                impact: 'Crea fuentes de ingresos adicionales con márgenes altos'
            }
        ],
        'servicios': [
            {
                text: 'Desarrolla paquetes de servicios con valor agregado',
                priority: 'high',
                impact: 'Aumenta el valor promedio por cliente en un 40%'
            },
            {
                text: 'Implementa herramientas de productividad y automatización',
                priority: 'medium',
                impact: 'Reduce tiempo de ejecución hasta un 25%'
            },
            {
                text: 'Crea alianzas estratégicas con otros profesionales',
                priority: 'medium',
                impact: 'Expande servicios sin inversión adicional significativa'
            }
        ]
    };

    const defaultRecommendations = [
        {
            text: 'Analiza regularmente tus métricas financieras clave',
            priority: 'high',
            impact: 'Mejora la toma de decisiones y rentabilidad'
        },
        {
            text: 'Diversifica tus fuentes de ingresos',
            priority: 'medium',
            impact: 'Reduce riesgos y aumenta estabilidad financiera'
        },
        {
            text: 'Invierte en marketing digital dirigido',
            priority: 'medium',
            impact: 'Mejora el ROI de marketing hasta un 200%'
        }
    ];

    let recommendations = baseRecommendations[businessType] || defaultRecommendations;

    // Add analysis-based recommendations
    if (analysisData) {
        if (analysisData.margin < 0.2) {
            recommendations.unshift({
                text: 'Tu margen de ganancia es bajo. Considera aumentar precios o reducir costos',
                priority: 'high',
                impact: 'Mejora la viabilidad financiera del negocio'
            });
        }

        if (analysisData.breakEvenPoint > 100) {
            recommendations.push({
                text: 'Punto de equilibrio alto. Busca formas de reducir costos fijos',
                priority: 'high',
                impact: 'Acelera el camino hacia la rentabilidad'
            });
        }
    }

    return recommendations.slice(0, 3); // Limit to top 3 recommendations
}

// ==================== A/B TESTING ENDPOINTS ====================

// A/B Testing health check endpoint
router.get('/features/health', async (req, res) => {
    try {
        const abHealth = abTestingManager.healthCheck();
        const flagsHealth = await featureFlagManager.getHealthStatus();
        const analyticsHealth = analyticsEngine.getSystemHealth();

        const overallHealth = {
            status: (abHealth.status === 'healthy' &&
                    flagsHealth.status === 'healthy' &&
                    analyticsHealth.status === 'healthy') ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            abTesting: abHealth,
            featureFlags: flagsHealth,
            analytics: analyticsHealth,
            totalUsers: Object.keys(abTestingManager.getUserSegments()).length,
            conversionRate: Math.random() * 0.1 + 0.05 // Mock conversion rate
        };

        res.json(overallHealth);

    } catch (error) {
        console.error('Error in health check:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get analytics report
router.get('/analytics/intelligent-features', async (req, res) => {
    try {
        const timeRange = parseInt(req.query.timeRange) || 7;
        const analyticsReport = abTestingManager.generateAnalyticsReport(timeRange);

        // Enhanced analytics with engagement and performance data
        const enhancedReport = {
            ...analyticsReport,
            engagement: {
                sessions: Math.floor(Math.random() * 1000) + 100,
                avgDuration: Math.floor(Math.random() * 300) + 60,
                bounceRate: Math.random() * 0.3 + 0.2
            },
            performance: {
                avgResponseTime: Math.floor(Math.random() * 200) + 50,
                errorRate: Math.random() * 0.05,
                uptime: 99.5 + Math.random() * 0.5
            },
            funnel: {
                steps: [
                    { name: 'Inicio', users: 1000 },
                    { name: 'Clasificación', users: 800 },
                    { name: 'Costeo', users: 650 },
                    { name: 'Validación', users: 500 },
                    { name: 'Recomendaciones', users: 400 },
                    { name: 'Completado', users: 320 }
                ]
            }
        };

        res.json(enhancedReport);

    } catch (error) {
        console.error('Error getting analytics report:', error);
        res.status(500).json({ error: 'Failed to get analytics report' });
    }
});

// Get experiments
router.get('/intelligent/experiments', (req, res) => {
    try {
        const experiments = abTestingManager.getExperiments();

        // Add mock runtime data
        const enhancedExperiments = experiments.map(exp => ({
            ...exp,
            participants: Math.floor(Math.random() * 1000) + 100,
            conversionRate: Math.random() * 0.15 + 0.05,
            confidence: Math.floor(Math.random() * 40) + 60,
            daysLeft: Math.floor(Math.random() * 20) + 1
        }));

        res.json(enhancedExperiments);

    } catch (error) {
        console.error('Error getting experiments:', error);
        res.status(500).json({ error: 'Failed to get experiments' });
    }
});

// Toggle feature flag
router.post('/features/toggle', async (req, res) => {
    try {
        const { flagName, enabled } = req.body;

        if (!flagName || enabled === undefined) {
            return res.status(400).json({ error: 'flagName and enabled status required' });
        }

        // For demo purposes, we'll simulate the toggle
        // In production, this would update the actual feature flag configuration

        logAnalytics('feature_flag_toggle', req, {
            flagName,
            enabled,
            userId: req.session.tempUser?.id || 'anonymous'
        });

        res.json({
            success: true,
            flagName,
            enabled,
            message: `Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'}`
        });

    } catch (error) {
        console.error('Error toggling feature flag:', error);
        res.status(500).json({ error: 'Failed to toggle feature flag' });
    }
});

// User segment assignment endpoint
router.post('/ab-testing/assign-segment', (req, res) => {
    try {
        const { userId, userProfile } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        const segment = abTestingManager.getUserSegment(userId, userProfile);

        logAnalytics('segment_assignment', req, {
            userId,
            segment,
            userProfile
        });

        res.json({ userId, segment, assigned: true });

    } catch (error) {
        console.error('Error assigning user segment:', error);
        res.status(500).json({ error: 'Failed to assign user segment' });
    }
});

// Track A/B test event
router.post('/ab-testing/track-event', (req, res) => {
    try {
        const eventData = req.body;

        if (!eventData.userId || !eventData.eventType) {
            return res.status(400).json({ error: 'userId and eventType required' });
        }

        // Track the event using both systems
        abTestingManager.trackEvent(eventData);
        analyticsEngine.trackEvent(eventData.userId, eventData);

        res.json({ success: true, tracked: true });

    } catch (error) {
        console.error('Error tracking A/B test event:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

// ==================== MONITORING DASHBOARD ROUTE ====================

// Monitoring dashboard page
router.get('/monitoring-dashboard', (req, res) => {
    try {
        // Ensure user session exists for demo
        if (!req.session.tempUser) {
            req.session.tempUser = {
                id: 'temp_' + Date.now(),
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ip: req.ip,
                timestamp: new Date()
            };
        }

        logAnalytics('monitoring_dashboard_view', req, {
            tempUserId: req.session.tempUser.id
        });

        res.render('monitoring-dashboard', {
            title: 'Dashboard de Monitoreo - A/B Testing',
            user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
            tempUser: req.session.tempUser
        });

    } catch (error) {
        console.error('Error rendering monitoring dashboard:', error);
        res.status(500).json({ error: 'Failed to load monitoring dashboard' });
    }
});

// ==================== ERROR HANDLING & RECOVERY ENDPOINTS ====================

// Get error status and circuit breaker information
router.get('/error-handler/status', (req, res) => {
    try {
        const healthStatus = errorHandler.getHealthStatus();
        res.json(healthStatus);

    } catch (error) {
        console.error('Error getting error handler status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get error handler status'
        });
    }
});

// Reset circuit breakers
router.post('/error-handler/reset-circuit-breakers', async (req, res) => {
    try {
        const resetCount = await errorHandler.resetAllCircuitBreakers();

        logAnalytics('circuit_breakers_reset', req, {
            resetCount,
            userId: req.session.tempUser?.id || 'admin'
        });

        res.json({
            success: true,
            message: `Reset ${resetCount} circuit breakers`,
            resetCount
        });

    } catch (error) {
        console.error('Error resetting circuit breakers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset circuit breakers'
        });
    }
});

// Export error report
router.get('/error-handler/export-report', (req, res) => {
    try {
        const report = errorHandler.exportErrorReport();

        if (!report) {
            return res.status(500).json({
                error: 'Failed to generate error report'
            });
        }

        logAnalytics('error_report_exported', req, {
            reportSize: JSON.stringify(report).length,
            userId: req.session.tempUser?.id || 'admin'
        });

        res.json(report);

    } catch (error) {
        console.error('Error exporting error report:', error);
        res.status(500).json({
            error: 'Failed to export error report'
        });
    }
});

// Recover specific service
router.post('/error-handler/recover-service', async (req, res) => {
    try {
        const { serviceName } = req.body;

        if (!serviceName) {
            return res.status(400).json({
                error: 'Service name required'
            });
        }

        const recovered = await errorHandler.recoverService(serviceName);

        logAnalytics('service_recovery', req, {
            serviceName,
            success: recovered,
            userId: req.session.tempUser?.id || 'admin'
        });

        res.json({
            success: recovered,
            serviceName,
            message: recovered ?
                `Service ${serviceName} recovery initiated` :
                `Failed to recover service ${serviceName}`
        });

    } catch (error) {
        console.error('Error recovering service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recover service'
        });
    }
});

// Clear error logs
router.post('/error-handler/clear-logs', (req, res) => {
    try {
        const cleared = errorHandler.clearErrorLog();

        logAnalytics('error_logs_cleared', req, {
            success: cleared,
            userId: req.session.tempUser?.id || 'admin'
        });

        res.json({
            success: cleared,
            message: cleared ? 'Error logs cleared successfully' : 'Failed to clear error logs'
        });

    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear error logs'
        });
    }
});

module.exports = router;