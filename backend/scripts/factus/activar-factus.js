// ============================================================================
// ACTIVAR CONFIGURACIÓN DE FACTUS
// ============================================================================

const pool = require('./src/config/database');

async function activarFactus() {
  console.log('============================================================================');
  console.log('ACTIVAR FACTURACIÓN ELECTRÓNICA FACTUS');
  console.log('============================================================================\n');

  try {
    // Activar Factus en la configuración
    const result = await pool.query(`
      UPDATE configuracion_factus
      SET activo = true
      WHERE id = 1
      RETURNING id, endpoint, email, ambiente, activo
    `);

    if (result.rows.length > 0) {
      const config = result.rows[0];
      console.log('✅ Facturación electrónica ACTIVADA exitosamente\n');
      console.log('Configuración actual:');
      console.log(`  ID:        ${config.id}`);
      console.log(`  Endpoint:  ${config.endpoint}`);
      console.log(`  Email:     ${config.email}`);
      console.log(`  Ambiente:  ${config.ambiente}`);
      console.log(`  Activo:    ${config.activo ? '✅ SÍ' : '❌ NO'}`);
      console.log('\n============================================================================');
      console.log('¡Listo! Ahora puedes ejecutar:');
      console.log('  node test-factus-service.js');
      console.log('============================================================================\n');
    } else {
      console.log('❌ No se encontró configuración de Factus en la base de datos');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al activar Factus:', error.message);
    process.exit(1);
  }
}

activarFactus();
