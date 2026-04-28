const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function debugFacturas() {
  try {
    console.log('🔍 DEBUG: Analizando facturas 18 y 19...\n');

    for (const feId of [18, 19]) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📄 FACTURA ELECTRÓNICA ID ${feId}`);
      console.log(`${'═'.repeat(60)}\n`);

      // Obtener factura electrónica
      const feResult = await pool.query(`
        SELECT fe.*, f.numero_factura as numero_interno, f.tipo_factura
        FROM facturas_electronicas fe
        INNER JOIN facturas f ON f.id = fe.factura_id
        WHERE fe.id = $1
      `, [feId]);

      if (feResult.rows.length === 0) {
        console.log('❌ No encontrada');
        continue;
      }

      const fe = feResult.rows[0];

      console.log('📋 DATOS DEL CLIENTE (lo que se enviará a Factus):');
      console.log(`  nombre: "${fe.cliente_nombre}"`);
      console.log(`  tipo_documento: "${fe.cliente_tipo_documento}"`);
      console.log(`  numero_documento: "${fe.cliente_numero_documento}"`);
      console.log(`  email: "${fe.cliente_email}"`);
      console.log(`  telefono: "${fe.cliente_telefono}"`);
      console.log(`  direccion: "${fe.cliente_direccion}"`);
      console.log(`  municipio_dane: "${fe.cliente_codigo_municipio_dane}"`);

      // Validaciones críticas
      console.log('\n⚠️  VALIDACIONES CRÍTICAS:');

      // 1. Validar tipo de documento
      const tiposValidos = ['CC', 'NIT', 'CE', 'PA', 'TI', 'RC', 'TE', 'DIE'];
      if (!tiposValidos.includes(fe.cliente_tipo_documento)) {
        console.log(`  ❌ Tipo documento "${fe.cliente_tipo_documento}" NO es válido para DIAN`);
      } else {
        console.log(`  ✅ Tipo documento "${fe.cliente_tipo_documento}" es válido`);
      }

      // 2. Validar número de documento
      if (!fe.cliente_numero_documento || fe.cliente_numero_documento.length < 5) {
        console.log(`  ❌ Número documento "${fe.cliente_numero_documento}" muy corto o vacío`);
      } else if (fe.cliente_numero_documento === 'CONSUMIDOR FINAL') {
        console.log(`  ❌ Número documento es "CONSUMIDOR FINAL" - inválido para DIAN`);
      } else {
        console.log(`  ✅ Número documento "${fe.cliente_numero_documento}" parece válido`);
      }

      // 3. Validar NIT con DV
      if (fe.cliente_tipo_documento === 'NIT') {
        // Verificar si tiene guión y DV
        if (fe.cliente_numero_documento.includes('-')) {
          console.log(`  ⚠️  NIT tiene guión - Factus podría rechazarlo: "${fe.cliente_numero_documento}"`);
        }
        // Calcular DV esperado
        const nitLimpio = fe.cliente_numero_documento.replace(/[-\s]/g, '');
        const dvCalculado = calcularDV(nitLimpio);
        console.log(`  📊 NIT limpio: ${nitLimpio}, DV calculado: ${dvCalculado}`);
      }

      // 4. Validar email
      if (!fe.cliente_email || !fe.cliente_email.includes('@')) {
        console.log(`  ❌ Email "${fe.cliente_email}" inválido o vacío`);
      } else {
        console.log(`  ✅ Email "${fe.cliente_email}" tiene formato válido`);
      }

      // 5. Validar municipio
      if (!fe.cliente_codigo_municipio_dane) {
        console.log(`  ❌ Municipio DANE está vacío`);
      } else {
        console.log(`  ✅ Municipio DANE "${fe.cliente_codigo_municipio_dane}"`);
      }

      // Items
      console.log('\n📦 ITEMS:');
      if (!fe.items_consumos || fe.items_consumos.length === 0) {
        console.log('  ❌ NO HAY ITEMS - Esto causará error!');
      } else {
        console.log(`  Total items: ${fe.items_consumos.length}`);
        let sumaIVA = 0;
        fe.items_consumos.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.descripcion}`);
          console.log(`     cantidad: ${item.cantidad}, precio: ${item.precio_unitario}`);
          console.log(`     iva_porcentaje: ${item.iva_porcentaje}, iva_monto: ${item.iva_monto}`);

          // Validar que price > 0
          if (parseFloat(item.precio_unitario) <= 0) {
            console.log(`     ❌ PRECIO = 0 o negativo - Factus rechazará`);
          }
          // Validar cantidad
          if (parseInt(item.cantidad) <= 0) {
            console.log(`     ❌ CANTIDAD = 0 o negativa - Factus rechazará`);
          }

          sumaIVA += parseFloat(item.iva_monto || 0);
        });

        console.log(`\n  Suma IVA items: ${sumaIVA.toFixed(2)}`);
        console.log(`  Total impuestos factura: ${parseFloat(fe.total_impuestos).toFixed(2)}`);

        const dif = Math.abs(sumaIVA - parseFloat(fe.total_impuestos));
        if (dif > 0.01) {
          console.log(`  ❌ DIFERENCIA: ${dif.toFixed(2)} - Esto causará error de validación!`);
        } else {
          console.log(`  ✅ IVA cuadra perfectamente`);
        }
      }

      // Métodos de pago
      console.log('\n💳 MÉTODOS DE PAGO:');
      if (!fe.metodos_pago || fe.metodos_pago.length === 0) {
        console.log('  ❌ NO HAY MÉTODOS DE PAGO');
      } else {
        fe.metodos_pago.forEach((pago, idx) => {
          console.log(`  ${idx + 1}. ${pago.metodo}: $${pago.monto}`);
        });
      }

      // Totales
      console.log('\n💰 TOTALES:');
      console.log(`  Subtotal: $${parseFloat(fe.subtotal).toFixed(2)}`);
      console.log(`  Impuestos: $${parseFloat(fe.total_impuestos).toFixed(2)}`);
      console.log(`  Total: $${parseFloat(fe.total).toFixed(2)}`);

      // Verificar que subtotal + impuestos = total (aproximadamente)
      const calculado = parseFloat(fe.subtotal) + parseFloat(fe.total_impuestos);
      const diferencia = Math.abs(calculado - parseFloat(fe.total));
      if (diferencia > 0.01) {
        console.log(`  ⚠️  Subtotal + Impuestos = ${calculado.toFixed(2)} (diferencia: ${diferencia.toFixed(2)})`);
      }
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

function calcularDV(nit) {
  const nitLimpio = nit.replace(/[^0-9]/g, '');
  const primos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

  let suma = 0;
  const digitos = nitLimpio.split('').reverse();

  for (let i = 0; i < digitos.length && i < primos.length; i++) {
    suma += parseInt(digitos[i]) * primos[i];
  }

  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

debugFacturas();
