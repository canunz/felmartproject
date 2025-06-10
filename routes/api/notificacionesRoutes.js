const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const auth = require('../../middlewares/auth');
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

// Obtener notificaciones del usuario
router.get('/', auth.isAuthenticated, async (req, res) => {
    let connection;
    try {
        if (!req.session.usuario || !req.session.usuario.id) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        connection = await getConnection();
        
        const [notificaciones] = await connection.execute(`
            SELECT * FROM notificaciones 
            WHERE usuarioId = ? 
            ORDER BY fechaCreacion DESC
        `, [req.session.usuario.id]);

        res.json(notificaciones);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    } finally {
        if (connection) connection.release();
    }
});

// Marcar notificación como leída
router.put('/:id/leer', auth.isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const { id } = req.params;

        await connection.execute(`
            UPDATE notificaciones 
            SET leida = true 
            WHERE id = ? AND usuario_id = ?
        `, [id, req.user.id]);

        res.json({ 
            success: true, 
            message: 'Notificación marcada como leída' 
        });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ error: 'Error al marcar notificación como leída' });
    } finally {
        if (connection) connection.release();
    }
});

// Marcar todas las notificaciones como leídas
router.put('/leer-todas', auth.isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();

        await connection.execute(`
            UPDATE notificaciones 
            SET leida = true 
            WHERE usuario_id = ? AND leida = false
        `, [req.user.id]);

        res.json({ 
            success: true, 
            message: 'Todas las notificaciones marcadas como leídas' 
        });
    } catch (error) {
        console.error('Error al marcar notificaciones como leídas:', error);
        res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
    } finally {
        if (connection) connection.release();
    }
});

// Crear nueva notificación
router.post('/', auth.isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const {
            usuario_id,
            tipo,
            mensaje,
            enlace,
            leida = false
        } = req.body;

        const [result] = await connection.execute(`
            INSERT INTO notificaciones (
                usuario_id,
                tipo,
                mensaje,
                enlace,
                leida
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            usuario_id,
            tipo,
            mensaje,
            enlace,
            leida
        ]);

        res.json({ 
            success: true, 
            message: 'Notificación creada correctamente',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Error al crear notificación:', error);
        res.status(500).json({ error: 'Error al crear notificación' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; 