const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middlewares/auth');
const Cliente = require('../../models/Cliente');

// Obtener todos los clientes
router.get('/clientes', isAuthenticated, async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            attributes: ['id', 'rut', 'nombreEmpresa', 'email', 'direccion', 'ciudad', 'estado']
        });
        res.json({ success: true, clientes });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener la lista de clientes' });
    }
});

// Obtener un cliente específico
router.get('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los datos del cliente' });
    }
});

// Crear nuevo cliente
router.post('/clientes', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.create(req.body);
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ success: false, message: 'Error al crear el cliente' });
    }
});

// Actualizar cliente
router.put('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        await cliente.update(req.body);
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el cliente' });
    }
});

// Eliminar cliente
router.delete('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        await cliente.destroy();
        res.json({ success: true, message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el cliente' });
    }
});

module.exports = router; 