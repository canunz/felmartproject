require('dotenv').config();
const sequelize = require('../config/database');

async function completarDatosCliente() {
  try {
    console.log('🔄 Completando datos de cliente...');
    
    // Datos de la cotización COT-1749435430218 basados en tu información
    const datosCompletos = {
      cliente_empresa: 'DUOC U-C',
      cliente_direccion: 'egaña',
      cliente_comuna: 'San Pedro de la Paz'
    };
    
    // Actualizar la cotización ID 11 (COT-1749435430218) con los datos que faltan
    const resultado = await sequelize.query(`
      UPDATE cotizaciones 
      SET 
        cliente_empresa = ?,
        cliente_direccion = ?,
        cliente_comuna = ?
      WHERE id = 11
    `, {
      replacements: [
        datosCompletos.cliente_empresa,
        datosCompletos.cliente_direccion,
        datosCompletos.cliente_comuna
      ]
    });
    
    console.log('✅ Datos de cliente completados para cotización ID 11');
    console.log('   - Empresa:', datosCompletos.cliente_empresa);
    console.log('   - Dirección:', datosCompletos.cliente_direccion);
    console.log('   - Comuna:', datosCompletos.cliente_comuna);
    
    // Verificar los datos actualizados
    const cotizacionActualizada = await sequelize.query(`
      SELECT cliente_nombre, cliente_rut, cliente_email, cliente_telefono, 
             cliente_empresa, cliente_direccion, cliente_comuna 
      FROM cotizaciones 
      WHERE id = 11
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('\n📊 Datos completos de la cotización:');
    console.log(JSON.stringify(cotizacionActualizada[0], null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error completando datos:', error);
    process.exit(1);
  }
}

completarDatosCliente(); 