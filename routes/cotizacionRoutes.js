// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const auth = require('../middlewares/auth');
const precioresiduosController = require('../controllers/PrecioresiduosController');

// Rutas administrativas (requieren autenticación)
router.get('/', auth.isAuthenticated, cotizacionController.listar);
router.get('/detalles/:id', auth.isAuthenticated, cotizacionController.detalles);
router.get('/crear', auth.isAuthenticated, cotizacionController.mostrarCrear);
router.post('/crear', auth.isAuthenticated, cotizacionController.crear);
router.post('/aceptar/:id', auth.isAuthenticated, cotizacionController.aceptar);
router.post('/rechazar/:id', auth.isAuthenticated, cotizacionController.rechazar);

// Rutas públicas para cotización avanzada
router.get('/cotizar', precioresiduosController.mostrarFormularioCotizacion);
router.post('/cotizar', precioresiduosController.calcularCotizacionAvanzada);

module.exports = router;