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