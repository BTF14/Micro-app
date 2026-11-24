# ADR — Servicio compartido de autorización administrativa, PIN y recuperación

- **ID:** ADR-20261109-admin-authorization-pin-recovery
- **Estado:** proposed
- **Fecha:** 2026-11-09
- **Ámbito:** reautenticación sensible para BCV, calendario bancario y futuras acciones administrativas.
- **Relacionado:** `docs/sdd/FX_CONTINGENCY_MANAGEMENT.md`, `docs/sdd/BANKING_CALENDAR_VERSIONING.md`, `docs/decisions/ADR-20261109-fx-contingency-authorization.md`, `docs/CONSTITUTION.md`, matriz de permisos.

## Contexto

BCV y el calendario bancario necesitan confirmar acciones sensibles. Dos sistemas de PIN independientes duplicarían lógica de seguridad y recuperación; un PIN compartido entre empleados, un PIN maestro o una autorización reutilizable permitirían abuso y confusión de permisos. El usuario también necesita una recuperación segura si olvida el PIN.

## Decisión propuesta

Crear un único servicio de reautenticación/autorización administrativa con políticas por dominio y acción. Comparte identidad, verificación de PIN, rate limiting, recuperación, revocación, notificaciones y auditoría, pero nunca comparte permisos ni autorizaciones consumibles entre dominios.

1. PIN individual vinculado a cuenta autenticada; no sustituye login, MFA ni autorización server-side.
2. Para pequeño negocio, mantener el mínimo documental de 8 dígitos. En empresa, contraseña reciente + MFA; doble aprobación configurable por dos personas distintas.
3. Preferir Argon2id con salt aleatorio único y parámetros calibrados en el runtime real. No almacenar PIN reversible ni usar hashes rápidos. Referencia: OWASP Password Storage Cheat Sheet.
4. Parámetro inicial a validar: cinco intentos fallidos por ventana, bloqueo temporal de 15 minutos y backoff progresivo para reincidencia. Contadores atómicos en servidor/DB; protección por cuenta y señales adicionales, no solo IP. No crear bloqueos permanentes automáticos.
5. Cambio normal requiere PIN actual y reautenticación apropiada. Olvido significa restablecimiento, nunca recuperación/visualización del PIN. Email por sí solo no basta: exigir reautenticación de cuenta y MFA o código de recuperación de un solo uso.
6. En empresas con varios responsables, exigir aprobación independiente para recuperación de alto riesgo según política. Para Owner único, diseñar verificación extraordinaria de propiedad sin puerta trasera ni PIN maestro.
7. Restablecer/revocar invalida el PIN anterior, sesiones protegidas y autorizaciones pendientes/no consumidas; genera alerta y evento append-only.
8. Cada reautenticación queda ligada a dominio, acción, tenant, sucursal/alcance, datos exactos/resumen, nonce e idempotency key. Expira pronto y se consume una sola vez dentro de la transacción de autorización.
9. Permisos independientes: por ejemplo `fx.contingency.authorize` y `banking_calendar.publish`. La carga, edición, aprobación y publicación del calendario también se separan. La matriz de roles debe asignar cada permiso; no asumir que todo Admin lo tiene.
10. No revelar existencia de cuenta/PIN mediante errores; no registrar PIN, códigos de recuperación ni tokens en logs/analytics.
11. Registrar intentos, bloqueos, cambios, recuperación, revocaciones y autorizaciones con retención proporcional y acceso restringido.
12. Ante estado desconocido, fallo de DB, verificación incompleta o autorización expirada/revocada: fail-closed.

## Alternativas rechazadas

- Dos implementaciones PIN independientes: duplicación y divergencia de seguridad.
- PIN compartido o PIN maestro: no atribuye identidad y crea bypass de alto impacto.
- Recuperación por email solamente: factor insuficiente para autorizar cambios sensibles.
- Bloqueo permanente automático tras intentos fallidos: facilita denegación de servicio contra la cuenta.
- Reutilizar una verificación PIN para varias operaciones: amplía indebidamente su alcance.
- Conceder permisos por pertenecer al rol genérico Admin: viola mínimo privilegio y la matriz pendiente.

## Consecuencias y gates

- Reutilización de controles y comportamiento consistente entre módulos.
- Requiere auditar autenticación, sesiones, MFA, recuperación, auditoría y runtime antes de seleccionar implementación/KDF definitiva.
- Los valores 5/15 son parámetros iniciales de producto para pruebas, no umbrales infalibles. Deben ajustarse con pruebas de concurrencia, abuso, latencia y riesgo de lockout.
- No implementar endpoints ni migraciones hasta cerrar los controles Nivel 1, matriz de permisos y modelo de auditoría.
- No se habilita aún ni BCV manual ni publicación de calendario.

## Referencias externas de seguridad

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html — Argon2id, salt único y calibración de parámetros.
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html — validación por capas, firma, límites, almacenamiento privado, antivirus/sandbox y CDR para cargas.
- El diseño PDF detallado está en `docs/sdd/BANKING_CALENDAR_VERSIONING.md`.

## Historial

- 2026-11-09 — propuesta transversal derivada de la decisión del propietario de unificar autorización, PIN, recuperación y controles antiabuso para BCV y calendario. No implementada.


## Gate adicional — KDF y límites reales de Cloudflare Workers Free

No cerrar Argon2id como implementación hasta medirlo en el runtime desplegado. La documentación oficial de Cloudflare indica que Workers Free limita el CPU a 10 ms por invocación HTTP y por Cron, con 128 MB de memoria. Una KDF memory-hard puede superar el presupuesto de CPU aunque quepa en memoria.

- Benchmark reproducible en Workers Free para Argon2id con parámetros de producción, midiendo CPU real, memoria, latencia p95/p99 y comportamiento bajo concurrencia.
- Evaluar PBKDF2-HMAC-SHA-256 mediante WebCrypto solo si el benchmark y revisión de seguridad justifican los parámetros. No reducir iteraciones por debajo de la recomendación aplicable para "hacerlo caber".
- No sustituir por SHA-256 rápido, hash simple ni cifrado reversible.
- Si ninguna KDF adecuada cabe en el límite gratuito, no habilitar PIN débil ni asumir plan de pago. Evaluar WebAuthn/passkeys o reautenticación fuerte como alternativa, o aplazar la función hasta tener un runtime seguro y presupuestariamente viable.
- Si se usa pepper, almacenarlo como secreto del Worker separado de la base de datos; nunca en el repositorio, base de datos, logs ni telemetría. Diseñar rotación y recuperación antes de depender de él.
- Bloquear PINs comunes, secuenciales, repetidos y patrones triviales. No usar fechas de nacimiento ni datos públicos.

## Códigos de recuperación

Si se habilitan códigos de recuperación, deben ser de alta entropía generados por CSPRNG, mostrarse una sola vez, almacenarse solo como verificadores hash, consumirse atómicamente una sola vez y estar sujetos a rate limit. No enviarlos por email ni incluirlos en logs. Generar un nuevo conjunto invalida el anterior y deja auditoría.

Referencia oficial de límites: https://developers.cloudflare.com/workers/platform/limits/ (consulta 2026-11-09; Workers Free: 10 ms CPU por invocación HTTP/Cron, 128 MB RAM).
