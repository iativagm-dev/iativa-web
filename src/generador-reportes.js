const fs = require('fs');
const path = require('path');

class GeneradorReportes {
    constructor() {
        this.config = this.cargarConfiguracion();
    }

    cargarConfiguracion() {
        const configPath = path.join(__dirname, '../config/settings.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
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

    // Formatear porcentaje
    formatearPorcentaje(valor) {
        return `${valor.toFixed(1)}%`;
    }

    // Formatear fecha
    formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Obtener estilos CSS como string separado
    obtenerEstilosCSS() {
        return `<style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6; color: #333; background: #f8fafc; padding: 20px; 
        }
        .container {
            max-width: 900px; margin: 0 auto; background: white; border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 40px; text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; font-weight: 300; }
        .header .subtitle { font-size: 1.2em; opacity: 0.9; margin-bottom: 20px; }
        .header .meta { font-size: 0.9em; opacity: 0.8; }
        .content { padding: 40px; }
        .section { margin-bottom: 40px; }
        .section h2 {
            color: #2d3748; font-size: 1.8em; margin-bottom: 20px;
            padding-bottom: 10px; border-bottom: 3px solid #667eea;
        }
        .grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .card {
            background: #f7fafc; border: 1px solid #e2e8f0;
            border-radius: 8px; padding: 20px;
        }
        .card.highlight { background: #e6fffa; border-color: #38b2ac; }
        .card.warning { background: #fffaf0; border-color: #ed8936; }
        .card.danger { background: #fed7d7; border-color: #e53e3e; }
        .card-title { font-weight: 600; color: #2d3748; margin-bottom: 8px; }
        .card-value { font-size: 1.5em; font-weight: 700; color: #667eea; }
        .card-subtitle { font-size: 0.9em; color: #718096; margin-top: 4px; }
        .data-table {
            width: 100%; border-collapse: collapse; margin: 20px 0;
            background: white; border-radius: 8px; overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .data-table th, .data-table td {
            padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0;
        }
        .data-table th {
            background: #667eea; color: white; font-weight: 600;
            text-transform: uppercase; font-size: 0.85em; letter-spacing: 0.5px;
        }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:nth-child(even) { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-green { color: #38a169; font-weight: 600; }
        .text-red { color: #e53e3e; font-weight: 600; }
        .text-blue { color: #667eea; font-weight: 600; }
        .recommendations {
            background: #f0fff4; border: 1px solid #38a169;
            border-radius: 8px; padding: 20px; margin: 20px 0;
        }
        .recommendations h4 { color: #2f855a; margin-bottom: 15px; }
        .recommendations ul { list-style: none; }
        .recommendations li {
            margin-bottom: 10px; padding-left: 25px; position: relative;
        }
        .recommendations li:before { content: "✅"; position: absolute; left: 0; }
        .footer {
            background: #2d3748; color: white; padding: 30px 40px; text-align: center;
        }
        .footer p { margin-bottom: 10px; }
        .logo { font-size: 1.5em; font-weight: 700; margin-bottom: 10px; }
        .contact { font-size: 0.9em; opacity: 0.8; }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; border-radius: 0; }
        }
    </style>`;
    }

    // Generar reporte en formato HTML (base para PDF)
    generarReporteHTML(datosOriginales, resultadosCalculos) {
        const { nombreUsuario = 'Emprendedor', timestamp } = datosOriginales;
        const { resumen, detalles } = resultadosCalculos;

        const estilos = this.obtenerEstilosCSS();
        const contenido = [
            this.generarSeccionResumen(resumen),
            this.generarSeccionCostos(detalles.costos, detalles.clasificacion),
            this.generarSeccionPuntoEquilibrio(detalles.puntoEquilibrio),
            this.generarSeccionProyecciones(detalles.proyecciones),
            this.generarSeccionRecomendaciones()
        ].join('');

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Costeo y Proyecciones - ${nombreUsuario}</title>
    ${estilos}
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 IAtiva - Reporte Financiero</h1>
            <div class="subtitle">Análisis de Costeo y Proyecciones</div>
            <div class="meta">
                <strong>Cliente:</strong> ${nombreUsuario} | 
                <strong>Fecha:</strong> ${this.formatearFecha(timestamp)}
            </div>
        </div>
        
        <div class="content">
            ${contenido}
        </div>
        
        <div class="footer">
            <div class="logo">IAtiva - Tu aliado en crecimiento financiero</div>
            <div class="contact">
                📧 ${this.config.agente.contacto} | 
                💼 Asesoría Virtual Especializada en Costeo y Proyecciones
            </div>
            <p style="margin-top: 20px; font-size: 0.8em;">Este reporte fue generado automáticamente por el sistema IAtiva.</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    // Generar sección de resumen
    generarSeccionResumen(resumen) {
        return `
            <div class="section">
                <h2>📊 Resumen Ejecutivo</h2>
                <div class="grid">
                    <div class="card highlight">
                        <div class="card-title">Costo Total</div>
                        <div class="card-value">${this.formatearMoneda(resumen.costoTotal)}</div>
                        <div class="card-subtitle">Inversión total por unidad</div>
                    </div>
                    <div class="card highlight">
                        <div class="card-title">Precio Sugerido</div>
                        <div class="card-value">${this.formatearMoneda(resumen.precioVentaSugerido)}</div>
                        <div class="card-subtitle">Precio de venta recomendado</div>
                    </div>
                    <div class="card highlight">
                        <div class="card-title">Utilidad Unitaria</div>
                        <div class="card-value text-green">${this.formatearMoneda(resumen.utilidadUnitaria)}</div>
                        <div class="card-subtitle">Ganancia por unidad vendida</div>
                    </div>
                    <div class="card highlight">
                        <div class="card-title">Margen de Utilidad</div>
                        <div class="card-value text-blue">${this.formatearPorcentaje(resumen.margenUtilidad)}</div>
                        <div class="card-subtitle">Porcentaje de ganancia aplicado</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generar sección de costos
    generarSeccionCostos(costos, clasificacion) {
        let tablaCostos = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Valor</th>
                        <th>Tipo</th>
                        <th>% del Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const total = clasificacion.costosVariables + clasificacion.costosFijos;
        const conceptos = {
            'materia_prima': { nombre: 'Materia Prima/Insumos', tipo: 'Variable' },
            'mano_obra': { nombre: 'Mano de Obra Directa', tipo: 'Variable' },
            'empaque': { nombre: 'Empaque/Presentación', tipo: 'Variable' },
            'transporte': { nombre: 'Transporte/Distribución', tipo: 'Variable' },
            'servicios': { nombre: 'Servicios (Luz, Agua, Internet)', tipo: 'Fijo' },
            'marketing': { nombre: 'Marketing y Publicidad', tipo: 'Fijo' },
            'arriendo_sueldos': { nombre: 'Arriendo/Sueldos Admin.', tipo: 'Fijo' },
            'otros_costos': { nombre: 'Otros Costos Fijos', tipo: 'Fijo' }
        };

        Object.entries(costos).forEach(([clave, valor]) => {
            if (valor > 0 && conceptos[clave]) {
                const porcentaje = total > 0 ? ((valor / total) * 100).toFixed(1) : '0.0';
                const concepto = conceptos[clave];
                
                tablaCostos += `
                    <tr>
                        <td>${concepto.nombre}</td>
                        <td class="text-right">${this.formatearMoneda(valor)}</td>
                        <td class="text-center">${concepto.tipo}</td>
                        <td class="text-right">${porcentaje}%</td>
                    </tr>
                `;
            }
        });

        tablaCostos += `
                </tbody>
            </table>
            
            <div class="grid">
                <div class="card">
                    <div class="card-title">Costos Variables</div>
                    <div class="card-value text-blue">${this.formatearMoneda(clasificacion.costosVariables)}</div>
                    <div class="card-subtitle">Varían con la producción</div>
                </div>
                <div class="card">
                    <div class="card-title">Costos Fijos</div>
                    <div class="card-value text-blue">${this.formatearMoneda(clasificacion.costosFijos)}</div>
                    <div class="card-subtitle">Se mantienen constantes</div>
                </div>
            </div>
        `;

        return `
            <div class="section">
                <h2>💰 Análisis de Costos</h2>
                ${tablaCostos}
            </div>
        `;
    }

    // Generar sección de punto de equilibrio
    generarSeccionPuntoEquilibrio(puntoEquilibrio) {
        if (!puntoEquilibrio.unidades) {
            return `
                <div class="section">
                    <h2>⚖️ Punto de Equilibrio</h2>
                    <div class="card danger">
                        <div class="card-title">Error en Cálculo</div>
                        <div class="card-value">No calculable</div>
                        <div class="card-subtitle">${puntoEquilibrio.error || 'Estructura de costos inválida'}</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="section">
                <h2>⚖️ Punto de Equilibrio</h2>
                <p>El punto de equilibrio indica cuántas unidades necesitas vender para cubrir todos tus costos sin generar pérdidas ni ganancias.</p>
                
                <div class="grid">
                    <div class="card warning">
                        <div class="card-title">Unidades a Vender</div>
                        <div class="card-value">${puntoEquilibrio.unidades} unidades</div>
                        <div class="card-subtitle">Mínimo para no perder</div>
                    </div>
                    <div class="card warning">
                        <div class="card-title">Ventas Mínimas</div>
                        <div class="card-value">${this.formatearMoneda(puntoEquilibrio.ventasEnPesos)}</div>
                        <div class="card-subtitle">Ingresos necesarios</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Margen de Contribución</div>
                        <div class="card-value text-green">${this.formatearMoneda(puntoEquilibrio.margenContribucion)}</div>
                        <div class="card-subtitle">Por cada unidad vendida</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generar sección de proyecciones
    generarSeccionProyecciones(proyecciones) {
        if (!proyecciones || proyecciones.error) {
            return `
                <div class="section">
                    <h2>🎯 Proyecciones de Escenarios</h2>
                    <div class="card danger">
                        <div class="card-title">No Disponible</div>
                        <div class="card-value">Error en cálculo</div>
                    </div>
                </div>
            `;
        }

        let tablaProyecciones = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Escenario</th>
                        <th>Unidades</th>
                        <th>Ventas Totales</th>
                        <th>Costos Totales</th>
                        <th>Utilidad/Pérdida</th>
                        <th>Margen %</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(proyecciones).forEach(([tipo, escenario]) => {
            const utilidadClase = escenario.utilidadNeta >= 0 ? 'text-green' : 'text-red';
            const utilidadTexto = escenario.utilidadNeta >= 0 ? 'Utilidad' : 'Pérdida';
            
            tablaProyecciones += `
                <tr>
                    <td><strong>${escenario.nombre}</strong></td>
                    <td class="text-center">${escenario.unidadesVendidas}</td>
                    <td class="text-right">${this.formatearMoneda(escenario.ventasTotales)}</td>
                    <td class="text-right">${this.formatearMoneda(escenario.costoTotal)}</td>
                    <td class="text-right ${utilidadClase}">${this.formatearMoneda(Math.abs(escenario.utilidadNeta))} (${utilidadTexto})</td>
                    <td class="text-right ${utilidadClase}">${this.formatearPorcentaje(escenario.margenUtilidad)}</td>
                </tr>
            `;
        });

        tablaProyecciones += `
                </tbody>
            </table>
        `;

        return `
            <div class="section">
                <h2>🎯 Proyecciones de Escenarios</h2>
                <p>Estas proyecciones te ayudan a entender qué sucede en diferentes niveles de ventas:</p>
                ${tablaProyecciones}
            </div>
        `;
    }

    // Generar sección de recomendaciones
    generarSeccionRecomendaciones() {
        const recomendacionesMarketing = this.config.recomendaciones_marketing.slice(0, 5);
        const consejosOptimizacion = this.config.consejos_optimizacion.slice(0, 5);
        
        return `
            <div class="section">
                <h2>💡 Recomendaciones Estratégicas</h2>
                
                <div class="recommendations">
                    <h4>📈 Estrategias de Marketing</h4>
                    <ul>
                        ${recomendacionesMarketing.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="recommendations">
                    <h4>🔧 Optimización de Costos</h4>
                    <ul>
                        ${consejosOptimizacion.map(consejo => `<li>${consejo}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="card highlight" style="margin-top: 30px;">
                    <div class="card-title">💼 Próximos Pasos Recomendados</div>
                    <div style="margin-top: 15px;">
                        <p><strong>1.</strong> Validar el precio sugerido con tu mercado objetivo</p>
                        <p><strong>2.</strong> Implementar al menos 3 estrategias de marketing</p>
                        <p><strong>3.</strong> Monitorear costos mensualmente y ajustar precios según sea necesario</p>
                        <p><strong>4.</strong> Trabajar para superar el punto de equilibrio en los primeros 3 meses</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Generar reporte en formato de texto plano
    generarReporteTexto(datosOriginales, resultadosCalculos) {
        const { nombreUsuario = 'Emprendedor', timestamp } = datosOriginales;
        const { resumen, detalles } = resultadosCalculos;
        const fecha = this.formatearFecha(timestamp);

        let reporte = `
==============================================
🧠 IATIVA - REPORTE DE COSTEO Y PROYECCIONES
==============================================

Cliente: ${nombreUsuario}
Fecha: ${fecha}
Generado por: IAtiva - Tu aliado en crecimiento financiero

`;

        // Resumen ejecutivo
        reporte += `
📊 RESUMEN EJECUTIVO
${'='.repeat(50)}

`;
        reporte += `• Costo Total: ${this.formatearMoneda(resumen.costoTotal)}\n`;
        reporte += `• Precio de Venta Sugerido: ${this.formatearMoneda(resumen.precioVentaSugerido)}\n`;
        reporte += `• Utilidad Unitaria: ${this.formatearMoneda(resumen.utilidadUnitaria)}\n`;
        reporte += `• Margen de Utilidad: ${this.formatearPorcentaje(resumen.margenUtilidad)}\n`;

        // Análisis de costos
        reporte += `\n💰 ANÁLISIS DE COSTOS\n${'='.repeat(50)}\n\n`;
        reporte += `Costos Variables: ${this.formatearMoneda(detalles.clasificacion.costosVariables)}\n`;
        reporte += `Costos Fijos: ${this.formatearMoneda(detalles.clasificacion.costosFijos)}\n\n`;

        // Desglose de costos
        const conceptos = {
            'materia_prima': 'Materia Prima/Insumos',
            'mano_obra': 'Mano de Obra Directa',
            'empaque': 'Empaque/Presentación',
            'servicios': 'Servicios (Luz, Agua, Internet)',
            'transporte': 'Transporte/Distribución',
            'marketing': 'Marketing y Publicidad',
            'arriendo_sueldos': 'Arriendo/Sueldos Admin.',
            'otros_costos': 'Otros Costos Fijos'
        };

        reporte += `Desglose detallado:\n`;
        Object.entries(detalles.costos).forEach(([clave, valor]) => {
            if (valor > 0 && conceptos[clave]) {
                reporte += `• ${conceptos[clave]}: ${this.formatearMoneda(valor)}\n`;
            }
        });

        // Punto de equilibrio
        reporte += `\n⚖️ PUNTO DE EQUILIBRIO\n${'='.repeat(50)}\n\n`;
        if (detalles.puntoEquilibrio.unidades) {
            reporte += `• Unidades a vender: ${detalles.puntoEquilibrio.unidades} unidades\n`;
            reporte += `• Ventas mínimas: ${this.formatearMoneda(detalles.puntoEquilibrio.ventasEnPesos)}\n`;
            reporte += `• Margen de contribución: ${this.formatearMoneda(detalles.puntoEquilibrio.margenContribucion)} por unidad\n`;
        } else {
            reporte += `• Error: ${detalles.puntoEquilibrio.error || 'No se pudo calcular'}\n`;
        }

        // Proyecciones
        if (detalles.proyecciones && !detalles.proyecciones.error) {
            reporte += `\n🎯 PROYECCIONES DE ESCENARIOS\n${'='.repeat(50)}\n\n`;
            
            Object.entries(detalles.proyecciones).forEach(([tipo, escenario]) => {
                const estado = escenario.utilidadNeta >= 0 ? 'GANANCIA' : 'PÉRDIDA';
                reporte += `${escenario.nombre}:\n`;
                reporte += `  - Unidades: ${escenario.unidadesVendidas}\n`;
                reporte += `  - Ventas: ${this.formatearMoneda(escenario.ventasTotales)}\n`;
                reporte += `  - ${estado}: ${this.formatearMoneda(Math.abs(escenario.utilidadNeta))}\n\n`;
            });
        }

        // Recomendaciones
        reporte += `\n💡 RECOMENDACIONES\n${'='.repeat(50)}\n\n`;
        reporte += `Estrategias de Marketing:\n`;
        this.config.recomendaciones_marketing.slice(0, 3).forEach((rec, i) => {
            reporte += `${i + 1}. ${rec.replace(/📱|💬|🤝|📧|⭐|📊|🎯|🏷️|📞/g, '').trim()}\n`;
        });

        reporte += `\nOptimización de Costos:\n`;
        this.config.consejos_optimizacion.slice(0, 3).forEach((consejo, i) => {
            reporte += `${i + 1}. ${consejo.replace(/🔍|♻️|⚡|📦|🚚|💡|📋|🎯|📊|🤝/g, '').trim()}\n`;
        });

        reporte += `\n${'='.repeat(50)}\n`;
        reporte += `💼 Para más asesoría personalizada, contacta: ${this.config.agente.contacto}\n`;
        reporte += `🧠 IAtiva - Tu aliado en crecimiento financiero\n`;
        reporte += `${'='.repeat(50)}\n`;

        return reporte;
    }

    // Guardar reporte HTML en archivo
    async guardarReporteHTML(datosOriginales, resultadosCalculos, nombreArchivo = null) {
        try {
            const html = this.generarReporteHTML(datosOriginales, resultadosCalculos);
            const nombreUsuario = datosOriginales.nombreUsuario || 'Usuario';
            const fecha = new Date().toISOString().split('T')[0];
            
            const archivo = nombreArchivo || `reporte-iativa-${nombreUsuario.replace(/\s+/g, '-')}-${fecha}.html`;
            const rutaCompleta = path.join(process.cwd(), 'reportes', archivo);
            
            // Crear directorio si no existe
            const directorioReportes = path.dirname(rutaCompleta);
            if (!fs.existsSync(directorioReportes)) {
                fs.mkdirSync(directorioReportes, { recursive: true });
            }
            
            fs.writeFileSync(rutaCompleta, html, 'utf8');
            
            return {
                exito: true,
                archivo: archivo,
                rutaCompleta: rutaCompleta,
                tamaño: Buffer.from(html).length
            };
            
        } catch (error) {
            return {
                exito: false,
                error: error.message
            };
        }
    }

    // Guardar reporte en texto plano
    async guardarReporteTexto(datosOriginales, resultadosCalculos, nombreArchivo = null) {
        try {
            const texto = this.generarReporteTexto(datosOriginales, resultadosCalculos);
            const nombreUsuario = datosOriginales.nombreUsuario || 'Usuario';
            const fecha = new Date().toISOString().split('T')[0];
            
            const archivo = nombreArchivo || `reporte-iativa-${nombreUsuario.replace(/\s+/g, '-')}-${fecha}.txt`;
            const rutaCompleta = path.join(process.cwd(), 'reportes', archivo);
            
            // Crear directorio si no existe
            const directorioReportes = path.dirname(rutaCompleta);
            if (!fs.existsSync(directorioReportes)) {
                fs.mkdirSync(directorioReportes, { recursive: true });
            }
            
            fs.writeFileSync(rutaCompleta, texto, 'utf8');
            
            return {
                exito: true,
                archivo: archivo,
                rutaCompleta: rutaCompleta,
                tamaño: Buffer.from(texto).length
            };
            
        } catch (error) {
            return {
                exito: false,
                error: error.message
            };
        }
    }

    // Método principal para generar reporte completo
    async generarReporteCompleto(datosOriginales, resultadosCalculos, formato = 'html') {
        try {
            let resultado;
            
            if (formato === 'txt' || formato === 'texto') {
                resultado = await this.guardarReporteTexto(datosOriginales, resultadosCalculos);
            } else {
                resultado = await this.guardarReporteHTML(datosOriginales, resultadosCalculos);
            }
            
            if (resultado.exito) {
                return {
                    exito: true,
                    mensaje: `📄 ¡Reporte generado exitosamente!\n\n📁 Archivo: ${resultado.archivo}\n📍 Ubicación: ${resultado.rutaCompleta}\n📊 Tamaño: ${(resultado.tamaño / 1024).toFixed(1)} KB`,
                    archivo: resultado.archivo,
                    rutaCompleta: resultado.rutaCompleta
                };
            } else {
                throw new Error(resultado.error);
            }
            
        } catch (error) {
            return {
                exito: false,
                mensaje: `❌ Error al generar el reporte: ${error.message}`,
                error: error.message
            };
        }
    }
}

module.exports = GeneradorReportes;