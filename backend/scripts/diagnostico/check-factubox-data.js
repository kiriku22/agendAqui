// Script para verificar datos de facturas_electronicas
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'remoto.pronetsys.com.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'factufy-hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root87',
});

async function checkData() {
  const client = await pool.connect();
  try {
    // 1. Verificar facturas_electronicas
    console.log('\n=== FACTURAS ELECTRONICAS ===');
    const fe = await client.query('SELECT id, factura_id, factus_status, numero_factura_electronica, cufe, total, error_message FROM facturas_electronicas ORDER BY id DESC LIMIT 10');
    console.table(fe.rows);

    // 2. Verificar facturas
    console.log('\n=== FACTURAS ===');
    const f = await client.query('SELECT id, numero_factura, fecha, total, hospedaje_id FROM facturas ORDER BY id DESC LIMIT 10');
    console.table(f.rows);

    // 3. Intentar el query del FactuBox
    console.log('\n=== QUERY FACTUBOX (sin filtros) ===');
    const factubox = await client.query(`
      SELECT
        fe.id,
        fe.factura_id,
        fe.numero_factura_electronica as numero_factura_dian,
        f.numero_factura as numero_factura_interna,
        f.fecha as fecha_factura,
        f.total,
        fe.cufe,
        fe.factus_status as estado_dian,
        fe.fecha_envio_factus as fecha_envio,
        fe.pdf_url as url_pdf,
        fe.xml_url as url_xml,
        fe.error_message,
        COALESCE(c.nombre, fe.cliente_nombre, 'Cliente') as cliente_nombre,
        COALESCE(c.numero_documento, h.numero_documento, fe.cliente_numero_documento) as cliente_documento
      FROM facturas_electronicas fe
      INNER JOIN facturas f ON f.id = fe.factura_id
      LEFT JOIN hospedajes ho ON ho.id = f.hospedaje_id
      LEFT JOIN huespedes h ON h.id = ho.huesped_id
      LEFT JOIN clientes c ON c.id = f.cliente_id
      ORDER BY f.fecha DESC, fe.created_at DESC
      LIMIT 10
    `);
    console.table(factubox.rows);

    // 4. Verificar si hay facturas sin join
    console.log('\n=== FACTURAS_ELECTRONICAS CON FACTURA_ID VALIDO ===');
    const validJoin = await client.query(`
      SELECT fe.id, fe.factura_id, f.id as factura_existe
      FROM facturas_electronicas fe
      LEFT JOIN facturas f ON f.id = fe.factura_id
    `);
    console.table(validJoin.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkData();
