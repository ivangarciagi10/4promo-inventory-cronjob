const axios = require('axios');
require('dotenv').config();

// Configuración de las tiendas
const STORES = {
    HHGLOBAL: {
        name: 'HH Global',
        token: process.env.SHOPIFY_TOKEN_HHGLOBAL,
        graphqlUrl: process.env.GRAPHQL_URL_HHGLOBAL,
        locationId: 'gid://shopify/Location/69743050958'
    },
    GNP: {
        name: 'GNP',
        token: process.env.SHOPIFY_TOKEN_GNP,
        graphqlUrl: process.env.GRAPHQL_URL_GNP,
        locationId: 'gid://shopify/Location/73808511078'
    }
};

async function get4PromoProducts() {
    const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
    return response.data;
}

async function searchProductsByTitle(title, storeConfig) {
    try {
        const response = await axios.post(
            storeConfig.graphqlUrl,
            JSON.stringify({
                query: `
                    query {
                        products(first: 10, query: "title:*${title}*") {
                            nodes {
                                id
                                title
                                handle
                                variants(first: 250) {
                                    nodes {
                                        id
                                        title
                                        inventoryQuantity
                                        inventoryItem {
                                            id
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': storeConfig.token,
                }
            }
        );

        return response.data.data.products.nodes;
    } catch (error) {
        console.error(`❌ Error buscando productos en ${storeConfig.name}:`, error.message);
        return [];
    }
}

async function compareStores() {
    console.log('🔍 Comparando disponibilidad de productos entre tiendas...\n');
    
    const products = await get4PromoProducts();
    const productsWithInventory = products.filter(p => 
        p.inventario !== null && 
        p.inventario !== undefined && 
        p.inventario !== '' && 
        p.inventario > 0
    );
    
    console.log(`📊 Analizando ${productsWithInventory.length} productos con inventario válido...\n`);
    
    const results = {
        HHGLOBAL: { found: 0, notFound: 0, products: [] },
        GNP: { found: 0, notFound: 0, products: [] }
    };
    
    // Tomar una muestra de productos para el análisis
    const sampleProducts = productsWithInventory.slice(0, 50); // Analizar solo los primeros 50 para no sobrecargar
    
    for (const product of sampleProducts) {
        const handle = product.nombre_articulo.toLowerCase().replace(/\s+/g, '-') + '-' + product.id_articulo.toLowerCase().replace(/\s+/g, '-');
        
        console.log(`🔍 Verificando: ${product.nombre_articulo} (${product.id_articulo}) - Color: ${product.color}`);
        
        for (const [storeKey, storeConfig] of Object.entries(STORES)) {
            try {
                const response = await axios.post(
                    storeConfig.graphqlUrl,
                    JSON.stringify({
                        query: `
                            query {
                                productByHandle(handle: "${handle}") {
                                    id
                                    title
                                    handle
                                    variants(first: 250) {
                                        nodes {
                                            id
                                            title
                                            inventoryQuantity
                                            inventoryItem {
                                                id
                                            }
                                        }
                                    }
                                }
                            }
                        `,
                    }), {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Access-Token': storeConfig.token,
                        }
                    }
                );
                
                const shopifyProduct = response.data.data.productByHandle;
                
                if (shopifyProduct) {
                    const matchingVariant = shopifyProduct.variants.nodes.find(v => v.title === product.color);
                    if (matchingVariant) {
                        results[storeKey].found++;
                        console.log(`   ✅ [${storeConfig.name}] Encontrado - Inventario: ${matchingVariant.inventoryQuantity}`);
                    } else {
                        results[storeKey].notFound++;
                        console.log(`   ⚠️ [${storeConfig.name}] Producto existe pero sin variante ${product.color}`);
                    }
                } else {
                    results[storeKey].notFound++;
                    console.log(`   ❌ [${storeConfig.name}] No encontrado`);
                }
            } catch (error) {
                results[storeKey].notFound++;
                console.log(`   ❌ [${storeConfig.name}] Error: ${error.message}`);
            }
        }
        console.log('');
    }
    
    console.log('📊 Resumen de disponibilidad:');
    console.log(`\n🏪 HH Global:`);
    console.log(`   - Productos encontrados: ${results.HHGLOBAL.found}`);
    console.log(`   - Productos no encontrados: ${results.HHGLOBAL.notFound}`);
    console.log(`   - Tasa de éxito: ${((results.HHGLOBAL.found / (results.HHGLOBAL.found + results.HHGLOBAL.notFound)) * 100).toFixed(1)}%`);
    
    console.log(`\n🏪 GNP:`);
    console.log(`   - Productos encontrados: ${results.GNP.found}`);
    console.log(`   - Productos no encontrados: ${results.GNP.notFound}`);
    console.log(`   - Tasa de éxito: ${((results.GNP.found / (results.GNP.found + results.GNP.notFound)) * 100).toFixed(1)}%`);
    
    console.log(`\n💡 Recomendaciones:`);
    console.log(`   - Los productos que no se encuentran en una tienda son normales en sistemas multi tienda`);
    console.log(`   - El cronjob actualizado ya maneja estos casos correctamente`);
    console.log(`   - Solo se actualizarán los productos que existan en cada tienda`);
}

compareStores().catch(console.error); 