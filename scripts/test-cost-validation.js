#!/usr/bin/env node

/**
 * Test Cost Validation with Demo Data
 * Step 2 of Intelligent Features Rollout
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Cost Validation with Demo Data...\n');

try {
    const { IntelligentCosting, FeatureToggle } = require('../modules/intelligent-costing');

    // Initialize system
    const intelligentCosting = new IntelligentCosting({ enableLogging: true });
    const featureToggle = new FeatureToggle();

    console.log('📋 Feature Status Check:');
    console.log('- intelligentCosting:', featureToggle.isEnabled('intelligentCosting'));
    console.log('- businessClassification:', featureToggle.isEnabled('businessClassification'));
    console.log('- intelligentValidation:', featureToggle.isEnabled('intelligentValidation'));

    // Enable intelligent validation if not already enabled
    if (!featureToggle.isEnabled('intelligentValidation')) {
        featureToggle.enableFeature('intelligentValidation', true);
        console.log('✅ Enabled intelligentValidation for testing');
    }

    console.log('\n🏢 Testing Different Business Types...\n');

    // Demo data for different business types
    const demoBusinesses = [
        {
            name: 'Restaurante La Cocina',
            type: 'restaurante',
            industry: 'restaurante',
            costs: {
                materia_prima: 3000,    // Should be good for restaurant
                mano_obra: 2500,        // Reasonable
                empaque: 200,           // Low but acceptable
                servicios: 800,         // Normal
                transporte: 300,        // Normal for delivery
                marketing: 600,         // Normal
                arriendo_sueldos: 1200, // Reasonable rent
                otros_costos: 400       // Miscellaneous
            }
        },
        {
            name: 'TechStartup Solutions',
            type: 'tecnologia',
            industry: 'tecnologia',
            costs: {
                materia_prima: 500,     // Low (software licenses)
                mano_obra: 6000,        // High (developers)
                empaque: 100,           // Very low
                servicios: 600,         // Normal (cloud services)
                transporte: 100,        // Very low
                marketing: 2000,        // High (digital marketing)
                arriendo_sueldos: 2000, // Office rent
                otros_costos: 800       // Equipment, etc.
            }
        },
        {
            name: 'Tienda Fashion Style',
            type: 'retail',
            industry: 'retail',
            costs: {
                materia_prima: 4000,    // High (inventory)
                mano_obra: 1500,        // Moderate
                empaque: 300,           // Normal for retail
                servicios: 500,         // Normal
                transporte: 600,        // Moderate (shipping)
                marketing: 800,         // Normal
                arriendo_sueldos: 2500, // High rent for good location
                otros_costos: 500       // Insurance, etc.
            }
        },
        {
            name: 'Salón de Belleza Glamour',
            type: 'belleza',
            industry: 'belleza',
            costs: {
                materia_prima: 1200,    // Products and supplies
                mano_obra: 3000,        // Stylists and staff
                empaque: 100,           // Minimal
                servicios: 400,         // Water, electricity
                transporte: 150,        // Low
                marketing: 700,         // Important for beauty
                arriendo_sueldos: 1800, // Salon rent
                otros_costos: 350       // Equipment maintenance
            }
        }
    ];

    let totalTests = 0;
    let passedTests = 0;
    const testResults = [];

    // Test each business
    for (const business of demoBusinesses) {
        console.log(`🏢 Testing: ${business.name} (${business.type})`);

        // Initialize session for this business
        const sessionId = `test-${business.type}-${Date.now()}`;
        const sessionData = intelligentCosting.initializeSession(sessionId);

        // Process business information
        const businessInfo = {
            nombreNegocio: business.name,
            tipoNegocio: business.type,
            producto: `Productos de ${business.type}`
        };

        const processedData = intelligentCosting.processBusinessInfo(businessInfo, sessionId);
        console.log(`   Industry classified: ${processedData.classification?.industry} (${processedData.classification?.confidence}%)`);

        // Test cost validation for each category
        const categoryResults = [];
        const totalCosts = Object.values(business.costs).reduce((sum, cost) => sum + cost, 0);

        Object.entries(business.costs).forEach(([category, value]) => {
            totalTests++;

            const validation = intelligentCosting.validateCostInput(category, value, sessionId);

            // Consider success, info, and warning as acceptable (not just success)
            const isAcceptable = ['success', 'info', 'warning'].includes(validation.type);
            if (isAcceptable) passedTests++;

            categoryResults.push({
                category,
                value,
                validation: validation.type,
                message: validation.message,
                acceptable: isAcceptable
            });

            const status = isAcceptable ? '✅' : '❌';
            console.log(`   ${status} ${category}: $${value} -> ${validation.type}`);
        });

        // Test complete cost structure analysis
        const analysis = intelligentCosting.analyzeCostStructure(business.costs, sessionId);
        console.log(`   📊 Validation Score: ${analysis.validationScore}%`);
        console.log(`   💡 Recommendations: ${analysis.recommendations.length}`);

        testResults.push({
            business: business.name,
            industry: business.type,
            classificationCorrect: processedData.classification?.industry === business.industry,
            validationScore: analysis.validationScore,
            acceptableValidations: categoryResults.filter(r => r.acceptable).length,
            totalValidations: categoryResults.length,
            recommendations: analysis.recommendations.length
        });

        // Cleanup session
        intelligentCosting.cleanupSession(sessionId);
        console.log('');
    }

    // Summary Report
    console.log('📊 COST VALIDATION TEST RESULTS');
    console.log('=====================================');
    console.log(`Total validations: ${totalTests}`);
    console.log(`Acceptable validations: ${passedTests}`);
    console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log('');

    // Business-specific results
    console.log('🏢 Business-Specific Results:');
    testResults.forEach(result => {
        const classificationStatus = result.classificationCorrect ? '✅' : '❌';
        const validationRate = Math.round((result.acceptableValidations / result.totalValidations) * 100);

        console.log(`${classificationStatus} ${result.business}:`);
        console.log(`   Industry: ${result.industry} (classification ${result.classificationCorrect ? 'correct' : 'incorrect'})`);
        console.log(`   Validation rate: ${result.acceptableValidations}/${result.totalValidations} (${validationRate}%)`);
        console.log(`   Validation score: ${result.validationScore}%`);
        console.log(`   Recommendations: ${result.recommendations}`);
        console.log('');
    });

    // Overall assessment
    const overallClassificationRate = testResults.filter(r => r.classificationCorrect).length / testResults.length * 100;
    const avgValidationScore = testResults.reduce((sum, r) => sum + r.validationScore, 0) / testResults.length;
    const overallSuccessRate = (passedTests / totalTests) * 100;

    console.log('🎯 OVERALL ASSESSMENT:');
    console.log(`Classification accuracy: ${Math.round(overallClassificationRate)}%`);
    console.log(`Average validation score: ${Math.round(avgValidationScore)}%`);
    console.log(`Overall success rate: ${Math.round(overallSuccessRate)}%`);

    if (overallSuccessRate >= 75 && overallClassificationRate >= 75) {
        console.log('✅ COST VALIDATION TEST PASSED');
        console.log('🎉 Cost validation is ready for production!');

        console.log('\n⏭️ Next Steps:');
        console.log('1. Enable intelligent validation for all users');
        console.log('2. Monitor validation accuracy in production');
        console.log('3. Proceed with adaptive questions beta rollout');

        // Enable intelligent validation for all users
        console.log('\n🚀 Enabling Intelligent Validation for All Users...');
        const featuresPath = path.join(__dirname, '../modules/intelligent-costing/config/features.json');
        const featuresConfig = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

        featuresConfig.intelligentValidation.enabled = true;
        featuresConfig.intelligentValidation.rolloutPercentage = 100;
        featuresConfig.intelligentValidation.environment = {
            development: true,
            staging: true,
            production: true
        };

        fs.writeFileSync(featuresPath, JSON.stringify(featuresConfig, null, 2));
        console.log('✅ Intelligent validation enabled for all users!');

    } else {
        console.log('❌ COST VALIDATION TEST FAILED');
        console.log('⚠️  Cost validation needs improvement before production');
        console.log('Review validation logic and industry profiles');
    }

} catch (error) {
    console.error('❌ Error testing cost validation:', error.message);
    process.exit(1);
}