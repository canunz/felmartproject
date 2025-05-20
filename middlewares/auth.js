// middlewares/auth.js
const rutasPublicas = [
  '/notificaciones/no-leidas',
  '/notificaciones/marcar-leida',
  '/notificaciones/marcar-todas-leidas'
];

const auth = {
  // Verificar si el usuario está autenticado
  isAuthenticated: (req, res, next) => {
    // Permitir acceso a rutas públicas de notificaciones
    if (rutasPublicas.some(ruta => req.path.startsWith(ruta))) {
      return next();
    }
    if (req.session && req.session.usuario) {
      return next();
    }
    // Guardar la URL original para redireccionar después del login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    return res.redirect('/login');
  },
  
  // Verificar si el usuario tiene rol específico
  hasRole: (roles) => {
    return (req, res, next) => {
      if (!req.session || !req.session.usuario) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Debes iniciar sesión para acceder a esta página');
        return res.redirect('/login');
      }
      
      if (roles.includes(req.session.usuario.rol)) {
        return next();
      }
      
      req.flash('error', 'No tienes permisos para acceder a esta página');
      return res.redirect('/dashboard');
    };
  },
  
  // Nuevo middleware para la API - devuelve JSON en lugar de redireccionar
  isAuthenticatedApi: (req, res, next) => {
    if (req.session && req.session.usuario) {
      return next();
    }
    return res.status(401).json({ error: 'No autorizado. Inicie sesión para continuar.' });
  },
  
  // Verificar si es un Administrador
  isAdmin: (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Debes iniciar sesión para acceder a esta página');
      return res.redirect('/login');
    }
    
    if (req.session.usuario.rol === 'administrador') {
      return next();
    }
    
    req.flash('error', 'Esta sección requiere permisos de administrador');
    return res.redirect('/dashboard');
  },
  
  // Verificar si es un Operador o Administrador
  isOperadorOrAdmin: (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      req.session.returnTo = req.originalUrl;
      req.flash('error', 'Debes iniciar sesión para acceder a esta página');
      return res.redirect('/login');
    }
    
    if (req.session.usuario.rol === 'administrador' || req.session.usuario.rol === 'operador') {
      return next();
    }
    
    req.flash('error', 'Esta sección requiere permisos de operador o administrador');
    return res.redirect('/dashboard');
  }
};

module.exports = auth;