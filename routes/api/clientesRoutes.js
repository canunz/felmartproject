const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../../middlewares/auth');
const { Cliente, SolicitudRetiro, DetalleResiduo, Residuo, Certificado, Visita, Notificacion } = require('../../models');
const clienteController = require('../../controllers/clienteController');
const auth = require('../../middlewares/auth');
const PDFDocument = require('pdfkit');

// Obtener todos los clientes
router.get('/clientes', isAuthenticated, async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            attributes: ['id', 'rut', 'nombre_empresa', 'email', 'direccion', 'ciudad', 'comuna', 'telefono', 'contacto_principal', 'region']
        });
        res.json({ success: true, clientes });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener la lista de clientes' });
    }
});

// Obtener un cliente específico
router.get('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ success: false, message: 'Error al obtener los datos del cliente' });
    }
});

// Crear nuevo cliente
router.post('/clientes', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.create(req.body);
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).json({ success: false, message: 'Error al crear el cliente' });
    }
});

// Actualizar cliente
router.put('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        await cliente.update(req.body);
        res.json({ success: true, cliente });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el cliente' });
    }
});

// Eliminar cliente
router.delete('/clientes/:id', isAuthenticated, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        await cliente.destroy();
        res.json({ success: true, message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el cliente' });
    }
});

// Obtener solicitudes del cliente
router.get('/solicitudes', auth.isAuthenticatedApi, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      where: { usuarioId: req.user.id }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const solicitudes = await SolicitudRetiro.findAll({
      where: { clienteId: cliente.id },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nombreEmpresa', 'direccion']
        },
        {
          model: DetalleResiduo,
          as: 'DetalleResiduos',
          include: [{
            model: Residuo,
            as: 'Residuo'
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const solicitudesFormateadas = solicitudes.map(solicitud => ({
      id: solicitud.id,
      numeroSolicitud: solicitud.numeroSolicitud,
      tipoResiduo: solicitud.tipoResiduo,
      cantidad: solicitud.cantidad,
      unidad: solicitud.unidad,
      descripcion: solicitud.descripcion,
      fechaPreferida: solicitud.fechaPreferida,
      urgencia: solicitud.urgencia,
      ubicacion: solicitud.ubicacion,
      direccionEspecifica: solicitud.direccionEspecifica,
      contactoNombre: solicitud.contactoNombre,
      contactoTelefono: solicitud.contactoTelefono,
      observaciones: solicitud.observaciones,
      estado: solicitud.estado,
      fechaProgramada: solicitud.fechaProgramada,
      fechaCompletado: solicitud.fechaCompletado,
      createdAt: solicitud.createdAt,
      updatedAt: solicitud.updatedAt,
      cliente: solicitud.cliente,
      detalles: solicitud.DetalleResiduos
    }));

    res.json({
      success: true,
      solicitudes: solicitudesFormateadas
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  }
});

router.get('/solicitudes/:id', auth.isAuthenticatedApi, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const cliente = await Cliente.findOne({ where: { usuarioId: usuario.id } });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const solicitud = await SolicitudRetiro.findOne({
      where: { 
        id: id,
        clienteId: cliente.id
      },
      include: [
        { model: Cliente, attributes: ['nombreEmpresa', 'direccion'] },
        { model: DetalleResiduo, include: [{ model: Residuo }] }
      ]
    });

    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    const solicitudFormateada = {
      id: solicitud.id,
      numero_solicitud: `SR-${solicitud.id.toString().padStart(4, '0')}`,
      fecha_solicitud: solicitud.createdAt,
      estado: solicitud.estado,
      tipo_residuo: solicitud.DetalleResiduos[0]?.Residuo?.nombre || 'No especificado',
      cantidad: solicitud.DetalleResiduos[0]?.cantidad || 'No especificada',
      direccion_retiro: solicitud.direccionRetiro,
      observaciones: solicitud.observaciones,
      certificado_disponible: solicitud.estado === 'completada',
      detalles: solicitud.DetalleResiduos.map(detalle => ({
        residuo: detalle.Residuo?.nombre,
        cantidad: detalle.cantidad,
        observaciones: detalle.observaciones
      }))
    };

    res.json({ success: true, solicitud: solicitudFormateada });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener la solicitud',
      error: error.message 
    });
  }
});

