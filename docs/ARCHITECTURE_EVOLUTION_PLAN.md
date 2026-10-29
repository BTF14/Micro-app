# Plan de evolución de arquitectura — Micro app

**Estado:** propuesta de trabajo; no es una auditoría técnica completada ni autoriza una migración.  
**Objetivo:** evolucionar el producto con seguridad, compatibilidad y capacidad de crecimiento para varias organizaciones (tiendas/negocios) y sus sucursales, evitando reescrituras y cambios que rompan operaciones existentes.

## Decisión de criterio sénior

No iniciar una reescritura ni introducir microservicios por anticipado. Mantener la arquitectura actual mientras siga siendo suficiente y mejorarla de forma incremental, guiados por el código existente, pruebas y mediciones. La arquitectura descrita en la documentación del proyecto es React/Vite/TypeScript, API con Cloudflare Workers y Hono, PostgreSQL en Neon y Drizzle; cada componente, versión y configuración deberá confirmarse contra el HEAD actual antes de decidir cambios.

## Secuencia de trabajo

### Fase 0 — Respaldo: restauración técnica verificada; recuperación completa aún pendiente

- [x] PR #149 fusionada el 2026-10-29 (merge commit `8d40a90b20545689f346422175b3f0b7f176282d`), para verificar la restauración del backup remoto exacto.
- [x] Ejecutado el workflow real [run 40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124): checksum del objeto remoto correcto, descifrado y restauración en PostgreSQL 18 efímero.
- [x] Registrada la evidencia y sus límites en `docs/BACKUP_AND_RECOVERY.md` y `docs/CURRENT_STATE.md`.
- [ ] Validar conteos/relaciones de datos comerciales poblados con datos sintéticos o metadatos no sensibles.
- [ ] Medir RPO/RTO, comprobar alerta de fallo, retención y evidencia del coste total $0.
- No usar Neon `main`, datos reales ni despliegues de producción; no borrar recursos ni copias.

**Puerta de salida:** la restauración técnica de la copia remota exacta está verificada. El gate de recuperación operativa completa sigue abierto hasta demostrar integridad de datos, RPO/RTO, alertas y coste.

### Fase 1 — Auditoría de arquitectura existente (en curso; lectura y diagnóstico)
- [ ] Confirmar el HEAD, estructura real, límites entre frontend/API/DB, rutas, servicios, esquema Drizzle, migraciones y flujos de autenticación/autorización.
- [ ] Trazar un flujo representativo completo: sesión → resolución de organización/sucursal → endpoint → consulta/escritura de DB → auditoría.
- [ ] Inventariar entidades y relaciones que deben pertenecer a una organización, cómo se determina el tenant en cada petición y si algún identificador enviado por el cliente se confía indebidamente.
- [ ] Revisar constraints, índices, transacciones, idempotencia, concurrencia y riesgos de consultas N+1.
- [ ] Mapear tests actuales y huecos; distinguir hechos comprobados de hipótesis.
- [ ] Entregar hallazgos priorizados por severidad, impacto, esfuerzo y riesgo; proponer cambios pequeños, no ejecutarlos todos de golpe.

**Entregable:** informe en el repositorio con arquitectura actual, límites de confianza, riesgos demostrados, deuda técnica y plan de cambios priorizado.

### Fase 2 — Aislamiento multiempresa y sucursales
- [ ] Definir claramente los conceptos: organización/tenant (propietario lógico), sucursal/tienda física, usuario, membresía y roles/permisos.
- [ ] Verificar que cada recurso y relación comercial queda vinculado al tenant correcto; definir cuáles recursos son globales y cuáles son por organización o sucursal.
- [ ] Derivar el tenant desde una sesión/membresía autorizada en el servidor, no confiar en un `tenant_id` arbitrario enviado por el cliente.
- [ ] Evaluar PostgreSQL Row-Level Security (RLS) como defensa adicional, junto con autorización en API. Antes de habilitarlo, probar el rol DB, el pool/conexiones, las transacciones y el contexto por petición; evitar fugas de contexto entre solicitudes.
- [ ] Añadir pruebas negativas entre dos tenants para lectura, escritura, listados, búsquedas, exportaciones, archivos y tareas en segundo plano.
- [ ] Aplicar migraciones compatibles y en pasos: expandir esquema, desplegar código compatible, rellenar/verificar datos y contraer solo después de confirmar que ya no se usa la estructura anterior.

**Regla de aceptación:** una prueba automatizada demuestra que una organización A no puede leer ni alterar datos de B, incluso manipulando IDs, filtros, rutas y cuerpos de petición.

### Fase 3 — Integridad de negocio
- [ ] Revisar ventas, pagos, devoluciones, inventario, movimientos y auditoría como operaciones transaccionales.
- [ ] Definir claves de idempotencia para reintentos de operaciones que no deben duplicarse.
- [ ] Definir reglas de concurrencia y restricciones de DB; no depender únicamente de validaciones de interfaz.
- [ ] Comprobar trazabilidad: quién hizo qué, cuándo, en qué organización/sucursal y con qué resultado, evitando registrar secretos o datos innecesarios.

### Fase 4 — Cambios seguros y dependencias mantenibles
- [ ] Exigir CI verde, revisión del diff, migraciones comprobadas y pruebas de regresión relevantes antes de fusionar.
- [ ] Fijar versiones y actualizar primero parches de seguridad compatibles; evaluar versiones menores/mayores con changelogs, matriz de compatibilidad y pruebas.
- [ ] Usar flags solo cuando aporten una estrategia de activación/desactivación real; no acumular flags sin propietario ni fecha de retirada.
- [ ] Documentar contratos de API y compatibilidad frontend/backend para que una versión nueva pueda convivir temporalmente con la anterior.
- [ ] Añadir pruebas de rendimiento reproducibles para flujos críticos antes de optimizar o cambiar la infraestructura.

## Fase 5A — Límites de proveedor y capacidad multiempresa (obligatorio antes de declarar capacidad)

Consultar [CAPACITY_AND_LIMITS.md](./CAPACITY_AND_LIMITS.md). No fijar un número de empresas, sucursales o usuarios por intuición. Auditar Neon, Workers, Pages y servicios auxiliares; confirmar cuotas vigentes; medir escenarios sintéticos en entornos efímeros/autorizados; establecer capacidad demostrada, límite operativo con margen y umbrales de alerta. No generar carga en producción, no tocar Neon `main`, no activar costes ni cambiar planes sin autorización.

### Fase 5 — Escalado basado en evidencia
- [ ] Medir latencia, errores, uso de CPU/memoria, conexiones, consultas lentas, tamaño de tablas y carga por tenant.
- [ ] Mejorar primero índices, consultas, paginación, límites de petición, caché segura y tareas asíncronas donde los datos demuestren necesidad.
- [ ] Considerar separar cargas, bases de datos o servicios únicamente ante límites medidos, requisitos de aislamiento/cumplimiento o necesidades de disponibilidad.
- [ ] Definir presupuestos y límites antes de habilitar cualquier servicio con coste. No cambiar planes ni activar recursos de pago sin autorización explícita.

## Principios que no se negocian

1. **No romper clientes existentes:** cambios aditivos y compatibles antes de retirar contratos antiguos.
2. **Una PR pequeña y verificable por objetivo:** no abrir múltiples PRs solapadas ni dejar ramas de trabajo abandonadas.
3. **No fusionar por intuición:** inspeccionar el diff y el estado real de los checks en el SHA exacto.
4. **No confundir documentación con evidencia:** todo estado debe indicar cómo se verificó y qué falta.
5. **Seguridad por capas:** autorización de servidor, constraints de base de datos y, cuando sea viable, RLS con pruebas.
6. **No añadir complejidad sin motivo:** monolito modular antes que microservicios prematuros.
7. **Cambios de alto riesgo reversibles:** plan de rollback, backup comprobado y migraciones compatibles antes de alterar datos.

## Auditoría de solo lectura actualizada — main `0ba45e47` (2026-10-29 UTC)

La PR [#153](https://github.com/BTF14/Micro-app/pull/153) está fusionada; el hallazgo del secreto en URL queda corregido en el código de main, no verificado en producción. La referencia anterior a main `70984baf` que sigue en secciones históricas no describe el HEAD actual.

### Rutas y autorización

- `apps/api/src/index.ts` monta rutas de auth y `GET /health`; no hay handlers HTTP comerciales para catálogo, proveedores, inventario, ventas, pagos o devoluciones.
- `/auth/register` y `/auth/login` fallan cerrados; `/auth/me`, `/auth/logout`, `/auth/google` (GET/POST) y `/auth/google/callback` son las rutas de identidad inspeccionadas.
- `resolveTenantContext` en `apps/api/src/tenant-context.ts` valida sesión vigente, usuario, membresía y organización activas, pero explícitamente no autoriza una operación comercial. Como todavía no hay handlers comerciales, no se puede demostrar aislamiento HTTP end-to-end.
- `docs/sdd/role-permission-decision-matrix.md` permanece sin aprobación del propietario. No implementar permisos comerciales a partir de esta propuesta.

### Relaciones y límites del esquema revisado

- Migraciones revisadas: `0001_initial.sql` y `0002_google_identity.sql`. Entidades: organizaciones, usuarios, membresías, sesiones, límites de autenticación, proveedores, productos, tasas de cambio, ventas, líneas de venta, pagos, movimientos de inventario, auditoría, allowlist y bootstrap.
- Restricciones compuestas existentes protegen relaciones dentro de la organización para producto/proveedor, venta/miembro, línea/venta/producto, pago/venta/miembro, movimiento/producto/miembro y auditoría/miembro. Esto protege integridad referencial, no sustituye filtros tenant y autorización en cada futura consulta.
- `products.stock_quantity` vive en el producto de la organización, no en una ubicación. No se encontró tabla de sucursales, categorías, compras/recepciones, caja/turnos ni entidad de devolución en las migraciones revisadas. No añadir solo `branch_id` sin definir ownership de catálogo/precios, stock por ubicación, compras, caja y permisos.
- `sales` tiene idempotency key única por organización y checks de subtotal/descuento/total. Las constraints revisadas no concilian automáticamente el total con la suma de líneas/pagos ni el saldo de stock con el libro de movimientos; la futura operación debe ser transaccional, idempotente y probada con fallos/concurrencia.
- `inventory_movements.reference_type/reference_id` es una referencia polimórfica sin FK a una entidad concreta; cualquier handler deberá validar el origen en servidor y escribir movimiento/auditoría junto con la operación de negocio.
- No se ha ejecutado SQL ni se ha aplicado migración; revisión basada en archivos de main, sin acceso a datos de Neon.

### PR #153 — estado de seguridad

- Merge commit `0ba45e47daa5af9bbd9034690443405aa8bedf44`, HEAD de PR `e7af00db2db27ad4bacd0246447df173d415bbe4`. Los checks de PR reportados pasaron; Codex no pudo completar revisión por cuota y no existe revisión independiente registrada.
- El cambio impide transporte nuevo del secreto por URL. No demuestra ausencia de registros históricos ni que la corrección esté desplegada en producción.
- Hardening adicional a revisar: el validador `FRONTEND_ORIGIN` de `google-auth.ts` no restringe protocolo a HTTPS/localhost como el validador global de `index.ts`. Es una inconsistencia de configuración; no hay evidencia de explotación. Corregir en un cambio de seguridad pequeño con pruebas de HTTP no local y URL malformada.

### Decisiones necesarias antes de crear el modelo de sucursales

1. Determinar si los productos y precios son compartidos por organización o pueden variar por sucursal; separar catálogo global de existencias por ubicación si corresponde.
2. Definir si proveedores/compras se asignan a organización o a sucursal y cómo se distribuye la recepción de mercancía.
3. Definir permisos a nivel de organización y sucursal, incluyendo acceso a varias sucursales y restricciones de caja/inventario.
4. Determinar qué entidades necesitan `branch_id` y claves únicas/foráneas compuestas, y cuáles siguen siendo globales dentro del tenant.
5. Diseñar migración aditiva y pruebas sintéticas A/B entre organizaciones y entre sucursales antes de implementar endpoints. No aplicar migraciones a Neon `main`.

## Cuándo comenzar

La auditoría de solo lectura puede avanzar ya que la restauración técnica real está verificada. No es necesario esperar a completar RPO/RTO, alertas o el manifiesto de datos para leer el código; sin embargo, cualquier cambio de esquema o autorización que pudiera afectar datos reales queda bloqueado hasta disponer de pruebas aisladas, estrategia de recuperación y revisión del diff.

**Siguiente paso concreto:** completar el inventario de consultas y constraints por entidad, revisar la matriz de permisos por rol y definir explícitamente el modelo organización → sucursal → membresía/rol. No implementar el esquema de sucursales hasta cerrar esas decisiones con evidencia y pruebas.
