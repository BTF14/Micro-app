# ODD task — eliminar credenciales Git persistentes del workflow de backup

**Fecha:** 2026-11-10  
**Base:** `c5373564413ba086690552c6b7deeab08d7b4a89`  
**Riesgo:** crítico de manejo de secretos; cambio acotado al workflow de backup.  
**Objetivo de entrega del proyecto:** 2026-12-01 — inamovible.

## Problema verificado
`.github/workflows/backup.yml` clona el repositorio privado de backups con una URL HTTPS que interpola `GH_TOKEN`. Git guarda esa URL como `remote.origin.url` en `.git/config`, por lo que el token puede permanecer en la configuración local del clon durante el job. El token no aparece necesariamente en logs, pero la persistencia local es innecesaria.

## Alcance
- Sustituir autenticación embebida en URL por un helper temporal `GIT_ASKPASS`.
- Restringir permisos del helper y eliminarlo al terminar.
- Mantener el remote URL sin credenciales.
- Desactivar prompts interactivos.
- Mantener intactos el repositorio remoto, secretos, permisos, retención, backup y datos.
- No modificar producción, Neon, DNS, billing ni secretos.

## Exclusiones
No cambiar el formato, cifrado, retención, calendario, destino ni permisos del backup. No ejecutar el workflow manualmente ni acceder a copias reales.

## Criterios verificables
1. No hay interpolación de `GH_TOKEN` en la URL de clone/push.
2. `git clone` y `git push` reciben credenciales mediante askpass solo dentro del paso.
3. El remote `origin` queda en URL limpia sin token.
4. El helper temporal se elimina con trap incluso ante error.
5. No hay `set -x`, salida del token, argumentos con token ni escritura de credenciales en git config.
6. CI exact-HEAD y revisión del diff pasan; el PR permanece Draft.

## Verificación y límites
- Revisar YAML y diff estáticamente.
- CI de GitHub valida sintaxis/contratos existentes si el workflow correspondiente se ejecuta.
- No afirmar que el backup remoto se probó: el cambio solo afecta autenticación Git y no ejecuta el workflow productivo.
- Cualquier verificación de ejecución del job real requiere un procedimiento autorizado separado.

## Siguiente paso
Actualizar únicamente `.github/workflows/backup.yml`, inspeccionar diff, abrir PR Draft y verificar todos los checks del SHA exacto.
