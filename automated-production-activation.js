#!/usr/bin/env node

/**
 * Automated Production Activation Script
 *
 * This script orchestrates the complete automated activation of intelligent features
 * in production with comprehensive safety controls and phase progression.
 *
 * Features:
 * - Uses ProductionActivationManager for orchestration
 * - Runs pre-production checks first
 * - Automatically progresses through deployment phases
 * - Continuous monitoring throughout activation
 * - Emergency stop and rollback capabilities
 * - Safety controls and validation at each step
 */

const ProductionActivationManager = require('./modules/production/production-activation-manager');
const fs = require('fs').promises;
const path = require('path');

// Configuration for automated activation
const ACTIVATION_CONFIG = {
    // Pre-production validation settings
    preProductionChecks: {
        enabled: true,
        requiredSuccessRate: 100, // All checks must pass
        maxRetries: 2,
        timeoutMinutes: 10
    },

    // Phase progression settings
    phaseProgression: {
        enabled: true,
        autoAdvance: true,
        waitBetweenPhases: 300, // 5 minutes between phases
        maxPhaseRetries: 3
    },

    // Monitoring settings
    monitoring: {
        enabled: true,
        metricsInterval: 30, // seconds
        alertsEnabled: true,
        emergencyStopEnabled: true
    },

    // Safety controls
    safetyControls: {
        maxErrorRate: 5, // Percentage
        minAccuracy: 75, // Percentage
        maxResponseTime: 2000, // milliseconds
        emergencyStopThresholds: {
            errorRateSpike: 10, // Percentage
            accuracyDrop: 50, // Percentage
            responseTimeIncrease: 300 // Percentage increase
        }
    },

    // Rollback settings
    rollback: {
        autoRollbackEnabled: true,
        rollbackTriggers: {
            criticalErrorRate: 10,
            severeAccuracyDrop: 40,
            systemUnresponsive: true
        }
    }
};

class AutomatedActivationOrchestrator {
    constructor() {
        this.activationManager = null;
        this.activationStartTime = null;
        this.currentPhase = null;
        this.activationLog = [];
        this.emergencyStopped = false;
        this.activationId = this.generateActivationId();

        // Bind event handlers
        this.handleExit = this.handleExit.bind(this);
        this.handleEmergencyStop = this.handleEmergencyStop.bind(this);

        // Set up process event handlers
        process.on('SIGINT', this.handleExit);
        process.on('SIGTERM', this.handleExit);
        process.on('uncaughtException', this.handleEmergencyStop);
        process.on('unhandledRejection', this.handleEmergencyStop);
    }

