#!/usr/bin/env node

/**
 * Activate Adaptive Questions for Beta Users Only
 * Step 3 of Intelligent Features Rollout
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Activating Adaptive Questions for Beta Users Only...\n');

try {
    // Load current feature configuration
    const featuresPath = path.join(__dirname, '../modules/intelligent-costing/config/features.json');
    const featuresConfig = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

    console.log('📋 Current Feature Status:');
    console.log('- businessClassification:', featuresConfig.businessClassification.enabled);
    console.log('- adaptiveQuestions:', featuresConfig.adaptiveQuestions.enabled);

    // Check dependencies are met
    if (!featuresConfig.businessClassification.enabled) {
        throw new Error('Business classification must be enabled before activating adaptive questions');
    }

    // Configure adaptive questions for beta rollout (25% of users)
    featuresConfig.adaptiveQuestions.enabled = true;
    featuresConfig.adaptiveQuestions.rolloutPercentage = 25; // Beta rollout
    featuresConfig.adaptiveQuestions.environment = {
        development: true,
        staging: true,
        production: false // Start with staging only for beta
    };

    // Add beta user targeting configuration
    featuresConfig.adaptiveQuestions.betaConfig = {
        targetUserTypes: ['power_user', 'early_adopter', 'premium'],
        minSessionCount: 5, // Users with at least 5 sessions
        excludeNewUsers: true
    };

    // Write updated configuration
    fs.writeFileSync(featuresPath, JSON.stringify(featuresConfig, null, 2));

    console.log('\n✅ Adaptive Questions Beta Activation Complete!');
    console.log('\n📊 Beta Configuration:');
    console.log('- Rollout percentage: 25% (Beta users only)');
    console.log('- Environment: Development, Staging');
    console.log('- Production: DISABLED (will enable after beta testing)');
    console.log('- Target users: Power users, Early adopters, Premium users');
    console.log('- Minimum sessions: 5');
    console.log('- New users: Excluded from beta');

    // Test beta rollout simulation
    console.log('\n🧪 Testing Beta Rollout Simulation...');
    const { FeatureToggle } = require('../modules/intelligent-costing');
    const featureToggle = new FeatureToggle();

    // Simulate different user types for beta testing
    const testUsers = [
        { sessionId: 'beta-user-1', userType: 'power_user', sessionCount: 10 },
        { sessionId: 'beta-user-2', userType: 'early_adopter', sessionCount: 8 },
        { sessionId: 'new-user-1', userType: 'regular', sessionCount: 1 },
        { sessionId: 'regular-user-1', userType: 'regular', sessionCount: 15 },
        { sessionId: 'premium-user-1', userType: 'premium', sessionCount: 7 }
    ];

    let betaEnabledCount = 0;
    console.log('\n👥 Beta User Testing:');

    testUsers.forEach(user => {
        // Check if user would be eligible for beta based on rollout percentage
        const isEnabled = featureToggle.isEnabled('adaptiveQuestions', user.sessionId);

        // Simulate beta targeting logic
        const isBetaEligible = featuresConfig.adaptiveQuestions.betaConfig.targetUserTypes.includes(user.userType) &&
                              user.sessionCount >= featuresConfig.adaptiveQuestions.betaConfig.minSessionCount;

        const shouldBeEnabled = isEnabled && isBetaEligible;

        if (shouldBeEnabled) betaEnabledCount++;

        const status = shouldBeEnabled ? '✅' : '❌';
        console.log(`${status} ${user.sessionId} (${user.userType}, ${user.sessionCount} sessions): ${shouldBeEnabled ? 'ENABLED' : 'DISABLED'}`);
    });

    const betaEligibleUsers = testUsers.filter(user =>
        featuresConfig.adaptiveQuestions.betaConfig.targetUserTypes.includes(user.userType) &&
        user.sessionCount >= featuresConfig.adaptiveQuestions.betaConfig.minSessionCount
    ).length;

    console.log(`\n📊 Beta Test Results: ${betaEnabledCount}/${betaEligibleUsers} eligible users would have adaptive questions enabled`);

    // Verify adaptive questions dependency
    console.log('\n🔄 Testing Adaptive Questions Dependencies...');
    const { IntelligentCosting } = require('../modules/intelligent-costing');
    const intelligentCosting = new IntelligentCosting({ enableLogging: true });

    // Test session for adaptive questions
    const testSessionId = 'adaptive-test-session';
    const sessionData = intelligentCosting.initializeSession(testSessionId);

    // Test business classification (required for adaptive questions)
    const businessInfo = {
        nombreNegocio: 'Test Restaurant Beta',
        tipoNegocio: 'restaurante',
        producto: 'Comida típica'
    };

    const processedData = intelligentCosting.processBusinessInfo(businessInfo, testSessionId);
    console.log(`✅ Business classification: ${processedData.classification?.industry} (${processedData.classification?.confidence}%)`);

    if (processedData.classification?.confidence >= 80) {
        console.log('✅ Classification confidence meets requirements for adaptive questions');
    } else {
        console.log('⚠️  Classification confidence may need improvement for optimal adaptive questions');
    }

    // Cleanup test session
    intelligentCosting.cleanupSession(testSessionId);

    console.log('\n🎯 BETA ACTIVATION SUMMARY:');
    console.log('✅ Adaptive Questions enabled for beta users (25% rollout)');
    console.log('✅ Targeting system configured for premium/power users');
    console.log('✅ Dependencies verified (business classification active)');
    console.log('✅ Development and staging environments ready');

    console.log('\n📝 What this enables for beta users:');
    console.log('- Dynamic question generation based on classified business type');
    console.log('- Industry-specific cost categories and prompts');
    console.log('- Personalized questionnaire flows');
    console.log('- Enhanced user experience for complex businesses');

    console.log('\n⏭️ Beta Testing Phase - Next Steps:');
    console.log('1. Monitor beta user engagement and feedback');
    console.log('2. Track adaptive question accuracy and relevance');
    console.log('3. Collect performance metrics from staging environment');
    console.log('4. Review beta user session analytics');
    console.log('5. Prepare for full production rollout based on beta results');

    console.log('\n🚨 Production Rollout Criteria:');
    console.log('- Beta user satisfaction rate > 85%');
    console.log('- Adaptive question relevance score > 90%');
    console.log('- No critical performance issues');
    console.log('- Successful completion of at least 50 beta sessions');

} catch (error) {
    console.error('❌ Error activating adaptive questions beta:', error.message);
    process.exit(1);
}