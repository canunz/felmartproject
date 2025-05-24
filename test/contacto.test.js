const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const bodyParser = require('body-parser');
const contactoController = require('../controllers/contactoController');
const { transporter } = require('../config/email.config');

// Crear una aplicación Express de prueba
const app = express();
app.use(bodyParser.json());
app.post('/contacto/enviar', contactoController.enviarMensaje);

describe('Contacto Controller', () => {
  let sendMailStub;
  let server;

  beforeAll((done) => {
    server = app.listen(0, done); // Usar puerto aleatorio
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    // Crear un stub para el método sendMail
    sendMailStub = sinon.stub(transporter, 'sendMail').resolves();
  });

  afterEach(() => {
    // Restaurar el stub después de cada prueba
    sendMailStub.restore();
  });

  describe('POST /contacto/enviar', () => {
    it('debería enviar un correo exitosamente con datos válidos', async () => {
      const datosContacto = {
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        telefono: '+56912345678',
        mensaje: 'Este es un mensaje de prueba'
      };

      const response = await request(app)
        .post('/contacto/enviar')
        .send(datosContacto)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.equal('Mensaje enviado correctamente');
      
      // Verificar que se enviaron dos correos (admin y confirmación)
      expect(sendMailStub.calledTwice).to.be.true;
      
      // Verificar el correo al admin
      const [primerLlamada] = sendMailStub.getCall(0).args;
      expect(primerLlamada.to).to.equal(process.env.EMAIL_USER);
      expect(primerLlamada.subject).to.equal('Nuevo mensaje de contacto');
      
      // Verificar el correo de confirmación
      const [segundaLlamada] = sendMailStub.getCall(1).args;
      expect(segundaLlamada.to).to.equal(datosContacto.email);
      expect(segundaLlamada.subject).to.equal('Hemos recibido tu mensaje');
    });

    it('debería fallar si faltan campos requeridos', async () => {
      const datosIncompletos = {
        nombre: 'Juan Pérez',
        // Falta email
        mensaje: 'Este es un mensaje de prueba'
      };

      const response = await request(app)
        .post('/contacto/enviar')
        .send(datosIncompletos)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Por favor complete todos los campos requeridos');
      expect(sendMailStub.called).to.be.false;
    });

    it('debería fallar si el email es inválido', async () => {
      const datosEmailInvalido = {
        nombre: 'Juan Pérez',
        email: 'correo-invalido',
        mensaje: 'Este es un mensaje de prueba'
      };

      const response = await request(app)
        .post('/contacto/enviar')
        .send(datosEmailInvalido)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('El formato del correo electrónico no es válido');
      expect(sendMailStub.called).to.be.false;
    });

    it('debería manejar errores del servidor de correo', async () => {
      // Restaurar el stub anterior y crear uno que rechace
      sendMailStub.restore();
      sendMailStub = sinon.stub(transporter, 'sendMail').rejects(new Error('Error de servidor SMTP'));

      const datosContacto = {
        nombre: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        telefono: '+56912345678',
        mensaje: 'Este es un mensaje de prueba'
      };

      const response = await request(app)
        .post('/contacto/enviar')
        .send(datosContacto)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.equal('Error al enviar el mensaje');
    });
  });
}); 