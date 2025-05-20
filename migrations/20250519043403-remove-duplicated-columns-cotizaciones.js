'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Eliminar columnas duplicadas
    await queryInterface.removeColumn('cotizaciones', 'detallesJson');
    await queryInterface.removeColumn('cotizaciones', 'fecha_cotizacion');
    await queryInterface.removeColumn('cotizaciones', 'solicitud_retiro_id');
    await queryInterface.removeColumn('cotizaciones', 'numero_cotizacion'); // si ya existe numeroCotizacion
    await queryInterface.removeColumn('cotizaciones', 'created_at');
    await queryInterface.removeColumn('cotizaciones', 'updated_at');
  },

  down: async (queryInterface, Sequelize) => {
    // No se recomienda restaurar columnas eliminadas automáticamente
  }
};
