require('dotenv').config();
const nodemailer = require('nodemailer');
const { transporter, verifyConnection } = require('../config/email.config');

async function testEmail() {
  try {
    console.log('Iniciando prueba de correo electrónico...');
    
    // 1. Verificar conexión
    console.log('\n1. Verificando conexión con el servidor de correo...');
    const connectionVerified = await verifyConnection();
    if (!connectionVerified) {
      console.error('❌ No se pudo establecer conexión con el servidor de correo');
      return;
    }
    console.log('✅ Conexión verificada correctamente');

    // 2. Enviar correo de prueba
    console.log('\n2. Enviando correo de prueba...');
    const mailOptions = {
      from: `"Felmart Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviar a la misma cuenta para prueba
      subject: 'Prueba de correo electrónico - Felmart',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a7c59;">Prueba de Correo Electrónico</h2>
          <p>Este es un correo de prueba para verificar la configuración del sistema de correo electrónico de Felmart.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Servidor SMTP:</strong> ${process.env.EMAIL_HOST}</p>
            <p><strong>Puerto:</strong> ${process.env.EMAIL_PORT}</p>
          </div>
          <p>Si recibes este correo, significa que la configuración del correo electrónico está funcionando correctamente.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado correctamente');
    console.log('   ID del mensaje:', info.messageId);
    console.log('   URL de vista previa:', nodemailer.getTestMessageUrl(info));

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    console.log('\nDetalles del error:');
    console.log('- Código:', error.code);
    console.log('- Comando:', error.command);
    console.log('- Mensaje:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\nPosibles soluciones:');
      console.log('1. Verifica que las credenciales en el archivo .env sean correctas');
      console.log('2. Asegúrate de que la contraseña de aplicación de Gmail sea válida');
      console.log('3. Verifica que la cuenta de Gmail tenga la verificación en dos pasos activada');
    }
  }
}

// Ejecutar la prueba
testEmail(); 