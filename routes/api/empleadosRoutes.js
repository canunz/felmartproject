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

// Obtener todos los empleados
router.get('/', auth.isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        const [empleados] = await connection.execute(`
            SELECT id, nombre, COALESCE(apellido, '') as apellido, email, rol, activo
            FROM usuarios
            WHERE rol IN ('operador', 'administrador')
            AND activo = 1
            ORDER BY nombre ASC
        `);

        res.json(empleados);
    } catch (error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({ error: 'Error al obtener empleados' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; 