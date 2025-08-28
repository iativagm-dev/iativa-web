const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');

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
const db = new sqlite3.Database('./data/iativa.db');

// Crear tablas
db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
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

    // Tabla de análisis
    db.run(`CREATE TABLE IF NOT EXISTS analyses (
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

    // Tabla de métricas y analytics
    db.run(`CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        user_id INTEGER,
        session_id TEXT,
        data TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear usuario admin por defecto si no existe
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password, full_name, is_admin) 
            VALUES ('admin', 'admin@iativa.com', ?, 'Administrador IAtiva', 1)`, [adminPassword]);
});

// Middleware de autenticación
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

function requireAdmin(req, res, next) {
    if (req.session.userId && req.session.isAdmin) {
        next();
    } else {
        res.status(403).render('error', { 
            title: 'Acceso Denegado',
            message: 'No tienes permisos para acceder a esta sección.',
            backUrl: '/dashboard'
        });
    }
}

// Función para registrar analytics
function logAnalytics(eventType, req, data = {}) {
    const analytics = {
        event_type: eventType,
        user_id: req.session.userId || null,
        session_id: req.sessionID,
        data: JSON.stringify(data),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
    };
    
    db.run(`INSERT INTO analytics (event_type, user_id, session_id, data, ip_address, user_agent, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [analytics.event_type, analytics.user_id, analytics.session_id, 
             analytics.data, analytics.ip_address, analytics.user_agent]);
}

// =====================================================
// RUTAS PÚBLICAS
// =====================================================

// Página principal
app.get('/', (req, res) => {
    logAnalytics('page_view', req, { page: 'home' });
    res.render('index', { 
        title: 'IAtiva - Tu Aliado en Crecimiento Financiero',
        user: req.session.userId ? { id: req.session.userId, name: req.session.userName } : null
    });
});

// Página de login
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login', { 
        title: 'Iniciar Sesión - IAtiva',
        error: null 
    });
});

// Procesar login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            logAnalytics('login_failed', req, { email });
            return res.render('login', { 
                title: 'Iniciar Sesión - IAtiva',
                error: 'Email o contraseña incorrectos' 
            });
        }

        // Login exitoso
        req.session.userId = user.id;
        req.session.userName = user.full_name || user.username;
        req.session.userEmail = user.email;
        req.session.isAdmin = user.is_admin;

        // Actualizar último login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        
        logAnalytics('login_success', req, { userId: user.id });
        res.redirect('/dashboard');
    });
});

// Página de registro
app.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('register', { 
        title: 'Crear Cuenta - IAtiva',
        error: null 
    });
});

