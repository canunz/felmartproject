const pool = require('../config/database');

// Mostrar calendario con visitas programadas
exports.getCalendario = async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Verificar conexión a la base de datos
    const connection = await pool.getConnection();
    connection.release(); // Liberamos la conexión de prueba
    
    // Consulta de visitas programadas
    const [visitas] = await pool.query(
      `SELECT s.id, s.tipo_residuo, s.descripcion, s.fecha_retiro, s.direccion, s.estado
       FROM solicitudes s
       WHERE s.cliente_id = ? AND s.fecha_retiro >= CURDATE()
       ORDER BY s.fecha_retiro ASC`,
      [userId]
    );
    
    // Formatear las visitas para el calendario
    const eventos = visitas.map(visita => ({
      id: visita.id,
      title: `Retiro: ${visita.tipo_residuo}`,
      start: visita.fecha_retiro,
      description: visita.descripcion,
      address: visita.direccion,
      status: visita.estado
    }));
    
    // Renderizamos con o sin eventos
    return res.render('calendario/index', { 
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify(eventos),
      hayEventos: eventos.length > 0
    });
  } catch (error) {
    console.error('Error al obtener calendario:', error);
    
    // En lugar de redireccionar, mostramos el calendario con un mensaje de error
    req.flash('error_msg', 'Error al cargar el calendario. Por favor, inténtelo más tarde.');
    return res.render('calendario/index', { 
      titulo: 'Calendario de Visitas',
      eventos: JSON.stringify([]),
      hayEventos: false,
      error: 'Error al cargar el calendario'
    });
  }
};