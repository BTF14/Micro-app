# Panel de avance

- `index.html`: vista completa con tabla de áreas y bloqueos.
- `progress.svg`: gráfica compatible con README y GitHub.
- `progress.json`: datos de origen para automatización e historial.
- Fuente de verdad: [checklist de preparación](../PRODUCTION_READINESS.md).
- Generación: `python3 tools/project-progress.py`.

Los porcentajes reflejan la proporción de criterios marcados con evidencia en el checklist, no una estimación subjetiva de lo que “parece terminado”. Se publican por separado implementación y preparación para producción. Las pruebas de UI con API simulada no cuentan como validación de backend real. Un porcentaje alto no anula los bloqueos P0.

El workflow de GitHub Actions regenera los tres archivos y los publica como artefacto descargable. La generación debe ser determinista: el workflow ejecuta el generador dos veces y verifica que JSON, SVG y HTML no cambien entre ejecuciones. Los archivos versionados son una instantánea; descarga el artefacto de la ejecución más reciente para ver la salida recién generada.
