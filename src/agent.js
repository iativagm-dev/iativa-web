const CalculadoraFinanciera = require('./calculadora-financiera');
const RecopiladorDatos = require('./recopilador-datos');
const GeneradorReportes = require('./generador-reportes');
const RecomendadorMarketing = require('./recomendador-marketing');

// Importar módulo de costeo inteligente
const { IntelligentCosting } = require('../modules/intelligent-costing');

class AgenteIAtiva {
    constructor(sessionId = null) {
        this.calculadora = new CalculadoraFinanciera();
        this.recopilador = new RecopiladorDatos();
        this.generadorReportes = new GeneradorReportes();
        this.recomendador = new RecomendadorMarketing();

        // Initialize intelligent costing module
        this.intelligentCosting = new IntelligentCosting({
            enableLogging: process.env.NODE_ENV === 'development',
            fallbackToDefault: true
        });
        this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.activo = false;
        this.config = this.calculadora.config;
        this.nombre = this.config.agente.nombre;
        this.version = this.config.agente.version;
        this.estadoActual = 'inactivo';
        this.ultimosResultados = null;

        // Variable de memoria para nombre de usuario
        this.nombre_usuario = '';

        // Métricas para monitorear
        this.metricas = {
            intentos_captura_nombre: 0,
            nombres_capturados_exitosamente: 0,
            respuestas_personalizadas: 0,
            respuestas_totales: 0,
            fallos_deteccion: 0
        };

        // Initialize intelligent costing session
        this.intelligentCosting.initializeSession(this.sessionId, {
            agentVersion: this.version,
            timestamp: new Date().toISOString()
        });
    }

    iniciar() {
        this.activo = true;
        this.estadoActual = 'bienvenida';
        this.recopilador.reiniciarSesion();
        
        console.clear();
        this.mostrarBanner();
        console.log(`\n🧠 ${this.nombre} v${this.version} iniciado`);
        console.log(`Especialidad: ${this.config.agente.especialidad.replace('_', ' y ')}`);
        console.log('=====================================');
        console.log('Escribe "salir" para terminar');
        console.log('Escribe "ayuda" para ver comandos disponibles');
        console.log('=====================================\n');
    }

    mostrarBanner() {
        console.log(`
╔══════════════════════════════════════════════╗
║            🧠 IÁTIVA - ASESOR VIRTUAL        ║
║                                              ║
║        Costeo y Proyecciones de Negocios    ║
║                                              ║
║    ✅ Cálculos financieros automáticos      ║
║    ✅ Punto de equilibrio                   ║
║    ✅ Proyecciones de escenarios            ║
║    ✅ Recomendaciones personalizadas        ║
║    ✅ Reportes descargables                 ║
║                                              ║
║    Tu aliado en crecimiento financiero 💼   ║
╚══════════════════════════════════════════════╝
        `);
    }

    // Método para detectar y extraer nombres de frases
    detectarNombre(texto) {
        const textoLimpio = texto.toLowerCase().trim();

        // Patrones para detectar nombres
        const patronesNombre = [
            /(?:me\s+llamo|mi\s+nombre\s+es|soy)\s+([a-záéíóúñ][a-záéíóúñ\s]+)/i,
            /^([a-záéíóúñ][a-záéíóúñ\s]{1,30})$/i  // Solo nombre directo
        ];

        for (const patron of patronesNombre) {
            const match = textoLimpio.match(patron);
            if (match && match[1]) {
                const nombreExtraido = match[1].trim()
                    .split(' ')
                    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                    .join(' ');

                // Validar que el nombre tenga sentido (no números, no muy largo)
                if (nombreExtraido.length >= 2 &&
                    nombreExtraido.length <= 30 &&
                    !/\d/.test(nombreExtraido) &&
                    !/^(hola|hi|buenos|buenas|gracias|ok|si|no|quiero|necesito)$/i.test(nombreExtraido)) {
                    return nombreExtraido;
                }
            }
        }

        return null;
    }

