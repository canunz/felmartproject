// routes/api/certificadosClienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/clienteController');

// Middleware de autenticación para clientes
const requireClientAuth = (req, res, next) => {
  if (!req.session.usuario) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }
  next();
};

// RUTAS DE VISTA (Renderizar páginas HTML)
router.get('/cliente/certificados', requireClientAuth, clienteController.renderCertificadosCliente);

// También agregar ruta sin /cliente para compatibilidad
router.get('/certificados', requireClientAuth, clienteController.renderCertificadosCliente);

// RUTAS DE API (Devuelven JSON)
router.get('/api/cliente/certificados', requireClientAuth, clienteController.obtenerCertificadosCliente);
router.get('/api/cliente/certificados/:certificadoId', requireClientAuth, clienteController.obtenerDetalleCertificado);
router.get('/api/cliente/certificados/:certificadoId/descargar', requireClientAuth, clienteController.descargarCertificado);
router.get('/api/cliente/certificados/exportar', requireClientAuth, clienteController.exportarListadoCertificados);

module.exports = router;