const axios = require('axios');
require('dotenv').config();

async function getLocationId(storeName, token, graphqlUrl) {
    try {
        const response = await axios.post(
            graphqlUrl,
            JSON.stringify({
                query: `
                    query {
                        locations(first: 10) {
                            nodes {
                                id
                                name
                                address {
                                    address1
                                    city
                                    country
                                }
                            }
                        }
                    }
                `,
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': token,
                }
            }
        );

        const locations = response.data.data.locations.nodes;
        console.log(`\n📍 Ubicaciones disponibles en ${storeName}:`);

        locations.forEach((location, index) => {
            console.log(`${index + 1}. ${location.name}`);
            console.log(`   ID: ${location.id}`);
            if (location.address) {
                console.log(`   Dirección: ${location.address.address1}, ${location.address.city}, ${location.address.country}`);
            }
            console.log('');
        });

        return locations;
    } catch (error) {
        console.error(`❌ Error obteniendo ubicaciones de ${storeName}:`, error.message);
        return [];
    }
}

async function main() {
    console.log('🔍 Obteniendo Location IDs de las tiendas...\n');

    // Obtener ubicaciones de HH Global
    await getLocationId(
        'HH Global',
        process.env.SHOPIFY_TOKEN_HHGLOBAL,
        process.env.GRAPHQL_URL_HHGLOBAL
    );

    // Obtener ubicaciones de GNP
    await getLocationId(
        'GNP',
        process.env.SHOPIFY_TOKEN_GNP,
        process.env.GRAPHQL_URL_GNP
    );

    await getLocationId(
        'PSP',
        process.env.SHOPIFY_TOKEN_PSP,
        process.env.GRAPHQL_URL_PSP
    );

    console.log('💡 Copia el ID de la ubicación principal de cada tienda y actualiza el locationId en index.js');
}

main().catch(console.error);