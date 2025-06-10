const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middlewares/auth');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const solicitudController = require('../controllers/solicitudController');
const auth = require('../middlewares/auth');
const visitasController = require('../controllers/visitasController');

// Middleware para verificar si es administrador
router.use(isAdmin);

// Panel de administración principal
router.get('/', async (req, res) => {
    try {
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al cargar el panel de administración:', error);
        req.flash('error', 'Error al cargar el panel de administración');
        res.redirect('/dashboard');
    }
});

// Listar clientes
router.get('/clientes', async (req, res) => {
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
        res.redirect('/admin');
    }
});

// Ver detalles de cliente
router.get('/clientes/detalles/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Detalles del Cliente',
            cliente,
            editar: false,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al mostrar detalles del cliente:', error);
        req.flash('error', 'Error al cargar los detalles del cliente');
        res.redirect('/admin/clientes');
    }
});

// Mostrar formulario de edición
router.get('/clientes/editar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Editar Cliente',
            cliente,
            editar: true,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
        req.flash('error', 'Error al cargar el formulario de edición');
        res.redirect('/admin/clientes');
    }
});

// Actualizar cliente
router.post('/clientes/editar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
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
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        req.flash('error', 'Error al actualizar el cliente');
        res.redirect(`/admin/clientes/editar/${req.params.id}`);
    }
});

// Eliminar cliente
router.get('/clientes/eliminar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        await Usuario.destroy({ where: { id: cliente.usuarioId } });
        await cliente.destroy();

        req.flash('success', 'Cliente eliminado exitosamente');
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        req.flash('error', 'Error al eliminar el cliente');
        res.redirect('/admin/clientes');
    }
});

// Ruta para ver la lista de solicitudes (solo administrador)
router.get('/solicitudes', auth.hasRole(['administrador']), solicitudController.listar);

// === RUTA PARA VISITAS ===
router.get('/visitas', auth.isAdmin, async (req, res) => {
    try {
        res.render('admin/visitas', {
            titulo: 'Gestión de Visitas',
            usuario: req.session.usuario,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar página de visitas:', error);
        req.flash('error', 'Error al cargar la página de visitas');
        res.redirect('/admin');
    }
});

module.exports = router;