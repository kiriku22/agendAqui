const { Pool } = require('pg');

const pool = new Pool({
  host: 'remoto.pronetsys.com.co',
  port: 5432,
  database: 'factufy-hotel',
  user: 'postgres',
  password: 'root87'
});

async function probarFlujo() {
  try {
    console.log('═'.repeat(80));
    console.log('PRUEBA DE FLUJO: CLIENTE REGISTRADO -> FACTURA ELECTRÓNICA');
    console.log('═'.repeat(80));

    // 1. Obtener un cliente registrado con codigo_municipio
    const clienteResult = await pool.query(`
      SELECT id, nombre, numero_documento, tipo_documento, email, telefono, direccion, codigo_municipio
      FROM clientes
      WHERE codigo_municipio IS NOT NULL AND codigo_municipio != '11001'
      LIMIT 1
    `);

    if (clienteResult.rows.length === 0) {
      console.log('❌ No hay clientes con codigo_municipio diferente a 11001');
      await pool.end();
      return;
    }

    const cliente = clienteResult.rows[0];
    console.log('\n📋 CLIENTE SELECCIONADO:');
    console.log('  ID:', cliente.id);
    console.log('  Nombre:', cliente.nombre);
    console.log('  Documento:', cliente.tipo_documento, cliente.numero_documento);
    console.log('  Email:', cliente.email || '(vacío)');
    console.log('  Teléfono:', cliente.telefono || '(vacío)');
    console.log('  Dirección:', cliente.direccion || '(vacío)');
    console.log('  Código Municipio:', cliente.codigo_municipio, '(NO es Bogotá 11001)');

    // 2. Buscar una factura electrónica reciente de este cliente
    const feResult = await pool.query(`
      SELECT
        fe.id,
        fe.numero_factura_electronica,
        fe.cliente_nombre,
        fe.cliente_numero_documento,
        fe.cliente_codigo_municipio_dane,
        fe.factus_status,
        fe.cufe,
        fe.created_at
      FROM facturas_electronicas fe
      WHERE fe.cliente_id = $1
      ORDER BY fe.created_at DESC
      LIMIT 1
    `, [cliente.id]);

    if (feResult.rows.length > 0) {
      const fe = feResult.rows[0];
      console.log('\n📄 FACTURA ELECTRÓNICA EXISTENTE:');
      console.log('  ID:', fe.id);
      console.log('  Número:', fe.numero_factura_electronica);
      console.log('  Cliente:', fe.cliente_nombre);
      console.log('  Documento:', fe.cliente_numero_documento);
      console.log('  Municipio DANE en FE:', fe.cliente_codigo_municipio_dane || '❌ NULL');
      console.log('  Estado Factus:', fe.factus_status);
      console.log('  CUFE:', fe.cufe ? '✅ Transmitida' : '❌ No transmitida');

      // Verificar si el municipio se guardó correctamente
      if (fe.cliente_codigo_municipio_dane === cliente.codigo_municipio) {
        console.log('\n✅ El código de municipio SE GUARDÓ CORRECTAMENTE');
      } else {
        console.log('\n❌ DISCREPANCIA:');
        console.log('  - En tabla clientes:', cliente.codigo_municipio);
        console.log('  - En facturas_electronicas:', fe.cliente_codigo_municipio_dane || 'NULL');

        if (!fe.cliente_codigo_municipio_dane || fe.cliente_codigo_municipio_dane === '11001') {
          console.log('\n🔧 ESTO INDICA QUE EL TRIGGER ANTERIOR NO ESTABA LEYENDO EL CAMPO CORRECTO');
          console.log('   El trigger corregido debería funcionar para NUEVAS facturas');
        }
      }
    } else {
      console.log('\n⚠️ Este cliente no tiene facturas electrónicas');
    }

    // 3. Simular qué haría factubox.js al construir el snapshot
    console.log('\n─'.repeat(80));
    console.log('SIMULACIÓN: Query de factubox.js (línea 402-415)');
    console.log('─'.repeat(80));

    // Buscar una factura de este cliente
    const facturaResult = await pool.query(`
      SELECT
        f.*,
        c.nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        c.tipo_documento as cliente_tipo_documento,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        c.direccion as cliente_direccion,
        COALESCE(c.codigo_municipio, '11001') as cliente_municipio
      FROM facturas f
      LEFT JOIN clientes c ON c.id = f.cliente_id
      WHERE f.cliente_id = $1
      ORDER BY f.created_at DESC
      LIMIT 1
    `, [cliente.id]);

    if (facturaResult.rows.length > 0) {
      const factura = facturaResult.rows[0];
      console.log('\nResultado de la query CORREGIDA:');
      console.log('  cliente_nombre:', factura.cliente_nombre);
      console.log('  cliente_documento:', factura.cliente_documento);
      console.log('  cliente_email:', factura.cliente_email || '(vacío)');
      console.log('  cliente_telefono:', factura.cliente_telefono || '(vacío)');
      console.log('  cliente_direccion:', factura.cliente_direccion || '(vacío)');
      console.log('  cliente_municipio:', factura.cliente_municipio, factura.cliente_municipio !== '11001' ? '✅' : '');

      if (factura.cliente_municipio === cliente.codigo_municipio) {
        console.log('\n✅ La query ahora lee CORRECTAMENTE el codigo_municipio del cliente');
      }
    }

    // 4. Mostrar lo que FactusService.js enviará
    console.log('\n─'.repeat(80));
    console.log('LO QUE FACTUSSERVICE.JS ENVIARÁ A FACTUS:');
    console.log('─'.repeat(80));

    // Simular el mapeo de municipio a ID de Factus
    const municipioId = cliente.codigo_municipio === '11001' ? 149 : 980; // Simplificado
    console.log('\nCliente snapshot:');
    console.log({
      nombre: cliente.nombre,
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      email: cliente.email || '[config.email_facturacion]',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || 'No especificada',
      codigo_municipio: cliente.codigo_municipio // ✅ Campo correcto
    });

    console.log('\nCustomer payload para Factus:');
    console.log({
      identification_document_id: 3, // CC
      identification: cliente.numero_documento,
      names: cliente.nombre,
      address: cliente.direccion || 'No especificada',
      email: cliente.email || '[config.email_facturacion]',
      phone: cliente.telefono || '',
      legal_organization_id: 2, // Natural
      tribute_id: 21, // No responsable IVA
      municipality_id: municipioId
    });

    console.log('\n═'.repeat(80));
    console.log('FIN DE LA PRUEBA');
    console.log('═'.repeat(80));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
  }
}

probarFlujo();
