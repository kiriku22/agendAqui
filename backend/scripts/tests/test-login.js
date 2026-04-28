const pool = require('./src/config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testLogin() {
  try {
    console.log('\n🔍 DIAGNÓSTICO COMPLETO DE LOGIN\n');
    console.log('='.repeat(50));

    // 1. Verificar usuario en DB
    console.log('\n1️⃣ Verificando usuario en base de datos...\n');
    const userQuery = 'SELECT * FROM usuarios WHERE usuario = $1';
    const userResult = await pool.query(userQuery, ['admin']);

    if (userResult.rows.length === 0) {
      console.log('❌ ERROR: No existe el usuario "admin" en la base de datos');
      await pool.end();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('✓ Usuario encontrado:');
    console.log('  ID:', user.id);
    console.log('  Usuario:', user.usuario);
    console.log('  Nombre:', user.nombre);
    console.log('  Rol:', user.rol);
    console.log('  Activo:', user.activo);
    console.log('  Hash almacenado:', user.password);
    console.log('  Longitud del hash:', user.password?.length || 0);

    // 2. Probar bcrypt.compare con la contraseña
    console.log('\n2️⃣ Probando bcrypt.compare con "admin123"...\n');

    const testPassword = 'admin123';
    console.log('  Contraseña a probar:', testPassword);
    console.log('  Hash en DB:', user.password);

    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log('  Resultado de bcrypt.compare:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

    if (!isMatch) {
      console.log('\n❌ El hash NO coincide con "admin123"');
      console.log('\n🔧 Generando nuevo hash correcto...\n');

      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('  Nuevo hash generado:', newHash);

      // Verificar que el nuevo hash funciona
      const newHashWorks = await bcrypt.compare(testPassword, newHash);
      console.log('  Verificación del nuevo hash:', newHashWorks ? '✅ OK' : '❌ ERROR');

      if (newHashWorks) {
        console.log('\n💾 Actualizando en la base de datos...\n');

        const updateQuery = 'UPDATE usuarios SET password = $1 WHERE usuario = $2 RETURNING *';
        const updateResult = await pool.query(updateQuery, [newHash, 'admin']);

        console.log('✅ Contraseña actualizada exitosamente');
        console.log('  Nuevo hash guardado:', updateResult.rows[0].password);

        // Verificar de nuevo
        const finalCheck = await bcrypt.compare(testPassword, updateResult.rows[0].password);
        console.log('  Verificación final:', finalCheck ? '✅ FUNCIONARÁ' : '❌ NO FUNCIONARÁ');
      }
    } else {
      console.log('\n✅ El hash es correcto y debería funcionar');
    }

    // 3. Simular el flujo exacto del resolver de login
    console.log('\n3️⃣ Simulando flujo completo de login...\n');

    const loginQuery = 'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true';
    const loginResult = await pool.query(loginQuery, ['admin']);

    if (loginResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado o no está activo');
    } else {
      const loginUser = loginResult.rows[0];
      console.log('✓ Usuario encontrado en login');

      const validPassword = await bcrypt.compare('admin123', loginUser.password);
      console.log('✓ Validación de contraseña:', validPassword ? '✅ VÁLIDA' : '❌ INVÁLIDA');

      if (validPassword) {
        console.log('\n🎉 ¡LOGIN FUNCIONARÁ CORRECTAMENTE!\n');
      } else {
        console.log('\n❌ LOGIN FALLARÁ - La contraseña no coincide\n');
      }
    }

    console.log('='.repeat(50));
    console.log('\n📋 CREDENCIALES FINALES:');
    console.log('  Usuario:    admin');
    console.log('  Contraseña: admin123\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error);
    process.exit(1);
  }
}

testLogin();