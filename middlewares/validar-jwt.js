const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
    // Verificar si el usuario está autenticado
    if (!req.session || !req.session.usuario) {
        req.flash('error', 'Debe iniciar sesión para acceder a esta página');
        return res.redirect('/login');
    }

    // Agregar el usuario a la request
    req.usuario = req.session.usuario;
    next();
};

module.exports = {
    validarJWT
}; 