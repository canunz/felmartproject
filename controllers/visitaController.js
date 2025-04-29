// controllers/visitaController.js
const { 
    VisitaRetiro, 
    SolicitudRetiro, 
    Cliente, 
    Usuario,
    Notificacion,
    Cotizacion 
  } = require('../models');
  const { Op } = require('sequelize');
  const moment = require('moment');
  const nodemailer = require('nodemailer');
  require('dotenv').config();
  
  const visitaController = {
    // Mostrar calendario de visitas
    calendario: async (req, res) => {
      try {
        const { usuario } = req.session;
        let visitas = [];
        
        // Filtrar visitas según rol
        if (usuario.rol === 'administrador' || usuario.rol === 'operador') {
          // Admin y operador ven todas las visitas
          const query = {
            include: [
              { 
                model: SolicitudRetiro,
                include: [{ model: Cliente }]
              },
              {
                model: Usuario,
                as: 'Operador'
              }
            ],
            order: [['fechaProgramada', 'ASC']]
          };
          
          // Operador solo ve sus visitas asignadas
          if (usuario.rol === 'operador') {
            query.where = {
              operadorId: usuario.id
            };
          }
          
          visitas = await VisitaRetiro.findAll(query);
        } else if (usuario.rol === 'cliente') {
          // Cliente solo ve sus visitas
          visitas = await VisitaRetiro.findAll({
            include: [
              { 
                model: SolicitudRetiro,
                where: { clienteId: req.session.clienteId },
                include: [{ model: Cliente }]
              },
              {
                model: Usuario,
                as: 'Operador'
              }
            ],
            order: [['fechaProgramada', 'ASC']]
          });
        }
        
        // Formatear visitas para el calendario
        const eventosCalendario = visitas.map(visita => {
          const fecha = moment(visita.fechaProgramada).format('YYYY-MM-DD');
          const horaInicio = moment(visita.horaInicio, 'HH:mm:ss').format('HH:mm');
          const horaFin = moment(visita.horaFin, 'HH:mm:ss').format('HH:mm');
          
          let title = `Visita #${visita.id}`;
          if (visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente) {
            title += ` - ${visita.SolicitudRetiro.Cliente.nombreEmpresa}`;
          }
          
          let color;
          switch (visita.estado) {
            case 'programada':
              color = '#3788d8'; // Azul
              break;
            case 'en_proceso':
              color = '#f39c12'; // Naranja
              break;
            case 'completada':
              color = '#27ae60'; // Verde
              break;
            case 'cancelada':
              color = '#e74c3c'; // Rojo
              break;
            default:
              color = '#95a5a6'; // Gris
          }
          
          return {
            id: visita.id,
            title,
            start: `${fecha}T${horaInicio}`,
            end: `${fecha}T${horaFin}`,
            color,
            extendedProps: {
              estado: visita.estado,
              solicitudId: visita.SolicitudRetiro ? visita.SolicitudRetiro.id : null,
              clienteId: visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente ? visita.SolicitudRetiro.Cliente.id : null,
              operadorId: visita.operadorId,
              operadorNombre: visita.Operador ? visita.Operador.nombre : 'Sin asignar'
            }
          };
        });
        
        // Obtener operadores disponibles (para asignación)
        let operadores = [];
        if (usuario.rol === 'administrador') {
          operadores = await Usuario.findAll({
            where: { 
              rol: 'operador',
              activo: true
            },
            order: [['nombre', 'ASC']]
          });
        }
        
        res.render('visitas/calendario', {
          titulo: 'Calendario de Visitas',
          eventosCalendario: JSON.stringify(eventosCalendario),
          operadores,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar calendario:', error);
        req.flash('error', 'Error al cargar el calendario');
        res.redirect('/dashboard');
      }
    },
    
    // Ver detalles de una visita
    detalles: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Buscar visita con todos sus detalles
        const visita = await VisitaRetiro.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [
                { model: Cliente },
                { 
                  model: Cotizacion,
                  where: { estado: 'aceptada' },
                  required: false
                }
              ]
            },
            {
              model: Usuario,
              as: 'Operador'
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && visita.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para ver esta visita');
          return res.redirect('/visitas/calendario');
        }
        
        // Obtener operadores disponibles (para reasignación)
        let operadores = [];
        if (usuario.rol === 'administrador') {
          operadores = await Usuario.findAll({
            where: { 
              rol: 'operador',
              activo: true
            },
            order: [['nombre', 'ASC']]
          });
        }
        
        res.render('visitas/detalles', {
          titulo: 'Detalles de Visita',
          visita,
          operadores,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar detalles de visita:', error);
        req.flash('error', 'Error al cargar detalles de la visita');
        res.redirect('/visitas/calendario');
      }
    },
    
    // Mostrar formulario para programar visita
    mostrarProgramar: async (req, res) => {
      try {
        const { solicitudId } = req.query;
        const { usuario } = req.session;
        
        // Solo admins pueden programar visitas
        if (usuario.rol !== 'administrador') {
          req.flash('error', 'No tienes permiso para programar visitas');
          return res.redirect('/dashboard');
        }
        
        // Verificar si viene de una solicitud
        if (!solicitudId) {
          req.flash('error', 'Debe seleccionar una solicitud para programar visita');
          return res.redirect('/solicitudes');
        }
        
        // Buscar solicitud
        const solicitud = await SolicitudRetiro.findByPk(solicitudId, {
          include: [
            { model: Cliente },
            { 
              model: Cotizacion,
              where: { estado: 'aceptada' },
              required: true
            }
          ]
        });
        
        if (!solicitud) {
          req.flash('error', 'Solicitud no encontrada o no tiene cotización aceptada');
          return res.redirect('/solicitudes');
        }
        
        // Verificar que la solicitud esté cotizada
        if (solicitud.estado !== 'cotizada') {
          req.flash('error', 'Solo se pueden programar visitas para solicitudes cotizadas');
          return res.redirect(`/solicitudes/detalles/${solicitudId}`);
        }
        
        // Verificar que no tenga ya una visita programada o en proceso
        const visitaExistente = await VisitaRetiro.findOne({
          where: {
            solicitudRetiroId: solicitudId,
            estado: {
              [Op.in]: ['programada', 'en_proceso']
            }
          }
        });
        
        if (visitaExistente) {
          req.flash('error', 'Esta solicitud ya tiene una visita programada o en proceso');
          return res.redirect(`/visitas/detalles/${visitaExistente.id}`);
        }
        
        // Obtener operadores
        const operadores = await Usuario.findAll({
          where: { 
            rol: 'operador',
            activo: true
          },
          order: [['nombre', 'ASC']]
        });
        
        res.render('visitas/programar', {
          titulo: 'Programar Visita',
          solicitud,
          operadores,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar formulario de programación:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/solicitudes');
      }
    },
    
    // Programar visita
    programar: async (req, res) => {
      try {
        const { 
          solicitudId,
          fechaProgramada,
          horaInicio,
          horaFin,
          operadorId,
          observaciones
        } = req.body;
        
        // Validar campos
        if (!solicitudId || !fechaProgramada || !horaInicio || !horaFin || !operadorId) {
          req.flash('error', 'Todos los campos marcados con * son obligatorios');
          return res.redirect(`/visitas/programar?solicitudId=${solicitudId}`);
        }
        
        // Buscar solicitud
        const solicitud = await SolicitudRetiro.findByPk(solicitudId, {
          include: [
            { model: Cliente },
            { 
              model: Cotizacion,
              where: { estado: 'aceptada' },
              required: true
            }
          ]
        });
        
        if (!solicitud) {
          req.flash('error', 'Solicitud no encontrada o no tiene cotización aceptada');
          return res.redirect('/solicitudes');
        }
        
        // Crear visita
        const nuevaVisita = await VisitaRetiro.create({
          solicitudRetiroId: solicitudId,
          operadorId,
          fechaProgramada,
          horaInicio,
          horaFin,
          estado: 'programada',
          observaciones
        });
        
        // Actualizar estado de la solicitud
        solicitud.estado = 'programada';
        await solicitud.save();
        
        // Notificar al operador
        await Notificacion.create({
          usuarioId: operadorId,
          tipo: 'visita',
          titulo: 'Nueva visita asignada',
          mensaje: `Se te ha asignado una visita para el ${moment(fechaProgramada).format('DD/MM/YYYY')} de ${horaInicio} a ${horaFin}`,
          referenciaId: nuevaVisita.id
        });
        
        // Notificar al cliente
        if (solicitud.Cliente && solicitud.Cliente.Usuario) {
          await Notificacion.create({
            usuarioId: solicitud.Cliente.Usuario.id,
            tipo: 'visita',
            titulo: 'Visita programada',
            mensaje: `Se ha programado una visita para su solicitud #${solicitudId} el día ${moment(fechaProgramada).format('DD/MM/YYYY')} de ${horaInicio} a ${horaFin}`,
            referenciaId: nuevaVisita.id
          });
          
          // Enviar correo al cliente
          await enviarCorreoVisita(solicitud.Cliente, nuevaVisita);
        }
        
        req.flash('success', 'Visita programada correctamente');
        res.redirect(`/visitas/detalles/${nuevaVisita.id}`);
      } catch (error) {
        console.error('Error al programar visita:', error);
        req.flash('error', 'Error al programar visita');
        res.redirect(`/visitas/programar?solicitudId=${req.body.solicitudId}`);
      }
    },
    
    // Reprogramar visita
    reprogramar: async (req, res) => {
      try {
        const { id } = req.params;
        const { 
          fechaProgramada,
          horaInicio,
          horaFin,
          operadorId,
          observaciones
        } = req.body;
        
        // Validar campos
        if (!fechaProgramada || !horaInicio || !horaFin || !operadorId) {
          req.flash('error', 'Todos los campos marcados con * son obligatorios');
          return res.redirect(`/visitas/detalles/${id}`);
        }
        
        // Buscar visita
        const visita = await VisitaRetiro.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar que la visita esté programada o en proceso
        if (visita.estado !== 'programada' && visita.estado !== 'en_proceso') {
          req.flash('error', 'Solo se pueden reprogramar visitas programadas o en proceso');
          return res.redirect(`/visitas/detalles/${id}`);
        }
        
        // Almacenar operador anterior para notificación
        const operadorAnteriorId = visita.operadorId;
        
        // Actualizar visita
        visita.fechaProgramada = fechaProgramada;
        visita.horaInicio = horaInicio;
        visita.horaFin = horaFin;
        visita.operadorId = operadorId;
        visita.observaciones = observaciones;
        
        await visita.save();
        
        // Notificar al nuevo operador (si cambió)
        if (operadorId !== operadorAnteriorId) {
          await Notificacion.create({
            usuarioId: operadorId,
            tipo: 'visita',
            titulo: 'Nueva visita asignada',
            mensaje: `Se te ha asignado una visita para el ${moment(fechaProgramada).format('DD/MM/YYYY')} de ${horaInicio} a ${horaFin}`,
            referenciaId: id
          });
          
          // Notificar al operador anterior
          if (operadorAnteriorId) {
            await Notificacion.create({
              usuarioId: operadorAnteriorId,
              tipo: 'visita',
              titulo: 'Visita reasignada',
              mensaje: `La visita #${id} programada para el ${moment(fechaProgramada).format('DD/MM/YYYY')} ha sido reasignada a otro operador`,
              referenciaId: id
            });
          }
        }
        
        // Notificar al cliente
        if (visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente && visita.SolicitudRetiro.Cliente.Usuario) {
          await Notificacion.create({
            usuarioId: visita.SolicitudRetiro.Cliente.Usuario.id,
            tipo: 'visita',
            titulo: 'Visita reprogramada',
            mensaje: `Su visita ha sido reprogramada para el día ${moment(fechaProgramada).format('DD/MM/YYYY')} de ${horaInicio} a ${horaFin}`,
            referenciaId: id
          });
          
          // Enviar correo al cliente
          await enviarCorreoVisita(visita.SolicitudRetiro.Cliente, visita, true);
        }
        
        req.flash('success', 'Visita reprogramada correctamente');
        res.redirect(`/visitas/detalles/${id}`);
      } catch (error) {
        console.error('Error al reprogramar visita:', error);
        req.flash('error', 'Error al reprogramar visita');
        res.redirect(`/visitas/detalles/${req.params.id}`);
      }
    },
    
    // Cambiar estado de visita
    cambiarEstado: async (req, res) => {
      try {
        const { id } = req.params;
        const { estado, observaciones } = req.body;
        const { usuario } = req.session;
        
        // Buscar visita
        const visita = await VisitaRetiro.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar acceso para operadores
        if (usuario.rol === 'operador' && visita.operadorId !== usuario.id) {
          req.flash('error', 'No tienes permiso para modificar esta visita');
          return res.redirect('/visitas/calendario');
        }
        
        // Actualizar estado de la visita
        visita.estado = estado;
        if (observaciones) {
          visita.observaciones = observaciones;
        }
        
        await visita.save();
        
        // Si la visita se completa, actualizar estado de la solicitud
        if (estado === 'completada' && visita.SolicitudRetiro) {
          visita.SolicitudRetiro.estado = 'completada';
          await visita.SolicitudRetiro.save();
        }
        
        // Notificar al cliente
        if (visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente && visita.SolicitudRetiro.Cliente.Usuario) {
          let mensaje;
          let titulo;
          
          switch (estado) {
            case 'en_proceso':
              titulo = 'Visita en proceso';
              mensaje = `El operador ha iniciado la visita #${id}`;
              break;
            case 'completada':
              titulo = 'Visita completada';
              mensaje = `La visita #${id} ha sido completada exitosamente`;
              break;
            case 'cancelada':
              titulo = 'Visita cancelada';
              mensaje = `La visita #${id} ha sido cancelada${observaciones ? `: ${observaciones}` : ''}`;
              break;
            default:
              titulo = 'Actualización de visita';
              mensaje = `El estado de su visita #${id} ha cambiado a: ${estado}`;
          }
          
          await Notificacion.create({
            usuarioId: visita.SolicitudRetiro.Cliente.Usuario.id,
            tipo: 'visita',
            titulo,
            mensaje,
            referenciaId: id
          });
        }
        
        req.flash('success', 'Estado de visita actualizado correctamente');
        res.redirect(`/visitas/detalles/${id}`);
      } catch (error) {
        console.error('Error al cambiar estado de visita:', error);
        req.flash('error', 'Error al actualizar estado');
        res.redirect(`/visitas/detalles/${req.params.id}`);
      }
    },
    
    // Cancelar visita
    cancelar: async (req, res) => {
      try {
        const { id } = req.params;
        const { motivo } = req.body;
        const { usuario } = req.session;
        
        // Buscar visita
        const visita = await VisitaRetiro.findByPk(id, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar acceso para clientes y operadores
        if (usuario.rol === 'cliente' && visita.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para cancelar esta visita');
          return res.redirect('/visitas/calendario');
        } else if (usuario.rol === 'operador' && visita.operadorId !== usuario.id) {
          req.flash('error', 'No tienes permiso para cancelar esta visita');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar que la visita esté programada o en proceso
        if (visita.estado !== 'programada' && visita.estado !== 'en_proceso') {
          req.flash('error', 'Solo se pueden cancelar visitas programadas o en proceso');
          return res.redirect(`/visitas/detalles/${id}`);
        }
        
        // Actualizar estado de la visita
        visita.estado = 'cancelada';
        visita.observaciones = motivo ? `Cancelada: ${motivo}` : 'Cancelada sin motivo especificado';
        
        await visita.save();
        
        // Notificar al operador si el cliente cancela
        if (usuario.rol === 'cliente' && visita.operadorId) {
          await Notificacion.create({
            usuarioId: visita.operadorId,
            tipo: 'visita',
            titulo: 'Visita cancelada por cliente',
            mensaje: `El cliente ha cancelado la visita #${id}${motivo ? `. Motivo: ${motivo}` : ''}`,
            referenciaId: id
          });
        }
        
// controllers/visitaController.js (continuación)
      // Notificar al cliente si el operador o admin cancela
      if ((usuario.rol === 'administrador' || usuario.rol === 'operador') && 
          visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente && visita.SolicitudRetiro.Cliente.Usuario) {
        await Notificacion.create({
          usuarioId: visita.SolicitudRetiro.Cliente.Usuario.id,
          tipo: 'visita',
          titulo: 'Visita cancelada',
          mensaje: `Su visita #${id} ha sido cancelada${motivo ? `. Motivo: ${motivo}` : ''}`,
          referenciaId: id
        });
      }
      
      // Notificar a los administradores
      if (usuario.rol !== 'administrador') {
        const admins = await Usuario.findAll({
          where: { rol: 'administrador' }
        });
        
        for (const admin of admins) {
          await Notificacion.create({
            usuarioId: admin.id,
            tipo: 'visita',
            titulo: 'Visita cancelada',
            mensaje: `La visita #${id} ha sido cancelada por ${usuario.rol === 'cliente' ? 'el cliente' : 'el operador'}${motivo ? `. Motivo: ${motivo}` : ''}`,
            referenciaId: id
          });
        }
      }
      
      req.flash('success', 'Visita cancelada correctamente');
      res.redirect('/visitas/calendario');
    } catch (error) {
      console.error('Error al cancelar visita:', error);
      req.flash('error', 'Error al cancelar visita');
      res.redirect(`/visitas/detalles/${req.params.id}`);
    }
  }
};

// Función para enviar correo de notificación de visita
const enviarCorreoVisita = async (cliente, visita, esReprogramacion = false) => {
  try {
    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    // Formato de fecha y hora
    const fecha = moment(visita.fechaProgramada).format('DD/MM/YYYY');
    const horaInicio = moment(visita.horaInicio, 'HH:mm:ss').format('HH:mm');
    const horaFin = moment(visita.horaFin, 'HH:mm:ss').format('HH:mm');
    
    // Configurar contenido del correo
    const mailOptions = {
      from: `"Felmart" <${process.env.EMAIL_USER}>`,
      to: cliente.email,
      subject: esReprogramacion ? 'Visita reprogramada - Felmart' : 'Visita programada - Felmart',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4a7c59;">Felmart - Gestión de Residuos</h2>
          </div>
          <p>Estimado(a) <strong>${cliente.contactoPrincipal}</strong>,</p>
          <p>Le informamos que se ha ${esReprogramacion ? 'reprogramado' : 'programado'} una visita para el retiro de residuos en su empresa.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Horario:</strong> ${horaInicio} a ${horaFin}</p>
            <p><strong>Dirección:</strong> ${visita.SolicitudRetiro.direccionRetiro}</p>
            <p><strong>Contacto:</strong> ${visita.SolicitudRetiro.contactoNombre} (${visita.SolicitudRetiro.contactoTelefono})</p>
          </div>
          <p>Por favor, asegúrese de que haya alguien disponible para recibir a nuestro personal en el horario indicado.</p>
          <p>Si necesita reprogramar o tiene alguna consulta, por favor contáctenos.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #777; font-size: 12px;">
            <p>Este es un correo automático, por favor no responda a este mensaje.</p>
            <p>Felmart - Gestión de Residuos</p>
            <p>Ruta 5 Sur km 1036, sector Trapen, Puerto Montt, Chile</p>
          </div>
        </div>
      `
    };
    
    // Enviar correo
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${cliente.email}`);
    
  } catch (error) {
    console.error('Error al enviar correo:', error);
    // No lanzamos el error para que no interrumpa el proceso principal
  }
};

module.exports = visitaController;