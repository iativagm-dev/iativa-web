const fs = require('fs');
const path = require('path');

class RecomendadorMarketing {
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

    // Generar recomendaciones basadas en análisis financiero
    generarRecomendacionesPersonalizadas(resultadosCalculos, datosUsuario) {
        const { resumen, detalles } = resultadosCalculos;
        const nombreUsuario = datosUsuario.nombreUsuario || 'emprendedor';
        const recomendaciones = {
            marketing: [],
            optimizacion: [],
            pricing: [],
            estrategias: [],
            alertas: []
        };

        // Análisis del margen de utilidad
        if (resumen.margenUtilidad < 20) {
            recomendaciones.alertas.push({
                tipo: 'warning',
                mensaje: `⚠️ ${nombreUsuario}, tu margen de utilidad (${resumen.margenUtilidad.toFixed(1)}%) es bajo. Considera optimizar costos o ajustar precios.`,
                prioridad: 'alta'
            });
            
            recomendaciones.optimizacion.push(
                "🔍 Revisa y negocia con proveedores para reducir costos de materia prima",
                "⚡ Busca formas de automatizar procesos para reducir mano de obra",
                "📦 Evalúa opciones de empaque más económicas"
            );
        } else if (resumen.margenUtilidad > 50) {
            recomendaciones.pricing.push(
                "💰 Tu margen es excelente, considera reinvertir en calidad del producto",
                "🎯 Podrías ser más competitivo bajando ligeramente el precio",
                "📈 Invierte más en marketing para aumentar volumen de ventas"
            );
        }

        // Análisis del punto de equilibrio
        if (detalles.puntoEquilibrio.unidades) {
            const unidadesEquilibrio = detalles.puntoEquilibrio.unidades;
            
            if (unidadesEquilibrio > 100) {
                recomendaciones.alertas.push({
                    tipo: 'warning',
                    mensaje: `📊 Necesitas vender ${unidadesEquilibrio} unidades para equilibrar. Es un número alto, considera estrategias agresivas de marketing.`,
                    prioridad: 'alta'
                });
                
                recomendaciones.marketing.push(
                    "🚀 Implementa una estrategia de lanzamiento con descuentos por volumen",
                    "🤝 Busca socios comerciales o distribuidores",
                    "📱 Invierte fuertemente en publicidad digital (Facebook, Instagram Ads)"
                );
            } else if (unidadesEquilibrio < 20) {
                recomendaciones.estrategias.push(
                    "✅ Tu punto de equilibrio es muy alcanzable, enfócate en calidad y fidelización",
                    "🎯 Desarrolla productos complementarios para aumentar ticket promedio",
                    "⭐ Implementa un programa de clientes frecuentes"
                );
            }
        }

        // Análisis de costos dominantes
        const { costos } = detalles;
        const costoTotal = Object.values(costos).reduce((sum, valor) => sum + valor, 0);
        
        const materiaPrimaRatio = (costos.materia_prima || 0) / costoTotal;
        const manoObraRatio = (costos.mano_obra || 0) / costoTotal;
        
        if (materiaPrimaRatio > 0.6) {
            recomendaciones.optimizacion.push(
                "🛒 La materia prima representa un alto % de tus costos. Busca proveedores alternativos",
                "📦 Considera comprar al por mayor para obtener mejores precios",
                "🔄 Evalúa materiales sustitutos que mantengan la calidad"
            );
        }
        
        if (manoObraRatio > 0.4) {
            recomendaciones.optimizacion.push(
                "👷 Los costos de mano de obra son altos. Considera capacitación para eficiencia",
                "🤖 Evalúa procesos que se puedan automatizar o simplificar",
                "⏱️ Implementa medición de tiempos para optimizar procesos"
            );
        }

        // Análisis de proyecciones
        if (detalles.proyecciones) {
            const escenarioPesimista = detalles.proyecciones.pesimista;
            if (escenarioPesimista && escenarioPesimista.utilidadNeta < 0) {
                recomendaciones.alertas.push({
                    tipo: 'danger',
                    mensaje: `🚨 En el escenario pesimista tendrías pérdidas de ${this.formatearMoneda(Math.abs(escenarioPesimista.utilidadNeta))}. ¡Plan de contingencia necesario!`,
                    prioridad: 'crítica'
                });
                
                recomendaciones.estrategias.push(
                    "🛡️ Desarrolla un plan B con productos de menor costo",
                    "💎 Enfócate en un nicho específico para diferenciarte",
                    "🤝 Considera alianzas para reducir riesgos"
                );
            }
        }

        // Recomendaciones generales de marketing basadas en configuración
        const marketingGeneral = this.seleccionarRecomendacionesMarketing(5);
        recomendaciones.marketing.push(...marketingGeneral);

        // Consejos de optimización generales
        const optimizacionGeneral = this.seleccionarConsejosOptimizacion(5);
        recomendaciones.optimizacion.push(...optimizacionGeneral);

        return recomendaciones;
    }

