/**
 * Intelligent Costing Module for IAtiva
 *
 * This module provides AI-powered enhancements to the costing process:
 * - Automatic business type classification
 * - Industry-specific cost validation
 * - Adaptive question generation
 * - Smart recommendations
 * - Feature toggle management
 */

const IntelligentCosting = require('./IntelligentCosting');
const BusinessClassifier = require('./BusinessClassifier');
const CostValidator = require('./CostValidator');
const AdaptiveQuestions = require('./AdaptiveQuestions');
const FeatureToggle = require('./FeatureToggle');

// Export main class and individual components
module.exports = {
    IntelligentCosting,
    BusinessClassifier,
    CostValidator,
    AdaptiveQuestions,
    FeatureToggle,

    // Convenience factory function
    createIntelligentCosting: (options = {}) => {
        return new IntelligentCosting(options);
    },

    // Version info
    version: '1.0.0',

    // Module metadata
    metadata: {
        name: 'IAtiva Intelligent Costing',
        version: '1.0.0',
        description: 'AI-powered business costing intelligence module',
        author: 'IAtiva Team',
        features: [
            'Business Type Classification',
            'Industry-Specific Validation',
            'Adaptive Question Generation',
            'Smart Cost Recommendations',
            'Feature Toggle Management',
            'Industry Benchmarking'
        ],
        compatibility: {
            iativa: '>=2.0.0',
            node: '>=14.0.0'
        }
    }
};