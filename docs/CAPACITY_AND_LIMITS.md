# Capacidad, límites y escalado seguro — Micro app

**Estado:** requisito permanente; no es una declaración de capacidad ya medida.  
**Objetivo:** determinar y mantener un límite operativo verificable para organizaciones, sucursales y usuarios sin agotar Neon, Cloudflare u otros recursos, y sin degradar a los clientes existentes.

## Regla no negociable
No afirmar “soporta N empresas” hasta medirlo con una carga representativa, un entorno seguro y límites del plan confirmados. El número de empresas por sí solo no es una unidad suficiente: deben incluirse sucursales, usuarios concurrentes, operaciones, tamaño de datos, consultas, informes, archivos y patrones de uso.

## Alcance de límites que se debe auditar

- **Neon/PostgreSQL:** plan y límites efectivos vigentes; almacenamiento y crecimiento; compute/consumo; conexiones y pool; concurrencia; latencia y consultas lentas; transacciones; índices; tablas/índices grandes; retención y recuperación.
- **Cloudflare Workers:** plan y límites aplicables; requests, CPU por invocación, duración, concurrencia, errores, tamaño de solicitudes/respuestas, límites de bindings y servicios conectados. Verificar configuración y métricas reales; no inferir disponibilidad de límites por recuerdos o documentación antigua.
- **Cloudflare Pages:** cuotas aplicables a builds/despliegues, ancho de banda/transferencia, solicitudes y límites del producto según el plan vigente; distinguir preview deployments de producción.
- **Otros servicios utilizados:** almacenamiento de objetos, correo, autenticación, observabilidad, GitHub Actions y proveedores externos. Registrar cuotas, límites de rate, retención, alertas y posibles costes.
- **Aplicación multi-tenant:** organización → sucursal → usuarios/roles → datos comerciales. Medir carga y crecimiento por tenant, impedir que un tenant consuma recursos desproporcionados y probar aislamiento de datos.

## Método obligatorio antes de fijar una cifra

1. Confirmar en el código de HEAD la arquitectura, versiones, configuración, esquema, consultas y rutas críticas.
2. Confirmar el plan y las cuotas vigentes de Neon y Cloudflare mediante documentación oficial y paneles de solo lectura. Nunca copiar secretos ni exponer datos de clientes. No ejecutar consultas de diagnóstico contra Neon `main` bajo este trabajo.
3. Definir escenarios sintéticos realistas: empresa pequeña/media/alta, número de sucursales y usuarios concurrentes, operaciones por minuto, informes y crecimiento de datos. Documentar supuestos y evitar usar datos comerciales reales.
4. Medir en local/entorno efímero o entorno de pruebas autorizado, sin generar gastos ni carga en producción: p50/p95/p99 de latencia, throughput, errores, CPU, consultas/conexiones, consumo y crecimiento de almacenamiento.
5. Identificar el primer cuello de botella; optimizar primero consultas/índices/paginación, límites de petición, caché segura y trabajos asíncronos cuando los datos lo justifiquen. No introducir microservicios ni cambiar de plan como primera reacción.
6. Repetir pruebas tras cada cambio significativo y guardar comandos, configuración no secreta, versión/SHA, resultados y limitaciones.
7. Publicar tres cifras distintas, con evidencia: **capacidad demostrada**, **límite operativo recomendado con margen** y **umbral de alerta/expansión**. Si faltan métricas, declararlas desconocidas; no inventar un número.
8. Definir alertas y controles antes de abrir altas: uso normal, advertencia, umbral de protección y plan de respuesta. No aceptar nuevos tenants por encima del límite operativo sin una decisión consciente y validada.
9. Revisar periódicamente los límites de proveedor, advisories y métricas de producción cuando exista monitorización aprobada; actualizar el límite con pruebas, no por intuición.

## Guardrails de seguridad y coste

