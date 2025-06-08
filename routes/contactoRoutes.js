const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');

// Ruta para enviar mensaje de contacto
router.post('/enviar', contactoController.enviarMensaje);

module.exports = router; 