// routes/certificadoRoutes.js
const express = require('express');
const router = express.Router();
const certificadoController = require('../controllers/certificadoController');
const auth = require('../middlewares/auth');

// Rutas de listado y detalles (accesibles para todos los autenticados)
router.get('/', auth.isAuthenticated, certificadoController.listar);
router.get('/detalles/:id', auth.isAuthenticated, certificadoController.detalles);
router.get('/descargar/:id', auth.isAuthenticated, certificadoController.descargarPDF);

// Rutas para crear certificados (admin y operador)
router.get('/crear', auth.hasRole(['administrador', 'operador']), certificadoController.mostrarCrear);
router.post('/crear', auth.hasRole(['administrador', 'operador']),
  certificadoController.uploadMiddleware,
  certificadoController.crear
);

module.exports = router;