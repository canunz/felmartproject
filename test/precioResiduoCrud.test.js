const assert = require('assert');
const PrecioResiduo = require('../models/PrecioResiduo');

describe('CRUD de PrecioResiduo (memoria)', function() {
  let idCreado;

  it('Debe crear un residuo', function() {
    const nuevo = PrecioResiduo.agregarResiduo({
      descripcion: 'TEST_RESIDUO',
      precio: 123.45,
      unidad: 'IBC',
      moneda: 'UF'
    });
    idCreado = nuevo.id;
    assert.ok(nuevo.id, 'Debe tener un id');
    assert.strictEqual(nuevo.descripcion, 'TEST_RESIDUO');
  });

  it('Debe leer el residuo creado', function() {
    const residuo = PrecioResiduo.buscarPorId(idCreado);
    assert.ok(residuo, 'Debe encontrar el residuo');
    assert.strictEqual(residuo.descripcion, 'TEST_RESIDUO');
  });

  it('Debe actualizar el residuo', function() {
    const actualizado = PrecioResiduo.actualizarResiduo(idCreado, {
      descripcion: 'RESIDUO_EDITADO',
      precio: 999,
      unidad: 'TAMBOR',
      moneda: 'CLP'
    });
    assert.ok(actualizado, 'Debe devolver el residuo actualizado');
    assert.strictEqual(actualizado.descripcion, 'RESIDUO_EDITADO');
    assert.strictEqual(actualizado.precio, 999);
    assert.strictEqual(actualizado.unidad, 'TAMBOR');
    assert.strictEqual(actualizado.moneda, 'CLP');
  });

  it('Debe eliminar el residuo', function() {
    const eliminado = PrecioResiduo.eliminarResiduo(idCreado);
    assert.ok(eliminado, 'Debe devolver true al eliminar');
    const residuo = PrecioResiduo.buscarPorId(idCreado);
    assert.strictEqual(residuo, undefined, 'Ya no debe existir el residuo');
  });
}); 