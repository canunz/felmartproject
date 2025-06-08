const { Sequelize } = require('sequelize');

// Configuración para pruebas usando SQLite en memoria
const sequelize = new Sequelize('sqlite::memory:', {
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
});

module.exports = sequelize; 