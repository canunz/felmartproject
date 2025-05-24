// controllers/dashboardController.js
const { Usuario, SolicitudRetiro, VisitaRetiro, Cliente, Cotizacion } = require('../models');
const { Op } = require('sequelize');

/**
 * Renderiza el dashboard con estadísticas y actividades recientes
 */
exports.mostrarDashboard = async (req, res) => {
    try {
        // Obtener estadísticas según el rol del usuario
        let stats = {
            solicitudes: { total: 0, pendientes: 0 },
            cotizaciones: { total: 0, pendientes: 0 },
            visitas: { proximas: 0 }
        };
        
        // Filtrar por cliente si el usuario es cliente
        const whereCliente = req.usuario.rol === 'cliente' 
            ? { clienteId: req.usuario.clienteId } 
            : {};
        
        // Estadísticas de solicitudes
        const [totalSolicitudes, solicitudesPendientes] = await Promise.all([
            Solicitud.count({ where: whereCliente }),
            Solicitud.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.solicitudes.total = totalSolicitudes;
        stats.solicitudes.pendientes = solicitudesPendientes;
        
        // Estadísticas de cotizaciones
        const [totalCotizaciones, cotizacionesPendientes] = await Promise.all([
            Cotizacion.count({ where: whereCliente }),
            Cotizacion.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.cotizaciones.total = totalCotizaciones;
        stats.cotizaciones.pendientes = cotizacionesPendientes;
        
        // Próximas visitas (para la semana actual)
        const hoy = new Date();
        const finDeSemana = new Date();
        finDeSemana.setDate(hoy.getDate() + 7);
        
        const visitasProximas = await Visita.count({
            where: {
                ...whereCliente,
                fecha: {
                    [Op.between]: [hoy, finDeSemana]
                }
            }
        });
        
        stats.visitas.proximas = visitasProximas;
        
        // Para administradores, añadir estadísticas de clientes
        if (['admin', 'operador'].includes(req.usuario.rol)) {
            const totalClientes = await Cliente.count();
            const clientesNuevosMes = await Cliente.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(new Date().setDate(1)) // Primer día del mes actual
                    }
                }
            });
            
            stats.clientes = {
                total: totalClientes,
                nuevosMes: clientesNuevosMes
            };
        }
        
        // Obtener actividades recientes
        const actividades = await obtenerActividadesRecientes(req.usuario);
        
        if (req.usuario.rol === 'administrador') {
            return res.render('dashboard/admin', {
                usuario: req.usuario
            });
        }
        
        res.render('dashboard/index', {
            currentPage: 'dashboard',
            stats,
            actividades,
            usuario: {
                nombre: req.usuario.nombre,
                rol: req.usuario.rol
            }
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).render('error', {
            mensaje: 'Error al cargar el dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

/**
 * Obtiene las actividades recientes para mostrar en el dashboard
 */
async function obtenerActividadesRecientes(usuario) {
    try {
        // Filtrar por cliente si el usuario es cliente
        const whereCliente = usuario.rol === 'cliente' 
            ? { clienteId: usuario.clienteId } 
            : {};
        
        // Obtener últimas solicitudes
        const solicitudesRecientes = await Solicitud.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 3
        });
        
        // Obtener últimas cotizaciones
        const cotizacionesRecientes = await Cotizacion.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre'] },
                { model: Solicitud, attributes: ['codigo'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 3
        });
        
        // Obtener próximas visitas
        const hoy = new Date();
        const proximaSemana = new Date();
        proximaSemana.setDate(hoy.getDate() + 7);
        
        const visitasProximas = await Visita.findAll({
            where: {
                ...whereCliente,
                fecha: {
                    [Op.between]: [hoy, proximaSemana]
                }
            },
            include: [
                { model: Cliente, attributes: ['nombre'] },
                { model: Solicitud, attributes: ['codigo'] }
            ],
            order: [['fecha', 'ASC']],
            limit: 3
        });
        
        // Dar formato a las actividades
        const actividades = [
            ...solicitudesRecientes.map(solicitud => ({
                tipo: 'solicitud',
                icono: 'clipboard-list',
                color: 'blue',
                titulo: `Nueva solicitud ${solicitud.codigo}`,
                subtitulo: solicitud.Cliente.nombre,
                fecha: getTimeAgo(solicitud.createdAt),
                enlace: `/solicitudes/${solicitud.id}`
            })),
            ...cotizacionesRecientes.map(cotizacion => ({
                tipo: 'cotizacion',
                icono: 'file-text',
                color: 'amber',
                titulo: `Cotización ${cotizacion.codigo}`,
                subtitulo: `Para solicitud ${cotizacion.Solicitud.codigo}`,
                fecha: getTimeAgo(cotizacion.createdAt),
                enlace: `/cotizaciones/${cotizacion.id}`
            })),
            ...visitasProximas.map(visita => ({
                tipo: 'visita',
                icono: 'truck',
                color: 'green',
                titulo: `Visita programada para ${formatDate(visita.fecha)}`,
                subtitulo: `${visita.tipo} - ${visita.Cliente.nombre}`,
                fecha: getTimeAgo(visita.createdAt),
                enlace: `/visitas/${visita.id}`
            }))
        ];
        
        // Ordenar por fecha de creación (más reciente primero)
        return actividades.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }).slice(0, 5); // Limitar a las 5 más recientes
        
    } catch (error) {
        console.error('Error al obtener actividades recientes:', error);
        return [];
    }
}

/**
 * Formatea una fecha como tiempo relativo (ej: "hace 2 días")
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `Hace ${interval} años`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `Hace ${interval} meses`;
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `Hace ${interval} días`;
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `Hace ${interval} horas`;
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `Hace ${interval} minutos`;
    
    return 'Hace unos segundos';
}

/**
 * Formatea una fecha (ej: "24/05/2025")
 */
function formatDate(date) {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

const dashboardController = {
    // Obtener estadísticas para el dashboard administrativo
    getAdminStats: async () => {
        try {
            // Total de clientes (usuarios con rol 'cliente')
            const totalClientes = await Usuario.count({
                where: {
                    rol: 'cliente'
                }
            });

            // Total de solicitudes pendientes
            const solicitudesPendientes = await SolicitudRetiro.count({
                where: {
                    estado: 'pendiente'
                }
            });

            // Total de visitas programadas para hoy
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            const visitasHoy = await VisitaRetiro.count({
                where: {
                    fechaProgramada: {
                        [Op.gte]: hoy,
                        [Op.lt]: manana
                    }
                }
            });

            // Total de servicios completados
            const serviciosCompletados = await VisitaRetiro.count({
                where: {
                    estado: 'completada'
                }
            });

            return {
                totalClientes,
                solicitudesPendientes,
                visitasHoy,
                serviciosCompletados
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    },

    // Renderizar dashboard administrativo
    renderAdminDashboard: async (req, res) => {
        try {
            const stats = await dashboardController.getAdminStats();
            
            res.render('dashboard/admin', {
                usuario: req.session.usuario,
                titulo: 'Panel de Administración',
                ...stats
            });
        } catch (error) {
            console.error('Error al renderizar dashboard:', error);
            req.flash('error', 'Error al cargar el dashboard');
            res.redirect('/');
        }
    }
};

module.exports = dashboardController;