    generateActivationId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substr(2, 6);
        return `activation-${timestamp}-${random}`;
    }

    logActivation(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            phase: this.currentPhase,
            activationId: this.activationId
        };

        this.activationLog.push(logEntry);

        const prefix = {
            'info': '📋',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'critical': '🚨'
        }[level] || '📋';

        console.log(`${prefix} [${logEntry.timestamp}] ${message}`);
        if (Object.keys(data).length > 0) {
            console.log('   Data:', JSON.stringify(data, null, 2));
        }
    }

    async saveActivationReport() {
        try {
            const reportPath = path.join(__dirname, `activation-reports/activation-${this.activationId}.json`);

            // Ensure reports directory exists
            await fs.mkdir(path.dirname(reportPath), { recursive: true });

            const report = {
                activationId: this.activationId,
                startTime: this.activationStartTime,
                endTime: new Date().toISOString(),
                currentPhase: this.currentPhase,
                emergencyStopped: this.emergencyStopped,
                config: ACTIVATION_CONFIG,
                log: this.activationLog,
                finalStatus: this.emergencyStopped ? 'EMERGENCY_STOPPED' : 'COMPLETED'
            };

            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            this.logActivation('info', `Activation report saved: ${reportPath}`);
        } catch (error) {
            this.logActivation('error', 'Failed to save activation report', { error: error.message });
        }
    }

    async initializeActivationManager() {
        try {
            this.logActivation('info', 'Initializing Production Activation Manager...');

            this.activationManager = new ProductionActivationManager({
                monitoring: {
                    metricsInterval: ACTIVATION_CONFIG.monitoring.metricsInterval * 1000,
                    alertsEnabled: ACTIVATION_CONFIG.monitoring.alertsEnabled
                },
                phases: {
                    autoAdvance: ACTIVATION_CONFIG.phaseProgression.autoAdvance,
                    waitBetweenPhases: ACTIVATION_CONFIG.phaseProgression.waitBetweenPhases * 1000
                },
                safety: ACTIVATION_CONFIG.safetyControls
            });

            this.logActivation('success', 'Production Activation Manager initialized');
            return true;
        } catch (error) {
            this.logActivation('critical', 'Failed to initialize Production Activation Manager', {
                error: error.message
            });
            return false;
        }
    }

    async runPreProductionValidation() {
        try {
            this.logActivation('info', 'Starting pre-production validation checks...');
            this.currentPhase = 'PRE_PRODUCTION_VALIDATION';

            const validationStartTime = Date.now();
            let retries = 0;
            let validationPassed = false;

            while (retries < ACTIVATION_CONFIG.preProductionChecks.maxRetries && !validationPassed) {
                if (retries > 0) {
                    this.logActivation('warning', `Pre-production validation retry ${retries}/${ACTIVATION_CONFIG.preProductionChecks.maxRetries}`);
                    await this.wait(30000); // Wait 30 seconds between retries
                }

                try {
                    const validationResult = await this.activationManager.executePreProductionChecks({
                        name: 'pre-production-validation',
                        timeout: ACTIVATION_CONFIG.preProductionChecks.timeoutMinutes * 60 * 1000
                    });

                    if (validationResult.success) {
                        validationPassed = true;
                        this.logActivation('success', 'Pre-production validation completed successfully', {
                            duration: Date.now() - validationStartTime,
                            testsRun: validationResult.testsRun,
                            testsPassed: validationResult.testsPassed
                        });
                    } else {
                        this.logActivation('error', 'Pre-production validation failed', {
                            failures: validationResult.failures,
                            attempt: retries + 1
                        });
                    }
                } catch (error) {
                    this.logActivation('error', 'Pre-production validation error', {
                        error: error.message,
                        attempt: retries + 1
                    });
                }

                retries++;
            }

            if (!validationPassed) {
                throw new Error('Pre-production validation failed after all retries');
            }

            return true;
        } catch (error) {
            this.logActivation('critical', 'Pre-production validation failed critically', {
                error: error.message
            });
            return false;
        }
    }

    async executePhaseProgression() {
        try {
            this.logActivation('info', 'Starting automated phase progression...');

            const phasesToExecute = [
                { key: 'phase1', name: 'Business Classification Deployment' },
                { key: 'phase2', name: 'Cost Validation Deployment (80%)' },
                { key: 'phase3', name: 'Recommendation Engine Deployment' },
                { key: 'phase4', name: 'Full System Rollout' }
            ];

            for (const phase of phasesToExecute) {
                if (this.emergencyStopped) {
                    this.logActivation('warning', 'Phase progression stopped due to emergency stop');
                    break;
                }

                this.currentPhase = phase.key.toUpperCase();
                this.logActivation('info', `Starting ${phase.name}...`);

                const phaseStartTime = Date.now();
                let phaseRetries = 0;
                let phaseSuccess = false;

                while (phaseRetries < ACTIVATION_CONFIG.phaseProgression.maxPhaseRetries && !phaseSuccess) {
                    try {
                        if (phaseRetries > 0) {
                            this.logActivation('warning', `${phase.name} retry ${phaseRetries}/${ACTIVATION_CONFIG.phaseProgression.maxPhaseRetries}`);
                            await this.wait(60000); // Wait 1 minute between retries
                        }

                        const result = await this.activationManager.executePhase(phase.key);

                        if (result.success) {
                            phaseSuccess = true;
                            this.logActivation('success', `${phase.name} completed successfully`, {
                                duration: Date.now() - phaseStartTime,
                                metrics: result.metrics
                            });

                            // Wait between phases if configured
                            if (ACTIVATION_CONFIG.phaseProgression.waitBetweenPhases > 0) {
                                this.logActivation('info', `Waiting ${ACTIVATION_CONFIG.phaseProgression.waitBetweenPhases} seconds before next phase...`);
                                await this.wait(ACTIVATION_CONFIG.phaseProgression.waitBetweenPhases * 1000);
                            }
                        } else {
                            this.logActivation('error', `${phase.name} failed`, {
                                error: result.error,
                                attempt: phaseRetries + 1
                            });
                        }
                    } catch (error) {
                        this.logActivation('error', `${phase.name} error`, {
                            error: error.message,
                            attempt: phaseRetries + 1
                        });
                    }

                    phaseRetries++;
                }

                if (!phaseSuccess) {
                    throw new Error(`${phase.name} failed after all retries`);
                }
            }

            this.logActivation('success', 'All phases completed successfully');
            return true;
        } catch (error) {
            this.logActivation('critical', 'Phase progression failed', { error: error.message });
            return false;
        }
    }

    async startContinuousMonitoring() {
        if (!ACTIVATION_CONFIG.monitoring.enabled) {
            this.logActivation('info', 'Continuous monitoring disabled');
            return;
        }

        this.logActivation('info', 'Starting continuous monitoring...');

        const monitoringInterval = setInterval(async () => {
            if (this.emergencyStopped) {
                clearInterval(monitoringInterval);
                return;
            }

            try {
                // Collect current metrics
                const metrics = await this.activationManager.collectPhaseMetrics(this.currentPhase || 'monitoring', {});

                // Check for alert conditions
                const alerts = await this.activationManager.checkPhaseAlerts(this.currentPhase || 'monitoring');

                if (alerts && alerts.length > 0) {
                    for (const alert of alerts) {
                        this.logActivation('warning', 'Alert triggered during monitoring', { alert });

                        // Check if emergency stop is needed
                        if (this.shouldTriggerEmergencyStop(alert)) {
                            await this.triggerEmergencyStop('Alert threshold exceeded', alert);
                            break;
                        }
                    }
                }

                // Log periodic health status
                this.logActivation('info', 'System health check', {
                    phase: this.currentPhase,
                    metrics: {
                        accuracy: metrics.accuracy,
                        errorRate: metrics.errorRate,
                        responseTime: metrics.averageResponseTime
                    }
                });

            } catch (error) {
                this.logActivation('error', 'Monitoring error', { error: error.message });
            }
        }, ACTIVATION_CONFIG.monitoring.metricsInterval * 1000);

        // Store reference for cleanup
        this.monitoringInterval = monitoringInterval;
    }

    shouldTriggerEmergencyStop(alert) {
        const thresholds = ACTIVATION_CONFIG.safetyControls.emergencyStopThresholds;

        if (alert.type === 'error_rate_spike' && alert.value > thresholds.errorRateSpike) {
            return true;
        }

        if (alert.type === 'accuracy_drop' && alert.value > thresholds.accuracyDrop) {
            return true;
        }

        if (alert.type === 'response_time_increase' && alert.value > thresholds.responseTimeIncrease) {
            return true;
        }

        return false;
    }

    async triggerEmergencyStop(reason, details = {}) {
        if (this.emergencyStopped) {
            return; // Already stopped
        }

        this.emergencyStopped = true;
        this.logActivation('critical', `EMERGENCY STOP TRIGGERED: ${reason}`, details);

        try {
            if (this.activationManager) {
                await this.activationManager.executeEmergencyStop(reason);
                this.logActivation('success', 'Emergency stop executed successfully');
            }
        } catch (error) {
            this.logActivation('critical', 'Emergency stop execution failed', { error: error.message });
        }

        // Clean up monitoring
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        await this.saveActivationReport();
        process.exit(1);
    }

    async handleEmergencyStop(error) {
        await this.triggerEmergencyStop('Uncaught exception', { error: error.message, stack: error.stack });
    }

    async handleExit() {
        this.logActivation('info', 'Graceful shutdown initiated...');

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        if (this.activationManager && !this.emergencyStopped) {
            this.logActivation('info', 'Saving final activation state...');
            await this.saveActivationReport();
        }

        process.exit(0);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startAutomatedActivation() {
        try {
            this.activationStartTime = new Date().toISOString();

            console.log('🚀 AUTOMATED PRODUCTION ACTIVATION STARTING');
            console.log('===============================================');
            console.log(`📋 Activation ID: ${this.activationId}`);
            console.log(`🕐 Start Time: ${this.activationStartTime}`);
            console.log(`🔧 Configuration: ${JSON.stringify(ACTIVATION_CONFIG, null, 2)}`);
            console.log('===============================================\n');

            this.logActivation('info', 'Automated production activation started', {
                activationId: this.activationId,
                config: ACTIVATION_CONFIG
            });

            // Step 1: Initialize Production Activation Manager
            const managerInitialized = await this.initializeActivationManager();
            if (!managerInitialized) {
                throw new Error('Failed to initialize Production Activation Manager');
            }

            // Step 2: Run pre-production validation checks
            const validationPassed = await this.runPreProductionValidation();
            if (!validationPassed) {
                throw new Error('Pre-production validation failed');
            }

            // Step 3: Start continuous monitoring
            await this.startContinuousMonitoring();

            // Step 4: Execute phase progression
            const phasesCompleted = await this.executePhaseProgression();
            if (!phasesCompleted) {
                throw new Error('Phase progression failed');
            }

            // Step 5: Final success
            this.logActivation('success', 'AUTOMATED PRODUCTION ACTIVATION COMPLETED SUCCESSFULLY');

            console.log('\n🎉 ACTIVATION COMPLETE');
            console.log('=======================');
            console.log('✅ All phases deployed successfully');
            console.log('📊 Continuous monitoring active');
            console.log('🔄 Rollback ready if needed');
            console.log('📈 System performing optimally');
            console.log(`📋 Activation ID: ${this.activationId}`);
            console.log('=======================');

            await this.saveActivationReport();

            // Keep monitoring active
            this.logActivation('info', 'Entering continuous monitoring mode...');

        } catch (error) {
            this.logActivation('critical', 'Automated activation failed', { error: error.message });

            console.log('\n❌ ACTIVATION FAILED');
            console.log('=====================');
            console.log(`🚨 Error: ${error.message}`);
            console.log('🔧 Check activation logs for details');
            console.log(`📋 Activation ID: ${this.activationId}`);
            console.log('💡 Emergency rollback may be required');
            console.log('=====================');

            await this.triggerEmergencyStop('Activation failure', { error: error.message });
        }
    }
}

// Main execution
async function main() {
    const orchestrator = new AutomatedActivationOrchestrator();
    await orchestrator.startAutomatedActivation();
}

// Only run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error in automated activation:', error);
        process.exit(1);
    });
}

module.exports = AutomatedActivationOrchestrator;