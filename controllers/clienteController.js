// controllers/clienteController.js
const { Cliente, Usuario, SolicitudRetiro } = require('../models');
const { Op } = require('sequelize');

// Función para validar solo el formato del RUT chileno
const validarRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  // Validar formato básico (debe tener entre 7 y 8 dígitos + dígito verificador)
  if (!/^[0-9]{7,8}[0-9kK]$/.test(rutLimpio)) {
    return { valido: false, error: 'formato' };
  }
  return { valido: true };
};

// Función para formatear RUT
const formatearRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  // Separar número y dígito verificador
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toLowerCase();
  
  // Asegurar que el número tenga 8 dígitos (rellenar con 0 a la izquierda)
  const numeroCompleto = numero.padStart(8, '0');
  
  // Formatear número con puntos
  const rutFormateado = numeroCompleto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar RUT formateado con guión
  return rutFormateado + '-' + dv;
};

const clienteController = {
  // Listar todos los clientes con sus usuarios asociados
  listarClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        clientes: clientes
      });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar los clientes'
      });
    }
  },

  // Obtener un cliente específico
  obtenerCliente: async (req, res) => {
    try {
      const { id } = req.params;
      const cliente = await Cliente.findByPk(id, {
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo']
          }
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        cliente: cliente
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar el cliente'
      });
    }
  },

  // Crear nuevo cliente
  crearCliente: async (req, res) => {
    try {
      const { 
        rut, 
        nombreEmpresa, 
        email, 
        telefono, 
        contactoPrincipal, 
        direccion, 
        comuna, 
        ciudad 
      } = req.body;

      // Validar campos requeridos
      if (!rut || !nombreEmpresa || !email || !telefono || !contactoPrincipal || !direccion || !comuna || !ciudad) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }

      // Validar formato del RUT
      const resultadoRut = validarRut(rut);
      if (!resultadoRut.valido) {
        return res.status(400).json({
          success: false,
          message: 'El formato del RUT es incorrecto. Debe ser: 12.345.678-9'
        });
      }

      // Formatear RUT antes de guardar
      const rutFormateado = formatearRut(rut);

      // Verificar si ya existe un cliente con ese RUT
      const clienteExistente = await Cliente.findOne({ where: { rut: rutFormateado } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con ese RUT'
        });
      }

      // Verificar si ya existe un usuario con ese email
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario registrado con ese correo electrónico'
        });
      }

      // Crear usuario asociado al cliente
      const usuario = await Usuario.create({
        nombre: contactoPrincipal,
        email: email,
        password: 'temporal123', // Password temporal
        rol: 'cliente',
        activo: true
      });

      // Crear el cliente
      const nuevoCliente = await Cliente.create({
        rut: rutFormateado,
        nombre_empresa: nombreEmpresa,
        email,
        telefono,
        contacto_principal: contactoPrincipal,
        direccion,
        comuna,
        ciudad,
        usuarioId: usuario.id
      });

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        cliente: nuevoCliente
      });

    } catch (error) {
      console.error('Error al crear cliente:', error);
      
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        if (error.errors && error.errors[0].path === 'email') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un usuario registrado con ese correo electrónico'
          });
        }
        if (error.errors && error.errors[0].path === 'rut') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un cliente con ese RUT'
          });
        }
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear el cliente. Por favor, intente nuevamente.'
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
        email, 
        telefono, 
        contactoPrincipal, 
        direccion, 
        comuna, 
        ciudad 
      } = req.body;

      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Validar formato del RUT si ha cambiado
      if (rut !== cliente.rut) {
        const resultadoRut = validarRut(rut);
        if (!resultadoRut.valido) {
          return res.status(400).json({
            success: false,
            message: 'El formato del RUT es incorrecto. Debe ser: 12.345.678-9'
          });
        }

        const rutFormateado = formatearRut(rut);
        
        // Verificar si el RUT ya existe en otro cliente
        const rutExistente = await Cliente.findOne({ 
          where: { 
            rut: rutFormateado,
            id: { [Op.ne]: id }
          }
        });
        if (rutExistente) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe otro cliente con ese RUT'
          });
        }

        // Actualizar cliente con el RUT formateado
        await cliente.update({
          rut: rutFormateado,
          nombre_empresa: nombreEmpresa,
          email,
          telefono,
          contacto_principal: contactoPrincipal,
          direccion,
          comuna,
          ciudad
        });
      } else {
        // Actualizar cliente sin cambiar el RUT
        await cliente.update({
          nombre_empresa: nombreEmpresa,
          email,
          telefono,
          contacto_principal: contactoPrincipal,
          direccion,
          comuna,
          ciudad
        });
      }

      // Actualizar usuario asociado si existe
      if (cliente.usuarioId) {
        await Usuario.update(
          {
            nombre: contactoPrincipal,
            email: email
          },
          { where: { id: cliente.usuarioId } }
        );
      }

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        cliente: cliente
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

      // Verificar si el cliente tiene solicitudes asociadas
      const solicitudes = await SolicitudRetiro.findOne({
        where: { cliente_id: id }
      });

      if (solicitudes) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el cliente porque tiene solicitudes asociadas'
        });
      }

      // Eliminar usuario asociado si existe
      if (cliente.usuarioId) {
        await Usuario.destroy({ where: { id: cliente.usuarioId } });
      }

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

  // Mostrar dashboard de clientes (render)
  mostrarDashboard: async (req, res) => {
    try {
      // Esta función renderiza la vista, las otras son para API
      res.render('admin/clientes', {
        layout: false,
        titulo: 'Gestión de Clientes',
        usuario: req.session.usuario
      });
    } catch (error) {
      console.error('Error al mostrar dashboard:', error);
      res.status(500).render('error', {
        titulo: 'Error',
        mensaje: 'Error al cargar la página'
      });
    }
  }
};

module.exports = clienteController;