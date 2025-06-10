// controllers/notificacionController.js
const Notificacion = require('../models/Notificacion');

// Obtener notificaciones no leídas
exports.obtenerNoLeidas = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ 
        error: 'No hay sesión activa',
        mensaje: 'Por favor inicie sesión para ver sus notificaciones'
      });
    }

    const notificaciones = await Notificacion.findAll({
      where: {
        leida: false,
        usuarioId: req.session.usuario.id
      },
      order: [['fechaCreacion', 'DESC']],
      limit: 5
    });

    res.json({
      notificaciones,
      total: notificaciones.length
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ 
      error: 'Error al obtener notificaciones',
      mensaje: 'Hubo un problema al cargar las notificaciones'
    });
  }
};

// Marcar una notificación como leída
exports.marcarComoLeida = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ 
        error: 'No hay sesión activa',
        mensaje: 'Por favor inicie sesión para marcar notificaciones'
      });
    }

    const notificacion = await Notificacion.findOne({
      where: {
        id: req.params.id,
        usuarioId: req.session.usuario.id
      }
    });

    if (!notificacion) {
      return res.status(404).json({ 
        error: 'Notificación no encontrada',
        mensaje: 'La notificación que intenta marcar no existe'
      });
    }

    await notificacion.update({ leida: true });
    res.json({ mensaje: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ 
      error: 'Error al marcar notificación',
      mensaje: 'Hubo un problema al marcar la notificación como leída'
    });
  }
};

// Marcar todas las notificaciones como leídas
exports.marcarTodasLeidas = async (req, res) => {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ 
        error: 'No hay sesión activa',
        mensaje: 'Por favor inicie sesión para marcar notificaciones'
      });
    }

    await Notificacion.update(
      { leida: true },
      {
        where: {
          usuarioId: req.session.usuario.id,
          leida: false
        }
      }
    );

    res.json({ mensaje: 'Todas las notificaciones han sido marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ 
      error: 'Error al marcar notificaciones',
      mensaje: 'Hubo un problema al marcar las notificaciones como leídas'
    });
  }
};