#!/usr/bin/env node

console.log('🚀 Configurando sistema completo de pagos para IAtiva...\n');

const fs = require('fs');
const path = require('path');

// 1. Agregar rutas de pagos al server.js
function addPaymentRoutes() {
    const serverPath = path.join(__dirname, 'server.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Verificar si ya están las importaciones
    if (!serverContent.includes('PaymentService')) {
        console.log('📦 Agregando importaciones de servicios de pago...');
        
        const importLines = `
// Servicios de pago y afiliación
const PaymentService = require('./src/paymentService');
const AffiliateService = require('./src/affiliateService');

// Inicializar servicios
const paymentService = new PaymentService();
const affiliateService = new AffiliateService();
`;
        
        // Insertar después de EmailService
        serverContent = serverContent.replace(
            'const emailService = new EmailService();',
            `const emailService = new EmailService();${importLines}`
        );
    }
    
    // Agregar rutas de pagos si no existen
    if (!serverContent.includes('/planes')) {
        console.log('🛣️ Agregando rutas de pagos...');
        
        const paymentRoutes = `
// ==================== RUTAS DE PAGOS Y SUSCRIPCIONES ====================

// Página de planes
app.get('/planes', (req, res) => {
    res.render('planes', {
        title: 'Planes de Suscripción - IAtiva',
        user: req.session.user
    });
});

// Crear suscripción
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { plan, email } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: 'Email requerido' });
        }
        
        const preference = await paymentService.crearSuscripcion(
            plan, 
            req.session.user?.id || 'guest',
            email
        );
        
        res.json({
            success: true,
            payment_url: preference.init_point,
            preference_id: preference.id
        });
    } catch (error) {
        console.error('Error creando suscripción:', error);
        res.json({ success: false, message: error.message });
    }
});

// Crear donación
app.post('/api/create-donation', async (req, res) => {
    try {
        const { tipo, monto, email, nombre } = req.body;
        
        if (!email) {
            return res.json({ success: false, message: 'Email requerido' });
        }
        
        const tipoOrMonto = monto ? parseInt(monto) : tipo;
        const preference = await paymentService.crearDonacion(tipoOrMonto, email, nombre);
        
        res.json({
            success: true,
            payment_url: preference.init_point,
            preference_id: preference.id
        });
    } catch (error) {
        console.error('Error creando donación:', error);
        res.json({ success: false, message: error.message });
    }
});

// Webhooks MercadoPago
app.post('/webhooks/mercadopago', async (req, res) => {
    try {
        const result = await paymentService.procesarWebhook(req.body);
        
        if (result && result.status === 'approved') {
            // Aquí puedes procesar la suscripción exitosa
            console.log('Pago aprobado:', result);
            
            // Si hay código de afiliado en la referencia, registrar comisión
            if (result.external_reference.includes('REF_')) {
                const affiliateCode = result.external_reference.split('REF_')[1].split('_')[0];
                await affiliateService.registrarReferido(
                    affiliateCode,
                    result.external_reference,
                    result.amount,
                    'subscription'
                );
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).send('Error');
    }
});

// Páginas de resultado de pago
app.get('/payment/success', (req, res) => {
    res.render('payment-result', {
        title: 'Pago Exitoso - IAtiva',
        success: true,
        message: '¡Gracias por tu suscripción! Ya puedes acceder a todas las funciones premium.',
        user: req.session.user
    });
});

app.get('/payment/failure', (req, res) => {
    res.render('payment-result', {
        title: 'Pago Fallido - IAtiva',
        success: false,
        message: 'Hubo un problema con tu pago. Por favor intenta nuevamente.',
        user: req.session.user
    });
});

app.get('/donation/success', (req, res) => {
    res.render('payment-result', {
        title: 'Donación Exitosa - IAtiva',
        success: true,
        message: '¡Gracias por tu donación! Tu apoyo nos ayuda a seguir mejorando.',
        user: req.session.user
    });
});

// ==================== RUTAS DE AFILIADOS ====================

// Página de afiliados
app.get('/afiliados', (req, res) => {
    res.render('afiliados', {
        title: 'Programa de Afiliados - IAtiva',
        user: req.session.user
    });
});

// Registrar nuevo afiliado
app.post('/api/affiliate/register', async (req, res) => {
    try {
        const affiliate = await affiliateService.crearAfiliado(req.body);
        res.json({ success: true, affiliate });
    } catch (error) {
        console.error('Error registrando afiliado:', error);
        res.json({ success: false, message: error.message });
    }
});

// Dashboard del afiliado
app.get('/afiliados/dashboard/:id', (req, res) => {
    const dashboard = affiliateService.obtenerDashboardAfiliado(req.params.id);
    if (!dashboard) {
        return res.status(404).send('Afiliado no encontrado');
    }
    
    res.render('affiliate-dashboard', {
        title: 'Dashboard Afiliado - IAtiva',
        dashboard,
        user: req.session.user
    });
});

// Rastrear referidos (middleware)
app.use((req, res, next) => {
    if (req.query.ref) {
        req.session.referralCode = req.query.ref;
    }
    next();
});
`;
        
        // Insertar antes del middleware de 404
        const insertPosition = serverContent.lastIndexOf('// Manejo de errores 404');
        if (insertPosition !== -1) {
            serverContent = serverContent.slice(0, insertPosition) + paymentRoutes + '\n' + serverContent.slice(insertPosition);
        } else {
            // Si no encuentra el comentario, agregar al final antes del app.listen
            serverContent = serverContent.replace(
                'app.listen(PORT,',
                paymentRoutes + '\napp.listen(PORT,'
            );
        }
    }
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✅ Rutas de pagos agregadas al server.js');
}

// 2. Crear archivos de datos necesarios
function createDataFiles() {
    console.log('📁 Creando archivos de datos...');
    
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    const files = [
        'affiliates.json',
        'commissions.json', 
        'referrals.json',
        'subscriptions.json',
        'donations.json'
    ];
    
    files.forEach(file => {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
            console.log(`   ✅ Creado: ${file}`);
        }
    });
}

// 3. Ejecutar configuración
console.log('🔧 Iniciando configuración...\n');

try {
    addPaymentRoutes();
    createDataFiles();
    
    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Instalar dependencias: npm install mercadopago stripe uuid jsonwebtoken');
    console.log('2. Configurar variables de entorno en Railway:');
    console.log('   - MP_ACCESS_TOKEN (MercadoPago Access Token)');
    console.log('   - MP_PUBLIC_KEY (MercadoPago Public Key)'); 
    console.log('   - BASE_URL (https://iativa.up.railway.app)');
    console.log('3. Reiniciar el servidor');
    console.log('\n💰 URLs disponibles:');
    console.log('   - /planes (Planes de suscripción)');
    console.log('   - /afiliados (Programa de afiliados)');
    console.log('\n🚀 ¡Tu sistema de monetización está listo!');
    
} catch (error) {
    console.error('❌ Error en la configuración:', error);
    process.exit(1);
}