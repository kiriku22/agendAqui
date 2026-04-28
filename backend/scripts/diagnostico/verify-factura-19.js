const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function verifyFactura19() {
  try {
    console.log('🔍 Verificando Factura 19 después de corrección...\n');

    const result = await pool.query(`
      SELECT
        fe.id,
        fe.numero_factura_electronica,
        fe.cliente_nombre,
        fe.cliente_numero_documento,
        fe.cliente_tipo_documento,
        fe.cliente_email,
        fe.cliente_telefono,
        fe.cliente_direccion,
        fe.cliente_codigo_municipio_dane,
        fe.subtotal,
        fe.total_impuestos,
        fe.total,
        fe.items_consumos,
        fe.metodos_pago
      FROM facturas_electronicas fe
      WHERE fe.id = 19
    `);

    if (result.rows.length === 0) {
      console.log('❌ Factura 19 no encontrada');
      await pool.end();
      return;
    }

    const fe = result.rows[0];

    console.log('📄 FACTURA ELECTRÓNICA ID 19');
    console.log('══════════════════════════════════════════\n');

    console.log('📋 Datos Básicos:');
    console.log(`  Número: ${fe.numero_factura_electronica || 'NULL'}`);
    console.log(`  Subtotal: $${parseFloat(fe.subtotal).toLocaleString('es-CO')}`);
    console.log(`  Impuestos: $${parseFloat(fe.total_impuestos).toLocaleString('es-CO')}`);
    console.log(`  Total: $${parseFloat(fe.total).toLocaleString('es-CO')}`);
    console.log('');

    console.log('👤 Datos Cliente:');
    console.log(`  Nombre: ${fe.cliente_nombre || 'NULL'}`);
    console.log(`  Tipo Doc: ${fe.cliente_tipo_documento || 'NULL'}`);
    console.log(`  Número Doc: ${fe.cliente_numero_documento || 'NULL'}`);
    console.log(`  Email: ${fe.cliente_email || 'NULL'} ${fe.cliente_email ? '✅' : '❌'}`);
    console.log(`  Teléfono: ${fe.cliente_telefono || 'NULL'}`);
    console.log(`  Dirección: ${fe.cliente_direccion || 'NULL'} ${fe.cliente_direccion ? '✅' : '❌'}`);
    console.log(`  Municipio DANE: ${fe.cliente_codigo_municipio_dane || 'NULL'} ${fe.cliente_codigo_municipio_dane ? '✅' : '❌'}`);
    console.log('');

    console.log('📦 Items de Consumo:');
    if (fe.items_consumos) {
      const items = fe.items_consumos;
      console.log(`  Total items: ${items.length} ${items.length > 0 ? '✅' : '❌'}`);

      let sumaSubtotal = 0;
      let sumaIVA = 0;
      let sumaTotal = 0;

      items.forEach((item, index) => {
        console.log(`\n  Item ${index + 1}: ${item.descripcion}`);
        console.log(`    Cantidad: ${item.cantidad}`);
        console.log(`    Precio unitario: $${parseFloat(item.precio_unitario).toLocaleString('es-CO')}`);
        console.log(`    IVA %: ${item.iva_porcentaje}`);
        console.log(`    IVA monto: $${parseFloat(item.iva_monto).toLocaleString('es-CO')}`);
        console.log(`    Subtotal: $${parseFloat(item.subtotal).toLocaleString('es-CO')}`);
        console.log(`    Total: $${parseFloat(item.total).toLocaleString('es-CO')}`);

        sumaSubtotal += parseFloat(item.subtotal);
        sumaIVA += parseFloat(item.iva_monto);
        sumaTotal += parseFloat(item.total);
      });

      console.log('\n  ─────────────────────────────────');
      console.log(`  Suma subtotales: $${sumaSubtotal.toLocaleString('es-CO')}`);
      console.log(`  Suma IVA: $${sumaIVA.toLocaleString('es-CO')}`);
      console.log(`  Suma totales: $${sumaTotal.toLocaleString('es-CO')}`);
      console.log('');

      // Validar que cuadre
      const diferenciaIVA = Math.abs(sumaIVA - parseFloat(fe.total_impuestos));
      const diferenciaTotal = Math.abs(sumaTotal - parseFloat(fe.total));

      if (diferenciaIVA < 0.01) {
        console.log('  ✅ IVA items = IVA factura (Cuadra perfectamente)');
      } else {
        console.log(`  ❌ IVA items (${sumaIVA}) ≠ IVA factura (${fe.total_impuestos})`);
        console.log(`     Diferencia: $${diferenciaIVA.toFixed(2)}`);
      }

      if (diferenciaTotal < 0.01) {
        console.log('  ✅ Total items = Total factura (Cuadra perfectamente)');
      } else {
        console.log(`  ❌ Total items (${sumaTotal}) ≠ Total factura (${fe.total})`);
        console.log(`     Diferencia: $${diferenciaTotal.toFixed(2)}`);
      }

    } else {
      console.log('  ❌ NULL - No hay items');
    }
    console.log('');

    console.log('💳 Métodos de Pago:');
    if (fe.metodos_pago) {
      const metodos = fe.metodos_pago;
      console.log(`  Total métodos: ${metodos.length} ${metodos.length > 0 ? '✅' : '❌'}`);

      let sumaPagos = 0;
      metodos.forEach((metodo, index) => {
        console.log(`  ${index + 1}. ${metodo.metodo}: $${parseFloat(metodo.monto).toLocaleString('es-CO')}`);
        if (metodo.referencia) {
          console.log(`     Referencia: ${metodo.referencia}`);
        }
        sumaPagos += parseFloat(metodo.monto);
      });

      console.log(`  Total pagos: $${sumaPagos.toLocaleString('es-CO')}`);

      const diferenciaPagos = Math.abs(sumaPagos - parseFloat(fe.total));
      if (diferenciaPagos < 0.01) {
        console.log('  ✅ Total pagos = Total factura');
      } else {
        console.log(`  ❌ Total pagos (${sumaPagos}) ≠ Total factura (${fe.total})`);
      }
    } else {
      console.log('  ❌ NULL - No hay métodos de pago');
    }
    console.log('');

    console.log('══════════════════════════════════════════');
    console.log('📊 RESUMEN DE VALIDACIÓN:');
    console.log('══════════════════════════════════════════\n');

    const validaciones = [
      { campo: 'Email cliente', valido: !!fe.cliente_email },
      { campo: 'Dirección cliente', valido: !!fe.cliente_direccion },
      { campo: 'Municipio DANE', valido: !!fe.cliente_codigo_municipio_dane },
      { campo: 'Items consumos', valido: !!(fe.items_consumos && fe.items_consumos.length > 0) },
      { campo: 'Métodos de pago', valido: !!(fe.metodos_pago && fe.metodos_pago.length > 0) },
    ];

    validaciones.forEach(v => {
      console.log(`${v.valido ? '✅' : '❌'} ${v.campo}`);
    });

    const todasValidas = validaciones.every(v => v.valido);

    console.log('');
    if (todasValidas) {
      console.log('🎉 FACTURA 19 LISTA PARA TRANSMITIR A FACTUS! 🎉');
    } else {
      console.log('⚠️  Factura aún tiene campos faltantes');
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

verifyFactura19();
