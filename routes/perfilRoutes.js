// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/perfiles');
    // Crear directorio si no existe
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'perfil-' + req.session.usuario.id + '-' + uniqueSuffix + ext);
  }
});

// Filtrar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // Limitar a 2MB
  },
  fileFilter: fileFilter
});

// Mostrar perfil
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Verificar que la sesión y el ID existan
    if (!req.session.usuario || !req.session.usuario.id) {
      console.log('Error: No hay ID de usuario en la sesión', req.session);
      req.flash('error', 'Sesión no válida. Por favor, inicia sesión nuevamente.');
      return res.redirect('/dashboard');
    }
    
    // Debug del ID de usuario
    console.log('ID de usuario en sesión:', req.session.usuario.id);
    console.log('Tipo de ID:', typeof req.session.usuario.id);
    
    // Asegurarse que el ID sea un número
    const userId = parseInt(req.session.usuario.id, 10);
    
    // Obtener datos del usuario
    const [usuarios] = await pool.query(
      `SELECT * FROM usuarios WHERE id = ${userId}`
    );
    
    if (usuarios.length === 0) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/dashboard');
    }
    
    // No enviar la contraseña al frontend
    const usuario = usuarios[0];
    delete usuario.password;
    
    // Obtener información adicional del cliente si existe
    const [clientes] = await pool.query(
      `SELECT * FROM clientes WHERE usuario_id = ${userId} LIMIT 1`
    );
    
    // Combinar información de usuario y cliente
    const perfilUsuario = {
      ...usuario,
      telefono: clientes.length > 0 ? clientes[0].telefono : '',
      direccion: clientes.length > 0 ? clientes[0].direccion : '',
      nombre_empresa: clientes.length > 0 ? clientes[0].nombre_empresa : '',
      rut: clientes.length > 0 ? clientes[0].rut : '11111111-1',
      comuna: clientes.length > 0 ? clientes[0].comuna : '',
      ciudad: clientes.length > 0 ? clientes[0].ciudad : '',
      contacto_principal: clientes.length > 0 ? clientes[0].contacto_principal : '',
      imagen_perfil: clientes.length > 0 ? clientes[0].imagen_perfil : null
    };
    
    res.render('perfil/index', {
      titulo: 'Mi Perfil',
      perfilUsuario
    });
  } catch (error) {
    console.error('Error al cargar perfil:', error);
    req.flash('error', 'Error al cargar la información del perfil');
    res.redirect('/dashboard');
  }
});

