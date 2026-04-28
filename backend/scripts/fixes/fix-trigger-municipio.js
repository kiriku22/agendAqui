const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixTrigger() {
  try {
    console.log('🔧 Corrigiendo trigger con nombre de columna correcto...\n');

    // Leer el archivo de migración corregido
    const migrationPath = path.join(__dirname, 'database', 'migrations', '014_mejorar_trigger_factura_electronica.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Aplicando migración corregida...');
    await pool.query(sql);

    console.log('✅ Trigger actualizado correctamente!\n');

    // Verificar que el trigger existe
    const triggerCheck = await pool.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'crear_factura_electronica_automatica'
    `);

    if (triggerCheck.rows.length > 0) {
      console.log('✅ Función del trigger verificada');

      // Verificar que ahora usa codigo_municipio_dane
      const usaColumnaCorrecta = triggerCheck.rows[0].prosrc.includes('codigo_municipio_dane');
      if (usaColumnaCorrecta) {
        console.log('✅ El trigger ahora usa "codigo_municipio_dane" correctamente');
      } else {
        console.log('❌ El trigger todavía no usa la columna correcta');
      }
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

fixTrigger();
