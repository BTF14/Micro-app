# Production readiness — BTF14/Micro-app

**Estado global: NO LISTO PARA PRODUCCIÓN.** Todas las PR mencionadas siguen Draft y sin merge; no se ha desplegado producción ni aplicado migraciones a Neon productivo.

## Evidencia técnica actual

| Área | Estado | Evidencia / límite |
|---|---|---|
| Inventario balance↔ledger | Validación CI | #210 HEAD `ab5d2168...`, 8/8 workflows; migraciones 0001–0009 en PostgreSQL efímero |
| OAuth rate limiting | Implementado en ramas | #214/#215; #213 es alternativa independiente que requiere reconciliación |
| Bootstrap handoff | Validación histórica | #215 HEAD `9ba4f76e...`; 7/7 workflows según snapshot anterior |
| Autorización de rutas existentes | CI success | #218 HEAD `2115d66...`, 6/6 workflows |
| Body bootstrap acotado | CI pendiente | #220 HEAD `983a76ea...`; Security y Secret history success; CI/migration/Playwright/Semgrep pendientes |
| Worker Preview | Pendiente | No confundir Pages Preview o Worker Build con versión productiva |
| Runtime PostgreSQL | No verificado | Principal efectivo, ownership y grants de DATABASE_URL desconocidos |
| Sesiones / idle timeout | Pendiente de decisión | Duración absoluta 7 días; last_seen_at no se actualiza en resolución de sesión |
| Cashier stock/ledger read | No implementado | Falta endpoint específico de balances/movimientos |
| Backup/DR | Parcial | Faltan RPO/RTO medidos, alerta externa y coste total USD 0 |

## Gates obligatorios antes de cualquier producción

- [ ] Revisión formal de #210–#220 y reconciliación de #213 frente a #214.
- [ ] Completar CI del HEAD exacto #220 y revisar todos los jobs/steps.
- [ ] Verificar Worker Preview aislado; Pages Preview no demuestra Worker isolation.
- [ ] Provisionar AUTH_RATE_LIMIT_HMAC_KEY como secreto cifrado en el entorno correcto; no reutilizar GOOGLE_CLIENT_SECRET por conveniencia.
- [ ] Verificar que CF-Connecting-IP procede del ingress Cloudflare confiable y no de un header controlable por cliente.
- [ ] Verificar grants/ownership del runtime DB role para auth_rate_limits y auth_bootstrap_attempts mediante procedimiento read-only aprobado; no leer secretos.
- [ ] Confirmar secuencia y aplicación de migraciones 0001–0010 en entorno aislado antes de considerar cualquier destino real.
- [ ] Pruebas por rol, tenant y branch en cada endpoint existente y nuevo.
- [ ] Definir política de inactividad de sesión con impacto POS/cajeros, sin reducir sesiones a ciegas.
- [ ] Medir RPO/RTO, alertas externas de backup y coste total USD 0.
- [ ] Aprobación formal de lanzamiento.

## Restricciones vigentes

No mergear PRs, desplegar producción, tocar Neon principal, datos reales, secretos, Cloudflare productivo, DNS, billing ni main. Issue #53 permanece OPEN/P0. Un CI verde, Pages Preview o Worker Build Preview no certifica producción.
