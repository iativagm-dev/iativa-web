const fs = require('fs');
const path = require('path');

class ResponseSystem {
    constructor() {
        this.config = this.cargarConfiguracion();
        this.respuestas = this.config.respuestas;
        this.historialConversacion = [];
        this.contexto = {};
    }

    cargarConfiguracion() {
        const configPath = path.join(__dirname, '../config/settings.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    }

    seleccionarRespuestaAleatoria(categoriaRespuestas) {
        const respuestas = this.respuestas[categoriaRespuestas];
        if (!respuestas || respuestas.length === 0) {
            return "Lo siento, no tengo una respuesta apropiada en este momento.";
        }
        
        const indiceAleatorio = Math.floor(Math.random() * respuestas.length);
        return respuestas[indiceAleatorio];
    }

    generarRespuesta(analisisNLP) {
        const { intencion, entidades, sentimiento } = analisisNLP;
        
        // Agregar al historial
        this.historialConversacion.push({
            entrada: analisisNLP.textoOriginal,
            intencion: intencion.intencion,
            sentimiento: sentimiento,
            timestamp: analisisNLP.timestamp
        });

        // Mantener solo los últimos 10 intercambios
        if (this.historialConversacion.length > 10) {
            this.historialConversacion.shift();
        }

        let respuesta = '';
        
        switch (intencion.intencion) {
            case 'saludo':
                respuesta = this.seleccionarRespuestaAleatoria('saludos');
                this.contexto.saludoRealizado = true;
                break;
                
            case 'despedida':
                respuesta = this.seleccionarRespuestaAleatoria('despedidas');
                this.contexto.despedidaIniciada = true;
                break;
                
            case 'ayuda':
                respuesta = this.seleccionarRespuestaAleatoria('ayuda');
                break;
                
            case 'pregunta':
                respuesta = this.manejarPregunta(analisisNLP);
                break;
                
            case 'afirmacion':
                respuesta = this.manejarAfirmacion(analisisNLP);
                break;
                
            case 'negacion':
                respuesta = this.manejarNegacion(analisisNLP);
                break;
                
            case 'conversacion':
            default:
                respuesta = this.manejarConversacion(analisisNLP);
                break;
        }

        // Personalizar respuesta basada en el sentimiento
        respuesta = this.adaptarPorSentimiento(respuesta, sentimiento);
        
        // Agregar información contextual si es relevante
        if (entidades.emociones) {
            respuesta = this.adaptarPorEmocion(respuesta, entidades.emociones);
        }

        return respuesta;
    }

    manejarPregunta(analisisNLP) {
        const { tokens } = analisisNLP.intencion;
        
        // Preguntas básicas sobre el agente
        if (tokens.includes('nombre') || tokens.includes('eres')) {
            return `Soy ${this.config.agente.nombre}, tu asistente virtual. ¿En qué puedo ayudarte?`;
        }
        
        if (tokens.includes('hora') || tokens.includes('tiempo')) {
            const ahora = new Date();
            return `Son las ${ahora.getHours()}:${ahora.getMinutes().toString().padStart(2, '0')}.`;
        }
        
        if (tokens.includes('fecha')) {
            const hoy = new Date();
            return `Hoy es ${hoy.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}.`;
        }
        
        return "Es una pregunta interesante. ¿Podrías darme más detalles para poder ayudarte mejor?";
    }

    manejarAfirmacion(analisisNLP) {
        const respuestasAfirmacion = [
            "¡Perfecto! Me alegra que estés de acuerdo.",
            "Excelente, sigamos adelante.",
            "¡Genial! ¿Hay algo más en lo que pueda ayudarte?",
            "Me parece muy bien. ¿Continuamos?"
        ];
        
        const indice = Math.floor(Math.random() * respuestasAfirmacion.length);
        return respuestasAfirmacion[indice];
    }

    manejarNegacion(analisisNLP) {
        const respuestasNegacion = [
            "Entiendo, no hay problema. ¿Hay algo más que te gustaría hacer?",
            "Está bien, respeto tu decisión. ¿En qué más puedo ayudarte?",
            "No te preocupes, podemos hablar de otra cosa.",
            "Comprendo. ¿Hay algún otro tema que te interese?"
        ];
        
        const indice = Math.floor(Math.random() * respuestasNegacion.length);
        return respuestasNegacion[indice];
    }

    manejarConversacion(analisisNLP) {
        // Si es la primera interacción y no hubo saludo
        if (this.historialConversacion.length === 1 && !this.contexto.saludoRealizado) {
            return "¡Hola! Es un placer conocerte. " + this.seleccionarRespuestaAleatoria('conversacion');
        }
        
        // Respuesta contextual basada en conversaciones anteriores
        if (this.historialConversacion.length > 1) {
            const ultimaIntencion = this.historialConversacion[this.historialConversacion.length - 2].intencion;
            
            if (ultimaIntencion === 'pregunta') {
                return "Gracias por compartir eso conmigo. " + this.seleccionarRespuestaAleatoria('conversacion');
            }
        }
        
        return this.seleccionarRespuestaAleatoria('conversacion');
    }

    adaptarPorSentimiento(respuesta, sentimiento) {
        switch (sentimiento) {
            case 'positivo':
                return respuesta + " 😊";
            case 'negativo':
                return "Lamento que te sientas así. " + respuesta;
            default:
                return respuesta;
        }
    }

    adaptarPorEmocion(respuesta, emociones) {
        if (emociones.some(emocion => ['triste', 'preocupado', 'nervioso'].includes(emocion))) {
            return "Entiendo cómo te sientes. " + respuesta + " Estoy aquí para apoyarte.";
        }
        
        if (emociones.some(emocion => ['feliz', 'contento', 'alegre'].includes(emocion))) {
            return "¡Me alegra saber que te sientes bien! " + respuesta;
        }
        
        return respuesta;
    }

    obtenerEstadisticasConversacion() {
        const total = this.historialConversacion.length;
        const intenciones = {};
        const sentimientos = { positivo: 0, negativo: 0, neutral: 0 };
        
        this.historialConversacion.forEach(entrada => {
            intenciones[entrada.intencion] = (intenciones[entrada.intencion] || 0) + 1;
            sentimientos[entrada.sentimiento]++;
        });
        
        return {
            totalInteracciones: total,
            distribucionIntenciones: intenciones,
            distribucionSentimientos: sentimientos
        };
    }

    reiniciarContexto() {
        this.historialConversacion = [];
        this.contexto = {};
    }
}

module.exports = ResponseSystem;
    // ===== MÉTODOS PARA CALCULADORAS ESPECIALIZADAS =====
    
    esPreguntaCalculadora(textoOriginal, tokens) {
        const palabrasCalculadoraBasica = ['calcular', 'suma', 'sumar', 'números', 'operación', 'matemática', 'calculadora'];
        const palabrasCostosServicios = ['luz', 'agua', 'internet', 'servicios', 'costo', 'gastos', 'facturas', 'recibo'];
        const palabrasArriendo = ['arriendo', 'renta', 'sueldo', 'salario', 'alquiler', 'casa', 'apartamento'];
        
        const tieneCalculadoraBasica = palabrasCalculadoraBasica.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );
        
        const tieneServiciosBasicos = palabrasCostosServicios.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );
        
