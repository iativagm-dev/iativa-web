#!/usr/bin/env node

/**
 * Enable Business Classification for All Users
 * Step 1 of Intelligent Features Rollout
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Enabling Business Classification for All Users...\n');

try {
    // Load current feature configuration
    const featuresPath = path.join(__dirname, '../modules/intelligent-costing/config/features.json');
    const featuresConfig = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

    console.log('📋 Current Feature Status:');
    console.log('- intelligentCosting:', featuresConfig.intelligentCosting.enabled);
    console.log('- businessClassification:', featuresConfig.businessClassification.enabled);

    // Enable business classification for all environments
    featuresConfig.intelligentCosting.enabled = true;
    featuresConfig.intelligentCosting.rolloutPercentage = 100;
    featuresConfig.intelligentCosting.environment = {
        development: true,
        staging: true,
        production: true
    };

    featuresConfig.businessClassification.enabled = true;
    featuresConfig.businessClassification.rolloutPercentage = 100;
    featuresConfig.businessClassification.environment = {
        development: true,
        staging: true,
        production: true
    };

    // Write updated configuration
    fs.writeFileSync(featuresPath, JSON.stringify(featuresConfig, null, 2));

    console.log('\n✅ Business Classification Enabled Successfully!');
    console.log('\n📊 Updated Configuration:');
    console.log('- intelligentCosting: ENABLED (100% rollout)');
    console.log('- businessClassification: ENABLED (100% rollout)');
    console.log('- All environments: development, staging, production');

    // Test the configuration
    console.log('\n🧪 Testing Configuration...');
    const { FeatureToggle } = require('../modules/intelligent-costing');
    const featureToggle = new FeatureToggle();

    const testSessions = [
        'test-session-1',
        'test-session-2',
        'test-session-3'
    ];

    let enabledCount = 0;
    testSessions.forEach(sessionId => {
        if (featureToggle.isEnabled('businessClassification', sessionId)) {
            enabledCount++;
        }
    });

    const enabledPercentage = (enabledCount / testSessions.length) * 100;
    console.log(`- Test sessions enabled: ${enabledCount}/${testSessions.length} (${enabledPercentage}%)`);

    if (enabledPercentage === 100) {
        console.log('✅ Configuration test PASSED');
        console.log('\n🎉 Business Classification is now active for ALL users!');

        console.log('\n📝 What this enables:');
        console.log('- Automatic detection of business types (Restaurant, Tech, Retail, etc.)');
        console.log('- Industry-specific cost profiles and benchmarks');
        console.log('- Personalized business recommendations');
        console.log('- Enhanced cost validation with industry context');

        console.log('\n⏭️ Next Steps:');
        console.log('1. Monitor business classification accuracy in production');
        console.log('2. Run cost validation tests');
        console.log('3. Review analytics for classification distribution');

    } else {
        console.log('❌ Configuration test FAILED');
        console.log('Feature may not be working correctly');
    }

} catch (error) {
    console.error('❌ Error enabling business classification:', error.message);
    process.exit(1);
}