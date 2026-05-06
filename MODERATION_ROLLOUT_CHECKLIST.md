# Moderation Rollout Checklist

Checklist production-safe para desplegar las nuevas migraciones y la logica base de moderacion sin agregar UI administrativa nueva.

## Alcance del rollout

Este rollout cubre:

- migraciones automaticas ejecutadas por `initDB()` al iniciar el backend
- logica de reportes ponderados y cola de revision interna
- strikes y estados internos de moderacion
- pausa u ocultamiento interno de publicaciones
- impacto interno en visibilidad publica y ranking de catalogo

No cubre:

- panel admin nuevo
- UI interna de moderacion
- rollback automatico con down migrations, porque hoy no existe un runner de reversa separado

## Orden recomendado de rollout

- [ ] Sacar snapshot o backup consistente de PostgreSQL antes del deploy
- [ ] Preparar una base staging o una unica instancia canary del backend contra la base objetivo
- [ ] Cargar un `INTERNAL_OPS_SECRET` dedicado antes de habilitar pruebas internas
- [ ] Validar el backend primero; despues escalar a mas instancias
- [ ] No usar el modo demo/mock para validar moderacion end-to-end

## 1. Que migraciones se agregaron

Las nuevas migraciones viven dentro de [server/updates.ts](server/updates.ts) y se ejecutan automaticamente desde [server/index.ts](server/index.ts) cuando levanta el backend.

Bloques agregados o extendidos:

- `users`: nuevas columnas para strikes, estado de moderacion y ventanas de limitacion o bloqueo.
- `properties`: nuevas columnas para pausa, ocultamiento y motivo interno de moderacion.
- `reports`: ahora guarda `property_id`, `reporter_weight`, `severity`, estados de revision, notas, `strike_delta` y `reviewed_at`.
- `moderation_events`: nueva tabla para historial interno de acciones de moderacion.
- `reviews`: se agregaron `conversation_id` y `category_scores`; no es el nucleo del rollout de moderacion, pero entra en el mismo despliegue de schema.
- indices nuevos para consultas de moderacion y visibilidad.

Punto operativo importante:

- No hay comando `migrate` separado en [package.json](package.json).
- La migracion corre al iniciar `npm run server`, `npm run dev` o `npm run start`.
- Como la migracion esta embebida en el boot, el primer despliegue debe hacerse con una sola instancia del backend o con una release controlada antes de escalar horizontalmente.

## 2. Que tablas y campos nuevos existen

### `users`

Campos nuevos de esta capa de moderacion:

- `internal_strikes_count`
- `internal_moderation_status`
- `internal_account_limited_until`
- `internal_account_blocked_until`

Campos internos relacionados que tambien quedan activos en esta logica:

- `internal_trust_score`
- `internal_risk_flags`
- `internal_behavior_signals`
- `internal_risk_level`
- `internal_visibility_penalty`
- `internal_requires_additional_verification`
- `internal_action_limited`
- `internal_manual_review_required`
- `internal_risk_updated_at`

### `properties`

Campos nuevos:

- `internal_moderation_status`
- `internal_moderation_reason`
- `internal_paused_until`
- `internal_hidden_at`
- `internal_moderation_updated_at`

Indice nuevo:

- `properties_internal_moderation_idx`

### `reports`

Campos nuevos o ampliados:

- `property_id`
- `reporter_weight`
- `severity`
- `status` con constraint sobre `pending | reviewed | dismissed | action_taken`
- `review_notes`
- `reviewed_by`
- `strike_delta`
- `reviewed_at`
- `created_at`

Indices nuevos:

- `idx_reports_property_status`
- `idx_reports_reported_user_status`

### `moderation_events`

Tabla nueva:

- `id`
- `report_id`
- `user_id`
- `property_id`
- `event_type`
- `severity`
- `reason`
- `notes`
- `strike_delta`
- `created_by`
- `metadata`
- `created_at`

Indices nuevos:

