# Checklist De Revisión Visual

## Estructura General

- La pantalla usa `app-page` o un contenedor principal con un ancho y padding consistentes.
- El contenido principal respira con `space-y-8` o `space-y-12`, no con valores arbitrarios mezclados.
- Hay una diferencia clara entre fondo general, superficies y elementos interactivos.

## Jerarquía Visual

- El título principal usa `app-title-1`, `app-title-2` o `app-title-3` según el contexto.
- Los labels de soporte usan `app-eyebrow` o `app-form-label`, no mayúsculas improvisadas con tamaños distintos.
- El texto descriptivo usa `app-body` o `app-body-sm`, no combinaciones aisladas distintas en cada pantalla.
- No hay más de un foco visual dominante por viewport.

## Cards Y Superficies

- Las cards usan `app-card` como base o el componente `Card`.
- Las cards destacadas sólo usan elevación extra si compiten por atención real.
- Las cards internas y bloques de datos usan el mismo radio base y un borde similar.
- No conviven tres o más radios distintos en la misma pantalla sin una razón clara.

## Controles Y Estados

- Botones primarios, secundarios e icon buttons usan `Button` o clases consistentes equivalentes.
- Los estados `hover`, `active`, `focus` y `disabled` siguen el mismo patrón que el sistema base.
- El focus es visible en teclado y no depende sólo de cambios de color.
- Los botones críticos no usan más peso visual que el CTA principal de la pantalla.

## Formularios

- Inputs, selects y textareas usan `Input` o `app-control`.
- Todos los labels usan `app-form-label`.
- Los hints usan `app-form-hint`.
- Los errores usan `app-form-error`.
- En una misma pantalla, todos los controles comparten altura y radio compatibles.

## Contenido Y Densidad

- Las listas de acciones usan filas homogéneas, con icono, label y affordance consistentes.
- Las métricas o stats usan la misma relación entre label, valor y contexto.
- Las superficies oscuras se reservan para bloques destacados, no para decorar sin función.
- Si un patrón visual aparece 3 veces, debe pasar a `src/components/ui` o a una clase semántica global.

## Antes De Dar Por Cerrado

- La pantalla se entiende sin leer todo el texto.
- El CTA principal se reconoce en menos de 2 segundos.
- Los elementos secundarios no compiten con el título ni con el CTA.
- No hay mezclas de `font-black`, `tracking-widest`, radios grandes y sombras fuertes en todas partes.
- Si algo se ve más “decorado” que útil, probablemente hay que simplificarlo.