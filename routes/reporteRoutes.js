// routes/reporteRoutes.js
const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const auth = require('../middlewares/auth');

// Rutas para admin y operadores
router.get('/dashboard', auth.hasRole(['administrador', 'operador']), reporteController.dashboard);
router.get('/solicitudes', auth.hasRole(['administrador', 'operador']), reporteController.reporteSolicitudes);
router.get('/visitas', auth.hasRole(['administrador', 'operador']), reporteController.reporteVisitas);
router.get('/exportar', auth.hasRole(['administrador', 'operador']), reporteController.exportarExcel);

module.exports = router;