// Chat.js - Sistema de chat para IAtiva
class IAtivaChatSystem {
    constructor() {
        // Detectar modo demo
        this.isDemoMode = window.DEMO_MODE || false;
        this.sessionId = this.isDemoMode && window.DEMO_SESSION_ID ?
                        window.DEMO_SESSION_ID :
                        this.generateSessionId();
        this.context = {};
        this.isProcessing = false;
        this.intelligentFeatures = {
            businessClassified: false,
            costValidationActive: false,
            analysisDepth: 0,
            coherenceScore: 0
        };
        this.init();
    }

    init() {
        console.log('🔧 Inicializando chat sistema...');
        console.log('Demo mode:', this.isDemoMode);
        console.log('Session ID:', this.sessionId);
        
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');

        console.log('Elementos encontrados:');
        console.log('- chatMessages:', this.chatMessages);
        console.log('- messageInput:', this.messageInput);
        console.log('- sendButton:', this.sendButton);

        if (!this.chatMessages || !this.messageInput || !this.sendButton) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }

        console.log('✅ Todos los elementos encontrados, inicializando...');
        this.bindEvents();
        this.showWelcomeMessage();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize del input
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    showWelcomeMessage() {
        const welcomeContent = this.isDemoMode ? 
            `¡Hola! Soy tu asesor virtual de IAtiva. 🧠

🚀 **¡Bienvenido al análisis GRATUITO!**

Te ayudo a calcular el precio perfecto para tu producto o servicio en solo 5 minutos. 

**Sin registro, sin complicaciones, solo resultados profesionales.**

Para comenzar, cuéntame: **¿Cuál es el nombre de tu negocio?**` :
            `¡Hola! Soy tu asesor virtual de IAtiva. 🧠
            
Te ayudo a realizar un análisis completo de costeo para tu negocio.

Para comenzar, cuéntame: **¿Cuál es el nombre de tu negocio?**`;

        const welcomeMessage = {
            type: 'bot',
            content: welcomeContent,
            timestamp: new Date()
        };

        this.addMessage(welcomeMessage);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isProcessing) {
            return;
        }

        // Mostrar mensaje del usuario
        this.addMessage({
            type: 'user',
            content: message,
            timestamp: new Date()
        });

        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.setProcessing(true);

