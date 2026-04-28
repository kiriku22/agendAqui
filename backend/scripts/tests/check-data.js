require('dotenv').config();
const pool = require('./src/config/database');

async function checkData() {
  try {
    // Check usuarios
    console.log('\n📋 USUARIOS:');
    const usuarios = await pool.query('SELECT id, nombre, apellido, usuario, rol FROM usuarios ORDER BY id');
    console.log(`Total: ${usuarios.rows.length}`);
    usuarios.rows.forEach(u => {
      console.log(`  - ${u.usuario} (${u.rol}) - ${u.nombre} ${u.apellido}`);
    });

    // Check metodos_pago
    console.log('\n💳 MÉTODOS DE PAGO:');
    const metodos = await pool.query('SELECT id, nombre, tipo, orden FROM metodos_pago ORDER BY orden');
    console.log(`Total: ${metodos.rows.length}`);
    metodos.rows.forEach(m => {
      console.log(`  - ${m.nombre} (${m.tipo})`);
    });

    // Check habitaciones
    console.log('\n🏠 HABITACIONES:');
    const habitaciones = await pool.query('SELECT id, numero, tipo, estado FROM habitaciones ORDER BY numero');
    console.log(`Total: ${habitaciones.rows.length}`);
    habitaciones.rows.forEach(h => {
      console.log(`  - ${h.numero} (${h.tipo}) - ${h.estado}`);
    });

    // Check servicios_hotel
    console.log('\n🛎️  SERVICIOS HOTEL:');
    const servicios = await pool.query('SELECT id, codigo, nombre, precio FROM servicios_hotel ORDER BY codigo LIMIT 5');
    console.log(`Total: ${servicios.rows.length}`);
    servicios.rows.forEach(s => {
      console.log(`  - ${s.codigo}: ${s.nombre} - $${s.precio}`);
    });

    // Test password hash
    console.log('\n🔐 VERIFICANDO PASSWORD:');
    const bcrypt = require('bcrypt');
    const adminUser = await pool.query("SELECT password FROM usuarios WHERE usuario = 'admin'");
    if (adminUser.rows.length > 0) {
      const isValid = await bcrypt.compare('admin123', adminUser.rows[0].password);
      console.log(`Password hash válido: ${isValid}`);
      console.log(`Hash almacenado: ${adminUser.rows[0].password.substring(0, 30)}...`);
    } else {
      console.log('❌ Usuario admin no encontrado');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