    // Método para personalizar respuestas con el nombre
    personalizarRespuesta(respuesta) {
        this.metricas.respuestas_totales++;

        if (this.nombre_usuario) {
            this.metricas.respuestas_personalizadas++;
            // Solo personalizar si la respuesta no incluye ya el nombre
            if (!respuesta.includes(this.nombre_usuario)) {
                return respuesta.replace(/¡Hola[^!]*!/, `¡Hola ${this.nombre_usuario}!`)
                               .replace(/Hola[^,]*,/, `Hola ${this.nombre_usuario},`)
                               .replace(/^🧠/, `🧠 ${this.nombre_usuario},`);
            }
        }

        return respuesta;
    }

    procesarEntrada(entrada) {
        if (!this.activo) {
            return this.personalizarRespuesta("❌ El agente no está activo. Usa el método iniciar() primero.");
        }

        const entradaLimpia = entrada.toLowerCase().trim();
        
        // Comandos globales
        if (this.esComandoSalida(entradaLimpia)) {
            return this.detener();
        }
        
        if (this.esComandoAyuda(entradaLimpia)) {
            return this.mostrarAyuda();
        }
        
        if (this.esComandoLimpiar(entradaLimpia)) {
            console.clear();
            return "🧹 Pantalla limpiada. ¿En qué más puedo ayudarte?";
        }

        if (this.esComandoReiniciar(entradaLimpia)) {
            return this.reiniciarSesion();
        }

        if (this.esComandoEstadisticas(entradaLimpia)) {
            return this.mostrarEstadisticas();
        }

        if (this.esComandoReporte(entradaLimpia) && this.ultimosResultados) {
            return this.manejarSolicitudReporte(entrada);
        }

        // Procesar según el estado actual del flujo
        return this.procesarSegunEstado(entrada);
    }

    procesarSegunEstado(entrada) {
        switch (this.estadoActual) {
            case 'bienvenida':
                return this.manejarBienvenida();
            
            case 'solicitar_nombre':
                return this.manejarSolicitudNombre(entrada);
            
            case 'recopilacion_datos':
                return this.manejarRecopilacionDatos(entrada);
            
            case 'presentacion_resultados':
                return this.manejarPresentacionResultados(entrada);
            
            case 'recomendaciones':
                return this.manejarRecomendaciones(entrada);
                
            case 'generar_reporte':
                return this.manejarGeneracionReporte(entrada);
                
            case 'completado':
                return this.manejarSesionCompleta(entrada);
            
            default:
                return this.reiniciarFlujo();
        }
    }

    manejarBienvenida() {
        // INICIALIZAR flujo simple SOLO SI NO EXISTE
        if (!this.datosSimples) {
            this.datosSimples = {};
        }
        if (this.indicePregunta === undefined) {
            this.indicePregunta = 0;
        }

        // Cambiar estado a solicitar nombre primero
        this.estadoActual = 'solicitar_nombre';

        console.log('👋 manejarBienvenida - solicitando nombre del usuario');
        console.log('👋 manejarBienvenida - datosSimples:', this.datosSimples);
        console.log('👋 manejarBienvenida - indicePregunta:', this.indicePregunta);

        const baseMessage = `🧠 **¡Bienvenido al análisis de costeo IAtiva!**

Antes de comenzar con las 9 preguntas para calcular el precio perfecto de tu producto, me gustaría conocerte mejor.

**¿Cómo te llamas?**

Por favor compárteme tu nombre para personalizar tu experiencia de análisis.`;

        // Enhance with intelligent costing if enabled
        return this.intelligentCosting.enhanceWelcomeMessage(baseMessage, this.sessionId);
    }

    manejarSolicitudNombre(entrada) {
        this.metricas.intentos_captura_nombre++;

        // Intentar detectar el nombre en la entrada
        const nombreDetectado = this.detectarNombre(entrada);

        if (nombreDetectado) {
            // Guardar el nombre detectado
            this.nombre_usuario = nombreDetectado;
            this.recopilador.sesion.nombreUsuario = nombreDetectado;
            this.metricas.nombres_capturados_exitosamente++;

            // Process business information with intelligent costing
            this.intelligentCosting.processBusinessInfo({
                nombreUsuario: nombreDetectado
            }, this.sessionId);

            // Continuar al flujo de recopilación de datos
            this.estadoActual = 'recopilacion_datos';

            console.log(`✅ Nombre capturado exitosamente: ${nombreDetectado}`);

            return this.personalizarRespuesta(`¡Perfecto ${nombreDetectado}! Me da mucho gusto conocerte.

Ahora empecemos con el análisis de costos para tu producto 💪

**Pregunta 1/9**

¿Cuánto gastaste en materia prima/insumos?

Ejemplo: 50000`);
        } else {
            // No se pudo detectar un nombre válido
            this.metricas.fallos_deteccion++;

            return `Me disculpo, pero no logré capturar tu nombre correctamente.

¿Podrías decirme tu nombre de una forma más clara?

Ejemplos:
- "Me llamo María"
- "Soy Carlos"
- "Mi nombre es Ana"
- O simplemente: "Pedro"`;
        }
    }

    manejarRecopilacionDatos(entrada) {
        console.log('📝 manejarRecopilacionDatos - entrada:', entrada);
        console.log('📊 Estado actual - indicePregunta:', this.indicePregunta);
        console.log('📊 Estado actual - datosSimples:', this.datosSimples);
        
        // FLUJO SUPER SIMPLE
        const numero = parseFloat(entrada.replace(/[^\d.-]/g, ''));
        console.log('🔢 Número procesado:', numero);
        
        if (isNaN(numero) || numero < 0) {
            return this.personalizarRespuesta("❌ Por favor ingresa solo números. Ejemplo: 50000");
        }

        // Lista simple de preguntas
        const preguntas = [
            { nombre: 'materia_prima', pregunta: '¿Cuánto gastaste en materia prima/insumos?' },
            { nombre: 'mano_obra', pregunta: '¿Cuánto gastaste en mano de obra directa?' },
            { nombre: 'empaque', pregunta: '¿Cuánto gastaste en empaque o presentación?' },
            { nombre: 'servicios', pregunta: '¿Cuánto gastaste en servicios (luz, agua, internet)?' },
            { nombre: 'transporte', pregunta: '¿Cuánto gastaste en transporte?' },
            { nombre: 'marketing', pregunta: '¿Cuánto gastaste en marketing?' },
            { nombre: 'arriendo_sueldos', pregunta: '¿Cuánto gastaste en arriendo o sueldos?' },
            { nombre: 'otros_costos', pregunta: '¿Otros costos (préstamos, intereses)?' },
            { nombre: 'margen_ganancia', pregunta: '¿Qué margen de ganancia deseas (%)?' }
        ];

        // ASEGURAR inicialización
        if (!this.datosSimples || this.indicePregunta === undefined) {
            console.log('⚠️ Reinicializando datos...');
            this.datosSimples = {};
            this.indicePregunta = 0;
        }

        // Guardar respuesta actual
        if (this.indicePregunta < preguntas.length) {
            const preguntaActual = preguntas[this.indicePregunta];

            // Validate with intelligent costing if enabled
            const validation = this.intelligentCosting.validateCostInput(
                preguntaActual.nombre,
                numero,
                this.sessionId
            );

            // Show validation warnings (but don't block)
            if (validation.type === 'warning' && validation.message) {
                console.log(`⚠️ Validation warning for ${preguntaActual.nombre}: ${validation.message}`);
            }

            this.datosSimples[preguntaActual.nombre] = numero;
            console.log('✅ Guardado:', preguntaActual.nombre, '=', numero);
            this.indicePregunta++;
            console.log('📈 Nuevo índice:', this.indicePregunta);
        }

        // ¿Hay más preguntas?
        if (this.indicePregunta < preguntas.length) {
            const siguientePregunta = preguntas[this.indicePregunta];
            console.log('➡️ Siguiente pregunta:', siguientePregunta.nombre);
            return this.personalizarRespuesta(`✅ Guardado: $${numero.toLocaleString()}\n\n**Pregunta ${this.indicePregunta + 1}/9**\n\n${siguientePregunta.pregunta}\n\nEjemplo: ${siguientePregunta.nombre === 'margen_ganancia' ? '25' : '15000'}`);
        }

        // ¡ANÁLISIS COMPLETO!
        console.log('🎉 Todas las preguntas completadas!');
        return this.calcularResultadosSimples();
    }