    // Seleccionar recomendaciones de marketing aleatoriamente
    seleccionarRecomendacionesMarketing(cantidad = 5) {
        const todasLasRecomendaciones = [...this.config.recomendaciones_marketing];
        const seleccionadas = [];
        
        while (seleccionadas.length < cantidad && todasLasRecomendaciones.length > 0) {
            const indice = Math.floor(Math.random() * todasLasRecomendaciones.length);
            seleccionadas.push(todasLasRecomendaciones.splice(indice, 1)[0]);
        }
        
        return seleccionadas;
    }

    // Seleccionar consejos de optimización aleatoriamente
    seleccionarConsejosOptimizacion(cantidad = 5) {
        const todosLosConsejos = [...this.config.consejos_optimizacion];
        const seleccionados = [];
        
        while (seleccionados.length < cantidad && todosLosConsejos.length > 0) {
            const indice = Math.floor(Math.random() * todosLosConsejos.length);
            seleccionados.push(todosLosConsejos.splice(indice, 1)[0]);
        }
        
        return seleccionados;
    }

    // Generar mensaje motivacional personalizado
    generarMensajeMotivacional(resultadosCalculos, nombreUsuario) {
        const { resumen, detalles } = resultadosCalculos;
        const nombre = nombreUsuario || 'emprendedor';
        
        let mensaje = `💪 **¡Excelente trabajo, ${nombre}!** Has dado el primer paso fundamental: conocer tus números.\n\n`;
        
        // Mensaje basado en el margen de utilidad
        if (resumen.margenUtilidad >= 30) {
            mensaje += `🎉 Tu margen de utilidad del ${resumen.margenUtilidad.toFixed(1)}% es excelente. Tienes una base sólida para crecer.\n\n`;
        } else if (resumen.margenUtilidad >= 20) {
            mensaje += `👍 Tu margen de utilidad del ${resumen.margenUtilidad.toFixed(1)}% está en un rango saludable. Con algunas optimizaciones, puedes mejorarlo.\n\n`;
        } else {
            mensaje += `💡 Tu margen actual del ${resumen.margenUtilidad.toFixed(1)}% tiene potencial de mejora. Las recomendaciones te ayudarán a optimizarlo.\n\n`;
        }
        
        // Mensaje sobre el punto de equilibrio
        if (detalles.puntoEquilibrio.unidades) {
            const unidades = detalles.puntoEquilibrio.unidades;
            if (unidades <= 50) {
                mensaje += `⭐ Solo necesitas vender ${unidades} unidades para estar en equilibrio. ¡Es muy alcanzable!\n\n`;
            } else if (unidades <= 100) {
                mensaje += `📈 Tu meta de ${unidades} unidades para equilibrar es realista con una buena estrategia de marketing.\n\n`;
            } else {
                mensaje += `🚀 Aunque necesitas ${unidades} unidades para equilibrar, con las estrategias correctas lo lograrás.\n\n`;
            }
        }
        
        mensaje += `🌟 **Recuerda**: Un negocio sostenible no solo depende del precio, sino de cómo gestionas tus costos y cómo conectas con tus clientes.\n\n`;
        mensaje += `💼 **¡Tú puedes lograrlo!** Con IAtiva como tu aliado en crecimiento financiero, tienes todas las herramientas para triunfar.\n\n`;
        mensaje += `📞 Si necesitas asesoría personalizada, contáctanos: ${this.config.agente.contacto}`;
        
        return mensaje;
    }

