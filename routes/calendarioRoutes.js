// routes/calendarioRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const pool = require('../config/database'); // Asegúrate de tener este archivo

// Ruta para mostrar el calendario
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Consulta para obtener visitas (solicitudes con fecha de retiro)
    const [visitas] = await pool.query(
      `SELECT s.id, s.tipo_residuo, s.descripcion, s.fecha_retiro, s.direccion, s.estado
       FROM solicitudes s
       WHERE s.cliente_id = ? AND s.fecha_retiro >= CURDATE()
       ORDER BY s.fecha_retiro ASC`,
      [userId]
    );
    
    // Formatear visitas para el calendario
    const eventos = visitas.map(visita => ({
      id: visita.id,
      title: `Retiro: ${visita.tipo_residuo}`,
      start: visita.fecha_retiro,
      description: visita.descripcion,
      address: visita.direccion,
      status: visita.estado
    }));
    
    res.render('calendario/index', {
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify(eventos),
      hayEventos: eventos.length > 0
    });
  } catch (error) {
    console.error('Error al cargar el calendario:', error);
    req.flash('error', 'Error al cargar el calendario. Por favor, inténtelo más tarde.');
    
    // En caso de error, renderizar con un array vacío
    res.render('calendario/index', {
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify([]),
      hayEventos: false
    });
  }
});

module.exports = router;