- `moderation_events_user_created_at_idx`
- `moderation_events_property_created_at_idx`

### `reviews`

Campos agregados dentro del mismo deploy:

- `conversation_id`
- `category_scores`

## 3. Que datos mock o seed hay que revisar

Revisar esto antes de usar staging o demo para validar el rollout:

- [server/demoData.ts](server/demoData.ts) sigue sembrando reseñas demo, pero no siembra `reports` ni `moderation_events`.
- [src/demo/mockApi.ts](src/demo/mockApi.ts) devuelve `ok` en `POST /api/reports`, pero no persiste cola de moderacion, strikes ni pausa real.
- [src/demo/mockApi.ts](src/demo/mockApi.ts) no implementa rutas internas `/api/internal/moderation/...`.
- La seed demo descripta en [README.md](README.md) sirve para navegacion funcional, no para smoke test real de moderacion.

Fixtures minimos recomendados en staging real:

- 1 usuario huesped comun para reportar
- 1 usuario huesped confiable para comparar `reporter_weight`
- 1 usuario huesped nuevo para verificar menor peso de reporte
- 1 anfitrion con al menos 2 publicaciones visibles y comparables
- 1 propiedad candidata a prueba de pausa
- 1 propiedad limpia de control para comparar ranking

## 4. Que variables de entorno son necesarias

Variables backend obligatorias para este rollout:

- `DATABASE_URL`
- `DATABASE_SSL`
- `SESSION_SECRET`
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAME_SITE`
- `TRUST_PROXY`
- `PORT`

Variable nueva o especialmente importante para moderacion:

- `INTERNAL_OPS_SECRET`

Notas operativas:

- `INTERNAL_OPS_SECRET` hoy cae en fallback a `SESSION_SECRET` si no esta seteada en [server/config/env.ts](server/config/env.ts).
- En produccion no conviene usar ese fallback. Definila como secreto dedicado para las rutas internas de revision.
- [.env.example](.env.example) y [.env.production](.env.production) ya traen placeholders para `INTERNAL_OPS_SECRET`.
- No pongas valores reales dentro de archivos versionados; carga el secreto real solo en el proveedor o en archivos locales ignorados.

Variables frontend utiles para smoke test con UI real:

- `VITE_BACKEND_URL`
- `VITE_API_TIMEOUT`

## 4.1. Variables operativas para staging

Si vas a ejecutar el smoke test con Postman o curl, prepara estas variables antes de empezar:

### Variables de entorno sugeridas para Postman

- `backendUrl`
- `guestEmail`
- `guestPassword`
- `internalOpsSecret`
- `propertyId`
- `reportedUserId`
- `reason`
- `reviewedBy`
- `reportId`
- `authUserId`

### Variables sugeridas para curl

```powershell
$env:BACKEND_URL = 'https://tu-backend-staging.onrender.com'
$env:GUEST_EMAIL = 'guest.staging@example.com'
$env:GUEST_PASSWORD = 'super-secret'
$env:INTERNAL_OPS_SECRET = 'internal-ops-secret'
$env:PROPERTY_ID = 'prop_test_1'
$env:REPORTED_USER_ID = 'host_test_1'
$env:COOKIE_JAR = '.\\moderation-smoke.cookies.txt'
```

Nota:

- En PowerShell usa `curl.exe` en vez de `curl` para evitar el alias de `Invoke-WebRequest`.

## 4.2. Como ejecutar el smoke test manualmente

Archivos listos para usar:

- Coleccion Postman: [review-artifacts/moderation-staging.postman_collection.json](review-artifacts/moderation-staging.postman_collection.json)
- Environment template de Postman: [review-artifacts/moderation-staging.postman_environment.json](review-artifacts/moderation-staging.postman_environment.json)
- Script manual: [scripts/moderation-smoke-test.ps1](scripts/moderation-smoke-test.ps1)

Flujo recomendado hoy:

- El flujo activo y mas seguro es `pending_only`.
- [scripts/moderation-smoke-test.ps1](scripts/moderation-smoke-test.ps1) ya usa `pending_only` por defecto; no hace falta pasar `-ReviewAction` para ese caso.
- Si queres evitar basura de smoke, suma `-CleanupReport`. Ese switch primero descarta smoke reports pendientes anteriores con la misma descripcion base sobre la misma propiedad y despues deja el reporte nuevo en `dismissed`.
- Si queres inspeccionar el reporte manualmente en la cola interna, corre el script sin `-CleanupReport`.

Ejemplo local seguro con cleanup:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\moderation-smoke-test.ps1 `
  -BackendUrl "http://localhost:3001" `
  -GuestEmail "lucia@demo.com" `
  -GuestPassword "123456" `
  -InternalOpsSecret "<SESSION_SECRET_O_INTERNAL_OPS_SECRET_LOCAL>" `
  -PropertyId "demo_prop_depto_visible_2" `
  -CleanupReport
```

