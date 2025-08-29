const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const cors = require('cors');

// Importar módulos de IAtiva
const AgenteIAtiva = require('./src/agent');
const GeneradorReportes = require('./src/generador-reportes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'iativa-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Inicializar base de datos SQLite
const db = new Database('./data/iativa.db');

// Crear tablas
db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    company TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_admin BOOLEAN DEFAULT 0
)`);

db.exec(`CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    business_name TEXT,
    analysis_data TEXT NOT NULL,
    results TEXT NOT NULL,
    recommendations TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Preparar statements
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const updateUserLogin = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
const insertUser = db.prepare(`INSERT INTO users (username, email, password, full_name, company, phone) 
                               VALUES (?, ?, ?, ?, ?, ?)`);
const insertAnalysis = db.prepare(`INSERT INTO analyses (user_id, session_id, business_name, analysis_data, results, status) 
                                   VALUES (?, ?, ?, ?, ?, ?)`);
const getAnalysisByUser = db.prepare(`SELECT id, business_name, status, created_at 
                                      FROM analyses WHERE user_id = ? 
                                      ORDER BY created_at DESC LIMIT 10`);
const getAnalysisById = db.prepare('SELECT * FROM analyses WHERE id = ? AND user_id = ?');
const insertAnalytics = db.prepare(`INSERT INTO analytics (event_type, user_id, session_id, data, ip_address, user_agent) 
                                    VALUES (?, ?, ?, ?, ?, ?)`);
const getAllUsers = db.prepare('SELECT id, username, email, full_name, company, created_at, last_login FROM users ORDER BY created_at DESC');
const getAllAnalyses = db.prepare('SELECT a.*, u.username FROM analyses a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC');

// Crear usuario admin por defecto
const adminPassword = bcrypt.hashSync('admin123', 10);
try {
    insertUser.run('admin', 'admin@iativa.com', adminPassword, 'Administrador IAtiva', 'IAtiva', '');
} catch (err) {
    // Usuario admin ya existe
}

// Función para registrar analytics
function logAnalytics(eventType, req, data = {}) {
    try {
        insertAnalytics.run(
            eventType,
            req.session.userId || null,
            req.sessionID,
            JSON.stringify(data),
            req.ip,
            req.get('User-Agent')
        );
    } catch (err) {
        console.error('Error logging analytics:', err);
    }
}

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
        const user = getUserByEmail.get(email);
        
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.userName = user.full_name || user.username;
            req.session.isAdmin = user.is_admin === 1;
            
            updateUserLogin.run(user.id);
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
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = insertUser.run(username, email, hashedPassword, fullName, company, phone);
        
        logAnalytics('user_registered', req, { userId: result.lastInsertRowid });
        
        res.render('register', { 
            title: 'Registro - IAtiva',
            success: 'Registro exitoso. Ya puedes iniciar sesión.' 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.render('register', { 
            title: 'Registro - IAtiva',
            error: 'Error en el registro. El email o usuario puede estar en uso.' 
        });
    }
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    try {
        const analyses = getAnalysisByUser.all(req.session.userId);
        
        logAnalytics('dashboard_view', req);
        
        res.render('dashboard', {
            title: 'Dashboard - IAtiva',
            user: { id: req.session.userId, name: req.session.userName },
            analyses: analyses.map(a => ({
                ...a,
                created_at: new Date(a.created_at).toLocaleDateString('es-CO')
            }))
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

// Chat API para análisis
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
            const analysisData = JSON.stringify(response.datosRecopilados);
            const results = JSON.stringify(response.resultados);
            
            insertAnalysis.run(
                req.session.userId,
                sessionId,
                response.datosRecopilados.nombreNegocio || 'Análisis Sin Nombre',
                analysisData,
                results,
                'completed'
            );
        }
        
        logAnalytics('chat_interaction', req, { sessionId, messageLength: message.length });
        
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Nuevo análisis
app.get('/analisis/nuevo', requireAuth, (req, res) => {
    logAnalytics('new_analysis_started', req);
    
    res.render('layout', {
        title: 'Nuevo Análisis - IAtiva',
        user: { id: req.session.userId, name: req.session.userName },
        body: `
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Nuevo Análisis de Costeo</h1>
            <div id="chat-container" class="bg-white rounded-lg shadow-lg p-6">
                <div id="chat-messages" class="space-y-4 mb-6 min-h-[400px]"></div>
                <div class="flex space-x-2">
                    <input type="text" id="message-input" placeholder="Escribe tu mensaje..." 
                           class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <button id="send-button" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Enviar
                    </button>
                </div>
            </div>
        </div>
        <script src="/js/chat.js"></script>
        `
    });
});

// Ver análisis
app.get('/analisis/:id', requireAuth, (req, res) => {
    try {
        const analysis = getAnalysisById.get(req.params.id, req.session.userId);
        
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

// Logout
app.post('/logout', (req, res) => {
    logAnalytics('logout', req, { userId: req.session.userId });
    req.session.destroy();
    res.redirect('/');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 IAtiva Web Server funcionando en puerto ${PORT}`);
    console.log(`📱 Aplicación disponible en: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin login: admin@iativa.com / admin123`);
});

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});