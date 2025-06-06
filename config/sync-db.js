// config/sync-db.js
const sequelize = require('./database');
const models = require('../models');

const syncDB = async () => {
  try {
    // Sincronizar todos los modelos con la base de datos
    await sequelize.sync({ alter: true });
    console.log('Base de datos sincronizada correctamente');
  } catch (error) {
    console.error('Error al sincronizar la base de datos:', error);
  } finally {
    process.exit(0);
  }
};

syncDB();