router.post('/solicitudes', auth.isAuthenticatedApi, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      where: { usuarioId: req.user.id }
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const {
      tipoResiduo,
      cantidad,
      unidad,
      descripcion,
      fechaPreferida,
      urgencia,
      ubicacion,
      direccionEspecifica,
      contactoNombre,
      contactoTelefono,
      observaciones
    } = req.body;

    // Validar datos requeridos
    if (!tipoResiduo || !cantidad || !descripcion) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Generar número de solicitud
    const ultimaSolicitud = await SolicitudRetiro.findOne({
      order: [['id', 'DESC']]
    });
    const numeroSolicitud = `SR-${String((ultimaSolicitud ? ultimaSolicitud.id + 1 : 1)).padStart(4, '0')}`;

    // Crear la solicitud
    const solicitud = await SolicitudRetiro.create({
      clienteId: cliente.id,
      numero_solicitud: numeroSolicitud,
      tipo_residuo: tipoResiduo,
      cantidad: cantidad,
      unidad: unidad || 'kg',
      descripcion: descripcion,
      fecha_preferida: fechaPreferida,
      urgencia: urgencia || 'normal',
      ubicacion: ubicacion,
      direccion_especifica: direccionEspecifica,
      contacto_nombre: contactoNombre,
      contacto_telefono: contactoTelefono,
      observaciones: observaciones,
      estado: 'pendiente',
      certificado_disponible: false
    });

    // Crear la visita asociada
    const visita = await Visita.create({
      clienteId: cliente.id,
      tipoVisita: 'retiro',
      fechaVisita: fechaPreferida,
      estado: 'pendiente',
      direccionVisita: direccionEspecifica || ubicacion,
      observaciones: `Solicitud de retiro: ${descripcion}`,
      solicitudRetiroId: solicitud.id
    });

    // Notificar al administrador
    await Notificacion.create({
      usuarioId: 1, // ID del administrador
      titulo: 'Nueva solicitud de retiro',
      mensaje: `El cliente ${cliente.nombre_empresa} ha solicitado un retiro de residuos.`,
      tipo: 'solicitud'
    });

    res.json({
      success: true,
      message: 'Solicitud creada exitosamente',
      solicitud: {
        id: solicitud.id,
        numero_solicitud: solicitud.numero_solicitud,
        estado: solicitud.estado,
        fecha_creacion: solicitud.created_at
      }
    });

  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la solicitud',
      error: error.message
    });
  }
});

router.put('/solicitudes/:id/cancelar', auth.isAuthenticatedApi, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const cliente = await Cliente.findOne({ where: { usuarioId: usuario.id } });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const solicitud = await SolicitudRetiro.findOne({
      where: { 
        id: id,
        clienteId: cliente.id
      }
    });

    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se pueden cancelar solicitudes en estado pendiente' 
      });
    }

    solicitud.estado = 'cancelada';
    await solicitud.save();

    res.json({ success: true, message: 'Solicitud cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cancelar la solicitud',
      error: error.message 
    });
  }
});

// Ruta para obtener certificado
router.get('/certificado/:id', auth.isAuthenticatedApi, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const cliente = await Cliente.findOne({ where: { usuarioId: usuario.id } });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const solicitud = await SolicitudRetiro.findOne({
      where: { 
        id: id,
        clienteId: cliente.id,
        estado: 'completada'
      },
      include: [
        { model: Certificado },
        { model: Cliente }
      ]
    });

    if (!solicitud || !solicitud.Certificado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificado no encontrado o la solicitud no está completada' 
      });
    }

    // Generar PDF del certificado
    const doc = new PDFDocument();
    generarContenidoPDF(doc, solicitud.Certificado);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado-${id}.pdf`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error('Error al generar certificado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al generar el certificado',
      error: error.message 
    });
  }
});

module.exports = router; 