const pool = require('./src/config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function verifyHash() {
  try {
    // Obtener el hash de la base de datos
    const result = await pool.query(
      'SELECT usuario, password FROM usuarios WHERE usuario = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuario admin no encontrado');
      await pool.end();
      process.exit(1);
    }

    const storedHash = result.rows[0].password;
    console.log('\n📊 VERIFICACIÓN DE HASH\n');
    console.log('='.repeat(60));
    console.log('Usuario:', result.rows[0].usuario);
    console.log('Hash almacenado:', storedHash);
    console.log('Longitud del hash:', storedHash.length);
    console.log('='.repeat(60));

    // Probar diferentes contraseñas
    const passwords = [
      'admin123',
      'Admin123',
      'ADMIN123',
      ' admin123',
      'admin123 ',
      ' admin123 '
    ];

    console.log('\n🧪 Probando diferentes variaciones:\n');

    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, storedHash);
      const display = pwd.replace(/ /g, '·'); // Mostrar espacios como puntos
      console.log(`  "${display}" (${pwd.length} chars):`, match ? '✅ MATCH' : '❌ NO');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✓ Si admin123 dio ✅ MATCH, el problema NO es el hash');
    console.log('✓ El problema podría ser en el frontend o red\n');

    await pool.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyHash();