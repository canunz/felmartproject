// routes/api/portalClienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/clienteController');

// Middleware de autenticación para clientes
const requireClientAuth = (req, res, next) => {
  console.log('🔐 Verificando autenticación cliente...');
  console.log('Usuario en sesión:', req.session?.usuario);
  
  if (!req.session.usuario) {
    console.log('❌ No hay usuario en sesión');
    return res.status(401).json({
      success: false,
      message: 'No autorizado - Debe iniciar sesión'
    });
  }
  
  // Verificar que el usuario sea cliente (no administrador)
  if (req.session.usuario.rol === 'administrador') {
    console.log('❌ Usuario es administrador, no cliente');
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado - Esta área es solo para clientes'
    });
  }
  
  console.log('✅ Cliente autenticado:', req.session.usuario.email);
  next();
};

// Middleware de autenticación general (para vistas)
const requireAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
};

// ================== RUTAS DE VISTAS ==================

// Página principal del cliente (calendario/solicitudes)
router.get('/cliente/calendario', requireAuth, (req, res) => {
  console.log('📄 Renderizando página calendario para:', req.session.usuario.email);
  res.render('cliente/calendario', { 
    titulo: 'Solicitar Retiro - Portal Cliente Felmart',
    usuario: req.session.usuario
  });
});

// Otras páginas del cliente
router.get('/cliente/inicio', requireAuth, (req, res) => {
    res.render('cliente/inicio', { 
        titulo: 'Inicio - Portal Cliente Felmart',
        usuario: req.session.usuario
    });
});

router.get('/cliente/solicitudes', requireAuth, (req, res) => {
    res.render('cliente/solicitudes', { 
        titulo: 'Mis Solicitudes - Portal Cliente Felmart',
        usuario: req.session.usuario
    });
});

router.get('/cliente/cotizaciones', requireAuth, (req, res) => {
    res.render('cliente/cotizaciones', { 
        titulo: 'Mis Cotizaciones - Portal Cliente Felmart',
        usuario: req.session.usuario
    });
});

router.get('/cliente/certificados', requireAuth, (req, res) => {
    res.render('cliente/certificados', { 
        titulo: 'Mis Certificados - Portal Cliente Felmart',
        usuario: req.session.usuario
    });
});

// ================== RUTAS API ==================

// Información del cliente logueado
router.get('/cliente/info', requireClientAuth, (req, res) => {
  console.log('📋 API: Obteniendo info del cliente...');
  clienteController.obtenerInfoClienteLogueado(req, res);
});

// Solicitudes de retiro del cliente
router.get('/clientes/solicitudes', requireClientAuth, (req, res) => {
  console.log('📝 API: Obteniendo solicitudes del cliente...');
  clienteController.obtenerSolicitudesCliente(req, res);
});

router.post('/clientes/solicitudes', requireClientAuth, (req, res) => {
  console.log('➕ API: Creando nueva solicitud...');
  clienteController.crearSolicitudRetiro(req, res);
});

router.get('/clientes/solicitudes/:id', requireClientAuth, (req, res) => {
  console.log('🔍 API: Obteniendo solicitud específica:', req.params.id);
  clienteController.obtenerSolicitudCliente(req, res);
});

router.put('/clientes/solicitudes/:id/cancelar', requireClientAuth, (req, res) => {
  console.log('❌ API: Cancelando solicitud:', req.params.id);
  clienteController.cancelarSolicitudCliente(req, res);
});

// Estadísticas del cliente
router.get('/cliente/estadisticas', requireClientAuth, (req, res) => {
  console.log('📊 API: Obteniendo estadísticas del cliente...');
  clienteController.obtenerEstadisticasCliente(req, res);
});

// Ruta de prueba
router.get('/cliente/test', (req, res) => {
  console.log('🧪 Ruta de prueba funcionando');
  res.json({ 
    success: true, 
    message: 'Portal cliente funcionando',
    usuario: req.session?.usuario || 'No logueado'
  });
});

module.exports = router;