    calcularResultadosSimples() {
        const datos = this.datosSimples;
        
        // Cálculos básicos
        const costoTotal = 
            (datos.materia_prima || 0) +
            (datos.mano_obra || 0) +
            (datos.empaque || 0) +
            (datos.servicios || 0) +
            (datos.transporte || 0) +
            (datos.marketing || 0) +
            (datos.arriendo_sueldos || 0) +
            (datos.otros_costos || 0);
            
        const margen = datos.margen_ganancia || 20;
        const precioVenta = Math.round(costoTotal * (1 + margen/100));
        const ganancia = precioVenta - costoTotal;
        const puntoEquilibrio = Math.ceil(costoTotal / ganancia) || 1;
        
        // GUARDAR RESULTADOS para persistencia
        this.ultimosResultados = {
            datosOriginales: {
                costos: datos,
                nombreUsuario: this.nombre_usuario || "Emprendedor",
                timestamp: new Date().toISOString()
            },
            calculos: {
                exito: true,
                costoUnitario: costoTotal,
                precioVenta: precioVenta,
                puntoEquilibrio: puntoEquilibrio,
                margenGanancia: margen,
                gananciaPorUnidad: ganancia
            }
        };
        
        this.estadoActual = 'completado';

        // Analyze with intelligent costing
        const analysis = this.intelligentCosting.analyzeCostStructure(datos, this.sessionId);

        let baseMessage = `🎉 **¡ANÁLISIS COMPLETO!**

📊 **RESULTADOS:**
• **Costo total:** $${costoTotal.toLocaleString()}
• **Precio sugerido:** $${precioVenta.toLocaleString()}
• **Ganancia por unidad:** $${ganancia.toLocaleString()}
• **Margen:** ${margen}%
• **Punto de equilibrio:** ${puntoEquilibrio} unidades`;

        // Add intelligent insights if available
        if (analysis.industryComparison) {
            baseMessage += `\n\n🏭 **ANÁLISIS SECTORIAL:**`;
            baseMessage += `\n📈 Comparado con ${analysis.industryComparison.industry}`;
            baseMessage += `\n🎯 Puntuación de validación: ${analysis.validationScore}/100`;
        }

        baseMessage += `\n\n💡 **RECOMENDACIONES:**`;

        if (analysis.recommendations && analysis.recommendations.length > 0) {
            // Use intelligent recommendations
            analysis.recommendations.slice(0, 4).forEach(rec => {
                baseMessage += `\n✅ ${rec}`;
            });
        } else {
            // Fallback to basic recommendations
            baseMessage += `\n✅ Con estos números, necesitas vender ${puntoEquilibrio} unidades para cubrir costos`;
            baseMessage += `\n✅ Cada unidad adicional te dará $${ganancia.toLocaleString()} de ganancia`;
            baseMessage += `\n✅ Considera ajustar precios si el mercado lo permite`;
        }

        baseMessage += `\n\n🚀 **¡Tu negocio tiene potencial! Sigue estos números para crecer.**`;

        return this.personalizarRespuesta(baseMessage);
    }

