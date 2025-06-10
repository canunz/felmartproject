'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('usuarios', 'apellido', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'nombre'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('usuarios', 'apellido');
  }
}; 