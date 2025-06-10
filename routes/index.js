// routes/index.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const dashboardController = require('../controllers/dashboardController');
const notificacionController = require('../controllers/notificacionController');
const { isAuthenticated } = require('../middlewares/auth');

// Importar rutas
const dashboardRoutes = require('./dashboardRoutes');
const clienteRoutes = require('./api/clientesRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const cotizacionRoutes = require('./cotizacionRoutes');
const visitasRoutes = require('./api/visitasRoutes');

// En tu controlador o route handler
router.get('/', (req, res) => {
  res.render('home', {
    titulo: 'Felmart - Gestión de Residuos',
    error: req.flash('error'),
    success: req.flash('success'),
    layout: false  // Esto desactiva el layout para esta vista específica
  });
});

// routes/index.js o el archivo donde tengas tus rutas
router.get('/sobre-nosotros', (req, res) => {
  res.render('sobre-nosotros', {
    titulo: 'Sobre Nosotros - Felmart'
  });
});

// Rutas de autenticación
router.get('/registro', usuarioController.mostrarRegistro);
router.post('/registro', usuarioController.registrar);
router.get('/login', usuarioController.mostrarLogin);
router.post('/login', usuarioController.login);
router.get('/logout', usuarioController.logout);

// Rutas de notificaciones (protegidas)
router.get('/notificaciones/no-leidas', isAuthenticated, notificacionController.obtenerNoLeidas);
router.post('/notificaciones/marcar-leida/:id', isAuthenticated, notificacionController.marcarComoLeida);
router.post('/notificaciones/marcar-todas-leidas', isAuthenticated, notificacionController.marcarTodasLeidas);

// Ruta del dashboard
router.get('/dashboard', (req, res) => {
  // Protección restaurada: redirige a login si no hay sesión
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  
  // Redirigir según el rol como estaba originalmente
  switch (req.session.usuario.rol) {
    case 'administrador':
      return dashboardController.renderAdminDashboard(req, res);
    case 'operador':
      return res.render('dashboard/operador', {
        titulo: 'Panel de Control - Operador',
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    case 'cliente':
      return res.render('dashboard/cliente', {
        titulo: 'Panel de Control - Cliente',
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    default:
      req.flash('error', 'Rol de usuario no válido');
      return res.redirect('/logout'); 
  }
});

// Rutas de la aplicación
router.use('/dashboard', dashboardRoutes);
router.use('/api/clientes', clienteRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/cotizaciones', cotizacionRoutes);
router.use('/api/visitas', visitasRoutes);

module.exports = router;