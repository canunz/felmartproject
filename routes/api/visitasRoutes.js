const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Importar middleware de autenticación
const authMiddleware = require('../../middlewares/auth');
const auth = authMiddleware.isAuthenticatedApi;

require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'emma2004',
    database: process.env.DB_NAME || 'felmart_web',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4'
};

// RUTAS ESPECÍFICAS PRIMERO (antes de /:id)

// GET - Verificar autenticación
router.get('/check-auth', function(req, res) {
    res.json({
        success: true,
        authenticated: !!(req.session && req.session.usuario),
        user: req.session?.usuario ? {
            id: req.session.usuario.id,
            email: req.session.usuario.email,
            rol: req.session.usuario.rol
        } : null,
        session: req.session ? 'exists' : 'missing'
    });
});

// GET - Ruta de prueba
router.get('/test', function(req, res) {
    res.json({
        success: true,
        message: 'API de visitas funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// POST - MIGRAR VISITAS DEL CLIENTE AL SISTEMA ADMIN (SIN AUTH PARA TESTING)
router.post('/migrar-mi-visita', async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        console.log('Buscando visita del cliente para migrar...');
        
        // Buscar tu visita específica (ajusta los criterios según tus datos)
        const [visitasCliente] = await connection.query(`
            SELECT v.*, c.nombre_empresa, c.email
            FROM visitas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE v.fecha_visita >= '2025-06-10'
            ORDER BY v.id DESC
            LIMIT 5
        `);
        
        console.log('Visitas encontradas:', visitasCliente.length);
        
        if (visitasCliente.length === 0) {
            await connection.end();
            return res.json({
                success: false,
                message: 'No se encontraron visitas del cliente para migrar',
                debug: 'Verifica que existan visitas en la tabla "visitas"'
            });
        }
        
        let migratedCount = 0;
        const results = [];
        
        for (const visita of visitasCliente) {
            try {
                console.log('Migrando visita:', visita.id);
                
                // 1. Crear solicitud_retiro
                const numeroSolicitud = `CLI-${visita.id}-${Date.now()}`;
                
                const [solicitudResult] = await connection.execute(`
                    INSERT INTO solicitudes_retiro (
                        clienteId, numero_solicitud, tipo_residuo, cantidad, unidad, descripcion,
                        fecha_preferida, urgencia, ubicacion, direccion_especifica, 
                        contacto_nombre, contacto_telefono, observaciones, estado, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, 'confirmada', NOW(), NOW())
                `, [
                    visita.cliente_id,
                    numeroSolicitud,
                    visita.tipo_visita || 'Recolección General',
                    '1',
                    'servicio',
                    `Solicitud de visita migrada del panel cliente`,
                    visita.fecha_visita,
                    visita.direccion_visita || 'Dirección del cliente',
                    visita.direccion_visita || 'Dirección del cliente',
                    visita.nombre_empresa || 'Cliente',
                    visita.cliente_id || 'Sin teléfono',
                    visita.observaciones || 'Solicitud migrada automáticamente'
                ]);
                
                const solicitudId = solicitudResult.insertId;
                
                // 2. Crear visita_retiro
                const [visitaResult] = await connection.execute(`
                    INSERT INTO visitas_retiro (
                        solicitud_retiro_id, operador_id, fecha_programada, hora_inicio, 
                        estado, observaciones, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    solicitudId,
                    visita.empleado_id || null,
                    visita.fecha_visita,
                    visita.hora_visita || '09:00:00',
                    visita.estado === 'pendiente' ? 'programada' : (visita.estado || 'programada'),
                    `Migración automática de visita #${visita.id}: ${visita.observaciones || 'Sin observaciones'}`
                ]);
                
                // 3. Crear notificación
                await connection.execute(`
                    INSERT INTO notificaciones (
                        usuario_id, tipo, titulo, mensaje, relacionado_tipo, relacionado_id, leida, fecha_creacion
                    ) SELECT 
                        id, 'visita_creada', 'Visita Migrada', 
                        CONCAT('Se migró una solicitud de visita del cliente: ', ?), 
                        'visita', ?, false, NOW()
                    FROM usuarios 
                    WHERE rol IN ('administrador', 'operador')
                `, [visita.nombre_empresa || 'Cliente', visitaResult.insertId]);
                
                migratedCount++;
                results.push({
                    visita_original: visita.id,
                    solicitud_nueva: solicitudId,
                    visita_nueva: visitaResult.insertId,
                    numero_solicitud: numeroSolicitud,
                    cliente: visita.nombre_empresa,
                    fecha: visita.fecha_visita
                });
                
                console.log(`Visita ${visita.id} migrada exitosamente`);
                
            } catch (error) {
                console.error(`Error migrando visita ${visita.id}:`, error);
                results.push({
                    visita_original: visita.id,
                    error: error.message
                });
            }
        }
        
        await connection.end();
        
        res.json({
            success: true,
            message: `Se migraron ${migratedCount} visitas del cliente al sistema administrativo`,
            migrated: migratedCount,
            total_found: visitasCliente.length,
            results: results
        });
        
    } catch (error) {
        console.error('Error en migración:', error);
        res.status(500).json({
            success: false,
            message: 'Error en migración: ' + error.message
        });
    }
});

// GET - Obtener estadísticas
router.get('/estadisticas', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [stats] = await connection.query(`
            SELECT 
                COUNT(*) as total_visitas,
                SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) as programadas,
                SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) as en_proceso,
                SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as completadas,
                SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                SUM(CASE WHEN DATE(fecha_programada) = CURDATE() THEN 1 ELSE 0 END) as hoy,
                SUM(CASE WHEN DATE(fecha_programada) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as manana
            FROM visitas_retiro
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            // Estructura que espera el frontend (acceso directo a propiedades)
            pendientes: stats[0]?.programadas || 0,
            confirmadas: stats[0]?.programadas || 0, // Ajustar según tu BD
            completadas: stats[0]?.completadas || 0,
            canceladas: stats[0]?.canceladas || 0,
            total_visitas: stats[0]?.total_visitas || 0,
            hoy: stats[0]?.hoy || 0,
            manana: stats[0]?.manana || 0,
            // También mantener el formato estándar
            data: {
                total_visitas: stats[0]?.total_visitas || 0,
                programadas: stats[0]?.programadas || 0,
                en_proceso: stats[0]?.en_proceso || 0,
                completadas: stats[0]?.completadas || 0,
                canceladas: stats[0]?.canceladas || 0,
                hoy: stats[0]?.hoy || 0,
                manana: stats[0]?.manana || 0
            }
        });
        
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas: ' + error.message,
            data: {
                total_visitas: 0,
                programadas: 0,
                en_proceso: 0,
                completadas: 0,
                canceladas: 0,
                hoy: 0,
                manana: 0
            }
        });
    }
});

// GET - Obtener clientes
router.get('/clientes', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [clientes] = await connection.query(`
            SELECT 
                id,
                rut,
                nombre_empresa,
                direccion,
                comuna,
                ciudad,
                telefono,
                email,
                contacto_principal,
                created_at
            FROM clientes 
            ORDER BY id DESC
            LIMIT 100
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: clientes || [],
            clientes: clientes || [] // Para compatibilidad adicional
        });
        
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener clientes: ' + error.message,
            data: []
        });
    }
});

