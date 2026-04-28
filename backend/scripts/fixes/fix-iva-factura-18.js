const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixIVA() {
  try {
    console.log('🔧 Corrigiendo distribución de IVA en factura 18...\n');

    // Obtener datos actuales
    const result = await pool.query(`
      SELECT
        fe.items_consumos,
        fe.total_impuestos,
        fe.subtotal
      FROM facturas_electronicas fe
      WHERE fe.id = 18
    `);

    if (result.rows.length === 0) {
      console.log('❌ Factura no encontrada');
      await pool.end();
      return;
    }

    const fe = result.rows[0];
    const items = fe.items_consumos;
    const totalIVA = parseFloat(fe.total_impuestos);
    const subtotal = parseFloat(fe.subtotal);

    console.log('Items originales:', items.length);
    console.log('Total IVA a distribuir:', totalIVA);
    console.log('Subtotal:', subtotal);
    console.log('');

    // Calcular IVA proporcional para cada item
    // El IVA se distribuye proporcionalmente según el subtotal de cada item
    const itemsCorregidos = items.map(item => {
      const subtotalItem = parseFloat(item.subtotal);
      const proporcion = subtotalItem / subtotal;
      const ivaItem = totalIVA * proporcion;
      const ivaPorcentaje = (ivaItem / subtotalItem) * 100;

      console.log(`Item: ${item.descripcion}`);
      console.log(`  Subtotal: ${subtotalItem}`);
      console.log(`  Proporción: ${(proporcion * 100).toFixed(2)}%`);
      console.log(`  IVA calculado: ${ivaItem.toFixed(2)}`);
      console.log(`  IVA %: ${ivaPorcentaje.toFixed(2)}%`);
      console.log(`  Total: ${(subtotalItem + ivaItem).toFixed(2)}`);
      console.log('');

      return {
        ...item,
        iva_porcentaje: parseFloat(ivaPorcentaje.toFixed(2)),
        iva_monto: parseFloat(ivaItem.toFixed(2)),
        total: parseFloat((subtotalItem + ivaItem).toFixed(2))
      };
    });

    // Verificar que la suma de IVA cuadre
    const sumaIVA = itemsCorregidos.reduce((sum, item) => sum + item.iva_monto, 0);
    console.log('=== VERIFICACIÓN ===');
    console.log('Suma IVA items corregidos:', sumaIVA.toFixed(2));
    console.log('Total IVA factura:', totalIVA.toFixed(2));
    console.log('Diferencia:', Math.abs(sumaIVA - totalIVA).toFixed(2));
    console.log('');

    // Ajustar diferencia por redondeo en el primer item
    if (Math.abs(sumaIVA - totalIVA) > 0.01) {
      const diferencia = totalIVA - sumaIVA;
      itemsCorregidos[0].iva_monto += diferencia;
      itemsCorregidos[0].total += diferencia;
      console.log('⚠️  Ajustando diferencia de redondeo:', diferencia.toFixed(2));
      console.log('');
    }

    // Actualizar factura electrónica
    await pool.query(`
      UPDATE facturas_electronicas
      SET
        items_consumos = $1::jsonb,
        updated_at = NOW()
      WHERE id = 18
    `, [JSON.stringify(itemsCorregidos)]);

    console.log('✅ Items corregidos y guardados!');
    console.log('');
    console.log('Items finales:');
    console.log(JSON.stringify(itemsCorregidos, null, 2));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixIVA();
