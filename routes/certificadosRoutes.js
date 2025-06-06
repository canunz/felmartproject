const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ruta para listar certificados
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Obtener certificados del cliente
    const [certificados] = await pool.query(
      `SELECT 
        c.id,
        c.numero_certificado as numeroCertificado,
        c.fecha_emision as fechaEmision,
        c.fecha_vencimiento as fechaVencimiento,
        c.tipo_residuo as tipoResiduo,
        c.cantidad,
        c.unidad,
        c.estado,
        s.direccion as direccionRetiro,
        o.nombre as operadorNombre
       FROM certificados c
       LEFT JOIN solicitudes s ON c.solicitud_id = s.id
       LEFT JOIN operadores o ON s.operador_id = o.id
       WHERE c.cliente_id = ?
       ORDER BY c.fecha_emision DESC`,
      [userId]
    );

    // Calcular estadísticas
    const hoy = new Date();
    const estadisticas = {
      totalCertificados: certificados.length,
      certificadosValidos: 0,
      certificadosPorVencer: 0
    };

    certificados.forEach(certificado => {
      const fechaVencimiento = new Date(certificado.fechaVencimiento);
      const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
      
      if (diasRestantes > 30) {
        estadisticas.certificadosValidos++;
      } else if (diasRestantes > 0) {
        estadisticas.certificadosPorVencer++;
      }
    });

    res.render('certificados/listar', {
      titulo: 'Mis Certificados',
      certificados,
      ...estadisticas,
      usuario: req.session.usuario
    });
  } catch (error) {
    console.error('Error al cargar certificados:', error);
    req.flash('error', 'Error al cargar los certificados. Por favor, inténtelo más tarde.');
    res.redirect('/dashboard');
  }
});

// Ruta para ver detalles de un certificado
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.usuario.id;

    const [certificados] = await pool.query(
      `SELECT 
        c.*,
        s.direccion as direccionRetiro,
        s.fecha_retiro,
        s.hora_retiro,
        o.nombre as operadorNombre,
        o.telefono as operadorTelefono,
        cl.nombre_empresa as clienteNombre,
        cl.ruc as clienteRuc
       FROM certificados c
       LEFT JOIN solicitudes s ON c.solicitud_id = s.id
       LEFT JOIN operadores o ON s.operador_id = o.id
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.id = ? AND c.cliente_id = ?`,
      [id, userId]
    );

    if (certificados.length === 0) {
      req.flash('error', 'Certificado no encontrado');
      return res.redirect('/certificados');
    }

    const certificado = certificados[0];
    const hoy = new Date();
    const fechaVencimiento = new Date(certificado.fecha_vencimiento);
    const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));

    res.render('certificados/detalle', {
      titulo: `Certificado ${certificado.numero_certificado}`,
      certificado,
      diasRestantes,
      usuario: req.session.usuario
    });
  } catch (error) {
    console.error('Error al cargar detalle del certificado:', error);
    req.flash('error', 'Error al cargar el detalle del certificado');
    res.redirect('/certificados');
  }
});

// Ruta para descargar PDF del certificado
router.get('/:id/pdf', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.usuario.id;

    const [certificados] = await pool.query(
      `SELECT 
        c.*,
        s.direccion as direccionRetiro,
        s.fecha_retiro,
        s.hora_retiro,
        o.nombre as operadorNombre,
        cl.nombre_empresa as clienteNombre,
        cl.ruc as clienteRuc
       FROM certificados c
       LEFT JOIN solicitudes s ON c.solicitud_id = s.id
       LEFT JOIN operadores o ON s.operador_id = o.id
       LEFT JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.id = ? AND c.cliente_id = ?`,
      [id, userId]
    );

    if (certificados.length === 0) {
      return res.status(404).send('Certificado no encontrado');
    }

    const certificado = certificados[0];
    
    // Crear PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Certificado ${certificado.numero_certificado}`,
        Author: 'Felmart',
        Subject: 'Certificado de Gestión de Residuos'
      }
    });

    // Configurar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${certificado.numero_certificado}.pdf`);

    // Pipe el PDF a la respuesta
    doc.pipe(res);

    // Logo (si existe)
    const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }

    // Título
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .text('Certificado de Gestión de Residuos', { align: 'center' })
       .moveDown();

    // Número de certificado
    doc.fontSize(14)
       .font('Helvetica')
       .text(`N° ${certificado.numero_certificado}`, { align: 'center' })
       .moveDown(2);

    // Información del cliente
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('Información del Cliente')
       .moveDown(0.5)
       .font('Helvetica')
       .text(`Empresa: ${certificado.clienteNombre}`)
       .text(`RUC: ${certificado.clienteRuc}`)
       .text(`Dirección: ${certificado.direccionRetiro}`)
       .moveDown();

    // Detalles del certificado
    doc.font('Helvetica-Bold')
       .text('Detalles del Certificado')
       .moveDown(0.5)
       .font('Helvetica')
       .text(`Tipo de Residuo: ${certificado.tipo_residuo}`)
       .text(`Cantidad: ${certificado.cantidad} ${certificado.unidad}`)
       .text(`Fecha de Emisión: ${new Date(certificado.fecha_emision).toLocaleDateString('es-ES')}`)
       .text(`Fecha de Vencimiento: ${new Date(certificado.fecha_vencimiento).toLocaleDateString('es-ES')}`)
       .moveDown();

    // Información del operador (si existe)
    if (certificado.operadorNombre) {
      doc.font('Helvetica-Bold')
         .text('Información del Operador')
         .moveDown(0.5)
         .font('Helvetica')
         .text(`Nombre: ${certificado.operadorNombre}`)
         .text(`Fecha de Retiro: ${new Date(certificado.fecha_retiro).toLocaleDateString('es-ES')}`)
         .text(`Hora de Retiro: ${certificado.hora_retiro}`)
         .moveDown();
    }

    // Pie de página
    const footerY = 700;
    doc.fontSize(10)
       .font('Helvetica')
       .text('Este documento es un certificado oficial de gestión de residuos.', 50, footerY, {
         align: 'center',
         width: 500
       })
       .text('Felmart - Gestión de Residuos', 50, footerY + 15, {
         align: 'center',
         width: 500
       })
       .text('Ruta 5 Sur km 1036, sector Trapen, Puerto Montt, Chile', 50, footerY + 30, {
         align: 'center',
         width: 500
       });

    // Finalizar PDF
    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).send('Error al generar el PDF del certificado');
  }
});

module.exports = router; 