- Coste objetivo $0 para auditoría y pruebas iniciales; no activar recursos de pago, cambiar planes, generar cargas en producción ni aumentar cuotas sin autorización explícita.
- No modificar secretos, no leer/alterar Neon `main`, no probar con datos reales ni hacer despliegues manuales a producción.
- Los tests de carga deben ser acotados, reproducibles, sintéticos y ejecutados en entornos desechables/autorizados.
- No registrar secretos, tokens, contenido comercial o datos personales en logs de pruebas.
- Toda decisión de capacidad debe indicar fuente y fecha de las cuotas del proveedor, SHA probado, escenario, resultados, margen de seguridad y lo que no se probó.
- No confundir límites publicados del plan con capacidad sostenible de la aplicación; el cuello de botella puede aparecer antes.

## Orden de trabajo

1. Terminar de forma segura el trabajo de restauración/documentación pendiente.
2. Auditar en solo lectura el repositorio y las configuraciones documentadas.
3. Crear inventario de límites de Neon, Workers, Pages y servicios auxiliares.
4. Medir primero con carga sintética y entorno efímero.
5. Corregir cuellos de botella priorizados en cambios pequeños y verificables.
6. Solo entonces recomendar un límite de empresas/sucursales y una estrategia de crecimiento.

## Estado inicial (2026-10-29 UTC)

- La restauración técnica del backup remoto concreto se verificó en run [40955935124](https://github.com/BTF14/Micro-app/actions/runs/40955935124), en PostgreSQL 18 efímero. Esto no demuestra integridad de todos los datos comerciales ni mide capacidad.
- El número de organizaciones/sucursales soportables está **sin determinar**.
- No hay evidencia de una prueba de carga representativa que permita declarar una capacidad de producción.
- La arquitectura documentada es React/Vite/TypeScript, Cloudflare Pages, Cloudflare Workers + Hono, Neon PostgreSQL y Drizzle; debe confirmarse contra HEAD antes de ejecutar cambios.


## Referencias oficiales de límites (revisión 2026-10-29)

Estos valores son una **referencia documental**, no una verificación del plan contratado ni una garantía de capacidad del producto. Volver a consultar las páginas oficiales antes de cada decisión de capacidad; los proveedores pueden cambiar cuotas.

- **Neon Free (publicación oficial del 2026-10-02):** 100 proyectos por cuenta; 1 GB de almacenamiento PostgreSQL por proyecto; 100 CU-hours de cómputo por proyecto al mes; autoscaling hasta 2 CU; 10 ramas por proyecto y ventana de instant restore de 6 horas. Referencia: https://neon.com/blog/neon-free-plan-1-gb-per-project
- **Cloudflare Workers Free:** 100.000 solicitudes por día; 10 ms de CPU por invocación HTTP; 128 MB por isolate; 50 subrequests por invocación; 6 conexiones salientes simultáneas por solicitud; 5 Cron Triggers por cuenta; 100 Workers por cuenta. Referencia: https://developers.cloudflare.com/workers/platform/limits/
- **Cloudflare Pages Free:** 500 builds por mes, un build concurrente y timeout de build de 20 minutos; 20.000 archivos por sitio y 25 MiB por archivo. Referencia: https://developers.cloudflare.com/pages/platform/limits/
- **Coste:** Workers Paid tiene un cargo mínimo publicado de USD 5/mes; no se debe habilitar ni migrar a un plan de pago sin autorización. Referencia: https://developers.cloudflare.com/workers/platform/pricing/

### Consecuencia operativa

El techo de 100.000 solicitudes diarias de Workers Free es un límite del proveedor, no el número de ventas ni de empresas. Una operación de negocio puede producir varias llamadas a la API y varias consultas SQL; además, Neon tiene límites independientes de cómputo, almacenamiento, conexiones, transferencia y latencia. La capacidad aceptable se determinará por el primer límite que se alcance con margen de seguridad, y solo tras una prueba sintética autorizada. El plan real de las cuentas y los consumos actuales siguen **sin verificar** desde este repositorio.
