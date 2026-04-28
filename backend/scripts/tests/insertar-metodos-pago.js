const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'factufy_hotel',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function insertarMetodosPago() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando inserción de métodos de pago con códigos DIAN...\n');

    // 1. Agregar campo codigo_dian si no existe
    console.log('📝 Agregando campo codigo_dian...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='metodos_pago' AND column_name='codigo_dian'
        ) THEN
          ALTER TABLE metodos_pago ADD COLUMN codigo_dian VARCHAR(2);
        END IF;
      END $$;
    `);
    console.log('✅ Campo codigo_dian verificado\n');

    // 2. Limpiar datos existentes
    console.log('🗑️  Limpiando datos existentes...');
    await client.query('TRUNCATE TABLE metodos_pago RESTART IDENTITY CASCADE');
    console.log('✅ Datos limpiados\n');

    // 3. Insertar métodos de pago con códigos DIAN
    console.log('💳 Insertando métodos de pago oficiales DIAN...');
    const result = await client.query(`
      INSERT INTO metodos_pago (nombre, codigo_dian, tipo, activo, requiere_referencia, icono, orden) VALUES
      -- EFECTIVO Y EQUIVALENTES
      ('Efectivo', '10', 'efectivo', true, false, 'cash', 1),
      ('Consignación Bancaria', '11', 'transferencia', true, true, 'bank', 2),

      -- TARJETAS
      ('Tarjeta Crédito', '42', 'tarjeta', true, true, 'credit-card', 3),
      ('Tarjeta Débito', '43', 'tarjeta', true, true, 'credit-card', 4),

      -- TRANSFERENCIAS ELECTRÓNICAS
      ('Transferencia Bancaria', '47', 'transferencia', true, true, 'transfer', 5),
      ('Transferencia Electrónica (ACH)', '41', 'transferencia', true, true, 'transfer', 6),

      -- PAGOS DIGITALES
      ('PSE', '48', 'transferencia', true, true, 'pse', 7),
      ('Billetera Digital (Nequi, Daviplata, etc)', '49', 'transferencia', true, true, 'wallet', 8),

      -- CRÉDITO
      ('Crédito del Establecimiento', '30', 'otro', true, false, 'credit', 9),

      -- CHEQUES
      ('Cheque', '20', 'otro', true, true, 'check', 10),

      -- OTROS
      ('Bono o Tarjeta Regalo', '44', 'otro', true, true, 'gift', 11),
      ('Pago Mixto', '71', 'otro', true, false, 'mix', 12)
      RETURNING *
    `);

    console.log(`✅ ${result.rowCount} métodos de pago insertados\n`);

    // 4. Agregar constraint único si no existe
    console.log('🔒 Verificando constraint único en codigo_dian...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_codigo_dian'
        ) THEN
          ALTER TABLE metodos_pago ADD CONSTRAINT uq_codigo_dian UNIQUE (codigo_dian);
        END IF;
      END $$;
    `);
    console.log('✅ Constraint verificado\n');

    // 5. Agregar comentario
    await client.query(`
      COMMENT ON COLUMN metodos_pago.codigo_dian IS 'Código oficial DIAN según Resolución 000042 de 2020'
    `);

    // 6. Mostrar resultado
    console.log('📋 MÉTODOS DE PAGO INSERTADOS:\n');
    console.log('ID | Código DIAN | Nombre                              | Tipo          | Ref.');
    console.log('---|-------------|-------------------------------------|---------------|------');

    const metodos = await client.query(`
      SELECT id, codigo_dian, nombre, tipo, requiere_referencia
      FROM metodos_pago
      ORDER BY orden
    `);

    metodos.rows.forEach((m) => {
      const ref = m.requiere_referencia ? 'Sí' : 'No';
      console.log(
        `${String(m.id).padEnd(2)} | ${m.codigo_dian.padEnd(11)} | ${m.nombre.padEnd(35)} | ${m.tipo.padEnd(13)} | ${ref}`
      );
    });

    console.log('\n✅ ¡Métodos de pago con códigos DIAN insertados correctamente!');
    console.log('\n📖 REFERENCIA - CÓDIGOS DIAN MÁS COMUNES:');
    console.log('   10 - Efectivo');
    console.log('   11 - Consignación bancaria');
    console.log('   20 - Cheque');
    console.log('   30 - Crédito');
    console.log('   41 - Transferencia - depósito en cuenta');
    console.log('   42 - Tarjeta crédito');
    console.log('   43 - Tarjeta débito');
    console.log('   44 - Bono o Tarjeta Regalo');
    console.log('   47 - Transferencia débito bancaria');
    console.log('   48 - PSE (Pagos Seguros en Línea)');
    console.log('   49 - Billetera digital');
    console.log('   71 - Pago sin utilizar el sistema financiero (mixto)');
    console.log('\n📌 Fuente: Resolución 000042 de 05 de mayo de 2020 - DIAN Colombia\n');

  } catch (error) {
    console.error('❌ Error al insertar métodos de pago:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertarMetodosPago()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
