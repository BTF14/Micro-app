# Checkpoint técnico vivo — 2026-11-06

- main verificado en SHA 38e1d61acc083b3c0b9b73edcb2bc7887ca56872.
- PR #242 (registro de recuperación) fusionada en 7a719d593248341aac86b1ded980d5bb9a6f94e8.
- PR #243 (migraciones canónicas 0001–0015, assertions y runner fail-closed) fusionada en 38e1d61acc083b3c0b9b73edcb2bc7887ca56872. Su HEAD final 481f3b956c96c50b6f956541d1d675646fe66b51 pasó 10/10 workflows, incluyendo PostgreSQL migration validation y migration-runner validation.
- El bundle de migraciones ya está en main. No se ha ejecutado contra Neon producción; la base poblada sigue sin ledger y sin login roles dedicados. El baseline/adoption plan y la autorización específica siguen siendo obligatorios.
- Frente activo: feat/recover-inventory-application-20261106. Portando API y UI de catálogo, creación/edición de productos, BigInt decimal compartido, conteos de inventario idempotentes, locking tenant/branch/warehouse/balance, own-shift authorization, bounded streaming request bodies y aislamiento de previews. Se añadieron pruebas unitarias e integración con roles admin/runtime.
- Se exige Idempotency-Key en creación de conteos; el contrato de DB conserva columnas nullable solo para compatibilidad histórica.
- Política sin descuentos preservada: no hay operaciones discount en autorización ni campos discount en formularios.
- El catálogo se presenta en USD; no se inventa conversión VES hasta integrar y validar BCV. En #227 quedó registrado un riesgo: almacenar primero una tasa con fecha efectiva de mañana puede bloquear la tasa del día actual. Debe corregirse y probarse antes de habilitar el endpoint BCV.
- Checks de esta rama todavía pendientes de ejecutarse sobre su SHA final. No declararla lista hasta CI, PostgreSQL, runtime-role, E2E, seguridad y revisión de diff completos.
- No se realizaron escrituras Neon, cambios de roles/grants, secretos, datos reales, DNS, Cloudflare manual, billing ni despliegue manual. Producción NOT READY.

## Próximos pasos
1. Abrir PR Draft para la rama de recuperación y ejecutar todos los workflows en el HEAD exacto.
2. Corregir fallos reales de tests/typecheck/build/privilegios antes de quitar Draft.
3. Tras integración, recuperar inventory read/movement APIs y completar BCV (incluido el bug de fecha efectiva) antes del checkout app handler.
4. Reconciliar y cerrar las PR originales solo después de rescatar y verificar todos sus cambios únicos.
5. Mantener el gate de Neon producción separado: revisar baseline/adoption y pedir autorización específica antes de cualquier escritura o cambio de roles/grants.
