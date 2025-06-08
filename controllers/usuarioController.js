// controllers/usuarioController.js
const crypto       = require('crypto');
const { transporter, sendMailWithRetry } = require('../config/email.config');
const { Usuario, Cliente, SolicitudRetiro, VisitaRetiro } = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment       = require('moment');
const emailTemplates = require('../templates/emailTemplates');
const nodemailer = require('nodemailer');

const usuarioController = {
  // 1) Registro / Login / Logout ----------------------------------

  mostrarRegistro: (req, res) => {
    res.render('usuarios/registro', {
      titulo: 'Registro de Usuario',
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  registrar: async (req, res) => {
    try {
      const { nombre, email, password, confirmarPassword } = req.body;
      if (!nombre || !email || !password) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/registro');
      }
      if (password !== confirmarPassword) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect('/registro');
      }
      if (await Usuario.findOne({ where: { email } })) {
        req.flash('error', 'El email ya está registrado');
        return res.redirect('/registro');
      }
      await Usuario.create({ nombre, email, password, rol: 'cliente' });
      req.flash('success', 'Usuario registrado. Ya puedes iniciar sesión.');
      res.redirect('/login');
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      req.flash('error', 'Error al registrar usuario');
      res.redirect('/registro');
    }
  },

  mostrarLogin: (req, res) => {
    res.render('usuarios/login', {
      titulo: 'Iniciar Sesión',
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        req.flash('error', 'Todos los campos son obligatorios');
        return res.redirect('/login');
      }
      const usuario = await Usuario.findOne({ where: { email } });
      const valido  = usuario && await usuario.verificarPassword(password);
      if (!valido || !usuario.activo) {
        req.flash('error', 'Credenciales inválidas o usuario desactivado');
        return res.redirect('/login');
      }
      req.session.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      };
      if (usuario.rol === 'cliente') {
        const cliente = await Cliente.findOne({ where: { usuarioId: usuario.id } });
        if (cliente) req.session.clienteId = cliente.id;
      }
      
      // Redirigir a la URL original o al dashboard
      const redirectUrl = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      req.flash('error', 'Error al iniciar sesión');
      res.redirect('/login');
    }
  },

  logout: (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
  },

  // 2) Recuperación de contraseña ----------------------------------

  mostrarOlvidePassword: (req, res) => {
    res.render('usuarios/olvide-password', {
      titulo: 'Recuperar Contraseña',
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  enviarResetPassword: async (req, res) => {
    try {
      const { email } = req.body;
      
      // Validar que se proporcionó un email
      if (!email) {
        req.flash('error', 'Por favor ingrese su correo electrónico');
        return res.redirect('/usuarios/olvide-password');
      }

      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        req.flash('error', 'No existe cuenta con ese correo');
        return res.redirect('/usuarios/olvide-password');
      }

      // Generar token y establecer expiración
      const token = crypto.randomBytes(20).toString('hex');
      const expiracion = Date.now() + 3600000; // 1 hora

      // Guardar token y expiración en la base de datos
      usuario.resetPasswordToken = token;
      usuario.resetPasswordExpires = new Date(expiracion);
      await usuario.save();

      // Enviar correo electrónico
      const resetUrl = `${req.protocol}://${req.get('host')}/usuarios/reset-password/${token}`;
      
      // Usar la plantilla de correo
      const { subject, html } = emailTemplates.resetPassword(usuario.nombre, resetUrl);
      
      // Configuración del correo
      const mailOptions = {
        to: usuario.email,
        from: {
          name: 'Felmart - Gestión de Residuos',
          address: process.env.EMAIL_USER
        },
        subject,
        html
      };

      // Enviar correo con reintentos
      await sendMailWithRetry(mailOptions);
      
      // Mensaje de éxito y redirección
      req.flash('success', 'Se ha enviado un enlace de recuperación a tu correo electrónico. Por favor revisa tu bandeja de entrada.');
      res.redirect('/usuarios/olvide-password');
      
    } catch (error) {
      console.error('Error al enviar correo de recuperación:', error);
      req.flash('error', 'Hubo un error al enviar el correo de recuperación. Por favor intenta nuevamente.');
      res.redirect('/usuarios/olvide-password');
    }
  },

  mostrarResetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      const usuario = await Usuario.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });
      if (!usuario) {
        req.flash('error', 'Token inválido o expirado');
        return res.redirect('/usuarios/olvide-password');
      }
      res.render('usuarios/reset-password', {
        titulo: 'Restablecer Contraseña',
        token,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al mostrar reset-password:', error);
      req.flash('error', 'Error al procesar solicitud');
      res.redirect('/usuarios/olvide-password');
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmarPassword } = req.body;
      if (password !== confirmarPassword) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect(`/usuarios/reset-password/${token}`);
      }
      const usuario = await Usuario.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });
      if (!usuario) {
        req.flash('error', 'Token inválido o expirado');
        return res.redirect('/usuarios/olvide-password');
      }
      usuario.password             = password;
      usuario.resetPasswordToken   = null;
      usuario.resetPasswordExpires = null;
      await usuario.save();
      req.flash('success', 'Contraseña restablecida.');
      res.redirect('/login');
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      req.flash('error', 'Error al procesar solicitud');
      res.redirect(`/usuarios/reset-password/${req.params.token}`);
    }
  },

  // 3) Cambiar contraseña en sesión --------------------------------

  mostrarCambiarPassword: (req, res) => {
    res.render('usuarios/cambiar-password', {
      titulo: 'Cambiar Contraseña',
      usuario: req.session.usuario,
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  cambiarPassword: async (req, res) => {
    try {
      const { actual, nueva, confirmar } = req.body;
      const usuario = await Usuario.findByPk(req.session.usuario.id);
      if (!await usuario.verificarPassword(actual)) {
        req.flash('error', 'Contraseña actual incorrecta');
        return res.redirect('/usuarios/cambiar-password');
      }
      if (nueva !== confirmar) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect('/usuarios/cambiar-password');
      }
      usuario.password = nueva;
      await usuario.save();
      req.flash('success', 'Contraseña cambiada correctamente');
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      req.flash('error', 'Error al procesar solicitud');
      res.redirect('/usuarios/cambiar-password');
    }
  },

  // 4) Dashboard & administración de usuarios ---------------------

  dashboard: async (req, res) => {
    try {
      const { usuario } = req.session;
      if (usuario.rol === 'administrador') {
        return res.render('dashboard/admin', {
          usuario,
          titulo: 'Panel de Administración',
          totalClientes: 0,
          totalSolicitudes: 0,
          totalVisitas: 0,
          error: req.flash('error'),
          success: req.flash('success')
        });
      }
      if (usuario.rol === 'operador') {
        // Ejemplo: obtener algunos datos generales
        const totalUsuarios = await Usuario.count();
        const totalClientes = await Cliente.count();
        const totalSolicitudes = await SolicitudRetiro.count();
        const totalVisitas = await VisitaRetiro.count();
        return res.render('dashboard', {
          titulo: 'Panel de Administración',
          usuario,
          totalUsuarios,
          totalClientes,
          totalSolicitudes,
          totalVisitas,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } else {
        // Si es cliente, puedes redirigir a su propio dashboard o mostrar menos datos
        return res.render('dashboard', {
          titulo: 'Mi Panel',
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      }
    } catch (error) {
      console.error('Error en dashboard:', error);
      req.flash('error', 'Error al cargar el panel');
      res.redirect('/');
    }
  },

  listarUsuarios: async (req, res) => {
    const usuarios = await Usuario.findAll();
    res.render('usuarios/listar', {
      titulo: 'Listado de Usuarios',
      usuarios,
      usuario: req.session.usuario,
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  mostrarCrearUsuario: (req, res) => {
    res.render('usuarios/crear', {
      titulo: 'Crear Usuario',
      usuario: req.session.usuario,
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  crearUsuario: async (req, res) => {
    try {
      const { nombre, email, password, rol } = req.body;
      await Usuario.create({ nombre, email, password, rol });
      req.flash('success', 'Usuario creado correctamente');
      res.redirect('/usuarios');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error al crear usuario');
      res.redirect('/usuarios/crear');
    }
  },

  mostrarEditarUsuario: async (req, res) => {
    const usuarioEdit = await Usuario.findByPk(req.params.id);
    res.render('usuarios/editar', {
      titulo: 'Editar Usuario',
      usuario: req.session.usuario,
      usuarioEdit,
      error: req.flash('error'),
      success: req.flash('success')
    });
  },

  editarUsuario: async (req, res) => {
    try {
      const { nombre, email, rol, activo } = req.body;
      await Usuario.update(
        { nombre, email, rol, activo: activo === 'on' },
        { where: { id: req.params.id } }
      );
      req.flash('success', 'Usuario actualizado correctamente');
      res.redirect('/usuarios');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error al actualizar usuario');
      res.redirect(`/usuarios/editar/${req.params.id}`);
    }
  },

  // 5) Eliminar usuario --------------------------------------------
  eliminarUsuario: async (req, res) => {
    try {
      await Usuario.destroy({ where: { id: req.params.id } });
      req.flash('success', 'Usuario eliminado correctamente');
      res.redirect('/usuarios');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error al eliminar usuario');
      res.redirect('/usuarios');
    }
  }
};

module.exports = usuarioController;