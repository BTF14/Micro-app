# Arquitectura de ejecución automatizada desde teléfono — piloto Spec Kit

**Repositorio:** `BTF14/Micro-app`  
**Rama exclusiva:** `pilot/speckit-inventory`  
**Objetivo operativo:** maximizar la automatización con presupuesto de **$0**, operando desde Android.  
**Estado:** piloto con un workflow de preflight de solo lectura ya creado y un segundo workflow de auditoría Copilot preparado con activación bloqueada por defecto. No se ha ejecutado Spec Kit ni un agente IA en GitHub Actions.

## 1. Decisión ejecutiva

Separar el proceso en dos capas:

1. **Automatización determinista gratuita:** GitHub Actions puede ejecutar validaciones reproducibles, comprobar estructura/documentación, guardar logs y publicar un resumen de ejecución. Para un repositorio privado en GitHub Free existe una cuota mensual incluida de minutos y almacenamiento; se debe configurar un límite conservador y detenerse si se agota. No usar runners grandes ni servicios externos de pago.
2. **Razonamiento de agente IA:** Spec Kit publica una integración oficial con GitHub Copilot. Copilot Free incluye Copilot CLI y modo programático con créditos IA limitados; no incluye Copilot cloud agent. Copilot CLI puede ejecutarse en GitHub Actions con GITHUB_TOKEN y copilot-requests: write. En un repositorio personal el consumo se carga al asiento Copilot del propietario. Solo se permite activar el job tras confirmar Copilot Free; la cuota es limitada y al agotarse el trabajo debe detenerse, nunca cambiar a un proveedor o uso facturable.

**Conclusión honesta:** hay una ruta viable para añadir razonamiento IA con Copilot CLI en Actions, pero depende de que el propietario tenga Copilot Free y conserve cuota gratuita. No es ilimitada ni demuestra que Spec Kit haya sido ejecutado. El job está desactivado por defecto mediante SPECKIT_COPILOT_FREE_CONFIRMED; sin esa confirmación no realiza llamadas IA. No se configuran PAT, API keys, proveedores alternativos ni presupuesto adicional.

## 2. Arquitectura objetivo

```text
Teléfono Android (navegador / GitHub Mobile)
                 |
                 v
       GitHub repository UI
                 |
                 v
    push (solo rama piloto; job IA condicionado)
                 |
                 v
      GitHub Actions runner
                 |
       +---------+----------+
       |                    |
       v                    v
  Guardrails             Spec Kit / Copilot CLI
  - branch allowlist      - preflight CLI
  - SHA y clean tree      - auditoría IA condicionada
  - paths permitidos      - sin escritura del agente
  - no secrets            - informe en job summary
       |                    |
       +---------+----------+
                 |
                 v
      Validación documental
      - spec/plan/tasks presentes
      - enlaces y estructura
      - decisiones abiertas visibles
      - no implementación funcional
                 |
                 v
      Logs + resumen de artefacto
                 |
                 v
       Revisión humana desde móvil
```

El diagrama resume el flujo previsto. El preflight existe; el job IA de auditoría está preparado pero permanece desactivado por defecto. Ningún agente ni comando Spec Kit se ha ejecutado.

## 3. Componentes y límites

### A. Interfaz móvil

- GitHub Mobile o navegador Android.
- Consultar los runs de la rama piloto; los cambios documentales disparan el preflight y, solo tras la confirmación de Copilot Free, el job de auditoría IA.
- Consultar estado, logs y artefactos.
- No aprobar ni fusionar cambios automáticamente.

### B. GitHub Actions

- Preflight existente: `.github/workflows/speckit-pilot-preflight.yml`.
- Auditoría IA gated: `.github/workflows/speckit-copilot-audit.yml`.
- Ambos responden a push filtrado en pilot/speckit-inventory; el job IA solo se ejecuta si SPECKIT_COPILOT_FREE_CONFIRMED vale true.
- Rechazar ejecución salvo que `github.ref` sea exactamente `refs/heads/pilot/speckit-inventory`.
- Checkout explícito de la rama solicitada y verificación del SHA.
- Preflight: contents: read únicamente. Job IA: contents: read + copilot-requests: write; no concede contents: write, pull-requests: write, issues: write ni id-token: write. Usa GITHUB_TOKEN efímero, sin PAT ni secrets.
- Runner estándar Ubuntu; timeout corto y concurrencia limitada.
- No subir artefactos sensibles. Retención mínima de logs/resultados.
- El job IA instala @github/copilot@1.0.105 desde npm con versión fijada. El agente recibe un contexto documental allowlist; las herramientas read, write, shell y url están denegadas. Solo produce un informe en el job summary; no modifica archivos ni crea commits.