    procesarCalculos() {
        try {
            const datosParaCalculos = this.recopilador.obtenerDatosParaCalculos();
            const resultadosCalculos = this.calculadora.calcularCompleto(datosParaCalculos);
            
            if (!resultadosCalculos.exito) {
                return this.personalizarRespuesta(`❌ Error en los cálculos: ${resultadosCalculos.error}\n\nPuedes escribir "reiniciar" para comenzar de nuevo.`);
            }

            this.ultimosResultados = {
                datosOriginales: datosParaCalculos,
                calculos: resultadosCalculos
            };

            this.estadoActual = 'presentacion_resultados';
            
            const resumenAmigable = this.calculadora.generarResumenAmigable(
                resultadosCalculos,
                datosParaCalculos.nombreUsuario
            );
            
            return `${resumenAmigable}\n🔍 **¿Qué quieres hacer ahora?**\n• Escribe "recomendaciones" para consejos personalizados\n• Escribe "reporte" para generar documento descargable\n• Escribe "nuevo" para hacer otro análisis`;
        } catch (error) {
            return this.personalizarRespuesta(`❌ Error inesperado: ${error.message}\n\nPuedes escribir "reiniciar" para comenzar de nuevo.`);
        }
    }

    manejarPresentacionResultados(entrada) {
        const entradaLimpia = entrada.toLowerCase().trim();
        
        if (this.contienePatron(entradaLimpia, ['recomendaciones', 'consejos', 'sugerencias'])) {
            this.estadoActual = 'recomendaciones';
            return this.generarYMostrarRecomendaciones();
        }
        
        if (this.contienePatron(entradaLimpia, ['reporte', 'documento', 'pdf', 'descargar'])) {
            this.estadoActual = 'generar_reporte';
            return "📄 **¿En qué formato quieres el reporte?**\n\n• Escribe \"html\" para reporte web interactivo\n• Escribe \"txt\" para reporte en texto plano\n\nEl reporte incluirá todos tus cálculos, proyecciones y recomendaciones.";
        }
        
        if (this.contienePatron(entradaLimpia, ['nuevo', 'otro', 'reiniciar'])) {
            return this.reiniciarSesion();
        }

        // Si no reconoce el comando, mostrar opciones de nuevo
        return "🤔 No entendí tu solicitud. ¿Qué quieres hacer?\n\n• **\"recomendaciones\"** - Consejos personalizados\n• **\"reporte\"** - Generar documento\n• **\"nuevo\"** - Hacer otro análisis";
    }

    generarYMostrarRecomendaciones() {
        try {
            if (!this.ultimosResultados) {
                return this.personalizarRespuesta("❌ No hay resultados disponibles para generar recomendaciones.");
            }

            const recomendaciones = this.recomendador.generarRecomendacionesCompletas(
                this.ultimosResultados.calculos,
                this.ultimosResultados.datosOriginales
            );

            if (!recomendaciones.exito) {
                return this.personalizarRespuesta(`❌ Error generando recomendaciones: ${recomendaciones.error}`);
            }

            let respuesta = `${recomendaciones.recomendacionesFormateadas}\n`;
            respuesta += `${recomendaciones.mensajeMotivacional}\n\n`;
            respuesta += "🔍 **¿Qué quieres hacer ahora?**\n";
            respuesta += "• Escribe \"plan\" para ver plan de acción de 30 días\n";
            respuesta += "• Escribe \"reporte\" para generar documento completo\n";
            respuesta += "• Escribe \"nuevo\" para hacer otro análisis";

            return respuesta;

        } catch (error) {
            return this.personalizarRespuesta(`❌ Error generando recomendaciones: ${error.message}`);
        }
    }

