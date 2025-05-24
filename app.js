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
// En app.js - Modificar la configuración de Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",  // Añadir esto para permitir scripts en línea
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://kit.fontawesome.com"
      ],
      "script-src-attr": ["'unsafe-inline'"],  // Añadir esta línea para permitir controladores de eventos en línea
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
        "https://cdnjs.cloudflare.com",
        "data:"
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

// Middleware para garantizar la integridad de datos de sesión
app.use(async (req, res, next) => {
  if (req.session.usuario) {
    // Lista de campos que debería tener un usuario completo
    const camposRequeridos = ['id', 'nombre', 'email', 'rol'];
    
    // Verificar si todos los campos necesarios están presentes
    const sesionCompleta = camposRequeridos.every(campo => 
      req.session.usuario[campo] !== undefined
    );
    
    // Si falta algún campo y tenemos el ID, intentamos recuperar los datos
    if (!sesionCompleta && req.session.usuario.id) {
      console.log('Completando datos de sesión para usuario ID:', req.session.usuario.id);
      
      try {
        const [usuarios] = await pool.query(
          `SELECT id, nombre, email, rol FROM usuarios WHERE id = ${parseInt(req.session.usuario.id, 10)}`
        );
        
        if (usuarios.length > 0) {
          // Actualizar la sesión con datos completos (sin sobrescribir campos existentes)
          camposRequeridos.forEach(campo => {
            if (req.session.usuario[campo] === undefined && usuarios[0][campo] !== undefined) {
              req.session.usuario[campo] = usuarios[0][campo];
            }
          });
          
          // Guardar sesión actualizada
          req.session.save(err => {
            if (err) console.error('Error al guardar sesión:', err);
            next();
          });
        } else {
          // Si no encontramos el usuario, mejor limpiar la sesión
          req.session.usuario = null;
          req.session.save(err => {
            if (err) console.error('Error al guardar sesión:', err);
            next();
          });
        }
      } catch (error) {
        console.error('Error al recuperar datos de usuario:', error);
        next();
      }
    } else {
      next();
    }
  } else {
    next();
  }
});

// Middleware para variables globales
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  // Añadir la ruta actual para seleccionar el menú activo en el sidebar
  res.locals.currentPath = req.path;
  next();
});

// Middleware para depurar sesión (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/perfil')) {
      console.log('Datos de sesión en ruta perfil:', JSON.stringify(req.session.usuario, null, 2));
    }
    next();
  });
}

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
app.use('/contacto', require('./routes/contactoRoutes'));
app.use('/calendario', require('./routes/calendarioRoutes'));
app.use('/visitas', require('./routes/visitaRoutes'));
app.use('/certificados', require('./routes/certificadosRoutes'));
app.use('/notificaciones', require('./routes/notificacionRoutes'));
app.use('/reportes', require('./routes/reporteRoutes'));

app.use('/dashboard', require('./routes/dashboardRoutes')); // Nueva ruta
app.use('/perfil', require('./routes/perfilRoutes')); // Nueva ruta
app.use('/precioresiduos', require('./routes/precioresiduosRoutes'));

// Rutas de la API
app.use('/api/cmf', require('./routes/api/cmfBancos.routes'));

app.use('/dashboard', require('./routes/dashboardRoutes')); 
app.use('/perfil', require('./routes/perfilRoutes')); 

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