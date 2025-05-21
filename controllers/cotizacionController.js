// controllers/cotizacionController.js
const { 
    Cotizacion, 
    SolicitudRetiro, 
    Cliente, 
    Residuo, 
    DetalleResiduo,
    Usuario,
    Notificacion 
  } = require('../models');
  const { Op } = require('sequelize');
  const fs = require('fs');
  const path = require('path');
  const PDFDocument = require('pdfkit');
  const moment = require('moment');
  moment.locale('es');
  
  const cotizacionController = {
    // Listar cotizaciones (filtradas según rol)
    listar: async (req, res) => {
      try {
        let cotizaciones = [];
        const { usuario } = req.session;
        const { estado, fechaDesde, fechaHasta, pagina = 1 } = req.query;
        const porPagina = 10;
        
        // Construir condiciones de búsqueda
        const where = {};
        if (estado && estado !== 'todos') {
          where.estado = estado;
        }
        if (fechaDesde && fechaHasta) {
          where.fechaCotizacion = {
            [Op.between]: [new Date(fechaDesde), new Date(fechaHasta)]
          };
        }
        
        // Filtrar cotizaciones según rol
        if (usuario.rol === 'administrador' || usuario.rol === 'operador') {
          // Admin y operador ven todas las cotizaciones
          const { count, rows } = await Cotizacion.findAndCountAll({
            where,
            include: [
              { 
                model: SolicitudRetiro,
                include: [{ model: Cliente }]
              }
            ],
            order: [['fechaCotizacion', 'DESC']],
            limit: porPagina,
            offset: (pagina - 1) * porPagina
          });
          
          cotizaciones = rows;
          const totalPaginas = Math.ceil(count / porPagina);
          
          res.render('cotizaciones/listar', {
            titulo: 'Cotizaciones',
            cotizaciones,
            usuario,
            estado,
            fechaDesde,
            fechaHasta,
            paginaActual: parseInt(pagina),
            totalPaginas,
            totalCotizaciones: count,
            porPagina,
            error: req.flash('error'),
            success: req.flash('success')
          });
        } else if (usuario.rol === 'cliente') {
          // Cliente solo ve sus cotizaciones
          const { count, rows } = await Cotizacion.findAndCountAll({
            where,
            include: [
              { 
                model: SolicitudRetiro,
                where: { clienteId: req.session.clienteId }
              }
            ],
            order: [['fechaCotizacion', 'DESC']],
            limit: porPagina,
            offset: (pagina - 1) * porPagina
          });
          
          cotizaciones = rows;
          const totalPaginas = Math.ceil(count / porPagina);
          
          res.render('cotizaciones/listar', {
            titulo: 'Mis Cotizaciones',
            cotizaciones,
            usuario,
            estado,
            fechaDesde,
            fechaHasta,
            paginaActual: parseInt(pagina),
            totalPaginas,
            totalCotizaciones: count,
            porPagina,
            error: req.flash('error'),
            success: req.flash('success')
          });
        }
      } catch (error) {
        console.error('Error al listar cotizaciones:', error);
        req.flash('error', 'Error al cargar la lista de cotizaciones');
        res.redirect('/dashboard');
      }
    },
    
    // Ver detalles de una cotización
    detalles: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Buscar cotización con todos sus detalles
        const cotizacion = await Cotizacion.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!cotizacion) {
          req.flash('error', 'Cotización no encontrada');
          return res.redirect('/cotizaciones');
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && cotizacion.SolicitudRetiro && cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para ver esta cotización');
          return res.redirect('/cotizaciones');
        }
        
        // Parsear los detalles JSON si existen
        let detalles = [];
        if (cotizacion.detallesJson) {
          try {
            const detallesData = JSON.parse(cotizacion.detallesJson);
            detalles = detallesData.residuos || [];
          } catch (e) {
            console.error('Error al parsear detallesJson', e);
          }
        }
        
        res.render('cotizaciones/detalles', {
          titulo: 'Detalles de Cotización',
          cotizacion,
          detalles,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar detalles de cotización:', error);
        req.flash('error', 'Error al cargar detalles de la cotización');
        res.redirect('/cotizaciones');
      }
    },
    
    // Mostrar formulario para crear cotización
    mostrarCrear: async (req, res) => {
      try {
        const { solicitudId } = req.query;
        const { usuario } = req.session;
        
        // Solo admins y operadores pueden crear cotizaciones
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para crear cotizaciones');
          return res.redirect('/dashboard');
        }
        
        // Verificar si viene de una solicitud
        if (!solicitudId) {
          req.flash('error', 'Debe seleccionar una solicitud para cotizar');
          return res.redirect('/solicitudes');
        }
        
        // Buscar solicitud con sus detalles
        const solicitud = await SolicitudRetiro.findByPk(solicitudId, {
          include: [
            { model: Cliente },
            { 
              model: DetalleResiduo,
              include: [{ model: Residuo }]
            }
          ]
        });
        
        if (!solicitud) {
          req.flash('error', 'Solicitud no encontrada');
          return res.redirect('/solicitudes');
        }
        
        // Verificar que la solicitud esté en estado pendiente
        if (solicitud.estado !== 'pendiente') {
          req.flash('error', 'Solo se pueden cotizar solicitudes en estado pendiente');
          return res.redirect(`/solicitudes/detalles/${solicitudId}`);
        }
        
        // Verificar que no tenga ya una cotización pendiente
        const cotizacionExistente = await Cotizacion.findOne({
          where: {
            solicitudRetiroId: solicitudId,
            estado: {
              [Op.in]: ['pendiente', 'aceptada']
            }
          }
        });
        
        if (cotizacionExistente) {
          req.flash('error', 'Esta solicitud ya tiene una cotización pendiente o aceptada');
          return res.redirect(`/cotizaciones/detalles/${cotizacionExistente.id}`);
        }
        
        // Generar número de cotización automático
        const fechaActual = new Date();
        const año = fechaActual.getFullYear().toString().substr(-2);
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        
        // Obtener el último número de cotización del mes
        const ultimaCotizacion = await Cotizacion.findOne({
          where: {
            numeroCotizacion: {
              [Op.like]: `COT-${año}${mes}%`
            }
          },
          order: [['numeroCotizacion', 'DESC']]
        });
        
        let numeroCotizacion;
        if (ultimaCotizacion) {
          const ultimoNumero = parseInt(ultimaCotizacion.numeroCotizacion.split('-')[2]);
          numeroCotizacion = `COT-${año}${mes}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
        } else {
          numeroCotizacion = `COT-${año}${mes}-001`;
        }
        
        res.render('cotizaciones/crear', {
          titulo: 'Nueva Cotización',
          solicitud,
          numeroCotizacion,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar formulario de creación:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/solicitudes');
      }
    },
    
    // Crear cotización
    crear: async (req, res) => {
      try {
        const { 
          solicitudId,
          numeroCotizacion,
          subtotal,
          iva,
          total,
          validezCotizacion,
          observaciones,
          residuoIds,
          cantidades,
          preciosUnitarios,
          subtotales,
          descripciones
        } = req.body;
        
        // Validar campos
        if (!solicitudId || !numeroCotizacion || !subtotal || !iva || !total || !validezCotizacion) {
          req.flash('error', 'Todos los campos marcados con * son obligatorios');
          return res.redirect(`/cotizaciones/crear?solicitudId=${solicitudId}`);
        }
        
        // Validar que haya al menos un residuo
        if (!residuoIds || !Array.isArray(residuoIds) || residuoIds.length === 0) {
          req.flash('error', 'Debe agregar al menos un residuo');
          return res.redirect(`/cotizaciones/crear?solicitudId=${solicitudId}`);
        }
        
        // Buscar solicitud
        const solicitud = await SolicitudRetiro.findByPk(solicitudId, {
          include: [{ model: Cliente }]
        });
        
        if (!solicitud) {
          req.flash('error', 'Solicitud no encontrada');
          return res.redirect('/solicitudes');
        }
        
        // Crear cotización
        const nuevaCotizacion = await Cotizacion.create({
          solicitudRetiroId: solicitudId,
          numeroCotizacion,
          fechaCotizacion: new Date(),
          subtotal,
          iva,
          total,
          validezCotizacion: new Date(validezCotizacion),
          observaciones,
          estado: 'pendiente',
          creadoPor: req.session.usuario.id
        });
        
        // Crear detalles de cotización y almacenarlos en formato JSON
        const detalles = [];
        for (let i = 0; i < residuoIds.length; i++) {
          detalles.push({
            residuoId: residuoIds[i],
            cantidad: cantidades[i],
            precioUnitario: preciosUnitarios[i],
            subtotal: subtotales[i],
            descripcion: descripciones[i]
          });
        }
        
        // Guardar los detalles en el campo detallesJson
        nuevaCotizacion.detallesJson = JSON.stringify({ residuos: detalles });
        await nuevaCotizacion.save();
        
        // Actualizar estado de la solicitud
        await solicitud.update({ estado: 'cotizada' });
        
        // Notificar al cliente
        await Notificacion.create({
          usuarioId: solicitud.Cliente.usuarioId,
          titulo: 'Nueva cotización disponible',
          mensaje: `Se ha generado una nueva cotización para su solicitud de retiro #${solicitud.numeroSolicitud}`,
          tipo: 'cotizacion',
          referenciaId: nuevaCotizacion.id
        });
        
        req.flash('success', 'Cotización creada exitosamente');
        res.redirect(`/cotizaciones/detalles/${nuevaCotizacion.id}`);
      } catch (error) {
        console.error('Error al crear cotización:', error);
        req.flash('error', 'Error al crear la cotización');
        res.redirect(`/cotizaciones/crear?solicitudId=${req.body.solicitudId}`);
      }
    },
    
    // Actualizar estado de cotización
    actualizarEstado: async (req, res) => {
      try {
        const { id } = req.params;
        const { estado } = req.body;
        const { usuario } = req.session;
        
        // Buscar cotización
        const cotizacion = await Cotizacion.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!cotizacion) {
          req.flash('error', 'Cotización no encontrada');
          return res.redirect('/cotizaciones');
        }
        
        // Verificar permisos
        if (usuario.rol === 'cliente' && cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para actualizar esta cotización');
          return res.redirect('/cotizaciones');
        }
        
        // Validar cambio de estado
        if (estado === 'aceptada' && usuario.rol !== 'cliente') {
          req.flash('error', 'Solo el cliente puede aceptar la cotización');
          return res.redirect(`/cotizaciones/detalles/${id}`);
        }
        
        if (estado === 'rechazada' && usuario.rol !== 'cliente') {
          req.flash('error', 'Solo el cliente puede rechazar la cotización');
          return res.redirect(`/cotizaciones/detalles/${id}`);
        }
        
        // Actualizar estado
        await cotizacion.update({ estado });
        
        // Actualizar estado de la solicitud
        if (estado === 'aceptada') {
          await cotizacion.SolicitudRetiro.update({ estado: 'aceptada' });
        } else if (estado === 'rechazada') {
          await cotizacion.SolicitudRetiro.update({ estado: 'rechazada' });
        }
        
        // Notificar al cliente o administrador según el caso
        if (estado === 'aceptada' || estado === 'rechazada') {
          await Notificacion.create({
            usuarioId: cotizacion.creadoPor,
            titulo: `Cotización ${estado}`,
            mensaje: `La cotización #${cotizacion.numeroCotizacion} ha sido ${estado}`,
            tipo: 'cotizacion',
            referenciaId: cotizacion.id
          });
        }
        
        req.flash('success', `Estado de cotización actualizado a: ${estado}`);
        res.redirect(`/cotizaciones/detalles/${id}`);
      } catch (error) {
        console.error('Error al actualizar estado de cotización:', error);
        req.flash('error', 'Error al actualizar el estado de la cotización');
        res.redirect('/cotizaciones');
      }
    },
    
    // Generar PDF de cotización
    generarPDF: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Buscar cotización con todos sus detalles
        const cotizacion = await Cotizacion.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            },
            { 
              model: DetalleCotizacion,
              include: [{ model: Residuo }]
            }
          ]
        });
