const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
    constructor() {
        // Configurar MercadoPago con la nueva API
        try {
            this.client = new MercadoPagoConfig({
                accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-ACCESS-TOKEN',
                integrator_id: 'dev_24c65fb163bf11ea96500242ac130004'
            });
            
            this.preference = new Preference(this.client);
        } catch (error) {
            console.error('Warning: MercadoPago not configured properly:', error.message);
            this.preference = null;
        }

        this.planes = {
            basico: {
                id: 'basico',
                nombre: 'Plan Básico',
                precio: 19900,
                descripcion: 'Análisis ilimitados + Dashboard',
                caracteristicas: [
                    'Análisis de costos ilimitados',
                    'Dashboard personalizado',
                    'Reportes PDF',
                    'Soporte por email'
                ]
            },
            pro: {
                id: 'pro',
                nombre: 'Plan Pro',
                precio: 39900,
                descripcion: 'Todo lo del Básico + Comparativas + Alertas',
                caracteristicas: [
                    'Todo lo del Plan Básico',
                    'Comparativas históricas',
                    'Alertas de variación de costos',
                    'Templates por industria',
                    'Soporte prioritario'
                ]
            },
            enterprise: {
                id: 'enterprise',
                nombre: 'Plan Enterprise',
                precio: 79900,
                descripción: 'Solución completa + Consultoría',
                caracteristicas: [
                    'Todo lo del Plan Pro',
                    'Análisis multi-empresa',
                    'Consultoría 1:1 mensual',
                    'API personalizada',
                    'Soporte 24/7'
                ]
            }
        };

        this.donaciones = {
            cafecito: { precio: 5000, nombre: 'Un Cafecito ☕', descripcion: 'Apoya el desarrollo con un cafecito' },
            almuerzo: { precio: 15000, nombre: 'Un Almuerzo 🍽️', descripcion: 'Invítanos a almorzar' },
            apoyo: { precio: 50000, nombre: 'Apoyo al Proyecto 🚀', descripcion: 'Ayuda a crecer el proyecto' },
            sponsor: { precio: 100000, nombre: 'Sponsor Oficial 👑', descripcion: 'Conviértete en sponsor' }
        };
    }

    // Crear preferencia de pago para suscripción
    async crearSuscripcion(planId, userId, email) {
        const plan = this.planes[planId];
        if (!plan) throw new Error('Plan no encontrado');

        try {
            const preference = {
                items: [{
                    title: plan.nombre,
                    description: plan.descripcion,
                    unit_price: plan.precio,
                    quantity: 1,
                    currency_id: 'COP'
                }],
                payer: {
                    email: email
                },
                back_urls: {
                    success: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/payment/success`,
                    failure: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/payment/failure`,
                    pending: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/payment/pending`
                },
                auto_return: 'approved',
                external_reference: `USER_${userId}_PLAN_${planId}_${Date.now()}`,
                notification_url: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/webhooks/mercadopago`,
                payment_methods: {
                    excluded_payment_types: [
                        { id: 'atm' }
                    ],
                    installments: 12
                }
            };

            if (!this.preference) {
                throw new Error('MercadoPago not properly configured');
            }
            
            const response = await this.preference.create({ body: preference });
            return {
                id: response.id,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point
            };
        } catch (error) {
            console.error('Error creando preferencia MercadoPago:', error);
            throw error;
        }
    }

    // Crear donación
    async crearDonacion(tipoOrMonto, email, nombre = '') {
        let donacion;
        
        if (typeof tipoOrMonto === 'number') {
            // Donación personalizada
            donacion = {
                precio: tipoOrMonto,
                nombre: 'Donación Personalizada 💝',
                descripcion: `Donación de $${tipoOrMonto.toLocaleString('es-CO')} COP`
            };
        } else {
            // Donación predefinida
            donacion = this.donaciones[tipoOrMonto];
            if (!donacion) throw new Error('Tipo de donación no encontrado');
        }

        try {
            const preference = {
                items: [{
                    title: donacion.nombre,
                    description: donacion.descripcion,
                    unit_price: donacion.precio,
                    quantity: 1,
                    currency_id: 'COP'
                }],
                payer: {
                    email: email,
                    name: nombre
                },
                back_urls: {
                    success: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/donation/success`,
                    failure: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/donation/failure`,
                    pending: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/donation/pending`
                },
                auto_return: 'approved',
                external_reference: `DONATION_${email}_${Date.now()}`,
                notification_url: `${process.env.BASE_URL || 'https://iativa.up.railway.app'}/webhooks/mercadopago-donation`
            };

            if (!this.preference) {
                throw new Error('MercadoPago not properly configured');
            }
            
            const response = await this.preference.create({ body: preference });
            return {
                id: response.id,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point
            };
        } catch (error) {
            console.error('Error creando donación MercadoPago:', error);
            throw error;
        }
    }

    // Procesar webhook de MercadoPago
    async procesarWebhook(data) {
        try {
            if (data.type === 'payment') {
                console.log('Processing MercadoPago webhook (simulated)');
                // For now, return a simulated response since we don't have a proper access token
                return {
                    status: 'approved', // Simulate approved for testing
                    external_reference: data.external_reference || 'test_ref',
                    payment_id: data.data?.id || 'test_payment',
                    amount: 5000, // Simulate amount
                    email: 'test@example.com' // Simulate email
                };
            }
        } catch (error) {
            console.error('Error procesando webhook:', error);
            throw error;
        }
    }

    // Obtener planes disponibles
    obtenerPlanes() {
        return Object.values(this.planes);
    }

    // Obtener opciones de donación
    obtenerDonaciones() {
        return Object.values(this.donaciones);
    }
}

module.exports = PaymentService;