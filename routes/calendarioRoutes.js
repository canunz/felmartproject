// routes/calendarioRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const pool = require('../config/database'); // Asegúrate de tener este archivo

// Ruta para mostrar el calendario
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Consulta mejorada para obtener visitas con más detalles
    const [visitas] = await pool.query(
      `SELECT 
        s.id,
        s.tipo_residuo,
        s.descripcion,
        s.fecha_retiro,
        s.hora_retiro,
        s.direccion,
        s.estado,
        s.cantidad_estimada,
        c.nombre_empresa as cliente_nombre,
        o.nombre as operador_nombre,
        o.telefono as operador_telefono
       FROM solicitudes s
       LEFT JOIN clientes c ON s.cliente_id = c.id
       LEFT JOIN operadores o ON s.operador_id = o.id
       WHERE s.cliente_id = ? AND s.fecha_retiro >= CURDATE()
       ORDER BY s.fecha_retiro ASC`,
      [userId]
    );
    
    // Formatear visitas para el calendario con más detalles
    const eventos = visitas.map(visita => ({
      id: visita.id,
      title: `Retiro: ${visita.tipo_residuo}`,
      start: `${visita.fecha_retiro}T${visita.hora_retiro || '09:00:00'}`,
      description: visita.descripcion,
      extendedProps: {
        direccion: visita.direccion,
        estado: visita.estado,
        cantidad: visita.cantidad_estimada,
        operador: visita.operador_nombre,
        telefono: visita.operador_telefono,
        cliente: visita.cliente_nombre
      },
      backgroundColor: getEstadoColor(visita.estado),
      borderColor: getEstadoColor(visita.estado),
      textColor: '#000000'
    }));

    // Obtener estadísticas para el dashboard
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as total_visitas,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas
       FROM solicitudes 
       WHERE cliente_id = ?`,
      [userId]
    );
    
    res.render('calendario/index', {
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify(eventos),
      hayEventos: eventos.length > 0,
      estadisticas: stats[0],
      usuario: req.session.usuario
    });
  } catch (error) {
    console.error('Error al cargar el calendario:', error);
    req.flash('error', 'Error al cargar el calendario. Por favor, inténtelo más tarde.');
    
    res.render('calendario/index', {
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify([]),
      hayEventos: false,
      estadisticas: {
        total_visitas: 0,
        pendientes: 0,
        programadas: 0,
        completadas: 0
      },
      usuario: req.session.usuario
    });
  }
});

// Función auxiliar para obtener colores según estado
function getEstadoColor(estado) {
  const colores = {
    'pendiente': '#ffe066',
    'programada': '#b5ead7',
    'completada': '#caffbf',
    'cancelada': '#ffadad',
    'cotizada': '#a8dadc'
  };
  return colores[estado.toLowerCase()] || '#e2e3e5';
}

module.exports = router;