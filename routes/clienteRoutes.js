// routes/clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Rutas de la vista
router.get('/dashboard/clientes', clienteController.renderClientes);

// Rutas API
router.get('/api/clientes', clienteController.getClientes);
router.get('/api/clientes/:id', clienteController.getClienteById);
router.post('/api/clientes', clienteController.createCliente);
router.put('/api/clientes/:id', clienteController.updateCliente);
router.delete('/api/clientes/:id', clienteController.deleteCliente);

module.exports = router;