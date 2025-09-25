const BusinessClassifier = require('./BusinessClassifier');

class AdaptiveQuestions {
    constructor() {
        this.businessClassifier = new BusinessClassifier();
        this.defaultQuestions = this.getDefaultQuestions();
        this.questionHistory = new Map();
    }

    getDefaultQuestions() {
        return [
            {
                id: 'materia_prima',
                question: '¿Cuánto gastaste en materia prima/insumos?',
                category: 'materia_prima',
                priority: 9,
                example: '50000',
                helpText: 'Incluye materiales directos usados en tu producto',
                required: true
            },
            {
                id: 'mano_obra',
                question: '¿Cuánto gastaste en mano de obra directa?',
                category: 'mano_obra',
                priority: 8,
                example: '80000',
                helpText: 'Salarios y beneficios del personal que trabaja directamente en la producción',
                required: true
            },
            {
                id: 'empaque',
                question: '¿Cuánto gastaste en empaque o presentación?',
                category: 'empaque',
                priority: 5,
                example: '15000',
                helpText: 'Cajas, bolsas, etiquetas y materiales de presentación',
                required: false
            },
            {
                id: 'servicios',
                question: '¿Cuánto gastaste en servicios (luz, agua, internet)?',
                category: 'servicios',
                priority: 6,
                example: '25000',
                helpText: 'Servicios públicos y comunicaciones necesarios para operar',
                required: true
            },
            {
                id: 'transporte',
                question: '¿Cuánto gastaste en transporte?',
                category: 'transporte',
                priority: 4,
                example: '20000',
                helpText: 'Combustible, delivery, transporte de materiales',
                required: false
            },
            {
                id: 'marketing',
                question: '¿Cuánto gastaste en marketing?',
                category: 'marketing',
                priority: 7,
                example: '30000',
                helpText: 'Publicidad, redes sociales, promociones',
                required: true
            },
            {
                id: 'arriendo_sueldos',
                question: '¿Cuánto gastaste en arriendo o sueldos?',
                category: 'arriendo_sueldos',
                priority: 7,
                example: '40000',
                helpText: 'Alquiler del local y sueldos administrativos',
                required: true
            },
            {
                id: 'otros_costos',
                question: '¿Otros costos (préstamos, intereses)?',
                category: 'otros_costos',
                priority: 3,
                example: '10000',
                helpText: 'Seguros, intereses, gastos varios',
                required: false
            },
            {
                id: 'margen_ganancia',
                question: '¿Qué margen de ganancia deseas (%)?',
                category: 'margen_ganancia',
                priority: 10,
                example: '25',
                helpText: 'Porcentaje de ganancia que quieres obtener sobre los costos',
                required: true
            }
        ];
    }

    /**
     * Generate adaptive questions based on business type and context
     */
    generateQuestions(businessData = {}, context = {}) {
        const {
            includeName = false,
            includeBusinessType = false,
            industryHint = null
        } = context;

        let questions = [];

        // Add name question if requested
        if (includeName) {
            questions.push({
                id: 'nombre_usuario',
                question: '¿Cómo te llamas?',
                category: 'personal',
                priority: 11,
                example: 'María',
                helpText: 'Me gustaría personalizar tu experiencia',
                required: true,
                type: 'text'
            });
        }

        // Add business identification questions if requested
        if (includeBusinessType) {
            questions.push(
                {
                    id: 'nombre_negocio',
                    question: '¿Cuál es el nombre de tu negocio?',
                    category: 'business_info',
                    priority: 10.5,
                    example: 'Mi Restaurante',
                    helpText: 'Ayúdanos a personalizar el análisis para tu negocio',
                    required: false,
                    type: 'text'
                },
                {
                    id: 'producto_servicio',
                    question: '¿Qué producto o servicio ofreces?',
                    category: 'business_info',
                    priority: 10.3,
                    example: 'Comida casera, hamburguesas',
                    helpText: 'Describe brevemente tu producto o servicio principal',
                    required: false,
                    type: 'text'
                }
            );
        }

        // Classify business if we have enough data
        let classification = null;
        if (businessData.nombreNegocio || businessData.producto || industryHint) {
            const dataForClassification = {
                ...businessData,
                ...(industryHint && { tipoNegocio: industryHint })
            };
            classification = this.businessClassifier.classifyBusiness(dataForClassification);
        }

        // Generate industry-specific questions
        let adaptedQuestions = this.defaultQuestions;
        if (classification && classification.confidence > 40) {
            adaptedQuestions = this.adaptQuestionsForIndustry(classification);
        }

        // Add adapted questions
        questions.push(...adaptedQuestions);

        // Sort by priority (highest first)
        questions.sort((a, b) => b.priority - a.priority);

        // Add sequence numbers
        questions.forEach((q, index) => {
            q.sequence = index + 1;
            q.totalQuestions = questions.length;
        });

        return {
            questions,
            classification,
            adaptationLevel: classification ? 'industry-specific' : 'generic',
            totalQuestions: questions.length
        };
    }

    /**
     * Adapt questions for specific industry
     */
    adaptQuestionsForIndustry(classification) {
        const { industry, profile } = classification;
        const adaptedQuestions = [...this.defaultQuestions];

        // Modify questions based on industry
        adaptedQuestions.forEach(question => {
            const categoryProfile = profile.costProfiles[question.category];

            if (categoryProfile) {
                // Update question text for industry context
                question.question = this.adaptQuestionText(question, industry, categoryProfile);

                // Update example amounts based on industry percentages
                question.example = this.generateIndustryExample(question.category, categoryProfile.percentage);

                // Update help text with industry-specific information
                question.helpText = `${categoryProfile.description}. Típicamente ${categoryProfile.percentage}% en ${profile.name.toLowerCase()}`;

                // Adjust priority based on industry importance
                question.priority = this.calculateIndustryPriority(question.category, categoryProfile);
            }
        });

        return adaptedQuestions;
    }

    adaptQuestionText(question, industry, categoryProfile) {
        const industrySpecificTexts = {
            restaurante: {
                materia_prima: '¿Cuánto gastas en ingredientes y productos frescos?',
                mano_obra: '¿Cuánto gastas en personal de cocina y servicio?',
                empaque: '¿Cuánto gastas en envases para delivery y presentación?',
                servicios: '¿Cuánto gastas en servicios (luz, gas, agua, internet)?',
                transporte: '¿Cuánto gastas en delivery y transporte de suministros?',
                marketing: '¿Cuánto gastas en publicidad y promociones?',
                arriendo_sueldos: '¿Cuánto gastas en alquiler del restaurante?'
            },
            retail: {
                materia_prima: '¿Cuánto gastas en inventario y productos para vender?',
                mano_obra: '¿Cuánto gastas en personal de ventas y atención?',
                empaque: '¿Cuánto gastas en bolsas, cajas y empaques?',
                marketing: '¿Cuánto gastas en publicidad y promociones de productos?',
                arriendo_sueldos: '¿Cuánto gastas en alquiler de la tienda?'
            },
            servicios: {
                materia_prima: '¿Cuánto gastas en materiales y herramientas de trabajo?',
                mano_obra: '¿Cuánto gastas en honorarios profesionales?',
                transporte: '¿Cuánto gastas en movilización a clientes?',
                marketing: '¿Cuánto gastas en marketing digital y networking?',
                arriendo_sueldos: '¿Cuánto gastas en oficina (puede ser virtual)?'
            },
            tecnologia: {
                materia_prima: '¿Cuánto gastas en licencias de software y herramientas?',
                mano_obra: '¿Cuánto gastas en desarrolladores y personal técnico?',
                servicios: '¿Cuánto gastas en hosting, cloud e infraestructura?',
                marketing: '¿Cuánto gastas en marketing digital y adquisición de usuarios?'
            }
        };

        const industryTexts = industrySpecificTexts[industry];
        if (industryTexts && industryTexts[question.category]) {
            return industryTexts[question.category];
        }

        return question.question;
    }

    generateIndustryExample(category, percentage) {
        // Base examples adjusted by industry typical percentage
        const baseExamples = {
            materia_prima: 100000,
            mano_obra: 120000,
            empaque: 20000,
            servicios: 40000,
            transporte: 30000,
            marketing: 50000,
            arriendo_sueldos: 60000,
            otros_costos: 25000,
            margen_ganancia: 25
        };

        if (category === 'margen_ganancia') {
            return percentage.toString();
        }

        const baseAmount = baseExamples[category] || 30000;
        // Adjust example based on typical industry percentage
        const adjustedAmount = Math.round(baseAmount * (percentage / 20));

        return Math.max(1000, adjustedAmount).toString();
    }

    calculateIndustryPriority(category, categoryProfile) {
        // Higher percentage categories get higher priority
        const basePriority = this.defaultQuestions.find(q => q.category === category)?.priority || 5;
        const percentageBonus = Math.floor(categoryProfile.percentage / 10);

        return Math.min(10, basePriority + percentageBonus);
    }

    /**
     * Get next question in the sequence
     */
    getNextQuestion(currentIndex, questionsSet) {
        if (!questionsSet || currentIndex >= questionsSet.length - 1) {
            return null;
        }

        return questionsSet[currentIndex + 1];
    }

    /**
     * Validate if we can skip certain questions based on business type
     */
    canSkipQuestion(question, businessType, previousAnswers = {}) {
        // Skip rules based on business type
        const skipRules = {
            servicios: ['empaque'], // Service businesses might not need packaging
            tecnologia: ['empaque', 'transporte'], // Tech businesses might not need physical packaging/transport
        };

        if (!question.required && skipRules[businessType]?.includes(question.category)) {
            return true;
        }

        // Skip if similar information already provided
        if (question.category === 'otros_costos' && Object.keys(previousAnswers).length < 5) {
            return true; // Skip other costs if we don't have enough main cost data
        }

        return false;
    }

    /**
     * Generate contextual help for a question
     */
    getQuestionHelp(questionId, businessType = null) {
        const question = this.defaultQuestions.find(q => q.id === questionId);
        if (!question) return null;

        let help = {
            basic: question.helpText,
            examples: [question.example],
            tips: []
        };

        // Add business-type specific help
        if (businessType) {
            help = this.addBusinessSpecificHelp(help, question.category, businessType);
        }

        // Add common mistakes/tips
        help.tips.push(...this.getCommonTips(question.category));

        return help;
    }

    addBusinessSpecificHelp(help, category, businessType) {
        const businessHelp = {
            restaurante: {
                materia_prima: {
                    examples: ['30000', '75000', '120000'],
                    tips: ['Incluye carnes, verduras, condimentos, bebidas', 'No incluyas equipos de cocina aquí']
                },
                mano_obra: {
                    examples: ['80000', '150000', '200000'],
                    tips: ['Incluye chefs, meseros, personal de limpieza', 'Incluye prestaciones sociales']
                }
            },
            retail: {
                materia_prima: {
                    examples: ['200000', '500000', '1000000'],
                    tips: ['El costo de los productos que vendes', 'No incluyas productos que ya tienes en inventario']
                }
            }
        };

        const typeHelp = businessHelp[businessType]?.[category];
        if (typeHelp) {
            help.examples = typeHelp.examples || help.examples;
            help.tips = [...help.tips, ...typeHelp.tips];
        }

        return help;
    }

    getCommonTips(category) {
        const tips = {
            materia_prima: [
                'Si compras por mayor, divide el costo por las unidades que produces',
                'Incluye materiales que se consumen directamente en el producto'
            ],
            mano_obra: [
                'Incluye salarios, prestaciones y bonificaciones',
                'Si trabajas solo, calcula cuánto te pagarías por hora'
            ],
            empaque: [
                'Incluye cajas, bolsas, etiquetas, material de protección',
                'Si es muy poco, puedes poner 0'
            ],
            servicios: [
                'Incluye luz, agua, internet, teléfono necesarios para el negocio',
                'Calcula solo la parte que usa tu negocio'
            ],
            transporte: [
                'Incluye gasolina, envíos, delivery',
                'Si no haces entregas, puede ser muy bajo o 0'
            ],
            marketing: [
                'Incluye redes sociales, volantes, publicidad online',
                'Aunque sea poco, el marketing es importante'
            ],
            arriendo_sueldos: [
                'Solo la parte del alquiler que usa tu negocio',
                'Si trabajas desde casa, calcula un porcentaje'
            ],
            otros_costos: [
                'Seguros, intereses, gastos varios menores',
                'Si no tienes, puedes poner 0'
            ],
            margen_ganancia: [
                'Entre 15-30% es común para empezar',
                'Considera tus gastos personales y reinversión'
            ]
        };

        return tips[category] || [];
    }

    /**
     * Generate smart follow-up questions based on answers
     */
    generateFollowUpQuestion(category, value, businessContext = {}) {
        const numericValue = parseFloat(value) || 0;

        // Generate contextual follow-up questions for unusually high or low values
        if (category === 'materia_prima' && numericValue > 100000) {
            return {
                type: 'clarification',
                question: '¿Ese costo de materia prima es por cuántas unidades de producto?',
                purpose: 'clarify-quantity',
                category: 'materia_prima_quantity'
            };
        }

        if (category === 'mano_obra' && numericValue === 0) {
            return {
                type: 'clarification',
                question: '¿Trabajas solo en el negocio o tienes empleados?',
                purpose: 'clarify-labor',
                category: 'labor_structure'
            };
        }

        return null;
    }
}

module.exports = AdaptiveQuestions;