### C. Spec Kit

- Comprobar versión y ayuda antes de cualquier inicialización.
- Mantener `docs/specs/inventory-by-branch/` como directorio de feature si la versión instalada confirma soporte.
- Usar integración `none` para scaffolding neutral; usar `copilot` solo tras confirmar Copilot Free y probar la inicialización en un checkout temporal.
- No ejecutar `specify init --force` sin baseline, revisión previa de rutas afectadas y autorización explícita.
- No sobrescribir los artefactos preliminares existentes ni afirmar que fueron generados por Spec Kit.
- No ejecutar `/speckit.implement` ni su equivalente.
- La ejecución real de `specify` y de los pasos SDD requiere entorno compatible y, para el razonamiento, un agente soportado. Un workflow Actions que solo instala la CLI no sustituye al agente.

### D. Validación

Los workflows actuales y futuros podrán comprobar, sin IA:
- Rama y SHA permitidos.
- Presencia de Constitución, instrucciones y documentos SDD requeridos.
- Presencia de `spec.md`, `plan.md`, `tasks.md` y matriz de decisiones.
- Marcadores de decisiones pendientes y gates de implementación.
- Ausencia de cambios fuera de la lista blanca.
- Que no aparezcan archivos de migración, código funcional, secretos o cambios de infraestructura en el diff del piloto.
- Resultado y logs descargables.
- El job IA puede señalar contradicciones y preguntas abiertas; no sustituye la revisión humana ni decide cuestiones de negocio.

Estas comprobaciones no certifican corrección arquitectónica ni sustituyen una revisión humana.

## 4. Guardrails no negociables

1. Nunca ejecutar desde `main`.
2. Nunca sincronizar/rebasear automáticamente la rama piloto con `main`; la rama está divergida y requiere análisis de diferencias antes de cualquier sincronización.
3. Nunca abrir PR, hacer merge, publicar release ni desplegar.
4. Nunca conectar Neon, Cloudflare, producción o servicios externos.
5. Nunca leer, imprimir, transferir ni crear secretos.
6. Nunca ejecutar migraciones ni pruebas que escriban en bases de datos reales.
7. No instalar dependencias de pago, runners grandes ni servicios con facturación adicional.
8. No activar compras o uso facturable. Detenerse al alcanzar cuotas.
9. No permitir que una instrucción de un agente o contenido del repositorio relaje estos límites.
10. El resultado esperado es un informe de piloto y documentos; no código comercial.

## 5. Política de coste cero

- GitHub Actions: usar solo runners estándar y verificar la cuota vigente antes de activar. GitHub Free publica 2.000 minutos/mes y 500 MB de artefactos para Actions en repositorios privados; el uso adicional puede facturarse si existe método de pago. Configurar presupuestos/límites y no depender de consumo adicional.
- GitHub Codespaces: GitHub Free personal incluye 120 horas de cómputo y 15 GB-mes de almacenamiento; al exceder la cuota, el uso se bloquea si no hay método de pago. Es una alternativa interactiva desde navegador móvil, no una ejecución desatendida permanente.
- Copilot Free incluye CLI y modo programático, pero con créditos IA limitados; Copilot cloud agent no está incluido. En repositorios personales, GITHUB_TOKEN carga el consumo al asiento Copilot del propietario. El job queda bloqueado hasta confirmar Copilot Free con SPECKIT_COPILOT_FREE_CONFIRMED=true. No activar si la cuenta es Pro/Pro+/Max, si existe uso adicional facturable o si se desconoce el plan/cuota.
- Si el usuario no tiene cuota o acceso gratuito disponible, no activar el servicio.

