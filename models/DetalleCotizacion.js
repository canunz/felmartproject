// models/DetalleCotizacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetalleCotizacion = sequelize.define('DetalleCotizacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cotizacionId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'cotizaciones',
      key: 'id'
    },
    allowNull: false
  },
  residuoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'residuos',
      key: 'id'
    },
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  precioUnitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'detalles_cotizacion'
});

module.exports = DetalleCotizacion;