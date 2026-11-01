# Estándar de diseño UI/UX y desarrollo frontend

**Estado:** aprobado por el propietario el 2026-11-01.  
**Aplicación:** todo nuevo trabajo frontend y toda modificación sustancial de UI existente.  
**Stack de referencia:** React + Vite + TypeScript + CSS del proyecto.

Este documento convierte las reglas UI/UX acordadas en criterios verificables. Complementa `AGENTS.md`, `docs/CONSTITUTION.md`, `docs/COMPLIANCE_AND_ACCESSIBILITY.md` y `.agents/skills/micro-app-stack-guidance/SKILL.md`; no los reemplaza.

## 1. Principios

- Priorizar claridad, velocidad operativa, accesibilidad, consistencia y confiabilidad.
- Evitar interfaces genéricas, decorativas o diseñadas solo para una captura.
- Diseñar para tareas reales de POS e inventario.
- Cada pantalla y control debe tener propósito.
- La UI nunca sustituye validación, autorización ni reglas de negocio del servidor.
- No mostrar datos ficticios como si fueran reales.
- No introducir frameworks, librerías o servicios de pago sin necesidad demostrada y revisión de coste/compatibilidad. Mantener el presupuesto objetivo de USD 0.

## 2. Carga y feedback

- Usar skeleton loaders cuando la estructura del contenido sea conocida y la espera justifique representar su forma.
- El skeleton debe corresponder al contenido y evitar saltos de layout.
- Para operaciones breves, preferir feedback inmediato, texto de estado o un indicador discreto cuando sea más claro.
- Diferenciar carga inicial, actualización y operación enviada.
- No bloquear secciones que no necesitan esperar.
- Prevenir dobles envíos en operaciones sensibles.
- Usar `aria-busy`, `role="status"` o `aria-live` cuando corresponda, sin anuncios repetitivos.
- Respetar `prefers-reduced-motion`.

## 3. Diseño responsive

Diseñar y probar, como mínimo, estos anchos de referencia:

| Dispositivo | Ancho | Enfoque |
|---|---:|---|
| Móvil | 375 px | Acciones frecuentes, navegación compacta y controles táctiles |
| Tablet | 768 px | Operación POS e inventario |
| Desktop | 1280 px o superior | Administración, tablas y filtros |

Son puntos de prueba, no breakpoints rígidos. Elegir breakpoints según el contenido y revisar también anchos intermedios.

- Reorganizar la interfaz; no limitarse a encoger desktop.
- Evitar contenido cortado, controles pequeños y scroll horizontal de página.
- Móvil: priorizar tareas y datos esenciales.
- Tablet: optimizar interacción táctil y flujos POS.
- Desktop: aprovechar el espacio sin crear densidad innecesaria.
- Si una tabla no se adapta con legibilidad, usar lista/tarjetas conservando datos y acciones esenciales.

## 4. Jerarquía visual

- Mantener jerarquía clara de título, contexto, contenido y acciones.
- Destacar la acción principal sin competir con acciones secundarias.
- Reducir redundancia, no instrucciones que eviten errores.
- Usar etiquetas concretas y lenguaje consistente.
- Hacer visible la sucursal activa cuando afecte los datos u operaciones.
- No ocultar información crítica tras interacciones innecesarias.

## 5. Design tokens

Mantener un sistema centralizado de variables para:

- Colores semánticos: primary, secondary, accent, success, warning, danger, surface, background, texto y bordes.
- Tipografía: familia, tamaños, pesos y alturas de línea.
- Espaciado basado en múltiplos de 4 px (por ejemplo 4, 8, 16, 24 y 32).
- Radios, bordes, sombras, elevación y capas.
- Tamaños de controles y breakpoints.

Preferir variables CSS compatibles con el stack actual. Antes de introducir o cambiar tokens, inspeccionar los estilos y variables existentes, reutilizar lo que tenga sentido y consolidar gradualmente. No asumir que ya existe un sistema completo ni hacer un rediseño masivo como efecto colateral.

No introducir Tailwind ni otra herramienta solo para cumplir este estándar. No permitir que la paleta por defecto de una librería defina la identidad visual.

## 6. Consistencia y temas

Mantener patrones coherentes en botones, enlaces, formularios, inputs, selectores, modales, tablas, listas, tarjetas, alertas, badges, navegación y estados de carga.

Reutilizar componentes cuando exista un patrón real compartido; evitar abstracciones prematuras.

Dark Mode no es requisito actual. Solo incorporarlo si existe necesidad del producto y puede mantenerse con tokens específicos, contraste probado y estados completos. No invertir colores automáticamente.

## 7. Accesibilidad — WCAG 2.2 AA

Objetivo general: WCAG 2.2 nivel AA. Buscar AAA donde sea viable.

Contraste:
- Texto normal: mínimo 4.5:1 para AA.
- Texto grande: mínimo 3:1 para AA.
- Texto normal AAA: 7:1; texto grande AAA: 4.5:1.
- Componentes y gráficos necesarios para comprender/utilizar la UI: cumplir el contraste no textual aplicable, normalmente 3:1.