// Procesar registro
app.post('/register', (req, res) => {
    const { username, email, password, full_name, company, phone } = req.body;
    
    // Validaciones básicas
    if (!username || !email || !password || !full_name) {
        return res.render('register', { 
            title: 'Crear Cuenta - IAtiva',
            error: 'Todos los campos obligatorios deben estar completos' 
        });
    }

    if (password.length < 6) {
        return res.render('register', { 
            title: 'Crear Cuenta - IAtiva',
            error: 'La contraseña debe tener al menos 6 caracteres' 
        });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run(`INSERT INTO users (username, email, password, full_name, company, phone) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, full_name, company, phone], 
            function(err) {
                if (err) {
                    let errorMsg = 'Error al crear la cuenta';
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        errorMsg = 'Ya existe una cuenta con ese email';
                    } else if (err.message.includes('UNIQUE constraint failed: users.username')) {
                        errorMsg = 'Ya existe una cuenta con ese nombre de usuario';
                    }
                    
                    return res.render('register', { 
                        title: 'Crear Cuenta - IAtiva',
                        error: errorMsg 
                    });
                }

                logAnalytics('user_registered', req, { userId: this.lastID });
                
                // Auto-login después del registro
                req.session.userId = this.lastID;
                req.session.userName = full_name;
                req.session.userEmail = email;
                req.session.isAdmin = false;
                
                res.redirect('/dashboard');
            });
});

// Logout
app.post('/logout', (req, res) => {
    logAnalytics('logout', req, { userId: req.session.userId });
    req.session.destroy();
    res.redirect('/');
});

// =====================================================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// =====================================================

// Dashboard principal
app.get('/dashboard', requireAuth, (req, res) => {
    logAnalytics('dashboard_view', req);
    
    // Obtener análisis recientes del usuario
    db.all(`SELECT id, business_name, status, created_at 
            FROM analyses 
            WHERE user_id = ? 
            ORDER BY created_at DESC LIMIT 10`, 
            [req.session.userId], (err, analyses) => {
        
        res.render('dashboard', { 
            title: 'Panel de Control - IAtiva',
            user: { 
                id: req.session.userId, 
                name: req.session.userName,
                email: req.session.userEmail 
            },
            analyses: analyses || [],
            isAdmin: req.session.isAdmin
        });
    });
});

// Nuevo análisis - Interfaz web del agente
app.get('/analisis/nuevo', requireAuth, (req, res) => {
    logAnalytics('new_analysis_started', req);
    res.render('analisis', { 
        title: 'Nuevo Análisis de Costeo - IAtiva',
        user: { 
            id: req.session.userId, 
            name: req.session.userName 
        }
    });
});

// API para el chat del agente
app.post('/api/chat', requireAuth, (req, res) => {
    const { message, sessionId } = req.body;
    
    // Crear o recuperar instancia del agente para esta sesión
    if (!req.session.agentInstances) {
        req.session.agentInstances = {};
    }
    
    if (!req.session.agentInstances[sessionId]) {
        req.session.agentInstances[sessionId] = new AgenteIAtiva();
        req.session.agentInstances[sessionId].iniciar();
    }
    
    const agente = req.session.agentInstances[sessionId];
    
    agente.procesarEntrada(message).then(respuesta => {
        logAnalytics('chat_interaction', req, { 
            sessionId, 
            userMessage: message,
            botResponse: respuesta ? respuesta.substring(0, 100) : null
        });
        
        // Si la sesión terminó o tenemos resultados, guardar en BD
        if (respuesta === null || agente.tieneResultados()) {
            const info = agente.obtenerInformacion();
            if (info.tieneResultados) {
                const analysisData = {
                    costos: info.sesionActual.datos.costos,
                    margenGanancia: info.sesionActual.datos.margen_ganancia,
                    nombreUsuario: info.sesionActual.nombreUsuario
                };
                
                const results = agente.calculadora.calcularCompleto(analysisData);
                
                db.run(`INSERT INTO analyses (user_id, session_id, business_name, analysis_data, results, status) 
                        VALUES (?, ?, ?, ?, ?, 'completed')`,
                        [req.session.userId, sessionId, 
                         analysisData.nombreUsuario || 'Análisis', 
                         JSON.stringify(analysisData),
                         JSON.stringify(results)]);
            }
        }
        
        res.json({
            success: true,
            response: respuesta,
            sessionEnded: respuesta === null,
            hasResults: agente.tieneResultados(),
            progress: agente.obtenerInformacion().sesionActual.porcentajeCompletado
        });
    }).catch(error => {
        logAnalytics('chat_error', req, { 
            sessionId, 
            error: error.message 
        });
        
        res.json({
            success: false,
            error: 'Error al procesar el mensaje'
        });
    });
});

// Ver análisis guardado
app.get('/analisis/:id', requireAuth, (req, res) => {
    const analysisId = req.params.id;
    
    db.get(`SELECT * FROM analyses WHERE id = ? AND user_id = ?`, 
           [analysisId, req.session.userId], (err, analysis) => {
        if (err || !analysis) {
            return res.status(404).render('error', {
                title: 'Análisis no encontrado',
                message: 'El análisis solicitado no existe o no tienes permisos para verlo.',
                backUrl: '/dashboard'
            });
        }
        
        logAnalytics('analysis_viewed', req, { analysisId });
        
        const analysisData = JSON.parse(analysis.analysis_data);
        const results = JSON.parse(analysis.results);
        
        res.render('analisis-view', {
            title: `Análisis: ${analysis.business_name} - IAtiva`,
            user: { 
                id: req.session.userId, 
                name: req.session.userName 
            },
            analysis,
            analysisData,
            results
        });
    });
});

// Generar reporte PDF/HTML
app.get('/analisis/:id/reporte/:formato?', requireAuth, (req, res) => {
    const { id: analysisId, formato = 'html' } = req.params;
    
    db.get(`SELECT * FROM analyses WHERE id = ? AND user_id = ?`, 
           [analysisId, req.session.userId], async (err, analysis) => {
        if (err || !analysis) {
            return res.status(404).json({ error: 'Análisis no encontrado' });
        }
        
        const analysisData = JSON.parse(analysis.analysis_data);
        const results = JSON.parse(analysis.results);
        
        const generador = new GeneradorReportes();
        const reporteResult = await generador.generarReporteCompleto(
            analysisData, 
            results, 
            formato
        );
        
        if (!reporteResult.exito) {
            return res.status(500).json({ error: 'Error al generar reporte' });
        }
        
        logAnalytics('report_generated', req, { 
            analysisId, 
            formato, 
            fileName: reporteResult.archivo 
        });
        
        // Enviar archivo para descarga
        res.download(reporteResult.rutaCompleta, reporteResult.archivo);
    });
});

// =====================================================
// RUTAS DE ADMINISTRACIÓN
// =====================================================

// Panel de administración
app.get('/admin', requireAdmin, (req, res) => {
    logAnalytics('admin_panel_view', req);
    
    // Obtener estadísticas generales
    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM analyses) as total_analyses,
            (SELECT COUNT(*) FROM analytics WHERE date(created_at) = date('now')) as today_visits,
            (SELECT COUNT(*) FROM analyses WHERE date(created_at) = date('now')) as today_analyses
    `, (err, stats) => {
        
        // Obtener análisis recientes
        db.all(`
            SELECT a.*, u.full_name, u.email 
            FROM analyses a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC 
            LIMIT 20
        `, (err, recentAnalyses) => {
            
            res.render('admin/dashboard', {
                title: 'Panel de Administración - IAtiva',
                user: { 
                    id: req.session.userId, 
                    name: req.session.userName 
                },
                stats: stats[0] || {},
                recentAnalyses: recentAnalyses || []
            });
        });
    });
});

// Gestión de usuarios
app.get('/admin/usuarios', requireAdmin, (req, res) => {
    db.all(`
        SELECT u.*, 
               COUNT(a.id) as total_analyses,
               MAX(a.created_at) as last_analysis
        FROM users u 
        LEFT JOIN analyses a ON u.id = a.user_id 
        GROUP BY u.id 
        ORDER BY u.created_at DESC
    `, (err, users) => {
        
        res.render('admin/usuarios', {
            title: 'Gestión de Usuarios - IAtiva',
            user: { 
                id: req.session.userId, 
                name: req.session.userName 
            },
            users: users || []
        });
    });
});

// Analytics y métricas
app.get('/admin/analytics', requireAdmin, (req, res) => {
    // Obtener métricas de los últimos 30 días
    db.all(`
        SELECT 
            date(created_at) as fecha,
            event_type,
            COUNT(*) as total
        FROM analytics 
        WHERE created_at >= date('now', '-30 days')
        GROUP BY date(created_at), event_type
        ORDER BY fecha DESC, total DESC
    `, (err, dailyMetrics) => {
        
        res.render('admin/analytics', {
            title: 'Analytics y Métricas - IAtiva',
            user: { 
                id: req.session.userId, 
                name: req.session.userName 
            },
            metrics: dailyMetrics || []
        });
    });
});

// =====================================================
// API ENDPOINTS ADICIONALES
// =====================================================

// API para obtener datos del usuario actual
app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        isAdmin: req.session.isAdmin
    });
});

