const pool = require('./src/config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdmin() {
  try {
    console.log('\n🔄 RESET COMPLETO DEL USUARIO ADMIN\n');

    // 1. Eliminar usuario admin si existe
    await pool.query('DELETE FROM usuarios WHERE usuario = $1', ['admin']);
    console.log('✓ Usuario admin eliminado (si existía)');

    // 2. Generar hash fresco
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('✓ Nuevo hash generado:', hash);

    // 3. Verificar que el hash funciona ANTES de insertar
    const testHash = await bcrypt.compare(password, hash);
    console.log('✓ Verificación del hash:', testHash ? '✅ OK' : '❌ FALLO');

    if (!testHash) {
      throw new Error('El hash generado no es válido');
    }

    // 4. Insertar usuario admin nuevo
    const insertQuery = `
      INSERT INTO usuarios (
        usuario, password, nombre, apellido, rol, email, activo, pin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, usuario, nombre, rol, activo;
    `;

    const result = await pool.query(insertQuery, [
      'admin',
      hash,
      'Administrador',
      'Sistema',
      'admin',
      'admin@factufy.com',
      true,
      null
    ]);

    console.log('\n✅ Usuario admin creado exitosamente!');
    console.log('Datos:', result.rows[0]);

    // 5. Verificar lectura desde DB
    const verifyQuery = 'SELECT usuario, password FROM usuarios WHERE usuario = $1';
    const verifyResult = await pool.query(verifyQuery, ['admin']);

    console.log('\n🔍 Verificando lectura desde DB...');
    const storedHash = verifyResult.rows[0].password;
    const finalCheck = await bcrypt.compare(password, storedHash);

    console.log('✓ Hash almacenado:', storedHash);
    console.log('✓ Verificación final:', finalCheck ? '✅ FUNCIONARÁ' : '❌ NO FUNCIONARÁ');

    console.log('\n📋 CREDENCIALES:');
    console.log('  Usuario:    admin');
    console.log('  Contraseña: admin123');
    console.log('  Email:      admin@factufy.com\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetAdmin();