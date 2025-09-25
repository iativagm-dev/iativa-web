const fs = require('fs');
const path = require('path');

class BusinessClassifier {
    constructor() {
        this.industryProfiles = this.loadIndustryProfiles();
        this.classificationHistory = new Map(); // Cache for performance
    }

    loadIndustryProfiles() {
        try {
            const dataPath = path.join(__dirname, 'data', 'industry-profiles.json');
            const data = fs.readFileSync(dataPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Error loading industry profiles:', error.message);
            return {};
        }
    }

    /**
     * Classify business based on description, product, and context
     */
    classifyBusiness(businessData) {
        const {
            nombreNegocio = '',
            producto = '',
            tipoNegocio = '',
            descripcion = '',
            ubicacion = ''
        } = businessData;

        // Create combined text for analysis
        const combinedText = [
            nombreNegocio,
            producto,
            tipoNegocio,
            descripcion,
            ubicacion
        ].join(' ').toLowerCase();

        // Check cache first
        const cacheKey = this.generateCacheKey(combinedText);
        if (this.classificationHistory.has(cacheKey)) {
            return this.classificationHistory.get(cacheKey);
        }

        const scores = this.calculateIndustryScores(combinedText);
        const classification = this.determineClassification(scores);

        // Cache the result
        this.classificationHistory.set(cacheKey, classification);

        return classification;
    }

    calculateIndustryScores(text) {
        const scores = {};

        for (const [industryKey, industry] of Object.entries(this.industryProfiles)) {
            let score = 0;
            const keywords = industry.keywords || [];

            // Calculate keyword match score
            keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
                const matches = (text.match(regex) || []).length;
                score += matches * this.getKeywordWeight(keyword);
            });

            // Boost score for exact industry name matches
            if (text.includes(industry.name.toLowerCase())) {
                score += 10;
            }

            scores[industryKey] = score;
        }

