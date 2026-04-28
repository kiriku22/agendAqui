const { Pool } = require('pg');

// Configuración de conexión directa
const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87',
});

async function fixMissingFacturasElectronicas() {
  const client = await pool.connect();

  try {
    // Hacer nullable las columnas que pueden serlo para ventas POS
    console.log('🔧 Modificando constraints para permitir NULL en ventas POS...\n');

    const alterStatements = [
      'ALTER TABLE facturas_electronicas ALTER COLUMN hospedaje_id DROP NOT NULL',
      'ALTER TABLE facturas_electronicas ALTER COLUMN subtotal_hospedaje DROP NOT NULL',
      'ALTER TABLE facturas_electronicas ALTER COLUMN subtotal_consumos DROP NOT NULL',
    ];

    for (const stmt of alterStatements) {
      try {
        await client.query(stmt);
        console.log(`  ✓ ${stmt.split('ALTER COLUMN ')[1]?.split(' DROP')[0] || 'OK'}`);
      } catch (e) {
        // Ignorar si ya está nullable
        console.log(`  - Ya modificado: ${stmt.split('ALTER COLUMN ')[1]?.split(' DROP')[0] || 'OK'}`);
      }
    }
    console.log('');

    console.log('🔍 Buscando facturas sin registro en facturas_electronicas...\n');

    // Buscar facturas tipo venta_pos o checkout que no tienen registro en facturas_electronicas
    const result = await client.query(`
      SELECT f.id, f.numero_factura, f.tipo_factura, f.cliente_id, f.hospedaje_id,
             f.subtotal, f.iva, f.descuento, f.total, f.created_at, f.fecha,
             c.tipo_documento, c.numero_documento, c.nombre, c.email, c.telefono, c.direccion
      FROM facturas f
      LEFT JOIN facturas_electronicas fe ON fe.factura_id = f.id
      LEFT JOIN clientes c ON c.id = f.cliente_id
      WHERE fe.id IS NULL
        AND f.tipo_factura IN ('venta_pos', 'checkout')
      ORDER BY f.created_at DESC
    `);

    console.log(`📋 Encontradas ${result.rows.length} facturas sin registro electrónico\n`);

    if (result.rows.length === 0) {
      console.log('✅ Todas las facturas ya tienen su registro electrónico');
      return;
    }

    // Insertar registros faltantes con las columnas correctas
    for (const factura of result.rows) {
      console.log(`➡️  Procesando factura ${factura.numero_factura} (ID: ${factura.id})...`);

      // Insertar en facturas_electronicas con las columnas que existen
      await client.query(`
        INSERT INTO facturas_electronicas (
          factura_id,
          hospedaje_id,
          cliente_id,
          cliente_tipo_documento,
          cliente_numero_documento,
          cliente_nombre,
          cliente_email,
          cliente_telefono,
          cliente_direccion,
          fecha_emision,
          subtotal_hospedaje,
          subtotal_consumos,
          subtotal,
          total_impuestos,
          total_descuentos,
          total,
          factus_status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Created', NOW(), NOW())
      `, [
        factura.id,
        factura.hospedaje_id || null,
        factura.cliente_id,
        factura.tipo_documento || 'CC',
        factura.numero_documento || 'CONSUMIDOR FINAL',
        factura.nombre || 'CONSUMIDOR FINAL',
        factura.email,
        factura.telefono,
        factura.direccion,
        factura.fecha || factura.created_at,
        0,  // subtotal_hospedaje (0 para ventas POS)
        factura.subtotal || 0,  // subtotal_consumos (ventas POS = consumos)
        factura.subtotal || 0,
        factura.iva || 0,
        factura.descuento || 0,
        factura.total || 0
      ]);

      console.log(`   ✅ Registro creado para factura ${factura.numero_factura}`);
    }

    console.log(`\n✨ Se crearon ${result.rows.length} registros en facturas_electronicas`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixMissingFacturasElectronicas()
  .then(() => {
    console.log('\n🎉 Proceso completado!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Proceso falló:', err);
    process.exit(1);
  });