// API para listar análisis del usuario
app.get('/api/analyses', requireAuth, (req, res) => {
    db.all(`SELECT id, business_name, status, created_at 
            FROM analyses 
            WHERE user_id = ? 
            ORDER BY created_at DESC`, 
            [req.session.userId], (err, analyses) => {
        
        if (err) {
            return res.status(500).json({ error: 'Error al obtener análisis' });
        }
        
        res.json(analyses);
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Página no encontrada',
        message: 'La página que buscas no existe.',
        backUrl: '/'
    });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error del servidor',
        message: 'Ocurrió un error interno del servidor.',
        backUrl: '/'
    });
});

// Crear directorio de datos si no existe
const fs = require('fs');
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
🚀 ===================================
🧠 IATIVA WEB SERVER INICIADO
🌐 Servidor ejecutándose en puerto ${PORT}
📊 Base de datos SQLite conectada
🔐 Autenticación habilitada
📈 Analytics activado
🎯 Panel de admin disponible
===================================
`);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`
🔗 URLs disponibles:
   • Aplicación: http://localhost:${PORT}
   • Dashboard: http://localhost:${PORT}/dashboard
   • Admin: http://localhost:${PORT}/admin
   
👤 Usuario admin por defecto:
   • Email: admin@iativa.com
   • Contraseña: admin123
`);
    }
});

module.exports = app;