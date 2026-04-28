const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

(async () => {
  try {
    console.log('Ejecutando migración 013_modulo_consecutivos.sql...\n');

    const sql = fs.readFileSync(
      './database/migrations/013_modulo_consecutivos.sql',
      'utf8'
    );

    await pool.query(sql);
    console.log('✅ Migración ejecutada correctamente\n');

    // Verificar resultados
    const result = await pool.query(`
      SELECT tipo_documento, nombre, prefijo, numero_actual, activo
      FROM resoluciones_dian
      ORDER BY tipo_documento
    `);

    console.log('Resoluciones creadas:');
    console.table(result.rows);

    await pool.end();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
