/**
 * Middleware de Seguridad
 * Rate limiting, validación y protección contra ataques
 */

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Rate limiter general para toda la API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 requests por ventana
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.logSecurity('rate_limit_exceeded', {
            ip: req.ip,
            url: req.originalUrl,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({
            error: 'Demasiadas solicitudes',
            message: 'Has excedido el límite de solicitudes. Por favor, intenta de nuevo en unos minutos.',
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        });
    }
});

// Rate limiter estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos de login
    message: 'Demasiados intentos de inicio de sesión, por favor intenta de nuevo más tarde.',
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        logger.logSecurity('auth_rate_limit_exceeded', {
            ip: req.ip,
            url: req.originalUrl,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({
            error: 'Demasiados intentos de autenticación',
            message: 'Has excedido el límite de intentos de inicio de sesión. Tu cuenta ha sido temporalmente bloqueada por seguridad.'
        });
    }
});

// Rate limiter para APIs públicas
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // 30 requests por minuto
    message: 'Demasiadas solicitudes a la API',
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiter para operaciones costosas (PDF, Excel, etc.)
const heavyOperationsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 operaciones pesadas por hora
    message: 'Límite de operaciones pesadas alcanzado',
    handler: (req, res) => {
        logger.logSecurity('heavy_operation_limit_exceeded', {
            ip: req.ip,
            operation: req.originalUrl,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({
            error: 'Límite alcanzado',
            message: 'Has alcanzado el límite de generación de documentos. Por favor, intenta de nuevo en una hora.'
        });
    }
});

// Validaciones comunes
const validators = {
    // Validación de registro de usuario
    userRegistration: [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email inválido')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 8 })
            .withMessage('La contraseña debe tener al menos 8 caracteres')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
        body('nombre')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
            .withMessage('El nombre solo puede contener letras y espacios')
    ],

    // Validación de login
    userLogin: [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email inválido')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('La contraseña es requerida')
    ],

    // Validación de datos de costeo
    costingData: [
        body('costosFijos')
            .isNumeric()
            .withMessage('Los costos fijos deben ser un número')
            .isFloat({ min: 0 })
            .withMessage('Los costos fijos deben ser mayores o iguales a 0'),
        body('costosVariables')
            .isNumeric()
            .withMessage('Los costos variables deben ser un número')
            .isFloat({ min: 0 })
            .withMessage('Los costos variables deben ser mayores o iguales a 0'),
        body('precioVenta')
            .optional()
            .isNumeric()
            .withMessage('El precio de venta debe ser un número')
            .isFloat({ min: 0 })
            .withMessage('El precio de venta debe ser mayor a 0'),
        body('unidadesEstimadas')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Las unidades estimadas deben ser un número entero mayor a 0')
    ],

    // Validación de email
    email: [
        body('email')
            .trim()
            .isEmail()
            .withMessage('Email inválido')
            .normalizeEmail(),
        body('asunto')
            .trim()
            .isLength({ min: 3, max: 200 })
            .withMessage('El asunto debe tener entre 3 y 200 caracteres'),
        body('mensaje')
            .trim()
            .isLength({ min: 10, max: 5000 })
            .withMessage('El mensaje debe tener entre 10 y 5000 caracteres')
    ],

    // Validación de feedback
    feedback: [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('La calificación debe ser un número entre 1 y 5'),
        body('comentario')
            .optional()
            .trim()
            .isLength({ max: 1000 })
            .withMessage('El comentario no puede exceder 1000 caracteres')
    ]
};

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        logger.logSecurity('validation_error', {
            ip: req.ip,
            url: req.originalUrl,
            errors: errors.array()
        });

        return res.status(400).json({
            error: 'Datos inválidos',
            message: 'Los datos proporcionados no son válidos',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

// Sanitización de inputs para prevenir XSS
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim();
        }
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                obj[key] = sanitize(obj[key]);
            });
        }
        return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);

    next();
};

// Middleware para prevenir ataques de timing
const constantTimeResponse = (req, res, next) => {
    const startTime = Date.now();
    const minResponseTime = 100; // Mínimo 100ms para ocultar timing

    res.on('finish', () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < minResponseTime) {
            setTimeout(() => {}, minResponseTime - elapsed);
        }
    });

    next();
};

// Middleware para detectar patrones sospechosos
const detectSuspiciousActivity = (req, res, next) => {
    const suspiciousPatterns = [
        /(\%27)|(\')|(\-\-)|(%23)|(#)/i, // SQL Injection
        /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i, // XSS
        /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/i // XSS img
    ];

    const checkString = `${req.originalUrl} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            logger.logSecurity('suspicious_activity_detected', {
                ip: req.ip,
                url: req.originalUrl,
                userAgent: req.get('user-agent'),
                pattern: pattern.toString()
            });

            return res.status(403).json({
                error: 'Solicitud bloqueada',
                message: 'Se detectó actividad sospechosa en tu solicitud'
            });
        }
    }

    next();
};

module.exports = {
    generalLimiter,
    authLimiter,
    apiLimiter,
    heavyOperationsLimiter,
    validators,
    handleValidationErrors,
    sanitizeInput,
    constantTimeResponse,
    detectSuspiciousActivity
};