# Constitución del proyecto Micro app

**Estado:** norma rectora del proyecto.  
**Última revisión documental:** 2026-10-30.  
**Repositorio canónico:** https://github.com/BTF14/Micro-app  
**Plan operativo:** [PROJECT_PLAN.md](PROJECT_PLAN.md).  
**Continuidad:** [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md).

Esta constitución fija los límites que prevalecen sobre preferencias de implementación y atajos. Los detalles y la evidencia viven en los documentos enlazados. Ante una contradicción, verificar código y estado vivo; corregir la documentación, no adivinar.

## 1. Propósito y alcance

Micro app es un POS e inventario web para PC, tablet y móvil: catálogo/códigos de barras, proveedores/compras, existencias y movimientos, ventas, pagos, caja, recibos, devoluciones, reportes, roles y auditoría.

- Proyecto **independiente**: no mezclar código, bases de datos, credenciales, despliegues ni datos con Cantina-pos u otros proyectos.
- USD es la moneda base; equivalentes VES usan una tasa validada y registrada.
- PostgreSQL es la fuente de verdad de ventas e inventario. La UI, la memoria del navegador y respuestas simuladas no sustituyen persistencia autoritativa.
- No declarar el producto listo para operación comercial mientras queden requisitos críticos, seguridad, persistencia, pruebas o despliegue sin verificar.

## 2. Coste cero

- Presupuesto objetivo total: **$0 a corto y largo plazo**.
- No activar facturación, tarjetas, planes de pago, suscripciones ni cargos automáticos.
- Revalidar límites y términos de cada nivel gratuito antes de desplegar/adoptar herramientas. No prometer capacidad ilimitada.
- Preferir estándares portables y software libre.
- Arquitectura objetivo documentada: frontend estático Cloudflare Pages, API Cloudflare Workers + Hono y PostgreSQL en Neon Free, sujeto a revalidación de términos/límites.
- Vercel Hobby no es el destino para operación comercial. Si se exceden límites gratuitos, optimizar o proponer una alternativa gratuita; no generar gastos por cuenta propia.
- Referencia: [arquitectura y coste cero](ARCHITECTURE_AND_ZERO_COST.md).

## 3. Seguridad y autoridad

- Neon `main` es una base sensible de producción, no una zona permanentemente de solo lectura. La IA puede modificarla cuando el cambio sea realmente necesario para corregir un defecto, aplicar una evolución aprobada o mantener la integridad/seguridad del producto, y solo después de superar el gate de cambio en producción definido abajo.
- Antes de mutar Neon `main`: (1) confirmar la identidad del proyecto, base y rama destino sin exponer credenciales; (2) documentar necesidad, alcance e impacto; (3) probar la migración/SQL en PostgreSQL efímero o rama aislada siempre que sea viable; (4) revisar SQL, dependencias, locks, compatibilidad y estrategia de despliegue; (5) comprobar que existe una recuperación realista y verificar la copia de seguridad/restauración cuando sea viable; (6) preferir cambios aditivos, compatibles y reversibles; (7) registrar aprobación/autoridad, plan, ejecución y resultado en el diario.
- La IA puede ejecutar autónomamente cambios aditivos, compatibles y de bajo riesgo solo si el objetivo está inequívocamente identificado, la necesidad está demostrada, las pruebas previas pasan y existe recuperación comprobada. No ejecutar si hay duda sobre el destino, los datos afectados, el respaldo o el impacto.
- Requieren aprobación explícita previa del usuario: borrar o sobrescribir datos, migraciones destructivas, cambios irreversibles o de difícil reversión, modificaciones masivas de datos financieros/inventario/usuarios, cambios de permisos/credenciales, acciones con riesgo material de indisponibilidad, o cualquier cambio cuyo impacto no pueda determinarse con confianza.
- Después de cada mutación autorizada: validar esquema/datos/constraints y salud de la aplicación, registrar SHA, migración/SQL, destino (sin secretos), pruebas y resultado; detener nuevas mutaciones si aparece una anomalía y activar el plan de recuperación.
- No desplegar producción ni hacer otros cambios irreversibles sin aceptación explícita. La autorización para mantener el proyecto no equivale a autorización ilimitada para destruir o alterar datos.
- No publicar secretos, tokens, contraseñas, cadenas de conexión, datos de clientes ni datos de negocio.
- No enviar correos sin autorización expresa.
- No force-push ni fusionar ramas sin revisar el diff completo, conflictos, pruebas y procedencia.
- Se permiten cambios seguros/reversibles de código y documentación, commits y push, según las instrucciones del proyecto. No pedir permisos ya concedidos salvo bloqueo concreto demostrado.
- La autorización de trabajo no elimina guardrails de producción, datos, costes y secretos.

## 4. Identidad, roles y aislamiento

- **Estado verificado tras PR #153 y #155:** la API implementa Google OAuth, allowlist/bootstrap de un solo uso, state y PKCE, cookies de sesión HttpOnly, sesión revocable y validación del claim `email_verified` de Google. La verificación de correo se realiza mediante la identidad verificada del proveedor; no confundirla con un sistema propio de confirmación por correo.
- El bootstrap ya no acepta el token en query string: usa POST con cuerpo validado, Origin exacto y límites de tamaño/campos. La configuración `FRONTEND_ORIGIN` exige HTTPS salvo loopback HTTP y rechaza componentes no canónicos.
- El login/registro por contraseña permanece desactivado/fail-closed. Recuperación de cuenta, MFA, recuperación administrativa y limpieza automática completa de sesiones siguen pendientes. La autenticación implementada no demuestra autorización comercial ni aislamiento completo.
- Autenticación no equivale a autorización: permisos comprobados en servidor y aislamiento tenant en cada lectura/escritura.
- Probar accesos cruzados, roles, revocación de sesión y recursos ajenos.
- No inventar proveedor, credenciales, configuración OAuth ni reglas de allowlist. No afirmar que hay rutas comerciales HTTP: el estado documentado actual solo incluye rutas de identidad y `GET /health`.
- Referencias: [API](API_INTEGRATION.md), [esquema](SCHEMA_REVIEW.md), [seguridad](SECURITY_PLAN_2026.md), [OWASP ASVS](OWASP_ASVS_CHECKLIST.md).

## 5. Integridad financiera e inventario

- Ventas, pagos, stock y devoluciones: transaccionales, idempotentes y seguras ante concurrencia.
- Evitar stock negativo en la base de datos/transacción, no solo en frontend.
- Guardar snapshots de precio, moneda, tasa, impuestos/reglas, usuario y hora aplicables a la operación.
- Mantener movimientos y auditoría atribuibles; corregir mediante operaciones compensatorias auditables, no borrar hechos financieros silenciosamente.
- Distinguir registros fiscales e internos y mantener trazabilidad/exportación.
- Referencias: [esquema de datos](DATABASE_SCHEMA.md), [revisión](SCHEMA_REVIEW.md), [cumplimiento](COMPLIANCE_REQUIREMENTS.md), [matriz POS](POS_REFERENCE_MATRIX.md).

## 6. Tasa BCV y moneda

- Registrar valor, fuente, fecha efectiva publicada, hora de consulta y estado/validez.
- Validar estructura, rango, fecha y discrepancias antes de aceptar la tasa.
- BCV Today, DolarVZLA, pyDolarVenezuela y tasa-bcv-api fueron investigadas como candidatas; no etiquetarlas como oficiales sin verificar origen. Priorizar una fuente oficial verificable.
- Si la actualización falla, conservar la última tasa válida y marcarla desactualizada; nunca reemplazar una tasa válida con datos inválidos.
- Guardar la tasa aplicada a cada operación; los cambios posteriores no reescriben ventas históricas.
- Referencias: [plan](PROJECT_PLAN.md), [recursos](RESOURCE_REGISTRY.md), [cumplimiento](COMPLIANCE_REQUIREMENTS.md).

## 7. Cumplimiento legal/fiscal

IVA, IGTF, facturación, numeración y conservación documental requieren fuentes primarias oficiales vigentes y, cuando corresponda, revisión profesional. Los requisitos documentados no son dictamen legal ni prueba de cumplimiento.

- No hardcodear porcentajes/reglas no verificados; preferir reglas configurables con vigencia y snapshots auditables.
- No afirmar que un recibo interno es documento fiscal válido sin respaldo.
- Separar funciones internas de obligaciones fiscales certificadas.
- Registrar cada fuente consultada, fecha, conclusión y limitaciones en [RESOURCE_REGISTRY.md](RESOURCE_REGISTRY.md); requisitos en [COMPLIANCE_REQUIREMENTS.md](COMPLIANCE_REQUIREMENTS.md).

## 8. Calidad, seguridad y pruebas

