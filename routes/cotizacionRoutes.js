// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { validarRol } = require('../middlewares/validar-rol');
const cotizacionController = require('../controllers/cotizacionController');
<<<<<<< HEAD
const auth = require('../middlewares/auth');
const precioresiduosController = require('../controllers/PrecioresiduosController');

// Rutas administrativas (requieren autenticación)
router.get('/', auth.isAuthenticated, cotizacionController.listar);
router.get('/detalles/:id', auth.isAuthenticated, cotizacionController.detalles);
router.get('/crear', auth.isAuthenticated, cotizacionController.mostrarCrear);
router.post('/crear', auth.isAuthenticated, cotizacionController.crear);
router.post('/aceptar/:id', auth.isAuthenticated, cotizacionController.aceptar);
router.post('/rechazar/:id', auth.isAuthenticated, cotizacionController.rechazar);

// Rutas públicas para cotización avanzada
router.get('/cotizar', precioresiduosController.mostrarFormularioCotizacion);
router.post('/cotizar', precioresiduosController.calcularCotizacionAvanzada);
=======

// Middleware para verificar que las tablas necesarias existan
const verificarTablas = async (req, res, next) => {
  try {
    const { Cotizacion, SolicitudRetiro, Cliente } = require('../models');
    await Promise.all([
      Cotizacion.describe(),
      SolicitudRetiro.describe(),
      Cliente.describe()
    ]);
    next();
  } catch (error) {
    console.error('Error al verificar tablas:', error);
    req.flash('error', 'Error al cargar los datos. Por favor, intente más tarde.');
    res.redirect('/dashboard');
  }
};

// Validaciones para crear/actualizar cotización
const validarCotizacion = [
  check('solicitudId', 'La solicitud es obligatoria').not().isEmpty(),
  check('numeroCotizacion', 'El número de cotización es obligatorio').not().isEmpty(),
  check('subtotal', 'El subtotal es obligatorio').isNumeric(),
  check('iva', 'El IVA es obligatorio').isNumeric(),
  check('total', 'El total es obligatorio').isNumeric(),
  check('validezCotizacion', 'La fecha de validez es obligatoria').not().isEmpty(),
  check('residuoIds', 'Debe seleccionar al menos un residuo').isArray({ min: 1 }),
  check('cantidades', 'Las cantidades son obligatorias').isArray({ min: 1 }),
  check('preciosUnitarios', 'Los precios unitarios son obligatorios').isArray({ min: 1 }),
  check('subtotales', 'Los subtotales son obligatorios').isArray({ min: 1 }),
  validarCampos
];

// Rutas
router.get('/', [validarJWT, verificarTablas], cotizacionController.listar);

router.get('/detalles/:id', [validarJWT, verificarTablas], cotizacionController.detalles);

router.get('/crear', [validarJWT, verificarTablas], cotizacionController.mostrarCrear);

router.post('/crear', [
  validarJWT,
  validarRol('administrador', 'operador'),
  validarCotizacion
], cotizacionController.crear);

router.put('/:id/estado', [validarJWT], cotizacionController.actualizarEstado);

router.get('/:id/pdf', [validarJWT], cotizacionController.generarPDF);
>>>>>>> cata-gh

module.exports = router;