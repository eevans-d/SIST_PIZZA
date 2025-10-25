# Seguridad en Producción: CSP y CORS

## CORS
- Definir ALLOWED_ORIGINS con dominios exactos (ej: https://app.sistpizza.com)
- Evitar comodines en producción

## Helmet CSP
Ejemplo recomendado (ajustar rutas y fuentes):

```ts
import helmet from 'helmet';

app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://api.sistpizza.com', 'https://*.supabase.co'],
  },
}));
```

## Notas
- Activar CSP solo en producción para evitar fricción en dev.
- Revisar consola del navegador para ajustar políticas.
