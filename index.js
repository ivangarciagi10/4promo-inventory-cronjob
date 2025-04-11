const axios = require('axios');

async function get4PromoProducts() {
    const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
    return response.data;
}

async function getProductByHandle(handle) {
    const response = await axios.post(
        'https://gi-hh-global.myshopify.com/admin/api/2024-07/graphql.json',
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
                'X-Shopify-Access-Token': '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',
            }
        }
    );

    return response.data.data.productByHandle;
}

async function updateInventory(input) {
    //Usa esta mutation porque Shopify no permite actualizar inventario por productVariantsBulkUpdate
    const response = await axios.post(
        'https://gi-hh-global.myshopify.com/admin/api/2024-07/graphql.json',
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
                'X-Shopify-Access-Token': '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',
            }
        }
    );

    return response.data.data.inventorySetQuantities.inventoryAdjustmentGroup;
}

//Tiempo de ejecución aproximada: 10 minutos
async function updateProducts() {
    const products = await get4PromoProducts();

    let previousHandle = '';
    let shopifyProduct = {};
    for (const product of products) {
        try {
            const handle = product.nombre_articulo.toLowerCase().replace(/\s+/g, '-') + '-' + product.id_articulo.toLowerCase().replace(/\s+/g, '-');
            if (handle !== previousHandle) { //Previene llamadas innecesarias a Shopify si el producto de 4Promo es una variante
                shopifyProduct = await getProductByHandle(handle);
                console.log(`Producto encontrado por el handle: ${shopifyProduct.title}`);
            };
            previousHandle = handle;
            
            const productVariants = shopifyProduct.variants.nodes;
            for (variant of productVariants) {
                if (variant.title === product.color) {
                    console.log('Variante encontrada:', variant.title, ` Inventario: Prev ${variant.inventoryQuantity} Now ${product.inventario}`);
                    if (variant.inventoryQuantity !== product.inventario) { //Actualiza la variante si el inventario ha cambiado
                        const variantToUpdate = {
                            quantities: {
                                inventoryItemId: variant.inventoryItem.id, //Usa id de inventario porque usar id de variante o producto no funciona
                                locationId: 'gid://shopify/Location/69743050958',
                                quantity: product.inventario,
                            },
                            name: "available",
                            reason: "correction",
                            ignoreCompareQuantity: true, //Desactiva la comparación de inventario para siempre sobreescribir con la info de 4Promo
                        };
                        const response = await updateInventory(variantToUpdate);
                        console.log('Inventario actualizado:', response.changes);
                    }
                }
            }
        } catch (error) {
            console.error(`Error procesando el producto ${product.nombre_articulo} ${product.id_articulo}:`, error);
        }
    }
}

updateProducts();