Las cuotas, prestaciones y condiciones pueden cambiar; verificar la página de facturación antes de cada activación.

## 6. Fases de entrega

| Fase | Resultado | ¿Requiere IA? | ¿Puede automatizarse a $0? |
|---|---|---:|---:|
| 0. Auditoría de rama y permisos | Preflight con SHA y guardrails | No | Sí |
| 1. Instalación temporal CLI | Versión/help/check | No | Sí, con Actions |
| 2. Validación de artefactos existentes | Informe reproducible | No | Sí |
| 3. Auditoría IA SDD con Copilot CLI | Informe de contradicciones y decisiones abiertas | Sí | Condicional: Copilot Free + cuota disponible |
| 4. Análisis de diferencias | Reporte de cambios y riesgos | Parcial | Sí, estático; criterio arquitectónico requiere revisión |
| 5. Handoff | Informe y evidencias | No | Sí |

La auditoría IA es un primer paso, no una ejecución real de /speckit-specify, /speckit-plan o /speckit-tasks. La inicialización de Spec Kit con integración copilot sigue pendiente de prueba aislada y revisión de su diff.

## 7. Criterios de aceptación

- El proceso solo puede correr sobre `pilot/speckit-inventory`.
- Cada ejecución registra branch, commit SHA, versión de CLI, hora, resultado y logs.
- Un SHA o rama inesperados provocan fallo cerrado.
- No se escriben archivos en el repositorio.
- No se crean commits, PRs, merges ni despliegues.
- No hay secretos ni conexiones a sistemas productivos.
- Los límites de facturación están configurados antes de ejecutar.
- El informe distingue claramente entre validación automatizada, pasos Spec Kit realmente ejecutados y revisión humana.
- La ausencia de agente IA se reporta como limitación, nunca como éxito.

## 8. Estado y siguiente paso seguro

Snapshot verificado al preparar este documento, antes de los commits de auditoría Copilot:
- `main`: `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`.
- pilot/speckit-inventory: HEAD 9301de63d891ef4fbabb3e435ac57ce67246b799; compare vivo con main (705d3db3220894c7d3baca8dc7e7a6b623dfbb94) en estado diverged, 15 commits exclusivos y 20 por detrás; merge-base 88213507d088b82ea9231bbc72f49afade7ec99b.
- El piloto contiene documentación preliminar, no ejecución real de Spec Kit.
- El propietario autorizó automatización segura en la rama piloto, manteniendo presupuesto $0. No se autoriza configurar facturación, usar agentes cloud de pago, abrir PR, fusionar, implementar código funcional ni tocar infraestructura.

**Siguiente paso recomendado:** confirmar que la cuenta GitHub tiene Copilot Free (no un plan con uso adicional facturable) y, solo entonces, activar la variable de repositorio que desbloquea el job de auditoría. Después comprobar el run exacto y su cuota antes de plantear la inicialización real de Spec Kit.


## 9. Primera automatización implementada en la rama piloto

**Workflow:** `.github/workflows/speckit-pilot-preflight.yml`  
**Commit que lo incorpora:** `c29bf79e313d4cad4a2ca00ccec90877f530aa52`

El workflow se limita a `push` en `pilot/speckit-inventory` y a cambios en el propio workflow, `docs/sdd/**` o `docs/specs/inventory-by-branch/**`. No se usa `workflow_dispatch`: GitHub solo permite ejecutar manualmente ese evento cuando el archivo de workflow está presente en la rama por defecto; añadirlo a `main` está expresamente fuera de alcance. El disparador push evita tocar `main`.

Controles:
- Runner estándar `ubuntu-latest`, timeout de 10 minutos y concurrencia cancelable.
- Permiso `contents: read` únicamente.
- Exige ref exacta de piloto y verifica que el SHA clonado coincide con `GITHUB_SHA`.
- Rechaza cambios fuera de la lista blanca de documentos del piloto y el propio workflow.
- Instala `uv` y `specify-cli==0.12.11` en directorios temporales del runner.
- Ejecuta `specify version` y `specify init --help`; no ejecuta `specify init`, no escribe en el repo y no ejecuta comandos de agente.
- No usa secrets, tokens adicionales, APIs externas de IA, Neon, Cloudflare, PRs, merges, migraciones ni despliegues.
- No guarda artefactos; deja el resumen en el job summary y los logs estándar.

