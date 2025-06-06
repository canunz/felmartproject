const cmfBancosService = require('../../services/cmfBancosService');

/**
 * Controlador para la API de CMF Bancos
 */
const CmfBancosController = {
  /**
   * Obtiene el valor actual de la UF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async obtenerValorUF(req, res) {
    try {
      const valorUF = await cmfBancosService.obtenerValorUF();
      res.json({
        success: true,
        data: {
          valor: valorUF,
          fecha: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },


};

module.exports = CmfBancosController; 