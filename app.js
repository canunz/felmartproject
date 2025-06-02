// app.js
require('dotenv').config();
const express         = require('express');
const path            = require('path');
const session         = require('express-session');
const flash           = require('connect-flash');
const helmet          = require('helmet');
const cors            = require('cors');
const expressLayouts  = require('express-ejs-layouts');
const sequelize       = require('./config/database');
const apiRoutes       = require('./routes/api');

const app = express();
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
        const [usuarios] = await sequelize.query(
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

// Importar rutas
const routes = require('./routes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');
const clientesRoutes = require('./routes/api/clientesRoutes');

// Usar rutas
app.use('/', routes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/notificaciones', notificacionesRoutes);
app.use('/api', clientesRoutes);

// Rutas de la API
app.use('/api/cmf', require('./routes/api/cmfBancos.routes'));
app.use('/api', apiRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Error interno del servidor' 
  });
});

// Levantar servidor
const PORT = process.env.PORT || 3000;

sequelize.sync()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err);
    });

// Exportar la aplicación para pruebas
module.exports = app;