/**
 * Intelligent Chat Features
 * Enhances the chat interface with business classification, cost validation,
 * adaptive questioning, and intelligent recommendations
 */

class IntelligentChatFeatures {
    constructor() {
        this.currentSession = null;
        this.businessClassification = null;
        this.adaptiveProgress = {
            total: 5,
            current: 0,
            steps: ['Negocio', 'Producto', 'Costos', 'Mercado', 'Análisis']
        };
        this.costValidations = [];
        this.recommendations = [];
        this.industryBenchmarks = null;

        this.initializeFeatures();
    }

    initializeFeatures() {
        // Initialize session tracking
        this.currentSession = this.generateSessionId();

        // Set up feature detection
        this.detectIntelligentFeatures();

        // Initialize UI components
        this.setupIntelligentUI();

        console.log('🧠 Intelligent Chat Features initialized');
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    detectIntelligentFeatures() {
        // Check if intelligent features are enabled
        fetch('/api/features/status')
            .then(response => response.json())
            .then(features => {
                this.enabledFeatures = features;
                console.log('✅ Feature status loaded:', features);
            })
            .catch(error => {
                console.warn('⚠️ Could not load feature status:', error);
                // Fallback to basic features
                this.enabledFeatures = {
                    intelligentCosting: true,
                    businessClassification: true,
                    intelligentValidation: true,
                    adaptiveQuestions: false
                };
            });
    }

    setupIntelligentUI() {
        // Add intelligent features container to chat
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            // Create features container
            const featuresContainer = document.createElement('div');
            featuresContainer.id = 'intelligent-features-container';
            featuresContainer.className = 'intelligent-features-container';
            chatMessages.appendChild(featuresContainer);
        }
    }

