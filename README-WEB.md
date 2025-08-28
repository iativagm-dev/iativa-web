# 🧠 IAtiva Web - Asesor de Costeo y Proyecciones

**Versión Web Completa** de IAtiva, tu aliado en crecimiento financiero. Aplicación web profesional para análisis de costeo, proyecciones financieras y recomendaciones de negocio.

## 🌟 Características de la Versión Web

### ✅ **Funcionalidades Principales**
- 🎯 **Análisis de Costeo Completo** - 8 categorías de costos
- ⚖️ **Punto de Equilibrio** - Cálculo automático de unidades mínimas
- 📈 **Proyecciones de 3 Escenarios** - Pesimista, realista, optimista
- 💡 **Recomendaciones Personalizadas** - IA especializada en finanzas
- 📅 **Plan de Acción 30 Días** - Estrategia paso a paso
- 📄 **Reportes Profesionales** - PDF y HTML descargables
- 💾 **Historial Completo** - Todos tus análisis guardados
- 📊 **Dashboard Interactivo** - Estadísticas y métricas

### 🔐 **Sistema de Usuarios**
- **Registro/Login seguro** con encriptación bcrypt
- **Sesiones persistentes** para múltiples dispositivos
- **Perfiles de usuario** con información personalizada
- **Análisis privados** - Solo tú puedes ver tus datos

### 🛡️ **Panel de Administración**
- **Gestión de usuarios** y análisis
- **Métricas de uso** y analytics completos
- **Monitoreo del sistema** en tiempo real
- **Dashboard administrativo** avanzado

### 📱 **Diseño Responsivo**
- **100% Mobile-First** - Funciona perfecto en móviles
- **Interfaz moderna** con Tailwind CSS
- **Animaciones suaves** y experiencia fluida
- **Dark mode** (próximamente)

## 🚀 Despliegue en Railway

### **Paso 1: Preparación**
```bash
# 1. Asegúrate de tener Git inicializado
git init
git add .
git commit -m "Initial commit: IAtiva Web App"

# 2. Sube tu código a GitHub (si aún no lo has hecho)
git remote add origin https://github.com/tu-usuario/iativa-web
git push -u origin main
```

### **Paso 2: Desplegar en Railway**
1. Ve a [railway.app](https://railway.app)
2. Haz login con tu cuenta
3. Click en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Elige tu repositorio `iativa-web`
6. Railway detectará automáticamente que es una app Node.js
7. ¡El despliegue comenzará automáticamente!

### **Paso 3: Configuración de Variables**
En el dashboard de Railway, ve a **Variables** y configura:
```env
NODE_ENV=production
SESSION_SECRET=tu-secreto-super-seguro-2024
```

### **Paso 4: ¡Listo!**
Railway te proporcionará una URL como:
```
https://iativa-web-production.railway.app
```

## 💻 Desarrollo Local

### **Instalación**
```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración
cp .env.example .env

# 3. Iniciar servidor de desarrollo
npm run dev
```

### **Scripts disponibles**
```bash
npm start      # Producción
npm run dev    # Desarrollo con nodemon
npm run cli    # Versión CLI original
npm run demo   # Demo completa
npm run test   # Pruebas
```

## 🗄️ Base de Datos

La aplicación usa **SQLite** que se crea automáticamente:
- `data/iativa.db` - Base de datos principal
- **Tablas**: users, analyses, analytics
- **Backup automático** en Railway

## 🔐 Seguridad Implementada

- ✅ **Passwords encriptados** con bcrypt
- ✅ **Sesiones seguras** con express-session  
- ✅ **Validación de datos** en cliente y servidor
- ✅ **Protección CSRF** (próximamente)
- ✅ **Rate limiting** (próximamente)
- ✅ **HTTPS obligatorio** en producción

## 📊 Analytics y Métricas

El sistema registra automáticamente:
- **Visitas y páginas vistas**
- **Análisis creados**
- **Reportes generados**
- **Tiempo de uso**
- **Errores del sistema**

## 🎨 Interfaz de Usuario

### **Tecnologías Frontend**
- **Tailwind CSS** - Framework de estilos
- **Alpine.js** - Interactividad ligera
- **Font Awesome** - Iconos profesionales
- **Chart.js** - Gráficos y visualizaciones
- **EJS** - Templates del servidor

### **Páginas Principales**
1. **Landing Page** (`/`) - Presentación y registro
2. **Dashboard** (`/dashboard`) - Panel principal del usuario
3. **Nuevo Análisis** (`/analisis/nuevo`) - Chat interactivo
4. **Ver Análisis** (`/analisis/:id`) - Resultados detallados
5. **Admin Panel** (`/admin`) - Administración del sistema

## 🔧 API Endpoints

### **Públicos**
- `GET /` - Página principal
- `POST /login` - Iniciar sesión
- `POST /register` - Crear cuenta

### **Protegidos (requieren login)**
- `GET /dashboard` - Panel del usuario
- `POST /api/chat` - Interacción con el agente
- `GET /api/analyses` - Lista de análisis
- `GET /analisis/:id/reporte` - Descargar reporte

### **Administración**
- `GET /admin` - Panel de administración
- `GET /admin/usuarios` - Gestión de usuarios
- `GET /admin/analytics` - Métricas del sistema

## 🎯 Casos de Uso

### **Para Emprendedores**
- Calcular precios de productos/servicios
- Determinar punto de equilibrio
- Proyectar ventas y utilidades
- Obtener consejos de marketing

### **Para Estudiantes**
- Aprender análisis financiero
- Practicar cálculos de costeo
- Estudiar casos reales
- Generar reportes académicos

### **Para Instructores**
- Herramienta educativa completa
- Ejemplos prácticos para clases
- Seguimiento de estudiantes
- Material didáctico integrado

## 📞 Soporte y Contacto

- **Email**: iativagm@gmail.com
- **Documentación**: Ver código comentado
- **Issues**: GitHub Issues
- **Updates**: Síguenos para nuevas características

## 🎉 **¡Tu aplicación web está lista!**

Con esta implementación tienes:
- ✅ **Aplicación web completa y profesional**
- ✅ **Sistema de usuarios robusto**
- ✅ **Panel de administración avanzado**  
- ✅ **Base de datos integrada**
- ✅ **Analytics completos**
- ✅ **Diseño responsive moderno**
- ✅ **Configuración para Railway lista**
- ✅ **Código documentado y escalable**

**¡Solo súbelo a GitHub y despliégalo en Railway!** 🚀

---

*Desarrollado con ❤️ para emprendedores que quieren hacer crecer sus negocios*