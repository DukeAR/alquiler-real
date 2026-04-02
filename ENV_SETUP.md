# Configuración de Variables de Entorno

## Resumen

El proyecto usa dos capas simples de configuración:

- Backend Express: `.env`
- Frontend Vite: `.env.local` en desarrollo y `.env.production` o variables del host en producción

La regla práctica es esta:

- Todo lo de sesión, base de datos, CORS y cookies vive en backend
- Todo lo que empieza con `VITE_` vive en frontend

## Desarrollo local

### Backend `.env`

Usá [`.env.example`](.env.example) como base.

Variables mínimas:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://postgres:password@localhost:5432/alquiler_real
DATABASE_SSL=false
SESSION_SECRET=dev-secret-change-in-production
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAME_SITE=lax
TRUST_PROXY=false
GEMINI_API_KEY=
```

### Frontend `.env.local`

Usá [`.env.local.example`](.env.local.example) como base.

```env
VITE_BACKEND_URL=
VITE_DEV_API_PROXY_TARGET=http://localhost:3001
VITE_API_TIMEOUT=30000
```

Recomendación simple para local:

- Dejá `VITE_BACKEND_URL` vacío
- Usá el proxy de Vite con `VITE_DEV_API_PROXY_TARGET=http://localhost:3001`

Así el frontend sigue llamando `/api/...` y no queda atado a `localhost` en el navegador.

## Producción

En producción no hace falta commitear archivos nuevos. Lo más simple es cargar las variables desde el panel del proveedor.

### Backend deployado

Variables mínimas:

```env
NODE_ENV=production
DATABASE_URL=postgres://...
DATABASE_SSL=true
SESSION_SECRET=un-secreto-largo-y-seguro
FRONTEND_URL=https://tu-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://tu-frontend.vercel.app
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=none
TRUST_PROXY=true
GEMINI_API_KEY=
```

### Frontend deployado

Podés usar [`.env.production`](.env.production) como template o cargarlo en el host:

```env
VITE_BACKEND_URL=https://tu-backend.onrender.com
VITE_API_TIMEOUT=30000
```

Si más adelante resolvés frontend y backend bajo el mismo dominio con proxy reverso, `VITE_BACKEND_URL` puede quedar vacío.

## Cómo queda la app

- En desarrollo: Vite usa proxy y el navegador consume `/api/...`
- En producción: `apiConfig` usa `VITE_BACKEND_URL` si existe
- Las sesiones siguen funcionando con `credentials: include`
- Las cookies cross-site quedan cubiertas con `SESSION_COOKIE_SECURE=true` y `SESSION_COOKIE_SAME_SITE=none`

## Checklist rápido

- Backend con `DATABASE_URL` válido
- Backend con `SESSION_SECRET` real
- Backend con `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS` apuntando al frontend real
- Frontend con `VITE_BACKEND_URL` apuntando al backend real
- Deploy final validado con `npm run lint`, `npm test -- --run` y `npm run build`