Ejemplo local para dejar el reporte pendiente:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\moderation-smoke-test.ps1 `
  -BackendUrl "http://localhost:3001" `
  -GuestEmail "lucia@demo.com" `
  -GuestPassword "123456" `
  -InternalOpsSecret "<SESSION_SECRET_O_INTERNAL_OPS_SECRET_LOCAL>" `
  -PropertyId "demo_prop_depto_visible_2"
```

Ejemplo futuro para staging, sin ejecutar todavia:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\moderation-smoke-test.ps1 `
  -BackendUrl "https://tu-backend-staging.onrender.com" `
  -GuestEmail "guest.staging@example.com" `
  -GuestPassword "<GUEST_PASSWORD_REAL>" `
  -InternalOpsSecret "<INTERNAL_OPS_SECRET_REAL>" `
  -PropertyId "<PROPERTY_ID_VISIBLE>" `
  -CleanupReport
```

Uso manual con Postman:

1. Importa la coleccion [review-artifacts/moderation-staging.postman_collection.json](review-artifacts/moderation-staging.postman_collection.json).
2. Importa el template [review-artifacts/moderation-staging.postman_environment.json](review-artifacts/moderation-staging.postman_environment.json).
3. Crea una copia local con valores reales, por ejemplo `review-artifacts/moderation-staging.local.postman_environment.json`, y mantenela fuera de git.
4. Ejecuta `Login Guest`, `List Public Properties`, `Get Public Property Detail`, `Create Property Report` y `Review Queue Pending`.
5. Mientras el flujo activo siga siendo `pending_only`, no corras `Confirm Low`, `Confirm Medium` ni `Confirm High`.

## 4.3. Seguridad de secretos y archivos locales

No deben commitearse:

- `.env`, `.env.local` y cualquier `.env.*.local` con valores reales.
- `DATABASE_URL`, `SESSION_SECRET`, `INTERNAL_OPS_SECRET` y contraseñas reales de smoke o staging.
- Copias locales de Postman environment con valores cargados, por ejemplo `review-artifacts/moderation-staging.local.postman_environment.json`.
- Cookie jars o artefactos temporales de smoke, por ejemplo `moderation-smoke.cookies.txt`.
- Logs, capturas o exports que muestren headers `x-internal-ops-secret`, contraseñas o URLs con credenciales embebidas.

Buenas practicas:

- Deja placeholders en archivos versionados y carga secretos reales solo en el proveedor, en Postman local o en archivos ignorados por git.
- Si compartis un comando en chat, issue o PR, reemplaza los secretos por placeholders antes de pegarlo.
- No reaproveches `SESSION_SECRET` como valor operativo de `INTERNAL_OPS_SECRET` en staging o produccion.

## 5. Como correr migraciones localmente

No hay un comando de migracion separado. La migracion corre al iniciar el backend.

Pasos:

1. Levanta PostgreSQL local y configura `DATABASE_URL` en [.env](.env).
2. Verifica que `DATABASE_SSL=false` en local si tu Postgres no usa SSL.
3. Instala dependencias con `npm install`.
4. Corre solo backend con `npm run server` si queres disparar solo schema y API.
5. O corre stack completa con `npm run dev` si vas a usar la UI para el smoke test.
6. Espera el log `Base de datos inicializada` del backend.
7. Confirma columnas nuevas en la base antes de seguir.

Consultas SQL minimas de verificacion:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'internal_strikes_count',
    'internal_moderation_status',
    'internal_account_limited_until',
    'internal_account_blocked_until'
  )
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'properties'
  AND column_name IN (
    'internal_moderation_status',
    'internal_moderation_reason',
    'internal_paused_until',
    'internal_hidden_at'
  )
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'reports'
  AND column_name IN (
    'property_id',
    'reporter_weight',
    'severity',
    'review_notes',
    'reviewed_by',
    'strike_delta',
    'reviewed_at'
  )
ORDER BY column_name;
```

