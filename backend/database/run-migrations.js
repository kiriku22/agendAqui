/**
 * Script para ejecutar migraciones de configuración
 * Uso: node backend/database/run-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuración de base de datos (usando las mismas variables de entorno del backend)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Migraciones a ejecutar en orden
const migrations = [
  '007_create_datos_hotel.sql',
  '008_create_parametros_generales.sql',
  '009_create_tipos_habitacion.sql',
  '010_create_canales_reserva.sql',
  '011_create_notificaciones_config.sql',
  '012_create_auditoria_configuracion.sql'
];

async function runMigrations() {
  console.log('🚀 Iniciando ejecución de migraciones de configuración...\n');

  for (const migrationFile of migrations) {
    const filePath = path.join(__dirname, 'migrations', migrationFile);

    try {
      console.log(`⏳ Ejecutando: ${migrationFile}`);

      // Leer archivo SQL
      const sql = fs.readFileSync(filePath, 'utf8');

      // Ejecutar migración
      await pool.query(sql);

      console.log(`✅ Completada: ${migrationFile}\n`);
    } catch (error) {
      console.error(`❌ Error en ${migrationFile}:`);
      console.error(error.message);
      console.error('\n⚠️  Deteniendo ejecución de migraciones.\n');
      process.exit(1);
    }
  }

  console.log('✨ Todas las migraciones se ejecutaron exitosamente!\n');

  // Verificar tablas creadas
  console.log('📋 Verificando tablas creadas:\n');

  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'datos_hotel',
        'parametros_generales',
        'tipos_habitacion',
        'canales_reserva',
        'notificaciones_config',
        'auditoria_configuracion'
      )
    ORDER BY table_name;
  `);

  result.rows.forEach(row => {
    console.log(`   ✓ ${row.table_name}`);
  });

  console.log('\n🎉 Proceso completado!\n');

  await pool.end();
  process.exit(0);
}

// Ejecutar
runMigrations().catch(error => {
  console.error('❌ Error fatal:', error);
  pool.end();
  process.exit(1);
});
