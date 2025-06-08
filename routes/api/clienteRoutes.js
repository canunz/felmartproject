const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/clienteController');
const { isAuthenticated } = require('../../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Rutas CRUD
router.get('/', clienteController.listarClientes);
router.post('/', clienteController.crearCliente);
router.get('/:id', clienteController.obtenerCliente);
router.put('/:id', clienteController.actualizarCliente);
router.delete('/:id', clienteController.eliminarCliente);

module.exports = router; 