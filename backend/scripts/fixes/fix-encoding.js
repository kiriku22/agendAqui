const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de conexión
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  client_encoding: 'UTF8',
});

async function fixEncoding() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando limpieza de encoding UTF-8...\n');

    // Verificar items problemáticos ANTES de limpiar
    console.log('📊 Verificando items problemáticos ANTES de limpieza...');
    const itemsAntes = await client.query(`
      SELECT COUNT(*) as total
      FROM items_inventario
      WHERE nombre ~ '[^\\x00-\\x7F]'
         OR descripcion ~ '[^\\x00-\\x7F]'
         OR notas ~ '[^\\x00-\\x7F]'
         OR ubicacion_almacen ~ '[^\\x00-\\x7F]';
    `);
    console.log(`   Items con caracteres problemáticos: ${itemsAntes.rows[0].total}\n`);

    const categoriasAntes = await client.query(`
      SELECT COUNT(*) as total
      FROM categorias_inventario
      WHERE nombre ~ '[^\\x00-\\x7F]'
         OR descripcion ~ '[^\\x00-\\x7F]';
    `);
    console.log(`   Categorías con caracteres problemáticos: ${categoriasAntes.rows[0].total}\n`);

    // Limpiar items_inventario
    console.log('🧹 Limpiando items_inventario...');

    await client.query(`
      UPDATE items_inventario
      SET nombre = REGEXP_REPLACE(nombre, '[^\\x00-\\x7F]+', '', 'g')
      WHERE nombre IS NOT NULL
        AND nombre ~ '[^\\x00-\\x7F]';
    `);

    await client.query(`
      UPDATE items_inventario
      SET descripcion = REGEXP_REPLACE(descripcion, '[^\\x00-\\x7F]+', '', 'g')
      WHERE descripcion IS NOT NULL
        AND descripcion ~ '[^\\x00-\\x7F]';
    `);

    await client.query(`
      UPDATE items_inventario
      SET notas = REGEXP_REPLACE(notas, '[^\\x00-\\x7F]+', '', 'g')
      WHERE notas IS NOT NULL
        AND notas ~ '[^\\x00-\\x7F]';
    `);

    await client.query(`
      UPDATE items_inventario
      SET ubicacion_almacen = REGEXP_REPLACE(ubicacion_almacen, '[^\\x00-\\x7F]+', '', 'g')
      WHERE ubicacion_almacen IS NOT NULL
        AND ubicacion_almacen ~ '[^\\x00-\\x7F]';
    `);

    console.log('   ✅ Items limpiados\n');

    // Limpiar categorias_inventario
    console.log('🧹 Limpiando categorias_inventario...');

    await client.query(`
      UPDATE categorias_inventario
      SET nombre = REGEXP_REPLACE(nombre, '[^\\x00-\\x7F]+', '', 'g')
      WHERE nombre IS NOT NULL
        AND nombre ~ '[^\\x00-\\x7F]';
    `);

    await client.query(`
      UPDATE categorias_inventario
      SET descripcion = REGEXP_REPLACE(descripcion, '[^\\x00-\\x7F]+', '', 'g')
      WHERE descripcion IS NOT NULL
        AND descripcion ~ '[^\\x00-\\x7F]';
    `);

    console.log('   ✅ Categorías limpiadas\n');

    // Verificar DESPUÉS de limpiar
    console.log('📊 Verificando resultados DESPUÉS de limpieza...');
    const itemsDespues = await client.query(`
      SELECT COUNT(*) as total
      FROM items_inventario
      WHERE nombre ~ '[^\\x00-\\x7F]'
         OR descripcion ~ '[^\\x00-\\x7F]'
         OR notas ~ '[^\\x00-\\x7F]'
         OR ubicacion_almacen ~ '[^\\x00-\\x7F]';
    `);
    console.log(`   Items con caracteres problemáticos: ${itemsDespues.rows[0].total}`);

    const categoriasDespues = await client.query(`
      SELECT COUNT(*) as total
      FROM categorias_inventario
      WHERE nombre ~ '[^\\x00-\\x7F]'
         OR descripcion ~ '[^\\x00-\\x7F]';
    `);
    console.log(`   Categorías con caracteres problemáticos: ${categoriasDespues.rows[0].total}\n`);

    if (itemsDespues.rows[0].total === '0' && categoriasDespues.rows[0].total === '0') {
      console.log('✅ Limpieza completada exitosamente!');
      console.log('✨ No quedan caracteres con encoding problemático.\n');
    } else {
      console.log('⚠️  Aún quedan algunos caracteres problemáticos.');
      console.log('   Puede que necesites ejecutar el script nuevamente.\n');
    }

  } catch (error) {
    console.error('❌ Error ejecutando limpieza:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEncoding()
  .then(() => {
    console.log('✨ Proceso completado!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Proceso falló:', err);
    process.exit(1);
  });
