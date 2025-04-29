module.exports = {
    development: {
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'emma2004',
      database: process.env.DB_NAME || 'felmart_web',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql', // Añade esta línea explícitamente
      dialectOptions: {
        timezone: '-06:00'
      }
    },
    // Otras configuraciones para test y production
  };