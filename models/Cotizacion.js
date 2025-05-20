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
    allowNull: true,
    field: 'solicitudRetiroId'
  },
  numeroCotizacion: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'numero_cotizacion'
  },
  fechaCotizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fechaCotizacion'
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
  estado: {
    type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada', 'vencida'),
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  rutaPdf: {
    type: DataTypes.STRING
  },
  detallesJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
    field: 'detalles_json'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updatedAt'
  }
}, {
  timestamps: true,
  tableName: 'cotizaciones'
});

module.exports = Cotizacion;