    // Formatear recomendaciones para presentación
    formatearRecomendacionesParaPresentacion(recomendaciones, nombreUsuario) {
        const nombre = nombreUsuario || '';
        let texto = `🎯 **RECOMENDACIONES PERSONALIZADAS**\n\n${nombre ? `${nombre}, ` : ''}aquí tienes consejos específicos basados en tu análisis:\n\n`;
        
        // Mostrar alertas primero si las hay
        if (recomendaciones.alertas.length > 0) {
            texto += `⚠️ **ALERTAS IMPORTANTES**\n`;
            recomendaciones.alertas.forEach(alerta => {
                texto += `${alerta.mensaje}\n`;
            });
            texto += `\n`;
        }
        
        // Estrategias de marketing
        if (recomendaciones.marketing.length > 0) {
            texto += `📱 **ESTRATEGIAS DE MARKETING**\n`;
            recomendaciones.marketing.slice(0, 5).forEach((estrategia, i) => {
                texto += `${i + 1}. ${estrategia}\n`;
            });
            texto += `\n`;
        }
        
        // Optimización de costos
        if (recomendaciones.optimizacion.length > 0) {
            texto += `💰 **OPTIMIZACIÓN DE COSTOS**\n`;
            recomendaciones.optimizacion.slice(0, 5).forEach((consejo, i) => {
                texto += `${i + 1}. ${consejo}\n`;
            });
            texto += `\n`;
        }
        
        // Estrategias adicionales
        if (recomendaciones.estrategias.length > 0) {
            texto += `🎯 **ESTRATEGIAS ADICIONALES**\n`;
            recomendaciones.estrategias.forEach((estrategia, i) => {
                texto += `${i + 1}. ${estrategia}\n`;
            });
            texto += `\n`;
        }
        
        // Consejos de pricing
        if (recomendaciones.pricing.length > 0) {
            texto += `💲 **ESTRATEGIA DE PRECIOS**\n`;
            recomendaciones.pricing.forEach((consejo, i) => {
                texto += `${i + 1}. ${consejo}\n`;
            });
            texto += `\n`;
        }
        
        return texto;
    }

