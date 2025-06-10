const express = require('express');
const router = express.Router();

// Ruta de prueba para verificar que la API está funcionando
router.get('/', (req, res) => {
    res.json({ message: 'API principal funcionando' });
});

module.exports = router; 