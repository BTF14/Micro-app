# CircleCI: alternativa de CI de coste cero

Fecha de preparación: 2026-10-21.

## Decisión

Preparar CircleCI como alternativa temporal de verificación porque GitHub Actions reportó un bloqueo de cuenta/límite antes de iniciar los jobs. No interpretar esos fallos como tests fallidos: los jobs no mostraron pasos ejecutados.

- PR de configuración: https://github.com/BTF14/Micro-app/pull/73
- Configuración: `.circleci/config.yml`
- Estado: preparada en una rama y PR draft; **no ejecutada ni validada en CircleCI**.
- Presupuesto: $0. No añadir tarjeta, habilitar facturación, comprar créditos, iniciar un trial que pueda cobrar ni permitir auto-upgrade.
- Alcance: build/typecheck, pruebas unitarias y prueba de autenticación con PostgreSQL efímero; no despliega ni usa Neon.

## Límites del plan gratuito

La página oficial consultada el 2026-10-21 declara Free a $0/mes, sin tarjeta de crédito, hasta 6.000 minutos de build y hasta 5 usuarios activos por mes. La documentación de créditos declara 30.000 créditos/mes para uso personal/privado y que los builds personales se bloquean cuando se agotan los créditos hasta el siguiente mes. Los límites y términos pueden cambiar; revisar el plan que muestra la cuenta antes de conectar el repositorio.

Fuentes oficiales:
- https://circleci.com/pricing/
- https://circleci.com/docs/guides/plans-pricing/credits/
- https://circleci.com/docs/guides/execute/using-docker/

## Activación manual necesaria

1. Abrir https://circleci.com/ y entrar con la cuenta del propietario.
2. Revisar que el plan activo sea **Free ($0)**, que no pida tarjeta y que no haya compra recurrente de créditos, plan Performance ni trial facturable.
3. Conectar GitHub y autorizar solo el repositorio privado `BTF14/Micro-app`.
4. Configurar el proyecto para usar la rama/PR #73; confirmar que el proveedor detecta `.circleci/config.yml`.
5. Ejecutar el pipeline en la rama de esta PR y revisar el resultado y los logs del SHA exacto.
6. Si la UI solicita pago, tarjeta o una autorización que habilite cargos, detenerse y no continuar.

No compartir contraseñas ni tokens en el chat. La conexión/autorización de la cuenta requiere intervención del propietario; no está hecha por esta PR.

## Qué no resuelve

CircleCI no cambia el estado de GitHub Actions ni hace que los checks antiguos pasen. La CI alternativa solo será evidencia útil después de ejecutarse correctamente sobre el SHA exacto. Mantener PR #73 en draft hasta entonces. La app continúa sin estar lista para producción y no se deben fusionar cambios que requieran CI verificable mientras esta esté bloqueada.
