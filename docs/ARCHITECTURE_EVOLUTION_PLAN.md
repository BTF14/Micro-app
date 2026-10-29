# Plan de evolución de arquitectura — Micro app

**Estado:** propuesta de trabajo; no es una auditoría técnica completada ni autoriza una migración.  
**Objetivo:** evolucionar el producto con seguridad, compatibilidad y capacidad de crecimiento para varias organizaciones (tiendas/negocios) y sus sucursales, evitando reescrituras y cambios que rompan operaciones existentes.

## Decisión de criterio sénior

No iniciar una reescritura ni introducir microservicios por anticipado. Mantener la arquitectura actual mientras siga siendo suficiente y mejorarla de forma incremental, guiados por el código existente, pruebas y mediciones. La arquitectura descrita en la documentación del proyecto es React/Vite/TypeScript, API con Cloudflare Workers y Hono, PostgreSQL en Neon y Drizzle; cada componente, versión y configuración deberá confirmarse contra el HEAD actual antes de decidir cambios.

## Secuencia de trabajo

### Fase 0 — Cerrar el trabajo de respaldo en curso
- [ ] Revisar todos los checks de la PR #149 en el SHA exacto y corregir fallos reales antes de fusionar.
- [ ] Configurar el secreto protegido `AGE_PRIVATE_KEY` desde GitHub Actions, sin compartirlo por chat ni almacenarlo en Git.
- [ ] Ejecutar manualmente `.github/workflows/backup-real-restore.yml` y confirmar verificación independiente del checksum, descifrado y restauración en PostgreSQL efímero.
- [ ] Registrar resultado real y limitaciones en `docs/BACKUP_AND_RECOVERY.md`, incluidos RPO/RTO y alertas aún pendientes.
- [ ] No usar Neon `main`, no desplegar producción y no borrar recursos ni copias como parte de esta prueba.

**Puerta de salida:** el workflow real pasa y la documentación distingue claramente lo probado de lo pendiente. Si depende de una clave o check externo, dejarlo señalado sin afirmar éxito.

### Fase 1 — Auditoría de arquitectura existente (primera tarea tras la Fase 0)
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

## Cuándo comenzar

La auditoría de arquitectura comienza inmediatamente después de cerrar la prueba de restauración real del respaldo en curso. No es necesario esperar a completar todas las mejoras de recuperación operativa para empezar el análisis documental y de solo lectura, pero los cambios de esquema o de autorización que afecten producción deben esperar a que exista una base de recuperación comprobada y un plan de pruebas.

**Siguiente paso concreto:** terminar la revisión de PR #149 y, tras su cierre seguro, hacer una auditoría de solo lectura del esquema multiempresa, autenticación/autorización, migraciones y pruebas existentes. No realizar cambios de arquitectura hasta presentar hallazgos y acordar el orden de corrección.
