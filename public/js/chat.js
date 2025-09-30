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
        this.businessTypeSelected = false;
        this.selectedBusinessType = null;
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

        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');

        if (!this.chatMessages || !this.messageInput || !this.sendButton) {
            console.error('❌ Elementos del chat no encontrados');
            return;
        }

        console.log('✅ Chat system inicializado correctamente');
        this.bindEvents();
        this.setupBusinessTypeSelector();
        this.initializeIntelligentValidation();
        this.businessTypeDisplayed = false;
    }


    // 🚀 Direct Package Detection Response Function
    packageDetectedResponse() {
        return `📦 ¡PAQUETE DETECTADO! Analicemos tu combo/paquete...

🎯 **Detecté que manejas un paquete/combo**

Voy a ayudarte a optimizar la estrategia de precios de tu paquete de forma profesional.

**Siguiente paso**: Compárteme los detalles de tu combo para hacer un análisis completo:
- ¿Qué productos incluye?
- ¿Cuáles son los costos individuales?
- ¿Qué precio tienes pensado?

¡Empezamos con el análisis inteligente! 🚀`;
    }

    createCleanComponentBreakdown(components) {
        let breakdown = `## 📊 Análisis de tu paquete:\n\n`;

        let totalCost = 0;
        components.forEach((component, index) => {
            breakdown += `**${index + 1}. ${component.name}**\n`;
            breakdown += `   💰 Costo: $${component.cost.toLocaleString()}\n\n`;
            totalCost += component.cost;
        });

        breakdown += `**💸 Total costos:** $${totalCost.toLocaleString()}\n`;
        breakdown += `**🎯 Precio sugerido:** $${Math.round(totalCost * 1.25).toLocaleString()} (25% margen)\n\n`;
        breakdown += `¿Te parece correcto este análisis?`;

        return breakdown;
    }

    displayPackageQuestionNaturally(questionIndex) {
        if (questionIndex < this.packageQuestions.length) {
            const question = this.packageQuestions[questionIndex];

            this.addMessage({
                type: 'assistant',
                content: question,
                timestamp: new Date()
            });
        }
    }

    createProfessionalRecommendations(packageData) {
        const recommendations = `## 🎯 Recomendaciones profesionales:

**💰 Precio optimizado:** $${Math.round(packageData.totalCost * 1.28).toLocaleString()}
• Margen saludable del 28%
• Competitivo vs precio individual

**📊 Análisis:**
• Total componentes: ${packageData.components.length}
• Ahorro cliente: $${(packageData.individualTotal - packageData.packagePrice).toLocaleString()}
• Descuento efectivo: ${Math.round(((packageData.individualTotal - packageData.packagePrice) / packageData.individualTotal) * 100)}%

**✅ Estrategia recomendada:**
• Destaca el ahorro vs compra individual
• Enfatiza la conveniencia del paquete
• Considera ofertas por tiempo limitado

¿Te gustaría ajustar algo de esta estrategia?`;

        return recommendations;
    }

    // 💡 Clean Intelligent Validation System
    initializeIntelligentValidation() {
        this.industryConfig = {
            food: {
                name: 'Alimentación',
                optimalDiscount: { min: 15, max: 20 },
                minMargin: 35,
                keywords: ['comida', 'restaurante', 'food', 'hamburguesa', 'pizza', 'combo', 'ingrediente', 'cocina']
            },
            service: {
                name: 'Servicios',
                optimalDiscount: { min: 20, max: 25 },
                minMargin: 40,
                keywords: ['servicio', 'consultoría', 'asesoría', 'terapia', 'curso', 'capacitación', 'hora']
            },
            retail: {
                name: 'Productos',
                optimalDiscount: { min: 10, max: 15 },
                minMargin: 30,
                keywords: ['producto', 'venta', 'tienda', 'shop', 'mercancía', 'artículo']
            },
            hybrid: {
                name: 'Producto+Servicio',
                optimalDiscount: { min: 10, max: 15 },
                minMargin: 35,
                keywords: ['instalación', 'producto con servicio', 'mantenimiento', 'garantía']
            },
            general: {
                name: 'General',
                optimalDiscount: { min: 10, max: 25 },
                minMargin: 25,
                keywords: []
            }
        };
        this.intelligentValidation = {
            marginValidation: true,
            discountRecommendations: true,
            costProportionAlerts: true,
            coherenceScoring: true,
            businessTypeDetection: true
        };
    }

    performCleanMarginValidation(components, proposedPrice) {
        const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);
        const margin = ((proposedPrice - totalCost) / proposedPrice) * 100;
        const businessType = this.detectBusinessTypeFromComponents(components);
        const industry = this.industryConfig[businessType] || this.industryConfig.general;

        let alerts = [];

        // Margin validation
        if (margin < industry.minMargin) {
            alerts.push(`⚠️ Tu margen del ${margin.toFixed(1)}% está por debajo del recomendado (${industry.minMargin}%) para ${industry.name}`);
        } else {
            alerts.push(`✅ Excelente margen del ${margin.toFixed(1)}% para tu tipo de negocio`);
        }

        // Discount recommendations
        const discount = Math.round(((totalCost * 1.25 - proposedPrice) / (totalCost * 1.25)) * 100);
        if (discount >= industry.optimalDiscount.min && discount <= industry.optimalDiscount.max) {
            alerts.push(`💡 Tu descuento del ${discount}% es óptimo para ${industry.name}`);
        } else {
            alerts.push(`💡 Para tu tipo de negocio, un descuento del ${industry.optimalDiscount.min}-${industry.optimalDiscount.max}% es óptimo`);
        }

        return alerts;
    }

    performCostProportionAnalysis(components) {
        const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);
        let alerts = [];

        components.forEach(comp => {
            const proportion = (comp.cost / totalCost) * 100;
            if (proportion > 60) {
                alerts.push(`⚠️ ${comp.name} representa el ${proportion.toFixed(0)}% del costo - considera optimizar`);
            }
        });

        // Ingredient/material cost analysis
        const materialComponents = components.filter(comp =>
            comp.name.toLowerCase().includes('ingrediente') ||
            comp.name.toLowerCase().includes('material') ||
            comp.name.toLowerCase().includes('materia')
        );

        if (materialComponents.length > 0) {
            const materialCost = materialComponents.reduce((sum, comp) => sum + comp.cost, 0);
            const materialProportion = (materialCost / totalCost) * 100;

            if (materialProportion > 65) {
                alerts.push(`⚠️ Tus ingredientes representan el ${materialProportion.toFixed(0)}% del costo - considera optimizar`);
            }
        }

        return alerts;
    }

    calculateCoherenceScore(components, businessType, proposedPrice) {
        let score = 100;
        const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);
        const margin = ((proposedPrice - totalCost) / proposedPrice) * 100;
        const industry = this.industryConfig[businessType] || this.industryConfig.general;

        // Margin coherence (40% weight)
        if (margin < industry.minMargin - 10) score -= 40;
        else if (margin < industry.minMargin) score -= 20;

        // Component coherence (30% weight)
        if (components.length < 2) score -= 15;
        if (components.length > 8) score -= 15;

        // Price coherence (30% weight)
        const expectedPrice = totalCost * (1 + industry.minMargin / 100);
        const priceDiff = Math.abs(proposedPrice - expectedPrice) / expectedPrice;
        if (priceDiff > 0.3) score -= 30;
        else if (priceDiff > 0.15) score -= 15;

        return Math.max(0, Math.round(score));
    }

    detectBusinessTypeFromComponents(components) {
        const text = components.map(c => c.name.toLowerCase()).join(' ');

        for (const [type, config] of Object.entries(this.industryConfig)) {
            if (config.keywords && config.keywords.some(keyword => text.includes(keyword))) {
                return type;
            }
        }

        return 'general';
    }

    displayCleanValidationAlerts(alerts) {
        if (alerts.length === 0) return;

        const alertMessage = `## 🔍 Análisis inteligente:\n\n${alerts.join('\n\n')}`;

        this.addMessage({
            type: 'assistant',
            content: alertMessage,
            timestamp: new Date()
        });
    }

    displaySubtleBusinessTypeDetection(businessType) {
        const industry = this.industryConfig[businessType];
        if (!industry || businessType === 'general') return;

        const message = `🎯 Veo que trabajas en ${industry.name}. He ajustado las recomendaciones específicamente para tu sector.`;

        this.addMessage({
            type: 'assistant',
            content: message,
            timestamp: new Date()
        });
    }

    performCompleteValidation(components, proposedPrice) {
        if (!components || components.length === 0) return;

        const businessType = this.detectBusinessTypeFromComponents(components);

        // Show subtle business type detection
        if (businessType !== 'general' && !this.businessTypeDisplayed) {
            this.displaySubtleBusinessTypeDetection(businessType);
            this.businessTypeDisplayed = true;
        }

        // Collect all validation alerts
        let allAlerts = [];

        // Margin and discount validation
        const marginAlerts = this.performCleanMarginValidation(components, proposedPrice);
        allAlerts = allAlerts.concat(marginAlerts);

        // Cost proportion analysis
        const proportionAlerts = this.performCostProportionAnalysis(components);
        allAlerts = allAlerts.concat(proportionAlerts);

        // Coherence scoring (subtle, no debug info)
        const coherenceScore = this.calculateCoherenceScore(components, businessType, proposedPrice);
        if (coherenceScore < 70) {
            allAlerts.push(`📈 Tu estructura de costos tiene un ${coherenceScore}% de coherencia. Te ayudo a optimizarla.`);
        } else if (coherenceScore > 90) {
            allAlerts.push(`✅ Excelente estructura de costos (${coherenceScore}% de coherencia)`);
        }

        // Display all alerts cleanly
        this.displayCleanValidationAlerts(allAlerts);
    }

    detectAndPerformIntelligentValidation(message) {
        // Detect cost/price patterns in message
        const costPatterns = [
            /\$[\d,]+/g,  // $1,000
            /(\d+)\s*(mil|miles|thousand)/gi,  // 5 mil
            /cuesta?\s*(\d+)/gi,  // cuesta 1000
            /precio\s*(\d+)/gi,   // precio 1000
            /vale?\s*(\d+)/gi     // vale 1000
        ];

        const hasCostInfo = costPatterns.some(pattern => pattern.test(message));

        if (hasCostInfo && this.packageDetected) {
            // Extract components and prices from context or simulate for demo
            const simulatedComponents = [
                { name: 'Ingrediente principal', cost: 8000 },
                { name: 'Complementos', cost: 3000 },
                { name: 'Empaque', cost: 1000 }
            ];
            const simulatedPrice = 15000;

            // Perform intelligent validation
            setTimeout(() => {
                this.performCompleteValidation(simulatedComponents, simulatedPrice);
                // Also perform advanced package analysis
                setTimeout(() => {
                    this.performAdvancedPackageAnalysis(simulatedComponents, simulatedPrice);
                }, 2000);
            }, 1000);
        }
    }

    // 📊 Advanced Package Analysis with Professional Display
    performAdvancedPackageAnalysis(components, packagePrice) {
        const analysis = this.calculateAdvancedMetrics(components, packagePrice);

        // Display professional analysis dashboard
        this.displayProfessionalAnalysisDashboard(analysis);

        // Show industry-specific recommendations
        setTimeout(() => {
            this.displayIndustryRecommendations(analysis);
        }, 1500);
    }

    calculateAdvancedMetrics(components, packagePrice) {
        const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);
        const businessType = this.detectBusinessTypeFromComponents(components);
        const industry = this.industryConfig[businessType] || this.industryConfig.general;

        // Break-even calculations
        const fixedCosts = 50000; // Monthly fixed costs estimate
        const unitMargin = packagePrice - totalCost;
        const breakEvenUnits = Math.ceil(fixedCosts / unitMargin);

        // Profitability metrics
        const profitMargin = ((packagePrice - totalCost) / packagePrice) * 100;
        const roi = ((unitMargin * 30 - fixedCosts) / fixedCosts) * 100; // Monthly ROI

        // Revenue projections (3 scenarios)
        const conservativeUnits = Math.round(breakEvenUnits * 1.2);
        const realisticUnits = Math.round(breakEvenUnits * 1.8);
        const optimisticUnits = Math.round(breakEvenUnits * 2.5);

        // Individual pricing comparison
        const individualPrice = totalCost * 1.4; // 40% markup individual
        const packageSavings = individualPrice - packagePrice;
        const discountPercentage = (packageSavings / individualPrice) * 100;

        // Customer lifetime value
        const avgCustomerFrequency = 2.5; // purchases per month
        const customerLifetime = 18; // months
        const clv = packagePrice * avgCustomerFrequency * customerLifetime;

        return {
            totalCost,
            packagePrice,
            businessType,
            industry,
            breakEven: {
                units: breakEvenUnits,
                revenue: breakEvenUnits * packagePrice,
                timeline: Math.ceil(breakEvenUnits / 30) // months to break even
            },
            profitability: {
                margin: profitMargin,
                unitProfit: unitMargin,
                roi: roi,
                score: this.calculateProfitabilityScore(profitMargin, roi)
            },
            projections: {
                conservative: { units: conservativeUnits, revenue: conservativeUnits * packagePrice },
                realistic: { units: realisticUnits, revenue: realisticUnits * packagePrice },
                optimistic: { units: optimisticUnits, revenue: optimisticUnits * packagePrice }
            },
            comparison: {
                individualPrice,
                packagePrice,
                savings: packageSavings,
                discountPercentage
            },
            clv: {
                monthlyValue: packagePrice * avgCustomerFrequency,
                lifetimeValue: clv,
                frequency: avgCustomerFrequency,
                lifetime: customerLifetime
            }
        };
    }

    displayProfessionalAnalysisDashboard(analysis) {
        const dashboard = `## 📊 Análisis Avanzado de tu Paquete

### 💰 **Rentabilidad**
• **Margen de ganancia:** ${analysis.profitability.margin.toFixed(1)}%
• **Ganancia por unidad:** $${analysis.profitability.unitProfit.toLocaleString()}
• **ROI mensual:** ${analysis.profitability.roi.toFixed(1)}%
• **Calificación:** ${analysis.profitability.score}

### ⚖️ **Punto de Equilibrio**
• **Unidades necesarias:** ${analysis.breakEven.units.toLocaleString()} unidades
• **Ingresos mínimos:** $${analysis.breakEven.revenue.toLocaleString()}
• **Tiempo estimado:** ${analysis.breakEven.timeline} ${analysis.breakEven.timeline === 1 ? 'mes' : 'meses'}

### 📈 **Proyecciones de Ventas Mensuales**
**Conservador:** ${analysis.projections.conservative.units} unidades → $${analysis.projections.conservative.revenue.toLocaleString()}
**Realista:** ${analysis.projections.realistic.units} unidades → $${analysis.projections.realistic.revenue.toLocaleString()}
**Optimista:** ${analysis.projections.optimistic.units} unidades → $${analysis.projections.optimistic.revenue.toLocaleString()}`;

        this.addMessage({
            type: 'assistant',
            content: dashboard,
            timestamp: new Date()
        });
    }

    displayIndustryRecommendations(analysis) {
        const recommendations = `## 🎯 Recomendaciones para ${analysis.industry.name}

### 💡 **Optimización de Precios**
• **Precio individual:** $${analysis.comparison.individualPrice.toLocaleString()}
• **Precio paquete:** $${analysis.comparison.packagePrice.toLocaleString()}
• **Ahorro cliente:** $${analysis.comparison.savings.toLocaleString()} (${analysis.comparison.discountPercentage.toFixed(1)}%)

### 👥 **Valor del Cliente**
• **Compras mensuales:** ${analysis.clv.frequency} veces
• **Valor mensual:** $${analysis.clv.monthlyValue.toLocaleString()}
• **Valor de vida:** $${analysis.clv.lifetimeValue.toLocaleString()} (${analysis.clv.lifetime} meses)

### ✅ **Estrategias Recomendadas**
• **Enfoque principal:** Destaca el ahorro de $${analysis.comparison.savings.toLocaleString()} vs compra individual
• **Segmentación:** Clientes frecuentes de ${analysis.industry.name.toLowerCase()}
• **Promoción:** "Ahorra ${analysis.comparison.discountPercentage.toFixed(0)}% comprando el paquete completo"
• **Upselling:** Considera servicios adicionales para aumentar el valor de vida del cliente

¿Te gustaría que ajustemos alguna variable de este análisis?`;

        this.addMessage({
            type: 'assistant',
            content: recommendations,
            timestamp: new Date()
        });
    }

    calculateProfitabilityScore(margin, roi) {
        const combinedScore = (margin + Math.max(0, roi)) / 2;
        if (combinedScore > 45) return 'A+ (Excelente)';
        if (combinedScore > 35) return 'A (Muy Bueno)';
        if (combinedScore > 25) return 'B+ (Bueno)';
        if (combinedScore > 15) return 'B (Aceptable)';
        return 'C (Necesita optimización)';
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

    setupBusinessTypeSelector() {
        console.log('🏢 Configurando selector de tipo de negocio...');

        // Find business type cards and add click handlers
        const businessTypeCards = document.querySelectorAll('.business-type-card');

        businessTypeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const businessType = card.getAttribute('data-business-type');
                const businessName = card.getAttribute('data-business-name');
                this.selectBusinessType(businessType, businessName);
            });
        });
    }

    selectBusinessType(businessType, businessName) {
        console.log('✅ Tipo de negocio seleccionado:', businessType, businessName);

        // Store selected business type
        this.selectedBusinessType = {
            type: businessType,
            name: businessName
        };
        this.businessTypeSelected = true;

        // Store business type in conversation context
        this.context.selectedBusinessType = this.selectedBusinessType;
        this.context.businessTypeSelected = true;

        // Show selection feedback with animation
        const selectedCard = document.querySelector(`[data-business-type="${businessType}"]`);
        if (selectedCard) {
            // Add selection effect
            selectedCard.style.transform = 'scale(1.05)';
            selectedCard.style.transition = 'all 0.3s ease';

            // Add check mark
            const iconDiv = selectedCard.querySelector('.w-16.h-16');
            iconDiv.innerHTML = '<i class="fas fa-check text-white text-2xl"></i>';
            iconDiv.classList.remove('from-orange-500', 'to-red-500', 'from-green-500', 'to-emerald-500', 'from-blue-500', 'to-indigo-500', 'from-yellow-500', 'to-orange-500');
            iconDiv.classList.add('from-green-500', 'to-green-600');
        }

        // Track business type selection analytics
        this.trackBusinessTypeSelection(businessType, businessName);

        // Trigger business classification with intelligent features
        this.classifyBusiness(`${businessName} - ${businessType}`);

        // Hide business selector and show chat after a delay
        setTimeout(() => {
            document.getElementById('business-type-selector').style.display = 'none';
            document.getElementById('chat-messages').style.display = 'block';
            this.showWelcomeMessage();
        }, 1500);
    }

    showWelcomeMessage() {
        const businessType = this.selectedBusinessType?.type || 'general';
        const businessName = this.selectedBusinessType?.name || '';

        // Customize welcome message based on business type
        let welcomeContent = '';

        if (this.isDemoMode) {
            welcomeContent = `¡Hola! Soy tu asesor virtual de IAtiva. 🧠

🚀 **¡Bienvenido al análisis GRATUITO!**

Te ayudo a calcular el precio perfecto para tu **${businessName}** en solo 5 minutos.

**Sin registro, sin complicaciones, solo resultados profesionales.**

${this.getBusinessTypeQuestions(businessType)}`;
        } else {
            welcomeContent = `¡Hola! Soy tu asesor virtual de IAtiva. 🧠

Te ayudo a realizar un análisis completo de costeo para tu **${businessName}**.

${this.getBusinessTypeQuestions(businessType)}`;
        }

        const welcomeMessage = {
            type: 'bot',
            content: welcomeContent,
            timestamp: new Date()
        };

        this.addMessage(welcomeMessage);

        // Show business type specific cost input form after welcome message
        setTimeout(() => {
            this.showBusinessTypeCostForm(businessType);
        }, 2000);
    }

    getBusinessTypeQuestions(businessType) {
        switch (businessType) {
            case 'manufactura':
                return `**Para tu producto manufacturado, necesito conocer:**

📋 **1. Nombre de tu producto/negocio**
🏭 **2. Materias primas principales** (tipo y costo aproximado)
👷 **3. Mano de obra** (horas de trabajo y costo por hora)
📦 **4. Empaque y presentación** (materiales y costos)
⚡ **5. Otros gastos** (electricidad, herramientas, alquiler)

¿Comenzamos con el **nombre de tu producto**?`;

            case 'reventa':
                return `**Para tu negocio de reventa, necesito conocer:**

📋 **1. Nombre de tu negocio**
💰 **2. Costo de compra** del producto (precio al que lo adquieres)
🚚 **3. Logística y transporte** (costos de traer el producto)
🏪 **4. Almacenamiento** (alquiler, servicios, inventario)
📈 **5. Margen deseado** (ganancia que esperas obtener)

¿Comenzamos con el **nombre de tu negocio**?`;

            case 'servicio':
                return `**Para tu servicio profesional, necesito conocer:**

📋 **1. Nombre de tu servicio/consultoría**
⏰ **2. Valor por hora** de tu trabajo profesional
📅 **3. Tiempo promedio** por proyecto o consulta
💼 **4. Gastos operativos** (oficina, herramientas, software)
📚 **5. Experiencia y especialización** (nivel de expertise)

¿Comenzamos con el **nombre de tu servicio**?`;

            case 'hibrido':
                return `**Para tu servicio híbrido (servicio + productos), necesito conocer:**

📋 **1. Nombre de tu negocio**
⏰ **2. Tiempo profesional** requerido por cliente
🛍️ **3. Productos incluidos** (tipo y costo de materiales)
💼 **4. Valor de tu expertise** (tarifa por hora profesional)
📦 **5. Gastos adicionales** (logística, presentación, seguimiento)

¿Comenzamos con el **nombre de tu negocio híbrido**?`;

            case 'paquete':
                return `**Para tu paquete/combo de productos o servicios, necesito conocer:**

📋 **1. Nombre de tu paquete/combo**
📦 **2. Componentes del paquete** (qué productos/servicios incluye)
💰 **3. Costo de cada componente** (precio individual de cada item)
🏷️ **4. Descuento del paquete** (si aplicas alguno)
📊 **5. Cuántos productos/servicios incluye tu paquete**

¿Comenzamos con el **nombre de tu paquete o combo**?`;

            default:
                return `Para comenzar, cuéntame: **¿Cuál es el nombre de tu negocio?**`;
        }
    }

    showBusinessTypeCostForm(businessType) {
        const formDiv = document.createElement('div');
        formDiv.id = 'business-cost-form';
        formDiv.className = 'bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-4 mx-4';

        let formHTML = '';

        switch (businessType) {
            case 'manufactura':
                formHTML = `
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-industry text-orange-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-sm font-semibold text-orange-900 mb-3">
                                🏭 Calculadora de Costos - Manufactura
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Materias Primas (por unidad)</label>
                                        <input type="number" id="materials-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Mano de Obra (por unidad)</label>
                                        <input type="number" id="labor-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Empaque y Presentación</label>
                                        <input type="number" id="packaging-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Gastos Indirectos (mensual)</label>
                                        <input type="number" id="overhead-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <button onclick="window.iativaChat.processCostForm('manufactura')"
                                        class="bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition-colors">
                                    <i class="fas fa-calculator mr-2"></i>Calcular Costos
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'reventa':
                formHTML = `
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-shopping-cart text-green-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-sm font-semibold text-green-900 mb-3">
                                🛍️ Calculadora de Costos - Reventa
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Costo de Compra (por unidad)</label>
                                        <input type="number" id="purchase-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Transporte/Logística (%)</label>
                                        <input type="number" id="logistics-cost" placeholder="5" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.1" max="100">
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Almacenamiento (mensual)</label>
                                        <input type="number" id="storage-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Margen Deseado (%)</label>
                                        <input type="number" id="margin-desired" placeholder="30" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="1" max="200">
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <button onclick="window.iativaChat.processCostForm('reventa')"
                                        class="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors">
                                    <i class="fas fa-calculator mr-2"></i>Calcular Precio de Venta
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'servicio':
                formHTML = `
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-briefcase text-blue-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-sm font-semibold text-blue-900 mb-3">
                                💼 Calculadora de Costos - Servicio Profesional
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Valor por Hora Deseado</label>
                                        <input type="number" id="hourly-rate" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Horas por Proyecto</label>
                                        <input type="number" id="project-hours" placeholder="0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.5">
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Gastos Operativos (mensual)</label>
                                        <input type="number" id="operational-costs" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Años de Experiencia</label>
                                        <select id="experience-level" class="w-full p-2 border border-gray-300 rounded-md text-sm">
                                            <option value="junior">1-2 años (Junior)</option>
                                            <option value="mid">3-5 años (Intermedio)</option>
                                            <option value="senior">5-10 años (Senior)</option>
                                            <option value="expert">+10 años (Expert)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <button onclick="window.iativaChat.processCostForm('servicio')"
                                        class="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors">
                                    <i class="fas fa-calculator mr-2"></i>Calcular Tarifa Profesional
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'hibrido':
                formHTML = `
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-sync text-yellow-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-sm font-semibold text-yellow-900 mb-3">
                                🔄 Calculadora de Costos - Servicio Híbrido
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Valor Hora Profesional</label>
                                        <input type="number" id="professional-rate" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Horas por Cliente</label>
                                        <input type="number" id="client-hours" placeholder="0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.5">
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Costo Productos/Materiales</label>
                                        <input type="number" id="products-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Gastos Adicionales</label>
                                        <input type="number" id="additional-costs" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <button onclick="window.iativaChat.processCostForm('hibrido')"
                                        class="bg-yellow-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-600 transition-colors">
                                    <i class="fas fa-calculator mr-2"></i>Calcular Precio Híbrido
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'paquete':
                formHTML = `
                    <div class="flex items-start mb-4">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-box text-purple-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-sm font-semibold text-purple-900 mb-3">
                                📦 Calculadora de Costos - Paquete/Combo
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Costo Componentes del Paquete</label>
                                        <input type="number" id="package-components-cost" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Número de Items en el Paquete</label>
                                        <input type="number" id="package-items-count" placeholder="0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="1" min="1">
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Empaque y Presentación</label>
                                        <input type="number" id="package-presentation" placeholder="$0" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="0.01">
                                    </div>
                                    <div>
                                        <label class="text-xs font-medium text-gray-700">Descuento del Paquete (%)</label>
                                        <input type="number" id="package-discount" placeholder="10" class="w-full p-2 border border-gray-300 rounded-md text-sm" step="1" max="100">
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4">
                                <button onclick="window.iativaChat.processCostForm('paquete')"
                                        class="bg-purple-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-600 transition-colors">
                                    <i class="fas fa-calculator mr-2"></i>Calcular Precio del Paquete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                break;

            default:
                return;
        }

        formDiv.innerHTML = formHTML;
        this.chatMessages.appendChild(formDiv);
        this.scrollToBottom();
    }

    processCostForm(businessType) {
        const costs = this.extractCostFormData(businessType);

        if (!this.validateCostForm(costs, businessType)) {
            return;
        }

        // Store costs in context
        this.context.businessTypeCosts = costs;
        this.context.businessType = businessType;

        // Hide the form
        const form = document.getElementById('business-cost-form');
        if (form) {
            form.style.display = 'none';
        }

        // Show analysis results
        this.showBusinessTypeAnalysis(costs, businessType);

        // Show business-specific metrics and validation
        setTimeout(() => {
            this.showBusinessTypeMetrics(costs, businessType);
        }, 1500);

        // Show contextual recommendations
        setTimeout(() => {
            this.showBusinessTypeRecommendations(businessType, costs);
        }, 2500);
    }

    extractCostFormData(businessType) {
        const costs = { businessType };

        switch (businessType) {
            case 'manufactura':
                costs.materials = parseFloat(document.getElementById('materials-cost')?.value) || 0;
                costs.labor = parseFloat(document.getElementById('labor-cost')?.value) || 0;
                costs.packaging = parseFloat(document.getElementById('packaging-cost')?.value) || 0;
                costs.overhead = parseFloat(document.getElementById('overhead-cost')?.value) || 0;
                break;

            case 'reventa':
                costs.purchase = parseFloat(document.getElementById('purchase-cost')?.value) || 0;
                costs.logistics = parseFloat(document.getElementById('logistics-cost')?.value) || 0;
                costs.storage = parseFloat(document.getElementById('storage-cost')?.value) || 0;
                costs.margin = parseFloat(document.getElementById('margin-desired')?.value) || 30;
                break;

            case 'servicio':
                costs.hourlyRate = parseFloat(document.getElementById('hourly-rate')?.value) || 0;
                costs.projectHours = parseFloat(document.getElementById('project-hours')?.value) || 0;
                costs.operational = parseFloat(document.getElementById('operational-costs')?.value) || 0;
                costs.experience = document.getElementById('experience-level')?.value || 'mid';
                break;

            case 'hibrido':
                costs.professionalRate = parseFloat(document.getElementById('professional-rate')?.value) || 0;
                costs.clientHours = parseFloat(document.getElementById('client-hours')?.value) || 0;
                costs.products = parseFloat(document.getElementById('products-cost')?.value) || 0;
                costs.additional = parseFloat(document.getElementById('additional-costs')?.value) || 0;
                break;

            case 'paquete':
                costs.componentsCost = parseFloat(document.getElementById('package-components-cost')?.value) || 0;
                costs.itemsCount = parseFloat(document.getElementById('package-items-count')?.value) || 0;
                costs.presentation = parseFloat(document.getElementById('package-presentation')?.value) || 0;
                costs.discount = parseFloat(document.getElementById('package-discount')?.value) || 0;
                break;
        }

        return costs;
    }

    validateCostForm(costs, businessType) {
        const errors = [];

        switch (businessType) {
            case 'manufactura':
                if (costs.materials <= 0) errors.push('Materias primas debe ser mayor a 0');
                if (costs.labor <= 0) errors.push('Mano de obra debe ser mayor a 0');
                break;

            case 'reventa':
                if (costs.purchase <= 0) errors.push('Costo de compra debe ser mayor a 0');
                if (costs.margin <= 0 || costs.margin > 200) errors.push('Margen debe estar entre 1% y 200%');
                break;

            case 'servicio':
                if (costs.hourlyRate <= 0) errors.push('Valor por hora debe ser mayor a 0');
                if (costs.projectHours <= 0) errors.push('Horas por proyecto debe ser mayor a 0');
                break;

            case 'hibrido':
                if (costs.professionalRate <= 0) errors.push('Valor hora profesional debe ser mayor a 0');
                if (costs.clientHours <= 0) errors.push('Horas por cliente debe ser mayor a 0');
                if (costs.products <= 0) errors.push('Costo de productos debe ser mayor a 0');
                break;

            case 'paquete':
                if (costs.componentsCost <= 0) errors.push('Costo de componentes debe ser mayor a 0');
                if (costs.itemsCount <= 0) errors.push('Número de items debe ser mayor a 0');
                break;
        }

        if (errors.length > 0) {
            this.showValidationErrors(errors);
            return false;
        }

        return true;
    }

    showValidationErrors(errors) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mx-4';
        errorDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div class="ml-3">
                    <h4 class="text-sm font-medium text-red-800 mb-2">Errores en el formulario:</h4>
                    <ul class="list-disc list-inside text-sm text-red-700">
                        ${errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();

        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    showBusinessTypeAnalysis(costs, businessType) {
        let analysis = this.calculateBusinessTypeAnalysis(costs, businessType);

        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'bg-white border border-gray-200 rounded-lg p-6 mb-4 mx-4 shadow-sm';

        let analysisHTML = '';

        switch (businessType) {
            case 'manufactura':
                analysisHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-chart-pie text-orange-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-lg font-semibold text-orange-900 mb-4">
                                📊 Análisis de Costos - Manufactura
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-3">
                                    <div class="bg-orange-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-orange-800 mb-2">Desglose de Costos</h5>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Materias Primas:</span>
                                                <span class="font-medium">$${costs.materials.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Mano de Obra:</span>
                                                <span class="font-medium">$${costs.labor.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Empaque:</span>
                                                <span class="font-medium">$${costs.packaging.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Gastos Indirectos:</span>
                                                <span class="font-medium">$${(costs.overhead / 30).toLocaleString('es-CO')}/día</span>
                                            </div>
                                            <hr class="border-orange-200 my-2">
                                            <div class="flex justify-between font-bold">
                                                <span>Costo Total:</span>
                                                <span class="text-orange-700">$${analysis.totalCost.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <div class="bg-green-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-green-800 mb-2">Precios Sugeridos</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between">
                                                <span>Precio Mínimo:</span>
                                                <span class="font-medium text-green-700">$${analysis.minPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Óptimo:</span>
                                                <span class="font-medium text-green-700">$${analysis.optimalPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Premium:</span>
                                                <span class="font-medium text-green-700">$${analysis.premiumPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                                            <strong>💰 Ganancia estimada:</strong> $${analysis.profit.toLocaleString('es-CO')} por unidad
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'reventa':
                analysisHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-chart-line text-green-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-lg font-semibold text-green-900 mb-4">
                                📊 Análisis de Costos - Reventa
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-3">
                                    <div class="bg-green-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-green-800 mb-2">Estructura de Costos</h5>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Costo de Compra:</span>
                                                <span class="font-medium">$${costs.purchase.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Logística (${costs.logistics}%):</span>
                                                <span class="font-medium">$${analysis.logisticsCost.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Almacenamiento:</span>
                                                <span class="font-medium">$${(costs.storage / 30).toLocaleString('es-CO')}/día</span>
                                            </div>
                                            <hr class="border-green-200 my-2">
                                            <div class="flex justify-between font-bold">
                                                <span>Costo Total:</span>
                                                <span class="text-green-700">$${analysis.totalCost.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <div class="bg-blue-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-blue-800 mb-2">Precio de Venta</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between">
                                                <span>Margen Aplicado:</span>
                                                <span class="font-medium text-blue-700">${costs.margin}%</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Sugerido:</span>
                                                <span class="font-bold text-blue-700 text-lg">$${analysis.sellingPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Ganancia por Unidad:</span>
                                                <span class="font-medium text-blue-700">$${analysis.profit.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                                            <strong>📈 ROI:</strong> ${analysis.roi}% de retorno de inversión
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'servicio':
                analysisHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-user-tie text-blue-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-lg font-semibold text-blue-900 mb-4">
                                📊 Análisis de Costos - Servicio Profesional
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-3">
                                    <div class="bg-blue-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-blue-800 mb-2">Estructura Tarifaria</h5>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Tarifa por Hora:</span>
                                                <span class="font-medium">$${costs.hourlyRate.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Horas por Proyecto:</span>
                                                <span class="font-medium">${costs.projectHours}h</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Nivel de Experiencia:</span>
                                                <span class="font-medium">${this.getExperienceName(costs.experience)}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Gastos Operativos:</span>
                                                <span class="font-medium">$${costs.operational.toLocaleString('es-CO')}/mes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <div class="bg-purple-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-purple-800 mb-2">Precio por Proyecto</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between">
                                                <span>Precio Base:</span>
                                                <span class="font-medium">$${analysis.basePrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Ajuste por Experiencia:</span>
                                                <span class="font-medium">${analysis.experienceMultiplier}x</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Final:</span>
                                                <span class="font-bold text-purple-700 text-lg">$${analysis.finalPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-800">
                                            <strong>💼 Ingresos mensuales:</strong> $${analysis.monthlyIncome.toLocaleString('es-CO')} estimados
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'hibrido':
                analysisHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-balance-scale text-yellow-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-lg font-semibold text-yellow-900 mb-4">
                                📊 Análisis de Costos - Servicio Híbrido
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="space-y-3">
                                    <div class="bg-yellow-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-yellow-800 mb-2">Componentes del Servicio</h5>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Servicio Profesional:</span>
                                                <span class="font-medium">$${analysis.serviceComponent.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Productos/Materiales:</span>
                                                <span class="font-medium">$${costs.products.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Gastos Adicionales:</span>
                                                <span class="font-medium">$${costs.additional.toLocaleString('es-CO')}</span>
                                            </div>
                                            <hr class="border-yellow-200 my-2">
                                            <div class="flex justify-between font-bold">
                                                <span>Total por Cliente:</span>
                                                <span class="text-yellow-700">$${analysis.totalPerClient.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <div class="bg-indigo-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-indigo-800 mb-2">Rentabilidad del Híbrido</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between">
                                                <span>Margen en Servicios:</span>
                                                <span class="font-medium text-indigo-700">${analysis.serviceMargin}%</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Margen en Productos:</span>
                                                <span class="font-medium text-indigo-700">${analysis.productMargin}%</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Sugerido:</span>
                                                <span class="font-bold text-indigo-700 text-lg">$${analysis.suggestedPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-3 p-2 bg-indigo-100 rounded text-xs text-indigo-800">
                                            <strong>🎯 Ganancia total:</strong> $${analysis.totalProfit.toLocaleString('es-CO')} por cliente
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;

            case 'paquete':
                // Calculate optimal discount and individual prices
                const optimalDiscount = analysis.discountPercentage || 15;
                const individualTotal = Math.round(analysis.totalComponentsCost * 1.5); // If sold separately with markup
                const packageSavings = individualTotal - analysis.suggestedPrice;
                const savingsPercentage = Math.round((packageSavings / individualTotal) * 100);

                analysisHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <i class="fas fa-box-open text-purple-600"></i>
                            </div>
                        </div>
                        <div class="ml-3 flex-1">
                            <h4 class="text-lg font-semibold text-purple-900 mb-4">
                                📦 Análisis de tu Paquete/Combo
                            </h4>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Component Breakdown -->
                                <div class="space-y-3">
                                    <div class="bg-purple-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-purple-800 mb-2">Desglose de Componentes</h5>
                                        <div class="space-y-1 text-sm">
                                            <div class="flex justify-between">
                                                <span>Costo de Componentes:</span>
                                                <span class="font-medium">$${costs.componentsCost.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Número de Items:</span>
                                                <span class="font-medium">${costs.itemsCount} productos/servicios</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio Promedio/Item:</span>
                                                <span class="font-medium">$${analysis.avgItemPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Empaque y Presentación:</span>
                                                <span class="font-medium">$${costs.presentation.toLocaleString('es-CO')}</span>
                                            </div>
                                            <hr class="border-purple-200 my-2">
                                            <div class="flex justify-between font-bold">
                                                <span>Costo Base Total:</span>
                                                <span class="text-purple-700">$${analysis.totalBaseCost.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Package vs Individual Pricing -->
                                <div class="space-y-3">
                                    <div class="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                                        <h5 class="font-medium text-green-800 mb-2">Paquete vs Individual</h5>
                                        <div class="space-y-2 text-sm">
                                            <div class="flex justify-between">
                                                <span>Precio Individual Total:</span>
                                                <span class="font-medium line-through text-gray-500">$${individualTotal.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Precio del Paquete:</span>
                                                <span class="font-bold text-green-700 text-lg">$${analysis.suggestedPrice.toLocaleString('es-CO')}</span>
                                            </div>
                                            <div class="flex justify-between text-green-700">
                                                <span>Ahorro del Cliente:</span>
                                                <span class="font-bold">$${packageSavings.toLocaleString('es-CO')} (${savingsPercentage}%)</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Tu Ganancia:</span>
                                                <span class="font-medium text-blue-700">$${analysis.totalProfit.toLocaleString('es-CO')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                                            <strong>🎯 Margen del paquete:</strong> ${analysis.profitMargin}% - ¡Excelente!
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Package-Specific Recommendations -->
                            <div class="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                                <h5 class="font-semibold text-purple-900 mb-3 flex items-center">
                                    <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                                    Recomendaciones Estratégicas para tu Paquete
                                </h5>
                                <div class="space-y-3 text-sm">
                                    <div class="flex items-start bg-white p-3 rounded-lg">
                                        <div class="text-green-600 mr-3 text-lg">✓</div>
                                        <div>
                                            <strong class="text-gray-900">Tu paquete genera mejor margen que venta individual</strong>
                                            <p class="text-gray-600 mt-1">Con ${analysis.profitMargin}% de margen, tu combo es ${Math.round(analysis.profitMargin / 30 * 100) - 100}% más rentable que vender items por separado.</p>
                                        </div>
                                    </div>

                                    <div class="flex items-start bg-white p-3 rounded-lg">
                                        <div class="text-blue-600 mr-3 text-lg">💡</div>
                                        <div>
                                            <strong class="text-gray-900">Descuento óptimo recomendado: ${optimalDiscount}%</strong>
                                            <p class="text-gray-600 mt-1">Este descuento atrae clientes sin sacrificar rentabilidad. Considera rangos entre 10-25% según temporada.</p>
                                        </div>
                                    </div>

                                    <div class="flex items-start bg-white p-3 rounded-lg">
                                        <div class="text-purple-600 mr-3 text-lg">🎯</div>
                                        <div>
                                            <strong class="text-gray-900">Oportunidades de Cross-selling</strong>
                                            <p class="text-gray-600 mt-1">
                                                • Crea paquetes tiered (Básico, Pro, Premium)<br>
                                                • Ofrece "agrega 1 más por solo $X"<br>
                                                • Bundle con productos complementarios para aumentar ticket promedio
                                            </p>
                                        </div>
                                    </div>

                                    <div class="flex items-start bg-white p-3 rounded-lg">
                                        <div class="text-orange-600 mr-3 text-lg">📊</div>
                                        <div>
                                            <strong class="text-gray-900">Estrategia de precios escalonados</strong>
                                            <p class="text-gray-600 mt-1">
                                                • Paquete Básico (${costs.itemsCount - 1} items): $${Math.round(analysis.suggestedPrice * 0.75).toLocaleString('es-CO')}<br>
                                                • Paquete Actual (${costs.itemsCount} items): $${analysis.suggestedPrice.toLocaleString('es-CO')}<br>
                                                • Paquete Premium (${costs.itemsCount + 1} items): $${Math.round(analysis.suggestedPrice * 1.3).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
        }

        analysisDiv.innerHTML = analysisHTML;
        this.chatMessages.appendChild(analysisDiv);

        // Add export buttons after analysis
        this.addExportButtons(costs, businessType, analysis);

        // Add debt capacity analysis button
        this.addDebtCapacityButton(costs, businessType, analysis);

        this.scrollToBottom();
    }

    calculateBusinessTypeAnalysis(costs, businessType) {
        let analysis = {};

        switch (businessType) {
            case 'manufactura':
                analysis.totalCost = costs.materials + costs.labor + costs.packaging + (costs.overhead / 30);
                analysis.minPrice = Math.round(analysis.totalCost * 1.2); // 20% margin
                analysis.optimalPrice = Math.round(analysis.totalCost * 1.5); // 50% margin
                analysis.premiumPrice = Math.round(analysis.totalCost * 2.0); // 100% margin
                analysis.profit = analysis.optimalPrice - analysis.totalCost;
                break;

            case 'reventa':
                analysis.logisticsCost = (costs.purchase * costs.logistics) / 100;
                analysis.totalCost = costs.purchase + analysis.logisticsCost + (costs.storage / 30);
                analysis.sellingPrice = Math.round(analysis.totalCost * (1 + costs.margin / 100));
                analysis.profit = analysis.sellingPrice - analysis.totalCost;
                analysis.roi = Math.round(((analysis.profit / analysis.totalCost) * 100));
                break;

            case 'servicio':
                analysis.basePrice = costs.hourlyRate * costs.projectHours;
                analysis.experienceMultiplier = this.getExperienceMultiplier(costs.experience);
                analysis.finalPrice = Math.round(analysis.basePrice * analysis.experienceMultiplier);
                analysis.monthlyIncome = Math.round((analysis.finalPrice * 4) - costs.operational); // 4 projects per month
                break;

            case 'hibrido':
                analysis.serviceComponent = costs.professionalRate * costs.clientHours;
                analysis.totalPerClient = analysis.serviceComponent + costs.products + costs.additional;
                analysis.serviceMargin = 60; // Services typically have higher margins
                analysis.productMargin = 25; // Products have lower margins
                analysis.suggestedPrice = Math.round(
                    (analysis.serviceComponent * 1.6) + (costs.products * 1.25) + costs.additional
                );
                analysis.totalProfit = analysis.suggestedPrice - analysis.totalPerClient;
                break;

            case 'paquete':
                analysis.totalComponentsCost = costs.componentsCost;
                analysis.presentationCost = costs.presentation;
                analysis.totalBaseCost = analysis.totalComponentsCost + analysis.presentationCost;
                analysis.discountPercentage = costs.discount || 0;

                // Calculate individual item price vs package price
                analysis.avgItemPrice = costs.itemsCount > 0 ? analysis.totalComponentsCost / costs.itemsCount : 0;

                // Suggested package price with discount
                analysis.suggestedPrice = Math.round(analysis.totalBaseCost * (1 - analysis.discountPercentage / 100) * 1.3); // 30% markup

                // Savings for customer
                analysis.totalSavings = Math.round(analysis.totalBaseCost - analysis.suggestedPrice);

                // Profit calculation
                analysis.totalProfit = analysis.suggestedPrice - analysis.totalBaseCost;
                analysis.profitMargin = Math.round((analysis.totalProfit / analysis.suggestedPrice) * 100);
                break;
        }

        return analysis;
    }

    getExperienceName(level) {
        const levels = {
            'junior': '1-2 años (Junior)',
            'mid': '3-5 años (Intermedio)',
            'senior': '5-10 años (Senior)',
            'expert': '+10 años (Expert)'
        };
        return levels[level] || levels['mid'];
    }

    getExperienceMultiplier(level) {
        const multipliers = {
            'junior': 1.0,
            'mid': 1.3,
            'senior': 1.7,
            'expert': 2.2
        };
        return multipliers[level] || multipliers['mid'];
    }

    showBusinessTypeRecommendations(businessType, costs) {
        const intelligentRecs = this.generateIntelligentRecommendations(businessType, costs);

        const recommendationsDiv = document.createElement('div');
        recommendationsDiv.className = 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-4 mx-4';

        recommendationsDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-brain text-purple-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-lg font-semibold text-purple-900 mb-4">
                        🧠 Recomendaciones Inteligentes - ${this.selectedBusinessType?.name}
                    </h4>

                    <!-- Priority Recommendations -->
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-purple-800 mb-3">🎯 Prioridad Alta - Impacto Inmediato</h5>
                        <div class="space-y-4">
                            ${intelligentRecs.priority.map(rec => `
                                <div class="bg-gradient-to-r from-white to-${rec.color}-50 p-4 rounded-lg border border-${rec.color}-200 shadow-sm">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <div class="flex items-center mb-2">
                                                <i class="fas ${rec.icon} text-${rec.color}-600 mr-2"></i>
                                                <h6 class="font-medium text-gray-900">${rec.title}</h6>
                                                <span class="ml-2 px-2 py-1 bg-${rec.color}-100 text-${rec.color}-700 text-xs rounded-full font-medium">${rec.urgency}</span>
                                            </div>
                                            <p class="text-sm text-gray-700 mb-3">${rec.description}</p>

                                            <!-- Impact Calculation -->
                                            <div class="bg-${rec.color}-50 p-3 rounded-md mb-3">
                                                <div class="flex items-center justify-between mb-2">
                                                    <span class="text-sm font-medium text-${rec.color}-800">💰 Impacto Calculado</span>
                                                    <span class="text-lg font-bold text-${rec.color}-700">${rec.impact.value}</span>
                                                </div>
                                                <div class="text-xs text-${rec.color}-600">
                                                    ${rec.impact.calculation}
                                                </div>
                                                <div class="flex items-center mt-2">
                                                    <i class="fas fa-chart-line text-${rec.color}-500 mr-1 text-xs"></i>
                                                    <span class="text-xs text-${rec.color}-600 font-medium">
                                                        ROI esperado: ${rec.impact.roi} | Tiempo de implementación: ${rec.impact.timeframe}
                                                    </span>
                                                </div>
                                            </div>

                                            <!-- Actionable Next Steps -->
                                            <div class="border-t border-${rec.color}-200 pt-3">
                                                <h6 class="text-sm font-medium text-gray-800 mb-2">📋 Pasos Siguientes</h6>
                                                <div class="space-y-1">
                                                    ${rec.nextSteps.map((step, index) => `
                                                        <div class="flex items-start">
                                                            <div class="w-5 h-5 bg-${rec.color}-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                                                <span class="text-xs font-bold text-${rec.color}-600">${index + 1}</span>
                                                            </div>
                                                            <span class="text-sm text-gray-700">${step}</span>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Optimization Opportunities -->
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-purple-800 mb-3">⚡ Oportunidades de Optimización</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${intelligentRecs.optimization.map(opt => `
                                <div class="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                    <div class="flex items-center mb-2">
                                        <i class="fas ${opt.icon} text-${opt.color}-600 mr-2"></i>
                                        <h6 class="font-medium text-gray-900 text-sm">${opt.title}</h6>
                                    </div>
                                    <p class="text-xs text-gray-600 mb-2">${opt.description}</p>
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-medium text-${opt.color}-700">${opt.impact}</span>
                                        <span class="text-xs text-gray-500">${opt.difficulty}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Competitor Benchmarks -->
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-purple-800 mb-3">📊 Benchmarks Competitivos</h5>
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                ${intelligentRecs.benchmarks.map(benchmark => `
                                    <div class="text-center">
                                        <div class="text-xs text-gray-600 mb-1">${benchmark.metric}</div>
                                        <div class="text-lg font-bold ${benchmark.performance === 'above' ? 'text-green-600' : benchmark.performance === 'average' ? 'text-yellow-600' : 'text-red-600'}">
                                            ${benchmark.yourValue}
                                        </div>
                                        <div class="text-xs text-gray-500 mb-1">vs Promedio: ${benchmark.marketAverage}</div>
                                        <div class="flex items-center justify-center">
                                            <i class="fas ${benchmark.performance === 'above' ? 'fa-arrow-up text-green-500' : benchmark.performance === 'average' ? 'fa-minus text-yellow-500' : 'fa-arrow-down text-red-500'} text-xs mr-1"></i>
                                            <span class="text-xs ${benchmark.performance === 'above' ? 'text-green-600' : benchmark.performance === 'average' ? 'text-yellow-600' : 'text-red-600'}">
                                                ${benchmark.gap}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Strategic Recommendations -->
                    <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                        <h5 class="text-sm font-medium text-indigo-800 mb-3">🎯 Estrategia de Crecimiento - ${businessType.toUpperCase()}</h5>
                        <div class="space-y-2">
                            ${intelligentRecs.strategic.map(strategy => `
                                <div class="flex items-start">
                                    <i class="fas fa-chess-knight text-indigo-600 mr-2 mt-1 text-sm"></i>
                                    <div class="flex-1">
                                        <div class="font-medium text-sm text-indigo-900">${strategy.title}</div>
                                        <div class="text-xs text-indigo-700">${strategy.description}</div>
                                        <div class="text-xs text-indigo-600 mt-1">
                                            <strong>Potencial:</strong> ${strategy.potential} | <strong>Plazo:</strong> ${strategy.timeline}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(recommendationsDiv);
        this.scrollToBottom();
    }

    generateBusinessTypeRecommendations(businessType, costs) {
        let recommendations = [];

        switch (businessType) {
            case 'manufactura':
                recommendations = [
                    {
                        title: 'Optimizar Materias Primas',
                        description: 'Busca proveedores con descuentos por volumen y evalúa materiales alternativos de calidad similar.',
                        impact: 'Reducción de costos del 10-15%',
                        icon: 'fa-boxes',
                        color: 'orange'
                    },
                    {
                        title: 'Eficiencia en Producción',
                        description: 'Implementa técnicas de lean manufacturing para reducir desperdicios y tiempo de producción.',
                        impact: 'Mejora de productividad del 20%',
                        icon: 'fa-cogs',
                        color: 'blue'
                    },
                    {
                        title: 'Empaque Inteligente',
                        description: 'Diseña empaques que protejan mejor el producto y reduzcan costos de transporte.',
                        impact: 'Ahorro logístico del 5-8%',
                        icon: 'fa-cube',
                        color: 'green'
                    }
                ];
                break;

            case 'reventa':
                recommendations = [
                    {
                        title: 'Negociación con Proveedores',
                        description: 'Establece acuerdos de volumen y pagos anticipados para obtener mejores precios de compra.',
                        impact: 'Reducción de costos del 5-12%',
                        icon: 'fa-handshake',
                        color: 'green'
                    },
                    {
                        title: 'Optimización de Inventarios',
                        description: 'Implementa rotación ABC y just-in-time para reducir costos de almacenamiento.',
                        impact: 'Ahorro en inventario del 15-25%',
                        icon: 'fa-warehouse',
                        color: 'blue'
                    },
                    {
                        title: 'Canales de Venta Múltiples',
                        description: 'Diversifica en marketplace, redes sociales y venta directa para aumentar volumen.',
                        impact: 'Incremento en ventas del 30-50%',
                        icon: 'fa-store',
                        color: 'purple'
                    }
                ];
                break;

            case 'servicio':
                recommendations = [
                    {
                        title: 'Paquetes de Servicios',
                        description: 'Crea paquetes con diferentes niveles (básico, premium, enterprise) para capturar más valor.',
                        impact: 'Incremento en ingresos del 25-40%',
                        icon: 'fa-layer-group',
                        color: 'blue'
                    },
                    {
                        title: 'Automatización de Procesos',
                        description: 'Usa herramientas y plantillas para reducir tiempo en tareas repetitivas.',
                        impact: 'Ahorro de tiempo del 30%',
                        icon: 'fa-robot',
                        color: 'purple'
                    },
                    {
                        title: 'Especialización Vertical',
                        description: 'Enfócate en una industria específica para cobrar tarifas premium por expertise.',
                        impact: 'Aumento de tarifas del 40-70%',
                        icon: 'fa-bullseye',
                        color: 'orange'
                    }
                ];
                break;

            case 'hibrido':
                recommendations = [
                    {
                        title: 'Bundling Estratégico',
                        description: 'Agrupa servicios y productos de manera que el cliente perciba mayor valor conjunto.',
                        impact: 'Incremento en precio del 20-35%',
                        icon: 'fa-gift',
                        color: 'yellow'
                    },
                    {
                        title: 'Márgenes Diferenciados',
                        description: 'Aplica márgenes altos en servicios y competitivos en productos para optimizar rentabilidad.',
                        impact: 'Mejora de margen total del 15%',
                        icon: 'fa-chart-line',
                        color: 'green'
                    },
                    {
                        title: 'Upselling Inteligente',
                        description: 'Ofrece servicios adicionales basados en los productos adquiridos por el cliente.',
                        impact: 'Crecimiento del ticket promedio 25%',
                        icon: 'fa-arrow-up',
                        color: 'indigo'
                    }
                ];
                break;
        }

        return recommendations;
    }

    generateIntelligentRecommendations(businessType, costs) {
        const totalCost = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
        const recommendations = {
            priority: [],
            optimization: [],
            benchmarks: [],
            strategic: []
        };

        switch (businessType) {
            case 'manufactura':
                return this.generateManufacturaRecommendations(costs, totalCost);
            case 'reventa':
                return this.generateReventaRecommendations(costs, totalCost);
            case 'servicio':
                return this.generateServicioRecommendations(costs, totalCost);
            case 'hibrido':
                return this.generateHibridoRecommendations(costs, totalCost);
            default:
                return this.generateGenericRecommendations(costs, totalCost);
        }
    }

    generateManufacturaRecommendations(costs, totalCost) {
        const materiaPrimaPct = (costs.materiaPrima / totalCost) * 100;
        const manoObraPct = (costs.manoObra / totalCost) * 100;
        const empaquePct = (costs.empaque / totalCost) * 100;

        return {
            priority: [
                {
                    title: "Optimizar costo de materia prima",
                    impact: materiaPrimaPct > 70 ? "Alto" : materiaPrimaPct > 50 ? "Medio" : "Bajo",
                    roi: materiaPrimaPct > 70 ? "25-40%" : "15-25%",
                    currentValue: materiaPrimaPct.toFixed(1),
                    targetValue: "45-55%",
                    steps: [
                        "Negociar con 3-5 proveedores diferentes",
                        "Evaluar compras por volumen (descuentos 10-15%)",
                        "Buscar materiales alternativos de calidad similar",
                        "Implementar sistema de inventario justo a tiempo"
                    ]
                },
                {
                    title: "Automatizar procesos de producción",
                    impact: manoObraPct > 40 ? "Alto" : "Medio",
                    roi: "30-50%",
                    currentValue: manoObraPct.toFixed(1),
                    targetValue: "25-35%",
                    steps: [
                        "Identificar tareas repetitivas para automatizar",
                        "Invertir en maquinaria semi-automática",
                        "Capacitar personal en nuevas tecnologías",
                        "Medir productividad por operario"
                    ]
                }
            ],
            optimization: [
                {
                    category: "Materiales",
                    opportunity: `Reducir desperdicio en ${Math.max(materiaPrimaPct - 50, 5).toFixed(1)}%`,
                    savings: `$${(totalCost * Math.max(materiaPrimaPct - 50, 5) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "2-3 meses"
                },
                {
                    category: "Producción",
                    opportunity: "Aumentar eficiencia por lote",
                    savings: `$${(totalCost * 0.15).toLocaleString('es-CO')} COP`,
                    timeframe: "1-2 meses"
                },
                {
                    category: "Empaque",
                    opportunity: empaquePct > 10 ? "Optimizar packaging" : "Packaging eficiente",
                    savings: `$${(totalCost * Math.max(empaquePct - 8, 3) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "1 mes"
                }
            ],
            benchmarks: [
                {
                    metric: "Materia Prima",
                    yourValue: `${materiaPrimaPct.toFixed(1)}%`,
                    industry: "45-55%",
                    status: materiaPrimaPct > 55 ? "Por encima" : materiaPrimaPct < 45 ? "Por debajo" : "En rango",
                    recommendation: materiaPrimaPct > 55 ? "Reducir" : materiaPrimaPct < 45 ? "Revisar calidad" : "Mantener"
                },
                {
                    metric: "Mano de Obra",
                    yourValue: `${manoObraPct.toFixed(1)}%`,
                    industry: "25-35%",
                    status: manoObraPct > 35 ? "Por encima" : manoObraPct < 25 ? "Por debajo" : "En rango",
                    recommendation: manoObraPct > 35 ? "Automatizar" : "Optimizar"
                },
                {
                    metric: "Otros gastos",
                    yourValue: `${empaquePct.toFixed(1)}%`,
                    industry: "5-15%",
                    status: empaquePct > 15 ? "Por encima" : "En rango",
                    recommendation: empaquePct > 15 ? "Optimizar" : "Mantener"
                }
            ],
            strategic: [
                {
                    title: "Escalar producción",
                    description: "Aumentar volumen para reducir costos unitarios",
                    impact: "Reducción 20-30% costo unitario",
                    investment: "Media-Alta",
                    timeline: "6-12 meses"
                },
                {
                    title: "Integración vertical",
                    description: "Control directo de la cadena de suministro",
                    impact: "Reducción 15-25% costos materiales",
                    investment: "Alta",
                    timeline: "12-18 meses"
                },
                {
                    title: "Diversificación de productos",
                    description: "Aprovechar capacidad instalada",
                    impact: "Aumento 25-40% ingresos",
                    investment: "Media",
                    timeline: "3-6 meses"
                }
            ]
        };
    }

    generateReventaRecommendations(costs, totalCost) {
        const costoCompraPct = (costs.costoCompra / totalCost) * 100;
        const logisticaPct = (costs.logistica / totalCost) * 100;
        const almacenamientoPct = (costs.almacenamiento / totalCost) * 100;

        return {
            priority: [
                {
                    title: "Negociar mejores precios de compra",
                    impact: costoCompraPct > 75 ? "Alto" : "Medio",
                    roi: "20-35%",
                    currentValue: costoCompraPct.toFixed(1),
                    targetValue: "60-70%",
                    steps: [
                        "Consolidar compras con menos proveedores",
                        "Negociar descuentos por volumen anual",
                        "Buscar proveedores directos (eliminar intermediarios)",
                        "Evaluar importación directa para productos clave"
                    ]
                },
                {
                    title: "Optimizar rotación de inventario",
                    impact: almacenamientoPct > 15 ? "Alto" : "Medio",
                    roi: "15-30%",
                    currentValue: almacenamientoPct.toFixed(1),
                    targetValue: "8-12%",
                    steps: [
                        "Implementar sistema ABC de inventarios",
                        "Establecer puntos de reorden automático",
                        "Liquidar productos de baja rotación",
                        "Negociar consignación con proveedores"
                    ]
                }
            ],
            optimization: [
                {
                    category: "Compras",
                    opportunity: `Reducir costo compra en ${Math.max(costoCompraPct - 65, 5).toFixed(1)}%`,
                    savings: `$${(totalCost * Math.max(costoCompraPct - 65, 5) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "1-2 meses"
                },
                {
                    category: "Logística",
                    opportunity: "Consolidar envíos y rutas",
                    savings: `$${(totalCost * 0.05).toLocaleString('es-CO')} COP`,
                    timeframe: "1 mes"
                },
                {
                    category: "Almacenamiento",
                    opportunity: almacenamientoPct > 12 ? "Reducir espacio físico" : "Optimizar espacio",
                    savings: `$${(totalCost * Math.max(almacenamientoPct - 10, 2) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "2-3 meses"
                }
            ],
            benchmarks: [
                {
                    metric: "Costo de Compra",
                    yourValue: `${costoCompraPct.toFixed(1)}%`,
                    industry: "60-70%",
                    status: costoCompraPct > 70 ? "Por encima" : costoCompraPct < 60 ? "Excelente" : "En rango",
                    recommendation: costoCompraPct > 70 ? "Negociar" : "Mantener"
                },
                {
                    metric: "Logística",
                    yourValue: `${logisticaPct.toFixed(1)}%`,
                    industry: "5-15%",
                    status: logisticaPct > 15 ? "Por encima" : "En rango",
                    recommendation: logisticaPct > 15 ? "Optimizar rutas" : "Mantener"
                },
                {
                    metric: "Almacenamiento",
                    yourValue: `${almacenamientoPct.toFixed(1)}%`,
                    industry: "8-12%",
                    status: almacenamientoPct > 12 ? "Por encima" : "En rango",
                    recommendation: almacenamientoPct > 12 ? "Reducir inventario" : "Optimizar"
                }
            ],
            strategic: [
                {
                    title: "Marca propia (Private Label)",
                    description: "Desarrollar productos con mayor margen",
                    impact: "Aumento 40-60% margen bruto",
                    investment: "Media",
                    timeline: "6-9 meses"
                },
                {
                    title: "E-commerce y omnicanalidad",
                    description: "Expandir canales de venta digitales",
                    impact: "Aumento 30-50% ventas",
                    investment: "Media",
                    timeline: "3-6 meses"
                },
                {
                    title: "Distribución mayorista",
                    description: "Vender a otros retailers",
                    impact: "Aumento 25-40% volumen",
                    investment: "Baja-Media",
                    timeline: "2-4 meses"
                }
            ]
        };
    }

    generateServicioRecommendations(costs, totalCost) {
        const valorHoraPct = (costs.valorHora / totalCost) * 100;
        const tiempoProyectoPct = (costs.tiempoProyecto / totalCost) * 100;
        const gastosPct = (costs.gastos / totalCost) * 100;

        return {
            priority: [
                {
                    title: "Aumentar tarifa por hora",
                    impact: valorHoraPct < 60 ? "Alto" : "Medio",
                    roi: "Inmediato 25-50%",
                    currentValue: valorHoraPct.toFixed(1),
                    targetValue: "65-75%",
                    steps: [
                        "Investigar tarifas de competencia en el mercado",
                        "Documentar valor agregado y especialización",
                        "Implementar aumentos graduales (15-20% cada 6 meses)",
                        "Ofrecer paquetes de valor con servicios premium"
                    ]
                },
                {
                    title: "Automatizar procesos repetitivos",
                    impact: tiempoProyectoPct > 40 ? "Alto" : "Medio",
                    roi: "30-45%",
                    currentValue: tiempoProyectoPct.toFixed(1),
                    targetValue: "25-35%",
                    steps: [
                        "Identificar tareas que consumen más tiempo",
                        "Implementar templates y metodologías estándar",
                        "Usar herramientas de automatización",
                        "Delegar tareas operativas a junior staff"
                    ]
                }
            ],
            optimization: [
                {
                    category: "Productividad",
                    opportunity: "Reducir tiempo por proyecto",
                    savings: `$${(totalCost * 0.25).toLocaleString('es-CO')} COP`,
                    timeframe: "1-2 meses"
                },
                {
                    category: "Tarifas",
                    opportunity: valorHoraPct < 65 ? "Aumentar valor hora" : "Optimizar paquetes",
                    savings: `$${(totalCost * Math.max(65 - valorHoraPct, 10) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "Inmediato"
                },
                {
                    category: "Gastos",
                    opportunity: gastosPct > 20 ? "Reducir gastos operativos" : "Optimizar gastos",
                    savings: `$${(totalCost * Math.max(gastosPct - 15, 5) / 100).toLocaleString('es-CO')} COP`,
                    timeframe: "1 mes"
                }
            ],
            benchmarks: [
                {
                    metric: "Valor por Hora",
                    yourValue: `${valorHoraPct.toFixed(1)}%`,
                    industry: "65-75%",
                    status: valorHoraPct > 65 ? "En rango" : "Por debajo",
                    recommendation: valorHoraPct < 65 ? "Aumentar tarifas" : "Mantener"
                },
                {
                    metric: "Eficiencia Tiempo",
                    yourValue: `${tiempoProyectoPct.toFixed(1)}%`,
                    industry: "25-35%",
                    status: tiempoProyectoPct > 35 ? "Ineficiente" : "Eficiente",
                    recommendation: tiempoProyectoPct > 35 ? "Automatizar" : "Optimizar"
                },
                {
                    metric: "Gastos Operativos",
                    yourValue: `${gastosPct.toFixed(1)}%`,
                    industry: "10-20%",
                    status: gastosPct > 20 ? "Por encima" : "En rango",
                    recommendation: gastosPct > 20 ? "Reducir" : "Controlar"
                }
            ],
            strategic: [
                {
                    title: "Servicios recurrentes",
                    description: "Crear contratos mensuales/anuales",
                    impact: "Ingresos predecibles +40%",
                    investment: "Baja",
                    timeline: "1-3 meses"
                },
                {
                    title: "Especialización premium",
                    description: "Enfocarse en nicho de alto valor",
                    impact: "Aumento tarifas 50-100%",
                    investment: "Media",
                    timeline: "6-12 meses"
                },
                {
                    title: "Equipo y subcontratación",
                    description: "Escalar con recursos adicionales",
                    impact: "Capacidad 3x-5x actual",
                    investment: "Alta",
                    timeline: "6-18 meses"
                }
            ]
        };
    }

    generateHibridoRecommendations(costs, totalCost) {
        const productosIncluidosPct = (costs.productosIncluidos / totalCost) * 100;
        const tiempoProfesionalPct = (costs.tiempoProfesional / totalCost) * 100;
        const otrosGastosPct = ((costs.otrosGastos || 0) / totalCost) * 100;

        return {
            priority: [
                {
                    title: "Balancear componente servicio-producto",
                    impact: Math.abs(productosIncluidosPct - tiempoProfesionalPct) > 30 ? "Alto" : "Medio",
                    roi: "25-40%",
                    currentValue: `${productosIncluidosPct.toFixed(1)}% / ${tiempoProfesionalPct.toFixed(1)}%`,
                    targetValue: "40-60% / 40-60%",
                    steps: [
                        "Evaluar rentabilidad de cada componente",
                        "Ajustar proporción producto/servicio por proyecto",
                        "Crear paquetes estándar balanceados",
                        "Medir satisfacción cliente por componente"
                    ]
                },
                {
                    title: "Optimizar márgenes por componente",
                    impact: "Alto",
                    roi: "30-50%",
                    currentValue: "Mixto",
                    targetValue: "Optimizado",
                    steps: [
                        "Calcular margen individual de productos vs servicios",
                        "Identificar componente más rentable",
                        "Ajustar precios por valor percibido",
                        "Crear ofertas bundled con alta rentabilidad"
                    ]
                }
            ],
            optimization: [
                {
                    category: "Balance P/S",
                    opportunity: "Optimizar proporción producto-servicio",
                    savings: `$${(totalCost * 0.20).toLocaleString('es-CO')} COP`,
                    timeframe: "2-3 meses"
                },
                {
                    category: "Productos",
                    opportunity: productosIncluidosPct > 60 ? "Reducir costo productos" : "Aumentar margen productos",
                    savings: `$${(totalCost * 0.15).toLocaleString('es-CO')} COP`,
                    timeframe: "1-2 meses"
                },
                {
                    category: "Servicios",
                    opportunity: tiempoProfesionalPct < 40 ? "Aumentar valor servicios" : "Optimizar eficiencia",
                    savings: `$${(totalCost * 0.25).toLocaleString('es-CO')} COP`,
                    timeframe: "1 mes"
                }
            ],
            benchmarks: [
                {
                    metric: "Componente Productos",
                    yourValue: `${productosIncluidosPct.toFixed(1)}%`,
                    industry: "40-60%",
                    status: productosIncluidosPct > 60 ? "Producto-heavy" : productosIncluidosPct < 40 ? "Servicio-heavy" : "Balanceado",
                    recommendation: productosIncluidosPct > 60 ? "Aumentar servicios" : productosIncluidosPct < 40 ? "Incluir más productos" : "Mantener"
                },
                {
                    metric: "Componente Servicios",
                    yourValue: `${tiempoProfesionalPct.toFixed(1)}%`,
                    industry: "40-60%",
                    status: tiempoProfesionalPct > 60 ? "Servicio-heavy" : tiempoProfesionalPct < 40 ? "Producto-heavy" : "Balanceado",
                    recommendation: tiempoProfesionalPct > 60 ? "Estandarizar procesos" : "Aumentar valor servicios"
                },
                {
                    metric: "Otros Gastos",
                    yourValue: `${otrosGastosPct.toFixed(1)}%`,
                    industry: "5-15%",
                    status: otrosGastosPct > 15 ? "Por encima" : "En rango",
                    recommendation: otrosGastosPct > 15 ? "Reducir gastos" : "Controlar"
                }
            ],
            strategic: [
                {
                    title: "Paquetes productizados",
                    description: "Crear ofertas estándar producto+servicio",
                    impact: "Aumento eficiencia 35%",
                    investment: "Media",
                    timeline: "3-6 meses"
                },
                {
                    title: "Escalamiento modular",
                    description: "Componentes intercambiables según cliente",
                    impact: "Flexibilidad +50%, margen +25%",
                    investment: "Media-Alta",
                    timeline: "6-9 meses"
                },
                {
                    title: "Suscripciones híbridas",
                    description: "Servicios recurrentes + productos bajo demanda",
                    impact: "Ingresos predecibles +60%",
                    investment: "Alta",
                    timeline: "9-12 meses"
                }
            ]
        };
    }

    generateGenericRecommendations(costs, totalCost) {
        return {
            priority: [
                {
                    title: "Optimizar estructura de costos",
                    impact: "Medio",
                    roi: "15-25%",
                    currentValue: "N/A",
                    targetValue: "Optimizado",
                    steps: [
                        "Analizar cada componente de costo",
                        "Identificar oportunidades de reducción",
                        "Implementar controles de costos",
                        "Monitorear resultados mensualmente"
                    ]
                }
            ],
            optimization: [
                {
                    category: "General",
                    opportunity: "Reducir costos operativos",
                    savings: `$${(totalCost * 0.10).toLocaleString('es-CO')} COP`,
                    timeframe: "2-3 meses"
                }
            ],
            benchmarks: [
                {
                    metric: "Eficiencia General",
                    yourValue: "Por determinar",
                    industry: "Variable",
                    status: "Evaluando",
                    recommendation: "Análisis detallado"
                }
            ],
            strategic: [
                {
                    title: "Análisis detallado por tipo de negocio",
                    description: "Definir categoría específica para recomendaciones precisas",
                    impact: "Recomendaciones personalizadas",
                    investment: "Baja",
                    timeline: "Inmediato"
                }
            ]
        };
    }

    showBusinessTypeMetrics(costs, businessType) {
        const metrics = this.calculateBusinessTypeMetrics(costs, businessType);
        const alerts = this.generateCostProportionAlerts(costs, businessType, metrics);

        const metricsDiv = document.createElement('div');
        metricsDiv.className = 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-4 mx-4';

        metricsDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-chart-bar text-indigo-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-lg font-semibold text-indigo-900 mb-4">
                        📊 Métricas Inteligentes - ${this.selectedBusinessType?.name}
                    </h4>

                    <!-- Coherence Score -->
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-medium text-indigo-800">Coherencia del Análisis</span>
                            <span class="text-lg font-bold ${this.getCoherenceColor(metrics.coherenceScore)}">${Math.round(metrics.coherenceScore * 100)}%</span>
                        </div>
                        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full ${this.getCoherenceBarColor(metrics.coherenceScore)} rounded-full transition-all duration-500"
                                 style="width: ${metrics.coherenceScore * 100}%"></div>
                        </div>
                        <p class="text-xs text-gray-600 mt-1">${this.getCoherenceMessage(metrics.coherenceScore, businessType)}</p>
                    </div>

                    <!-- Progress Indicators -->
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-indigo-800 mb-3">Progreso de Análisis por Componentes</h5>
                        <div class="space-y-3">
                            ${this.generateProgressIndicators(costs, businessType, metrics).map(indicator => `
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <i class="fas ${indicator.icon} text-${indicator.color}-600 mr-2 text-sm"></i>
                                        <span class="text-sm text-gray-700">${indicator.name}</span>
                                    </div>
                                    <div class="flex items-center">
                                        <div class="w-20 h-2 bg-gray-200 rounded-full mr-2">
                                            <div class="h-2 bg-${indicator.color}-500 rounded-full" style="width: ${indicator.completion}%"></div>
                                        </div>
                                        <span class="text-xs font-medium text-${indicator.color}-700">${indicator.completion}%</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Cost Proportion Alerts -->
                    ${alerts.length > 0 ? `
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-indigo-800 mb-3">🚨 Alertas de Proporciones</h5>
                        <div class="space-y-2">
                            ${alerts.map(alert => `
                                <div class="flex items-start p-3 bg-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-50 rounded-lg border border-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-200">
                                    <i class="fas ${alert.type === 'warning' ? 'fa-exclamation-triangle' : alert.type === 'danger' ? 'fa-times-circle' : 'fa-info-circle'} text-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-600 mr-2 mt-0.5"></i>
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-800">${alert.title}</p>
                                        <p class="text-xs text-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-700 mt-1">${alert.message}</p>
                                        ${alert.suggestion ? `<p class="text-xs text-${alert.type === 'warning' ? 'yellow' : alert.type === 'danger' ? 'red' : 'blue'}-600 mt-1 font-medium">💡 ${alert.suggestion}</p>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Benchmark Comparisons -->
                    <div class="mb-6">
                        <h5 class="text-sm font-medium text-indigo-800 mb-3">📈 Comparación con Benchmarks</h5>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            ${this.generateBenchmarkComparisons(costs, businessType, metrics).map(benchmark => `
                                <div class="bg-white p-3 rounded-lg border border-gray-200">
                                    <div class="text-center">
                                        <div class="text-xs text-gray-600">${benchmark.metric}</div>
                                        <div class="text-lg font-bold ${benchmark.status === 'good' ? 'text-green-600' : benchmark.status === 'average' ? 'text-yellow-600' : 'text-red-600'}">${benchmark.value}</div>
                                        <div class="text-xs ${benchmark.status === 'good' ? 'text-green-700' : benchmark.status === 'average' ? 'text-yellow-700' : 'text-red-700'}">${benchmark.comparison}</div>
                                        <div class="flex justify-center mt-1">
                                            <i class="fas ${benchmark.status === 'good' ? 'fa-arrow-up' : benchmark.status === 'average' ? 'fa-minus' : 'fa-arrow-down'} text-xs ${benchmark.status === 'good' ? 'text-green-500' : benchmark.status === 'average' ? 'text-yellow-500' : 'text-red-500'}"></i>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Overall Assessment -->
                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <h5 class="text-sm font-medium text-gray-900">Evaluación General</h5>
                                <p class="text-xs text-gray-600">${this.getOverallAssessment(metrics, businessType)}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold ${this.getScoreColor(metrics.overallScore)}">${Math.round(metrics.overallScore * 100)}</div>
                                <div class="text-xs text-gray-600">de 100</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(metricsDiv);
        this.scrollToBottom();
    }

    calculateBusinessTypeMetrics(costs, businessType) {
        let metrics = {
            coherenceScore: 0,
            completeness: 0,
            proportions: {},
            overallScore: 0
        };

        switch (businessType) {
            case 'manufactura':
                const totalManufactura = costs.materials + costs.labor + costs.packaging + costs.overhead;
                metrics.proportions = {
                    materials: costs.materials / totalManufactura,
                    labor: costs.labor / totalManufactura,
                    packaging: costs.packaging / totalManufactura,
                    overhead: costs.overhead / totalManufactura
                };

                // Coherence based on typical manufacturing ratios
                let coherenceScore = 1.0;
                if (metrics.proportions.materials > 0.7 || metrics.proportions.materials < 0.3) coherenceScore -= 0.2;
                if (metrics.proportions.labor < 0.1 || metrics.proportions.labor > 0.5) coherenceScore -= 0.15;
                if (metrics.proportions.packaging > 0.2) coherenceScore -= 0.1;
                if (costs.overhead === 0) coherenceScore -= 0.2;

                metrics.coherenceScore = Math.max(0, coherenceScore);
                metrics.completeness = (costs.materials > 0 ? 0.4 : 0) + (costs.labor > 0 ? 0.3 : 0) +
                                    (costs.packaging > 0 ? 0.2 : 0) + (costs.overhead > 0 ? 0.1 : 0);
                break;

            case 'reventa':
                const totalReventa = costs.purchase + (costs.purchase * costs.logistics / 100) + costs.storage;
                metrics.proportions = {
                    purchase: costs.purchase / totalReventa,
                    logistics: (costs.purchase * costs.logistics / 100) / totalReventa,
                    storage: costs.storage / totalReventa
                };

                // Coherence for resale business
                coherenceScore = 1.0;
                if (metrics.proportions.purchase > 0.8 || metrics.proportions.purchase < 0.4) coherenceScore -= 0.2;
                if (costs.logistics > 15 || costs.logistics < 2) coherenceScore -= 0.15;
                if (costs.margin > 100 || costs.margin < 10) coherenceScore -= 0.2;

                metrics.coherenceScore = Math.max(0, coherenceScore);
                metrics.completeness = (costs.purchase > 0 ? 0.6 : 0) + (costs.logistics > 0 ? 0.2 : 0) +
                                    (costs.storage > 0 ? 0.1 : 0) + (costs.margin > 0 ? 0.1 : 0);
                break;

            case 'servicio':
                const totalService = (costs.hourlyRate * costs.projectHours) + (costs.operational / 30);
                metrics.proportions = {
                    hourlyValue: (costs.hourlyRate * costs.projectHours) / totalService,
                    operational: (costs.operational / 30) / totalService
                };

                // Coherence for service business
                coherenceScore = 1.0;
                if (metrics.proportions.hourlyValue < 0.4) coherenceScore -= 0.3;
                if (costs.hourlyRate < 10000 || costs.hourlyRate > 200000) coherenceScore -= 0.2; // Colombian pesos
                if (costs.projectHours < 1 || costs.projectHours > 200) coherenceScore -= 0.15;

                metrics.coherenceScore = Math.max(0, coherenceScore);
                metrics.completeness = (costs.hourlyRate > 0 ? 0.4 : 0) + (costs.projectHours > 0 ? 0.3 : 0) +
                                    (costs.operational > 0 ? 0.2 : 0) + (costs.experience ? 0.1 : 0);
                break;

            case 'hibrido':
                const serviceComponent = costs.professionalRate * costs.clientHours;
                const totalHybrid = serviceComponent + costs.products + costs.additional;
                metrics.proportions = {
                    service: serviceComponent / totalHybrid,
                    products: costs.products / totalHybrid,
                    additional: costs.additional / totalHybrid
                };

                // Coherence for hybrid business
                coherenceScore = 1.0;
                if (metrics.proportions.service < 0.2 || metrics.proportions.service > 0.8) coherenceScore -= 0.2;
                if (metrics.proportions.products < 0.1 || metrics.proportions.products > 0.7) coherenceScore -= 0.2;
                if (serviceComponent === 0 || costs.products === 0) coherenceScore -= 0.3;

                metrics.coherenceScore = Math.max(0, coherenceScore);
                metrics.completeness = (costs.professionalRate > 0 ? 0.3 : 0) + (costs.clientHours > 0 ? 0.2 : 0) +
                                    (costs.products > 0 ? 0.3 : 0) + (costs.additional > 0 ? 0.2 : 0);
                break;
        }

        metrics.overallScore = (metrics.coherenceScore * 0.6) + (metrics.completeness * 0.4);
        return metrics;
    }

    generateCostProportionAlerts(costs, businessType, metrics) {
        const alerts = [];

        switch (businessType) {
            case 'manufactura':
                if (metrics.proportions.materials > 0.7) {
                    alerts.push({
                        type: 'warning',
                        title: 'Materias Primas Muy Altas',
                        message: `${Math.round(metrics.proportions.materials * 100)}% del costo son materias primas (óptimo: 40-60%)`,
                        suggestion: 'Considera negociar precios con proveedores o buscar alternativas'
                    });
                } else if (metrics.proportions.materials < 0.3) {
                    alerts.push({
                        type: 'info',
                        title: 'Materias Primas Bajas',
                        message: `Solo ${Math.round(metrics.proportions.materials * 100)}% son materias primas. Verifica si incluiste todos los componentes`,
                        suggestion: 'Revisa si faltan materiales en el cálculo'
                    });
                }

                if (metrics.proportions.labor > 0.5) {
                    alerts.push({
                        type: 'danger',
                        title: 'Mano de Obra Excesiva',
                        message: `${Math.round(metrics.proportions.labor * 100)}% del costo es mano de obra (recomendado: 15-35%)`,
                        suggestion: 'Evalúa automatización o optimización de procesos'
                    });
                }
                break;

            case 'reventa':
                if (metrics.proportions.purchase > 0.8) {
                    alerts.push({
                        type: 'warning',
                        title: 'Costo de Compra Alto',
                        message: `${Math.round(metrics.proportions.purchase * 100)}% del total es costo de compra (óptimo: 50-70%)`,
                        suggestion: 'Busca mejores precios de proveedores o aumenta el margen'
                    });
                } else if (metrics.proportions.purchase < 0.4) {
                    alerts.push({
                        type: 'info',
                        title: 'Margen Muy Alto',
                        message: `El costo de compra es solo ${Math.round(metrics.proportions.purchase * 100)}% del total`,
                        suggestion: 'Verifica si el precio de venta es competitivo en el mercado'
                    });
                }
                break;

            case 'servicio':
                if (metrics.proportions.hourlyValue < 0.4) {
                    alerts.push({
                        type: 'warning',
                        title: 'Valor Hora Bajo',
                        message: `El valor por hora representa solo ${Math.round(metrics.proportions.hourlyValue * 100)}% del precio total`,
                        suggestion: 'Considera aumentar tu tarifa horaria o reducir gastos operativos'
                    });
                }

                if (costs.projectHours > 80) {
                    alerts.push({
                        type: 'info',
                        title: 'Proyecto Extenso',
                        message: `${costs.projectHours} horas por proyecto es considerable`,
                        suggestion: 'Evalúa dividir en fases o cobrar por hitos'
                    });
                }
                break;

            case 'hibrido':
                if (metrics.proportions.service < 0.2) {
                    alerts.push({
                        type: 'warning',
                        title: 'Componente Servicio Bajo',
                        message: `Los servicios son solo ${Math.round(metrics.proportions.service * 100)}% del precio`,
                        suggestion: 'Aumenta el valor del componente profesional'
                    });
                }

                if (metrics.proportions.products > 0.7) {
                    alerts.push({
                        type: 'info',
                        title: 'Orientado a Productos',
                        message: `Los productos representan ${Math.round(metrics.proportions.products * 100)}% del total`,
                        suggestion: 'Considera si realmente necesitas el modelo híbrido'
                    });
                }
                break;
        }

        return alerts;
    }

    generateProgressIndicators(costs, businessType, metrics) {
        let indicators = [];

        switch (businessType) {
            case 'manufactura':
                indicators = [
                    { name: 'Materias Primas', completion: costs.materials > 0 ? 100 : 0, icon: 'fa-boxes', color: 'orange' },
                    { name: 'Mano de Obra', completion: costs.labor > 0 ? 100 : 0, icon: 'fa-users', color: 'blue' },
                    { name: 'Empaque', completion: costs.packaging > 0 ? 100 : 0, icon: 'fa-cube', color: 'green' },
                    { name: 'Gastos Indirectos', completion: costs.overhead > 0 ? 100 : 0, icon: 'fa-building', color: 'purple' }
                ];
                break;

            case 'reventa':
                indicators = [
                    { name: 'Costo de Compra', completion: costs.purchase > 0 ? 100 : 0, icon: 'fa-shopping-cart', color: 'green' },
                    { name: 'Logística', completion: costs.logistics > 0 ? 100 : 0, icon: 'fa-truck', color: 'blue' },
                    { name: 'Almacenamiento', completion: costs.storage > 0 ? 100 : 0, icon: 'fa-warehouse', color: 'indigo' },
                    { name: 'Margen Definido', completion: costs.margin > 0 ? 100 : 0, icon: 'fa-percentage', color: 'yellow' }
                ];
                break;

            case 'servicio':
                indicators = [
                    { name: 'Tarifa Horaria', completion: costs.hourlyRate > 0 ? 100 : 0, icon: 'fa-clock', color: 'blue' },
                    { name: 'Duración Proyecto', completion: costs.projectHours > 0 ? 100 : 0, icon: 'fa-calendar', color: 'purple' },
                    { name: 'Gastos Operativos', completion: costs.operational > 0 ? 100 : 0, icon: 'fa-cogs', color: 'gray' },
                    { name: 'Nivel Experiencia', completion: costs.experience ? 100 : 0, icon: 'fa-award', color: 'yellow' }
                ];
                break;

            case 'hibrido':
                indicators = [
                    { name: 'Tarifa Profesional', completion: costs.professionalRate > 0 ? 100 : 0, icon: 'fa-user-tie', color: 'blue' },
                    { name: 'Horas Cliente', completion: costs.clientHours > 0 ? 100 : 0, icon: 'fa-clock', color: 'indigo' },
                    { name: 'Costo Productos', completion: costs.products > 0 ? 100 : 0, icon: 'fa-box', color: 'green' },
                    { name: 'Gastos Adicionales', completion: costs.additional > 0 ? 100 : 0, icon: 'fa-plus-circle', color: 'orange' }
                ];
                break;
        }

        return indicators;
    }

    generateBenchmarkComparisons(costs, businessType, metrics) {
        let benchmarks = [];

        switch (businessType) {
            case 'manufactura':
                const materialRatio = metrics.proportions.materials * 100;
                benchmarks.push({
                    metric: 'Ratio Materias Primas',
                    value: `${Math.round(materialRatio)}%`,
                    comparison: materialRatio >= 40 && materialRatio <= 60 ? 'Óptimo' : materialRatio > 60 ? 'Alto' : 'Bajo',
                    status: materialRatio >= 40 && materialRatio <= 60 ? 'good' : materialRatio > 70 || materialRatio < 30 ? 'poor' : 'average'
                });

                const laborRatio = metrics.proportions.labor * 100;
                benchmarks.push({
                    metric: 'Ratio Mano de Obra',
                    value: `${Math.round(laborRatio)}%`,
                    comparison: laborRatio >= 15 && laborRatio <= 35 ? 'Óptimo' : laborRatio > 35 ? 'Alto' : 'Bajo',
                    status: laborRatio >= 15 && laborRatio <= 35 ? 'good' : laborRatio > 45 || laborRatio < 10 ? 'poor' : 'average'
                });

                benchmarks.push({
                    metric: 'Margen Manufactura',
                    value: '50%',
                    comparison: 'Estándar Industria',
                    status: 'good'
                });
                break;

            case 'reventa':
                const purchaseRatio = metrics.proportions.purchase * 100;
                benchmarks.push({
                    metric: 'Costo vs Precio',
                    value: `${Math.round(purchaseRatio)}%`,
                    comparison: purchaseRatio >= 50 && purchaseRatio <= 70 ? 'Saludable' : purchaseRatio > 70 ? 'Alto' : 'Excelente',
                    status: purchaseRatio >= 50 && purchaseRatio <= 70 ? 'good' : purchaseRatio > 80 ? 'poor' : 'average'
                });

                benchmarks.push({
                    metric: 'Margen Reventa',
                    value: `${costs.margin}%`,
                    comparison: costs.margin >= 25 && costs.margin <= 50 ? 'Competitivo' : costs.margin > 50 ? 'Premium' : 'Bajo',
                    status: costs.margin >= 20 ? 'good' : costs.margin >= 10 ? 'average' : 'poor'
                });

                benchmarks.push({
                    metric: 'Logística',
                    value: `${costs.logistics}%`,
                    comparison: costs.logistics <= 10 ? 'Eficiente' : 'Alto',
                    status: costs.logistics <= 8 ? 'good' : costs.logistics <= 15 ? 'average' : 'poor'
                });
                break;

            case 'servicio':
                const hourlyRateCategory = costs.hourlyRate < 30000 ? 'Junior' : costs.hourlyRate < 80000 ? 'Intermedio' : costs.hourlyRate < 150000 ? 'Senior' : 'Premium';
                benchmarks.push({
                    metric: 'Tarifa Horaria',
                    value: `$${costs.hourlyRate.toLocaleString('es-CO')}`,
                    comparison: hourlyRateCategory,
                    status: costs.hourlyRate >= 50000 ? 'good' : costs.hourlyRate >= 25000 ? 'average' : 'poor'
                });

                const projectValue = costs.hourlyRate * costs.projectHours;
                benchmarks.push({
                    metric: 'Valor Proyecto',
                    value: `$${projectValue.toLocaleString('es-CO')}`,
                    comparison: projectValue >= 500000 ? 'Alto Valor' : projectValue >= 200000 ? 'Medio' : 'Básico',
                    status: projectValue >= 500000 ? 'good' : projectValue >= 150000 ? 'average' : 'poor'
                });

                benchmarks.push({
                    metric: 'Eficiencia',
                    value: `${costs.projectHours}h`,
                    comparison: costs.projectHours <= 20 ? 'Ágil' : costs.projectHours <= 80 ? 'Normal' : 'Extenso',
                    status: costs.projectHours <= 40 ? 'good' : costs.projectHours <= 100 ? 'average' : 'poor'
                });
                break;

            case 'hibrido':
                const serviceRatio = metrics.proportions.service * 100;
                benchmarks.push({
                    metric: 'Balance Servicio',
                    value: `${Math.round(serviceRatio)}%`,
                    comparison: serviceRatio >= 30 && serviceRatio <= 70 ? 'Balanceado' : serviceRatio > 70 ? 'Pro Servicio' : 'Pro Producto',
                    status: serviceRatio >= 25 && serviceRatio <= 75 ? 'good' : 'average'
                });

                const totalValue = (costs.professionalRate * costs.clientHours) + costs.products + costs.additional;
                benchmarks.push({
                    metric: 'Valor Total',
                    value: `$${totalValue.toLocaleString('es-CO')}`,
                    comparison: totalValue >= 800000 ? 'Premium' : totalValue >= 400000 ? 'Medio' : 'Básico',
                    status: totalValue >= 600000 ? 'good' : totalValue >= 300000 ? 'average' : 'poor'
                });

                benchmarks.push({
                    metric: 'Complejidad',
                    value: 'Híbrido',
                    comparison: 'Modelo Avanzado',
                    status: 'good'
                });
                break;
        }

        return benchmarks;
    }

    getCoherenceColor(score) {
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    }

    getCoherenceBarColor(score) {
        if (score >= 0.8) return 'bg-green-500';
        if (score >= 0.6) return 'bg-yellow-500';
        return 'bg-red-500';
    }

    getCoherenceMessage(score, businessType) {
        if (score >= 0.8) {
            return `Excelente coherencia para ${businessType}. Los costos están bien balanceados.`;
        } else if (score >= 0.6) {
            return `Coherencia aceptable para ${businessType}. Algunas proporciones pueden mejorarse.`;
        } else {
            return `Coherencia baja para ${businessType}. Revisa las proporciones de costos.`;
        }
    }

    getScoreColor(score) {
        if (score >= 0.8) return 'text-green-600';
        if (score >= 0.6) return 'text-yellow-600';
        return 'text-red-600';
    }

    getOverallAssessment(metrics, businessType) {
        if (metrics.overallScore >= 0.8) {
            return `Excelente estructura de costos para ${businessType}. Análisis completo y coherente.`;
        } else if (metrics.overallScore >= 0.6) {
            return `Buen análisis para ${businessType}. Algunas áreas pueden optimizarse.`;
        } else {
            return `El análisis de ${businessType} necesita refinamiento. Revisa los componentes principales.`;
        }
    }

    // 📦 Package Cost Validation Functions
    extractCostFromMessage(message) {
        const costPatterns = [
            /cuesta?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /precio\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /vendo\s*a?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g
        ];

        for (const pattern of costPatterns) {
            const match = message.match(pattern);
            if (match) {
                return parseFloat(match[1].replace(',', ''));
            }
        }
        return null;
    }

    analyzePackageDiscount(message, cost) {
        const discountPatterns = [
            /descuento\s*del?\s*(\d+)%/i,
            /(\d+)%\s*descuento/i,
            /(\d+)%\s*off/i
        ];

        for (const pattern of discountPatterns) {
            const match = message.match(pattern);
            if (match) {
                const discount = parseInt(match[1]);
                return this.validateDiscount(discount);
            }
        }

        // If no explicit discount mentioned, analyze based on cost ranges
        if (cost) {
            if (cost > 50000) return "💡 Para tu tipo de negocio, un descuento del 10-15% es óptimo";
            if (cost > 20000) return "💡 Tu descuento del 15% es óptimo para este tipo de negocio";
            if (cost > 5000) return "💡 Un descuento del 20% sería ideal para tu paquete";
        }

        return null;
    }

    validateDiscount(discount) {
        if (discount <= 10) return "✅ Descuento conservador - márgenes saludables";
        if (discount <= 20) return "💡 Tu descuento del " + discount + "% es óptimo para este tipo de negocio";
        if (discount <= 30) return "⚠️ Descuento alto - revisa tus márgenes";
        return "⚠️ El descuento del " + discount + "% parece muy alto";
    }

    analyzeMargins(cost) {
        if (!cost) return null;

        if (cost < 5000) {
            return "✅ Márgenes saludables para tu paquete - productos de entrada";
        } else if (cost < 20000) {
            return "✅ Márgenes saludables para tu paquete - rango medio";
        } else if (cost < 50000) {
            return "💡 Revisa que tus componentes justifiquen el precio";
        } else {
            return "💰 Paquete premium - asegúrate de ofrecer valor excepcional";
        }
    }

    generatePackageValidation(message) {
        const cost = this.extractCostFromMessage(message);
        const discountAnalysis = this.analyzePackageDiscount(message, cost);
        const marginAnalysis = this.analyzeMargins(cost);

        let validationMessage = '📦 Veo que quieres costear un paquete/combo. Te ayudo a optimizarlo.\n\n';

        if (cost) {
            validationMessage += `💰 Precio detectado: $${cost.toLocaleString()}\n`;
        }

        if (discountAnalysis) {
            validationMessage += discountAnalysis + '\n';
        }

        if (marginAnalysis) {
            validationMessage += marginAnalysis + '\n';
        }

        validationMessage += '\n¿Qué productos incluye tu paquete?\n¿Cuál es el costo de cada componente?\n¿Vendes los productos por separado también?';

        return validationMessage;
    }

    // 🎯 Intelligent Business Type Detection for Packages
    detectBusinessType(message) {
        const messageText = message.toLowerCase();

        // Food/Restaurant keywords
        const foodKeywords = ['hamburguesa', 'comida', 'restaurante', 'cocina', 'menú', 'pizza', 'pollo', 'carne', 'bebida', 'almuerzo', 'cena', 'desayuno', 'café', 'bar', 'tacos', 'torta', 'sandwich', 'sopa', 'ensalada'];

        // Service keywords
        const serviceKeywords = ['servicio', 'consultoría', 'asesoría', 'capacitación', 'curso', 'entrenamiento', 'terapia', 'masaje', 'peluquería', 'belleza', 'limpieza', 'mantenimiento', 'reparación', 'instalación'];

        // Product keywords
        const productKeywords = ['producto', 'venta', 'tienda', 'ropa', 'zapatos', 'electrónico', 'celular', 'computadora', 'mueble', 'decoración', 'juguete', 'libro', 'accesorio', 'herramienta'];

        if (foodKeywords.some(keyword => messageText.includes(keyword))) {
            return 'food';
        }
        if (serviceKeywords.some(keyword => messageText.includes(keyword))) {
            return 'service';
        }
        if (productKeywords.some(keyword => messageText.includes(keyword))) {
            return 'product';
        }

        return 'general';
    }

    getIndustryRecommendations(businessType, cost) {
        const recommendations = {
            food: {
                discount: '15-20% es óptimo para combos de comida',
                profitability: 'Considera ingredientes de temporada para reducir costos',
                composition: 'Incluye bebida para aumentar el valor percibido'
            },
            service: {
                discount: '20-25% funciona bien para paquetes de servicios',
                profitability: 'Agrupa servicios complementarios para mayor margen',
                composition: 'Ofrece consulta inicial gratuita como valor agregado'
            },
            product: {
                discount: '10-15% mantiene márgenes saludables en productos',
                profitability: 'Combina productos de alta y baja rotación',
                composition: 'Incluye accesorios complementarios'
            },
            general: {
                discount: '15% es un descuento equilibrado',
                profitability: 'Revisa tus márgenes por componente',
                composition: 'Agrupa productos que se usan juntos'
            }
        };

        return recommendations[businessType] || recommendations.general;
    }

    generateIntelligentRecommendations(message, businessType, cost) {
        const recommendations = this.getIndustryRecommendations(businessType, cost);
        let intelligentMessage = '';

        // Industry-specific pricing advice
        intelligentMessage += `💡 ${recommendations.discount}\n`;

        // Profitability optimization
        intelligentMessage += `📈 ${recommendations.profitability}\n`;

        // Package composition suggestions
        intelligentMessage += `🎯 ${recommendations.composition}\n`;

        // Cost-based additional advice
        if (cost) {
            if (cost > 30000) {
                intelligentMessage += `💎 Para productos premium, enfócate en la experiencia del cliente\n`;
            } else if (cost < 5000) {
                intelligentMessage += `⚡ Considera crear paquetes de mayor valor agregado\n`;
            }
        }

        return intelligentMessage;
    }

    enhancePackageValidation(message) {
        const cost = this.extractCostFromMessage(message);
        const businessType = this.detectBusinessType(message);
        const discountAnalysis = this.analyzePackageDiscount(message, cost);
        const marginAnalysis = this.analyzeMargins(cost);
        const intelligentRecommendations = this.generateIntelligentRecommendations(message, businessType, cost);

        let validationMessage = '📦 Veo que quieres costear un paquete/combo. Te ayudo a optimizarlo.\n\n';

        if (cost) {
            validationMessage += `💰 Precio detectado: $${cost.toLocaleString()}\n`;
        }

        if (discountAnalysis) {
            validationMessage += discountAnalysis + '\n';
        }

        if (marginAnalysis) {
            validationMessage += marginAnalysis + '\n';
        }

        validationMessage += '\n' + intelligentRecommendations;
        validationMessage += '\n¿Qué productos incluye tu paquete?\n¿Cuál es el costo de cada componente?\n¿Vendes los productos por separado también?';

        return validationMessage;
    }

    // 📊 Package Profitability Analysis Functions
    calculateBreakEvenPoint(packageCost, businessType) {
        if (!packageCost) return null;

        // Estimate costs based on business type
        const costStructures = {
            food: { fixedCosts: packageCost * 0.3, variableCosts: packageCost * 0.4 },
            service: { fixedCosts: packageCost * 0.2, variableCosts: packageCost * 0.2 },
            product: { fixedCosts: packageCost * 0.25, variableCosts: packageCost * 0.5 },
            general: { fixedCosts: packageCost * 0.25, variableCosts: packageCost * 0.4 }
        };

        const costs = costStructures[businessType] || costStructures.general;
        const margin = packageCost - costs.variableCosts;
        const breakEvenUnits = Math.ceil(costs.fixedCosts / margin);

        return {
            units: breakEvenUnits,
            revenue: breakEvenUnits * packageCost,
            fixedCosts: costs.fixedCosts,
            variableCosts: costs.variableCosts,
            margin: margin
        };
    }

    calculateRevenueProjections(packageCost, businessType) {
        if (!packageCost) return null;

        const breakEven = this.calculateBreakEvenPoint(packageCost, businessType);
        if (!breakEven) return null;

        // Project different scenarios
        const scenarios = {
            conservative: Math.ceil(breakEven.units * 1.2),
            realistic: Math.ceil(breakEven.units * 2.0),
            optimistic: Math.ceil(breakEven.units * 3.5)
        };

        return {
            monthly: {
                conservative: scenarios.conservative * packageCost,
                realistic: scenarios.realistic * packageCost,
                optimistic: scenarios.optimistic * packageCost
            },
            units: scenarios,
            profit: {
                conservative: (scenarios.conservative * breakEven.margin) - breakEven.fixedCosts,
                realistic: (scenarios.realistic * breakEven.margin) - breakEven.fixedCosts,
                optimistic: (scenarios.optimistic * breakEven.margin) - breakEven.fixedCosts
            }
        };
    }

    calculateCustomerLifetimeValue(packageCost, businessType) {
        if (!packageCost) return null;

        // Estimated repeat purchase patterns by business type
        const patterns = {
            food: { frequency: 8, retention: 0.7 }, // 8 times per year, 70% retention
            service: { frequency: 3, retention: 0.8 }, // 3 times per year, 80% retention
            product: { frequency: 2, retention: 0.6 }, // 2 times per year, 60% retention
            general: { frequency: 4, retention: 0.7 } // 4 times per year, 70% retention
        };

        const pattern = patterns[businessType] || patterns.general;
        const annualValue = packageCost * pattern.frequency;
        const lifetimeYears = 2; // Conservative 2-year lifetime
        const totalValue = annualValue * lifetimeYears * pattern.retention;

        return {
            annual: annualValue,
            lifetime: totalValue,
            frequency: pattern.frequency,
            retention: pattern.retention * 100
        };
    }

    generateProfitabilityAnalysis(packageCost, businessType) {
        const breakEven = this.calculateBreakEvenPoint(packageCost, businessType);
        const projections = this.calculateRevenueProjections(packageCost, businessType);
        const clv = this.calculateCustomerLifetimeValue(packageCost, businessType);

        let analysis = '\n📊 ANÁLISIS DE RENTABILIDAD\n\n';

        if (breakEven) {
            analysis += `💰 Punto de Equilibrio: ${breakEven.units} unidades\n`;
            analysis += `📈 Ingresos necesarios: $${breakEven.revenue.toLocaleString()}\n`;
            analysis += `💸 Margen por unidad: $${breakEven.margin.toLocaleString()}\n\n`;
        }

        if (projections) {
            analysis += `🎯 PROYECCIONES MENSUALES:\n`;
            analysis += `• Conservador: $${projections.monthly.conservative.toLocaleString()} (${projections.units.conservative} unidades)\n`;
            analysis += `• Realista: $${projections.monthly.realistic.toLocaleString()} (${projections.units.realistic} unidades)\n`;
            analysis += `• Optimista: $${projections.monthly.optimistic.toLocaleString()} (${projections.units.optimistic} unidades)\n\n`;
        }

        if (clv) {
            analysis += `👥 VALOR DEL CLIENTE:\n`;
            analysis += `• Valor anual: $${clv.annual.toLocaleString()}\n`;
            analysis += `• Valor de vida: $${clv.lifetime.toLocaleString()}\n`;
            analysis += `• Frecuencia: ${clv.frequency} compras/año\n`;
            analysis += `• Retención: ${clv.retention}%\n\n`;
        }

        // Add actionable insights
        analysis += this.generateProfitabilityInsights(packageCost, businessType, breakEven, projections, clv);

        return analysis;
    }

    generateProfitabilityInsights(packageCost, businessType, breakEven, projections, clv) {
        let insights = '💡 RECOMENDACIONES ESTRATÉGICAS:\n';

        if (breakEven && breakEven.units > 100) {
            insights += '• Considera reducir costos fijos para mejorar el punto de equilibrio\n';
        } else if (breakEven && breakEven.units < 20) {
            insights += '• Excelente estructura de costos - alta rentabilidad potencial\n';
        }

        if (packageCost > 30000) {
            insights += '• Enfócate en la experiencia premium y valor agregado\n';
            insights += '• Implementa estrategias de fidelización para aumentar CLV\n';
        } else if (packageCost < 5000) {
            insights += '• Considera crear paquetes de mayor valor\n';
            insights += '• Optimiza para ventas de volumen\n';
        }

        if (businessType === 'food') {
            insights += '• Aprovecha la alta frecuencia de compra para programas de lealtad\n';
        } else if (businessType === 'service') {
            insights += '• La alta retención permite invertir más en adquisición de clientes\n';
        }

        insights += '• Monitorea métricas clave: CAC, LTV, y margen de contribución\n';

        return insights;
    }

    createComprehensivePackageAnalysis(message) {
        const cost = this.extractCostFromMessage(message);
        const businessType = this.detectBusinessType(message);
        const discountAnalysis = this.analyzePackageDiscount(message, cost);
        const marginAnalysis = this.analyzeMargins(cost);
        const intelligentRecommendations = this.generateIntelligentRecommendations(message, businessType, cost);
        const profitabilityAnalysis = this.generateProfitabilityAnalysis(cost, businessType);

        let validationMessage = '📦 ANÁLISIS COMPLETO DE TU PAQUETE/COMBO\n\n';

        if (cost) {
            validationMessage += `💰 Precio detectado: $${cost.toLocaleString()}\n`;
        }

        if (discountAnalysis) {
            validationMessage += discountAnalysis + '\n';
        }

        if (marginAnalysis) {
            validationMessage += marginAnalysis + '\n';
        }

        validationMessage += '\n' + intelligentRecommendations;

        if (cost) {
            validationMessage += profitabilityAnalysis;
        }

        validationMessage += '\n¿Qué productos incluye tu paquete?\n¿Cuál es el costo de cada componente?\n¿Vendes los productos por separado también?';

        return validationMessage;
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

        // 📦 NEW Package Detection System - Check if message should be processed as package
        if (this.shouldProcessAsPackage(message)) {
            let packageResponse;

            if (this.packageMode) {
                // Continue package conversation flow
                packageResponse = this.processPackageResponse(message);
            } else {
                // Initial package detection
                packageResponse = this.createPackageDetectionResponse(message);
            }

            this.addMessage({
                type: 'assistant',
                content: packageResponse,
                timestamp: new Date()
            });
            this.setProcessing(false);
            return;
        }

        // 💡 Intelligent Cost Validation Detection
        this.detectAndPerformIntelligentValidation(message);

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
                    context: {
                        ...this.context,
                        selectedBusinessType: this.selectedBusinessType,
                        businessTypeSelected: this.businessTypeSelected
                    }
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

            // Mostrar respuesta del asistente
            this.addMessage({
                type: 'assistant',
                content: data.respuesta || data.response || 'Lo siento, no pude procesar tu mensaje.',
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Error:', error);
            this.addMessage({
                type: 'assistant',
                content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
                timestamp: new Date()
            });
        } finally {
            this.setProcessing(false);
        }
    }

    // Keep package detection as optional feature
    detectPackageInMessage(message) {
        if (!this.packageKeywords || !this.packageKeywords.length) {
            return false;
        }
        const text = message.toLowerCase();
        return this.packageKeywords.some(keyword => text.includes(keyword));
    }

    // Restore legacy package detection for compatibility
    oldPackageDetection(message) {
        if (!this.packageDetected && this.detectPackageInMessage(message)) {
            this.packageDetected = true;
            this.context.packageDetected = true;

            // Show clean package detection message
            this.addMessage({
                type: 'assistant',
                content: this.createCleanPackageMessage(),
                timestamp: new Date()
            });

            this.setProcessing(false);
            return;
        }

        // 💡 Intelligent Cost Validation Detection
        this.detectAndPerformIntelligentValidation(message);

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
                    context: {
                        ...this.context,
                        selectedBusinessType: this.selectedBusinessType,
                        businessTypeSelected: this.businessTypeSelected
                    }
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

    addExportButtons(costs, businessType, analysis) {
        const exportDiv = document.createElement('div');
        exportDiv.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4 mx-4';
        exportDiv.id = 'export-buttons-container';

        exportDiv.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-download text-blue-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-lg font-semibold text-blue-900 mb-4">
                        📥 Exportar y Compartir Análisis
                    </h4>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <!-- PDF Download Button -->
                        <button id="download-pdf-btn" class="export-button bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                            <i class="fas fa-file-pdf text-xl mb-2"></i>
                            <div class="text-sm font-medium">Descargar PDF</div>
                        </button>

                        <!-- Excel Download Button -->
                        <button id="download-excel-btn" class="export-button bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                            <i class="fas fa-file-excel text-xl mb-2"></i>
                            <div class="text-sm font-medium">Descargar Excel</div>
                        </button>

                        <!-- Print Button -->
                        <button id="print-analysis-btn" class="export-button bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                            <i class="fas fa-print text-xl mb-2"></i>
                            <div class="text-sm font-medium">Imprimir</div>
                        </button>

                        <!-- Email Share Button -->
                        <button id="email-share-btn" class="export-button bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                            <i class="fas fa-envelope text-xl mb-2"></i>
                            <div class="text-sm font-medium">Enviar Email</div>
                        </button>
                    </div>

                    <div class="mt-4 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Todos los formatos incluyen:</strong> Análisis completo, recomendaciones inteligentes, métricas y benchmarks de tu negocio tipo ${this.selectedBusinessType?.name || businessType}.
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(exportDiv);

        // Add event listeners for export buttons
        this.setupExportButtonHandlers(costs, businessType, analysis);
    }

    setupExportButtonHandlers(costs, businessType, analysis) {
        const pdfBtn = document.getElementById('download-pdf-btn');
        const excelBtn = document.getElementById('download-excel-btn');
        const printBtn = document.getElementById('print-analysis-btn');
        const emailBtn = document.getElementById('email-share-btn');

        // PDF Download
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => {
                this.downloadPDF(costs, businessType, analysis);
            });
        }

        // Excel Download
        if (excelBtn) {
            excelBtn.addEventListener('click', () => {
                this.downloadExcel(costs, businessType, analysis);
            });
        }

        // Print Analysis
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                this.printAnalysis(costs, businessType, analysis);
            });
        }

        // Email Share
        if (emailBtn) {
            emailBtn.addEventListener('click', () => {
                this.shareByEmail(costs, businessType, analysis);
            });
        }
    }

    downloadPDF(costs, businessType, analysis) {
        // Show loading state
        const btn = document.getElementById('download-pdf-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xl mb-2"></i><div class="text-sm font-medium">Generando...</div>';
        btn.disabled = true;

        try {
            // Create comprehensive analysis data
            const analysisData = {
                businessType: businessType,
                businessName: this.selectedBusinessType?.name || businessType,
                costs: costs,
                analysis: analysis,
                timestamp: new Date().toISOString(),
                recommendations: this.generateIntelligentRecommendations(businessType, costs)
            };

            // Send to server for PDF generation
            fetch('/api/export/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisData)
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Analisis_Costos_${businessType}_${new Date().getTime()}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                // Show success message
                this.showExportSuccess('PDF descargado exitosamente');
            })
            .catch(error => {
                console.error('Error downloading PDF:', error);
                this.showExportError('Error al generar PDF');
            })
            .finally(() => {
                // Restore button state
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            });

        } catch (error) {
            console.error('Error in downloadPDF:', error);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            this.showExportError('Error al generar PDF');
        }
    }

    downloadExcel(costs, businessType, analysis) {
        // Show loading state
        const btn = document.getElementById('download-excel-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin text-xl mb-2"></i><div class="text-sm font-medium">Generando...</div>';
        btn.disabled = true;

        try {
            const analysisData = {
                businessType: businessType,
                businessName: this.selectedBusinessType?.name || businessType,
                costs: costs,
                analysis: analysis,
                timestamp: new Date().toISOString(),
                recommendations: this.generateIntelligentRecommendations(businessType, costs)
            };

            fetch('/api/export/excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analysisData)
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Analisis_Costos_${businessType}_${new Date().getTime()}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                this.showExportSuccess('Excel descargado exitosamente');
            })
            .catch(error => {
                console.error('Error downloading Excel:', error);
                this.showExportError('Error al generar Excel');
            })
            .finally(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            });

        } catch (error) {
            console.error('Error in downloadExcel:', error);
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            this.showExportError('Error al generar Excel');
        }
    }

    printAnalysis(costs, businessType, analysis) {
        const printWindow = window.open('', '_blank');
        const recommendations = this.generateIntelligentRecommendations(businessType, costs);

        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Análisis de Costos - ${this.selectedBusinessType?.name || businessType}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        line-height: 1.6;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #2563eb;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header p {
                        margin: 10px 0 0 0;
                        color: #6b7280;
                        font-size: 16px;
                    }
                    .section {
                        margin-bottom: 30px;
                        break-inside: avoid;
                    }
                    .section h2 {
                        color: #1f2937;
                        border-left: 4px solid #2563eb;
                        padding-left: 15px;
                        font-size: 20px;
                    }
                    .costs-table, .analysis-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    .costs-table th, .costs-table td,
                    .analysis-table th, .analysis-table td {
                        border: 1px solid #d1d5db;
                        padding: 12px;
                        text-align: left;
                    }
                    .costs-table th, .analysis-table th {
                        background-color: #f3f4f6;
                        font-weight: bold;
                    }
                    .recommendations {
                        background-color: #f8fafc;
                        padding: 20px;
                        border-left: 4px solid #10b981;
                        margin: 15px 0;
                    }
                    .recommendation-item {
                        margin-bottom: 15px;
                        padding: 10px;
                        background: white;
                        border-radius: 5px;
                    }
                    .recommendation-title {
                        font-weight: bold;
                        color: #065f46;
                        margin-bottom: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #d1d5db;
                        color: #6b7280;
                        font-size: 14px;
                    }
                    @media print {
                        body { margin: 0; }
                        .section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Análisis de Costos IAtiva</h1>
                    <p><strong>Tipo de Negocio:</strong> ${this.selectedBusinessType?.name || businessType}</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
                </div>

                <div class="section">
                    <h2>💰 Desglose de Costos</h2>
                    <table class="costs-table">
                        <thead>
                            <tr>
                                <th>Componente</th>
                                <th>Valor (COP)</th>
                                <th>Porcentaje</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateCostTableRows(costs, analysis)}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>📈 Análisis de Precios</h2>
                    <table class="analysis-table">
                        <tr><th>Precio Mínimo</th><td>$${analysis.minPrice?.toLocaleString('es-CO') || 'N/A'}</td></tr>
                        <tr><th>Precio Óptimo</th><td>$${analysis.optimalPrice?.toLocaleString('es-CO') || 'N/A'}</td></tr>
                        <tr><th>Precio Premium</th><td>$${analysis.premiumPrice?.toLocaleString('es-CO') || 'N/A'}</td></tr>
                        <tr><th>Ganancia Estimada</th><td>$${analysis.profit?.toLocaleString('es-CO') || 'N/A'}</td></tr>
                    </table>
                </div>

                <div class="section">
                    <h2>🎯 Recomendaciones Inteligentes</h2>
                    <div class="recommendations">
                        ${this.generateRecommendationsHTML(recommendations)}
                    </div>
                </div>

                <div class="footer">
                    <p>Generado por IAtiva - Sistema Inteligente de Análisis de Costos</p>
                    <p>© ${new Date().getFullYear()} IAtiva. Todos los derechos reservados.</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.focus();

        // Wait a bit for content to load, then print
        setTimeout(() => {
            printWindow.print();
        }, 500);

        this.showExportSuccess('Análisis enviado a impresión');
    }

    shareByEmail(costs, businessType, analysis) {
        const emailModal = document.createElement('div');
        emailModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        emailModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                    <i class="fas fa-envelope text-blue-500 mr-2"></i>
                    Compartir Análisis por Email
                </h3>
                <form id="email-form">
                    <div class="mb-4">
                        <label for="email-to" class="block text-sm font-medium text-gray-700 mb-2">
                            Email destinatario:
                        </label>
                        <input type="email" id="email-to" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                               placeholder="ejemplo@email.com">
                    </div>
                    <div class="mb-4">
                        <label for="email-message" class="block text-sm font-medium text-gray-700 mb-2">
                            Mensaje adicional (opcional):
                        </label>
                        <textarea id="email-message" rows="3"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Agrega un mensaje personalizado..."></textarea>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" id="cancel-email"
                                class="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit"
                                class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                            <i class="fas fa-paper-plane mr-2"></i>Enviar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(emailModal);

        // Handle form submission
        document.getElementById('email-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const emailTo = document.getElementById('email-to').value;
            const message = document.getElementById('email-message').value;

            this.sendAnalysisByEmail(emailTo, message, costs, businessType, analysis);
            document.body.removeChild(emailModal);
        });

        // Handle cancel
        document.getElementById('cancel-email').addEventListener('click', () => {
            document.body.removeChild(emailModal);
        });
    }

    sendAnalysisByEmail(emailTo, message, costs, businessType, analysis) {
        const analysisData = {
            emailTo,
            message,
            businessType,
            businessName: this.selectedBusinessType?.name || businessType,
            costs,
            analysis,
            recommendations: this.generateIntelligentRecommendations(businessType, costs),
            timestamp: new Date().toISOString()
        };

        fetch('/api/export/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(analysisData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showExportSuccess('Análisis enviado por email exitosamente');
            } else {
                this.showExportError('Error al enviar email: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
            this.showExportError('Error al enviar email');
        });
    }

    generateCostTableRows(costs, analysis) {
        const total = analysis.totalCost || Object.values(costs).reduce((sum, cost) => sum + cost, 0);
        let rows = '';

        for (const [key, value] of Object.entries(costs)) {
            const percentage = ((value / total) * 100).toFixed(1);
            const displayName = this.getCostDisplayName(key);
            rows += `
                <tr>
                    <td>${displayName}</td>
                    <td>$${value.toLocaleString('es-CO')}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        }

        rows += `
            <tr style="background-color: #f9fafb; font-weight: bold;">
                <td>TOTAL</td>
                <td>$${total.toLocaleString('es-CO')}</td>
                <td>100%</td>
            </tr>
        `;

        return rows;
    }

    getCostDisplayName(key) {
        const displayNames = {
            materials: 'Materias Primas',
            labor: 'Mano de Obra',
            packaging: 'Empaque',
            overhead: 'Gastos Indirectos',
            purchase: 'Costo de Compra',
            logistics: 'Logística',
            storage: 'Almacenamiento',
            hourlyRate: 'Valor por Hora',
            projectTime: 'Tiempo de Proyecto',
            expenses: 'Gastos Operativos',
            productsIncluded: 'Productos Incluidos',
            professionalTime: 'Tiempo Profesional'
        };
        return displayNames[key] || key;
    }

    generateRecommendationsHTML(recommendations) {
        let html = '';

        if (recommendations.priority) {
            html += '<h4>🚨 Recomendaciones Prioritarias:</h4>';
            recommendations.priority.forEach(rec => {
                html += `
                    <div class="recommendation-item">
                        <div class="recommendation-title">${rec.title}</div>
                        <p><strong>Impacto:</strong> ${rec.impact} | <strong>ROI:</strong> ${rec.roi}</p>
                        <p><strong>Valor Actual:</strong> ${rec.currentValue}% | <strong>Objetivo:</strong> ${rec.targetValue}</p>
                    </div>
                `;
            });
        }

        if (recommendations.strategic) {
            html += '<h4>📈 Recomendaciones Estratégicas:</h4>';
            recommendations.strategic.forEach(rec => {
                html += `
                    <div class="recommendation-item">
                        <div class="recommendation-title">${rec.title}</div>
                        <p>${rec.description}</p>
                        <p><strong>Impacto:</strong> ${rec.impact} | <strong>Timeline:</strong> ${rec.timeline}</p>
                    </div>
                `;
            });
        }

        return html || '<p>No hay recomendaciones disponibles.</p>';
    }

    showExportSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
        toast.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            ${message}
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 4000);
    }

    showExportError(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle mr-2"></i>
            ${message}
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 4000);
    }

    trackBusinessTypeSelection(businessType, businessName) {
        try {
            console.log('📊 Tracking business type selection:', { businessType, businessName });

            // Send analytics to server
            fetch('/api/analytics/business-type-selection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventType: 'business_type_selected',
                    businessType: businessType,
                    businessName: businessName,
                    timestamp: new Date().toISOString(),
                    sessionId: window.DEMO_SESSION_ID || 'unknown',
                    userAgent: navigator.userAgent,
                    screenSize: {
                        width: screen.width,
                        height: screen.height
                    },
                    viewportSize: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                })
            }).then(response => {
                if (response.ok) {
                    console.log('✅ Analytics tracked successfully');
                } else {
                    console.warn('⚠️ Analytics tracking failed:', response.status);
                }
            }).catch(error => {
                console.error('❌ Error tracking analytics:', error);
            });

            // Store locally for fallback
            const analyticsData = {
                businessType,
                businessName,
                timestamp: new Date().toISOString(),
                sessionId: window.DEMO_SESSION_ID || 'unknown'
            };

            localStorage.setItem('lastBusinessTypeSelection', JSON.stringify(analyticsData));

        } catch (error) {
            console.error('❌ Error in trackBusinessTypeSelection:', error);
        }
    }

    // ===========================
    // DEBT CAPACITY ANALYSIS FUNCTIONALITY
    // ===========================

    addDebtCapacityButton(costs, businessType, analysis) {
        const debtButtonDiv = document.createElement('div');
        debtButtonDiv.className = 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-6 mb-4 mx-4';
        debtButtonDiv.id = 'debt-capacity-button-container';

        debtButtonDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-chart-line text-emerald-600 text-xl"></i>
                        </div>
                    </div>
                    <div class="ml-4">
                        <h4 class="text-lg font-semibold text-emerald-900 mb-2">
                            💰 Análisis de Capacidad de Endeudamiento
                        </h4>
                        <p class="text-emerald-700 text-sm mb-3">
                            Descubre cuánto puedes endeudarte de forma segura para hacer crecer tu negocio
                        </p>
                        <div class="flex items-center text-xs text-emerald-600">
                            <i class="fas fa-star mr-1"></i>
                            <span class="font-medium">Servicio Premium</span>
                            <span class="ml-2 bg-emerald-100 px-2 py-1 rounded">Personalizado para ${businessType}</span>
                        </div>
                    </div>
                </div>
                <button id="debt-capacity-analysis-btn" class="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center">
                    <i class="fas fa-calculator mr-2"></i>
                    Analizar Capacidad
                </button>
            </div>
        `;

        this.chatMessages.appendChild(debtButtonDiv);

        // Add event listener for debt capacity analysis
        document.getElementById('debt-capacity-analysis-btn').addEventListener('click', () => {
            this.showDebtCapacityForm(costs, businessType, analysis);
        });
    }

    showDebtCapacityForm(costs, businessType, analysis) {
        const formDiv = document.createElement('div');
        formDiv.className = 'bg-white border border-gray-200 rounded-lg p-6 mb-4 mx-4 shadow-lg';
        formDiv.id = 'debt-capacity-form-container';

        formDiv.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center mb-4">
                    <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        <i class="fas fa-forms text-emerald-600"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">📊 Análisis de Capacidad de Endeudamiento</h3>
                        <p class="text-sm text-gray-600">Complete la información financiera para calcular su capacidad de endeudamiento</p>
                    </div>
                </div>
            </div>

            <form id="debt-capacity-form" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="form-group">
                        <label for="monthly-income" class="block text-sm font-semibold text-gray-700 mb-2">
                            💰 Ingresos Mensuales Actuales
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-3 text-gray-500">$</span>
                            <input type="number" id="monthly-income" name="monthly-income" class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="5,000,000" required>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Ingresos netos promedio del negocio</p>
                    </div>

                    <div class="form-group">
                        <label for="existing-debts" class="block text-sm font-semibold text-gray-700 mb-2">
                            📋 Deudas Existentes (Mensual)
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-3 text-gray-500">$</span>
                            <input type="number" id="existing-debts" name="existing-debts" class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="800,000" required>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Suma de todas las cuotas mensuales existentes</p>
                    </div>

                    <div class="form-group">
                        <label for="fixed-expenses" class="block text-sm font-semibold text-gray-700 mb-2">
                            🏠 Gastos Fijos Mensuales
                        </label>
                        <div class="relative">
                            <span class="absolute left-3 top-3 text-gray-500">$</span>
                            <input type="number" id="fixed-expenses" name="fixed-expenses" class="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="2,500,000" required>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Gastos operativos, alquiler, servicios, salarios</p>
                    </div>

                    <div class="form-group">
                        <label for="business-time" class="block text-sm font-semibold text-gray-700 mb-2">
                            ⏰ Tiempo en el Negocio
                        </label>
                        <select id="business-time" name="business-time" class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                            <option value="">Seleccionar...</option>
                            <option value="menos-6">Menos de 6 meses</option>
                            <option value="6-12">6 meses - 1 año</option>
                            <option value="1-2">1 - 2 años</option>
                            <option value="2-5">2 - 5 años</option>
                            <option value="mas-5">Más de 5 años</option>
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Tiempo de operación continua del negocio</p>
                    </div>
                </div>

                <div class="form-group">
                    <label for="loan-purpose" class="block text-sm font-semibold text-gray-700 mb-2">
                        🎯 Propósito del Financiamiento
                    </label>
                    <select id="loan-purpose" name="loan-purpose" class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" required>
                        <option value="">Seleccionar propósito...</option>
                        <option value="capital-trabajo">Capital de Trabajo</option>
                        <option value="expansion">Expansión del Negocio</option>
                        <option value="equipos">Compra de Equipos</option>
                        <option value="inventario">Aumentar Inventario</option>
                        <option value="infraestructura">Mejoras en Infraestructura</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>

                <div class="flex justify-between items-center pt-6 border-t border-gray-200">
                    <button type="button" id="cancel-debt-analysis" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" class="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                        <i class="fas fa-chart-bar mr-2"></i>
                        Calcular Capacidad de Endeudamiento
                    </button>
                </div>
            </form>
        `;

        this.chatMessages.appendChild(formDiv);

        // Add event listeners
        document.getElementById('debt-capacity-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateDebtCapacity(costs, businessType, analysis);
        });

        document.getElementById('cancel-debt-analysis').addEventListener('click', () => {
            formDiv.remove();
        });

        this.scrollToBottom();
    }

    calculateDebtCapacity(costs, businessType, analysis) {
        const monthlyIncome = parseFloat(document.getElementById('monthly-income').value);
        const existingDebts = parseFloat(document.getElementById('existing-debts').value);
        const fixedExpenses = parseFloat(document.getElementById('fixed-expenses').value);
        const businessTime = document.getElementById('business-time').value;
        const loanPurpose = document.getElementById('loan-purpose').value;

        if (!monthlyIncome || !fixedExpenses) {
            this.showNotification('Por favor complete todos los campos requeridos', 'error');
            return;
        }

        // Calculate debt capacity
        const availableIncome = monthlyIncome - fixedExpenses - (existingDebts || 0);
        const debtToIncomeRatio = ((existingDebts || 0) / monthlyIncome) * 100;

        // Business time multiplier for risk assessment
        const timeMultipliers = {
            'menos-6': 0.5,
            '6-12': 0.7,
            '1-2': 0.85,
            '2-5': 1.0,
            'mas-5': 1.15
        };

        const timeMultiplier = timeMultipliers[businessTime] || 0.7;

        // Safe debt ratios by business type
        const safeDebtRatios = {
            'manufactura': 0.35,
            'reventa': 0.40,
            'servicio': 0.30,
            'hibrido': 0.32
        };

        const maxSafeDebtRatio = safeDebtRatios[businessType] || 0.30;
        const adjustedMaxDebt = (monthlyIncome * maxSafeDebtRatio) * timeMultiplier;
        const maxNewDebt = Math.max(0, adjustedMaxDebt - (existingDebts || 0));

        // Calculate loan amounts (assuming different terms)
        const loanCalculations = {
            '12': maxNewDebt * 10,  // 12 months
            '24': maxNewDebt * 18,  // 24 months
            '36': maxNewDebt * 24   // 36 months
        };

        this.showDebtCapacityResults({
            monthlyIncome,
            existingDebts: existingDebts || 0,
            fixedExpenses,
            availableIncome,
            debtToIncomeRatio,
            maxNewDebt,
            loanCalculations,
            businessType,
            loanPurpose,
            businessTime,
            riskLevel: this.calculateRiskLevel(debtToIncomeRatio, availableIncome, businessTime)
        });
    }

    calculateRiskLevel(debtToIncomeRatio, availableIncome, businessTime) {
        let riskScore = 0;

        // Debt-to-income ratio scoring
        if (debtToIncomeRatio > 40) riskScore += 3;
        else if (debtToIncomeRatio > 25) riskScore += 2;
        else if (debtToIncomeRatio > 15) riskScore += 1;

        // Available income scoring
        if (availableIncome < 500000) riskScore += 3;
        else if (availableIncome < 1000000) riskScore += 2;
        else if (availableIncome < 2000000) riskScore += 1;

        // Business time scoring
        if (businessTime === 'menos-6') riskScore += 3;
        else if (businessTime === '6-12') riskScore += 2;
        else if (businessTime === '1-2') riskScore += 1;

        if (riskScore >= 6) return 'ALTO';
        else if (riskScore >= 3) return 'MEDIO';
        else return 'BAJO';
    }

    showDebtCapacityResults(results) {
        // Remove the form
        const formContainer = document.getElementById('debt-capacity-form-container');
        if (formContainer) {
            formContainer.remove();
        }

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'bg-white border border-gray-200 rounded-lg p-6 mb-4 mx-4 shadow-lg';
        resultsDiv.id = 'debt-capacity-results';

        const riskColors = {
            'BAJO': 'text-green-600 bg-green-100',
            'MEDIO': 'text-yellow-600 bg-yellow-100',
            'ALTO': 'text-red-600 bg-red-100'
        };

        const riskColor = riskColors[results.riskLevel] || riskColors['MEDIO'];

        resultsDiv.innerHTML = `
            <div class="mb-6">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-4">
                        <i class="fas fa-chart-pie text-emerald-600 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">📊 Análisis de Capacidad de Endeudamiento</h3>
                        <p class="text-sm text-gray-600">Resultados personalizados para tu negocio de ${results.businessType}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-blue-800">Ingresos Disponibles</span>
                        <i class="fas fa-dollar-sign text-blue-600"></i>
                    </div>
                    <p class="text-2xl font-bold text-blue-900">${new Intl.NumberFormat('es-CO').format(results.availableIncome)}</p>
                    <p class="text-xs text-blue-700">Después de gastos fijos</p>
                </div>

                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-purple-800">Ratio Deuda/Ingresos</span>
                        <i class="fas fa-percentage text-purple-600"></i>
                    </div>
                    <p class="text-2xl font-bold text-purple-900">${results.debtToIncomeRatio.toFixed(1)}%</p>
                    <p class="text-xs text-purple-700">Nivel actual de endeudamiento</p>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-800">Riesgo Crediticio</span>
                        <i class="fas fa-shield-alt text-gray-600"></i>
                    </div>
                    <p class="text-lg font-bold ${riskColor} px-3 py-1 rounded-full inline-block">${results.riskLevel}</p>
                </div>
            </div>

            <div class="bg-emerald-50 p-6 rounded-lg mb-6">
                <h4 class="text-lg font-bold text-emerald-900 mb-4 flex items-center">
                    <i class="fas fa-money-check-alt mr-2"></i>
                    Capacidad de Endeudamiento Recomendada
                </h4>
                <div class="text-center">
                    <p class="text-3xl font-bold text-emerald-700 mb-2">${new Intl.NumberFormat('es-CO').format(results.maxNewDebt)}</p>
                    <p class="text-sm text-emerald-600">Cuota mensual máxima segura para nuevo crédito</p>
                </div>
            </div>

            <div class="mb-6">
                <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <i class="fas fa-calculator mr-2"></i>
                    Simulación de Préstamos Recomendados
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="text-center">
                            <h5 class="font-semibold text-gray-800 mb-2">12 Meses</h5>
                            <p class="text-xl font-bold text-blue-600">${new Intl.NumberFormat('es-CO').format(results.loanCalculations['12'])}</p>
                            <p class="text-sm text-gray-600 mt-1">Cuota: ${new Intl.NumberFormat('es-CO').format(results.maxNewDebt)}</p>
                            <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mt-2">Corto Plazo</span>
                        </div>
                    </div>
                    <div class="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
                        <div class="text-center">
                            <h5 class="font-semibold text-emerald-800 mb-2">24 Meses</h5>
                            <p class="text-xl font-bold text-emerald-600">${new Intl.NumberFormat('es-CO').format(results.loanCalculations['24'])}</p>
                            <p class="text-sm text-gray-600 mt-1">Cuota: ${new Intl.NumberFormat('es-CO').format(results.maxNewDebt)}</p>
                            <span class="inline-block bg-emerald-200 text-emerald-800 px-2 py-1 rounded text-xs mt-2">Recomendado</span>
                        </div>
                    </div>
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="text-center">
                            <h5 class="font-semibold text-gray-800 mb-2">36 Meses</h5>
                            <p class="text-xl font-bold text-purple-600">${new Intl.NumberFormat('es-CO').format(results.loanCalculations['36'])}</p>
                            <p class="text-sm text-gray-600 mt-1">Cuota: ${new Intl.NumberFormat('es-CO').format(results.maxNewDebt)}</p>
                            <span class="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mt-2">Largo Plazo</span>
                        </div>
                    </div>
                </div>
            </div>

            ${this.getFinancingOptionsForBusinessType(results.businessType, results.loanPurpose)}

            <div class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div class="flex items-start">
                    <i class="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-2"></i>
                    <div>
                        <h5 class="font-semibold text-yellow-800 mb-1">Importante:</h5>
                        <p class="text-sm text-yellow-700">
                            Este análisis es referencial y no constituye una oferta de crédito.
                            Los resultados pueden variar según las políticas de cada entidad financiera
                            y la evaluación específica de su perfil crediticio.
                        </p>
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(resultsDiv);
        this.scrollToBottom();

        // Update todo
        this.updateTodoStatus('Complete debt capacity analysis implementation', 'completed');
    }

    getFinancingOptionsForBusinessType(businessType, loanPurpose) {
        const options = {
            'manufactura': [
                { name: 'Bancóldex', desc: 'Líneas especiales para manufactura y exportación', icon: 'fas fa-industry' },
                { name: 'Banco Agrario', desc: 'Créditos para micro y pequeñas empresas manufactureras', icon: 'fas fa-seedling' },
                { name: 'Findeter', desc: 'Financiamiento para proyectos productivos', icon: 'fas fa-hammer' }
            ],
            'reventa': [
                { name: 'Bancamía', desc: 'Microcréditos para comerciantes', icon: 'fas fa-store' },
                { name: 'Banco de Bogotá', desc: 'Línea PyME Comercial', icon: 'fas fa-shopping-cart' },
                { name: 'Davivienda', desc: 'Crédito Capital de Trabajo', icon: 'fas fa-cash-register' }
            ],
            'servicio': [
                { name: 'Bancolombia', desc: 'Créditos para profesionales independientes', icon: 'fas fa-user-tie' },
                { name: 'Banco de Occidente', desc: 'Financiamiento para servicios profesionales', icon: 'fas fa-briefcase' },
                { name: 'BBVA', desc: 'Línea Freelancer', icon: 'fas fa-laptop' }
            ],
            'hibrido': [
                { name: 'Banco Popular', desc: 'Créditos flexibles para negocios mixtos', icon: 'fas fa-balance-scale' },
                { name: 'Scotiabank Colpatria', desc: 'Financiamiento integral', icon: 'fas fa-handshake' },
                { name: 'Itaú', desc: 'Soluciones financieras personalizadas', icon: 'fas fa-puzzle-piece' }
            ]
        };

        const typeOptions = options[businessType] || options['hibrido'];

        return `
            <div class="mb-6">
                <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <i class="fas fa-university mr-2"></i>
                    Opciones de Financiamiento Recomendadas para ${businessType.charAt(0).toUpperCase() + businessType.slice(1)}
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${typeOptions.map(option => `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div class="flex items-center mb-2">
                                <i class="${option.icon} text-blue-600 mr-2"></i>
                                <h5 class="font-semibold text-gray-800">${option.name}</h5>
                            </div>
                            <p class="text-sm text-gray-600">${option.desc}</p>
                            <div class="mt-3">
                                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Especializado en ${businessType}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    updateTodoStatus(taskContent, newStatus) {
        // This would update the todo list if we had a todo management system
        console.log(`Task "${taskContent}" updated to ${newStatus}`);
    }
}

// Inicializar el sistema de chat cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chat-container')) {
        window.iativaChat = new IAtivaChatSystem();
    }
});