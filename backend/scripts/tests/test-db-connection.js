// Script simple para probar la conexión a PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy-hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root87',
  ssl: false,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('🔍 Probando conexión a PostgreSQL...');
  console.log(`📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`📂 Database: ${process.env.DB_NAME}`);
  console.log(`👤 User: ${process.env.DB_USER}`);
  console.log('');

  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa!');

    // Probar una query simple
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('⏰ Hora del servidor:', result.rows[0].current_time);
    console.log('📦 Versión PostgreSQL:', result.rows[0].pg_version.split(',')[0]);

    // Verificar si existen las tablas
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📋 Tablas encontradas:', tables.rows.length);
    tables.rows.forEach(row => {
      console.log('   -', row.table_name);
    });

    client.release();
    await pool.end();

    console.log('\n✅ Todas las pruebas pasaron!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    console.error('Código:', error.code);
    console.error('\n💡 Verifica que:');
    console.error('   - PostgreSQL está corriendo en el puerto', process.env.DB_PORT);
    console.error('   - El usuario y contraseña son correctos');
    console.error('   - La base de datos existe');
    console.error('   - El puerto está abierto en el firewall');

    await pool.end();
    process.exit(1);
  }
}

testConnection();
