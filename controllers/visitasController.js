// controllers/visitasController.js
const { Cliente, Usuario, SolicitudRetiro, VisitaRetiro } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const { QueryTypes } = require('sequelize');

const visitasController = {
  // Renderizar página de administración de visitas
  renderVisitasAdmin: async (req, res) => {
    try {
      // Obtener estadísticas de visitas
      const estadisticas = await VisitaRetiro.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['estado']
      });

      const stats = {
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        canceladas: 0
      };

      estadisticas.forEach(stat => {
        const estado = stat.estado;
        const total = parseInt(stat.getDataValue('total'));
        
        switch (estado) {
          case 'programada':
            stats.pendientes = total;
            break;
          case 'en_proceso':
            stats.confirmadas = total;
            break;
          case 'completada':
            stats.completadas = total;
            break;
          case 'cancelada':
            stats.canceladas = total;
            break;
        }
      });

      // Obtener visitas del día
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      const visitasHoy = await VisitaRetiro.findAll({
        where: {
          fechaProgramada: {
            [Op.between]: [hoy, manana]
          }
        },
        include: [
          {
            model: SolicitudRetiro,
            include: [{
              model: Cliente,
              attributes: ['id', 'nombre_empresa', 'rut']
            }]
          },
          {
            model: Usuario,
            as: 'Operador',
            attributes: ['id', 'nombre', 'apellido']
          }
        ],
        order: [['horaInicio', 'ASC']]
      });

      res.render('admin/visitas', {
        titulo: 'Gestión de Visitas',
        usuario: {
          nombre: req.session.usuario.nombre,
          email: req.session.usuario.email,
          tipo_usuario: req.session.usuario.tipo_usuario
        },
        estadisticas: stats,
        visitasHoy: visitasHoy.map(visita => ({
          id: visita.id,
          numero_visita: visita.id.toString().padStart(6, '0'),
          hora: visita.horaInicio,
          cliente: visita.SolicitudRetiro?.Cliente?.nombre_empresa || 'Sin cliente',
          direccion: visita.SolicitudRetiro?.direccionEspecifica || 'Sin dirección',
          estado: visita.estado,
          operador: visita.Operador ? `${visita.Operador.nombre} ${visita.Operador.apellido}` : 'Sin asignar'
        })),
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    } catch (error) {
      console.error('Error renderizando página de visitas:', error);
      req.flash('error', 'Error al cargar la página de visitas');
      res.redirect('/admin');
    }
  },

  // Obtener todas las visitas
  obtenerVisitas: async (req, res) => {
    try {
      const { page = 1, limit = 50, estado, mes, cliente } = req.query;
      const offset = (page - 1) * limit;

      // Construir la consulta base
      let query = `
          SELECT 
              vr.*,
              sr.numero_solicitud,
              sr.estado as estado_solicitud,
              sr.fecha_solicitud,
              sr.fecha_retiro,
              sr.hora_retiro,
              sr.observaciones as observaciones_solicitud,
              sr.creado_por,
              c.nombre_empresa,
              c.direccion as direccion_cliente,
              c.comuna,
              c.ciudad,
              c.region,
              c.telefono,
              c.email,
              c.contacto_principal,
              u.nombre as nombre_operador,
              u.apellido as apellido_operador,
              u.email as email_operador,
              u.telefono as telefono_operador
          FROM VisitaRetiro vr
          LEFT JOIN SolicitudRetiro sr ON vr.solicitudRetiroId = sr.id
          LEFT JOIN Cliente c ON sr.clienteId = c.id
          LEFT JOIN Usuario u ON vr.operadorId = u.id
          WHERE 1=1
      `;

      // Agregar condiciones de filtrado
      if (estado) {
          query += ` AND vr.estado = :estado`;
      }
      if (mes) {
          query += ` AND MONTH(vr.fechaProgramada) = :mes`;
      }

      // Agregar ordenamiento y paginación
      query += ` ORDER BY vr.fechaProgramada DESC, vr.horaInicio ASC LIMIT :limit OFFSET :offset`;

      // Ejecutar la consulta con parámetros
      const visitas = await sequelize.query(query, {
          replacements: {
              estado: estado || null,
              mes: mes || null,
              limit: parseInt(limit),
              offset: parseInt(offset)
          },
          type: QueryTypes.SELECT
      });

      // Formatear datos para el frontend
      const visitasFormateadas = visitas.map(visita => ({
        id: visita.id,
        numero_visita: visita.id.toString().padStart(6, '0'),
        fecha_visita: visita.fechaProgramada,
        hora_visita: visita.horaInicio,
        tipo_visita: 'recoleccion',
        estado: visita.estado,
        duracion_estimada: 60,
        direccion_visita: visita.SolicitudRetiro?.direccionEspecifica,
        observaciones: visita.observaciones,
        cliente_id: visita.SolicitudRetiro?.Cliente?.id,
        cliente_nombre: visita.SolicitudRetiro?.Cliente?.nombre_empresa,
        empleado_id: visita.operadorId,
        empleado_nombre: visita.Operador ? `${visita.Operador.nombre} ${visita.Operador.apellido}` : null,
        created_at: visita.createdAt
      }));

      res.json({
        success: true,
        visitas: visitasFormateadas,
        paginacion: {
          pagina: parseInt(page),
          totalPaginas: Math.ceil(visitas.length / limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo visitas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener visitas: ' + error.message
      });
    }
  },

  // Obtener estadísticas de visitas
  obtenerEstadisticas: async (req, res) => {
    try {
      const estadisticas = await VisitaRetiro.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['estado']
      });

      const stats = {
        pendientes: 0,
        confirmadas: 0,
        completadas: 0,
        canceladas: 0
      };

      estadisticas.forEach(stat => {
        const estado = stat.estado;
        const total = parseInt(stat.getDataValue('total'));
        
        switch (estado) {
          case 'programada':
            stats.pendientes = total;
            break;
          case 'en_proceso':
            stats.confirmadas += total;
            break;
          case 'completada':
            stats.completadas = total;
            break;
          case 'cancelada':
            stats.canceladas = total;
            break;
        }
      });

      res.json(stats);

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener detalle de una visita específica
  obtenerDetalleVisita: async (req, res) => {
    try {
      const { visitaId } = req.params;

      const visita = await VisitaRetiro.findByPk(visitaId, {
        include: [
          {
            model: SolicitudRetiro,
            include: [{
              model: Cliente,
              attributes: ['id', 'nombre_empresa', 'rut', 'email', 'telefono', 'direccion']
            }]
          },
          {
            model: Usuario,
            as: 'Operador',
            attributes: ['id', 'nombre', 'apellido', 'email', 'telefono'],
            required: false
          }
        ]
      });

      if (!visita) {
        return res.status(404).json({
          success: false,
          message: 'Visita no encontrada'
        });
      }

      res.json({
        success: true,
        data: visita
      });

    } catch (error) {
      console.error('Error obteniendo detalle de visita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Crear nueva visita
  crearVisita: async (req, res) => {
    try {
      const {
        cliente_id,
        empleado_id,
        tipo_visita,
        fecha_visita,
        hora_visita,
        duracion_estimada,
        estado,
        direccion_visita,
        observaciones,
        notas_tecnico
      } = req.body;

      // Verificar que el cliente existe
      const cliente = await Cliente.findByPk(cliente_id);
      if (!cliente) {
        return res.status(400).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Crear solicitud de retiro si no existe (para mantener la relación)
      let solicitud = await SolicitudRetiro.findOne({
        where: { 
          clienteId: cliente_id,
          estado: 'pendiente'
        }
      });

      if (!solicitud) {
        // Generar número de solicitud automático
        const ultimaSolicitud = await SolicitudRetiro.findOne({
          order: [['id', 'DESC']]
        });
        const numeroSolicitud = `SOL-${new Date().getFullYear()}-${String((ultimaSolicitud?.id || 0) + 1).padStart(3, '0')}`;

        solicitud = await SolicitudRetiro.create({
          clienteId: cliente_id,
          numero_solicitud: numeroSolicitud,
          tipo_residuo: 'general',
          cantidad: '0',
          unidad: 'kg',
          descripcion: 'Solicitud generada automáticamente para visita',
          fecha_preferida: fecha_visita,
          urgencia: 'normal',
          ubicacion: 'principal',
          estado: 'pendiente'
        });
      }

      // Generar número de visita automático
      const ultimaVisita = await VisitaRetiro.findOne({
        order: [['id', 'DESC']]
      });
      const numeroVisita = `VIS-${new Date().getFullYear()}-${String((ultimaVisita?.id || 0) + 1).padStart(3, '0')}`;

      // Crear la visita
      const nuevaVisita = await VisitaRetiro.create({
        numero_visita: numeroVisita,
        solicitudRetiroId: solicitud.id,
        operadorId: empleado_id || null,
        fecha_visita,
        hora_visita,
        tipo_visita: tipo_visita || 'recoleccion',
        estado: estado || 'pendiente',
        duracion_estimada: duracion_estimada || 60,
        direccion_visita,
        observaciones,
        notas_tecnico
      });

      res.status(201).json({
        success: true,
        message: 'Visita creada exitosamente',
        data: nuevaVisita
      });

    } catch (error) {
      console.error('Error creando visita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Actualizar visita existente
  actualizarVisita: async (req, res) => {
    try {
      const { visitaId } = req.params;
      const datosActualizacion = req.body;

      const visita = await VisitaRetiro.findByPk(visitaId);
      if (!visita) {
        return res.status(404).json({
          success: false,
          message: 'Visita no encontrada'
        });
      }

      await visita.update(datosActualizacion);

      res.json({
        success: true,
        message: 'Visita actualizada exitosamente',
        data: visita
      });

    } catch (error) {
      console.error('Error actualizando visita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Eliminar visita
  eliminarVisita: async (req, res) => {
    try {
      const { visitaId } = req.params;

      const visita = await VisitaRetiro.findByPk(visitaId);
      if (!visita) {
        return res.status(404).json({
          success: false,
          message: 'Visita no encontrada'
        });
      }

      await visita.destroy();

      res.json({
        success: true,
        message: 'Visita eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando visita:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener clientes para el dropdown
  obtenerClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        attributes: ['id', 'nombre_empresa', 'rut', 'email'],
        order: [['nombre_empresa', 'ASC']]
      });

      res.json(clientes);

    } catch (error) {
      console.error('Error obteniendo clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener empleados/operadores para el dropdown
  obtenerEmpleados: async (req, res) => {
    try {
      const empleados = await Usuario.findAll({
        where: {
          tipo_usuario: ['admin', 'operador']
        },
        attributes: ['id', 'nombre', 'apellido', 'email'],
        order: [['nombre', 'ASC']]
      });

      res.json(empleados);

    } catch (error) {
      console.error('Error obteniendo empleados:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // Obtener notificaciones (placeholder)
  obtenerNotificaciones: async (req, res) => {
    try {
      // Por ahora retornamos array vacío
      // Aquí puedes implementar la lógica de notificaciones reales
      res.json([]);

    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      res.status(500).json([]);
    }
  }
};

module.exports = visitasController;