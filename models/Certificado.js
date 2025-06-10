// models/Certificado.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificado = sequelize.define('Certificado', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  numero_certificado: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true
  },
  solicitudRetiroId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    }
  },
  fecha_disposicion: {
    type: DataTypes.DATE,
    allowNull: false
  },
  planta_disposicion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  metodo_disposicion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tecnico_responsable: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  observaciones_disposicion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  autorizacion_sag: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  autorizacion_sernageomin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  cumplimiento_ds148: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  archivo_pdf: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'procesando', 'completado'),
    defaultValue: 'pendiente'
  }
}, {
  tableName: 'certificados',
  underscored: true,
  timestamps: true
});

module.exports = Certificado;