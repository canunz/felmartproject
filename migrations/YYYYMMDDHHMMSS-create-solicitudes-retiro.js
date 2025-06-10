// migrations/YYYYMMDDHHMMSS-create-solicitudes-retiro.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('solicitudes_retiro', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      numero_solicitud: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      tipo_residuo: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      cantidad: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      unidad: {
        type: Sequelize.STRING(20),
        defaultValue: 'kg'
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      fecha_preferida: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      urgencia: {
        type: Sequelize.ENUM('normal', 'media', 'alta', 'emergencia'),
        defaultValue: 'normal'
      },
      ubicacion: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      direccion_especifica: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      contacto_nombre: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      contacto_telefono: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado: {
        type: Sequelize.ENUM('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'),
        defaultValue: 'pendiente'
      },
      fecha_programada: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      hora_programada: {
        type: Sequelize.TIME,
        allowNull: true
      },
      tecnico_asignado: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      monto_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      certificado_disponible: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      fecha_completado: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Crear índices para optimizar consultas
    await queryInterface.addIndex('solicitudes_retiro', ['cliente_id']);
    await queryInterface.addIndex('solicitudes_retiro', ['numero_solicitud']);
    await queryInterface.addIndex('solicitudes_retiro', ['estado']);
    await queryInterface.addIndex('solicitudes_retiro', ['fecha_preferida']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('solicitudes_retiro');
  }
};