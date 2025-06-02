// controllers/clienteController.js
const { Cliente, Usuario, SolicitudRetiro } = require('../models');
const { Op } = require('sequelize');

const clienteController = {
  // Listar todos los clientes
  listarClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        include: [{
          model: Usuario,
          attributes: ['email', 'activo']
        }],
        order: [['createdAt', 'DESC']]
      });
      
      res.json({ success: true, clientes });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener la lista de clientes' 
      });
    }
  },

  // Crear nuevo cliente
  crearCliente: async (req, res) => {
    try {
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

      // Verificar si el RUT ya existe
      const clienteExistente = await Cliente.findOne({ where: { rut } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'El RUT ya está registrado'
        });
      }

      // Crear usuario asociado
      const usuario = await Usuario.create({
        email,
        password: Math.random().toString(36).slice(-8), // Contraseña temporal
        rol: 'cliente',
        activo: true
      });

      // Crear cliente
      const cliente = await Cliente.create({
        rut,
        nombreEmpresa,
        direccion,
        comuna,
        ciudad,
        telefono,
        email,
        contactoPrincipal,
        usuarioId: usuario.id
      });

      res.json({ 
        success: true, 
        message: 'Cliente creado exitosamente',
        cliente 
      });
    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear el cliente' 
      });
    }
  },

  // Obtener un cliente
  obtenerCliente: async (req, res) => {
    try {
      const { id } = req.params;
      const cliente = await Cliente.findByPk(id, {
        include: [{
          model: Usuario,
          attributes: ['email', 'activo']
        }]
      });

      if (!cliente) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente no encontrado' 
        });
      }

      res.json({ success: true, cliente });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener el cliente' 
      });
    }
  },

  // Actualizar cliente
  actualizarCliente: async (req, res) => {
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
        contactoPrincipal 
      } = req.body;

      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente no encontrado' 
        });
      }

      // Verificar si el nuevo RUT ya existe en otro cliente
      if (rut && rut !== cliente.rut) {
        const rutExistente = await Cliente.findOne({
          where: {
            rut,
            id: { [Op.ne]: id }
          }
        });
        
        if (rutExistente) {
          return res.status(400).json({
            success: false,
            message: 'El RUT ya está registrado para otro cliente'
          });
        }
      }

      await cliente.update({
        rut: rut || cliente.rut,
        nombreEmpresa: nombreEmpresa || cliente.nombreEmpresa,
        direccion: direccion || cliente.direccion,
        comuna: comuna || cliente.comuna,
        ciudad: ciudad || cliente.ciudad,
        telefono: telefono || cliente.telefono,
        email: email || cliente.email,
        contactoPrincipal: contactoPrincipal || cliente.contactoPrincipal
      });

      // Actualizar email del usuario si cambió
      if (email && email !== cliente.email) {
        await Usuario.update(
          { email },
          { where: { id: cliente.usuarioId } }
        );
      }

      res.json({ 
        success: true, 
        message: 'Cliente actualizado exitosamente',
        cliente 
      });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar el cliente' 
      });
    }
  },

  // Eliminar cliente
  eliminarCliente: async (req, res) => {
    try {
      const { id } = req.params;
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente no encontrado' 
        });
      }

      // Eliminar usuario asociado
      await Usuario.destroy({ where: { id: cliente.usuarioId } });
      
      // Eliminar cliente
      await cliente.destroy();

      res.json({ 
        success: true, 
        message: 'Cliente eliminado exitosamente' 
      });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar el cliente' 
      });
    }
  },

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
  },

  // Obtener todos los clientes
  getClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        attributes: [
          'id', 
          'rut',
          ['nombre_empresa', 'nombre_empresa'],
          'email', 
          'telefono', 
          ['contacto_principal', 'contacto_principal'],
          'direccion',
          'comuna',
          'ciudad'
        ],
        order: [['nombre_empresa', 'ASC']]
      });

      const clientesFormateados = clientes.map(cliente => {
        const data = cliente.toJSON();
        return {
          id: data.id,
          rut: data.rut,
          nombre_empresa: data.nombre_empresa,
          email: data.email,
          telefono: data.telefono,
          contacto_principal: data.contacto_principal,
          direccion: data.direccion,
          comuna: data.comuna,
          ciudad: data.ciudad
        };
      });

      res.json({ 
        success: true, 
        clientes: clientesFormateados
      });
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener los clientes',
        error: error.message 
      });
    }
  },

  // Obtener un cliente por ID
  getClienteById: async (req, res) => {
    try {
      const cliente = await Cliente.findByPk(req.params.id);
      if (!cliente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      res.json({ success: true, cliente });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({ success: false, message: 'Error al obtener el cliente' });
    }
  },

  // Crear un nuevo cliente
  createCliente: async (req, res) => {
    try {
      const clienteExistente = await Cliente.findOne({ where: { rut: req.body.rut } });
      if (clienteExistente) {
        return res.status(400).json({ success: false, message: 'Ya existe un cliente con este RUT' });
      }

      const cliente = await Cliente.create({
        rut: req.body.rut,
        nombre_empresa: req.body.nombreEmpresa,
        email: req.body.email,
        telefono: req.body.telefono,
        contacto_principal: req.body.contactoPrincipal,
        direccion: req.body.direccion,
        comuna: req.body.comuna,
        ciudad: req.body.ciudad
      });

      res.json({ success: true, message: 'Cliente creado exitosamente', cliente });
    } catch (error) {
      console.error('Error al crear cliente:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Error de validación', 
          errors: error.errors.map(e => e.message) 
        });
      }
      res.status(500).json({ success: false, message: 'Error al crear el cliente' });
    }
  },

  // Actualizar un cliente
  updateCliente: async (req, res) => {
    try {
      const cliente = await Cliente.findByPk(req.params.id);
      if (!cliente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }

      // Verificar si el nuevo RUT ya existe (si se está cambiando)
      if (req.body.rut !== cliente.rut) {
        const clienteExistente = await Cliente.findOne({ where: { rut: req.body.rut } });
        if (clienteExistente) {
          return res.status(400).json({ success: false, message: 'Ya existe un cliente con este RUT' });
        }
      }

      await cliente.update({
        rut: req.body.rut,
        nombre_empresa: req.body.nombreEmpresa,
        email: req.body.email,
        telefono: req.body.telefono,
        contacto_principal: req.body.contactoPrincipal,
        direccion: req.body.direccion,
        comuna: req.body.comuna,
        ciudad: req.body.ciudad
      });

      res.json({ success: true, message: 'Cliente actualizado exitosamente', cliente });
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: 'Error de validación', 
          errors: error.errors.map(e => e.message) 
        });
      }
      res.status(500).json({ success: false, message: 'Error al actualizar el cliente' });
    }
  },

  // Eliminar un cliente
  deleteCliente: async (req, res) => {
    try {
      const cliente = await Cliente.findByPk(req.params.id);
      if (!cliente) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }

      await cliente.destroy();
      res.json({ success: true, message: 'Cliente eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar el cliente' });
    }
  },

  // Renderizar la vista de clientes
  renderClientes: async (req, res) => {
    try {
      res.render('dashboard/clientes');
    } catch (error) {
      console.error('Error al renderizar vista:', error);
      res.status(500).send('Error al cargar la página');
    }
  }
};

module.exports = clienteController;