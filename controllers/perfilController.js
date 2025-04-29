// controllers/perfilController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Mostrar perfil del usuario
exports.getPerfil = async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    
    // Obtener datos del usuario
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email, telefono, direccion, empresa FROM usuarios WHERE id = ?',
      [userId]
    );
    
    if (usuarios.length === 0) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/dashboard');
    }
    
    res.render('perfil/index', {
      titulo: 'Mi Perfil',
      perfilUsuario: usuarios[0]
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    req.flash('error', 'Error al cargar la información del perfil');
    res.redirect('/dashboard');
  }
};

// Actualizar perfil
exports.actualizarPerfil = async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    const { nombre, email, telefono, direccion, empresa } = req.body;
    
    // Verificar si el email ya está en uso por otro usuario
    if (email !== req.session.usuario.email) {
      const [existeEmail] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (existeEmail.length > 0) {
        req.flash('error', 'El email ya está en uso por otro usuario');
        return res.redirect('/perfil');
      }
    }
    
    // Actualizar datos
    await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, direccion = ?, empresa = ? WHERE id = ?',
      [nombre, email, telefono, direccion, empresa, userId]
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
};

// Cambiar contraseña
exports.cambiarPassword = async (req, res) => {
  try {
    const userId = req.session.usuario.id;
    const { password_actual, password_nuevo, password_confirmar } = req.body;
    
    // Validar que la nueva contraseña y la confirmación coincidan
    if (password_nuevo !== password_confirmar) {
      req.flash('error', 'Las contraseñas nuevas no coinciden');
      return res.redirect('/perfil');
    }
    
    // Obtener contraseña actual
    const [usuarios] = await pool.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [userId]
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
      [hashedPassword, userId]
    );
    
    req.flash('success', 'Contraseña actualizada exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    req.flash('error', 'Error al cambiar la contraseña');
    res.redirect('/perfil');
  }
};