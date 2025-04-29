// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const auth = require('../middlewares/auth');

// Rutas accesibles según rol
router.get('/', auth.isAuthenticated, cotizacionController.listar);
router.get('/detalles/:id', auth.isAuthenticated, cotizacionController.detalles);
router.get('/descargar/:id', auth.isAuthenticated, cotizacionController.descargarPDF);

// Rutas para administradores y operadores
router.get('/crear', auth.hasRole(['administrador', 'operador']), cotizacionController.mostrarCrear);
router.post('/crear', auth.hasRole(['administrador', 'operador']), cotizacionController.crear);

// Rutas para clientes
router.get('/aceptar/:id', auth.hasRole(['cliente']), cotizacionController.aceptar);
router.post('/rechazar/:id', auth.hasRole(['cliente']), cotizacionController.rechazar);

module.exports = router;