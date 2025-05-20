// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth'); // Descomentado para restaurar protección
const pool = require('../config/database');

// Ruta principal del dashboard
router.get('/', isAuthenticated, async (req, res) => { // Middleware isAuthenticated restaurado
  try {
    const userId = req.session.usuario.id; // Restaurado para asumir que req.session.usuario existe
    
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
      countSolicitudes: solicitudesResult[0].total || 0,
      countPendientes: pendientesResult[0].total || 0,
      countVisitas: visitasResult[0].total || 0,
      solicitudesRecientes: solicitudesRecientes || [],
      usuario: req.session.usuario // Se asume que la vista lo espera
    });
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    req.flash('error', 'Error al cargar el dashboard');
    // En caso de error, la vista debe poder manejar req.session.usuario que podría ser el original
    res.render('dashboard/index', {
      titulo: 'Panel de Control',
      countSolicitudes: 0,
      countPendientes: 0,
      countVisitas: 0,
      solicitudesRecientes: [],
      usuario: req.session.usuario 
    });
  }
});

module.exports = router;