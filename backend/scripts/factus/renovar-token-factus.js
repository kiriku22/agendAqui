const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function renovarToken() {
  try {
    console.log('🔄 Renovando token de Factus...\n');

    // Obtener configuración
    const configResult = await pool.query(`
      SELECT * FROM configuracion_factus WHERE activo = true LIMIT 1
    `);

    if (configResult.rows.length === 0) {
      console.log('❌ No hay configuración activa');
      await pool.end();
      return;
    }

    const config = configResult.rows[0];
    console.log('📋 Configuración:');
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  Client ID: ${config.client_id}`);
    console.log(`  Email: ${config.email}`);
    console.log(`  Password: ${config.password ? '***' : 'NO CONFIGURADO'}`);
    console.log('');

    // Solicitar nuevo token usando grant_type: password (como lo hace FactusService)
    console.log('🔐 Solicitando nuevo token con grant_type: password...');

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('client_id', config.client_id);
    formData.append('client_secret', config.client_secret);
    formData.append('username', config.email);
    formData.append('password', config.password);

    try {
      const response = await axios.post(
        `${config.endpoint}/oauth/token`,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000
        }
      );

      console.log('✅ Token obtenido!');
      console.log(`  access_token: ${response.data.access_token.substring(0, 40)}...`);
      console.log(`  token_type: ${response.data.token_type}`);
      console.log(`  expires_in: ${response.data.expires_in} segundos`);

      // Guardar en BD
      const tokenExpiry = new Date(Date.now() + (response.data.expires_in || 3600) * 1000);

      await pool.query(`
        UPDATE configuracion_factus
        SET access_token = $1,
            refresh_token = $2,
            token_expiry = $3,
            updated_at = NOW()
        WHERE id = $4
      `, [
        response.data.access_token,
        response.data.refresh_token || null,
        tokenExpiry,
        config.id
      ]);

      console.log('\n✅ Token guardado en BD');
      console.log(`  Expira: ${tokenExpiry.toISOString()}`);

      // Probar el token inmediatamente
      console.log('\n🧪 Probando token con endpoint de prueba...');

      const testResponse = await axios.get(
        `${config.endpoint}/v1/bills`,
        {
          headers: {
            'Authorization': `Bearer ${response.data.access_token}`,
            'Accept': 'application/json'
          },
          params: {
            per_page: 1
          },
          validateStatus: () => true
        }
      );

      console.log(`  Status: ${testResponse.status}`);
      if (testResponse.status === 200) {
        console.log('  ✅ Token válido - API responde correctamente');
      } else if (testResponse.status === 401) {
        console.log('  ❌ Token rechazado (401) - Verificar credenciales');
        console.log('  Respuesta:', JSON.stringify(testResponse.data, null, 2));
      } else {
        console.log('  Respuesta:', JSON.stringify(testResponse.data, null, 2));
      }

    } catch (authError) {
      console.log('❌ Error al obtener token:');
      if (authError.response) {
        console.log(`  Status: ${authError.response.status}`);
        console.log(`  Data: ${JSON.stringify(authError.response.data, null, 2)}`);
      } else {
        console.log(`  ${authError.message}`);
      }
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

renovarToken();
