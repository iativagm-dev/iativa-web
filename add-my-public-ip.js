#!/usr/bin/env node

/**
 * Script para agregar tu IP pública actual como VIP
 * Detecta automáticamente tu IP pública y la agrega con acceso ilimitado
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const vipIpsFile = path.join(__dirname, 'data', 'vip-ips.json');

function getPublicIP() {
    return new Promise((resolve, reject) => {
        https.get('https://ifconfig.me', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data.trim()));
        }).on('error', reject);
    });
}

function addVipIp(ipAddress, reason) {
    try {
        // Leer archivo actual
        let vipIps = {};
        if (fs.existsSync(vipIpsFile)) {
            vipIps = JSON.parse(fs.readFileSync(vipIpsFile, 'utf8'));
        }

        // Verificar si ya existe
        if (vipIps[ipAddress]) {
            console.log(`⚠️  IP ${ipAddress} ya está configurada como VIP`);
            console.log(`📝 Razón actual: ${vipIps[ipAddress].reason}`);
            return;
        }

        // Agregar nueva IP
        vipIps[ipAddress] = {
            reason: reason,
            unlimited_debt_demo: true,
            unlimited_analysis: true,
            added_date: new Date().toISOString(),
            added_by: 'auto-script',
            notes: 'IP pública detectada automáticamente - Acceso para demostraciones'
        };

        // Guardar archivo
        fs.writeFileSync(vipIpsFile, JSON.stringify(vipIps, null, 2));

        console.log(`✅ IP pública ${ipAddress} agregada como VIP`);
        console.log(`📝 Razón: ${reason}`);
        console.log(`🔓 Acceso ilimitado para demostraciones: Sí`);
        console.log(`📅 Fecha: ${new Date().toLocaleString()}`);

    } catch (error) {
        console.error('❌ Error agregando IP VIP:', error.message);
        process.exit(1);
    }
}

async function main() {
    try {
        console.log('🔍 Detectando IP pública...');
        const publicIP = await getPublicIP();
        console.log(`🌐 IP pública detectada: ${publicIP}`);

        const reason = 'Gabriel - IP pública para demostraciones ilimitadas IAtiva';
        addVipIp(publicIP, reason);

    } catch (error) {
        console.error('❌ Error obteniendo IP pública:', error.message);
        console.log('\n💡 Alternativa: Ejecuta manualmente con tu IP:');
        console.log('   node add-vip-ip.js TU_IP_AQUI "Gabriel - Demos ilimitadas"');
    }
}

main();