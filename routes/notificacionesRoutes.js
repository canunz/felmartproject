const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');

// Obtener notificaciones no leídas
router.get('/no-leidas', isAuthenticated, async (req, res) => {
    try {
        // Aquí iría la lógica para obtener notificaciones no leídas
        const notificaciones = []; // Por ahora devolvemos un array vacío
        res.json(notificaciones);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Marcar notificación como leída
router.post('/marcar-leida/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        // Aquí iría la lógica para marcar como leída
        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
});

// Marcar todas las notificaciones como leídas
router.post('/marcar-todas-leidas', isAuthenticated, async (req, res) => {
    try {
        // Aquí iría la lógica para marcar todas como leídas
        res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ error: 'Error al marcar notificaciones' });
    }
});

module.exports = router; 