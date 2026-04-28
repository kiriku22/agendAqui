const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function validarFactura(feId) {
  try {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📄 ANÁLISIS COMPLETO - FACTURA ELECTRÓNICA ID ${feId}`);
    console.log(`${'═'.repeat(70)}\n`);

    // 1. Obtener factura electrónica
    const feResult = await pool.query(`
      SELECT fe.*
      FROM facturas_electronicas fe
      WHERE fe.id = $1
    `, [feId]);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura electrónica no encontrada');
      return;
    }

    const fe = feResult.rows[0];

    // 2. Obtener factura original
    const facturaResult = await pool.query(`
      SELECT f.*, c.nombre as cliente_bd_nombre, c.numero_documento as cliente_bd_doc,
             c.tipo_documento as cliente_bd_tipo, c.email as cliente_bd_email
      FROM facturas f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = $1
    `, [fe.factura_id]);

    const factura = facturaResult.rows[0];

    // 3. Obtener venta POS
    const ventaResult = await pool.query(`
      SELECT vp.*, c.nombre as cliente_vp_nombre, c.numero_documento as cliente_vp_doc
      FROM ventas_pos vp
      LEFT JOIN clientes c ON c.id = vp.cliente_id
      WHERE vp.factura_id = $1
    `, [fe.factura_id]);

    const venta = ventaResult.rows[0];

    // 4. Mostrar datos
    console.log('📋 FACTURA ELECTRÓNICA (fe):');
    console.log(`  cliente_id: ${fe.cliente_id}`);
    console.log(`  cliente_nombre: "${fe.cliente_nombre}"`);
    console.log(`  cliente_tipo_documento: "${fe.cliente_tipo_documento}"`);
    console.log(`  cliente_numero_documento: "${fe.cliente_numero_documento}"`);
    console.log(`  cliente_email: "${fe.cliente_email}"`);
    console.log(`  cliente_direccion: "${fe.cliente_direccion}"`);
    console.log(`  cliente_codigo_municipio_dane: "${fe.cliente_codigo_municipio_dane}"`);
    console.log('');

    console.log('📋 FACTURA ORIGINAL (f):');
    console.log(`  id: ${factura?.id}`);
    console.log(`  cliente_id: ${factura?.cliente_id}`);
    console.log(`  cliente en BD: "${factura?.cliente_bd_nombre}" - ${factura?.cliente_bd_tipo} ${factura?.cliente_bd_doc}`);
    console.log(`  subtotal: $${factura?.subtotal}`);
    console.log(`  iva: $${factura?.iva}`);
    console.log(`  propina: $${factura?.propina}`);
    console.log(`  total: $${factura?.total}`);
    console.log('');

    console.log('🛒 VENTA POS (vp):');
    if (venta) {
      console.log(`  id: ${venta.id}`);
      console.log(`  codigo: ${venta.codigo}`);
      console.log(`  cliente_id: ${venta.cliente_id}`);
      console.log(`  cliente en BD: "${venta.cliente_vp_nombre}" - ${venta.cliente_vp_doc}`);
      console.log(`  tipo_cliente: ${venta.tipo_cliente}`);
      console.log(`  subtotal: $${venta.subtotal}`);
      console.log(`  iva: $${venta.iva}`);
      console.log(`  propina: $${venta.propina}`);
      console.log(`  total: $${venta.total}`);
    } else {
      console.log('  ❌ No hay venta POS asociada');
    }
    console.log('');

    // 5. Obtener detalles de venta POS (items reales en BD)
    if (venta) {
      const detallesResult = await pool.query(`
        SELECT * FROM detalle_venta_pos WHERE venta_pos_id = $1 ORDER BY id
      `, [venta.id]);

      console.log(`📦 ITEMS EN BD (detalle_venta_pos) - ${detallesResult.rows.length} items:`);
      let sumaSubtotal = 0;
      let sumaIVA = 0;
      let sumaTotal = 0;

      detallesResult.rows.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.nombre_item}`);
        console.log(`     cantidad: ${item.cantidad}, precio: $${item.precio_unitario}`);
        console.log(`     iva_porcentaje: ${item.iva_porcentaje}%, iva_monto: $${item.iva_monto}`);
        console.log(`     subtotal: $${item.subtotal}, total: $${item.total}`);

        sumaSubtotal += parseFloat(item.subtotal || 0);
        sumaIVA += parseFloat(item.iva_monto || 0);
        sumaTotal += parseFloat(item.total || 0);
      });

      console.log(`  ─────────────────────────────`);
      console.log(`  Suma subtotales: $${sumaSubtotal.toFixed(2)}`);
      console.log(`  Suma IVA: $${sumaIVA.toFixed(2)}`);
      console.log(`  Suma totales: $${sumaTotal.toFixed(2)}`);
      console.log('');
    }

    // 6. Mostrar items en JSON de factura electrónica
    console.log(`📦 ITEMS EN JSON (fe.items_consumos) - ${fe.items_consumos?.length || 0} items:`);
    if (fe.items_consumos) {
      let sumaJsonSubtotal = 0;
      let sumaJsonIVA = 0;
      let sumaJsonTotal = 0;

      fe.items_consumos.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.descripcion} [${item.codigo}]`);
        console.log(`     cantidad: ${item.cantidad}, precio: $${item.precio_unitario}`);
        console.log(`     iva_porcentaje: ${item.iva_porcentaje}%, iva_monto: $${item.iva_monto}`);
        console.log(`     subtotal: $${item.subtotal}, total: $${item.total}`);

        sumaJsonSubtotal += parseFloat(item.subtotal || 0);
        sumaJsonIVA += parseFloat(item.iva_monto || 0);
        sumaJsonTotal += parseFloat(item.total || 0);
      });

      console.log(`  ─────────────────────────────`);
      console.log(`  Suma subtotales: $${sumaJsonSubtotal.toFixed(2)}`);
      console.log(`  Suma IVA: $${sumaJsonIVA.toFixed(2)}`);
      console.log(`  Suma totales: $${sumaJsonTotal.toFixed(2)}`);
    }
    console.log('');

    // 7. Validaciones
    console.log('⚠️  VALIDACIONES:');

    // Validar propina
    const propina = parseFloat(venta?.propina || factura?.propina || 0);
    if (propina > 0) {
      const tieneItemPropina = fe.items_consumos?.some(item =>
        item.codigo === 'PROPINA' || item.descripcion?.toLowerCase().includes('propina')
      );
      if (tieneItemPropina) {
        console.log(`  ✅ Propina $${propina} incluida como item`);
      } else {
        console.log(`  ❌ PROPINA $${propina} NO está incluida en items!`);
      }
    } else {
      console.log(`  ✅ Sin propina`);
    }

    // Validar totales
    const totalItems = fe.items_consumos?.reduce((sum, item) => sum + parseFloat(item.total || 0), 0) || 0;
    const totalFactura = parseFloat(fe.total);
    const diferencia = Math.abs(totalItems - totalFactura);

    if (diferencia > 0.01) {
      console.log(`  ❌ TOTALES NO CUADRAN: Items=$${totalItems.toFixed(2)} vs Factura=$${totalFactura.toFixed(2)} (dif: $${diferencia.toFixed(2)})`);
    } else {
      console.log(`  ✅ Totales cuadran: Items=$${totalItems.toFixed(2)} = Factura=$${totalFactura.toFixed(2)}`);
    }

    // Validar IVA
    const ivaItems = fe.items_consumos?.reduce((sum, item) => sum + parseFloat(item.iva_monto || 0), 0) || 0;
    const ivaFactura = parseFloat(fe.total_impuestos);
    const difIVA = Math.abs(ivaItems - ivaFactura);

    if (difIVA > 0.01) {
      console.log(`  ❌ IVA NO CUADRA: Items=$${ivaItems.toFixed(2)} vs Factura=$${ivaFactura.toFixed(2)} (dif: $${difIVA.toFixed(2)})`);
    } else {
      console.log(`  ✅ IVA cuadra: Items=$${ivaItems.toFixed(2)} = Factura=$${ivaFactura.toFixed(2)}`);
    }

    // Validar cliente
    if (!fe.cliente_nombre || fe.cliente_nombre === 'CONSUMIDOR FINAL') {
      console.log(`  ⚠️  Cliente genérico: "${fe.cliente_nombre}"`);
    } else {
      console.log(`  ✅ Cliente específico: "${fe.cliente_nombre}"`);
    }

    if (!fe.cliente_numero_documento || fe.cliente_numero_documento === '222222222222') {
      console.log(`  ⚠️  Documento genérico: "${fe.cliente_numero_documento}"`);
    } else {
      console.log(`  ✅ Documento específico: "${fe.cliente_numero_documento}"`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  await validarFactura(18);
  await validarFactura(19);
  await pool.end();
}

main();
