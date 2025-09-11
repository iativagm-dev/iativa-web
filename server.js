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
const PaymentService = require('./src/paymentService');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar servicios
const emailService = new EmailService();
const paymentService = new PaymentService();
const DebtCapacityCalculator = require('./src/debtCapacityCalculator');

// Inicializar calculadora de deuda
const debtCalculator = new DebtCapacityCalculator();

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
const debtDemoLimitsFile = path.join(dataDir, 'debt-demo-limits.json');
const vipIpsFile = path.join(dataDir, 'vip-ips.json');

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
    
    if (!fs.existsSync(debtDemoLimitsFile)) {
        fs.writeFileSync(debtDemoLimitsFile, JSON.stringify({}, null, 2));
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

// Funciones para límites de demo de capacidad de endeudamiento (1 vez por IP)
function getDebtDemoLimits() {
    try {
        return JSON.parse(fs.readFileSync(debtDemoLimitsFile, 'utf8'));
    } catch {
        return {};
    }
}

function saveDebtDemoLimits(limits) {
    fs.writeFileSync(debtDemoLimitsFile, JSON.stringify(limits, null, 2));
}

function checkDebtDemoLimit(ipAddress) {
    const limits = getDebtDemoLimits();
    return !limits[ipAddress]; // Solo una vez por IP, sin límite de tiempo
}

function markDebtDemoUsed(ipAddress) {
    const limits = getDebtDemoLimits();
    limits[ipAddress] = {
        used: true,
        timestamp: new Date().toISOString()
    };
    saveDebtDemoLimits(limits);
}

// Funciones para IPs VIP (acceso ilimitado para demostraciones)
function getVipIps() {
    try {
        return JSON.parse(fs.readFileSync(vipIpsFile, 'utf8'));
    } catch {
        return {};
    }
}

function isVipIp(ipAddress) {
    const vipIps = getVipIps();
    return !!vipIps[ipAddress];
}

function getVipStatus(ipAddress) {
    const vipIps = getVipIps();
    return vipIps[ipAddress] || null;
}

// Función mejorada para límites de demo que considera VIPs
function checkDebtDemoLimitWithVip(ipAddress) {
    // Si es IP VIP, siempre permitir
    if (isVipIp(ipAddress)) {
        return true;
    }
    // Si no es VIP, aplicar límites normales
    return checkDebtDemoLimit(ipAddress);
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
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const vipStatus = getVipStatus(clientIp);
    
    logAnalytics('page_view', req, { 
        page: 'home',
        isVip: !!vipStatus,
        vipReason: vipStatus?.reason || null
    });
    
    res.render('index', { 
        title: 'IAtiva - Tu Aliado en Crecimiento Financiero',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        vipStatus: vipStatus
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
            req.session.user = {
                id: user.id,
                name: user.full_name || user.username,
                email: user.email,
                plan: user.plan || 'demo',
                is_admin: user.is_admin === true
            };
            
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

        // Verificar límites de demo por IP (excepto VIPs)
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        console.log('🔍 IP detectada:', clientIp);
        const vipStatus = getVipStatus(clientIp);
        console.log('🔍 Estado VIP:', vipStatus);
        
        if (vipStatus) {
            console.log('👑 Acceso VIP detectado:', vipStatus.reason);
        } else {
            // Solo verificar límites para no-VIPs
            if (!checkDemoLimit(clientIp)) {
                console.log('🚫 Límite de demo alcanzado para IP:', clientIp);
                return res.status(429).json({ 
                    error: 'Límite de análisis demo alcanzado',
                    message: 'Has alcanzado el límite de 2 análisis demo por día. Regístrate gratis para análisis ilimitados.',
                    limitReached: true
                });
            }
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

        // Incrementar contador de demo para esta IP (excepto VIPs)
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        if (!isVipIp(clientIp)) {
            incrementDemoLimit(clientIp);
        }

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

// ==================== RUTAS DE PAGOS Y SUSCRIPCIONES ====================

// Página de planes
app.get('/planes', (req, res) => {
    res.render('planes', {
        title: 'Planes de Suscripción - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
});

// ==================== PANEL ESPECIAL EXPOSENA 2025 ====================

// Panel especial para demostraciones EXPOSENA 2025
app.get('/exposena-demo', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const vipStatus = getVipStatus(clientIp);
    
    // Solo accesible para IPs VIP configuradas para EXPOSENA
    if (!vipStatus || !vipStatus.reason.includes('EXPOSENA')) {
        return res.redirect('/');
    }
    
    logAnalytics('exposena_demo_access', req, { 
        vipReason: vipStatus.reason,
        clientIp: clientIp.substring(0, 10) + '...'
    });
    
    res.render('exposena-demo', {
        title: 'Demo Especial EXPOSENA 2025 - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        vipStatus: vipStatus
    });
});

// API especial para stats de demostración
app.get('/api/demo-stats', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const vipStatus = getVipStatus(clientIp);
    
    if (!vipStatus) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    
    try {
        const analyses = getAnalyses();
        const analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        
        const stats = {
            total_analyses: analyses.length,
            demo_sessions: analytics.filter(a => a.event_type === 'demo_started').length,
            debt_demos: analytics.filter(a => a.event_type === 'debt_demo_used').length,
            users_registered: getUsers().length,
            vip_access: true,
            last_updated: new Date().toISOString()
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error getting demo stats:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==================== SISTEMA DE DONACIONES ====================

// Página de donaciones
app.get('/donaciones', (req, res) => {
    const donaciones = paymentService.obtenerDonaciones();
    res.render('donaciones', {
        title: 'Apoya el Proyecto - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        donaciones: donaciones
    });
});

// API para crear donación
app.post('/api/create-donation', async (req, res) => {
    try {
        const { tipo, monto_personalizado, email, nombre } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }
        
        let donacion;
        if (tipo === 'personalizada' && monto_personalizado) {
            donacion = await paymentService.crearDonacion(parseInt(monto_personalizado), email, nombre);
        } else if (tipo) {
            donacion = await paymentService.crearDonacion(tipo, email, nombre);
        } else {
            return res.status(400).json({ error: 'Tipo de donación o monto es requerido' });
        }
        
        logAnalytics('donation_created', req, { 
            tipo, 
            monto: monto_personalizado || 'predefinido',
            email: email
        });
        
        res.json({
            success: true,
            payment_url: donacion.init_point,
            preference_id: donacion.id
        });
        
    } catch (error) {
        console.error('Error creando donación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Páginas de resultado de donación
app.get('/donation/success', (req, res) => {
    logAnalytics('donation_success', req);
    res.render('donation-result', {
        title: '¡Gracias por tu Donación! - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: true,
        message: '¡Muchas gracias por tu donación! Tu apoyo nos ayuda a seguir mejorando IAtiva.'
    });
});

app.get('/donation/failure', (req, res) => {
    logAnalytics('donation_failure', req);
    res.render('donation-result', {
        title: 'Donación Cancelada - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: false,
        message: 'La donación no pudo procesarse. No te preocupes, puedes intentar nuevamente.'
    });
});

app.get('/donation/pending', (req, res) => {
    logAnalytics('donation_pending', req);
    res.render('donation-result', {
        title: 'Donación Pendiente - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: true,
        message: 'Tu donación está siendo procesada. Te notificaremos cuando se complete.'
    });
});

// Webhook para notificaciones de donación
app.post('/webhooks/mercadopago-donation', async (req, res) => {
    try {
        const webhook = await paymentService.procesarWebhook(req.body);
        
        if (webhook && webhook.status === 'approved') {
            logAnalytics('donation_webhook_approved', req, {
                payment_id: webhook.payment_id,
                amount: webhook.amount,
                email: webhook.email
            });
            
            // Enviar email de agradecimiento
            try {
                await emailService.enviarEmailDonacion(
                    webhook.email, 
                    webhook.amount
                );
            } catch (emailError) {
                console.error('Error enviando email de donación:', emailError);
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error procesando webhook de donación:', error);
        res.status(500).send('Error');
    }
});

// ==================== DEMO DE CAPACIDAD DE ENDEUDAMIENTO ====================

// Página demo de capacidad de endeudamiento (gratuito 1 vez por IP + VIP ilimitado)
app.get('/debt-capacity-demo', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const hasUsedDemo = !checkDebtDemoLimitWithVip(clientIp);
    const vipStatus = getVipStatus(clientIp);
    
    logAnalytics('debt_demo_page_view', req, { 
        hasUsedDemo,
        isVip: !!vipStatus,
        clientIp: clientIp.substring(0, 10) + '...' // Log parcial por privacidad
    });
    
    res.render('debt-capacity-demo', {
        title: 'Demo Gratuito: Capacidad de Endeudamiento - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        hasUsedDemo: hasUsedDemo,
        isVip: !!vipStatus,
        vipReason: vipStatus?.reason || null
    });
});

// API para demo de capacidad de endeudamiento (gratuito 1 vez por IP + VIP ilimitado)
app.post('/api/debt-capacity-demo', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const vipStatus = getVipStatus(clientIp);
        
        // Verificar si ya usó el demo (salvo que sea VIP)
        if (!checkDebtDemoLimitWithVip(clientIp)) {
            return res.json({
                success: false,
                message: 'Ya has utilizado tu demo gratuito de capacidad de endeudamiento. Suscríbete para acceso ilimitado.',
                demo_exhausted: true
            });
        }
        
        const { business_data, financial_projections } = req.body;
        
        // Validar datos requeridos
        if (!business_data.monthly_income || !business_data.monthly_expenses) {
            return res.json({
                success: false,
                message: 'Ingresos y gastos mensuales son requeridos'
            });
        }
        
        // Calcular capacidad de endeudamiento
        const analysis = debtCalculator.calculateDebtCapacity(business_data, financial_projections);
        
        // Marcar demo como usado para esta IP (excepto VIPs)
        if (!isVipIp(clientIp)) {
            markDebtDemoUsed(clientIp);
        }
        
        logAnalytics('debt_demo_used', req, { 
            clientIp: clientIp.substring(0, 10) + '...',
            businessName: business_data.business_name || 'N/A',
            debtCapacity: analysis.debt_capacity
        });
        
        res.json({
            success: true,
            analysis: analysis,
            demo: true,
            upgrade_message: 'Demo completado. Suscríbete para análisis ilimitados y funciones avanzadas.'
        });
        
    } catch (error) {
        console.error('Error en demo de capacidad de endeudamiento:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Página premium de capacidad de endeudamiento (solo usuarios con plan premium)
app.get('/debt-capacity', requireAuth, (req, res) => {
    // Verificar que el usuario tenga plan premium
    if (!req.session.user || req.session.user.plan === 'demo') {
        return res.redirect('/debt-capacity-demo');
    }
    
    res.render('debt-capacity', {
        title: 'Calculadora de Capacidad de Endeudamiento - IAtiva',
        user: req.session.user
    });
});

// ==================== CALCULADORA DE CAPACIDAD DE ENDEUDAMIENTO ====================

// API para calcular capacidad de endeudamiento (PREMIUM)
app.post('/api/calculate-debt-capacity', (req, res) => {
    try {
        // Verificar si el usuario tiene acceso premium
        if (!req.session.user || req.session.user.plan === 'demo') {
            return res.json({
                success: false,
                message: 'Esta funcionalidad requiere suscripción premium',
                upgrade_required: true
            });
        }
        
        const { business_data, financial_projections } = req.body;
        
        // Validar datos requeridos
        if (!business_data.monthly_income || !business_data.monthly_expenses) {
            return res.json({
                success: false,
                message: 'Ingresos y gastos mensuales son requeridos'
            });
        }
        
        // Calcular capacidad de endeudamiento
        const analysis = debtCalculator.calculateDebtCapacity(business_data, financial_projections);
        
        // Guardar análisis en historial del usuario
        const analyses = getAnalyses();
        const debtAnalysis = {
            id: Date.now().toString(),
            user_id: req.session.user.id,
            type: 'debt_capacity',
            business_name: business_data.business_name || 'Mi Negocio',
            created_at: new Date().toISOString(),
            data: {
                business_data,
                financial_projections
            },
            results: analysis,
            status: 'completed'
        };
        
        analyses.push(debtAnalysis);
        saveAnalyses(analyses);
        
        res.json({
            success: true,
            analysis: analysis,
            analysis_id: debtAnalysis.id
        });
        
    } catch (error) {
        console.error('Error calculando capacidad de endeudamiento:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ver análisis de capacidad de endeudamiento
app.get('/analisis/debt/:id', (req, res) => {
    try {
        const analyses = getAnalyses();
        const analysis = analyses.find(a => a.id === req.params.id && a.type === 'debt_capacity');
        
        if (!analysis) {
            return res.status(404).send('Análisis no encontrado');
        }
        
        // Verificar que el usuario tiene acceso
        if (req.session.user?.id !== analysis.user_id) {
            return res.status(403).send('Acceso denegado');
        }
        
        res.render('debt-analysis', {
            title: 'Análisis de Capacidad de Endeudamiento - ' + analysis.business_name,
            analysis: analysis,
            user: req.session.user
        });
        
    } catch (error) {
        console.error('Error cargando análisis:', error);
        res.status(500).send('Error interno del servidor');
    }
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