// config/email.setup.js
// Este archivo ayuda a configurar el sistema de correo electrónico

const fs = require('fs');
const path = require('path');

// Función para verificar las variables de entorno del correo
function verificarConfiguracionCorreo() {
  const variablesRequeridas = [
    'EMAIL_HOST',
    'EMAIL_PORT', 
    'EMAIL_USER',
    'EMAIL_PASS'
  ];

  const variablesFaltantes = [];

  console.log('🔍 Verificando configuración de correo electrónico...\n');

  variablesRequeridas.forEach(variable => {
    const valor = process.env[variable];
    if (!valor || valor === 'undefined') {
      variablesFaltantes.push(variable);
      console.log(`❌ ${variable}: No configurada`);
    } else {
      // Ocultar contraseña parcialmente por seguridad
      const valorMostrar = variable === 'EMAIL_PASS' 
        ? valor.substring(0, 4) + '****' + valor.substring(valor.length - 4)
        : valor;
      console.log(`✅ ${variable}: ${valorMostrar}`);
    }
  });

  console.log('\n');

  if (variablesFaltantes.length > 0) {
    console.log('⚠️  CONFIGURACIÓN INCOMPLETA DEL CORREO ⚠️');
    console.log('Las siguientes variables no están configuradas:');
    variablesFaltantes.forEach(variable => {
      console.log(`   - ${variable}`);
    });
    
    console.log('\n📋 INSTRUCCIONES PARA CONFIGURAR:\n');
    console.log('1. Crea un archivo .env en la raíz del proyecto (si no existe)');
    console.log('2. Agrega las siguientes líneas:\n');
    console.log('# Configuración del correo electrónico');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_SECURE=false');
    console.log('EMAIL_USER=tu_correo@gmail.com');
    console.log('EMAIL_PASS=tu_contraseña_de_aplicacion');
    console.log('EMAIL_FROM=Felmart Sistema <tu_correo@gmail.com>\n');
    
    console.log('📧 PARA GMAIL - CONFIGURAR CONTRASEÑA DE APLICACIÓN:\n');
    console.log('1. Ve a: https://myaccount.google.com');
    console.log('2. Seguridad > Verificación en 2 pasos (debe estar activada)');
    console.log('3. Seguridad > Contraseñas de aplicaciones');
    console.log('4. Selecciona "Otra (nombre personalizado)" y escribe "Felmart"');
    console.log('5. Copia la contraseña de 16 caracteres generada');
    console.log('6. Úsala en EMAIL_PASS (NO tu contraseña normal de Gmail)\n');
    
    return false;
  } else {
    console.log('✅ Configuración de correo electrónico COMPLETA');
    return true;
  }
}

// Función para crear archivo .env si no existe
function crearArchivoEnvEjemplo() {
  const rutaEnv = path.join(__dirname, '..', '.env');
  const rutaEnvEjemplo = path.join(__dirname, '..', '.env.example');
  
  const contenidoEjemplo = `# === CONFIGURACIÓN DEL CORREO ELECTRÓNICO ===
# Para Gmail, necesitas una "Contraseña de aplicación" (no tu contraseña normal)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_de_16_caracteres
EMAIL_FROM=Felmart Sistema <tu_correo@gmail.com>

# === CONFIGURACIÓN DE LA BASE DE DATOS ===
DB_HOST=localhost
DB_PORT=3306
DB_NAME=felmart_db
DB_USER=root
DB_PASS=

# === CONFIGURACIÓN DE LA APLICACIÓN ===
NODE_ENV=development
SESSION_SECRET=mi_secreto_super_seguro
BASE_URL=http://localhost:3000`;

  // Crear .env.example si no existe
  if (!fs.existsSync(rutaEnvEjemplo)) {
    try {
      fs.writeFileSync(rutaEnvEjemplo, contenidoEjemplo);
      console.log('✅ Archivo .env.example creado');
    } catch (error) {
      console.log('❌ No se pudo crear .env.example:', error.message);
    }
  }

  // Sugerir crear .env si no existe
  if (!fs.existsSync(rutaEnv)) {
    console.log('\n💡 Sugerencia: Copia .env.example a .env y configura tus datos reales');
    console.log('   Comando: copy .env.example .env');
  }
}

// Función para probar el envío de correo
async function probarEnvioCorreo() {
  try {
    const { transporter } = require('./email.config');
    
    console.log('📧 Probando envío de correo de prueba...');
    
    const mailOptions = {
      from: `"Felmart Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviar a la misma cuenta
      subject: 'Prueba de correo - Felmart',
      html: `
        <h2>✅ Correo de Prueba Exitoso</h2>
        <p>Si recibes este correo, la configuración está funcionando correctamente.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de prueba enviado exitosamente');
    console.log('   ID del mensaje:', info.messageId);
    return true;
  } catch (error) {
    console.log('❌ Error al enviar correo de prueba:', error.message);
    return false;
  }
}

module.exports = {
  verificarConfiguracionCorreo,
  crearArchivoEnvEjemplo,
  probarEnvioCorreo
}; 