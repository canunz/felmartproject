// setup.js
require('dotenv').config();
const sequelize = require('./config/database');
const models = require('./models');
const bcrypt = require('bcrypt');

const setup = async () => {
  try {
    console.log('Iniciando configuración...');
    
    // 1. Sincronizar modelos con la base de datos
    console.log('Sincronizando modelos...');
    await sequelize.sync({ force: true });
    
    // 2. Crear usuario administrador
    console.log('Creando usuario administrador...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await models.Usuario.create({
      nombre: 'Administrador',
      email: 'admin@felmart.cl',
      password: hashedPassword,
      rol: 'administrador',
      activo: true
    });
    
    // 3. Crear algunos residuos de ejemplo
    console.log('Creando residuos de ejemplo...');
    await models.Residuo.bulkCreate([
      {
        nombre: 'Aceite industrial usado',
        descripcion: 'Aceites lubricantes usados de maquinaria industrial',
        tipo: 'peligroso',
        unidadMedida: 'litros',
        precioBase: 2.50
      },
      {
        nombre: 'Baterías de plomo ácido',
        descripcion: 'Baterías de vehículos y maquinaria',
        tipo: 'peligroso',
        unidadMedida: 'unidades',
        precioBase: 15.00
      },
      {
        nombre: 'Cartón y papel',
        descripcion: 'Material de empaque y oficina',
        tipo: 'no peligroso',
        unidadMedida: 'kg',
        precioBase: 0.75
      }
    ]);
    
    console.log('Configuración completada exitosamente');
    console.log('Usuario admin creado: admin@felmart.cl / admin123');
    
  } catch (error) {
    console.error('Error durante la configuración:', error);
  } finally {
    process.exit(0);
  }
};

setup();