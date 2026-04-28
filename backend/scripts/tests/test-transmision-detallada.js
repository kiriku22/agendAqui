const { Pool } = require('pg');
const FactusService = require('./src/services/FactusService');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function testTransmisionDetallada(facturaId) {
  try {
    console.log(`\n🔍 Probando transmisión de factura ID ${facturaId}...\n`);

    // 1. Obtener factura electrónica completa
    const feResult = await pool.query(`
      SELECT
        fe.*,
        f.numero_factura,
        f.fecha,
        f.total as factura_total,
        f.tipo_factura
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = $1
    `, [facturaId]);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura no encontrada');
      return;
    }

    const fe = feResult.rows[0];

    console.log('📄 Datos de la factura:');
    console.log(`   Número: ${fe.numero_factura_electronica || fe.numero_factura}`);
    console.log(`   Cliente: ${fe.cliente_nombre}`);
    console.log(`   Documento: ${fe.cliente_tipo_documento} ${fe.cliente_numero_documento}`);
    console.log(`   Email: ${fe.cliente_email}`);
    console.log(`   Teléfono: ${fe.cliente_telefono || 'N/A'}`);
    console.log(`   Dirección: ${fe.cliente_direccion}`);
    console.log(`   Municipio: ${fe.cliente_codigo_municipio_dane}`);
    console.log(`   Subtotal: $${parseFloat(fe.subtotal).toLocaleString('es-CO')}`);
    console.log(`   Impuestos: $${parseFloat(fe.total_impuestos).toLocaleString('es-CO')}`);
    console.log(`   Total: $${parseFloat(fe.total).toLocaleString('es-CO')}`);
    console.log('');

    // 2. Validar items
    if (!fe.items_consumos || fe.items_consumos.length === 0) {
      console.log('❌ ERROR: No hay items_consumos');
      return;
    }

    console.log(`📦 Items (${fe.items_consumos.length}):`);
    let sumaIVAItems = 0;
    let sumaTotalItems = 0;

    fe.items_consumos.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.descripcion}`);
      console.log(`      Cantidad: ${item.cantidad}`);
      console.log(`      Precio: $${parseFloat(item.precio_unitario).toLocaleString('es-CO')}`);
      console.log(`      IVA %: ${item.iva_porcentaje}`);
      console.log(`      IVA monto: $${parseFloat(item.iva_monto).toLocaleString('es-CO')}`);
      console.log(`      Subtotal: $${parseFloat(item.subtotal).toLocaleString('es-CO')}`);
      console.log(`      Total: $${parseFloat(item.total).toLocaleString('es-CO')}`);

      sumaIVAItems += parseFloat(item.iva_monto || 0);
      sumaTotalItems += parseFloat(item.total || 0);
    });

    console.log(`   ────────────────────────────────`);
    console.log(`   Suma IVA items: $${sumaIVAItems.toFixed(2)}`);
    console.log(`   IVA factura: $${parseFloat(fe.total_impuestos).toFixed(2)}`);

    const diferenciaIVA = Math.abs(sumaIVAItems - parseFloat(fe.total_impuestos));
    if (diferenciaIVA > 0.01) {
      console.log(`   ⚠️  DIFERENCIA: $${diferenciaIVA.toFixed(2)}`);
    } else {
      console.log(`   ✅ IVA cuadra`);
    }
    console.log('');

    // 3. Validar métodos de pago
    if (!fe.metodos_pago || fe.metodos_pago.length === 0) {
      console.log('❌ ERROR: No hay metodos_pago');
      return;
    }

    console.log(`💳 Métodos de pago (${fe.metodos_pago.length}):`);
    let sumaPagos = 0;
    fe.metodos_pago.forEach((pago, index) => {
      console.log(`   ${index + 1}. ${pago.metodo}: $${parseFloat(pago.monto).toLocaleString('es-CO')}`);
      sumaPagos += parseFloat(pago.monto);
    });
    console.log(`   Total pagos: $${sumaPagos.toFixed(2)}`);
    console.log('');

    // 4. Construir snapshot
    const snapshot = {
      factura: {
        numero: fe.numero_factura || fe.numero_factura_electronica,
        fecha: fe.fecha_emision,
        subtotal: parseFloat(fe.subtotal || 0),
        impuestos: parseFloat(fe.total_impuestos || 0),
        descuentos: parseFloat(fe.total_descuentos || 0),
        total: parseFloat(fe.total || 0),
        tipo: fe.tipo_factura,
        notas: ''
      },
      cliente: {
        nombre: fe.cliente_nombre || 'CONSUMIDOR FINAL',
        tipo_documento: fe.cliente_tipo_documento || 'CC',
        numero_documento: fe.cliente_numero_documento || '222222222222',
        email: fe.cliente_email || 'default@factufy.com',
        telefono: fe.cliente_telefono || '',
        direccion: fe.cliente_direccion || 'No especificada',
        municipio: fe.cliente_codigo_municipio_dane || '11001'
      },
      items: fe.items_consumos || [],
      metodos_pago: fe.metodos_pago || []
    };

    console.log('📡 Transmitiendo a Factus...\n');
    console.log('Snapshot a enviar:');
    console.log(JSON.stringify(snapshot, null, 2));
    console.log('\n═══════════════════════════════════════════\n');

    // 5. Intentar transmitir
    const resultado = await FactusService.enviarFacturaPOS(snapshot);

    console.log('✅ TRANSMISIÓN EXITOSA!');
    console.log(`   CUFE: ${resultado.cufe}`);
    console.log(`   Número DIAN: ${resultado.numero_dian}`);
    console.log(`   Estado: ${resultado.estado}`);
    console.log(`   PDF: ${resultado.url_pdf || 'N/A'}`);
    console.log(`   XML: ${resultado.url_xml || 'N/A'}`);

  } catch (error) {
    console.error('\n❌ ERROR EN TRANSMISIÓN:');
    console.error('═══════════════════════════════════════════');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensaje:', error.message);

    if (error.response) {
      console.error('\nRespuesta HTTP:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

async function main() {
  console.log('🧪 TEST DE TRANSMISIÓN DETALLADO');
  console.log('═══════════════════════════════════════════');

  await testTransmisionDetallada(18);

  console.log('\n\n');

  await testTransmisionDetallada(19);

  await pool.end();
}

main();
