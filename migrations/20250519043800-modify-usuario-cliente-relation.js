'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Primero, identificar registros duplicados
      const duplicados = await queryInterface.sequelize.query(`
        SELECT usuario_id, COUNT(*) as count
        FROM clientes
        WHERE usuario_id IS NOT NULL
        GROUP BY usuario_id
        HAVING COUNT(*) > 1;
      `, { type: Sequelize.QueryTypes.SELECT });

      // Para cada usuario con múltiples clientes, mantener solo el más reciente
      for (const dup of duplicados) {
        await queryInterface.sequelize.query(`
          DELETE FROM clientes
          WHERE usuario_id = :usuarioId
          AND id NOT IN (
            SELECT id
            FROM (
              SELECT id
              FROM clientes
              WHERE usuario_id = :usuarioId
              ORDER BY created_at DESC
              LIMIT 1
            ) t
          )
        `, {
          replacements: { usuarioId: dup.usuario_id }
        });
      }

      // Verificar si la restricción ya existe
      const [indexes] = await queryInterface.sequelize.query(`
        SHOW INDEXES FROM clientes WHERE Key_name = 'clientes_usuario_id_unique';
      `);

      if (indexes.length === 0) {
        // Agregar restricción UNIQUE solo si no existe
        await queryInterface.addConstraint('clientes', {
          fields: ['usuario_id'],
          type: 'unique',
          name: 'clientes_usuario_id_unique'
        });
      }

      return Promise.resolve();
    } catch (error) {
      console.error('Error en la migración:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Verificar si la restricción existe antes de intentar eliminarla
      const [indexes] = await queryInterface.sequelize.query(`
        SHOW INDEXES FROM clientes WHERE Key_name = 'clientes_usuario_id_unique';
      `);

      if (indexes.length > 0) {
        await queryInterface.removeConstraint('clientes', 'clientes_usuario_id_unique');
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Error en el rollback:', error);
      return Promise.reject(error);
    }
  }
}; 