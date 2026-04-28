const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de conexión (usa las mismas variables que database.js)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migración de trigger para facturas_electronicas...\n');

    // Leer el archivo SQL
    const migrationPath = path.join(__dirname, 'database', 'migrations', '012_trigger_facturas_electronicas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar la migración
    await client.query(sql);

    console.log('✅ Migración completada exitosamente!\n');

    // Verificar que el trigger fue creado
    const triggerCheck = await client.query(`
      SELECT
        tgname as trigger_name,
        proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE tgname = 'trigger_crear_factura_electronica'
    `);

    if (triggerCheck.rows.length > 0) {
      console.log('✅ Trigger creado correctamente:');
      console.table(triggerCheck.rows);
    } else {
      console.warn('⚠️  No se encontró el trigger creado');
    }

    // Verificar la función
    const functionCheck = await client.query(`
      SELECT
        proname as function_name,
        pg_get_function_result(oid) as return_type
      FROM pg_proc
      WHERE proname = 'crear_factura_electronica_automatica'
    `);

    if (functionCheck.rows.length > 0) {
      console.log('\n✅ Función creada correctamente:');
      console.table(functionCheck.rows);
    } else {
      console.warn('⚠️  No se encontró la función creada');
    }

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Proceso completado!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Proceso falló:', err);
    process.exit(1);
  });