// Actualizar perfil
router.post('/actualizar', isAuthenticated, async (req, res) => {
  try {
    // Verificar que la sesión y el ID existan
    if (!req.session.usuario || !req.session.usuario.id) {
      req.flash('error', 'Sesión no válida. Por favor, inicia sesión nuevamente.');
      return res.redirect('/dashboard');
    }
    
    const userId = parseInt(req.session.usuario.id, 10);
    const { nombre, email, telefono, direccion, nombre_empresa, rut, comuna, ciudad, contacto_principal } = req.body;
    
    // Valores por defecto para campos obligatorios
    const rutValue = rut || '11111111-1';
    const comunaValue = comuna || 'Sin especificar';
    const ciudadValue = ciudad || 'Sin especificar';
    const emailValue = email; // El email es obligatorio y viene del formulario
    
    // Verificar si el email ya está en uso por otro usuario
    const [existeEmail] = await pool.query(
      `SELECT id FROM usuarios WHERE email = '${email}' AND id != ${userId}`
    );
    
    if (existeEmail.length > 0) {
      req.flash('error', 'El email ya está en uso por otro usuario');
      return res.redirect('/perfil');
    }
    
    // Actualizar datos básicos en la tabla usuarios
    await pool.query(
      `UPDATE usuarios SET nombre = '${nombre}', email = '${email}' WHERE id = ${userId}`
    );
    
    // Verificar si el usuario tiene un registro en la tabla clientes
    const [clienteExiste] = await pool.query(
      `SELECT id FROM clientes WHERE usuario_id = ${userId}`
    );
    
    // Obtener fecha actual en formato MySQL (YYYY-MM-DD HH:MM:SS)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    if (clienteExiste.length > 0) {
      // Actualizar datos en la tabla clientes
      await pool.query(
        `UPDATE clientes SET 
        telefono = '${telefono || ''}', 
        direccion = '${direccion || ''}', 
        nombre_empresa = '${nombre_empresa || ''}',
        rut = '${rutValue}',
        comuna = '${comunaValue}',
        ciudad = '${ciudadValue}',
        email = '${emailValue}',
        contacto_principal = '${contacto_principal || ''}',
        updated_at = '${now}'
        WHERE usuario_id = ${userId}`
      );
    } else {
      // Crear un nuevo registro en la tabla clientes con todos los campos obligatorios
      await pool.query(
        `INSERT INTO clientes 
        (usuario_id, telefono, direccion, nombre_empresa, rut, comuna, ciudad, email, contacto_principal, created_at, updated_at) 
        VALUES (${userId}, '${telefono || ''}', '${direccion || ''}', '${nombre_empresa || ''}', '${rutValue}', '${comunaValue}', '${ciudadValue}', '${emailValue}', '${contacto_principal || ''}', '${now}', '${now}')`
      );
    }
    
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

// Actualizar imagen de perfil
router.post('/actualizar-imagen', isAuthenticated, upload.single('imagenPerfil'), async (req, res) => {
  try {
    if (!req.session.usuario || !req.session.usuario.id) {
      req.flash('error', 'Sesión no válida. Por favor, inicia sesión nuevamente.');
      return res.redirect('/dashboard');
    }
    
    if (!req.file) {
      req.flash('error', 'Por favor, selecciona una imagen');
      return res.redirect('/perfil');
    }
    
    const userId = parseInt(req.session.usuario.id, 10);
    const imagenPerfil = path.basename(req.file.path); // Solo guardamos el nombre del archivo
    
    // Verificar si el usuario tiene un registro en la tabla clientes
    const [clienteExiste] = await pool.query(
      `SELECT id, imagen_perfil FROM clientes WHERE usuario_id = ${userId}`
    );
    
    // Si hay una imagen anterior, eliminarla
    if (clienteExiste.length > 0 && clienteExiste[0].imagen_perfil) {
      const oldImagePath = path.join(__dirname, '../public/uploads/perfiles', clienteExiste[0].imagen_perfil);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Obtener fecha actual en formato MySQL (YYYY-MM-DD HH:MM:SS)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    if (clienteExiste.length > 0) {
      // Actualizar imagen en la tabla clientes
      await pool.query(
        `UPDATE clientes SET imagen_perfil = '${imagenPerfil}', updated_at = '${now}' WHERE usuario_id = ${userId}`
      );
    } else {
      // Crear un nuevo registro en la tabla clientes con la imagen
      // Incluir TODOS los campos obligatorios
      const userEmail = req.session.usuario.email;
      await pool.query(
        `INSERT INTO clientes 
        (usuario_id, telefono, direccion, nombre_empresa, rut, comuna, ciudad, email, contacto_principal, imagen_perfil, created_at, updated_at) 
        VALUES (${userId}, '', '', 'Sin especificar', '11111111-1', 'Sin especificar', 'Sin especificar', '${userEmail}', '', '${imagenPerfil}', '${now}', '${now}')`
      );
    }
    
    req.flash('success', 'Imagen de perfil actualizada exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al actualizar imagen de perfil:', error);
    req.flash('error', 'Error al actualizar la imagen de perfil');
    res.redirect('/perfil');
  }
});

// Cambiar contraseña
router.post('/cambiar-password', isAuthenticated, async (req, res) => {
  try {
    // Verificar que la sesión y el ID existan
    if (!req.session.usuario || !req.session.usuario.id) {
      req.flash('error', 'Sesión no válida. Por favor, inicia sesión nuevamente.');
      return res.redirect('/dashboard');
    }
    
    const userId = parseInt(req.session.usuario.id, 10);
    const { password_actual, password_nuevo, password_confirmar } = req.body;
    
    // Verificar que la nueva contraseña y la confirmación coincidan
    if (password_nuevo !== password_confirmar) {
      req.flash('error', 'Las contraseñas no coinciden');
      return res.redirect('/perfil');
    }
    
    // Obtener la contraseña actual del usuario
    const [usuarios] = await pool.query(
      `SELECT password FROM usuarios WHERE id = ${userId}`
    );
    
    if (usuarios.length === 0) {
      req.flash('error', 'Usuario no encontrado');
      return res.redirect('/perfil');
    }
    
    // Verificar que la contraseña actual sea correcta
    const passwordMatch = await bcrypt.compare(password_actual, usuarios[0].password);
    
    if (!passwordMatch) {
      req.flash('error', 'La contraseña actual es incorrecta');
      return res.redirect('/perfil');
    }
    
    // Hash de la nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password_nuevo, saltRounds);
    
    // Actualizar la contraseña
    await pool.query(
      `UPDATE usuarios SET password = '${hashedPassword}' WHERE id = ${userId}`
    );
    
    req.flash('success', 'Contraseña actualizada exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    req.flash('error', 'Error al cambiar la contraseña');
    res.redirect('/perfil');
  }
});

// Esta línea es crucial para que funcione el router
module.exports = router;