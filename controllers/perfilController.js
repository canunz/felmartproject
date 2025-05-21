// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const perfilController = require('../controllers/perfilController');
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

// Rutas
router.get('/', isAuthenticated, perfilController.getPerfil);
router.post('/actualizar', isAuthenticated, perfilController.actualizarPerfil);
router.post('/cambiar-password', isAuthenticated, perfilController.cambiarPassword);
router.post('/actualizar-imagen', isAuthenticated, upload.single('imagenPerfil'), perfilController.actualizarImagen);

module.exports = router;