    // Generar plan de acción de 30 días
    generarPlanAccion30Dias(recomendaciones, resultadosCalculos, nombreUsuario) {
        const nombre = nombreUsuario || 'emprendedor';
        
        let plan = `📅 **PLAN DE ACCIÓN - PRIMEROS 30 DÍAS**\n\n${nombre}, aquí tienes un plan estructurado para implementar:\n\n`;
        
        // Semana 1: Optimización inmediata
        plan += `**📋 SEMANA 1: OPTIMIZACIÓN INMEDIATA**\n`;
        plan += `□ Contactar 3 proveedores alternativos para comparar precios\n`;
        plan += `□ Revisar procesos de producción para identificar desperdicios\n`;
        plan += `□ Calcular costos reales por unidad producida\n`;
        plan += `□ Definir precio final basado en análisis de competencia\n\n`;
        
        // Semana 2: Preparación de marketing
        plan += `**📱 SEMANA 2: PREPARACIÓN DE MARKETING**\n`;
        plan += `□ Crear perfiles en redes sociales (Instagram, Facebook)\n`;
        plan += `□ Configurar WhatsApp Business profesional\n`;
        plan += `□ Diseñar contenido visual básico del producto\n`;
        plan += `□ Preparar lista de primeros clientes potenciales\n\n`;
        
        // Semana 3: Lanzamiento suave
        plan += `**🚀 SEMANA 3: LANZAMIENTO SUAVE**\n`;
        plan += `□ Ofrecer producto a círculo cercano (familia, amigos)\n`;
        plan += `□ Recopilar primeros testimonios y mejoras\n`;
        plan += `□ Ajustar proceso basado en feedback inicial\n`;
        plan += `□ Calcular métricas reales vs proyecciones\n\n`;
        
        // Semana 4: Escalamiento
        plan += `**📈 SEMANA 4: ESCALAMIENTO**\n`;
        plan += `□ Implementar estrategia de referidos\n`;
        plan += `□ Iniciar publicidad pagada (presupuesto mínimo)\n`;
        plan += `□ Establecer rutina de producción y ventas\n`;
        plan += `□ Evaluar resultados y ajustar estrategia\n\n`;
        
        // Objetivos cuantitativos
        if (resultadosCalculos.detalles.puntoEquilibrio.unidades) {
            const metaMensual = Math.ceil(resultadosCalculos.detalles.puntoEquilibrio.unidades * 1.2);
            plan += `🎯 **OBJETIVO DEL MES**\n`;
            plan += `Vender al menos ${metaMensual} unidades (20% sobre punto de equilibrio)\n`;
            plan += `Meta de ingresos: ${this.formatearMoneda(metaMensual * resultadosCalculos.resumen.precioVentaSugerido)}\n\n`;
        }
        
        plan += `💪 **Recuerda**: La clave del éxito es la ejecución constante. ¡Marca cada tarea completada!\n`;
        plan += `📞 Si necesitas apoyo: ${this.config.agente.contacto}`;
        
        return plan;
    }

    // Generar recomendaciones específicas por industria (básico)
    generarRecomendacionesPorIndustria(tipoNegocio = 'general') {
        const recomendaciones = {
            'alimentos': [
                "🍽️ Enfócate en la presentación visual de tus productos",
                "📱 Usa Instagram y TikTok para mostrar el proceso de preparación",
                "⭐ Solicita reseñas específicamente sobre sabor y calidad",
                "🚚 Considera servicio de delivery para ampliar mercado"
            ],
            'servicios': [
                "💼 Crea un portafolio visual de trabajos anteriores",
                "🤝 Implementa sistema de referidos con descuentos",
                "📞 Ofrece consultas gratuitas iniciales",
                "⏰ Define paquetes de servicios por horas"
            ],
            'productos': [
                "📦 Invierte en empaque atractivo y funcional",
                "🎯 Define claramente tu propuesta de valor",
                "🛒 Considera ventas online además de físicas",
                "📊 Estudia precios de competencia directa"
            ],
            'general': this.seleccionarRecomendacionesMarketing(4)
        };
        
        return recomendaciones[tipoNegocio] || recomendaciones['general'];
    }

    // Método principal para generar recomendaciones completas
    generarRecomendacionesCompletas(resultadosCalculos, datosUsuario) {
        try {
            const recomendacionesPersonalizadas = this.generarRecomendacionesPersonalizadas(
                resultadosCalculos, 
                datosUsuario
            );
            
            const mensajeMotivacional = this.generarMensajeMotivacional(
                resultadosCalculos, 
                datosUsuario.nombreUsuario
            );
            
            const recomendacionesFormateadas = this.formatearRecomendacionesParaPresentacion(
                recomendacionesPersonalizadas,
                datosUsuario.nombreUsuario
            );
            
            const planAccion = this.generarPlanAccion30Dias(
                recomendacionesPersonalizadas,
                resultadosCalculos,
                datosUsuario.nombreUsuario
            );
            
            return {
                exito: true,
                recomendacionesPersonalizadas,
                mensajeMotivacional,
                recomendacionesFormateadas,
                planAccion,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            return {
                exito: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = RecomendadorMarketing;