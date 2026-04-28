// ============================================================================
// TEST DE DATOS EN BASE DE DATOS - FACTURACIÓN ELECTRÓNICA
// ============================================================================

const pool = require('./src/config/database');

async function testDatabase() {
  console.log('============================================================================');
  console.log('TEST DE DATOS EN BASE DE DATOS');
  console.log('============================================================================\n');

  try {
    // ==========================================================================
    // 1. VERIFICAR CONFIGURACIÓN FACTUS
    // ==========================================================================
    console.log('1. Verificando configuración de Factus...');

    const configResult = await pool.query(`
      SELECT
        id,
        endpoint,
        email,
        ambiente,
        activo,
        iva_hospedaje,
        iva_consumos,
        iva_servicios,
        created_at
      FROM configuracion_factus
      LIMIT 1
    `);

    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      console.log('   ✅ Configuración encontrada:');
      console.log(`      ID:             ${config.id}`);
      console.log(`      Endpoint:       ${config.endpoint}`);
      console.log(`      Email:          ${config.email}`);
      console.log(`      Ambiente:       ${config.ambiente}`);
      console.log(`      Activo:         ${config.activo ? '✅ SÍ' : '❌ NO'}`);
      console.log(`      IVA Hospedaje:  ${config.iva_hospedaje}%`);
      console.log(`      IVA Consumos:   ${config.iva_consumos}%`);
      console.log(`      Creado:         ${config.created_at}`);
    } else {
      console.log('   ❌ No se encontró configuración de Factus');
    }

    // ==========================================================================
    // 2. VERIFICAR TIPOS DE DOCUMENTO DIAN
    // ==========================================================================
    console.log('\n2. Verificando tipos de documento DIAN...');

    const tiposDocResult = await pool.query(`
      SELECT
        codigo_dian,
        codigo_interno,
        descripcion,
        requiere_digito_verificacion,
        activo
      FROM tipos_documento_dian
      WHERE activo = true
      ORDER BY codigo_dian
    `);

    console.log(`   ✅ ${tiposDocResult.rows.length} tipos de documento encontrados:`);
    tiposDocResult.rows.forEach(tipo => {
      const dv = tipo.requiere_digito_verificacion ? '(requiere DV)' : '';
      console.log(`      ${tipo.codigo_dian} - ${tipo.codigo_interno}: ${tipo.descripcion} ${dv}`);
    });

    // ==========================================================================
    // 3. VERIFICAR FACTURAS ELECTRÓNICAS
    // ==========================================================================
    console.log('\n3. Verificando facturas electrónicas...');

    const facturasResult = await pool.query(`
      SELECT
        fe.id,
        fe.factura_id,
        fe.factus_id,
        fe.cufe,
        fe.numero_factura_dian,
        fe.estado_dian,
        fe.url_pdf,
        fe.fecha_envio,
        f.numero_factura,
        f.total
      FROM facturas_electronicas fe
      LEFT JOIN facturas f ON f.id = fe.factura_id
      ORDER BY fe.created_at DESC
      LIMIT 10
    `);

    if (facturasResult.rows.length > 0) {
      console.log(`   ✅ ${facturasResult.rows.length} factura(s) electrónica(s) encontrada(s):`);
      facturasResult.rows.forEach((fe, index) => {
        console.log(`\n      ${index + 1}. Factura Electrónica ID: ${fe.id}`);
        console.log(`         ├─ Factura:        ${fe.numero_factura || 'N/A'} (ID: ${fe.factura_id})`);
        console.log(`         ├─ Total:          $${fe.total || 'N/A'}`);
        console.log(`         ├─ Factus ID:      ${fe.factus_id || 'N/A'}`);
        console.log(`         ├─ CUFE:           ${fe.cufe ? fe.cufe.substring(0, 30) + '...' : 'N/A'}`);
        console.log(`         ├─ Número DIAN:    ${fe.numero_factura_dian || 'N/A'}`);
        console.log(`         ├─ Estado DIAN:    ${fe.estado_dian || 'N/A'}`);
        console.log(`         ├─ PDF URL:        ${fe.url_pdf ? 'Disponible' : 'N/A'}`);
        console.log(`         └─ Fecha envío:    ${fe.fecha_envio || 'N/A'}`);
      });
    } else {
      console.log('   ℹ️  No hay facturas electrónicas aún.');
      console.log('      Realiza un checkout para generar una.');
    }

    // ==========================================================================
    // 4. VERIFICAR TABLA FACTURAS (columna tiene_factura_electronica)
    // ==========================================================================
    console.log('\n4. Verificando columna en tabla facturas...');

    const columnCheck = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'facturas'
        AND column_name IN ('tiene_factura_electronica', 'factura_electronica_id')
      ORDER BY column_name
    `);

    if (columnCheck.rows.length > 0) {
      console.log('   ✅ Columnas de FE en tabla facturas:');
      columnCheck.rows.forEach(col => {
        console.log(`      - ${col.column_name} (${col.data_type})`);
      });
    }

    // ==========================================================================
    // 5. VERIFICAR HOSPEDAJES ACTIVOS (para probar checkout)
    // ==========================================================================
    console.log('\n5. Verificando hospedajes activos...');

    const hospedajesResult = await pool.query(`
      SELECT
        h.id,
        h.codigo,
        h.estado,
        ha.numero as habitacion_numero,
        hu.nombre_completo as huesped_nombre,
        h.fecha_entrada,
        h.precio_noche
      FROM hospedajes h
      LEFT JOIN habitaciones ha ON ha.id = h.habitacion_id
      LEFT JOIN huespedes hu ON hu.id = h.huesped_id
      WHERE h.estado = 'activo'
      ORDER BY h.created_at DESC
      LIMIT 5
    `);

    if (hospedajesResult.rows.length > 0) {
      console.log(`   ✅ ${hospedajesResult.rows.length} hospedaje(s) activo(s):`);
      hospedajesResult.rows.forEach((hosp, index) => {
        console.log(`\n      ${index + 1}. Hospedaje ID: ${hosp.id}`);
        console.log(`         ├─ Código:         ${hosp.codigo}`);
        console.log(`         ├─ Habitación:     ${hosp.habitacion_numero || 'N/A'}`);
        console.log(`         ├─ Huésped:        ${hosp.huesped_nombre || 'N/A'}`);
        console.log(`         ├─ Check-in:       ${hosp.fecha_entrada}`);
        console.log(`         └─ Precio/noche:   $${hosp.precio_noche}`);
      });
      console.log('\n      ℹ️  Puedes hacer checkout de estos hospedajes para generar FE');
    } else {
      console.log('   ℹ️  No hay hospedajes activos.');
      console.log('      Primero debes crear un hospedaje (check-in) para poder hacer checkout.');
    }

    // ==========================================================================
    // RESUMEN
    // ==========================================================================
    console.log('\n============================================================================');
    console.log('RESUMEN DE VERIFICACIÓN');
    console.log('============================================================================');
    console.log(`✅ Configuración Factus:     ${configResult.rows.length > 0 ? 'OK' : 'FALTA'}`);
    console.log(`✅ Tipos documento DIAN:     ${tiposDocResult.rows.length} registros`);
    console.log(`✅ Facturas electrónicas:    ${facturasResult.rows.length} registros`);
    console.log(`✅ Hospedajes activos:       ${hospedajesResult.rows.length} registros`);
    console.log('\n============================================================================');
    console.log('VERIFICACIÓN COMPLETADA ✅');
    console.log('============================================================================\n');

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testDatabase();
