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

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, 'database', 'migrations', '014_mejorar_trigger_factura_electronica.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Aplicando migración 014_mejorar_trigger_factura_electronica.sql...\n');

    await pool.query(sql);

    console.log('✅ Migración aplicada exitosamente!\n');
    console.log('El trigger ahora captura:');
    console.log('  - Email del cliente');
    console.log('  - Teléfono del cliente');
    console.log('  - Dirección del cliente');
    console.log('  - Código municipio DANE');
    console.log('  - Items de la venta (JSON)');
    console.log('  - Métodos de pago (JSON)');

    await pool.end();
  } catch (error) {
    console.error('❌ Error al aplicar migración:', error);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();
