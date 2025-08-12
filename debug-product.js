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
        console.error(`❌ Error buscando productos:`, error.message);
        return [];
    }
}

async function debugProduct(productName, productId, color) {
    console.log(`🔍 Debuggeando producto: ${productName} (${productId}) - Color: ${color}`);
    
    // Obtener todos los productos de 4Promo
    const products = await get4PromoProducts();
    const targetProduct = products.find(p => 
        p.nombre_articulo === productName && 
        p.id_articulo === productId && 
        p.color === color
    );
    
    if (!targetProduct) {
        console.log(`❌ Producto no encontrado en 4Promo`);
        return;
    }
    
    console.log(`✅ Producto encontrado en 4Promo:`, targetProduct);
    
    const handle = productName.toLowerCase().replace(/\s+/g, '-') + '-' + productId.toLowerCase().replace(/\s+/g, '-');
    console.log(`📝 Handle generado: ${handle}`);
    
    // Probar en ambas tiendas
    for (const [storeKey, storeConfig] of Object.entries(STORES)) {
        console.log(`\n🏪 Probando en ${storeConfig.name}...`);
        
        // Buscar por handle exacto
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
            
            const product = response.data.data.productByHandle;
            if (product) {
                console.log(`✅ Producto encontrado por handle exacto:`);
                console.log(`   Título: ${product.title}`);
                console.log(`   Handle: ${product.handle}`);
                console.log(`   Variantes: ${product.variants.nodes.map(v => `${v.title} (${v.inventoryQuantity})`).join(', ')}`);
                
                const matchingVariant = product.variants.nodes.find(v => v.title === color);
                if (matchingVariant) {
                    console.log(`✅ Variante encontrada: ${matchingVariant.title} - Inventario: ${matchingVariant.inventoryQuantity}`);
                } else {
                    console.log(`❌ Variante no encontrada para color: ${color}`);
                }
            } else {
                console.log(`❌ Producto no encontrado por handle exacto`);
                
                // Buscar por título
                console.log(`🔍 Buscando por título: ${productName}`);
                const productsByTitle = await searchProductsByTitle(productName, storeConfig);
                
                if (productsByTitle.length > 0) {
                    console.log(`📋 Productos encontrados por título:`);
                    productsByTitle.forEach((p, index) => {
                        console.log(`   ${index + 1}. ${p.title} (${p.handle})`);
                        console.log(`      Variantes: ${p.variants.nodes.map(v => v.title).join(', ')}`);
                    });
                } else {
                    console.log(`❌ No se encontraron productos por título`);
                }
            }
        } catch (error) {
            console.error(`❌ Error en ${storeConfig.name}:`, error.message);
        }
    }
}

// Ejecutar debug si se proporcionan argumentos
const args = process.argv.slice(2);
if (args.length >= 3) {
    const [productName, productId, color] = args;
    debugProduct(productName, productId, color);
} else {
    console.log('Uso: node debug-product.js "Nombre del Producto" "ID del Producto" "Color"');
    console.log('Ejemplo: node debug-product.js "Camiseta Básica" "CAM001" "Azul"');
} 