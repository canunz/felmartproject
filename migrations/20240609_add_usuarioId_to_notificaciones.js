'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('notificaciones', 'usuarioId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      after: 'id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('notificaciones', 'usuarioId');
  }
}; 