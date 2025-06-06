const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

async function up() {
  await sequelize.getQueryInterface().createTable('clientes', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rut: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    nombre_empresa: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contacto_principal: {
      type: DataTypes.STRING,
      allowNull: false
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: false
    },
    comuna: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });
}

async function down() {
  await sequelize.getQueryInterface().dropTable('clientes');
}

// Ejecutar la migración
up().then(() => {
  console.log('Tabla clientes creada exitosamente');
  process.exit(0);
}).catch(error => {
  console.error('Error al crear la tabla clientes:', error);
  process.exit(1);
}); 