Preflight tecnico recomendado antes de cualquier smoke test:

- `npm run type-check`
- `npx vitest run --pool=forks server/__tests__ src/lib/__tests__/propertyVerification.test.ts`

## 6. Como probar reportes

Objetivo del smoke test:

- confirmar que el reporte entra en `pending`
- confirmar que se guarda `property_id`, `reported_user_id`, `severity` y `reporter_weight`
- confirmar que un solo reporte no penaliza automaticamente
- confirmar que la cola interna muestra usuario, propiedad, motivo, historial y strikes

Pasos end-to-end:

1. Inicia sesion con un huesped en la UI real o usa una cookie de sesion valida contra el backend real.
2. Abre una propiedad visible y envia un reporte desde el detalle o via `POST /api/reports`.
3. Usa un motivo canonico, por ejemplo `not_as_listed`.
4. Verifica que la respuesta sea `201` y que devuelva `status: pending`.
5. Verifica en la DB que exista la fila nueva en `reports`.
6. Antes de revisar manualmente, refresca la propiedad y el listado: la publicacion debe seguir visible.
7. Consulta `GET /api/internal/moderation/review-queue` con `x-internal-ops-secret`.
8. Confirma que el item aparezca con `user`, `property`, `reasonLabel`, `history` y `strikes`.

Payload de referencia:

```json
{
  "property_id": "prop_test_1",
  "reported_user_id": "host_test_1",
  "reason": "not_as_listed",
  "description": "Las fotos no coinciden con el estado actual del lugar."
}
```

Checks de DB recomendados:

```sql
SELECT id, property_id, reported_user_id, reported_by_user_id, reason, severity, reporter_weight, status, strike_delta
FROM reports
ORDER BY created_at DESC
LIMIT 5;
```

Prueba de ponderacion recomendada:

- Repite el mismo flujo con un usuario confiable y con un usuario nuevo.
- Esperado: `reporter_weight` del usuario confiable debe ser mayor que el del usuario nuevo.
- Esperado: ese peso afecta la prioridad de revision interna, no aplica strike automatico por si solo.

### Requests listos para curl o Postman

Login y cookie de sesion:

```powershell
curl.exe -i -c $env:COOKIE_JAR -H "Content-Type: application/json" `
  -d "{\"email\":\"$env:GUEST_EMAIL\",\"password\":\"$env:GUEST_PASSWORD\"}" `
  "$env:BACKEND_URL/api/auth/login"
```

Crear reporte pendiente:

```powershell
curl.exe -s -b $env:COOKIE_JAR -H "Content-Type: application/json" `
  -d "{\"property_id\":\"$env:PROPERTY_ID\",\"reported_user_id\":\"$env:REPORTED_USER_ID\",\"reason\":\"not_as_listed\",\"description\":\"Smoke test: las fotos no coinciden con el estado actual del lugar.\"}" `
  "$env:BACKEND_URL/api/reports"
```

Ver cola interna pendiente:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" `
  "$env:BACKEND_URL/api/internal/moderation/review-queue?status=pending"
