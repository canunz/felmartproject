// middlewares/auth.js
const express = require('express');
const router = express.Router();

// Rutas públicas que no requieren autenticación
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password'
];

// Middleware para verificar si la ruta es pública
const isPublicRoute = (path) => {
  return publicRoutes.some(route => path.startsWith(route));
};

// Middleware de autenticación
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.usuario) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Middleware para verificar rol de administrador
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'administrador') {
    next();
  } else {
    res.status(403).render('error', {
      message: 'Acceso denegado. Se requieren privilegios de administrador.'
    });
  }
};

// Middleware para verificar rol de empleado
exports.isEmpleado = (req, res, next) => {
  if (req.session && req.session.usuario && 
      (req.session.usuario.rol === 'empleado' || req.session.usuario.rol === 'administrador')) {
    next();
  } else {
    res.status(403).render('error', {
      message: 'Acceso denegado. Se requieren privilegios de empleado.'
    });
  }
};

// Middleware para verificar rol de cliente
exports.isCliente = (req, res, next) => {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'cliente') {
    next();
  } else {
    res.status(403).render('error', {
      message: 'Acceso denegado. Se requieren privilegios de cliente.'
    });
  }
};

// Middleware para la API - devuelve JSON en lugar de redireccionar
exports.isAuthenticatedApi = (req, res, next) => {
  if (req.session && req.session.usuario) {
    req.user = req.session.usuario;
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }
};

// Middleware para verificar si el usuario tiene un rol específico
exports.hasRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    if (Array.isArray(roles)) {
      if (!roles.includes(req.session.usuario.rol)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Rol no autorizado.'
        });
      }
    } else if (req.session.usuario.rol !== roles) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Rol no autorizado.'
      });
    }

    next();
  };
};

module.exports = exports;