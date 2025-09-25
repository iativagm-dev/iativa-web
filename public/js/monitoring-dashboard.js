/**
 * Monitoring Dashboard JavaScript - A/B Testing Performance Monitor
 */

class MonitoringDashboard {
    constructor() {
        this.updateInterval = 30000; // 30 seconds
        this.updateTimer = null;
        this.alertQueue = [];
        this.maxAlerts = 5;
        this.featuresStatus = {};

        this.init();
        console.log('🔍 Monitoring Dashboard initialized');
    }

    async init() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.initializeCharts();
    }

    // ==================== INITIALIZATION ====================

    async loadInitialData() {
        try {
            // Load dashboard data from multiple endpoints
            const [healthData, analyticsData, experimentsData, flagsData] = await Promise.all([
                this.fetchHealthStatus(),
                this.fetchAnalyticsReport(),
                this.fetchExperiments(),
                this.fetchFeatureFlags()
            ]);

            this.updateHealthMetrics(healthData);
            this.updateAnalyticsCards(analyticsData);
            this.updateExperiments(experimentsData);
            this.updateFeatureFlags(flagsData);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showAlert('error', 'Error loading dashboard', 'Failed to load initial data');
        }
    }

    setupEventListeners() {
        // Feature flag toggles
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('flag-toggle')) {
                this.toggleFeatureFlag(e.target);
            }
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startRealTimeUpdates();
                } else {
                    this.stopRealTimeUpdates();
                }
            });
        }
    }

    // ==================== DATA FETCHING ====================

    async fetchHealthStatus() {
        const response = await fetch('/api/features/health');
        if (!response.ok) throw new Error('Health check failed');
        return await response.json();
    }

    async fetchAnalyticsReport() {
        const response = await fetch('/api/analytics/intelligent-features');
        if (!response.ok) throw new Error('Analytics fetch failed');
        return await response.json();
    }

    async fetchExperiments() {
        const response = await fetch('/api/intelligent/experiments');
        if (!response.ok) throw new Error('Experiments fetch failed');
        return await response.json();
    }

    async fetchFeatureFlags() {
        const response = await fetch('/api/features/status');
        if (!response.ok) throw new Error('Feature flags fetch failed');
        return await response.json();
    }

    // ==================== UI UPDATES ====================

    updateHealthMetrics(healthData) {
        // System status
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        if (healthData.status === 'healthy') {
            statusIndicator.style.background = '#00ff88';
            statusText.textContent = 'System Healthy';
        } else {
            statusIndicator.style.background = '#ff4757';
            statusText.textContent = 'System Issues';
        }

        // Update metrics cards
        this.updateMetricCard('total-users', healthData.totalUsers || 0, '+12%');
        this.updateMetricCard('active-experiments', healthData.experiments?.count || 0, '+2');
        this.updateMetricCard('feature-flags', Object.keys(healthData.features?.status || {}).length, '0%');
        this.updateMetricCard('conversion-rate', (healthData.conversionRate * 100)?.toFixed(1) || '0.0', '+1.2%');
    }

    updateMetricCard(cardId, value, change) {
        const card = document.getElementById(cardId);
        if (card) {
            const valueEl = card.querySelector('.card-value');
            const changeEl = card.querySelector('.card-change');

            if (valueEl) valueEl.textContent = this.formatNumber(value);
            if (changeEl) {
                changeEl.textContent = change;
                changeEl.className = `card-change ${this.getChangeClass(change)}`;
            }
        }
    }

    updateAnalyticsCards(analyticsData) {
        // Update engagement metrics
        const engagementCard = document.getElementById('engagement-metrics');
        if (engagementCard && analyticsData.engagement) {
            this.updateEngagementChart(analyticsData.engagement);
        }

        // Update performance metrics
        const performanceCard = document.getElementById('performance-metrics');
        if (performanceCard && analyticsData.performance) {
            this.updatePerformanceChart(analyticsData.performance);
        }

        // Update conversion funnel
        const funnelCard = document.getElementById('conversion-funnel');
        if (funnelCard && analyticsData.funnel) {
            this.updateFunnelChart(analyticsData.funnel);
        }
    }

    updateExperiments(experimentsData) {
        const experimentsContainer = document.getElementById('experiments-container');
        if (!experimentsContainer) return;

        experimentsContainer.innerHTML = experimentsData.map(experiment => `
            <div class="experiment-card">
                <div class="experiment-header">
                    <h3 class="experiment-name">${experiment.name}</h3>
                    <span class="experiment-status">${experiment.status}</span>
                </div>
                <div class="experiment-metrics">
                    <div class="metric">
                        <div class="metric-value">${experiment.participants || 0}</div>
                        <div class="metric-label">Participants</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${(experiment.conversionRate * 100)?.toFixed(1) || 0}%</div>
                        <div class="metric-label">Conversion</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${experiment.confidence || 0}%</div>
                        <div class="metric-label">Confidence</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${experiment.daysLeft || 0}</div>
                        <div class="metric-label">Days Left</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateFeatureFlags(flagsData) {
        const flagsContainer = document.getElementById('feature-flags-container');
        if (!flagsContainer) return;

        this.featuresStatus = flagsData;

        flagsContainer.innerHTML = Object.entries(flagsData).map(([flagName, flagData]) => `
            <div class="feature-flag">
                <div class="flag-header">
                    <span class="flag-name">${this.formatFlagName(flagName)}</span>
                    <div class="flag-toggle ${flagData.enabled ? 'active' : ''}" data-flag="${flagName}"></div>
                </div>
                <div class="flag-rollout">
                    <div class="rollout-bar">
                        <div class="rollout-progress" style="width: ${flagData.rollout || 0}%"></div>
                    </div>
                    <span class="rollout-percent">${flagData.rollout || 0}%</span>
                </div>
            </div>
        `).join('');
    }

    // ==================== FEATURE FLAG MANAGEMENT ====================

    async toggleFeatureFlag(toggleElement) {
        const flagName = toggleElement.dataset.flag;
        const isCurrentlyActive = toggleElement.classList.contains('active');
        const newState = !isCurrentlyActive;

        try {
            const response = await fetch('/api/features/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    flagName: flagName,
                    enabled: newState
                })
            });

            if (response.ok) {
                toggleElement.classList.toggle('active', newState);
                this.showAlert(
                    'success',
                    'Feature Flag Updated',
                    `${this.formatFlagName(flagName)} ${newState ? 'enabled' : 'disabled'}`
                );
            } else {
                throw new Error('Failed to toggle feature flag');
            }

        } catch (error) {
            console.error('Error toggling feature flag:', error);
            this.showAlert('error', 'Toggle Failed', 'Could not update feature flag');
        }
    }

    // ==================== CHART UPDATES ====================

    updateEngagementChart(engagementData) {
        // Simulate real-time engagement chart
        const chartContainer = document.getElementById('engagement-chart');
        if (chartContainer) {
            // Add mini chart visualization
            const miniChart = chartContainer.querySelector('.mini-chart');
            if (!miniChart) {
                chartContainer.innerHTML = `
                    <div class="mini-chart">
                        <div class="chart-wave"></div>
                    </div>
                    <div class="chart-stats">
                        <div class="stat">
                            <span class="stat-value">${engagementData.sessions || 0}</span>
                            <span class="stat-label">Sessions</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${engagementData.avgDuration || 0}s</span>
                            <span class="stat-label">Avg Duration</span>
                        </div>
                    </div>
                `;
            }
        }
    }

    updatePerformanceChart(performanceData) {
        const chartContainer = document.getElementById('performance-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="performance-metrics">
                    <div class="perf-metric">
                        <div class="perf-value">${performanceData.avgResponseTime || 0}ms</div>
                        <div class="perf-label">Response Time</div>
                    </div>
                    <div class="perf-metric">
                        <div class="perf-value">${performanceData.errorRate || 0}%</div>
                        <div class="perf-label">Error Rate</div>
                    </div>
                    <div class="perf-metric">
                        <div class="perf-value">${performanceData.uptime || 100}%</div>
                        <div class="perf-label">Uptime</div>
                    </div>
                </div>
            `;
        }
    }

    updateFunnelChart(funnelData) {
        const chartContainer = document.getElementById('funnel-chart');
        if (chartContainer && funnelData.steps) {
            const steps = funnelData.steps;
            chartContainer.innerHTML = steps.map((step, index) => `
                <div class="funnel-step">
                    <div class="step-bar" style="width: ${(step.users / steps[0].users) * 100}%">
                        <span class="step-label">${step.name}</span>
                        <span class="step-count">${step.users}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // ==================== REAL-TIME UPDATES ====================

    startRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(async () => {
            await this.refreshDashboard();
        }, this.updateInterval);

        console.log('📊 Real-time updates started');
    }

    stopRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        console.log('📊 Real-time updates stopped');
    }

    async refreshDashboard() {
        try {
            await this.loadInitialData();
            this.showAlert('info', 'Dashboard Updated', 'Latest data loaded');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showAlert('warning', 'Refresh Warning', 'Some data may be outdated');
        }
    }

    // ==================== ALERT SYSTEM ====================

    showAlert(type, title, message) {
        const alertsContainer = document.querySelector('.alerts-container');
        if (!alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            <div class="alert-header">${title}</div>
            <div class="alert-message">${message}</div>
            <div class="alert-time">${new Date().toLocaleTimeString()}</div>
        `;

        alertsContainer.appendChild(alert);

        // Remove old alerts if too many
        const alerts = alertsContainer.querySelectorAll('.alert');
        if (alerts.length > this.maxAlerts) {
            alerts[0].remove();
        }

        // Auto-remove non-error alerts
        if (type !== 'error') {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 5000);
        }
    }

    // ==================== UTILITY METHODS ====================

    formatNumber(num) {
        if (typeof num !== 'number') return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatFlagName(flagName) {
        return flagName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    getChangeClass(change) {
        if (typeof change !== 'string') return 'neutral';
        if (change.startsWith('+')) return 'positive';
        if (change.startsWith('-')) return 'negative';
        return 'neutral';
    }

    // ==================== EXPORT METHODS ====================

    exportDashboardData() {
        const data = {
            timestamp: new Date().toISOString(),
            features: this.featuresStatus,
            alerts: this.alertQueue
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showAlert('success', 'Export Complete', 'Dashboard data exported successfully');
    }

    // ==================== CLEANUP ====================

    destroy() {
        this.stopRealTimeUpdates();
        console.log('🔍 Monitoring Dashboard destroyed');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.monitoringDashboard = new MonitoringDashboard();
});

// Cleanup when page unloads
window.addEventListener('beforeunload', function() {
    if (window.monitoringDashboard) {
        window.monitoringDashboard.destroy();
    }
});