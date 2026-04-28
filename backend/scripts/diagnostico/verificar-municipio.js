const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function verificar() {
  try {
    // Verificar que la columna codigo_municipio existe en clientes
    const columnas = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clientes'
      AND column_name LIKE '%municipio%'
    `);

    console.log('Columnas municipio en clientes:');
    columnas.rows.forEach(r => console.log('  -', r.column_name));

    // Verificar datos de un cliente registrado
    const clientes = await pool.query(`
      SELECT id, nombre, numero_documento, email, telefono, direccion, codigo_municipio
      FROM clientes
      WHERE codigo_municipio IS NOT NULL
      LIMIT 3
    `);

    console.log('\nClientes con codigo_municipio:');
    clientes.rows.forEach(c => {
      console.log('  ID:', c.id, '| Nombre:', c.nombre, '| Municipio:', c.codigo_municipio);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

verificar();
