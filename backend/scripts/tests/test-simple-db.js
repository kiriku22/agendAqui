// Test simple de BD
const pool = require('./src/config/database');

async function test() {
  try {
    // Test 1: Configuración
    const config = await pool.query('SELECT id, activo, ambiente FROM configuracion_factus LIMIT 1');
    console.log('✅ Configuración Factus:', config.rows[0]);

    // Test 2: Contar tipos de documento
    const count = await pool.query('SELECT COUNT(*) as total FROM tipos_documento_dian');
    console.log(`✅ Tipos de documento DIAN: ${count.rows[0].total} registros`);

    // Test 3: Contar facturas electrónicas
    const fe = await pool.query('SELECT COUNT(*) as total FROM facturas_electronicas');
    console.log(`✅ Facturas electrónicas: ${fe.rows[0].total} registros`);

    // Test 4: Hospedajes activos
    const hosp = await pool.query("SELECT COUNT(*) as total FROM hospedajes WHERE estado = 'activo'");
    console.log(`✅ Hospedajes activos: ${hosp.rows[0].total} registros`);

    console.log('\n✅ Todos los tests pasaron');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
