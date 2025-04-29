// controllers/solicitudController.js
const { 
    SolicitudRetiro, 
    Cliente, 
    Residuo, 
    DetalleResiduo, 
    Usuario,
    Notificacion 
  } = require('../models');
  const { Op } = require('sequelize');
  
  const solicitudController = {
    // Listar solicitudes (filtradas según rol)
    listar: async (req, res) => {
      try {
        let solicitudes = [];
        const { usuario } = req.session;
        
        // Filtrar solicitudes según rol
        if (usuario.rol === 'administrador' || usuario.rol === 'operador') {
          // Admin y operador ven todas las solicitudes
          solicitudes = await SolicitudRetiro.findAll({
            include: [
              { model: Cliente }
            ],
            order: [['fechaSolicitud', 'DESC']]
          });
        } else if (usuario.rol === 'cliente') {
          // Cliente solo ve sus solicitudes
          solicitudes = await SolicitudRetiro.findAll({
            where: { clienteId: req.session.clienteId },
            order: [['fechaSolicitud', 'DESC']]
          });
        }
        
        res.render('solicitudes/listar', {
          titulo: 'Solicitudes de Retiro',
          solicitudes,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al listar solicitudes:', error);
        req.flash('error', 'Error al cargar la lista de solicitudes');
        res.redirect('/dashboard');
      }
    },
    
    // controllers/solicitudController.js (continuación)
  detalles: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Buscar solicitud con todos sus detalles
      const solicitud = await SolicitudRetiro.findByPk(id, {
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
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente' && solicitud.clienteId !== req.session.clienteId) {
        req.flash('error', 'No tienes permiso para ver esta solicitud');
        return res.redirect('/solicitudes');
      }
      
      res.render('solicitudes/detalles', {
        titulo: 'Detalles de Solicitud',
        solicitud,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar detalles de solicitud:', error);
      req.flash('error', 'Error al cargar detalles de la solicitud');
      res.redirect('/solicitudes');
    }
  },
  
  // Mostrar formulario para crear solicitud
  mostrarCrear: async (req, res) => {
    try {
      const { usuario } = req.session;
      let clientes = [];
      
      // Si es admin, mostrar lista de clientes
      if (usuario.rol === 'administrador') {
        clientes = await Cliente.findAll({
          order: [['nombreEmpresa', 'ASC']]
        });
      } else if (usuario.rol === 'cliente') {
        // Verificar si el cliente tiene perfil
        if (!req.session.clienteId) {
          req.flash('error', 'Debes completar tu perfil antes de crear solicitudes');
          return res.redirect('/clientes/perfil');
        }
      }
      
      // Obtener lista de residuos disponibles
      const residuos = await Residuo.findAll({
        order: [['nombre', 'ASC']]
      });
      
      res.render('solicitudes/crear', {
        titulo: 'Nueva Solicitud de Retiro',
        clientes,
        residuos,
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
  
  // Crear solicitud
  crear: async (req, res) => {
    try {
      const { usuario } = req.session;
      const { 
        clienteId,
        fechaRetiroSolicitada,
        direccionRetiro,
        contactoNombre,
        contactoTelefono,
        observaciones,
        residuos,
        cantidades,
        observacionesResiduos
      } = req.body;
      
      // Determinar el ID del cliente según el rol
      let idCliente = clienteId;
      if (usuario.rol === 'cliente') {
        idCliente = req.session.clienteId;
      }
      
      // Validar campos
      if (!idCliente || !fechaRetiroSolicitada || !direccionRetiro || !contactoNombre || !contactoTelefono) {
        req.flash('error', 'Todos los campos marcados con * son obligatorios');
        return res.redirect('/solicitudes/crear');
      }
      
      // Validar que haya al menos un residuo
      if (!residuos || !Array.isArray(residuos) || residuos.length === 0) {
        req.flash('error', 'Debe agregar al menos un residuo');
        return res.redirect('/solicitudes/crear');
      }
      
      // Crear solicitud
      const nuevaSolicitud = await SolicitudRetiro.create({
        clienteId: idCliente,
        fechaRetiroSolicitada,
        direccionRetiro,
        contactoNombre,
        contactoTelefono,
        observaciones,
        estado: 'pendiente'
      });
      
      // Crear detalles de residuos
      for (let i = 0; i < residuos.length; i++) {
        await DetalleResiduo.create({
          solicitudRetiroId: nuevaSolicitud.id,
          residuoId: residuos[i],
          cantidad: cantidades[i],
          observaciones: observacionesResiduos[i] || null
        });
      }
      
      // Crear notificación para administradores
      const admins = await Usuario.findAll({
        where: { rol: 'administrador' }
      });
      
      for (const admin of admins) {
        await Notificacion.create({
          usuarioId: admin.id,
          tipo: 'solicitud',
          titulo: 'Nueva solicitud de retiro',
          mensaje: `Se ha registrado una nueva solicitud de retiro con ID: ${nuevaSolicitud.id}`,
          referenciaId: nuevaSolicitud.id
        });
      }
      
      req.flash('success', 'Solicitud creada correctamente');
      res.redirect('/solicitudes');
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      req.flash('error', 'Error al crear solicitud');
      res.redirect('/solicitudes/crear');
    }
  },
  
  // Mostrar formulario para editar solicitud
  mostrarEditar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Buscar solicitud
      const solicitud = await SolicitudRetiro.findByPk(id, {
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
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente') {
        if (solicitud.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para editar esta solicitud');
          return res.redirect('/solicitudes');
        }
        
        // Cliente solo puede editar solicitudes pendientes
        if (solicitud.estado !== 'pendiente') {
          req.flash('error', 'Solo puedes editar solicitudes en estado pendiente');
          return res.redirect(`/solicitudes/detalles/${id}`);
        }
      }
      
      // Obtener listas necesarias
      let clientes = [];
      if (usuario.rol === 'administrador') {
        clientes = await Cliente.findAll({
          order: [['nombreEmpresa', 'ASC']]
        });
      }
      
      const residuos = await Residuo.findAll({
        order: [['nombre', 'ASC']]
      });
      
      res.render('solicitudes/editar', {
        titulo: 'Editar Solicitud',
        solicitud,
        clientes,
        residuos,
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/solicitudes');
    }
  },
  
  // Editar solicitud
  editar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      const { 
        clienteId,
        fechaRetiroSolicitada,
        direccionRetiro,
        contactoNombre,
        contactoTelefono,
        observaciones,
        estado,
        residuos,
        cantidades,
        observacionesResiduos
      } = req.body;
      
      // Buscar solicitud
      const solicitud = await SolicitudRetiro.findByPk(id);
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente') {
        if (solicitud.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para editar esta solicitud');
          return res.redirect('/solicitudes');
        }
        
        // Cliente solo puede editar solicitudes pendientes
        if (solicitud.estado !== 'pendiente') {
          req.flash('error', 'Solo puedes editar solicitudes en estado pendiente');
          return res.redirect(`/solicitudes/detalles/${id}`);
        }
      }
      
      // Validar campos
      if (!fechaRetiroSolicitada || !direccionRetiro || !contactoNombre || !contactoTelefono) {
        req.flash('error', 'Todos los campos marcados con * son obligatorios');
        return res.redirect(`/solicitudes/editar/${id}`);
      }
      
      // Validar que haya al menos un residuo
      if (!residuos || !Array.isArray(residuos) || residuos.length === 0) {
        req.flash('error', 'Debe agregar al menos un residuo');
        return res.redirect(`/solicitudes/editar/${id}`);
      }
      
      // Actualizar solicitud
      solicitud.fechaRetiroSolicitada = fechaRetiroSolicitada;
      solicitud.direccionRetiro = direccionRetiro;
      solicitud.contactoNombre = contactoNombre;
      solicitud.contactoTelefono = contactoTelefono;
      solicitud.observaciones = observaciones;
      
      // Solo el admin puede cambiar cliente y estado
      if (usuario.rol === 'administrador') {
        if (clienteId) solicitud.clienteId = clienteId;
        if (estado) solicitud.estado = estado;
      }
      
      await solicitud.save();
      
      // Eliminar detalles antiguos
      await DetalleResiduo.destroy({
        where: { solicitudRetiroId: id }
      });
      
      // Crear nuevos detalles
      for (let i = 0; i < residuos.length; i++) {
        await DetalleResiduo.create({
          solicitudRetiroId: id,
          residuoId: residuos[i],
          cantidad: cantidades[i],
          observaciones: observacionesResiduos[i] || null
        });
      }
      
      // Crear notificación para cliente si el admin cambió el estado
      if (usuario.rol === 'administrador' && estado && estado !== solicitud.estado) {
        const cliente = await Cliente.findByPk(solicitud.clienteId, {
          include: [{ model: Usuario }]
        });
        
        if (cliente && cliente.Usuario) {
          await Notificacion.create({
            usuarioId: cliente.Usuario.id,
            tipo: 'solicitud',
            titulo: 'Actualización de solicitud',
            mensaje: `El estado de su solicitud #${id} ha cambiado a: ${estado}`,
            referenciaId: id
          });
        }
      }
      
      req.flash('success', 'Solicitud actualizada correctamente');
      res.redirect(`/solicitudes/detalles/${id}`);
    } catch (error) {
      console.error('Error al editar solicitud:', error);
      req.flash('error', 'Error al actualizar solicitud');
      res.redirect(`/solicitudes/editar/${req.params.id}`);
    }
  },
  
  // Cambiar estado de solicitud (solo admin)
  cambiarEstado: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      // Buscar solicitud
      const solicitud = await SolicitudRetiro.findByPk(id, {
        include: [{ model: Cliente, include: [{ model: Usuario }] }]
      });
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Actualizar estado
      solicitud.estado = estado;
      await solicitud.save();
      
      // Notificar al cliente
      if (solicitud.Cliente && solicitud.Cliente.Usuario) {
        await Notificacion.create({
          usuarioId: solicitud.Cliente.Usuario.id,
          tipo: 'solicitud',
          titulo: 'Actualización de solicitud',
          mensaje: `El estado de su solicitud #${id} ha cambiado a: ${estado}`,
          referenciaId: id
        });
      }
      
      req.flash('success', 'Estado de solicitud actualizado correctamente');
      res.redirect(`/solicitudes/detalles/${id}`);
    } catch (error) {
      console.error('Error al cambiar estado de solicitud:', error);
      req.flash('error', 'Error al actualizar estado');
      res.redirect(`/solicitudes/detalles/${req.params.id}`);
    }
  },
  
  // Cancelar solicitud
  cancelar: async (req, res) => {
    try {
      const { id } = req.params;
      const { usuario } = req.session;
      
      // Buscar solicitud
      const solicitud = await SolicitudRetiro.findByPk(id);
      
      if (!solicitud) {
        req.flash('error', 'Solicitud no encontrada');
        return res.redirect('/solicitudes');
      }
      
      // Verificar acceso para clientes
      if (usuario.rol === 'cliente') {
        if (solicitud.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para cancelar esta solicitud');
          return res.redirect('/solicitudes');
        }
        
        // Cliente solo puede cancelar solicitudes pendientes o cotizadas
        if (solicitud.estado !== 'pendiente' && solicitud.estado !== 'cotizada') {
          req.flash('error', 'Solo puedes cancelar solicitudes en estado pendiente o cotizada');
          return res.redirect(`/solicitudes/detalles/${id}`);
        }
      }
      
      // Cambiar estado a cancelada
      solicitud.estado = 'cancelada';
      await solicitud.save();
      
      // Notificar a administradores si el cliente cancela
      if (usuario.rol === 'cliente') {
        const admins = await Usuario.findAll({
          where: { rol: 'administrador' }
        });
        
        for (const admin of admins) {
          await Notificacion.create({
            usuarioId: admin.id,
            tipo: 'solicitud',
            titulo: 'Solicitud cancelada',
            mensaje: `El cliente ha cancelado la solicitud #${id}`,
            referenciaId: id
          });
        }
      }
      
      // Notificar al cliente si el admin cancela
      if (usuario.rol === 'administrador') {
        const cliente = await Cliente.findByPk(solicitud.clienteId, {
          include: [{ model: Usuario }]
        });
        
        if (cliente && cliente.Usuario) {
          await Notificacion.create({
            usuarioId: cliente.Usuario.id,
            tipo: 'solicitud',
            titulo: 'Solicitud cancelada',
            mensaje: `Su solicitud #${id} ha sido cancelada por el administrador`,
            referenciaId: id
          });
        }
      }
      
      req.flash('success', 'Solicitud cancelada correctamente');
      res.redirect('/solicitudes');
    } catch (error) {
      console.error('Error al cancelar solicitud:', error);
      req.flash('error', 'Error al cancelar solicitud');
      res.redirect(`/solicitudes/detalles/${req.params.id}`);
    }
  }
};

module.exports = solicitudController;