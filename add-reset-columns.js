const sequelize = require('./config/database');

async function addResetColumns() {
  try {
    console.log('Intentando agregar columnas a la tabla usuarios...');
    
    await sequelize.query(`
      ALTER TABLE usuarios
      ADD COLUMN reset_password_token VARCHAR(255) NULL,
      ADD COLUMN reset_password_expires DATETIME NULL;
    `);
    
    console.log('Columnas agregadas correctamente');
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      console.log('Las columnas ya existen en la tabla.');
    } else {
      console.error('Error al agregar columnas:', error);
    }
  } finally {
    await sequelize.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar la función principal
addResetColumns();