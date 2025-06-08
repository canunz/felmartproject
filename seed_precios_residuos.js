const { PrecioResiduo } = require('./models');
const sequelize = require('./config/database');

const datos = [
    { descripcion: 'ACEITE', precio: 1, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'ACEITE CON TRAZAS DE AGUA', precio: 6, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'AGUAS CEMENTICIAS', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'AGUAS CONTAMINADAS CON DETERGENTE', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'AGUAS SENTINAS', precio: 9, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'PAÑOS CONTAMINADOS CON HC', precio: 6, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'PAÑOS CONTAMINADOS CON HC (TAMBOR)', precio: 55000, unidad: 'TAMBOR', moneda: 'CLP' },
    { descripcion: 'BORRA DE PINTURAS', precio: 9.6, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'BORRA DE PINTURAS (TAMBOR)', precio: 75000, unidad: 'TAMBOR', moneda: 'CLP' },
    { descripcion: 'PLÁSTICOS CONTAMINADOS CON PESTICIDAS', precio: 6, unidad: 'M3', moneda: 'UF' },
    { descripcion: 'PLÁSTICOS CONTAMINADOS CON INFLAMABLES', precio: 6, unidad: 'M3', moneda: 'UF' },
    { descripcion: 'BALDES CON HIDROCARBUROS', precio: 6, unidad: 'M3', moneda: 'UF' },
    { descripcion: 'CHATARRA ELECTRÓNICA', precio: 10, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'FILTROS DE ACEITES', precio: 7, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'FILTROS DE ACEITES (TAMBOR)', precio: 55000, unidad: 'TAMBOR', moneda: 'CLP' },
    { descripcion: 'BATERIAS DE PLOMO', precio: 1, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'RESIDUOS DOMICILIARIOS', precio: 5, unidad: 'IBC', moneda: 'UF' },
    { descripcion: 'RESIDUOS DOMICILIARIOS (TAMBOR)', precio: 45000, unidad: 'TAMBOR', moneda: 'CLP' },
    { descripcion: 'ESCOMBROS', precio: 5, unidad: 'M3', moneda: 'UF' },
    { descripcion: 'RESIDUOS DE VIDRIO', precio: 6, unidad: 'IBC', moneda: 'UF' }
];

async function poblar() {
  try {
    await sequelize.authenticate();
    for (const dato of datos) {
      await PrecioResiduo.findOrCreate({
        where: {
          descripcion: dato.descripcion,
          unidad: dato.unidad,
          moneda: dato.moneda
        },
        defaults: dato
      });
    }
    console.log('Datos insertados correctamente.');
    process.exit();
  } catch (error) {
    console.error('Error al insertar datos:', error);
    process.exit(1);
  }
}

poblar(); 