- No marcar una función terminada sin criterios de aceptación y evidencia reproducible.
- Registrar SHA, workflow/run, comandos, resultados y limitaciones.
- Distinguir pruebas unitarias, integración con PostgreSQL efímero, E2E con API simulada, E2E con backend real y DAST.
- Un workflow verde no certifica seguridad ni preparación comercial; E2E con API simulada no valida backend, DB ni OAuth.
- OWASP ASVS es checklist interno, no certificación. Semgrep/Trivy son controles auxiliares; registrar alcance y si bloquean merges.
- ZAP solo en entorno aislado autorizado; Juice Shop solo laboratorio. Evaluar coste/permisos/compatibilidad antes de CodeQL, Casbin u otras herramientas.
- Referencias: [ASVS](OWASP_ASVS_CHECKLIST.md), [seguridad](SECURITY_PLAN_2026.md), [POS](POS_REFERENCE_MATRIX.md), [recursos](RESOURCE_REGISTRY.md).

## 9. IA, herramientas y agentes

- GitHub y documentación versionada son la fuente persistente de verdad; el chat no sustituye el repositorio.
- `.github/agents/*.agent.md` son perfiles reutilizables, no prueba de subagentes activos.
- GGA, Ollama, Engram, Gentle-AI y Gentle Shell no se describen como activos sin versión, ejecución y resultado observables.
- No habilitar hooks automáticamente; validar primero sobre un diff no sensible y documentar desinstalación.
- No almacenar secretos ni datos de clientes en memoria auxiliar.
- Referencias: [evaluación](GENTLEMAN_PROGRAMMING_EVALUATION.md), [implementación](GENTLEMAN_IMPLEMENTATION.md), [modelo operativo](AGENT_OPERATING_MODEL.md).


## 9A. Principio de autonomía técnica y responsabilidad de ejecución

La IA que trabaja en Micro app debe actuar como responsable técnico de principio a fin: analizar el estado real, elegir una solución proporcionada, implementarla, comprobarla y documentar la evidencia. El objetivo es completar correctamente el trabajo autorizado, no trasladar decisiones técnicas rutinarias al propietario.

### Autonomía por defecto
- Elegir e implementar la alternativa que mejor equilibre seguridad, simplicidad, mantenibilidad, verificabilidad, rendimiento medido y escalabilidad proporcional. Favorecer el coste operativo de **$0** salvo autorización explícita para cambiar esa restricción.
- No presentar menús A/B/C ni pedir aprobación repetida para decisiones técnicas reversibles que se puedan resolver con evidencia. Explicar la decisión y sus motivos; consultar al propietario solo ante una decisión genuina de producto, una ambigüedad material o un límite de autoridad.
- Investigar primero el código, los documentos, la documentación técnica y el estado vivo de GitHub/CI. No pedir al usuario que haga comprobaciones que las herramientas disponibles permitan ejecutar directamente.
- Realizar cambios mínimos y coherentes, ejecutar pruebas relevantes, revisar el diff completo, seguridad, regresiones y CI; corregir defectos y mantener los documentos sincronizados.
- Si una herramienta, permiso o dato realmente falta, describir el bloqueo concreto y solicitar únicamente la acción mínima que no se pueda realizar desde las capacidades disponibles.

### Límites que la autonomía no concede
- La autonomía técnica no equivale a permiso para cambiar requisitos de producto, políticas de seguridad/acceso, facturación, datos reales o infraestructura de producción.
- No desplegar a producción, no mutar Neon `main`, no operar sobre datos reales ni ejecutar migraciones irreversibles sin las verificaciones y aprobaciones explícitas que exija la política vigente.
- No exponer secretos, credenciales, datos privados ni tokens en código, logs, commits o documentación. No eludir controles de acceso ni de plataforma. No incurrir en gastos sin autorización.
- Usar ramas y PR para cambios revisables. No fusionar si los checks obligatorios están fallando, pendientes o no se han comprobado para el SHA exacto, ni si quedan defectos relevantes sin resolver.

### Cierre verificable y continuidad entre chats
- Antes de declarar una tarea terminada: comprobar el estado real y el SHA de referencia; revisar el cambio exacto; ejecutar y reportar pruebas aplicables; revisar seguridad y regresiones; actualizar Constitución, plan, diario y handoff cuando corresponda.
- Mantener el conocimiento en el repositorio, no solo en el contexto de una conversación. Cada handoff debe indicar decisiones, archivos, rama/PR/commit, checks comprobados, riesgos, trabajo no realizado y siguiente acción concreta.
- Separar siempre **recomendado**, **aprobado**, **implementado** y **verificado**. Nunca afirmar que algo se ejecutó, pasó o se fusionó sin evidencia verificable.
- Estas instrucciones guían a cualquier IA o chat que trabaje en el repositorio, pero no crean permisos técnicos que la cuenta o las herramientas no tengan.

