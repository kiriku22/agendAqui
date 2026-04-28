const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkFactura18() {
  try {
    console.log('=== DATOS FACTURA ELECTRÓNICA ID 18 ===\n');

    // Obtener factura electrónica completa
    const feResult = await pool.query(`
      SELECT
        fe.*,
        f.numero_factura,
        f.fecha,
        f.total,
        f.subtotal,
        f.cliente_id,
        f.hospedaje_id
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = 18
    `);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura electrónica ID 18 no encontrada');
      await pool.end();
      return;
    }

    const fe = feResult.rows[0];
    console.log('📄 FACTURA ELECTRÓNICA:');
    console.log('  ID:', fe.id);
    console.log('  factura_id:', fe.factura_id);
    console.log('  prefijo:', fe.prefijo);
    console.log('  numero:', fe.numero);
    console.log('  numero_factura_electronica:', fe.numero_factura_electronica);
    console.log('  numero_factura (interno):', fe.numero_factura);
    console.log('  fecha:', fe.fecha);
    console.log('  total:', fe.total);
    console.log('  subtotal:', fe.subtotal);
    console.log('  cliente_id:', fe.cliente_id);
    console.log('  hospedaje_id:', fe.hospedaje_id);
    console.log('  cufe:', fe.cufe);
    console.log('  factus_status:', fe.factus_status);
    console.log('  cliente_nombre:', fe.cliente_nombre);
    console.log('  cliente_numero_documento:', fe.cliente_numero_documento);
    console.log('  cliente_tipo_documento:', fe.cliente_tipo_documento);
    console.log('\n');

    // Verificar cliente
    if (fe.cliente_id) {
      const clienteResult = await pool.query(`
        SELECT * FROM clientes WHERE id = $1
      `, [fe.cliente_id]);

      if (clienteResult.rows.length > 0) {
        const cliente = clienteResult.rows[0];
        console.log('👤 CLIENTE:');
        console.log('  nombre:', cliente.nombre);
        console.log('  tipo_documento:', cliente.tipo_documento);
        console.log('  numero_documento:', cliente.numero_documento);
        console.log('  email:', cliente.email);
        console.log('  telefono:', cliente.telefono);
        console.log('  direccion:', cliente.direccion);
        console.log('\n');
      }
    }

    // Verificar hospedaje y huésped
    if (fe.hospedaje_id) {
      const hospedajeResult = await pool.query(`
        SELECT
          ho.*,
          h.nombre as huesped_nombre,
          h.tipo_documento as huesped_tipo_doc,
          h.numero_documento as huesped_num_doc,
          h.cliente_id as huesped_cliente_id
        FROM hospedajes ho
        LEFT JOIN huespedes h ON h.id = ho.huesped_id
        WHERE ho.id = $1
      `, [fe.hospedaje_id]);

      if (hospedajeResult.rows.length > 0) {
        const hosp = hospedajeResult.rows[0];
        console.log('🏨 HOSPEDAJE:');
        console.log('  codigo:', hosp.codigo);
        console.log('  huésped:', hosp.huesped_nombre);
        console.log('  tipo doc:', hosp.huesped_tipo_doc);
        console.log('  num doc:', hosp.huesped_num_doc);
        console.log('\n');
      }
    }

    // Verificar items de la factura (desde venta POS)
    const ventaResult = await pool.query(`
      SELECT * FROM ventas_pos WHERE factura_id = $1
    `, [fe.factura_id]);

    let itemsResult = { rows: [] };
    if (ventaResult.rows.length > 0) {
      const venta = ventaResult.rows[0];
      console.log('🛒 VENTA POS:');
      console.log('  codigo:', venta.codigo);
      console.log('  tipo_cliente:', venta.tipo_cliente);
      console.log('  subtotal:', venta.subtotal);
      console.log('  iva:', venta.iva);
      console.log('  total:', venta.total);
      console.log('\n');

      itemsResult = await pool.query(`
        SELECT
          dv.*,
          i.nombre as item_nombre_bd,
          i.codigo as item_codigo_bd
        FROM detalle_venta_pos dv
        LEFT JOIN items_inventario i ON i.id = dv.item_inventario_id
        WHERE dv.venta_pos_id = $1
        ORDER BY dv.id
      `, [venta.id]);
    }

    console.log('📦 ITEMS DE LA FACTURA (' + itemsResult.rows.length + ' items):');
    itemsResult.rows.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`);
      console.log('    nombre_item:', item.nombre_item);
      console.log('    codigo_item:', item.codigo_item);
      console.log('    tipo_item:', item.tipo_item);
      console.log('    cantidad:', item.cantidad);
      console.log('    precio_unitario:', item.precio_unitario);
      console.log('    iva_porcentaje:', item.iva_porcentaje);
      console.log('    iva_monto:', item.iva_monto);
      console.log('    subtotal:', item.subtotal);
      console.log('    total:', item.total);
      console.log('    item_inventario_id:', item.item_inventario_id);
    });
    console.log('\n');

    // Verificar snapshot de datos
    console.log('📸 SNAPSHOTS:');
    console.log('  datos_cliente_snapshot:', fe.datos_cliente_snapshot ? 'SÍ' : 'NO');
    console.log('  datos_factura_snapshot:', fe.datos_factura_snapshot ? 'SÍ' : 'NO');

    if (fe.datos_cliente_snapshot) {
      console.log('\n  Cliente Snapshot:', JSON.stringify(fe.datos_cliente_snapshot, null, 2));
    }

    if (fe.datos_factura_snapshot) {
      console.log('\n  Factura Snapshot:', JSON.stringify(fe.datos_factura_snapshot, null, 2));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

checkFactura18();
