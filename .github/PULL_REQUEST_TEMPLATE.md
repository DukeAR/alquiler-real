## Qué cambia

-

## Contexto

- Problema o necesidad:
- Alcance del cambio:
- Riesgos o puntos para mirar con más atención:

## Evidencia

- Capturas o video:
- Estados cubiertos: loading, error, vacío, éxito, mobile, desktop

## Validación

- [ ] `npm run lint`
- [ ] `npm test -- --run`
- [ ] `npm run build`

## Checklist Base

- [ ] El PR tiene alcance claro y no mezcla cambios no relacionados.
- [ ] Si cambié UI, revisé `VISUAL_REVIEW_CHECKLIST.md`.
- [ ] Si cambié texto visible, revisé `COPY_GUIDELINES.md` y `COPY_REVIEW_CHECKLIST.md`.
- [ ] Si cambié textos cubiertos por tests, actualicé los asserts.

## Checklist De Copy

Completar solo si este PR cambia texto visible.

- [ ] El texto suena natural en español rioplatense.
- [ ] Está en voseo y mantiene el tono de la app.
- [ ] Usa el glosario correcto: Guardados, Reservas, Verificación, Anfitrión, Huésped.
- [ ] Evita jerga técnica innecesaria o promesas que la plataforma no puede sostener.
- [ ] Los vacíos, errores, modales, banners y toasts mantienen el mismo criterio de claridad.

## Checklist Visual

Completar solo si este PR cambia UI.

- [ ] La pantalla mantiene jerarquía visual clara.
- [ ] Los componentes siguen el sistema base de spacing, radios y estados.
- [ ] El CTA principal se identifica rápido.
- [ ] No agregué ruido visual innecesario.