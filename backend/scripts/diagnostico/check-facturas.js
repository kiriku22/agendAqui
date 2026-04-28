const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkFacturas() {
  try {
    const result = await pool.query(`
      SELECT
        fe.id,
        fe.prefijo,
        fe.numero,
        fe.numero_factura_electronica,
        f.numero_factura as numero_factura_interna
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      ORDER BY fe.id DESC
      LIMIT 5
    `);

    console.log('=== ÚLTIMAS 5 FACTURAS ELECTRÓNICAS ===\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`  prefijo: ${row.prefijo}`);
      console.log(`  numero: ${row.numero}`);
      console.log(`  numero_factura_electronica: ${row.numero_factura_electronica}`);
      console.log(`  numero_factura_interna: ${row.numero_factura_interna}`);
      console.log('---');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkFacturas();
