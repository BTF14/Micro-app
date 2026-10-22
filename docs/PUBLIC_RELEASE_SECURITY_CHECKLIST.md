# Revisión de seguridad antes de hacer público el repositorio

Este checklist debe completarse antes de cambiar la visibilidad de `BTF14/Micro-app`.
Hacer público el repositorio expone el contenido actual, las ramas y el historial Git accesibles; borrar un secreto en un commit nuevo no lo elimina de los commits anteriores.

## Evidencia requerida

- [ ] Revisar los resultados del workflow **Secret history scan** en el head exacto de la rama que se pretende publicar.
- [ ] Resolver todos los hallazgos reales de secretos. Si una credencial llegó a Git, revocarla/rotarla en el proveedor; no basta con borrar el archivo.
- [ ] Revisar el historial completo de cada rama que seguirá siendo accesible después del cambio de visibilidad, no solo el árbol de `main`.
- [ ] Revisar ramas obsoletas y PRs abiertas. Eliminar ramas solo después de confirmar que no contienen trabajo necesario y que no se pierde evidencia útil.
- [ ] Confirmar que no existen volcados de bases de datos, datos personales, certificados privados, credenciales ni configuraciones locales.
- [ ] Confirmar que todos los ejemplos de configuración contienen únicamente valores ficticios y están marcados claramente como ejemplos.
- [ ] Revisar artefactos de Actions, logs, releases, issues y PRs por posibles datos sensibles.
- [ ] Revisar las reglas de protección de `main`: al momento de la auditoría, GitHub reportó que la protección de la rama estaba deshabilitada. Activar protección de rama y checks requeridos desde Settings antes de aceptar cambios tras la publicación.
- [ ] Revisar configuración de Secret scanning y Push protection en GitHub Settings; confirmar disponibilidad para el plan y que estén habilitados si corresponde.
- [ ] Revisar permisos de Actions y mantener el principio de mínimo privilegio.
- [ ] Confirmar que los checks de seguridad y CI terminaron correctamente en el SHA final.
- [ ] Obtener confirmación explícita del propietario antes de cambiar la visibilidad a público.

## Estado de esta auditoría

- Repositorio revisado mediante la conexión GitHub: `BTF14/Micro-app`.
- El inventario de las 78 ramas visibles encontró, en los árboles actuales, únicamente `apps/web/.env.example` entre los nombres de archivos que coinciden con patrones de entorno/credenciales/certificados/volcados. Su contenido revisado solo define `VITE_API_BASE_URL=http://localhost:8787` y comentarios; no contiene una credencial. Esta comprobación de nombres no equivale a escanear los contenidos ni el historial completo.
- GitHub reportó `protected: false` para las 78 ramas enumeradas; no se detectó ninguna rama protegida en ese inventario.
- `.gitignore` protege los archivos de entorno comunes y ahora incluye reglas adicionales para certificados y volcados locales.
- Se añadió un workflow de Gitleaks con checkout completo para comprobar secretos en archivos rastreados e historial Git alcanzable desde el ref del workflow.
- **No declarar el repositorio seguro para publicación hasta que el workflow termine y sus hallazgos sean revisados.** El escaneo por sí solo no reemplaza la revisión manual ni cubre artefactos externos al repositorio.
- En el head `2849a96599022e3ea330aacea68a713fdc76a626`, los siete workflows consultados (CI, Security scan/Trivy, Semgrep SAST, Playwright E2E, Database migration validation, Project progress dashboard y Secret history scan) terminaron en `failure`, con `runner_id: 0`, cero steps y logs 404 `BlobNotFound`. La evidencia no muestra ejecución de comandos y no es un resultado de escaneo limpio.
- Runs verificados: [Security scan](https://github.com/BTF14/Micro-app/actions/runs/39701045262), [CI](https://github.com/BTF14/Micro-app/actions/runs/39701045291), [Semgrep SAST](https://github.com/BTF14/Micro-app/actions/runs/39701045311), [Project progress dashboard](https://github.com/BTF14/Micro-app/actions/runs/39701045339), [Secret history scan](https://github.com/BTF14/Micro-app/actions/runs/39701045297), [Playwright E2E](https://github.com/BTF14/Micro-app/actions/runs/39701045409), [Database migration validation](https://github.com/BTF14/Micro-app/actions/runs/39701045414).
- Se reintentó una sola vez el job Gitleaks para diagnóstico; el intento 2 estaba en cola al último chequeo (`run_attempt: 2`, job ID `119573359675`, sin runner asignado). Volver a consultar antes de concluir.
- La causa de asignación de runner no está demostrada. No afirmar agotamiento de minutos, bloqueo de billing o fallo de configuración sin un mensaje explícito de GitHub.
