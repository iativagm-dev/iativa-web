#!/usr/bin/env node

/**
 * Script para agregar IPs VIP con acceso ilimitado
 * Uso: node add-vip-ip.js <IP> [reason]
 */

const fs = require('fs');
const path = require('path');

const vipIpsFile = path.join(__dirname, 'data', 'vip-ips.json');

function addVipIp(ipAddress, reason = 'Administrador - Acceso ilimitado') {
    try {
        // Leer archivo actual
        let vipIps = {};
        if (fs.existsSync(vipIpsFile)) {
            vipIps = JSON.parse(fs.readFileSync(vipIpsFile, 'utf8'));
        }

        // Agregar nueva IP
        vipIps[ipAddress] = {
            reason: reason,
            unlimited_debt_demo: true,
            unlimited_analysis: true,
            added_date: new Date().toISOString(),
            added_by: 'script',
            notes: 'Agregado via script add-vip-ip.js'
        };

        // Guardar archivo
        fs.writeFileSync(vipIpsFile, JSON.stringify(vipIps, null, 2));

        console.log(`✅ IP ${ipAddress} agregada como VIP`);
        console.log(`📝 Razón: ${reason}`);
        console.log(`🔓 Acceso ilimitado: Sí`);
        console.log(`📅 Fecha: ${new Date().toLocaleString()}`);

        // Mostrar todas las IPs VIP
        console.log(`\n📋 IPs VIP actuales:`);
        Object.entries(vipIps).forEach(([ip, data]) => {
            console.log(`   ${ip} - ${data.reason}`);
        });

    } catch (error) {
        console.error('❌ Error agregando IP VIP:', error.message);
        process.exit(1);
    }
}

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`
📖 USO: node add-vip-ip.js <IP> [reason]

EJEMPLOS:
  node add-vip-ip.js 192.168.1.100
  node add-vip-ip.js 203.45.67.89 "Cliente especial - Demos ilimitadas"
  node add-vip-ip.js $(curl -s ifconfig.me) "Mi IP pública"

📋 Para ver tu IP pública: curl ifconfig.me
    `);
    process.exit(1);
}

const ipAddress = args[0];
const reason = args[1] || 'Administrador - Acceso ilimitado para demostraciones';

addVipIp(ipAddress, reason);