    // Business Type Classification
    displayBusinessTypeIndicator(businessType, confidence) {
        if (!this.enabledFeatures?.businessClassification) return;

        const container = document.getElementById('intelligent-features-container');
        if (!container) return;

        // Remove existing indicator
        const existingIndicator = container.querySelector('.business-type-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = document.createElement('div');
        indicator.className = `business-type-indicator ${businessType.toLowerCase()}`;

        const iconMap = {
            'restaurante': '🍽️',
            'tecnologia': '💻',
            'retail': '🛍️',
            'belleza': '💄',
            'servicios': '🔧',
            'educacion': '📚',
            'salud': '🏥',
            'construccion': '🏗️'
        };

        indicator.innerHTML = `
            <span class="icon">${iconMap[businessType] || '🏢'}</span>
            <span class="text">
                ${this.getBusinessTypeName(businessType)}
                <span class="confidence">(${confidence}% confianza)</span>
            </span>
        `;

        container.appendChild(indicator);
        this.businessClassification = { type: businessType, confidence };

        // Show industry insights after classification
        setTimeout(() => this.showIndustryInsights(businessType), 1000);
    }

    getBusinessTypeName(type) {
        const names = {
            'restaurante': 'Restaurante',
            'tecnologia': 'Tecnología',
            'retail': 'Comercio/Retail',
            'belleza': 'Belleza y Estética',
            'servicios': 'Servicios',
            'educacion': 'Educación',
            'salud': 'Salud',
            'construccion': 'Construcción'
        };
        return names[type] || 'Negocio';
    }

    // Cost Validation Alerts
    showCostValidationAlert(validation) {
        if (!this.enabledFeatures?.intelligentValidation) return;

        const container = document.getElementById('intelligent-features-container');
        if (!container) return;

        const alert = document.createElement('div');
        alert.className = `cost-validation-alert ${validation.type}`;

        const iconMap = {
            'success': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle',
            'info': 'fas fa-info-circle'
        };

        const titleMap = {
            'success': 'Costo Validado',
            'warning': 'Revisar Costo',
            'error': 'Costo Fuera de Rango',
            'info': 'Información de Costo'
        };

        alert.innerHTML = `
            <div class="alert-icon">
                <i class="${iconMap[validation.type]}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${titleMap[validation.type]}</div>
                <div class="alert-message">${validation.message}</div>
                ${validation.suggestion ? `
                    <div class="alert-suggestion">
                        💡 Sugerencia: ${validation.suggestion}
                    </div>
                ` : ''}
            </div>
        `;

        container.appendChild(alert);
        this.costValidations.push(validation);

        // Auto-remove after 8 seconds unless it's an error
        if (validation.type !== 'error') {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.style.animation = 'fadeOut 0.5s ease-out';
                    setTimeout(() => alert.remove(), 500);
                }
            }, 8000);
        }
    }

    // Adaptive Questioning Progress
    updateAdaptiveProgress(currentStep, totalSteps = 5) {
        if (!this.enabledFeatures?.adaptiveQuestions) return;

        const container = document.getElementById('intelligent-features-container');
        if (!container) return;

        let progressContainer = container.querySelector('.adaptive-progress-container');

        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = 'adaptive-progress-container';
            container.appendChild(progressContainer);
        }

        const percentage = Math.round((currentStep / totalSteps) * 100);
        this.adaptiveProgress.current = currentStep;
        this.adaptiveProgress.total = totalSteps;

        progressContainer.innerHTML = `
            <div class="adaptive-progress-header">
                <div class="adaptive-progress-title">
                    <i class="fas fa-brain mr-2"></i>Cuestionario Inteligente
                </div>
                <div class="adaptive-progress-percentage">${percentage}%</div>
            </div>
            <div class="adaptive-progress-bar">
                <div class="adaptive-progress-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="adaptive-progress-steps">
                ${this.adaptiveProgress.steps.map((step, index) => `
                    <div class="adaptive-progress-step ${
                        index < currentStep ? 'completed' :
                        index === currentStep ? 'current' : ''
                    }">
                        ${step}
                    </div>
                `).join('')}
            </div>
        `;

        // Remove progress when completed
        if (currentStep >= totalSteps) {
            setTimeout(() => {
                progressContainer.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => progressContainer.remove(), 500);
            }, 2000);
        }
    }

    // Intelligent Recommendations Panel
    showRecommendations(recommendations) {
        const container = document.getElementById('intelligent-features-container');
        if (!container) return;

        // Remove existing recommendations
        const existingPanel = container.querySelector('.recommendations-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        if (!recommendations || recommendations.length === 0) return;

        const panel = document.createElement('div');
        panel.className = 'recommendations-panel';

        panel.innerHTML = `
            <div class="recommendations-header">
                <div class="recommendations-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div>
                    <div class="recommendations-title">Recomendaciones Inteligentes</div>
                    <div class="recommendations-subtitle">Basadas en tu industria y análisis</div>
                </div>
            </div>
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-item">
                        <div class="recommendation-priority ${rec.priority}">${rec.priority.toUpperCase()}</div>
                        <div class="recommendation-text">${rec.text}</div>
                        <div class="recommendation-impact">💼 Impacto: ${rec.impact}</div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(panel);
        this.recommendations = recommendations;
    }

    // Industry Insights Widget
    showIndustryInsights(businessType) {
        const container = document.getElementById('intelligent-features-container');
        if (!container) return;

        // Simulate fetching industry benchmarks
        const benchmarks = this.getIndustryBenchmarks(businessType);

        const insights = document.createElement('div');
        insights.className = 'industry-insights';

        insights.innerHTML = `
            <div class="industry-insights-header">
                <div class="industry-insights-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="industry-insights-title">
                    Benchmarks de ${this.getBusinessTypeName(businessType)}
                </div>
            </div>
            <div class="industry-benchmarks">
                ${Object.entries(benchmarks).map(([key, value]) => `
                    <div class="benchmark-item">
                        <div class="benchmark-value">${value.value}</div>
                        <div class="benchmark-label">${value.label}</div>
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(insights);
        this.industryBenchmarks = benchmarks;

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (insights.parentNode) {
                insights.style.animation = 'fadeOut 0.5s ease-out';
                setTimeout(() => insights.remove(), 500);
            }
        }, 10000);
    }

    getIndustryBenchmarks(businessType) {
        const benchmarks = {
            'restaurante': {
                margin: { value: '25%', label: 'Margen Típico' },
                materials: { value: '30%', label: 'Materia Prima' },
                labor: { value: '35%', label: 'Mano de Obra' },
                overhead: { value: '20%', label: 'Gastos Fijos' }
            },
            'tecnologia': {
                margin: { value: '40%', label: 'Margen Típico' },
                materials: { value: '15%', label: 'Recursos' },
                labor: { value: '60%', label: 'Desarrollo' },
                overhead: { value: '25%', label: 'Gastos Fijos' }
            },
            'retail': {
                margin: { value: '35%', label: 'Margen Típico' },
                materials: { value: '50%', label: 'Inventario' },
                labor: { value: '20%', label: 'Personal' },
                overhead: { value: '30%', label: 'Gastos Fijos' }
            },
            'belleza': {
                margin: { value: '45%', label: 'Margen Típico' },
                materials: { value: '25%', label: 'Productos' },
                labor: { value: '40%', label: 'Servicios' },
                overhead: { value: '35%', label: 'Gastos Fijos' }
            }
        };

        return benchmarks[businessType] || benchmarks['servicios'];
    }

    // Analytics Integration
    trackIntelligentFeatureUsage(featureName, data) {
        const analytics = {
            sessionId: this.currentSession,
            feature: featureName,
            timestamp: new Date().toISOString(),
            data: data
        };

        // Send to analytics endpoint
        fetch('/api/analytics/intelligent-features', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analytics)
        }).catch(error => {
            console.warn('Analytics tracking failed:', error);
        });
    }

    // API Integration Methods
    async classifyBusiness(businessInfo) {
        if (!this.enabledFeatures?.businessClassification) return null;

        try {
            const response = await fetch('/api/intelligent/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.currentSession,
                    businessInfo: businessInfo
                })
            });

            if (response.ok) {
                const classification = await response.json();
                this.displayBusinessTypeIndicator(classification.industry, classification.confidence);
                this.trackIntelligentFeatureUsage('businessClassification', classification);
                return classification;
            }
        } catch (error) {
            console.error('Business classification failed:', error);
        }
        return null;
    }

    async validateCost(category, value) {
        if (!this.enabledFeatures?.intelligentValidation) return null;

        try {
            const response = await fetch('/api/intelligent/validate-cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.currentSession,
                    category: category,
                    value: value,
                    businessType: this.businessClassification?.type
                })
            });

            if (response.ok) {
                const validation = await response.json();
                this.showCostValidationAlert(validation);
                this.trackIntelligentFeatureUsage('costValidation', validation);
                return validation;
            }
        } catch (error) {
            console.error('Cost validation failed:', error);
        }
        return null;
    }

    async getAdaptiveQuestions(context) {
        if (!this.enabledFeatures?.adaptiveQuestions) return [];

        try {
            const response = await fetch('/api/intelligent/adaptive-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.currentSession,
                    context: context,
                    businessType: this.businessClassification?.type
                })
            });

            if (response.ok) {
                const questions = await response.json();
                this.trackIntelligentFeatureUsage('adaptiveQuestions', { count: questions.length });
                return questions;
            }
        } catch (error) {
            console.error('Adaptive questions failed:', error);
        }
        return [];
    }

    async generateRecommendations(analysisData) {
        try {
            const response = await fetch('/api/intelligent/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.currentSession,
                    analysisData: analysisData,
                    businessType: this.businessClassification?.type
                })
            });

            if (response.ok) {
                const recommendations = await response.json();
                this.showRecommendations(recommendations);
                this.trackIntelligentFeatureUsage('recommendations', { count: recommendations.length });
                return recommendations;
            }
        } catch (error) {
            console.error('Recommendations generation failed:', error);
        }
        return [];
    }

    // Utility Methods
    isFeatureEnabled(featureName) {
        return this.enabledFeatures && this.enabledFeatures[featureName];
    }

    getSessionSummary() {
        return {
            sessionId: this.currentSession,
            businessClassification: this.businessClassification,
            costValidations: this.costValidations.length,
            recommendations: this.recommendations.length,
            adaptiveProgress: this.adaptiveProgress,
            featuresUsed: Object.keys(this.enabledFeatures || {}).filter(
                key => this.enabledFeatures[key]
            )
        };
    }

    reset() {
        this.currentSession = this.generateSessionId();
        this.businessClassification = null;
        this.costValidations = [];
        this.recommendations = [];
        this.adaptiveProgress.current = 0;

        // Clear UI
        const container = document.getElementById('intelligent-features-container');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Global instance
window.intelligentChatFeatures = new IntelligentChatFeatures();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntelligentChatFeatures;
}