// Chat.js - Sistema de chat para IAtiva
class IAtivaChatSystem {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.context = {};
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');

        if (!this.chatMessages || !this.messageInput || !this.sendButton) {
            console.error('Elementos del chat no encontrados');
            return;
        }

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
        const welcomeMessage = {
            type: 'bot',
            content: `¡Hola! Soy tu asesor virtual de IAtiva. 🧠
            
Te ayudo a realizar un análisis completo de costeo para tu negocio.

Para comenzar, cuéntame: **¿Cuál es el nombre de tu negocio?**`,
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
            const response = await fetch('/api/chat', {
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

            // Si el análisis está completo, mostrar resultados
            if (data.analisisCompleto) {
                this.showAnalysisComplete(data);
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
                            <i class="fas fa-brain text-white text-sm"></i>
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
                    <i class="fas fa-brain text-white text-sm"></i>
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
}

// Inicializar el sistema de chat cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chat-container')) {
        window.iativaChat = new IAtivaChatSystem();
    }
});