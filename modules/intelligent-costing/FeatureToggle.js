const fs = require('fs');
const path = require('path');

class FeatureToggle {
    constructor() {
        this.configPath = path.join(__dirname, 'config', 'features.json');
        this.features = this.loadFeatures();
        this.environment = process.env.NODE_ENV || 'development';
    }

    loadFeatures() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(configData);
            }
        } catch (error) {
            console.warn('⚠️  Error loading feature toggle config:', error.message);
        }

        // Default fallback configuration
        return {
            intelligentCosting: { enabled: false },
            businessClassification: { enabled: false },
            adaptiveQuestions: { enabled: false },
            intelligentValidation: { enabled: false }
        };
    }

    isEnabled(featureName, userId = null) {
        const feature = this.features[featureName];

        if (!feature) {
            return false;
        }

        // Check environment-specific settings
        if (feature.environment && feature.environment[this.environment] !== undefined) {
            return feature.environment[this.environment];
        }

        // Check basic enabled flag
        if (!feature.enabled) {
            return false;
        }

        // Check dependencies
        if (feature.dependencies) {
            for (const dependency of feature.dependencies) {
                if (!this.isEnabled(dependency, userId)) {
                    return false;
                }
            }
        }

        // Check rollout percentage
        if (feature.rolloutPercentage !== undefined) {
            if (userId) {
                // Consistent hash-based rollout per user
                const hash = this.simpleHash(userId.toString());
                return hash % 100 < feature.rolloutPercentage;
            } else {
                // Random rollout for anonymous users
                return Math.random() * 100 < feature.rolloutPercentage;
            }
        }

        return true;
    }

    // Simple hash function for consistent user-based rollouts
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    enableFeature(featureName, enabled = true) {
        if (this.features[featureName]) {
            this.features[featureName].enabled = enabled;
            this.saveFeatures();
        }
    }

    setRolloutPercentage(featureName, percentage) {
        if (this.features[featureName]) {
            this.features[featureName].rolloutPercentage = Math.max(0, Math.min(100, percentage));
            this.saveFeatures();
        }
    }

    saveFeatures() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.features, null, 2));
        } catch (error) {
            console.error('❌ Error saving feature toggle config:', error.message);
        }
    }

    getFeatureStatus() {
        const status = {};
        for (const [featureName, feature] of Object.entries(this.features)) {
            status[featureName] = {
                enabled: this.isEnabled(featureName),
                configured: feature.enabled,
                environment: this.environment,
                description: feature.description || 'No description available'
            };
        }
        return status;
    }
}

module.exports = FeatureToggle;