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
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');
const ejs = require('ejs');
const moment = require('moment');
const nodemailer = require('nodemailer');
moment.locale('es');

// Configurar transporter de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true, // Habilitar debug
  logger: true // Habilitar logging
});

// Verificar la conexión del transporter
transporter.verify(function(error, success) {
  if (error) {
    console.error('Error en la configuración del correo:', error);
  } else {
    console.log('Servidor de correo listo para enviar mensajes');
  }
});

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

  // ========== NUEVOS MÉTODOS API ==========
  
  // API: Listar cotizaciones (JSON)
  listarAPI: async (req, res) => {
    try {
      console.log('Iniciando listarAPI...');
      
      const cotizaciones = await Cotizacion.findAll({
        order: [['fechaCotizacion', 'DESC']]
      });
      
      console.log('Cotizaciones encontradas:', cotizaciones.length);
      console.log('Primera cotización:', cotizaciones[0]);
      
      res.json({
        success: true,
        cotizaciones: cotizaciones
      });
    } catch (error) {
      console.error('Error al listar cotizaciones API:', error);
      res.json({
        success: false,
        message: 'Error al cargar las cotizaciones: ' + error.message
      });
    }
  },

  // API: Obtener cotización específica (JSON)
  obtenerAPI: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Obteniendo cotización ID:', id);
      
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        return res.json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      
      console.log('Cotización encontrada:', cotizacion);
      
      // Incluir información del cliente directamente en la respuesta
      let clienteInfo = null;
      
      // Método 1: Obtener información desde los campos directos de la tabla cotizaciones
      if (cotizacion.cliente_nombre || cotizacion.cliente_email) {
        clienteInfo = {
          nombre: cotizacion.cliente_nombre || null,
          rut: cotizacion.cliente_rut || null,
          correo: cotizacion.cliente_email || null,
          email: cotizacion.cliente_email || null,
          telefono: cotizacion.cliente_telefono || null,
          empresa: cotizacion.cliente_empresa || null,  
          direccion: cotizacion.cliente_direccion || null,
          comuna: cotizacion.cliente_comuna || null
        };
      }
      
      // Método 2: Si no hay información en campos directos, buscar en detalles JSON
      if (!clienteInfo && cotizacion.detalles_json) {
        try {
          const detalles = JSON.parse(cotizacion.detalles_json);
          if (detalles.datosContacto) {
            clienteInfo = {
              nombre: detalles.datosContacto.nombre || null,
              rut: detalles.datosContacto.rut || null,
              correo: detalles.datosContacto.correo || detalles.datosContacto.email || null,
              email: detalles.datosContacto.correo || detalles.datosContacto.email || null,
              telefono: detalles.datosContacto.telefono || null,
              empresa: detalles.datosContacto.empresa || null,
              direccion: detalles.datosContacto.direccion || null,
              comuna: detalles.datosContacto.comuna || null
            };
          }
        } catch (e) {
          console.warn('Error al parsear detallesJson para cliente:', e.message);
        }
      }
      
      console.log('DEBUG OBTENER API - Cliente info final:', clienteInfo);
      
      res.json({
        success: true,
        cotizacion: cotizacion,
        cliente: clienteInfo
      });
    } catch (error) {
      console.error('Error al obtener cotización API:', error);
      res.json({
        success: false,
        message: 'Error al cargar la cotización: ' + error.message
      });
    }
  },

  // API: Actualizar estado y detalles de cotización
  actualizarEstadoAPI: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, detalles, subtotal, iva, total, observaciones, enviarCorreo, emailCliente } = req.body;
      
      console.log('Actualizando cotización ID:', id);
      console.log('Datos recibidos:', { estado, subtotal, iva, total, observaciones, enviarCorreo });
      
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        return res.json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      
      // Actualizar cotización
      await cotizacion.update({
        estado,
        detallesJson: detalles,
        subtotal,
        iva,
        total,
        observaciones
      });
      
      let correoEnviado = false;
      let errorCorreo = null;
      
      // Enviar correo si se solicita
      if (enviarCorreo) {
        try {
          const detallesObj = JSON.parse(detalles || '{}');
          let emailDelCliente = null;
          
          // Método 0: Usar el email enviado desde el frontend (prioridad más alta)
          if (emailCliente && emailCliente.trim()) {
            emailDelCliente = emailCliente.trim();
          }
          // Método 1: Buscar email en los detalles JSON
          else if (detallesObj.datosContacto) {
            emailDelCliente = detallesObj.datosContacto.correo || detallesObj.datosContacto.email;
          }
          
          // Método 2: Buscar en los campos directos de la cotización (PRIORIDAD ALTA)
          if (!emailDelCliente && cotizacion.cliente_email) {
            emailDelCliente = cotizacion.cliente_email;
            console.log('📧 Email encontrado en campo directo cliente_email:', emailDelCliente);
          }
          
          // Método 3: Buscar en la relación con SolicitudRetiro -> Cliente
          if (!emailDelCliente && cotizacion.SolicitudRetiro && cotizacion.SolicitudRetiro.Cliente) {
            emailDelCliente = cotizacion.SolicitudRetiro.Cliente.email;
          }
          
          // Método 4: Si aún no hay email, intentar cargar la cotización con relaciones
          if (!emailDelCliente) {
            const cotizacionCompleta = await Cotizacion.findByPk(id, {
              include: [
                { 
                  model: SolicitudRetiro,
                  include: [{ model: Cliente }]
                }
              ]
            });
            
            if (cotizacionCompleta && cotizacionCompleta.SolicitudRetiro && cotizacionCompleta.SolicitudRetiro.Cliente) {
              emailDelCliente = cotizacionCompleta.SolicitudRetiro.Cliente.email;
            }
          }
          
          if (emailDelCliente) {
            console.log('📧 Email del cliente encontrado:', emailDelCliente);
            correoEnviado = await enviarCotizacionPorCorreo(cotizacion, emailDelCliente, detallesObj);
          } else {
            console.warn('No se encontró email del cliente para la cotización', id);
            errorCorreo = 'No se encontró el email del cliente. Asegúrate de que la cotización tenga un cliente asociado.';
          }
        } catch (error) {
          errorCorreo = error.message || 'Error desconocido al enviar correo';
          console.error('Error al enviar el correo (fuera):', error);
        }
      }
      
      res.json({
        success: true,
        message: 'Cotización actualizada correctamente' + (errorCorreo ? ', pero hubo un error al enviar el correo' : ''),
        correoEnviado: correoEnviado,
        errorCorreo: errorCorreo
      });
      
    } catch (error) {
      console.error('Error actualizando cotización API:', error);
      res.json({
        success: false,
        message: 'Error al actualizar la cotización: ' + error.message
      });
    }
  },

  // API: Eliminar cotización
  eliminarAPI: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Solo admins y operadores pueden eliminar
      if (usuario.rol === 'cliente') {
        return res.json({
          success: false,
          message: 'No tienes permiso para eliminar cotizaciones'
        });
      }
      
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        return res.json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      
      // Eliminar archivo PDF si existe
      if (cotizacion.rutaPdf) {
        const rutaPdf = path.join(__dirname, '..', 'public', cotizacion.rutaPdf);
        if (fs.existsSync(rutaPdf)) {
          try {
            fs.unlinkSync(rutaPdf);
          } catch (err) {
            console.warn('No se pudo eliminar el archivo PDF:', err);
          }
        }
      }
      
      // Eliminar cotización
      await cotizacion.destroy();
      
      res.json({
        success: true,
        message: 'Cotización eliminada correctamente'
      });
    } catch (error) {
      console.error('Error eliminando cotización API:', error);
      res.json({
        success: false,
        message: 'Error al eliminar la cotización: ' + error.message
      });
    }
    },

  // API: Obtener información del cliente de una cotización
  obtenerClienteAPI: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Buscar cotización con los campos directos del cliente
      const cotizacion = await Cotizacion.findByPk(id);
      
      if (!cotizacion) {
        return res.json({
          success: false,
          message: 'Cotización no encontrada'
        });
      }
      
      console.log('Datos de cotización encontrados:', {
        cliente_nombre: cotizacion.cliente_nombre,
        cliente_rut: cotizacion.cliente_rut,
        cliente_email: cotizacion.cliente_email,
        cliente_telefono: cotizacion.cliente_telefono,
        cliente_empresa: cotizacion.cliente_empresa,
        cliente_direccion: cotizacion.cliente_direccion,
        cliente_comuna: cotizacion.cliente_comuna
      });
      
      let clienteInfo = null;
      
      // Método 1: Obtener información desde los campos directos de la tabla cotizaciones
      if (cotizacion.cliente_nombre || cotizacion.cliente_email) {
        clienteInfo = {
          nombre: cotizacion.cliente_nombre || null,
          rut: cotizacion.cliente_rut || null,
          correo: cotizacion.cliente_email || null,
          email: cotizacion.cliente_email || null,
          telefono: cotizacion.cliente_telefono || null,
          empresa: cotizacion.cliente_empresa || null,
          direccion: cotizacion.cliente_direccion || null,
          comuna: cotizacion.cliente_comuna || null
        };
      }
      
      // Método 2: Si no hay información en campos directos, buscar en detalles JSON
      if (!clienteInfo && cotizacion.detalles_json) {
        try {
          const detalles = JSON.parse(cotizacion.detalles_json);
          if (detalles.datosContacto) {
            clienteInfo = {
              nombre: detalles.datosContacto.nombre || null,
              rut: detalles.datosContacto.rut || null,
              correo: detalles.datosContacto.correo || detalles.datosContacto.email || null,
              email: detalles.datosContacto.correo || detalles.datosContacto.email || null,
              telefono: detalles.datosContacto.telefono || null,
              empresa: detalles.datosContacto.empresa || null,
              direccion: detalles.datosContacto.direccion || null,
              comuna: detalles.datosContacto.comuna || null
            };
          }
        } catch (e) {
          console.warn('Error al parsear detallesJson para cliente:', e.message);
        }
      }
      
      // Método 3: Buscar en relaciones como fallback
      if (!clienteInfo) {
        try {
          const cotizacionConRelaciones = await Cotizacion.findByPk(id, {
            include: [
              { 
                model: SolicitudRetiro,
                include: [{ model: Cliente }]
              }
            ]
          });
          
          if (cotizacionConRelaciones && cotizacionConRelaciones.SolicitudRetiro && cotizacionConRelaciones.SolicitudRetiro.Cliente) {
            const cliente = cotizacionConRelaciones.SolicitudRetiro.Cliente;
            clienteInfo = {
              nombre: cliente.nombre || cliente.razonSocial || null,
              rut: cliente.rut || null,
              correo: cliente.email || null,
              email: cliente.email || null,
              telefono: cliente.telefono || null,
              empresa: cliente.empresa || cliente.razonSocial || null,
              direccion: cliente.direccion || null,
              comuna: cliente.comuna || null
            };
          }
        } catch (error) {
          console.warn('Error al buscar relaciones del cliente:', error.message);
        }
      }
      
      console.log('Cliente info final:', clienteInfo);
      
      res.json({
        success: true,
        cliente: clienteInfo,
        message: clienteInfo ? 'Cliente encontrado' : 'No se encontró información del cliente'
      });
      
    } catch (error) {
      console.error('Error al obtener información del cliente:', error);
      res.json({
        success: false,
        message: 'Error al obtener información del cliente: ' + error.message
      });
    }
  },

  // ========== MÉTODOS ORIGINALES ==========
  
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
      
      // Obtener información del cliente desde múltiples fuentes
      let clienteInfo = null;
      
      console.log('DEBUG DETALLES - Cotización ID:', id);
      console.log('DEBUG DETALLES - Datos cotización:', {
        cliente_nombre: cotizacion.cliente_nombre,
        cliente_rut: cotizacion.cliente_rut,
        cliente_email: cotizacion.cliente_email,
        cliente_telefono: cotizacion.cliente_telefono,
        cliente_empresa: cotizacion.cliente_empresa,
        cliente_direccion: cotizacion.cliente_direccion,
        cliente_comuna: cotizacion.cliente_comuna
      });
      
      // Método 1: Obtener información desde los campos directos de la tabla cotizaciones (PRIORIDAD)
      if (cotizacion.cliente_nombre || cotizacion.cliente_email) {
        clienteInfo = {
          nombre: cotizacion.cliente_nombre || null,
          rut: cotizacion.cliente_rut || null,
          correo: cotizacion.cliente_email || null,
          email: cotizacion.cliente_email || null,
          telefono: cotizacion.cliente_telefono || null,
          empresa: cotizacion.cliente_empresa || null,
          direccion: cotizacion.cliente_direccion || null,
          comuna: cotizacion.cliente_comuna || null
        };
        console.log('DEBUG DETALLES - Cliente info desde campos directos:', clienteInfo);
      }
      
      // Método 2: Si no hay información en campos directos, buscar en detalles JSON
      if (!clienteInfo && cotizacion.detallesJson) {
        try {
          const detallesData = JSON.parse(cotizacion.detallesJson);
          if (detallesData.datosContacto) {
            clienteInfo = {
              nombre: detallesData.datosContacto.nombre || null,
              rut: detallesData.datosContacto.rut || null,
              correo: detallesData.datosContacto.correo || detallesData.datosContacto.email || null,
              email: detallesData.datosContacto.correo || detallesData.datosContacto.email || null,
              telefono: detallesData.datosContacto.telefono || null,
              empresa: detallesData.datosContacto.empresa || null,
              direccion: detallesData.direccion || detallesData.datosContacto.direccion || null,
              comuna: detallesData.comuna || detallesData.datosContacto.comuna || null
            };
          }
        } catch (e) {
          console.warn('Error al parsear detallesJson para cliente:', e.message);
        }
      }
      
      // Método 3: Como fallback, buscar en las relaciones
      if (!clienteInfo && cotizacion.SolicitudRetiro && cotizacion.SolicitudRetiro.Cliente) {
        const cliente = cotizacion.SolicitudRetiro.Cliente;
        clienteInfo = {
          nombre: cliente.nombre || cliente.razonSocial || null,
          rut: cliente.rut || null,
          correo: cliente.email || null,
          email: cliente.email || null,
          telefono: cliente.telefono || null,
          empresa: cliente.empresa || cliente.razonSocial || null,
          direccion: cliente.direccion || null,
          comuna: cliente.comuna || null
        };
      }
      
      console.log('DEBUG DETALLES - Cliente info final enviado a vista:', clienteInfo);
      
      res.render('cotizaciones/detalles', {
        titulo: 'Detalles de Cotización',
        cotizacion,
        cliente: clienteInfo,
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
      
      // Generar número de cotización si no viene en el body
      let numeroCotizacionFinal = numeroCotizacion;
      if (!numeroCotizacionFinal) {
        const fechaActual = new Date();
        const año = fechaActual.getFullYear().toString().substr(-2);
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const ultimaCotizacion = await Cotizacion.findOne({
          where: {
            numeroCotizacion: {
              [Op.like]: `COT-${año}${mes}%`
            }
          },
          order: [['numeroCotizacion', 'DESC']]
        });
        if (ultimaCotizacion) {
          const ultimoNumero = parseInt(ultimaCotizacion.numeroCotizacion.split('-')[2]);
          numeroCotizacionFinal = `COT-${año}${mes}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
        } else {
          numeroCotizacionFinal = `COT-${año}${mes}-001`;
        }
      }
      
      // Crear cotización
      const nuevaCotizacion = await Cotizacion.create({
        solicitudRetiroId: solicitudId,
        numeroCotizacion: numeroCotizacionFinal,
        fechaCotizacion: new Date(),
        subtotal,
        iva,
        total,
        validezCotizacion,
        observaciones,
        estado: 'pendiente',
        // Guardar datos del cliente en campos específicos
        cliente_nombre: solicitud.Cliente?.nombre || null,
        cliente_rut: solicitud.Cliente?.rut || null,
        cliente_email: solicitud.Cliente?.email || null,
        cliente_telefono: solicitud.Cliente?.telefono || null,
        cliente_empresa: solicitud.Cliente?.empresa || null,
        cliente_direccion: solicitud.Cliente?.direccion || null,
        cliente_comuna: solicitud.Cliente?.comuna || null
      });
      
      // Crear detalles de cotización y almacenarlos en formato JSON
      const detalles = [];
      for (let i = 0; i < residuoIds.length; i++) {
        detalles.push({
          residuoId: residuoIds[i],
          cantidad: cantidades[i],
          precioUnitario: preciosUnitarios[i],
          subtotal: subtotales[i],
          descripcion: descripciones[i] || null
        });
      }

      // Agregar datos de contacto del cliente
      const datosContacto = {
        nombre: solicitud.Cliente?.nombre || '',
        rut: solicitud.Cliente?.rut || '',
        correo: solicitud.Cliente?.email || '',
        telefono: solicitud.Cliente?.telefono || '',
        empresa: solicitud.Cliente?.empresa || '',
        direccion: solicitud.Cliente?.direccion || '',
        comuna: solicitud.Cliente?.comuna || ''
      };

      // Guardar los detalles y datos de contacto en el campo detallesJson
      nuevaCotizacion.detallesJson = JSON.stringify({ datosContacto, residuos: detalles });
      await nuevaCotizacion.save();
      
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
  },

  /**
   * Muestra el formulario de nueva cotización
   */
  mostrarFormularioNueva: (req, res) => {
    const usuario = req.session.usuario || null;
    
    res.render('cotizaciones/nueva', {
      title: 'Nueva Cotización',
      usuario,
      layout: 'layouts/main'
    });
  },

  /**
   * Procesa una nueva cotización
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

// Función para enviar correo
const enviarCotizacionPorCorreo = async (cotizacion, emailCliente, detallesObj) => {
  try {
    console.log('Iniciando envío de correo...');
    console.log('Email destinatario:', emailCliente);
    console.log('DetallesObj recibido:', detallesObj);
    
    const residuos = detallesObj.residuos || [];
    const cliente = detallesObj.datosContacto || detallesObj.cliente || {};
    
    // Intentar obtener información completa del cliente desde múltiples fuentes
    let infoCliente = {
      nombre: cliente.nombre || 'Cliente',
      rut: cliente.rut || 'No especificado',
      correo: emailCliente,
      telefono: cliente.telefono || 'No especificado',
      empresa: cliente.empresa || 'No especificado',
      direccion: detallesObj.direccion || cliente.direccion || 'No especificado',
      comuna: detallesObj.comuna || cliente.comuna || 'No especificado'
    };
    
    // Método 1: Usar información directa de los campos de la tabla cotizaciones (PRIORIDAD MÁS ALTA)
    if (cotizacion.cliente_nombre || cotizacion.cliente_email) {
      infoCliente = {
        nombre: cotizacion.cliente_nombre || infoCliente.nombre,
        rut: cotizacion.cliente_rut || infoCliente.rut,
        correo: cotizacion.cliente_email || emailCliente,
        telefono: cotizacion.cliente_telefono || infoCliente.telefono,
        empresa: cotizacion.cliente_empresa || infoCliente.empresa,
        direccion: cotizacion.cliente_direccion || infoCliente.direccion,
        comuna: cotizacion.cliente_comuna || infoCliente.comuna
      };
      console.log('✅ Información del cliente obtenida desde campos directos de cotizaciones');
    }
    
    // Si no hay datos del cliente en detallesObj, intentar obtenerlos de la cotización con relaciones
    if (!cliente.nombre && cotizacion.SolicitudRetiro && cotizacion.SolicitudRetiro.Cliente) {
      const clienteDB = cotizacion.SolicitudRetiro.Cliente;
      infoCliente = {
        nombre: clienteDB.nombre || clienteDB.razonSocial || 'Cliente',
        rut: clienteDB.rut || 'No especificado',
        correo: clienteDB.email || emailCliente,
        telefono: clienteDB.telefono || 'No especificado',
        empresa: clienteDB.empresa || clienteDB.razonSocial || 'No especificado',
        direccion: clienteDB.direccion || 'No especificado',
        comuna: clienteDB.comuna || 'No especificado'
      };
    }
    
    // Si aún no tenemos datos, intentar cargar la cotización completa
    if (infoCliente.nombre === 'Cliente') {
      try {
        const cotizacionCompleta = await Cotizacion.findByPk(cotizacion.id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (cotizacionCompleta && cotizacionCompleta.SolicitudRetiro && cotizacionCompleta.SolicitudRetiro.Cliente) {
          const clienteDB = cotizacionCompleta.SolicitudRetiro.Cliente;
          infoCliente = {
            nombre: clienteDB.nombre || clienteDB.razonSocial || 'Cliente',
            rut: clienteDB.rut || 'No especificado',
            correo: clienteDB.email || emailCliente,
            telefono: clienteDB.telefono || 'No especificado',
            empresa: clienteDB.empresa || clienteDB.razonSocial || 'No especificado',
            direccion: clienteDB.direccion || 'No especificado',
            comuna: clienteDB.comuna || 'No especificado'
          };
        }
      } catch (error) {
        console.warn('No se pudo cargar información adicional del cliente:', error.message);
      }
    }
    
    console.log('Información del cliente compilada:', infoCliente);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #00616e, #00818f); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: bold;
          }
          .header h2 {
            margin: 10px 0 0 0;
            font-weight: normal;
            opacity: 0.9;
          }
          .content { 
            padding: 30px; 
          }
          .section {
            margin-bottom: 25px;
          }
          .section h3 {
            color: #00616e;
            border-bottom: 2px solid #00616e;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            background: white;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          th { 
            background-color: #00616e; 
            color: white;
            font-weight: bold;
          }
          .total-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .total { 
            font-weight: bold; 
            color: #00616e; 
            font-size: 1.1em;
          }
          .footer { 
            margin-top: 30px; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 5px;
            text-align: center;
          }
          .contact-info {
            background: #e8f4f5;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .logo {
            font-size: 1.2em;
            margin-right: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><span class="logo">🌿</span>FELMART</h1>
            <h2>Cotización N° ${cotizacion.numeroCotizacion}</h2>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>Estimado/a ${infoCliente.nombre},</h3>
              <p>Esperamos que se encuentre muy bien. Adjuntamos la cotización solicitada con el siguiente detalle:</p>
            </div>
            
            <div class="section">
              <h3>👤 Información del Cliente</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                <p><strong>Nombre:</strong> ${infoCliente.nombre}</p>
                <p><strong>RUT:</strong> ${infoCliente.rut}</p>
                <p><strong>Email:</strong> ${infoCliente.correo}</p>
                <p><strong>Teléfono:</strong> ${infoCliente.telefono}</p>
                <p><strong>Empresa:</strong> ${infoCliente.empresa}</p>
                <p><strong>Dirección:</strong> ${infoCliente.direccion}</p>
                <p><strong>Comuna:</strong> ${infoCliente.comuna}</p>
              </div>
            </div>
            
            <div class="section">
              <h3>📋 Información de la Cotización</h3>
              <p><strong>Número de Cotización:</strong> ${cotizacion.numeroCotizacion}</p>
              <p><strong>Fecha:</strong> ${moment(cotizacion.fechaCotizacion).format('DD/MM/YYYY')}</p>
              <p><strong>Estado:</strong> <span style="color: #00616e; font-weight: bold;">${cotizacion.estado.toUpperCase()}</span></p>
              ${cotizacion.validezCotizacion ? `<p><strong>Validez:</strong> ${cotizacion.validezCotizacion} días</p>` : ''}
            </div>

            ${residuos.length > 0 ? `
            <div class="section">
              <h3>📦 Detalle de Residuos</h3>
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${residuos.map(r => `
                    <tr>
                      <td>${r.descripcion || 'Residuo'}</td>
                      <td>${r.cantidad}</td>
                      <td>${r.unidad || 'kg'}</td>
                      <td>${parseInt(r.precioUnitario || 0).toLocaleString('es-CL')}</td>
                      <td>${parseInt(r.subtotal || 0).toLocaleString('es-CL')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="total-section">
              <h3>💰 Resumen de Costos</h3>
              <table style="margin: 0;">
                <tr>
                  <td><strong>Subtotal:</strong></td>
                  <td style="text-align: right;"><strong>${parseInt(cotizacion.subtotal || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
                <tr>
                  <td><strong>IVA (19%):</strong></td>
                  <td style="text-align: right;"><strong>${parseInt(cotizacion.iva || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
                <tr class="total">
                  <td style="font-size: 1.2em; color: #00616e;"><strong>TOTAL:</strong></td>
                  <td style="text-align: right; font-size: 1.2em; color: #00616e;"><strong>${parseInt(cotizacion.total || 0).toLocaleString('es-CL')}</strong></td>
                </tr>
              </table>
            </div>

            ${cotizacion.observaciones ? `
            <div class="section">
              <h3>📝 Observaciones</h3>
              <p>${cotizacion.observaciones}</p>
            </div>
            ` : ''}

            <div class="contact-info">
              <h3>📞 Información de Contacto</h3>
              <p>Para cualquier consulta sobre esta cotización, no dude en contactarnos:</p>
              <p>
                📧 <strong>Email:</strong> ${process.env.EMAIL_FROM}<br>
                📱 <strong>Teléfono:</strong> +56 2 1234 5678<br>
                🌐 <strong>Web:</strong> www.felmart.cl
              </p>
            </div>

            <div class="footer">
              <p><strong>¡Gracias por confiar en Felmart!</strong></p>
              <p>Comprometidos con el medio ambiente y la gestión responsable de residuos.</p>
              <p style="font-size: 0.9em; color: #666; margin-top: 15px;">
                Este correo fue generado automáticamente. Por favor, no responda a esta dirección.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: {
        name: 'Felmart - Gestión de Residuos',
        address: process.env.EMAIL_USER
      },
      to: emailCliente,
      subject: `📋 Cotización ${cotizacion.numeroCotizacion} - Felmart`,
      html: htmlContent,
      attachments: []
    };

    // Agregar PDF si existe
    if (cotizacion.rutaPdf) {
      const rutaPdf = path.join(__dirname, '..', 'public', cotizacion.rutaPdf);
      if (fs.existsSync(rutaPdf)) {
        mailOptions.attachments.push({
          filename: `Cotizacion-${cotizacion.numeroCotizacion}.pdf`,
          path: rutaPdf
        });
      }
    }

    console.log('MailOptions:', mailOptions);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado exitosamente:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error detallado al enviar correo:', error);
    throw error;
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