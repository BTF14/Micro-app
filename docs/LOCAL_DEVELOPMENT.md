# Desarrollo local

## Requisitos

- Node.js 22 o compatible.
- pnpm 10.
- Git.
- No hace falta crear una cuenta de pago para ejecutar el esqueleto.

## Instalar y ejecutar

Desde la raíz del repositorio:

```bash
pnpm install
pnpm dev:web
```

La interfaz Vite se sirve en la dirección local que muestre la terminal.

En otra terminal:

```bash
pnpm dev:api
```

Wrangler inicia la API de Cloudflare Workers en modo local. El endpoint inicial de comprobación es `/health`.

## Comprobaciones

```bash
pnpm build
pnpm test
```

La CI de GitHub ejecuta estas comprobaciones en cada push a `main` y en pull requests.

## Estado y límites del esqueleto

- La pantalla web es provisional.
- La API solo expone un endpoint de salud; no procesa ventas ni inventario.
- La base de datos todavía no está conectada y no se deben introducir datos reales.
- No hay autenticación operativa todavía.
- No publicar la API hasta configurar el origen permitido y los secretos en el entorno de despliegue.
- No guardar secretos en archivos versionados. Usar variables locales ignoradas por Git y secretos del proveedor.