        return scores;
    }

    getKeywordWeight(keyword) {
        // More specific keywords get higher weights
        const highWeight = ['restaurante', 'software', 'ecommerce', 'salon', 'fabrica'];
        const mediumWeight = ['comida', 'tecnologia', 'belleza', 'manufactura', 'retail'];

        if (highWeight.includes(keyword.toLowerCase())) return 3;
        if (mediumWeight.includes(keyword.toLowerCase())) return 2;
        return 1;
    }

    determineClassification(scores) {
        // Sort industries by score
        const sortedScores = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, score]) => score > 0);

        if (sortedScores.length === 0) {
            return this.getDefaultClassification();
        }

        const [topIndustry, topScore] = sortedScores[0];
        const secondScore = sortedScores.length > 1 ? sortedScores[1][1] : 0;

        const confidence = this.calculateConfidence(topScore, secondScore, scores);

        return {
            industry: topIndustry,
            industryName: this.industryProfiles[topIndustry].name,
            confidence: confidence,
            profile: this.industryProfiles[topIndustry],
            alternatives: sortedScores.slice(1, 3).map(([key, score]) => ({
                industry: key,
                name: this.industryProfiles[key].name,
                score: score
            })),
            timestamp: new Date().toISOString()
        };
    }

    calculateConfidence(topScore, secondScore, allScores) {
        if (topScore === 0) return 0;

        const totalScore = Object.values(allScores).reduce((sum, score) => sum + score, 0);
        const dominanceRatio = topScore / Math.max(secondScore, 1);
        const coverageRatio = topScore / totalScore;

        // Confidence based on dominance and coverage
        let confidence = Math.min(90, (dominanceRatio * 20) + (coverageRatio * 70));

        // Penalize low absolute scores
        if (topScore < 3) confidence *= 0.6;
        if (topScore < 2) confidence *= 0.5;

        return Math.round(confidence);
    }

    getDefaultClassification() {
        return {
            industry: 'general',
            industryName: this.industryProfiles.general.name,
            confidence: 20,
            profile: this.industryProfiles.general,
            alternatives: [],
            timestamp: new Date().toISOString()
        };
    }

    generateCacheKey(text) {
        // Simple hash for caching
        return text.replace(/\s+/g, '').substring(0, 50);
    }

    /**
     * Get cost benchmarks for an industry
     */
    getCostBenchmarks(industryKey) {
        const industry = this.industryProfiles[industryKey];
        if (!industry) return null;

        return {
            industry: industryKey,
            industryName: industry.name,
            costProfiles: industry.costProfiles,
            margins: industry.margins,
            recommendations: industry.recommendations
        };
    }

    /**
     * Compare user costs against industry benchmarks
     */
    analyzeCosts(costs, industryKey) {
        const benchmarks = this.getCostBenchmarks(industryKey);
        if (!benchmarks) return null;

        const totalCosts = Object.values(costs).reduce((sum, cost) => sum + (parseFloat(cost) || 0), 0);
        const analysis = {};

        for (const [category, value] of Object.entries(costs)) {
            const costValue = parseFloat(value) || 0;
            const percentage = totalCosts > 0 ? (costValue / totalCosts) * 100 : 0;

            const benchmark = benchmarks.costProfiles[category];
            if (benchmark) {
                const deviation = percentage - benchmark.percentage;
                const status = this.getCostStatus(percentage, benchmark);

                analysis[category] = {
                    userValue: costValue,
                    userPercentage: Math.round(percentage * 100) / 100,
                    benchmarkPercentage: benchmark.percentage,
                    benchmarkRange: benchmark.range,
                    deviation: Math.round(deviation * 100) / 100,
                    status: status,
                    description: benchmark.description,
                    recommendation: this.generateCostRecommendation(category, status, deviation)
                };
            }
        }

        return {
            industry: industryKey,
            totalCosts: totalCosts,
            analysis: analysis,
            overallRecommendations: benchmarks.recommendations,
            timestamp: new Date().toISOString()
        };
    }

    getCostStatus(percentage, benchmark) {
        const { range } = benchmark;
        if (percentage <= range[0]) return 'below';
        if (percentage >= range[1]) return 'above';
        return 'normal';
    }

    generateCostRecommendation(category, status, deviation) {
        const recommendations = {
            above: {
                materia_prima: 'Considera negociar mejores precios con proveedores o buscar alternativas más económicas',
                mano_obra: 'Evalúa la eficiencia del personal o considera automatizar algunos procesos',
                empaque: 'Busca opciones de empaque más económicas o compra en mayor volumen',
                servicios: 'Revisa contratos de servicios y busca planes más eficientes',
                transporte: 'Optimiza rutas o busca alternativas de transporte más económicas',
                marketing: 'Mide el ROI de tus campañas y enfócate en canales más efectivos',
                arriendo_sueldos: 'Considera relocalizarte o negociar mejores términos de alquiler',
                otros_costos: 'Revisa gastos varios y elimina los no esenciales'
            },
            below: {
                materia_prima: 'Costo bajo, pero asegúrate de mantener la calidad del producto',
                mano_obra: 'Buen control de costos laborales, considera invertir en capacitación',
                empaque: 'Costo eficiente, considera si mejores empaques pueden agregar valor',
                servicios: 'Costos controlados, mantén el monitoreo regular',
                transporte: 'Buena optimización, considera si puedes ofrecer mejores tiempos de entrega',
                marketing: 'Considera si puedes invertir más para acelerar el crecimiento',
                arriendo_sueldos: 'Costos bajos, aprovecha para reinvertir en el negocio',
                otros_costos: 'Buen control de gastos generales'
            }
        };

        return recommendations[status]?.[category] || 'Mantén el monitoreo regular de esta categoría';
    }

    /**
     * Get industry-specific questions
     */
    getAdaptiveQuestions(industryKey) {
        const industry = this.industryProfiles[industryKey];
        if (!industry) return [];

        // Generate contextual questions based on industry
        const questions = [];

        Object.entries(industry.costProfiles).forEach(([category, profile]) => {
            questions.push({
                category: category,
                question: `¿Cuánto gastas en ${profile.description.toLowerCase()}?`,
                example: this.generateExample(category, profile.percentage),
                priority: this.getCategoryPriority(category, industry),
                helpText: `Típicamente representa ${profile.percentage}% del costo total en ${industry.name.toLowerCase()}`
            });
        });

        // Sort by priority
        return questions.sort((a, b) => b.priority - a.priority);
    }

    getCategoryPriority(category, industry) {
        // Priority based on typical percentage in industry
        const percentage = industry.costProfiles[category]?.percentage || 0;
        return percentage;
    }

    generateExample(category, percentage) {
        // Generate realistic examples based on category and typical percentage
        const baseAmounts = {
            materia_prima: 50000,
            mano_obra: 80000,
            empaque: 10000,
            servicios: 25000,
            transporte: 15000,
            marketing: 20000,
            arriendo_sueldos: 30000,
            otros_costos: 12000
        };

        const baseAmount = baseAmounts[category] || 20000;
        const adjustedAmount = Math.round(baseAmount * (percentage / 20)); // Adjust based on industry percentage

        return adjustedAmount.toString();
    }
}

module.exports = BusinessClassifier;