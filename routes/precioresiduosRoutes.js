const express = require('express');
const router = express.Router();
const precioresiduosController = require('../controllers/PrecioresiduosController');
const auth = require('../middlewares/auth');

// Rutas protegidas (requieren autenticación)
router.get('/admin', auth.isAuthenticated, precioresiduosController.mostrarAdmin);
router.post('/eliminar', auth.isAuthenticated, precioresiduosController.eliminarResiduos);

// Rutas públicas
router.get('/listar', precioresiduosController.listarPrecios);

module.exports = router;
