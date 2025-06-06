import { expect } from 'chai';
import Cotizacion from '../models/Cotizacion.js';
import sequelize from '../config/database.js';

describe('Modelo Cotizacion', () => {
  before(async () => {
    await sequelize.sync();
  });

  it('debería crear y recuperar una cotización correctamente', async () => {
    const detalles = {
      test: true,
      cliente: {
        nombre: 'Juan Pérez',
        rut: '12.345.678-9',
        correo: 'juan@correo.com',
        telefono: '123456789',
        empresa: 'Empresa Inventada',
        residuos: [
          { descripcion: 'Aceite', cantidad: 2, unidad: 'L', precio: 1000 },
          { descripcion: 'Papel', cantidad: 5, unidad: 'kg', precio: 200 }
        ]
      },
      direccion: 'Calle Falsa 123',
      comuna: 'Inventada',
      ciudad: 'Ciudad Ficticia'
    };
    const datos = {
      numeroCotizacion: 'COT-TEST-001',
      fechaCotizacion: new Date(),
      subtotal: 1000,
      iva: 190,
      total: 1190,
      estado: 'pendiente',
      observaciones: 'Test cotización',
      detallesJson: JSON.stringify(detalles)
    };
    const cot = await Cotizacion.create(datos);
    expect(cot.numeroCotizacion).to.equal('COT-TEST-001');
    const found = await Cotizacion.findOne({ where: { numeroCotizacion: 'COT-TEST-001' } });
    expect(found).to.not.be.null;
    expect(found.total).to.equal('1190.00');
    const parsed = JSON.parse(found.detallesJson);
    expect(parsed.test).to.be.true;
    expect(parsed.cliente.nombre).to.equal('Juan Pérez');
    expect(parsed.cliente.residuos).to.have.lengthOf(2);
    expect(parsed.direccion).to.equal('Calle Falsa 123');
  });
}); 