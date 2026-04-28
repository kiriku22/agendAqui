const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkVenta() {
  try {
    console.log('🔍 Verificando venta POS de factura 19...\n');

    // Obtener la factura
    const facturaResult = await pool.query(`
      SELECT f.*, fe.id as fe_id
      FROM facturas f
      INNER JOIN facturas_electronicas fe ON fe.factura_id = f.id
      WHERE fe.id = 19
    `);

    if (facturaResult.rows.length === 0) {
      console.log('❌ Factura no encontrada');
      await pool.end();
      return;
    }

    const factura = facturaResult.rows[0];
    console.log('📋 FACTURA:');
    console.log(`  ID: ${factura.id}`);
    console.log(`  Número: ${factura.numero_factura}`);
    console.log(`  Subtotal: $${factura.subtotal}`);
    console.log(`  IVA: $${factura.iva}`);
    console.log(`  Descuento: $${factura.descuento}`);
    console.log(`  Propina: $${factura.propina}`);
    console.log(`  Total: $${factura.total}`);
    console.log(`  Tipo: ${factura.tipo_factura}`);
    console.log('');

    // Obtener venta POS
    const ventaResult = await pool.query(`
      SELECT * FROM ventas_pos WHERE factura_id = $1
    `, [factura.id]);

    if (ventaResult.rows.length === 0) {
      console.log('❌ Venta POS no encontrada');
      await pool.end();
      return;
    }

    const venta = ventaResult.rows[0];
    console.log('🛒 VENTA POS:');
    console.log(`  ID: ${venta.id}`);
    console.log(`  Código: ${venta.codigo}`);
    console.log(`  Subtotal: $${venta.subtotal}`);
    console.log(`  IVA: $${venta.iva}`);
    console.log(`  Descuento monto: $${venta.descuento_monto}`);
    console.log(`  Propina: $${venta.propina}`);
    console.log(`  Total: $${venta.total}`);
    console.log(`  Estado: ${venta.estado_pago}`);
    console.log('');

    // Obtener detalles de venta
    const detallesResult = await pool.query(`
      SELECT * FROM detalle_venta_pos WHERE venta_pos_id = $1
    `, [venta.id]);

    console.log(`📦 DETALLES DE VENTA (${detallesResult.rows.length} items):`);
    let sumaSubtotal = 0;
    let sumaIVA = 0;
    let sumaTotal = 0;

    detallesResult.rows.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.nombre_item}`);
      console.log(`     Cantidad: ${item.cantidad}, Precio: $${item.precio_unitario}`);
      console.log(`     IVA %: ${item.iva_porcentaje}, IVA monto: $${item.iva_monto}`);
      console.log(`     Subtotal: $${item.subtotal}, Total: $${item.total}`);

      sumaSubtotal += parseFloat(item.subtotal);
      sumaIVA += parseFloat(item.iva_monto || 0);
      sumaTotal += parseFloat(item.total);
    });

    console.log('');
    console.log('📊 SUMA DE ITEMS:');
    console.log(`  Suma subtotales: $${sumaSubtotal.toFixed(2)}`);
    console.log(`  Suma IVA: $${sumaIVA.toFixed(2)}`);
    console.log(`  Suma totales: $${sumaTotal.toFixed(2)}`);
    console.log('');

    // Calcular la diferencia
    const diferencia = parseFloat(factura.total) - sumaTotal;
    console.log(`💡 ANÁLISIS:`);
    console.log(`  Total factura: $${factura.total}`);
    console.log(`  Suma items: $${sumaTotal.toFixed(2)}`);
    console.log(`  Diferencia: $${diferencia.toFixed(2)}`);

    if (diferencia > 0.01) {
      console.log('');
      console.log('⚠️  HAY UNA DIFERENCIA NO EXPLICADA');
      console.log('   Esto podría ser propina u otro cargo que');
      console.log('   no está incluido en los items de la factura electrónica.');
      console.log('');
      console.log('   Para Factus, la suma de items debe coincidir con el total.');
    }

    // Verificar qué espera Factus
    console.log('\n🎯 PARA FACTUS:');
    console.log('   La suma de (precio * cantidad) + IVA de cada item');
    console.log('   DEBE ser igual al total de la factura.');
    console.log('');
    console.log('   Solución: Agregar item "Propina" o "Cargo adicional"');
    console.log('   por la diferencia de $' + diferencia.toFixed(2));

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkVenta();
