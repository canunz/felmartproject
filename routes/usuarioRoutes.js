// routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
// const auth = require('../middlewares/auth'); // Comentado para quitar protección

// Rutas públicas
router.get('/registro', usuarioController.mostrarRegistro);
router.post('/registro', usuarioController.registrar);
router.get('/login', usuarioController.mostrarLogin);
router.post('/login', usuarioController.login);
router.get('/logout', usuarioController.logout);

// Recuperación de contraseña
router.get('/olvide-password', usuarioController.mostrarOlvidePassword);
router.post('/olvide-password', usuarioController.enviarResetPassword);
router.get('/reset-password/:token', usuarioController.mostrarResetPassword);
router.post('/reset-password/:token', usuarioController.resetPassword);

// Rutas que antes requerían autenticación o roles específicos (ahora abiertas)
router.get('/cambiar-password', /* auth.isAuthenticated, */ usuarioController.mostrarCambiarPassword);
router.post('/cambiar-password', /* auth.isAuthenticated, */ usuarioController.cambiarPassword);

router.get('/', /* auth.hasRole(['administrador']), */ usuarioController.listarUsuarios);
router.get('/crear', /* auth.hasRole(['administrador']), */ usuarioController.mostrarCrearUsuario);
router.post('/crear', /* auth.hasRole(['administrador']), */ usuarioController.crearUsuario);
router.get('/editar/:id', /* auth.hasRole(['administrador']), */ usuarioController.mostrarEditarUsuario);
router.post('/editar/:id', /* auth.hasRole(['administrador']), */ usuarioController.editarUsuario);
router.get('/eliminar/:id', /* auth.hasRole(['administrador']), */ usuarioController.eliminarUsuario);

module.exports = router;