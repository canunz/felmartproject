// controllers/dashboardController.js
const pool = require('../config/database');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Obtener contadores para el dashboard
    const [solicitudesResult] = await pool.query(
      'SELECT COUNT(*) as total FROM solicitudes WHERE cliente_id = ?',
      [userId]
    );
    
    const [pendientesResult] = await pool.query(
      'SELECT COUNT(*) as total FROM solicitudes WHERE cliente_id = ? AND estado = "pendiente"',
      [userId]
    );
    
    const [visitasResult] = await pool.query(
      'SELECT COUNT(*) as total FROM solicitudes WHERE cliente_id = ? AND fecha_retiro >= CURDATE()',
      [userId]
    );
    
    // Obtener solicitudes recientes
    const [solicitudesRecientes] = await pool.query(
      'SELECT * FROM solicitudes WHERE cliente_id = ? ORDER BY fecha_creacion DESC LIMIT 5',
      [userId]
    );
    
    res.render('dashboard/index', {
      titulo: 'Panel de Control',
      countSolicitudes: solicitudesResult[0].total,
      countPendientes: pendientesResult[0].total,
      countVisitas: visitasResult[0].total,
      solicitudesRecientes: solicitudesRecientes
    });
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    req.flash('error', 'Error al cargar el dashboard');
    res.render('dashboard/index', {
      titulo: 'Panel de Control',
      countSolicitudes: 0,
      countPendientes: 0,
      countVisitas: 0,
      solicitudesRecientes: []
    });
  }
};