```

Chequeo rapido de que la propiedad siga visible antes de revisión manual:

```powershell
curl.exe -i "$env:BACKEND_URL/api/properties/$env:PROPERTY_ID"
```

En Postman usa los mismos cuatro requests con estas configuraciones:

- `POST {{backendUrl}}/api/auth/login`
- `POST {{backendUrl}}/api/reports`
- `GET {{backendUrl}}/api/internal/moderation/review-queue?status=pending`
- `GET {{backendUrl}}/api/properties/{{propertyId}}`

Para los requests autenticados del huésped, habilita cookie jar o reusa el `connect.sid` de la respuesta de login.

## 7. Como probar strikes

Objetivo del smoke test:

- verificar que los strikes solo cambian despues de revision interna
- verificar la progresion `1 -> warned`, `2 -> limited`, `3 -> suspended`

Pasos recomendados:

1. Crea el primer reporte contra un anfitrion de prueba.
2. Revisa el reporte via `POST /api/internal/reports/:id/review` con `action: confirm_low`.
3. Verifica que el usuario quede con `internal_strikes_count = 1` e `internal_moderation_status = 'warned'`.
4. Crea un segundo reporte distinto contra el mismo usuario.
5. Revisa el segundo reporte con `action: confirm_low` o `confirm_medium`.
6. Verifica `internal_strikes_count = 2` e `internal_moderation_status = 'limited'`.
7. Crea un tercer reporte confirmado contra el mismo usuario.
8. Revisa el tercero con `confirm_high` o un tercer `confirm_low`.
9. Verifica `internal_strikes_count = 3` e `internal_moderation_status = 'suspended'`.

Payload de revision interna de referencia:

```json
{
  "action": "confirm_low",
  "notes": "Smoke test de moderacion",
  "reviewedBy": "ops_smoke_test"
}
```

Checks de DB recomendados:

```sql
SELECT id, internal_strikes_count, internal_moderation_status, internal_account_limited_until, internal_account_blocked_until
FROM users
WHERE id = 'host_test_1';

SELECT id, status, strike_delta, reviewed_by, reviewed_at
FROM reports
WHERE reported_user_id = 'host_test_1'
ORDER BY created_at DESC;
```

Esperado:

- `POST /api/reports` por si solo no cambia strikes.
- El cambio aparece recien despues de la revision interna.
- Cada confirmacion deja rastro en `moderation_events`.

### Requests listos para curl o Postman

Confirmar strike bajo:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" -H "Content-Type: application/json" `
  -d "{\"action\":\"confirm_low\",\"notes\":\"Smoke test confirm_low\",\"reviewedBy\":\"ops_smoke_test\"}" `
  "$env:BACKEND_URL/api/internal/reports/<REPORT_ID>/review"
```

Confirmar segundo strike:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" -H "Content-Type: application/json" `
  -d "{\"action\":\"confirm_low\",\"notes\":\"Segundo strike de smoke test\",\"reviewedBy\":\"ops_smoke_test\"}" `
  "$env:BACKEND_URL/api/internal/reports/<REPORT_ID_2>/review"
```

Confirmar tercer strike:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" -H "Content-Type: application/json" `
  -d "{\"action\":\"confirm_high\",\"notes\":\"Tercer strike de smoke test\",\"reviewedBy\":\"ops_smoke_test\"}" `
  "$env:BACKEND_URL/api/internal/reports/<REPORT_ID_3>/review"
```

Tip operativo:

- `report.id` sale en la respuesta de `POST /api/reports`.
- Si no lo guardaste, recuperalo desde la cola interna pendiente o desde la tabla `reports`.

## 8. Como probar pausa de publicacion

Objetivo del smoke test:

- verificar que `confirm_medium` pause la publicacion
- verificar que la publicacion pausada deje de aparecer publicamente sin mostrar sanciones

Pasos recomendados:

