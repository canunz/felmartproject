// models/Notificacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notificacion = sequelize.define('Notificacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('solicitud', 'cotizacion', 'visita', 'certificado', 'sistema'),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  leida: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  referenciaId: {
    type: DataTypes.INTEGER,
    comment: 'ID de referencia según el tipo de notificación'
  }
}, {
  timestamps: true,
  tableName: 'notificaciones'
});

module.exports = Notificacion;