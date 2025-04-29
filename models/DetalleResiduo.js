// models/DetalleResiduo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetalleResiduo = sequelize.define('DetalleResiduo', {
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
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'detalles_residuo'
});

module.exports = DetalleResiduo;