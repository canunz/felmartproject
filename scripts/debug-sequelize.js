// scripts/debug-sequelize.js
// Diagnóstico completo del problema de Sequelize

const sequelize = require('../config/database');

async function debugSequelize() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

    // 1. VERIFICAR ESTRUCTURA REAL DE LA TABLA
    console.log('🔍 1. VERIFICANDO ESTRUCTURA REAL DE LA TABLA...');
    const [columns] = await sequelize.query(`
      DESCRIBE cotizaciones;
    `);
    
    console.log('📋 Columnas reales en la tabla:');
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. VERIFICAR DATOS REALES CON SQL DIRECTO
    console.log('\n🔍 2. VERIFICANDO DATOS CON SQL DIRECTO...');
    const [rows] = await sequelize.query(`
      SELECT id, numero_cotizacion, fecha_cotizacion, total, estado, 
             cliente_nombre, cliente_email, createdAt, updatedAt
      FROM cotizaciones 
      ORDER BY id DESC 
      LIMIT 3;
    `);
    
    console.log(`📊 Registros encontrados con SQL directo: ${rows.length}`);
    if (rows.length > 0) {
      rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. ID: ${row.id}`);
        console.log(`      Número: ${row.numero_cotizacion}`);
        console.log(`      Total: ${row.total}`);
        console.log(`      Estado: ${row.estado}`);
        console.log(`      Cliente: ${row.cliente_nombre}`);
        console.log(`      Email: ${row.cliente_email}`);
        console.log(`      CreatedAt: ${row.createdAt}`);
        console.log(`      UpdatedAt: ${row.updatedAt}`);
      });
    }

    // 3. PROBAR MODELO SIN IMPORTAR EL EXISTENTE
    console.log('\n🔍 3. DEFINIENDO MODELO DIRECTO PARA PRUEBA...');
    const { DataTypes } = require('sequelize');
    
    const CotizacionTest = sequelize.define('CotizacionTest', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitudRetiroId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      numero_cotizacion: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fecha_cotizacion: {
        type: DataTypes.DATE,
        allowNull: true
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      iva: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      estado: {
        type: DataTypes.STRING,
        allowNull: true
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      detalles_json: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ruta_pdf: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_nombre: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_rut: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_telefono: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_empresa: {
        type: DataTypes.STRING,
        allowNull: true
      },
      cliente_direccion: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      cliente_comuna: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'cotizaciones',
      timestamps: false  // Desactivamos timestamps para esta prueba
    });

    console.log('✅ Modelo de prueba definido');

    // 4. PROBAR CONSULTA CON MODELO DE PRUEBA
    console.log('\n🔍 4. PROBANDO CONSULTA CON MODELO DE PRUEBA...');
    const testResults = await CotizacionTest.findAll({
      limit: 3,
      order: [['id', 'DESC']]
    });

    console.log(`📊 Registros encontrados con modelo de prueba: ${testResults.length}`);
    if (testResults.length > 0) {
      testResults.forEach((cot, index) => {
        console.log(`\n   ${index + 1}. ID: ${cot.id}`);
        console.log(`      Número: ${cot.numero_cotizacion}`);
        console.log(`      Total: ${cot.total}`);
        console.log(`      Estado: ${cot.estado}`);
        console.log(`      Cliente: ${cot.cliente_nombre}`);
        console.log(`      Email: ${cot.cliente_email}`);
      });
    }

    // 5. PROBAR EL MODELO ACTUAL
    console.log('\n🔍 5. PROBANDO MODELO ACTUAL DEL PROYECTO...');
    try {
      const Cotizacion = require('../models/Cotizacion');
      console.log('✅ Modelo actual importado exitosamente');
      
      const currentResults = await Cotizacion.findAll({
        limit: 3,
        order: [['id', 'DESC']]
      });
      
      console.log(`📊 Registros encontrados con modelo actual: ${currentResults.length}`);
      if (currentResults.length > 0) {
        currentResults.forEach((cot, index) => {
          console.log(`\n   ${index + 1}. ID: ${cot.id}`);
          console.log(`      Número: ${cot.numeroCotizacion || cot.numero_cotizacion}`);
          console.log(`      Total: ${cot.total}`);
          console.log(`      Estado: ${cot.estado}`);
          console.log(`      Cliente: ${cot.clienteNombre || cot.cliente_nombre}`);
        });
      }
      
    } catch (modelError) {
      console.error('❌ Error con modelo actual:', modelError.message);
    }

    console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

debugSequelize();