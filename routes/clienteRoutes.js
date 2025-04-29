// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const auth = require('../middlewares/auth');

router.get('/', auth.hasRole(['administrador']), clienteController.listar);
router.get('/crear', auth.hasRole(['administrador']), clienteController.mostrarCrear);
router.post('/crear', auth.hasRole(['administrador']), clienteController.crear);
router.get('/detalles/:id', auth.hasRole(['administrador']), clienteController.detalles);
router.get('/editar/:id', auth.hasRole(['administrador']), clienteController.mostrarEditar);
router.post('/editar/:id', auth.hasRole(['administrador']), clienteController.editar);
router.get('/eliminar/:id', auth.hasRole(['administrador']), clienteController.eliminar);

// Rutas para perfil de cliente
router.get('/perfil', auth.hasRole(['cliente']), clienteController.mostrarPerfil);
router.post('/perfil', auth.hasRole(['cliente']), clienteController.actualizarPerfil);

module.exports = router;