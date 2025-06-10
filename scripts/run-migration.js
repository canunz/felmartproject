const sequelize = require('../config/database');
const migration = require('../migrations/20240322_add_apellido_to_usuarios');

async function runMigration() {
  try {
    console.log('Ejecutando migración...');
    await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
    console.log('Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
}

runMigration(); 