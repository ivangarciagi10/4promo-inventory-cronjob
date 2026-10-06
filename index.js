require('dotenv').config();
const axios = require('axios');
const { getLocationId, paginateProductsByVendor, updateInventory } = require('./shopifyFunctions');

async function get4PromoProducts() {
    const response = await axios.get('https://api-external-clients.4promotional.net/api/products', {
        headers: {
            'Authorization': `Bearer ${process.env.FP_AUTH_TOKEN}`
        },
    });
    return response.data;
}

function getStores() {
    const storeNames = process.env.STORES.split(',');

    return storeNames.map(name => ({
        name,
        graphqlUrl: process.env[`GRAPHQL_URL_${name}`],
        shopifyToken: process.env[`SHOPIFY_TOKEN_${name}`],
    }));
}

async function updateProducts(store, products) {
    const locationId = await getLocationId(store);
    const shopifyProducts = await paginateProductsByVendor(store, '4Promo');
    const uniqueModels = [...new Set(products.map(p => p.id_articulo))];
    for (const model of uniqueModels) {
        // if (model !== 'WIDE BODY') continue; // If para pruebas con un producto específico
        const activeVariants = products.filter(p => p.id_articulo === model);
        const product = activeVariants[0];
        try {
            const handle = `4p-${product.id_articulo}`.trim().toLowerCase().replace(/[\s]+/g, '-');
            const shopifyProduct = shopifyProducts.find(p => p.handle === handle);
            if (!shopifyProduct) continue;

            const shopifyVariants = shopifyProduct.variants.nodes;
            const activeVariantBySKU = new Map(activeVariants.map(v => [`${v.id_articulo} ${v.color}`, v]));

            for (const variant of shopifyVariants) {
                const activeVariant = activeVariantBySKU.get(variant.sku);
                const targetInventory = activeVariant ? parseInt(activeVariant.inventario, 10) : 0;
                const label = activeVariant ? 'Variante existente' : 'Variante faltante';
                console.log(`[${store.name}] ${label}: ${shopifyProduct.title} ${variant.title}, Prev ${variant.inventoryQuantity} Now ${targetInventory}`);

                if (variant.inventoryQuantity === targetInventory) continue;

                const variantToUpdate = {
                    quantities: {
                        changeFromQuantity: null,
                        inventoryItemId: variant.inventoryItem.id,
                        locationId,
                        quantity: targetInventory,
                    },
                    name: "available",
                    reason: "correction",
                };
                const response = await updateInventory(store, variantToUpdate);
                console.log(`[${store.name}] Inventario actualizado:`, response.changes);
            }
            // break;
        } catch (error) {
            console.error(`[${store.name}] Error actualizando ${product.nombre_artd} ${product.id_articulo}:`, error);
        }
    }
}

async function main() {
    const products = await get4PromoProducts();

    const stores = getStores();
    for (const store of stores) {
        await updateProducts(store, products);
    }
}

main();
