/**
 * Admin Dashboard JavaScript
 * Handles real-time metrics, feature flags, performance monitoring, and analytics
 */

class AdminDashboard {
    constructor() {
        this.eventSource = null;
        this.charts = {};
        this.metricsHistory = {
            responseTime: [],
            errorRate: [],
            throughput: [],
            userSessions: [],
            businessTypes: []
        };
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Admin Dashboard...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDashboard());
        } else {
            this.setupDashboard();
        }
    }

    async setupDashboard() {
        try {
            await this.loadInitialData();
            this.setupEventListeners();
            this.initializeCharts();
            this.startRealTimeMetrics();
            this.setupNotifications();

            console.log('✅ Admin Dashboard initialized successfully');
            this.showNotification('Dashboard loaded successfully', 'success');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    // ==================== REAL-TIME METRICS ====================

    startRealTimeMetrics() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource('/api/admin/metrics/stream');

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.updateMetricsDisplay(data);
                this.updateCharts(data);
                this.checkAlerts(data);
                this.reconnectAttempts = 0;
            } catch (error) {
                console.error('Error processing metrics data:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            this.handleReconnection();
        };

        this.eventSource.onopen = () => {
            console.log('📡 Real-time metrics connection established');
            this.updateConnectionStatus(true);
        };
    }

    handleReconnection() {
        this.updateConnectionStatus(false);

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.startRealTimeMetrics();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
            this.showNotification('Real-time connection lost. Please refresh the page.', 'error');
        }
    }

    updateMetricsDisplay(data) {
        const timestamp = new Date().toLocaleString();

        // Update metric cards
        this.updateMetricCard('coherence-score', {
            value: data.coherence?.average || 0,
            change: data.coherence?.trend || 0,
            unit: '%'
        });

        this.updateMetricCard('conversion-rate', {
            value: data.conversion?.rate || 0,
            change: data.conversion?.trend || 0,
            unit: '%'
        });

        this.updateMetricCard('active-users', {
            value: data.users?.active || 0,
            change: data.users?.change || 0,
            unit: ''
        });

        this.updateMetricCard('response-time', {
            value: data.performance?.responseTime?.average || 0,
            change: data.performance?.responseTime?.trend || 0,
            unit: 'ms'
        });

        // Update business type distribution
        if (data.businessTypes) {
            this.updateBusinessTypeDistribution(data.businessTypes);
        }

        // Update performance metrics
        if (data.performance) {
            this.updatePerformanceMetrics(data.performance);
        }

        // Update system health
        this.updateSystemHealth(data.health);

        // Update last refresh time
        this.updateElement('last-refresh', timestamp);
    }

    updateMetricCard(cardId, data) {
        const card = document.getElementById(cardId);
        if (!card) return;

        const valueElement = card.querySelector('.metric-value');
        const changeElement = card.querySelector('.metric-change');
        const trendElement = card.querySelector('.trend-indicator');

        if (valueElement) {
            valueElement.textContent = `${this.formatNumber(data.value)}${data.unit}`;
        }

        if (changeElement && data.change !== undefined) {
            const changeText = data.change >= 0 ? `+${data.change.toFixed(1)}%` : `${data.change.toFixed(1)}%`;
            changeElement.textContent = changeText;
            changeElement.className = `metric-change ${data.change >= 0 ? 'positive' : 'negative'}`;
        }

        if (trendElement) {
            trendElement.className = `trend-indicator ${data.change >= 0 ? 'up' : 'down'}`;
            trendElement.textContent = data.change >= 0 ? '↗' : '↘';
        }
    }

    updateBusinessTypeDistribution(businessTypes) {
        const container = document.getElementById('business-type-chart');
        if (!container) return;

        // Create or update pie chart
        if (this.charts.businessTypes) {
            this.charts.businessTypes.destroy();
        }

        const ctx = container.querySelector('canvas') || document.createElement('canvas');
        if (!container.contains(ctx)) {
            container.appendChild(ctx);
        }

        const data = Object.entries(businessTypes).map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            data: count,
            backgroundColor: this.getColorForBusinessType(type)
        }));

        this.charts.businessTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    data: data.map(item => item.data),
                    backgroundColor: data.map(item => item.backgroundColor),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e2e8f0',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    updatePerformanceMetrics(performance) {
        // Update response time history
        const now = Date.now();
        this.metricsHistory.responseTime.push({
            timestamp: now,
            value: performance.responseTime?.average || 0
        });

        this.metricsHistory.errorRate.push({
            timestamp: now,
            value: performance.errorRate || 0
        });

        this.metricsHistory.throughput.push({
            timestamp: now,
            value: performance.throughput?.rpm || 0
        });

        // Keep only last 100 data points
        const maxPoints = 100;
        Object.keys(this.metricsHistory).forEach(key => {
            if (this.metricsHistory[key].length > maxPoints) {
                this.metricsHistory[key] = this.metricsHistory[key].slice(-maxPoints);
            }
        });

        this.updatePerformanceChart();
    }

    updatePerformanceChart() {
        const container = document.getElementById('performance-chart');
        if (!container) return;

        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        const ctx = container.querySelector('canvas') || document.createElement('canvas');
        if (!container.contains(ctx)) {
            container.appendChild(ctx);
        }

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Response Time (ms)',
                    data: this.metricsHistory.responseTime.map(item => ({
                        x: item.timestamp,
                        y: item.value
                    })),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Error Rate (%)',
                    data: this.metricsHistory.errorRate.map(item => ({
                        x: item.timestamp,
                        y: item.value
                    })),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                minute: 'HH:mm'
                            }
                        },
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.2)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { color: 'rgba(148, 163, 184, 0.2)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                }
            }
        });
    }

    updateSystemHealth(health) {
        const healthIndicator = document.getElementById('system-health-indicator');
        const healthDetails = document.getElementById('health-details');

        if (healthIndicator) {
            const status = health?.overall || 'unknown';
            healthIndicator.className = `health-indicator ${status}`;
            healthIndicator.textContent = status.toUpperCase();
        }

        if (healthDetails && health?.components) {
            healthDetails.innerHTML = Object.entries(health.components)
                .map(([component, status]) => `
                    <div class="component-health">
                        <span class="component-name">${component}</span>
                        <span class="status-badge ${status.status}">${status.status}</span>
                    </div>
                `).join('');
        }
    }

    // ==================== FEATURE FLAG MANAGEMENT ====================

    async loadFeatureFlags() {
        try {
            const response = await fetch('/api/admin/feature-flags');
            const flags = await response.json();
            this.renderFeatureFlags(flags);
        } catch (error) {
            console.error('Failed to load feature flags:', error);
            this.showNotification('Failed to load feature flags', 'error');
        }
    }

    renderFeatureFlags(flags) {
        const container = document.getElementById('feature-flags-list');
        if (!container) return;

        container.innerHTML = flags.map(flag => `
            <div class="feature-flag-item" data-flag="${flag.key}">
                <div class="flag-header">
                    <h4 class="flag-name">${flag.name}</h4>
                    <div class="flag-controls">
                        <label class="toggle-switch">
                            <input type="checkbox" ${flag.enabled ? 'checked' : ''}
                                   onchange="adminDashboard.toggleFeatureFlag('${flag.key}', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <p class="flag-description">${flag.description}</p>
                <div class="flag-metadata">
                    <span class="flag-version">v${flag.version}</span>
                    <span class="flag-rollout">${flag.rollout}% rollout</span>
                    <span class="flag-updated">Updated: ${new Date(flag.updatedAt).toLocaleDateString()}</span>
                </div>
                ${flag.enabled ? `
                    <div class="rollout-controls">
                        <label>Rollout Percentage:</label>
                        <input type="range" min="0" max="100" value="${flag.rollout}"
                               onchange="adminDashboard.updateRollout('${flag.key}', this.value)">
                        <span>${flag.rollout}%</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async toggleFeatureFlag(flagKey, enabled) {
        try {
            const response = await fetch(`/api/admin/feature-flags/${flagKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });

            if (response.ok) {
                this.showNotification(`Feature flag ${flagKey} ${enabled ? 'enabled' : 'disabled'}`, 'success');
                this.loadFeatureFlags(); // Reload to get updated state
            } else {
                throw new Error('Failed to update feature flag');
            }
        } catch (error) {
            console.error('Feature flag toggle error:', error);
            this.showNotification('Failed to update feature flag', 'error');
        }
    }

    async updateRollout(flagKey, percentage) {
        try {
            const response = await fetch(`/api/admin/feature-flags/${flagKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollout: parseInt(percentage) })
            });

            if (response.ok) {
                this.showNotification(`Rollout updated to ${percentage}%`, 'success');
            }
        } catch (error) {
            console.error('Rollout update error:', error);
            this.showNotification('Failed to update rollout', 'error');
        }
    }

    // ==================== A/B TESTING ====================

    async loadABTests() {
        try {
            const response = await fetch('/api/admin/ab-tests');
            const tests = await response.json();
            this.renderABTests(tests);
        } catch (error) {
            console.error('Failed to load A/B tests:', error);
            this.showNotification('Failed to load A/B tests', 'error');
        }
    }

    renderABTests(tests) {
        const container = document.getElementById('ab-tests-list');
        if (!container) return;

        container.innerHTML = tests.map(test => `
            <div class="ab-test-item" data-test="${test.id}">
                <div class="test-header">
                    <h4 class="test-name">${test.name}</h4>
                    <span class="test-status ${test.status}">${test.status}</span>
                </div>
                <p class="test-description">${test.description}</p>
                <div class="test-results">
                    <div class="variant-results">
                        ${test.variants.map(variant => `
                            <div class="variant-result">
                                <h5>${variant.name}</h5>
                                <div class="result-metrics">
                                    <span class="conversion-rate">${variant.conversionRate}%</span>
                                    <span class="participants">${variant.participants} users</span>
                                    <span class="confidence">${variant.confidence}% confidence</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="test-chart">
                        <canvas id="test-chart-${test.id}"></canvas>
                    </div>
                </div>
                <div class="test-actions">
                    ${test.status === 'running' ? `
                        <button onclick="adminDashboard.stopABTest('${test.id}')" class="btn btn-warning">
                            Stop Test
                        </button>
                    ` : ''}
                    <button onclick="adminDashboard.exportResults('${test.id}')" class="btn btn-secondary">
                        Export Results
                    </button>
                </div>
            </div>
        `).join('');

        // Render charts for each test
        tests.forEach(test => this.renderABTestChart(test));
    }

    renderABTestChart(test) {
        const canvas = document.getElementById(`test-chart-${test.id}`);
        if (!canvas) return;

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: test.variants.map(v => v.name),
                datasets: [{
                    label: 'Conversion Rate (%)',
                    data: test.variants.map(v => v.conversionRate),
                    backgroundColor: test.variants.map((_, i) =>
                        i === 0 ? '#3b82f6' : '#10b981'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // ==================== USER ANALYTICS ====================

    async loadUserAnalytics() {
        try {
            const response = await fetch('/api/admin/user-analytics');
            const analytics = await response.json();
            this.renderUserAnalytics(analytics);
        } catch (error) {
            console.error('Failed to load user analytics:', error);
            this.showNotification('Failed to load user analytics', 'error');
        }
    }

    renderUserAnalytics(analytics) {
        // Update user segment charts
        this.updateUserSegmentChart(analytics.segments);

        // Update behavior flow
        this.updateBehaviorFlow(analytics.behaviorFlow);

        // Update cohort analysis
        this.updateCohortAnalysis(analytics.cohorts);
    }

    updateUserSegmentChart(segments) {
        const container = document.getElementById('user-segments-chart');
        if (!container) return;

        if (this.charts.userSegments) {
            this.charts.userSegments.destroy();
        }

        const ctx = container.querySelector('canvas') || document.createElement('canvas');
        if (!container.contains(ctx)) {
            container.appendChild(ctx);
        }

        this.charts.userSegments = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: segments.map(s => s.name),
                datasets: [{
                    label: 'Users',
                    data: segments.map(s => s.count),
                    backgroundColor: segments.map((_, i) => this.getSegmentColor(i))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    // ==================== UTILITY FUNCTIONS ====================

    async loadInitialData() {
        const promises = [
            this.loadFeatureFlags(),
            this.loadABTests(),
            this.loadUserAnalytics()
        ];

        await Promise.allSettled(promises);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Refresh buttons
        document.querySelectorAll('.refresh-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.refreshCurrentTab();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterContent(e.target.value);
            });
        }
    }

    initializeCharts() {
        // Initialize Chart.js with dark theme defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#e2e8f0';
            Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.2)';
            Chart.defaults.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load tab-specific data if needed
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch (tabName) {
            case 'metrics':
                // Real-time data already loading
                break;
            case 'features':
                this.loadFeatureFlags();
                break;
            case 'tests':
                this.loadABTests();
                break;
            case 'analytics':
                this.loadUserAnalytics();
                break;
        }
    }

    setupNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notifications')) {
            const container = document.createElement('div');
            container.id = 'notifications';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }

    checkAlerts(data) {
        const alerts = [];

        // Check response time
        if (data.performance?.responseTime?.average > 1000) {
            alerts.push({
                type: 'error',
                message: `High response time: ${data.performance.responseTime.average}ms`
            });
        }

        // Check error rate
        if (data.performance?.errorRate > 5) {
            alerts.push({
                type: 'warning',
                message: `High error rate: ${data.performance.errorRate}%`
            });
        }

        // Show alerts
        alerts.forEach(alert => {
            this.showNotification(alert.message, alert.type, 5000);
        });
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            indicator.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }

    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return Math.round(value);
    }

    getColorForBusinessType(type) {
        const colors = {
            technology: '#3b82f6',
            retail: '#10b981',
            healthcare: '#f59e0b',
            finance: '#8b5cf6',
            education: '#06b6d4',
            manufacturing: '#ef4444',
            services: '#84cc16',
            general: '#6b7280'
        };
        return colors[type] || colors.general;
    }

    getSegmentColor(index) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
        return colors[index % colors.length];
    }

    // Cleanup when page unloads
    destroy() {
        if (this.eventSource) {
            this.eventSource.close();
        }

        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
}

// Initialize dashboard when DOM is ready
let adminDashboard;

document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (adminDashboard) {
        adminDashboard.destroy();
    }
});

// Expose for global access
window.adminDashboard = adminDashboard;