// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const pool = require('../config/database');

// Ruta principal del dashboard
router.get('/', isAuthenticated, async (req, res) => {
    try {
        let datos = {
            title: 'Dashboard - Felmart',
            usuario: req.session.usuario,
            countSolicitudes: 0,
            countPendientes: 0,
            countVisitas: 0,
            solicitudesRecientes: []
        };

        if (req.session.usuario.rol === 'administrador') {
            // Obtener estadísticas para administrador
            const totalClientes = await Cliente.count();
            datos.countClientes = totalClientes;
        } else {
            // Obtener estadísticas para cliente normal
            // Aquí puedes agregar la lógica específica para clientes
        }

        res.render('dashboard/index', {
            titulo: 'Dashboard - Felmart',
            ...datos
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        req.flash('error', 'Error al cargar el dashboard');
        res.render('dashboard/index', {
            titulo: 'Dashboard - Felmart',
            usuario: req.session.usuario,
            error: 'Error al cargar los datos'
        });
    }
});

// Rutas de gestión de clientes
router.get('/clientes', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'administrador') {
            req.flash('error', 'No tienes permisos para acceder a esta sección');
            return res.redirect('/dashboard');
        }

        res.render('dashboard/clientes', {
            titulo: 'Gestión de Clientes',
            title: 'Gestión de Clientes - Felmart',
            usuario: req.session.usuario
        });
    } catch (error) {
        console.error('Error al cargar vista de clientes:', error);
        req.flash('error', 'Error al cargar la lista de clientes');
        res.redirect('/dashboard');
    }
});

// Ruta para ver detalles de un cliente específico
router.get('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'administrador') {
            req.flash('error', 'No tienes permisos para acceder a esta sección');
            return res.redirect('/dashboard');
        }

        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/clientes');
        }

        res.render('dashboard/cliente-detalles', {
            title: 'Detalles del Cliente - Felmart',
            usuario: req.session.usuario,
            cliente: cliente
        });
    } catch (error) {
        console.error('Error al cargar detalles del cliente:', error);
        req.flash('error', 'Error al cargar los detalles del cliente');
        res.redirect('/dashboard/clientes');
    }
});

// Ruta específica para gestión de clientes
router.get('/clientes', isAdmin, async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            include: [{
                model: Usuario,
                attributes: ['email', 'activo']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.render('admin/clientes', {
            titulo: 'Gestión de Clientes',
            clientes,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            usuario: req.session.usuario
        });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        req.flash('error', 'Error al cargar la lista de clientes');
        res.redirect('/dashboard');
    }
});

// Rutas para CRUD de clientes
router.get('/clientes/detalles/:id', isAdmin, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Detalles del Cliente',
            cliente,
            editar: false,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            usuario: req.session.usuario
        });
    } catch (error) {
        console.error('Error al mostrar detalles del cliente:', error);
        req.flash('error', 'Error al cargar los detalles del cliente');
        res.redirect('/dashboard/clientes');
    }
});

router.get('/clientes/editar/:id', isAdmin, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Editar Cliente',
            cliente,
            editar: true,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            usuario: req.session.usuario
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
        req.flash('error', 'Error al cargar el formulario de edición');
        res.redirect('/dashboard/clientes');
    }
});

router.post('/clientes/editar/:id', isAdmin, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/clientes');
        }

        const {
            rut,
            nombreEmpresa,
            email,
            telefono,
            contactoPrincipal,
            direccion,
            comuna,
            ciudad,
            region,
            estado
        } = req.body;

        await cliente.update({
            rut,
            nombreEmpresa,
            email,
            telefono,
            contactoPrincipal,
            direccion,
            comuna,
            ciudad,
            region,
            estado: estado === '1'
        });

        if (email !== cliente.email) {
            await Usuario.update(
                { email },
                { where: { id: cliente.usuarioId } }
            );
        }

        req.flash('success', 'Cliente actualizado exitosamente');
        res.redirect('/dashboard/clientes');
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        req.flash('error', 'Error al actualizar el cliente');
        res.redirect(`/dashboard/clientes/editar/${req.params.id}`);
    }
});

router.get('/clientes/eliminar/:id', isAdmin, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/clientes');
        }

        await Usuario.destroy({ where: { id: cliente.usuarioId } });
        await cliente.destroy();

        req.flash('success', 'Cliente eliminado exitosamente');
        res.redirect('/dashboard/clientes');
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        req.flash('error', 'Error al eliminar el cliente');
        res.redirect('/dashboard/clientes');
    }
});

module.exports = router;