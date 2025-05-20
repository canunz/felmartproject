// routes/visitaRoutes.js
const express = require('express');
const router = express.Router();
const visitaController = require('../controllers/visitaController');
const auth = require('../middlewares/auth'); // Descomentado para restaurar protección

// Rutas para el calendario y detalles
router.get('/calendario', auth.isAuthenticated, visitaController.calendario);
router.get('/detalles/:id', auth.isAuthenticated, visitaController.detalles);

// Rutas para administradores
router.get('/programar', auth.hasRole(['administrador']), visitaController.mostrarProgramar);
router.post('/programar', auth.hasRole(['administrador']), visitaController.programar);
router.post('/reprogramar/:id', auth.hasRole(['administrador']), visitaController.reprogramar);

// Cambiar estado (admin y operador)
router.post('/cambiar-estado/:id', auth.hasRole(['administrador', 'operador']), visitaController.cambiarEstado);

// Cancelar (todos los roles)
router.post('/cancelar/:id', auth.isAuthenticated, visitaController.cancelar);

module.exports = router;