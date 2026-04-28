/**
 * TEST: Conexión con Factus API (Sandbox)
 *
 * Este script prueba la autenticación OAuth2 con Factus
 * usando las credenciales de sandbox públicas.
 *
 * Uso: node test-factus-connection.js
 */

const https = require('https');

// Credenciales de Factus Sandbox (públicas)
const FACTUS_CONFIG = {
  endpoint: 'api-sandbox.factus.com.co',
  email: 'sandbox@factus.com.co',
  password: 'sandbox2024%',
  client_id: 'a02b4bd9-8b3a-4f24-9c93-70a950a89246',
  client_secret: 'k2J2ZfPbjTuyvEboLw0XatIdYKbBhPZT0neT6oIW'
};

console.log('============================================================================');
console.log('TEST DE CONEXIÓN CON FACTUS API (SANDBOX)');
console.log('============================================================================');
console.log('');
console.log('Configuración:');
console.log(`  Endpoint: https://${FACTUS_CONFIG.endpoint}`);
console.log(`  Email: ${FACTUS_CONFIG.email}`);
console.log(`  Client ID: ${FACTUS_CONFIG.client_id}`);
console.log('');
console.log('Probando autenticación OAuth2...');
console.log('');

// Construir el cuerpo de la petición (form data)
const formData = new URLSearchParams();
formData.append('grant_type', 'password');
formData.append('client_id', FACTUS_CONFIG.client_id);
formData.append('client_secret', FACTUS_CONFIG.client_secret);
formData.append('username', FACTUS_CONFIG.email);
formData.append('password', FACTUS_CONFIG.password);

const postData = formData.toString();

// Configurar la petición HTTPS
const options = {
  hostname: FACTUS_CONFIG.endpoint,
  port: 443,
  path: '/oauth/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// Realizar la petición
const req = https.request(options, (res) => {
  let data = '';

  console.log(`Status Code: ${res.statusCode}`);
  console.log('');

  // Recibir datos
  res.on('data', (chunk) => {
    data += chunk;
  });

  // Procesar respuesta completa
  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('✅ CONEXIÓN EXITOSA');
        console.log('');
        console.log('Token obtenido:');
        console.log(`  Access Token: ${response.access_token ? response.access_token.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`  Token Type: ${response.token_type || 'N/A'}`);
        console.log(`  Expires In: ${response.expires_in || 'N/A'} segundos (${(response.expires_in / 60).toFixed(0)} minutos)`);
        console.log(`  Refresh Token: ${response.refresh_token ? response.refresh_token.substring(0, 50) + '...' : 'N/A'}`);
        console.log('');
        console.log('============================================================================');
        console.log('PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('============================================================================');
        console.log('');
        console.log('Próximos pasos:');
        console.log('  1. ✅ Factus está funcionando correctamente');
        console.log('  2. ⏭️  Continuar con Fase 2 - Implementar FactusService.js');
        console.log('  3. ⏭️  Crear resolvers GraphQL');
        console.log('  4. ⏭️  Crear interfaz de configuración');
        console.log('');

      } else {
        console.log('❌ ERROR EN LA AUTENTICACIÓN');
        console.log('');
        console.log('Respuesta del servidor:');
        console.log(JSON.stringify(response, null, 2));
        console.log('');
        console.log('Posibles causas:');
        console.log('  - Credenciales incorrectas');
        console.log('  - Endpoint incorrecto');
        console.log('  - Factus está temporalmente no disponible');
        console.log('');
      }

    } catch (error) {
      console.log('❌ ERROR AL PARSEAR RESPUESTA');
      console.log('');
      console.log('Respuesta cruda:');
      console.log(data);
      console.log('');
      console.log('Error:');
      console.log(error.message);
      console.log('');
    }
  });
});

// Manejar errores de conexión
req.on('error', (error) => {
  console.log('❌ ERROR DE CONEXIÓN');
  console.log('');
  console.log('Error:');
  console.log(error.message);
  console.log('');
  console.log('Verifique:');
  console.log('  - Conexión a Internet');
  console.log('  - Firewall o proxy');
  console.log('  - El endpoint de Factus está disponible');
  console.log('');
});

// Enviar la petición
req.write(postData);
req.end();