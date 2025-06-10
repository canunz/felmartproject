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
    field: 'fecha_cotizacion'
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
    type: DataTypes.STRING,
    field: 'ruta_pdf'
  },
  detallesJson: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '',
    field: 'detalles_json'
  },
  // Campos de información del cliente
  cliente_nombre: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cliente_nombre'
  },
  cliente_rut: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'cliente_rut'
  },
  cliente_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cliente_email'
  },
  cliente_telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'cliente_telefono'
  },
  cliente_empresa: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'cliente_empresa'
  },
  cliente_direccion: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cliente_direccion'
  },
  cliente_comuna: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'cliente_comuna'
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