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

## Implementación y evidencia — 2026-11-10

**Estado:** cambio implementado en PR #302; CI exact-HEAD previo a este registro: 14/14 check-runs SUCCESS y 10/10 workflows SUCCESS.

- `.github/workflows/backup.yml` crea un helper askpass bajo `$RUNNER_TEMP`, con `umask 077` y modo 700.
- El helper responde al prompt Username con `x-access-token` y al prompt Password con `GH_TOKEN`, sin imprimir el valor.
- `git clone` usa URL HTTPS limpia; el remote `origin` no incorpora el token.
- `GIT_TERMINAL_PROMPT=0` impide fallback interactivo; el mismo entorno askpass cubre clone y push.
- Un `trap` elimina helper y clon temporal mediante ruta absoluta, incluso después del `cd` al repositorio.
- No se escribe token en git config, argumentos ni URL. La identidad git local usa solo nombre/email no secretos.
- Se revisó el workflow completo y el diff. No se ejecutó el workflow real de backup, no se usaron secretos reales, no se accedió al repositorio de backups ni se modificó retención/cifrado/destino.

## Pendiente residual

- CI verde valida el workflow y sus checks, pero no demuestra una subida real con el secreto ni restauración.
- La comprobación dinámica del comportamiento Git con askpass y un token de prueba requiere un repositorio sintético y secreto efímero en un entorno aislado; no se ejecutó en esta fase.
- El RPO, RTO integral, alertas externas y coste $0 permanecen abiertos.

**Limitación de estado:** SHA/CI citados son los observados antes de este commit documental; consultar el HEAD exacto posterior. PR #302 permanece OPEN/Draft.


## Verificación aislada del contrato askpass — 2026-11-10

- Se extrajo el helper a `scripts/backup_git_askpass.sh` para que el mismo archivo probado por CI sea el que el workflow copia temporalmente a `$RUNNER_TEMP`.
- `scripts/test_backup_git_askpass.sh` usa un token ficticio efímero y comprueba las respuestas Username/Password, el rechazo de prompts desconocidos, el fallo cerrado si falta GH_TOKEN y que el valor ficticio no esté incrustado en el helper.
- El workflow de CI ejecuta esta prueba sin secretos, repositorio remoto ni red; el workflow de backup instala una copia temporal con modo 700 y la elimina junto con el clon mediante `trap`.
- Esta prueba verifica el contrato local del helper, **no** demuestra autenticación HTTPS real, push remoto, ni restore de un backup real. No ejecutar el workflow productivo para probarlo.
- El nuevo HEAD requiere CI exact-HEAD; mantener #302 OPEN/Draft y sin merge hasta revisión independiente y cierre de los gates de backup/Seguridad Nivel 1.


## Verificación de integración del transporte HTTP Git — 2026-11-10

- Se añadió `scripts/test_backup_git_askpass_http.py`, usando únicamente la biblioteca estándar de Python y un servidor HTTP loopback efímero.
- El servidor desafía con HTTP 401 + Basic realm; Git debe invocar el helper real `GIT_ASKPASS`, responder con username `x-access-token` y el token ficticio, y el servidor valida el header Authorization sin registrarlo ni escribir el valor del token.
- El mock devuelve 404 después de autenticar intencionalmente: el test demuestra que el transporte HTTP de Git invoca askpass y envía credenciales correctas, pero **no** emula Git smart-HTTP, no demuestra clone/push completo, no prueba TLS/GitHub ni usa secretos reales.
- El test se ejecuta en CI junto al contrato shell previo. No hace conexiones externas ni accede a repositorios reales.
- La prueba local en el entorno de trabajo pasó. CI del nuevo HEAD de #302 debe verificarse por SHA exacto; mantener Draft y no ejecutar el workflow productivo.


### Ajuste del modo ejecutable del helper en el test

- La primera ejecución del test HTTP en GitHub Actions falló por `Permission denied`: el archivo fuente en el checkout tiene modo 100644, mientras que el workflow de producción lo instala explícitamente con `install -m 700`.
- El test ahora copia el helper fuente a su directorio temporal y aplica modo 700 antes de entregarlo a Git, reproduciendo el contrato real de instalación sin mutar el checkout.
- El fallo era del harness de prueba; no demuestra un fallo del workflow productivo. El nuevo SHA debe volver a ejecutar CI exact-HEAD.
