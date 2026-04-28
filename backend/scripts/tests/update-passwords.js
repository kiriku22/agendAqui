require('dotenv').config();
const pool = require('./src/config/database');

async function updatePasswords() {
  try {
    // Hash generado para "admin123"
    const hash = '$2b$10$NqO7Y6BFuk1W0TD4u8x63eYKFagaInIE2KnsJfT/afqZOwF4jRNCi';

    console.log('\n🔧 Actualizando contraseñas...');

    await pool.query('UPDATE usuarios SET password = $1 WHERE usuario IN ($2, $3, $4)',
      [hash, 'admin', 'recepcion', 'limpieza']
    );

    console.log('✅ Contraseñas actualizadas para: admin, recepcion, limpieza');
    console.log('   Password para todos: admin123');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePasswords();
