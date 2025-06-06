const axios = require('axios');
const config = require('../config/cmfBancos.config');

class CmfBancosService {
  constructor() {
    this.baseURL = config.apiUrl;
    this.apiKey = config.apiKey;
    this.formato = config.formato;
  }

  /**
   * Obtiene el valor actual de la UF desde CMF
   * @returns {Promise<number>} Valor de la UF
   */
  async obtenerValorUF() {
    try {
      const response = await axios.get(`${this.baseURL}/uf`, {
        params: {
          apikey: this.apiKey,
          formato: this.formato
        }
      });

      // La respuesta viene en formato JSON con la estructura:
      // { UFs: [{ Valor: "20.939,49", Fecha: "2010-01-01" }] }
      const valorUF = response.data.UFs[0].Valor;
      // Convertir el valor de string a número, reemplazando la coma por punto
      return parseFloat(valorUF.replace('.', '').replace(',', '.'));
    } catch (error) {
      console.error('Error al obtener valor UF:', error);
      throw new Error('No se pudo obtener el valor de la UF');
    }
  }
}

module.exports = new CmfBancosService(); 