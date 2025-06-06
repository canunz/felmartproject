'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // await queryInterface.addColumn('cotizaciones', 'subtotal', {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   defaultValue: 0
    // });
    // await queryInterface.addColumn('cotizaciones', 'iva', {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   defaultValue: 0
    // });
    // await queryInterface.addColumn('cotizaciones', 'total', {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   defaultValue: 0
    // });
    return Promise.resolve(); // Migración vacía, todas las columnas ya existen
  },

  down: async (queryInterface, Sequelize) => {
    // await queryInterface.removeColumn('cotizaciones', 'subtotal');
    // await queryInterface.removeColumn('cotizaciones', 'iva');
    // await queryInterface.removeColumn('cotizaciones', 'total');
  }
}; 