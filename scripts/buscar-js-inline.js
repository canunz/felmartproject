// scripts/buscar-js-inline.js
// Script para encontrar JavaScript inline problemático

const fs = require('fs');
const path = require('path');

function buscarJSInline(dirPath, nivel = 0) {
    const indent = '  '.repeat(nivel);
    
    try {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                console.log(`${indent}📁 ${item}/`);
                buscarJSInline(itemPath, nivel + 1);
            } else if (item.endsWith('.ejs') || item.endsWith('.html')) {
                const content = fs.readFileSync(itemPath, 'utf8');
                
                // Buscar JavaScript inline problemático
                const problemas = [];
                
                // Buscar función mostrarCotizaciones
                if (content.includes('mostrarCotizaciones')) {
                    problemas.push('función mostrarCotizaciones');
                }
                
                // Buscar scripts inline largos
                const scriptMatches = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
                if (scriptMatches) {
                    scriptMatches.forEach((script, i) => {
                        const lines = script.split('\n').length;
                        if (lines > 10) { // Scripts largos son problemáticos
                            problemas.push(`script inline largo (${lines} líneas)`);
                        }
                        
                        if (script.includes('mostrarCotizaciones') || 
                            script.includes('cargarCotizaciones') ||
                            script.includes('cotizacion')) {
                            problemas.push('script con lógica de cotizaciones');
                        }
                    });
                }
                
                if (problemas.length > 0) {
                    console.log(`${indent}⚠️  ${item} - PROBLEMAS ENCONTRADOS:`);
                    problemas.forEach(problema => {
                        console.log(`${indent}    🔴 ${problema}`);
                    });
                    
                    // Mostrar líneas relevantes
                    const lines = content.split('\n');
                    lines.forEach((line, i) => {
                        if (line.includes('mostrarCotizaciones') || 
                            (line.includes('<script') && !line.includes('src='))) {
                            console.log(`${indent}    📍 Línea ${i + 1}: ${line.trim().substring(0, 80)}...`);
                        }
                    });
                    
                    console.log('');
                } else {
                    console.log(`${indent}✅ ${item} - Sin problemas`);
                }
            }
        });
    } catch (error) {
        console.error(`❌ Error al leer ${dirPath}:`, error.message);
    }
}

console.log('🔍 BUSCANDO JAVASCRIPT INLINE PROBLEMÁTICO...\n');

// Buscar en views/
console.log('📂 BUSCANDO EN VIEWS:');
const viewsPath = path.join(__dirname, '..', 'views');
buscarJSInline(viewsPath);

// Buscar en public/ por si acaso
console.log('\n📂 BUSCANDO EN PUBLIC:');
const publicPath = path.join(__dirname, '..', 'public');
buscarJSInline(publicPath);

console.log('\n🎯 INSTRUCCIONES:');
console.log('1. Si encuentras archivos con 🔴, revisa esos archivos');
console.log('2. Elimina todo el JavaScript inline relacionado con cotizaciones');
console.log('3. Mantén solo: <script src="/js/admin-cotizaciones.js"></script>');
console.log('4. Si hay funciones específicas que necesitas, móvelas al archivo externo');