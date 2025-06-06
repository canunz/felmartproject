// models/Residuo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Residuo = sequelize.define('Residuo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT
  },
  tipo: {
    type: DataTypes.ENUM('peligroso', 'no peligroso'),
    allowNull: false
  },
  unidadMedida: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precioBase: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'residuos'
});

module.exports = Residuo;