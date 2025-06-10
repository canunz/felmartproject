// models/VisitaRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitaRetiro = sequelize.define('VisitaRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  solicitudRetiroId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    },
    allowNull: false
  },
  operadorId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    allowNull: true
  },
  fechaProgramada: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
    }
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      is: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
    }
  },
  estado: {
    type: DataTypes.ENUM('programada', 'en_proceso', 'completada', 'cancelada'),
    defaultValue: 'programada'
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true,
  tableName: 'visitas_retiro',
  hooks: {
    beforeValidate: (visita) => {
      // Asegurar que las horas tengan el formato correcto
      if (visita.horaInicio && !visita.horaInicio.includes(':')) {
        visita.horaInicio = `${visita.horaInicio}:00`;
      }
      if (visita.horaFin && !visita.horaFin.includes(':')) {
        visita.horaFin = `${visita.horaFin}:00`;
      }
    }
  }
});

module.exports = VisitaRetiro;