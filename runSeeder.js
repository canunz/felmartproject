const sequelize = require('./config/database');
const seedData = require('./seeders/demoData');

async function runSeeder() {
  try {
    // Desactivar restricciones de clave foránea
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Sincronizar la base de datos
    await sequelize.sync({ force: true });
    
    // Reactivar restricciones de clave foránea
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Ejecutar el seeder
    await seedData();
    
    console.log('Base de datos poblada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al poblar la base de datos:', error);
    process.exit(1);
  }
}

runSeeder(); 