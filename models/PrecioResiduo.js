/**
 * Modelo de Precios de Residuos - Datos y funciones útiles
 */

// Datos iniciales (podrían venir de una base de datos)
const preciosResiduos = [
    { id: 1, descripcion: 'ACEITE', precio: 1, unidad: 'IBC', moneda: 'UF' },
    { id: 2, descripcion: 'ACEITE CON TRAZAS DE AGUA', precio: 6, unidad: 'IBC', moneda: 'UF' },
    { id: 3, descripcion: 'AGUAS CEMENTICIAS', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { id: 4, descripcion: 'AGUAS CONTAMINADAS CON DETERGENTE', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { id: 5, descripcion: 'AGUAS SENTINAS', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { id: 6, descripcion: 'PAÑOS CONTAMINADOS CON HC', precio: 6, unidad: 'IBC', moneda: 'UF' },
    { id: 7, descripcion: 'PAÑOS CONTAMINADOS CON HC (TAMBOR)', precio: 55000, unidad: 'TAMBOR', moneda: 'CLP' },
    { id: 8, descripcion: 'BORRA DE PINTURAS', precio: 9.6, unidad: 'IBC', moneda: 'UF' },
    { id: 9, descripcion: 'BORRA DE PINTURAS (TAMBOR)', precio: 75000, unidad: 'TAMBOR', moneda: 'CLP' },
    { id: 10, descripcion: 'PLÁSTICOS CONTAMINADOS CON PESTICIDAS', precio: 6, unidad: 'M3', moneda: 'UF' },
    { id: 11, descripcion: 'PLÁSTICOS CONTAMINADOS CON INFLAMABLES', precio: 6, unidad: 'M3', moneda: 'UF' },
    { id: 12, descripcion: 'BALDES CON HIDROCARBUROS', precio: 6, unidad: 'M3', moneda: 'UF' },
    { id: 13, descripcion: 'CHATARRA ELECTRÓNICA', precio: 10, unidad: 'IBC', moneda: 'UF' },
    { id: 14, descripcion: 'FILTROS DE ACEITES', precio: 7, unidad: 'IBC', moneda: 'UF' },
    { id: 15, descripcion: 'FILTROS DE ACEITES (TAMBOR)', precio: 55000, unidad: 'TAMBOR', moneda: 'CLP' },
    { id: 16, descripcion: 'BATERIAS DE PLOMO', precio: 1, unidad: 'IBC', moneda: 'UF' },
    { id: 17, descripcion: 'RESIDUOS DOMICILIARIOS', precio: 5, unidad: 'IBC', moneda: 'UF' },
    { id: 18, descripcion: 'RESIDUOS DOMICILIARIOS (TAMBOR)', precio: 45000, unidad: 'TAMBOR', moneda: 'CLP' },
    { id: 19, descripcion: 'ESCOMBROS', precio: 5, unidad: 'M3', moneda: 'UF' },
    { id: 20, descripcion: 'RESIDUOS DE VIDRIO', precio: 6, unidad: 'IBC', moneda: 'UF' }
  ];
  
  // Nuevo: Almacenamiento de UF manual
let configuracionUF = {
  valorManual: null,
  fechaActualizacion: null,
  ultimoRecordatorio: null
};
  // Funciones útiles
  module.exports = {
    /**
     * Obtener todos los precios de residuos
     */
    obtenerTodos: () => preciosResiduos,
  
    /**
     * Buscar un residuo por su descripción
     * @param {string} descripcion - Nombre del residuo (ej: "ACEITE")
     */
    buscarPorDescripcion: (descripcion) => {
      return preciosResiduos.find(item => item.descripcion === descripcion);
    },
  
    /**
     * Filtrar residuos por unidad (IBC, M3, TAMBOR)
     * @param {string} unidad - Tipo de unidad
     */
    filtrarPorUnidad: (unidad) => {
      return preciosResiduos.filter(item => item.unidad === unidad);
    },
  
    buscarPorId: (id) => preciosResiduos.find(item => item.id === id),

    agregarResiduo: (nuevoResiduo) => {
      const residuoConId = { ...nuevoResiduo, id: generarNuevoId() };
      preciosResiduos.push(residuoConId);
      return residuoConId;
    },
  
    actualizarResiduo: (id, datos) => {
      const index = preciosResiduos.findIndex(r => r.id === id);
      if (index !== -1) {
        preciosResiduos[index] = { ...preciosResiduos[index], ...datos };
        return preciosResiduos[index];
      }
      return null;
    },
  
    eliminarResiduo: (id) => {
      const lengthBefore = preciosResiduos.length;
      preciosResiduos = preciosResiduos.filter(r => r.id !== id);
      return lengthBefore !== preciosResiduos.length;
    },
    obtenerValorUF: async () => {
    // Si hay un valor manual y es del mes actual, usarlo
    const hoy = new Date();
    if (configuracionUF.valorManual && 
        configuracionUF.fechaActualizacion.getMonth() === hoy.getMonth()) {
      return configuracionUF.valorManual;
    }
    
    // Si es día 15 y no se ha actualizado, marcar para recordatorio
    if (hoy.getDate() === 15 && 
        (!configuracionUF.ultimoRecordatorio || 
         configuracionUF.ultimoRecordatorio.getMonth() !== hoy.getMonth())) {
      configuracionUF.ultimoRecordatorio = hoy;
      console.log('RECORDATORIO: Actualizar valor UF manual para este mes');
    }

    // Obtener de API como respaldo
    try {
      const response = await axios.get('https://mindicador.cl/api/uf');
      return response.data.serie[0].valor;
    } catch (error) {
      return 35000; // Valor por defecto
    }
  },

  /**
   * Actualizar el valor UF manualmente
   */
  actualizarUFManual: (valor, fecha = new Date()) => {
    configuracionUF = {
      valorManual: valor,
      fechaActualizacion: fecha,
      ultimoRecordatorio: null // Resetear recordatorio
    };
    return configuracionUF;
  },

  /**
   * Obtener la configuración actual de UF
   */
  getConfiguracionUF: () => configuracionUF
    
  
  };