const { transporter } = require('../config/email.config');

const contactoController = {
  /**
   * Envía un correo electrónico desde el formulario de contacto
   */
  enviarMensaje: async (req, res) => {
    try {
      const { nombre, email, telefono, mensaje } = req.body;

      // Validar campos requeridos
      if (!nombre || !email || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Por favor complete todos los campos requeridos'
        });
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'El formato del correo electrónico no es válido'
        });
      }

      // Configurar el correo para el administrador
      const mailOptions = {
        from: `"Felmart - Formulario de Contacto" <${process.env.EMAIL_USER}>`,
        to: 'catasoledad256@gmail.com, fanny.andreina1@gmail.com',
        subject: 'Nuevo mensaje de contacto',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #00616e;">Nuevo mensaje de contacto</h2>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Nombre:</strong> ${nombre}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${telefono ? `<p><strong>Teléfono:</strong> ${telefono}</p>` : ''}
              <p><strong>Mensaje:</strong></p>
              <p style="white-space: pre-wrap;">${mensaje}</p>
            </div>
          </div>
        `
      };

      // Enviar el correo
      await transporter.sendMail(mailOptions);

      // Enviar confirmación al usuario
      const confirmacionUsuario = {
        from: `"Felmart" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Hemos recibido tu mensaje',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #00616e;">¡Gracias por contactarnos!</h2>
            <p>Estimado(a) ${nombre},</p>
            <p>Hemos recibido tu mensaje y nos pondremos en contacto contigo a la brevedad posible.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Tu mensaje:</strong></p>
              <p style="white-space: pre-wrap;">${mensaje}</p>
            </div>
            <p>Saludos cordiales,</p>
            <p>Equipo Felmart</p>
          </div>
        `
      };

      await transporter.sendMail(confirmacionUsuario);

      res.json({
        success: true,
        message: 'Mensaje enviado correctamente'
      });
    } catch (error) {
      console.error('Error al enviar mensaje de contacto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje'
      });
    }
  }
};

module.exports = contactoController; 