const validarRol = (...roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.usuario) {
            req.flash('error', 'Debe iniciar sesión para acceder a esta página');
            return res.redirect('/login');
        }

        if (!roles.includes(req.session.usuario.rol)) {
            req.flash('error', 'No tiene permisos para acceder a esta página');
            return res.redirect('/dashboard');
        }

        next();
    };
};

module.exports = {
    validarRol
}; 