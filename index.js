const axios = require('axios');
require('dotenv').config();

// Configuración de las tiendas
const STORES = {
    HHGLOBAL: {
        name: 'HH Global',
        token: process.env.SHOPIFY_TOKEN_HHGLOBAL,
        graphqlUrl: process.env.GRAPHQL_URL_HHGLOBAL,
        locationId: 'gid://shopify/Location/69743050958' // Mantener el locationId original para HH Global
    },
    GNP: {
        name: 'GNP',
        token: process.env.SHOPIFY_TOKEN_GNP,
        graphqlUrl: process.env.GRAPHQL_URL_GNP,
        locationId: 'gid://shopify/Location/73808511078' // Necesitarás actualizar este ID para GNP
    }
};

async function get4PromoProducts() {
    const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
    return response.data;
}

async function getProductByHandle(handle, storeConfig) {
    const response = await axios.post(
        storeConfig.graphqlUrl,
        JSON.stringify({
            query: `
                query {
                    productByHandle(handle: "${handle}") {
                        title
                        variants(first: 250) {
                            nodes {
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

    return response.data.data.productByHandle;
}

async function updateInventory(input, storeConfig) {
    //Usa esta mutation porque Shopify no permite actualizar inventario por productVariantsBulkUpdate
    const response = await axios.post(
        storeConfig.graphqlUrl,
        JSON.stringify({
            query: `
                mutation InventorySet($input: InventorySetQuantitiesInput!) {
                    inventorySetQuantities(input: $input) {
                        inventoryAdjustmentGroup {
                            changes {
                                delta
                                name
                            }
                        }
                        userErrors {
                            message
                            field
                        }
                    }
                }
            `,
            variables: {
                input,
            }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': storeConfig.token,
            }
        }
    );

    return response.data.data.inventorySetQuantities.inventoryAdjustmentGroup;
}

//Tiempo de ejecución aproximada: 10 minutos por tienda
async function updateProductsForStore(storeKey, storeConfig) {
    console.log(`\n🔄 Iniciando sincronización para ${storeConfig.name}...`);
    
    const products = await get4PromoProducts();

    let previousHandle = '';
    let shopifyProduct = {};
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
        try {
            const handle = product.nombre_articulo.toLowerCase().replace(/\s+/g, '-') + '-' + product.id_articulo.toLowerCase().replace(/\s+/g, '-');
            if (handle !== previousHandle) { //Previene llamadas innecesarias a Shopify si el producto de 4Promo es una variante
                shopifyProduct = await getProductByHandle(handle, storeConfig);
                console.log(`[${storeConfig.name}] Producto encontrado por el handle: ${shopifyProduct.title}`);
            };
            previousHandle = handle;
            
            const productVariants = shopifyProduct.variants.nodes;
            for (variant of productVariants) {
                if (variant.title === product.color) {
                    console.log(`[${storeConfig.name}] Variante encontrada: ${variant.title} | Inventario: Prev ${variant.inventoryQuantity} Now ${product.inventario}`);
                    if (variant.inventoryQuantity !== product.inventario) { //Actualiza la variante si el inventario ha cambiado
                        const variantToUpdate = {
                            quantities: {
                                inventoryItemId: variant.inventoryItem.id, //Usa id de inventario porque usar id de variante o producto no funciona
                                locationId: storeConfig.locationId,
                                quantity: product.inventario,
                            },
                            name: "available",
                            reason: "correction",
                            ignoreCompareQuantity: true, //Desactiva la comparación de inventario para siempre sobreescribir con la info de 4Promo
                        };
                        const response = await updateInventory(variantToUpdate, storeConfig);
                        console.log(`[${storeConfig.name}] Inventario actualizado:`, response.changes);
                        updatedCount++;
                    }
                }
            }
        } catch (error) {
            console.error(`[${storeConfig.name}] Error procesando el producto ${product.nombre_articulo} ${product.id_articulo}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n✅ Sincronización completada para ${storeConfig.name}:`);
    console.log(`   - Productos actualizados: ${updatedCount}`);
    console.log(`   - Errores: ${errorCount}`);
}

async function updateAllStores() {
    console.log('🚀 Iniciando sincronización multi tienda...');
    
    const startTime = Date.now();
    
    // Ejecutar sincronización para cada tienda
    for (const [storeKey, storeConfig] of Object.entries(STORES)) {
        try {
            await updateProductsForStore(storeKey, storeConfig);
        } catch (error) {
            console.error(`❌ Error crítico en la sincronización de ${storeConfig.name}:`, error.message);
        }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`\n🎉 Sincronización multi tienda completada en ${duration} segundos`);
}

updateAllStores();