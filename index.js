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
    try {
        console.log('📡 Obteniendo productos de 4Promo...');
        const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
        console.log(`✅ Productos obtenidos de 4Promo: ${response.data.length} productos`);
        return response.data;
    } catch (error) {
        console.error('❌ Error obteniendo productos de 4Promo:', error.message);
        throw error;
    }
}

async function getProductByHandle(handle, storeConfig) {
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
        if (!product) {
            console.log(`⚠️ [${storeConfig.name}] Producto no encontrado para handle: ${handle}`);
            return null;
        }
        
        return product;
    } catch (error) {
        console.error(`❌ [${storeConfig.name}] Error obteniendo producto ${handle}:`, error.message);
        return null;
    }
}

async function updateInventory(input, storeConfig) {
    try {
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

        const result = response.data.data.inventorySetQuantities;
        
        if (result.userErrors && result.userErrors.length > 0) {
            console.error(`❌ [${storeConfig.name}] Errores en actualización de inventario:`, result.userErrors);
            return null;
        }

        return result.inventoryAdjustmentGroup;
    } catch (error) {
        console.error(`❌ [${storeConfig.name}] Error actualizando inventario:`, error.message);
        return null;
    }
}

//Tiempo de ejecución aproximada: 10 minutos por tienda
async function updateProductsForStore(storeKey, storeConfig) {
    console.log(`\n🔄 Iniciando sincronización para ${storeConfig.name}...`);
    
    const products = await get4PromoProducts();
    console.log(`📊 Total de productos de 4Promo a procesar: ${products.length}`);

    let previousHandle = '';
    let shopifyProduct = null;
    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    let noMatchCount = 0;
    let noInventoryCount = 0;
    let processedProducts = new Set();
    
    for (const product of products) {
        try {
            // Validar que el producto tenga inventario válido
            if (product.inventario === null || product.inventario === undefined || product.inventario === '') {
                console.log(`⚠️ [${storeConfig.name}] Producto sin inventario: ${product.nombre_articulo} (${product.id_articulo}) - Color: ${product.color}`);
                noInventoryCount++;
                continue;
            }

            const handle = product.nombre_articulo.toLowerCase().replace(/\s+/g, '-') + '-' + product.id_articulo.toLowerCase().replace(/\s+/g, '-');
            
            // Log cada producto que se está procesando
            console.log(`\n🔍 [${storeConfig.name}] Procesando: ${product.nombre_articulo} (${product.id_articulo}) - Color: ${product.color} - Inventario: ${product.inventario}`);
            console.log(`   Handle generado: ${handle}`);
            
            if (handle !== previousHandle) {
                shopifyProduct = await getProductByHandle(handle, storeConfig);
                if (shopifyProduct) {
                    console.log(`✅ [${storeConfig.name}] Producto encontrado: ${shopifyProduct.title} (ID: ${shopifyProduct.id})`);
                    console.log(`   Variantes disponibles: ${shopifyProduct.variants.nodes.map(v => v.title).join(', ')}`);
                } else {
                    console.log(`❌ [${storeConfig.name}] Producto NO encontrado para handle: ${handle}`);
                    notFoundCount++;
                    previousHandle = handle; // Importante: actualizar previousHandle para evitar bucle infinito
                    continue;
                }
                previousHandle = handle;
            }
            
            // Verificar que shopifyProduct no sea null antes de continuar
            if (!shopifyProduct) {
                console.log(`⚠️ [${storeConfig.name}] No hay producto de Shopify para procesar`);
                continue;
            }
            
            const productVariants = shopifyProduct.variants.nodes;
            let variantFound = false;
            
            for (const variant of productVariants) {
                console.log(`   🔍 Comparando variante: "${variant.title}" con color: "${product.color}"`);
                
                if (variant.title === product.color) {
                    variantFound = true;
                    console.log(`✅ [${storeConfig.name}] Variante encontrada: ${variant.title}`);
                    console.log(`   Inventario actual: ${variant.inventoryQuantity} | Nuevo inventario: ${product.inventario}`);
                    
                    if (variant.inventoryQuantity !== product.inventario) {
                        console.log(`🔄 [${storeConfig.name}] Actualizando inventario...`);
                        
                        const variantToUpdate = {
                            quantities: {
                                inventoryItemId: variant.inventoryItem.id,
                                locationId: storeConfig.locationId,
                                quantity: product.inventario,
                            },
                            name: "available",
                            reason: "correction",
                            ignoreCompareQuantity: true,
                        };
                        
                        const response = await updateInventory(variantToUpdate, storeConfig);
                        if (response) {
                            console.log(`✅ [${storeConfig.name}] Inventario actualizado exitosamente:`, response.changes);
                            updatedCount++;
                        } else {
                            console.log(`❌ [${storeConfig.name}] Falló la actualización del inventario`);
                            errorCount++;
                        }
                    } else {
                        console.log(`ℹ️ [${storeConfig.name}] Inventario ya está actualizado`);
                    }
                    break;
                }
            }
            
            if (!variantFound) {
                console.log(`❌ [${storeConfig.name}] No se encontró variante que coincida con el color: ${product.color}`);
                noMatchCount++;
            }
            
            processedProducts.add(`${product.nombre_articulo}-${product.id_articulo}-${product.color}`);
            
        } catch (error) {
            console.error(`❌ [${storeConfig.name}] Error procesando el producto ${product.nombre_articulo} ${product.id_articulo}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n📊 [${storeConfig.name}] Resumen de sincronización:`);
    console.log(`   - Productos procesados: ${processedProducts.size}`);
    console.log(`   - Productos actualizados: ${updatedCount}`);
    console.log(`   - Productos no encontrados: ${notFoundCount}`);
    console.log(`   - Variantes sin coincidencia: ${noMatchCount}`);
    console.log(`   - Productos sin inventario: ${noInventoryCount}`);
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