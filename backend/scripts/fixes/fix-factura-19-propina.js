const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixFactura19() {
  try {
    console.log('🔧 Corrigiendo factura 19...\n');

    // Obtener datos completos
    const result = await pool.query(`
      SELECT
        fe.id as fe_id,
        fe.subtotal,
        fe.total_impuestos,
        fe.total,
        fe.items_consumos,
        f.propina as f_propina,
        vp.propina as vp_propina,
        vp.iva as vp_iva,
        vp.subtotal as vp_subtotal,
        vp.total as vp_total
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
      WHERE fe.id = 19
    `);

    if (result.rows.length === 0) {
      console.log('❌ Factura 19 no encontrada');
      await pool.end();
      return;
    }

    const fe = result.rows[0];
    console.log('📋 Datos de factura 19:');
    console.log(`  FE Subtotal: $${fe.subtotal}`);
    console.log(`  FE Impuestos: $${fe.total_impuestos}`);
    console.log(`  FE Total: $${fe.total}`);
    console.log(`  Propina (factura): $${fe.f_propina}`);
    console.log(`  Propina (venta_pos): $${fe.vp_propina}`);
    console.log(`  Venta subtotal: $${fe.vp_subtotal}`);
    console.log(`  Venta IVA: $${fe.vp_iva}`);
    console.log(`  Venta total: $${fe.vp_total}`);
    console.log('');

    const items = fe.items_consumos || [];
    console.log(`📦 Items actuales (${items.length}):`);

    let sumaSubtotal = 0;
    let sumaIVA = 0;
    let sumaTotal = 0;

    items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.descripcion}`);
      console.log(`     subtotal: $${item.subtotal}, iva: $${item.iva_monto}, total: $${item.total}`);
      sumaSubtotal += parseFloat(item.subtotal || 0);
      sumaIVA += parseFloat(item.iva_monto || 0);
      sumaTotal += parseFloat(item.total || 0);
    });

    console.log('');
    console.log(`📊 Suma items:`);
    console.log(`  Subtotal: $${sumaSubtotal.toFixed(2)}`);
    console.log(`  IVA: $${sumaIVA.toFixed(2)}`);
    console.log(`  Total: $${sumaTotal.toFixed(2)}`);
    console.log('');

    const totalFactura = parseFloat(fe.total);
    const propina = parseFloat(fe.vp_propina || 0);
    const diferencia = totalFactura - sumaTotal;

    console.log(`💡 Diferencia: $${diferencia.toFixed(2)}`);
    console.log(`   Propina: $${propina.toFixed(2)}`);
    console.log('');

    // Recalcular items con IVA correcto y agregar propina
    const subtotalItems = parseFloat(fe.vp_subtotal || fe.subtotal);
    const ivaTotal = parseFloat(fe.vp_iva || fe.total_impuestos);

    // Reconstruir items con IVA correcto
    const itemsCorregidos = items.map(item => {
      const itemSubtotal = parseFloat(item.subtotal);
      const proporcion = itemSubtotal / subtotalItems;
      const itemIVA = ivaTotal * proporcion;

      return {
        ...item,
        iva_porcentaje: 19,
        iva_monto: parseFloat(itemIVA.toFixed(2)),
        total: parseFloat((itemSubtotal + itemIVA).toFixed(2))
      };
    });

    // Agregar propina como item si existe
    if (propina > 0) {
      itemsCorregidos.push({
        codigo: 'PROPINA',
        descripcion: 'Propina / Servicio',
        cantidad: 1,
        precio_unitario: propina,
        iva_porcentaje: 0,
        iva_monto: 0,
        subtotal: propina,
        total: propina,
        tipo: 'servicio'
      });
      console.log(`  ✅ Agregando item PROPINA: $${propina.toFixed(2)}`);
    }

    // Calcular nueva suma
    let nuevaSumaTotal = 0;
    let nuevaSumaIVA = 0;
    console.log('\n📦 Items corregidos:');
    itemsCorregidos.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.descripcion}`);
      console.log(`     subtotal: $${item.subtotal}, iva: $${item.iva_monto}, total: $${item.total}`);
      nuevaSumaTotal += parseFloat(item.total);
      nuevaSumaIVA += parseFloat(item.iva_monto || 0);
    });

    console.log('');
    console.log(`📊 Nueva suma: $${nuevaSumaTotal.toFixed(2)}`);
    console.log(`   Total factura: $${totalFactura.toFixed(2)}`);
    console.log(`   Nueva suma IVA: $${nuevaSumaIVA.toFixed(2)}`);
    console.log(`   IVA factura: $${ivaTotal.toFixed(2)}`);

    const diferenciaFinal = Math.abs(nuevaSumaTotal - totalFactura);
    if (diferenciaFinal > 0.01) {
      console.log(`\n❌ Todavía hay diferencia: $${diferenciaFinal.toFixed(2)}`);
    } else {
      console.log(`\n✅ Totales cuadran!`);
    }

    // Actualizar en BD
    await pool.query(`
      UPDATE facturas_electronicas
      SET items_consumos = $1::jsonb,
          updated_at = NOW()
      WHERE id = 19
    `, [JSON.stringify(itemsCorregidos)]);

    console.log('\n✅ Factura 19 actualizada en BD');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

fixFactura19();
