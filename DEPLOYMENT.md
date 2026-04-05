# Deploy Simple

## Objetivo

Subir la app con la menor infraestructura posible, manteniendo:

- frontend React + Vite
- backend Express
- PostgreSQL online
- sesiones con `express-session`

## Estrategia recomendada

La opción más simple para esta etapa es:

1. Frontend en Vercel o Netlify
2. Backend en Render o Railway
3. Base de datos en Neon

No hace falta Kubernetes, Docker complejo ni reverse proxies custom para salir a producción.

## Cómo queda la arquitectura

- El frontend compila a `dist/`
- El backend corre como servicio Node separado
- El frontend habla con el backend usando `VITE_BACKEND_URL`
- El backend guarda sesión en PostgreSQL
- El backend permite credenciales solo para los orígenes configurados

## Variables de entorno

### Frontend

Variables mínimas:

```env
VITE_BACKEND_URL=https://tu-backend.onrender.com
VITE_API_TIMEOUT=30000
```

### Backend

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
SESSION_COOKIE_DOMAIN=
TRUST_PROXY=true
PORT=3001
GEMINI_API_KEY=
```

Notas prácticas:

- `SESSION_COOKIE_SAME_SITE=none` es importante si frontend y backend viven en dominios distintos
- `SESSION_COOKIE_SECURE=true` es obligatorio junto con `sameSite=none`
- `SESSION_COOKIE_DOMAIN` normalmente debe quedar vacio si frontend y backend viven en hosts distintos; solo definilo si compartis un dominio padre real
- `TRUST_PROXY=true` evita problemas de cookies seguras detrás de Render/Railway

## Pasos de deploy

### 1. Base de datos

Usá Neon porque es el camino más simple para Postgres online.

1. Creá una base nueva
2. Copiá el `DATABASE_URL`
3. Activá `DATABASE_SSL=true` en backend

### 2. Backend

Deploy recomendado: Render web service o Railway service.

- Build/start command: `npm run start`
- Runtime: Node 18+
- Variables: las listadas arriba

Cuando quede online, anotá la URL pública. Ejemplo:

```text
https://alquiler-real-api.onrender.com
```

### 3. Frontend

Deploy recomendado: Vercel o Netlify.

- Build command: `npm run build`
- Output: `dist`
- Variable clave: `VITE_BACKEND_URL=https://tu-backend.onrender.com`

### 4. Cerrar el loop de sesiones

Cuando ya tengas la URL real del frontend:

1. ponela en `FRONTEND_URL`
2. repetila en `CORS_ALLOWED_ORIGINS`
3. redeployá el backend

Con eso, el frontend ya puede consumir el backend deployado con cookies de sesión.

## Qué quedó preparado en el código

- `src/lib/apiConfig.ts` usa `VITE_BACKEND_URL` en producción y proxy en desarrollo
- `vite.config.ts` usa `VITE_DEV_API_PROXY_TARGET` para local, sin hardcode fijo a producción
- `server/config/env.ts` centraliza la config del backend
- `server/index.ts` toma CORS, cookies, proxy y sesión desde variables de entorno
- `server/config/db.ts` soporta Postgres online con SSL
- las llamadas frontend relevantes ya pasan por `apiFetch` o `apiJson`, así que no quedan atadas al mismo origen por accidente

## Validación antes de deploy

Corré esto antes de subir cambios:

```bash
npm run lint
npm test -- --run
npm run build
```

## Checklist corto

- Frontend con `VITE_BACKEND_URL` real
- Backend con `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS` reales
- `SESSION_SECRET` real y largo
- `DATABASE_URL` real
- `DATABASE_SSL=true` en cloud
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAME_SITE=none`

## Si querés la opción más simple de todas

Usá esta combinación:

1. Neon para Postgres
2. Render para backend
3. Vercel para frontend

Es suficiente para priorizar producto y evitar infraestructura innecesaria.

### **API Timeouts**
- Default timeout: 30 seconds (configurable)
- Check backend is running on port 3001
- Check ngrok tunnel is active

### **Socket.io Issues**
- Verify useSocket hook is properly initialized
- Check browser console for connection logs

---

## 🎯 Next Steps for Production

1. Replace ngrok with real domain
2. Set up database backups
3. Implement rate limiting
4. Add analytics tracking
5. Set up error monitoring (Sentry)
6. Implement caching strategy
7. Add automated tests
8. Set up CI/CD pipeline

---

**Created:** 2026-03-28  
**Last Updated:** Deployment Ready  
**Version:** 1.0.0-final
