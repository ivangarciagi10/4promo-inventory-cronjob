require('dotenv').config();
const axios = require('axios');
const { getLocationId, getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function get4PromoProducts() {
    const response = await axios.get('https://4promotional.net:9090/WsEstrategia/inventario');
    return response.data;
}

async function updateProducts() {
    const products = await get4PromoProducts();

    const locationId = await getLocationId();
    const uniqueModels = [...new Set(products.map(p => p.id_articulo))];
    for (const model of uniqueModels) {
        // if (model !== '4f0-tra') continue; // If para pruebas con un producto específico
        const activeVariants = products.filter(p => p.id_articulo === model);
        const product = activeVariants[0];
        try {
            const handle = `4p-${product.id_articulo}`.trim().toLowerCase().replace(/[\s]+/g, '-');
            const shopifyProduct = await getProductByHandle(handle);
            if (!shopifyProduct) {
                continue;
            }

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const activeVariant of activeVariants) {
                const variant = shopifyVariants.find(v => v.sku === `${activeVariant.id_articulo} ${activeVariant.color}`);
                const variantInventory = activeVariant.inventario;
                console.log(`Variante encontrada: ${shopifyProduct.title} ${variant.title}, Inventario: Prev ${variant.inventoryQuantity} Now ${variantInventory}`);

                if (variant.inventoryQuantity !== variantInventory) {
                    const variantToUpdate = {
                        quantities: {
                            changeFromQuantity: null,
                            inventoryItemId: variant.inventoryItem.id,
                            locationId,
                            quantity: variantInventory,
                        },
                        name: "available",
                        reason: "correction",
                    };
                    const response = await updateInventory(variantToUpdate);
                    console.log('Inventario actualizado:', response.changes);
                }
            }
            // break;
        } catch (error) {
            console.error(`Error actualizando el producto ${product.nombre_articulo} ${product.id_articulo}:`, error);
        }
    }
}

updateProducts();