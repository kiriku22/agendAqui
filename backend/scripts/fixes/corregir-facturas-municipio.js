const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function corregirFacturas() {
  try {
    console.log('═'.repeat(80));
    console.log('CORRECCIÓN: Actualizar municipio en facturas electrónicas existentes');
    console.log('═'.repeat(80));

    // 1. Buscar facturas electrónicas que tienen cliente_id pero municipio incorrecto
    const facturasResult = await pool.query(`
      SELECT
        fe.id,
        fe.numero_factura_electronica,
        fe.cliente_id,
        fe.cliente_nombre,
        fe.cliente_codigo_municipio_dane as fe_municipio,
        c.codigo_municipio as cliente_municipio,
        fe.cufe
      FROM facturas_electronicas fe
      INNER JOIN clientes c ON c.id = fe.cliente_id
      WHERE fe.cliente_codigo_municipio_dane != c.codigo_municipio
        OR (fe.cliente_codigo_municipio_dane IS NULL AND c.codigo_municipio IS NOT NULL)
        OR (fe.cliente_codigo_municipio_dane = '11001' AND c.codigo_municipio != '11001')
    `);

    console.log(`\n📋 Encontradas ${facturasResult.rows.length} facturas con municipio incorrecto:\n`);

    if (facturasResult.rows.length === 0) {
      console.log('✅ Todas las facturas tienen el municipio correcto');
      await pool.end();
      return;
    }

    for (const fe of facturasResult.rows) {
      console.log(`  FE ID ${fe.id}: ${fe.cliente_nombre}`);
      console.log(`    Municipio actual en FE: ${fe.fe_municipio || 'NULL'}`);
      console.log(`    Municipio real del cliente: ${fe.cliente_municipio}`);
      console.log(`    CUFE: ${fe.cufe ? '✅ Ya transmitida' : '❌ No transmitida'}`);
    }

    // 2. Actualizar las que NO han sido transmitidas
    const updateResult = await pool.query(`
      UPDATE facturas_electronicas fe
      SET
        cliente_codigo_municipio_dane = c.codigo_municipio,
        cliente_email = COALESCE(fe.cliente_email, c.email),
        cliente_telefono = COALESCE(fe.cliente_telefono, c.telefono),
        cliente_direccion = COALESCE(fe.cliente_direccion, c.direccion, 'No especificada'),
        updated_at = NOW()
      FROM clientes c
      WHERE c.id = fe.cliente_id
        AND fe.cufe IS NULL
        AND (
          fe.cliente_codigo_municipio_dane != c.codigo_municipio
          OR fe.cliente_codigo_municipio_dane IS NULL
          OR (fe.cliente_codigo_municipio_dane = '11001' AND c.codigo_municipio != '11001')
        )
      RETURNING fe.id, fe.cliente_nombre, fe.cliente_codigo_municipio_dane
    `);

    console.log(`\n✅ Actualizadas ${updateResult.rows.length} facturas:\n`);

    for (const fe of updateResult.rows) {
      console.log(`  FE ID ${fe.id}: ${fe.cliente_nombre} -> Municipio: ${fe.cliente_codigo_municipio_dane}`);
    }

    // 3. Verificar las facturas que ya fueron transmitidas (no se pueden modificar)
    const transmitidasResult = await pool.query(`
      SELECT
        fe.id,
        fe.numero_factura_electronica,
        fe.cliente_nombre,
        fe.cliente_codigo_municipio_dane,
        c.codigo_municipio as municipio_real
      FROM facturas_electronicas fe
      INNER JOIN clientes c ON c.id = fe.cliente_id
      WHERE fe.cufe IS NOT NULL
        AND fe.cliente_codigo_municipio_dane != c.codigo_municipio
    `);

    if (transmitidasResult.rows.length > 0) {
      console.log(`\n⚠️ ${transmitidasResult.rows.length} facturas YA TRANSMITIDAS tienen municipio diferente al del cliente:`);
      console.log('   (Estas no se pueden modificar porque ya están en DIAN)\n');

      for (const fe of transmitidasResult.rows) {
        console.log(`  FE ID ${fe.id}: ${fe.cliente_nombre}`);
        console.log(`    Municipio en DIAN: ${fe.cliente_codigo_municipio_dane}`);
        console.log(`    Municipio real: ${fe.municipio_real}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('CORRECCIÓN COMPLETADA');
    console.log('═'.repeat(80));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

corregirFacturas();
