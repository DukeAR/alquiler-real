# Sistema Visual

## Principios

- Base de 8 px: usar `gap-2`, `gap-4`, `gap-6`, `gap-8`, `gap-12` y `p-4`, `p-6`, `p-8` como escala dominante.
- Tipografía con dos roles: `font-display` para titulares de marca o secciones clave; `font-ui` para el resto.
- Jerarquía calmada: fuerte contraste entre título, cuerpo y soporte, pero sin llenar la UI de `font-black` y mayúsculas.
- Superficies claras y bordes suaves: priorizar `bg-white`, `bg-slate-50`, `border-slate-200` y sombras cortas.
- Interacciones contenidas: hover sutil, active leve, focus visible, disabled sin dramatismo.

## Espaciado

- Contenedores principales: `space-y-8` o `space-y-12`.
- Secciones internas: `space-y-4` o `space-y-6`.
- Formularios y stacks de contenido: `space-y-2.5`, `space-y-3`, `space-y-4`.
- Grillas de cards: `gap-6` en desktop, `gap-4` a `gap-6` en mobile.

## Tipografía

- H1 de página o hero: `app-title-1`
- H2 de sección: `app-title-2`
- H3 de módulo o card grande: `app-title-3`
- H4 o subtítulo funcional: `app-title-4`
- Eyebrow y labels: `app-eyebrow` o `app-form-label`
- Texto base: `app-body`
- Texto de soporte: `app-body-sm app-text-muted`

## Radius

- Controles: `rounded-[var(--app-radius-control)]` equivalente visual a `rounded-2xl`.
- Cards estándar: `rounded-[var(--app-radius-card)]`.
- Contenedores hero o shells destacados: `rounded-[var(--app-radius-display)]`.
- Pills y badges: `rounded-full`.

## Sombras

- Superficie sutil: `var(--app-shadow-subtle)`.
- Card elevada o panel importante: `var(--app-shadow-soft)`.
- CTA o panel flotante: `var(--app-shadow-raised)`.
- Acción primaria de marca: `var(--app-shadow-brand)`.

## Colores

- Fondo general: gradiente de app definido en `--app-shell-bg`.
- Superficie base: `--app-surface`.
- Superficie suave: `--app-surface-muted`.
- Texto principal: `--app-text-strong`.
- Texto cuerpo: `--app-text-body`.
- Texto secundario: `--app-text-muted`.
- Texto tenue: `--app-text-subtle`.
- Borde base: `--app-surface-border`.
- Borde de hover o foco suave: `--app-surface-border-strong`.

## Cards

- Estructura recomendada:
  - encabezado corto con eyebrow o meta
  - título claro
  - cuerpo de texto o contenido
  - footer opcional con acciones separado por borde superior
- Usar `Card` como base y sumar `elevated` sólo cuando la card compite por atención.
- Evitar mezclar border radius distintos dentro de una misma card salvo media + overlay.

## Estados

- Hover: subir apenas el contraste o la sombra. Evitar cambios bruscos de color.
- Active: `scale-[0.99]` o `scale-[0.98]` según peso visual.
- Focus: ring visible con `--app-focus-ring`.
- Disabled: bajar contraste, desactivar sombra y pointer events cuando aplique.

## Formularios

- Labels: `app-form-label`.
- Inputs y selects: usar `Input` o clase `app-control` como base.
- Altura objetivo: 44 px a 48 px.
- Hint y mensajes auxiliares: `app-form-hint`.
- Error: `app-form-error`.
- No mezclar inputs con bordes invisibles y otros con borde marcado en la misma pantalla salvo que el patrón lo justifique.

## Clases Base

- Superficies: `app-surface`, `app-card`, `app-card-elevated`, `app-card-muted`
- Interacción: `app-button-base`, `app-control`
- Tipografía: `app-eyebrow`, `app-title-1`, `app-title-2`, `app-title-3`, `app-title-4`, `app-body`, `app-body-sm`, `app-text-muted`
- Formularios: `app-form-label`, `app-form-hint`, `app-form-error`

## Regla De Unificación

- Si un patrón aparece en 3 pantallas, llevarlo a `src/components/ui` o a una clase global semántica.
- Si sólo cambia contenido, no crear una variante visual nueva.
- Si una pantalla necesita más decoración para funcionar, primero revisar si el problema real es de jerarquía o spacing.