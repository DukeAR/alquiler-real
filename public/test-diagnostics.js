/**
 * Script de Diagnóstico - Ejecutar en Browser Console
 * 
 * Usa para debuggear problemas de conexión al backend
 * 
 * Copia y ejecuta esto en la consola del navegador (DevTools → Console)
 */

// Color styling para console
const log = {
  title: (msg) => console.log(`\n%c=== ${msg} ===`, 'color: #00aaff; font-weight: bold; font-size: 14px;'),
  success: (msg) => console.log(`%c✓ ${msg}`, 'color: #22aa22; font-weight: bold;'),
  error: (msg) => console.log(`%c✗ ${msg}`, 'color: #ff4444; font-weight: bold;'),
  info: (msg) => console.log(`%cℹ ${msg}`, 'color: #0088ff;'),
  debug: (msg, data) => console.log(`%c→ ${msg}`, 'color: #888;', data),
};

// Función de diagnóstico principal
async function diagnoseBackend() {
  log.title('DIAGNÓSTICO DE CONEXIÓN AL BACKEND');

  // 1. Verificar variables de entorno
  log.title('1. Variables de Entorno');
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  log.info(`Backend URL: ${backendUrl || '(no definida - usando localhost:3001)'}`);
  log.debug('Todas las variables VITE:', import.meta.env);

  // 2. Verificar conectividad básica
  log.title('2. Conectividad Básica');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    log.success(`Backend respondiendo: ${response.status} ${response.statusText}`);
    log.debug('Response headers:', {
      'Content-Type': response.headers.get('Content-Type'),
      'CORS Origin': response.headers.get('Access-Control-Allow-Origin'),
      'CORS Methods': response.headers.get('Access-Control-Allow-Methods'),
      'CORS Credentials': response.headers.get('Access-Control-Allow-Credentials'),
    });
  } catch (err) {
    log.error(`No se pudo conectar: ${err.message}`);
    log.debug('Tipo de error:', err);
  }

  // 3. Verificar CORS
  log.title('3. Configuración CORS');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'OPTIONS', // Preflight request
      credentials: 'include',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    if (response.ok) {
      log.success('CORS preflight OK');
      log.debug('CORS Headers:', {
        'Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
      });
    } else {
      log.error(`CORS preflight failed: ${response.status}`);
    }
  } catch (err) {
    log.error(`Error en CORS preflight: ${err.message}`);
  }

  // 4. Verificar Login
  log.title('4. Test de Login');
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test123'
      }),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      log.success(`Login test ok: ${data.user?.email || 'usuario anónimo'}`);
    } else {
      const data = await response.json();
      log.error(`Login test falló: ${data.error}`);
      log.debug('Response:', data);
    }
  } catch (err) {
    log.error(`Error en login test: ${err.message}`);
  }

  // 5. Información del navegador
  log.title('5. Información del Navegador');
  log.info(`Origin: ${window.location.origin}`);
  log.info(`Protocol: ${window.location.protocol}`);
  log.info(`Host: ${window.location.host}`);
  log.debug('User Agent:', navigator.userAgent);

  // 6. Estado de la app
  log.title('6. Estado de la App');
  
  // Verifica si AuthContext está disponible
  try {
    log.info('Comprobando estado de AuthContext...');
    // Este es solo un check visual - el usuario debería ver los logs de AuthContext en la consola
    log.debug('Los logs de [AuthContext] y [API] deberían aparecer cuando hagas login');
  } catch (err) {
    log.error(`Error: ${err.message}`);
  }

  log.title('FIN DEL DIAGNÓSTICO');
  log.info('Si hay errores ↑, verifica:');
  log.info('1. Puerto 3001 está abierto (netstat -ano | findstr :3001)');
  log.info('2. Backend está corriendo (npm run server)');
  log.info('3. CORS está configurado en backend');
  log.info('4. .env.local tiene VITE_BACKEND_URL correcta');
}

// Ejecutar diagnóstico
diagnoseBackend().catch(err => console.error('Error en diagnóstico:', err));

// Exportar para usar luego
window.diagnoseBackend = diagnoseBackend;

console.log('%cℹ Próximos pasos:', 'color: #0088ff; font-weight: bold;');
console.log('1. Abre DevTools (F12) → Console');
console.log('2. Copia el contenido de /test-diagnostics.js');
console.log('3. Pégalo en la consola');
console.log('4. Espera a que se ejecute el diagnóstico');
console.log('5. Copia los errores y comparte con soporte');
