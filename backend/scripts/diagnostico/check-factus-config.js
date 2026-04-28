const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkConfig() {
  try {
    const result = await pool.query(`
      SELECT *
      FROM configuracion_factus
      WHERE activo = true
    `);

    if (result.rows.length === 0) {
      console.log('❌ No hay configuración activa');
    } else {
      console.log('📋 Configuración de Factus:');
      const config = result.rows[0];
      console.log(`  ID: ${config.id}`);
      console.log(`  Client ID: ${config.client_id}`);
      console.log(`  Tiene Client Secret: ${config.tiene_client_secret}`);
      console.log(`  Email: ${config.email}`);
      console.log(`  Tiene Password: ${config.tiene_password}`);
      console.log(`  Endpoint: ${config.endpoint}`);
      console.log(`  Ambiente: ${config.ambiente}`);
      console.log(`  Activo: ${config.activo}`);
      console.log(`  Numbering Range ID: ${config.numbering_range_id}`);
      console.log('');
      console.log('  Token actual: ${config.access_token ? config.access_token.substring(0, 30) + "..." : "NULL"}');
      console.log(`  Token expiry: ${config.token_expiry}`);

      // Verificar si el token está vencido
      if (config.token_expiry) {
        const expiry = new Date(config.token_expiry);
        const now = new Date();
        if (now > expiry) {
          console.log('  ⚠️  TOKEN VENCIDO - Necesita renovación');
        } else {
          console.log('  ✅ Token vigente hasta:', expiry.toISOString());
        }
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkConfig();
