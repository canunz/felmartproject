// models/Cotizacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cotizacion = sequelize.define('Cotizacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  solicitudRetiroId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    },
    allowNull: false
  },
  numeroCotizacion: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  fechaCotizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  iva: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  validezCotizacion: {
    type: DataTypes.INTEGER,
    defaultValue: 15 // 15 días por defecto
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada', 'vencida'),
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  rutaPdf: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  tableName: 'cotizaciones'
});

module.exports = Cotizacion;