# Revisión de exposición y seguridad del repositorio

**Estado:** repositorio público; tratar ramas e historial accesibles como contenido expuesto. Este documento no autoriza un cambio de visibilidad.

## Evidencia y límites

- Ejecutar Gitleaks con historial completo sobre el SHA exacto que se evalúa. Un resultado verde solo cubre los refs alcanzables desde ese checkout; no certifica otras ramas, artefactos, logs, releases ni sistemas externos.
- Si se encuentra una credencial real, revocarla/rotarla en su proveedor. Borrar el archivo en un commit posterior no revoca la credencial ni elimina la exposición histórica.
- Revisar PRs y ramas obsoletas antes de eliminarlas; no borrar evidencia ni trabajo útil sin verificarlo.
- Revisar ejemplos de configuración, artefactos de Actions, logs, releases, issues y PRs por datos sensibles.
- Verificar en GitHub Settings la protección de `main`, checks requeridos, permisos mínimos de Actions y disponibilidad/estado de Secret scanning y Push protection. La conexión de GitHub usada para esta auditoría no permite administrar todas esas opciones.
- El repositorio se inventarió anteriormente con 78 ramas sin protección. Confirmar el estado vivo en Settings; no asumir que esta documentación aplica a ramas nuevas.
- No activar facturación, planes de pago ni cambiar la visibilidad como workaround.

## Estado de los checks

- En el SHA `d100a9eb01601b1f1961c156e3f0c42c53c126dc`, el workflow de historial completo sí ejecutó Gitleaks y terminó en success: https://github.com/BTF14/Micro-app/actions/runs/39702300610.
- Ese resultado no se transfiere a un SHA posterior. El escaneo de la rama y del head final de la PR debe revisarse por separado.
- Trivy es un control complementario, no un certificado de seguridad. CI verde tampoco demuestra ausencia de secretos ni reemplaza la revisión manual.

## Criterio de cierre

- [ ] Gitleaks finaliza correctamente en el SHA exacto de la PR y se revisa su salida.
- [ ] CI, pruebas y escáneres aplicables finalizan en el mismo SHA.
- [ ] Se revisan findings, historial, artefactos y ramas accesibles.
- [ ] Se verifican protecciones y permisos desde GitHub Settings.
- [ ] La documentación de continuidad refleja los resultados reales, sin declarar el repositorio seguro por un único escaneo.

No se despliega producción, no se modifica Neon `main`, no se cambian credenciales y no se habilitan servicios de pago como parte de esta auditoría.