    manejarRecomendaciones(entrada) {
        const entradaLimpia = entrada.toLowerCase().trim();
        
        if (this.contienePatron(entradaLimpia, ['plan', 'accion', '30', 'dias'])) {
            const recomendaciones = this.recomendador.generarRecomendacionesCompletas(
                this.ultimosResultados.calculos,
                this.ultimosResultados.datosOriginales
            );
            
            if (recomendaciones.exito) {
                return `${recomendaciones.planAccion}\n\n🔍 **¿Qué más necesitas?**\n• Escribe \"reporte\" para documento completo\n• Escribe \"nuevo\" para otro análisis`;
            }
        }
        
        if (this.contienePatron(entradaLimpia, ['reporte', 'documento'])) {
            this.estadoActual = 'generar_reporte';
            return "📄 **¿En qué formato quieres el reporte?**\n\n• Escribe \"html\" para reporte web interactivo\n• Escribe \"txt\" para reporte en texto plano";
        }
        
        if (this.contienePatron(entradaLimpia, ['nuevo', 'otro', 'reiniciar'])) {
            return this.reiniciarSesion();
        }

        return "🤔 ¿Qué necesitas?\n• **\"plan\"** - Plan de acción de 30 días\n• **\"reporte\"** - Generar documento\n• **\"nuevo\"** - Nuevo análisis";
    }

    async manejarGeneracionReporte(entrada) {
        const entradaLimpia = entrada.toLowerCase().trim();
        
        if (!this.ultimosResultados) {
            return this.personalizarRespuesta("❌ No hay datos para generar el reporte.");
        }

        let formato = 'html';
        if (this.contienePatron(entradaLimpia, ['txt', 'texto', 'text'])) {
            formato = 'txt';
        }

        try {
            console.log("🔄 Generando reporte...");
            
            const resultadoReporte = await this.generadorReportes.generarReporteCompleto(
                this.ultimosResultados.datosOriginales,
                this.ultimosResultados.calculos,
                formato
            );

            this.estadoActual = 'completado';

            if (resultadoReporte.exito) {
                return `${resultadoReporte.mensaje}\n\n${this.generarMensajeCierre()}`;
            } else {
                return `${resultadoReporte.mensaje}\n\nPuedes intentar con otro formato escribiendo "reporte".`;
            }

        } catch (error) {
            return this.personalizarRespuesta(`❌ Error generando reporte: ${error.message}`);
        }
    }

    manejarSesionCompleta(entrada) {
        const entradaLimpia = entrada.toLowerCase().trim();
        
        if (this.contienePatron(entradaLimpia, ['nuevo', 'otro', 'reiniciar'])) {
            return this.reiniciarSesion();
        }
        
        if (this.contienePatron(entradaLimpia, ['reporte', 'documento']) && this.ultimosResultados) {
            this.estadoActual = 'generar_reporte';
            return "📄 **¿En qué formato quieres el reporte?**\n\n• Escribe \"html\" para reporte web\n• Escribe \"txt\" para texto plano";
        }

        return `¡Gracias por usar IAtiva! 🧠✨\n\n🔍 **Opciones disponibles:**\n• **\"nuevo\"** - Hacer otro análisis de costeo\n• **\"reporte\"** - Generar otro reporte\n• **\"salir\"** - Terminar sesión\n\n💼 Para asesoría personalizada: ${this.config.agente.contacto}`;
    }

    async manejarSolicitudReporte(entrada) {
        if (!this.ultimosResultados) {
            return this.personalizarRespuesta("❌ No hay datos disponibles para generar reporte.");
        }

        const formato = this.contienePatron(entrada.toLowerCase(), ['txt', 'texto']) ? 'txt' : 'html';
        
        try {
            const resultado = await this.generadorReportes.generarReporteCompleto(
                this.ultimosResultados.datosOriginales,
                this.ultimosResultados.calculos,
                formato
            );

            return resultado.exito ? this.personalizarRespuesta(resultado.mensaje) : this.personalizarRespuesta(`❌ ${resultado.mensaje}`);
        } catch (error) {
            return this.personalizarRespuesta(`❌ Error generando reporte: ${error.message}`);
        }
    }

