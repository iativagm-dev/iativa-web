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
const { FeatureToggle } = require('./modules/intelligent-costing');

// Import packages for export functionality
const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar servicios
const emailService = new EmailService();
const paymentService = new PaymentService();
const DebtCapacityCalculator = require('./src/debtCapacityCalculator');

// Inicializar calculadora de deuda
const debtCalculator = new DebtCapacityCalculator();

// Inicializar sistema de feature toggles para funciones inteligentes
const featureToggle = new FeatureToggle();

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

// Nuevos archivos para funciones inteligentes
const intelligentSessionsFile = path.join(dataDir, 'intelligent-sessions.json');
const costValidationsFile = path.join(dataDir, 'cost-validations.json');
const interactionPatternsFile = path.join(dataDir, 'interaction-patterns.json');

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

    // Inicializar archivos de funciones inteligentes
    if (!fs.existsSync(intelligentSessionsFile)) {
        fs.writeFileSync(intelligentSessionsFile, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(costValidationsFile)) {
        fs.writeFileSync(costValidationsFile, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(interactionPatternsFile)) {
        fs.writeFileSync(interactionPatternsFile, JSON.stringify([], null, 2));
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

// ==================== FUNCIONES DE DATOS INTELIGENTES ====================

// Gestión de sesiones inteligentes
function getIntelligentSessions() {
    try {
        return JSON.parse(fs.readFileSync(intelligentSessionsFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveIntelligentSessions(sessions) {
    fs.writeFileSync(intelligentSessionsFile, JSON.stringify(sessions, null, 2));
}

function saveIntelligentSession(sessionData) {
    try {
        const sessions = getIntelligentSessions();
        const existingIndex = sessions.findIndex(s => s.session_id === sessionData.session_id);

        if (existingIndex >= 0) {
            sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData, updated_at: new Date().toISOString() };
        } else {
            sessions.push({
                id: Date.now().toString(),
                created_at: new Date().toISOString(),
                ...sessionData
            });
        }

        saveIntelligentSessions(sessions);
        return sessions[existingIndex >= 0 ? existingIndex : sessions.length - 1];
    } catch (error) {
        console.error('Error saving intelligent session:', error);
        return null;
    }
}

// Gestión de validaciones de costos
function getCostValidations() {
    try {
        return JSON.parse(fs.readFileSync(costValidationsFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveCostValidation(validationData) {
    try {
        const validations = getCostValidations();
        const newValidation = {
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            ...validationData
        };
        validations.push(newValidation);
        fs.writeFileSync(costValidationsFile, JSON.stringify(validations, null, 2));
        return newValidation;
    } catch (error) {
        console.error('Error saving cost validation:', error);
        return null;
    }
}

// Gestión de patrones de interacción
function getInteractionPatterns() {
    try {
        return JSON.parse(fs.readFileSync(interactionPatternsFile, 'utf8'));
    } catch {
        return [];
    }
}

function saveInteractionPattern(patternData) {
    try {
        const patterns = getInteractionPatterns();
        const newPattern = {
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
            ...patternData
        };
        patterns.push(newPattern);
        fs.writeFileSync(interactionPatternsFile, JSON.stringify(patterns, null, 2));
        return newPattern;
    } catch (error) {
        console.error('Error saving interaction pattern:', error);
        return null;
    }
}

// Función helper para análisis inteligente
function analyzeUserPatterns(userId, sessionId) {
    const patterns = getInteractionPatterns();
    const userPatterns = patterns.filter(p => p.user_id === userId || p.session_id === sessionId);

    if (userPatterns.length === 0) return null;

    // Análisis básico de patrones
    const avgResponseTime = userPatterns.reduce((sum, p) => sum + (p.response_time || 0), 0) / userPatterns.length;
    const commonActions = userPatterns.reduce((acc, p) => {
        acc[p.action] = (acc[p.action] || 0) + 1;
        return acc;
    }, {});

    return {
        total_interactions: userPatterns.length,
        avg_response_time: avgResponseTime,
        most_common_action: Object.keys(commonActions).reduce((a, b) => commonActions[a] > commonActions[b] ? a : b),
        last_interaction: userPatterns[userPatterns.length - 1].created_at
    };
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
            req.session.userEmail = user.email;
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
            analyses: userAnalyses,
            isAdmin: req.session.userEmail === 'admin@iativa.com' || false
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', {
            title: 'Dashboard - IAtiva',
            user: { id: req.session.userId, name: req.session.userName },
            analyses: [],
            isAdmin: req.session.userEmail === 'admin@iativa.com' || false
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

        // Verificar disponibilidad de funciones inteligentes
        const intelligentFeaturesEnabled = featureToggle.isEnabled('intelligentCosting', sessionId);
        console.log(`🧠 [/api/chat] Intelligent features ${intelligentFeaturesEnabled ? 'enabled' : 'disabled'} for session: ${sessionId}`);

        // Inicializar agente con sessionId para funciones inteligentes
        const agente = new AgenteIAtiva(sessionId);

        // Procesar mensaje y capturar tiempo de inicio
        const startTime = Date.now();
        const response = await agente.procesarMensaje(message, sessionId, context || {});
        const responseTime = Date.now() - startTime;

        // Capturar datos inteligentes si las funciones están habilitadas
        if (intelligentFeaturesEnabled) {
            // Guardar patrones de interacción
            saveInteractionPattern({
                user_id: req.session.userId,
                session_id: sessionId,
                action: 'chat_message',
                message_length: message.length,
                response_time: responseTime,
                features_used: agente.intelligentCosting ? agente.intelligentCosting.getUsedFeatures(sessionId) : []
            });

            // Guardar datos de sesión inteligente si hay información de negocio
            if (agente.intelligentCosting && agente.intelligentCosting.sessionData.has(sessionId)) {
                const sessionAnalytics = agente.intelligentCosting.getSessionAnalytics(sessionId);
                saveIntelligentSession({
                    session_id: sessionId,
                    user_id: req.session.userId,
                    business_classified: sessionAnalytics.businessClassified,
                    industry: sessionAnalytics.industry,
                    confidence: sessionAnalytics.confidence,
                    validation_count: sessionAnalytics.validationCount,
                    features_used: sessionAnalytics.featuresUsed
                });
            }
        }

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

        // Verificar disponibilidad de funciones inteligentes para demo
        const intelligentFeaturesEnabled = featureToggle.isEnabled('intelligentCosting', sessionId);
        console.log(`🧠 [/api/demo-chat] Intelligent features ${intelligentFeaturesEnabled ? 'enabled' : 'disabled'} for session: ${sessionId}`);

        // Obtener o crear agente persistente para esta sesión
        console.log('🤖 Obteniendo AgenteIAtiva para sesión:', sessionId);
        let agente;
        
        if (!req.session.agentesActivos) {
            req.session.agentesActivos = {};
        }
        
        if (!req.session.agentesActivos[sessionId]) {
            console.log('🆕 Creando nuevo agente para sesión');
            agente = new AgenteIAtiva(sessionId);
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
            agente = new AgenteIAtiva(sessionId);
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

        const startTime = Date.now();
        const agenteResponse = agente.procesarEntrada(message);
        const responseTime = Date.now() - startTime;

        console.log('🔍 Estado DESPUÉS de procesar:', agente.estadoActual);
        console.log('🔍 Nombre usuario DESPUÉS:', agente.recopilador.sesion?.nombreUsuario);
        console.log('✅ Respuesta del agente:', agenteResponse ? agenteResponse.substring(0, 150) + '...' : 'NULL');

        // Capturar datos inteligentes para sesiones demo
        if (intelligentFeaturesEnabled) {
            // Guardar patrones de interacción para análisis
            saveInteractionPattern({
                user_id: req.session.tempUser?.id,
                session_id: sessionId,
                action: 'demo_chat_message',
                message_length: message.length,
                response_time: responseTime,
                features_used: agente.intelligentCosting ? agente.intelligentCosting.getUsedFeatures(sessionId) : [],
                is_demo: true
            });

            // Guardar sesión inteligente para demos
            if (agente.intelligentCosting && agente.intelligentCosting.sessionData.has(sessionId)) {
                const sessionAnalytics = agente.intelligentCosting.getSessionAnalytics(sessionId);
                saveIntelligentSession({
                    session_id: sessionId,
                    user_id: req.session.tempUser?.id,
                    business_classified: sessionAnalytics.businessClassified,
                    industry: sessionAnalytics.industry,
                    confidence: sessionAnalytics.confidence,
                    validation_count: sessionAnalytics.validationCount,
                    features_used: sessionAnalytics.featuresUsed,
                    is_demo: true
                });
            }
        }
        
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

// API SIMPLIFICADA PARA TESTING - Versión con persistencia corregida
app.post('/api/demo-chat-fixed', async (req, res) => {
    try {
        console.log('🎯 API Demo Chat FIXED - Iniciando...');
        const { message, sessionId, context } = req.body;
        console.log('📨 Mensaje recibido:', message);
        console.log('🆔 Session ID:', sessionId);

        if (!sessionId) {
            console.log('❌ Session ID faltante');
            return res.status(400).json({ error: 'Session ID requerido' });
        }

        // SIMPLIFIED AGENT PERSISTENCE
        if (!global.agentesGlobales) {
            global.agentesGlobales = new Map();
        }

        let agente;
        if (global.agentesGlobales.has(sessionId)) {
            console.log('♻️ Restaurando agente existente');
            const estadoGuardado = global.agentesGlobales.get(sessionId);
            agente = new AgenteIAtiva(sessionId);

            // Restaurar estado
            agente.estadoActual = estadoGuardado.estadoActual;
            agente.activo = true;
            agente.datosSimples = estadoGuardado.datosSimples || {};
            agente.indicePregunta = estadoGuardado.indicePregunta || 0;
            agente.nombreUsuario = estadoGuardado.nombreUsuario;

            console.log('♻️ Estado restaurado:', agente.estadoActual);
        } else {
            console.log('🆕 Creando nuevo agente');
            agente = new AgenteIAtiva(sessionId);
            agente.iniciar();
            agente.datosSimples = {};
            agente.indicePregunta = 0;
        }

        // Procesar mensaje
        console.log('📝 Procesando mensaje...');
        console.log('🔍 Estado ANTES:', agente.estadoActual);

        const respuesta = agente.procesarEntrada(message);

        console.log('🔍 Estado DESPUÉS:', agente.estadoActual);

        // Guardar estado
        global.agentesGlobales.set(sessionId, {
            estadoActual: agente.estadoActual,
            datosSimples: agente.datosSimples,
            indicePregunta: agente.indicePregunta,
            nombreUsuario: agente.nombreUsuario,
            updated: new Date().toISOString()
        });

        console.log('💾 Estado guardado en memoria global');

        res.json({
            respuesta: respuesta,
            context: { estado: agente.estadoActual },
            analisisCompleto: false,
            debug: {
                sessionId,
                estado: agente.estadoActual,
                agentesEnMemoria: global.agentesGlobales.size
            }
        });

    } catch (error) {
        console.error('❌ Error en API Demo Chat Fixed:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// DEMO - Acceso directo sin registro (TEMPORAL REDIRECT)
app.get('/demo', (req, res) => {
    // Temporal: redirigir a demo-debug hasta solucionar problema de JS
    res.redirect('/demo-debug');
});

// DEMO ORIGINAL - Temporalmente deshabilitado
app.get('/demo-original', (req, res) => {
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

// DEMO DEBUG - Versión de debug para solucionar problemas
app.get('/demo-debug', (req, res) => {
    // Crear sesión temporal si no existe
    if (!req.session.tempUser) {
        req.session.tempUser = {
            id: 'temp_' + Date.now(),
            sessionId: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            startTime: new Date().toISOString()
        };
    }

    logAnalytics('demo_debug_started', req, { tempUserId: req.session.tempUser.id });

    res.render('demo-debug', {
        title: 'Demo Debug - IAtiva',
        tempUser: req.session.tempUser,
        user: null
    });
});

// DIAGNÓSTICO DEL SISTEMA - Para identificar errores
app.get('/diagnostico', (req, res) => {
    // Crear sesión temporal si no existe
    if (!req.session.tempUser) {
        req.session.tempUser = {
            id: 'temp_' + Date.now(),
            sessionId: 'diagnostic_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            startTime: new Date().toISOString()
        };
    }

    logAnalytics('diagnostic_started', req, { tempUserId: req.session.tempUser.id });

    res.render('diagnostico-sistema', {
        title: 'Diagnóstico del Sistema - IAtiva',
        tempUser: req.session.tempUser,
        user: null
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

// Analytics tracking for business type selection
app.post('/api/analytics/business-type-selection', (req, res) => {
    try {
        const { eventType, businessType, businessName, timestamp, sessionId, userAgent, screenSize, viewportSize } = req.body;

        // Log analytics data
        console.log('📊 Business Type Selection Analytics:', {
            eventType,
            businessType,
            businessName,
            sessionId,
            timestamp,
            userAgent: userAgent?.substring(0, 50) + '...',
            screenSize,
            viewportSize
        });

        // Store analytics data (you can extend this to save to database)
        logAnalytics('business_type_selected', req, {
            businessType,
            businessName,
            sessionId,
            screenSize,
            viewportSize
        });

        res.json({
            success: true,
            message: 'Analytics tracked successfully'
        });

    } catch (error) {
        console.error('❌ Error tracking business type analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track analytics'
        });
    }
});

// ==================== INTELLIGENT DATA ADMIN ====================

// API para obtener estadísticas de sesiones inteligentes (solo administradores)
app.get('/api/admin/intelligent-stats', requireAuth, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }

    try {
        const sessions = getIntelligentSessions();
        const validations = getCostValidations();
        const patterns = getInteractionPatterns();

        // Análisis básico
        const stats = {
            total_intelligent_sessions: sessions.length,
            classified_businesses: sessions.filter(s => s.business_classified).length,
            industry_distribution: sessions.reduce((acc, s) => {
                if (s.industry) {
                    acc[s.industry] = (acc[s.industry] || 0) + 1;
                }
                return acc;
            }, {}),
            total_validations: validations.length,
            total_interactions: patterns.length,
            avg_response_time: patterns.reduce((sum, p) => sum + (p.response_time || 0), 0) / patterns.length || 0,
            most_used_features: patterns.reduce((acc, p) => {
                if (p.features_used) {
                    p.features_used.forEach(f => acc[f] = (acc[f] || 0) + 1);
                }
                return acc;
            }, {}),
            demo_vs_registered: {
                demo: patterns.filter(p => p.is_demo).length,
                registered: patterns.filter(p => !p.is_demo).length
            }
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting intelligent stats:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// API para obtener patrones de interacción para análisis (solo administradores)
app.get('/api/admin/interaction-patterns', requireAuth, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }

    try {
        const patterns = getInteractionPatterns();
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const paginatedPatterns = patterns
            .slice(offset, offset + limit)
            .map(p => ({
                id: p.id,
                action: p.action,
                response_time: p.response_time,
                message_length: p.message_length,
                features_used: p.features_used,
                is_demo: p.is_demo,
                created_at: p.created_at
            }));

        res.json({
            success: true,
            patterns: paginatedPatterns,
            total: patterns.length,
            pagination: { limit, offset }
        });
    } catch (error) {
        console.error('Error getting interaction patterns:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// API para obtener validaciones de costos para aprendizaje (solo administradores)
app.get('/api/admin/cost-validations', requireAuth, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }

    try {
        const validations = getCostValidations();
        const industry = req.query.industry;

        let filteredValidations = validations;
        if (industry) {
            filteredValidations = validations.filter(v => v.business_type === industry);
        }

        res.json({
            success: true,
            validations: filteredValidations.slice(0, 50), // Limitar a 50 para rendimiento
            total: filteredValidations.length
        });
    } catch (error) {
        console.error('Error getting cost validations:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// ==================== FEATURE TOGGLES ADMIN ====================

// API para obtener estado de feature toggles (solo administradores)
app.get('/api/admin/feature-status', requireAuth, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }

    try {
        const status = featureToggle.getFeatureStatus();
        res.json({ success: true, features: status });
    } catch (error) {
        console.error('Error getting feature status:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// API para actualizar rollout de feature (solo administradores)
app.post('/api/admin/feature-rollout', requireAuth, (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }

    try {
        const { featureName, rolloutPercentage } = req.body;

        if (!featureName || rolloutPercentage === undefined) {
            return res.status(400).json({ error: 'Feature name y rollout percentage requeridos' });
        }

        featureToggle.setRolloutPercentage(featureName, rolloutPercentage);

        logAnalytics('feature_rollout_changed', req, {
            feature: featureName,
            rollout: rolloutPercentage,
            admin: req.session.userName
        });

        res.json({
            success: true,
            message: `Feature ${featureName} rollout actualizado a ${rolloutPercentage}%`
        });
    } catch (error) {
        console.error('Error updating feature rollout:', error);
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

// API para crear suscripción
app.post('/api/create-subscription', async (req, res) => {
    try {
        const { plan, email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email es requerido'
            });
        }

        if (!plan) {
            return res.status(400).json({
                success: false,
                error: 'Plan es requerido'
            });
        }

        // Obtener userId si está autenticado
        const userId = req.session.userId || 'guest';

        const suscripcion = await paymentService.crearSuscripcion(plan, userId, email);

        logAnalytics('subscription_created', req, {
            plan,
            email: email,
            userId: userId
        });

        res.json({
            success: true,
            payment_url: suscripcion.init_point,
            preference_id: suscripcion.id
        });

    } catch (error) {
        console.error('Error creando suscripción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
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

// Páginas de resultado de suscripción
app.get('/payment/success', (req, res) => {
    logAnalytics('subscription_success', req);
    res.render('donation-result', {
        title: '¡Bienvenido al Plan Premium! - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: true,
        message: '¡Tu suscripción ha sido activada! Ya puedes disfrutar de todas las funcionalidades premium.'
    });
});

app.get('/payment/failure', (req, res) => {
    logAnalytics('subscription_failure', req);
    res.render('donation-result', {
        title: 'Pago No Completado - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: false,
        message: 'El pago no pudo procesarse. No te preocupes, puedes intentar nuevamente.'
    });
});

app.get('/payment/pending', (req, res) => {
    logAnalytics('subscription_pending', req);
    res.render('donation-result', {
        title: 'Pago Pendiente - IAtiva',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null,
        success: true,
        message: 'Tu pago está siendo procesado. Te notificaremos cuando se complete la activación de tu suscripción.'
    });
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

// ===== INTELLIGENT FEATURES API ROUTES =====

// Importar módulos inteligentes
const IntelligentCosting = require('./modules/intelligent-costing/IntelligentCosting');
const BusinessClassifier = require('./modules/intelligent-costing/BusinessClassifier');
const CostValidator = require('./modules/intelligent-costing/CostValidator');

// Inicializar sistemas inteligentes
const intelligentCosting = new IntelligentCosting();
const businessClassifier = new BusinessClassifier();
const costValidator = new CostValidator();

// API: Clasificación inteligente de negocios
app.post('/api/intelligent-features/classify-business', async (req, res) => {
    try {
        const { businessInfo, sessionId } = req.body;

        // Verificar rollout percentage
        const rolloutPercentage = parseInt(process.env.BUSINESS_CLASSIFICATION_ROLLOUT_PERCENTAGE || '100');
        const isInRollout = (Math.random() * 100) < rolloutPercentage;

        if (!isInRollout) {
            return res.json({
                success: true,
                rollout: false,
                message: 'Feature not available in current rollout',
                classification: null
            });
        }

        const classification = await businessClassifier.classifyBusiness(businessInfo);

        res.json({
            success: true,
            rollout: true,
            classification: classification,
            confidence: classification.confidence,
            categories: classification.categories,
            recommendations: classification.recommendations
        });

    } catch (error) {
        console.error('Business classification error:', error);
        res.status(500).json({
            success: false,
            error: 'Classification service temporarily unavailable'
        });
    }
});

// API: Validación inteligente de costos
app.post('/api/intelligent-features/validate-costs', async (req, res) => {
    try {
        const { costs, businessType, sessionId } = req.body;

        const validation = await costValidator.validateCosts(costs, businessType);

        res.json({
            success: true,
            validation: validation,
            warnings: validation.warnings,
            suggestions: validation.suggestions,
            coherenceScore: validation.coherenceScore
        });

    } catch (error) {
        console.error('Cost validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Cost validation service temporarily unavailable'
        });
    }
});

// API: Recomendaciones inteligentes
app.post('/api/intelligent-features/recommendations', async (req, res) => {
    try {
        const { analysisData, sessionId } = req.body;

        const recommendations = await intelligentCosting.generateRecommendations(analysisData, sessionId);

        res.json({
            success: true,
            recommendations: recommendations,
            priority: recommendations.priority,
            impact: recommendations.estimatedImpact
        });

    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({
            success: false,
            error: 'Recommendations service temporarily unavailable'
        });
    }
});

// API: Estado de funciones inteligentes
app.get('/api/intelligent-features/status', (req, res) => {
    res.json({
        success: true,
        features: {
            businessClassification: {
                enabled: process.env.ENABLE_BUSINESS_CLASSIFICATION === 'true',
                rolloutPercentage: parseInt(process.env.BUSINESS_CLASSIFICATION_ROLLOUT_PERCENTAGE || '100')
            },
            costValidation: {
                enabled: process.env.ENABLE_COST_VALIDATION === 'true',
                rolloutPercentage: parseInt(process.env.COST_VALIDATION_ROLLOUT_PERCENTAGE || '100')
            },
            recommendations: {
                enabled: process.env.ENABLE_RECOMMENDATION_ENGINE === 'true'
            },
            monitoring: {
                enabled: process.env.ENABLE_PRODUCTION_MONITORING === 'true'
            }
        },
        version: '1.0.0',
        deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || 'local'
    });
});

// API: Análisis de progreso inteligente
app.post('/api/intelligent-features/progress-analysis', async (req, res) => {
    try {
        const { sessionId } = req.body;

        const progressData = await intelligentCosting.getProgressAnalysis(sessionId);

        res.json({
            success: true,
            progress: progressData,
            analysisDepth: progressData.analysisDepth,
            completionScore: progressData.completionScore,
            nextSuggestions: progressData.nextSuggestions
        });

    } catch (error) {
        console.error('Progress analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Progress analysis service temporarily unavailable'
        });
    }
});

// ===========================
// EXPORT FUNCTIONALITY ENDPOINTS
// ===========================

// API: Generar PDF del análisis
app.post('/api/export/pdf', async (req, res) => {
    try {
        const { costs, businessType, analysis, timestamp } = req.body;

        if (!costs || !businessType || !analysis) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos para generar PDF'
            });
        }

        // Generate HTML content for PDF
        const htmlContent = generateAnalysisHTML(costs, businessType, analysis, timestamp);

        // Launch puppeteer to generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="analisis-costos-${businessType}-${new Date().toISOString().split('T')[0]}.pdf"`
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar PDF'
        });
    }
});

// API: Generar Excel del análisis
app.post('/api/export/excel', async (req, res) => {
    try {
        const { costs, businessType, analysis, timestamp } = req.body;

        if (!costs || !businessType || !analysis) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos para generar Excel'
            });
        }

        const workbook = new ExcelJS.Workbook();

        // Hoja 1: Resumen del análisis
        const summarySheet = workbook.addWorksheet('Resumen del Análisis');

        // Header styling
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
            alignment: { horizontal: 'center' }
        };

        summarySheet.columns = [
            { header: 'Concepto', key: 'concept', width: 25 },
            { header: 'Valor', key: 'value', width: 20 },
            { header: 'Porcentaje', key: 'percentage', width: 15 }
        ];

        // Apply header styling
        summarySheet.getRow(1).eachCell(cell => {
            cell.style = headerStyle;
        });

        // Add cost data
        let totalCosts = 0;
        Object.entries(costs).forEach(([key, value]) => {
            if (typeof value === 'number') {
                totalCosts += value;
            }
        });

        Object.entries(costs).forEach(([key, value]) => {
            if (typeof value === 'number') {
                const percentage = totalCosts > 0 ? ((value / totalCosts) * 100).toFixed(1) + '%' : '0%';
                summarySheet.addRow({
                    concept: getCostDisplayName(key),
                    value: new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP'
                    }).format(value),
                    percentage
                });
            }
        });

        // Total row
        summarySheet.addRow({
            concept: 'TOTAL',
            value: new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP'
            }).format(totalCosts),
            percentage: '100%'
        });

        // Style total row
        const lastRow = summarySheet.lastRow;
        lastRow.eachCell(cell => {
            cell.style = {
                font: { bold: true },
                fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
            };
        });

        // Hoja 2: Recomendaciones
        const recSheet = workbook.addWorksheet('Recomendaciones');
        recSheet.columns = [
            { header: 'Recomendación', key: 'recommendation', width: 50 },
            { header: 'Prioridad', key: 'priority', width: 15 },
            { header: 'Impacto Estimado', key: 'impact', width: 20 }
        ];

        // Apply header styling to recommendations sheet
        recSheet.getRow(1).eachCell(cell => {
            cell.style = headerStyle;
        });

        // Add recommendations
        if (analysis.recommendations) {
            analysis.recommendations.forEach(rec => {
                recSheet.addRow({
                    recommendation: rec.suggestion || rec.text || rec,
                    priority: rec.priority || 'Media',
                    impact: rec.impact || rec.estimatedSavings || 'A determinar'
                });
            });
        }

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="analisis-costos-${businessType}-${new Date().toISOString().split('T')[0]}.xlsx"`
        });

        res.send(buffer);

    } catch (error) {
        console.error('Error generating Excel:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar Excel'
        });
    }
});

// API: Enviar análisis por email
app.post('/api/export/email', async (req, res) => {
    try {
        const { costs, businessType, analysis, timestamp, recipientEmail, recipientName } = req.body;

        if (!costs || !businessType || !analysis || !recipientEmail) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos para envío por email'
            });
        }

        // Generate email content
        const emailHTML = generateEmailHTML(costs, businessType, analysis, timestamp, recipientName);

        // Send email using existing email service
        const subject = `Análisis de Costos IAtiva - ${businessType}`;

        await emailService.sendEmail({
            to: recipientEmail,
            subject: subject,
            html: emailHTML,
            from: 'IAtiva Análisis de Costos <noreply@iativa.com>'
        });

        res.json({
            success: true,
            message: 'Análisis enviado por email exitosamente'
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar email'
        });
    }
});

// Utility functions for export functionality
function generateAnalysisHTML(costs, businessType, analysis, timestamp) {
    const date = timestamp ? new Date(timestamp).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');

    let html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
            .logo { color: #2563eb; font-size: 24px; font-weight: bold; }
            .business-type { background: #eff6ff; padding: 10px; border-radius: 8px; margin: 20px 0; }
            .costs-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .costs-table th, .costs-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .costs-table th { background-color: #2563eb; color: white; }
            .costs-table .total-row { background-color: #f3f4f6; font-weight: bold; }
            .recommendations { margin: 20px 0; }
            .recommendation { background: #f0f9ff; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; border-radius: 4px; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🎯 IAtiva - Análisis de Costos</div>
            <p>Reporte generado el ${date}</p>
        </div>

        <div class="business-type">
            <h2>Tipo de Negocio: ${businessType}</h2>
        </div>

        <h3>Desglose de Costos</h3>
        <table class="costs-table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>Valor</th>
                    <th>Porcentaje</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalCosts = 0;
    Object.entries(costs).forEach(([key, value]) => {
        if (typeof value === 'number') {
            totalCosts += value;
        }
    });

    Object.entries(costs).forEach(([key, value]) => {
        if (typeof value === 'number') {
            const percentage = totalCosts > 0 ? ((value / totalCosts) * 100).toFixed(1) + '%' : '0%';
            html += `
                <tr>
                    <td>${getCostDisplayName(key)}</td>
                    <td>${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)}</td>
                    <td>${percentage}</td>
                </tr>
            `;
        }
    });

    html += `
                <tr class="total-row">
                    <td>TOTAL</td>
                    <td>${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalCosts)}</td>
                    <td>100%</td>
                </tr>
            </tbody>
        </table>

        <div class="recommendations">
            <h3>Recomendaciones</h3>
    `;

    if (analysis.recommendations) {
        analysis.recommendations.forEach(rec => {
            html += `<div class="recommendation">${rec.suggestion || rec.text || rec}</div>`;
        });
    }

    html += `
        </div>

        <div class="footer">
            <p>Generado por IAtiva - Sistema Inteligente de Análisis de Costos</p>
            <p>© ${new Date().getFullYear()} IAtiva. Todos los derechos reservados.</p>
        </div>
    </body>
    </html>
    `;

    return html;
}

function generateEmailHTML(costs, businessType, analysis, timestamp, recipientName) {
    const greeting = recipientName ? `Hola ${recipientName},` : 'Hola,';
    const analysisHTML = generateAnalysisHTML(costs, businessType, analysis, timestamp);

    return `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <p>${greeting}</p>
            <p>Te enviamos el análisis de costos que solicitaste de IAtiva:</p>

            ${analysisHTML}

            <p>Si tienes alguna pregunta sobre este análisis, no dudes en contactarnos.</p>
            <p>¡Gracias por usar IAtiva!</p>

            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                Este email fue generado automáticamente por el sistema IAtiva.<br>
                Para más información visita: <a href="https://iativa.com">iativa.com</a>
            </p>
        </div>
    `;
}

function getCostDisplayName(key) {
    const displayNames = {
        materiasPrimas: 'Materias Primas',
        manoDeObra: 'Mano de Obra',
        costosIndirectos: 'Costos Indirectos',
        gastosOperativos: 'Gastos Operativos',
        gastosAdministrativos: 'Gastos Administrativos',
        gastosVentas: 'Gastos de Ventas',
        gastosFinancieros: 'Gastos Financieros',
        depreciacion: 'Depreciación',
        impuestos: 'Impuestos',
        otrosGastos: 'Otros Gastos',
        costoCompra: 'Costo de Compra',
        gastosLogistica: 'Gastos de Logística',
        comisiones: 'Comisiones',
        publicidad: 'Publicidad y Marketing',
        horasConsultor: 'Horas de Consultor',
        gastosDesplazamiento: 'Gastos de Desplazamiento',
        herramientas: 'Herramientas y Software',
        certificaciones: 'Certificaciones',
        seguros: 'Seguros'
    };

    return displayNames[key] || key;
}

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