<<<<<<< HEAD
      }
      
      req.flash('success', 'Cotización rechazada correctamente');
      res.redirect(`/cotizaciones/detalles/${id}`);
    } catch (error) {
      console.error('Error al rechazar cotización:', error);
      req.flash('error', 'Error al rechazar cotización');
      res.redirect(`/cotizaciones/detalles/${req.params.id}`);
    }
  },
  
  // Descargar PDF de cotización
  descargarPDF: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Buscar cotización
      const cotizacion = await Cotizacion.findByPk(id, {
        include: [
          { 
            model: SolicitudRetiro,
            include: [{ model: Cliente }]
          }
        ]
      });
      
      if (!cotizacion) {
        req.flash('error', 'Cotización no encontrada');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente' && cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
        req.flash('error', 'No tienes permiso para descargar esta cotización');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar que exista el archivo PDF
      const rutaPdf = path.join(__dirname, '..', 'public', 'uploads', 'cotizaciones', `cotizacion-${id}.pdf`);
      
      if (!fs.existsSync(rutaPdf)) {
        // Si no existe, generarlo
        await generarPDFCotizacion(id);
      }
      
      // Enviar el archivo al cliente
      res.download(rutaPdf, `Cotizacion-${cotizacion.numeroCotizacion}.pdf`);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      req.flash('error', 'Error al descargar PDF');
      res.redirect(`/cotizaciones/detalles/${req.params.id}`);
    }
  },

  /**
   * Muestra el formulario de nueva cotización
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarFormularioNueva: (req, res) => {
    // Obtener datos del usuario si está autenticado
    const usuario = req.session.usuario || null;
    
    res.render('cotizaciones/nueva', {
      title: 'Nueva Cotización',
      usuario,
      layout: 'layouts/main'
    });
  },

  /**
   * Procesa una nueva cotización
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  crearCotizacion: async (req, res) => {
    try {
      const {
        email,
        username,
        first_name,
        last_name,
        telefono,
        direccion,
        ciudad,
        region,
        rut,
        tipo_residuo,
        cantidad,
        fecha_retiro,
        observaciones
      } = req.body;

      // Crear nueva cotización
      const cotizacion = await Cotizacion.create({
        usuario_id: req.session.usuario?.id,
        email,
        nombre: `${first_name} ${last_name}`,
        telefono,
        direccion,
        ciudad,
        region,
        rut,
        tipo_residuo,
        cantidad,
        fecha_retiro,
        observaciones,
        estado: 'pendiente'
      });

      req.flash('success_msg', 'Cotización enviada exitosamente');
      res.redirect('/cotizaciones/mis-cotizaciones');
    } catch (error) {
      console.error('Error al crear cotización:', error);
      req.flash('error_msg', 'Error al procesar la cotización');
      res.redirect('/cotizaciones/nueva');
    }
  },

  /**
   * Muestra las cotizaciones del usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  misCotizaciones: async (req, res) => {
    try {
      const cotizaciones = await Cotizacion.findByUsuario(req.session.usuario?.id);
      
      res.render('cotizaciones/lista', {
        title: 'Mis Cotizaciones',
        cotizaciones,
        layout: 'layouts/main'
      });
    } catch (error) {
      console.error('Error al obtener cotizaciones:', error);
      req.flash('error_msg', 'Error al cargar las cotizaciones');
      res.redirect('/');
    }
  },

  /**
   * Muestra el formulario público de cotización
   */
  mostrarFormularioCotizar: (req, res) => {
    const usuario = req.session?.usuario || null;
    const precios = require('../models/PrecioResiduo').obtenerTodos();
    res.render('cotizaciones/cotizar', {
      title: 'Cotizar Residuos',
      titulo: 'Cotizar Residuos',
      usuario,
      precios
    });
  },

  /**
   * Procesa el formulario público de cotización y muestra el resultado
   */
  procesarCotizacion: async (req, res) => {
    try {
      // Aquí puedes guardar la cotización o solo mostrar el resultado
      const cotizacion = {
        numeroCotizacion: 'COT-PRUEBA-001',
        fechaCotizacion: new Date(),
        nombre: req.body.nombre,
        rut: req.body.rut,
        DetalleCotizacions: [{
          descripcion: req.body.tipo_residuo === 'peligroso' ? 'Residuo Peligroso' : 'Residuo No Peligroso',
          cantidad: req.body.cantidad,
          precioUnitario: 1000, // Valor de ejemplo
          subtotal: req.body.cantidad * 1000
        }],
        subtotal: req.body.cantidad * 1000,
        iva: Math.round(req.body.cantidad * 1000 * 0.19),
        total: Math.round(req.body.cantidad * 1000 * 1.19),
        observaciones: req.body.observaciones
      };
      res.render('cotizaciones/resultado', {
        title: 'Resultado Cotización',
        cotizacion
      });
    } catch (error) {
      console.error('Error al procesar cotización pública:', error);
      req.flash('error_msg', 'Error al procesar la cotización');
      res.redirect('/cotizaciones/cotizar');
    }
  }
};

