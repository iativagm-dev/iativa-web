const fs = require('fs');
const path = require('path');

class RecopiladorDatos {
    constructor() {
        this.config = this.cargarConfiguracion();
        this.reiniciarSesion();
    }

    cargarConfiguracion() {
        const configPath = path.join(__dirname, '../config/settings.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    }

    reiniciarSesion() {
        this.sesion = {
            nombreUsuario: null,
            pasoActual: 0,
            datosRecopilados: {},
            estadoFlujo: 'bienvenida',
            historial: [],
            timestamp: new Date().toISOString(),
            completado: false
        };
    }

    // Obtener el paso actual del flujo
    obtenerPasoActual() {
        const pasos = this.config.flujo.pasos;
        return pasos[this.sesion.pasoActual] || 'completado';
    }

    // Avanzar al siguiente paso
    avanzarPaso() {
        if (this.sesion.pasoActual < this.config.flujo.pasos.length - 1) {
            this.sesion.pasoActual++;
            this.sesion.estadoFlujo = this.obtenerPasoActual();
            return true;
        }
        this.sesion.completado = true;
        return false;
    }

    // Retroceder al paso anterior
    retrocederPaso() {
        if (this.sesion.pasoActual > 0) {
            this.sesion.pasoActual--;
            this.sesion.estadoFlujo = this.obtenerPasoActual();
            return true;
        }
        return false;
    }

    // Generar mensaje de bienvenida
    generarBienvenida() {
        const respuestas = this.config.respuestas.bienvenida;
        const respuestaAleatoria = respuestas[Math.floor(Math.random() * respuestas.length)];
        return respuestaAleatoria;
    }

    // Solicitar nombre del usuario
    solicitarNombre() {
        const respuestas = this.config.respuestas.solicitar_nombre;
        const respuestaAleatoria = respuestas[Math.floor(Math.random() * respuestas.length)];
        return respuestaAleatoria;
    }

    // Procesar nombre del usuario
    procesarNombre(nombre) {
        const nombreLimpio = nombre.trim();
        if (nombreLimpio.length >= 2 && nombreLimpio.length <= 50) {
            this.sesion.nombreUsuario = nombreLimpio;
            const motivacional = this.config.respuestas.motivacionales;
            const respuesta = motivacional[Math.floor(Math.random() * motivacional.length)];
            return {
                exito: true,
                mensaje: `${respuesta.replace('tu negocio', `tu negocio, ${nombreLimpio}`)}\n\n¡Empecemos con el análisis de costos! 💪`
            };
        }
        return {
            exito: false,
            mensaje: "Por favor, ingresa un nombre válido (entre 2 y 50 caracteres)."
        };
    }

    // Obtener el siguiente dato a solicitar
    obtenerSiguienteDato() {
        const costosConfig = this.config.datos_requeridos.costos;
        
        for (let i = 0; i < costosConfig.length; i++) {
            const campo = costosConfig[i];
            if (!this.sesion.datosRecopilados.hasOwnProperty(campo.nombre)) {
                return {
                    encontrado: true,
                    indice: i,
                    campo: campo,
                    progreso: `${i + 1}/${costosConfig.length}`,
                    porcentaje: Math.round(((i + 1) / costosConfig.length) * 100)
                };
            }
        }
        
        return {
            encontrado: false,
            mensaje: "¡Todos los datos han sido recopilados!"
        };
    }

    // Generar pregunta para el siguiente dato
    generarPregunta() {
        const siguienteDato = this.obtenerSiguienteDato();
        
        if (!siguienteDato.encontrado) {
            return siguienteDato.mensaje;
        }

        const { campo, progreso } = siguienteDato;
        const nombreUsuario = this.sesion.nombreUsuario ? `${this.sesion.nombreUsuario}, ` : '';
        
        let pregunta = `💡 **Paso ${progreso}**\n\n`;
        pregunta += `${nombreUsuario}${campo.pregunta}\n\n`;
        
        if (campo.tipo === 'porcentaje') {
            pregunta += `📝 *Ingresa un porcentaje entre ${campo.min}% y ${campo.max}%*\n`;
            pregunta += `Ejemplo: 25 (para 25% de ganancia)`;
        } else {
            pregunta += `📝 *Ingresa el valor en pesos. Si no aplica, escribe 0*\n`;
            pregunta += `Ejemplo: 15000`;
        }

        if (!campo.requerido) {
            pregunta += `\n\n⏭️ *Este campo es opcional. Puedes escribir "siguiente" para continuar.*`;
        }

        return pregunta;
    }

    // Validar y procesar respuesta del usuario
    procesarRespuesta(respuesta) {
        console.log('🔍 RECOPILADOR - Datos actuales:', Object.keys(this.sesion.datosRecopilados));
        console.log('🔍 RECOPILADOR - Respuesta recibida:', respuesta);
        
        const siguienteDato = this.obtenerSiguienteDato();
        console.log('🔍 RECOPILADOR - Siguiente dato encontrado:', siguienteDato.encontrado);
        if (siguienteDato.encontrado) {
            console.log('🔍 RECOPILADOR - Campo actual:', siguienteDato.campo.nombre);
        }
        
        if (!siguienteDato.encontrado) {
            return {
                exito: false,
                mensaje: "Ya se han recopilado todos los datos necesarios."
            };
        }

        const { campo } = siguienteDato;
        const respuestaLimpia = respuesta.trim().toLowerCase();

        // Verificar si quiere saltar campo opcional
        if (!campo.requerido && (respuestaLimpia === 'siguiente' || respuestaLimpia === 'continuar' || respuestaLimpia === 'skip')) {
            this.sesion.datosRecopilados[campo.nombre] = 0;
            
            const transiciones = this.config.respuestas.transiciones;
            const transicion = transiciones[Math.floor(Math.random() * transiciones.length)];
            
            return {
                exito: true,
                mensaje: `✅ Campo omitido. ${transicion}`,
                campoCompletado: campo.nombre,
                valor: 0
            };
        }

        // Procesar valor numérico
        let valor;
        if (campo.tipo === 'porcentaje') {
            valor = this.procesarPorcentaje(respuesta, campo.min, campo.max);
        } else {
            valor = this.procesarValorNumerico(respuesta);
        }

        if (valor === null) {
            return {
                exito: false,
                mensaje: `❌ Por favor, ingresa un valor válido para ${campo.pregunta.toLowerCase()}\n\n` +
                        `Ejemplo: ${campo.tipo === 'porcentaje' ? '25' : '15000'}`
            };
        }

        // Guardar el dato
        this.sesion.datosRecopilados[campo.nombre] = valor;
        console.log('🔍 RECOPILADOR - Dato guardado:', campo.nombre, '=', valor);
        console.log('🔍 RECOPILADOR - Total datos guardados:', Object.keys(this.sesion.datosRecopilados).length);
        
        // Registrar en historial
        this.sesion.historial.push({
            campo: campo.nombre,
            pregunta: campo.pregunta,
            valor: valor,
            timestamp: new Date().toISOString()
        });

        // Generar mensaje de confirmación
        const valorFormateado = campo.tipo === 'porcentaje' ? `${valor}%` : this.formatearMoneda(valor);
        
        const transiciones = this.config.respuestas.transiciones;
        const transicion = transiciones[Math.floor(Math.random() * transiciones.length)];
        
        let mensaje = `✅ Registrado: ${valorFormateado}`;
        
        // Verificar si hay más datos por recopilar
        const siguienteDatoProximo = this.obtenerSiguienteDato();
        console.log('🔍 RECOPILADOR - ¿Siguiente dato disponible?:', siguienteDatoProximo.encontrado);
        if (siguienteDatoProximo.encontrado) {
            console.log('🔍 RECOPILADOR - Próximo campo:', siguienteDatoProximo.campo.nombre);
        }
        if (siguienteDatoProximo.encontrado) {
            mensaje += `\n\n${transicion}`;
        } else {
            mensaje += `\n\n🎉 ¡Excelente! Ya tenemos todos los datos necesarios. Voy a procesar tus números...`;
        }

        return {
            exito: true,
            mensaje: mensaje,
            campoCompletado: campo.nombre,
            valor: valor,
            todosCompletos: !siguienteDatoProximo.encontrado
        };
    }

    // Procesar valor numérico
    procesarValorNumerico(valor) {
        if (valor === null || valor === undefined || valor === '') {
            return null;
        }
        
        const valorLimpio = valor.toString()
            .replace(/,/g, '.')
            .replace(/[^\d.-]/g, '');
        
        const numero = parseFloat(valorLimpio);
        
        if (isNaN(numero) || numero < 0) {
            return null;
        }
        
        return Math.round(numero * 100) / 100;
    }

    // Procesar porcentaje
    procesarPorcentaje(valor, min = 5, max = 100) {
        const numero = this.procesarValorNumerico(valor);
        
        if (numero === null || numero < min || numero > max) {
            return null;
        }
        
        return numero;
    }

    // Formatear moneda
    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    }

    // Verificar si la recopilación está completa
    estaCompleto() {
        const costosConfig = this.config.datos_requeridos.costos;
        const camposRequeridos = costosConfig.filter(campo => campo.requerido);
        
        return camposRequeridos.every(campo => 
            this.sesion.datosRecopilados.hasOwnProperty(campo.nombre) &&
            this.sesion.datosRecopilados[campo.nombre] !== null &&
            this.sesion.datosRecopilados[campo.nombre] !== undefined
        );
    }

    // Generar resumen de datos recopilados
    generarResumenDatos() {
        const nombreUsuario = this.sesion.nombreUsuario ? `${this.sesion.nombreUsuario}, ` : '';
        let resumen = `📋 **RESUMEN DE DATOS INGRESADOS**\n\n${nombreUsuario}estos son los datos que registraste:\n\n`;
        
        const costosConfig = this.config.datos_requeridos.costos;
        
        costosConfig.forEach((campo, index) => {
            const valor = this.sesion.datosRecopilados[campo.nombre];
            if (valor !== undefined && valor !== null) {
                const valorFormateado = campo.tipo === 'porcentaje' ? `${valor}%` : this.formatearMoneda(valor);
                const emoji = this.obtenerEmojiPorTipo(campo.nombre);
                resumen += `${emoji} ${campo.pregunta}: **${valorFormateado}**\n`;
            }
        });

        return resumen;
    }

    // Obtener emoji por tipo de costo
    obtenerEmojiPorTipo(tipo) {
        const emojis = {
            'materia_prima': '🛒',
            'mano_obra': '👷',
            'empaque': '📦',
            'servicios': '⚡',
            'transporte': '🚚',
            'marketing': '📱',
            'arriendo_sueldos': '🏢',
            'otros_costos': '💼',
            'margen_ganancia': '💰'
        };
        
        return emojis[tipo] || '📊';
    }

    // Obtener datos para cálculos
    obtenerDatosParaCalculos() {
        const datos = {
            costos: {},
            margen_ganancia: this.sesion.datosRecopilados.margen_ganancia || 20,
            nombreUsuario: this.sesion.nombreUsuario,
            timestamp: this.sesion.timestamp
        };

        // Copiar todos los datos excepto el margen de ganancia
        Object.entries(this.sesion.datosRecopilados).forEach(([clave, valor]) => {
            if (clave !== 'margen_ganancia') {
                datos.costos[clave] = valor;
            }
        });

        return datos;
    }

    // Obtener estadísticas de la sesión
    obtenerEstadisticasSesion() {
        return {
            nombreUsuario: this.sesion.nombreUsuario,
            pasoActual: this.sesion.pasoActual,
            estadoFlujo: this.sesion.estadoFlujo,
            datosRecopilados: Object.keys(this.sesion.datosRecopilados).length,
            totalDatos: this.config.datos_requeridos.costos.length,
            porcentajeCompletado: Math.round((Object.keys(this.sesion.datosRecopilados).length / this.config.datos_requeridos.costos.length) * 100),
            completado: this.estaCompleto(),
            timestamp: this.sesion.timestamp,
            duracionSesion: new Date().getTime() - new Date(this.sesion.timestamp).getTime()
        };
    }

    // Mostrar progreso
    mostrarProgreso() {
        const stats = this.obtenerEstadisticasSesion();
        const barraProgreso = this.generarBarraProgreso(stats.porcentajeCompletado);
        
        return `📊 **Progreso: ${stats.porcentajeCompletado}%**\n${barraProgreso}\n${stats.datosRecopilados}/${stats.totalDatos} datos completados`;
    }

    // Generar barra de progreso visual
    generarBarraProgreso(porcentaje) {
        const longitud = 20;
        const completado = Math.round((porcentaje / 100) * longitud);
        const pendiente = longitud - completado;
        
        return '█'.repeat(completado) + '░'.repeat(pendiente);
    }
}

module.exports = RecopiladorDatos;