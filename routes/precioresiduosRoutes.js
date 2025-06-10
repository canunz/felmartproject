const express = require('express');
const router = express.Router();
const precioresiduosController = require('../controllers/PrecioresiduosController');
const auth = require('../middlewares/auth');

// Rutas protegidas (requieren ser administrador)
router.get('/', auth.isAdmin, precioresiduosController.mostrarAdmin);
router.post('/eliminar', auth.isAdmin, precioresiduosController.eliminarResiduos);

// CRUD: Crear y editar residuos (solo admin)
router.post('/crear', auth.isAdmin, precioresiduosController.crearResiduo);
router.post('/editar/:id', auth.isAdmin, precioresiduosController.editarResiduo);

// Rutas públicas
router.get('/listar', precioresiduosController.listarPrecios);

// API endpoint para obtener residuos (para dropdowns)
router.get('/api/precios', precioresiduosController.obtenerPreciosAPI);

module.exports = router;
