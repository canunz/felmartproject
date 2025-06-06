// models/VisitaRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitaRetiro = sequelize.define('VisitaRetiro', {
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
  operadorId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    allowNull: true
  },
  fechaProgramada: {
    type: DataTypes.DATE,
    allowNull: false
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('programada', 'en_proceso', 'completada', 'cancelada'),
    defaultValue: 'programada'
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'visitas_retiro'
});

module.exports = VisitaRetiro;