// GET - Obtener empleados
router.get('/empleados', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [empleados] = await connection.query(`
            SELECT 
                id,
                nombre,
                apellido,
                email,
                telefono,
                rol,
                activo,
                created_at
            FROM usuarios 
            WHERE rol IN ('administrador', 'operador')
            ORDER BY id DESC
            LIMIT 100
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: empleados || [],
            empleados: empleados || [] // Para compatibilidad adicional
        });
        
    } catch (error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener empleados: ' + error.message,
            data: []
        });
    }
});

// GET - Obtener todas las visitas con paginación
router.get('/', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        console.log('Consultando visitas - página:', page, 'límite:', limit, 'offset:', offset);
        
        // Consulta simplificada primero para verificar que funciona
        const [visitas] = await connection.query(`
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
                vr.updated_at
            FROM visitas_retiro vr
            ORDER BY vr.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `);
        
        // Contar total de registros
        const [countResult] = await connection.query(`
            SELECT COUNT(*) as total FROM visitas_retiro
        `);
        
        const total = countResult[0]?.total || 0;
        const totalPages = Math.ceil(total / limit);
        
        await connection.end();
        
        console.log(`Encontradas ${visitas.length} visitas de ${total} totales`);
        
        const response = {
            success: true,
            visitas: visitas || [],
            paginacion: {
                pagina: page,
                totalPaginas: totalPages,
                porPagina: limit,
                totalRegistros: total
            },
            data: visitas || []
        };
        
        console.log('Respuesta enviada:', JSON.stringify(response, null, 2));
        
        res.json(response);
        
    } catch (error) {
        console.error('Error al obtener visitas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener visitas: ' + error.message,
            visitas: [], // Array vacío
            paginacion: { // Estructura exacta que espera el frontend
                pagina: 1,
                totalPaginas: 0,
                porPagina: 10,
                totalRegistros: 0,
                hayMas: false,
                hayAnterior: false
            },
            data: [],
            pagination: {
                current_page: 1,
                per_page: 10,
                total: 0,
                total_pages: 0,
                has_next: false,
                has_prev: false
            }
        });
    }
});

// GET - Obtener visita por ID
router.get('/:id', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const visitaId = parseInt(req.params.id);
        
        const [visitas] = await connection.query(`
            SELECT 
                vr.*,
                sr.numero_solicitud,
                sr.tipo_residuo,
                sr.cantidad,
                sr.unidad,
                sr.descripcion,
                sr.urgencia,
                sr.ubicacion,
                sr.direccion_especifica,
                sr.contacto_nombre,
                sr.contacto_telefono,
                sr.monto_total,
                sr.clienteId,
                c.nombre_empresa as cliente_nombre,
                c.email as cliente_email,
                c.telefono as cliente_telefono,
                c.direccion as cliente_direccion,
                u.nombre as operador_nombre,
                u.apellido as operador_apellido
            FROM visitas_retiro vr
            LEFT JOIN solicitudes_retiro sr ON vr.solicitud_retiro_id = sr.id
            LEFT JOIN clientes c ON sr.clienteId = c.id
            LEFT JOIN usuarios u ON vr.operador_id = u.id
            WHERE vr.id = ${visitaId}
        `);
        
        await connection.end();
        
        if (!visitas || visitas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Visita no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: visitas[0]
        });
        
    } catch (error) {
        console.error('Error al obtener visita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener visita: ' + error.message
        });
    }
});

// POST - Crear nueva visita
router.post('/', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const {
            solicitud_retiro_id,
            operador_id,
            fecha_programada,
            hora_inicio,
            hora_fin,
            observaciones
        } = req.body;
        
        // Verificar que la solicitud existe
        const [solicitudes] = await connection.query(`
            SELECT id FROM solicitudes_retiro WHERE id = ${solicitud_retiro_id}
        `);
        
        if (!solicitudes || solicitudes.length === 0) {
            await connection.end();
            return res.status(400).json({
                success: false,
                message: 'Solicitud de retiro no encontrada'
            });
        }
        
        // Insertar nueva visita
        const [result] = await connection.query(`
            INSERT INTO visitas_retiro 
            (solicitud_retiro_id, operador_id, fecha_programada, hora_inicio, hora_fin, estado, observaciones, created_at, updated_at)
            VALUES (${solicitud_retiro_id}, ${operador_id || 'NULL'}, '${fecha_programada}', '${hora_inicio}', '${hora_fin || 'NULL'}', 'programada', '${observaciones || ''}', NOW(), NOW())
        `);
        
        await connection.end();
        
        res.status(201).json({
            success: true,
            message: 'Visita creada exitosamente',
            data: { id: result.insertId }
        });
        
    } catch (error) {
        console.error('Error al crear visita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear visita: ' + error.message
        });
    }
});

// PUT - Actualizar visita
router.put('/:id', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const visitaId = parseInt(req.params.id);
        
        const {
            operador_id,
            fecha_programada,
            hora_inicio,
            hora_fin,
            estado,
            observaciones
        } = req.body;
        
        // Verificar que la visita existe
        const [visitas] = await connection.query(`
            SELECT id FROM visitas_retiro WHERE id = ${visitaId}
        `);
        
        if (!visitas || visitas.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Visita no encontrada'
            });
        }
        
        // Actualizar visita
        await connection.query(`
            UPDATE visitas_retiro 
            SET 
                operador_id = ${operador_id || 'NULL'}, 
                fecha_programada = '${fecha_programada}', 
                hora_inicio = '${hora_inicio}', 
                hora_fin = '${hora_fin || 'NULL'}', 
                estado = '${estado}', 
                observaciones = '${observaciones || ''}', 
                updated_at = NOW()
            WHERE id = ${visitaId}
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Visita actualizada exitosamente'
        });
        
    } catch (error) {
        console.error('Error al actualizar visita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar visita: ' + error.message
        });
    }
});

// DELETE - Eliminar visita
router.delete('/:id', auth, async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const visitaId = parseInt(req.params.id);
        
        // Verificar que la visita existe
        const [visitas] = await connection.query(`
            SELECT id FROM visitas_retiro WHERE id = ${visitaId}
        `);
        
        if (!visitas || visitas.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Visita no encontrada'
            });
        }
        
        // Eliminar visita
        await connection.query(`DELETE FROM visitas_retiro WHERE id = ${visitaId}`);
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Visita eliminada exitosamente'
        });
        
    } catch (error) {
        console.error('Error al eliminar visita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar visita: ' + error.message
        });
    }
});

module.exports = router;