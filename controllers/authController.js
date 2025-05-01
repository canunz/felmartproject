const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');

// Configuración
const JWT_SECRET = process.env.JWT_SECRET || 'felmart-secret-key';
const JWT_EXPIRES_IN = '1d'; // Expiración del token

/**
 * Renderiza la página de login
 */
exports.mostrarLogin = (req, res) => {
    res.render('auth/login', {
        layout: 'layouts/login',
        title: 'Iniciar Sesión',
        error: req.flash('error')
    });
};

/**
 * Renderiza la página de registro
 */
exports.mostrarRegistro = (req, res) => {
    res.render('auth/registro', {
        layout: 'layouts/login',
        title: 'Crear Cuenta',
        error: req.flash('error')
    });
};

/**
 * Inicia sesión de usuario
 */
exports.login = async (req, res) => {
    try {
        // Validar inputs
        const errores = validationResult(req);
        if (!errores.isEmpty()) {
            req.flash('error', errores.array()[0].msg);
            return res.redirect('/login');
        }

        const { email, password } = req.body;

        // Buscar usuario por email
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            req.flash('error', 'Credenciales inválidas');
            return res.redirect('/login');
        }

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) {
            req.flash('error', 'Credenciales inválidas');
            return res.redirect('/login');
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            req.flash('error', 'El usuario ha sido desactivado. Contacte al administrador.');
            return res.redirect('/login');
        }

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: usuario.id, 
                nombre: usuario.nombre, 
                email: usuario.email, 
                rol: usuario.rol 
            }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Guardar token en cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 día
        });

        // Actualizar último inicio de sesión
        await usuario.update({ ultimoLogin: new Date() });

        // Redirigir al dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error en login:', error);
        req.flash('error', 'Error al iniciar sesión');
        res.redirect('/login');
    }
};

/**
 * Registra un nuevo usuario cliente
 */
exports.registro = async (req, res) => {
    try {
        // Validar inputs
        const errores = validationResult(req);
        if (!errores.isEmpty()) {
            req.flash('error', errores.array()[0].msg);
            return res.redirect('/registro');
        }

        const { nombre, apellido, email, telefono, empresa, password } = req.body;

        // Verificar si el email ya está registrado
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            req.flash('error', 'El email ya está registrado');
            return res.redirect('/registro');
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario en transacción
        const resultado = await sequelize.transaction(async (t) => {
            // Crear usuario
            const nuevoUsuario = await Usuario.create({
                nombre: `${nombre} ${apellido}`,
                email,
                password: hashedPassword,
                rol: 'cliente', // Por defecto, los usuarios que se registran son clientes
                activo: true,
                ultimoLogin: new Date()
            }, { transaction: t });

            // Crear cliente asociado al usuario
            await Cliente.create({
                nombre: `${nombre} ${apellido}`,
                empresa,
                email,
                telefono,
                usuarioId: nuevoUsuario.id
            }, { transaction: t });

            return nuevoUsuario;
        });

        // Generar token JWT
        const token = jwt.sign(
            { 
                id: resultado.id, 
                nombre: resultado.nombre, 
                email: resultado.email, 
                rol: resultado.rol 
            }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Guardar token en cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 día
        });

        // Redirigir al dashboard
        res.redirect('/dashboard');

    } catch (error) {
        console.error('Error en registro:', error);
        req.flash('error', 'Error al registrar usuario');
        res.redirect('/registro');
    }
};

/**
 * Cierra la sesión del usuario
 */
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
};

/**
 * Renderiza la página de recuperación de contraseña
 */
exports.mostrarRecuperarPassword = (req, res) => {
    res.render('auth/recuperar-password', {
        layout: 'layouts/login',
        title: 'Recuperar Contraseña',
        error: req.flash('error'),
        success: req.flash('success')
    });
};

/**
 * Envía un email para recuperar la contraseña
 */
exports.recuperarPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Buscar usuario por email
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            req.flash('error', 'No existe una cuenta con ese email');
            return res.redirect('/recuperar-password');
        }

        // Generar token temporal (expira en 1 hora)
        const resetToken = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '1h' });

        // Guardar token en base de datos
        await usuario.update({ resetToken });

        // Enviar email con link de recuperación
        // Nota: Aquí iría el código para enviar el email, pero por simplicidad solo simulamos
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        console.log('URL de recuperación:', resetUrl);

        req.flash('success', 'Se ha enviado un email con instrucciones para recuperar tu contraseña');
        res.redirect('/recuperar-password');

    } catch (error) {
        console.error('Error al recuperar contraseña:', error);
        req.flash('error', 'Error al procesar la solicitud');
        res.redirect('/recuperar-password');
    }
};

/**
 * Renderiza la página para resetear la contraseña
 */
exports.mostrarResetPassword = async (req, res) => {
    try {
        const { token } = req.params;

        // Verificar si el token es válido
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuario por ID y token
        const usuario = await Usuario.findOne({ 
            where: { 
                id: decoded.id, 
                resetToken: token 
            } 
        });

        if (!usuario) {
            req.flash('error', 'Token inválido o expirado');
            return res.redirect('/login');
        }

        res.render('auth/reset-password', {
            layout: 'layouts/login',
            title: 'Cambiar Contraseña',
            token,
            error: req.flash('error')
        });

    } catch (error) {
        console.error('Error al mostrar reset password:', error);
        req.flash('error', 'Token inválido o expirado');
        res.redirect('/login');
    }
};

/**
 * Procesa el reseteo de contraseña
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmarPassword } = req.body;

        // Validar que las contraseñas coincidan
        if (password !== confirmarPassword) {
            req.flash('error', 'Las contraseñas no coinciden');
            return res.redirect(`/reset-password/${token}`);
        }

        // Verificar si el token es válido
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuario por ID y token
        const usuario = await Usuario.findOne({ 
            where: { 
                id: decoded.id, 
                resetToken: token 
            } 
        });

        if (!usuario) {
            req.flash('error', 'Token inválido o expirado');
            return res.redirect('/login');
        }

        // Hash de la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Actualizar contraseña y limpiar token
        await usuario.update({
            password: hashedPassword,
            resetToken: null
        });

        req.flash('success', 'Contraseña actualizada correctamente');
        res.redirect('/login');

    } catch (error) {
        console.error('Error al resetear contraseña:', error);
        req.flash('error', 'Error al resetear contraseña');
        res.redirect('/login');
    }
};