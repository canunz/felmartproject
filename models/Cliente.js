// models/Cliente.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rut: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  nombre_empresa: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  contacto_principal: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  comuna: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  ciudad: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'clientes',
  underscored: true,
  timestamps: true
});

// Definir asociaciones
Cliente.associate = function(models) {
  // Asociación con Usuario
  Cliente.belongsTo(models.Usuario, {
    foreignKey: 'usuarioId',
    as: 'usuario'
  });
  
  // Asociación con SolicitudRetiro
  Cliente.hasMany(models.SolicitudRetiro, {
    foreignKey: 'cliente_id',
    as: 'solicitudes'
  });
};

module.exports = Cliente;