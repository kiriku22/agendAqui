// Probar usando el mismo FactusService que usa la aplicación
const FactusService = require('./src/services/FactusService');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function testConService(facturaId) {
  try {
    console.log(`\n🧪 Probando factura ${facturaId} con FactusService...\n`);

    // Obtener datos de la factura
    const feResult = await pool.query(`
      SELECT fe.*
      FROM facturas_electronicas fe
      WHERE fe.id = $1
    `, [facturaId]);

    if (feResult.rows.length === 0) {
      console.log('❌ Factura no encontrada');
      return;
    }

    const fe = feResult.rows[0];

    // Construir snapshot igual que factubox.js
    const snapshot = {
      factura: {
        numero: fe.numero_factura_electronica || `FE-${facturaId}`,
        fecha: fe.fecha_emision,
        subtotal: parseFloat(fe.subtotal || 0),
        impuestos: parseFloat(fe.total_impuestos || 0),
        descuentos: parseFloat(fe.total_descuentos || 0),
        total: parseFloat(fe.total || 0),
        tipo: 'venta_pos',
        notas: ''
      },
      cliente: {
        nombre: fe.cliente_nombre || 'CONSUMIDOR FINAL',
        tipo_documento: fe.cliente_tipo_documento || 'CC',
        numero_documento: fe.cliente_numero_documento || '222222222222',
        email: fe.cliente_email || 'sandbox@factus.com.co',
        telefono: fe.cliente_telefono || '',
        direccion: fe.cliente_direccion || 'No especificada',
        municipio: fe.cliente_codigo_municipio_dane || '11001'
      },
      items: fe.items_consumos || [],
      metodos_pago: fe.metodos_pago || []
    };

    console.log('📦 Snapshot:');
    console.log(JSON.stringify(snapshot, null, 2));
    console.log('');

    // Llamar al servicio
    console.log('📡 Llamando a FactusService.enviarFacturaPOS()...');
    const resultado = await FactusService.enviarFacturaPOS(snapshot);

    console.log('\n✅ ÉXITO:');
    console.log(JSON.stringify(resultado, null, 2));

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Mensaje:', error.message);

    if (error.response) {
      console.error('Status HTTP:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  await testConService(18);
  await testConService(19);
  await pool.end();
}

main();
