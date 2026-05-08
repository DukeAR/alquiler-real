# 🔧 DEBUGGING: Error "Network error: Failed to fetch"

Este error ocurre cuando el frontend **no puede conectar** al backend. Aquí está el árbol de decisión para solucionarlo.

---

## 🚨 Diagnóstico Rápido

### Paso 1: ¿El backend está corriendo?

```bash
# Verificar si hay algo en puerto 3001
netstat -ano | findstr ":3001"
```

**Esperado:**
```
TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345
```

**Si NO ves eso:**
```bash
# Inicia el backend
npm run server
```

---

### Paso 2: ¿La URL del backend es correcta?

**En browser console:**
```javascript
// Debería mostrar: http://localhost:3001
console.log(import.meta.env.VITE_BACKEND_URL)
```

**Si es `undefined`:**
1. Verifica que `.env.local` existe
2. Que contiene: `VITE_BACKEND_URL=http://localhost:3001`
3. Reinicia con `npm run dev`

---

### Paso 3: Prueba de conectividad directa

**En browser console:**
```javascript
// Test directo
fetch('http://localhost:3001/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('✓ Conectó!', d))
  .catch(e => console.error('✗ Error:', e));
```

---

## 🔍 Diagnóstico Completo

### Opción 1: Usar herramienta automática

```bash
# En el navegador, abre el archivo de test
http://localhost:3000/test-api.html
```

O ejecuta en console:
```javascript
// Cargar script de diagnóstico
const script = document.createElement('script');
script.src = '/test-diagnostics.js';
document.body.appendChild(script);
```

---

### Opción 2: Debugging Manual

#### 1️⃣ Verificar que el backend está corriendo

```bash
# Terminal en la carpeta del proyecto
npm run server
```

**Esperas ver:**
```
✓ Servidor corriendo en puerto 3001
✓ CORS habilitado para: http://localhost:3000, ...
Base de datos inicializada
```

#### 2️⃣ Verificar CORS en el backend

En [server/index.ts](../server/index.ts#L20), busca:
```typescript
const allowedOrigins = [
  'https://supportless-pratingly-spring.ngrok-free.dev',
  'http://localhost:3000',  // ← Debe estar aquí
  'http://127.0.0.1:3000',
];
```

#### 3️⃣ Verificar variables de entorno

Archivo: [.env.local](.env.local)
```env
VITE_BACKEND_URL=http://localhost:3001  # ← Debe tener esto
```

#### 4️⃣ Verificar que el frontend está en puerto 3000

```bash
# Terminal nueva
npm run dev
```

Esperas ver:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

---

## 🚀 Pruebas paso a paso

### Test 1: Backend responde

```bash
curl -v http://localhost:3001/api/auth/me
```

**Esperado:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
```

### Test 2: CORS está habilitado

```bash
curl -X OPTIONS http://localhost:3001/api/auth/login \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Esperado:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Test 3: Login funciona

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  -v
```

**Esperado:**
```
HTTP/1.1 200 OK  o  HTTP/1.1 401 Unauthorized
```

(401 es OK si las credenciales son incorrectas)

---

## 🔐 Flujo Protegido Repetible

Si querés preparar o recorrer el flujo protegido nuevo contra un backend local o desplegado, usá:

```powershell
.\scripts\protected-flow-rehearsal.ps1 `
  -FrontendUrl http://localhost:3000 `
  -PropertyId 1 `
  -StartDate 2026-05-08 `
  -EndDate 2026-05-10 `
  -SkipPayment
```

Si ya tenés un `paymentId`, el mismo runner puede continuar hasta `confirm-arrival` y `confirm-access`:

```powershell
.\scripts\protected-flow-rehearsal.ps1 `
  -FrontendUrl https://alquiler-real.vercel.app `
  -PropertyId demo_prop_depto_visible_2 `
  -StartDate 2026-05-08 `
  -EndDate 2026-05-10 `
  -PaymentId 123456789
```

Notas:
- Si devuelve `BOOKING_BLOCKED`, el freno viene del risk gate del backend y no del flujo de check-in doble.
- Si devuelve `checkout-ready`, el booking, la conversación y el checkout ya quedaron preparados y solo falta retomar con `-PaymentId`.

---

## 🐛 Errores Comunes y Soluciones

### ❌ Error: "Failed to fetch"

| Causa | Solución |
|-------|----------|
| Backend no corriendo | Ejecuta `npm run server` |
| Puerto 3001 ocupado | `netstat -ano \| findstr :3001` → mata el proceso |
| CORS bloqueando | Verifica `allowedOrigins` en server/index.ts |
| Firewall bloqueando | Abre puerto 3001 en firewall |
| URL incorrecta | Verifica `VITE_BACKEND_URL` en .env.local |

### ❌ Error: "CORS error"

**Browser console mostrará:**
```
Access to XMLHttpRequest at 'http://localhost:3001/api/auth/login'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solución:**
```typescript
// server/index.ts - Línea 20
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);  // ← Permitir
    } else {
      callback(new Error('Not allowed by CORS'));  // ← Rechazar
    }
  },
  credentials: true,  // ← Importante para cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### ❌ Error: "Timeout"

El servidor tarda más de 30 segundos en responder.

**Verificar:**
1. Backend está congelado: `ps aux | grep node`
2. Database está lenta: checkea logs en `server/index.ts`
3. Aumentar timeout en [src/lib/apiConfig.ts](../src/lib/apiConfig.ts#L55):
   ```typescript
   const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
   ```

---

## 📊 Checklist de Debugging

```
Servidor Backend:
  [ ] npm run server está ejecutándose
  [ ] Mensaje "Servidor corriendo en puerto 3001" aparece
  [ ] No hay errores en los logs del backend
  [ ] Puerto 3001 no está ocupado

Frontend:
  [ ] npm run dev está ejecutándose
  [ ] Abres http://localhost:3000 en navegador
  [ ] DevTools Console no muestra errores rojos

Configuración:
  [ ] .env.local existe
  [ ] .env.local tiene VITE_BACKEND_URL=http://localhost:3001
  [ ] Ejecutaste npm run dev DESPUÉS de crear .env.local

CORS:
  [ ] allowedOrigins incluye http://localhost:3000
  [ ] credentials: true está en cors config
  [ ] OPTIONS method está permitido

Networking:
  [ ] curl http://localhost:3001/api/auth/me devuelve respuesta
  [ ] curl OPTIONS con CORS headers devuelve 200
  [ ] Sin firewall bloqueando puerto 3001
```

---

## 📞 Si Nada Funciona

1. Copia los logs de AMBAS consolas (backend + browser DevTools)
2. Ejecuta en browser console:
   ```javascript
   // Cargar diagnóstico
   const s = document.createElement('script');
   s.src = '/test-diagnostics.js';
   document.body.appendChild(s);
   ```
3. Copia toda la salida
4. Comparte con soporte incluyendo:
   - Logs de backend
   - Logs de browser DevTools
   - Salida del diagnóstico
   - Output de: `netstat -ano | findstr :3001`
