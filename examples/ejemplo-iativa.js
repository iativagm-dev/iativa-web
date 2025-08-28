// Ejemplo completo del Agente IAtiva - Asesor de Costeo y Proyecciones
const AgenteIAtiva = require('../src/agent');

async function ejemploCompletoIAtiva() {
    console.log('🧠 === DEMOSTRACIÓN DE IÁTIVA - ASESOR VIRTUAL ===\n');
    
    // Crear instancia del agente IAtiva
    const agente = new AgenteIAtiva();
    
    // Iniciar el agente
    agente.iniciar();
    
    console.log('\n--- SIMULANDO SESIÓN COMPLETA ---\n');
    
    // Simular una sesión completa de análisis
    const interacciones = [
        // 1. Proceso inicial
        { usuario: "cualquier texto", descripcion: "Trigger inicial" },
        
        // 2. Proporcionar nombre
        { usuario: "María González", descripcion: "Proporcionar nombre de usuario" },
        
        // 3. Datos de costos paso a paso
        { usuario: "5000", descripcion: "Materia prima - $5,000" },
        { usuario: "3000", descripcion: "Mano de obra - $3,000" },
        { usuario: "500", descripcion: "Empaque - $500" },
        { usuario: "800", descripcion: "Servicios - $800" },
        { usuario: "400", descripcion: "Transporte - $400" },
        { usuario: "600", descripcion: "Marketing - $600" },
        { usuario: "1200", descripcion: "Arriendo/sueldos - $1,200" },
        { usuario: "300", descripcion: "Otros costos - $300" },
        { usuario: "25", descripcion: "Margen de ganancia - 25%" },
        
        // 4. Solicitar recomendaciones
        { usuario: "recomendaciones", descripcion: "Solicitar consejos personalizados" },
        
        // 5. Ver plan de acción
        { usuario: "plan", descripcion: "Ver plan de acción de 30 días" },
        
        // 6. Generar reporte
        { usuario: "reporte", descripcion: "Solicitar generar reporte" },
        { usuario: "html", descripcion: "Elegir formato HTML" }
    ];
    
    console.log('💼 Simulando análisis de costeo para un negocio de productos artesanales...\n');
    
    for (let i = 0; i < interacciones.length; i++) {
        const { usuario, descripcion } = interacciones[i];
        
        console.log(`👤 Usuario (${descripcion}): ${usuario}`);
        
        try {
            const respuesta = await agente.procesarEntrada(usuario);
            
            if (respuesta === null) {
                console.log('🧠 IAtiva: Sesión terminada.\n');
                break;
            }
            
            // Mostrar solo las primeras líneas para no saturar el ejemplo
            const lineasRespuesta = respuesta.split('\n');
            const resumenRespuesta = lineasRespuesta.slice(0, 5).join('\n');
            const masLineas = lineasRespuesta.length > 5 ? `\n... (${lineasRespuesta.length - 5} líneas más)` : '';
            
            console.log(`🧠 IAtiva: ${resumenRespuesta}${masLineas}\n`);
            
            // Pausa pequeña para simular tiempo de lectura
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ Error en interacción ${i + 1}: ${error.message}`);
            break;
        }
    }
    
    // Mostrar información final del agente
    console.log('\n=== INFORMACIÓN DEL AGENTE ===');
    const info = agente.obtenerInformacion();
    console.log(`🧠 Nombre: ${info.nombre}`);
    console.log(`📊 Versión: ${info.version}`);
    console.log(`💼 Especialidad: ${info.especialidad.replace('_', ' y ')}`);
    console.log(`🎯 Estado actual: ${info.estadoActual}`);
    console.log(`✅ Activo: ${info.activo}`);
    console.log(`📈 Progreso de sesión: ${info.sesionActual.porcentajeCompletado}%`);
    console.log(`👤 Usuario actual: ${info.sesionActual.nombreUsuario || 'No especificado'}`);
    console.log(`📄 Tiene resultados: ${info.tieneResultados ? 'Sí' : 'No'}`);
    console.log(`📧 Contacto: ${info.contacto}`);
    
    console.log('\n🎉 === DEMOSTRACIÓN COMPLETADA ===');
    console.log('\n💡 CARACTERÍSTICAS PRINCIPALES DEMOSTRADAS:');
    console.log('✅ Recopilación de datos paso a paso');
    console.log('✅ Cálculos financieros automáticos');
    console.log('✅ Análisis de punto de equilibrio');
    console.log('✅ Proyecciones de escenarios');
    console.log('✅ Recomendaciones personalizadas');
    console.log('✅ Plan de acción de 30 días');
    console.log('✅ Generación de reportes');
    console.log('✅ Interfaz conversacional inteligente');
    
    console.log('\n🚀 Para usar IAtiva de forma interactiva:');
    console.log('   node src/index.js');
    
    console.log('\n🧠 IAtiva - Tu aliado en crecimiento financiero');
    console.log('📧 iativagm@gmail.com');
}

// Función para demostrar solo los cálculos
async function ejemploCalculosRapidos() {
    console.log('🧮 === DEMO RÁPIDA DE CÁLCULOS ===\n');
    
    const agente = new AgenteIAtiva();
    agente.iniciar();
    
    // Simular datos de ejemplo sin interacción
    const datosDePrueba = {
        costos: {
            materia_prima: 5000,
            mano_obra: 3000,
            empaque: 500,
            servicios: 800,
            transporte: 400,
            marketing: 600,
            arriendo_sueldos: 1200,
            otros_costos: 300
        },
        margen_ganancia: 25,
        nombreUsuario: 'Demo User',
        timestamp: new Date().toISOString()
    };
    
    console.log('📊 Datos de entrada:');
    console.log(JSON.stringify(datosDePrueba.costos, null, 2));
    console.log(`Margen de ganancia: ${datosDePrueba.margen_ganancia}%\n`);
    
    // Realizar cálculos directamente
    const resultados = agente.calculadora.calcularCompleto(datosDePrueba);
    
    if (resultados.exito) {
        console.log('✅ RESULTADOS DEL CÁLCULO:');
        console.log(`💰 Costo total: ${agente.calculadora.formatearMoneda(resultados.resumen.costoTotal)}`);
        console.log(`💵 Precio sugerido: ${agente.calculadora.formatearMoneda(resultados.resumen.precioVentaSugerido)}`);
        console.log(`📈 Utilidad por unidad: ${agente.calculadora.formatearMoneda(resultados.resumen.utilidadUnitaria)}`);
        console.log(`📊 Margen aplicado: ${agente.calculadora.formatearPorcentaje(resultados.resumen.margenUtilidad)}`);
        
        if (resultados.detalles.puntoEquilibrio.unidades) {
            console.log(`⚖️  Punto de equilibrio: ${resultados.detalles.puntoEquilibrio.unidades} unidades`);
            console.log(`💸 Ventas mínimas: ${agente.calculadora.formatearMoneda(resultados.detalles.puntoEquilibrio.ventasEnPesos)}`);
        }
        
        console.log('\n📋 Resumen amigable:');
        const resumen = agente.calculadora.generarResumenAmigable(resultados, datosDePrueba.nombreUsuario);
        console.log(resumen);
        
    } else {
        console.error('❌ Error en cálculos:', resultados.error);
    }
}

// Ejecutar ejemplos
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--rapido') || args.includes('-r')) {
        await ejemploCalculosRapidos();
    } else if (args.includes('--completo') || args.includes('-c')) {
        await ejemploCompletoIAtiva();
    } else {
        console.log('🧠 IAtiva - Ejemplos disponibles:\n');
        console.log('node examples/ejemplo-iativa.js --completo  (o -c)  - Demostración completa');
        console.log('node examples/ejemplo-iativa.js --rapido    (o -r)  - Solo cálculos rápidos');
        console.log('\nSin parámetros: muestra esta ayuda\n');
        
        console.log('💡 Para usar IAtiva de forma interactiva:');
        console.log('   node src/index.js\n');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    ejemploCompletoIAtiva,
    ejemploCalculosRapidos
};