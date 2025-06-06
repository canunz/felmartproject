'use strict';
const bcrypt = require('bcrypt');

// Array de clientes demo
const clientesDemo = [
  {
    rut: '76.543.210-K',
    nombre_empresa: 'EcoSolutions SpA',
    direccion: 'Av. Providencia 1234',
    comuna: 'Providencia',
    ciudad: 'Santiago',
    telefono: '+56 2 2345 6789',
    email: 'contacto@ecosolutions.cl',
    contacto_principal: 'Ana Martínez'
  },
  {
    rut: '77.654.321-0',
    nombre_empresa: 'Industrias Verdes Ltda.',
    direccion: 'Los Industriales 567',
    comuna: 'Quilicura',
    ciudad: 'Santiago',
    telefono: '+56 2 3456 7890',
    email: 'operaciones@industriasverdes.cl',
    contacto_principal: 'Carlos Rodríguez'
  },
  {
    rut: '78.765.432-1',
    nombre_empresa: 'Reciclajes del Sur',
    direccion: 'Av. Principal 890',
    comuna: 'San Bernardo',
    ciudad: 'Santiago',
    telefono: '+56 2 4567 8901',
    email: 'info@reciclajesdelsur.cl',
    contacto_principal: 'Pedro Soto'
  },
  {
    rut: '79.876.543-2',
    nombre_empresa: 'BioGestión Chile',
    direccion: 'Las Torres 1234',
    comuna: 'Huechuraba',
    ciudad: 'Santiago',
    telefono: '+56 2 5678 9012',
    email: 'contacto@biogestion.cl',
    contacto_principal: 'María González'
  },
  {
    rut: '70.987.654-3',
    nombre_empresa: 'Residuos Tech SA',
    direccion: 'San Martín 567',
    comuna: 'Quinta Normal',
    ciudad: 'Santiago',
    telefono: '+56 2 6789 0123',
    email: 'info@residuostech.cl',
    contacto_principal: 'Juan Pérez'
  },
  {
    rut: '71.098.765-4',
    nombre_empresa: 'GreenWaste Solutions',
    direccion: 'Los Trapenses 890',
    comuna: 'Lo Barnechea',
    ciudad: 'Santiago',
    telefono: '+56 2 7890 1234',
    email: 'contacto@greenwaste.cl',
    contacto_principal: 'Laura Silva'
  },
  {
    rut: '72.109.876-5',
    nombre_empresa: 'EcoIndustria SpA',
    direccion: 'Santa Rosa 1234',
    comuna: 'San Joaquín',
    ciudad: 'Santiago',
    telefono: '+56 2 8901 2345',
    email: 'ventas@ecoindustria.cl',
    contacto_principal: 'Diego Muñoz'
  },
  {
    rut: '73.210.987-6',
    nombre_empresa: 'Sustentables SA',
    direccion: 'Américo Vespucio 567',
    comuna: 'Maipú',
    ciudad: 'Santiago',
    telefono: '+56 2 9012 3456',
    email: 'info@sustentables.cl',
    contacto_principal: 'Carmen Flores'
  },
  {
    rut: '74.321.098-7',
    nombre_empresa: 'ReciclaMax Ltda.',
    direccion: 'Gran Avenida 890',
    comuna: 'La Cisterna',
    ciudad: 'Santiago',
    telefono: '+56 2 0123 4567',
    email: 'contacto@reciclamax.cl',
    contacto_principal: 'Roberto Vargas'
  },
  {
    rut: '75.432.109-8',
    nombre_empresa: 'EcoEmpresas Chile',
    direccion: 'Manuel Montt 1234',
    comuna: 'Ñuñoa',
    ciudad: 'Santiago',
    telefono: '+56 2 1234 5678',
    email: 'info@ecoempresas.cl',
    contacto_principal: 'Patricia Navarro'
  }
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Crear usuarios y clientes
      for (const clienteData of clientesDemo) {
        // Verificar si el usuario ya existe
        const [usuarioExistente] = await queryInterface.sequelize.query(
          'SELECT id FROM usuarios WHERE email = ?',
          {
            replacements: [clienteData.email],
            type: Sequelize.QueryTypes.SELECT
          }
        );

        let usuarioId;

        if (!usuarioExistente) {
          // Crear nuevo usuario si no existe
          const passwordHash = await bcrypt.hash('Cliente2024!', 10);
          await queryInterface.sequelize.query(
            `INSERT INTO usuarios (nombre, email, password, rol, activo, created_at, updated_at)
             VALUES (:nombre, :email, :password, 'cliente', true, NOW(), NOW())`,
            {
              replacements: {
                nombre: clienteData.contacto_principal,
                email: clienteData.email,
                password: passwordHash
              },
              type: Sequelize.QueryTypes.INSERT
            }
          );

          // Obtener el ID del usuario recién creado
          const [nuevoUsuario] = await queryInterface.sequelize.query(
            'SELECT id FROM usuarios WHERE email = ?',
            {
              replacements: [clienteData.email],
              type: Sequelize.QueryTypes.SELECT
            }
          );
          usuarioId = nuevoUsuario.id;
        } else {
          usuarioId = usuarioExistente.id;
          // Actualizar el rol a cliente si no lo es
          await queryInterface.sequelize.query(
            'UPDATE usuarios SET rol = "cliente" WHERE id = ?',
            {
              replacements: [usuarioId],
              type: Sequelize.QueryTypes.UPDATE
            }
          );
        }

        // Verificar si el cliente ya existe
        const [clienteExistente] = await queryInterface.sequelize.query(
          'SELECT id FROM clientes WHERE rut = ?',
          {
            replacements: [clienteData.rut],
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (!clienteExistente) {
          // Crear el cliente si no existe
          await queryInterface.sequelize.query(
            `INSERT INTO clientes (
              rut, nombre_empresa, direccion, comuna, ciudad, telefono,
              email, contacto_principal, usuario_id, created_at, updated_at
            ) VALUES (
              :rut, :nombre_empresa, :direccion, :comuna, :ciudad, :telefono,
              :email, :contacto_principal, :usuario_id, NOW(), NOW()
            )`,
            {
              replacements: {
                ...clienteData,
                usuario_id: usuarioId
              },
              type: Sequelize.QueryTypes.INSERT
            }
          );
        }
      }

      console.log('Seeder completado exitosamente');
    } catch (error) {
      console.error('Error en el seeder:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Eliminar los clientes y usuarios de ejemplo
      for (const cliente of clientesDemo) {
        // Eliminar el cliente
        await queryInterface.sequelize.query(
          'DELETE FROM clientes WHERE rut = ?',
          {
            replacements: [cliente.rut],
            type: Sequelize.QueryTypes.DELETE
          }
        );

        // Eliminar el usuario asociado
        await queryInterface.sequelize.query(
          'DELETE FROM usuarios WHERE email = ?',
          {
            replacements: [cliente.email],
            type: Sequelize.QueryTypes.DELETE
          }
        );
      }

      console.log('Reversión del seeder completada exitosamente');
    } catch (error) {
      console.error('Error en la reversión del seeder:', error);
      throw error;
    }
  }
}; 