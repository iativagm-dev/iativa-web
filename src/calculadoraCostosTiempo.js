/**
 * Calculadora de Costos por Tiempo
 * Módulo modular y reutilizable para calcular costos desglosados por diferentes unidades de tiempo
 */

class CalculadoraCostosTiempo {
    constructor() {
        this.servicios = {
            arriendo: { nombre: 'Arriendo', icono: '🏠' },
            internet: { nombre: 'Internet', icono: '🌐' },
            gas: { nombre: 'Gas', icono: '🔥' },
            agua: { nombre: 'Agua', icono: '💧' },
            electricidad: { nombre: 'Electricidad', icono: '⚡' },
            otro: { nombre: 'Otro servicio', icono: '📊' }
        };
    }

    validarValor(valor) {
        const numero = parseFloat(valor);
        
        if (isNaN(numero)) {
            return {
                valido: false,
                error: 'El valor debe ser numérico',
                valor: null
            };
        }
        
        if (numero < 0) {
            return {
                valido: false,
                error: 'El valor debe ser positivo (mayor o igual a 0)',
                valor: null
            };
        }
        
        return {
            valido: true,
            error: null,
            valor: numero
        };
    }

    calcularCostosDesglosados(valorMensual, nombreServicio = 'Servicio') {
        const validacion = this.validarValor(valorMensual);
        if (!validacion.valido) {
            return {
                error: validacion.error,
                valido: false
            };
        }

        const valor = validacion.valor;
        const costoDiario = valor / 30;
        const costoPorHora = costoDiario / 24;
        const costoPorMinuto = costoPorHora / 60;
        const costoPorSegundo = costoPorMinuto / 60;

        const infoServicio = this.servicios[nombreServicio.toLowerCase()] || {
            nombre: nombreServicio,
            icono: '📊'
        };

        return {
            valido: true,
            servicio: infoServicio.nombre,
            icono: infoServicio.icono,
            valorMensual: valor,
            costos: {
                mensual: { valor: valor, descripcion: 'Costo mensual' },
                diario: { valor: costoDiario, descripcion: 'Costo diario' },
                porHora: { valor: costoPorHora, descripcion: 'Costo por hora' },
                porMinuto: { valor: costoPorMinuto, descripcion: 'Costo por minuto' },
                porSegundo: { valor: costoPorSegundo, descripcion: 'Costo por segundo' }
            },
            fechaCalculo: new Date().toISOString()
        };
    }

    calcularMultiplesServicios(serviciosValores) {
        const resultados = {};
        const errores = {};
        let totalMensual = 0;

        for (const [servicio, valor] of Object.entries(serviciosValores)) {
            if (valor && valor !== '') {
                const calculo = this.calcularCostosDesglosados(valor, servicio);
                
                if (calculo.valido) {
                    resultados[servicio] = calculo;
                    totalMensual += calculo.valorMensual;
                } else {
                    errores[servicio] = calculo.error;
                }
            }
        }

        let totales = null;
        if (Object.keys(resultados).length > 0 && totalMensual > 0) {
            totales = this.calcularCostosDesglosados(totalMensual, 'Total');
            totales.servicio = 'Total de todos los servicios';
            totales.icono = '💰';
        }

        return {
            resultados,
            errores,
            totales,
            cantidadServicios: Object.keys(resultados).length,
            fechaCalculo: new Date().toISOString()
        };
    }

    formatearMoneda(valor, decimales = 2) {
        if (typeof valor !== 'number') return '$0';
        
        if (valor < 0.01 && valor > 0) {
            decimales = 6;
        } else if (valor < 1 && valor > 0) {
            decimales = 4;
        }
        
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        }).format(valor);
    }
}

module.exports = CalculadoraCostosTiempo;
