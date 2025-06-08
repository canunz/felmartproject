const PrecioResiduo = require('../models/PrecioResiduo');
const Cotizacion = require('../models/Cotizacion');
const { transporter } = require('../config/email.config');
require('dotenv').config();

/**
 * Controlador para la gestión de la Unidad de Fomento (UF)
 */
const UFController = {
  /**
   * Muestra el formulario para configurar el valor de la UF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarFormularioUF: (req, res) => {
    const config = PrecioResiduo.getConfiguracionUF();
    res.render('admin/uf', {
      title: 'Configurar Valor UF',
      config,
      hoy: new Date()
    });
  },

  /**
   * Actualiza el valor manual de la UF
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  actualizarUF: async (req, res) => {
    const { valorUF } = req.body;
    PrecioResiduo.actualizarUFManual(parseFloat(valorUF));
    res.redirect('/admin/uf?success=true');
  }
};

/**
 * Controlador principal para la gestión de precios de residuos
 */
module.exports = {
  // Exporta el controlador UF
  ...UFController,

  /**
   * Muestra la vista principal de administración de residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarAdmin: async (req, res) => {
    try {
      const precios = await PrecioResiduo.findAll();
      res.render('admin/residuos', {
        title: 'Administrar Residuos',
        titulo: 'Administrar Residuos',
        precios,
        messages: {
          error: req.flash('error'),
          success: req.flash('success')
        }
      });
    } catch (e) {
      req.flash('error', 'Error al cargar los residuos');
      res.redirect('/dashboard');
    }
  },

  /**
   * Elimina uno o múltiples residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  eliminarResiduos: async (req, res) => {
    const { id, seleccionados } = req.body;
    try {
      if (id) {
        await PrecioResiduo.destroy({ where: { id } });
      } else if (seleccionados && seleccionados.length) {
        await PrecioResiduo.destroy({ where: { id: seleccionados } });
      }
      req.flash('success', 'Residuo(s) eliminado(s) correctamente');
    } catch (e) {
      req.flash('error', 'Error al eliminar el residuo');
    }
    res.redirect('/admin/residuos');
  },

  /**
   * Muestra la lista completa de precios de residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  listarPrecios: (req, res) => {
    const precios = PrecioResiduo.obtenerTodos();
    res.render('residuos/listar', { 
      title: 'Lista de Precios de Residuos',
      precios 
    });
  },

  /**
   * Muestra el formulario de cotización
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  mostrarFormularioCotizacion: async (req, res) => {
    try {
      const precios = await PrecioResiduo.findAll();
      res.render('cotizaciones/cotizar', {
        title: 'Cotizar Residuos',
        titulo: 'Cotizar Residuos',
        precios
      });
    } catch (e) {
      req.flash('error', 'Error al cargar los residuos');
      res.redirect('/dashboard');
    }
  },

  /**
   * Calcula la cotización de residuos
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  calcularCotizacion: async (req, res) => {
    const { residuoId, cantidad } = req.body;
    const residuo = PrecioResiduo.buscarPorId(parseInt(residuoId));

    if (!residuo) {
      return res.status(404).render('error', { 
        titulo: 'Error',
        mensaje: 'Residuo no encontrado' 
      });
    }

    let valorUF = null, total;
    // Obtener valor UF desde CMF si corresponde
    if (residuo.moneda === 'UF') {
      try {
        const cmfService = require('../services/cmfBancosService');
        valorUF = await cmfService.obtenerValorUF();
        total = valorUF * residuo.precio * cantidad;
      } catch (e) {
        valorUF = await PrecioResiduo.obtenerValorUF(); // fallback local
        total = valorUF * residuo.precio * cantidad;
      }
    } else {
      total = residuo.precio * cantidad;
    }

    res.render('cotizaciones/resultado', {
      residuo,
      cantidad,
      total: Math.round(total),
      valorUF: valorUF ? Math.round(valorUF) : null,
      titulo: 'Resultado de Cotización'
    });
  },

  /**
   * Cotiza residuos de manera avanzada
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  cotizarAvanzado: async (req, res) => {
    try {
      const {
        nombre, rut, correo, telefono, esEmpresa,
        nombreEmpresa, rutEmpresa, residuosCotizados
      } = req.body;

      const residuos = JSON.parse(residuosCotizados);
      let total = 0;
      let detalles = [];

      for (let r of residuos) {
        let valorUF = null;
        let precioUnitario = r.precio;
        let subtotal = 0;

        if (r.moneda === 'UF') {
          try {
            valorUF = await require('../services/cmfBancosService').obtenerValorUF();
          } catch (e) {
            valorUF = await PrecioResiduo.obtenerValorUF();
          }
          precioUnitario = valorUF * r.precio;
        }
        subtotal = precioUnitario * r.cantidad;
        total += subtotal;

        detalles.push({
          ...r,
          precioUnitario: precioUnitario,
          subtotal: subtotal,
          valorUF: r.moneda === 'UF' ? valorUF : null
        });
      }

      // Generar HTML de la cotización
      let htmlCotizacion = `
        <h2>Cotización de Residuos</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>RUT:</strong> ${rut}</p>
        <p><strong>Correo:</strong> ${correo}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        ${esEmpresa === 'si' ? `<p><strong>Empresa:</strong> ${nombreEmpresa} (${rutEmpresa})</p>` : ''}
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Unidad</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.map(d => `
              <tr>
                <td>${d.descripcion}</td>
                <td>${d.unidad}</td>
                <td>${d.cantidad}</td>
                <td>${d.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}${d.moneda === 'UF' ? ` (UF: ${d.valorUF ? d.valorUF.toLocaleString('es-CL') : ''})` : ''}</td>
                <td>${d.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" style="text-align:right;">Total</th>
              <th>${total.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</th>
            </tr>
          </tfoot>
        </table>
      `;

      // Envía el correo al usuario
      await transporter.sendMail({
        from: `"Felmart" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Tu cotización de residuos',
        html: htmlCotizacion
      });

      // Notifica al administrador
      await transporter.sendMail({
        from: `"Felmart" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: 'Nueva cotización solicitada',
        html: `<p>Se ha solicitado una nueva cotización:</p>${htmlCotizacion}`
      });

      // Renderiza la vista de resultado con el resumen
      res.render('cotizaciones/resultado', {
        detalles,
        total: Math.round(total),
        nombre,
        rut,
        correo,
        titulo: 'Resultado de Cotización'
      });
    } catch (error) {
      console.error('Error en cotizarAvanzado:', error);
      res.status(500).send('Error al procesar la cotización');
    }
  },

  /**
   * Procesa la cotización avanzada (varios residuos, datos de contacto, correo)
   */
  calcularCotizacionAvanzada: async (req, res) => {
    try {
      const {
        nombre, rut, correo, telefono, esEmpresa,
        nombreEmpresa, rutEmpresa, residuosCotizados,
        direccion, comuna, ciudad
      } = req.body;

      // Validar datos requeridos
      if (!nombre || !rut || !correo || !telefono) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Todos los campos de contacto son obligatorios'
        });
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'El formato del correo electrónico no es válido'
        });
      }

      // Validar RUT chileno (formato básico)
      const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}[-][0-9kK]{1}$/;
      if (!rutRegex.test(rut)) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'El formato del RUT no es válido (ejemplo: 12.345.678-9)'
        });
      }

      // Validar datos de empresa si es empresa
      if (esEmpresa === 'si' && (!nombreEmpresa || !rutEmpresa)) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Si es empresa, debe completar los datos de la empresa'
        });
      }

      // Validar que haya residuos cotizados
      if (!residuosCotizados) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Debe agregar al menos un residuo a la cotización'
        });
      }

      const residuos = JSON.parse(residuosCotizados);
      if (!Array.isArray(residuos) || residuos.length === 0) {
        return res.status(400).render('error', {
          titulo: 'Error',
          mensaje: 'Debe agregar al menos un residuo a la cotización'
        });
      }

      let total = 0;
      let detalles = [];
      for (let r of residuos) {
        let valorUF = null;
        let precioUnitario = r.precio;
        let subtotal = 0;
        if (r.moneda === 'UF') {
          try {
            valorUF = await require('../services/cmfBancosService').obtenerValorUF();
          } catch (e) {
            valorUF = await PrecioResiduo.obtenerValorUF();
          }
          precioUnitario = valorUF * r.precio;
        }
        subtotal = precioUnitario * r.cantidad;
        total += subtotal;
        detalles.push({
          ...r,
          precioUnitario: precioUnitario,
          subtotal: subtotal,
          valorUF: r.moneda === 'UF' ? valorUF : null
        });
      }
      const numeroCotizacion = 'COT-' + Date.now();
      const neto = parseFloat(total.toFixed(1));
      const iva = parseFloat((neto * 0.19).toFixed(1));
      const totalFinal = parseFloat((neto + iva).toFixed(1));
      // Guardar la cotización principal con los detalles en JSON, incluyendo dirección, comuna y ciudad
      const cotizacion = await Cotizacion.create({
        numeroCotizacion,
        fechaCotizacion: new Date(),
        subtotal: neto,
        iva: iva,
        total: totalFinal,
        estado: 'pendiente',
        observaciones: `Contacto: ${nombre}, Rut: ${rut}, Correo: ${correo}, Teléfono: ${telefono}` +
          (esEmpresa === 'si' ? `, Empresa: ${nombreEmpresa} (${rutEmpresa})` : ''),
        detallesJson: JSON.stringify({
          datosContacto: {
            nombre,
            rut,
            correo,
            telefono,
            esEmpresa,
            nombreEmpresa,
            rutEmpresa
          },
          direccion: direccion || '',
          comuna: comuna || '',
          ciudad: ciudad || '',
          residuos: detalles
        })
      });
      // Enviar correo
      let htmlCotizacion = `
        <h2>Cotización de Residuos N° ${numeroCotizacion}</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>RUT:</strong> ${rut}</p>
        <p><strong>Correo:</strong> ${correo}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        ${esEmpresa === 'si' ? `<p><strong>Empresa:</strong> ${nombreEmpresa} (${rutEmpresa})</p>` : ''}
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${detalles.map(d => `
              <tr>
                <td>${d.cantidad}</td>
                <td>${d.descripcion}</td>
                <td>${d.unidad}</td>
                <td>${d.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}${d.moneda === 'UF' ? ` (UF: ${d.valorUF ? d.valorUF.toLocaleString('es-CL') : ''})` : ''}</td>
                <td>${d.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" style="text-align:right;">Neto</th>
              <th>${neto.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</th>
            </tr>
            <tr>
              <th colspan="4" style="text-align:right;">IVA (19%)</th>
              <th>${iva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</th>
            </tr>
            <tr>
              <th colspan="4" style="text-align:right;">Total</th>
              <th>${totalFinal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</th>
            </tr>
          </tfoot>
        </table>
        <p><strong>Nota:</strong> Al valor del desecho se le debe agregar un costo operativo por kilómetro recorrido.</p>
      `;
      await transporter.sendMail({
        from: `"Felmart" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: `Tu cotización de residuos N° ${numeroCotizacion}`,
        html: htmlCotizacion
      });

      await transporter.sendMail({
        from: `"Felmart" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `Nueva cotización solicitada N° ${numeroCotizacion}`,
        html: `<p>Se ha solicitado una nueva cotización:</p>${htmlCotizacion}`
      });

      res.render('cotizaciones/resultado', {
        detalles,
        total: totalFinal,
        neto,
        iva,
        numeroCotizacion,
        nombre,
        rut,
        correo,
        telefono,
        esEmpresa,
        nombreEmpresa,
        rutEmpresa,
        direccion,
        comuna,
        ciudad,
        titulo: 'Resultado de Cotización'
      });
    } catch (error) {
      console.error('Error en calcularCotizacionAvanzada:', error);
      res.status(500).render('error', { 
        titulo: 'Error', 
        mensaje: 'Error al procesar la cotización' 
      });
    }
  },

  /**
   * Crear un nuevo residuo
   */
  crearResiduo: async (req, res) => {
    const { descripcion, precio, unidad, moneda } = req.body;
    if (!descripcion || !precio || !unidad || !moneda) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/residuos');
    }
    try {
      await PrecioResiduo.create({ descripcion, precio, unidad, moneda });
      req.flash('success', 'Residuo creado correctamente');
    } catch (e) {
      req.flash('error', 'Error al crear el residuo');
    }
    res.redirect('/admin/residuos');
  },

  /**
   * Editar un residuo existente
   */
  editarResiduo: async (req, res) => {
    const { id } = req.params;
    const { descripcion, precio, unidad, moneda } = req.body;
    if (!descripcion || !precio || !unidad || !moneda) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/admin/residuos');
    }
    try {
      const [updated] = await PrecioResiduo.update(
        { descripcion, precio, unidad, moneda },
        { where: { id } }
      );
      if (updated) {
        req.flash('success', 'Residuo actualizado correctamente');
      } else {
        req.flash('error', 'Residuo no encontrado');
      }
    } catch (e) {
      req.flash('error', 'Error al actualizar el residuo');
    }
    res.redirect('/admin/residuos');
  },
};