### Revisión manual cuando un revisor IA no esté disponible
Una cuota agotada o fallo de servicio significa revisión incompleta, no aprobación ni hallazgo confirmado. Recuperar comentarios e hilos disponibles; no inferir detalles desde resúmenes. Revisar el diff completo y el código/pruebas relacionados, registrar hallazgos concretos con evidencia y ejecutar checks disponibles. No pagar ni repetir intentos mientras persista el límite. No fusionar con checks requeridos pendientes/no verificados o hallazgos materiales sin resolver.

## 10. Referencias POS

OSPOS, NexoPOS, Lakasir y POSNext fueron investigados como inspiración funcional para criterios de caja, catálogo, inventario, roles, devoluciones, concurrencia e impresión. No copiar código ni asumir licencias/seguridad aprobadas. Ver [INSPIRATION.md](INSPIRATION.md) y [POS_REFERENCE_MATRIX.md](POS_REFERENCE_MATRIX.md).

## 11. Etiquetas de evidencia

- **Verificado:** respaldado por código, salida de herramienta o workflow identificado.
- **Inferido:** conclusión razonable sin comprobación directa.
- **Pendiente:** trabajo no completado.
- **Bloqueado:** requisito o permiso concreto impide avanzar; indicar evidencia faltante.
- **No verificado:** no comprobado en el estado actual.

No convertir snapshots antiguos en estado actual. Consultar HEAD, ramas, PR y Actions relevantes en cada sesión.

## 12. Jerarquía y mantenimiento documental

1. Esta constitución: principios y límites no negociables.
2. [PROJECT_PLAN.md](PROJECT_PLAN.md): fases, prioridades, aceptación e índice completo.
3. [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md): punto de continuidad y prompt copiable.
4. [STATE_JOURNAL.md](STATE_JOURNAL.md): historial append-only.
5. [RESOURCE_REGISTRY.md](RESOURCE_REGISTRY.md): herramientas y fuentes.
6. Documentos de dominio: detalles técnicos, seguridad y cumplimiento.

Cada checkpoint significativo actualiza plan, diario y handoff. Además, después de cada avance concreto y verificado se sincroniza `README.md` para reflejar con precisión el producto disponible, la arquitectura vigente y la configuración real; nunca se anuncian capacidades incompletas o solo planificadas. Ante contradicciones, verificar código/evidencia y corregir los documentos relacionados. No borrar hitos históricos ni registrar secretos.

## 13. Índice de documentación de dominio

- Arquitectura/coste: [ARCHITECTURE_AND_ZERO_COST.md](ARCHITECTURE_AND_ZERO_COST.md)
- Producto: [PROJECT_PLAN.md](PROJECT_PLAN.md), [INSPIRATION.md](INSPIRATION.md)
- API/auth: [API_INTEGRATION.md](API_INTEGRATION.md)
- Datos: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [SCHEMA_REVIEW.md](SCHEMA_REVIEW.md)
- Cumplimiento: [COMPLIANCE_REQUIREMENTS.md](COMPLIANCE_REQUIREMENTS.md), [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md)
- Seguridad: [SECURITY_PLAN_2026.md](SECURITY_PLAN_2026.md), [OWASP_ASVS_CHECKLIST.md](OWASP_ASVS_CHECKLIST.md)
- POS: [POS_REFERENCE_MATRIX.md](POS_REFERENCE_MATRIX.md)
- Recursos/herramientas: [RESOURCE_REGISTRY.md](RESOURCE_REGISTRY.md), [GENTLEMAN_PROGRAMMING_EVALUATION.md](GENTLEMAN_PROGRAMMING_EVALUATION.md), [GENTLEMAN_IMPLEMENTATION.md](GENTLEMAN_IMPLEMENTATION.md)
- Continuidad: [AGENT_OPERATING_MODEL.md](AGENT_OPERATING_MODEL.md), [STATE_JOURNAL.md](STATE_JOURNAL.md), [HANDOFF_NEXT_CHAT.md](HANDOFF_NEXT_CHAT.md), [AGENTS.md](../AGENTS.md)


## 14. Backups y recuperación

Toda IA debe seguir [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md). Antes de una mutación real en Neon `main`, confirmar el destino, el impacto y una ruta de recuperación comprobable. El objetivo es backup diario automático independiente y revisión cada 15 días, sin coste; hasta que exista evidencia de ejecución y restauración, se considera pendiente y no debe anunciarse como activo. Nunca guardar dumps o datos comerciales en Git.