# Políticas comerciales configurables por organización — propuesta supersedida

**Estado:** SUPERSEDIDA el 2026-11-05 por decisión explícita del propietario. No implementar este diseño para descuentos ni overrides de precio.
**Documento de reemplazo:** `docs/sdd/MONETARY_ENGINE.md` y sección 3 de `docs/sdd/role-permission-decision-matrix.md`.

## Decisión vigente

Micro-app no tendrá descuentos porcentuales/fijos, promociones basadas en descuentos, aprobaciones de descuentos ni cambios manuales de precio durante checkout. Todas las ventas deben utilizar el precio vigente del catálogo, leído y validado por el servidor.

Los cambios de precio se realizan antes de la venta mediante la edición del producto por Owner/Admin. Esos cambios deben quedar auditados y nunca modifican ventas históricas.

## Alcance de este archivo

Este documento se conserva únicamente para explicar por qué se descartó la propuesta anterior de políticas de descuento configurables por tenant. Las ideas históricas de commercial_policy_sets, commercial_policy_rules, commercial_policy_approvals, umbrales, permisos y aprobaciones de descuentos **no son requisitos vigentes** y no deben convertirse en migraciones, endpoints, controles de UI ni lógica de checkout.

Otras políticas comerciales futuras (por ejemplo, límites operativos que no impliquen descuentos ni modificación del precio de una venta) requerirán una decisión de producto independiente y aprobación explícita antes de diseñar su esquema o runtime.

No se implementó este diseño ni se ejecutó SQL en Neon. La decisión vigente se aplica en la rama de trabajo y PR #228; todavía no está fusionada a main.
