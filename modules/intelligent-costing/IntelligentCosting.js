const FeatureToggle = require('./FeatureToggle');
const BusinessClassifier = require('./BusinessClassifier');
const CostValidator = require('./CostValidator');
const AdaptiveQuestions = require('./AdaptiveQuestions');

/**
 * Main Intelligent Costing Module
 * Integrates all intelligent costing features with the existing IAtiva system
 */
class IntelligentCosting {
    constructor(options = {}) {
        this.featureToggle = new FeatureToggle();
        this.businessClassifier = new BusinessClassifier();
        this.costValidator = new CostValidator();
        this.adaptiveQuestions = new AdaptiveQuestions();

        this.sessionData = new Map(); // Store session-specific data
        this.options = {
            enableLogging: options.enableLogging || false,
            fallbackToDefault: options.fallbackToDefault !== false, // Default to true
            ...options
        };
    }

    /**
     * Check if intelligent costing features are enabled for a user/session
     */
    isEnabled(feature, sessionId = null) {
        return this.featureToggle.isEnabled(feature, sessionId);
    }

    /**
     * Initialize intelligent costing for a session
     */
    initializeSession(sessionId, userContext = {}) {
        if (!this.isEnabled('intelligentCosting', sessionId)) {
            return null;
        }

        const sessionData = {
            sessionId,
            userContext,
            businessData: {},
            classification: null,
            validationHistory: [],
            questionsGenerated: false,
            adaptiveQuestions: null,
            startTime: Date.now()
        };

        this.sessionData.set(sessionId, sessionData);
        this.log(`Session initialized: ${sessionId}`, sessionData);

        return sessionData;
    }

    /**
     * Enhanced welcome message with business type detection
     */
    enhanceWelcomeMessage(originalMessage, sessionId) {
        if (!this.isEnabled('intelligentCosting', sessionId)) {
            return originalMessage;
        }

        // Add intelligent welcome enhancement
        const enhancement = `

🧠 **IAtiva usa inteligencia artificial para personalizar tu análisis**

Basado en tu tipo de negocio, adaptaré las preguntas y te daré recomendaciones específicas para tu industria.`;

        return originalMessage + enhancement;
    }

    /**
     * Process business information and classify
     */
    processBusinessInfo(businessData, sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        if (!sessionData) return null;

        // Update business data
        sessionData.businessData = { ...sessionData.businessData, ...businessData };

        // Classify business if we have enough information
        if (this.isEnabled('businessClassification', sessionId)) {
            if (businessData.nombreNegocio || businessData.producto || businessData.tipoNegocio) {
                sessionData.classification = this.businessClassifier.classifyBusiness(sessionData.businessData);
                this.log(`Business classified: ${sessionData.classification.industry} (${sessionData.classification.confidence}%)`, sessionData.classification);
            }
        }

        return sessionData;
    }

    /**
     * Generate adaptive questions based on business type
     */
    generateAdaptiveQuestions(sessionId, context = {}) {
        const sessionData = this.sessionData.get(sessionId);
        if (!sessionData || !this.isEnabled('adaptiveQuestions', sessionId)) {
            return null;
        }

        if (sessionData.questionsGenerated) {
            return sessionData.adaptiveQuestions;
        }

        const questionsData = this.adaptiveQuestions.generateQuestions(
            sessionData.businessData,
            {
                includeName: context.includeName || false,
                includeBusinessType: context.includeBusinessType || false,
                industryHint: sessionData.classification?.industry
            }
        );

        sessionData.adaptiveQuestions = questionsData;
        sessionData.questionsGenerated = true;

        this.log(`Generated adaptive questions for ${sessionData.classification?.industry || 'general'}`, questionsData);

        return questionsData;
    }

    /**
     * Validate cost input with intelligent validation
     */
    validateCostInput(category, value, sessionId) {
        if (!this.isEnabled('intelligentValidation', sessionId)) {
            return { isValid: true, message: 'Valor válido', type: 'success' };
        }

        const sessionData = this.sessionData.get(sessionId);
        const context = {
            businessType: sessionData?.classification?.industry,
            totalCosts: this.calculateTotalCosts(sessionData?.businessData?.costos || {})
        };

        const validation = this.costValidator.quickValidate(category, value, context);

        // Store validation history
        if (sessionData) {
            sessionData.validationHistory.push({
                category,
                value,
                validation,
                timestamp: Date.now()
            });
        }

        this.log(`Validated ${category}: ${value} -> ${validation.type}`, validation);

        return validation;
    }

    /**
     * Enhance question text with intelligent context
     */
    enhanceQuestion(questionData, sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        if (!sessionData || !this.isEnabled('adaptiveQuestions', sessionId)) {
            return questionData;
        }

        // If we have adaptive questions, use those instead
        if (sessionData.adaptiveQuestions) {
            const adaptiveQ = sessionData.adaptiveQuestions.questions.find(q => q.category === questionData.category);
            if (adaptiveQ) {
                return {
                    ...questionData,
                    question: adaptiveQ.question,
                    example: adaptiveQ.example,
                    helpText: adaptiveQ.helpText
                };
            }
        }

        return questionData;
    }

