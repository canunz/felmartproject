// ==========================================
// 1. CÓDIGO PARA EL PANEL DEL CLIENTE
// Archivo: routes/cliente/solicitudVisita.js (o donde manejes las solicitudes del cliente)
// ==========================================

router.post('/solicitar-visita', async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const {
            tipo_residuo,
            cantidad,
            unidad,
            descripcion,
            fecha_preferida,
            hora_preferida,
            direccion,
            contacto_nombre,
            contacto_telefono,
            observaciones
        } = req.body;
        
        // Obtener ID del cliente logueado
        const clienteId = req.session.usuario.cliente_id || req.body.clienteId;
        
        console.log('Cliente solicita visita:', { clienteId, tipo_residuo, fecha_preferida });
        
        // PASO 1: Crear solicitud de retiro
        const numeroSolicitud = `SOL-${Date.now()}`;
        
        const [solicitudResult] = await connection.execute(`
            INSERT INTO solicitudes_retiro (
                clienteId, numero_solicitud, tipo_residuo, cantidad, unidad, descripcion,
                fecha_preferida, urgencia, ubicacion, direccion_especifica, 
                contacto_nombre, contacto_telefono, observaciones, estado, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, 'pendiente', NOW(), NOW())
        `, [
            clienteId, numeroSolicitud, tipo_residuo, cantidad || '1', unidad || 'unidad', descripcion,
            fecha_preferida, direccion, direccion, contacto_nombre, contacto_telefono, observaciones
        ]);
        
        const solicitudId = solicitudResult.insertId;
        console.log('Solicitud creada con ID:', solicitudId);
        
        // PASO 2: Crear visita automáticamente para el admin
        const [visitaResult] = await connection.execute(`
            INSERT INTO visitas_retiro (
                solicitud_retiro_id, fecha_programada, hora_inicio, estado, 
                observaciones, created_at, updated_at
            ) VALUES (?, ?, ?, 'programada', ?, NOW(), NOW())
        `, [
            solicitudId, 
            fecha_preferida, 
            hora_preferida || '09:00:00',
            `Solicitud automática del cliente: ${observaciones || 'Sin observaciones'}`
        ]);
        
        const visitaId = visitaResult.insertId;
        console.log('Visita creada con ID:', visitaId);
        
        // PASO 3: Crear notificación para todos los administradores
        await connection.execute(`
            INSERT INTO notificaciones (
                usuario_id, tipo, titulo, mensaje, relacionado_tipo, relacionado_id, leida, fecha_creacion
            ) SELECT 
                id, 'visita_creada', 'Nueva Solicitud de Visita', 
                CONCAT('El cliente ha solicitado una visita para recoger: ', ?), 
                'visita', ?, false, NOW()
            FROM usuarios 
            WHERE rol IN ('administrador', 'operador')
        `, [tipo_residuo, visitaId]);
        
        console.log('Notificaciones creadas para administradores');
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Solicitud de visita enviada correctamente. El administrador la revisará pronto.',
            data: {
                solicitud_id: solicitudId,
                visita_id: visitaId,
                numero_solicitud: numeroSolicitud,
                fecha_programada: fecha_preferida,
                hora_programada: hora_preferida || '09:00:00'
            }
        });
        
    } catch (error) {
        console.error('Error al crear solicitud de visita:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar solicitud: ' + error.message
        });
    }
});

// ==========================================
// 2. MIGRAR LA VISITA QUE YA ENVIASTE
// Ejecuta esta ruta UNA VEZ para migrar tu visita existente
// ==========================================

router.post('/migrar-visita-pendiente', async function(req, res) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Buscar la visita que enviaste (por fecha/datos que mencionaste)
        const [visitaExistente] = await connection.query(`
            SELECT * FROM visitas 
            WHERE DATE(fecha_visita) = '2025-06-11' 
            AND hora_visita = '13:21:00'
            ORDER BY id DESC LIMIT 1
        `);
        
        if (visitaExistente.length === 0) {
            return res.json({
                success: false,
                message: 'No se encontró la visita a migrar'
            });
        }
        
        const visita = visitaExistente[0];
        console.log('Migrando visita:', visita);
        
        // 1. Crear solicitud_retiro
        const numeroSolicitud = `MIG-${visita.id}-${Date.now()}`;
        
        const [solicitudResult] = await connection.execute(`
            INSERT INTO solicitudes_retiro (
                clienteId, numero_solicitud, tipo_residuo, cantidad, unidad, descripcion,
                fecha_preferida, urgencia, ubicacion, direccion_especifica, 
                contacto_nombre, contacto_telefono, observaciones, estado, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, 'confirmada', ?, NOW())
        `, [
            visita.cliente_id,
            numeroSolicitud,
            visita.tipo_visita || 'recoleccion',
            '1',
            'servicio',
            'Migración de solicitud de visita del cliente',
            visita.fecha_visita,
            visita.direccion_visita || 'los alpes 7443',
            visita.direccion_visita || 'los alpes 7443',
            'Cliente',
            '94',
            visita.observaciones || 'fdsf',
            visita.fecha_creacion || NOW()
        ]);
        
        const solicitudId = solicitudResult.insertId;
        
        // 2. Crear visita_retiro
        await connection.execute(`
            INSERT INTO visitas_retiro (
                solicitud_retiro_id, operador_id, fecha_programada, hora_inicio, 
                estado, observaciones, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            solicitudId,
            visita.empleado_id,
            visita.fecha_visita,
            visita.hora_visita,
            visita.estado === 'pendiente' ? 'programada' : visita.estado,
            `Migración: ${visita.observaciones || 'Solicitud de recolección'}`,
            visita.fecha_creacion || NOW()
        ]);
        
        await connection.end();
        
        res.json({
            success: true,
            message: 'Visita migrada exitosamente al sistema administrativo',
            data: {
                visita_original: visita.id,
                solicitud_nueva: solicitudId,
                numero_solicitud: numeroSolicitud
            }
        });
        
    } catch (error) {
        console.error('Error en migración:', error);
        res.status(500).json({
            success: false,
            message: 'Error en migración: ' + error.message
        });
    }
});

// ==========================================
// 3. ACTUALIZAR EL ROUTER DE VISITAS DEL ADMIN
// Para que muestre todas las visitas incluyendo las del cliente
// ==========================================

// Ya tienes el código unificado en el artifact anterior
// Solo asegúrate de que esté activo y funcionando