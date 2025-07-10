# 4Promo Inventory Cronjob - Multi Tienda

Este cronjob sincroniza el inventario desde 4Promo hacia múltiples tiendas de Shopify.



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
