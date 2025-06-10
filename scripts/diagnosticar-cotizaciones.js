// scripts/diagnosticar-cotizaciones.js
// Script para diagnosticar problemas con las cotizaciones

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Configuración de base de datos
const sequelize = new Sequelize(
    process.env.DB_NAME || 'felmart_web',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log // Ver todas las consultas SQL
    }
);

// Definir modelo Cotizacion exactamente como debe ser
const Cotizacion = sequelize.define('Cotizacion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    solicitudRetiroId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'solicitudRetiroId'
    },
    numero_cotizacion: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'numero_cotizacion'
    },
    fecha_cotizacion: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'fecha_cotizacion'
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    iva: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada', 'vencida'),
        defaultValue: 'pendiente'
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    detalles_json: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'detalles_json'
    },
    ruta_pdf: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ruta_pdf'
    },
    // Campos del cliente
    cliente_nombre: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_nombre'
    },
    cliente_rut: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_rut'
    },
    cliente_email: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_email'
    },
    cliente_telefono: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_telefono'
    },
    cliente_empresa: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_empresa'
    },
    cliente_direccion: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cliente_direccion'
    },
    cliente_comuna: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'cliente_comuna'
    }
}, {
    tableName: 'cotizaciones',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

async function diagnosticar() {
    try {
        console.log('🔍 INICIANDO DIAGNÓSTICO DE COTIZACIONES...\n');
        
        // 1. Verificar conexión
        await sequelize.authenticate();
        console.log('✅ 1. Conexión a la base de datos: OK\n');
        
        // 2. Verificar estructura de la tabla
        console.log('📋 2. VERIFICANDO ESTRUCTURA DE LA TABLA...');
        const [results] = await sequelize.query('DESCRIBE cotizaciones');
        console.log('Campos encontrados:', results.map(r => r.Field));
        console.log('');
        
        // 3. Contar registros directamente en SQL
        console.log('📊 3. CONTEO DIRECTO EN SQL...');
        const [countResult] = await sequelize.query('SELECT COUNT(*) as total FROM cotizaciones');
        console.log(`Total de cotizaciones en BD: ${countResult[0].total}\n`);
        
        // 4. Obtener registros directamente en SQL
        console.log('📄 4. PRIMEROS 3 REGISTROS (SQL DIRECTO)...');
        const [directResults] = await sequelize.query('SELECT id, numero_cotizacion, cliente_nombre, cliente_email, estado, createdAt FROM cotizaciones ORDER BY id DESC LIMIT 3');
        console.log('Registros encontrados:', directResults.length);
        directResults.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id}, Número: ${row.numero_cotizacion}, Cliente: ${row.cliente_nombre || 'Sin nombre'}, Estado: ${row.estado}`);
        });
        console.log('');
        
        // 5. Probar con Sequelize findAll
        console.log('🔍 5. PROBANDO CON SEQUELIZE findAll...');
        const cotizaciones = await Cotizacion.findAll({
            order: [['id', 'DESC']],
            limit: 3
        });
        console.log(`Sequelize encontró: ${cotizaciones.length} registros`);
        cotizaciones.forEach((cot, index) => {
            console.log(`${index + 1}. ID: ${cot.id}, Número: ${cot.numero_cotizacion}, Cliente: ${cot.cliente_nombre || 'Sin nombre'}`);
        });
        console.log('');
        
        // 6. Probar con raw: true
        console.log('🔍 6. PROBANDO CON RAW: TRUE...');
        const cotizacionesRaw = await Cotizacion.findAll({
            raw: true,
            order: [['id', 'DESC']],
            limit: 3
        });
        console.log(`Sequelize raw encontró: ${cotizacionesRaw.length} registros`);
        cotizacionesRaw.forEach((cot, index) => {
            console.log(`${index + 1}. ID: ${cot.id}, Número: ${cot.numero_cotizacion}, Cliente: ${cot.cliente_nombre || 'Sin nombre'}`);
        });
        console.log('');
        
        // 7. Verificar si hay problemas con los campos
        console.log('🔍 7. VERIFICANDO CAMPOS ESPECÍFICOS...');
        const cotizacionEspecifica = await Cotizacion.findByPk(1);
        if (cotizacionEspecifica) {
            console.log('Cotización ID 1 encontrada:');
            console.log(`- Número: ${cotizacionEspecifica.numero_cotizacion}`);
            console.log(`- Cliente: ${cotizacionEspecifica.cliente_nombre}`);
            console.log(`- Email: ${cotizacionEspecifica.cliente_email}`);
            console.log(`- Estado: ${cotizacionEspecifica.estado}`);
        } else {
            console.log('❌ No se encontró cotización con ID 1');
        }
        console.log('');
        
        // 8. Crear una cotización de prueba
        console.log('🆕 8. CREANDO COTIZACIÓN DE PRUEBA...');
        try {
            const nuevaCotizacion = await Cotizacion.create({
                numero_cotizacion: `TEST-${Date.now()}`,
                fecha_cotizacion: new Date(),
                subtotal: 100000,
                iva: 19000,
                total: 119000,
                estado: 'pendiente',
                cliente_nombre: 'Cliente de Prueba',
                cliente_email: 'test@example.com',
                cliente_telefono: '+56912345678',
                detalles_json: JSON.stringify({
                    datosContacto: {
                        nombre: 'Cliente de Prueba',
                        email: 'test@example.com'
                    },
                    residuos: []
                })
            });
            console.log(`✅ Cotización de prueba creada con ID: ${nuevaCotizacion.id}`);
            
            // Verificar que se guardó
            const verificacion = await Cotizacion.findByPk(nuevaCotizacion.id);
            if (verificacion) {
                console.log(`✅ Verificación: Cotización ${verificacion.numero_cotizacion} guardada correctamente`);
            }
            
        } catch (error) {
            console.error('❌ Error al crear cotización de prueba:', error.message);
        }
        
        console.log('\n🎉 DIAGNÓSTICO COMPLETADO');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

console.log('🚀 Iniciando diagnóstico de cotizaciones...');
diagnosticar();