const emailTemplates = {
  resetPassword: (nombre, resetUrl) => ({
    subject: 'Recuperación de Contraseña - Felmart',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a7c59;">Felmart - Gestión de Residuos</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
          <h3 style="color: #2c3e50; margin-bottom: 20px;">Recuperación de Contraseña</h3>
          <p>Hola ${nombre},</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #4a7c59; 
                      color: white; 
                      padding: 12px 25px; 
                      text-decoration: none; 
                      border-radius: 5px;
                      font-weight: bold;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Este enlace expirará en 2 horas por seguridad.</p>
          <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
          <p>Felmart - Gestión de Residuos</p>
        </div>
      </div>
    `
  })
};

module.exports = emailTemplates; 