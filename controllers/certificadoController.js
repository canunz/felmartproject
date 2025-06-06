// controllers/certificadoController.js
const { 
    Certificado, 
    VisitaRetiro, 
    SolicitudRetiro, 
    Cliente, 
    Usuario,
    Notificacion 
  } = require('../models');
  const { Op } = require('sequelize');
  const fs = require('fs');
  const path = require('path');
  const PDFDocument = require('pdfkit');
  const moment = require('moment');
  const multer = require('multer');
  
  // Configuración de multer para subida de archivos
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dirPath = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      // Crear directorio si no existe
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `certificado-${uniqueSuffix}${ext}`);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Aceptar solo PDFs
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
      }
    }
  });
  
  const certificadoController = {
    // Middleware para manejar la subida de archivos
    uploadMiddleware: upload.single('archivoPdf'),
    
    // Listar certificados (filtrados según rol)
    listar: async (req, res) => {
      try {
        let certificados = [];
        const { usuario } = req.session;
        
        // Filtrar certificados según rol
        if (usuario.rol === 'administrador' || usuario.rol === 'operador') {
          // Admin y operador ven todos los certificados
          certificados = await Certificado.findAll({
            include: [
              { 
                model: VisitaRetiro,
                include: [
                  { 
                    model: SolicitudRetiro,
                    include: [{ model: Cliente }]
                  }
                ]
              }
            ],
            order: [['fechaEmision', 'DESC']]
          });
        } else if (usuario.rol === 'cliente') {
          // Cliente solo ve sus certificados
          certificados = await Certificado.findAll({
            include: [
              { 
                model: VisitaRetiro,
                include: [
                  { 
                    model: SolicitudRetiro,
                    where: { clienteId: req.session.clienteId },
                    include: [{ model: Cliente }]
                  }
                ]
              }
            ],
            order: [['fechaEmision', 'DESC']]
          });
        }
        
        res.render('certificados/listar', {
          titulo: 'Certificados de Tratamiento',
          certificados,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al listar certificados:', error);
        req.flash('error', 'Error al cargar la lista de certificados');
        res.redirect('/dashboard');
      }
    },
    
    // Ver detalles de un certificado
    detalles: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Buscar certificado con todos sus detalles
        const certificado = await Certificado.findByPk(id, {
          include: [
            { 
              model: VisitaRetiro,
              include: [
                { 
                  model: SolicitudRetiro,
                  include: [{ model: Cliente }]
                }
              ]
            }
          ]
        });
        
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/certificados');
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && 
            certificado.VisitaRetiro.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para ver este certificado');
          return res.redirect('/certificados');
        }
        
        res.render('certificados/detalles', {
          titulo: 'Detalles de Certificado',
          certificado,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar detalles de certificado:', error);
        req.flash('error', 'Error al cargar detalles del certificado');
        res.redirect('/certificados');
      }
    },
    
    // Mostrar formulario para crear certificado
    mostrarCrear: async (req, res) => {
      try {
        const { visitaId } = req.query;
        const { usuario } = req.session;
        
        // Solo admins y operadores pueden crear certificados
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para crear certificados');
          return res.redirect('/dashboard');
        }
        
        // Verificar si viene de una visita
        if (!visitaId) {
          req.flash('error', 'Debe seleccionar una visita para generar certificado');
          return res.redirect('/visitas/calendario');
        }
        
        // Buscar visita
        const visita = await VisitaRetiro.findByPk(visitaId, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        // Verificar que la visita esté completada
        if (visita.estado !== 'completada') {
          req.flash('error', 'Solo se pueden generar certificados para visitas completadas');
          return res.redirect(`/visitas/detalles/${visitaId}`);
        }
        
        // Verificar que no tenga ya un certificado
        const certificadoExistente = await Certificado.findOne({
          where: { visitaRetiroId: visitaId }
        });
        
        if (certificadoExistente) {
          req.flash('error', 'Esta visita ya tiene un certificado generado');
          return res.redirect(`/certificados/detalles/${certificadoExistente.id}`);
        }
        
        // Generar número de certificado automático
        const fechaActual = new Date();
        const año = fechaActual.getFullYear().toString().substr(-2);
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        
        // Obtener el último número de certificado del mes
        const ultimoCertificado = await Certificado.findOne({
          where: {
            numeroCertificado: {
              [Op.like]: `CERT-${año}${mes}%`
            }
          },
          order: [['numeroCertificado', 'DESC']]
        });
        
        let numeroCertificado;
        if (ultimoCertificado) {
          const ultimoNumero = parseInt(ultimoCertificado.numeroCertificado.split('-')[2]);
          numeroCertificado = `CERT-${año}${mes}-${(ultimoNumero + 1).toString().padStart(3, '0')}`;
        } else {
          numeroCertificado = `CERT-${año}${mes}-001`;
        }
        
        res.render('certificados/crear', {
          titulo: 'Nuevo Certificado',
          visita,
          numeroCertificado,
          usuario,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (error) {
        console.error('Error al mostrar formulario de creación:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/visitas/calendario');
      }
    },
    
    // Crear certificado
    crear: async (req, res) => {
      try {
        const { 
          visitaId,
          numeroCertificado,
          tipoTratamiento,
          plantaDestino,
          observaciones
        } = req.body;
        
        // Validar campos
        if (!visitaId || !numeroCertificado || !tipoTratamiento || !plantaDestino) {
          req.flash('error', 'Todos los campos marcados con * son obligatorios');
          return res.redirect(`/certificados/crear?visitaId=${visitaId}`);
        }
        
        // Buscar visita
        const visita = await VisitaRetiro.findByPk(visitaId, {
          include: [
            { 
              model: SolicitudRetiro,
              include: [{ model: Cliente }]
            }
          ]
        });
        
        if (!visita) {
          req.flash('error', 'Visita no encontrada');
          return res.redirect('/visitas/calendario');
        }
        
        let rutaPdf = null;
        
        // Si hay archivo PDF
        if (req.file) {
          // La ruta se guarda relativa a la carpeta public
          rutaPdf = `/uploads/certificados/${req.file.filename}`;
        }
        
        // Crear certificado
        const nuevoCertificado = await Certificado.create({
          visitaRetiroId: visitaId,
          numeroCertificado,
          fechaEmision: new Date(),
          tipoTratamiento,
          plantaDestino,
          observaciones,
          rutaPdf
        });
        
        // Si no hay archivo PDF, generar uno
        if (!rutaPdf) {
          await generarPDFCertificado(nuevoCertificado.id);
        }
        
        // Notificar al cliente
        if (visita.SolicitudRetiro && visita.SolicitudRetiro.Cliente && visita.SolicitudRetiro.Cliente.Usuario) {
          await Notificacion.create({
            usuarioId: visita.SolicitudRetiro.Cliente.Usuario.id,
            tipo: 'certificado',
            titulo: 'Nuevo certificado disponible',
            mensaje: `Se ha generado un certificado de tratamiento para su solicitud #${visita.SolicitudRetiro.id}`,
            referenciaId: nuevoCertificado.id
          });
        }
        
        req.flash('success', 'Certificado creado correctamente');
        res.redirect(`/certificados/detalles/${nuevoCertificado.id}`);
      } catch (error) {
        console.error('Error al crear certificado:', error);
        req.flash('error', 'Error al crear certificado');
        res.redirect(`/certificados/crear?visitaId=${req.body.visitaId}`);
      }
    },
    
    // Descargar PDF de certificado
    descargarPDF: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        
        // Buscar certificado
        const certificado = await Certificado.findByPk(id, {
          include: [
            { 
              model: VisitaRetiro,
              include: [
                { 
                  model: SolicitudRetiro,
                  include: [{ model: Cliente }]
                }
              ]
            }
          ]
        });
        
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/certificados');
        }
        
        // Verificar acceso para clientes
        if (usuario.rol === 'cliente' && 
            certificado.VisitaRetiro.SolicitudRetiro.clienteId !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para descargar este certificado');
          return res.redirect('/certificados');
        }
        
        // Verificar que exista el archivo PDF
        let rutaArchivo;
        
        if (certificado.rutaPdf) {
          // Convertir ruta relativa a absoluta
          rutaArchivo = path.join(__dirname, '..', 'public', certificado.rutaPdf);
        } else {
          // Si no hay ruta, generar el PDF
          rutaArchivo = await generarPDFCertificado(id);
        }
        
        if (!fs.existsSync(rutaArchivo)) {
          req.flash('error', 'Archivo PDF no encontrado');
          return res.redirect(`/certificados/detalles/${id}`);
        }
        
        // Enviar el archivo al cliente
        res.download(rutaArchivo, `Certificado-${certificado.numeroCertificado}.pdf`);
      } catch (error) {
        console.error('Error al descargar PDF:', error);
        req.flash('error', 'Error al descargar PDF');
        res.redirect(`/certificados/detalles/${req.params.id}`);
      }
    }
  };
  
  // Función para generar PDF de certificado
  const generarPDFCertificado = async (certificadoId) => {
    try {
      // Buscar certificado con todos sus detalles
      const certificado = await Certificado.findByPk(certificadoId, {
        include: [
          { 
            model: VisitaRetiro,
            include: [
              { 
                model: SolicitudRetiro,
                include: [
                  { model: Cliente }
                ]
              }
            ]
          }
        ]
      });
      
      if (!certificado) {
        throw new Error('Certificado no encontrado');
      }
      
      // Crear directorio si no existe
      const directorioDestino = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      if (!fs.existsSync(directorioDestino)) {
        fs.mkdirSync(directorioDestino, { recursive: true });
      }
      
      // Generar PDF
      const nombreArchivo = `certificado-${certificadoId}.pdf`;
      const rutaArchivoPDF = path.join(directorioDestino, nombreArchivo);
      
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
              Title: `Certificado ${certificado.numeroCertificado}`,
              Author: 'Felmart',
              Subject: 'Certificado de Gestión de Residuos'
            }
          });

          // Crear stream de escritura
          const stream = fs.createWriteStream(rutaArchivoPDF);
          doc.pipe(stream);

          // Logo (si existe)
          const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 100 });
          }

          // Título
          doc.fontSize(20)
             .font('Helvetica-Bold')
             .text('Certificado de Gestión de Residuos', { align: 'center' })
             .moveDown();

          // Número de certificado
          doc.fontSize(14)
             .font('Helvetica')
             .text(`N° ${certificado.numeroCertificado}`, { align: 'center' })
             .moveDown(2);

          // Información del cliente
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text('Información del Cliente')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Empresa: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.nombre}`)
             .text(`RUC: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.ruc}`)
             .text(`Dirección: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.direccion}`)
             .moveDown();

          // Detalles del certificado
          doc.font('Helvetica-Bold')
             .text('Detalles del Certificado')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Tipo de Tratamiento: ${certificado.tipoTratamiento}`)
             .text(`Planta Destino: ${certificado.plantaDestino}`)
             .text(`Fecha de Emisión: ${moment(certificado.fechaEmision).format('DD/MM/YYYY')}`)
             .moveDown();

          // Información de la visita
          doc.font('Helvetica-Bold')
             .text('Información de la Visita')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Fecha de Retiro: ${moment(certificado.VisitaRetiro.fechaRetiro).format('DD/MM/YYYY')}`)
             .text(`Hora de Retiro: ${certificado.VisitaRetiro.horaRetiro}`)
             .moveDown();

          // Observaciones (si existen)
          if (certificado.observaciones) {
            doc.font('Helvetica-Bold')
               .text('Observaciones')
               .moveDown(0.5)
               .font('Helvetica')
               .text(certificado.observaciones)
               .moveDown();
          }

          // Pie de página
          const footerY = 700;
          doc.fontSize(10)
             .font('Helvetica')
             .text('Este documento es un certificado oficial de gestión de residuos.', 50, footerY, {
               align: 'center',
               width: 500
             })
             .text('Felmart - Gestión de Residuos', 50, footerY + 15, {
               align: 'center',
               width: 500
             })
             .text('Ruta 5 Sur km 1036, sector Trapen, Puerto Montt, Chile', 50, footerY + 30, {
               align: 'center',
               width: 500
             });

          // Finalizar PDF
          doc.end();

          // Manejar eventos del stream
          stream.on('finish', () => {
            resolve(rutaArchivoPDF);
          });

          stream.on('error', (error) => {
            reject(error);
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  };
  
  module.exports = certificadoController;