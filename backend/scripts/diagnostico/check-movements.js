const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root87'
});

async function checkMovements() {
  try {
    // Check total movements
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM movimientos_inventario');
    console.log('\n📊 Total movimientos en BD:', totalResult.rows[0].total);

    // Check recent movements
    const recentResult = await pool.query(`
      SELECT
        m.id,
        m.item_inventario_id,
        i.nombre as item_nombre,
        m.tipo_movimiento,
        m.cantidad,
        m.fecha_movimiento
      FROM movimientos_inventario m
      LEFT JOIN items_inventario i ON m.item_inventario_id = i.id
      ORDER BY m.fecha_movimiento DESC
      LIMIT 5
    `);

    console.log('\n📋 Últimos 5 movimientos:');
    recentResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id} | Item: ${row.item_nombre} (ID: ${row.item_inventario_id}) | Tipo: ${row.tipo_movimiento} | Cantidad: ${row.cantidad} | Fecha: ${row.fecha_movimiento}`);
    });

    // Check movements by item
    const byItemResult = await pool.query(`
      SELECT
        i.id,
        i.nombre,
        COUNT(m.id) as total_movimientos
      FROM items_inventario i
      LEFT JOIN movimientos_inventario m ON m.item_inventario_id = i.id
      GROUP BY i.id, i.nombre
      HAVING COUNT(m.id) > 0
      ORDER BY COUNT(m.id) DESC
      LIMIT 10
    `);

    console.log('\n📦 Items con más movimientos:');
    byItemResult.rows.forEach(row => {
      console.log(`  - ${row.nombre} (ID: ${row.id}): ${row.total_movimientos} movimientos`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkMovements();