        const tieneArriendo = palabrasArriendo.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );

        return tieneCalculadoraBasica || tieneServiciosBasicos || tieneArriendo;
    }

    activarCalculadoraCorrespondiente(textoOriginal, tokens) {
        const palabrasCalculadoraBasica = ['calcular', 'suma', 'sumar', 'números', 'operación', 'matemática', 'calculadora'];
        const palabrasCostosServicios = ['luz', 'agua', 'internet', 'servicios', 'costo', 'gastos', 'facturas', 'recibo'];
        const palabrasArriendo = ['arriendo', 'renta', 'sueldo', 'salario', 'alquiler', 'casa', 'apartamento'];

        const esCalculadoraBasica = palabrasCalculadoraBasica.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );
        
        const esServiciosBasicos = palabrasCostosServicios.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );
        
        const esArriendo = palabrasArriendo.some(palabra => 
            textoOriginal.includes(palabra) || tokens.includes(palabra)
        );

        if (esCalculadoraBasica) {
            console.log('\n🧮 Activando calculadora básica...');
            setTimeout(() => {
                this.calculadoraTemporal.iniciarCalculadora('basica');
            }, 1000);
            
            return "¡Perfecto! Voy a activar la calculadora básica para ti. Te permitirá sumar números de forma progresiva y ver el resultado acumulado. ¡Prepárate para realizar tus cálculos! 🧮";
            
        } else if (esServiciosBasicos) {
            console.log('\n💡 Activando calculadora de costos de servicios...');
            setTimeout(() => {
                this.calculadoraTemporal.iniciarCalculadora('servicios');
            }, 1000);
            
            return "¡Excelente! Voy a activar el sistema de cálculo de costos de servicios. Podrás ingresar los valores mensuales de luz, agua, internet y gas, y te mostraré el desglose de costos por día, hora, minuto y segundo. ¡Muy útil para entender tus gastos! 💡💧🌐";
            
        } else if (esArriendo) {
            console.log('\n🏠 Activando calculadora de costos de arriendo y sueldo...');
            setTimeout(() => {
                this.calculadoraTemporal.iniciarCalculadora('arriendo');
            }, 1000);
            
            return "¡Genial! Activaré el sistema de cálculo para arriendo y sueldo. Te ayudará a desglosar estos costos importantes en períodos de tiempo más pequeños para una mejor planificación financiera. 🏠💰";
        }
        
        return "Detecté que quieres usar una calculadora, pero no pude determinar exactamente cuál. ¿Podrías ser más específico? Puedo ayudarte con: calculadora básica, costos de servicios, o costos de arriendo y sueldo.";
    }

    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(valor));
    }
}

module.exports = ResponseSystem;
