// controllers/usuarioController.js
const crypto       = require('crypto');
const { transporter } = require('../config/email.config');
const { Usuario, Cliente, SolicitudRetiro, VisitaRetiro } = require('../models');
const { Op, Sequelize } = require('sequelize');
const moment       = require('moment');

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
      const usuario = await Usuario.findOne({ where: { email } });
      if (!usuario) {
        req.flash('error', 'No existe cuenta con ese correo');
        return res.redirect('/olvide-password');
      }
      const token = crypto.randomBytes(20).toString('hex');
      usuario.resetPasswordToken   = token;
      usuario.resetPasswordExpires = Date.now() + 2*60*60*1000; // 2h
      await usuario.save();

      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
      await transporter.sendMail({
        to: usuario.email,
        from: process.env.EMAIL_USER,
        subject: 'Recuperación de Contraseña - Felmart',
        html: `
          <h2>Recuperación de Contraseña</h2>
          <p>Hola ${usuario.nombre}, haz clic en el siguiente enlace:</p>
          <a href="${resetUrl}">Restablecer Contraseña</a>
          <p>Expira en 2 horas.</p>
        `
      });
      req.flash('success', 'Correo enviado con instrucciones');
      res.redirect('/login');
    } catch (error) {
      console.error('Error al enviar correo de recuperación:', error);
      req.flash('error', 'Error al procesar solicitud');
      res.redirect('/olvide-password');
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
        return res.redirect('/olvide-password');
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
      res.redirect('/olvide-password');
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmarPassword } = req.body;
      if (password !== confirmarPassword) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect(`/reset-password/${token}`);
      }
      const usuario = await Usuario.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() }
        }
      });
      if (!usuario) {
        req.flash('error', 'Token inválido o expirado');
        return res.redirect('/olvide-password');
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
      res.redirect(`/reset-password/${req.params.token}`);
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
        return res.redirect('/cambiar-password');
      }
      if (nueva !== confirmar) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect('/cambiar-password');
      }
      usuario.password = nueva;
      await usuario.save();
      req.flash('success', 'Contraseña cambiada correctamente');
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      req.flash('error', 'Error al procesar solicitud');
      res.redirect('/cambiar-password');
    }
  },

  // 4) Dashboard & administración de usuarios ---------------------

  dashboard: async (req, res) => {
    // tu lógica existente
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