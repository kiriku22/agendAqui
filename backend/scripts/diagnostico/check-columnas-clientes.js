const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function checkColumnas() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clientes'
      ORDER BY ordinal_position
    `);

    console.log('📋 Columnas de la tabla clientes:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Verificar si existe municipio_dane o codigo_municipio_dane
    const tieneCodigoMunicipio = result.rows.some(c => c.column_name === 'codigo_municipio_dane');
    const tieneMunicipio = result.rows.some(c => c.column_name === 'municipio_dane');

    console.log('');
    console.log(`codigo_municipio_dane existe: ${tieneCodigoMunicipio ? '✅ SÍ' : '❌ NO'}`);
    console.log(`municipio_dane existe: ${tieneMunicipio ? '✅ SÍ' : '❌ NO'}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkColumnas();