    generarMensajeCierre() {
        const nombreUsuario = this.ultimosResultados?.datosOriginales?.nombreUsuario || '';
        const despedidas = this.config.respuestas.despedidas;
        let despedida = despedidas[Math.floor(Math.random() * despedidas.length)];
        
        if (nombreUsuario) {
            despedida = despedida.replace('{nombre}', nombreUsuario);
        } else {
            despedida = despedida.replace('{nombre}', '');
        }

        return `${despedida}\n\n🔍 **¿Qué más puedo hacer por ti?**\n• **\"nuevo\"** - Realizar otro análisis\n• **\"salir\"** - Terminar sesión`;
    }

    reiniciarSesion() {
        this.recopilador.reiniciarSesion();
        this.estadoActual = 'bienvenida';
        this.ultimosResultados = null;
        
        return "🔄 **Sesión reiniciada**\n\n¡Perfecto! Empecemos un nuevo análisis de costeo y proyecciones.\n\n" + this.manejarBienvenida();
    }

    reiniciarFlujo() {
        this.estadoActual = 'bienvenida';
        return "🔄 Reiniciando flujo...\n\n" + this.manejarBienvenida();
    }

    detener() {
        this.activo = false;
        const stats = this.recopilador.obtenerEstadisticasSesion();
        
        console.log('\n=====================================');
        console.log(`¡Gracias por usar ${this.nombre}!`);
        
        if (stats.nombreUsuario) {
            console.log(`Fue un placer ayudarte, ${stats.nombreUsuario}.`);
        }
        
        if (stats.completado) {
            console.log('✅ Análisis completado exitosamente');
        } else {
            console.log(`📊 Progreso: ${stats.porcentajeCompletado}% completado`);
        }
        
        console.log('\n🧠 Recuerda: Un negocio sostenible no solo depende');
        console.log('del precio, sino de cómo gestionas tus costos y');
        console.log('conectas con tus clientes. ¡Tú puedes lograrlo! 💪');
        console.log('\n💼 Para asesoría personalizada:');
        console.log(`📧 ${this.config.agente.contacto}`);
        console.log('=====================================');
        console.log(`${this.nombre} desconectado. ¡Hasta la próxima! 👋\n`);

        // Cleanup intelligent costing session
        if (this.intelligentCosting && this.sessionId) {
            const analytics = this.intelligentCosting.getSessionAnalytics(this.sessionId);
            if (analytics) {
                console.log('📊 Análisis inteligente - Métricas de sesión:');
                console.log(`   ⏱️  Duración: ${Math.round(analytics.duration / 1000)}s`);
                if (analytics.industry) {
                    console.log(`   🏭 Industria detectada: ${analytics.industry} (${analytics.confidence}%)`);
                }
                console.log(`   🔍 Validaciones realizadas: ${analytics.validationCount}`);
                console.log(`   ⚙️  Características usadas: ${analytics.featuresUsed.join(', ')}`);
            }
            this.intelligentCosting.cleanupSession(this.sessionId);
        }

        return null; // Señal para terminar
    }

    mostrarAyuda() {
        let ayuda = `\n🔧 **COMANDOS DISPONIBLES**\n\n`;
        ayuda += `**🧠 Comandos Generales:**\n`;
        ayuda += `• salir/exit - Terminar la sesión\n`;
        ayuda += `• ayuda/help - Mostrar esta ayuda\n`;
        ayuda += `• limpiar/clear - Limpiar pantalla\n`;
        ayuda += `• reiniciar - Comenzar nuevo análisis\n`;
        ayuda += `• estadisticas - Ver progreso actual\n\n`;
        
        ayuda += `**💰 Comandos de Análisis:**\n`;
        ayuda += `• progreso - Ver avance de recopilación\n`;
        ayuda += `• resumen - Ver datos ingresados\n`;
        ayuda += `• recomendaciones - Consejos personalizados\n`;
        ayuda += `• plan - Plan de acción de 30 días\n`;
        ayuda += `• reporte - Generar documento descargable\n\n`;
        
        ayuda += `**🎯 FUNCIONALIDADES PRINCIPALES:**\n`;
        ayuda += `• ✅ Cálculo automático de costos totales\n`;
        ayuda += `• ✅ Determinación de precio de venta óptimo\n`;
        ayuda += `• ✅ Análisis de punto de equilibrio\n`;
        ayuda += `• ✅ Proyecciones de diferentes escenarios\n`;
        ayuda += `• ✅ Recomendaciones de marketing personalizadas\n`;
        ayuda += `• ✅ Reportes profesionales descargables\n\n`;
        
        ayuda += `**🚀 CÓMO FUNCIONA:**\n`;
        ayuda += `1. Te pregunto por tus costos paso a paso\n`;
        ayuda += `2. Calculo automáticamente todos los números\n`;
        ayuda += `3. Te doy recomendaciones específicas\n`;
        ayuda += `4. Genero un reporte completo para descargar\n\n`;
        
        ayuda += `💡 **Tip**: Solo responde las preguntas con números. ¡Yo hago el resto!\n`;
        ayuda += `📧 **Contacto**: ${this.config.agente.contacto}`;
        
        return ayuda;
    }

