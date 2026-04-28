const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function diagnosticarFacturas() {
  try {
    console.log('🔍 DIAGNÓSTICO DE FACTURAS CON ERROR DE VALIDACIÓN\n');
    console.log('═'.repeat(80));

    // Buscar facturas electrónicas recientes que no se han transmitido exitosamente
    const facturasResult = await pool.query(`
      SELECT
        fe.id,
        fe.factura_id,
        fe.numero_factura_electronica,
        fe.prefijo,
        fe.numero,
        fe.cliente_id,
        fe.cliente_nombre,
        fe.cliente_numero_documento,
        fe.cliente_tipo_documento,
        fe.cliente_email,
        fe.cliente_telefono,
        fe.cliente_direccion,
        fe.cliente_codigo_municipio_dane,
        fe.factus_status,
        fe.items_consumos,
        fe.metodos_pago,
        fe.total,
        fe.total_impuestos,
        f.tipo_factura,
        c.nombre as cliente_bd_nombre,
        c.email as cliente_bd_email,
        c.telefono as cliente_bd_telefono,
        c.direccion as cliente_bd_direccion,
        c.codigo_municipio_dane as cliente_bd_municipio
      FROM facturas_electronicas fe
      LEFT JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN clientes c ON c.id = fe.cliente_id
      WHERE fe.factus_status IN ('Created', 'pending', 'error') OR fe.factus_status IS NULL
      ORDER BY fe.id DESC
      LIMIT 10
    `);

    if (facturasResult.rows.length === 0) {
      console.log('✅ No hay facturas pendientes de transmisión');
      await pool.end();
      return;
    }

    for (const fe of facturasResult.rows) {
      console.log(`\n📄 FACTURA ELECTRÓNICA ID: ${fe.id}`);
      console.log('─'.repeat(80));

      console.log('\n📋 DATOS DE LA FACTURA:');
      console.log(`  Número: ${fe.numero_factura_electronica}`);
      console.log(`  Prefijo: ${fe.prefijo}`);
      console.log(`  Número secuencial: ${fe.numero}`);
      console.log(`  Tipo: ${fe.tipo_factura}`);
      console.log(`  Total: $${fe.total}`);
      console.log(`  Total Impuestos: $${fe.total_impuestos}`);
      console.log(`  Estado Factus: ${fe.factus_status}`);

      console.log('\n👤 DATOS DEL CLIENTE EN facturas_electronicas:');
      console.log(`  cliente_id: ${fe.cliente_id}`);
      console.log(`  nombre: "${fe.cliente_nombre || '❌ NULL/VACÍO'}"`);
      console.log(`  numero_documento: "${fe.cliente_numero_documento || '❌ NULL/VACÍO'}"`);
      console.log(`  tipo_documento: "${fe.cliente_tipo_documento || '❌ NULL/VACÍO'}"`);
      console.log(`  email: "${fe.cliente_email || '❌ NULL/VACÍO'}"`);
      console.log(`  telefono: "${fe.cliente_telefono || '❌ NULL/VACÍO'}"`);
      console.log(`  direccion: "${fe.cliente_direccion || '❌ NULL/VACÍO'}"`);
      console.log(`  codigo_municipio_dane: "${fe.cliente_codigo_municipio_dane || '❌ NULL/VACÍO'}"`);

      if (fe.cliente_id) {
        console.log('\n👤 DATOS DEL CLIENTE EN tabla clientes:');
        console.log(`  nombre: "${fe.cliente_bd_nombre || '❌ NULL/VACÍO'}"`);
        console.log(`  email: "${fe.cliente_bd_email || '❌ NULL/VACÍO'}"`);
        console.log(`  telefono: "${fe.cliente_bd_telefono || '❌ NULL/VACÍO'}"`);
        console.log(`  direccion: "${fe.cliente_bd_direccion || '❌ NULL/VACÍO'}"`);
        console.log(`  codigo_municipio_dane: "${fe.cliente_bd_municipio || '❌ NULL/VACÍO'}"`);
      }

      console.log('\n📦 ITEMS:');
      if (fe.items_consumos && fe.items_consumos.length > 0) {
        let totalItemsIVA = 0;
        let totalItemsSubtotal = 0;
        let totalItemsTotal = 0;

        fe.items_consumos.forEach((item, idx) => {
          const itemIVA = parseFloat(item.iva_monto || 0);
          const itemSubtotal = parseFloat(item.subtotal || 0);
          const itemTotal = parseFloat(item.total || 0);

          totalItemsIVA += itemIVA;
          totalItemsSubtotal += itemSubtotal;
          totalItemsTotal += itemTotal;

          console.log(`  ${idx + 1}. ${item.descripcion} [${item.codigo}]`);
          console.log(`     Cantidad: ${item.cantidad}, Precio: $${item.precio_unitario}`);
          console.log(`     IVA: ${item.iva_porcentaje}% → $${item.iva_monto}`);
          console.log(`     Subtotal: $${item.subtotal}, Total: $${item.total}`);
        });

        console.log('\n  📊 SUMAS:');
        console.log(`     Total subtotales: $${totalItemsSubtotal.toFixed(2)}`);
        console.log(`     Total IVA items: $${totalItemsIVA.toFixed(2)}`);
        console.log(`     Total items: $${totalItemsTotal.toFixed(2)}`);
        console.log(`     Total factura: $${fe.total}`);
        console.log(`     IVA factura: $${fe.total_impuestos}`);

        const diffIVA = Math.abs(totalItemsIVA - parseFloat(fe.total_impuestos || 0));
        const diffTotal = Math.abs(totalItemsTotal - parseFloat(fe.total || 0));

        if (diffIVA > 0.01) {
          console.log(`     ❌ DIFERENCIA IVA: $${diffIVA.toFixed(2)}`);
        } else {
          console.log(`     ✅ IVA cuadra`);
        }

        if (diffTotal > 0.01) {
          console.log(`     ❌ DIFERENCIA TOTAL: $${diffTotal.toFixed(2)}`);
        } else {
          console.log(`     ✅ Total cuadra`);
        }
      } else {
        console.log('  ❌ SIN ITEMS - ESTO CAUSARÁ ERROR DE VALIDACIÓN');
      }

      console.log('\n💳 MÉTODOS DE PAGO:');
      if (fe.metodos_pago && fe.metodos_pago.length > 0) {
        fe.metodos_pago.forEach((pago, idx) => {
          console.log(`  ${idx + 1}. ${pago.metodo}: $${pago.monto}`);
        });
      } else {
        console.log('  ⚠️ Sin métodos de pago registrados');
      }

      // Validaciones críticas
      console.log('\n⚠️ VALIDACIONES CRÍTICAS PARA FACTUS:');

      const validaciones = [];

      // Email
      if (!fe.cliente_email) {
        validaciones.push('❌ Email del cliente NULL - Factus requiere email');
      } else if (!fe.cliente_email.includes('@')) {
        validaciones.push(`❌ Email inválido: "${fe.cliente_email}"`);
      } else {
        validaciones.push(`✅ Email: ${fe.cliente_email}`);
      }

      // Teléfono
      if (!fe.cliente_telefono || fe.cliente_telefono.trim() === '') {
        validaciones.push('⚠️ Teléfono vacío - puede causar error en Factus');
      } else {
        validaciones.push(`✅ Teléfono: ${fe.cliente_telefono}`);
      }

      // Dirección
      if (!fe.cliente_direccion || fe.cliente_direccion.trim() === '') {
        validaciones.push('⚠️ Dirección vacía');
      } else {
        validaciones.push(`✅ Dirección: ${fe.cliente_direccion}`);
      }

      // Municipio
      if (!fe.cliente_codigo_municipio_dane) {
        validaciones.push('❌ Código municipio DANE NULL - se usará 11001 por defecto');
      } else {
        validaciones.push(`✅ Municipio DANE: ${fe.cliente_codigo_municipio_dane}`);
      }

      // Items
      if (!fe.items_consumos || fe.items_consumos.length === 0) {
        validaciones.push('❌ Sin items - Factus requiere al menos 1 item');
      } else {
        validaciones.push(`✅ Items: ${fe.items_consumos.length}`);

        // Verificar IVA en items
        const itemsSinIVA = fe.items_consumos.filter(i => !i.iva_porcentaje || parseFloat(i.iva_porcentaje) === 0);
        if (itemsSinIVA.length > 0 && parseFloat(fe.total_impuestos) > 0) {
          validaciones.push(`❌ ${itemsSinIVA.length} items con IVA=0 pero factura tiene impuestos`);
        }
      }

      // Documento
      if (!fe.cliente_numero_documento || fe.cliente_numero_documento === 'CONSUMIDOR FINAL') {
        validaciones.push('⚠️ Documento genérico "222222222222" será usado');
      } else {
        validaciones.push(`✅ Documento: ${fe.cliente_tipo_documento} ${fe.cliente_numero_documento}`);
      }

      validaciones.forEach(v => console.log(`  ${v}`));

      console.log('\n' + '═'.repeat(80));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

diagnosticarFacturas();