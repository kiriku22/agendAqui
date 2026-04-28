const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function analyzeFacturas() {
  try {
    console.log('=== ANÁLISIS COMPLETO DE FACTURAS 1 Y 19 ===\n');

    // Analizar ambas facturas
    for (const id of [1, 19]) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`FACTURA ELECTRÓNICA ID ${id}`);
      console.log('='.repeat(60));

      const result = await pool.query(`
        SELECT
          fe.*,
          f.numero_factura,
          f.tipo_factura
        FROM facturas_electronicas fe
        INNER JOIN facturas f ON f.id = fe.factura_id
        WHERE fe.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        console.log(`❌ Factura ${id} no encontrada\n`);
        continue;
      }

      const fe = result.rows[0];

      // 1. Datos básicos
      console.log('\n📄 DATOS BÁSICOS:');
      console.log('  Número factura:', fe.numero_factura);
      console.log('  Tipo factura:', fe.tipo_factura);
      console.log('  Prefijo:', fe.prefijo);
      console.log('  Número:', fe.numero);
      console.log('  Total:', fe.total);
      console.log('  Subtotal:', fe.subtotal);
      console.log('  Total impuestos:', fe.total_impuestos);

      // 2. Datos del cliente
      console.log('\n👤 DATOS DEL CLIENTE:');
      console.log('  Nombre:', fe.cliente_nombre || '❌ NULL');
      console.log('  Tipo doc:', fe.cliente_tipo_documento || '❌ NULL');
      console.log('  Número doc:', fe.cliente_numero_documento || '❌ NULL');
      console.log('  Email:', fe.cliente_email || '❌ NULL');
      console.log('  Teléfono:', fe.cliente_telefono || '❌ NULL');
      console.log('  Dirección:', fe.cliente_direccion || '❌ NULL');
      console.log('  Municipio DANE:', fe.cliente_codigo_municipio_dane || '❌ NULL');

      // 3. Items
      console.log('\n📦 ITEMS:');
      if (fe.items_consumos && fe.items_consumos.length > 0) {
        console.log(`  Total items: ${fe.items_consumos.length}`);

        let totalIVAItems = 0;
        fe.items_consumos.forEach((item, index) => {
          console.log(`\n  Item ${index + 1}: ${item.descripcion}`);
          console.log(`    Cantidad: ${item.cantidad}`);
          console.log(`    Precio unitario: ${item.precio_unitario}`);
          console.log(`    Subtotal: ${item.subtotal}`);
          console.log(`    IVA %: ${item.iva_porcentaje}`);
          console.log(`    IVA monto: ${item.iva_monto}`);
          console.log(`    Total: ${item.total}`);
          totalIVAItems += parseFloat(item.iva_monto || 0);
        });

        console.log(`\n  SUMA IVA items: ${totalIVAItems.toFixed(2)}`);
        console.log(`  Total impuestos factura: ${parseFloat(fe.total_impuestos).toFixed(2)}`);
        console.log(`  DIFERENCIA: ${Math.abs(totalIVAItems - parseFloat(fe.total_impuestos)).toFixed(2)}`);

        if (Math.abs(totalIVAItems - parseFloat(fe.total_impuestos)) > 0.01) {
          console.log('  ⚠️  ERROR: IVA de items NO cuadra con total_impuestos!');
        } else {
          console.log('  ✅ IVA cuadra correctamente');
        }
      } else {
        console.log('  ❌ NULL o array vacío');
      }

      // 4. Métodos de pago
      console.log('\n💳 MÉTODOS DE PAGO:');
      if (fe.metodos_pago && fe.metodos_pago.length > 0) {
        console.log(`  Total métodos: ${fe.metodos_pago.length}`);
        fe.metodos_pago.forEach((mp, index) => {
          console.log(`  ${index + 1}. ${mp.metodo}: $${mp.monto}`);
        });
      } else {
        console.log('  ❌ NULL o array vacío');
      }

      // 5. Validación de campos obligatorios
      console.log('\n🔍 VALIDACIÓN DE CAMPOS OBLIGATORIOS:');
      const validaciones = [
        { campo: 'cliente_nombre', valor: fe.cliente_nombre, requerido: true },
        { campo: 'cliente_numero_documento', valor: fe.cliente_numero_documento, requerido: true },
        { campo: 'cliente_tipo_documento', valor: fe.cliente_tipo_documento, requerido: true },
        { campo: 'cliente_email', valor: fe.cliente_email, requerido: true },
        { campo: 'cliente_telefono', valor: fe.cliente_telefono, requerido: false },
        { campo: 'cliente_direccion', valor: fe.cliente_direccion, requerido: true },
        { campo: 'cliente_codigo_municipio_dane', valor: fe.cliente_codigo_municipio_dane, requerido: true },
        { campo: 'items_consumos', valor: fe.items_consumos, requerido: true },
        { campo: 'metodos_pago', valor: fe.metodos_pago, requerido: true },
      ];

      validaciones.forEach(v => {
        const esValido = v.valor !== null && v.valor !== undefined && v.valor !== '';
        const simbolo = esValido ? '✅' : (v.requerido ? '❌' : '⚠️');
        console.log(`  ${simbolo} ${v.campo}: ${esValido ? 'OK' : 'NULL/VACÍO'}${v.requerido && !esValido ? ' (REQUERIDO!)' : ''}`);
      });

      // 6. Validación NIT
      if (fe.cliente_tipo_documento === 'NIT') {
        console.log('\n🏢 VALIDACIÓN NIT:');
        console.log('  Tipo documento es NIT - requiere dígito de verificación');
        console.log('  DV almacenado:', fe.cliente_digito_verificacion || '❌ NULL');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('FIN DEL ANÁLISIS');
    console.log('='.repeat(60));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeFacturas();