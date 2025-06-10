// routes/notificacionRoutes.js
const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const auth = require('../middlewares/auth');

// Solo las rutas actuales y correctas
router.get('/no-leidas', auth.isAuthenticated, notificacionController.obtenerNoLeidas);
router.post('/marcar-leida/:id', auth.isAuthenticated, notificacionController.marcarComoLeida);
router.post('/marcar-todas-leidas', auth.isAuthenticated, notificacionController.marcarTodasLeidas);

module.exports = router;