Aplicar:
- HTML semántico antes de ARIA.
- Labels asociados a campos.
- Alt útil para imágenes informativas y alt vacío para decoración.
- Nombre accesible en controles icon-only.
- Navegación por teclado y orden de foco lógico.
- `:focus-visible` perceptible.
- Errores asociados al campo.
- Diálogos con nombre accesible y gestión correcta del foco.
- No depender solo del color para comunicar estados.
- Respetar movimiento reducido y zoom/reflow.

Como referencia de comodidad, procurar objetivos táctiles de 44 × 44 CSS px cuando sea posible. No confundirlo con el criterio mínimo normativo de WCAG 2.2 AA, que contempla excepciones y condiciones específicas. No usar ARIA innecesaria ni roles que contradigan HTML nativo.

## 8. Estados de interfaz e interacción

Diseñar los estados aplicables:
- Loading: carga inicial y actualización.
- Empty: sin registros o resultados, con siguiente paso cuando exista.
- Error: fallos de red/servidor y validación.
- Success: operación confirmada por la fuente autoritativa.
- Disabled y permission denied.
- Partial/stale data u offline/retry cuando el flujo lo requiera.

Mensajes claros y accionables; nunca mostrar SQL, stack traces, tokens ni datos privados.

Definir estados visuales de hover, focus, focus-visible, active, disabled, loading y selected. Hover nunca será el único modo de descubrir una acción. No depender solo del color. El frontend refleja el estado, pero la idempotencia e integridad también deben existir en servidor.

## 9. POS e inventario

- Búsqueda rápida por nombre, SKU o código de barras cuando el flujo lo soporte.
- Identificación inequívoca de organización y sucursal activa.
- Mostrar stock y movimientos por sucursal solo cuando estén implementados.
- Diferenciar cantidad física, disponibilidad comercial y estado del producto.
- Mostrar precio, moneda, tasa y totales antes de confirmar una venta.
- Mostrar estados de transferencias según el contrato implementado.
- Confirmar ajustes y operaciones de impacto financiero o de inventario.
- Explicar motivo, alcance y consecuencias de acciones delicadas.
- No diseñar funcionalidades pendientes como si ya estuvieran disponibles.
- Las acciones visibles deben corresponder al contexto y permisos conocidos; ocultar un botón no sustituye autorización server-side.

## 10. Tablas y formularios

Tablas: evaluar búsqueda, filtros, ordenamiento, paginación/carga progresiva, estados vacíos/errores, formato de cantidades/fechas/moneda y alternativa móvil legible. No cargar datos ilimitados ni prometer operaciones que el servidor no soporte.

Formularios: labels y errores asociados; validación frontend para UX y validación server-side obligatoria; conservar entradas ante errores recuperables cuando sea seguro; distinguir guardar/cancelar/eliminar; explicar consecuencias; evitar dobles envíos y no borrar hechos que deban mantener trazabilidad.

## 11. Rendimiento y seguridad

- Mantener componentes cohesivos y estado explícito.
- Evitar solicitudes, renders y dependencias innecesarias.
- Respetar React + Vite y la arquitectura SPA.
- No introducir SSR, router, framework UI, librería de formularios o sistema CSS sin requisito y evaluación.
- No exponer secretos en variables `VITE_*` ni en el bundle.
- Mantener autorización y reglas de negocio en servidor.

## 12. Proceso de trabajo y adopción gradual

Antes de implementar:
1. Leer este estándar y `micro-app-stack-guidance`.
2. Inspeccionar UI, CSS, componentes y patrones existentes.
3. Confirmar qué funcionalidad existe en API y qué permisos aplican.
4. Identificar estados y errores del flujo.
5. Definir comportamiento móvil, tablet y desktop.
6. Reutilizar patrones o justificar los nuevos.

Después:
1. Revisar 375, 768, 1280 px y un ancho intermedio.
2. Verificar loading, empty, error, success y permisos aplicables.
3. Probar teclado, foco y nombres accesibles.
4. Comprobar contraste con herramienta cuando la vista exista.
5. Ejecutar pruebas de comportamiento, build y typecheck aplicables.
6. Revisar el diff por regresiones y dependencias.
7. Registrar limitaciones; no afirmar conformidad WCAG completa por inspección superficial.

Las herramientas automatizadas (axe-core, pa11y u otras) pueden evaluarse cuando existan pantallas operativas suficientes. No añadirlas sin comprobar coste, compatibilidad y estabilidad.

Este estándar aplica desde su aprobación a todo frontend nuevo. No exige rehacer el login ni todas las pantallas existentes inmediatamente. Al modificar una pantalla, corregir los problemas relevantes dentro del alcance razonable. Cualquier excepción debe documentarse.

## Principio final

La calidad se mide por lo fácil, rápido, accesible, consistente y seguro que resulta trabajar con Micro app en el negocio real, no por una captura de pantalla. Cada pantalla resuelve una tarea real y cada interacción es predecible.
