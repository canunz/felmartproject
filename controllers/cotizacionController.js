// controllers/cotizacionController.js
const { 
    Cotizacion, 
    DetalleCotizacion, 
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
  const pdf = require('html-pdf');
  const ejs = require('ejs');
  const moment = require('moment');
  moment.locale('es');
  
  const cotizacionController = {
    // Listar cotizaciones (filtradas según rol)
    listar: async (req, res) => {
      try {
        let cotizaciones = [];
        const { usuario } = req.session;
        
        // Filtrar cotizaciones según rol
        if (usuario.rol === 'administrador' || usuario.rol === 'operador') {
          // Admin y operador ven todas las cotizaciones
          cotizaciones = await Cotizacion.findAll({
            include: [
              { 
                model: SolicitudRetiro,
                include: [{ model: Cliente }]
              }
            ],
            order: [['fechaCotizacion', 'DESC']]
          });
        } else if (usuario.rol === 'cliente') {
          // Cliente solo ve sus cotizaciones
          cotizaciones = await Cotizacion.findAll({
            include: [
              { 
                model: SolicitudRetiro,
                where: { clienteId: req.session.clienteId }
              }
            ],
            order: [['fechaCotizacion', 'DESC']]
          });
        }
        
        res.render('cotizaciones/listar', {
          titulo: 'Cotizaciones',
          cotizaciones,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
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
            },
            { 
              model: DetalleCotizacion,
              include: [{ model: Residuo }]
            }
          ]
        });
        
        if (!cotizacion) {
          req.flash('error', 'Cotización no encontrada');
          return res.redirect('/cotizaciones');
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para ver esta cotización');
          return res.redirect('/cotizaciones');
        }
        
        res.render('cotizaciones/detalles', {
          titulo: 'Detalles de Cotización',
          cotizacion,
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
          validezCotizacion,
          observaciones,
          estado: 'pendiente'
        });
        
        // Crear detalles de cotización
        for (let i = 0; i < residuoIds.length; i++) {
          await DetalleCotizacion.create({
            cotizacionId: nuevaCotizacion.id,
            residuoId: residuoIds[i],
            cantidad: cantidades[i],
            precioUnitario: preciosUnitarios[i],
            subtotal: subtotales[i],
            descripcion: descripciones[i] || null
          });
        }
        
        // Actualizar estado de la solicitud
        solicitud.estado = 'cotizada';
        await solicitud.save();
        
        // Generar PDF de cotización
        await generarPDFCotizacion(nuevaCotizacion.id);
        
        // Notificar al cliente
        if (solicitud.Cliente && solicitud.Cliente.Usuario) {
          await Notificacion.create({
            usuarioId: solicitud.Cliente.Usuario.id,
            tipo: 'cotizacion',
            titulo: 'Nueva cotización disponible',
            mensaje: `Se ha generado una cotización para su solicitud #${solicitudId}`,
            referenciaId: nuevaCotizacion.id
          });
        }
        
        req.flash('success', 'Cotización creada correctamente');
        res.redirect(`/cotizaciones/detalles/${nuevaCotizacion.id}`);
      } catch (error) {
        console.error('Error al crear cotización:', error);
        req.flash('error', 'Error al crear cotización');
        res.redirect(`/cotizaciones/crear?solicitudId=${req.body.solicitudId}`);
      }
    },
    
    // Aceptar cotización (para clientes)
    aceptar: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Verificar que sea un cliente
        if (usuario.rol !== 'cliente') {
          req.flash('error', 'Solo los clientes pueden aceptar cotizaciones');
          return res.redirect(`/cotizaciones/detalles/${id}`);
        }
        
        // Buscar cotización
        const cotizacion = await Cotizacion.findByPk(id, {
          include: [{ model: SolicitudRetiro }]
        });
        
        if (!cotizacion) {
          req.flash('error', 'Cotización no encontrada');
          return res.redirect('/cotizaciones');
        }
        
        // Verificar que la cotización pertenezca al cliente
        if (cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para aceptar esta cotización');
          return res.redirect('/cotizaciones');
        }
        
        // Verificar que la cotización esté pendiente
        if (cotizacion.estado !== 'pendiente') {
          req.flash('error', 'Solo se pueden aceptar cotizaciones pendientes');
          return res.redirect(`/cotizaciones/detalles/${id}`);
        }
        
        // Actualizar estado de la cotización
        cotizacion.estado = 'aceptada';
        await cotizacion.save();
        
        // Notificar a administradores
        const admins = await Usuario.findAll({
          where: { rol: 'administrador' }
        });
        
        for (const admin of admins) {
          await Notificacion.create({
            usuarioId: admin.id,
            tipo: 'cotizacion',
            titulo: 'Cotización aceptada',
            mensaje: `El cliente ha aceptado la cotización #${cotizacion.numeroCotizacion}`,
            referenciaId: id
          });
        }
        
        req.flash('success', 'Cotización aceptada correctamente');
        res.redirect(`/cotizaciones/detalles/${id}`);
      } catch (error) {
        console.error('Error al aceptar cotización:', error);
        req.flash('error', 'Error al aceptar cotización');
        res.redirect(`/cotizaciones/detalles/${req.params.id}`);
      }
    },
    
  // controllers/cotizacionController.js (continuación)
  // Rechazar cotización (para clientes)
  rechazar: async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const { usuario } = req.session;
      
      // Verificar que sea un cliente
      if (usuario.rol !== 'cliente') {
        req.flash('error', 'Solo los clientes pueden rechazar cotizaciones');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Buscar cotización
      const cotizacion = await Cotizacion.findByPk(id, {
        include: [{ model: SolicitudRetiro }]
      });
      
      if (!cotizacion) {
        req.flash('error', 'Cotización no encontrada');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar que la cotización pertenezca al cliente
      if (cotizacion.SolicitudRetiro.clienteId !== req.session.clienteId) {
        req.flash('error', 'No tienes permiso para rechazar esta cotización');
        return res.redirect('/cotizaciones');
      }
      
      // Verificar que la cotización esté pendiente
      if (cotizacion.estado !== 'pendiente') {
        req.flash('error', 'Solo se pueden rechazar cotizaciones pendientes');
        return res.redirect(`/cotizaciones/detalles/${id}`);
      }
      
      // Actualizar estado de la cotización
      cotizacion.estado = 'rechazada';
      cotizacion.observaciones = motivo ? `Rechazada: ${motivo}` : 'Rechazada por el cliente';
      await cotizacion.save();
      
      // Notificar a administradores
      const admins = await Usuario.findAll({
        where: { rol: 'administrador' }
      });
      
      for (const admin of admins) {
        await Notificacion.create({
          usuarioId: admin.id,
          tipo: 'cotizacion',
          titulo: 'Cotización rechazada',
          mensaje: `El cliente ha rechazado la cotización #${cotizacion.numeroCotizacion}${motivo ? `. Motivo: ${motivo}` : ''}`,
          referenciaId: id
        });
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
          model: DetalleCotizacion,
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
        }
        
        // Actualizar ruta en la base de datos
        cotizacion.rutaPdf = `/uploads/cotizaciones/cotizacion-${cotizacionId}.pdf`;
        cotizacion.save().then(() => {
          resolve(rutaArchivoPDF);
        }).catch(reject);
      });
    });
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
};

module.exports = cotizacionController;