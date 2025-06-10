// routes/dashboard.js
const { isAuthenticated } = require('../middlewares/auth'); // Restaurado. La ruta original al middleware era incorrecta.
const express = require('express');
const router = express.Router();
const pool = require('../config/database'); 
// const solicitudController = require('../controllers/solicitudController'); // Parece no usarse aquí
// const calendarioController = require('../controllers/calendarioController'); // Parece no usarse aquí

router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Se asume que isAuthenticated asegura que req.session.usuario existe
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
    
    res.render('dashboard', {
      titulo: 'Dashboard',
      countSolicitudes: solicitudesResult[0].total,
      countPendientes: pendientesResult[0].total,
      countVisitas: visitasResult[0].total,
      solicitudesRecientes: solicitudesRecientes,
      usuario: req.session.usuario // Pasar usuario a la vista
    });
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    req.flash('error_msg', 'Error al cargar el dashboard');
    res.render('dashboard', { // Asumiendo que la vista es 'dashboard'
      titulo: 'Dashboard',
      countSolicitudes: 0,
      countPendientes: 0,
      countVisitas: 0,
      solicitudesRecientes: [],
      usuario: req.session.usuario // Pasar usuario a la vista
    });
  }
});

module.exports = router;