1. Toma una propiedad visible y verificable desde `GET /api/properties`.
2. Crea un reporte asociado a esa propiedad.
3. Revisa ese reporte con `action: confirm_medium`.
4. Verifica en DB que la propiedad quede con `internal_moderation_status = 'paused'` y `internal_paused_until` en el futuro.
5. Reconsulta:

- `GET /api/properties`
- `GET /api/properties/:id`
- `GET /api/favorites`
- `POST /api/favorites/:propertyId`
- `POST /api/bookings`
- `POST /api/conversations`

6. Esperado: la propiedad ya no debe ser elegible en esas superficies publicas o transaccionales.
7. Esperado: la UI no debe mostrar score interno ni sancion publica.

Checks de DB recomendados:

```sql
SELECT id, internal_moderation_status, internal_moderation_reason, internal_paused_until, internal_hidden_at
FROM properties
WHERE id = 'prop_test_1';
```

Nota:

- Si queres validar el caso alto, usa `confirm_high`.
- Esperado en ese caso: `internal_moderation_status = 'hidden'` en la propiedad y bloqueo temporal en la cuenta.

### Requests listos para curl o Postman

Pausar publicacion con accion media:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" -H "Content-Type: application/json" `
  -d "{\"action\":\"confirm_medium\",\"notes\":\"Pausa temporal por smoke test\",\"reviewedBy\":\"ops_smoke_test\"}" `
  "$env:BACKEND_URL/api/internal/reports/<REPORT_ID>/review"
```

Revalidar detalle publico despues de la pausa:

```powershell
curl.exe -i "$env:BACKEND_URL/api/properties/$env:PROPERTY_ID"
```

Revalidar listado publico despues de la pausa:

```powershell
curl.exe -s "$env:BACKEND_URL/api/properties"
```

## 9. Como probar impacto en ranking

Objetivo del smoke test:

- verificar que un reporte pendiente aislado no demota la propiedad automaticamente
- verificar que un reporte confirmado si impacta el orden del catalogo
- verificar que el impacto sea interno y no una sancion publica visible

Reglas esperadas en este rollout:

- reporte confirmado: `-40`
- buen historial: `+15`
- cuenta estable: `+10`
- un reporte pendiente aislado: sin penalizacion automatica de ranking

Pasos recomendados:

1. Prepara dos propiedades visibles y comparables en la misma busqueda:

- Propiedad A: limpia, sin reportes confirmados
- Propiedad B: inicialmente igual o similar a A

2. Abre Explore con el orden por verificacion por defecto.
3. Toma captura del orden inicial.
4. Crea un solo reporte `pending` sobre la Propiedad B y no lo revises todavia.
5. Refresca Explore.
6. Esperado: la Propiedad B sigue visible y no deberia caer solo por ese reporte pendiente aislado.
7. Ahora revisa ese reporte con `confirm_low`.
8. Refresca Explore otra vez.
9. Esperado: la Propiedad B sigue visible, pero debe quedar por debajo de la Propiedad A cuando ambas compiten en el mismo bloque de catalogo.

Checks recomendados:

- Verifica en el payload de `GET /api/properties` que la propiedad reportada tenga `confirmedReportsCount > 0`.
- Valida visualmente en Explore el orden final.
- Si queres una regresion automatizada adicional, corre `npx vitest run --pool=forks src/lib/__tests__/propertyVerification.test.ts`.

### Requests listos para curl o Postman

Tomar snapshot previo del listado:

```powershell
curl.exe -s "$env:BACKEND_URL/api/properties"
```

Confirmar bajo para que impacte ranking sin pausar la propiedad:

```powershell
curl.exe -s -H "x-internal-ops-secret: $env:INTERNAL_OPS_SECRET" -H "Content-Type: application/json" `
  -d "{\"action\":\"confirm_low\",\"notes\":\"Confirmacion para validar ranking\",\"reviewedBy\":\"ops_smoke_test\"}" `
  "$env:BACKEND_URL/api/internal/reports/<REPORT_ID>/review"
```

