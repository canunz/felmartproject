// controllers/notificacionController.js
const { Notificacion } = require('../models');
const { Op } = require('sequelize');

const notificacionController = {
  // Obtener notificaciones no leídas
  obtenerNoLeidas: async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      
      const notificaciones = await Notificacion.findAll({
        where: { 
          usuarioId,
          leida: false
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      // Contar total de no leídas
      const totalNoLeidas = await Notificacion.count({
        where: { 
          usuarioId,
          leida: false
        }
      });
      
      res.json({
        success: true,
        notificaciones,
        totalNoLeidas
      });
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al obtener notificaciones'
      });
    }
  },
  
  // Listar todas las notificaciones
  listar: async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      
      const notificaciones = await Notificacion.findAll({
        where: { usuarioId },
        order: [['createdAt', 'DESC']]
      });
      
      res.render('notificaciones/listar', {
        titulo: 'Mis Notificaciones',
        notificaciones,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al listar notificaciones:', error);
      req.flash('error', 'Error al cargar las notificaciones');
      res.redirect('/dashboard');
    }
  },
  
  // Marcar como leída
  marcarLeida: async (req, res) => {
    try {
      const { id } = req.params;
      const usuarioId = req.session.usuario.id;
      
      // Buscar notificación
      const notificacion = await Notificacion.findOne({
        where: { 
          id,
          usuarioId
        }
      });
      
      if (!notificacion) {
        return res.status(404).json({
          success: false,
          mensaje: 'Notificación no encontrada'
        });
      }
      
      // Marcar como leída
      notificacion.leida = true;
      await notificacion.save();
      
      res.json({
        success: true,
        mensaje: 'Notificación marcada como leída'
      });
    } catch (error) {
      console.error('Error al marcar notificación:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al marcar notificación'
      });
    }
  },
  
  // Marcar todas como leídas
  marcarTodasLeidas: async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      
      // Actualizar todas las notificaciones no leídas
      await Notificacion.update(
        { leida: true },
        { 
          where: { 
            usuarioId,
            leida: false
          }
        }
      );
      
      res.json({
        success: true,
        mensaje: 'Todas las notificaciones marcadas como leídas'
      });
    } catch (error) {
      console.error('Error al marcar notificaciones:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al marcar notificaciones'
      });
    }
  }
};

module.exports = notificacionController;