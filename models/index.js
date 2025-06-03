// models/index.js
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Residuo = require('./Residuo');
const SolicitudRetiro = require('./SolicitudRetiro');
const DetalleResiduo = require('./DetalleResiduo');
const Cotizacion = require('./Cotizacion');
const VisitaRetiro = require('./VisitaRetiro');
const Certificado = require('./Certificado');
const Notificacion = require('./Notificacion');
const PrecioResiduo = require('./PrecioResiduo');

// Relaciones entre modelos

// Usuario - Cliente (One-to-One)
Usuario.hasOne(Cliente, { 
  foreignKey: {
    name: 'usuarioId',
    allowNull: false
  },
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
Cliente.belongsTo(Usuario, { 
  foreignKey: {
    name: 'usuarioId',
    allowNull: false
  }
});

// Cliente - SolicitudRetiro
Cliente.hasMany(SolicitudRetiro, { foreignKey: 'clienteId' });
SolicitudRetiro.belongsTo(Cliente, { foreignKey: 'clienteId' });

// SolicitudRetiro - DetalleResiduo
SolicitudRetiro.hasMany(DetalleResiduo, { foreignKey: 'solicitudRetiroId' });
DetalleResiduo.belongsTo(SolicitudRetiro, { foreignKey: 'solicitudRetiroId' });

// Residuo - DetalleResiduo
Residuo.hasMany(DetalleResiduo, { foreignKey: 'residuoId' });
DetalleResiduo.belongsTo(Residuo, { foreignKey: 'residuoId' });

// SolicitudRetiro - Cotizacion
SolicitudRetiro.hasMany(Cotizacion, { foreignKey: 'solicitudRetiroId' });
Cotizacion.belongsTo(SolicitudRetiro, { foreignKey: 'solicitudRetiroId' });

// SolicitudRetiro - VisitaRetiro
SolicitudRetiro.hasMany(VisitaRetiro, { foreignKey: 'solicitudRetiroId' });
VisitaRetiro.belongsTo(SolicitudRetiro, { foreignKey: 'solicitudRetiroId' });

// Usuario (operador) - VisitaRetiro
Usuario.hasMany(VisitaRetiro, { foreignKey: 'operadorId' });
VisitaRetiro.belongsTo(Usuario, { as: 'Operador', foreignKey: 'operadorId' });

// VisitaRetiro - Certificado
VisitaRetiro.hasMany(Certificado, { foreignKey: 'visitaRetiroId' });
Certificado.belongsTo(VisitaRetiro, { foreignKey: 'visitaRetiroId' });

// Usuario - Notificacion
Usuario.hasMany(Notificacion, { foreignKey: 'usuarioId' });
Notificacion.belongsTo(Usuario, { foreignKey: 'usuarioId' });

module.exports = {
  Usuario,
  Cliente,
  Residuo,
  SolicitudRetiro,
  DetalleResiduo,
  Cotizacion,
  VisitaRetiro,
  Certificado,
  Notificacion,
  PrecioResiduo
};