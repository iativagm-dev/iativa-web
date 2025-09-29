#!/usr/bin/env node
/**
 * Script de Prueba de Mejoras Implementadas
 * Verifica que todos los módulos funcionen correctamente
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 INICIANDO PRUEBAS DE MEJORAS IMPLEMENTADAS\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Colores para terminal
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function test(name, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`${colors.green}✅ PASS${colors.reset} ${name}`);
        return true;
    } catch (error) {
        failedTests++;
        console.log(`${colors.red}❌ FAIL${colors.reset} ${name}`);
        console.log(`   ${colors.red}Error: ${error.message}${colors.reset}`);
        return false;
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}

function assertExists(value, message) {
    if (!value) {
        throw new Error(message);
    }
}

function assertType(value, type, message) {
    if (typeof value !== type) {
        throw new Error(`${message}: Expected type ${type}, got ${typeof value}`);
    }
}

console.log(`\n${colors.blue}📦 1. VERIFICANDO ARCHIVOS CREADOS${colors.reset}\n`);

test('Archivo utils/backup-system.js existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'utils', 'backup-system.js'));
    assertExists(exists, 'backup-system.js no fue creado');
});

test('Archivo utils/logger.js existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'utils', 'logger.js'));
    assertExists(exists, 'logger.js no fue creado');
});

test('Archivo middleware/security.js existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'middleware', 'security.js'));
    assertExists(exists, 'security.js no fue creado');
});

test('Archivo MEJORAS-IMPLEMENTADAS.md existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'MEJORAS-IMPLEMENTADAS.md'));
    assertExists(exists, 'MEJORAS-IMPLEMENTADAS.md no fue creado');
});

console.log(`\n${colors.blue}🔧 2. VERIFICANDO MÓDULOS${colors.reset}\n`);

test('Módulo backup-system se puede importar', () => {
    const backupSystem = require('./utils/backup-system');
    assertExists(backupSystem, 'No se pudo importar backup-system');
    assertExists(backupSystem.BackupSystem, 'BackupSystem no está exportado');
    assertExists(backupSystem.getBackupSystem, 'getBackupSystem no está exportado');
});

test('Módulo logger se puede importar', () => {
    const logger = require('./utils/logger');
    assertExists(logger, 'No se pudo importar logger');
    assertType(logger.info, 'function', 'logger.info no es una función');
    assertType(logger.error, 'function', 'logger.error no es una función');
});

test('Módulo security se puede importar', () => {
    const security = require('./middleware/security');
    assertExists(security, 'No se pudo importar security');
    assertExists(security.generalLimiter, 'generalLimiter no está exportado');
    assertExists(security.validators, 'validators no está exportado');
});

console.log(`\n${colors.blue}📚 3. VERIFICANDO DEPENDENCIAS${colors.reset}\n`);

test('express-rate-limit está instalado', () => {
    try {
        require('express-rate-limit');
    } catch (e) {
        throw new Error('express-rate-limit no está instalado');
    }
});

test('express-validator está instalado', () => {
    try {
        require('express-validator');
    } catch (e) {
        throw new Error('express-validator no está instalado');
    }
});

test('winston está instalado', () => {
    try {
        require('winston');
    } catch (e) {
        throw new Error('winston no está instalado');
    }
});

console.log(`\n${colors.blue}🔐 4. VERIFICANDO CONFIGURACIÓN DE SEGURIDAD${colors.reset}\n`);

test('.gitignore contiene .env', () => {
    const gitignore = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf-8');
    if (!gitignore.includes('.env')) {
        throw new Error('.env no está en .gitignore');
    }
});

test('package.json tiene las nuevas dependencias', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    assertExists(pkg.dependencies['express-rate-limit'], 'express-rate-limit no está en package.json');
    assertExists(pkg.dependencies['express-validator'], 'express-validator no está en package.json');
    assertExists(pkg.dependencies['winston'], 'winston no está en package.json');
});

console.log(`\n${colors.blue}⚙️  5. VERIFICANDO FUNCIONALIDAD DE MÓDULOS${colors.reset}\n`);

test('BackupSystem se puede instanciar', () => {
    const { BackupSystem } = require('./utils/backup-system');
    const backupSystem = new BackupSystem();
    assertExists(backupSystem, 'No se pudo crear instancia de BackupSystem');
    assertType(backupSystem.start, 'function', 'start no es una función');
    assertType(backupSystem.createBackup, 'function', 'createBackup no es una función');
});

test('Logger tiene métodos correctos', () => {
    const logger = require('./utils/logger');
    assertType(logger.info, 'function', 'info no es una función');
    assertType(logger.error, 'function', 'error no es una función');
    assertType(logger.warn, 'function', 'warn no es una función');
    assertType(logger.logRequest, 'function', 'logRequest no es una función');
    assertType(logger.logError, 'function', 'logError no es una función');
    assertType(logger.logSecurity, 'function', 'logSecurity no es una función');
});

test('Security middleware exports correctos', () => {
    const security = require('./middleware/security');
    assertType(security.generalLimiter, 'function', 'generalLimiter no es una función');
    assertType(security.authLimiter, 'function', 'authLimiter no es una función');
    assertType(security.apiLimiter, 'function', 'apiLimiter no es una función');
    assertType(security.sanitizeInput, 'function', 'sanitizeInput no es una función');
    assertExists(security.validators, 'validators no existe');
});

test('Validators tienen los campos correctos', () => {
    const { validators } = require('./middleware/security');
    assertExists(validators.userRegistration, 'userRegistration validator no existe');
    assertExists(validators.userLogin, 'userLogin validator no existe');
    assertExists(validators.costingData, 'costingData validator no existe');
    assertExists(validators.email, 'email validator no existe');
});

console.log(`\n${colors.blue}📁 6. VERIFICANDO ESTRUCTURA DE DIRECTORIOS${colors.reset}\n`);

test('Directorio utils existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'utils'));
    assertExists(exists, 'Directorio utils no existe');
});

test('Directorio middleware existe', () => {
    const exists = fs.existsSync(path.join(__dirname, 'middleware'));
    assertExists(exists, 'Directorio middleware no existe');
});

// Resumen Final
console.log('\n' + '='.repeat(60));
console.log(`\n${colors.blue}📊 RESUMEN DE PRUEBAS${colors.reset}\n`);
console.log(`Total de pruebas: ${totalTests}`);
console.log(`${colors.green}✅ Exitosas: ${passedTests}${colors.reset}`);
console.log(`${colors.red}❌ Fallidas: ${failedTests}${colors.reset}`);

const successRate = ((passedTests / totalTests) * 100).toFixed(2);
console.log(`\n📈 Tasa de éxito: ${successRate}%`);

if (failedTests === 0) {
    console.log(`\n${colors.green}🎉 ¡TODAS LAS PRUEBAS PASARON!${colors.reset}`);
    console.log(`\n${colors.green}✅ Las mejoras se implementaron correctamente${colors.reset}`);
    console.log(`\nPróximos pasos:`);
    console.log(`1. Integrar los módulos en server.js`);
    console.log(`2. Probar la aplicación completa`);
    console.log(`3. Deploy a producción\n`);
    process.exit(0);
} else {
    console.log(`\n${colors.red}⚠️  ALGUNAS PRUEBAS FALLARON${colors.reset}`);
    console.log(`\nRevisa los errores anteriores y corrige los problemas.\n`);
    process.exit(1);
}