# Runbook de ejecución del piloto GitHub Spec Kit

**Rama exclusiva:** `pilot/speckit-inventory`  
**Estado:** preparado; pendiente de ejecución real del CLI  
**Prohibido en este piloto:** implementación funcional, migraciones remotas, Neon `main`, despliegues, PR y merge.

## 1. Propósito

Comprobar si Spec Kit puede operar como motor del flujo SDD de Micro-app, reutilizando la Constitución, las plantillas y los artefactos existentes, sin crear un segundo sistema de especificaciones.

El caso de prueba es `docs/specs/inventory-by-branch/`. Los tres archivos existentes son artefactos preliminares manuales de planificación; no fueron generados por Spec Kit.

## 2. Preparación del entorno

Requisitos:
- Checkout limpio de `pilot/speckit-inventory`.
- Python 3.11+ y `uv`.
- Acceso a GitHub y terminal.
- Codex CLI disponible si se elige la integración `codex`; de lo contrario usar integración neutral `none`.
- Mantener el entorno en coste $0. No habilitar planes o servicios pagos.

Verificar antes de ejecutar:
```bash
git status --short
git branch --show-current
git rev-parse HEAD
python --version
uv --version
```

La rama debe ser exactamente `pilot/speckit-inventory`, el árbol debe estar limpio y el HEAD debe ser el commit revisado más reciente. Si `main` avanzó, no incorporar esos cambios automáticamente: mantener el snapshot piloto hasta que se decida explícitamente actualizar su base.

## 3. Instalación de Spec Kit

Seguir la guía oficial de instalación vigente y registrar versión exacta del CLI. No instalar extensiones comunitarias ni presets remotos en esta primera pasada.

La inicialización en repositorio existente usa el patrón documentado:
```bash
specify init --here --force --integration <codex|none>
```

Elegir `codex` solo si Codex CLI está instalado y será el agente de ejecución del piloto. Si no, usar `none` para obtener scaffolding neutral. La integración `none` no crea habilidades ejecutables para ChatGPT; tampoco debe describirse como integración nativa de ChatGPT.

**Gate inmediatamente después de init:**
```bash
git status --short
git diff --stat
git diff -- . ':!docs/specs/inventory-by-branch'
```
Revisar cada archivo nuevo/modificado antes de seguir. Si Spec Kit modifica archivos canónicos, reglas de proyecto, workflows o archivos ajenos a su infraestructura sin motivo, detenerse y revertir solo los cambios de inicialización no aceptados. No continuar con un diff no entendido.

## 4. Configuración de ubicación y plantillas

La documentación oficial de Spec Kit describe:
- `SPECIFY_FEATURE_DIRECTORY` para seleccionar una carpeta de función explícita, incluso fuera de `specs/`.
- `.specify/templates/overrides/` para reemplazos locales de plantillas; tienen precedencia sobre presets, extensiones y plantillas core.

Por tanto, el objetivo de ubicación es:

```bash
export SPECIFY_INIT_DIR="$PWD"
export SPECIFY_FEATURE_DIRECTORY="$PWD/docs/specs/inventory-by-branch"
export SPECIFY_FEATURE_NO_PERSIST=1
```

Usar `SPECIFY_FEATURE_NO_PERSIST=1` durante la prueba para evitar que ejecuciones concurrentes o posteriores cambien el puntero persistido de función. Si se ejecuta secuencialmente con un solo agente, sigue siendo una protección útil para esta validación.

No copiar ciegamente las plantillas Micro-app a overrides con nombres supuestos. Primero inspeccionar el árbol generado en `.specify/templates/`, identificar nombres reales de plantillas y correspondencia de artefactos, y luego adaptar las tres plantillas Micro-app en overrides con el formato que Spec Kit espera. Mantener una única fuente de verdad por artefacto: los overrides serán las plantillas efectivas de Spec Kit; `templates/sdd/` se conserva como biblioteca base canónica hasta que una propuesta separada decida cómo sincronizarla sin duplicación.

## 5. Secuencia de prueba

1. Registrar `specify version --json` y `specify check`.
2. Confirmar integración instalada y activa mediante `specify integration status`.
3. Confirmar que el directorio de función resuelto es `docs/specs/inventory-by-branch/`.
4. Inspeccionar el contenido de los overrides y verificar que mantienen los campos de Micro-app: tenant, autorización, seguridad, coste $0, datos, pruebas, reversión y evidencia.
5. Ejecutar solo Specify, Clarify si hay ambigüedades, Plan, Tasks y Analyze (si está disponible en la instalación).
6. Comparar los artefactos resultantes con los preliminares actuales y revisar que no haya duplicados ni pérdida de requisitos.
7. Detenerse antes de Implement, Converge o cualquier escritura en código/migraciones.

## 6. Criterios de éxito del piloto

- [ ] CLI instalado desde fuente oficial y versión registrada.
- [ ] Inicialización limitada a la rama piloto.
- [ ] No hay modificaciones en `main`, Neon, producción ni despliegues.
- [ ] Los comandos resuelven el feature directory en `docs/specs/inventory-by-branch/`.
- [ ] Los overrides locales reemplazan plantillas core de forma comprobable.
- [ ] Los artefactos siguen enlazando las fuentes canónicas sin copiar políticas completas.
- [ ] Specify/Plan/Tasks producen artefactos únicos y consistentes.
- [ ] Analyze/Clarify detectan vacíos sin inventar decisiones aprobadas.
- [ ] El diff completo es comprensible y no introduce dependencias o servicios pagos.
- [ ] No se ejecutó Implement ni se modificó código funcional.

## 7. Limpieza / rollback del piloto

Si Spec Kit no respeta la ruta, los overrides o las restricciones:
1. Guardar el log de versión, comandos, resultados y diff para el informe.
2. No ejecutar más comandos generadores.
3. Revertir en la rama piloto únicamente los archivos de scaffolding no aceptados, preservando los documentos SDD existentes y este informe.
4. No borrar ni reescribir historia; usar commits reversibles.
5. Mantener la rama piloto separada de `main`.

## 8. Fuentes oficiales

- [Adopting Spec Kit in an Existing Project](https://github.com/github/spec-kit/blob/main/docs/guides/existing-projects.md)
- [Customize Spec Kit](https://github.github.com/spec-kit/guides/customization.html)
- [Core Commands and environment variables](https://github.github.com/spec-kit/reference/core.html)
- [Integrations](https://github.github.com/spec-kit/integrations/index.html)

## 9. Bloqueo conocido

En el entorno de esta sesión, `git clone` falló por ausencia de resolución DNS hacia `github.com`. Las herramientas conectadas permiten inspeccionar y modificar archivos de GitHub, pero no proporcionan una terminal de proyecto donde instalar y ejecutar el CLI. Este runbook prepara una ejecución reproducible; no afirma que el CLI se haya instalado ni ejecutado.
