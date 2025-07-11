const axios = require('axios');

async function search4PromoProducts(searchTerm) {
    try {
        console.log(`🔍 Buscando productos que contengan: "${searchTerm}"`);
        const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
        const products = response.data;
        
        const matchingProducts = products.filter(p => 
            p.nombre_articulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id_articulo.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingProducts.length === 0) {
            console.log(`❌ No se encontraron productos que contengan "${searchTerm}"`);
            return;
        }
        
        console.log(`\n✅ Se encontraron ${matchingProducts.length} productos:`);
        
        // Agrupar por nombre de producto
        const groupedProducts = {};
        matchingProducts.forEach(p => {
            const key = `${p.nombre_articulo} (${p.id_articulo})`;
            if (!groupedProducts[key]) {
                groupedProducts[key] = [];
            }
            groupedProducts[key].push(p);
        });
        
        Object.entries(groupedProducts).forEach(([productName, variants], index) => {
            console.log(`\n${index + 1}. ${productName}`);
            console.log(`   Colores disponibles:`);
            variants.forEach(v => {
                console.log(`      - ${v.color} (Inventario: ${v.inventario})`);
            });
        });
        
    } catch (error) {
        console.error('❌ Error buscando productos:', error.message);
    }
}

// Obtener el término de búsqueda de los argumentos
const searchTerm = process.argv[2];
if (searchTerm) {
    search4PromoProducts(searchTerm);
} else {
    console.log('Uso: node search-product.js "TÉRMINO_DE_BÚSQUEDA"');
    console.log('Ejemplo: node search-product.js "MAT"');
} 