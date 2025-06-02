const { Usuario, Cliente, SolicitudRetiro, VisitaRetiro } = require('../models');
const bcrypt = require('bcrypt');

async function seedData() {
  try {
    // Crear usuario administrador
    const adminUser = await Usuario.create({
      nombre: 'Fanny Andreina',
      email: 'fanny.andreina1@gmail.com',
      password: 'prueba123',
      rol: 'administrador',
      activo: true
    });

    // Crear 10 clientes
    const clientes = [];
    for (let i = 1; i <= 10; i++) {
      const cliente = await Cliente.create({
        rut: `2${i}${i}${i}${i}${i}${i}${i}${i}-${i}`,
        nombreEmpresa: `Empresa ${i}`,
        direccion: `Calle Principal ${i}`,
        comuna: `Comuna ${i}`,
        ciudad: 'Santiago',
        telefono: `+569${i}${i}${i}${i}${i}${i}${i}${i}`,
        email: `empresa${i}@example.com`,
        contactoPrincipal: `Contacto ${i}`,
        usuarioId: adminUser.id
      });
      clientes.push(cliente);
    }

    // Crear 7 solicitudes de retiro
    const solicitudes = [];
    for (let i = 1; i <= 7; i++) {
      const solicitud = await SolicitudRetiro.create({
        clienteId: clientes[i-1].id,
        fechaSolicitud: new Date(),
        fechaRetiroSolicitada: new Date(),
        direccionRetiro: `Dirección de Retiro ${i}`,
        contactoNombre: `Contacto Retiro ${i}`,
        contactoTelefono: `+569${i}${i}${i}${i}${i}${i}${i}${i}`,
        estado: i <= 4 ? 'programada' : 'completada',
        observaciones: `Observaciones para solicitud ${i}`
      });
      solicitudes.push(solicitud);
    }

    // Crear visitas (7 programadas para hoy y 3 completadas)
    const fechaHoy = new Date();
    
    // 7 visitas programadas
    for (let i = 1; i <= 7; i++) {
      await VisitaRetiro.create({
        solicitudRetiroId: solicitudes[i-1].id,
        operadorId: adminUser.id,
        fechaProgramada: fechaHoy,
        horaInicio: '09:00:00',
        horaFin: '10:00:00',
        estado: 'programada',
        observaciones: `Visita programada ${i}`
      });
    }

    // 3 visitas completadas (usando las últimas 3 solicitudes)
    for (let i = 5; i <= 7; i++) {
      await VisitaRetiro.create({
        solicitudRetiroId: solicitudes[i-1].id,
        operadorId: adminUser.id,
        fechaProgramada: fechaHoy,
        horaInicio: '14:00:00',
        horaFin: '15:00:00',
        estado: 'completada',
        observaciones: `Visita completada ${i}`
      });
    }

    console.log('Datos de demostración creados exitosamente');
  } catch (error) {
    console.error('Error al crear datos de demostración:', error);
  }
}

module.exports = seedData; 