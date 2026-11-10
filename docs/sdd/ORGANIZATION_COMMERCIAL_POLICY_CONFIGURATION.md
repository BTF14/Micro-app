# Estado de producto vigente — supersede el diseño histórico de descuentos (2026-11-10)

**Decisión posterior y autoritativa del propietario:** Micro-app no tendrá descuentos ni promociones. No existe capacidad futura aprobada para descuentos, promociones, cupones, aprobaciones de descuentos ni overrides manuales de precio. Cualquier texto inferior que describa su configuración o aprobación futura se conserva únicamente como historial de una propuesta anterior y no es un requisito ni una hoja de ruta. No implementar campos, políticas, endpoints, permisos, UI ni flujos para esas funciones. La decisión vigente está reflejada en `docs/sdd/role-permission-decision-matrix.md`, `docs/sdd/SALES_CHECKOUT_MODEL.md` y la aceptación P0 del 2026-12-01.

El documento original puede seguir sirviendo como referencia histórica para principios generales de aislamiento y administración de políticas no relacionadas con descuentos, pero no autoriza una política comercial de descuentos.

---

# Diseño: políticas comerciales configurables por organización

**Estado vigente (reconciliación 2026-11-10):** este documento es un diseño histórico no aprobado para implementación. La matriz de permisos está APROBADA desde 2026-10-31. La decisión del propietario del 2026-11-05 es que Micro-app no tendrá descuentos ni promociones; no son solo una exclusión del P0, sino una capacidad descartada del producto. Cualquier mención inferior a descuentos, aprobaciones, porcentajes, excepciones o una futura habilitación se conserva únicamente como historial de la propuesta y no es requisito, roadmap ni autorización.  
**Fecha del diseño original:** 2026-10-30 UTC  
**Base verificada:** `main` en `4ab229296d8858c8c553e00a633a762b9c26a81b`.  
**Relacionado:** `docs/SAAS_ARCHITECTURE_DECISIONS.md`, `docs/sdd/role-permission-decision-matrix.md`, `docs/SCHEMA_REVIEW.md`.

## 1. Decisión de producto que queda fijada

Micro app es una plataforma para que cada organización gestione su operación. La plataforma no debe imponer una política comercial universal sobre descuentos ni decidir cómo una empresa vende.

- El diseño original contempló políticas comerciales configurables por organización; esa propuesta no está aprobada ni implementada. No inferir que se habilitará en el futuro.
- Solo Owner administra la configuración de políticas de la organización; Admin opera el negocio y no obtiene permisos de administración de políticas.
- La frase original sobre aprobación de descuentos (2026-10-31) quedó supersedida el 2026-11-05: Micro-app no tendrá descuentos ni flujo de aprobación de descuentos.
- No se codifican porcentajes, umbrales ni parámetros de descuento. No diseñar parámetros de descuento para una capacidad futura no aprobada.
- Las capacidades disponibles en la plataforma no equivalen a una política activa ni a una función implementada.
- **Regla vigente de producto:** no implementar ni exponer descuentos, promociones, cupones, aprobaciones de descuentos ni override manual de precio. La exclusión no se limita al MVP/P0; cualquier cambio exigiría una nueva decisión explícita del propietario.

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

- **Nota histórica:** el diseño original proponía fallback para descuentos. Como los descuentos están descartados, no implementar ni definir un fallback de descuento. Para otras políticas no relacionadas con descuentos, cualquier capacidad requiere un contrato de producto separado y aprobado.
- **Política inválida, expirada o inconsistente:** denegar la operación afectada de forma segura y devolver un error de dominio no sensible.
- **Cambio concurrente de política:** la venta debe evaluar una versión consistente y registrar exactamente esa versión.
- **Aprobación:** si una organización configura aprobación, debe quedar vinculada a la venta, al aprobador autenticado, a la política/version y al importe; no aceptar una marca booleana enviada por el frontend.
- **Cambios posteriores:** aplican a operaciones nuevas según su vigencia, nunca reescriben operaciones históricas.

No se define aquí la semántica fiscal/contable de descuentos, su impacto tributario, ni las reglas legales de facturación. Esas materias requieren fuentes oficiales y revisión de cumplimiento antes de implementación.

## 5. Relación con roles y sucursales

La dirección de arquitectura mantiene:

- Cada miembro conserva un único rol organizacional en `organization_members.role`; ese rol no cambia según la sucursal.
- `branch_memberships` concede o revoca acceso a sucursales, independientemente del rol, y no contiene roles por sucursal.
- La resolución de ámbito puede permitir a `owner`/`admin` seleccionar sucursales activas de su organización y exigir asignación activa a `cashier`/`inventory`; esto no concede permisos comerciales ni sustituye la matriz aprobada.
- Caja/turno: el ámbito de turno se resuelve por separado; no autoriza por sí solo operaciones.
- Políticas comerciales: pertenecen a la organización; la facultad de configurarlas no se deduce automáticamente del rol. La matriz aprobada debe definir quién administra configuración y quién puede ejecutar excepciones.

La matriz `docs/sdd/role-permission-decision-matrix.md` está APROBADA desde 2026-10-31. Su decisión vigente establece que solo Owner administra miembros y políticas de la organización; Admin se limita a operar el negocio. La decisión posterior del 2026-11-05 excluye descuentos y promociones del producto, por lo que no existe permiso de aprobación de descuentos ni una capacidad futura aprobada. Esta especificación histórica no habilita políticas comerciales ni amplía la matriz.

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

1. Mantener cualquier futuro diseño de políticas no relacionadas con descuentos subordinado a una decisión explícita de producto y a la matriz aprobada. No diseñar ni implementar descuentos, promociones ni sus aprobaciones.
2. Cerrar el ERD completo organización → sucursal → almacén/caja/turno, con claves tenant-scoped.
3. Diseñar las excepciones futuras que sigan sin decisión explícita, sin reabrir las facultades ya aprobadas.
4. Revisar la arquitectura del ledger de inventario, integridad venta/líneas/pagos, idempotencia y auditoría.
5. Solo entonces implementar una PR de código/migración/tests en una rama aislada; ejecutar migraciones y pruebas exclusivamente en PostgreSQL efímero.
6. Verificar todos los checks obligatorios sobre el SHA exacto y revisar el diff completo antes de cualquier merge.

## 9. Evidencia de este bloque

- Lectura en GitHub de `AGENTS.md`, checkpoint, estado actual, handoff, plan, diario, arquitectura SaaS, revisión de esquema, matriz de permisos, política de PR, límites/capacidad, Constitución, API, seguridad, cumplimiento y skills de PostgreSQL/auth.
- Estado de GitHub consultado: `main` en `4ab229296d8858c8c553e00a633a762b9c26a81b`; ninguna PR abierta al inicio del bloque.
- Rama de documentación: `docs/org-policy-architecture-20261030`, creada desde el SHA anterior.
- Alcance: solo documentación propuesta. Sin cambios de aplicación, migraciones, workflows, secretos, Neon, Cloudflare o producción.
- Pruebas: no aplican pruebas de runtime a este documento; revisión manual de coherencia y alcance pendiente antes de solicitar merge.