    /**
     * Analyze complete cost structure with intelligent insights
     */
    analyzeCostStructure(costs, sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        const analysis = {
            basicAnalysis: null,
            intelligentAnalysis: null,
            industryComparison: null,
            recommendations: [],
            validationScore: 100
        };

        // Always provide basic analysis
        analysis.basicAnalysis = this.performBasicAnalysis(costs);

        // Add intelligent analysis if enabled
        if (this.isEnabled('intelligentValidation', sessionId) && sessionData) {
            analysis.intelligentAnalysis = this.costValidator.validateCostStructure(
                costs,
                sessionData.businessData
            );
            analysis.validationScore = analysis.intelligentAnalysis.overallScore;
        }

        // Add industry comparison if we have classification
        if (this.isEnabled('industryBenchmarking', sessionId) && sessionData?.classification) {
            analysis.industryComparison = this.businessClassifier.analyzeCosts(
                costs,
                sessionData.classification.industry
            );
        }

        // Generate enhanced recommendations
        if (this.isEnabled('advancedRecommendations', sessionId)) {
            analysis.recommendations = this.generateEnhancedRecommendations(
                costs,
                sessionData,
                analysis
            );
        }

        this.log(`Cost structure analyzed for session ${sessionId}`, {
            validationScore: analysis.validationScore,
            industry: sessionData?.classification?.industry,
            recommendationsCount: analysis.recommendations.length
        });

        return analysis;
    }

    /**
     * Basic analysis (always available)
     */
    performBasicAnalysis(costs) {
        const totalCosts = this.calculateTotalCosts(costs);
        const margin = parseFloat(costs.margen_ganancia) || 20;
        const precioVenta = Math.round(totalCosts * (1 + margin / 100));

        return {
            totalCosts,
            margin,
            precioVenta,
            gananciaPorUnidad: precioVenta - totalCosts,
            puntoEquilibrio: Math.ceil(totalCosts / (precioVenta - totalCosts)) || 1
        };
    }

    /**
     * Generate enhanced recommendations
     */
    generateEnhancedRecommendations(costs, sessionData, analysis) {
        const recommendations = [];

        // Add basic recommendations
        recommendations.push(
            '✅ Tu análisis está completo y los números se ven bien',
            '📊 Considera monitorear regularmente tus costos para mantener la rentabilidad',
            '🎯 Enfócate en las categorías de mayor porcentaje para optimizar costos'
        );

        // Add industry-specific recommendations
        if (analysis.industryComparison) {
            const industryRecs = analysis.industryComparison.overallRecommendations || [];
            recommendations.push(...industryRecs);
        }

        // Add validation-based recommendations
        if (analysis.intelligentAnalysis?.recommendations) {
            recommendations.push(...analysis.intelligentAnalysis.recommendations);
        }

        // Add optimization suggestions
        const optimizations = this.costValidator.getOptimizationSuggestions(costs, sessionData.businessData);
        optimizations.forEach(opt => {
            if (opt.type === 'optimization' && opt.priority === 'high') {
                recommendations.push(`💡 ${opt.suggestion}`);
            }
        });

        return recommendations.slice(0, 8); // Limit to 8 recommendations
    }

    /**
     * Get session analytics
     */
    getSessionAnalytics(sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        if (!sessionData) return null;

        const now = Date.now();
        return {
            sessionId,
            duration: now - sessionData.startTime,
            businessClassified: !!sessionData.classification,
            industry: sessionData.classification?.industry,
            confidence: sessionData.classification?.confidence,
            validationCount: sessionData.validationHistory.length,
            featuresUsed: this.getUsedFeatures(sessionId),
            questionsAdapted: sessionData.questionsGenerated
        };
    }

    /**
     * Get list of features used in this session
     */
    getUsedFeatures(sessionId) {
        const features = ['intelligentCosting'];

        if (this.isEnabled('businessClassification', sessionId)) {
            features.push('businessClassification');
        }
        if (this.isEnabled('adaptiveQuestions', sessionId)) {
            features.push('adaptiveQuestions');
        }
        if (this.isEnabled('intelligentValidation', sessionId)) {
            features.push('intelligentValidation');
        }
        if (this.isEnabled('industryBenchmarking', sessionId)) {
            features.push('industryBenchmarking');
        }
        if (this.isEnabled('advancedRecommendations', sessionId)) {
            features.push('advancedRecommendations');
        }

        return features;
    }

    /**
     * Calculate total costs excluding margin
     */
    calculateTotalCosts(costs) {
        return Object.entries(costs)
            .filter(([key]) => key !== 'margen_ganancia')
            .reduce((sum, [_, value]) => sum + (parseFloat(value) || 0), 0);
    }

    /**
     * Clean up session data
     */
    cleanupSession(sessionId) {
        const sessionData = this.sessionData.get(sessionId);
        if (sessionData) {
            this.log(`Session cleaned up: ${sessionId}`, this.getSessionAnalytics(sessionId));
            this.sessionData.delete(sessionId);
        }
    }

    /**
     * Get feature status for debugging
     */
    getFeatureStatus() {
        return this.featureToggle.getFeatureStatus();
    }

    /**
     * Enable a feature (for testing/gradual rollout)
     */
    enableFeature(featureName, enabled = true) {
        this.featureToggle.enableFeature(featureName, enabled);
        this.log(`Feature ${featureName} ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set rollout percentage for a feature
     */
    setFeatureRollout(featureName, percentage) {
        this.featureToggle.setRolloutPercentage(featureName, percentage);
        this.log(`Feature ${featureName} rollout set to ${percentage}%`);
    }

    /**
     * Logging helper
     */
    log(message, data = null) {
        if (this.options.enableLogging) {
            console.log(`🧠 [IntelligentCosting] ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    }
}

module.exports = IntelligentCosting;