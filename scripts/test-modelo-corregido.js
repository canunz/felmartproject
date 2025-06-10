// scripts/test-modelo-corregido.js
// Script para probar el modelo corregido

const { Cotizacion } = require('../models');
const sequelize = require('../config/database');

async function testModeloCorregido() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n📊 PROBANDO MODELO CORREGIDO...');
    
    // 1. Contar registros
    const count = await Cotizacion.count();
    console.log(`📈 Total de cotizaciones: ${count}`);

    // 2. Obtener todas las cotizaciones
    const cotizaciones = await Cotizacion.findAll({
      order: [['id', 'DESC']],
      limit: 5
    });
    
    console.log(`\n📋 Últimas 5 cotizaciones encontradas: ${cotizaciones.length}`);
    
    if (cotizaciones.length > 0) {
      console.log('\n📄 DETALLES DE LAS COTIZACIONES:');
      cotizaciones.forEach((cot, index) => {
        console.log(`\n${index + 1}. Cotización ID: ${cot.id}`);
        console.log(`   📄 Número: ${cot.numeroCotizacion || 'No definido'}`);
        console.log(`   📅 Fecha: ${cot.fechaCotizacion ? new Date(cot.fechaCotizacion).toLocaleDateString() : 'No definida'}`);
        console.log(`   💰 Total: $${cot.total || '0.00'}`);
        console.log(`   📊 Estado: ${cot.estado || 'No definido'}`);
        console.log(`   👤 Cliente: ${cot.clienteNombre || 'No definido'}`);
        console.log(`   📧 Email: ${cot.clienteEmail || 'No definido'}`);
        console.log(`   📱 Teléfono: ${cot.clienteTelefono || 'No definido'}`);
        console.log(`   🗒️ Observaciones: ${cot.observaciones || 'Ninguna'}`);
      });
    }

    // 3. Buscar por ID específico
    console.log('\n🔍 BUSCANDO COTIZACIÓN ID 1...');
    const cotizacion1 = await Cotizacion.findByPk(1);
    
    if (cotizacion1) {
      console.log('✅ Cotización ID 1 encontrada:');
      console.log(`   📄 Número: ${cotizacion1.numeroCotizacion}`);
      console.log(`   👤 Cliente: ${cotizacion1.clienteNombre}`);
      console.log(`   📧 Email: ${cotizacion1.clienteEmail}`);
      console.log(`   💰 Total: $${cotizacion1.total}`);
    } else {
      console.log('❌ No se encontró cotización con ID 1');
    }

    // 4. Probar consulta con filtros
    console.log('\n🔍 BUSCANDO COTIZACIONES PENDIENTES...');
    const pendientes = await Cotizacion.findAll({
      where: { estado: 'pendiente' },
      limit: 3
    });
    
    console.log(`📊 Cotizaciones pendientes: ${pendientes.length}`);

    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('✅ El modelo está funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('🔍 Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar la prueba
testModeloCorregido();