Tomar snapshot posterior del listado:

```powershell
curl.exe -s "$env:BACKEND_URL/api/properties"
```

En Postman, compara las respuestas antes y despues del `confirm_low` sobre el mismo conjunto de propiedades.

## 10. Como hacer rollback si algo falla

### Regla principal

No hay down migrations automaticas. El rollback seguro depende del snapshot tomado antes del deploy.

### Opcion A: rollback de aplicacion

Usala si:

- el boot nuevo falla
- la app responde mal
- pero no queres revertir de inmediato el schema ni perdiste consistencia de datos

Pasos:

1. Frenar el rollout y dejar una sola instancia o sacar trafico del backend nuevo.
2. Volver al release anterior del backend.
3. Confirmar que el release anterior tolera columnas extra. En este cambio el schema es aditivo, asi que este suele ser el rollback menos riesgoso.
4. Revisar si quedaron publicaciones pausadas, ocultas o usuarios limitados por pruebas de smoke y limpiarlos manualmente si corresponde.

### Opcion B: rollback de datos de smoke test

Usala si:

- el schema puede quedarse
- pero queres limpiar solo los efectos de las pruebas

Pasos:

1. Identifica `report_id`, `user_id` y `property_id` usados en la prueba.
2. Ejecuta cleanup dirigido solo sobre esas entidades.
3. Reevalua riesgo del usuario si corresponde levantando el backend nuevamente.

SQL de cleanup dirigido para staging o smoke test controlado:

```sql
BEGIN;

DELETE FROM moderation_events
WHERE report_id IN ('rep_smoke_1', 'rep_smoke_2');

UPDATE reports
SET status = 'pending',
    review_notes = NULL,
    reviewed_by = NULL,
    strike_delta = 0,
    reviewed_at = NULL
WHERE id IN ('rep_smoke_1', 'rep_smoke_2');

UPDATE properties
SET internal_moderation_status = 'clear',
    internal_moderation_reason = NULL,
    internal_paused_until = NULL,
    internal_hidden_at = NULL,
    internal_moderation_updated_at = NOW()
WHERE id IN ('prop_test_1');

UPDATE users
SET internal_strikes_count = 0,
    internal_moderation_status = 'clear',
    internal_account_limited_until = NULL,
    internal_account_blocked_until = NULL,
    internal_action_limited = FALSE,
    internal_manual_review_required = FALSE,
    internal_requires_additional_verification = FALSE,
    internal_visibility_penalty = 0,
    internal_risk_level = 'none',
    internal_risk_flags = '[]'::jsonb,
    internal_behavior_signals = '[]'::jsonb,
    internal_risk_updated_at = NOW()
WHERE id IN ('host_test_1');

COMMIT;
```

### Opcion C: rollback completo de DB

Usala si:

- la migracion se aplico sobre datos productivos y queres volver al estado exacto previo
- hubo efectos masivos o dudas sobre consistencia

Pasos:

1. Sacar trafico del release nuevo.
2. Restaurar el snapshot previo al deploy.
3. Volver al release anterior del backend.
4. Correr smoke minimo de login, propiedades y reservas antes de reabrir trafico.

## Smoke test final recomendado

Antes de dar por cerrado el rollout:

- [ ] Backend inicia y deja `Base de datos inicializada`
- [ ] Columnas y tablas nuevas existen en PostgreSQL
- [ ] `POST /api/reports` crea reportes `pending` con `reporter_weight`
- [ ] Un reporte aislado no oculta ni pausa automaticamente
- [ ] La cola interna devuelve usuario, propiedad, motivo, historial y strikes
- [ ] `confirm_low` incrementa strike y deja visible la propiedad
- [ ] `confirm_medium` pausa la propiedad y la saca de superficies publicas
- [ ] `confirm_high` oculta propiedad y bloquea temporalmente la cuenta
- [ ] El ranking baja solo despues de reporte confirmado
- [ ] No se expone score interno ni sancion publica en la UI
