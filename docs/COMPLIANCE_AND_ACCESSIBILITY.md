# Cumplimiento legal, privacidad y accesibilidad — Micro app

**Estado:** evaluado el 2026-10-27, incorporado como anexo a `docs/SECURITY_ROADMAP.md` y a la secuencia de lectura de `AGENTS.md`.

El propietario compartió una lista de 20 puntos de cumplimiento (legal/privacidad, ciberseguridad/integraciones, accesibilidad WCAG) redactada por otra IA sin contexto del proyecto, pidiendo evaluarla con criterio e incorporarla al plan. Este documento es esa evaluación: qué se adopta ahora, qué queda documentado para más adelante, y qué **no aplica** a este proyecto tal como está diseñado hoy — y por qué. No se copian los 20 puntos a ciegas: varios asumen un negocio distinto (SaaS público, pasarela de pagos, registro abierto) que Micro app no es todavía.

Regla general, igual que con `docs/PRICING_CACHE_ARCHITECTURE.md`: ningún punto marcado aquí como "no aplica" se reactiva sin que el propietario lo pida explícitamente cuando el negocio realmente cambie de forma (pagos en línea, registro público, clientes externos, etc.).

## Bloque 1 — Legal, políticas y privacidad

| # | Punto | Decisión |
|---|---|---|
| 1 | Política de privacidad | **Ya existe**, en el centro de ayuda de la app (`PRIVACY_SECTIONS` en `apps/web/src/App.tsx`): qué se guarda, para qué, que no se comparte fuera del negocio, cómo pedir corrección/eliminación. Ya trae nota explícita de que, si el negocio empieza a manejar datos de clientes externos o se abre al público, hace falta revisión legal formal antes de ese paso — eso es exactamente el punto 1 de la lista, ya cubierto. |
| 2 | Términos y condiciones | **Diferido a Nivel 2/3.** Hoy el único "usuario" es el propio negocio y su personal (acceso por invitación/allowlist), no hay terceros contratando el servicio. Redactar T&C formales tiene sentido cuando haya empleados externos al dueño con acceso, o si el producto se ofrece a otros negocios — no antes. |
| 3 | Política de reembolsos | **No aplica por ahora.** No existe pasarela de pago ni venta online del software; el módulo de ventas es un POS interno (el negocio le cobra a sus propios clientes, eso no es "reembolso de la app"). Revisar solo si algún día Micro app cobra una suscripción a otros negocios. |
| 4–5 | Política de cookies + banner de consentimiento | **No aplica tal como está implementado, y no conviene agregarlo sin motivo.** Las únicas cookies que usa la app son técnicas y estrictamente necesarias para el login (estado de OAuth, sesión) — no hay cookies de analítica ni de marketing. Bajo los marcos de referencia que motivan este punto (tipo GDPR/ePrivacy), las cookies estrictamente necesarias están explícitamente exentas de requerir banner de consentimiento. Pedir "aceptar cookies" para poder iniciar sesión sería ruido para el usuario sin ninguna base legal que lo exija. Se deja documentado aquí para que ningún chat futuro lo "implemente" sin revisar primero si de verdad se agregó analítica/marketing con cookies no esenciales — si eso pasa, ahí sí aplica el punto. |
| 6 | Checkboxes de consentimiento explícito en formularios | **Guía de diseño para formularios futuros, no acción inmediata.** Hoy no hay ningún formulario que recolecte datos personales dentro de la app (el login es un redirect a Google, no un formulario propio — el registro con contraseña se retiró, decisión D4). Cuando se construya cualquier formulario que sí recolecte datos (por ejemplo, ficha de cliente), debe llevar casilla explícita y no premarcada si pide aceptar alguna política. |
| 7 | Minimización de datos | **Ya es principio de diseño vigente**, reforzado aquí: no guardar biometría, ubicación persistente ni datos sensibles que no sean estrictamente necesarios para inventario/ventas/facturación. Aplica al diseño del módulo de clientes cuando se construya. |
| 8 | Enlace de baja automatizado | **No aplica por ahora.** La app no envía comunicaciones de marketing ni boletines; el enlace de WhatsApp existente es soporte, no una lista de difusión. Si en el futuro se agregan notificaciones por correo/WhatsApp masivas, ahí sí hace falta un mecanismo de baja. |
| 9 | Consentimiento parental / validación de edad | **No aplica.** No hay registro público abierto — el acceso es por invitación (allowlist) a personal del negocio, que se asume adulto. Revisar solo si el modelo cambia a registro público. |
| 10 | Datos fiscales/de contacto del negocio visibles | **Pendiente de datos del propietario, no de código.** Cuando el propietario quiera formalizarlo, puede darme el nombre legal/RIF/contacto del negocio para agregarlos al pie de página o al centro de ayuda — no se puede inventar esa información. |

## Bloque 2 — Ciberseguridad, integraciones y datos

