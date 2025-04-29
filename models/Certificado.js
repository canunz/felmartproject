// models/Certificado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificado = sequelize.define('Certificado', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  visitaRetiroId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'visitas_retiro',
      key: 'id'
    },
    allowNull: false
  },
  numeroCertificado: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  fechaEmision: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  tipoTratamiento: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plantaDestino: {
    type: DataTypes.STRING,
    allowNull: false
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  rutaPdf: {
    type: DataTypes.STRING
  }
}, {
  timestamps: true,
  tableName: 'certificados'
});

module.exports = Certificado;