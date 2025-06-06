/**
 * Modelo de Precios de Residuos - Datos y funciones útiles
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrecioResiduo = sequelize.define('PrecioResiduo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  unidad: {
    type: DataTypes.STRING,
    allowNull: false
  },
  moneda: {
    type: DataTypes.STRING,
    allowNull: false
  },
  activo: {
    type: DataTypes.TINYINT,
    defaultValue: 1
  }
}, {
  tableName: 'precios_residuos',
  timestamps: false
});

module.exports = PrecioResiduo;