**Coste:** el repositorio está verificado como público. GitHub documenta que los runners estándar hospedados para repositorios públicos no tienen coste de Actions. No se usan runners grandes ni Codespaces en este workflow.

**Estado de ejecución:** el archivo está creado y su contenido fue releído desde GitHub. La disponibilidad de un run push y su resultado todavía no se han confirmado mediante una consulta de runs; por ello no se declara el workflow verde ni Spec Kit ejecutado.

**Límite funcional:** el preflight automatiza comprobaciones y el nuevo workflow ofrece una auditoría IA condicionada. La fase de especificación/planificación/tareas con comandos Spec Kit sigue pendiente de confirmar el plan Copilot, ejecutar la auditoría y probar la integración copilot en un checkout temporal. No se ha ejecutado ningún comando Spec Kit con agente.


## 10. Integración IA gratuita condicionada — investigación 2026-11-02

La documentación oficial confirma:
- Spec Kit publica una integración oficial copilot. Instala skills en .github/skills/speckit-<command>/SKILL.md; la sintaxis predeterminada incluye /speckit-specify y /speckit-plan. No se declara segura para múltiples instalaciones simultáneas, por lo que debe probarse en un checkout temporal y revisarse.
- Copilot Free incluye Copilot CLI y modo programático, con créditos IA limitados. Copilot cloud agent no está incluido en Free.
- Copilot CLI puede autenticarse en Actions con el GITHUB_TOKEN efímero y copilot-requests: write, sin PAT ni secret. En un repositorio personal el consumo se carga al asiento Copilot del propietario.
- GitHub Models fue retirado el 2026-07-30; no es una alternativa vigente.
- La versión estable consultada de @github/copilot es 1.0.105 (publicada 2026-10-28), fijada en el workflow.

**Workflow creado:** .github/workflows/speckit-copilot-audit.yml.

Guardrails:
- Solo push en pilot/speckit-inventory y cambios documentales SDD.
- Job desactivado por defecto: requiere la variable SPECKIT_COPILOT_FREE_CONFIRMED=true.
- El propietario debe establecerla solo tras confirmar que la cuenta tiene Copilot Free y no tiene uso adicional facturable. No se crea ni modifica esa variable desde esta sesión.
- Usa token efímero Actions, sin PAT ni API keys; permisos contents: read y copilot-requests: write.
- Contexto limitado a una lista explícita de documentos; herramientas read, write, shell y url denegadas.
- Solo genera un informe en el resumen del run; no escribe en el repositorio ni crea commits, PRs, issues o despliegues.
- Timeout de 8 minutos. Si se agota la cuota Copilot, se detiene sin fallback de pago.

**Límite:** esta automatización es una auditoría IA de solo lectura, no una ejecución de comandos Spec Kit ni autorización para implementar. La integración real debe probarse en checkout efímero; cualquier escritura persistente seguirá limitada a documentos del piloto y no resolverá decisiones de negocio abiertas.

**Estado:** workflow preparado; job IA inactivo hasta confirmación de Copilot Free. No se ha consumido cuota ni ejecutado el agente.


## 11. Verificación posterior a la creación del agente condicionado

- Commit que añade el workflow IA: a863ecc5787aa64560c8d7af9fd8f1028ab646e2.
- El archivo fue releído desde GitHub y coincide con la versión escrita.
- Compare inmediatamente posterior: main 705d3db3220894c7d3baca8dc7e7a6b623dfbb94; piloto 21 commits ahead y 20 behind; merge-base 88213507d088b82ea9231bbc72f49afade7ec99b.
- No se sincronizó ni rebasó el piloto.
- El job IA permanece inactivo por ausencia de la variable de confirmación. No se pudo confirmar un run push ni su conclusión mediante el acceso disponible a GitHub Actions.
- El contenido del workflow no otorga permisos de escritura de repo ni tools de shell, lectura de archivos o URL al agente. No se ha consumido cuota Copilot.