| # | Punto | Decisión |
|---|---|---|
| 11 | Dependabot debe bloquear vulnerabilidades críticas | **Adoptado, ver "Próximo paso técnico" abajo** — Dependabot ya corre (`.github/dependabot.yml`), pero solo abre PRs; no bloqueaba nada. Se agrega una comprobación de CI (`dependency-review`, ver más abajo) que falla el PR si introduce una dependencia con vulnerabilidad crítica o alta conocida. |
| 12 | Eliminación definitiva de datos (derecho al olvido) | **Adoptado con una matización importante, no una implementación ciega.** Para datos personales de una persona (un usuario que deja de trabajar en el negocio, un cliente que pide que lo olviden): sí, debe poder anonimizarse/eliminarse. Pero los **registros financieros** (ventas, movimientos de inventario, auditoría) no se pueden borrar en cascada solo porque la persona que los generó pida "olvido" — en la mayoría de regímenes fiscales hay obligación de conservar registros contables por años, y borrar una venta rompe el libro de movimientos que la Constitución del proyecto ya exige mantener íntegro. El diseño correcto es: anonimizar el vínculo con la persona (ej. quitar nombre/cédula del registro de auditoría) **sin borrar el movimiento financiero en sí**. Queda como trabajo de diseño de esquema para el Nivel 2, cuando exista el flujo real de invitación/baja de usuarios. |
| 13 | Prohibición de patrones oscuros (dark patterns) | **Adoptado como principio de diseño**, sin acción de código pendiente hoy (no hay flujos de cancelación/suscripción todavía). Aplica a cualquier futuro flujo de baja o cancelación: el botón de cancelar nunca debe ocultarse ni confundirse con el de confirmar. |
| 14 | Transparencia de costos (sin cobros ocultos) | **Adoptado como principio de diseño** para el futuro módulo de ventas: toda conversión USD↔VES, impuesto o cargo debe mostrarse explícito antes de cerrar una venta. Sin código que verificar todavía porque el módulo de ventas no existe. |
| 15 | Reseñas falsas / datos de reputación manipulados | **No aplica.** La app no tiene ni tiene planeado un sistema de reseñas/reputación. |
| 16 | Licenciamiento de imágenes y activos | **Verificado: no aplica riesgo actual.** La interfaz de Micro app no usa imágenes ni íconos descargados de terceros — los símbolos del menú y marca son caracteres Unicode/CSS, no assets gráficos con licencia. Queda como recordatorio para cuando se agregue cualquier ícono o imagen real: usar solo SVG propios o con licencia abierta verificada. |
| 17 | Afirmaciones respaldadas en reportes | **Adoptado como principio de diseño** para el futuro módulo de reportes: cualquier cifra o métrica que la app muestre debe salir de una consulta auditable a los datos reales, nunca de un valor inventado o de ejemplo presentado como real. |

## Bloque 3 — Accesibilidad (WCAG)

| # | Punto | Estado verificado |
|---|---|---|
| 18 | Texto alternativo / `aria-label` | **Auditado el 2026-10-27 contra `apps/web/src/App.tsx`.** La interfaz actual ya usa `aria-label`, `aria-hidden`, `role="dialog"`/`role="alert"`/`role="status"` y `aria-live` de forma consistente en el panel de login, el centro de ayuda y el panel autenticado. No se encontraron íconos interactivos sin etiqueta. Seguir aplicando el mismo patrón a cada vista nueva (inventario, ventas) a medida que se construyan. |
| 19 | Contraste de color mínimo 4.5:1 | **Pendiente de verificación con herramienta, no solo revisión visual.** Recomendación: cuando exista una primera vista de negocio real (no solo pantallas "próximamente"), correr una auditoría automatizada (`axe-core` o `pa11y`) contra las páginas principales en modo claro y oscuro, e incorporarla como paso de CI si el resultado es estable. No se ejecuta todavía porque la mayoría de la interfaz actual son tarjetas de módulo "Pronto" sin contenido operativo real que auditar con sentido. |
| 20 | Navegación completa por teclado | **Parcialmente verificado por inspección de código, falta prueba real.** El modal de ayuda (`HelpModal`) es un `role="dialog"` con botón de cierre enfocable; los enlaces y botones existentes son elementos nativos (`<a>`, `<button>`), que son accesibles por teclado por defecto sin necesitar JavaScript adicional. Falta: foco atrapado dentro del modal mientras está abierto (hoy `Tab` podría salirse del modal hacia el fondo) y devolver el foco al elemento que lo abrió al cerrarlo — agregar cuando se tenga tiempo de UI dedicado, no es bloqueante para el negocio pero sí barato de arreglar. Pendiente, sin ticket abierto todavía.

## Próximo paso técnico concreto (derivado del punto 11)

Se agrega en este cambio `.github/workflows/dependency-review.yml`: usa la acción oficial `actions/dependency-review-action` sobre cada Pull Request, configurada para **fallar el check** si se introduce una dependencia con severidad `critical` o `high` conocida en la base de datos de GitHub Advisories. Esto es distinto de Dependabot (que solo abre PRs de actualización): esto bloquea que un PR *nuevo* introduzca una dependencia vulnerable, sea por Dependabot o por cualquier cambio manual.

## Estándar transversal de interfaz — actualización 2026-11-01

El propietario aprobó `docs/FRONTEND_DESIGN_STANDARD.md` como criterio común para nuevas vistas y cambios sustanciales de frontend. Ese documento desarrolla el objetivo WCAG 2.2 AA, los estados de interfaz, la adaptación responsive, los tokens visuales y la accesibilidad de formularios, diálogos y controles.

Aclaraciones de contraste:
- 4.5:1 corresponde al texto normal en WCAG AA.
- 3:1 corresponde al texto grande en WCAG AA.
- AAA eleva esos umbrales a 7:1 para texto normal y 4.5:1 para texto grande.
- Los componentes y gráficos esenciales deben cumplir el criterio de contraste no textual aplicable.

AAA es una aspiración donde sea viable, no un requisito universal que sustituya el objetivo AA. Las auditorías automatizadas y manuales se incorporarán cuando existan pantallas operativas representativas; no se afirma que toda la UI actual ya haya sido auditada o que cumpla WCAG 2.2 AA.
