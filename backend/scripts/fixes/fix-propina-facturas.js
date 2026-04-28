const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixPropinaFacturas() {
  try {
    console.log('🔧 Corrigiendo facturas con propina...\n');

    // Buscar facturas con diferencia entre total y suma de items
    const facturasResult = await pool.query(`
      SELECT
        fe.id as fe_id,
        fe.numero_factura_electronica,
        fe.subtotal,
        fe.total_impuestos,
        fe.total,
        fe.items_consumos,
        f.propina,
        vp.propina as vp_propina,
        vp.id as venta_pos_id
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
      WHERE f.tipo_factura = 'venta_pos'
        AND fe.items_consumos IS NOT NULL
      ORDER BY fe.id
    `);

    console.log(`Analizando ${facturasResult.rows.length} facturas...\n`);

    for (const fe of facturasResult.rows) {
      const items = fe.items_consumos || [];
      const propina = parseFloat(fe.propina || fe.vp_propina || 0);

      if (propina <= 0) {
        continue; // No tiene propina
      }

      // Calcular suma de items
      let sumaItems = 0;
      items.forEach(item => {
        sumaItems += parseFloat(item.total || 0);
      });

      const totalFactura = parseFloat(fe.total);
      const diferencia = totalFactura - sumaItems;

      if (diferencia > 0.01) {
        console.log(`\n📄 Factura Electrónica ID ${fe.fe_id} (${fe.numero_factura_electronica}):`);
        console.log(`  Total factura: $${totalFactura.toFixed(2)}`);
        console.log(`  Suma items: $${sumaItems.toFixed(2)}`);
        console.log(`  Propina: $${propina.toFixed(2)}`);
        console.log(`  Diferencia: $${diferencia.toFixed(2)}`);

        // Agregar propina como item
        const itemPropina = {
          codigo: 'PROPINA',
          descripcion: 'Propina / Servicio',
          cantidad: 1,
          precio_unitario: propina,
          iva_porcentaje: 0,
          iva_monto: 0,
          subtotal: propina,
          total: propina,
          tipo: 'servicio'
        };

        const itemsActualizados = [...items, itemPropina];

        // Actualizar factura electrónica
        await pool.query(`
          UPDATE facturas_electronicas
          SET items_consumos = $1::jsonb,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(itemsActualizados), fe.fe_id]);

        console.log(`  ✅ Propina agregada como item adicional`);

        // Verificar suma
        let nuevaSuma = 0;
        itemsActualizados.forEach(item => {
          nuevaSuma += parseFloat(item.total || 0);
        });
        console.log(`  Nueva suma items: $${nuevaSuma.toFixed(2)}`);
      }
    }

    // También verificar factura 18
    console.log('\n\n📄 Verificando factura 18...');
    const fe18Result = await pool.query(`
      SELECT
        fe.id as fe_id,
        fe.subtotal,
        fe.total_impuestos,
        fe.total,
        fe.items_consumos,
        f.propina,
        vp.propina as vp_propina
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN ventas_pos vp ON vp.factura_id = f.id
      WHERE fe.id = 18
    `);

    if (fe18Result.rows.length > 0) {
      const fe18 = fe18Result.rows[0];
      const items18 = fe18.items_consumos || [];
      let suma18 = 0;
      items18.forEach(item => {
        suma18 += parseFloat(item.total || 0);
      });

      console.log(`  Total factura: $${parseFloat(fe18.total).toFixed(2)}`);
      console.log(`  Suma items: $${suma18.toFixed(2)}`);
      console.log(`  Propina: $${parseFloat(fe18.propina || fe18.vp_propina || 0).toFixed(2)}`);

      const dif18 = parseFloat(fe18.total) - suma18;
      if (dif18 > 0.01) {
        console.log(`  ❌ Diferencia: $${dif18.toFixed(2)} - NECESITA CORRECCIÓN`);
      } else {
        console.log(`  ✅ Totales cuadran correctamente`);
      }
    }

    console.log('\n\n🎉 Proceso completado!');
    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

fixPropinaFacturas();
