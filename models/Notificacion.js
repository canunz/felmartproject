const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const Notificacion = sequelize.define('Notificacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'usuario_id'
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  leida: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'notificaciones',
  timestamps: false
});

Notificacion.belongsTo(Usuario, {
  foreignKey: 'usuarioId',
  as: 'usuario'
});

module.exports = Notificacion; 