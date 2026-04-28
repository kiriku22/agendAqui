// Script para verificar integridad de datos de reservas
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'remoto.pronetsys.com.co',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'factufy-hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root87',
});

async function checkReservasData() {
  const client = await pool.connect();
  try {
    console.log('\n=== VERIFICACIÓN DE INTEGRIDAD DE DATOS DE RESERVAS ===\n');

    // 1. Verificar reservas con datos relacionados
    console.log('📋 RESERVAS CON JOINS A HUESPEDES Y CLIENTES:');
    const reservasQuery = `
      SELECT
        r.id as reserva_id,
        r.codigo,
        r.estado,
        r.huesped_id,
        h.id as huesped_existe,
        h.cliente_id,
        h.tipo_documento as h_tipo_doc,
        h.numero_documento as h_num_doc,
        h.telefono as h_tel,
        h.email as h_email,
        c.id as cliente_existe,
        c.nombre,
        c.apellido,
        c.nombre || ' ' || COALESCE(c.apellido, '') as nombre_completo,
        c.telefono as c_tel,
        c.email as c_email
      FROM reservas r
      LEFT JOIN huespedes h ON h.id = r.huesped_id
      LEFT JOIN clientes c ON c.id = h.cliente_id
      WHERE r.estado IN ('pendiente', 'confirmada')
      ORDER BY r.created_at DESC
      LIMIT 5;
    `;
    const reservas = await client.query(reservasQuery);
    console.table(reservas.rows);

    // 2. Verificar huéspedes sin cliente
    console.log('\n⚠️  HUÉSPEDES SIN CLIENTE (PROBLEMAS):');
    const huespedesSinCliente = await client.query(`
      SELECT h.id, h.numero_documento, h.telefono, h.email, h.cliente_id
      FROM huespedes h
      WHERE NOT EXISTS (SELECT 1 FROM clientes c WHERE c.id = h.cliente_id)
    `);
    if (huespedesSinCliente.rows.length > 0) {
      console.table(huespedesSinCliente.rows);
    } else {
      console.log('✅ No hay huéspedes sin cliente asociado');
    }

    // 3. Verificar reservas sin huésped
    console.log('\n⚠️  RESERVAS SIN HUÉSPED (PROBLEMAS):');
    const reservasSinHuesped = await client.query(`
      SELECT r.id, r.codigo, r.huesped_id
      FROM reservas r
      WHERE NOT EXISTS (SELECT 1 FROM huespedes h WHERE h.id = r.huesped_id)
      AND r.estado IN ('pendiente', 'confirmada')
    `);
    if (reservasSinHuesped.rows.length > 0) {
      console.table(reservasSinHuesped.rows);
    } else {
      console.log('✅ Todas las reservas activas tienen huésped asociado');
    }

    // 4. Verificar campos vacíos en huéspedes
    console.log('\n📊 ESTADÍSTICAS DE CAMPOS VACÍOS EN HUÉSPEDES:');
    const estadisticas = await client.query(`
      SELECT
        COUNT(*) as total_huespedes,
        COUNT(CASE WHEN telefono IS NULL OR telefono = '' THEN 1 END) as sin_telefono,
        COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as sin_email,
        COUNT(CASE WHEN tipo_documento IS NULL THEN 1 END) as sin_tipo_doc,
        COUNT(CASE WHEN numero_documento IS NULL OR numero_documento = '' THEN 1 END) as sin_num_doc
      FROM huespedes h
      WHERE EXISTS (
        SELECT 1 FROM reservas r
        WHERE r.huesped_id = h.id
        AND r.estado IN ('pendiente', 'confirmada')
      )
    `);
    console.table(estadisticas.rows);

    // 5. Simular el field resolver de Reserva.huesped
    console.log('\n🔍 SIMULACIÓN DEL FIELD RESOLVER Reserva.huesped:');
    const primeraReserva = reservas.rows[0];
    if (primeraReserva) {
      console.log(`\nProbando con reserva ID: ${primeraReserva.reserva_id}, huesped_id: ${primeraReserva.huesped_id}`);

      const fieldResolverQuery = `
        SELECT
          h.*,
          c.nombre || ' ' || COALESCE(c.apellido, '') as nombre_completo
        FROM huespedes h
        JOIN clientes c ON c.id = h.cliente_id
        WHERE h.id = $1
      `;
      const result = await client.query(fieldResolverQuery, [primeraReserva.huesped_id]);

      if (result.rows.length > 0) {
        console.log('\n✅ Field resolver retornaría:');
        console.log({
          id: result.rows[0].id,
          nombre_completo: result.rows[0].nombre_completo,
          tipo_documento: result.rows[0].tipo_documento,
          numero_documento: result.rows[0].numero_documento,
          telefono: result.rows[0].telefono,
          email: result.rows[0].email
        });
      } else {
        console.log('\n❌ Field resolver retornaría NULL (no se encontró el huésped)');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkReservasData();
