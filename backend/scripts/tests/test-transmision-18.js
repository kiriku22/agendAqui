const { Pool } = require('pg');
const FactusService = require('./src/services/FactusService');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function testTransmision() {
  try {
    console.log('🧪 Probando transmisión de factura ID 18...\n');

    // 1. Obtener factura electrónica
    const feResult = await pool.query(`
      SELECT
        fe.*,
        f.numero_factura,
        f.fecha,
        f.total,
        f.tipo_factura
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      WHERE fe.id = 18
    `);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura no encontrada');
      await pool.end();
      return;
    }

    const fe = feResult.rows[0];
    console.log('📄 Factura encontrada:', fe.numero_factura);
    console.log('   Cliente:', fe.cliente_nombre);
    console.log('   Total:', fe.total);
    console.log('');

    // 2. Construir snapshot desde items_consumos y metodos_pago ya guardados
    const snapshot = {
      factura: {
        numero: fe.numero_factura,
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

    console.log('📦 Snapshot construido:');
    console.log(JSON.stringify(snapshot, null, 2));
    console.log('');

    // 3. Intentar transmitir
    console.log('📡 Transmitiendo a Factus...\n');

    const resultado = await FactusService.enviarFacturaPOS(snapshot);

    console.log('\n✅ Transmisión exitosa!');
    console.log('CUFE:', resultado.cufe);
    console.log('Número DIAN:', resultado.numero_dian);
    console.log('Estado:', resultado.estado);
    console.log('PDF URL:', resultado.url_pdf);
    console.log('XML URL:', resultado.url_xml);

    await pool.end();
  } catch (error) {
    console.error('\n❌ Error en transmisión:');
    console.error('Mensaje:', error.message);
    console.error('');
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

testTransmision();
