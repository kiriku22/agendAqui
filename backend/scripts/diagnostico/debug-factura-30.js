const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function debugFactura() {
  try {
    console.log('═'.repeat(80));
    console.log('DEBUG: Factura Electrónica ID 30');
    console.log('═'.repeat(80));

    // 1. Obtener datos de la factura electrónica
    const feResult = await pool.query(`
      SELECT
        fe.*,
        f.numero_factura,
        f.tipo_factura,
        f.total as factura_total,
        f.subtotal as factura_subtotal,
        f.iva as factura_iva,
        f.cliente_id
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = 30
    `);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura electrónica 30 no encontrada');
      await pool.end();
      return;
    }

    const fe = feResult.rows[0];
    console.log('\n📋 DATOS DE FACTURA ELECTRÓNICA:');
    console.log('  ID:', fe.id);
    console.log('  Factura ID:', fe.factura_id);
    console.log('  Número:', fe.numero_factura);
    console.log('  Tipo:', fe.tipo_factura);
    console.log('  Total:', fe.factura_total);
    console.log('  CUFE:', fe.cufe || '(no transmitida)');

    console.log('\n👤 DATOS DEL CLIENTE EN FE:');
    console.log('  Nombre:', fe.cliente_nombre);
    console.log('  Documento:', fe.cliente_tipo_documento, fe.cliente_numero_documento);
    console.log('  Email:', fe.cliente_email);
    console.log('  Teléfono:', fe.cliente_telefono);
    console.log('  Dirección:', fe.cliente_direccion);
    console.log('  Municipio DANE:', fe.cliente_codigo_municipio_dane);

    // 2. Verificar si es venta POS o hospedaje
    if (fe.tipo_factura === 'venta_pos') {
      console.log('\n📦 ITEMS (detalle_venta_pos):');
      const itemsResult = await pool.query(`
        SELECT dvp.*, i.codigo
        FROM detalle_venta_pos dvp
        LEFT JOIN items_inventario i ON i.id = dvp.item_inventario_id
        INNER JOIN ventas_pos vp ON vp.id = dvp.venta_pos_id
        WHERE vp.factura_id = $1
      `, [fe.factura_id]);

      if (itemsResult.rows.length === 0) {
        console.log('  ❌ NO HAY ITEMS - Esto causará error de validación!');
      } else {
        itemsResult.rows.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.nombre_item}`);
          console.log(`     Cantidad: ${item.cantidad}, Precio: $${item.precio_unitario}`);
          console.log(`     IVA: ${item.iva_porcentaje}% = $${item.iva_monto}`);
          console.log(`     Total: $${item.total}`);
        });
      }
    } else if (fe.hospedaje_id) {
      console.log('\n🏨 ES FACTURA DE HOSPEDAJE');
      console.log('  Hospedaje ID:', fe.hospedaje_id);

      // Verificar datos del hospedaje
      const hospResult = await pool.query(`
        SELECT h.*, hab.numero as habitacion_numero
        FROM hospedajes h
        LEFT JOIN habitaciones hab ON hab.id = h.habitacion_id
        WHERE h.id = $1
      `, [fe.hospedaje_id]);

      if (hospResult.rows.length > 0) {
        const hosp = hospResult.rows[0];
        console.log('  Habitación:', hosp.habitacion_numero);
        console.log('  Noches:', hosp.noches_reales || hosp.noches_previstas);
        console.log('  Precio/noche:', hosp.precio_noche);
        console.log('  Huésped ID:', hosp.huesped_id);
      }
    }

    // 3. Verificar items_consumos guardados en la FE
    console.log('\n📦 ITEMS_CONSUMOS (en factura_electronica):');
    if (fe.items_consumos && fe.items_consumos.length > 0) {
      fe.items_consumos.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.descripcion || item.nombre_item}`);
        console.log(`     IVA: ${item.iva_porcentaje}% = $${item.iva_monto}`);
      });
    } else {
      console.log('  ❌ items_consumos está VACÍO o NULL');
    }

    // 4. Verificar métodos de pago
    console.log('\n💳 MÉTODOS DE PAGO (en factura_electronica):');
    if (fe.metodos_pago && fe.metodos_pago.length > 0) {
      fe.metodos_pago.forEach((mp, idx) => {
        console.log(`  ${idx + 1}. ${mp.metodo}: $${mp.monto}`);
      });
    } else {
      console.log('  ❌ metodos_pago está VACÍO o NULL');
    }

    // 5. Verificar datos del huésped si es hospedaje
    if (fe.hospedaje_id) {
      const hospResult = await pool.query(`
        SELECT huesped_id FROM hospedajes WHERE id = $1
      `, [fe.hospedaje_id]);

      if (hospResult.rows.length > 0) {
        const huespedResult = await pool.query(`
          SELECT * FROM huespedes WHERE id = $1
        `, [hospResult.rows[0].huesped_id]);

        if (huespedResult.rows.length > 0) {
          const huesped = huespedResult.rows[0];
          console.log('\n👤 DATOS DEL HUÉSPED:');
          console.log('  Nombre:', huesped.nombre_completo);
          console.log('  Documento:', huesped.tipo_documento, huesped.numero_documento);
          console.log('  tipo_documento_dian:', huesped.tipo_documento_dian || '(null)');
          console.log('  Email:', huesped.email);
          console.log('  Teléfono:', huesped.telefono);
        }
      }
    }

    // 6. Verificar configuración de Factus
    const configResult = await pool.query(`
      SELECT * FROM configuracion_factus WHERE activo = true LIMIT 1
    `);

    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      console.log('\n⚙️ CONFIGURACIÓN FACTUS:');
      console.log('  Ambiente:', config.ambiente);
      console.log('  Email facturación:', config.email_facturacion);
      console.log('  IVA hospedaje:', config.iva_hospedaje);
      console.log('  IVA consumos:', config.iva_consumos);
    }

    // 7. Resumen de posibles problemas
    console.log('\n' + '═'.repeat(80));
    console.log('RESUMEN DE POSIBLES PROBLEMAS:');
    console.log('═'.repeat(80));

    const problemas = [];

    if (!fe.cliente_nombre) problemas.push('❌ cliente_nombre NULL');
    if (!fe.cliente_numero_documento) problemas.push('❌ cliente_numero_documento NULL');
    if (!fe.cliente_email) problemas.push('⚠️ cliente_email NULL (usará config.email_facturacion)');
    if (!fe.cliente_codigo_municipio_dane) problemas.push('⚠️ cliente_codigo_municipio_dane NULL (usará 11001)');
    if (!fe.items_consumos || fe.items_consumos.length === 0) problemas.push('❌ items_consumos VACÍO');
    if (!fe.metodos_pago || fe.metodos_pago.length === 0) problemas.push('⚠️ metodos_pago VACÍO');

    if (problemas.length === 0) {
      console.log('✅ No se detectaron problemas obvios en los datos');
    } else {
      problemas.forEach(p => console.log(p));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

debugFactura();
