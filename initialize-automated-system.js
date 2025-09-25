#!/usr/bin/env node

// Automated Activation System Initialization
const AutomaticPhaseProgression = require('./automatic-phase-progression');
const DeploymentStatusValidator = require('./deployment-status-validator');

async function initializeSystem() {
    console.log('🚀 Initializing Automated Activation System...');

    try {
        // Validate system readiness
        const validator = new DeploymentStatusValidator();
        const isReady = await validator.validateCurrentDeployment();

        if (!isReady) {
            throw new Error('System not ready for automated activation');
        }

        // Initialize automatic phase progression
        const progression = new AutomaticPhaseProgression();

        console.log('✅ Automated activation system initialized');
        console.log('🔄 Ready for automatic phase progression');

        // Start progression if enabled
        await progression.startAutomaticProgression();

    } catch (error) {
        console.error('💥 System initialization failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    initializeSystem();
}

module.exports = { initializeSystem };
