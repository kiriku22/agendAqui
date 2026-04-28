const pool = require('./src/config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function fixAdminPassword() {
  try {
    console.log('\n🔍 Verificando usuario admin en la base de datos...\n');

    // Primero, ver qué hay actualmente
    const checkQuery = 'SELECT id, usuario, nombre, rol, activo, password FROM usuarios WHERE usuario = $1';
    const checkResult = await pool.query(checkQuery, ['admin']);

    if (checkResult.rows.length === 0) {
      console.log('❌ No existe el usuario admin. Creándolo...\n');

      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = `
        INSERT INTO usuarios (usuario, password, nombre, apellido, rol, activo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, usuario, nombre, rol, activo;
      `;

      const insertResult = await pool.query(insertQuery, [
        'admin',
        hashedPassword,
        'Administrador',
        'Sistema',
        'admin',
        true
      ]);

      console.log('✅ Usuario admin creado exitosamente!');
      console.log('Usuario:', insertResult.rows[0]);

    } else {
      console.log('✓ Usuario encontrado:');
      console.log('  ID:', checkResult.rows[0].id);
      console.log('  Usuario:', checkResult.rows[0].usuario);
      console.log('  Nombre:', checkResult.rows[0].nombre);
      console.log('  Rol:', checkResult.rows[0].rol);
      console.log('  Activo:', checkResult.rows[0].activo);
      console.log('  Hash actual:', checkResult.rows[0].password.substring(0, 20) + '...');

      console.log('\n🔧 Generando nuevo hash para admin123...\n');

      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('✓ Nuevo hash generado:', hashedPassword);

      // Probar el hash antes de guardarlo
      const testMatch = await bcrypt.compare(password, hashedPassword);
      console.log('✓ Verificación del hash:', testMatch ? 'OK' : 'ERROR');

      if (!testMatch) {
        throw new Error('El hash generado no es válido');
      }

      console.log('\n💾 Actualizando contraseña en la base de datos...\n');

      const updateQuery = `
        UPDATE usuarios
        SET password = $1
        WHERE usuario = 'admin'
        RETURNING id, usuario, nombre, rol, activo;
      `;

      const updateResult = await pool.query(updateQuery, [hashedPassword]);

      console.log('✅ ¡Contraseña actualizada exitosamente!\n');
      console.log('Usuario actualizado:', updateResult.rows[0]);
    }

    console.log('\n📋 Credenciales de acceso:');
    console.log('  Usuario:    admin');
    console.log('  Contraseña: admin123\n');

    console.log('🧪 Verificando login...\n');

    // Verificar que el login funcionará
    const verifyQuery = 'SELECT password FROM usuarios WHERE usuario = $1';
    const verifyResult = await pool.query(verifyQuery, ['admin']);

    if (verifyResult.rows.length > 0) {
      const storedHash = verifyResult.rows[0].password;
      const loginWillWork = await bcrypt.compare('admin123', storedHash);

      if (loginWillWork) {
        console.log('✅ Login verificado - la contraseña admin123 funcionará correctamente\n');
      } else {
        console.log('❌ ERROR: El login NO funcionará - hay un problema con el hash\n');
      }
    }

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixAdminPassword();
