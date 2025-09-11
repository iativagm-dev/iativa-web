#!/usr/bin/env node

console.log('🚀 Instalando sistema de pagos para IAtiva...\n');

const { exec } = require('child_process');

const dependencias = [
    'mercadopago',      // MercadoPago Colombia
    'stripe',           // Pagos internacionales  
    'uuid',             // Códigos únicos afiliados
    'jsonwebtoken',     // Autenticación segura
    'qrcode'            // QR codes para pagos
];

console.log('📦 Instalando dependencias:');
dependencias.forEach(dep => console.log(`  - ${dep}`));

const installCommand = `npm install ${dependencias.join(' ')}`;

exec(installCommand, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Error instalando dependencias:', error);
        return;
    }
    
    console.log('\n✅ Dependencias instaladas correctamente!');
    console.log('\n🔧 Próximos pasos:');
    console.log('1. Configurar variables de entorno en Railway:');
    console.log('   - MP_ACCESS_TOKEN (MercadoPago)');
    console.log('   - MP_PUBLIC_KEY (MercadoPago)');
    console.log('   - STRIPE_SECRET_KEY (opcional)');
    console.log('   - STRIPE_PUBLIC_KEY (opcional)');
    console.log('   - JWT_SECRET (genera uno aleatorio)');
    console.log('\n2. Ejecutar: node setup-payments.js');
    console.log('\n💰 ¡Sistema de pagos listo para generar ingresos!');
});