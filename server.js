const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const cors = require('cors');

// Importar módulos de IAtiva
const AgenteIAtiva = require('./src/agent');
const CalculadoraCostosTiempo = require("./src/calculadoraCostosTiempo");
const EmailService = require('./src/emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar EmailService
const emailService = new EmailService();

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesiones - SIMPLE Y ESTABLE
app.use(session({
    secret: process.env.SESSION_SECRET || 'iativa-secret-key-2025',
    resave: false,
    saveUninitialized: true, // CAMBIO: true para crear sesiones
    cookie: { 
        secure: false, // CAMBIO: false para que funcione en desarrollo
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Sistema de almacenamiento simple con archivos JSON
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const usersFile = path.join(dataDir, 'users.json');
const analysesFile = path.join(dataDir, 'analyses.json');
const analyticsFile = path.join(dataDir, 'analytics.json');
const demoLimitsFile = path.join(dataDir, 'demo-limits.json');

// Inicializar archivos si no existen
function initializeData() {
    if (!fs.existsSync(usersFile)) {
        const adminPassword = bcrypt.hashSync('admin123', 10);
        const defaultUsers = [
            {
                id: 1,
                username: 'admin',
                email: 'admin@iativa.com',
                password: adminPassword,
                full_name: 'Administrador IAtiva',
                company: 'IAtiva',
                phone: '',
                created_at: new Date().toISOString(),
                is_admin: true
            }
        ];
        fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
    }
    
    if (!fs.existsSync(analysesFile)) {
        fs.writeFileSync(analysesFile, JSON.stringify([], null, 2));
    }
    
    if (!fs.existsSync(analyticsFile)) {
        fs.writeFileSync(analyticsFile, JSON.stringify([], null, 2));
    }
    
    if (!fs.existsSync(demoLimitsFile)) {
        fs.writeFileSync(demoLimitsFile, JSON.stringify({}, null, 2));
    }
}

// Funciones de base de datos simple
function getUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getAnalyses() {
    try {
        return JSON.parse(fs.readFileSync(analysesFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveAnalyses(analyses) {
    fs.writeFileSync(analysesFile, JSON.stringify(analyses, null, 2));
}

function logAnalytics(eventType, req, data = {}) {
    try {
        const analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        analytics.push({
            id: analytics.length + 1,
            event_type: eventType,
            user_id: req.session.userId || null,
            session_id: req.sessionID,
            data: JSON.stringify(data),
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });
        fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2));
    } catch (err) {
        console.error('Error logging analytics:', err);
    }
}

// Funciones para límites de demo por IP
function getDemoLimits() {
    try {
        return JSON.parse(fs.readFileSync(demoLimitsFile, 'utf8'));
    } catch {
        return {};
    }
}

function saveDemoLimits(limits) {
    fs.writeFileSync(demoLimitsFile, JSON.stringify(limits, null, 2));
}

function checkDemoLimit(ipAddress) {
    const limits = getDemoLimits();
    const today = new Date().toDateString();
    
    if (!limits[ipAddress]) {
        limits[ipAddress] = {};
    }
    
    if (!limits[ipAddress][today]) {
        limits[ipAddress][today] = 0;
    }
    
    return limits[ipAddress][today] < 2; // Permitir 2 análisis por IP por día
}

function incrementDemoLimit(ipAddress) {
    const limits = getDemoLimits();
    const today = new Date().toDateString();
    
    if (!limits[ipAddress]) {
        limits[ipAddress] = {};
    }
    
    if (!limits[ipAddress][today]) {
        limits[ipAddress][today] = 0;
    }
    
    limits[ipAddress][today]++;
    saveDemoLimits(limits);
}

// Inicializar datos
initializeData();

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Rutas principales
app.get('/', (req, res) => {
    logAnalytics('page_view', req, { page: 'home' });
    res.render('index', { 
        title: 'IAtiva - Tu Aliado en Crecimiento Financiero',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
});

// Login
app.get('/login', (req, res) => {
    res.render('login', { title: 'Iniciar Sesión - IAtiva' });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    try {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.userName = user.full_name || user.username;
            req.session.isAdmin = user.is_admin === true;
            
            // Actualizar último login
            user.last_login = new Date().toISOString();
            saveUsers(users);
            
            logAnalytics('login_success', req, { userId: user.id });
            
            res.redirect('/dashboard');
        } else {
            logAnalytics('login_failed', req, { email });
            res.render('login', { 
                title: 'Iniciar Sesión - IAtiva',
                error: 'Email o contraseña incorrectos' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            title: 'Iniciar Sesión - IAtiva',
            error: 'Error del servidor. Intenta de nuevo.' 
        });
    }
});

// Registro
app.get('/register', (req, res) => {
    res.render('register', { title: 'Registro - IAtiva' });
});

app.post('/register', (req, res) => {
    const { username, email, password, fullName, company, phone } = req.body;
    
    try {
        const users = getUsers();
        
        // Verificar si el usuario ya existe
        if (users.find(u => u.email === email || u.username === username)) {
            return res.render('register', { 
                title: 'Registro - IAtiva',
                error: 'El email o nombre de usuario ya están en uso.' 
            });
        }
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = {
            id: users.length + 1,
            username,
            email,
            password: hashedPassword,
            full_name: fullName,
            company,
            phone,
            created_at: new Date().toISOString(),
            is_admin: false
        };
        
        users.push(newUser);
        saveUsers(users);
        
        logAnalytics('user_registered', req, { userId: newUser.id });
        
        res.render('register', { 
            title: 'Registro - IAtiva',
            success: 'Registro exitoso. Ya puedes iniciar sesión.' 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.render('register', { 
            title: 'Registro - IAtiva',
            error: 'Error en el registro. Intenta de nuevo.' 
        });
    }
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        const analyses = getAnalyses();
        const userAnalyses = analyses
            .filter(a => a.user_id === req.session.userId)
            .slice(0, 10)
            .map(a => ({
                ...a,
                created_at: new Date(a.created_at).toLocaleDateString('es-CO')
            }));
        
        logAnalytics('dashboard_view', req);
        
        res.render('dashboard', {
            title: 'Dashboard - IAtiva',
            user: { id: req.session.userId, name: req.session.userName },
            analyses: userAnalyses
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', {
            title: 'Dashboard - IAtiva',
            user: { id: req.session.userId, name: req.session.userName },
            analyses: []
        });
    }
});

// Chat API para análisis (usuarios registrados)
app.post('/api/chat', requireAuth, async (req, res) => {
    try {
        const { message, sessionId, context } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID requerido' });
        }

        // Inicializar agente
        const agente = new AgenteIAtiva();
        
        // Procesar mensaje
        const response = await agente.procesarMensaje(message, sessionId, context || {});
        
        // Si el análisis está completo, guardarlo
        if (response.analisisCompleto) {
            const analyses = getAnalyses();
            const newAnalysis = {
                id: analyses.length + 1,
                user_id: req.session.userId,
                session_id: sessionId,
                business_name: response.datosRecopilados.nombreNegocio || 'Análisis Sin Nombre',
                analysis_data: JSON.stringify(response.datosRecopilados),
                results: JSON.stringify(response.resultados),
                status: 'completed',
                created_at: new Date().toISOString()
            };
            
            analyses.push(newAnalysis);
            saveAnalyses(analyses);
        }
        
        logAnalytics('chat_interaction', req, { sessionId, messageLength: message.length });
        
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Chat API para DEMO (usuarios temporales)
app.post('/api/demo-chat', async (req, res) => {
    try {
        console.log('🎯 API Demo Chat - Iniciando...');
        const { message, sessionId, context } = req.body;
        console.log('📨 Mensaje recibido:', message);
        console.log('🆔 Session ID:', sessionId);
        
        if (!sessionId) {
            console.log('❌ Session ID faltante');
            return res.status(400).json({ error: 'Session ID requerido' });
        }

        // Verificar límites de demo por IP
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        if (!checkDemoLimit(clientIp)) {
            console.log('🚫 Límite de demo alcanzado para IP:', clientIp);
            return res.status(429).json({ 
                error: 'Límite de análisis demo alcanzado',
                message: 'Has alcanzado el límite de 2 análisis demo por día. Regístrate gratis para análisis ilimitados.',
                limitReached: true
            });
        }

        // Verificar o crear sesión temporal
        if (!req.session.tempUser) {
            req.session.tempUser = {
                id: 'temp_' + Date.now(),
                sessionId: sessionId,
                startTime: new Date().toISOString()
            };
            console.log('👤 Sesión temporal creada:', req.session.tempUser.id);
        }

        // Obtener o crear agente persistente para esta sesión
        console.log('🤖 Obteniendo AgenteIAtiva para sesión:', sessionId);
        let agente;
        
        if (!req.session.agentesActivos) {
            req.session.agentesActivos = {};
        }
        
        if (!req.session.agentesActivos[sessionId]) {
            console.log('🆕 Creando nuevo agente para sesión');
            agente = new AgenteIAtiva();
            agente.iniciar(); // Solo inicializar la primera vez
            // INICIALIZAR datos simples explícitamente
            agente.datosSimples = {};
            agente.indicePregunta = 0;
            
            req.session.agentesActivos[sessionId] = {
                estadoActual: agente.estadoActual,
                activo: agente.activo,
                ultimosResultados: agente.ultimosResultados,
                // Inicializar datos simples
                datosSimples: agente.datosSimples,
                indicePregunta: agente.indicePregunta,
                // Guardar estado completo del recopilador
                recopiladorSesion: agente.recopilador.sesion,
                recopiladorDatosRecopilados: agente.recopilador.datosRecopilados
            };
        } else {
            console.log('♻️ Restaurando agente existente');
            agente = new AgenteIAtiva();
            // Restaurar estado completo
            const estadoGuardado = req.session.agentesActivos[sessionId];
            agente.estadoActual = estadoGuardado.estadoActual;
            agente.activo = true; // IMPORTANTE: Activar el agente restaurado
            agente.ultimosResultados = estadoGuardado.ultimosResultados;
            
            // Restaurar estado completo del recopilador
            if (estadoGuardado.recopiladorSesion) {
                agente.recopilador.sesion = estadoGuardado.recopiladorSesion;
            }
            if (estadoGuardado.recopiladorDatosRecopilados) {
                agente.recopilador.datosRecopilados = estadoGuardado.recopiladorDatosRecopilados;
            }
            
            // Restaurar datos simples del nuevo flujo
            agente.datosSimples = estadoGuardado.datosSimples || {};
            agente.indicePregunta = estadoGuardado.indicePregunta || 0;
            
            console.log('🔄 Estado restaurado - Estado agente:', agente.estadoActual);
            console.log('🔄 Estado restaurado - Activo:', agente.activo);
            console.log('🔄 Estado restaurado - Pregunta actual:', agente.indicePregunta);
            console.log('🔄 Datos simples restaurados:', Object.keys(agente.datosSimples));
        }
        console.log('✅ Agente listo - Estado actual:', agente.estadoActual);
        
        // Procesar mensaje
        console.log('📝 Procesando mensaje:', message);
        console.log('🔍 Estado ANTES de procesar:', agente.estadoActual);
        console.log('🔍 Nombre usuario ANTES:', agente.recopilador.sesion?.nombreUsuario);
        const agenteResponse = agente.procesarEntrada(message);
        console.log('🔍 Estado DESPUÉS de procesar:', agente.estadoActual);
        console.log('🔍 Nombre usuario DESPUÉS:', agente.recopilador.sesion?.nombreUsuario);
        console.log('✅ Respuesta del agente:', agenteResponse ? agenteResponse.substring(0, 150) + '...' : 'NULL');
        
        // Guardar estado actualizado - INCLUIR DATOS SIMPLES
        req.session.agentesActivos[sessionId] = {
            estadoActual: agente.estadoActual,
            activo: agente.activo,
            ultimosResultados: agente.ultimosResultados,
            // Datos simples para el nuevo flujo
            datosSimples: agente.datosSimples || {},
            indicePregunta: agente.indicePregunta || 0,
            // Estado del recopilador (por compatibilidad)
            recopiladorSesion: agente.recopilador.sesion,
            recopiladorDatosRecopilados: agente.recopilador.datosRecopilados
        };
        console.log('💾 Estado guardado - Nuevo estado:', agente.estadoActual);
        console.log('💾 Datos simples guardados:', Object.keys(agente.datosSimples || {}));
        console.log('💾 Índice guardado:', agente.indicePregunta);
        
        // Crear respuesta adaptada para web
        const response = {
            respuesta: agenteResponse,
            context: {}, // El agente maneja su estado internamente
            analisisCompleto: false
        };
        
        // Verificar si el análisis está completo
        // (cuando el agente muestra recomendaciones o opciones finales)
        if (agenteResponse && (
            agenteResponse.includes('¿Qué quieres hacer ahora?') || 
            agenteResponse.includes('plan de acción') ||
            agenteResponse.includes('reporte') ||
            agente.ultimosResultados
        )) {
            console.log('🎉 Análisis detectado como completo');
            response.analisisCompleto = true;
            response.isDemo = true;
            
            // Extraer datos si están disponibles
            if (agente.ultimosResultados) {
                response.datosRecopilados = agente.ultimosResultados.datosOriginales || {};
                response.resultados = agente.ultimosResultados.calculos || {};
                
                // Guardarlo temporalmente
                req.session.lastAnalysis = {
                    sessionId: sessionId,
                    data: response.datosRecopilados,
                    results: response.resultados,
                    timestamp: new Date().toISOString()
                };
                
                console.log('💾 Análisis guardado en sesión temporal');
            }
            
            response.savePrompt = {
                message: "¡Tu análisis está completo! 🎉\n\n¿Quieres guardar estos resultados? Solo necesitamos tu email para enviarte el reporte completo.",
                benefits: [
                    "📧 Recibe el reporte completo por email",
                    "💾 Guarda tu análisis para siempre", 
                    "🔄 Crea análisis ilimitados",
                    "📊 Accede a tu dashboard personal"
                ]
            };
        }
        
        logAnalytics('demo_chat_interaction', req, { 
            tempUserId: req.session.tempUser.id, 
            sessionId, 
            messageLength: message.length 
        });
        
        console.log('🚀 Enviando respuesta al cliente...');
        res.json(response);
    } catch (error) {
        console.error('❌ ERROR COMPLETO:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Mensaje:', error.message);
        res.status(500).json({ 
            error: 'Error del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Guardar análisis de demo con email
app.post('/api/save-demo-analysis', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email || !req.session.lastAnalysis) {
            return res.status(400).json({ error: 'Email y análisis requeridos' });
        }

        // Crear usuario rápido o encontrar existente
        const users = getUsers();
        let user = users.find(u => u.email === email);
        
        if (!user) {
            // Crear usuario automáticamente
            user = {
                id: users.length + 1,
                username: email.split('@')[0],
                email: email,
                password: '', // Sin contraseña por ahora
                full_name: name || 'Usuario Demo',
                company: '',
                phone: '',
                created_at: new Date().toISOString(),
                is_admin: false,
                from_demo: true
            };
            users.push(user);
            saveUsers(users);
        }

        // Mapear y enriquecer los datos del análisis para el dashboard
        const rawData = req.session.lastAnalysis.data || {};
        const rawResults = req.session.lastAnalysis.results || {};
        
        // DEBUG: Log para ver qué datos llegan realmente
        console.log('🔍 DEBUG - Raw data from agent:', rawData);
        console.log('🔍 DEBUG - Raw results from agent:', rawResults);
        console.log('🔍 DEBUG - Session lastAnalysis:', req.session.lastAnalysis);
        
        // Extraer los costos correctamente - están en rawData.costos
        const costData = rawData.costos || rawData || {};
        console.log('🔍 DEBUG - Cost data extracted:', costData);
        
        // Crear datos estructurados para el dashboard
        const mappedData = {
            // Información del negocio (inferir o usar valores por defecto)
            nombreNegocio: name ? `Negocio de ${name}` : 'Negocio Demo',
            producto: 'Producto/Servicio',
            tipoNegocio: 'Empresa',
            ubicacion: 'No especificado',
            
            // Datos originales del agente
            ...rawData,
            ...costData
        };
        
        // Mapear resultados a la estructura esperada por el dashboard
        const mappedResults = {
            // Resultados originales
            ...rawResults,
            
            // Clasificación de costos usando los valores correctos
            costosVariables: {
                'Materia Prima': costData.materia_prima || 0,
                'Mano de Obra': costData.mano_obra || 0,
                'Empaque': costData.empaque || 0,
                'Transporte': costData.transporte || 0,
                'Marketing': costData.marketing || 0
            },
            
            costosFijos: {
                'Servicios': costData.servicios || 0,
                'Arriendo/Sueldos': costData.arriendo_sueldos || 0,
                'Otros Costos': costData.otros_costos || 0
            },
            
            // Información adicional
            rentabilidad: rawResults.margenGanancia ? 
                `${rawResults.margenGanancia}% de margen` : 
                'No calculado',
                
            recomendaciones: [
                'Revisar costos variables para optimización',
                'Considerar estrategias de reducción de costos fijos',
                'Evaluar precios de venta competitivos'
            ]
        };
        
        // Guardar el análisis
        const analyses = getAnalyses();
        const newAnalysis = {
            id: analyses.length + 1,
            user_id: user.id,
            session_id: req.session.lastAnalysis.sessionId,
            business_name: mappedData.nombreNegocio,
            analysis_data: JSON.stringify(mappedData),
            results: JSON.stringify(mappedResults),
            status: 'completed',
            created_at: new Date().toISOString(),
            from_demo: true
        };
        
        analyses.push(newAnalysis);
        saveAnalyses(analyses);

        // Enviar email automático con el reporte
        if (newAnalysis) {
            const emailResult = await emailService.enviarReporteCompleto(
                email,
                user.full_name,
                JSON.parse(newAnalysis.analysis_data)
            );
            console.log('📧 Email result:', emailResult.message);
        }

        // Incrementar contador de demo para esta IP
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        incrementDemoLimit(clientIp);

        // Crear sesión para el usuario
        req.session.userId = user.id;
        req.session.userName = user.full_name;
        req.session.userEmail = user.email;

        // Limpiar sesión temporal
        delete req.session.lastAnalysis;

        logAnalytics('demo_analysis_saved', req, { 
            userId: user.id, 
            email: email,
            analysisId: newAnalysis.id 
        });

        res.json({ 
            success: true, 
            message: 'Análisis guardado exitosamente. Redirigiendo al dashboard...',
            analysisId: newAnalysis.id,
            user: { id: user.id, name: user.full_name },
            redirectUrl: '/dashboard'
        });
        
    } catch (error) {
        console.error('Save demo analysis error:', error);
        res.status(500).json({ error: 'Error al guardar análisis' });
    }
});

// API para calcular costos por tiempo
app.post('/api/calcular-costos-tiempo', (req, res) => {
    try {
        console.log('📊 API Calcular Costos - Datos recibidos:', req.body);
        
        const { servicios } = req.body;
        
        if (!servicios || typeof servicios !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Datos de servicios requeridos'
            });
        }

        // Instanciar la calculadora
        const calculadora = new CalculadoraCostosTiempo();
        
        // Realizar el cálculo
        const resultado = calculadora.calcularMultiplesServicios(servicios);
        
        console.log('✅ Cálculo completado:', {
            servicios: Object.keys(resultado.resultados).length,
            errores: Object.keys(resultado.errores).length,
            total: resultado.totales ? resultado.totales.valorMensual : 0
        });

        res.json({
            success: true,
            calculo: resultado
        });
        
    } catch (error) {
        console.error('❌ Error en cálculo de costos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// DEMO - Acceso directo sin registro
app.get('/demo', (req, res) => {
    // Crear sesión temporal si no existe
    if (!req.session.tempUser) {
        req.session.tempUser = {
            id: 'temp_' + Date.now(),
            sessionId: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            startTime: new Date().toISOString()
        };
    }
    
    logAnalytics('demo_started', req, { tempUserId: req.session.tempUser.id });
    
    res.render('demo', {
        title: 'Análisis Gratuito - IAtiva',
        tempUser: req.session.tempUser,
        user: null // Importante: no mostrar como usuario registrado
    });
});

// Calculadora de Costos por Tiempo
app.get('/calculadora-costos', (req, res) => {
    res.render('calculadora-costos', {
        title: 'Calculadora de Costos por Tiempo - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
});

// Nuevo análisis - Redirigir a demo por simplicidad
app.get('/analisis/nuevo', requireAuth, (req, res) => {
    logAnalytics('new_analysis_started', req);
    
    // Por ahora redirigir a demo hasta tener una interfaz completa
    // esto evita el error interno mientras mantenemos la funcionalidad
    res.redirect('/demo');
});

// Ver análisis
app.get('/analisis/:id', requireAuth, (req, res) => {
    try {
        const analyses = getAnalyses();
        const analysis = analyses.find(a => 
            a.id === parseInt(req.params.id) && a.user_id === req.session.userId
        );
        
        if (!analysis) {
            return res.status(404).render('error', {
                title: 'Análisis No Encontrado',
                message: 'El análisis solicitado no existe o no tienes permisos para verlo.',
                backUrl: '/dashboard'
            });
        }

        const analysisData = JSON.parse(analysis.analysis_data);
        const results = JSON.parse(analysis.results);
        
        logAnalytics('analysis_viewed', req, { analysisId: req.params.id });
        
        res.render('analisis', {
            title: `Análisis: ${analysis.business_name} - IAtiva`,
            user: { id: req.session.userId, name: req.session.userName },
            analysis: {
                ...analysis,
                data: analysisData,
                results: results,
                created_at: new Date(analysis.created_at).toLocaleDateString('es-CO')
            }
        });
    } catch (error) {
        console.error('Analysis view error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error al cargar el análisis.',
            backUrl: '/dashboard'
        });
    }
});

// Generar reporte PDF de análisis
app.get('/analisis/:id/reporte', requireAuth, (req, res) => {
    try {
        const analyses = getAnalyses();
        const analysis = analyses.find(a => 
            a.id === parseInt(req.params.id) && a.user_id === req.session.userId
        );
        
        if (!analysis) {
            return res.status(404).json({ error: 'Análisis no encontrado' });
        }

        const analysisData = JSON.parse(analysis.analysis_data);
        const results = JSON.parse(analysis.results);
        
        // Generar HTML para PDF (versión simplificada)
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte - ${analysis.business_name}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
                .cost-item { display: flex; justify-content: space-between; margin: 5px 0; }
                .total { font-weight: bold; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Reporte de Análisis de Costos</h1>
                <h2>${analysis.business_name}</h2>
                <p>Generado el: ${new Date().toLocaleDateString('es-CO')}</p>
            </div>
            
            <div class="section">
                <h3>Información del Negocio</h3>
                <p><strong>Nombre:</strong> ${analysisData.nombreNegocio || 'N/A'}</p>
                <p><strong>Tipo:</strong> ${analysisData.tipoNegocio || 'N/A'}</p>
                <p><strong>Ubicación:</strong> ${analysisData.ubicacion || 'N/A'}</p>
            </div>
            
            <div class="section">
                <h3>Costos Variables</h3>
                <table>
                    <tr><th>Concepto</th><th>Valor</th></tr>
                    ${Object.entries(results.costosVariables || {}).map(([key, value]) => 
                        `<tr><td>${key}</td><td>$${typeof value === 'number' ? value.toLocaleString('es-CO') : value}</td></tr>`
                    ).join('')}
                </table>
            </div>
            
            <div class="section">
                <h3>Costos Fijos</h3>
                <table>
                    <tr><th>Concepto</th><th>Valor</th></tr>
                    ${Object.entries(results.costosFijos || {}).map(([key, value]) => 
                        `<tr><td>${key}</td><td>$${typeof value === 'number' ? value.toLocaleString('es-CO') : value}</td></tr>`
                    ).join('')}
                </table>
            </div>
            
            <div class="section">
                <h3>Resultados del Análisis</h3>
                <p><strong>Costo Unitario:</strong> $${results.costoUnitario ? results.costoUnitario.toLocaleString('es-CO') : 'N/A'}</p>
                <p><strong>Precio de Venta:</strong> $${results.precioVenta ? results.precioVenta.toLocaleString('es-CO') : 'N/A'}</p>
                <p><strong>Punto de Equilibrio:</strong> ${results.puntoEquilibrio || 'N/A'} unidades</p>
                <p><strong>Rentabilidad:</strong> ${results.rentabilidad || 'N/A'}</p>
            </div>
            
            <div class="section">
                <h3>Recomendaciones</h3>
                <ul>
                    ${(results.recomendaciones || []).map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            
            <p style="text-align: center; margin-top: 40px; color: #666;">
                <small>Generado por IAtiva - Tu Aliado en Crecimiento Financiero</small>
            </p>
        </body>
        </html>`;
        
        // Enviar HTML con headers para descargar como archivo
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="Reporte-${analysis.business_name}-${analysis.id}.html"`);
        res.send(htmlContent);
        
        logAnalytics('report_downloaded', req, { analysisId: req.params.id });
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Error generando reporte' });
    }
});

// Logout
app.post('/logout', (req, res) => {
    logAnalytics('logout', req, { userId: req.session.userId });
    req.session.destroy();
    res.redirect('/');
});

// Error 404
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Página No Encontrada',
        message: 'La página que buscas no existe.',
        backUrl: '/'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 IAtiva Web Server funcionando en puerto ${PORT}`);
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin login: admin@iativa.com / admin123`);
    console.log(`💾 Datos almacenados en: ${dataDir}`);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});