const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Función para verificar la conexión
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('Conexión al servidor de correo establecida correctamente');
    return true;
  } catch (error) {
    console.error('Error al conectar con el servidor de correo:', error);
    return false;
  }
};

module.exports = {
  transporter,
  verifyConnection
}; 