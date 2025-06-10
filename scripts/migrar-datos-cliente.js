// scripts/migrar-datos-cliente.js
// Ejecutar UNA SOLA VEZ para migrar datos existentes desde observaciones a campos específicos

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Configuración de base de datos
const sequelize = new Sequelize(
    process.env.DB_NAME || 'felmart_web',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'emma2004',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false // Cambiar a true si quieres ver las consultas SQL
    }
);

// Definir modelo Cotizacion
const Cotizacion = sequelize.define('Cotizacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero_cotizacion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    detalles_json: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cliente_nombre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cliente_rut: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cliente_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cliente_telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cliente_empresa: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cliente_direccion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cliente_comuna: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'cotizaciones',
    timestamps: true
});

function extraerDatosDeObservaciones(observaciones) {
    if (!observaciones) return {};
    
    const datos = {};
    
    // Patrones para extraer datos de las observaciones
    const patrones = {
        nombre: /Contacto:\s*([^,]+)/i,
        rut: /Rut:\s*([^,\s]+)/i,
        email: /Correo:\s*([^,\s]+)/i,
        telefono: /Teléfono:\s*([^,\s]+)/i,
        empresa: /Empresa:\s*([^(,]+)/i
    };
    
    for (const [campo, patron] of Object.entries(patrones)) {
        const match = observaciones.match(patron);
        if (match) {
            datos[campo] = match[1].trim();
        }
    }
    
    return datos;
}

function limpiarObservaciones(observaciones) {
    if (!observaciones) return '';
    
    // Remover los datos de contacto de las observaciones
    let observacionesLimpias = observaciones;
    
    // Patrones a remover
    const patronesARemover = [
        /Contacto:\s*[^,]+,?\s*/gi,
        /Rut:\s*[^,\s]+,?\s*/gi,
        /Correo:\s*[^,\s]+,?\s*/gi,
        /Teléfono:\s*[^,\s]+,?\s*/gi,
        /Empresa:\s*[^(,]+(\([^)]*\))?,?\s*/gi
    ];
    
    patronesARemover.forEach(patron => {
        observacionesLimpias = observacionesLimpias.replace(patron, '');
    });
    
    // Limpiar espacios y comas extra
    observacionesLimpias = observacionesLimpias
        .replace(/^[,\s]+|[,\s]+$/g, '') // Quitar comas y espacios al inicio y final
        .replace(/,+/g, ',') // Reemplazar múltiples comas por una
        .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno
        .trim();
    
    return observacionesLimpias;
}

async function migrarDatosCliente() {
    try {
        console.log('🔄 Iniciando migración de datos de cliente...');
        
        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida');
        
        // Buscar cotizaciones que tienen datos en observaciones pero no en campos específicos
        const cotizaciones = await Cotizacion.findAll({
            where: {
                [Sequelize.Op.and]: [
                    { cliente_nombre: null }, // No tiene datos en el campo específico
                    { 
                        observaciones: {
                            [Sequelize.Op.and]: [
                                { [Sequelize.Op.not]: null },
                                { [Sequelize.Op.like]: '%Contacto:%' } // Tiene datos de contacto en observaciones
                            ]
                        }
                    }
                ]
            }
        });
        
        console.log(`📊 Encontradas ${cotizaciones.length} cotizaciones para migrar`);
        
        let migradasExitosamente = 0;
        
        for (const cotizacion of cotizaciones) {
            console.log(`\n🔄 Procesando cotización ${cotizacion.numero_cotizacion}...`);
            console.log(`📝 Observaciones originales: "${cotizacion.observaciones}"`);
            
            // Extraer datos de las observaciones
            const datosExtraidos = extraerDatosDeObservaciones(cotizacion.observaciones);
            console.log(`📋 Datos extraídos:`, datosExtraidos);
            
            // Limpiar observaciones
            const observacionesLimpias = limpiarObservaciones(cotizacion.observaciones);
            console.log(`🧹 Observaciones limpias: "${observacionesLimpias}"`);
            
            if (Object.keys(datosExtraidos).length > 0) {
                // Actualizar la cotización
                await cotizacion.update({
                    cliente_nombre: datosExtraidos.nombre || null,
                    cliente_rut: datosExtraidos.rut || null,
                    cliente_email: datosExtraidos.email || null,
                    cliente_telefono: datosExtraidos.telefono || null,
                    cliente_empresa: datosExtraidos.empresa || null,
                    observaciones: observacionesLimpias || null
                });
                
                migradasExitosamente++;
                console.log(`✅ Migrada cotización ${cotizacion.numero_cotizacion}`);
                console.log(`   - Cliente: ${datosExtraidos.nombre || 'Sin nombre'}`);
                console.log(`   - Email: ${datosExtraidos.email || 'Sin email'}`);
                console.log(`   - Teléfono: ${datosExtraidos.telefono || 'Sin teléfono'}`);
                console.log(`   - Empresa: ${datosExtraidos.empresa || 'Sin empresa'}`);
            } else {
                console.log(`⚠️ No se encontraron datos para migrar en cotización ${cotizacion.numero_cotizacion}`);
            }
        }
        
        console.log('\n🎉 Migración completada exitosamente');
        console.log(`📈 Resumen: ${migradasExitosamente} cotizaciones migradas correctamente`);
        
        // Mostrar resumen final
        const totalConDatos = await Cotizacion.count({
            where: {
                cliente_nombre: {
                    [Sequelize.Op.not]: null
                }
            }
        });
        
        console.log(`📊 Total de cotizaciones con datos de cliente: ${totalConDatos}`);
        
        // Mostrar una muestra de los datos migrados
        const muestra = await Cotizacion.findAll({
            where: {
                cliente_nombre: {
                    [Sequelize.Op.not]: null
                }
            },
            limit: 3,
            attributes: ['numero_cotizacion', 'cliente_nombre', 'cliente_email', 'cliente_telefono', 'observaciones']
        });
        
        console.log('\n📋 Muestra de cotizaciones migradas:');
        muestra.forEach(cot => {
            console.log(`- ${cot.numero_cotizacion}: ${cot.cliente_nombre} (${cot.cliente_email})`);
            console.log(`  Observaciones: "${cot.observaciones || 'Sin observaciones'}"`);
        });
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        await sequelize.close();
        console.log('🔒 Conexión a la base de datos cerrada');
        process.exit(0);
    }
}

// Ejecutar migración
console.log('🚀 Iniciando script de migración de datos de cliente...');
console.log('📌 Este script moverá los datos desde "observaciones" hacia campos específicos');
console.log('📌 Las observaciones se limpiarán de datos de contacto');
migrarDatosCliente();