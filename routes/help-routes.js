/**
 * Help and Documentation Routes
 * Serves user documentation and help content
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// FAQ page for intelligent features
router.get('/intelligent-features-faq', (req, res) => {
    res.render('intelligent-features-faq', {
        title: 'Intelligent Features - FAQ',
        currentUser: req.user || null
    });
});

// Serve user guide as downloadable file
router.get('/user-guide/download', (req, res) => {
    const filePath = path.join(__dirname, '..', 'docs', 'USER-GUIDE-INTELLIGENT-FEATURES.md');
    res.download(filePath, 'Intelligent-Features-User-Guide.md', (err) => {
        if (err) {
            console.error('Error downloading user guide:', err);
            res.status(404).json({
                success: false,
                error: 'User guide not found'
            });
        }
    });
});

// Serve quick reference as downloadable file
router.get('/quick-reference/download', (req, res) => {
    const filePath = path.join(__dirname, '..', 'docs', 'QUICK-REFERENCE-INTELLIGENT-FEATURES.md');
    res.download(filePath, 'Quick-Reference-Intelligent-Features.md', (err) => {
        if (err) {
            console.error('Error downloading quick reference:', err);
            res.status(404).json({
                success: false,
                error: 'Quick reference not found'
            });
        }
    });
});

// API endpoint to get help content dynamically
router.get('/api/help-content/:topic', (req, res) => {
    const { topic } = req.params;

    const helpContent = {
        'business-type': {
            title: '🏢 Business Type Detection',
            explanation: 'Our AI automatically identifies your business type based on the information you provide.',
            tips: [
                'Use clear, descriptive business names',
                'Include industry keywords in descriptions',
                'Provide complete business information'
            ],
            confidenceLevels: {
                high: '90-100%: Highly confident - trust the results',
                medium: '75-89%: Good confidence - results likely accurate',
                low: '60-74%: Moderate confidence - review if needed',
                poor: 'Below 60%: Low confidence - please verify manually'
            }
        },
        'cost-validation': {
            title: '💰 Cost Validation',
            explanation: 'Smart alerts help identify unusual or potentially incorrect cost entries.',
            alertTypes: {
                critical: '🔴 Critical: Significant issues detected - review immediately',
                warning: '🟡 Warning: Unusual but possibly correct - verify entry',
                info: 'ℹ️ Info: Helpful suggestions for optimization'
            },
            commonCauses: [
                'Costs significantly above/below industry average',
                'Unusual cost category for your business type',
                'Data entry errors (extra zeros, wrong decimal place)',
                'Seasonal variations or one-time expenses'
            ]
        },
        'coherence-score': {
            title: '📊 Coherence Score',
            explanation: 'Measures how well all your business information fits together logically.',
            scoreRanges: {
                excellent: '90-100: Excellent - everything fits perfectly',
                veryGood: '80-89: Very good - minor inconsistencies',
                good: '70-79: Good - some areas need attention',
                fair: '60-69: Fair - several inconsistencies found',
                poor: 'Below 60: Poor - significant problems detected'
            },
            improvementTips: [
                'Complete all required fields',
                'Use consistent terminology',
                'Ensure realistic cost relationships',
                'Verify all data for accuracy'
            ]
        },
        'recommendations': {
            title: '🎯 Intelligent Recommendations',
            explanation: 'Personalized suggestions based on your business profile and industry benchmarks.',
            priorityLevels: {
                high: '🔥 High: Critical for success - implement within 30 days',
                medium: '⭐ Medium: Important improvement - implement within 90 days',
                low: '💡 Low: Nice to have - consider for future planning'
            },
            types: [
                '💰 Cost Optimization - Reduce expenses while maintaining quality',
                '📈 Revenue Enhancement - Increase income and growth',
                '⚡ Operational Efficiency - Streamline processes',
                '🎯 Strategic Growth - Long-term development'
            ]
        }
    };

    const content = helpContent[topic];

    if (!content) {
        return res.status(404).json({
            success: false,
            error: 'Help topic not found'
        });
    }

    res.json({
        success: true,
        topic: topic,
        content: content,
        timestamp: Date.now()
    });
});

// Get all available help topics
router.get('/api/help-topics', (req, res) => {
    const topics = [
        {
            key: 'business-type',
            title: '🏢 Business Type Detection',
            description: 'How automatic business type identification works'
        },
        {
            key: 'cost-validation',
            title: '💰 Cost Validation',
            description: 'Understanding smart cost validation warnings'
        },
        {
            key: 'coherence-score',
            title: '📊 Coherence Scores',
            description: 'How to interpret data consistency scores'
        },
        {
            key: 'recommendations',
            title: '🎯 Intelligent Recommendations',
            description: 'Getting the most from AI suggestions'
        }
    ];

    res.json({
        success: true,
        topics: topics,
        totalTopics: topics.length,
        timestamp: Date.now()
    });
});

// Health check for help system
router.get('/health', (req, res) => {
    try {
        const fs = require('fs');
        const userGuidePath = path.join(__dirname, '..', 'docs', 'USER-GUIDE-INTELLIGENT-FEATURES.md');
        const quickRefPath = path.join(__dirname, '..', 'docs', 'QUICK-REFERENCE-INTELLIGENT-FEATURES.md');

        const userGuideExists = fs.existsSync(userGuidePath);
        const quickRefExists = fs.existsSync(quickRefPath);

        res.json({
            service: 'help-system',
            healthy: userGuideExists && quickRefExists,
            resources: {
                userGuideAvailable: userGuideExists,
                quickReferenceAvailable: quickRefExists,
                faqPageConfigured: true,
                helpWidgetEnabled: true
            },
            endpoints: {
                faq: '/help/intelligent-features-faq',
                userGuideDownload: '/help/user-guide/download',
                quickReferenceDownload: '/help/quick-reference/download',
                helpTopicsAPI: '/help/api/help-topics'
            },
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Help system health check failed:', error);
        res.status(503).json({
            service: 'help-system',
            healthy: false,
            error: 'Health check failed',
            timestamp: Date.now()
        });
    }
});

module.exports = router;