// Función para generar PDF de cotización
const generarPDFCotizacion = async (cotizacionId) => {
  try {
    // Buscar cotización con todos sus detalles
    const cotizacion = await Cotizacion.findByPk(cotizacionId, {
      include: [
        { 
          model: SolicitudRetiro,
          include: [{ model: Cliente }]
        },
        { 
          model: DetalleResiduo,
          include: [{ model: Residuo }]
        }
      ]
    });
    
    if (!cotizacion) {
      throw new Error('Cotización no encontrada');
    }
    
    // Crear directorio si no existe
    const directorioDestino = path.join(__dirname, '..', 'public', 'uploads', 'cotizaciones');
    if (!fs.existsSync(directorioDestino)) {
      fs.mkdirSync(directorioDestino, { recursive: true });
    }
    
    // Ruta del archivo de plantilla
    const rutaPlantilla = path.join(__dirname, '..', 'views', 'cotizaciones', 'plantilla-pdf.ejs');
    
    // Leer plantilla
    const contenidoPlantilla = fs.readFileSync(rutaPlantilla, 'utf8');
    
    // Compilar plantilla con datos
    const html = ejs.render(contenidoPlantilla, {
      cotizacion,
      moment
    });
    
    // Generar PDF
    const rutaArchivoPDF = path.join(directorioDestino, `cotizacion-${cotizacionId}.pdf`);
    
    return new Promise((resolve, reject) => {
      pdf.create(html, {
        format: 'Letter',
        border: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      }).toFile(rutaArchivoPDF, (err, res) => {
        if (err) {
          reject(err);
          return;
=======
        
        if (!cotizacion) {
          req.flash('error', 'Cotización no encontrada');
          return res.redirect('/cotizaciones');
>>>>>>> cata-gh
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para ver esta cotización');
          return res.redirect('/cotizaciones');
        }
        
        // Generar PDF
        const pdfBuffer = await generarPDFCotizacion(cotizacion);
        
        // Enviar PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${cotizacion.numeroCotizacion}.pdf`);
        res.send(pdfBuffer);
      } catch (error) {
        console.error('Error al generar PDF de cotización:', error);
        req.flash('error', 'Error al generar el PDF de la cotización');
        res.redirect(`/cotizaciones/detalles/${req.params.id}`);
      }
    }
  };

  // Función auxiliar para generar PDF
  const generarPDFCotizacion = async (cotizacion) => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Cotización ${cotizacion.numeroCotizacion}`,
            Author: 'Felmart',
            Subject: 'Cotización de Gestión de Residuos'
          }
        });

        // Crear stream de escritura
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Logo (si existe)
        const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 45, { width: 100 });
        }

        // Título
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('COTIZACIÓN', { align: 'center' })
           .moveDown();

        // Número de cotización
        doc.fontSize(14)
           .font('Helvetica')
           .text(`N° ${cotizacion.numeroCotizacion}`, { align: 'center' })
           .moveDown(2);

        // Información del cliente
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Información del Cliente')
           .moveDown(0.5)
           .font('Helvetica')
           .text(`Empresa: ${cotizacion.SolicitudRetiro.Cliente.nombre}`)
           .text(`RUC: ${cotizacion.SolicitudRetiro.Cliente.ruc}`)
           .text(`Dirección: ${cotizacion.SolicitudRetiro.Cliente.direccion}`)
           .text(`Teléfono: ${cotizacion.SolicitudRetiro.Cliente.telefono}`)
           .moveDown();

        // Información de la cotización
        doc.font('Helvetica-Bold')
           .text('Información de la Cotización')
           .moveDown(0.5)
           .font('Helvetica')
           .text(`Fecha: ${moment(cotizacion.fechaCotizacion).format('DD/MM/YYYY')}`)
           .text(`Válido hasta: ${moment(cotizacion.validezCotizacion).format('DD/MM/YYYY')}`)
           .text(`Estado: ${cotizacion.estado.toUpperCase()}`)
           .text(`Solicitud: ${cotizacion.SolicitudRetiro.numeroSolicitud}`)
           .moveDown();

        // Tabla de detalles
        doc.font('Helvetica-Bold')
           .text('Detalles de la Cotización')
           .moveDown(0.5);

        // Encabezados de la tabla
        const tableTop = doc.y;
        const tableHeaders = ['Residuo', 'Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal'];
        const columnWidths = [100, 150, 80, 80, 80];
        let x = 50;

        doc.font('Helvetica-Bold');
        tableHeaders.forEach((header, i) => {
          doc.text(header, x, tableTop);
          x += columnWidths[i];
        });

        // Línea separadora
        doc.moveDown()
           .moveTo(50, doc.y)
           .lineTo(500, doc.y)
           .stroke();

        // Detalles de la cotización
        doc.font('Helvetica');
        let y = doc.y + 10;
        let maxY = y;

        cotizacion.DetalleCotizacions.forEach(detalle => {
          // Verificar si necesitamos una nueva página
          if (y > 700) {
            doc.addPage();
            y = 50;
            maxY = y;
          }

          x = 50;
          doc.text(detalle.Residuo.nombre, x, y);
          x += columnWidths[0];
          doc.text(detalle.descripcion, x, y);
          x += columnWidths[1];
          doc.text(`${detalle.cantidad} ${detalle.Residuo.unidad}`, x, y);
          x += columnWidths[2];
          doc.text(`S/ ${detalle.precioUnitario.toFixed(2)}`, x, y);
          x += columnWidths[3];
          doc.text(`S/ ${detalle.subtotal.toFixed(2)}`, x, y);

          y += 20;
          maxY = Math.max(maxY, y);
        });

        // Totales
        doc.moveDown(2)
           .font('Helvetica-Bold')
           .text(`Subtotal: S/ ${cotizacion.subtotal.toFixed(2)}`, { align: 'right' })
           .text(`IGV (18%): S/ ${cotizacion.iva.toFixed(2)}`, { align: 'right' })
           .text(`Total: S/ ${cotizacion.total.toFixed(2)}`, { align: 'right' });

        // Observaciones (si existen)
        if (cotizacion.observaciones) {
          doc.moveDown(2)
             .font('Helvetica-Bold')
             .text('Observaciones')
             .moveDown(0.5)
             .font('Helvetica')
             .text(cotizacion.observaciones);
        }

        // Pie de página
        const footerY = 700;
        doc.fontSize(10)
           .font('Helvetica')
           .text('Felmart - Gestión Integral de Residuos', 50, footerY, {
             align: 'center',
             width: 500
           })
           .text('Av. Principal 123, Lima, Perú | Tel: (01) 123-4567', 50, footerY + 15, {
             align: 'center',
             width: 500
           })
           .text('www.felmart.com | info@felmart.com', 50, footerY + 30, {
             align: 'center',
             width: 500
           });

        // Finalizar PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  };

  module.exports = cotizacionController;