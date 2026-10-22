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
- El escaneo estático inicial de nombres de archivos en `main` encontró `apps/web/.env.example`, que se debe revisar como plantilla y no tratar automáticamente como secreto.
- `.gitignore` protege los archivos de entorno comunes y ahora incluye reglas adicionales para certificados y volcados locales.
- Se añadió un workflow de Gitleaks con checkout completo para comprobar secretos en archivos rastreados e historial Git alcanzable desde el ref del workflow.
- **No declarar el repositorio seguro para publicación hasta que el workflow termine y sus hallazgos sean revisados.** El escaneo por sí solo no reemplaza la revisión manual ni cubre artefactos externos al repositorio.
