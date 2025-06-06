// routes/api/clientesRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/clienteController');

// Middleware de autenticación simple
const requireAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
  next();
};

// Middleware para admin
const requireAdmin = (req, res, next) => {
  if (!req.session.usuario || req.session.usuario.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado'
    });
  }
  next();
};

// Rutas API para clientes
router.get('/clientes', requireAuth, clienteController.listarClientes);
router.get('/clientes/:id', requireAuth, clienteController.obtenerCliente);
router.post('/clientes', requireAdmin, clienteController.crearCliente);
router.put('/clientes/:id', requireAdmin, clienteController.actualizarCliente);
router.delete('/clientes/:id', requireAdmin, clienteController.eliminarCliente);

module.exports = router;