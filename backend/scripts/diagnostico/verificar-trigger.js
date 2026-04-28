const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function verificar() {
  try {
    // Verificar el trigger
    const result = await pool.query(`
      SELECT prosrc
      FROM pg_proc
      WHERE proname = 'crear_factura_electronica_automatica'
    `);

    if (result.rows.length > 0) {
      const src = result.rows[0].prosrc;

      // Buscar la parte del SELECT que lee de clientes
      const selectMatch = src.match(/SELECT[\s\S]*?FROM\s+clientes/i);
      if (selectMatch) {
        console.log('SELECT del trigger (parte de clientes):');
        console.log(selectMatch[0]);
      }

      // Verificar qué columnas usa
      if (src.includes('codigo_municipio_dane')) {
        console.log('\n⚠️ Trigger aún usa codigo_municipio_dane');
      }
      if (src.includes("COALESCE(codigo_municipio, '11001')")) {
        console.log('\n✅ Trigger usa COALESCE(codigo_municipio, \'11001\')');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

verificar();
