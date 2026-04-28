const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkErrores() {
  try {
    // Verificar errores de validación guardados
    const result = await pool.query(`
      SELECT *
      FROM facturas_electronicas
      WHERE id = 18
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró la factura electrónica ID 18');
      await pool.end();
      return;
    }

    const fe = result.rows[0];
    console.log('=== TODAS LAS COLUMNAS DE FACTURA ELECTRÓNICA ID 18 ===\n');
    console.log(JSON.stringify(fe, null, 2));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkErrores();
