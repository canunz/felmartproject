// scripts/verificar-correo.js
// Script para verificar y configurar el correo electrónico

require('dotenv').config();
const { 
  verificarConfiguracionCorreo, 
  crearArchivoEnvEjemplo, 
  probarEnvioCorreo 
} = require('../config/email.setup');

async function main() {
  console.log('🚀 VERIFICADOR DE CONFIGURACIÓN DE CORREO - FELMART\n');
  
  // Paso 1: Crear archivo de ejemplo si no existe
  crearArchivoEnvEjemplo();
  
  // Paso 2: Verificar configuración
  const configuracionCompleta = verificarConfiguracionCorreo();
  
  if (!configuracionCompleta) {
    console.log('❌ No se puede continuar sin la configuración completa del correo.');
    console.log('Configura las variables de entorno en el archivo .env y vuelve a ejecutar este script.\n');
    process.exit(1);
  }
  
  // Paso 3: Probar envío de correo
  console.log('🧪 Realizando prueba de envío...\n');
  const pruebaExitosa = await probarEnvioCorreo();
  
  if (pruebaExitosa) {
    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETA Y FUNCIONAL!');
    console.log('El sistema de correo está listo para usar.');
  } else {
    console.log('\n❌ La configuración tiene problemas.');
    console.log('Revisa los datos del correo en el archivo .env');
  }
}

main().catch(error => {
  console.error('❌ Error durante la verificación:', error.message);
  process.exit(1);
}); 