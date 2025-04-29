// controllers/clienteController.js
const { Cliente, Usuario, SolicitudRetiro } = require('../models');
const { Op } = require('sequelize');

const clienteController = {
  // Listar clientes (admin)
  listar: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario }],
        order: [['createdAt', 'DESC']]
      });
      
      res.render('clientes/listar', {
        titulo: 'Gestión de Clientes',
        clientes,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      req.flash('error', 'Error al cargar la lista de clientes');
      res.redirect('/dashboard');
    }
  },
  
  // Ver detalles de cliente
  detalles: async (req, res) => {
    try {
      const { id } = req.params;
      
      const cliente = await Cliente.findByPk(id, {
        include: [{ model: Usuario }]
      });
      
      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }
      
      // Obtener solicitudes del cliente
      const solicitudes = await SolicitudRetiro.findAll({
        where: { clienteId: cliente.id },
        order: [['fechaSolicitud', 'DESC']],
        limit: 10
      });
      
      res.render('clientes/detalles', {
        titulo: 'Detalles del Cliente',
        cliente,
        solicitudes,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar detalles del cliente:', error);
      req.flash('error', 'Error al cargar detalles del cliente');
      res.redirect('/clientes');
    }
  },
  
  // Mostrar formulario para crear cliente
  mostrarCrear: async (req, res) => {
    try {
      // Si es admin, mostrar lista de usuarios disponibles
      let usuarios = [];
      if (req.session.usuario.rol === 'administrador') {
        usuarios = await Usuario.findAll({
          where: {
            rol: 'cliente',
            id: {
              [Op.notIn]: Sequelize.literal(
                '(SELECT usuarioId FROM clientes WHERE usuarioId IS NOT NULL)'
              )
            }
          }
        });
      }
      
      res.render('clientes/crear', {
        titulo: 'Registrar Cliente',
        usuario: req.session.usuario,
        usuarios,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de creación:', error);
      req.flash('error', 'Error al cargar el formulario');
      res.redirect('/clientes');
    }
  },
  
  // Crear cliente
  crear: async (req, res) => {
    try {
      const { 
        rut, 
        nombreEmpresa, 
        direccion, 
        comuna, 
        ciudad, 
        telefono, 
        email, 
        contactoPrincipal, 
        usuarioId 
      } = req.body;
      
      // Validar campos
      if (!rut || !nombreEmpresa || !direccion || !comuna || !ciudad || !telefono || !email || !contactoPrincipal) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/clientes/crear');
      }
      
      // Verificar si el RUT ya existe
      const clienteExistente = await Cliente.findOne({ where: { rut } });
      if (clienteExistente) {
        req.flash('error', 'El RUT ya está registrado');
        return res.redirect('/clientes/crear');
      }
      
      // Asignar usuarioId según el contexto
      let idUsuario = usuarioId;
      if (req.session.usuario.rol === 'cliente') {
        idUsuario = req.session.usuario.id;
      }
      
      // Crear cliente
      const nuevoCliente = await Cliente.create({
        rut,
        nombreEmpresa,
        direccion,
        comuna,
        ciudad,
        telefono,
        email,
        contactoPrincipal,
        usuarioId: idUsuario
      });
      
      // Si es cliente, guardar clienteId en sesión
      if (req.session.usuario.rol === 'cliente') {
        req.session.clienteId = nuevoCliente.id;
      }
      
      req.flash('success', 'Cliente registrado correctamente');
      
      // Redirigir según rol
      if (req.session.usuario.rol === 'administrador') {
        res.redirect('/clientes');
      } else {
        res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      req.flash('error', 'Error al registrar cliente');
      res.redirect('/clientes/crear');
    }
  },
  
  // Mostrar formulario para editar cliente
  mostrarEditar: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar acceso
      if (req.session.usuario.rol === 'cliente' && req.session.clienteId != id) {
        req.flash('error', 'No tienes permiso para editar este cliente');
        return res.redirect('/dashboard');
      }
      
      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }
      
      // Si es admin, obtener usuarios disponibles
      let usuarios = [];
      if (req.session.usuario.rol === 'administrador') {
        usuarios = await Usuario.findAll({
          where: {
            rol: 'cliente',
            [Op.or]: [
              { id: cliente.usuarioId },
              {
                id: {
                  [Op.notIn]: Sequelize.literal(
                    '(SELECT usuarioId FROM clientes WHERE usuarioId IS NOT NULL)'
                  )
                }
              }
            ]
          }
        });
      }
      
      res.render('clientes/editar', {
        titulo: 'Editar Cliente',
        cliente,
        usuarios,
        usuario: req.session.usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar formulario de edición:', error);
      req.flash('error', 'Error al cargar el formulario');
      if (req.session.usuario.rol === 'administrador') {
        return res.redirect('/clientes');
      } else {
        return res.redirect('/dashboard');
      }
    }
  },
  
  // Editar cliente
  editar: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        rut, 
        nombreEmpresa, 
        direccion, 
        comuna, 
        ciudad, 
        telefono, 
        email, 
        contactoPrincipal, 
        usuarioId 
      } = req.body;
      
      // Verificar acceso
      if (req.session.usuario.rol === 'cliente' && req.session.clienteId != id) {
        req.flash('error', 'No tienes permiso para editar este cliente');
        return res.redirect('/dashboard');
      }
      
      // Validar campos
      if (!rut || !nombreEmpresa || !direccion || !comuna || !ciudad || !telefono || !email || !contactoPrincipal) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect(`/clientes/editar/${id}`);
      }
      
      // Buscar cliente
      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        req.flash('error', 'Cliente no encontrado');
        return res.redirect('/clientes');
      }
      
      // Verificar si el RUT ya existe en otro cliente
      if (rut !== cliente.rut) {
        const rutExistente = await Cliente.findOne({ 
          where: { 
            rut,
            id: { [Op.ne]: id }
          } 
        });
        
        if (rutExistente) {
          req.flash('error', 'El RUT ya está registrado para otro cliente');
          return res.redirect(`/clientes/editar/${id}`);
        }
      }
      
      // Actualizar cliente
      cliente.rut = rut;
      cliente.nombreEmpresa = nombreEmpresa;
      cliente.direccion = direccion;
      cliente.comuna = comuna;
      cliente.ciudad = ciudad;
      cliente.telefono = telefono;
      cliente.email = email;
      cliente.contactoPrincipal = contactoPrincipal;
      
      // Solo el admin puede cambiar el usuario asociado
      if (req.session.usuario.rol === 'administrador' && usuarioId) {
        cliente.usuarioId = usuarioId;
      }
      
      await cliente.save();
      
      req.flash('success', 'Cliente actualizado correctamente');
      
      // Redirigir según rol
      if (req.session.usuario.rol === 'administrador') {
        res.redirect('/clientes');
      } else {
        res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('Error al editar cliente:', error);
      req.flash('error', 'Error al actualizar cliente');
      res.redirect(`/clientes/editar/${req.params.id}`);
    }
  },
  
  // Eliminar cliente (solo admin)
  eliminar: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar si hay solicitudes asociadas
      const solicitudesAsociadas = await SolicitudRetiro.count({ 
        where: { clienteId: id } 
      });
      
      if (solicitudesAsociadas > 0) {
        req.flash('error', 'No se puede eliminar el cliente porque tiene solicitudes asociadas');
        return res.redirect('/clientes');
      }
      
      // Eliminar cliente
      await Cliente.destroy({ where: { id } });
      
      req.flash('success', 'Cliente eliminado correctamente');
      res.redirect('/clientes');
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      req.flash('error', 'Error al eliminar cliente');
      res.redirect('/clientes');
    }
  },
  
  // Mostrar perfil de cliente (para clientes)
  mostrarPerfil: async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      
      // Buscar cliente asociado al usuario
      const cliente = await Cliente.findOne({ 
        where: { usuarioId } 
      });
      
      if (cliente) {
        // Si ya tiene perfil, mostrar formulario de edición
        res.render('clientes/perfil', {
          titulo: 'Mi Perfil',
          cliente,
          usuario: req.session.usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } else {
        // Si no tiene perfil, mostrar formulario de creación
        res.render('clientes/crear-perfil', {
          titulo: 'Completar Perfil',
          usuario: req.session.usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      }
    } catch (error) {
      console.error('Error al mostrar perfil de cliente:', error);
      req.flash('error', 'Error al cargar el perfil');
      res.redirect('/dashboard');
    }
  },
  
  // Actualizar perfil de cliente (para clientes)
  actualizarPerfil: async (req, res) => {
    try {
      const usuarioId = req.session.usuario.id;
      const { 
        rut, 
        nombreEmpresa, 
        direccion, 
        comuna, 
        ciudad, 
        telefono, 
        email, 
        contactoPrincipal 
      } = req.body;
      
      // Validar campos
      if (!rut || !nombreEmpresa || !direccion || !comuna || !ciudad || !telefono || !email || !contactoPrincipal) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/clientes/perfil');
      }
      
      // Buscar cliente existente
      let cliente = await Cliente.findOne({ where: { usuarioId } });
      
      if (cliente) {
        // Verificar si el RUT ya existe en otro cliente
        if (rut !== cliente.rut) {
          const rutExistente = await Cliente.findOne({ 
            where: { 
              rut,
              id: { [Op.ne]: cliente.id }
            } 
          });
          
          if (rutExistente) {
            req.flash('error', 'El RUT ya está registrado para otro cliente');
            return res.redirect('/clientes/perfil');
          }
        }
        
        // Actualizar cliente existente
        cliente.rut = rut;
        cliente.nombreEmpresa = nombreEmpresa;
        cliente.direccion = direccion;
        cliente.comuna = comuna;
        cliente.ciudad = ciudad;
        cliente.telefono = telefono;
        cliente.email = email;
        cliente.contactoPrincipal = contactoPrincipal;
        
        await cliente.save();
      } else {
        // Verificar si el RUT ya existe
        const rutExistente = await Cliente.findOne({ where: { rut } });
        if (rutExistente) {
          req.flash('error', 'El RUT ya está registrado');
          return res.redirect('/clientes/perfil');
        }
        
        // Crear nuevo cliente
        cliente = await Cliente.create({
          rut,
          nombreEmpresa,
          direccion,
          comuna,
          ciudad,
          telefono,
          email,
          contactoPrincipal,
          usuarioId
        });
        
        // Guardar clienteId en sesión
        req.session.clienteId = cliente.id;
      }
      
      req.flash('success', 'Perfil actualizado correctamente');
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error al actualizar perfil de cliente:', error);
      req.flash('error', 'Error al actualizar perfil');
      res.redirect('/clientes/perfil');
    }
  }
};

module.exports = clienteController;