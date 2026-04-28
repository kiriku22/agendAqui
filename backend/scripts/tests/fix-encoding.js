require('dotenv').config();
const pool = require('./src/config/database');

async function fixEncoding() {
  try {
    console.log('\n🔧 Limpiando tabla metodos_pago...');

    // Delete all records
    await pool.query('DELETE FROM metodos_pago');
    console.log('✅ Registros eliminados');

    // Insert with correct encoding
    const query = `
      INSERT INTO metodos_pago (nombre, tipo, requiere_referencia, icono, orden) VALUES
      ($1, $2, $3, $4, $5),
      ($6, $7, $8, $9, $10),
      ($11, $12, $13, $14, $15),
      ($16, $17, $18, $19, $20),
      ($21, $22, $23, $24, $25),
      ($26, $27, $28, $29, $30)
    `;

    const values = [
      'Efectivo', 'efectivo', false, 'FaMoneyBillWave', 1,
      'Tarjeta Debito', 'tarjeta', true, 'FaCreditCard', 2,
      'Tarjeta Credito', 'tarjeta', true, 'FaCreditCard', 3,
      'Transferencia', 'transferencia', true, 'FaExchangeAlt', 4,
      'Nequi', 'transferencia', true, 'FaMobileAlt', 5,
      'Daviplata', 'transferencia', true, 'FaMobileAlt', 6
    ];

    await pool.query(query, values);
    console.log('✅ Métodos de pago insertados correctamente (sin acentos)');

    // Verify
    const result = await pool.query('SELECT id, nombre, tipo FROM metodos_pago ORDER BY orden');
    console.log(`\n📋 Métodos de pago (${result.rows.length}):`);
    result.rows.forEach(m => {
      console.log(`  - ${m.nombre} (${m.tipo})`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixEncoding();
