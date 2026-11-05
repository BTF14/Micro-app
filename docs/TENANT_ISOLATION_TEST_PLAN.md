## Cobertura de aislamiento — actualización 2026-11-05 10:09 UTC

PR #213 HEAD `0c1e5e40eb259cc50d0a3f602e96e07bd88fac32` pasó 12/12 check-runs y 10/10 workflows; añade tests PostgreSQL de rate limit concurrente, fixed-window reset, bootstrap/callback y 429/Retry-After. Los buckets usan HMAC con GOOGLE_CLIENT_SECRET y CF-Connecting-IP. No hay migración nueva y el código sigue en Draft separado, no en main.

La pila #200→#210 añade y prueba inventario/ledger en PostgreSQL desechable, pero no equivale a cobertura de todos los handlers comerciales. #210 HEAD `ab5d2168a11a825a9ed6b03341b3091c13f3c06e` tiene 8/8 workflow runs success; migraciones 0005–0009 no están en main ni Neon.

Cobertura actual: catálogo GET tenant-scoped; catálogo POST/PATCH Owner/Admin; conteos create/confirm Owner/Admin/Inventory con branch scope y locks; assertions SQL cross-tenant/branch; migración 0009 balance↔ledger. Cashier aún no tiene endpoint de lectura de balances/movimientos a pesar del permiso aprobado. authorization.ts no es middleware global. /auth/me y /auth/logout siguen sin rate limit.

Pendiente: tests HTTP negativos por ruta para tenant, branch, rol, membresía revocada e IDs ajenos; límites de abuso en sesiones si se aprueban; tests PostgreSQL concurrentes entre futuros writers. Mantener issue #53 abierta y producción NO LISTA.

