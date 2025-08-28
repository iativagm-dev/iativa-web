const fs = require('fs');
const path = require('path');

class NLP {
    constructor() {
        this.config = this.cargarConfiguracion();
        this.palabrasVacias = new Set(this.config.nlp.palabrasVacias);
        this.patrones = this.config.nlp.patrones;
    }

    cargarConfiguracion() {
        const configPath = path.join(__dirname, '../config/settings.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    }

    limpiarTexto(texto) {
        return texto
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    tokenizar(texto) {
        const textoLimpio = this.limpiarTexto(texto);
        return textoLimpio.split(' ').filter(palabra => 
            palabra.length > 0 && !this.palabrasVacias.has(palabra)
        );
    }

    detectarIntencion(texto) {
        const tokens = this.tokenizar(texto);
        const textoLimpio = this.limpiarTexto(texto);
        
        // Detectar patrones específicos
        for (const [intencion, palabrasClave] of Object.entries(this.patrones)) {
            for (const palabraClave of palabrasClave) {
                if (textoLimpio.includes(palabraClave.toLowerCase())) {
                    return {
                        intencion: intencion,
                        confianza: this.calcularConfianza(textoLimpio, palabraClave),
                        tokens: tokens
                    };
                }
            }
        }

        // Si no se detecta una intención específica, clasificar como conversación
        return {
            intencion: 'conversacion',
            confianza: 0.3,
            tokens: tokens
        };
    }

    calcularConfianza(texto, palabraClave) {
        const longitud = texto.length;
        const longitudPalabra = palabraClave.length;
        
        if (texto === palabraClave.toLowerCase()) {
            return 1.0;
        }
        
        return Math.min(0.9, (longitudPalabra / longitud) * 2);
    }

    extraerEntidades(texto) {
        const entidades = {};
        const tokens = this.tokenizar(texto);
        
        // Detectar números
        const numeros = texto.match(/\d+/g);
        if (numeros) {
            entidades.numeros = numeros.map(num => parseInt(num));
        }
        
        // Detectar fechas simples (día/mes/año)
        const fechas = texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
        if (fechas) {
            entidades.fechas = fechas;
        }
        
        // Detectar emociones básicas
        const emociones = ['feliz', 'triste', 'enojado', 'contento', 'preocupado', 'nervioso'];
        const emocionesDetectadas = tokens.filter(token => 
            emociones.some(emocion => token.includes(emocion))
        );
        
        if (emocionesDetectadas.length > 0) {
            entidades.emociones = emocionesDetectadas;
        }
        
        return entidades;
    }

    analizarSentimiento(texto) {
        const palabrasPositivas = ['bueno', 'excelente', 'genial', 'perfecto', 'increíble', 'fantástico', 'maravilloso', 'feliz', 'contento', 'alegre'];
        const palabrasNegativas = ['malo', 'terrible', 'horrible', 'pésimo', 'awful', 'triste', 'enojado', 'molesto', 'frustrado', 'decepcionado'];
        
        const tokens = this.tokenizar(texto);
        let puntuacion = 0;
        
        tokens.forEach(token => {
            if (palabrasPositivas.some(palabra => token.includes(palabra))) {
                puntuacion += 1;
            }
            if (palabrasNegativas.some(palabra => token.includes(palabra))) {
                puntuacion -= 1;
            }
        });
        
        if (puntuacion > 0) return 'positivo';
        if (puntuacion < 0) return 'negativo';
        return 'neutral';
    }

    procesarEntrada(texto) {
        const intencion = this.detectarIntencion(texto);
        const entidades = this.extraerEntidades(texto);
        const sentimiento = this.analizarSentimiento(texto);
        
        return {
            textoOriginal: texto,
            intencion: intencion,
            entidades: entidades,
            sentimiento: sentimiento,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = NLP;