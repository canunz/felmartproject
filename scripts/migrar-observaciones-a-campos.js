require('dotenv').config();
const sequelize = require('../config/database');

async function migrarDatosCliente() {
  try {
    console.log('🔄 Iniciando migración de datos de cliente...');
    
    // Buscar cotizaciones que tienen datos en observaciones pero no en campos de cliente
    const cotizaciones = await sequelize.query(`
      SELECT id, observaciones 
      FROM cotizaciones 
      WHERE observaciones LIKE '%Contacto:%' 
      AND (cliente_nombre IS NULL OR cliente_nombre = '')
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`📊 Encontradas ${cotizaciones.length} cotizaciones para migrar`);
    
    let migradas = 0;
    
    for (const cotizacion of cotizaciones) {
      try {
        const observaciones = cotizacion.observaciones;
        
        // Extraer datos usando expresiones regulares
        const extractos = {
          nombre: /Contacto:\s*([^,]+)/i.exec(observaciones)?.[1]?.trim(),
          rut: /Rut:\s*([^,]+)/i.exec(observaciones)?.[1]?.trim(),
          correo: /Correo:\s*([^,\s]+)/i.exec(observaciones)?.[1]?.trim(),
          telefono: /Teléfono:\s*([^,\s]+)/i.exec(observaciones)?.[1]?.trim(),
          empresa: /Empresa:\s*([^(,]+)/i.exec(observaciones)?.[1]?.trim()
        };
        
        // Solo migrar si se encontró al menos el nombre
        if (extractos.nombre) {
          await sequelize.query(`
            UPDATE cotizaciones 
            SET 
              cliente_nombre = ?,
              cliente_rut = ?,
              cliente_email = ?,
              cliente_telefono = ?,
              cliente_empresa = ?,
              observaciones = NULL
            WHERE id = ?
          `, {
            replacements: [
              extractos.nombre || null,
              extractos.rut || null,
              extractos.correo || null,
              extractos.telefono || null,
              extractos.empresa || null,
              cotizacion.id
            ]
          });
          
          migradas++;
          console.log(`✅ Migrada cotización ID ${cotizacion.id}: ${extractos.nombre}`);
        }
        
      } catch (error) {
        console.error(`❌ Error migrando cotización ID ${cotizacion.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Migración completada: ${migradas} cotizaciones migradas`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migrarDatosCliente(); 