// routes/solicitudRoutes.js
const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const auth = require('../middlewares/auth');

// Rutas accesibles según rol
router.get('/', auth.isAuthenticated, solicitudController.listar);
router.get('/detalles/:id', auth.isAuthenticated, solicitudController.detalles);

// Rutas para crear/editar solicitudes
router.get('/crear', auth.isAuthenticated, solicitudController.mostrarCrear);
router.post('/crear', auth.isAuthenticated, solicitudController.crear);
router.get('/editar/:id', auth.isAuthenticated, solicitudController.mostrarEditar);
router.post('/editar/:id', auth.isAuthenticated, solicitudController.editar);

// Rutas para administradores
router.post('/cambiar-estado/:id', auth.hasRole(['administrador']), solicitudController.cambiarEstado);

// Ruta para cancelar (accesible para cliente y admin)
router.get('/cancelar/:id', auth.isAuthenticated, solicitudController.cancelar);

module.exports = router;