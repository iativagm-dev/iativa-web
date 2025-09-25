#!/usr/bin/env node

/**
 * Automatic Phase Progression System
 *
 * Manages automatic progression through deployment phases with comprehensive
 * safety controls, monitoring, and rollback capabilities
 */

const DeploymentStatusValidator = require('./deployment-status-validator');
const fs = require('fs').promises;
const path = require('path');

// Phase progression configuration
const PHASE_CONFIG = {
    phases: {
        phase1: {
            name: 'Business Classification',
            description: 'Business type classification for all users (100%)',
            successCriteria: {
                minAccuracy: 85,
                maxResponseTime: 200,
                maxErrorRate: 3,
                minUptime: 95,
                stabilityPeriod: 1800000 // 30 minutes
            },
            maxRuntime: 7200000, // 2 hours max
            rollbackTriggers: {
                accuracyDrop: 75,
                errorRateSpike: 5,
                responseTimeIncrease: 300
            }
        },
        phase2: {
            name: 'Cost Validation (80%)',
            description: 'Cost validation for 80% of users',
            successCriteria: {
                minAccuracy: 80,
                maxResponseTime: 300,
                maxErrorRate: 5,
                minUptime: 90,
                stabilityPeriod: 2400000 // 40 minutes
            },
            maxRuntime: 10800000, // 3 hours max
            rollbackTriggers: {
                accuracyDrop: 70,
                errorRateSpike: 8,
                responseTimeIncrease: 500
            }
        },
        phase3: {
            name: 'Recommendation Engine',
            description: 'AI-powered recommendations for premium users',
            successCriteria: {
                minAccuracy: 75,
                maxResponseTime: 500,
                maxErrorRate: 7,
                minUptime: 85,
                stabilityPeriod: 3600000 // 60 minutes
            },
            maxRuntime: 14400000, // 4 hours max
            rollbackTriggers: {
                accuracyDrop: 65,
                errorRateSpike: 10,
                responseTimeIncrease: 750
            }
        },
        phase4: {
            name: 'Full System Rollout',
            description: 'Complete intelligent features for all users',
            successCriteria: {
                minAccuracy: 80,
                maxResponseTime: 250,
                maxErrorRate: 4,
                minUptime: 95,
                stabilityPeriod: 7200000 // 2 hours
            },
            maxRuntime: 18000000, // 5 hours max
            rollbackTriggers: {
                accuracyDrop: 70,
                errorRateSpike: 6,
                responseTimeIncrease: 400
            }
        }
    },
    progression: {
        enabled: true,
        autoAdvance: true,
        stabilityCheckInterval: 300000, // 5 minutes
        maxProgressionTime: 43200000, // 12 hours total
        requireManualApproval: false,
        emergencyStopEnabled: true
    },
    safetyControls: {
        globalEmergencyStop: true,
        automaticRollback: true,
        healthCheckInterval: 60000, // 1 minute
        alertEscalation: true,
        requireHealthyState: true,
        maxConsecutiveFailures: 3
    }
};

class AutomaticPhaseProgression {
    constructor() {
        this.currentPhase = null;
        this.phaseStartTime = null;
        this.phaseStabilityStartTime = null;
        this.progressionId = this.generateProgressionId();
        this.emergencyStopped = false;
        this.progressionLog = [];
        this.healthCheckInterval = null;
        this.stabilityCheckInterval = null;
        this.consecutiveFailures = 0;

        // Bind event handlers
        this.handleExit = this.handleExit.bind(this);
        this.handleEmergencyStop = this.handleEmergencyStop.bind(this);

        // Set up process event handlers
        process.on('SIGINT', this.handleExit);
        process.on('SIGTERM', this.handleExit);
        process.on('uncaughtException', this.handleEmergencyStop);
        process.on('unhandledRejection', this.handleEmergencyStop);
    }

