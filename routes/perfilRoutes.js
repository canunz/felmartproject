// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth'); // Descomentado para restaurar protección
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Ruta para mostrar el perfil del usuario (abierta)
router.get('/', isAuthenticated, async (req, res) => {
    try {
    const userId = req.session.usuario.id;
    
    // Obtener datos completos del usuario
    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [userId]
    );
    
    if (usuarios.length === 0) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/dashboard');
    }
    
    // No enviar la contraseña al frontend
    const usuario = usuarios[0];
    delete usuario.password;
    
    res.render('perfil/perfil', {
      titulo: 'Mi Perfil',
      perfilUsuario: usuario
    });
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    req.flash('error', 'Error al cargar la información del perfil');
    res.redirect('/dashboard');
  }
});

// Ruta para actualizar el perfil (abierta)
router.post('/actualizar', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.session.usuario;
    const { nombre, email, telefono, direccion, empresa } = req.body;
    
    // Verificar si el email ya está en uso por otro usuario
    if (email !== req.session.usuario.email) {
      const [existeEmail] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existeEmail.length > 0) {
        req.flash('error', 'El email ya está en uso por otro usuario');
        return res.redirect('/perfil');
      }
    }
    
    // Actualizar datos
    await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, direccion = ?, empresa = ? WHERE id = ?',
      [nombre, email, telefono, direccion, empresa, id]
    );
    
    // Actualizar datos en la sesión
    req.session.usuario.nombre = nombre;
    req.session.usuario.email = email;
    
    req.flash('success', 'Perfil actualizado exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    req.flash('error', 'Error al actualizar el perfil');
    res.redirect('/perfil');
  }
});

// Ruta para cambiar la contraseña (abierta)
router.post('/cambiar-password', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.session.usuario;
    const { password_actual, password_nuevo, password_confirmar } = req.body;
    
    // Validar que la nueva contraseña y la confirmación coincidan
    if (password_nuevo !== password_confirmar) {
      req.flash('error', 'Las contraseñas nuevas no coinciden');
      return res.redirect('/perfil');
    }
    
    // Obtener contraseña actual
    const [usuarios] = await pool.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [id]
    );
    
    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(password_actual, usuarios[0].password);
    if (!passwordMatch) {
      req.flash('error', 'La contraseña actual es incorrecta');
      return res.redirect('/perfil');
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password_nuevo, salt);
    
    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    req.flash('success', 'Contraseña actualizada exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    req.flash('error', 'Error al cambiar la contraseña');
    res.redirect('/perfil');
  }
}); // Cierre del try-catch y del router.post

// Ruta para mostrar el formulario de cambio de contraseña
router.get('/cambiar-password', isAuthenticated, (req, res) => {
  res.render('perfil/cambiar-password', {
    titulo: 'Cambiar Contraseña',
    usuario: req.session.usuario,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

module.exports = router;