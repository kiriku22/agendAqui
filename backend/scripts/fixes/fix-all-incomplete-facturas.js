const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function fixAllIncompleteFacturas() {
  const client = await pool.connect();

  try {
    console.log('🔍 Identificando facturas incompletas...\n');

    // 1. Identificar todas las facturas con datos faltantes
    const incompletas = await client.query(`
      SELECT
        fe.id,
        fe.factura_id,
        fe.numero_factura_electronica,
        fe.cliente_id,
        fe.cliente_nombre,
        fe.cliente_email IS NULL as falta_email,
        fe.cliente_direccion IS NULL as falta_direccion,
        fe.cliente_codigo_municipio_dane IS NULL as falta_municipio,
        fe.items_consumos IS NULL as falta_items,
        fe.metodos_pago IS NULL as falta_metodos_pago,
        fe.total_impuestos,
        f.tipo_factura,
        f.id as factura_real_id
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE
        fe.cliente_email IS NULL
        OR fe.cliente_direccion IS NULL
        OR fe.cliente_codigo_municipio_dane IS NULL
        OR fe.items_consumos IS NULL
        OR fe.metodos_pago IS NULL
      ORDER BY fe.id
    `);

    console.log(`📋 Facturas incompletas encontradas: ${incompletas.rows.length}\n`);

    if (incompletas.rows.length === 0) {
      console.log('✅ No hay facturas incompletas para corregir');
      await client.release();
      await pool.end();
      return;
    }

    // Mostrar resumen
    incompletas.rows.forEach(fe => {
      console.log(`Factura Electrónica ID ${fe.id} (${fe.numero_factura_electronica}):`);
      if (fe.falta_email) console.log('  ❌ Falta email');
      if (fe.falta_direccion) console.log('  ❌ Falta dirección');
      if (fe.falta_municipio) console.log('  ❌ Falta municipio DANE');
      if (fe.falta_items) console.log('  ❌ Falta items_consumos');
      if (fe.falta_metodos_pago) console.log('  ❌ Falta metodos_pago');
      console.log('');
    });

    console.log('🔧 Iniciando corrección...\n');

    // 2. Corregir cada factura
    for (const fe of incompletas.rows) {
      console.log(`\n📝 Procesando Factura Electrónica ID ${fe.id}...`);

      // Obtener datos del cliente
      let clienteEmail = null;
      let clienteTelefono = null;
      let clienteDireccion = null;
      let clienteMunicipio = '11001'; // Bogotá por defecto

      if (fe.cliente_id) {
        const clienteResult = await client.query(`
          SELECT email, telefono, direccion
          FROM clientes
          WHERE id = $1
        `, [fe.cliente_id]);

        if (clienteResult.rows.length > 0) {
          const cliente = clienteResult.rows[0];
          clienteEmail = cliente.email;
          clienteTelefono = cliente.telefono;
          clienteDireccion = cliente.direccion;
        }
      }

      // Si no hay email del cliente, usar email de configuración
      if (!clienteEmail) {
        const configResult = await client.query(`
          SELECT email_facturacion
          FROM configuracion_factus
          WHERE activo = true
          LIMIT 1
        `);
        if (configResult.rows.length > 0) {
          clienteEmail = configResult.rows[0].email_facturacion;
        }
      }

      console.log(`  Email: ${clienteEmail || 'No disponible'}`);
      console.log(`  Dirección: ${clienteDireccion || 'No especificada'}`);

      // Obtener items de venta POS si aplica
      let items = [];
      if (fe.tipo_factura === 'venta_pos') {
        const itemsResult = await client.query(`
          SELECT
            dv.codigo_item,
            dv.nombre_item,
            dv.cantidad,
            dv.precio_unitario,
            dv.iva_porcentaje,
            dv.iva_monto,
            dv.subtotal,
            dv.total,
            dv.tipo_item
          FROM facturas f
          INNER JOIN ventas_pos vp ON vp.factura_id = f.id
          INNER JOIN detalle_venta_pos dv ON dv.venta_pos_id = vp.id
          WHERE f.id = $1
          ORDER BY dv.id
        `, [fe.factura_id]);

        items = itemsResult.rows.map(item => ({
          codigo: item.codigo_item,
          descripcion: item.nombre_item,
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          iva_porcentaje: parseFloat(item.iva_porcentaje || 0),
          iva_monto: parseFloat(item.iva_monto || 0),
          subtotal: parseFloat(item.subtotal),
          total: parseFloat(item.total),
          tipo: item.tipo_item
        }));

        // Si los items tienen IVA = 0 pero la factura tiene impuestos, distribuir
        const sumaIVAItems = items.reduce((sum, item) => sum + item.iva_monto, 0);
        const totalImpuestos = parseFloat(fe.total_impuestos || 0);

        if (sumaIVAItems === 0 && totalImpuestos > 0 && items.length > 0) {
          console.log(`  ⚠️  Distribuyendo IVA ${totalImpuestos} entre ${items.length} items...`);

          const subtotalTotal = items.reduce((sum, item) => sum + item.subtotal, 0);

          items = items.map((item, index) => {
            const proporcion = item.subtotal / subtotalTotal;
            const ivaItem = totalImpuestos * proporcion;
            const ivaPorcentaje = (ivaItem / item.subtotal) * 100;

            return {
              ...item,
              iva_porcentaje: parseFloat(ivaPorcentaje.toFixed(2)),
              iva_monto: parseFloat(ivaItem.toFixed(2)),
              total: parseFloat((item.subtotal + ivaItem).toFixed(2))
            };
          });

          // Ajustar diferencias de redondeo en el primer item
          const nuevaSumaIVA = items.reduce((sum, item) => sum + item.iva_monto, 0);
          if (Math.abs(nuevaSumaIVA - totalImpuestos) > 0.01) {
            const diferencia = totalImpuestos - nuevaSumaIVA;
            items[0].iva_monto = parseFloat((items[0].iva_monto + diferencia).toFixed(2));
            items[0].total = parseFloat((items[0].total + diferencia).toFixed(2));
          }

          console.log(`  ✅ IVA distribuido correctamente`);
        }

        console.log(`  Items encontrados: ${items.length}`);
      }

      // Obtener métodos de pago
      let metodosPago = [];
      if (fe.tipo_factura === 'venta_pos') {
        const pagosResult = await client.query(`
          SELECT
            vpp.metodo_pago_id,
            mp.nombre as metodo,
            vpp.monto,
            vpp.referencia
          FROM facturas f
          INNER JOIN ventas_pos vp ON vp.factura_id = f.id
          INNER JOIN venta_pos_pagos vpp ON vpp.venta_pos_id = vp.id
          INNER JOIN metodos_pago mp ON mp.id = vpp.metodo_pago_id
          WHERE f.id = $1
          ORDER BY vpp.id
        `, [fe.factura_id]);

        metodosPago = pagosResult.rows.map(pago => ({
          metodo_pago_id: pago.metodo_pago_id,
          metodo: pago.metodo,
          monto: parseFloat(pago.monto),
          referencia: pago.referencia
        }));

        console.log(`  Métodos de pago encontrados: ${metodosPago.length}`);
      }

      // Actualizar factura electrónica
      const updateResult = await client.query(`
        UPDATE facturas_electronicas
        SET
          cliente_email = COALESCE(cliente_email, $1),
          cliente_telefono = COALESCE(cliente_telefono, $2),
          cliente_direccion = COALESCE(cliente_direccion, $3),
          cliente_codigo_municipio_dane = COALESCE(cliente_codigo_municipio_dane, $4),
          items_consumos = COALESCE(items_consumos, $5::jsonb),
          metodos_pago = COALESCE(metodos_pago, $6::jsonb),
          updated_at = NOW()
        WHERE id = $7
        RETURNING id
      `, [
        clienteEmail,
        clienteTelefono || '',
        clienteDireccion || 'No especificada',
        clienteMunicipio,
        JSON.stringify(items),
        JSON.stringify(metodosPago),
        fe.id
      ]);

      if (updateResult.rowCount > 0) {
        console.log(`  ✅ Factura ${fe.id} corregida exitosamente`);
      } else {
        console.log(`  ❌ Error al actualizar factura ${fe.id}`);
      }
    }

    console.log('\n\n🎉 Proceso completado!');
    console.log(`Total facturas corregidas: ${incompletas.rows.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllIncompleteFacturas();
