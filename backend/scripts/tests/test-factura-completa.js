/**
 * Script de prueba para verificar datos de facturaelectrónica completa
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87',
});

async function testFacturaCompleta() {
  try {
    console.log('🔍 Buscando última factura electrónica...\n');

    // Obtener la última factura electrónica
    const ultimaFactura = await pool.query(`
      SELECT id, numero_factura_electronica, cufe
      FROM facturas_electronicas
      WHERE cufe IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
    `);

    if (ultimaFactura.rows.length === 0) {
      console.log('❌ No hay facturas electrónicas con CUFE');
      return;
    }

    const { id, numero_factura_electronica, cufe } = ultimaFactura.rows[0];
    console.log(`✅ Factura encontrada: ${numero_factura_electronica}`);
    console.log(`   ID: ${id}`);
    console.log(`   CUFE: ${cufe}\n`);

    // Ejecutar el mismo query que el resolver
    console.log('🔍 Ejecutando query del resolver...\n');

    const query = `
      SELECT
        -- Datos de la factura electrónica
        fe.*,
        f.numero_factura,
        f.fecha,
        f.fecha as fecha_emision,
        f.subtotal as factura_subtotal,
        f.total as factura_total,

        -- Estado DIAN calculado
        CASE
          WHEN fe.cufe IS NULL OR fe.cufe = '' THEN 'No Transmitida'
          WHEN fe.factus_status = 'Created' THEN 'No Transmitida'
          WHEN fe.factus_status = 'pending' OR fe.factus_status = 'Pendiente' THEN 'Pendiente'
          WHEN fe.factus_status = 'approved' THEN 'Aceptada'
          WHEN fe.factus_status = 'rejected' THEN 'Rechazada'
          ELSE 'No Transmitida'
        END as estado_dian,

        -- Datos del Emisor
        cf.nit as emisor_nit,
        cf.digito_verificacion as emisor_digito_verificacion,
        cf.razon_social as emisor_razon_social,
        cf.nombre_comercial as emisor_nombre_comercial,
        cf.direccion as emisor_direccion,
        cf.telefono as emisor_telefono,
        cf.email_facturacion as emisor_email,
        cf.codigo_municipio_dane as emisor_municipio_dane,
        cf.regimen_tributario as emisor_regimen_tributario,
        cf.responsabilidades_fiscales as emisor_responsabilidades_fiscales,

        -- Resolución DIAN
        cf.resolucion_dian,
        cf.prefijo_factura as resolucion_prefijo,
        cf.numero_inicial_factura as resolucion_numero_inicio,
        cf.numero_final_factura as resolucion_numero_fin,
        cf.fecha_inicio_resolucion::text as resolucion_fecha_inicio,
        cf.fecha_fin_resolucion::text as resolucion_fecha_fin,

        -- Logo
        cf.logo_url

      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN configuracion_factus cf ON cf.activo = true
      WHERE fe.id = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró la factura');
      return;
    }

    const factura = result.rows[0];

    console.log('📊 DATOS DEVUELTOS:\n');
    console.log('--- Items de Hospedaje ---');
    console.log('  items_hospedaje:', factura.items_hospedaje ? 'SÍ' : 'NO');
    if (factura.items_hospedaje) {
      console.log('  Tipo:', typeof factura.items_hospedaje);
      console.log('  Contenido:', JSON.stringify(factura.items_hospedaje, null, 2));
    }

    console.log('\n--- Items de Consumos ---');
    console.log('  items_consumos:', factura.items_consumos ? 'SÍ' : 'NO');
    if (factura.items_consumos) {
      console.log('  Tipo:', typeof factura.items_consumos);
      console.log('  Contenido:', JSON.stringify(factura.items_consumos, null, 2));
    }

    console.log('\n--- Métodos de Pago ---');
    console.log('  metodos_pago:', factura.metodos_pago ? 'SÍ' : 'NO');
    if (factura.metodos_pago) {
      console.log('  Tipo:', typeof factura.metodos_pago);
      console.log('  Contenido:', JSON.stringify(factura.metodos_pago, null, 2));
    }

    console.log('\n--- Totales ---');
    console.log('  subtotal_hospedaje:', factura.subtotal_hospedaje);
    console.log('  subtotal_consumos:', factura.subtotal_consumos);
    console.log('  total_impuestos:', factura.total_impuestos);
    console.log('  total:', factura.total);

    console.log('\n--- Emisor ---');
    console.log('  emisor_nit:', factura.emisor_nit);
    console.log('  emisor_razon_social:', factura.emisor_razon_social);
    console.log('  emisor_regimen_tributario:', factura.emisor_regimen_tributario);

    console.log('\n--- Resolución DIAN ---');
    console.log('  resolucion_dian:', factura.resolucion_dian);
    console.log('  resolucion_prefijo:', factura.resolucion_prefijo);

    console.log('\n✅ Test completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testFacturaCompleta();
