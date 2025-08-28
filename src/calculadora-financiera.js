const fs = require('fs');
const path = require('path');

class CalculadoraFinanciera {
    constructor() {
        this.config = this.cargarConfiguracion();
    }

    cargarConfiguracion() {
        const configPath = path.join(__dirname, '../config/settings.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    }

    // Validar y procesar entrada numérica
    procesarValorNumerico(valor) {
        if (valor === null || valor === undefined || valor === '') {
            return 0;
        }
        
        // Convertir string a número, manejar comas como separador decimal
        const valorLimpio = valor.toString()
            .replace(/,/g, '.')
            .replace(/[^\d.-]/g, '');
        
        const numero = parseFloat(valorLimpio);
        return isNaN(numero) ? 0 : Math.max(0, numero);
    }

    // Validar porcentaje
    procesarPorcentaje(valor) {
        const numero = this.procesarValorNumerico(valor);
        return Math.max(5, Math.min(100, numero));
    }

    // Calcular costo total
    calcularCostoTotal(costos) {
        const costosProcesados = {
            materia_prima: this.procesarValorNumerico(costos.materia_prima),
            mano_obra: this.procesarValorNumerico(costos.mano_obra),
            empaque: this.procesarValorNumerico(costos.empaque),
            servicios: this.procesarValorNumerico(costos.servicios),
            transporte: this.procesarValorNumerico(costos.transporte),
            marketing: this.procesarValorNumerico(costos.marketing),
            arriendo_sueldos: this.procesarValorNumerico(costos.arriendo_sueldos),
            otros_costos: this.procesarValorNumerico(costos.otros_costos)
        };

        const total = Object.values(costosProcesados).reduce((sum, valor) => sum + valor, 0);
        
        return {
            costosProcesados,
            total: Math.round(total * 100) / 100
        };
    }

    // Calcular precio de venta sugerido
    calcularPrecioVenta(costoTotal, margenGanancia) {
        const margen = this.procesarPorcentaje(margenGanancia);
        const precioVenta = costoTotal * (1 + margen / 100);
        
        return {
            precio: Math.round(precioVenta * 100) / 100,
            margenAplicado: margen,
            utilidadUnitaria: Math.round((precioVenta - costoTotal) * 100) / 100
        };
    }

    // Clasificar costos en fijos y variables
    clasificarCostos(costos) {
        const costosVariables = [
            'materia_prima',
            'mano_obra',
            'empaque',
            'transporte'
        ];
        
        const costosFijos = [
            'servicios',
            'marketing',
            'arriendo_sueldos',
            'otros_costos'
        ];

        let totalVariables = 0;
        let totalFijos = 0;

        Object.entries(costos).forEach(([tipo, valor]) => {
            const valorProcesado = this.procesarValorNumerico(valor);
            if (costosVariables.includes(tipo)) {
                totalVariables += valorProcesado;
            } else if (costosFijos.includes(tipo)) {
                totalFijos += valorProcesado;
            }
        });

        return {
            costosVariables: Math.round(totalVariables * 100) / 100,
            costosFijos: Math.round(totalFijos * 100) / 100,
            detalleVariables: costosVariables.reduce((obj, tipo) => {
                obj[tipo] = this.procesarValorNumerico(costos[tipo]);
                return obj;
            }, {}),
            detalleFijos: costosFijos.reduce((obj, tipo) => {
                obj[tipo] = this.procesarValorNumerico(costos[tipo]);
                return obj;
            }, {})
        };
    }

    // Calcular punto de equilibrio
    calcularPuntoEquilibrio(costos, precioVenta) {
        const clasificacion = this.clasificarCostos(costos);
        const { costosFijos, costosVariables } = clasificacion;
        
        // Punto de equilibrio en unidades = Costos Fijos / (Precio de Venta - Costo Variable Unitario)
        const costoVariableUnitario = costosVariables;
        const margenContribucion = precioVenta - costoVariableUnitario;
        
        if (margenContribucion <= 0) {
            return {
                unidades: null,
                ventasEnPesos: null,
                error: "El margen de contribución es negativo. Revisa tu estructura de costos.",
                margenContribucion: margenContribucion
            };
        }
        
        const unidadesEquilibrio = Math.ceil(costosFijos / margenContribucion);
        const ventasEquilibrio = Math.round(unidadesEquilibrio * precioVenta * 100) / 100;
        
        return {
            unidades: unidadesEquilibrio,
            ventasEnPesos: ventasEquilibrio,
            margenContribucion: Math.round(margenContribucion * 100) / 100,
            costosFijos: costosFijos,
            costosVariables: costoVariableUnitario
        };
    }

    // Generar proyecciones de escenarios
    generarProyecciones(puntoEquilibrio, precioVenta, costos) {
        if (!puntoEquilibrio.unidades) {
            return {
                error: "No se pueden generar proyecciones sin punto de equilibrio válido"
            };
        }

        const { unidades: equilibrio, margenContribucion } = puntoEquilibrio;
        const clasificacion = this.clasificarCostos(costos);
        
        const escenarios = {
            pesimista: {
                nombre: "Pesimista (-20%)",
                unidadesVendidas: Math.floor(equilibrio * 0.8),
                porcentaje: -20
            },
            realista: {
                nombre: "Realista (Equilibrio)",
                unidadesVendidas: equilibrio,
                porcentaje: 0
            },
            optimista: {
                nombre: "Optimista (+20%)",
                unidadesVendidas: Math.ceil(equilibrio * 1.2),
                porcentaje: 20
            }
        };

        const proyecciones = {};
        
        Object.entries(escenarios).forEach(([tipo, escenario]) => {
            const ventasTotales = escenario.unidadesVendidas * precioVenta;
            const costosVariablesTotales = escenario.unidadesVendidas * clasificacion.costosVariables;
            const utilidadBruta = ventasTotales - costosVariablesTotales - clasificacion.costosFijos;
            
            proyecciones[tipo] = {
                ...escenario,
                ventasTotales: Math.round(ventasTotales * 100) / 100,
                costosVariablesTotales: Math.round(costosVariablesTotales * 100) / 100,
                costosFijos: clasificacion.costosFijos,
                costoTotal: Math.round((costosVariablesTotales + clasificacion.costosFijos) * 100) / 100,
                utilidadNeta: Math.round(utilidadBruta * 100) / 100,
                margenUtilidad: ventasTotales > 0 ? Math.round((utilidadBruta / ventasTotales) * 10000) / 100 : 0
            };
        });

        return proyecciones;
    }

    // Generar análisis de sensibilidad
    analizarSensibilidad(costoTotal, precioVenta, puntoEquilibrio) {
        const analisis = {
            incrementosCosto: [],
            incrementosPrecio: [],
            impactoEquilibrio: []
        };

        // Analizar impacto de incrementos en costos
        const incrementosCosto = [-10, -5, 5, 10, 15, 20];
        incrementosCosto.forEach(porcentaje => {
            const nuevoCosto = costoTotal * (1 + porcentaje / 100);
            const nuevoMargen = ((precioVenta - nuevoCosto) / precioVenta) * 100;
            
            analisis.incrementosCosto.push({
                incrementoPorcentaje: porcentaje,
                nuevoCostoTotal: Math.round(nuevoCosto * 100) / 100,
                nuevoMargenUtilidad: Math.round(nuevoMargen * 100) / 100,
                utilidadUnitaria: Math.round((precioVenta - nuevoCosto) * 100) / 100
            });
        });

        // Analizar impacto de incrementos en precio
        const incrementosPrecio = [-10, -5, 5, 10, 15, 20];
        incrementosPrecio.forEach(porcentaje => {
            const nuevoPrecio = precioVenta * (1 + porcentaje / 100);
            const nuevoMargen = ((nuevoPrecio - costoTotal) / nuevoPrecio) * 100;
            
            analisis.incrementosPrecio.push({
                incrementoPorcentaje: porcentaje,
                nuevoPrecioVenta: Math.round(nuevoPrecio * 100) / 100,
                nuevoMargenUtilidad: Math.round(nuevoMargen * 100) / 100,
                utilidadUnitaria: Math.round((nuevoPrecio - costoTotal) * 100) / 100
            });
        });

        return analisis;
    }

    // Método principal para realizar todos los cálculos
    calcularCompleto(datosCostos) {
        try {
            // 1. Calcular costo total
            const resultadoCostos = this.calcularCostoTotal(datosCostos.costos);
            
            // 2. Calcular precio de venta
            const resultadoPrecio = this.calcularPrecioVenta(
                resultadoCostos.total,
                datosCostos.margen_ganancia
            );
            
            // 3. Clasificar costos
            const clasificacion = this.clasificarCostos(datosCostos.costos);
            
            // 4. Calcular punto de equilibrio
            const puntoEquilibrio = this.calcularPuntoEquilibrio(
                datosCostos.costos,
                resultadoPrecio.precio
            );
            
            // 5. Generar proyecciones
            const proyecciones = this.generarProyecciones(
                puntoEquilibrio,
                resultadoPrecio.precio,
                datosCostos.costos
            );
            
            // 6. Análisis de sensibilidad
            const sensibilidad = this.analizarSensibilidad(
                resultadoCostos.total,
                resultadoPrecio.precio,
                puntoEquilibrio
            );

            return {
                exito: true,
                timestamp: new Date().toISOString(),
                resumen: {
                    costoTotal: resultadoCostos.total,
                    precioVentaSugerido: resultadoPrecio.precio,
                    margenUtilidad: resultadoPrecio.margenAplicado,
                    utilidadUnitaria: resultadoPrecio.utilidadUnitaria
                },
                detalles: {
                    costos: resultadoCostos.costosProcesados,
                    clasificacion: clasificacion,
                    precio: resultadoPrecio,
                    puntoEquilibrio: puntoEquilibrio,
                    proyecciones: proyecciones,
                    sensibilidad: sensibilidad
                }
            };
            
        } catch (error) {
            return {
                exito: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Formatear número como moneda
    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    }

    // Formatear porcentaje
    formatearPorcentaje(valor) {
        return `${valor.toFixed(1)}%`;
    }

    // Generar resumen amigable
    generarResumenAmigable(resultados, nombreUsuario = '') {
        if (!resultados.exito) {
            return `Lo siento ${nombreUsuario}, hubo un error en los cálculos: ${resultados.error}`;
        }

        const { resumen, detalles } = resultados;
        const saludo = nombreUsuario ? `${nombreUsuario}, ` : '';
        
        let texto = `¡Perfecto ${saludo}aquí tienes los resultados de tu análisis financiero! 📊\n\n`;
        
        // Resumen principal
        texto += `💰 **RESUMEN PRINCIPAL**\n`;
        texto += `• Tu costo total es: ${this.formatearMoneda(resumen.costoTotal)}\n`;
        texto += `• Tu precio de venta sugerido es: ${this.formatearMoneda(resumen.precioVentaSugerido)}\n`;
        texto += `• Tu utilidad por unidad será: ${this.formatearMoneda(resumen.utilidadUnitaria)}\n`;
        texto += `• Margen de ganancia aplicado: ${this.formatearPorcentaje(resumen.margenUtilidad)}\n\n`;

        // Punto de equilibrio
        if (detalles.puntoEquilibrio.unidades) {
            texto += `⚖️ **PUNTO DE EQUILIBRIO**\n`;
            texto += `• Necesitas vender: ${detalles.puntoEquilibrio.unidades} unidades\n`;
            texto += `• Equivalente a: ${this.formatearMoneda(detalles.puntoEquilibrio.ventasEnPesos)} en ventas\n`;
            texto += `• Margen de contribución: ${this.formatearMoneda(detalles.puntoEquilibrio.margenContribucion)} por unidad\n\n`;
        }

        // Proyecciones
        if (detalles.proyecciones && !detalles.proyecciones.error) {
            texto += `🎯 **PROYECCIONES DE ESCENARIOS**\n`;
            
            Object.entries(detalles.proyecciones).forEach(([tipo, escenario]) => {
                const emoji = tipo === 'optimista' ? '📈' : tipo === 'realista' ? '📊' : '📉';
                const estado = escenario.utilidadNeta > 0 ? 'GANANCIA' : 'PÉRDIDA';
                
                texto += `${emoji} **${escenario.nombre}**: ${escenario.unidadesVendidas} unidades\n`;
                texto += `   - Ventas: ${this.formatearMoneda(escenario.ventasTotales)}\n`;
                texto += `   - ${estado}: ${this.formatearMoneda(Math.abs(escenario.utilidadNeta))}\n`;
                texto += `   - Margen: ${this.formatearPorcentaje(escenario.margenUtilidad)}\n\n`;
            });
        }

        return texto;
    }
}

module.exports = CalculadoraFinanciera;