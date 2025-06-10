// scripts/test-modelo-final.js
// Prueba final del modelo corregido

const sequelize = require('../config/database');

async function testModeloFinal() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // 1. VERIFICAR ESTRUCTURA REAL DE LA BD
    console.log('🔍 1. VERIFICANDO ESTRUCTURA REAL...');
    const [columns] = await sequelize.query(`DESCRIBE cotizaciones;`);
    
    console.log('📋 Columnas en la BD:');
    columns.forEach(col => {
      console.log(`   ✓ ${col.Field} (${col.Type})`);
    });

    // 2. CONTAR REGISTROS CON SQL DIRECTO
    console.log('\n📊 2. CONTANDO REGISTROS CON SQL DIRECTO...');
    const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM cotizaciones;`);
    console.log(`📈 Total de registros: ${countResult[0].total}`);

    // 3. MOSTRAR REGISTROS EXISTENTES
    if (countResult[0].total > 0) {
      console.log('\n📄 3. MOSTRANDO REGISTROS EXISTENTES...');
      const [rows] = await sequelize.query(`
        SELECT id, numero_cotizacion, fecha_cotizacion, total, estado, 
               cliente_nombre, cliente_email, createdAt
        FROM cotizaciones 
        ORDER BY id DESC;
      `);
      
      rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. ID: ${row.id}`);
        console.log(`      📄 Número: ${row.numero_cotizacion}`);
        console.log(`      💰 Total: $${row.total}`);
        console.log(`      📊 Estado: ${row.estado}`);
        console.log(`      👤 Cliente: ${row.cliente_nombre || 'Sin cliente'}`);
        console.log(`      📧 Email: ${row.cliente_email || 'Sin email'}`);
      });
    }

    // 4. PROBAR EL MODELO CORREGIDO
    console.log('\n🔍 4. PROBANDO MODELO CORREGIDO...');
    const Cotizacion = require('../models/Cotizacion');
    
    console.log('✅ Modelo importado exitosamente');
    
    // Contar con Sequelize
    const sequelizeCount = await Cotizacion.count();
    console.log(`📊 Sequelize count: ${sequelizeCount}`);
    
    // Obtener todas las cotizaciones
    const cotizaciones = await Cotizacion.findAll({
      order: [['id', 'DESC']]
    });
    
    console.log(`📋 Sequelize findAll: ${cotizaciones.length} registros`);
    
    if (cotizaciones.length > 0) {
      console.log('\n📄 COTIZACIONES ENCONTRADAS CON SEQUELIZE:');
      cotizaciones.forEach((cot, index) => {
        console.log(`\n   ${index + 1}. ID: ${cot.id}`);
        console.log(`      📄 Número: ${cot.numero_cotizacion} / ${cot.numeroCotizacion}`);
        console.log(`      💰 Total: $${cot.total}`);
        console.log(`      📊 Estado: ${cot.estado}`);
        console.log(`      👤 Cliente: ${cot.cliente_nombre} / ${cot.clienteNombre}`);
        console.log(`      📧 Email: ${cot.cliente_email} / ${cot.clienteEmail}`);
        console.log(`      📅 Fecha: ${cot.fecha_cotizacion} / ${cot.fechaCotizacion}`);
      });
    }

    // 5. PROBAR BÚSQUEDA POR ID
    if (countResult[0].total > 0) {
      console.log('\n🔍 5. PROBANDO BÚSQUEDA POR ID...');
      const primeraId = await sequelize.query(`SELECT MIN(id) as min_id FROM cotizaciones;`);
      const minId = primeraId[0][0].min_id;
      
      const cotizacionPorId = await Cotizacion.findByPk(minId);
      
      if (cotizacionPorId) {
        console.log(`✅ Cotización ID ${minId} encontrada:`);
        console.log(`   📄 Número: ${cotizacionPorId.numeroCotizacion}`);
        console.log(`   👤 Cliente: ${cotizacionPorId.clienteNombre}`);
        console.log(`   📧 Email: ${cotizacionPorId.clienteEmail}`);
      } else {
        console.log(`❌ No se encontró cotización con ID ${minId}`);
      }
    }

    // 6. CREAR NUEVA COTIZACIÓN DE PRUEBA
    console.log('\n🆕 6. CREANDO NUEVA COTIZACIÓN DE PRUEBA...');
    const nuevaCotizacion = await Cotizacion.create({
      numero_cotizacion: `TEST-FINAL-${Date.now()}`,
      fecha_cotizacion: new Date(),
      subtotal: 100000.00,
      iva: 19000.00,
      total: 119000.00,
      estado: 'pendiente',
      detalles_json: JSON.stringify({
        residuos: [{
          id: 1,
          descripcion: "Prueba Final",
          cantidad: 10,
          precio: 10000,
          subtotal: 100000
        }]
      }),
      cliente_nombre: 'Cliente Prueba Final',
      cliente_email: 'prueba.final@test.com',
      cliente_telefono: '+56912345678',
      observaciones: 'Cotización de prueba para verificar modelo'
    });

    console.log(`✅ Nueva cotización creada con ID: ${nuevaCotizacion.id}`);
    console.log(`   📄 Número: ${nuevaCotizacion.numeroCotizacion}`);
    console.log(`   👤 Cliente: ${nuevaCotizacion.clienteNombre}`);

    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    console.log('✅ El modelo está funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

testModeloFinal();