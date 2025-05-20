// app.js
require('dotenv').config();
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const flash           = require('connect-flash');
const helmet          = require('helmet');
const cors            = require('cors');
const expressLayouts  = require('express-ejs-layouts');
const app = express();
const pool            = require('./config/database'); // Asegúrate de que este archivo exista
const { verifyConnection } = require('./config/email.config');

// Verificar conexión del correo al inicio
verifyConnection();

// Seguridad HTTP headers (CSP permite jQuery desde code.jquery.com y recursos de FullCalendar)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://kit.fontawesome.com"
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      "img-src": ["'self'", "data:"]
    }
  }
}));

// CORS y parsers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (debe ir antes de tus rutas)
app.use(express.static(path.join(__dirname, 'public')));

// Layouts EJS
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Flash messages
app.use(flash());

// Sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto-felmart',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000  // 1 día
  }
}));

// Middleware para variables globales
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  // Añadir la ruta actual para seleccionar el menú activo en el sidebar
  res.locals.currentPath = req.path;
  next();
});

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rutas
app.use('/', require('./routes/index'));
app.use('/usuarios', require('./routes/usuarioRoutes'));
app.use('/clientes', require('./routes/clienteRoutes'));
app.use('/residuos', require('./routes/residuoRoutes'));
app.use('/solicitudes', require('./routes/solicitudRoutes'));
app.use('/cotizaciones', require('./routes/cotizacionRoutes'));
app.use('/calendario', require('./routes/calendarioRoutes')); // Nueva ruta
app.use('/visitas', require('./routes/visitaRoutes'));
app.use('/certificados', require('./routes/certificadoRoutes'));
app.use('/notificaciones', require('./routes/notificacionRoutes'));
app.use('/reportes', require('./routes/reporteRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes')); // Nueva ruta
app.use('/perfil', require('./routes/perfilRoutes')); // Nueva ruta
app.use('/precioresiduos', require('./routes/precioresiduosRoutes'));

// Rutas de la API
app.use('/api/cmf', require('./routes/api/cmfBancos.routes'));

// 404 Not Found - Actualización para usar nuestra página de error personalizada
app.use((req, res) => {
  res.status(404).render('404', {
    titulo: 'Página no encontrada',
    mensaje: 'La página que buscas no existe',
    usuario: req.session.usuario || null,
    layout: false // No usar el layout principal
  });
});

// Error handler - Actualización para usar página de error personalizada
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).render('500', {
    titulo: 'Error en el servidor',
    mensaje: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    usuario: req.session.usuario || null,
    layout: false // No usar el layout principal
  });
});

// Levantar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});

module.exports = app;