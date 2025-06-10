const Cotizacion = require('../models/Cotizacion');
const SolicitudRetiro = require('../models/SolicitudRetiro');
const Cliente = require('../models/Cliente');
const sequelize = require('../config/database');

async function actualizarCotizacionesAntiguas() {
  const cotizaciones = await Cotizacion.findAll();

  for (const cotizacion of cotizaciones) {
    let detallesObj = {};
    try {
      detallesObj = JSON.parse(cotizacion.detallesJson || '{}');
    } catch (e) {
      detallesObj = {};
    }

    // Si ya tiene datosContacto, saltar
    if (detallesObj.datosContacto) continue;

    // Buscar cliente por solicitudRetiroId
    let datosContacto = null;
    if (cotizacion.solicitudRetiroId) {
      const solicitud = await SolicitudRetiro.findByPk(cotizacion.solicitudRetiroId, {
        include: [{ model: Cliente }]
      });
      if (solicitud && solicitud.Cliente) {
        const cliente = solicitud.Cliente;
        datosContacto = {
          nombre: cliente.nombre || '',
          rut: cliente.rut || '',
          correo: cliente.email || '',
          telefono: cliente.telefono || '',
          empresa: cliente.empresa || '',
          direccion: cliente.direccion || '',
          comuna: cliente.comuna || ''
        };
      }
    }

    // Si no hay datos de contacto, saltar
    if (!datosContacto) continue;

    // Agregar datosContacto al JSON y guardar
    detallesObj.datosContacto = datosContacto;
    cotizacion.detallesJson = JSON.stringify(detallesObj);
    await cotizacion.save();
    console.log(`Cotización ${cotizacion.id} actualizada con datos de contacto.`);
  }

  console.log('¡Cotizaciones antiguas actualizadas!');
  await sequelize.close();
}

actualizarCotizacionesAntiguas(); 