class DebtCapacityCalculator {
    constructor() {
        // Parámetros bancarios estándar Colombia
        this.bankingRatios = {
            // Ratio máximo deuda/ingresos por tipo de negocio
            maxDebtToIncomeRatio: {
                'retail': 0.65,         // Comercio al por menor
                'manufacturing': 0.70,   // Manufactura
                'services': 0.60,        // Servicios
                'technology': 0.55,      // Tecnología  
                'food': 0.65,           // Alimentos
                'construction': 0.75,    // Construcción
                'other': 0.60           // Otros
            },
            
            // Cobertura mínima de deuda (EBITDA/Deuda)
            minDebtCoverage: 1.25,
            
            // Reserva de flujo de caja mínima (meses)
            minCashReserve: 3,
            
            // Tasas de interés promedio por tipo de crédito
            interestRates: {
                'working_capital': 0.18,    // Capital de trabajo (18% anual)
                'equipment': 0.16,          // Equipos (16% anual)
                'expansion': 0.20,          // Expansión (20% anual)
                'real_estate': 0.14         // Inmobiliario (14% anual)
            }
        };
    }

    // Calcular capacidad de endeudamiento principal
    calculateDebtCapacity(businessData, financialProjections) {
        const analysis = {
            current_income: businessData.monthly_income || 0,
            projected_income: financialProjections.projected_monthly_income || businessData.monthly_income,
            current_expenses: businessData.monthly_expenses || 0,
            business_type: businessData.business_type || 'other',
            existing_debt: businessData.existing_debt || 0,
            cash_reserves: businessData.cash_reserves || 0,
            time_in_business: businessData.time_in_business || 12 // meses
        };

        // 1. Calcular flujo de caja neto
        const netCashFlow = this.calculateNetCashFlow(analysis);
        
        // 2. Aplicar ratio deuda/ingresos según industria
        const maxDebtByIncome = this.calculateMaxDebtByIncome(analysis);
        
        // 3. Calcular capacidad por cobertura de deuda
        const maxDebtByCoverage = this.calculateMaxDebtByCoverage(netCashFlow);
        
        // 4. Aplicar factores de riesgo
        const riskAdjustment = this.calculateRiskAdjustment(analysis);
        
        // 5. Determinar capacidad final (el menor de los cálculos)
        const baseCapacity = Math.min(maxDebtByIncome, maxDebtByCoverage);
        const finalCapacity = baseCapacity * riskAdjustment;

        // 6. Generar recomendaciones por tipo de crédito
        const recommendations = this.generateCreditRecommendations(finalCapacity, analysis);

        return {
            debt_capacity: Math.max(0, Math.floor(finalCapacity)),
            max_monthly_payment: Math.floor(netCashFlow * 0.30), // Máximo 30% del flujo
            risk_score: this.calculateRiskScore(analysis),
            recommendations: recommendations,
            analysis_details: {
                net_cash_flow: netCashFlow,
                max_debt_by_income: maxDebtByIncome,
                max_debt_by_coverage: maxDebtByCoverage,
                risk_adjustment: riskAdjustment,
                debt_to_income_ratio: (finalCapacity / (analysis.projected_income * 12))
            },
            credit_options: this.generateCreditOptions(finalCapacity, analysis)
        };
    }

    calculateNetCashFlow(analysis) {
        const monthlyProfit = analysis.projected_income - analysis.current_expenses;
        // Aplicar factor de estacionalidad/variabilidad
        const stabilityFactor = Math.min(analysis.time_in_business / 24, 1); // Máximo 1 a los 24 meses
        return monthlyProfit * (0.7 + 0.3 * stabilityFactor); // Entre 70% y 100% según estabilidad
    }

    calculateMaxDebtByIncome(analysis) {
        const annualIncome = analysis.projected_income * 12;
        const maxRatio = this.bankingRatios.maxDebtToIncomeRatio[analysis.business_type];
        return annualIncome * maxRatio;
    }

    calculateMaxDebtByCoverage(netCashFlow) {
        const annualCashFlow = netCashFlow * 12;
        return annualCashFlow / this.bankingRatios.minDebtCoverage;
    }

    calculateRiskAdjustment(analysis) {
        let riskFactor = 1.0;
        
        // Factor por tiempo en el negocio
        if (analysis.time_in_business < 12) riskFactor *= 0.6;
        else if (analysis.time_in_business < 24) riskFactor *= 0.8;
        else if (analysis.time_in_business < 36) riskFactor *= 0.9;
        
        // Factor por deuda existente
        const currentDebtRatio = analysis.existing_debt / (analysis.current_income * 12);
        if (currentDebtRatio > 0.4) riskFactor *= 0.7;
        else if (currentDebtRatio > 0.2) riskFactor *= 0.85;
        
        // Factor por reservas de efectivo
        const cashReserveMonths = analysis.cash_reserves / analysis.current_expenses;
        if (cashReserveMonths < 1) riskFactor *= 0.7;
        else if (cashReserveMonths < 3) riskFactor *= 0.85;
        else if (cashReserveMonths > 6) riskFactor *= 1.1;
        
        return Math.max(0.3, Math.min(1.2, riskFactor)); // Entre 30% y 120%
    }

    calculateRiskScore(analysis) {
        let score = 100; // Empezar con score perfecto
        
        // Penalizar por poco tiempo en negocio
        if (analysis.time_in_business < 12) score -= 30;
        else if (analysis.time_in_business < 24) score -= 15;
        
        // Penalizar por alta deuda existente
        const debtRatio = analysis.existing_debt / (analysis.current_income * 12);
        score -= Math.min(25, debtRatio * 100);
        
        // Penalizar por pocas reservas
        const reserveMonths = analysis.cash_reserves / analysis.current_expenses;
        if (reserveMonths < 1) score -= 20;
        else if (reserveMonths < 3) score -= 10;
        
        // Bonificar por crecimiento proyectado
        const growthRate = (analysis.projected_income / analysis.current_income) - 1;
        if (growthRate > 0.2) score += 10; // +10 si crece >20%
        else if (growthRate > 0.1) score += 5;
        
        return Math.max(10, Math.min(100, Math.floor(score)));
    }

    generateCreditRecommendations(capacity, analysis) {
        const recommendations = [];
        
        if (capacity > 50000000) { // >$50M
            recommendations.push({
                type: 'expansion',
                amount: Math.floor(capacity * 0.7),
                purpose: 'Expansión del negocio o nueva sede',
                priority: 'high'
            });
        }
        
        if (capacity > 20000000) { // >$20M
            recommendations.push({
                type: 'equipment',
                amount: Math.floor(capacity * 0.5),
                purpose: 'Compra de equipos o tecnología',
                priority: 'medium'
            });
        }
        
        if (capacity > 5000000) { // >$5M
            recommendations.push({
                type: 'working_capital',
                amount: Math.floor(capacity * 0.3),
                purpose: 'Capital de trabajo e inventarios',
                priority: 'high'
            });
        }
        
        return recommendations;
    }

    generateCreditOptions(capacity, analysis) {
        const options = [];
        
        Object.entries(this.bankingRatios.interestRates).forEach(([type, rate]) => {
            const maxAmount = Math.floor(capacity * this.getCreditTypeFactor(type));
            
            if (maxAmount > 1000000) { // Mínimo $1M
                // Calcular cuotas para diferentes plazos
                const terms = this.calculateTermOptions(maxAmount, rate);
                
                options.push({
                    credit_type: type,
                    max_amount: maxAmount,
                    interest_rate: rate,
                    terms: terms,
                    description: this.getCreditDescription(type)
                });
            }
        });
        
        return options.sort((a, b) => b.max_amount - a.max_amount);
    }

    getCreditTypeFactor(type) {
        const factors = {
            'working_capital': 0.4,
            'equipment': 0.6,
            'expansion': 0.8,
            'real_estate': 1.0
        };
        return factors[type] || 0.5;
    }

    getCreditDescription(type) {
        const descriptions = {
            'working_capital': 'Capital de trabajo para operaciones diarias',
            'equipment': 'Financiación de equipos y maquinaria',
            'expansion': 'Crédito para expansión y crecimiento',
            'real_estate': 'Financiación inmobiliaria comercial'
        };
        return descriptions[type] || 'Crédito empresarial';
    }

    calculateTermOptions(amount, rate) {
        const terms = [12, 24, 36, 48, 60]; // meses
        
        return terms.map(months => {
            const monthlyRate = rate / 12;
            const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                           (Math.pow(1 + monthlyRate, months) - 1);
            
            return {
                months: months,
                monthly_payment: Math.floor(payment),
                total_interest: Math.floor(payment * months - amount),
                total_amount: Math.floor(payment * months)
            };
        });
    }

    // Generar reporte completo en formato HTML
    generateDebtCapacityReport(businessName, debtAnalysis) {
        const riskLevel = debtAnalysis.risk_score >= 80 ? 'Bajo' : 
                         debtAnalysis.risk_score >= 60 ? 'Medio' : 'Alto';
        
        const riskColor = debtAnalysis.risk_score >= 80 ? '#4CAF50' : 
                         debtAnalysis.risk_score >= 60 ? '#FF9800' : '#F44336';

        return `
        <div class="debt-capacity-report" style="margin-top: 2rem; padding: 1.5rem; border: 2px solid #e5e7eb; border-radius: 12px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
            <h3 style="color: #1E88E5; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; text-align: center;">
                🏦 Análisis de Capacidad de Endeudamiento
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: white; padding: 1rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; font-weight: bold; color: #1E88E5;">
                        $${debtAnalysis.debt_capacity.toLocaleString('es-CO')}
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">Capacidad Total de Endeudamiento</div>
                </div>
                
                <div style="background: white; padding: 1rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; font-weight: bold; color: #4CAF50;">
                        $${debtAnalysis.max_monthly_payment.toLocaleString('es-CO')}
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">Cuota Máxima Mensual</div>
                </div>
                
                <div style="background: white; padding: 1rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; font-weight: bold; color: ${riskColor};">
                        ${debtAnalysis.risk_score}/100
                    </div>
                    <div style="color: #666; font-size: 0.9rem;">Score Crediticio (${riskLevel})</div>
                </div>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                <h4 style="color: #1E88E5; margin-bottom: 1rem;">💡 Opciones de Crédito Recomendadas</h4>
                ${debtAnalysis.credit_options.map(option => `
                    <div style="border-left: 4px solid #1E88E5; padding-left: 1rem; margin-bottom: 1rem;">
                        <div style="font-weight: bold; color: #333;">
                            ${option.description} - Hasta $${option.max_amount.toLocaleString('es-CO')}
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            Tasa: ${(option.interest_rate * 100).toFixed(1)}% anual
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            Cuota ejemplo (36 meses): $${option.terms.find(t => t.months === 36)?.monthly_payment.toLocaleString('es-CO') || 'N/A'}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; border-left: 4px solid #1E88E5;">
                <strong style="color: #1E88E5;">💼 Recomendación IAtiva:</strong>
                <p style="margin: 0.5rem 0 0 0; color: #555;">
                    ${debtAnalysis.risk_score >= 80 ? 
                        'Excelente capacidad crediticia. Puedes acceder a financiamiento en condiciones favorables.' :
                        debtAnalysis.risk_score >= 60 ?
                        'Buena capacidad crediticia. Recomendamos mejorar reservas de efectivo antes de endeudarse.' :
                        'Capacidad limitada. Enfócate en aumentar ingresos y reducir gastos antes de buscar financiamiento.'
                    }
                </p>
            </div>
        </div>
        `;
    }
}

module.exports = DebtCapacityCalculator;