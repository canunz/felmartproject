/**
 * Modelo de Precios de Residuos - Datos y funciones útiles
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrecioResiduo = sequelize.define('PrecioResiduo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unidad: {
    type: DataTypes.STRING,
    allowNull: false
  },
  moneda: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'precios_residuos'
});

// Helpers para UF manual (opcional, si los usas en el sistema)
let configuracionUF = {
  valorManual: null,
  fechaActualizacion: null,
  ultimoRecordatorio: null
};

PrecioResiduo.obtenerValorUF = async () => {
  const hoy = new Date();
  if (configuracionUF.valorManual && 
      configuracionUF.fechaActualizacion &&
      configuracionUF.fechaActualizacion.getMonth() === hoy.getMonth()) {
    return configuracionUF.valorManual;
  }
  if (hoy.getDate() === 15 && 
      (!configuracionUF.ultimoRecordatorio || 
       configuracionUF.ultimoRecordatorio.getMonth() !== hoy.getMonth())) {
    configuracionUF.ultimoRecordatorio = hoy;
    console.log('RECORDATORIO: Actualizar valor UF manual para este mes');
  }
  try {
    const axios = require('axios');
    const response = await axios.get('https://mindicador.cl/api/uf');
    return response.data.serie[0].valor;
  } catch (error) {
    return 35000;
  }
};

PrecioResiduo.actualizarUFManual = (valor, fecha = new Date()) => {
  configuracionUF = {
    valorManual: valor,
    fechaActualizacion: fecha,
    ultimoRecordatorio: null
  };
  return configuracionUF;
};

PrecioResiduo.getConfiguracionUF = () => configuracionUF;

module.exports = PrecioResiduo;