const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixFactura18() {
  try {
    console.log('🔧 Arreglando factura electrónica ID 18...\n');

    // 1. Obtener datos del cliente
    const clienteResult = await pool.query(`
      SELECT
        c.email,
        c.telefono,
        c.direccion,
        '11001' as municipio_dane,  -- Bogotá por defecto
        cf.email_facturacion
      FROM facturas_electronicas fe
      INNER JOIN clientes c ON c.id = fe.cliente_id
      CROSS JOIN configuracion_factus cf
      WHERE fe.id = 18 AND cf.activo = true
    `);

    if (clienteResult.rows.length === 0) {
      console.log('❌ No se encontró la factura o el cliente');
      await pool.end();
      return;
    }

    const cliente = clienteResult.rows[0];
    console.log('📋 Datos del cliente encontrados:');
    console.log('  email:', cliente.email || cliente.email_facturacion);
    console.log('  telefono:', cliente.telefono || 'No especificado');
    console.log('  direccion:', cliente.direccion || 'No especificada');
    console.log('  municipio_dane:', cliente.municipio_dane);
    console.log('');

    // 2. Obtener items de la venta POS
    const itemsResult = await pool.query(`
      SELECT
        json_agg(
          json_build_object(
            'codigo', dv.codigo_item,
            'descripcion', dv.nombre_item,
            'cantidad', dv.cantidad,
            'precio_unitario', dv.precio_unitario,
            'iva_porcentaje', dv.iva_porcentaje,
            'iva_monto', dv.iva_monto,
            'subtotal', dv.subtotal,
            'total', dv.total,
            'tipo', dv.tipo_item
          )
          ORDER BY dv.id
        ) as items
      FROM facturas f
      INNER JOIN ventas_pos vp ON vp.factura_id = f.id
      INNER JOIN detalle_venta_pos dv ON dv.venta_pos_id = vp.id
      WHERE f.id = 17
      GROUP BY f.id
    `);

    const items = itemsResult.rows[0]?.items || [];
    console.log(`📦 Items encontrados: ${items.length} items\n`);

    // 3. Obtener métodos de pago
    const pagosResult = await pool.query(`
      SELECT
        json_agg(
          json_build_object(
            'metodo_pago_id', vpp.metodo_pago_id,
            'metodo', mp.nombre,
            'monto', vpp.monto,
            'referencia', vpp.referencia
          )
          ORDER BY vpp.id
        ) as metodos_pago
      FROM facturas f
      INNER JOIN ventas_pos vp ON vp.factura_id = f.id
      INNER JOIN venta_pos_pagos vpp ON vpp.venta_pos_id = vp.id
      INNER JOIN metodos_pago mp ON mp.id = vpp.metodo_pago_id
      WHERE f.id = 17
      GROUP BY f.id
    `);

    const metodosPago = pagosResult.rows[0]?.metodos_pago || [];
    console.log(`💳 Métodos de pago encontrados: ${metodosPago.length} métodos\n`);

    // 4. Actualizar factura electrónica
    const updateResult = await pool.query(`
      UPDATE facturas_electronicas
      SET
        cliente_email = $1,
        cliente_telefono = $2,
        cliente_direccion = $3,
        cliente_codigo_municipio_dane = $4,
        items_consumos = $5::jsonb,
        metodos_pago = $6::jsonb,
        updated_at = NOW()
      WHERE id = 18
      RETURNING id
    `, [
      cliente.email || cliente.email_facturacion,
      cliente.telefono || '',
      cliente.direccion || 'No especificada',
      cliente.municipio_dane,
      JSON.stringify(items),
      JSON.stringify(metodosPago)
    ]);

    if (updateResult.rowCount > 0) {
      console.log('✅ Factura electrónica ID 18 actualizada correctamente!\n');
      console.log('Ahora puedes intentar transmitir la factura nuevamente.');
    } else {
      console.log('❌ No se pudo actualizar la factura');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixFactura18();
