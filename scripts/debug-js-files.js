// scripts/debug-js-files.js
// Script para verificar qué archivos JavaScript tienes

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO ARCHIVOS JAVASCRIPT...\n');

// Verificar archivos en public/js/
const publicJsDir = path.join(__dirname, '..', 'public', 'js');

console.log('📁 Archivos en public/js/:');
try {
    const files = fs.readdirSync(publicJsDir);
    files.forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(publicJsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   📄 ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
            
            // Verificar contenido
            if (file.includes('cotizacion') || file.includes('admin')) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n');
                
                console.log(`      📋 Líneas: ${lines.length}`);
                
                // Buscar funciones específicas
                if (content.includes('mostrarCotizaciones')) {
                    console.log('      ⚠️  Contiene función mostrarCotizaciones (ARCHIVO ANTIGUO)');
                }
                if (content.includes('actualizarTablaCotizaciones')) {
                    console.log('      ✅ Contiene función actualizarTablaCotizaciones (ARCHIVO NUEVO)');
                }
                if (content.includes('cargarCotizaciones')) {
                    console.log('      📊 Contiene función cargarCotizaciones');
                }
                
                console.log('      🔍 Primeras líneas:');
                lines.slice(0, 5).forEach((line, i) => {
                    console.log(`         ${i + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
                });
                console.log('');
            }
        }
    });
} catch (error) {
    console.error('❌ Error al leer directorio public/js:', error.message);
}

// Verificar archivos en views que puedan tener JS inline
console.log('\n📁 Verificando views/admin/cotizaciones/:');
const viewsDir = path.join(__dirname, '..', 'views', 'admin', 'cotizaciones');

try {
    const files = fs.readdirSync(viewsDir);
    files.forEach(file => {
        if (file.endsWith('.ejs')) {
            const filePath = path.join(viewsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`   📄 ${file}`);
            
            // Buscar scripts inline
            if (content.includes('<script>') || content.includes('mostrarCotizaciones')) {
                console.log('      ⚠️  Contiene JavaScript inline');
                
                // Extraer scripts
                const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                if (scriptMatches) {
                    console.log(`      📜 Scripts encontrados: ${scriptMatches.length}`);
                    scriptMatches.forEach((script, i) => {
                        if (script.includes('mostrarCotizaciones') || script.includes('cotizacion')) {
                            console.log(`         Script ${i + 1}: Contiene lógica de cotizaciones`);
                        }
                    });
                }
            }
            
            // Buscar inclusión de archivos JS
            if (content.includes('admin-cotizaciones.js')) {
                console.log('      ✅ Incluye admin-cotizaciones.js');
            }
            if (content.includes('.js')) {
                const jsIncludes = content.match(/src=["'][^"']*\.js["']/gi);
                if (jsIncludes) {
                    console.log('      📎 Archivos JS incluidos:');
                    jsIncludes.forEach(include => {
                        console.log(`         ${include}`);
                    });
                }
            }
        }
    });
} catch (error) {
    console.error('❌ Error al leer directorio views:', error.message);
}

console.log('\n🎯 RECOMENDACIONES:');
console.log('1. Si tienes JavaScript inline en las vistas EJS, muévelo a admin-cotizaciones.js');
console.log('2. Si tienes múltiples archivos JS, usa solo admin-cotizaciones.js');
console.log('3. Asegúrate de que la vista incluya: <script src="/js/admin-cotizaciones.js"></script>');
console.log('4. Verifica en DevTools → Sources qué archivo se está cargando');