        try {
            // Usar API correcta según el modo
            const apiUrl = this.isDemoMode ? '/api/demo-chat' : '/api/chat';
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: this.sessionId,
                    context: this.context
                })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Actualizar contexto
            if (data.context) {
                this.context = { ...this.context, ...data.context };
            }

            // Mostrar respuesta del bot
            this.addMessage({
                type: 'bot',
                content: data.respuesta || 'Lo siento, no pude procesar tu mensaje.',
                timestamp: new Date()
            });

            // ===== INTELLIGENT FEATURES PROCESSING =====

            // 1. Business classification (trigger on business description)
            if (!this.intelligentFeatures.businessClassified && this.detectBusinessDescription(message)) {
                setTimeout(async () => {
                    await this.classifyBusiness(message);
                }, 1000);
            }

            // 2. Update analysis progress
            if (data.respuesta && data.respuesta.length > 50) {
                setTimeout(async () => {
                    await this.updateAnalysisProgress(this.sessionId);
                }, 1500);
            }

            // 3. Cost validation (trigger when costs are mentioned)
            if (this.detectCostMention(message) && this.intelligentFeatures.businessClassified) {
                setTimeout(async () => {
                    const costs = this.extractCostsFromMessage(message);
                    await this.validateCosts(costs, 'general');
                }, 2000);
            }

            // 4. Generate smart recommendations (trigger on completion)
            if (data.analisisCompleto || this.detectAnalysisCompletion(data.respuesta)) {
                setTimeout(async () => {
                    const analysisData = {
                        businessType: this.intelligentFeatures.businessType,
                        coherenceScore: this.intelligentFeatures.coherenceScore,
                        costs: this.extractAllCosts(),
                        completion: true
                    };
                    await this.getSmartRecommendations(analysisData);
                }, 3000);
            }

            // Si el análisis está completo, mostrar resultados
            if (data.analisisCompleto) {
                if (data.isDemo) {
                    // Modo demo: mostrar modal de guardado
                    setTimeout(() => {
                        this.showDemoComplete(data);
                    }, 4000); // Increased delay to show intelligent features first
                } else {
                    // Modo normal: mostrar análisis completo
                    this.showAnalysisComplete(data);
                }
            }

        } catch (error) {
            console.error('Error en el chat:', error);
            this.addMessage({
                type: 'error',
                content: 'Hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                timestamp: new Date()
            });
        } finally {
            this.setProcessing(false);
        }
    }

    addMessage(message) {
        const messageElement = this.createMessageElement(message);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.type}`;

        const time = message.timestamp.toLocaleTimeString('es-CO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        if (message.type === 'user') {
            div.innerHTML = `
                <div class="flex justify-end mb-4">
                    <div class="max-w-xs lg:max-w-md bg-blue-500 text-white rounded-lg p-3">
                        <p class="text-sm">${this.formatMessage(message.content)}</p>
                        <p class="text-xs opacity-75 mt-1">${time}</p>
                    </div>
                </div>
            `;
        } else if (message.type === 'error') {
            div.innerHTML = `
                <div class="flex justify-start mb-4">
                    <div class="max-w-xs lg:max-w-md bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
                        <div class="flex items-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <p class="text-sm">${this.formatMessage(message.content)}</p>
                        </div>
                        <p class="text-xs opacity-75 mt-1">${time}</p>
                    </div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div class="flex justify-start mb-4">
                    <div class="flex items-start">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-3 mt-1">
                            <img src="/images/logo.png" alt="IAtiva" class="h-4 w-auto">
                        </div>
                        <div class="max-w-xs lg:max-w-md bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                            <p class="text-sm text-gray-800">${this.formatMessage(message.content)}</p>
                            <p class="text-xs text-gray-500 mt-1">${time}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        return div;
    }

    formatMessage(content) {
        // Convertir markdown básico a HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        
        if (processing) {
            this.sendButton.disabled = true;
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
            this.messageInput.disabled = true;
            
            // Mostrar indicador de escritura
            this.showTypingIndicator();
        } else {
            this.sendButton.disabled = false;
            this.sendButton.innerHTML = 'Enviar';
            this.messageInput.disabled = false;
            this.messageInput.focus();
            
            // Ocultar indicador de escritura
            this.hideTypingIndicator();
        }
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'flex justify-start mb-4';
        indicator.innerHTML = `
            <div class="flex items-start">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mr-3 mt-1">
                    <img src="/images/logo.png" alt="IAtiva" class="h-4 w-auto">
                </div>
                <div class="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showAnalysisComplete(data) {
        const completeMessage = {
            type: 'bot',
            content: `🎉 **¡Análisis completado exitosamente!**

Tu análisis de costeo ha sido guardado y está disponible en tu dashboard.

**Resultados principales:**
• Costo unitario: $${data.resultados?.costoUnitario?.toLocaleString('es-CO') || 'N/A'}
• Precio de venta sugerido: $${data.resultados?.precioVenta?.toLocaleString('es-CO') || 'N/A'}
• Punto de equilibrio: ${data.resultados?.puntoEquilibrio || 'N/A'} unidades

[Ver análisis completo](/analisis/${data.analysisId || '#'})`,
            timestamp: new Date()
        };

        setTimeout(() => {
            this.addMessage(completeMessage);
        }, 1000);
    }

    showDemoComplete(data) {
        const completeMessage = {
            type: 'bot',
            content: `🎉 **¡Tu análisis está COMPLETADO!**

**Resultados principales:**
• Costo unitario: $${data.resultados?.costoUnitario?.toLocaleString('es-CO') || 'N/A'}
• Precio de venta sugerido: $${data.resultados?.precioVenta?.toLocaleString('es-CO') || 'N/A'}
• Punto de equilibrio: ${data.resultados?.puntoEquilibrio || 'N/A'} unidades

✨ **¿Quieres guardar estos resultados y recibir el reporte completo por email?**

Solo necesitamos tu email - ¡es gratis y sin compromisos!`,
            timestamp: new Date()
        };

        this.addMessage(completeMessage);

        // Mostrar modal de guardado
        if (window.showSaveModal) {
            setTimeout(() => {
                window.showSaveModal();
            }, 1500);
        }
    }

    // ===== INTELLIGENT FEATURES METHODS =====

    async classifyBusiness(businessInfo) {
        try {
            const response = await fetch('/api/intelligent-features/classify-business', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessInfo: businessInfo,
                    sessionId: this.sessionId
                })
            });

            const data = await response.json();

            if (data.success && data.rollout) {
                this.intelligentFeatures.businessClassified = true;
                this.showBusinessClassification(data.classification);
                return data.classification;
            } else if (data.success && !data.rollout) {
                console.log('Business classification not available in current rollout');
                return null;
            }
        } catch (error) {
            console.error('Business classification error:', error);
        }
        return null;
    }

    showBusinessClassification(classification) {
        const classificationDiv = document.createElement('div');
        classificationDiv.className = 'bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-4 mx-4';
        classificationDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-brain text-blue-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-sm font-semibold text-blue-900 mb-2">
                        🧠 Análisis Inteligente de Negocio
                    </h4>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Tipo de negocio:</span>
                            <span class="text-sm font-medium text-blue-800">${classification.type || 'Detectando...'}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-700">Confianza:</span>
                            <div class="flex items-center">
                                <div class="w-16 h-2 bg-gray-200 rounded-full mr-2">
                                    <div class="h-2 bg-blue-500 rounded-full" style="width: ${(classification.confidence || 0) * 100}%"></div>
                                </div>
                                <span class="text-sm font-medium text-blue-800">${((classification.confidence || 0) * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        ${classification.categories ? `
                        <div class="mt-2">
                            <span class="text-xs text-gray-600">Categorías:</span>
                            <div class="flex flex-wrap gap-1 mt-1">
                                ${classification.categories.slice(0, 3).map(cat =>
                                    `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">${cat}</span>`
                                ).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(classificationDiv);
        this.scrollToBottom();
    }

    async validateCosts(costs, businessType) {
        try {
            const response = await fetch('/api/intelligent-features/validate-costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    costs: costs,
                    businessType: businessType,
                    sessionId: this.sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.intelligentFeatures.costValidationActive = true;
                this.intelligentFeatures.coherenceScore = data.validation.coherenceScore || 0;
                this.showCostValidationAlerts(data.validation);
                return data.validation;
            }
        } catch (error) {
            console.error('Cost validation error:', error);
        }
        return null;
    }

    showCostValidationAlerts(validation) {
        if (validation.warnings && validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
                this.showCostAlert(warning, 'warning');
            });
        }

        if (validation.suggestions && validation.suggestions.length > 0) {
            validation.suggestions.forEach(suggestion => {
                this.showCostAlert(suggestion, 'suggestion');
            });
        }

        // Show coherence score
        if (validation.coherenceScore !== undefined) {
            this.showCoherenceScore(validation.coherenceScore);
        }
    }

    showCostAlert(alert, type) {
        const alertDiv = document.createElement('div');
        const isWarning = type === 'warning';
        const bgColor = isWarning ? 'from-yellow-50 to-orange-50' : 'from-green-50 to-blue-50';
        const borderColor = isWarning ? 'border-yellow-200' : 'border-green-200';
        const iconColor = isWarning ? 'text-yellow-600' : 'text-green-600';
        const icon = isWarning ? 'fa-exclamation-triangle' : 'fa-lightbulb';

        alertDiv.className = `bg-gradient-to-r ${bgColor} border ${borderColor} rounded-lg p-3 mb-3 mx-4 transform transition-all duration-300 hover:scale-102`;
        alertDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center ${isWarning ? 'bg-yellow-100' : 'bg-green-100'}">
                        <i class="fas ${icon} ${iconColor} text-sm"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h5 class="text-sm font-medium ${isWarning ? 'text-yellow-900' : 'text-green-900'} mb-1">
                        ${isWarning ? '⚠️ Alerta de Costos' : '💡 Sugerencia Inteligente'}
                    </h5>
                    <p class="text-sm text-gray-700">${alert.message || alert}</p>
                    ${alert.impact ? `<p class="text-xs text-gray-600 mt-1">Impacto: ${alert.impact}</p>` : ''}
                </div>
            </div>
        `;
        this.chatMessages.appendChild(alertDiv);
        this.scrollToBottom();
    }

    showCoherenceScore(score) {
        const scoreDiv = document.createElement('div');
        const scorePercent = Math.round(score * 100);
        const scoreColor = score >= 0.8 ? 'green' : score >= 0.6 ? 'yellow' : 'red';

        scoreDiv.className = 'bg-white border border-gray-200 rounded-lg p-3 mb-3 mx-4 shadow-sm';
        scoreDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-chart-bar text-purple-600 text-sm"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-medium text-gray-900">Coherencia del Análisis</h5>
                        <p class="text-xs text-gray-600">Calidad de los datos ingresados</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-${scoreColor}-600">${scorePercent}%</div>
                    <div class="w-16 h-2 bg-gray-200 rounded-full">
                        <div class="h-2 bg-${scoreColor}-500 rounded-full transition-all duration-500" style="width: ${scorePercent}%"></div>
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(scoreDiv);
        this.scrollToBottom();
    }

    async updateAnalysisProgress(sessionId) {
        try {
            const response = await fetch('/api/intelligent-features/progress-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionId })
            });

            const data = await response.json();

            if (data.success) {
                this.intelligentFeatures.analysisDepth = data.progress.analysisDepth || 0;
                this.showIntelligentProgressBar(data.progress);
                return data.progress;
            }
        } catch (error) {
            console.error('Progress analysis error:', error);
        }
        return null;
    }

    showIntelligentProgressBar(progress) {
        let progressContainer = document.getElementById('intelligent-progress');

        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'intelligent-progress';
            progressContainer.className = 'bg-white border border-gray-200 rounded-lg p-4 mb-4 mx-4 shadow-sm';

            // Insert at the top of chat messages
            this.chatMessages.insertBefore(progressContainer, this.chatMessages.firstChild);
        }

        const completionPercent = Math.round(progress.completionScore * 100);
        const depthLevel = progress.analysisDepth || 0;

        progressContainer.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-chart-line text-indigo-600 text-sm"></i>
                    </div>
                    <div>
                        <h5 class="text-sm font-medium text-gray-900">Progreso del Análisis Inteligente</h5>
                        <p class="text-xs text-gray-600">Profundidad: Nivel ${depthLevel} de 5</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-semibold text-indigo-600">${completionPercent}%</div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-xs text-gray-600">
                    <span>Básico</span>
                    <span>Intermedio</span>
                    <span>Avanzado</span>
                    <span>Experto</span>
                    <span>Completo</span>
                </div>
                <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full transition-all duration-500"
                         style="width: ${completionPercent}%"></div>
                </div>
            </div>

            ${progress.nextSuggestions && progress.nextSuggestions.length > 0 ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
                <p class="text-xs font-medium text-gray-700 mb-2">🎯 Próximos pasos sugeridos:</p>
                <div class="flex flex-wrap gap-1">
                    ${progress.nextSuggestions.slice(0, 3).map(suggestion =>
                        `<span class="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border">${suggestion}</span>`
                    ).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    async getSmartRecommendations(analysisData) {
        try {
            const response = await fetch('/api/intelligent-features/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    analysisData: analysisData,
                    sessionId: this.sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSmartRecommendationsPanel(data.recommendations);
                return data.recommendations;
            }
        } catch (error) {
            console.error('Smart recommendations error:', error);
        }
        return null;
    }

    showSmartRecommendationsPanel(recommendations) {
        const panelDiv = document.createElement('div');
        panelDiv.className = 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4 mx-4 shadow-sm';
        panelDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-magic text-purple-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-sm font-semibold text-purple-900 mb-3">
                        ✨ Recomendaciones Inteligentes Personalizadas
                    </h4>

                    ${recommendations.marketing ? `
                    <div class="mb-3">
                        <h5 class="text-xs font-medium text-purple-800 mb-2">📈 Marketing & Ventas</h5>
                        <ul class="space-y-1">
                            ${recommendations.marketing.slice(0, 3).map(rec =>
                                `<li class="text-xs text-gray-700 flex items-start">
                                    <i class="fas fa-check-circle text-green-500 mr-2 mt-0.5"></i>
                                    ${rec}
                                </li>`
                            ).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${recommendations.optimization ? `
                    <div class="mb-3">
                        <h5 class="text-xs font-medium text-purple-800 mb-2">⚡ Optimización</h5>
                        <ul class="space-y-1">
                            ${recommendations.optimization.slice(0, 2).map(rec =>
                                `<li class="text-xs text-gray-700 flex items-start">
                                    <i class="fas fa-lightbulb text-yellow-500 mr-2 mt-0.5"></i>
                                    ${rec}
                                </li>`
                            ).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${recommendations.priority ? `
                    <div class="flex items-center justify-between mt-3 pt-3 border-t border-purple-200">
                        <span class="text-xs text-purple-700">Prioridad:</span>
                        <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                            ${recommendations.priority}
                        </span>
                    </div>
                    ` : ''}

                    ${recommendations.estimatedImpact ? `
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-purple-700">Impacto estimado:</span>
                        <span class="text-xs font-medium text-green-700">
                            ${recommendations.estimatedImpact}
                        </span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        this.chatMessages.appendChild(panelDiv);
        this.scrollToBottom();
    }

    // ===== INTELLIGENT DETECTION METHODS =====

    detectBusinessDescription(message) {
        const businessKeywords = [
            'negocio', 'empresa', 'emprendimiento', 'startup',
            'vendo', 'vendemos', 'producto', 'servicio',
            'restaurante', 'tienda', 'local', 'consultoría',
            'software', 'desarrollo', 'marketing', 'diseño',
            'panadería', 'peluquería', 'ferretería', 'farmacia',
            'mi empresa', 'nuestro negocio', 'nos dedicamos'
        ];

        const lowerMessage = message.toLowerCase();
        return businessKeywords.some(keyword => lowerMessage.includes(keyword)) &&
               message.length > 20; // Ensure it's descriptive enough
    }

    detectCostMention(message) {
        const costKeywords = [
            'costo', 'precio', 'gasto', 'inversión',
            'pago', 'compra', 'vale', 'cuesta',
            'materiales', 'ingredientes', 'insumos',
            'salario', 'sueldo', 'mano de obra',
            'alquiler', 'arriendo', 'servicios',
            'presupuesto', 'dinero', '$', 'pesos'
        ];

        const lowerMessage = message.toLowerCase();
        return costKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    detectAnalysisCompletion(response) {
        if (!response) return false;

        const completionIndicators = [
            'análisis completo', 'resultados finales',
            'precio sugerido', 'punto de equilibrio',
            'recomendaciones', 'plan de acción',
            'resumen', 'conclusiones'
        ];

        const lowerResponse = response.toLowerCase();
        return completionIndicators.some(indicator => lowerResponse.includes(indicator));
    }

    extractCostsFromMessage(message) {
        const costs = {};
        const costRegex = /\$?[\d,]+\.?\d*/g;
        const numbers = message.match(costRegex);

        if (numbers) {
            // Try to categorize costs based on context
            const lowerMessage = message.toLowerCase();

            if (lowerMessage.includes('material') || lowerMessage.includes('ingrediente')) {
                costs.materials = parseFloat(numbers[0].replace(/[$,]/g, ''));
            } else if (lowerMessage.includes('mano de obra') || lowerMessage.includes('salario')) {
                costs.labor = parseFloat(numbers[0].replace(/[$,]/g, ''));
            } else if (lowerMessage.includes('alquiler') || lowerMessage.includes('arriendo')) {
                costs.rent = parseFloat(numbers[0].replace(/[$,]/g, ''));
            } else {
                costs.general = parseFloat(numbers[0].replace(/[$,]/g, ''));
            }
        }

        return costs;
    }

    extractAllCosts() {
        // This would extract costs from the conversation history
        // For now, return a sample structure
        return {
            materials: this.context.materialCosts || 0,
            labor: this.context.laborCosts || 0,
            overhead: this.context.overheadCosts || 0,
            total: this.context.totalCosts || 0
        };
    }
}

// Inicializar el sistema de chat cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chat-container')) {
        window.iativaChat = new IAtivaChatSystem();
    }
});