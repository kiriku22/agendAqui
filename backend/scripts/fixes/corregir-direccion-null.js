const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function corregirDireccionNull() {
  try {
    console.log('🔧 Corrigiendo direcciones NULL en facturas electrónicas...\n');

    // 1. Verificar facturas con dirección NULL
    const facturasSinDireccion = await pool.query(`
      SELECT id, factura_id, cliente_nombre, cliente_direccion
      FROM facturas_electronicas
      WHERE cliente_direccion IS NULL OR cliente_direccion = ''
    `);

    console.log(`📋 Facturas con dirección NULL: ${facturasSinDireccion.rows.length}`);

    if (facturasSinDireccion.rows.length === 0) {
      console.log('✅ No hay facturas con dirección NULL');
      await pool.end();
      return;
    }

    facturasSinDireccion.rows.forEach(f => {
      console.log(`  - ID ${f.id}: ${f.cliente_nombre} → dirección: "${f.cliente_direccion || 'NULL'}"`);
    });

    // 2. Actualizar direcciones NULL a "No especificada"
    const updateResult = await pool.query(`
      UPDATE facturas_electronicas
      SET cliente_direccion = 'No especificada',
          updated_at = NOW()
      WHERE cliente_direccion IS NULL OR cliente_direccion = ''
      RETURNING id, cliente_nombre
    `);

    console.log(`\n✅ Actualizadas ${updateResult.rows.length} facturas:`);
    updateResult.rows.forEach(f => {
      console.log(`  - ID ${f.id}: ${f.cliente_nombre} → "No especificada"`);
    });

    // 3. También actualizar clientes sin dirección para futuras facturas
    const updateClientes = await pool.query(`
      UPDATE clientes
      SET direccion = 'No especificada',
          updated_at = NOW()
      WHERE direccion IS NULL OR direccion = ''
      RETURNING id, nombre
    `);

    console.log(`\n✅ Actualizados ${updateClientes.rows.length} clientes:`);
    updateClientes.rows.forEach(c => {
      console.log(`  - ID ${c.id}: ${c.nombre}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

corregirDireccionNull();
