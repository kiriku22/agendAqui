const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkIVA() {
  try {
    // Verificar venta POS y sus items
    const result = await pool.query(`
      SELECT
        vp.id as venta_id,
        vp.codigo,
        vp.subtotal as venta_subtotal,
        vp.iva as venta_iva,
        vp.total as venta_total,
        json_agg(
          json_build_object(
            'id', dv.id,
            'nombre', dv.nombre_item,
            'cantidad', dv.cantidad,
            'precio_unitario', dv.precio_unitario,
            'iva_porcentaje', dv.iva_porcentaje,
            'iva_monto', dv.iva_monto,
            'subtotal', dv.subtotal,
            'total', dv.total
          ) ORDER BY dv.id
        ) as items
      FROM ventas_pos vp
      INNER JOIN detalle_venta_pos dv ON dv.venta_pos_id = vp.id
      INNER JOIN facturas f ON f.id = vp.factura_id
      WHERE f.id = 17
      GROUP BY vp.id, vp.codigo, vp.subtotal, vp.iva, vp.total
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró la venta');
      await pool.end();
      return;
    }

    const venta = result.rows[0];
    console.log('=== ANÁLISIS DE IVA - VENTA POS ===\n');
    console.log('Código venta:', venta.codigo);
    console.log('Subtotal venta:', venta.venta_subtotal);
    console.log('IVA venta:', venta.venta_iva);
    console.log('Total venta:', venta.venta_total);
    console.log('');

    console.log('ITEMS:');
    let sumaSubtotales = 0;
    let sumaIVA = 0;
    let sumaTotales = 0;

    venta.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}: ${item.nombre}`);
      console.log(`  Cantidad: ${item.cantidad}`);
      console.log(`  Precio unitario: ${item.precio_unitario}`);
      console.log(`  IVA %: ${item.iva_porcentaje}`);
      console.log(`  IVA monto: ${item.iva_monto}`);
      console.log(`  Subtotal: ${item.subtotal}`);
      console.log(`  Total: ${item.total}`);

      sumaSubtotales += parseFloat(item.subtotal);
      sumaIVA += parseFloat(item.iva_monto);
      sumaTotales += parseFloat(item.total);
    });

    console.log('\n=== TOTALES ===');
    console.log('Suma subtotales items:', sumaSubtotales.toFixed(2));
    console.log('Suma IVA items:', sumaIVA.toFixed(2));
    console.log('Suma totales items:', sumaTotales.toFixed(2));
    console.log('');
    console.log('Subtotal venta:', parseFloat(venta.venta_subtotal).toFixed(2));
    console.log('IVA venta:', parseFloat(venta.venta_iva).toFixed(2));
    console.log('Total venta:', parseFloat(venta.venta_total).toFixed(2));
    console.log('');

    if (sumaIVA === 0 && parseFloat(venta.venta_iva) > 0) {
      console.log('⚠️  PROBLEMA DETECTADO:');
      console.log('   Los items tienen IVA = 0');
      console.log('   Pero la venta tiene IVA =', venta.venta_iva);
      console.log('   Esto causará error de validación en Factus!');
      console.log('');
      console.log('💡 SOLUCIÓN:');
      console.log('   El IVA debe estar distribuido en los items,');
      console.log('   o todos los items deben tener iva_porcentaje configurado.');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkIVA();
