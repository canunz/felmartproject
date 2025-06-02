'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 1. Primero agregar la columna usuarioId si no existe
      await queryInterface.sequelize.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'clientes' 
        AND COLUMN_NAME = 'usuarioId'
      `).then(async ([results]) => {
        if (results.length === 0) {
          await queryInterface.addColumn('clientes', 'usuarioId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'usuarios',
              key: 'id'
            }
          });
        }
      });

      // 2. Crear usuarios para clientes que no tienen uno
      const clientes = await queryInterface.sequelize.query(
        'SELECT id, email FROM clientes WHERE usuarioId IS NULL',
        { type: Sequelize.QueryTypes.SELECT }
      );

      for (const cliente of clientes) {
        // Crear usuario
        await queryInterface.sequelize.query(
          `INSERT INTO usuarios (nombre, email, password, rol, activo, created_at, updated_at) 
           VALUES ($nombre, $email, $password, 'cliente', true, NOW(), NOW())`,
          {
            bind: {
              nombre: cliente.email.split('@')[0],
              email: cliente.email,
              password: await require('bcrypt').hash('ChangeMe123!', 10)
            },
            type: Sequelize.QueryTypes.INSERT
          }
        );

        // Obtener el ID del usuario recién creado
        const [usuario] = await queryInterface.sequelize.query(
          'SELECT id FROM usuarios WHERE email = $email',
          {
            bind: { email: cliente.email },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        // Actualizar el cliente con el nuevo usuarioId
        await queryInterface.sequelize.query(
          'UPDATE clientes SET usuarioId = $usuarioId WHERE id = $clienteId',
          {
            bind: {
              usuarioId: usuario.id,
              clienteId: cliente.id
            },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }

      // 3. Modificar la columna usuarioId para hacerla NOT NULL
      await queryInterface.changeColumn('clientes', 'usuarioId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

    } catch (error) {
      console.error('Error en la migración:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revertir los cambios
      await queryInterface.changeColumn('clientes', 'usuarioId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        }
      });
    } catch (error) {
      console.error('Error en la reversión:', error);
      throw error;
    }
  }
}; 