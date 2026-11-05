## Readiness — actualización 2026-11-05 10:09 UTC

**Estado: NO LISTO PARA PRODUCCIÓN.**

- #210 8/8 workflows success y #213 12/12 check-runs + 10/10 workflows success; ambas PR siguen Draft/no merge. #213 añade rate limiting solo en su rama, no en main.
- #210 valida 0005–0009 en PostgreSQL 18 desechable; main conserva 0001–0004. No migraciones aplicadas a Neon.
- #213 limita Google OAuth start/bootstrap/callback con HMAC-SHA-256 y contadores atómicos. /auth/me y /auth/logout no cubiertos; runtime CF header/grants no verificados.
- authorization helpers no conectados globalmente; lectura de inventario para Cashier pendiente; principal PostgreSQL real/ownership/grants NO VERIFICADOS.
- Faltan flujos comerciales, pruebas concurrentes entre futuros writers, RPO/RTO medidos, alerta externa de backup y evidencia de coste total USD 0.
- No aplicar migraciones a Neon, desplegar producción, cambiar secretos/Cloudflare/DNS/billing ni tocar datos reales.

