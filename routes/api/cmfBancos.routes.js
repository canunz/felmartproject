const express = require('express');
const router = express.Router();
const CmfBancosController = require('../../controllers/api/cmfBancosController');

/**
 * @route GET /api/cmf/uf/valor
 * @desc Obtiene el valor actual de la UF
 * @access Public
 */
router.get('/uf/valor', CmfBancosController.obtenerValorUF);



module.exports = router; 