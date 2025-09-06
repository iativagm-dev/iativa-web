const readline = require('readline');

class CalculadoraTemporal {
    constructor() {
        this.serviciosActivos = {};
        this.rl = null;
        this.configurarReadline();
    }

    configurarReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    validarEntradaNumerica(valor) {
        if (valor === null || valor === undefined || valor === '') {
            return { valido: false, error: 'El valor no puede estar vacío' };
        }

        const valorLimpio = valor.toString()
            .replace(/[\$,\s]/g, '')
            .replace(/,/g, '.')
            .replace(/[^\d.-]/g, '');

        const numero = parseFloat(valorLimpio);

        if (isNaN(numero)) {
            return { valido: false, error: 'El valor ingresado no es un número válido' };
        }

        if (numero < 0) {
            return { valido: false, error: 'El valor debe ser positivo (mayor o igual a 0)' };
        }

        return { valido: true, valor: numero };
    }

    calcularCostosTemporales(valorMensual) {
        const validacion = this.validarEntradaNumerica(valorMensual);
        
        if (!validacion.valido) {
            throw new Error(validacion.error);
        }

        const costoMensual = validacion.valor;
        
        return {
            mensual: costoMensual,
            diario: costoMensual / 30,
            porHora: (costoMensual / 30) / 24,
            porMinuto: ((costoMensual / 30) / 24) / 60,
            porSegundo: (((costoMensual / 30) / 24) / 60) / 60
        };
    }

    formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(valor));
    }

    formatearDecimales(valor, decimales) {
        if (valor < 1000) {
            return `$${valor.toFixed(decimales)}`;
        } else {
            return this.formatearMoneda(valor);
        }
    }

    procesarConsulta(tipoConsulta, datos = null) {
        try {
            switch (tipoConsulta) {
                case 'calcular_temporal':
                    return this.calcularCostosTemporales(datos.valor);
                case 'validar_numero':
                    return this.validarEntradaNumerica(datos.valor);
                default:
                    throw new Error('Tipo de consulta no reconocido');
            }
        } catch (error) {
            return { error: true, mensaje: error.message };
        }
    }

    cerrar() {
        if (this.rl) {
            this.rl.close();
        }
    }

    async iniciarCalculadora(tipo = 'basica') {
        console.log('🧮 === SISTEMA DE CALCULADORA MEJORADO ===');
        console.log('Tipo:', tipo);
        console.log('✅ Calculadora activada correctamente!');
        
        setTimeout(() => {
            console.log('Para esta demo, la calculadora se cerrará automáticamente.');
            this.cerrar();
        }, 2000);
    }
}

module.exports = CalculadoraTemporal;
