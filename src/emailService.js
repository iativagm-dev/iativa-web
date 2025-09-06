const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Configuración para Gmail - requiere variables de entorno
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || '',
                pass: process.env.EMAIL_PASSWORD || ''
            }
        });
    }

    async enviarReporteCompleto(emailDestino, nombreUsuario, datosAnalisis) {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                console.log('⚠️ Configuración de email no encontrada. Email no enviado.');
                return { success: false, message: 'Configuración de email no disponible' };
            }

            const htmlContent = this.generarHTMLReporte(nombreUsuario, datosAnalisis);
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: emailDestino,
                subject: `📊 Tu Análisis de Costos - IAtiva`,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email enviado exitosamente:', result.messageId);
            
            return { 
                success: true, 
                message: 'Email enviado exitosamente',
                messageId: result.messageId 
            };

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return { 
                success: false, 
                message: 'Error enviando email: ' + error.message 
            };
        }
    }

    generarHTMLReporte(nombreUsuario, datosAnalisis) {
        const fechaActual = new Date().toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Análisis - IAtiva</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
                .header { text-align: center; color: #2563eb; margin-bottom: 30px; }
                .section { margin-bottom: 20px; padding: 15px; border-left: 4px solid #2563eb; background-color: #f8fafc; }
                .title { font-weight: bold; color: #1e40af; margin-bottom: 10px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .highlight { background-color: #e0f2fe; padding: 10px; border-radius: 5px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 IAtiva - Tu Análisis de Costos</h1>
                    <p>Generado el ${fechaActual}</p>
                </div>
                
                <div class="section">
                    <div class="title">👋 Hola ${nombreUsuario || 'Usuario'}!</div>
                    <p>Gracias por usar nuestro analizador de costos. Aquí tienes tu reporte completo:</p>
                </div>

                <div class="section">
                    <div class="title">📊 Resumen del Análisis</div>
                    <div class="highlight">
                        <strong>Negocio:</strong> ${datosAnalisis.nombreNegocio || 'No especificado'}<br>
                        <strong>Sector:</strong> ${datosAnalisis.sector || 'No especificado'}<br>
                        <strong>Empleados:</strong> ${datosAnalisis.numeroEmpleados || 'No especificado'}
                    </div>
                </div>

                <div class="section">
                    <div class="title">💰 Información Financiera</div>
                    <p><strong>Ingresos Mensuales:</strong> ${datosAnalisis.ingresosMensuales ? '$' + datosAnalisis.ingresosMensuales.toLocaleString() : 'No especificado'}</p>
                    <p><strong>Gastos Mensuales:</strong> ${datosAnalisis.gastosMensuales ? '$' + datosAnalisis.gastosMensuales.toLocaleString() : 'No especificado'}</p>
                </div>

                <div class="section">
                    <div class="title">🎯 Próximos Pasos</div>
                    <p>Para obtener un análisis más detallado y recomendaciones personalizadas, te invitamos a:</p>
                    <ul>
                        <li>📝 Crear tu cuenta gratuita en IAtiva</li>
                        <li>🔍 Realizar análisis ilimitados</li>
                        <li>📈 Acceder a herramientas avanzadas</li>
                        <li>👥 Obtener consultoría personalizada</li>
                    </ul>
                </div>

                <div class="footer">
                    <p><strong>🌟 IAtiva - Tu Aliado en Crecimiento Financiero</strong></p>
                    <p>Este reporte fue generado automáticamente. Para más información, visita nuestra plataforma.</p>
                </div>
            </div>
        </body>
        </html>`;
    }
}

module.exports = EmailService;