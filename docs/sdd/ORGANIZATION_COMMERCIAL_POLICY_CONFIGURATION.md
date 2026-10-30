# Diseño: políticas comerciales configurables por organización

**Estado:** propuesta técnica para revisión; no implementada y no autoriza migraciones ni endpoints comerciales.  
**Fecha:** 2026-10-30 UTC  
**Base verificada:** `main` en `4ab229296d8858c8c553e00a633a762b9c26a81b`.  
**Relacionado:** `docs/SAAS_ARCHITECTURE_DECISIONS.md`, `docs/sdd/role-permission-decision-matrix.md`, `docs/SCHEMA_REVIEW.md`.

## 1. Decisión de producto que queda fijada

Micro app es una plataforma para que cada organización gestione su operación. La plataforma no debe imponer una política comercial universal sobre descuentos ni decidir cómo una empresa vende.

- Cada organización define y administra sus propias políticas comerciales mediante configuración propia.
- Micro app aporta mecanismos seguros para almacenar, versionar, aplicar y auditar esa configuración.
- No se codifican porcentajes, importes máximos, umbrales de aprobación ni permisos de descuento universales.
- Una organización puede decidir no permitir descuentos, permitirlos bajo sus propias condiciones o delegar autorizaciones según su gobierno interno.
- Las capacidades disponibles en la plataforma no equivalen a una política activa: la organización debe configurarla explícitamente.
- Los roles autorizados para crear/cambiar esa configuración se determinarán en la matriz de permisos aprobada. No se presume que un rol tenga permiso hasta cerrar esa matriz.

Esta decisión sustituye cualquier sugerencia previa de un porcentaje fijo (incluido el 10 %) o de un umbral de descuento común a todas las organizaciones. Las menciones históricas se conservan como historial, no como requisito.

## 2. Separación de responsabilidades

| Capa | Responsabilidad |
|---|---|
| Plataforma Micro app | Proporcionar controles, validación, aislamiento por tenant, aplicación consistente y auditoría |
| Organización | Elegir y mantener sus reglas comerciales, quién puede configurarlas y qué aprobaciones exige |
| Usuario operador | Ejecutar operaciones dentro de la política vigente y de sus permisos efectivos |
| Servidor/API | Recalcular y validar la operación; nunca confiar en el precio, descuento, rol o aprobación declarados por el cliente |

La interfaz puede facilitar la configuración, pero nunca constituye el control de seguridad. Toda regla se valida en servidor y, cuando corresponda, dentro de la transacción de la operación.

## 3. Modelo técnico propuesto

No es una migración aprobada. Es el contrato conceptual para el futuro diseño de esquema:

- **commercial_policy_sets**: configuración versionada por organización; contiene estado (borrador/activa/retirada), versión, vigencia, autor y marcas temporales.
- **commercial_policy_rules**: reglas tipadas pertenecientes a una versión; no almacenar expresiones arbitrarias ejecutables ni código aportado por usuarios.
- **commercial_policy_approvals** (solo si el flujo aprobado lo necesita): constancia de aprobaciones ligadas a una versión y a una operación concreta.
- **sales**: conservar snapshot de la política/versión aplicada y los importes efectivamente aceptados en la venta, para que un cambio futuro de política no reescriba el pasado.
- **audit_logs**: registrar quién cambió la configuración, qué versión se activó, cuándo y desde qué ámbito; registrar también las excepciones/aprobaciones que se permitan.

### Requisitos de integridad

1. Cada registro de política debe incluir `organization_id`; claves foráneas y restricciones deben impedir referencias cruzadas entre organizaciones.
2. La consulta de política activa siempre se deriva del tenant autenticado en servidor; no aceptar `organization_id` del cliente como autoridad.
3. Activación/versionado debe ser atómico: nunca dejar dos versiones incompatibles activas para el mismo ámbito y periodo.
4. Una venta guarda un snapshot inmutable de la versión/reglas relevantes y de sus importes. Cambiar la política no altera ventas históricas.
5. La operación de venta valida permisos, política vigente, límites configurados y disponibilidad de inventario dentro de una transacción; fallos parciales deben revertir todas las escrituras.
6. La idempotencia debe detectar reutilización de una clave con payload diferente.
7. La auditoría debe ser atribuible y protegida frente a modificaciones ordinarias; no depender únicamente de eventos enviados por el navegador.
8. No se permite que una sucursal acceda a políticas o datos privados de otra organización. El alcance organizacional es el valor inicial; overrides por sucursal solo se diseñarán si existe una necesidad de producto aprobada.

## 4. Comportamiento seguro

