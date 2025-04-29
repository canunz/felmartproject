// models/SolicitudRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolicitudRetiro = sequelize.define('SolicitudRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clienteId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'clientes',
      key: 'id'
    },
    allowNull: false
  },
  fechaSolicitud: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fechaRetiroSolicitada: {
    type: DataTypes.DATE,
    allowNull: false
  },
  direccionRetiro: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactoNombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactoTelefono: {
    type: DataTypes.STRING,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'cotizada', 'programada', 'completada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'solicitudes_retiro'
});

module.exports = SolicitudRetiro;