// models/SolicitudRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolicitudRetiro = sequelize.define('SolicitudRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'clienteId',
    references: {
      model: 'clientes',
      key: 'id'
    }
  },
  numeroSolicitud: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'numero_solicitud',
    unique: true
  },
  tipoResiduo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tipo_residuo'
  },
  cantidad: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  unidad: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'kg'
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fechaPreferida: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_preferida'
  },
  urgencia: {
    type: DataTypes.ENUM('normal', 'media', 'alta', 'emergencia'),
    allowNull: true,
    defaultValue: 'normal'
  },
  ubicacion: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  direccionEspecifica: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'direccion_especifica'
  },
  contactoNombre: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contacto_nombre'
  },
  contactoTelefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contacto_telefono'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  fechaProgramada: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_programada'
  },
  fechaCompletado: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'fecha_completado'
  }
}, {
  tableName: 'solicitudes_retiro',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Definir asociaciones
SolicitudRetiro.associate = function(models) {
  // Relación con Cliente
  SolicitudRetiro.belongsTo(models.Cliente, {
    foreignKey: 'clienteId',
    as: 'cliente'
  });

  // Relación con DetalleResiduo
  SolicitudRetiro.hasMany(models.DetalleResiduo, {
    foreignKey: 'solicitudRetiroId',
    as: 'DetalleResiduos'
  });
};

module.exports = SolicitudRetiro;