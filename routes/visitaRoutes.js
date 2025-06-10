const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const moment = require('moment');
const auth = require('../middlewares/auth');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'emma2004',
    database: process.env.DB_NAME || 'felmart_web',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para obtener una conexión
async function getConnection() {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        console.error('Error al obtener conexión:', error);
        throw error;
    }
}

// Ruta para mostrar el calendario/listado de visitas del cliente
// Eliminar la ruta /calendario (no mostrar visitas por usuario_id)

// Ruta para mostrar el formulario de agendar visita
router.get('/agendar', auth.isCliente, async (req, res) => {
    try {
        res.render('visitas/agendar', {
            titulo: 'Agendar Visita',
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error al mostrar formulario de agenda:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/dashboard/cliente');
    }
});

// Ruta para procesar el agendamiento de visita
router.post('/agendar', auth.isCliente, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const {
            fechaVisita,
            horaVisita,
            duracionEstimada,
            direccionVisita,
            observaciones
        } = req.body;

        // Validar campos requeridos
        if (!fechaVisita || !horaVisita || !duracionEstimada) {
            req.flash('error', 'Todos los campos marcados con * son obligatorios');
            return res.redirect('/visitas/agendar');
        }

        // Validar formato de hora
        const horaInicioValidada = moment(horaVisita, 'HH:mm').format('HH:mm:ss');
        const horaFinValidada = moment(horaVisita, 'HH:mm')
            .add(duracionEstimada, 'minutes')
            .format('HH:mm:ss');

        // Obtener el cliente actual
        const [cliente] = await connection.execute(
            'SELECT * FROM clientes WHERE usuarioId = ?',
            [req.session.usuario.id]
        );

        if (!cliente || cliente.length === 0) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/visitas/agendar');
        }

        // Crear la visita
        const [result] = await connection.execute(`
            INSERT INTO visitas (
                cliente_id,
                tipo_visita,
                fecha_visita,
                hora_visita,
                duracion_estimada,
                estado,
                direccion_visita,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            cliente[0].id,
            'recoleccion',
            fechaVisita,
            horaInicioValidada,
            duracionEstimada,
            'pendiente',
            direccionVisita || null,
            observaciones || null
        ]);

        // Notificar a los administradores
        const [admins] = await connection.execute(
            'SELECT id FROM usuarios WHERE rol = "administrador"'
        );

        for (const admin of admins) {
            await connection.execute(`
                INSERT INTO notificaciones (
                    usuario_id,
                    tipo,
                    titulo,
                    mensaje,
                    referencia_id
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                admin.id,
                'visita',
                'Nueva visita solicitada',
                `El cliente ${cliente[0].nombre_empresa} ha solicitado una visita para el ${moment(fechaVisita).format('DD/MM/YYYY')} a las ${horaInicioValidada}`,
                result.insertId
            ]);
        }

        req.flash('success', 'Visita agendada correctamente. Un administrador la revisará pronto.');
        res.redirect('/dashboard/cliente');

    } catch (error) {
        console.error('Error al agendar visita:', error);
        req.flash('error', 'Error al agendar la visita: ' + error.message);
        res.redirect('/visitas/agendar');
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para mostrar las visitas del cliente
router.get('/cliente/visitas', auth.isCliente, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        // Obtener el cliente actual
        const [cliente] = await connection.execute(
            'SELECT * FROM clientes WHERE usuario_id = ?',
            [req.user.id]
        );

        if (!cliente || cliente.length === 0) {
            req.flash('error', 'Cliente no encontrado');
            return res.render('clientes/visitas', {
                titulo: 'Mis Visitas',
                visitas: [],
                error: 'Cliente no encontrado',
                usuario: req.user
            });
        }

        // Obtener las visitas del cliente
        const [visitas] = await connection.execute(`
            SELECT 
                vr.*,
                sr.numero_solicitud,
                sr.tipo_residuo,
                sr.cantidad,
                sr.unidad,
                sr.estado as estado_solicitud,
                sr.fecha_programada,
                sr.hora_programada,
                sr.tecnico_asignado,
                DATE_FORMAT(vr.fecha_programada, '%Y-%m-%d') as fecha_visita,
                TIME_FORMAT(vr.hora_inicio, '%H:%i') as hora_visita,
                CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) as empleado_nombre
            FROM visitas_retiro vr
            INNER JOIN solicitudes_retiro sr ON vr.solicitud_retiro_id = sr.id
            LEFT JOIN usuarios u ON vr.operador_id = u.id
            WHERE sr.clienteId = ?
            ORDER BY vr.fecha_programada DESC, vr.hora_inicio DESC
        `, [cliente[0].id]);

        res.render('clientes/visitas', {
            titulo: 'Mis Visitas',
            visitas,
            error: req.flash('error'),
            success: req.flash('success'),
            usuario: req.user
        });

    } catch (error) {
        console.error('Error al cargar visitas del cliente:', error);
        res.render('clientes/visitas', {
            titulo: 'Mis Visitas',
            visitas: [],
            error: 'Error al cargar las visitas: ' + error.message,
            usuario: req.user
        });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para ver detalles de una visita
router.get('/detalles/:id', auth.isCliente, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const { id } = req.params;

        // Verificar que la visita pertenece al cliente
        const [cliente] = await connection.execute(
            'SELECT * FROM clientes WHERE usuarioId = ?',
            [req.session.usuario.id]
        );

        if (!cliente || cliente.length === 0) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/dashboard/cliente');
        }

        const [visita] = await connection.execute(`
            SELECT v.*, 
                   DATE_FORMAT(v.fecha_visita, '%Y-%m-%d') as fecha_visita,
                   TIME_FORMAT(v.hora_visita, '%H:%i') as hora_visita
            FROM visitas v
            WHERE v.id = ? AND v.cliente_id = ?
        `, [id, cliente[0].id]);

        if (!visita || visita.length === 0) {
            req.flash('error', 'Visita no encontrada');
            return res.redirect('/visitas/cliente/visitas');
        }

        res.render('clientes/visita-detalles', {
            titulo: 'Detalle de Visita',
            visita: visita[0],
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error('Error al cargar detalles de la visita:', error);
        req.flash('error', 'Error al cargar los detalles de la visita');
        res.redirect('/visitas/cliente/visitas');
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para cancelar una visita
router.post('/cancelar/:id', auth.isCliente, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const { id } = req.params;
        const { motivo } = req.body;

        // Verificar que la visita pertenece al cliente
        const [cliente] = await connection.execute(
            'SELECT * FROM clientes WHERE usuarioId = ?',
            [req.session.usuario.id]
        );

        if (!cliente || cliente.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const [visita] = await connection.execute(
            'SELECT * FROM visitas WHERE id = ? AND cliente_id = ?',
            [id, cliente[0].id]
        );

        if (!visita || visita.length === 0) {
            return res.status(404).json({ error: 'Visita no encontrada' });
        }

        // Verificar que la visita está en un estado que permite cancelación
        if (!['pendiente', 'programada'].includes(visita[0].estado)) {
            return res.status(400).json({ error: 'No se puede cancelar esta visita' });
        }

        // Actualizar estado de la visita
        await connection.execute(
            'UPDATE visitas SET estado = ?, observaciones = ? WHERE id = ?',
            ['cancelada', motivo, id]
        );

        // Notificar a los administradores
        const [admins] = await connection.execute(
            'SELECT id FROM usuarios WHERE rol = "administrador"'
        );

        for (const admin of admins) {
            await connection.execute(`
                INSERT INTO notificaciones (
                    usuario_id,
                    tipo,
                    titulo,
                    mensaje,
                    referencia_id
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                admin.id,
                'visita',
                'Visita cancelada',
                `El cliente ${cliente[0].nombre_empresa} ha cancelado la visita #${id}. Motivo: ${motivo}`,
                id
            ]);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error al cancelar visita:', error);
        res.status(500).json({ error: 'Error al cancelar la visita' });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para mostrar el listado de visitas (admin)
router.get('/admin/visitas', auth.hasRole(['administrador', 'operador']), async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        // Obtener todas las visitas
        const [visitas] = await connection.execute(`
            SELECT 
                vr.id,
                vr.solicitud_retiro_id,
                vr.operador_id,
                vr.fecha_programada,
                vr.hora_inicio,
                vr.hora_fin,
                vr.estado,
                vr.observaciones,
                vr.created_at,
                vr.updated_at,
                sr.numero_solicitud,
                sr.tipo_residuo,
                sr.cantidad,
                sr.unidad,
                sr.estado as estado_solicitud,
                sr.fecha_programada as fecha_solicitud,
                sr.hora_programada,
                sr.tecnico_asignado,
                DATE_FORMAT(vr.fecha_programada, '%Y-%m-%d') as fecha_visita_formatted,
                TIME_FORMAT(vr.hora_inicio, '%H:%i') as hora_visita_formatted,
                c.nombre_empresa as cliente_nombre,
                c.rut as cliente_rut,
                c.email as cliente_email,
                CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) as empleado_nombre
            FROM visitas_retiro vr
            INNER JOIN solicitudes_retiro sr ON vr.solicitud_retiro_id = sr.id
            LEFT JOIN clientes c ON sr.clienteId = c.id
            LEFT JOIN usuarios u ON vr.operador_id = u.id
            ORDER BY vr.fecha_programada DESC, vr.hora_inicio DESC
        `);

        res.render('admin/visitas', {
            titulo: 'Gestión de Visitas',
            visitas,
            error: req.flash('error'),
            success: req.flash('success'),
            usuario: req.user
        });

    } catch (error) {
        console.error('Error al cargar visitas:', error);
        res.render('admin/visitas', {
            titulo: 'Gestión de Visitas',
            visitas: [],
            error: 'Error al cargar las visitas: ' + error.message,
            usuario: req.user
        });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; 