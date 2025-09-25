/**
 * Interactive Help Widget for Intelligent Features
 * Provides contextual help and guidance within the application
 */

class IntelligentFeaturesHelp {
    constructor() {
        this.isVisible = false;
        this.currentContext = null;
        this.helpData = {
            businessType: {
                title: "🏢 Business Type Detection",
                explanation: "Our AI automatically identifies your business type based on the information you provide.",
                tips: [
                    "Use clear, descriptive business names",
                    "Include industry keywords in descriptions",
                    "Provide complete business information"
                ],
                confidenceGuide: {
                    high: "90-100%: Highly confident - trust the results",
                    medium: "75-89%: Good confidence - results likely accurate",
                    low: "60-74%: Moderate confidence - review if needed",
                    poor: "Below 60%: Low confidence - please verify manually"
                }
            },
            costValidation: {
                title: "💰 Cost Validation Alerts",
                explanation: "Smart alerts help identify unusual or potentially incorrect cost entries.",
                alertTypes: {
                    critical: "🔴 Critical: Significant issues detected - review immediately",
                    warning: "🟡 Warning: Unusual but possibly correct - verify entry",
                    info: "ℹ️ Info: Helpful suggestions for optimization"
                },
                commonCauses: [
                    "Costs significantly above/below industry average",
                    "Unusual cost category for your business type",
                    "Data entry errors (extra zeros, wrong decimal place)",
                    "Seasonal variations or one-time expenses"
                ]
            },
            coherenceScore: {
                title: "📊 Coherence Score",
                explanation: "Measures how well all your business information fits together logically.",
                scoreRanges: {
                    excellent: "90-100: Excellent - everything fits perfectly",
                    veryGood: "80-89: Very good - minor inconsistencies",
                    good: "70-79: Good - some areas need attention",
                    fair: "60-69: Fair - several inconsistencies found",
                    poor: "Below 60: Poor - significant problems detected"
                },
                improvementTips: [
                    "Complete all required fields",
                    "Use consistent terminology",
                    "Ensure realistic cost relationships",
                    "Verify all data for accuracy"
                ]
            },
            recommendations: {
                title: "🎯 Intelligent Recommendations",
                explanation: "Personalized suggestions based on your business profile and industry benchmarks.",
                priorityLevels: {
                    high: "🔥 High: Critical for success - implement within 30 days",
                    medium: "⭐ Medium: Important improvement - implement within 90 days",
                    low: "💡 Low: Nice to have - consider for future planning"
                },
                types: [
                    "💰 Cost Optimization - Reduce expenses while maintaining quality",
                    "📈 Revenue Enhancement - Increase income and growth",
                    "⚡ Operational Efficiency - Streamline processes",
                    "🎯 Strategic Growth - Long-term development"
                ]
            }
        };

        this.createWidget();
    }

    createWidget() {
        // Create help widget container
        const widget = document.createElement('div');
        widget.id = 'intelligent-help-widget';
        widget.className = 'help-widget';
        widget.innerHTML = `
            <div class="help-widget-toggle" onclick="intelligentHelp.toggleWidget()">
                <span class="help-icon">💡</span>
                <span class="help-text">Help</span>
            </div>
            <div class="help-widget-panel" id="help-panel">
                <div class="help-header">
                    <h3>🧠 Intelligent Features Help</h3>
                    <button class="close-btn" onclick="intelligentHelp.hideWidget()">&times;</button>
                </div>
                <div class="help-content" id="help-content">
                    ${this.getMainMenu()}
                </div>
            </div>
        `;

        // Add CSS styles
        this.addStyles();

        // Add to page
        document.body.appendChild(widget);

        // Set up context detection
        this.setupContextDetection();
    }

