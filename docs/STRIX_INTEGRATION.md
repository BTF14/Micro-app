# Integración de Strix para pruebas de seguridad

**Estado:** plan aprobado para evaluación; herramienta aún no instalada ni ejecutada en Micro app.  
**Fuente:** https://github.com/usestrix/strix  
**Documentación:** https://docs.strix.ai/quickstart  
**Consulta:** 2026-10-18

## Objetivo y uso previsto

Strix es una herramienta open source de pruebas de penetración asistidas por agentes. Puede investigar y validar vulnerabilidades mediante pruebas dinámicas, generar pruebas de concepto e informes. Complementa, no reemplaza, las pruebas unitarias/de integración, Semgrep, Trivy, Playwright, revisión humana ni el checklist OWASP ASVS.

Se utilizará cuando el objetivo y el entorno estén preparados para una evaluación dinámica autorizada, especialmente:
- después de cerrar los requisitos mínimos de autenticación/autorización y disponer de un entorno de prueba reproducible;
- para evaluar API HTTP, flujos de sesión, controles de acceso multiempresa y errores de configuración;
- en staging/preview aislado sin datos reales, y sobre una API OpenAPI/Swagger cuando esté disponible;
- antes de hitos importantes de seguridad y después de cambios sustanciales de identidad, permisos, API o infraestructura;
- para reproducir y validar hallazgos ya corregidos, con un informe que pueda enlazarse a issues/PR.

No es necesario ejecutarlo en cada cambio documental o de interfaz. Para PR ordinarios siguen siendo preferibles los controles ligeros de CI. La frecuencia de ejecución se revisará cuando existan una API y un staging listos.

## Requisitos y límites de coste

El README de Strix indica Docker en ejecución y un proveedor/modelo de lenguaje configurado. La herramienta open source puede ejecutarse localmente, pero el coste del modelo depende del proveedor y del uso. Para Micro app se mantiene el límite de $0:
1. Antes de ejecutar, verificar si existe un proveedor local compatible y suficiente; si requiere API externa, comprobar precios/cuotas y no habilitar facturación ni cargos automáticos.
2. No utilizar servicios cloud de pago ni introducir una clave de API sin aprobación y verificación de coste.
3. No instalar Strix en el runtime de producción ni en la imagen desplegada de Micro app; es una herramienta de seguridad del entorno de desarrollo/pruebas.
4. Confirmar versiones, licencia, dependencias, aislamiento Docker, permisos del contenedor y comandos de salida antes de la primera ejecución.

## Secuencia de adopción

1. **Evaluación documental:** revisar README, quickstart, licencia Apache-2.0, versiones/releases, configuración de proveedores y riesgos del sandbox.
2. **Prueba aislada:** instalar solo en un entorno temporal controlado; usar una app deliberadamente vulnerable de laboratorio (por ejemplo, OWASP Juice Shop aislado) o un fixture sintético, nunca sistemas ajenos.
3. **Validar coste y datos:** confirmar que el proveedor seleccionado no genera cargos; comprobar que prompts, trazas, hallazgos y PoC no contienen secretos ni datos comerciales.
4. **Micro app local/efímera:** cuando se pueda levantar la API con PostgreSQL desechable y datos sintéticos, probar alcance limitado a localhost/red aislada. Revisar manualmente cada solicitud destructiva o que afecte a datos.
5. **Staging autorizado:** solo cuando exista un staging aislado y el responsable confirme que el destino es propio y está autorizado. Prohibido apuntar el agente a producción, Neon main o dominios de terceros.
6. **Integración CI opcional:** considerar GitHub Actions únicamente después de validar coste del modelo, almacenamiento de informes, permisos mínimos, límites de ejecución, protección de secretos, alcance fijo y comportamiento seguro ante fallos. No agregar un workflow que requiera una clave paga ni que ejecute explotación activa por defecto.
7. **Triaging y remediación:** clasificar hallazgos, reproducir de forma segura, crear issue/PR con evidencia redactada y añadir regresiones. No permitir auto-fix ni merge automático sin revisión.

## Alcance inicial de pruebas

- Autenticación, gestión de sesión y logout/revocación.
- BOLA/IDOR y separación entre organizaciones A y B usando exclusivamente datos sintéticos.
- Elevación de privilegios, creación pública de organizaciones y rutas administrativas.
- Validación de entradas, inyección, SSRF, XSS y configuraciones HTTP/CORS/cookies cuando corresponda.
- Límites de abuso/rate limiting y manejo de errores sin filtrado de datos.
- API declarada mediante OpenAPI, cuando exista.

Las pruebas deben demostrar que una organización no puede leer/modificar datos de otra; un resultado sin hallazgos no prueba ausencia de vulnerabilidades.

## Gates de seguridad y evidencia

- [ ] Strix instalado en entorno aislado y versión registrada.
- [ ] Proveedor/modelo verificado con coste $0 y sin facturación activada.
- [ ] Docker y límites de sandbox revisados.
- [ ] Blanco de laboratorio o aplicación local efímera con datos sintéticos.
- [ ] Alcance y autorización registrados antes de cualquier escaneo activo.
- [ ] Informe revisado manualmente y secretos/datos sensibles redactados.
- [ ] Hallazgos triageados y regresiones añadidas donde proceda.
- [ ] Ningún escaneo activo de producción ni mutación de Neon main.

## Estado actual y próximos pasos

No se ha instalado ni ejecutado Strix, no se ha escaneado Micro app, no se ha conectado ningún proveedor LLM y no se ha creado un workflow nuevo. La autenticación/allowlist continúa como bloqueo P0; primero deben resolverse las decisiones de producto y prepararse pruebas con PostgreSQL efímero. Luego se realizará el piloto de Strix en un laboratorio aislado y, después, una evaluación local de Micro app.

## Referencias

- Repositorio: https://github.com/usestrix/strix
- Quickstart: https://docs.strix.ai/quickstart
- Documentación: https://docs.strix.ai
- OWASP Juice Shop, solo laboratorio: https://github.com/juice-shop/juice-shop
- Checklist del proyecto: [OWASP ASVS](OWASP_ASVS_CHECKLIST.md)
- Plan de seguridad: [SECURITY_PLAN_2026.md](SECURITY_PLAN_2026.md)