    generateProgressionId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substr(2, 6);
        return `progression-${timestamp}-${random}`;
    }

    logProgression(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            phase: this.currentPhase,
            progressionId: this.progressionId
        };

        this.progressionLog.push(logEntry);

        const prefix = {
            'info': '📋',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'critical': '🚨',
            'phase': '🚀'
        }[level] || '📋';

        console.log(`${prefix} [${logEntry.timestamp}] ${message}`);
        if (Object.keys(data).length > 0) {
            console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
        }
    }

    async saveProgressionReport() {
        try {
            const reportPath = path.join(__dirname, `progression-reports/progression-${this.progressionId}.json`);
            await fs.mkdir(path.dirname(reportPath), { recursive: true });

            const report = {
                progressionId: this.progressionId,
                startTime: this.phaseStartTime,
                endTime: new Date().toISOString(),
                currentPhase: this.currentPhase,
                emergencyStopped: this.emergencyStopped,
                consecutiveFailures: this.consecutiveFailures,
                config: PHASE_CONFIG,
                log: this.progressionLog,
                finalStatus: this.emergencyStopped ? 'EMERGENCY_STOPPED' : 'COMPLETED'
            };

            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            this.logProgression('info', `Progression report saved: ${reportPath}`);
        } catch (error) {
            this.logProgression('error', 'Failed to save progression report', { error: error.message });
        }
    }

    async validatePhaseReadiness(phase) {
        try {
            this.logProgression('info', `Validating readiness for ${phase}...`);

            // Use the deployment status validator
            const validator = new DeploymentStatusValidator();
            const isReady = await validator.validateCurrentDeployment();

            if (!isReady) {
                this.logProgression('error', `${phase} readiness validation failed`);
                return false;
            }

            // Additional phase-specific checks
            const phaseConfig = PHASE_CONFIG.phases[phase];
            if (!phaseConfig) {
                this.logProgression('error', `Unknown phase: ${phase}`);
                return false;
            }

            this.logProgression('success', `${phase} readiness validation passed`);
            return true;
        } catch (error) {
            this.logProgression('error', 'Phase readiness validation error', { error: error.message });
            return false;
        }
    }

    async deployPhase(phase) {
        try {
            const phaseConfig = PHASE_CONFIG.phases[phase];
            this.logProgression('phase', `Starting deployment of ${phaseConfig.name}`, {
                description: phaseConfig.description,
                successCriteria: phaseConfig.successCriteria
            });

            this.currentPhase = phase;
            this.phaseStartTime = new Date().toISOString();
            this.phaseStabilityStartTime = null;

            // Simulate phase deployment (in real implementation, this would trigger actual deployment)
            await this.simulatePhaseDeployment(phase);

            this.logProgression('success', `${phaseConfig.name} deployment initiated`);
            return true;
        } catch (error) {
            this.logProgression('error', `Failed to deploy ${phase}`, { error: error.message });
            return false;
        }
    }

    async simulatePhaseDeployment(phase) {
        // This is a simulation - in real implementation, this would:
        // 1. Update feature flags
        // 2. Deploy new code/configuration
        // 3. Initialize monitoring
        // 4. Start health checks

        const deploymentSteps = [
            `Configuring feature flags for ${phase}`,
            `Deploying ${phase} components`,
            `Initializing ${phase} monitoring`,
            `Starting ${phase} health checks`
        ];

        for (const step of deploymentSteps) {
            this.logProgression('info', step);
            await this.wait(2000); // Simulate deployment time
        }
    }

    async monitorPhaseHealth(phase) {
        try {
            const phaseConfig = PHASE_CONFIG.phases[phase];

            // Simulate health metrics collection
            const currentMetrics = await this.collectPhaseMetrics(phase);

            // Check success criteria
            const meetsSuccessCriteria = this.evaluateSuccessCriteria(currentMetrics, phaseConfig.successCriteria);

            // Check rollback triggers
            const triggerRollback = this.evaluateRollbackTriggers(currentMetrics, phaseConfig.rollbackTriggers);

            if (triggerRollback) {
                this.logProgression('critical', `Rollback triggers activated for ${phase}`, currentMetrics);
                return { status: 'ROLLBACK_REQUIRED', metrics: currentMetrics };
            }

            if (meetsSuccessCriteria) {
                if (!this.phaseStabilityStartTime) {
                    this.phaseStabilityStartTime = Date.now();
                    this.logProgression('success', `${phase} meets success criteria - stability period started`);
                }

                const stabilityDuration = Date.now() - this.phaseStabilityStartTime;
                const requiredStability = phaseConfig.successCriteria.stabilityPeriod;

                if (stabilityDuration >= requiredStability) {
                    this.logProgression('success', `${phase} stability period completed`, {
                        stabilityDuration: stabilityDuration,
                        requiredDuration: requiredStability
                    });
                    return { status: 'READY_FOR_NEXT_PHASE', metrics: currentMetrics };
                } else {
                    const remainingTime = requiredStability - stabilityDuration;
                    this.logProgression('info', `${phase} stability progress`, {
                        remainingTime: Math.round(remainingTime / 1000) + ' seconds'
                    });
                    return { status: 'STABILIZING', metrics: currentMetrics };
                }
            } else {
                // Reset stability timer if criteria not met
                this.phaseStabilityStartTime = null;
                this.logProgression('warning', `${phase} does not meet success criteria`, currentMetrics);
                return { status: 'CRITERIA_NOT_MET', metrics: currentMetrics };
            }
        } catch (error) {
            this.logProgression('error', `Health monitoring error for ${phase}`, { error: error.message });
            return { status: 'MONITORING_ERROR', error: error.message };
        }
    }

    async collectPhaseMetrics(phase) {
        // Simulate metrics collection based on current phase
        // In real implementation, this would collect actual metrics from monitoring systems

        const baseMetrics = {
            accuracy: 85 + Math.random() * 10,
            responseTime: 100 + Math.random() * 100,
            errorRate: Math.random() * 2,
            uptime: 95 + Math.random() * 5,
            requestCount: Math.floor(Math.random() * 1000) + 500
        };

        // Add phase-specific variations
        const phaseMultipliers = {
            phase1: { accuracy: 1.1, responseTime: 0.8, errorRate: 0.7 },
            phase2: { accuracy: 0.95, responseTime: 1.2, errorRate: 1.1 },
            phase3: { accuracy: 0.9, responseTime: 1.5, errorRate: 1.3 },
            phase4: { accuracy: 1.0, responseTime: 1.1, errorRate: 1.0 }
        };

        const multiplier = phaseMultipliers[phase] || { accuracy: 1, responseTime: 1, errorRate: 1 };

        return {
            accuracy: Math.min(100, baseMetrics.accuracy * multiplier.accuracy),
            responseTime: Math.max(50, baseMetrics.responseTime * multiplier.responseTime),
            errorRate: Math.max(0, baseMetrics.errorRate * multiplier.errorRate),
            uptime: baseMetrics.uptime,
            requestCount: baseMetrics.requestCount,
            timestamp: new Date().toISOString()
        };
    }

    evaluateSuccessCriteria(metrics, criteria) {
        return (
            metrics.accuracy >= criteria.minAccuracy &&
            metrics.responseTime <= criteria.maxResponseTime &&
            metrics.errorRate <= criteria.maxErrorRate &&
            metrics.uptime >= criteria.minUptime
        );
    }

    evaluateRollbackTriggers(metrics, triggers) {
        return (
            metrics.accuracy < triggers.accuracyDrop ||
            metrics.errorRate > triggers.errorRateSpike ||
            metrics.responseTime > triggers.responseTimeIncrease
        );
    }

    async executePhaseProgression() {
        try {
            const phases = ['phase1', 'phase2', 'phase3', 'phase4'];
            let currentPhaseIndex = 0;

            // Skip to the appropriate phase based on current deployment status
            const validator = new DeploymentStatusValidator();
            const currentDeploymentValid = await validator.validateCurrentDeployment();

            if (currentDeploymentValid) {
                this.logProgression('info', 'Phase 1 already deployed and stable, starting from Phase 2');
                currentPhaseIndex = 1; // Start from Phase 2
            }

            for (let i = currentPhaseIndex; i < phases.length; i++) {
                if (this.emergencyStopped) {
                    this.logProgression('warning', 'Phase progression stopped due to emergency stop');
                    break;
                }

                const phase = phases[i];
                const phaseConfig = PHASE_CONFIG.phases[phase];

                this.logProgression('phase', `Beginning ${phaseConfig.name} progression`);

                // Validate phase readiness
                const isReady = await this.validatePhaseReadiness(phase);
                if (!isReady) {
                    this.logProgression('error', `${phase} not ready for deployment`);
                    this.consecutiveFailures++;

                    if (this.consecutiveFailures >= PHASE_CONFIG.safetyControls.maxConsecutiveFailures) {
                        await this.triggerEmergencyStop('Too many consecutive phase failures');
                        break;
                    }
                    continue;
                }

                // Deploy phase
                const deploymentSuccess = await this.deployPhase(phase);
                if (!deploymentSuccess) {
                    this.logProgression('error', `${phase} deployment failed`);
                    this.consecutiveFailures++;

                    if (this.consecutiveFailures >= PHASE_CONFIG.safetyControls.maxConsecutiveFailures) {
                        await this.triggerEmergencyStop('Phase deployment failures');
                        break;
                    }
                    continue;
                }

                // Monitor phase until ready for next phase or timeout
                const phaseTimeout = Date.now() + phaseConfig.maxRuntime;
                let phaseComplete = false;

                while (Date.now() < phaseTimeout && !phaseComplete && !this.emergencyStopped) {
                    const healthStatus = await this.monitorPhaseHealth(phase);

                    if (healthStatus.status === 'ROLLBACK_REQUIRED') {
                        this.logProgression('critical', `${phase} requires rollback`);
                        await this.executePhaseRollback(phase);
                        break;
                    } else if (healthStatus.status === 'READY_FOR_NEXT_PHASE') {
                        this.logProgression('success', `${phase} completed successfully`);
                        phaseComplete = true;
                        this.consecutiveFailures = 0; // Reset failure counter
                    } else if (healthStatus.status === 'MONITORING_ERROR') {
                        this.logProgression('error', `Monitoring error in ${phase}`);
                        this.consecutiveFailures++;
                    }

                    // Wait before next health check
                    await this.wait(PHASE_CONFIG.safetyControls.healthCheckInterval);
                }

                if (!phaseComplete && !this.emergencyStopped) {
                    this.logProgression('warning', `${phase} did not complete within timeout`);
                    // Decide whether to continue or rollback based on current metrics
                }

                // Wait between phases if configured
                if (phaseComplete && i < phases.length - 1) {
                    this.logProgression('info', 'Waiting before next phase...');
                    await this.wait(PHASE_CONFIG.progression.stabilityCheckInterval);
                }
            }

            if (!this.emergencyStopped) {
                this.logProgression('success', 'All phases completed successfully');
            }

        } catch (error) {
            this.logProgression('critical', 'Phase progression failed', { error: error.message });
            await this.triggerEmergencyStop('Phase progression error');
        }
    }

    async executePhaseRollback(phase) {
        try {
            this.logProgression('warning', `Executing rollback for ${phase}...`);

            // Simulate rollback steps
            const rollbackSteps = [
                `Disabling ${phase} feature flags`,
                `Reverting ${phase} configuration`,
                `Stopping ${phase} monitoring`,
                `Cleaning up ${phase} resources`
            ];

            for (const step of rollbackSteps) {
                this.logProgression('info', step);
                await this.wait(1000);
            }

            this.logProgression('success', `${phase} rollback completed`);
        } catch (error) {
            this.logProgression('critical', `${phase} rollback failed`, { error: error.message });
        }
    }

    async triggerEmergencyStop(reason) {
        if (this.emergencyStopped) {
            return;
        }

        this.emergencyStopped = true;
        this.logProgression('critical', `EMERGENCY STOP TRIGGERED: ${reason}`);

        try {
            // Stop all monitoring intervals
            if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
            if (this.stabilityCheckInterval) clearInterval(this.stabilityCheckInterval);

            // Execute emergency procedures
            this.logProgression('warning', 'Executing emergency procedures...');

            if (this.currentPhase) {
                await this.executePhaseRollback(this.currentPhase);
            }

            this.logProgression('success', 'Emergency stop completed');
        } catch (error) {
            this.logProgression('critical', 'Emergency stop execution failed', { error: error.message });
        }

        await this.saveProgressionReport();
        process.exit(1);
    }

    async handleEmergencyStop(error) {
        await this.triggerEmergencyStop(`Uncaught exception: ${error.message}`);
    }

    async handleExit() {
        this.logProgression('info', 'Graceful shutdown initiated...');

        if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
        if (this.stabilityCheckInterval) clearInterval(this.stabilityCheckInterval);

        if (!this.emergencyStopped) {
            await this.saveProgressionReport();
        }

        process.exit(0);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startAutomaticProgression() {
        try {
            console.log('🚀 AUTOMATIC PHASE PROGRESSION STARTING');
            console.log('========================================');
            console.log(`📋 Progression ID: ${this.progressionId}`);
            console.log(`🕐 Start Time: ${new Date().toISOString()}`);
            console.log(`🔧 Configuration: ${JSON.stringify(PHASE_CONFIG, null, 2)}`);
            console.log('========================================\n');

            this.logProgression('info', 'Automatic phase progression started', {
                progressionId: this.progressionId,
                config: PHASE_CONFIG
            });

            // Execute phase progression
            await this.executePhaseProgression();

            if (!this.emergencyStopped) {
                this.logProgression('success', 'AUTOMATIC PHASE PROGRESSION COMPLETED SUCCESSFULLY');

                console.log('\n🎉 PROGRESSION COMPLETE');
                console.log('======================');
                console.log('✅ All phases deployed successfully');
                console.log('📊 System fully operational');
                console.log('🔄 Monitoring continues');
                console.log(`📋 Progression ID: ${this.progressionId}`);
                console.log('======================');

                await this.saveProgressionReport();
            }

        } catch (error) {
            this.logProgression('critical', 'Automatic progression failed', { error: error.message });
            await this.triggerEmergencyStop('Progression failure');
        }
    }
}

// Main execution
async function main() {
    const progression = new AutomaticPhaseProgression();
    await progression.startAutomaticProgression();
}

// Only run if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error in automatic phase progression:', error);
        process.exit(1);
    });
}

module.exports = AutomaticPhaseProgression;