- **Sin configuración activa:** no inventar una regla ni asumir permiso. La operación se comporta según una política explícita de fallback que se definirá en el contrato de ventas antes de habilitar descuentos; hasta entonces, no se implementa el flujo.
- **Política inválida, expirada o inconsistente:** denegar la operación afectada de forma segura y devolver un error de dominio no sensible.
- **Cambio concurrente de política:** la venta debe evaluar una versión consistente y registrar exactamente esa versión.
- **Aprobación:** si una organización configura aprobación, debe quedar vinculada a la venta, al aprobador autenticado, a la política/version y al importe; no aceptar una marca booleana enviada por el frontend.
- **Cambios posteriores:** aplican a operaciones nuevas según su vigencia, nunca reescriben operaciones históricas.

No se define aquí la semántica fiscal/contable de descuentos, su impacto tributario, ni las reglas legales de facturación. Esas materias requieren fuentes oficiales y revisión de cumplimiento antes de implementación.

## 5. Relación con roles y sucursales

La dirección de arquitectura mantiene:

- `owner` y `admin`: ámbito organizacional propuesto, sujeto a la matriz aprobada.
- `cashier` y `inventory`: asignaciones explícitas de sucursal para operaciones limitadas.
- Caja/turno: acceso restringido a la asignación activa del operador.
- Políticas comerciales: pertenecen a la organización; la facultad de configurarlas no se deduce automáticamente del rol. La matriz aprobada debe definir quién administra configuración y quién puede ejecutar excepciones.

La matriz `docs/sdd/role-permission-decision-matrix.md` continúa sin aprobación. Antes de implementar autorización comercial, el propietario debe aprobar o corregir las facultades de roles y alcances. Esta especificación no transforma recomendaciones de permisos en política aprobada.

## 6. Pruebas obligatorias antes de exponer funcionalidad

En PostgreSQL efímero con datos sintéticos:

- Dos organizaciones no pueden leer, modificar, activar ni referenciar las políticas de la otra.
- Un usuario sin sesión, con membresía inactiva o sin permiso no puede consultar ni cambiar configuración.
- Un cajero no puede cambiar políticas por manipulación de IDs o payload.
- Una política inválida/expirada/inactiva no se aplica silenciosamente.
- Dos activaciones concurrentes no generan versiones activas contradictorias.
- Una venta registra la versión exacta que evaluó, aunque la política cambie inmediatamente después.
- Fallos entre venta, líneas, pagos, inventario y auditoría revierten la transacción completa.
- Reintentos idempotentes no duplican ventas ni pagos; una clave reutilizada con payload distinto se rechaza.
- Los cambios de configuración y aprobaciones quedan auditados y no se pueden atribuir a otro usuario.
- Las pruebas de sucursal verifican aislamiento lateral dentro de una misma organización cuando se implemente el scope de sucursal.

No se ejecutaron estas pruebas en este bloque porque no se ha implementado esquema ni runtime. No se ejecutó SQL en Neon ni se tocaron datos reales.

## 7. Fuera de alcance

- Establecer porcentajes o importes universales de descuento.
- Decidir las reglas comerciales internas de una organización.
- Aprobar la matriz de permisos en nombre del propietario.
- Implementar ventas, pagos, inventario, devoluciones, endpoints o migraciones.
- Cambiar Neon `main`, secretos, DNS, billing, planes o producción.
- Declarar capacidad de organizaciones/sucursales sin pruebas sintéticas de carga.

## 8. Próximos gates

1. Reconciliar este contrato con la matriz de roles y eliminar de ella cualquier umbral comercial universal sugerido.
2. Cerrar el ERD completo organización → sucursal → almacén/caja/turno, con claves tenant-scoped.
3. Aprobar explícitamente las facultades de roles y excepciones operativas pendientes.
4. Revisar la arquitectura del ledger de inventario, integridad venta/líneas/pagos, idempotencia y auditoría.
5. Solo entonces implementar una PR de código/migración/tests en una rama aislada; ejecutar migraciones y pruebas exclusivamente en PostgreSQL efímero.
6. Verificar todos los checks obligatorios sobre el SHA exacto y revisar el diff completo antes de cualquier merge.

## 9. Evidencia de este bloque

- Lectura en GitHub de `AGENTS.md`, checkpoint, estado actual, handoff, plan, diario, arquitectura SaaS, revisión de esquema, matriz de permisos, política de PR, límites/capacidad, Constitución, API, seguridad, cumplimiento y skills de PostgreSQL/auth.
- Estado de GitHub consultado: `main` en `4ab229296d8858c8c553e00a633a762b9c26a81b`; ninguna PR abierta al inicio del bloque.
- Rama de documentación: `docs/org-policy-architecture-20261030`, creada desde el SHA anterior.
- Alcance: solo documentación propuesta. Sin cambios de aplicación, migraciones, workflows, secretos, Neon, Cloudflare o producción.
- Pruebas: no aplican pruebas de runtime a este documento; revisión manual de coherencia y alcance pendiente antes de solicitar merge.
