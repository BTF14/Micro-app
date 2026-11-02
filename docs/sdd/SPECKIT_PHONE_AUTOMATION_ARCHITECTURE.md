# Arquitectura de ejecución automatizada desde teléfono — piloto Spec Kit

**Repositorio:** `BTF14/Micro-app`  
**Rama exclusiva:** `pilot/speckit-inventory`  
**Objetivo operativo:** maximizar la automatización con presupuesto de **$0**, operando desde Android.  
**Estado:** propuesta de arquitectura; no se han creado workflows ni ejecutado Spec Kit.

## 1. Decisión ejecutiva

Separar el proceso en dos capas:

1. **Automatización determinista gratuita:** GitHub Actions puede ejecutar validaciones reproducibles, comprobar estructura/documentación, guardar logs y publicar un resumen de ejecución. Para un repositorio privado en GitHub Free existe una cuota mensual incluida de minutos y almacenamiento; se debe configurar un límite conservador y detenerse si se agota. No usar runners grandes ni servicios externos de pago.
2. **Razonamiento de agente IA:** Spec Kit requiere un agente de codificación compatible para ejecutar los pasos de especificación. La CLI instala/configura la integración; los pasos de proceso se invocan dentro del agente. GitHub Copilot Free permite chat, pero no incluye Copilot cloud agent; el cloud agent está disponible en planes Copilot de pago. Por tanto, no prometer ejecución IA autónoma e ilimitada a $0.

**Conclusión honesta:** con presupuesto estrictamente cero podemos automatizar preparación, comprobaciones y reportes. No podemos garantizar un agente IA desatendido que ejecute todo el flujo Spec Kit sin confirmar una prestación gratuita disponible en la cuenta. No introducir claves API ni servicios con consumo facturable para cerrar esa brecha.

## 2. Arquitectura objetivo

```text
Teléfono Android (navegador / GitHub Mobile)
                 |
                 v
       GitHub repository UI
                 |
                 v
    workflow_dispatch (manual)
                 |
                 v
      GitHub Actions runner
                 |
       +---------+----------+
       |                    |
       v                    v
  Guardrails             Spec Kit CLI
  - branch allowlist      - versión reportada
  - SHA y clean tree      - help/check
  - paths permitidos      - integración neutral
  - no secrets            - sin agente automático
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

El diagrama es una arquitectura propuesta. Ningún workflow se ha creado ni ejecutado.

## 3. Componentes y límites

### A. Interfaz móvil

- GitHub Mobile o navegador Android.
- Disparar únicamente el workflow manual de la rama piloto.
- Consultar estado, logs y artefactos.
- No aprobar ni fusionar cambios automáticamente.

### B. GitHub Actions

- Workflow futuro en `.github/workflows/speckit-pilot.yml`.
- Activación manual mediante `workflow_dispatch`; sin cron ni triggers en cada push durante el piloto.
- Rechazar ejecución salvo que `github.ref` sea exactamente `refs/heads/pilot/speckit-inventory`.
- Checkout explícito de la rama solicitada y verificación del SHA.
- Permisos mínimos: `contents: read`; sin `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write` ni secretos.
- Runner estándar Ubuntu; timeout corto y concurrencia limitada.
- No subir artefactos sensibles. Retención mínima de logs/resultados.
- No instalar ni ejecutar agentes de terceros ni scripts remotos no auditados.
- No modificar archivos del repositorio ni crear commits.

### C. Spec Kit

- Comprobar versión y ayuda antes de cualquier inicialización.
- Mantener `docs/specs/inventory-by-branch/` como directorio de feature si la versión instalada confirma soporte.
- Mantener integración `none` para validaciones neutrales cuando corresponda.
- No ejecutar `specify init --force` sin baseline, revisión previa de rutas afectadas y autorización explícita.
- No sobrescribir los artefactos preliminares existentes ni afirmar que fueron generados por Spec Kit.
- No ejecutar `/speckit.implement` ni su equivalente.
- La ejecución real de `specify` y de los pasos SDD requiere entorno compatible y, para el razonamiento, un agente soportado. Un workflow Actions que solo instala la CLI no sustituye al agente.

### D. Validación

El workflow futuro podrá comprobar, sin IA:
- Rama y SHA permitidos.
- Presencia de Constitución, instrucciones y documentos SDD requeridos.
- Presencia de `spec.md`, `plan.md`, `tasks.md` y matriz de decisiones.
- Marcadores de decisiones pendientes y gates de implementación.
- Ausencia de cambios fuera de la lista blanca.
- Que no aparezcan archivos de migración, código funcional, secretos o cambios de infraestructura en el diff del piloto.
- Resultado y logs descargables.

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
- Copilot: Copilot Free ofrece cuota limitada de chat/créditos; Copilot cloud agent no está incluido en Free según la documentación vigente consultada. No asumir acceso.
- Si el usuario no tiene cuota o acceso gratuito disponible, no activar el servicio.

Las cuotas, prestaciones y condiciones pueden cambiar; verificar la página de facturación antes de cada activación.

## 6. Fases de entrega

| Fase | Resultado | ¿Requiere IA? | ¿Puede automatizarse a $0? |
|---|---|---:|---:|
| 0. Auditoría de rama y permisos | Preflight con SHA y guardrails | No | Sí |
| 1. Instalación temporal CLI | Versión/help/check | No | Sí, con Actions |
| 2. Validación de artefactos existentes | Informe reproducible | No | Sí |
| 3. Flujo Spec Kit specify/plan/tasks | Artefactos procesados por agente | Sí | Solo si existe agente gratuito habilitado |
| 4. Análisis de diferencias | Reporte de cambios y riesgos | Parcial | Sí, estático; criterio arquitectónico requiere revisión |
| 5. Handoff | Informe y evidencias | No | Sí |

La fase 3 es el bloqueo explícito para la promesa de autonomía total con $0.

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

Estado verificado al preparar este documento:
- `main`: `705d3db3220894c7d3baca8dc7e7a6b623dfbb94`.
- `pilot/speckit-inventory`: compare con `main` en estado `diverged`, 12 commits exclusivos y 20 commits por detrás; merge-base `88213507d088b82ea9231bbc72f49afade7ec99b`.
- El piloto contiene documentación preliminar, no ejecución real de Spec Kit.
- No hay autorización para crear workflows, configurar facturación, usar agentes cloud de pago, abrir PR o implementar.

**Siguiente paso recomendado:** inspeccionar la visibilidad del repositorio y la configuración actual de Actions/cuotas desde GitHub; después preparar un workflow de solo lectura en una propuesta separada y revisarlo antes de crearlo. No activar nada que pueda generar cargos.


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

**Límite funcional:** esto automatiza el preflight y la comprobación de CLI, no el razonamiento de un agente. La fase de especificación/planificación/tareas asistida por IA sigue pendiente de una integración gratuita de agente que esté realmente disponible en la cuenta y pueda operar de forma no interactiva. No se configuró ni se simuló.
