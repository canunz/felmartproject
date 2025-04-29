const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const solicitudController = require('../controllers/solicitudController');
const calendarioController = require('../controllers/calendarioController');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
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
    
    res.render('dashboard', {
      countSolicitudes: solicitudesResult[0].total,
      countPendientes: pendientesResult[0].total,
      countVisitas: visitasResult[0].total,
      solicitudesRecientes: solicitudesRecientes
    });
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    req.flash('error_msg', 'Error al cargar el dashboard');
    res.render('dashboard', {
      countSolicitudes: 0,
      countPendientes: 0,
      countVisitas: 0,
      solicitudesRecientes: []
    });
  }
});

module.exports = router;