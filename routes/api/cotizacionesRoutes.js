// routes/cotizacionRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth');
const nodemailer = require('nodemailer');
const sequelize = require('../../config/database');
const Cotizacion = require('../../models/Cotizacion');

console.log('✅ cotizacionesRoutes.js CARGADO');

// Configuración del transportador de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('✅ Transporter de email configurado correctamente');

// === RUTAS PÚBLICAS ===

// Mostrar formulario de cotización (accesible para todos)
router.get('/cotizar', async (req, res) => {
  try {
    console.log('📝 Accediendo a formulario de cotización');
    
    // Cargar precios de residuos desde la base de datos (CON UF)
    let precios = [];
    
    try {
      const [preciosDb] = await sequelize.query(`
        SELECT id, descripcion, unidad, precio, moneda 
        FROM precios_residuos 
        WHERE activo = 1 
        ORDER BY descripcion
      `);
      precios = preciosDb;
      console.log('✅ Precios cargados desde BD:', precios.length);
    } catch (dbError) {
      console.log('⚠️  Tabla precios_residuos no encontrada, usando datos de ejemplo');
      // Datos de ejemplo CON UF
      precios = [
        { id: 1, descripcion: 'Aceites usados industriales', unidad: 'litros', precio: 800, moneda: 'CLP' },
        { id: 2, descripcion: 'Residuos tóxicos líquidos', unidad: 'litros', precio: 1600, moneda: 'CLP' },
        { id: 3, descripcion: 'Filtros de aceite usados', unidad: 'unidades', precio: 5000, moneda: 'CLP' },
        { id: 4, descripcion: 'Baterías usadas', unidad: 'unidades', precio: 6000, moneda: 'CLP' },
        { id: 5, descripcion: 'Aceites domésticos usados', unidad: 'litros', precio: 600, moneda: 'CLP' },
        { id: 6, descripcion: 'Residuos especiales', unidad: 'unidades', precio: 1.5, moneda: 'UF' }
      ];
    }

    res.render('cotizaciones/cotizar', {
      titulo: 'Cotizar Residuos',
      precios: precios,
      layout: false,
      usuario: req.session?.usuario || null,
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg'),
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error('❌ Error al mostrar página de cotización:', error);
    res.status(500).send(`
      <h1>Error al cargar la página de cotización</h1>
      <p>Por favor contacte al administrador.</p>
      <a href="/">Volver al inicio</a>
    `);
  }
});

// Ruta de compatibilidad sin /cotizar
router.get('/', async (req, res) => {
  // Si el usuario es administrador, redirigir a la vista de administración
  if (req.session.user && req.session.user.rol === 'admin') {
    res.redirect('/admin/cotizaciones');
  } else {
    // Si no es administrador, redirigir a la vista de cotizar
    res.redirect('/cotizaciones/cotizar');
  }
});

// Procesar cotización enviada por POST /cotizaciones/cotizar
router.post('/cotizar', async (req, res) => {
  try {
    console.log('📝 Procesando cotización recibida:');
    console.log('Body completo:', req.body);
    
    const {
      nombre, rut, correo, telefono, direccion, comuna, ciudad,
      empresa, rutEmpresa, residuosCotizados, total, observaciones
    } = req.body;

    console.log('Datos extraídos:', {
      nombre, rut, correo, telefono,
      empresa, rutEmpresa, total, observaciones
    });

    // Validar datos requeridos
    if (!nombre || !correo) {
      console.log('❌ Faltan datos requeridos: nombre o correo');
      req.flash('error', 'Los campos nombre y correo son obligatorios');
      return res.redirect('/cotizaciones/cotizar');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      console.log('❌ Email inválido:', correo);
      req.flash('error', 'Por favor ingresa un email válido');
      return res.redirect('/cotizaciones/cotizar');
    }

    // Parsear residuos cotizados
    let residuos = [];
    if (residuosCotizados) {
      try {
        residuos = JSON.parse(residuosCotizados);
        console.log('✅ Residuos parseados:', residuos);
      } catch (error) {
        console.error('❌ Error al parsear residuos:', error);
        req.flash('error', 'Error en los datos de residuos');
        return res.redirect('/cotizaciones/cotizar');
      }
    }

    if (!residuos || residuos.length === 0) {
      console.log('❌ No hay residuos en la cotización');
      req.flash('error', 'Debe agregar al menos un residuo a la cotización');
      return res.redirect('/cotizaciones/cotizar');
    }

    // Calcular totales (CON UF)
    const totalCalculado = parseFloat(total) || residuos.reduce((sum, residuo) => sum + (parseFloat(residuo.subtotal) || 0), 0);
    const numeroCotizacion = 'COT-' + Date.now();

    // Calcular subtotal e IVA
    const subtotal = totalCalculado;
    const iva = Math.round(subtotal * 0.19);
    const totalConIva = subtotal + iva;

    console.log('Cálculos:', { subtotal, iva, totalConIva, numeroCotizacion });

    // Guardar en base de datos con la estructura EXACTA de tu tabla
    try {
      console.log('💾 Intentando guardar en base de datos...');
      
      const detallesJson = JSON.stringify({
        cliente: {
          nombre: nombre,
          rut: rut,
          correo: correo,
          telefono: telefono,
          empresa: empresa,
          rutEmpresa: rutEmpresa,
          direccion: direccion,
          comuna: comuna,
          ciudad: ciudad
        },
        residuos: residuos,
        observaciones: observaciones
      });

      // Usar EXACTAMENTE los nombres de columnas de tu tabla
      const insertQuery = `
        INSERT INTO cotizaciones (
          numeroCotizacion, fechaCotizacion, subtotal, iva, total, 
          estado, observaciones, detalles_json, createdAt, updatedAt
        ) VALUES (?, NOW(), ?, ?, ?, 'pendiente', ?, ?, NOW(), NOW())
      `;

      // Solo guardar las observaciones reales del usuario
      const observacionesReales = observaciones || '';

      const [insertResult] = await sequelize.query(insertQuery, {
        replacements: [
          numeroCotizacion,
          subtotal, 
          iva, 
          totalConIva,
          observacionesReales,
          detallesJson
        ],
        type: sequelize.QueryTypes.INSERT
      });

      console.log('✅ Cotización guardada exitosamente en BD:', numeroCotizacion);
      console.log('✅ ID insertado:', insertResult);
    } catch (dbError) {
      console.error('❌ Error al guardar en base de datos:', dbError);
      console.error('Detalles del error:', dbError.message);
      console.error('Stack:', dbError.stack);
      // Continúa con el envío de correo aunque no se guarde en BD
    }

    // Enviar correo de confirmación
    try {
      if (transporter && process.env.EMAIL_USER) {
        console.log('📧 Enviando correo de confirmación...');
        
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #00616e, #00818f); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">Cotización de Residuos</h1>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">N° ${numeroCotizacion}</p>
              </div>
              
              <!-- Contenido -->
              <div style="padding: 30px;">
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                  <h3 style="color: #00616e; margin: 0 0 15px 0;">Información del Cliente</h3>
                  <p><strong>Nombre:</strong> ${nombre}</p>
                  <p><strong>Email:</strong> ${correo}</p>
                  ${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ''}
                  ${empresa ? `<p><strong>Empresa:</strong> ${empresa}</p>` : ''}
                  ${direccion ? `<p><strong>Dirección:</strong> ${direccion}, ${comuna || ''}, ${ciudad || ''}</p>` : ''}
                </div>

                <div style="margin-bottom: 25px;">
                  <h3 style="color: #00616e; margin: 0 0 15px 0;">Detalles de la Cotización</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Descripción</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Cantidad</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Precio Unit.</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${residuos.map(r => `
                        <tr>
                          <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${r.descripcion}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${r.cantidad}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${r.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${r.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Subtotal:</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">${subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">IVA (19%):</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">${iva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                      </tr>
                      <tr>
                        <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                        <td style="padding: 12px; text-align: right; font-weight: bold;">${totalConIva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                ${observaciones ? `
                  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px;">
                    <h3 style="color: #00616e; margin: 0 0 15px 0;">Observaciones</h3>
                    <p style="margin: 0;">${observaciones}</p>
                  </div>
                ` : ''}
              </div>

              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                <p style="margin: 0; color: #6c757d;">Gracias por confiar en Felmart para el manejo de sus residuos.</p>
              </div>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"Felmart" <${process.env.EMAIL_USER}>`,
          to: correo,
          subject: `Cotización de Residuos N° ${numeroCotizacion}`,
          html: htmlContent
        });

        // Enviar notificación al administrador
        await transporter.sendMail({
          from: `"Felmart" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `Nueva cotización solicitada N° ${numeroCotizacion}`,
          html: `<p>Se ha solicitado una nueva cotización:</p>${htmlContent}`
        });

        console.log('✅ Correos enviados exitosamente');
      }
    } catch (emailError) {
      console.error('❌ Error al enviar correos:', emailError);
      // Continuar con la redirección aunque falle el envío de correo
    }

    // Redirigir a la vista de resultados
    return res.render('cotizaciones/resultado', {
      layout: false,
      titulo: 'Cotización Enviada - Felmart',
      usuario: req.session?.usuario || null,
      nombre: nombre,
      rut: rut,
      correo: correo,
      telefono: telefono,
      direccion: direccion,
      comuna: comuna,
      ciudad: ciudad,
      empresa: empresa,
      rutEmpresa: rutEmpresa,
      detalles: residuos,
      total: totalConIva,
      subtotal: subtotal,
      iva: iva,
      numeroCotizacion: numeroCotizacion,
      success: true
    });

  } catch (error) {
    console.error('❌ Error al procesar cotización:', error);
    req.flash('error', 'Ha ocurrido un error al procesar su cotización. Por favor intente nuevamente.');
    return res.redirect('/cotizaciones/cotizar');
  }
});

// === RUTAS API PARA ADMINISTRACIÓN ===

// API para listar cotizaciones
router.get('/api/listar', auth.isAdmin, async (req, res) => {
  try {
    console.log('📋 API: Solicitando lista de cotizaciones');
    const [cotizaciones] = await sequelize.query(`
      SELECT 
        id, numero_cotizacion AS numeroCotizacion, fecha_cotizacion AS fechaCotizacion, subtotal, iva, total, 
        estado, observaciones, detalles_json, createdAt, updatedAt
      FROM cotizaciones 
      ORDER BY fecha_cotizacion DESC
    `);
    
    // Asegurar que cotizaciones sea siempre un array válido
    const cotizacionesValidas = Array.isArray(cotizaciones) ? cotizaciones : [];
    
    console.log(`✅ API: Encontradas ${cotizacionesValidas.length} cotizaciones`);

    res.json({ 
      success: true, 
      cotizaciones: cotizacionesValidas 
    });
  } catch (error) {
    console.error('❌ Error al obtener lista de cotizaciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener lista de cotizaciones',
      cotizaciones: [] // Devolver array vacío en caso de error
    });
  }
});

// Ruta para obtener detalle de una cotización por ID
router.get('/api/:id', auth.isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔎 Solicitando detalle de cotización ID:', id);
    
    // Primero verificar si la cotización existe
    const [cotizaciones] = await sequelize.query(`
      SELECT 
        id, 
        numero_cotizacion AS numeroCotizacion, 
        fecha_cotizacion AS fechaCotizacion, 
        subtotal, 
        iva, 
        total, 
        estado, 
        observaciones, 
        detalles_json AS detallesJson, 
        createdAt, 
        updatedAt
      FROM cotizaciones 
      WHERE id = ?`, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    console.log('🔎 Resultado SQL:', cotizaciones);

    if (!cotizaciones) {
      console.log('❌ Cotización no encontrada');
      return res.status(404).json({ 
        success: false, 
        message: 'Cotización no encontrada' 
      });
    }

    const cotizacion = cotizaciones;
    
    // Parsear el JSON de detalles si existe
    if (cotizacion.detallesJson) {
      try {
        const detalles = JSON.parse(cotizacion.detallesJson);
        cotizacion.detalles = detalles;
        console.log('✅ Detalles parseados:', detalles);
      } catch (error) {
        console.error('❌ Error al parsear detallesJson:', error);
        cotizacion.detalles = {};
      }
    } else {
      cotizacion.detalles = {};
    }

    // Asegurarse de que todos los campos necesarios existan
    cotizacion.numeroCotizacion = cotizacion.numeroCotizacion || 'N/A';
    cotizacion.fechaCotizacion = cotizacion.fechaCotizacion || new Date();
    cotizacion.subtotal = cotizacion.subtotal || 0;
    cotizacion.iva = cotizacion.iva || 0;
    cotizacion.total = cotizacion.total || 0;
    cotizacion.estado = cotizacion.estado || 'pendiente';
    cotizacion.observaciones = cotizacion.observaciones || '';

    console.log('✅ Cotización encontrada:', cotizacion);
    res.json({ 
      success: true, 
      cotizacion: cotizacion 
    });
  } catch (error) {
    console.error('❌ Error al obtener cotización:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener la cotización',
      error: error.message 
    });
  }
});

// Ruta para actualizar el estado de una cotización
router.put('/api/:id/estado', auth.isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;
    const estadosValidos = ['pendiente', 'aceptada', 'rechazada', 'vencida'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado no válido' });
    }
    await sequelize.query(`
      UPDATE cotizaciones SET estado = ?, observaciones = ?, updatedAt = NOW() WHERE id = ?
    `, {
      replacements: [estado, observaciones, id]
    });
    res.json({ success: true, message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
  }
});

// Ruta para contar cotizaciones pendientes
router.get('/api/pendientes/count', auth.isAdmin, async (req, res) => {
  try {
    const [result] = await sequelize.query(`
      SELECT COUNT(*) AS count FROM cotizaciones WHERE estado = 'pendiente'`
    );
    res.json({ success: true, count: result[0].count });
  } catch (error) {
    console.error('❌ Error al contar cotizaciones pendientes:', error);
    res.status(500).json({ success: false, message: 'Error al contar cotizaciones pendientes' });
  }
});

// Ruta para eliminar una cotización por ID
router.delete('/api/:id', auth.isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sequelize.query(
      'DELETE FROM cotizaciones WHERE id = ?',
      { replacements: [id] }
    );
    if (result.affectedRows === 0 || result.affectedRows === undefined) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }
    res.json({ success: true, message: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar la cotización' });
  }
});

module.exports = router;