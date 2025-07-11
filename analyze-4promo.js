const axios = require('axios');

async function analyze4PromoData() {
    try {
        console.log('📊 Analizando datos de 4Promo...');
        const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
        const products = response.data;
        
        console.log(`\n📈 Resumen general:`);
        console.log(`   - Total de productos: ${products.length}`);
        
        // Analizar productos sin inventario
        const productsWithoutInventory = products.filter(p => 
            p.inventario === null || 
            p.inventario === undefined || 
            p.inventario === '' || 
            p.inventario === 0
        );
        
        console.log(`   - Productos sin inventario: ${productsWithoutInventory.length}`);
        
        if (productsWithoutInventory.length > 0) {
            console.log(`\n⚠️ Productos sin inventario:`);
            productsWithoutInventory.slice(0, 10).forEach((p, index) => {
                console.log(`   ${index + 1}. ${p.nombre_articulo} (${p.id_articulo}) - Color: ${p.color} - Inventario: ${p.inventario}`);
            });
            
            if (productsWithoutInventory.length > 10) {
                console.log(`   ... y ${productsWithoutInventory.length - 10} más`);
            }
        }
        
        // Analizar productos con inventario válido
        const productsWithInventory = products.filter(p => 
            p.inventario !== null && 
            p.inventario !== undefined && 
            p.inventario !== '' && 
            p.inventario > 0
        );
        
        console.log(`\n✅ Productos con inventario válido: ${productsWithInventory.length}`);
        
        // Analizar handles generados
        const handles = productsWithInventory.map(p => {
            const handle = p.nombre_articulo.toLowerCase().replace(/\s+/g, '-') + '-' + p.id_articulo.toLowerCase().replace(/\s+/g, '-');
            return {
                original: p.nombre_articulo,
                id: p.id_articulo,
                color: p.color,
                inventory: p.inventario,
                handle: handle
            };
        });
        
        // Encontrar handles duplicados
        const handleCounts = {};
        handles.forEach(h => {
            handleCounts[h.handle] = (handleCounts[h.handle] || 0) + 1;
        });
        
        const duplicateHandles = Object.entries(handleCounts)
            .filter(([handle, count]) => count > 1)
            .map(([handle, count]) => ({ handle, count }));
        
        if (duplicateHandles.length > 0) {
            console.log(`\n⚠️ Handles duplicados encontrados:`);
            duplicateHandles.forEach(({ handle, count }) => {
                console.log(`   - "${handle}" aparece ${count} veces`);
            });
        }
        
        // Mostrar algunos ejemplos de handles generados
        console.log(`\n📝 Ejemplos de handles generados:`);
        handles.slice(0, 5).forEach((h, index) => {
            console.log(`   ${index + 1}. "${h.original}" (${h.id}) -> "${h.handle}"`);
        });
        
        // Analizar colores únicos
        const uniqueColors = [...new Set(productsWithInventory.map(p => p.color))];
        console.log(`\n🎨 Colores únicos encontrados: ${uniqueColors.length}`);
        console.log(`   Colores: ${uniqueColors.slice(0, 10).join(', ')}${uniqueColors.length > 10 ? '...' : ''}`);
        
        // Mostrar estadísticas de inventario
        const inventoryValues = productsWithInventory.map(p => p.inventario);
        const avgInventory = inventoryValues.reduce((sum, val) => sum + val, 0) / inventoryValues.length;
        const maxInventory = Math.max(...inventoryValues);
        const minInventory = Math.min(...inventoryValues);
        
        console.log(`\n📊 Estadísticas de inventario:`);
        console.log(`   - Promedio: ${avgInventory.toFixed(2)}`);
        console.log(`   - Máximo: ${maxInventory}`);
        console.log(`   - Mínimo: ${minInventory}`);
        
    } catch (error) {
        console.error('❌ Error analizando datos de 4Promo:', error.message);
    }
}

analyze4PromoData(); 