    mostrarEstadisticas() {
        const stats = this.recopilador.obtenerEstadisticasSesion();
        
        let mensaje = `\n📊 **ESTADÍSTICAS DE LA SESIÓN**\n\n`;
        
        if (stats.nombreUsuario) {
            mensaje += `👤 Usuario: ${stats.nombreUsuario}\n`;
        }
        
        mensaje += `📈 Progreso: ${stats.porcentajeCompletado}%\n`;
        mensaje += `📝 Datos recopilados: ${stats.datosRecopilados}/${stats.totalDatos}\n`;
        mensaje += `⚡ Estado actual: ${this.estadoActual.replace('_', ' ')}\n`;
        mensaje += `⏱️ Duración sesión: ${Math.round(stats.duracionSesion / 1000 / 60)} minutos\n`;
        
        if (stats.completado) {
            mensaje += `✅ Estado: Análisis completado\n`;
        } else {
            mensaje += `🔄 Estado: En proceso\n`;
        }
        
        if (this.ultimosResultados) {
            mensaje += `💼 Último análisis: Disponible\n`;
            mensaje += `📄 Reportes: Disponibles para generar\n`;
        }
        
        mensaje += `\n${this.recopilador.mostrarProgreso()}`;
        
        return mensaje;
    }

    // Métodos de utilidad
    esComandoSalida(entrada) {
        const comandos = ['salir', 'exit', 'quit', 'adios', 'bye', 'chao', 'gracias'];
        return comandos.includes(entrada);
    }

    esComandoAyuda(entrada) {
        const comandos = ['ayuda', 'help', '?', 'comandos'];
        return comandos.includes(entrada);
    }

    esComandoLimpiar(entrada) {
        const comandos = ['limpiar', 'clear', 'cls'];
        return comandos.includes(entrada);
    }

    esComandoReiniciar(entrada) {
        const comandos = ['reiniciar', 'nuevo', 'empezar', 'reset'];
        return comandos.includes(entrada);
    }

    esComandoEstadisticas(entrada) {
        const comandos = ['estadisticas', 'stats', 'estadísticas', 'progreso', 'estado'];
        return comandos.includes(entrada);
    }

    esComandoReporte(entrada) {
        const comandos = ['reporte', 'informe', 'documento', 'pdf', 'excel', 'descargar'];
        return comandos.some(cmd => entrada.includes(cmd));
    }

    contienePatron(texto, patrones) {
        return patrones.some(patron => texto.includes(patron));
    }

    obtenerInformacion() {
        const stats = this.recopilador.obtenerEstadisticasSesion();
        
        return {
            nombre: this.nombre,
            version: this.version,
            especialidad: this.config.agente.especialidad,
            activo: this.activo,
            estadoActual: this.estadoActual,
            sesionActual: stats,
            tieneResultados: !!this.ultimosResultados,
            contacto: this.config.agente.contacto
        };
    }
}

module.exports = AgenteIAtiva;