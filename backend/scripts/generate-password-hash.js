/**
 * Script genérico para generar contraseñas hasheadas con bcrypt
 *
 * Uso:
 *   node generate-password-hash.js <contraseña>
 *
 * Ejemplo:
 *   node generate-password-hash.js micontraseña123
 */

const bcrypt = require('bcrypt');

// Número de salt rounds (10 es el estándar, más alto = más seguro pero más lento)
const SALT_ROUNDS = 10;

async function generatePasswordHash(password) {
  try {
    if (!password) {
      console.error('❌ Error: Debes proporcionar una contraseña');
      console.log('\nUso: node generate-password-hash.js <contraseña>');
      console.log('Ejemplo: node generate-password-hash.js micontraseña123');
      process.exit(1);
    }

    console.log('\n🔐 Generando hash de contraseña...\n');
    console.log('Contraseña original:', password);

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    console.log('Hash generado:', hash);
    console.log('\n✅ Hash generado exitosamente');
    console.log('\n📋 Puedes usar este hash en tu base de datos:');
    console.log(`\nUPDATE usuarios SET password = '${hash}' WHERE username = 'tu_usuario';`);
    console.log('\n');

    return hash;
  } catch (error) {
    console.error('❌ Error al generar hash:', error.message);
    process.exit(1);
  }
}

// Obtener la contraseña desde los argumentos de línea de comandos
const password = process.argv[2];

// Ejecutar la función
generatePasswordHash(password);
