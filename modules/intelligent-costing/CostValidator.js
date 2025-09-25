const BusinessClassifier = require('./BusinessClassifier');

class CostValidator {
    constructor() {
        this.businessClassifier = new BusinessClassifier();
        this.validationRules = this.initializeValidationRules();
        this.validationHistory = new Map();
    }

    initializeValidationRules() {
        return {
            // Minimum and maximum reasonable values for each cost category
            ranges: {
                materia_prima: { min: 0, max: 10000000, warning: 5000000 },
                mano_obra: { min: 0, max: 8000000, warning: 4000000 },
                empaque: { min: 0, max: 1000000, warning: 500000 },
                servicios: { min: 0, max: 2000000, warning: 1000000 },
                transporte: { min: 0, max: 3000000, warning: 1500000 },
                marketing: { min: 0, max: 5000000, warning: 2500000 },
                arriendo_sueldos: { min: 0, max: 10000000, warning: 5000000 },
                otros_costos: { min: 0, max: 2000000, warning: 1000000 },
                margen_ganancia: { min: 1, max: 500, warning: 200 }
            },

            // Percentage-based validation rules
            percentageRules: {
                maxSingleCategory: 80, // No single category should exceed 80% of total
                minMargin: 5,          // Minimum recommended margin
                maxMargin: 200,        // Maximum reasonable margin
                totalCostMinimum: 100  // Minimum total cost to be realistic
            }
        };
    }

    /**
     * Validate individual cost value
     */
    validateCostValue(category, value, context = {}) {
        const validation = {
            category,
            value,
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: [],
            severity: 'none' // none, low, medium, high, critical
        };

        // Basic numeric validation
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            validation.isValid = false;
            validation.errors.push('El valor debe ser un número válido');
            validation.severity = 'critical';
            return validation;
        }

        if (numericValue < 0) {
            validation.isValid = false;
            validation.errors.push('El valor no puede ser negativo');
            validation.severity = 'critical';
            return validation;
        }

        // Range validation
        const rules = this.validationRules.ranges[category];
        if (rules) {
            if (numericValue > rules.max) {
                validation.isValid = false;
                validation.errors.push(`El valor es demasiado alto (máximo: ${rules.max.toLocaleString()})`);
                validation.severity = 'critical';
            } else if (numericValue > rules.warning) {
                validation.warnings.push('El valor parece muy alto, por favor verifica');
                validation.severity = Math.max(validation.severity === 'none' ? 'medium' : validation.severity, 'medium');
                validation.suggestions.push('Considera revisar si este costo es realmente necesario');
            }

            // Special case for margin validation
            if (category === 'margen_ganancia') {
                if (numericValue < this.validationRules.percentageRules.minMargin) {
                    validation.warnings.push('Un margen muy bajo puede no cubrir todos los gastos');
                    validation.suggestions.push('Considera un margen de al menos 10-15% para un negocio saludable');
                    validation.severity = 'medium';
                }
            }
        }

        // Context-aware validation
        if (context.businessType) {
            const contextValidation = this.validateWithBusinessContext(category, numericValue, context.businessType);
            validation.warnings.push(...contextValidation.warnings);
            validation.suggestions.push(...contextValidation.suggestions);
            if (contextValidation.severity > validation.severity) {
                validation.severity = contextValidation.severity;
            }
        }

        return validation;
    }

    /**
     * Validate complete cost structure
     */
    validateCostStructure(costs, businessData = {}) {
        const structureValidation = {
            isValid: true,
            overallScore: 100,
            warnings: [],
            errors: [],
            suggestions: [],
            categoryAnalysis: {},
            industryComparison: null,
            recommendations: [],
            severity: 'none'
        };

        // Convert all costs to numbers
        const numericCosts = {};
        let totalCosts = 0;

        for (const [category, value] of Object.entries(costs)) {
            const numericValue = parseFloat(value) || 0;
            numericCosts[category] = numericValue;
            if (category !== 'margen_ganancia') {
                totalCosts += numericValue;
            }
        }

        // Validate each category individually
        for (const [category, value] of Object.entries(numericCosts)) {
            const categoryValidation = this.validateCostValue(category, value, {
                businessType: businessData.tipoNegocio,
                totalCosts: totalCosts
            });

            structureValidation.categoryAnalysis[category] = categoryValidation;

            if (!categoryValidation.isValid) {
                structureValidation.isValid = false;
            }

            // Aggregate warnings and errors
            structureValidation.warnings.push(...categoryValidation.warnings);
            structureValidation.errors.push(...categoryValidation.errors);
            structureValidation.suggestions.push(...categoryValidation.suggestions);

            // Update severity
            if (this.getSeverityLevel(categoryValidation.severity) > this.getSeverityLevel(structureValidation.severity)) {
                structureValidation.severity = categoryValidation.severity;
            }
        }

        // Validate cost structure balance
        this.validateCostBalance(numericCosts, totalCosts, structureValidation);

        // Industry-specific validation
        if (businessData && (businessData.nombreNegocio || businessData.producto)) {
            const classification = this.businessClassifier.classifyBusiness(businessData);
            if (classification && classification.confidence > 30) {
                const industryAnalysis = this.businessClassifier.analyzeCosts(numericCosts, classification.industry);
                structureValidation.industryComparison = industryAnalysis;

                // Add industry-specific recommendations
                this.addIndustryValidations(industryAnalysis, structureValidation);
            }
        }

        // Calculate overall score
        structureValidation.overallScore = this.calculateValidationScore(structureValidation);

        return structureValidation;
    }

    validateCostBalance(costs, totalCosts, structureValidation) {
        if (totalCosts < this.validationRules.percentageRules.totalCostMinimum) {
            structureValidation.warnings.push('Los costos totales parecen muy bajos para un negocio real');
            structureValidation.suggestions.push('Asegúrate de incluir todos los costos relevantes de tu negocio');
            structureValidation.severity = 'medium';
        }

        // Check for cost concentration
        const costPercentages = {};
        for (const [category, value] of Object.entries(costs)) {
            if (category !== 'margen_ganancia' && totalCosts > 0) {
                costPercentages[category] = (value / totalCosts) * 100;
            }
        }

        // Find dominant cost category
        const maxCategory = Object.entries(costPercentages)
            .reduce((max, [category, percentage]) =>
                percentage > max.percentage ? { category, percentage } : max,
                { category: '', percentage: 0 });

        if (maxCategory.percentage > this.validationRules.percentageRules.maxSingleCategory) {
            structureValidation.warnings.push(
                `${maxCategory.category} representa ${Math.round(maxCategory.percentage)}% del costo total, lo cual puede ser arriesgado`
            );
            structureValidation.suggestions.push(
                'Considera diversificar tus costos para reducir dependencias'
            );
            structureValidation.severity = 'medium';
        }

        // Check margin reasonableness
        const margin = costs.margen_ganancia || 0;
        if (margin < 5) {
            structureValidation.warnings.push('Margen de ganancia muy bajo, puede no cubrir gastos imprevistos');
            structureValidation.suggestions.push('Considera aumentar el margen a al menos 10-15%');
        }
    }

    validateWithBusinessContext(category, value, businessType) {
        const contextValidation = {
            warnings: [],
            suggestions: [],
            severity: 'none'
        };

        // Business type specific validations
        const businessTypeRules = {
            'restaurante': {
                materia_prima: { expectedRange: [25, 40], highPriority: true },
                mano_obra: { expectedRange: [30, 45], highPriority: true },
                servicios: { expectedRange: [8, 15], highPriority: true }
            },
            'tienda': {
                materia_prima: { expectedRange: [40, 55], highPriority: true },
                marketing: { expectedRange: [7, 15], highPriority: true }
            },
            'servicios': {
                mano_obra: { expectedRange: [50, 70], highPriority: true },
                marketing: { expectedRange: [8, 18], highPriority: true }
            }
        };

        // This would be expanded with actual business logic
        return contextValidation;
    }

    addIndustryValidations(industryAnalysis, structureValidation) {
        if (!industryAnalysis || !industryAnalysis.analysis) return;

        let highDeviations = 0;
        let positiveSignals = 0;

        for (const [category, analysis] of Object.entries(industryAnalysis.analysis)) {
            const absDeviation = Math.abs(analysis.deviation);

            if (absDeviation > 10) { // More than 10% deviation from industry average
                highDeviations++;
                structureValidation.warnings.push(
                    `${category}: ${analysis.deviation > 0 ? 'Superior' : 'Inferior'} en ${absDeviation.toFixed(1)}% al promedio de ${industryAnalysis.industry}`
                );
                structureValidation.suggestions.push(analysis.recommendation);
            } else if (analysis.status === 'normal') {
                positiveSignals++;
            }
        }

        // Overall industry alignment assessment
        if (highDeviations > 3) {
            structureValidation.recommendations.push(
                'Tu estructura de costos difiere significativamente del promedio de la industria. Considera revisar las categorías con mayor desviación.'
            );
            structureValidation.severity = 'medium';
        } else if (positiveSignals >= 5) {
            structureValidation.recommendations.push(
                'Tu estructura de costos está bien alineada con los estándares de la industria.'
            );
        }
    }

    calculateValidationScore(structureValidation) {
        let score = 100;

        // Deduct points for issues
        score -= structureValidation.errors.length * 15;
        score -= structureValidation.warnings.length * 5;

        // Bonus points for industry alignment
        if (structureValidation.industryComparison) {
            const normalCategories = Object.values(structureValidation.industryComparison.analysis)
                .filter(analysis => analysis.status === 'normal').length;
            score += normalCategories * 2;
        }

        return Math.max(0, Math.min(100, score));
    }

    getSeverityLevel(severity) {
        const levels = { 'none': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return levels[severity] || 0;
    }

    /**
     * Get smart suggestions for cost optimization
     */
    getOptimizationSuggestions(costs, businessData = {}) {
        const suggestions = [];
        const totalCosts = Object.entries(costs)
            .filter(([key]) => key !== 'margen_ganancia')
            .reduce((sum, [_, value]) => sum + (parseFloat(value) || 0), 0);

        if (totalCosts === 0) return suggestions;

        // Calculate percentages
        const percentages = {};
        for (const [category, value] of Object.entries(costs)) {
            if (category !== 'margen_ganancia') {
                percentages[category] = ((parseFloat(value) || 0) / totalCosts) * 100;
            }
        }

        // Find optimization opportunities
        const sortedCategories = Object.entries(percentages)
            .sort((a, b) => b[1] - a[1]);

        // Suggest focusing on largest cost categories
        if (sortedCategories.length > 0) {
            const [topCategory, topPercentage] = sortedCategories[0];
            if (topPercentage > 30) {
                suggestions.push({
                    category: topCategory,
                    type: 'optimization',
                    priority: 'high',
                    suggestion: `${topCategory} representa ${topPercentage.toFixed(1)}% de tus costos. Una reducción del 10% aquí tendría gran impacto.`,
                    potentialSavings: (parseFloat(costs[topCategory]) || 0) * 0.1
                });
            }
        }

        return suggestions;
    }

    /**
     * Quick validation for chat interface
     */
    quickValidate(category, value, context = {}) {
        const validation = this.validateCostValue(category, value, context);

        if (validation.errors.length > 0) {
            return {
                isValid: false,
                message: validation.errors[0],
                type: 'error'
            };
        }

        if (validation.warnings.length > 0) {
            return {
                isValid: true,
                message: validation.warnings[0],
                type: 'warning',
                suggestion: validation.suggestions[0] || null
            };
        }

        return {
            isValid: true,
            message: 'Valor válido',
            type: 'success'
        };
    }
}

module.exports = CostValidator;