# 4Promo Inventory Cronjob - Multi Tienda

Este cronjob sincroniza el inventario desde 4Promo hacia múltiples tiendas de Shopify.

## Configuración



### Location IDs

**Importante**: Necesitas actualizar el `locationId` para la tienda GNP en el archivo `index.js`. 

El locationId actual está configurado para HH Global:
```javascript
locationId: 'gid://shopify/Location/69743050958'
```

Para obtener el locationId de GNP:
1. Ve a tu tienda GNP en Shopify
2. Ve a Settings > Locations
3. Copia el ID de la ubicación principal
4. Reemplaza el locationId en la configuración de GNP

## Instalación

```bash
npm install
```

## Ejecución

```bash
node index.js
```

## Funcionalidad

- Sincroniza inventario desde 4Promo hacia ambas tiendas (HH Global y GNP)
- Ejecuta la sincronización secuencialmente para cada tienda
- Proporciona logs detallados con el progreso de cada tienda
- Maneja errores de forma individual por tienda
- Muestra estadísticas de productos actualizados y errores

## GitHub Actions

Para usar en GitHub Actions, asegúrate de configurar las variables de entorno en los secrets del repositorio:

- `SHOPIFY_TOKEN_HHGLOBAL`
- `GRAPHQL_URL_HHGLOBAL`
- `SHOPIFY_TOKEN_GNP`
- `GRAPHQL_URL_GNP` 
