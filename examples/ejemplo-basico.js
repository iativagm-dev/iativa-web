// Ejemplo de uso básico del Agente Virtual
const AgenteVirtual = require('../src/agent');

function ejemploBasico() {
    console.log('=== EJEMPLO BÁSICO DEL AGENTE VIRTUAL ===\n');
    
    // Crear instancia del agente
    const agente = new AgenteVirtual();
    
    // Iniciar el agente
    agente.iniciar();
    
    // Simular algunas interacciones
    const interacciones = [
        "Hola, ¿cómo estás?",
        "¿Cuál es tu nombre?",
        "Me siento muy feliz hoy",
        "¿Qué hora es?",
        "Gracias por tu ayuda",
        "Adiós"
    ];
    
    console.log('\n--- SIMULANDO CONVERSACIÓN ---\n');
    
    interacciones.forEach((mensaje, index) => {
        console.log(`👤 Usuario: ${mensaje}`);
        const respuesta = agente.procesarEntrada(mensaje);
        
        if (respuesta) {
            console.log(`🤖 ${agente.nombre}: ${respuesta}\n`);
        } else {
            console.log('🤖 Conversación terminada.\n');
        }
        
        // Pequeña pausa entre mensajes para mejor legibilidad
        if (index < interacciones.length - 1) {
            // En una aplicación real, aquí habría una pausa
            console.log('---');
        }
    });
    
    // Mostrar estadísticas finales
    console.log('\n=== INFORMACIÓN DEL AGENTE ===');
    const info = agente.obtenerInformacion();
    console.log(`Nombre: ${info.nombre}`);
    console.log(`Versión: ${info.version}`);
    console.log(`Personalidad: ${info.personalidad}`);
    console.log(`Activo: ${info.activo}`);
    console.log(`Total de interacciones: ${info.estadisticas.totalInteracciones}`);
}

// Ejecutar el ejemplo si este archivo se ejecuta directamente
if (require.main === module) {
    ejemploBasico();
}

module.exports = ejemploBasico;