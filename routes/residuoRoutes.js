// routes/residuoRoutes.js
const express = require('express');
const router = express.Router();
const residuoController = require('../controllers/residuoController');
const auth = require('../middlewares/auth');

// Todas las rutas requieren rol de administrador
router.get('/', auth.hasRole(['administrador']), residuoController.listar);
router.get('/crear', auth.hasRole(['administrador']), residuoController.mostrarCrear);
router.post('/crear', auth.hasRole(['administrador']), residuoController.crear);
router.get('/editar/:id', auth.hasRole(['administrador']), residuoController.mostrarEditar);
router.post('/editar/:id', auth.hasRole(['administrador']), residuoController.editar);
router.get('/eliminar/:id', auth.hasRole(['administrador']), residuoController.eliminar);

module.exports = router;