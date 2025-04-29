// controllers/reporteController.js
const { 
    SolicitudRetiro, 
    VisitaRetiro, 
    Cliente, 
    Residuo, 
    DetalleResiduo,
    Cotizacion,
    Certificado 
  } = require('../models');
  const { Op, Sequelize } = require('sequelize');
  const moment = require('moment');
  const ExcelJS = require('exceljs');
  const path = require('path');
  const fs = require('fs');
  
  const reporteController = {
    // Mostrar dashboard de estadísticas
    dashboard: async (req, res) => {
      try {
        const { usuario } = req.session;
        
        // Solo admin y operadores pueden ver estadísticas
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para acceder a esta sección');
          return res.redirect('/dashboard');
        }
        
        // Fecha actual y hace un año
        const fechaActual = moment();
        const fechaAnterior = moment().subtract(1, 'year');
        
        // Estadísticas generales
        const totalClientes = await Cliente.count();
        const totalSolicitudes = await SolicitudRetiro.count();
        const totalVisitas = await VisitaRetiro.count();
        const totalCertificados = await Certificado.count();
        
        // Solicitudes por estado
        const solicitudesPorEstado = await SolicitudRetiro.findAll({
          attributes: [
            'estado',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
          ],
          group: ['estado']
        });
        
   // controllers/reporteController.js (continuación)
      // Solicitudes por mes (último año)
      const solicitudesPorMes = await SolicitudRetiro.findAll({
        attributes: [
          [Sequelize.fn('DATE_FORMAT', Sequelize.col('fechaSolicitud'), '%Y-%m'), 'mes'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total']
        ],
        where: {
          fechaSolicitud: {
            [Op.between]: [fechaAnterior.toDate(), fechaActual.toDate()]
          }
        },
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('fechaSolicitud'), '%Y-%m')],
        order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('fechaSolicitud'), '%Y-%m'), 'ASC']]
      });
      
      // Top 5 clientes con más solicitudes
      const topClientes = await Cliente.findAll({
        attributes: [
          'id',
          'nombreEmpresa',
          [Sequelize.fn('COUNT', Sequelize.col('SolicitudRetiros.id')), 'totalSolicitudes']
        ],
        include: [{
          model: SolicitudRetiro,
          attributes: []
        }],
        group: ['Cliente.id'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('SolicitudRetiros.id')), 'DESC']],
        limit: 5
      });
      
      // Tipos de residuos más solicitados
      const topResiduos = await Residuo.findAll({
        attributes: [
          'id',
          'nombre',
          [Sequelize.fn('SUM', Sequelize.col('DetalleResiduos.cantidad')), 'totalCantidad']
        ],
        include: [{
          model: DetalleResiduo,
          attributes: []
        }],
        group: ['Residuo.id'],
        order: [[Sequelize.fn('SUM', Sequelize.col('DetalleResiduos.cantidad')), 'DESC']],
        limit: 5
      });
      
      // Preparar datos para gráficos
      const datosSolicitudesPorEstado = {
        labels: solicitudesPorEstado.map(item => item.estado),
        data: solicitudesPorEstado.map(item => item.dataValues.total)
      };
      
      // Preparar datos de solicitudes por mes
      const meses = [];
      const datosPorMes = [];
      
      // Generar array con todos los meses del último año
      for (let i = 0; i < 12; i++) {
        const m = moment().subtract(i, 'months');
        meses.unshift(m.format('YYYY-MM'));
        datosPorMes.unshift(0);
      }
      
      // Llenar con datos reales
      solicitudesPorMes.forEach(item => {
        const index = meses.indexOf(item.dataValues.mes);
        if (index !== -1) {
          datosPorMes[index] = parseInt(item.dataValues.total);
        }
      });
      
      const datosSolicitudesPorMes = {
        labels: meses.map(m => moment(m).format('MMM YYYY')),
        data: datosPorMes
      };
      
      res.render('reportes/dashboard', {
        titulo: 'Dashboard de Estadísticas',
        usuario,
        totalClientes,
        totalSolicitudes,
        totalVisitas,
        totalCertificados,
        datosSolicitudesPorEstado,
        datosSolicitudesPorMes,
        topClientes,
        topResiduos,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      req.flash('error', 'Error al cargar las estadísticas');
      res.redirect('/dashboard');
    }
  },
  
  // Generar reporte de solicitudes
  reporteSolicitudes: async (req, res) => {
    try {
      const { fechaInicio, fechaFin, estado, clienteId } = req.query;
      const { usuario } = req.session;
      
      // Solo admin y operadores pueden generar reportes
      if (usuario.rol === 'cliente') {
        req.flash('error', 'No tienes permiso para acceder a esta sección');
        return res.redirect('/dashboard');
      }
      
      // Construir filtros
      const filtros = {};
      
      if (fechaInicio && fechaFin) {
        filtros.fechaSolicitud = {
          [Op.between]: [
            moment(fechaInicio).startOf('day').toDate(),
            moment(fechaFin).endOf('day').toDate()
          ]
        };
      } else if (fechaInicio) {
        filtros.fechaSolicitud = {
          [Op.gte]: moment(fechaInicio).startOf('day').toDate()
        };
      } else if (fechaFin) {
        filtros.fechaSolicitud = {
          [Op.lte]: moment(fechaFin).endOf('day').toDate()
        };
      }
      
      if (estado && estado !== 'todos') {
        filtros.estado = estado;
      }
      
      if (clienteId && clienteId !== 'todos') {
        filtros.clienteId = clienteId;
      }
      
      // Obtener solicitudes según filtros
      const solicitudes = await SolicitudRetiro.findAll({
        where: filtros,
        include: [
          { model: Cliente }
        ],
        order: [['fechaSolicitud', 'DESC']]
      });
      
      // Obtener lista de clientes para el filtro
      const clientes = await Cliente.findAll({
        order: [['nombreEmpresa', 'ASC']]
      });
      
      res.render('reportes/solicitudes', {
        titulo: 'Reporte de Solicitudes',
        solicitudes,
        clientes,
        filtros: {
          fechaInicio: fechaInicio || '',
          fechaFin: fechaFin || '',
          estado: estado || 'todos',
          clienteId: clienteId || 'todos'
        },
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      req.flash('error', 'Error al generar el reporte');
      res.redirect('/reportes/dashboard');
    }
  },
  
  // Generar reporte de visitas
  reporteVisitas: async (req, res) => {
    try {
      const { fechaInicio, fechaFin, estado, operadorId } = req.query;
      const { usuario } = req.session;
      
      // Solo admin y operadores pueden generar reportes
      if (usuario.rol === 'cliente') {
        req.flash('error', 'No tienes permiso para acceder a esta sección');
        return res.redirect('/dashboard');
      }
      
      // Construir filtros
      const filtros = {};
      
      if (fechaInicio && fechaFin) {
        filtros.fechaProgramada = {
          [Op.between]: [
            moment(fechaInicio).startOf('day').toDate(),
            moment(fechaFin).endOf('day').toDate()
          ]
        };
      } else if (fechaInicio) {
        filtros.fechaProgramada = {
          [Op.gte]: moment(fechaInicio).startOf('day').toDate()
        };
      } else if (fechaFin) {
        filtros.fechaProgramada = {
          [Op.lte]: moment(fechaFin).endOf('day').toDate()
        };
      }
      
      if (estado && estado !== 'todos') {
        filtros.estado = estado;
      }
      
      if (operadorId && operadorId !== 'todos') {
        filtros.operadorId = operadorId;
      }
      
      // Obtener visitas según filtros
      const visitas = await VisitaRetiro.findAll({
        where: filtros,
        include: [
          { 
            model: SolicitudRetiro,
            include: [{ model: Cliente }]
          },
          {
            model: Usuario,
            as: 'Operador'
          }
        ],
        order: [['fechaProgramada', 'DESC']]
      });
      
      // Obtener lista de operadores para el filtro
      const operadores = await Usuario.findAll({
        where: { rol: 'operador' },
        order: [['nombre', 'ASC']]
      });
      
      res.render('reportes/visitas', {
        titulo: 'Reporte de Visitas',
        visitas,
        operadores,
        filtros: {
          fechaInicio: fechaInicio || '',
          fechaFin: fechaFin || '',
          estado: estado || 'todos',
          operadorId: operadorId || 'todos'
        },
        usuario,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      req.flash('error', 'Error al generar el reporte');
      res.redirect('/reportes/dashboard');
    }
  },
  
  // Exportar reporte a Excel
  exportarExcel: async (req, res) => {
    try {
      const { tipo, fechaInicio, fechaFin, estado, filtroId } = req.query;
      const { usuario } = req.session;
      
      // Solo admin y operadores pueden exportar reportes
      if (usuario.rol === 'cliente') {
        return res.status(403).json({
          success: false,
          mensaje: 'No tienes permiso para exportar reportes'
        });
      }
      
      // Construir filtros base según tipo
      let filtros = {};
      let incluir = [];
      let datos = [];
      let nombreArchivo = '';
      let hojas = [];
      
      // Fechas
      if (fechaInicio && fechaFin) {
        const campFecha = tipo === 'solicitudes' ? 'fechaSolicitud' : 'fechaProgramada';
        filtros[campFecha] = {
          [Op.between]: [
            moment(fechaInicio).startOf('day').toDate(),
            moment(fechaFin).endOf('day').toDate()
          ]
        };
      }
      
      // Estado
      if (estado && estado !== 'todos') {
        filtros.estado = estado;
      }
      
      // Configurar según tipo de reporte
      if (tipo === 'solicitudes') {
        // Filtro por cliente
        if (filtroId && filtroId !== 'todos') {
          filtros.clienteId = filtroId;
        }
        
        incluir = [{ model: Cliente }];
        nombreArchivo = 'Reporte_Solicitudes';
        
        // Obtener datos
        datos = await SolicitudRetiro.findAll({
          where: filtros,
          include: incluir,
          order: [['fechaSolicitud', 'DESC']]
        });
        
        // Configurar hojas
        hojas = [
          {
            nombre: 'Solicitudes',
            encabezados: [
              'ID', 'Cliente', 'Fecha Solicitud', 'Fecha Retiro', 'Dirección',
              'Contacto', 'Teléfono', 'Estado', 'Observaciones'
            ],
            datos: datos.map(s => [
              s.id,
              s.Cliente ? s.Cliente.nombreEmpresa : 'N/A',
              moment(s.fechaSolicitud).format('DD/MM/YYYY'),
              moment(s.fechaRetiroSolicitada).format('DD/MM/YYYY'),
              s.direccionRetiro,
              s.contactoNombre,
              s.contactoTelefono,
              s.estado,
              s.observaciones || ''
            ])
          }
        ];
      } else if (tipo === 'visitas') {
        // Filtro por operador
        if (filtroId && filtroId !== 'todos') {
          filtros.operadorId = filtroId;
        }
        
        incluir = [
          { 
            model: SolicitudRetiro,
            include: [{ model: Cliente }]
          },
          {
            model: Usuario,
            as: 'Operador'
          }
        ];
        nombreArchivo = 'Reporte_Visitas';
        
        // Obtener datos
        datos = await VisitaRetiro.findAll({
          where: filtros,
          include: incluir,
          order: [['fechaProgramada', 'DESC']]
        });
        
        // Configurar hojas
        hojas = [
          {
            nombre: 'Visitas',
            encabezados: [
              'ID', 'Cliente', 'Operador', 'Fecha Programada', 'Hora Inicio',
              'Hora Fin', 'Estado', 'Dirección', 'Observaciones'
            ],
            datos: datos.map(v => [
              v.id,
              v.SolicitudRetiro && v.SolicitudRetiro.Cliente ? v.SolicitudRetiro.Cliente.nombreEmpresa : 'N/A',
              v.Operador ? v.Operador.nombre : 'Sin asignar',
              moment(v.fechaProgramada).format('DD/MM/YYYY'),
              moment(v.horaInicio, 'HH:mm:ss').format('HH:mm'),
              moment(v.horaFin, 'HH:mm:ss').format('HH:mm'),
              v.estado,
              v.SolicitudRetiro ? v.SolicitudRetiro.direccionRetiro : 'N/A',
              v.observaciones || ''
            ])
          }
        ];
      } else {
        return res.status(400).json({
          success: false,
          mensaje: 'Tipo de reporte no válido'
        });
      }
      
      // Agregar fechas al nombre del archivo
      if (fechaInicio && fechaFin) {
        nombreArchivo += `_${moment(fechaInicio).format('YYYYMMDD')}_${moment(fechaFin).format('YYYYMMDD')}`;
      } else {
        nombreArchivo += `_${moment().format('YYYYMMDD')}`;
      }
      
      // Crear el libro de Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Felmart';
      workbook.created = new Date();
      
      // Configurar cada hoja
      for (const hoja of hojas) {
        const worksheet = workbook.addWorksheet(hoja.nombre);
        
        // Agregar encabezados
        const headerRow = worksheet.addRow(hoja.encabezados);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4A7C59' },
          bgColor: { argb: '4A7C59' }
        };
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        
        // Agregar datos
        for (const fila of hoja.datos) {
          worksheet.addRow(fila);
        }
        
        // Ajustar anchos de columna
        worksheet.columns.forEach(column => {
          column.width = 15;
        });
      }
      
      // Crear directorio si no existe
      const directorioDestino = path.join(__dirname, '..', 'public', 'uploads', 'reportes');
      if (!fs.existsSync(directorioDestino)) {
        fs.mkdirSync(directorioDestino, { recursive: true });
      }
      
      // Ruta del archivo Excel
      const rutaArchivo = path.join(directorioDestino, `${nombreArchivo}.xlsx`);
      
      // Guardar en disco
      await workbook.xlsx.writeFile(rutaArchivo);
      
      // Enviar la URL del archivo al cliente
      res.json({
        success: true,
        url: `/uploads/reportes/${nombreArchivo}.xlsx`
      });
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      res.status(500).json({
        success: false,
        mensaje: 'Error al exportar el reporte'
      });
    }
  }
};

module.exports = reporteController;