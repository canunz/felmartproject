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

// Importar todas las rutas
const routes = require('./routes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificacionesRoutes = require('./routes/notificacionesRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const precioresiduosRoutes = require('./routes/precioresiduosRoutes');
const visitaRoutes = require('./routes/visitaRoutes');
const clientesApiRoutes = require('./routes/api/clientesRoutes');
const cotizacionesApiRoutes = require('./routes/api/cotizacionesRoutes');
const apiRoutes = require('./routes/api/apiRoutes');
const contactoRoutes = require('./routes/contactoRoutes');
const empleadosApiRoutes = require('./routes/api/empleadosRoutes');
const visitasApiRoutes = require('./routes/api/visitasRoutes');
const notificacionesApiRoutes = require('./routes/api/notificacionesRoutes');
const portalClienteRoutes = require('./routes/api/portalClienteRoutes');

// NUEVA IMPORTACIÓN - Rutas de certificados
const certificadosClienteRoutes = require('./routes/api/certificadosClienteRoutes');

const app = express();

// Verificar conexión del correo al inicio
try {
  const { verifyConnection } = require('./config/email.config');
  verifyConnection();
} catch (error) {
  console.log('⚠️  Email config no encontrado, continuando sin verificación de email');
}

// Seguridad HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://code.jquery.com",
        "https://kit.fontawesome.com",
        "https://cdn.datatables.net"
      ],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.datatables.net"
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

// Archivos estáticos
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
    const camposRequeridos = ['id', 'nombre', 'email', 'rol'];
    
    const sesionCompleta = camposRequeridos.every(campo => 
      req.session.usuario[campo] !== undefined
    );
    
    if (!sesionCompleta && req.session.usuario.id) {
      console.log('Completando datos de sesión para usuario ID:', req.session.usuario.id);
      
      try {
        const [usuarios] = await sequelize.query(
          `SELECT id, nombre, email, rol FROM usuarios WHERE id = ${parseInt(req.session.usuario.id, 10)}`
        );
        
        if (usuarios.length > 0) {
          camposRequeridos.forEach(campo => {
            if (req.session.usuario[campo] === undefined && usuarios[0][campo] !== undefined) {
              req.session.usuario[campo] = usuarios[0][campo];
            }
          });
          
          req.session.save(err => {
            if (err) console.error('Error al guardar sesión:', err);
            next();
          });
        } else {
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
  res.locals.currentPath = req.path;
  next();
});

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Importar controladores
const clienteController = require('./controllers/clienteController');

// === RUTAS ESPECÍFICAS PARA LA PÁGINA DE CLIENTES ===
// Ruta para renderizar la página de gestión de clientes
app.get('/dashboard/clientes', (req, res) => {
  // Verificar autenticación y permisos
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  if (req.session.usuario.rol !== 'administrador') {
    req.flash('error_msg', 'No tienes permisos para acceder a esta página');
    return res.redirect('/dashboard');
  }
  
  // Usar el controlador en lugar de renderizar directamente
  clienteController.mostrarDashboard(req, res);
});

// === RUTAS PARA COTIZACIONES (ADMIN) ===
// Ruta para renderizar la página de gestión de cotizaciones (para admin)
app.get('/admin/cotizaciones', (req, res) => {
  // Verificar autenticación y permisos
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  if (req.session.usuario.rol !== 'administrador') {
    req.flash('error_msg', 'No tienes permisos para acceder a esta página');
    return res.redirect('/dashboard');
  }
  
  // Renderizar la página de gestión de cotizaciones sin layout
  res.render('admin/cotizaciones', {
    layout: false,  // Sin layout porque es una página completa
    titulo: 'Gestión de Cotizaciones',
    usuario: req.session.usuario
  });
});

// === USAR RUTAS ===
app.use('/', routes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/notificaciones', notificacionesRoutes);
app.use('/cotizaciones', cotizacionRoutes);
app.use('/precios-residuos', precioresiduosRoutes);
app.use('/visitas', visitaRoutes);
app.use('/api', apiRoutes);
app.use('/api', clientesApiRoutes);
app.use('/api', cotizacionesApiRoutes);
app.use('/api', empleadosApiRoutes);
app.use('/api', visitasApiRoutes);
app.use('/api', notificacionesApiRoutes);
app.use('/api', portalClienteRoutes);
app.use('/api', certificadosClienteRoutes);
app.use('/contacto', contactoRoutes);

// === RUTAS DE CONTACTO ===
app.use('/contacto', contactoRoutes);

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
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`🌐 Accede a: http://localhost:${PORT}`);
            console.log(`📊 Clientes: http://localhost:${PORT}/dashboard/clientes`);
            console.log(`📝 Cotizaciones: http://localhost:${PORT}/admin/cotizaciones`);
            console.log(`💰 Cotizar: http://localhost:${PORT}/cotizaciones/cotizar`);
            console.log(`🏆 Certificados: http://localhost:${PORT}/certificados`);
        });
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err);
    });

// Exportar la aplicación para pruebas
module.exports = app;