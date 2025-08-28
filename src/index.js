const readline = require('readline');
const AgenteIAtiva = require('./agent');

class InterfazIAtiva {
    constructor() {
        this.agente = new AgenteIAtiva();
        this.rl = null;
        this.configurarReadline();
    }

    configurarReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '👤 Tú: '
        });

        // Configurar eventos
        this.rl.on('line', async (input) => {
            await this.procesarEntradaUsuario(input.trim());
        });

        this.rl.on('close', () => {
            console.log('\n👋 ¡Hasta la vista!');
            process.exit(0);
        });

        // Manejar Ctrl+C
        this.rl.on('SIGINT', () => {
            console.log('\n¿Quieres salir? Escribe "salir" o presiona Ctrl+C de nuevo para confirmar.');
            this.rl.prompt();
        });
    }

    async procesarEntradaUsuario(entrada) {
        if (!entrada) {
            this.rl.prompt();
            return;
        }

        try {
            // Mostrar indicador de procesamiento para comandos que pueden tomar tiempo
            const entradaLimpia = entrada.toLowerCase();
            const requiereProcesamiento = this.requiereProcesamiento(entradaLimpia);
            
            if (requiereProcesamiento) {
                process.stdout.write('🔄 Procesando...');
            }

            const respuesta = await this.agente.procesarEntrada(entrada);
            
            // Limpiar indicador de procesamiento
            if (requiereProcesamiento) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
            }
            
            if (respuesta === null) {
                // El agente se ha detenido
                this.rl.close();
                return;
            }

            // Mostrar respuesta del agente con formato
            this.mostrarRespuestaFormateada(respuesta);
            
        } catch (error) {
            console.error('❌ Error interno:', error.message);
            console.log(`🧠 ${this.agente.nombre}: Disculpa, algo salió mal. ¿Puedes intentar de nuevo?\n`);
        }

        this.rl.prompt();
    }

    requiereProcesamiento(entrada) {
        const comandosPesados = [
            'reporte', 'documento', 'pdf', 'generar',
            'recomendaciones', 'consejos', 'plan'
        ];
        
        return comandosPesados.some(comando => entrada.includes(comando));
    }

    mostrarRespuestaFormateada(respuesta) {
        // Dividir respuesta en líneas para mejor formato
        const lineas = respuesta.split('\n');
        let respuestaFormateada = '';
        
        lineas.forEach((linea, index) => {
            if (linea.startsWith('**') && linea.endsWith('**')) {
                // Resaltar títulos en negrita
                respuestaFormateada += `\n${linea}\n`;
            } else if (linea.startsWith('• ')) {
                // Mantener viñetas
                respuestaFormateada += `${linea}\n`;
            } else if (linea.trim() === '') {
                // Mantener líneas vacías
                respuestaFormateada += '\n';
            } else {
                respuestaFormateada += `${linea}\n`;
            }
        });
        
        console.log(`🧠 ${this.agente.nombre}: ${respuestaFormateada}`);
    }

    iniciarConversacion() {
        this.mostrarPresentacion();
        this.agente.iniciar();
        console.log('💬 Escribe tu mensaje y presiona Enter para empezar...\n');
        this.rl.prompt();
    }

    mostrarPresentacion() {
        console.clear();
        console.log(`
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│               🧠 BIENVENIDO A IÁTIVA 🧠                    │
│                                                             │
│    Tu Asesor Virtual de Costeo y Proyecciones de Negocios  │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  ✅ Calcula precios ideales para tu producto         ║  │
│  ║  ✅ Determina tu punto de equilibrio                 ║  │
│  ║  ║  ✅ Proyecta diferentes escenarios de ventas      ║  │
│  ║  ✅ Recibe recomendaciones personalizadas           ║  │
│  ║  ✅ Genera reportes profesionales descargables      ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│   💼 Desarrollado por: IAtiva - Tu aliado financiero       │
│   📧 Contacto: iativagm@gmail.com                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        `);
    }

    mostrarAyudaRapida() {
        console.log(`
📝 COMANDOS ÚTILES:
• "ayuda" - Ver todos los comandos disponibles
• "progreso" - Ver avance de tu análisis
• "reiniciar" - Comenzar nuevo análisis
• "salir" - Terminar sesión

💡 CONSEJO: Responde las preguntas con números simples
   Ejemplo: 15000 (para $15,000)
        `);
    }
}

// Función principal de inicio
function main() {
    try {
        console.log('🚀 Iniciando IAtiva - Asesor Virtual de Costeo...\n');
        
        const interfaz = new InterfazIAtiva();
        
        // Mostrar ayuda rápida si es la primera vez
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            interfaz.mostrarAyudaRapida();
            return;
        }
        
        interfaz.iniciarConversacion();
        
    } catch (error) {
        console.error('❌ Error fatal al iniciar IAtiva:', error.message);
        console.log('\n🔧 Posibles soluciones:');
        console.log('1. Verificar que Node.js esté instalado correctamente');
        console.log('2. Revisar que todos los archivos estén presentes');
        console.log('3. Ejecutar desde el directorio correcto del proyecto');
        console.log('\n📧 Si el problema persiste, contacta: iativagm@gmail.com');
        process.exit(1);
    }
}

// Manejo avanzado de errores
process.on('uncaughtException', (error) => {
    console.error('\n❌ Error crítico no controlado:', error.message);
    console.log('🧠 IAtiva se cerrará de forma segura para proteger tus datos...');
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n⚠️  Promesa rechazada no manejada:', reason);
    console.log('🧠 IAtiva continuará funcionando, pero esto puede indicar un problema.');
});

// Manejar señales del sistema
process.on('SIGTERM', () => {
    console.log('\n🔄 IAtiva recibió señal de terminación...');
    console.log('💾 Guardando estado y cerrando de forma segura...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 ¡Gracias por usar IAtiva!');
    console.log('🧠 Tu aliado en crecimiento financiero');
    console.log('📧 iativagm@gmail.com\n');
    process.exit(0);
});

// Mostrar información de versión si se solicita
if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log('🧠 IAtiva v2.0.0 - Asesor Virtual de Costeo');
    console.log('💼 Desarrollado para emprendedores, estudiantes e instructores');
    console.log('📧 Contacto: iativagm@gmail.com');
    process.exit(0);
}

// Iniciar la aplicación si este archivo es ejecutado directamente
if (require.main === module) {
    main();
}

module.exports = {
    InterfazIAtiva,
    AgenteIAtiva,
    main
};