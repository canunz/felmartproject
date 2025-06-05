const assert = require('assert');
const PrecioResiduo = require('../models/PrecioResiduo');

describe('CRUD de PrecioResiduo (Sequelize/DB)', function() {
  let idCreado;

  // Limpiar residuos de test antes y después
  before(async () => {
    await PrecioResiduo.destroy({ where: { descripcion: 'TEST_RESIDUO' } });
    await PrecioResiduo.destroy({ where: { descripcion: 'RESIDUO_EDITADO' } });
  });
  after(async () => {
    await PrecioResiduo.destroy({ where: { descripcion: 'TEST_RESIDUO' } });
    await PrecioResiduo.destroy({ where: { descripcion: 'RESIDUO_EDITADO' } });
  });

  it('Debe crear un residuo', async function() {
    const nuevo = await PrecioResiduo.create({
      descripcion: 'TEST_RESIDUO',
      precio: 123.45,
      unidad: 'IBC',
      moneda: 'UF'
    });
    idCreado = nuevo.id;
    assert.ok(nuevo.id, 'Debe tener un id');
    assert.strictEqual(nuevo.descripcion, 'TEST_RESIDUO');
  });

  it('Debe leer el residuo creado', async function() {
    const residuo = await PrecioResiduo.findByPk(idCreado);
    assert.ok(residuo, 'Debe encontrar el residuo');
    assert.strictEqual(residuo.descripcion, 'TEST_RESIDUO');
  });

  it('Debe actualizar el residuo', async function() {
    const [updated] = await PrecioResiduo.update({
      descripcion: 'RESIDUO_EDITADO',
      precio: 999,
      unidad: 'TAMBOR',
      moneda: 'CLP'
    }, { where: { id: idCreado } });
    assert.strictEqual(updated, 1, 'Debe actualizar un registro');
    const actualizado = await PrecioResiduo.findByPk(idCreado);
    assert.strictEqual(actualizado.descripcion, 'RESIDUO_EDITADO');
    assert.strictEqual(Number(actualizado.precio), 999);
    assert.strictEqual(actualizado.unidad, 'TAMBOR');
    assert.strictEqual(actualizado.moneda, 'CLP');
  });

  it('Debe eliminar el residuo', async function() {
    const deleted = await PrecioResiduo.destroy({ where: { id: idCreado } });
    assert.strictEqual(deleted, 1, 'Debe eliminar un registro');
    const residuo = await PrecioResiduo.findByPk(idCreado);
    assert.strictEqual(residuo, null, 'Ya no debe existir el residuo');
  });
}); 