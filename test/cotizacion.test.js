const { expect } = require('chai');
const Cotizacion = require('../models/Cotizacion');
const sequelize = require('../config/database');

describe('Modelo Cotizacion', () => {
  before(async () => {
    await sequelize.sync();
  });

  it('debería crear y recuperar una cotización correctamente', async () => {
    const datos = {
      numeroCotizacion: 'COT-TEST-001',
      fechaCotizacion: new Date(),
      subtotal: 1000,
      iva: 190,
      total: 1190,
      estado: 'pendiente',
      observaciones: 'Test cotización',
      detallesJson: JSON.stringify({ test: true })
    };
    const cot = await Cotizacion.create(datos);
    expect(cot.numeroCotizacion).to.equal('COT-TEST-001');
    const found = await Cotizacion.findOne({ where: { numeroCotizacion: 'COT-TEST-001' } });
    expect(found).to.not.be.null;
    expect(found.total).to.equal('1190.00');
    expect(JSON.parse(found.detallesJson).test).to.be.true;
  });
}); 