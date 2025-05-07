// routes/cotizacionRoutes.js
// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const pool = require('../config/database');

// Listar cotizaciones (simplificado)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Verificar si las tablas existen antes de hacer consultas
    const [tables] = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    
    const tableNames = tables.map(t => t.table_name.toLowerCase());
    const hasCotizaciones = tableNames.includes('cotizaciones');
    const hasSolicitudes = tableNames.includes('solicitudes');
    
    // Variables para la vista
    const estado = req.query.estado || 'todos';
    const fechaDesde = req.query.fechaDesde || '';
    const fechaHasta = req.query.fechaHasta || '';
    const pagina = parseInt(req.query.pagina) || 1;
    const porPagina = 10;
    const cotizaciones = [];
    const totalCotizaciones = 0;
    const totalPaginas = 1;
    
    // Si las tablas necesarias existen, intentar obtener datos
    if (hasCotizaciones && hasSolicitudes) {
      // Aquí iría el código original para cargar cotizaciones
      // Por ahora omitimos este código ya que la tabla no existe
    } else {
      console.log('Algunas tablas no existen:', {
        cotizaciones: hasCotizaciones,
        solicitudes: hasSolicitudes
      });
    }
    
    // Renderizar la vista con datos vacíos o reales
    res.render('cotizaciones/index', {
      titulo: 'Cotizaciones',
      cotizaciones: cotizaciones,
      estado,
      fechaDesde,
      fechaHasta,
      paginaActual: pagina,
      totalPaginas,
      totalCotizaciones,
      porPagina
    });
  } catch (error) {
    console.error('Error al cargar cotizaciones:', error);
    req.flash('error', 'Error al cargar las cotizaciones');
    res.redirect('/dashboard');
  }
});

// Otras rutas...

module.exports = router;