    addStyles() {
        const styles = `
            .help-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .help-widget-toggle {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
            }

            .help-widget-toggle:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
            }

            .help-widget-panel {
                position: absolute;
                bottom: 60px;
                right: 0;
                width: 380px;
                max-height: 500px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                border: 1px solid #e1e8ed;
                display: none;
                animation: slideUp 0.3s ease;
            }

            .help-widget-panel.visible {
                display: block;
            }

            @keyframes slideUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .help-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .help-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .close-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .help-content {
                padding: 20px;
                max-height: 400px;
                overflow-y: auto;
            }

            .help-menu {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .help-menu-item {
                padding: 12px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
                border: 1px solid #e1e8ed;
                margin-bottom: 8px;
            }

            .help-menu-item:hover {
                background-color: #f7f9fb;
            }

            .help-menu-item-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: #1a1a1a;
            }

            .help-menu-item-desc {
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }

            .help-section {
                display: none;
            }

            .help-section.active {
                display: block;
            }

            .help-section h4 {
                color: #1a1a1a;
                margin: 0 0 12px 0;
                font-size: 16px;
            }

            .help-section p {
                color: #444;
                line-height: 1.5;
                margin: 0 0 16px 0;
            }

            .help-list {
                list-style: none;
                padding: 0;
                margin: 0 0 16px 0;
            }

            .help-list li {
                padding: 8px 12px;
                background: #f8f9fa;
                margin-bottom: 4px;
                border-radius: 6px;
                border-left: 3px solid #667eea;
                font-size: 14px;
            }

            .back-btn {
                background: #667eea;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                margin-bottom: 16px;
                transition: background-color 0.2s;
            }

            .back-btn:hover {
                background: #5a6fd8;
            }

            .context-tip {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                color: white;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
            }

            @media (max-width: 480px) {
                .help-widget {
                    bottom: 10px;
                    right: 10px;
                }

                .help-widget-panel {
                    width: calc(100vw - 40px);
                    max-width: 350px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    getMainMenu() {
        return `
            <div class="help-section active" id="main-menu">
                ${this.getContextualTip()}
                <ul class="help-menu">
                    <li class="help-menu-item" onclick="intelligentHelp.showSection('businessType')">
                        <div class="help-menu-item-title">🏢 Business Type Detection</div>
                        <div class="help-menu-item-desc">How automatic business type identification works</div>
                    </li>
                    <li class="help-menu-item" onclick="intelligentHelp.showSection('costValidation')">
                        <div class="help-menu-item-title">💰 Cost Validation Alerts</div>
                        <div class="help-menu-item-desc">Understanding smart cost validation warnings</div>
                    </li>
                    <li class="help-menu-item" onclick="intelligentHelp.showSection('coherenceScore')">
                        <div class="help-menu-item-title">📊 Coherence Scores</div>
                        <div class="help-menu-item-desc">How to interpret data consistency scores</div>
                    </li>
                    <li class="help-menu-item" onclick="intelligentHelp.showSection('recommendations')">
                        <div class="help-menu-item-title">🎯 Intelligent Recommendations</div>
                        <div class="help-menu-item-desc">Getting the most from AI suggestions</div>
                    </li>
                </ul>
            </div>
            ${this.getAllSections()}
        `;
    }

    getContextualTip() {
        // Detect current page context and provide relevant tip
        const currentPage = window.location.pathname;
        const pageContent = document.body.textContent.toLowerCase();

        let tip = '';

        if (pageContent.includes('business type') || pageContent.includes('confidence')) {
            tip = '💡 Tip: You\'re viewing business type detection results. Click "Business Type Detection" below for detailed help.';
        } else if (pageContent.includes('cost') && pageContent.includes('validation')) {
            tip = '💡 Tip: You have cost validation alerts. Click "Cost Validation" below to understand what they mean.';
        } else if (pageContent.includes('coherence') || pageContent.includes('score')) {
            tip = '💡 Tip: Coherence scores measure data consistency. Click "Coherence Scores" below for guidance.';
        } else if (pageContent.includes('recommendation')) {
            tip = '💡 Tip: You have intelligent recommendations available. Learn how to use them effectively.';
        } else {
            tip = '🎯 Quick Start: Select any topic below to learn about our intelligent features.';
        }

        return tip ? `<div class="context-tip">${tip}</div>` : '';
    }

    getAllSections() {
        return Object.entries(this.helpData).map(([key, data]) =>
            this.createSection(key, data)
        ).join('');
    }

    createSection(key, data) {
        let content = `
            <div class="help-section" id="section-${key}">
                <button class="back-btn" onclick="intelligentHelp.showMainMenu()">← Back to Menu</button>
                <h4>${data.title}</h4>
                <p>${data.explanation}</p>
        `;

        // Add specific content based on section type
        if (data.confidenceGuide) {
            content += '<h5>Confidence Levels:</h5><ul class="help-list">';
            Object.entries(data.confidenceGuide).forEach(([level, desc]) => {
                content += `<li>${desc}</li>`;
            });
            content += '</ul>';
        }

        if (data.alertTypes) {
            content += '<h5>Alert Types:</h5><ul class="help-list">';
            Object.entries(data.alertTypes).forEach(([type, desc]) => {
                content += `<li>${desc}</li>`;
            });
            content += '</ul>';
        }

        if (data.scoreRanges) {
            content += '<h5>Score Ranges:</h5><ul class="help-list">';
            Object.entries(data.scoreRanges).forEach(([range, desc]) => {
                content += `<li>${desc}</li>`;
            });
            content += '</ul>';
        }

        if (data.priorityLevels) {
            content += '<h5>Priority Levels:</h5><ul class="help-list">';
            Object.entries(data.priorityLevels).forEach(([priority, desc]) => {
                content += `<li>${desc}</li>`;
            });
            content += '</ul>';
        }

        if (data.tips) {
            content += '<h5>Tips for Best Results:</h5><ul class="help-list">';
            data.tips.forEach(tip => {
                content += `<li>${tip}</li>`;
            });
            content += '</ul>';
        }

        if (data.commonCauses) {
            content += '<h5>Common Causes:</h5><ul class="help-list">';
            data.commonCauses.forEach(cause => {
                content += `<li>${cause}</li>`;
            });
            content += '</ul>';
        }

        if (data.improvementTips) {
            content += '<h5>How to Improve:</h5><ul class="help-list">';
            data.improvementTips.forEach(tip => {
                content += `<li>${tip}</li>`;
            });
            content += '</ul>';
        }

        if (data.types) {
            content += '<h5>Recommendation Types:</h5><ul class="help-list">';
            data.types.forEach(type => {
                content += `<li>${type}</li>`;
            });
            content += '</ul>';
        }

        content += '</div>';
        return content;
    }

    toggleWidget() {
        const panel = document.getElementById('help-panel');
        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            panel.classList.add('visible');
            this.showMainMenu(); // Reset to main menu
        } else {
            panel.classList.remove('visible');
        }
    }

    showWidget() {
        const panel = document.getElementById('help-panel');
        this.isVisible = true;
        panel.classList.add('visible');
        this.showMainMenu();
    }

    hideWidget() {
        const panel = document.getElementById('help-panel');
        this.isVisible = false;
        panel.classList.remove('visible');
    }

    showSection(sectionKey) {
        // Hide all sections
        document.querySelectorAll('.help-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show requested section
        const section = document.getElementById(`section-${sectionKey}`);
        if (section) {
            section.classList.add('active');
        }
    }

    showMainMenu() {
        // Hide all sections
        document.querySelectorAll('.help-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show main menu
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) {
            mainMenu.classList.add('active');
            // Update contextual tip
            const tipElement = mainMenu.querySelector('.context-tip');
            if (tipElement) {
                tipElement.innerHTML = this.getContextualTip().replace('<div class="context-tip">', '').replace('</div>', '');
            }
        }
    }

    setupContextDetection() {
        // Monitor page changes and provide contextual help
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if new content suggests showing help
                    const addedNodes = Array.from(mutation.addedNodes);
                    addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkForHelpTriggers(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForHelpTriggers(element) {
        const text = element.textContent?.toLowerCase() || '';

        // Auto-show help for specific scenarios
        if (text.includes('confidence score below') ||
            text.includes('cost validation warning') ||
            text.includes('coherence score:')) {

            // Add a subtle pulse animation to draw attention to help
            setTimeout(() => {
                const toggle = document.querySelector('.help-widget-toggle');
                if (toggle) {
                    toggle.style.animation = 'pulse 2s infinite';
                    setTimeout(() => {
                        toggle.style.animation = '';
                    }, 6000);
                }
            }, 1000);
        }
    }
}

// Add pulse animation for attention
const pulseKeyframes = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;

const pulseStyles = document.createElement('style');
pulseStyles.textContent = pulseKeyframes;
document.head.appendChild(pulseStyles);

// Initialize help widget when page loads
let intelligentHelp;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        intelligentHelp = new IntelligentFeaturesHelp();
    });
} else {
    intelligentHelp = new IntelligentFeaturesHelp();
}